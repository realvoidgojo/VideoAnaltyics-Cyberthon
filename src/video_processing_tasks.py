# src/video_processing_tasks.py
from .celery import celery_app
from . import video_processing, object_detection, heatmap_analysis
import os
import logging
import cv2
import numpy as np
import base64
from progress.bar import Bar
import tempfile

# Configure logging within this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# Add handler to print to console
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# We've moved this function to heatmap_analysis.py
# This stub is kept to avoid breaking existing code
def generate_heatmap_frames(video_path, frame_interval=1, task_instance=None):
    """
    Legacy function - now moved to heatmap_analysis.py
    
    Use heatmap_analysis.generate_heatmap_frames instead
    """
    logger.warning("Using deprecated generate_heatmap_frames function - use heatmap_analysis module instead")
    result = heatmap_analysis.generate_heatmap_frames(video_path, frame_interval, task_instance)
    return result["frames"]  # Return only the frames for backward compatibility

@celery_app.task(bind=True)
def process_video_task(self, video_path, model_name, frame_interval, use_heatmap='false'):
    """
    Processes a video file, performs object detection, and returns the results as JSON.
    If use_heatmap is set to 'true', also generates heatmap frames.
    Checks for task cancellation during processing.
    """
    try:
        # Add safer task cancellation check
        task_id = self.request.id
        if task_id:
            try:
                task_result = celery_app.AsyncResult(task_id)
                if task_result and task_result.state == 'REVOKED':
                    logger.warning(f"Task {task_id} was already cancelled before starting")
                    return {
                        'error': 'Task cancelled by user',
                        'state': 'REVOKED'
                    }
            except Exception as e:
                logger.error(f"Error checking task state: {e}")

        # Add progress tracking
        self.update_state(state='STARTED', meta={'status': 'Extracting frames'})
        
        # Generate heatmap frames if requested
        heatmap_frames = []
        heatmap_video_path = None
        heatmap_analysis_data = {
            'peak_movement_time': 0,
            'average_intensity': 0,
            'movement_duration': 0,
            'total_duration': 0
        }
        
        if use_heatmap.lower() == 'true':
            self.update_state(state='PROGRESS', meta={'status': 'Generating heatmap frames'})
            
            try:
                frame_interval_int = int(frame_interval)
                heatmap_result = heatmap_analysis.generate_heatmap_frames(
                    video_path, 
                    frame_interval_int,
                    self
                )
                
                if not heatmap_result:
                    logger.warning("Heatmap generation returned no results")
                    heatmap_frames = []
                    heatmap_analysis_data = {}
                else:
                    heatmap_frames = heatmap_result.get("frames", [])
                    heatmap_analysis_data = {
                        'peak_movement_time': heatmap_result.get("peak_movement_time", 0),
                        'average_intensity': heatmap_result.get("average_intensity", 0),
                        'movement_duration': heatmap_result.get("movement_duration", 0),
                        'total_duration': heatmap_result.get("total_duration", 0)
                    }
                    
            except heatmap_analysis.TaskCancelledError:
                logger.warning(f"Task {task_id} was cancelled during heatmap generation")
                return {
                    'error': 'Task cancelled by user',
                    'state': 'REVOKED'
                }
            except Exception as e:
                logger.error(f"Error in heatmap generation: {str(e)}")
                heatmap_frames = []
                heatmap_analysis_data = {}

            # Check cancellation again before starting heatmap video generation
            task_result = celery_app.AsyncResult(task_id)
            if task_result.state == 'REVOKED':
                logger.warning(f"Task {task_id} was cancelled before heatmap video generation")
                self.update_state(state='REVOKED', 
                               meta={'status': 'Task cancelled by user before heatmap video generation'})
                # Create proper exception dict for Celery with the required format
                exception_info = {
                    'exc_type': 'TaskCancellation',
                    'exc_message': ['Task cancelled by user'],  # Must be a list
                    'exc_module': 'celery.exceptions'
                }
                return {'error': 'Task cancelled by user', **exception_info}
            
            # Create output filename with .avi extension (more compatible)
            video_basename = os.path.basename(video_path)
            video_name = os.path.splitext(video_basename)[0]
            heatmap_video_path = os.path.join(tempfile.gettempdir(), f"heatmap_{video_name}.avi")
            
            # Try to generate the heatmap video
            heatmap_video = heatmap_analysis.generate_heatmap_video(video_path, heatmap_video_path, self)
            logger.info(f"Generated heatmap video at: {heatmap_video}")
            heatmap_video_path = heatmap_video  # Update path to returned value

            # APPROACH #3: TRY TO EXTRACT ANALYSIS DATA
            try:
                if heatmap_result and isinstance(heatmap_result, dict):
                    # Safely extract values with fallbacks
                    heatmap_analysis_data = {
                        'peak_movement_time': heatmap_result.get("peak_movement_time", 0),
                        'average_intensity': heatmap_result.get("average_intensity", 0),
                        'movement_duration': heatmap_result.get("movement_duration", 0),
                        'total_duration': heatmap_result.get("total_duration", 0)
                    }
                    logger.info(f"Heatmap analysis data extracted: {heatmap_analysis_data}")
                else:
                    logger.warning("Could not extract heatmap analysis data: result was not a dictionary or was None")
            except Exception as e:
                logger.error(f"Error extracting heatmap analysis data: {e}")
            
            # Always update state to inform frontend about heatmap status
            self.update_state(state='PROGRESS', 
                            meta={
                                'status': 'Heatmap processing completed, continuing with object detection',
                                'heatmap_analysis': heatmap_analysis_data,
                                'heatmap_video_path': heatmap_video_path,
                                'heatmap_frames_count': len(heatmap_frames)
                            })
        
        # Check cancellation again before starting object detection
        task_result = celery_app.AsyncResult(self.request.id)
        if task_result.state == 'REVOKED':
            logger.warning(f"Task {self.request.id} was cancelled before object detection")
            self.update_state(state='REVOKED', 
                           meta={'status': 'Task cancelled by user before object detection'})
            # Create proper exception dict for Celery
            exception_info = {
                'exc_type': 'TaskCancellation',
                'exc_message': 'Task cancelled by user',
                'exc_module': 'celery.exceptions'
            }
            return {'error': 'Task cancelled by user', **exception_info}
            
        frames = video_processing.extract_frames(video_path, interval=int(frame_interval))
        total_frames = len(frames)
        all_results = []
        
        for i, frame in enumerate(frames):
            # Check for task cancellation using multiple methods
            # 1. Check state directly from the backend
            current_state = celery_app.backend.get_state(self.request.id)
            # 2. Check if task is revoked in the request
            is_revoked = getattr(self.request, 'is_revoked', lambda: False)()
            # 3. Manually get the task result to check if it's been marked as revoked
            task_result = celery_app.AsyncResult(self.request.id)
            
            if current_state == 'REVOKED' or is_revoked or task_result.state == 'REVOKED':
                logger.warning(f"Task {self.request.id} was cancelled - stopping processing")
                # Explicitly update state to show cancellation in UI
                # Make sure this message appears exactly as 'Task cancelled by user' so the frontend can match it
                self.update_state(state='REVOKED', 
                                 meta={
                                     'current': i, 
                                     'total': total_frames, 
                                     'status': 'Task cancelled by user',
                                     'error': 'Task cancelled by user'
                                 })
                # Create a properly formatted exception for Celery
                class TaskCancellationError(Exception):
                    pass
                
                raise TaskCancellationError("Task cancelled by user")
            
            # Update progress
            progress = int((i / total_frames) * 100) if total_frames > 0 else 0
            self.update_state(state='PROGRESS', 
                            meta={'current': i, 'total': total_frames, 
                                  'status': f'Processing frame {i}', 
                                  'percent': progress})
            
            logger.warning(f"Processing frame {i}")
            preprocessed_frame = video_processing.preprocess_frame(frame)
            object_results = object_detection.detect_objects(preprocessed_frame, 
                                                          model_path=f"./models/{model_name}")
            
            all_results.append([{
                'class_name': det['class_name'],
                'confidence': det['confidence'],
                'box': det['box'],
                'track_id': det['track_id']
            } for det in object_results])

        # Get actual dimensions from the first frame if available
        cap = cv2.VideoCapture(video_path)
        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        # Ensure we have heatmap data set properly
        # If heatmap was requested but analysis_data is empty, we might have set it elsewhere in the code
        if use_heatmap.lower() == 'true':
            # Get the analysis data from the state if available
            task_result = celery_app.AsyncResult(self.request.id)
            if task_result.info and isinstance(task_result.info, dict):
                if 'heatmap_analysis' in task_result.info:
                    heatmap_analysis_data = task_result.info['heatmap_analysis']
                    logger.info(f"Using heatmap_analysis_data from task state: {heatmap_analysis_data}")
                if 'heatmap_video_path' in task_result.info:
                    heatmap_video_path = task_result.info['heatmap_video_path']
                    logger.info(f"Using heatmap_video_path from task state: {heatmap_video_path}")
        
        # Add information about whether heatmap was requested, regardless of success
        use_heatmap_value = use_heatmap.lower() == 'true'
        logger.info(f"Returning result with use_heatmap={use_heatmap_value}, heatmap_frames_count={len(heatmap_frames)}")
        
        return {
            'results': all_results,
            'original_width': actual_width,
            'original_height': actual_height,
            'preprocessed_width': 640,
            'preprocessed_height': 480,
            'heatmap_frames': heatmap_frames,
            'use_heatmap': use_heatmap_value,
            'heatmap_analysis': heatmap_analysis_data,
            'heatmap_video_path': heatmap_video_path
        }

    except heatmap_analysis.TaskCancelledError:
        logger.warning(f"Task {self.request.id} was cancelled")
        return {
            'exc_type': 'TaskCancelled',
            'exc_message': ['Task cancelled by user'],
            'exc_module': 'celery.exceptions'
        }
    except Exception as e:
        logger.error(f"Processing Error: {str(e)}")
        return {
            'exc_type': type(e).__name__,
            'exc_message': [str(e)],
            'exc_module': type(e).__module__
        }

    finally:
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                logger.info(f"Successfully removed video file: {video_path}")
            except Exception as e:
                logger.error(f"Error removing video file: {str(e)}")