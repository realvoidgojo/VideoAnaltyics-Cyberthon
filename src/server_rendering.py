import cv2
import numpy as np
import os
import logging
import subprocess
import json
import time
import traceback
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoRenderEngine:
    def __init__(self, model_name="yolov11s.pt", confidence=0.25):
        self.model_name = model_name
        self.confidence = confidence
        self.celery_task = None
        
        try:
            # Import here to avoid circular imports
            from src.object_detection import get_model
            self.model = get_model(model_name)
            logger.info(f"Successfully initialized model: {model_name}")
        except (ImportError, FileNotFoundError) as e:
            logger.error(f"Failed to initialize model: {e}")
            # Create a more informative error
            if isinstance(e, ImportError):
                raise ImportError(f"Could not import required module: {str(e)}")
            else:
                raise ValueError(f"Model initialization failed: {str(e)}")
    
    def set_task(self, task):
        """Set the Celery task for progress updates"""
        self.celery_task = task
    
    def process_video(self, video_path, output_dir, frame_interval=5, use_heatmap=False):
        """Process video and generate HLS stream with detections rendered"""
        
        # Ensure frame_interval is an integer
        try:
            frame_interval = int(frame_interval)
        except (ValueError, TypeError):
            logger.warning(f"Invalid frame interval '{frame_interval}', using default of 5")
            frame_interval = 5
            
        # Constrain within reasonable bounds
        frame_interval = max(1, min(30, frame_interval))
        
        logger.info(f"Processing video with frame interval: {frame_interval}")
        
        # Convert use_heatmap to boolean if it's a string
        if isinstance(use_heatmap, str):
            use_heatmap = use_heatmap.lower() == 'true'
        
        # Add explicit logging of heatmap mode
        logger.info(f"Processing video with heatmap mode: {use_heatmap}")
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Processing video: {video_path} to {output_dir}")
        self._update_progress("Opening video and initializing processing", 5)
        
        # Check if video file exists
        if not os.path.exists(video_path):
            logger.error(f"Video file not found: {video_path}")
            self._update_progress(f"Error: Video file not found: {video_path}", 0)
            return None
        
        # Check if ffmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            logger.info("FFmpeg is available")
        except (subprocess.SubprocessError, FileNotFoundError):
            logger.error("FFmpeg not found. Cannot perform HLS conversion.")
            self._update_progress("Error: FFmpeg not found", 0)
            return None
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Could not open video file: {video_path}")
            self._update_progress(f"Error: Could not open video file", 0)
            return None
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if fps <= 0:
            fps = 30.0  # Default to 30 fps if can't determine
        
        logger.info(f"Video properties: {width}x{height} @ {fps} fps, {total_frames} frames")
        self._update_progress(f"Reading video: {width}x{height} @ {fps} fps", 10)
        
        # Create temporary file for processed frames
        temp_output_mp4 = os.path.join(output_dir, "temp_processed.mp4")
        
        # Try different codecs as fallbacks
        codecs_to_try = [
            ('mp4v', '.mp4'),
            ('avc1', '.mp4'),
            ('MJPG', '.avi')
        ]
        
        # Try each codec until one works
        out = None
        for codec, extension in codecs_to_try:
            try:
                temp_output_file = os.path.join(output_dir, f"temp_processed{extension}")
                fourcc = cv2.VideoWriter_fourcc(*codec)
                out = cv2.VideoWriter(temp_output_file, fourcc, fps, (width, height))
                
                if out.isOpened():
                    temp_output_mp4 = temp_output_file
                    logger.info(f"Successfully created video writer with codec {codec}")
                    break
            except Exception as e:
                logger.warning(f"Failed to create writer with codec {codec}: {e}")
                if out is not None:
                    out.release()
                    out = None
        
        if out is None or not out.isOpened():
            logger.error("Failed to create video writer with any codec")
            cap.release()
            self._update_progress("Error: Failed to create video writer", 0)
            return None
        
        # Process frames
        frame_count = 0
        processed_frames = 0
        detections_data = []
        object_frequency = {}  # Track object frequency
        unique_objects = set()  # Track unique objects by class+id
        last_update_time = time.time()
        update_interval = 1  # Update progress every 1 second
        
        self._update_progress("Starting frame processing", 15)
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frames at specified interval
                if frame_count % frame_interval == 0:
                    # Update progress regularly
                    now = time.time()
                    if now - last_update_time >= update_interval:
                        progress = int(20 + (frame_count / total_frames) * 60) if total_frames > 0 else 30
                        self._update_progress(f"Processing frame {frame_count}/{total_frames}", progress)
                        last_update_time = now
                        
                        # Print current frame for debugging
                        logger.info(f"Processing frame {frame_count}/{total_frames} ({int(progress)}%)")
                    
                    # Detect objects with robust error handling
                    try:
                        # Run detection using the appropriate model
                        results = self.model(frame)
                        
                        # Extract detections (handle different YOLO versions)
                        frame_detections = self._extract_detections_safely(results)
                        
                        # Draw detections on frame
                        annotated_frame = self._draw_detections(frame, frame_detections)
                        
                        # Write annotated frame to video
                        out.write(annotated_frame)
                        
                        # Save detection data
                        timestamp = frame_count / fps
                        detections_data.append({
                            'frame_number': frame_count,
                            'timestamp': timestamp,
                            'detections': frame_detections
                        })
                        
                        # Analyze object frequency - count by class and track ID
                        for det in frame_detections:
                            class_name = det['class_name']
                            track_id = det.get('track_id')
                            
                            # Create a unique identifier for this object
                            object_key = f"{class_name}_{track_id}" if track_id else class_name
                            
                            # Add to unique objects set
                            unique_objects.add(object_key)
                            
                            # Count by class name
                            if class_name in object_frequency:
                                object_frequency[class_name] += 1
                            else:
                                object_frequency[class_name] = 1
                        
                        processed_frames += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing frame {frame_count}: {e}")
                        logger.error(traceback.format_exc())
                        # Write original frame on error
                        out.write(frame)
                
                frame_count += 1
                
                # Prevent CPU overload with a small delay
                if frame_count % 30 == 0:
                    time.sleep(0.01)
                
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            logger.error(traceback.format_exc())
            
        finally:
            # Close video resources
            cap.release()
            out.release()
            
            # Check if any frames were processed
            if processed_frames == 0:
                logger.error("No frames were processed successfully")
                self._update_progress("Error: No frames were processed successfully", 0)
                return None
        
        # Save detection data to JSON
        detections_file = os.path.join(output_dir, 'detections.json')
        with open(detections_file, 'w') as f:
            json.dump(detections_data, f)
        
        # Convert to HLS format
        self._update_progress("Converting to HLS format for streaming", 75)
        
        # Set up FFmpeg process for direct HLS output
        hls_path = os.path.join(output_dir, "stream.m3u8")
        master_path = os.path.join(output_dir, "master.m3u8")
        
        # Create FFmpeg command for HLS
        cmd = [
            'ffmpeg',
            '-y',  # Overwrite output files
            '-i', temp_output_mp4,  # Input from intermediate file
            '-c:v', 'libx264',  # Output codec
            '-preset', 'veryfast',
            '-g', '60',  # Keyframe interval
            '-hls_time', '2',  # 2-second segments
            '-hls_list_size', '0',  # Keep all segments
            '-hls_segment_filename', os.path.join(output_dir, 'segment_%03d.ts'),
            '-f', 'hls',  # Output format
            hls_path
        ]
        
        # Execute FFmpeg command
        try:
            ffmpeg_process = subprocess.Popen(cmd, stderr=subprocess.PIPE)
            stderr_data = ffmpeg_process.communicate()[1]
            stderr_output = stderr_data.decode('utf-8', errors='ignore')
            
            # Log the FFmpeg output
            logger.info(f"FFmpeg stderr output: {stderr_output}")
            
            if ffmpeg_process.returncode != 0:
                logger.error(f"FFmpeg conversion failed with return code {ffmpeg_process.returncode}")
                self._update_progress("Error: FFmpeg conversion failed", 0)
                return None
            
        except Exception as e:
            logger.error(f"Error running FFmpeg: {e}")
            self._update_progress("Error: FFmpeg conversion failed", 0)
            return None
        
        # Create master playlist
        self._create_master_playlist(master_path, hls_path)
        
        # Check if any TS segment files were created
        segment_count = len([f for f in os.listdir(output_dir) if f.endswith('.ts')])
        logger.info(f"Generated {segment_count} HLS segments")
        
        self._update_progress("Finalizing HLS stream", 95)
        
        if segment_count == 0:
            logger.error("No HLS segments were created - stream will not be playable")
            self._update_progress("Error: No HLS segments were created", 0)
            return None
        
        # Final success status update
        self._update_progress("Processing complete", 100)
        
        # Return metadata about the processed video
        result = {
            'hls_url': f'/hls_stream/{os.path.basename(output_dir)}/stream.m3u8',
            'master_url': f'/hls_stream/{os.path.basename(output_dir)}/master.m3u8',
            'detections_file': detections_file,
            'width': width,
            'height': height,
            'fps': fps,
            'total_frames': total_frames,
            'processed_frames': processed_frames,
            'segment_count': segment_count,
            'object_frequency': object_frequency,  # Add this to the result
            'unique_object_count': len(unique_objects),  # Add this to the result
            'use_heatmap': use_heatmap,  # Make sure this is a boolean
            'rendered_video_path': temp_output_mp4  # Add this line to include the processed video path
        }

        # At the end, before returning result, add heatmap analysis data
        if use_heatmap and object_frequency:
            try:
                self._update_progress("Generating heatmap analysis", 85)
                
                # Import heatmap_analysis module
                from . import heatmap_analysis
                
                # Calculate movement data from the detections for heatmap analysis
                total_frames = processed_frames if processed_frames > 0 else 1
                total_objects = sum(object_frequency.values()) if object_frequency else 0
                
                # Generate heatmap data
                movement_intensity = []
                frame_timestamps = []
                
                # Extract timestamps and movement data from detections
                for detection in detections_data:
                    frame_num = detection.get('frame_number', 0)
                    timestamp = detection.get('timestamp', frame_num / fps if fps > 0 else 0)
                    frame_timestamps.append(timestamp)
                    
                    # Calculate movement intensity based on object count
                    frame_objects = len(detection.get('detections', []))
                    intensity = (frame_objects / 20) * 100  # Normalize to percentage (max 20 objects = 100%)
                    movement_intensity.append(min(intensity, 100))
                
                # Find peak movement time
                peak_time = 0
                if movement_intensity:
                    max_idx = movement_intensity.index(max(movement_intensity))
                    if 0 <= max_idx < len(frame_timestamps):
                        peak_time = frame_timestamps[max_idx]
                
                # Calculate average intensity
                avg_intensity = 0
                if movement_intensity:
                    avg_intensity = sum(movement_intensity) / len(movement_intensity)
                
                # Calculate durations
                movement_duration = processed_frames / fps if fps > 0 else 0
                total_duration = total_frames / fps if fps > 0 else 0
                
                # Create heatmap video
                heatmap_video_path = os.path.join(output_dir, "heatmap.mp4")
                
                # Generate heatmap overlay video using combined frames
                self._generate_heatmap_video(video_path, heatmap_video_path, fps, frame_interval)
                
                # Add heatmap analysis data to the result
                result['heatmap_analysis'] = {
                    'peak_movement_time': peak_time,
                    'average_intensity': avg_intensity,
                    'movement_duration': movement_duration,
                    'total_duration': total_duration
                }
                
                # Add heatmap video path to the result
                result['heatmap_video_path'] = heatmap_video_path
                
                # Convert heatmap video to HLS
                self._update_progress("Converting heatmap to HLS format", 90)
                heatmap_hls_dir = os.path.join(output_dir, "heatmap_hls")
                os.makedirs(heatmap_hls_dir, exist_ok=True)
                
                heatmap_manifest = self._convert_to_hls(
                    heatmap_video_path, 
                    os.path.join(heatmap_hls_dir, "stream.m3u8")
                )
                
                if heatmap_manifest:
                    result['heatmap_hls_url'] = f'/hls_stream/{os.path.basename(output_dir)}/heatmap_hls/stream.m3u8'
                    result['use_heatmap'] = True
            
            except Exception as e:
                logger.error(f"Error generating heatmap: {e}")
                logger.error(traceback.format_exc())
        
        return result

    def _extract_detections_safely(self, results):
        """
        Safely extract detections from YOLO results, handling different model outputs
        with proper error handling
        """
        frame_detections = []
        try:
            # Determine the type of results we're dealing with
            logger.info(f"Result type: {type(results)}")
            
            # Handle different formats of YOLO outputs
            if isinstance(results, list):
                # List of Result objects (YOLOv8 style)
                for result in results:
                    self._extract_from_result_object(result, frame_detections)
            else:
                # Single Result object
                self._extract_from_result_object(results, frame_detections)
                
        except Exception as e:
            logger.error(f"Error extracting detections: {e}")
            logger.error(traceback.format_exc())
            
        return frame_detections
    
    def _extract_from_result_object(self, result, frame_detections):
        """Extract detections from a single Result object"""
        try:
            # YOLOv8 style with .boxes attribute
            if hasattr(result, 'boxes') and hasattr(result.boxes, 'data'):
                for box in result.boxes:
                    try:
                        # Extract box coordinates
                        if hasattr(box, 'xyxy') and len(box.xyxy) > 0:
                            xyxy = box.xyxy[0].cpu().numpy()
                            
                            # Extract confidence
                            conf = float(box.conf[0].cpu().numpy()) if hasattr(box, 'conf') else 0.0
                            
                            # Extract class ID
                            cls_id = int(box.cls[0].cpu().numpy()) if hasattr(box, 'cls') else 0
                            
                            if conf >= self.confidence:
                                class_name = result.names[cls_id] if hasattr(result, 'names') else f"class_{cls_id}"
                                frame_detections.append({
                                    'box': [float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])],
                                    'confidence': conf,
                                    'class_name': class_name
                                })
                    except Exception as box_error:
                        logger.error(f"Error processing individual box: {box_error}")
            
            # YOLOv5/YOLOx style with .xyxy attribute
            elif hasattr(result, 'xyxy') and len(result.xyxy) > 0:
                boxes = result.xyxy[0].cpu().numpy()
                for det in boxes:
                    x1, y1, x2, y2, conf, cls_id = det
                    if conf >= self.confidence:
                        class_name = result.names[int(cls_id)]
                        frame_detections.append({
                            'box': [float(x1), float(y1), float(x2), float(y2)],
                            'confidence': float(conf),
                            'class_name': class_name
                        })
                        
            # YOLOx style with .xywh attribute
            elif hasattr(result, 'xywh') and len(result.xywh) > 0:
                boxes = result.xywh[0].cpu().numpy()
                for det in boxes:
                    x, y, w, h, conf, cls_id = det
                    if conf >= self.confidence:
                        # Convert xywh to xyxy (top-left, bottom-right)
                        x1, y1 = x - w/2, y - h/2
                        x2, y2 = x + w/2, y + h/2
                        class_name = result.names[int(cls_id)]
                        frame_detections.append({
                            'box': [float(x1), float(y1), float(x2), float(y2)],
                            'confidence': float(conf),
                            'class_name': class_name
                        })
                        
            # Alternative format for newer YOLO versions
            elif hasattr(result, 'pred') and len(result.pred) > 0:
                for i, pred in enumerate(result.pred):
                    if pred is not None and len(pred) > 0:
                        for *xyxy, conf, cls in pred:
                            if conf >= self.confidence:
                                class_name = result.names[int(cls)]
                                frame_detections.append({
                                    'box': [float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])],
                                    'confidence': float(conf),
                                    'class_name': class_name
                                })
            
        except Exception as e:
            logger.error(f"Error in _extract_from_result_object: {e}")
            logger.error(traceback.format_exc())
    
    def _draw_detections(self, frame, detections):
        """Draw bounding boxes and labels on frame"""
        overlay = frame.copy()
        
        # Configure drawing parameters
        box_thickness = 2
        text_size = 0.5
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Class-specific colors
        color_map = {
            'person': (0, 255, 0),    # Green
            'car': (0, 0, 255),       # Red
            'truck': (255, 0, 0),     # Blue
            'boat': (255, 165, 0),    # Orange
            'bench': (128, 0, 128),   # Purple
            # Add more classes as needed
        }
        
        # Draw each detection
        for det in detections:
            try:
                # Get coordinates
                x1, y1, x2, y2 = map(int, det['box'])
                
                # Determine color based on class
                class_name = det['class_name']
                color = color_map.get(class_name, (255, 255, 0))  # Default to yellow
                
                # Draw bounding box
                cv2.rectangle(overlay, (x1, y1), (x2, y2), color, box_thickness)
                
                # Prepare label with class name and confidence
                label = f"{class_name}: {det['confidence']:.2f}"
                if 'track_id' in det and det['track_id'] is not None:
                    label += f" ID:{det['track_id']}"
                    
                # Draw label background
                label_size, _ = cv2.getTextSize(label, font, text_size, 1)
                cv2.rectangle(overlay, (x1, y1 - 20), (x1 + label_size[0], y1), color, -1)
                
                # Draw label text
                cv2.putText(overlay, label, (x1, y1 - 5), font, text_size, (255, 255, 255), 1)
            except Exception as e:
                logger.error(f"Error drawing detection: {e}")
        
        # Set transparency for the overlay
        alpha = 0.7
        return cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)
    
    def _create_master_playlist(self, master_path, hls_path):
        """Create HLS master playlist"""
        try:
            with open(master_path, 'w') as f:
                f.write('#EXTM3U\n')
                f.write('#EXT-X-VERSION:3\n')
                f.write(f'#EXT-X-STREAM-INF:BANDWIDTH=2000000\n')
                f.write(os.path.basename(hls_path))
            logger.info(f"Created master playlist at {master_path}")
        except Exception as e:
            logger.error(f"Error creating master playlist: {e}")
    
    def _update_progress(self, message, percent):
        """Update task progress in Celery"""
        logger.info(f"Progress: {percent}% - {message}")
        
        try:
            if self.celery_task and hasattr(self.celery_task, 'update_state'):
                self.celery_task.update_state(
                    state='PROGRESS',
                    meta={
                        'status': message,
                        'percent': percent
                    }
                )
        except Exception as e:
            logger.error(f"Error updating task status: {e}")

    def _generate_heatmap_video(self, video_path, output_path, fps, frame_interval):
        """Generate a heatmap video from the input video"""
        try:
            import cv2
            import numpy as np
            
            # Open video
            cap = cv2.VideoCapture(video_path)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Create video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            # Create background subtractor
            background_subtractor = cv2.createBackgroundSubtractorMOG2()
            
            # Initialize accumulator image
            accum_image = np.zeros((height, width), np.uint8)
            frame_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Update progress
                if frame_count % 30 == 0:
                    progress = 85 + int((frame_count / total_frames) * 5)
                    self._update_progress(f"Generating heatmap video frame {frame_count}/{total_frames}", progress)
                
                # Apply background subtraction
                fg_mask = background_subtractor.apply(frame)
                
                # Threshold to remove noise
                _, thresh = cv2.threshold(fg_mask, 25, 255, cv2.THRESH_BINARY)
                
                # Update accumulator
                accum_image = cv2.add(accum_image, (thresh > 0).astype(np.uint8))
                
                # Create heatmap overlay
                colormap = cv2.applyColorMap(
                    cv2.normalize(accum_image, None, 0, 255, cv2.NORM_MINMAX), 
                    cv2.COLORMAP_JET
                )
                
                # Blend with original frame
                result = cv2.addWeighted(frame, 0.7, colormap, 0.3, 0)
                
                # Write frame
                out.write(result)
                frame_count += 1
                
            cap.release()
            out.release()
            
        except Exception as e:
            logger.error(f"Error generating heatmap video: {e}")
            logger.error(traceback.format_exc())
            
    def _convert_to_hls(self, input_path, output_path):
        """Convert a video to HLS format"""
        try:
            import subprocess
            import os
            
            # Create directory for HLS segments
            output_dir = os.path.dirname(output_path)
            os.makedirs(output_dir, exist_ok=True)
            
            # Create FFmpeg command for HLS conversion
            cmd = [
                'ffmpeg',
                '-y',  # Overwrite output
                '-i', input_path,  # Input file
                '-c:v', 'libx264',  # Video codec
                '-preset', 'fast',  # Encoding speed
                '-g', '60',  # GOP size
                '-hls_time', '2',  # Segment length
                '-hls_list_size', '0',  # Keep all segments
                '-hls_segment_filename', os.path.join(output_dir, 'segment_%03d.ts'),
                '-f', 'hls',  # Output format
                output_path  # Output file
            ]
            
            # Run FFmpeg
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                logger.error(f"FFmpeg error: {stderr.decode()}")
                return None
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error converting to HLS: {e}")
            logger.error(traceback.format_exc())
            return None