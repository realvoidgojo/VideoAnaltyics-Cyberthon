"""
Enhanced Object Tracking Module
Implements object tracking with consistent unique IDs to prevent frequency count inflation.
Uses ByteTrack-style tracking for reliable multi-object tracking across frames.
"""

import numpy as np
import logging
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

@dataclass
class TrackedObject:
    """Represents a tracked object with consistent ID"""
    track_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    last_seen_frame: int
    first_seen_frame: int
    frames_tracked: int
    center: Tuple[float, float]
    
    def update(self, bbox: List[float], confidence: float, frame_num: int):
        """Update object position and confidence"""
        self.bbox = bbox
        self.confidence = confidence
        self.last_seen_frame = frame_num
        self.frames_tracked += 1
        self.center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)

class ObjectTracker:
    """
    Enhanced object tracker that maintains consistent IDs across frames
    and provides accurate frequency counting without duplication.
    """
    
    def __init__(self, max_disappeared: int = 30, iou_threshold: float = 0.2):
        """
        Initialize the object tracker
        
        Args:
            max_disappeared: Maximum frames an object can be missing before deletion
            iou_threshold: IoU threshold for object matching (lowered for better tracking)
        """
        self.max_disappeared = max_disappeared
        self.iou_threshold = iou_threshold
        self.next_object_id = 1
        self.tracked_objects: Dict[int, TrackedObject] = {}
        self.disappeared_counts: Dict[int, int] = defaultdict(int)
        self.frame_count = 0
        
        # Enhanced frequency tracking based on spatial uniqueness
        self.unique_object_frequencies: Dict[str, int] = defaultdict(int)
        self.seen_objects: set = set()  # Track unique objects by (class, id)
        self.class_track_history: Dict[str, set] = defaultdict(set)  # Track all track IDs per class
        
        # Enhanced frequency tracking to prevent duplicate counting of moving objects
        self.unique_object_positions: Dict[str, List[Tuple[float, float]]] = defaultdict(list)
        self.spatial_threshold = 100.0  # Minimum distance between unique objects of same class
        
        # Track object lifespans to better handle frequency counting
        self.object_lifespans: Dict[int, Dict] = {}  # track_id -> {class_name, birth_frame, counted}
        self.counted_objects: set = set()  # Track which objects we've already counted
        
        logger.info(f"ObjectTracker initialized with IoU threshold: {iou_threshold}")
    
    def update(self, detections: List[Dict]) -> List[Dict]:
        """
        Update tracker with new detections from current frame
        
        Args:
            detections: List of detection dictionaries with keys:
                       'class_name', 'confidence', 'box'
        
        Returns:
            List of tracking results with consistent track_ids
        """
        self.frame_count += 1
        
        if not detections:
            # No detections in this frame, increment disappeared counts
            self._handle_no_detections()
            return []
        
        # Convert detections to numpy arrays for processing
        detection_boxes = np.array([det['box'] for det in detections])
        detection_classes = [det['class_name'] for det in detections]
        detection_confidences = [det['confidence'] for det in detections]
        
        # If no existing tracks, initialize all detections as new tracks
        if not self.tracked_objects:
            return self._initialize_tracks(detections)
        
        # Calculate IoU matrix between existing tracks and new detections
        existing_boxes = np.array([obj.bbox for obj in self.tracked_objects.values()])
        iou_matrix = self._calculate_iou_matrix(existing_boxes, detection_boxes)
        
        # Match detections to existing tracks
        matched_pairs, unmatched_detections, unmatched_tracks = self._match_detections(
            iou_matrix, len(self.tracked_objects), len(detections)
        )
        
        # Update matched tracks
        tracked_objects_list = list(self.tracked_objects.values())
        for track_idx, det_idx in matched_pairs:
            track_id = tracked_objects_list[track_idx].track_id
            self.tracked_objects[track_id].update(
                detection_boxes[det_idx].tolist(),
                detection_confidences[det_idx],
                self.frame_count
            )
            self.disappeared_counts[track_id] = 0
        
        # Handle unmatched tracks (increment disappeared count)
        for track_idx in unmatched_tracks:
            track_id = tracked_objects_list[track_idx].track_id
            self.disappeared_counts[track_id] += 1
        
        # Create new tracks for unmatched detections
        for det_idx in unmatched_detections:
            self._create_new_track(detections[det_idx])
        
        # Remove tracks that have been missing too long
        self._remove_lost_tracks()
        
        # Prepare output with tracking information
        return self._prepare_tracking_output()
    
    def _handle_no_detections(self):
        """Handle case when no detections are found in current frame"""
        for track_id in list(self.tracked_objects.keys()):
            self.disappeared_counts[track_id] += 1
        self._remove_lost_tracks()
    
    def _initialize_tracks(self, detections: List[Dict]) -> List[Dict]:
        """Initialize tracks for first frame or when no existing tracks"""
        results = []
        for detection in detections:
            track_id = self._create_new_track(detection)
            result = detection.copy()
            result['track_id'] = track_id
            results.append(result)
        return results
    
    def _create_new_track(self, detection: Dict) -> int:
        """Create a new track for an unmatched detection with improved duplicate prevention"""
        track_id = self.next_object_id
        self.next_object_id += 1
        
        bbox = detection['box']
        center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        class_name = detection['class_name']
        
        tracked_obj = TrackedObject(
            track_id=track_id,
            class_name=class_name,
            confidence=detection['confidence'],
            bbox=bbox,
            last_seen_frame=self.frame_count,
            first_seen_frame=self.frame_count,
            frames_tracked=1,
            center=center
        )
        
        self.tracked_objects[track_id] = tracked_obj
        self.disappeared_counts[track_id] = 0
        
        # Enhanced frequency counting approach
        should_count = self._should_count_as_new_object(detection, track_id)
        
        if should_count:
            self.unique_object_frequencies[class_name] += 1
            self.counted_objects.add(track_id)
            logger.info(f"New unique {class_name} with ID {track_id} (Total: {self.unique_object_frequencies[class_name]})")
        else:
            logger.info(f"Track ID {track_id} for {class_name} - not counting (likely duplicate/recovery)")
        
        # Record object lifespan
        self.object_lifespans[track_id] = {
            'class_name': class_name,
            'birth_frame': self.frame_count,
            'counted': should_count,
            'initial_position': center
        }
        
        # Always track the object key for debugging
        object_key = f"{class_name}_{track_id}"
        self.seen_objects.add(object_key)
        self.class_track_history[class_name].add(track_id)
        
        return track_id
    
    def _remove_lost_tracks(self):
        """Remove tracks that have been missing for too long"""
        to_remove = []
        for track_id, disappeared_count in self.disappeared_counts.items():
            if disappeared_count > self.max_disappeared:
                to_remove.append(track_id)
        
        for track_id in to_remove:
            if track_id in self.tracked_objects:
                obj = self.tracked_objects[track_id]
                logger.info(f"Removing lost track: {track_id} ({obj.class_name}) after {disappeared_count} frames")
                del self.tracked_objects[track_id]
            if track_id in self.disappeared_counts:
                del self.disappeared_counts[track_id]
    
    def _check_for_potential_duplicates(self, detection: Dict) -> bool:
        """
        Check if a new detection might be a duplicate of an existing track
        based on spatial proximity and class similarity
        """
        bbox = detection['box']
        center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        class_name = detection['class_name']
        
        # Check against all active tracks of the same class
        for track_id, tracked_obj in self.tracked_objects.items():
            if tracked_obj.class_name == class_name:
                # Calculate distance between centers
                track_center = tracked_obj.center
                distance = np.sqrt((center[0] - track_center[0])**2 + (center[1] - track_center[1])**2)
                
                # If centers are very close (within 50 pixels), might be duplicate
                if distance < 50:
                    logger.warning(f"Potential duplicate {class_name} detected: new center {center} vs existing ID {track_id} center {track_center} (distance: {distance:.1f})")
                    return True
        
        return False
    
    def _should_count_as_new_object(self, detection: Dict, track_id: int) -> bool:
        """
        Determine if a new detection should be counted as a new unique object.
        Uses multiple criteria to prevent duplicate counting of moving objects.
        """
        bbox = detection['box']
        center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        class_name = detection['class_name']
        
        # Simple approach: Only count if this is genuinely in a new area
        # AND there are no recently disappeared objects of the same class nearby
        
        # Check 1: Is there a recently disappeared track of the same class nearby?
        recently_lost_tracks = self._get_recently_lost_tracks(class_name, frames_back=10)
        for lost_track_info in recently_lost_tracks:
            lost_center = lost_track_info['last_position']
            distance = np.sqrt((center[0] - lost_center[0])**2 + (center[1] - lost_center[1])**2)
            
            # If this new detection is close to a recently lost track, it's probably the same object
            if distance < self.spatial_threshold:
                logger.debug(f"New {class_name} at {center} close to recently lost track (distance: {distance:.1f}px)")
                return False
        
        # Check 2: Is there already an active track of same class nearby?
        for existing_id, obj in self.tracked_objects.items():
            if existing_id != track_id and obj.class_name == class_name:
                distance = np.sqrt((center[0] - obj.center[0])**2 + (center[1] - obj.center[1])**2)
                if distance < self.spatial_threshold:
                    logger.debug(f"New {class_name} too close to existing track {existing_id} (distance: {distance:.1f}px)")
                    return False
        
        # Check 3: Allow legitimate new objects but be conservative about rapid creation
        recent_new_objects = len([
            track_data for track_data in self.object_lifespans.values()
            if (track_data['class_name'] == class_name and 
                track_data['counted'] and 
                (self.frame_count - track_data['birth_frame']) < 5)  # Only within last 5 frames
        ])
        
        # Only block if we're seeing too many new objects in rapid succession
        if recent_new_objects >= 3:  # Allow up to 3 new objects in 5 frames
            logger.debug(f"Already counted {recent_new_objects} new {class_name}(s) in last 5 frames - being conservative")
            return False
        
        logger.info(f"Counting new {class_name} at {center} as unique object")
        return True
    
    def _get_recently_lost_tracks(self, class_name: str, frames_back: int = 15) -> List[Dict]:
        """Get information about recently lost tracks of a specific class"""
        recently_lost = []
        cutoff_frame = max(0, self.frame_count - frames_back)
        
        for track_id, track_data in self.object_lifespans.items():
            if (track_data['class_name'] == class_name and 
                track_id not in self.tracked_objects and  # Track is no longer active
                track_data['counted']):                   # Only consider objects that were counted
                
                # Check if this object was lost recently enough to matter
                birth_frame = track_data['birth_frame']
                if birth_frame >= cutoff_frame:
                    recently_lost.append({
                        'track_id': track_id,
                        'last_position': track_data['initial_position'],
                        'birth_frame': birth_frame
                    })
        
        return recently_lost
    
    def _prepare_tracking_output(self) -> List[Dict]:
        """Prepare the final tracking output for current frame"""
        results = []
        for track_id, obj in self.tracked_objects.items():
            # Only include objects seen in recent frames
            if self.disappeared_counts[track_id] == 0:
                results.append({
                    'class_name': obj.class_name,
                    'confidence': obj.confidence,
                    'box': obj.bbox,
                    'track_id': obj.track_id
                })
        return results
    
    def _calculate_iou_matrix(self, boxes1: np.ndarray, boxes2: np.ndarray) -> np.ndarray:
        """Calculate IoU matrix between two sets of bounding boxes"""
        if len(boxes1) == 0 or len(boxes2) == 0:
            return np.zeros((len(boxes1), len(boxes2)))
        
        # Calculate intersection areas
        x1 = np.maximum(boxes1[:, None, 0], boxes2[None, :, 0])
        y1 = np.maximum(boxes1[:, None, 1], boxes2[None, :, 1])
        x2 = np.minimum(boxes1[:, None, 2], boxes2[None, :, 2])
        y2 = np.minimum(boxes1[:, None, 3], boxes2[None, :, 3])
        
        intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        
        # Calculate areas
        area1 = (boxes1[:, 2] - boxes1[:, 0]) * (boxes1[:, 3] - boxes1[:, 1])
        area2 = (boxes2[:, 2] - boxes2[:, 0]) * (boxes2[:, 3] - boxes2[:, 1])
        
        union = area1[:, None] + area2[None, :] - intersection
        
        # Avoid division by zero and ensure proper data types
        iou = np.divide(intersection, union, out=np.zeros_like(intersection, dtype=np.float64), where=union != 0)
        
        return iou
    
    def _match_detections(self, iou_matrix: np.ndarray, num_tracks: int, num_detections: int) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """
        Enhanced matching algorithm that prioritizes higher IoU matches and considers class consistency
        
        Returns:
            matched_pairs: List of (track_idx, detection_idx) pairs
            unmatched_detections: List of detection indices
            unmatched_tracks: List of track indices
        """
        if num_tracks == 0:
            return [], list(range(num_detections)), []
        
        if num_detections == 0:
            return [], [], list(range(num_tracks))
        
        # Enhanced matching with multiple thresholds for better accuracy
        matched_pairs = []
        used_tracks = set()
        used_detections = set()
        
        # First pass: High confidence matches (IoU > 0.5)
        high_conf_indices = np.where(iou_matrix > 0.5)
        if len(high_conf_indices[0]) > 0:
            high_ious = iou_matrix[high_conf_indices]
            sorted_high = np.argsort(-high_ious)
            
            for idx in sorted_high:
                track_idx = high_conf_indices[0][idx]
                det_idx = high_conf_indices[1][idx]
                
                if track_idx not in used_tracks and det_idx not in used_detections:
                    matched_pairs.append((track_idx, det_idx))
                    used_tracks.add(track_idx)
                    used_detections.add(det_idx)
        
        # Second pass: Medium confidence matches (IoU > threshold)
        remaining_valid = np.where((iou_matrix > self.iou_threshold) & (iou_matrix <= 0.5))
        if len(remaining_valid[0]) > 0:
            medium_ious = iou_matrix[remaining_valid]
            sorted_medium = np.argsort(-medium_ious)
            
            for idx in sorted_medium:
                track_idx = remaining_valid[0][idx]
                det_idx = remaining_valid[1][idx]
                
                if track_idx not in used_tracks and det_idx not in used_detections:
                    matched_pairs.append((track_idx, det_idx))
                    used_tracks.add(track_idx)
                    used_detections.add(det_idx)
        
        unmatched_tracks = [i for i in range(num_tracks) if i not in used_tracks]
        unmatched_detections = [i for i in range(num_detections) if i not in used_detections]
        
        return matched_pairs, unmatched_detections, unmatched_tracks
    
    def get_frequency_statistics(self) -> Dict[str, int]:
        """
        Get accurate frequency statistics for unique objects
        
        Returns:
            Dictionary mapping class names to unique object counts
        """
        return dict(self.unique_object_frequencies)
    
    def get_tracking_summary(self) -> Dict:
        """Get comprehensive tracking summary"""
        total_unique_objects = sum(self.unique_object_frequencies.values())
        active_tracks = len(self.tracked_objects)
        
        return {
            'total_unique_objects': total_unique_objects,
            'active_tracks': active_tracks,
            'frames_processed': self.frame_count,
            'unique_object_frequencies': dict(self.unique_object_frequencies),
            'class_distribution': {
                class_name: {
                    'count': count,
                    'percentage': round((count / total_unique_objects) * 100, 2) if total_unique_objects > 0 else 0
                }
                for class_name, count in self.unique_object_frequencies.items()
            }
        }
    
    def reset(self):
        """Reset the tracker state"""
        self.tracked_objects.clear()
        self.disappeared_counts.clear()
        self.unique_object_frequencies.clear()
        self.seen_objects.clear()
        self.class_track_history.clear()
        self.unique_object_positions.clear()
        self.object_lifespans.clear()
        self.counted_objects.clear()
        self.next_object_id = 1
        self.frame_count = 0
        logger.info("ObjectTracker reset")
    
    def get_debug_info(self) -> Dict:
        """Get detailed debugging information about the tracker state"""
        return {
            'active_tracks': len(self.tracked_objects),
            'total_unique_objects': sum(self.unique_object_frequencies.values()),
            'frames_processed': self.frame_count,
            'class_frequencies': dict(self.unique_object_frequencies),
            'class_track_counts': {k: len(v) for k, v in self.class_track_history.items()},
            'active_track_ids': list(self.tracked_objects.keys()),
            'disappeared_counts': dict(self.disappeared_counts),
            'unique_positions_count': {k: len(v) for k, v in self.unique_object_positions.items()},
            'spatial_threshold': self.spatial_threshold
        }
    
    def set_spatial_threshold(self, threshold: float):
        """Adjust the spatial threshold for unique object detection"""
        self.spatial_threshold = threshold
        logger.info(f"Spatial threshold updated to {threshold} pixels") 