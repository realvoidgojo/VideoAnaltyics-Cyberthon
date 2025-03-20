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
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # MP4V codec for MP4 files
    video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not video_writer.isOpened():
        # Try MJPG as a fallback
        logger.warning("Failed to initialize VideoWriter with H.264 codec. Trying MJPG...")
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
    
    logger.info(f"Heatmap video generated at {output_path}")
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