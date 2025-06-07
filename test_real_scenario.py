#!/usr/bin/env python3
"""Test realistic scenarios that match the user's actual problem"""

import sys
sys.path.append('src')

from object_tracker import ObjectTracker

def test_confidence_level_changes():
    """Test that same car with different confidence levels is only counted once"""
    print("Testing car with changing confidence levels...")
    
    tracker = ObjectTracker()
    
    # Simulate the user's exact scenario - same car with different confidence levels
    frames = [
        # Car detected with confidence 0.5
        [{'class_name': 'car', 'confidence': 0.5, 'box': [100, 100, 200, 200]}],
        
        # Same car, same position, but confidence jumps to 0.95
        [{'class_name': 'car', 'confidence': 0.95, 'box': [105, 105, 205, 205]}],
        
        # Car moves slightly, confidence drops to 0.7
        [{'class_name': 'car', 'confidence': 0.7, 'box': [110, 110, 210, 210]}],
        
        # Tracking might briefly fail, car gets new ID but similar position, confidence 0.85
        [{'class_name': 'car', 'confidence': 0.85, 'box': [115, 115, 215, 215]}],
        
        # Car continues moving, confidence drops to 0.6
        [{'class_name': 'car', 'confidence': 0.6, 'box': [120, 120, 220, 220]}],
    ]
    
    track_ids_seen = set()
    
    for frame_idx, detection_list in enumerate(frames):
        result = tracker.update(detection_list)
        print(f"\nFrame {frame_idx + 1}:")
        for obj in result:
            track_ids_seen.add(obj['track_id'])
            print(f"  - {obj['class_name']} ID:{obj['track_id']} conf:{obj['confidence']:.2f}")
        
        freq = tracker.get_frequency_statistics()
        print(f"  Unique frequencies: {freq}")
    
    final_stats = tracker.get_tracking_summary()
    print(f"\n=== FINAL RESULTS ===")
    print(f"Total unique cars: {final_stats['unique_object_frequencies'].get('car', 0)}")
    print(f"Track IDs seen: {sorted(track_ids_seen)}")
    print(f"Expected: 1 car (regardless of confidence changes or brief tracking failures)")
    
    return final_stats['unique_object_frequencies'].get('car', 0) == 1

def test_multiple_moving_cars():
    """Test multiple cars moving in different areas"""
    print("\n\nTesting multiple moving cars...")
    
    tracker = ObjectTracker()
    
    frames = [
        # Frame 1: Two cars in different areas
        [
            {'class_name': 'car', 'confidence': 0.8, 'box': [100, 100, 200, 200]},  # Car 1
            {'class_name': 'car', 'confidence': 0.9, 'box': [500, 500, 600, 600]},  # Car 2
        ],
        
        # Frame 2: Cars move slightly
        [
            {'class_name': 'car', 'confidence': 0.7, 'box': [110, 110, 210, 210]},  # Car 1 moved
            {'class_name': 'car', 'confidence': 0.85, 'box': [510, 510, 610, 610]},  # Car 2 moved
        ],
        
        # Frame 3: One car temporarily disappears (tracking failure)
        [
            {'class_name': 'car', 'confidence': 0.75, 'box': [520, 520, 620, 620]},  # Only Car 2
        ],
        
        # Frame 4: Both cars reappear
        [
            {'class_name': 'car', 'confidence': 0.9, 'box': [115, 115, 215, 215]},   # Car 1 returns
            {'class_name': 'car', 'confidence': 0.8, 'box': [530, 530, 630, 630]},   # Car 2 continues
        ],
    ]
    
    for frame_idx, detection_list in enumerate(frames):
        result = tracker.update(detection_list)
        print(f"\nFrame {frame_idx + 1}: {len(result)} cars detected")
        for obj in result:
            print(f"  - {obj['class_name']} ID:{obj['track_id']} conf:{obj['confidence']:.2f}")
        
        freq = tracker.get_frequency_statistics()
        print(f"  Unique frequencies: {freq}")
    
    final_stats = tracker.get_tracking_summary()
    print(f"\n=== FINAL RESULTS ===")
    print(f"Total unique cars: {final_stats['unique_object_frequencies'].get('car', 0)}")
    print(f"Expected: 2 cars (even with temporary tracking failures)")
    
    return final_stats['unique_object_frequencies'].get('car', 0) == 2

def test_person_and_car_mix():
    """Test mixed object types"""
    print("\n\nTesting mixed object types...")
    
    tracker = ObjectTracker()
    
    detections = [
        {'class_name': 'car', 'confidence': 0.8, 'box': [100, 100, 200, 200]},
        {'class_name': 'person', 'confidence': 0.9, 'box': [300, 300, 350, 400]},
        {'class_name': 'car', 'confidence': 0.7, 'box': [500, 500, 600, 600]},
        {'class_name': 'person', 'confidence': 0.85, 'box': [700, 700, 750, 800]},
    ]
    
    result = tracker.update(detections)
    print("Mixed objects detected:")
    for obj in result:
        print(f"  - {obj['class_name']} ID:{obj['track_id']} conf:{obj['confidence']:.2f}")
    
    final_stats = tracker.get_tracking_summary()
    print(f"Final frequencies: {final_stats['unique_object_frequencies']}")
    print(f"Expected: 2 cars, 2 persons")
    
    car_count = final_stats['unique_object_frequencies'].get('car', 0)
    person_count = final_stats['unique_object_frequencies'].get('person', 0)
    
    return car_count == 2 and person_count == 2

def main():
    print("Testing realistic object frequency counting scenarios...")
    print("=" * 70)
    
    test1 = test_confidence_level_changes()
    test2 = test_multiple_moving_cars()
    test3 = test_person_and_car_mix()
    
    print("\n" + "=" * 70)
    print("REALISTIC SCENARIO TEST SUMMARY:")
    print(f"Confidence level changes test: {'PASS' if test1 else 'FAIL'}")
    print(f"Multiple moving cars test: {'PASS' if test2 else 'FAIL'}")
    print(f"Mixed object types test: {'PASS' if test3 else 'FAIL'}")
    
    if test1 and test2 and test3:
        print("\n🎉 All realistic tests passed! The system accurately counts objects.")
        print("✅ Same objects with different confidence levels are not double-counted")
        print("✅ Multiple objects in different areas are counted correctly")
        print("✅ Mixed object types work properly")
        return True
    else:
        print("\n❌ Some realistic tests failed.")
        return False

if __name__ == "__main__":
    main() 