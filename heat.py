import cv2
import numpy as np
import os
import argparse
import logging
from progress.bar import Bar

def setup_logging():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def extract_frames(video_path: str, output_video_path: str) -> int:
    capture = cv2.VideoCapture(video_path)
    length = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    background_subtractor = cv2.bgsegm.createBackgroundSubtractorMOG()

    # Get video properties
    fps = capture.get(cv2.CAP_PROP_FPS)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    bar = Bar('Processing Frames', max=length)
    first_iteration = True
    
    for i in range(length):
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
    
    bar.finish()
    capture.release()
    video_writer.release()
    
    return length

def main():
    setup_logging()
    parser = argparse.ArgumentParser(description='Generate heatmap from video.')
    parser.add_argument('--input', required=True, help='Path to input video file')
    parser.add_argument('--output', required=True, help='Path to output video file')
    args = parser.parse_args()

    input_video_path = args.input
    output_video_path = args.output

    # Ensure the output directory exists
    output_dir = os.path.dirname(output_video_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    length = extract_frames(input_video_path, output_video_path)
    
    logging.info("Processing completed successfully!")

if __name__ == "__main__":
    main()