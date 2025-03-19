# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Import CORS
import os
import threading
import logging
from src.video_processing_tasks import process_video_task #Import 
from src.heatmap_analysis import generate_heatmap_video

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)  # Enable CORS for the entire app

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Backend State Variables
processing_lock = threading.Lock()

current_video_path = None
current_frame_index = 0
frames = []  # Store extracted frames
skip_processing = False

@app.route('/process_video', methods=['POST'])
def process_video():
    """
    Processes a video file, performs object detection, and returns the results as JSON.
    If use_heatmap is set to 'true', also generates heatmap frames.
    """
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No video selected'}), 400

    model_name = request.form.get('model', 'yolov11n.pt')  # if no name defaults to yolov11n
    print(f"Request for model {model_name}")

    frame_interval = int(request.form.get('interval', 1))
    print(f"Request for frame interval {frame_interval}")
    
    # Check if heatmap analysis is requested
    use_heatmap = request.form.get('use_heatmap', 'false')
    print(f"Heatmap analysis requested: {use_heatmap}")

    # Save the uploaded video to a temporary location
    video_path = os.path.join('data', video_file.filename)  # Use the 'data' directory
    video_file.save(video_path)

    task = process_video_task.delay(video_path, model_name, frame_interval, use_heatmap)
    return jsonify({'task_id': task.id, 'message': 'Processing started in background'})

@app.route('/task_status/<task_id>', methods=['GET'])
def task_status(task_id):
    """Retrieves status of an asynchronous task."""
    task = process_video_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'status': task.info,  # Can be a dictionary
        }
        if task.state == 'SUCCESS':
           response['results'] = task.info  # Add the results to the response
    else:
        # something went wrong in the background job
        response = {
            'state': task.state,
            'status': str(task.info),  # this is the exception raised
        }
    return jsonify(response)

@app.route('/reset_processing', methods=['POST'])
def reset_processing():
    """Marks a task for cancellation in the database."""
    data = request.json
    task_id = data.get('task_id')
    
    if not task_id:
        return jsonify({'error': 'No task ID provided'}), 400
    
    task = process_video_task.AsyncResult(task_id)
    
    # Instead of terminate, we'll use revoke which marks the task as revoked in the backend
    # The task will check this status and exit gracefully
    task.revoke(terminate=False)
    
    # We'll store 'REVOKED' in the backend directly as a fallback
    # This will be checked by the task
    from celery import states
    task.backend.store_result(task_id, None, states.REVOKED)
    
    return jsonify({
        'message': f'Task {task_id} has been marked for cancellation',
        'state': 'REVOKED'
    })

# End point to pause the video
@app.route('/pause_processing', methods=['POST'])
def pause_processing():
    """Not implemented."""
    return jsonify({'message': 'Not implemented'})

# End point to resume the video
@app.route('/resume_processing', methods=['POST'])
def resume_processing():
    """Not implemented"""
    return jsonify({'message': 'Not implemented'})

@app.route('/download_heatmap_video/<task_id>', methods=['GET'])
def download_heatmap_video(task_id):
    """Returns the heatmap video for a completed task."""
    task = process_video_task.AsyncResult(task_id)
    
    # Allow both SUCCESS and PROGRESS states
    if task.state not in ['SUCCESS', 'PROGRESS']:
        return jsonify({'error': 'Heatmap video not available for this task'}), 404
    
    # Get the heatmap video path from the task result
    result = task.info
    if not result or not isinstance(result, dict) or 'heatmap_video_path' not in result:
        return jsonify({'error': 'Heatmap video path not found in task result'}), 404
    
    heatmap_video_path = result['heatmap_video_path']
    
    if not heatmap_video_path:
        return jsonify({'error': 'Heatmap video path is null'}), 404
    
    if not os.path.exists(heatmap_video_path):
        return jsonify({'error': f'Heatmap video file not found at {heatmap_video_path}'}), 404
    
    # Get the correct mimetype based on file extension
    mimetype = 'video/x-msvideo' if heatmap_video_path.endswith('.avi') else 'video/mp4'
    extension = '.avi' if heatmap_video_path.endswith('.avi') else '.mp4'
    
    # Return the video file
    return send_file(heatmap_video_path, 
                    mimetype=mimetype,
                    as_attachment=True,
                    download_name=f"heatmap_{task_id}{extension}")

@app.route('/stream_heatmap_video/<task_id>', methods=['GET'])
def stream_heatmap_video(task_id):
    """Streams the heatmap video for a completed task for browser playback."""
    task = process_video_task.AsyncResult(task_id)
    
    # Allow both SUCCESS and PROGRESS states, as the heatmap video might be available
    # before all processing is complete
    if task.state not in ['SUCCESS', 'PROGRESS']:
        return jsonify({'error': 'Heatmap video not available for this task'}), 404
    
    # Get the heatmap video path from the task result
    result = task.info
    if not result or not isinstance(result, dict) or 'heatmap_video_path' not in result:
        return jsonify({'error': 'Heatmap video path not found in task result'}), 404
    
    heatmap_video_path = result['heatmap_video_path']
    
    if not heatmap_video_path:
        return jsonify({'error': 'Heatmap video path is null'}), 404
    
    if not os.path.exists(heatmap_video_path):
        return jsonify({'error': f'Heatmap video file not found at {heatmap_video_path}'}), 404
    
    # Check if the file exists but is empty (failed to generate properly)
    if os.path.getsize(heatmap_video_path) == 0:
        return jsonify({'error': 'Heatmap video file exists but is empty'}), 500
    
    try:
        # Handle both .mp4 and .avi extensions
        mimetype = 'video/mp4'
        if heatmap_video_path.endswith('.avi'):
            mimetype = 'video/x-msvideo'
            
        # Return the video file for streaming
        # Set as_attachment=False to stream in browser instead of downloading
        response = send_file(
            heatmap_video_path, 
            mimetype=mimetype,
            as_attachment=False,
            conditional=True,  # Enable conditional responses for range requests
            etag=True         # Enable ETag header for caching
        )
        
        # Add headers to help with browser compatibility
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'  # Prevent caching
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        app.logger.info(f"Successfully streaming heatmap video from {heatmap_video_path}")
        return response
    except Exception as e:
        logging.error(f"Error sending video file {heatmap_video_path}: {e}")
        return jsonify({'error': f'Error streaming video: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)