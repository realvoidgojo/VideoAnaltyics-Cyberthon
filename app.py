# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import os
import threading
import logging
from src.video_processing_tasks import process_video_task #Import 

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
    
    use_heatmap = request.form.get('use_heatmap', 'false')
    print(f"Use heatmap: {use_heatmap}")

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
    elif task.state == 'REVOKED':
        response = {
            'state': 'REVOKED',
            'status': 'Task was cancelled by user'
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
    """Stops the currently running task and resets the processing state."""
    try:
        task_id = request.json.get('task_id')
        if task_id:
            # Get the task object
            task = process_video_task.AsyncResult(task_id)
            current_state = task.state
            logging.info(f"Current task state before revocation: {current_state}")
            
            # Add to revoked set in Redis backend - this will be checked by is_revoked()
            from src.celery import celery_app
            try:
                # Add to the revoked tasks set with terminate=True to forcefully terminate the task
                celery_app.control.revoke(task_id, terminate=True, signal='SIGTERM')
                
                # Mark the task as revoked in the backend - this will be detected by our custom check
                celery_app.backend.set(f"task-revoked-{task_id}", "1")
                celery_app.backend.mark_as_revoked(task_id, reason='User requested cancellation')
                logging.info(f"Task {task_id} has been marked as revoked")
                
                # Store the state directly in Redis for our custom check
                celery_app.backend.store_result(task_id, None, 'REVOKED')
                
                # Also update the task state directly if possible
                try:
                    task.update_state(state='REVOKED', meta={'status': 'Task cancelled by user'})
                except Exception as state_err:
                    logging.warning(f"Error updating task state: {str(state_err)}")
            except Exception as term_err:
                logging.warning(f"Error revoking task: {str(term_err)}")
            
            # Force terminate any running worker processes for this task
            try:
                # This is more aggressive termination
                celery_app.control.terminate(task_id, signal='SIGKILL')
            except Exception as kill_err:
                logging.warning(f"Error terminating task process: {str(kill_err)}")
                
            logging.info(f"Task {task_id} has been revoked - will terminate at next checkpoint")
            return jsonify({'message': f'Task {task_id} has been flagged for cancellation', 'state': 'REVOKED'})
        else:
            return jsonify({'error': 'No task_id provided'}), 400
    except Exception as e:
        logging.error(f"Error in reset_processing: {str(e)}")
        return jsonify({'error': str(e)}), 500

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

@app.route('/download_heatmap/<path:filename>', methods=['GET'])
def download_heatmap(filename):
    """Serves the heatmap video file for download."""
    try:
        from flask import send_file
        # Ensure the filename is valid
        if '..' in filename or filename.startswith('/'):
            return jsonify({'error': 'Invalid file path'}), 400
        
        # The heatmap file should be in the data directory
        file_path = os.path.join('data', filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'Heatmap file not found'}), 404
        
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)