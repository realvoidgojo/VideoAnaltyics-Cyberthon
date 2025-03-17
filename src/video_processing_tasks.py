# src/video_processing_tasks.py
from .celery import celery_app
from . import video_processing, object_detection
import os
import logging
import cv2
import numpy as np
import base64
from progress.bar import Bar

# Configure logging within this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# Add handler to print to console
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

def generate_heatmap_frames(video_path, frame_interval=1):
    """
    Processes a video and generates frames with heatmap overlay at specified intervals.
    Returns a list of base64 encoded frames with heatmap applied.
    """
    capture = cv2.VideoCapture(video_path)
    length = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    background_subtractor = cv2.bgsegm.createBackgroundSubtractorMOG()
    
    # Get video properties
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    bar = Bar('Processing Heatmap Frames', max=length)
    
    # Initialize accumulator image
    accum_image = np.zeros((height, width), np.uint8)
    heatmap_frames = []
    frame_count = 0
    
    while True:
        ret, frame = capture.read()
        if not ret:
            break
            
        # Process every frame to update the accumulator
        filter_mask = background_subtractor.apply(frame)
        _, thresholded = cv2.threshold(filter_mask, 2, 2, cv2.THRESH_BINARY)
        accum_image = cv2.add(accum_image, thresholded)
        
        # Only save frames at the specified interval
        if frame_count % frame_interval == 0:
            # Create heatmap overlay
            overlay = cv2.applyColorMap(accum_image, cv2.COLORMAP_HOT)
            result_overlay = cv2.addWeighted(frame, 0.7, overlay, 0.7, 0)
            
            # Convert to base64 for sending to frontend
            _, buffer = cv2.imencode('.jpg', result_overlay)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            heatmap_frames.append(encoded_frame)
            
        frame_count += 1
        bar.next()
    
    bar.finish()
    capture.release()
    
    return heatmap_frames

@celery_app.task(bind=True)
def process_video_task(self, video_path, model_name, frame_interval, use_heatmap='false'):
    """
    Processes a video file, performs object detection, and returns the results as JSON.
    If use_heatmap is set to 'true', also generates heatmap frames.
    Checks for task cancellation during processing.
    """
    try:
        # Add progress tracking
        self.update_state(state='STARTED', meta={'status': 'Extracting frames'})
        
        # Generate heatmap frames if requested
        heatmap_frames = []
        if use_heatmap.lower() == 'true':
            self.update_state(state='PROGRESS', meta={'status': 'Generating heatmap frames'})
            try:
                frame_interval_int = int(frame_interval)
                heatmap_frames = generate_heatmap_frames(video_path, frame_interval_int)
                self.update_state(state='PROGRESS', 
                                meta={'status': 'Heatmap frames generated, continuing with object detection'})
            except Exception as e:
                logger.error(f"Error generating heatmap frames: {e}")
                # Continue with normal processing even if heatmap fails
        
        frames = video_processing.extract_frames(video_path, interval=int(frame_interval))
        total_frames = len(frames)
        all_results = []
        
        for i, frame in enumerate(frames):
            # Check for task cancellation using task state
            current_state = celery_app.backend.get_state(self.request.id)
            if current_state == 'REVOKED':
                logger.warning(f"Task {self.request.id} was cancelled - stopping processing")
                raise Exception("Task cancelled by user")
            
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
        
        return {
            'results': all_results,
            'original_width': actual_width,
            'original_height': actual_height,
            'preprocessed_width': 640,
            'preprocessed_height': 480,
            'heatmap_frames': heatmap_frames,
            'use_heatmap': use_heatmap.lower() == 'true'
        }

    except Exception as e:
        logger.error(f"Processing Error: {str(e)}")
        # Properly format exception for Celery
        return {'error': str(e), 'exc_type': type(e).__name__}

    finally:
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
                logger.info(f"Successfully removed video file: {video_path}")
            except Exception as e:
                logger.error(f"Error removing video file: {str(e)}")
