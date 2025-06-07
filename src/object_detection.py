from ultralytics import YOLO
import torch
import os
import time
import logging

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(device)

# Model cache to avoid reloading
_model_cache = {}

def load_model(model_path):
    """Load YOLO model with caching for better performance"""
    if model_path in _model_cache:
        # Check if the model was loaded recently (within last 30 minutes)
        model_data = _model_cache[model_path]
        if time.time() - model_data['timestamp'] < 1800:  # 30 minutes
            logger.info(f"Using cached model for {model_path}")
            return model_data['model']
    
    logger.info(f"Loading model from {model_path}")
    try:
        # Load the model
        from ultralytics import YOLO
        model = YOLO(model_path)
        
        # Cache the model with timestamp
        _model_cache[model_path] = {
            'model': model,
            'timestamp': time.time()
        }
        
        return model
    except Exception as e:
        logger.error(f"Error loading model {model_path}: {e}", exc_info=True)
        raise

# Add the missing get_model function
def get_model(model_name):
    """Get a YOLO model by name - wrapper for load_model"""
    # Validate model name
    if not model_name:
        model_name = "yolov11n.pt"  # Default model
        logger.warning(f"No model specified, using default: {model_name}")

    # Check if model path is absolute or relative
    if os.path.isabs(model_name):
        model_path = model_name
    else:
        # If path doesn't have .pt extension, add it
        if not model_name.endswith('.pt'):
            model_name = f"{model_name}.pt"
            
        # Check models directory
        model_path = os.path.join("models", model_name)
        
        # Verify model exists
        if not os.path.exists(model_path):
            error_msg = f"Model '{model_name}' not found in models directory. Available models: {os.listdir('models')}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

    logger.info(f"Loading model: {model_path}")
    return load_model(model_path)

# Simple Unique ID generator (replace with more robust method if needed)
class UniqueIDGenerator:
    def __init__(self):
        self.next_id = 0

    def get_next(self):
        self.next_id += 1
        return self.next_id

def detect_objects(frames, model_path="./models/yolov11n.pt", confidence_threshold=0.5, iou_threshold=0.5, use_tracking=False):
    """
    Enhanced object detection with optional tracking support
    
    Args:
        frames: Single frame or list of frames
        model_path: Path to YOLO model
        confidence_threshold: Confidence threshold for detections
        iou_threshold: IoU threshold for NMS
        use_tracking: Whether to use built-in YOLO tracking (deprecated - use ObjectTracker instead)
    
    Returns:
        Detections without tracking IDs (use ObjectTracker for consistent tracking)
    """
    model = YOLO(model_path).to(device)  # Move model to GPU
    
    # Check if the input is a single frame or a batch of frames
    if isinstance(frames, list):
        # Process batch of frames
        results = model(frames, stream=False, persist=False, conf=confidence_threshold, iou=iou_threshold)
        all_detections = []
        
        # Iterate over each frame's results
        for frame_result in results:
            detections = []
            if frame_result and frame_result.boxes:
                for box in frame_result.boxes:
                    conf = box.conf[0].item()
                    class_id = int(box.cls[0].item())
                    class_name = frame_result.names[class_id]
                    # Get the bounding box coordinates
                    bbox = box.xyxy[0].tolist()
                    
                    detections.append({
                        'class_name': class_name,
                        'confidence': conf,
                        'box': bbox,
                        'track_id': None  # Will be assigned by ObjectTracker
                    })
            all_detections.append(detections)
        return all_detections
    else:
        # Process single frame
        if use_tracking:
            # Use YOLO's built-in tracking (less reliable)
            results = model.track(frames, persist=True, conf=confidence_threshold, iou=iou_threshold)
        else:
            # Use detection only (recommended with ObjectTracker)
            results = model(frames, conf=confidence_threshold, iou=iou_threshold)
            
        detections = []
        if results and results[0].boxes:
            for box in results[0].boxes:
                conf = box.conf[0].item()
                class_id = int(box.cls[0].item())
                class_name = results[0].names[class_id]
                # Get the bounding box coordinates
                bbox = box.xyxy[0].tolist()
                
                # For YOLO tracking, extract track ID if available
                track_id = None
                if use_tracking and hasattr(box, 'id') and box.id is not None:
                    track_id = int(box.id[0].item())
                
                detections.append({
                    'class_name': class_name,
                    'confidence': conf,
                    'box': bbox,
                    'track_id': track_id
                })
        return detections

def detect_objects_with_tracking(frame, model, tracker):
    """
    Enhanced detection with integrated tracking for consistent object IDs
    
    Args:
        frame: Input frame (numpy array)
        model: YOLO model instance
        tracker: ObjectTracker instance
    
    Returns:
        List of detections with consistent track_ids
    """
    # Run detection
    results = model(frame, conf=0.25, iou=0.5)
    
    # Extract raw detections
    raw_detections = []
    if results and results[0].boxes:
        for box in results[0].boxes:
            conf = box.conf[0].item()
            class_id = int(box.cls[0].item())
            class_name = results[0].names[class_id]
            bbox = box.xyxy[0].tolist()
            
            raw_detections.append({
                'class_name': class_name,
                'confidence': conf,
                'box': bbox
            })
    
    # Update tracker with detections
    tracked_detections = tracker.update(raw_detections)
    
    return tracked_detections

def calculate_area(bbox):
    return abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))