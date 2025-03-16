# src/video_processing_tasks.py
from .celery import celery_app
from . import video_processing, object_detection
import os
import logging 

# Configure logging within this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# Add handler to print to console
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

@celery_app.task(bind=True)
def process_video_task(self, video_path, model_name, frame_interval):
    """
    Processes a video file, performs object detection, and returns the results as JSON.
    Checks for task cancellation during processing.
    """
    try:
        # Add progress tracking
        self.update_state(state='STARTED', meta={'status': 'Extracting frames'})
        frames = video_processing.extract_frames(video_path, interval=frame_interval)
        total_frames = len(frames)
        all_results = []
        
        for i, frame in enumerate(frames):
            # Check if task has been revoked - multiple methods
            # Method 1: Using request.is_revoked() if available
            try:
                if hasattr(self.request, 'is_revoked') and self.request.is_revoked():
                    logger.warning(f"Task {self.request.id} was cancelled (via is_revoked) - stopping processing")
                    self.update_state(state='REVOKED', meta={'status': 'Task cancelled by user'})
                    return {'status': 'Task cancelled by user'}
            except Exception as e:
                logger.warning(f"Error checking is_revoked: {e}")
            
            # Method 2: Check task state from backend
            try:
                from .celery import celery_app
                if celery_app.backend.get_state(self.request.id) == 'REVOKED':
                    logger.warning(f"Task {self.request.id} was cancelled (via backend state) - stopping processing")
                    self.update_state(state='REVOKED', meta={'status': 'Task cancelled by user'})
                    return {'status': 'Task cancelled by user'}
            except Exception as e:
                logger.warning(f"Error checking backend state: {e}")
            
            # Update progress
            progress = int((i / total_frames) * 100) if total_frames > 0 else 0
            self.update_state(state='PROGRESS', 
                             meta={'current': i, 'total': total_frames, 'status': f'Processing frame {i}', 'percent': progress})
            
            logger.warning(f"Processing frame {i}")
            preprocessed_frame = video_processing.preprocess_frame(frame)
            object_results = object_detection.detect_objects(preprocessed_frame, model_path=f"./models/{model_name}")
            formatted_results = []
            for detection in object_results:
                formatted_results.append({
                    'class_name': detection['class_name'],
                    'confidence': detection['confidence'],
                    'box': detection['box'],
                    'track_id': detection['track_id']
                })

            all_results.append(formatted_results)

        original_width, original_height = 720, 1280  # Simulated dimension

        return {
            'results': all_results,
            'original_width': original_width,
            'original_height': original_height,
            'preprocessed_width': 640,  # Replace with actual values
            'preprocessed_height': 480  # Replace with actual values
        }
    except Exception as e:
        print(f"Processing Error: {e}")
        return {'error': str(e)}

    finally:  # Cleanup
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                print(f"Successfully removed video file: {video_path} after processing.")
            except Exception as e:
                print(f"Error removing video file: {e} after processing.")
