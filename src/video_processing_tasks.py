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
                    self.update_state(state='REVOKED', meta={
                        'status': 'Task cancelled by user',
                        'percent': 0,
                        'exc_type': 'TaskCancellation',
                        'exc_message': 'Task cancelled by user',
                        'exc_module': 'celery.exceptions'
                    })
                    return None
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
                logger.warning("Heatmap generation was cancelled by user")
                return {
                    'exc_type': 'TaskCancellation',
                    'exc_message': ['Task cancelled by user'],
                    'exc_module': 'celery.exceptions',
                    'error': 'Task cancelled by user',
                    'state': 'REVOKED'
                }
            except Exception as e:
                logger.error(f"Error generating heatmap frames: {e}")
                heatmap_frames = []
                heatmap_analysis_data = {}
                
            # Generate heatmap video
            self.update_state(state='PROGRESS', meta={
                'status': 'Generating heatmap video',
                'current': 80,
                'total': 100,
                'heatmap_frames': heatmap_frames,
                'heatmap_analysis': heatmap_analysis_data
            })
            
            try:
                heatmap_video_path = heatmap_analysis.generate_heatmap_video(video_path, task_instance=self)
                logger.info(f"Heatmap video generated at: {heatmap_video_path}")
            except heatmap_analysis.TaskCancelledError:
                logger.warning("Heatmap video generation was cancelled by user")
                return {
                    'exc_type': 'TaskCancellation',
                    'exc_message': ['Task cancelled by user'],
                    'exc_module': 'celery.exceptions',
                    'error': 'Task cancelled by user',
                    'state': 'REVOKED'
                }
            except Exception as e:
                logger.error(f"Error generating heatmap video: {e}")
                heatmap_video_path = None
                
            # Add HLS conversion here, after heatmap_video_path is set
            if heatmap_video_path:
                # Also convert to HLS for better browser compatibility
                self.update_state(state='PROGRESS', meta={
                    'status': 'Converting heatmap video to HLS format',
                    'current': 90,
                    'total': 100,
                    'heatmap_frames': heatmap_frames,
                    'heatmap_video_path': heatmap_video_path,
                    'heatmap_analysis': heatmap_analysis_data
                })
                
                hls_manifest_path = heatmap_analysis.convert_to_hls(heatmap_video_path, task_id=self.request.id)
                if hls_manifest_path:
                    logger.info(f"HLS manifest created at: {hls_manifest_path}")
                else:
                    logger.warning("Failed to create HLS stream, will use direct MP4 streaming as fallback")
                
                # Add HLS path to the result
                heatmap_analysis_data['hls_manifest_path'] = hls_manifest_path
        
        # Extract frames from the video
        self.update_state(state='PROGRESS', meta={
            'status': 'Extracting frames',
            'current': 10,
            'total': 100,
            'heatmap_frames': heatmap_frames,
            'heatmap_video_path': heatmap_video_path,
            'heatmap_analysis': heatmap_analysis_data
        })
        
        # Continue with the rest of the processing...
        frames = video_processing.extract_frames(video_path, interval=int(frame_interval))
        total_frames = len(frames)
        all_results = []
        
        for i, frame in enumerate(frames):
            # Check for task cancellation
            task_result = celery_app.AsyncResult(self.request.id)
            if task_result.state == 'REVOKED':
                logger.warning(f"Task {self.request.id} was cancelled - stopping processing")
                self.update_state(state='REVOKED', meta={
                    'status': 'Task cancelled by user',
                    'percent': progress,
                    'exc_type': 'TaskCancellation',
                    'exc_message': 'Task cancelled by user',
                    'exc_module': 'celery.exceptions'
                })
                raise heatmap_analysis.TaskCancelledError("Task cancelled by user")
            
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
        self.update_state(state='REVOKED', meta={
            'status': 'Task cancelled by user',
            'percent': 0,
            'exc_type': 'TaskCancellation',
            'exc_message': 'Task cancelled by user',
            'exc_module': 'celery.exceptions'
        })
        return {
            'exc_type': 'TaskCancellation',
            'exc_message': 'Task cancelled by user',
            'exc_module': 'celery.exceptions'
        }

    except Exception as e:
        logger.error(f"Processing Error: {str(e)}")
        raise e

    finally:
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                logger.info(f"Successfully removed video file: {video_path}")
            except Exception as e:
                logger.error(f"Error removing video file: {str(e)}")