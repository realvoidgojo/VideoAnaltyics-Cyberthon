import sys
import os
import logging
import cv2
import numpy as np
import base64
import tempfile
from progress.bar import Bar

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def generate_heatmap_video(video_path, output_path=None, task_instance=None):
    """
    Processes a video and generates a heatmap video.
    
    Args:
        video_path: Path to the video file
        output_path: Path to save the output video file (optional)
        task_instance: Celery task instance for checking cancellation
    
    Returns:
        Path to the generated heatmap video file
        
    Raises:
        Exception: If task is cancelled during processing
    """
    if output_path is None:
        # Create a temporary file with .mp4 extension (more compatible with browsers)
        temp_dir = tempfile.gettempdir()
        output_path = os.path.join(temp_dir, f"heatmap_{os.path.basename(video_path)}")
        # Force .mp4 extension
        output_path = os.path.splitext(output_path)[0] + '.mp4'
    
    logger.info(f"Generating heatmap video from {video_path} to {output_path}")
    
    capture = cv2.VideoCapture(video_path)
    length = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    background_subtractor = cv2.bgsegm.createBackgroundSubtractorMOG()

    # Get video properties
    fps = capture.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0  # Default to 30 fps if can't determine
        
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Create video writer
    # Try H.264 codec for MP4 (better browser compatibility)
    logger.info("Using H.264 codec for video encoding (better browser compatibility)")
    output_path = os.path.splitext(output_path)[0] + '.mp4'
    logger.info(f"Using MP4 format: {output_path}")
    
    # Try different codec options for H.264 encoding
    try:
        # First try 'avc1' - H.264 codec that works in most browsers
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not video_writer.isOpened():
            # If avc1 fails, try 'H264'
            logger.warning("Failed to initialize VideoWriter with 'avc1' codec. Trying 'H264'...")
            fourcc = cv2.VideoWriter_fourcc(*'H264')
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
        if not video_writer.isOpened():
            # If H264 fails, try 'X264'
            logger.warning("Failed to initialize VideoWriter with 'H264' codec. Trying 'X264'...")
            fourcc = cv2.VideoWriter_fourcc(*'X264')
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
        if not video_writer.isOpened():
            # If all H.264 variants fail, fall back to mp4v
            logger.warning("Failed to initialize VideoWriter with H.264 codecs. Falling back to mp4v...")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
        if not video_writer.isOpened():
            # Last resort: try MJPG with AVI container
            logger.warning("Failed to initialize VideoWriter with mp4v codec. Trying MJPG with AVI container...")
            output_path = os.path.splitext(output_path)[0] + '.avi'
            fourcc = cv2.VideoWriter_fourcc(*"MJPG")
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
        if not video_writer.isOpened():
            raise Exception("Failed to initialize VideoWriter with any codec")
            
    except Exception as e:
        logger.error(f"Error initializing video writer: {e}")
        # Fall back to MJPG with AVI container as last resort
        logger.warning("Falling back to MJPG with AVI container due to error...")
        output_path = os.path.splitext(output_path)[0] + '.avi'
        fourcc = cv2.VideoWriter_fourcc(*"MJPG")
        video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not video_writer.isOpened():
            raise Exception("Failed to initialize VideoWriter with any codec")
    
    bar = Bar('Processing Frames for Heatmap Video', max=length)
    first_iteration = True
    
    # Check for task cancellation before starting loop
    if task_instance and hasattr(task_instance, 'request'):
        if hasattr(task_instance.request, 'id'):
            from .celery import celery_app
            task_id = task_instance.request.id
            task_result = celery_app.AsyncResult(task_id)
            if task_result.state == 'REVOKED':
                logger.warning(f"Task {task_id} was cancelled - stopping heatmap video generation")
                raise Exception("Task cancelled by user")
    
    try:
        for i in range(length):
            # Check for task cancellation every 10 frames
            if i % 10 == 0 and task_instance and hasattr(task_instance, 'request'):
                # Check if the task is revoked
                if hasattr(task_instance.request, 'id'):
                    from .celery import celery_app
                    task_id = task_instance.request.id
                    task_result = celery_app.AsyncResult(task_id)
                    if task_result.state == 'REVOKED':
                        logger.warning(f"Task {task_id} was cancelled - stopping heatmap video generation")
                        # Make sure the exception message matches exactly what the frontend is expecting
                        raise Exception("Task cancelled by user")
            ret, frame = capture.read()
            if not ret:
                break
            if first_iteration:
                accum_image = np.zeros((height, width), np.uint8)
                first_iteration = False
            
            filter_mask = background_subtractor.apply(frame)
            _, thresholded = cv2.threshold(filter_mask, 2, 2, cv2.THRESH_BINARY)
            accum_image = cv2.add(accum_image, thresholded)
            
            overlay = cv2.applyColorMap(accum_image, cv2.COLORMAP_HOT)
            result_overlay = cv2.addWeighted(frame, 0.7, overlay, 0.7, 0)
            
            video_writer.write(result_overlay)
            bar.next()
    except Exception as e:
        logger.error(f"Error generating heatmap video: {e}")
        raise
    finally:
        bar.finish()
        capture.release()
        video_writer.release()
    
    # Verify the video was created successfully
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        logger.info(f"Heatmap video generated successfully at {output_path} ({os.path.getsize(output_path)} bytes)")
    else:
        logger.error(f"Failed to generate heatmap video at {output_path}")
        if os.path.exists(output_path):
            logger.error(f"File exists but is empty ({os.path.getsize(output_path)} bytes)")
        else:
            logger.error("File does not exist")
    
    return output_path

# Define a custom exception class for task cancellation
class TaskCancelledError(Exception):
    """Custom exception for task cancellation to avoid logging stack traces"""
    pass

def generate_heatmap_frames(video_path, frame_interval=1, task_instance=None):
    """
    Processes a video and generates frames with heatmap overlay at specified intervals.
    Returns a list of base64 encoded frames with heatmap applied.
    
    Args:
        video_path: Path to the video file
        frame_interval: Interval at which to save frames
        task_instance: Celery task instance for checking cancellation
    """
    logger.info(f"Generating heatmap frames from {video_path} with interval {frame_interval}")
    
    capture = cv2.VideoCapture(video_path)
    length = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    background_subtractor = cv2.bgsegm.createBackgroundSubtractorMOG()
    
    # Get video properties
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = capture.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0  # Default to 30 fps if can't determine
    
    bar = Bar('Processing Heatmap Frames', max=length)
    
    # Initialize accumulator image
    accum_image = np.zeros((height, width), np.uint8)
    heatmap_frames = []
    frame_count = 0
    
    # Generate heatmap analysis data
    movement_intensity = []
    movement_regions = []
    frame_timestamps = []
    
    while True:
        # Check for task cancellation if task_instance is provided
        if task_instance and hasattr(task_instance, 'request'):
            # Check if the task is revoked
            if hasattr(task_instance.request, 'id'):
                from .celery import celery_app
                task_id = task_instance.request.id
                task_result = celery_app.AsyncResult(task_id)
                if task_result.state == 'REVOKED':
                    logger.warning(f"Task {task_id} was cancelled - stopping heatmap generation")
                    # Make sure the exception message matches exactly what the frontend is expecting
                    # Raise our custom exception instead of a generic Exception
                    capture.release()
                    bar.finish()
                    raise TaskCancelledError("Task cancelled by user")
                
        ret, frame = capture.read()
        if not ret:
            break
            
        # Check for task cancellation every 10 frames
        if frame_count % 10 == 0 and task_instance and hasattr(task_instance, 'request'):
            if hasattr(task_instance.request, 'id'):
                from .celery import celery_app
                task_id = task_instance.request.id
                task_result = celery_app.AsyncResult(task_id)
                if task_result.state == 'REVOKED':
                    logger.warning(f"Task {task_id} was cancelled after {frame_count} frames - stopping heatmap generation")
                    # Clean up resources
                    bar.finish()
                    capture.release()
                    # Make sure the exception message matches exactly what the frontend is expecting
                    raise TaskCancelledError("Task cancelled by user")
            
        # Process every frame to update the accumulator
        filter_mask = background_subtractor.apply(frame)
        _, thresholded = cv2.threshold(filter_mask, 2, 2, cv2.THRESH_BINARY)
        accum_image = cv2.add(accum_image, thresholded)
        
        # Calculate movement intensity (white pixel percentage)
        white_pixels = cv2.countNonZero(thresholded)
        total_pixels = width * height
        intensity = (white_pixels / total_pixels) * 100
        movement_intensity.append(intensity)
        
        # Calculate movement regions
        contours, _ = cv2.findContours(thresholded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        regions = []
        for contour in contours:
            if cv2.contourArea(contour) > 100:  # Filter out small noise
                x, y, w, h = cv2.boundingRect(contour)
                regions.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
        
        movement_regions.append(regions)
        try:
            current_fps = capture.get(cv2.CAP_PROP_FPS)
            if current_fps <= 0:
                current_fps = fps  # Use the fps we saved at the beginning
            
            frame_time = frame_count / current_fps if current_fps > 0 else frame_count / 30.0
            frame_timestamps.append(frame_time)
        except Exception as e:
            logger.warning(f"Error calculating frame timestamp: {e}")
            # Fallback to frame count in seconds at 30fps
            frame_timestamps.append(frame_count / 30.0)
        
        # Only save frames at the specified interval
        if frame_count % frame_interval == 0:
            # Create heatmap overlay
            overlay = cv2.applyColorMap(accum_image, cv2.COLORMAP_HOT)
            result_overlay = cv2.addWeighted(frame, 0.7, overlay, 0.7, 0)
            
            # Convert to base64 for sending to frontend
            _, buffer = cv2.imencode('.jpg', result_overlay)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            heatmap_frames.append(encoded_frame)
            
            # Update task progress if task_instance is provided
            if task_instance and frame_count % 10 == 0:  # Update every 10 frames
                progress = int((frame_count / length) * 100) if length > 0 else 0
                if hasattr(task_instance, 'update_state'):
                    task_instance.update_state(
                        state='PROGRESS', 
                        meta={
                            'status': f'Generating heatmap analysis ({progress}%)',
                            'percent': progress
                        }
                    )
            
        frame_count += 1
        bar.next()
    
    bar.finish()
    capture.release()
    
    # Generate analysis summary
    # Add detailed debug logging
    logger.info(f"Generating analysis: len(movement_intensity)={len(movement_intensity) if movement_intensity else 0}, fps={fps}, length={length}")
    
    peak_time = 0
    avg_intensity = 0
    
    # Check task cancellation one more time before analysis
    if task_instance and hasattr(task_instance, 'request'):
        if hasattr(task_instance.request, 'id'):
            from .celery import celery_app
            task_id = task_instance.request.id
            task_result = celery_app.AsyncResult(task_id)
            if task_result.state == 'REVOKED':
                logger.warning(f"Task {task_id} was cancelled before analysis - stopping heatmap generation")
                # Make sure the exception message matches exactly what the frontend is expecting
                raise TaskCancelledError("Task cancelled by user")
    
    # Calculate peak time safely
    if movement_intensity and len(movement_intensity) > 0:
        try:
            max_value = max(movement_intensity)
            logger.info(f"Max intensity value: {max_value}")
            max_intensity_index = movement_intensity.index(max_value)
            logger.info(f"Max intensity index: {max_intensity_index}, len(frame_timestamps)={len(frame_timestamps)}")
            
            if frame_timestamps and max_intensity_index < len(frame_timestamps):
                peak_time = frame_timestamps[max_intensity_index]
                logger.info(f"Peak time set to: {peak_time}")
            else:
                logger.warning(f"Invalid index or empty frame_timestamps: index={max_intensity_index}, len(timestamps)={len(frame_timestamps) if frame_timestamps else 0}")
                
            if len(movement_intensity) > 0:
                avg_intensity = sum(movement_intensity) / len(movement_intensity)
                logger.info(f"Average intensity: {avg_intensity}")
            else:
                logger.warning("Movement intensity array is empty, can't calculate average")
                
        except (ValueError, ZeroDivisionError) as e:
            logger.warning(f"Error calculating heatmap analytics: {e}")
            
    # Calculate movement duration
    movement_duration = 0
    try:
        if movement_intensity and fps > 0:
            movements = [i for i in movement_intensity if i > 1]
            logger.info(f"Movement count: {len(movements)}, fps: {fps}")
            movement_duration = len(movements) / fps
            logger.info(f"Movement duration: {movement_duration}")
    except ZeroDivisionError:
        logger.warning("FPS is zero, cannot calculate movement duration")
        
    # Calculate total duration
    total_duration = 0
    try:
        if fps > 0 and length > 0:
            total_duration = length / fps
            logger.info(f"Total duration: {total_duration}")
    except ZeroDivisionError:
        logger.warning("FPS is zero, cannot calculate total duration")
    
    try:
        analysis = {
            "frames": heatmap_frames if heatmap_frames else [],
            "movement_intensity": movement_intensity if movement_intensity else [],
            "peak_movement_time": peak_time,
            "average_intensity": avg_intensity,
            "movement_duration": movement_duration,
            "total_duration": total_duration
        }
        logger.info("Successfully created analysis result dictionary")
    except Exception as e:
        logger.error(f"Error creating analysis dictionary: {e}")
        # Create a minimal analysis object as fallback
        analysis = {
            "frames": heatmap_frames if heatmap_frames else [],
            "movement_intensity": [],
            "peak_movement_time": 0,
            "average_intensity": 0,
            "movement_duration": 0,
            "total_duration": 0
        }
    
    logger.info(f"Heatmap analysis generated with {len(heatmap_frames)} frames")
    return analysis

# Add this function after the generate_heatmap_video function

def convert_to_hls(video_path, task_id=None):
    """
    Converts a video file to HLS format for better browser compatibility.
    
    Args:
        video_path: Path to the input video file
        task_id: Optional task ID to use in the output directory name
        
    Returns:
        Path to the HLS manifest file (index.m3u8)
    """
    import subprocess
    import shutil
    
    # Check if ffmpeg is available
    try:
        ffmpeg_version = subprocess.check_output(['ffmpeg', '-version'], stderr=subprocess.STDOUT)
        logger.info(f"Using ffmpeg: {ffmpeg_version.decode().splitlines()[0]}")
    except (subprocess.SubprocessError, FileNotFoundError):
        logger.error("ffmpeg not found. Cannot convert to HLS format.")
        return None
    
    # Create a unique directory for this HLS stream
    hls_dir = os.path.join(tempfile.gettempdir(), f"hls_stream_{task_id or os.path.basename(video_path).split('.')[0]}")
    
    # Create directory if it doesn't exist
    if not os.path.exists(hls_dir):
        os.makedirs(hls_dir)
    else:
        # Clean up existing files
        for file in os.listdir(hls_dir):
            os.remove(os.path.join(hls_dir, file))
    
    # Output manifest path
    manifest_path = os.path.join(hls_dir, "index.m3u8")
    
    # Improved ffmpeg command for better browser compatibility
    # - Using libx264 codec with baseline profile for maximum compatibility
    # - Setting keyframe interval to 2 seconds (fps*2)
    # - Using AAC audio codec
    # - Creating segments of 2 seconds each
    # - Using a lower bitrate for better streaming
    try:
        # Get video FPS
        probe_cmd = [
            'ffprobe', 
            '-v', 'error', 
            '-select_streams', 'v:0', 
            '-show_entries', 'stream=r_frame_rate', 
            '-of', 'default=noprint_wrappers=1:nokey=1', 
            video_path
        ]
        fps_output = subprocess.check_output(probe_cmd).decode().strip()
        # Parse frame rate which might be in format "30000/1001"
        if '/' in fps_output:
            num, den = map(int, fps_output.split('/'))
            fps = num / den
        else:
            fps = float(fps_output)
        
        if fps <= 0:
            fps = 30.0  # Default to 30 fps if can't determine
            
        keyframe_interval = int(fps * 2)  # 2-second keyframe interval
        
        # Improved HLS conversion command
        # cmd = [
        #     'ffmpeg',
        #     '-i', video_path,
        #     '-c:v', 'libx264',              # Video codec
        #     '-profile:v', 'baseline',       # H.264 profile for maximum compatibility
        #     '-level', '3.0',                # H.264 level
        #     '-start_number', '0',           # Start segment numbering at 0
        #     '-hls_time', '2',               # 2-second segments
        #     '-hls_list_size', '0',          # Keep all segments in the playlist
        #     '-f', 'hls',                    # HLS format
        #     '-g', str(keyframe_interval),   # GOP size (keyframe interval)
        #     '-sc_threshold', '0',           # Disable scene change detection
        #     '-b:v', '1500k',                # Video bitrate
        #     '-maxrate', '1500k',            # Maximum bitrate
        #     '-bufsize', '3000k',            # Buffer size
        #     '-c:a', 'aac',                  # Audio codec
        #     '-b:a', '128k',                 # Audio bitrate
        #     '-ac', '2',                     # 2 audio channels (stereo)
        #     '-ar', '44100',                 # Audio sample rate
        #     '-hls_segment_filename', os.path.join(hls_dir, 'segment_%03d.ts'),
        #     manifest_path
        # ]

        cmd = [
          'ffmpeg',
         '-i', video_path,
          '-c:v', 'libx264',        # Video codec
          '-preset', 'fast',        # Preset for encoding speed vs compression ratio
          '-crf', '23',             # Constant Rate Factor (lower is better quality)
         '-sc_threshold', '0',     # Disable scene change detection
           '-g', '60',               # GOP size (keyframe interval)
          '-hls_time', '4',         # 4-second segments
          '-hls_list_size', '0',    # Keep all segments in the playlist
          '-f', 'hls',              # HLS format
          '-hls_segment_filename', os.path.join(hls_dir, 'segment_%03d.ts'),
          os.path.join(hls_dir, 'index.m3u8')  # Output HLS manifest
        ]

        
        logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
        subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
        
        logger.info(f"HLS conversion successful. Manifest at: {manifest_path}")
        return manifest_path
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Error converting to HLS: {e.stderr.decode() if e.stderr else str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during HLS conversion: {str(e)}")
        return None