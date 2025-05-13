# app.py
from flask import Flask, send_from_directory, Response, jsonify, request, send_file
from flask_cors import CORS
import os
import logging
import tempfile
import re  # Add this for regex support with range requests
from uuid import uuid4
from src.video_processing_tasks import process_video_task, server_side_process_video_task
from src.server_rendering import VideoRenderEngine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="frontend", static_url_path="/")
CORS(app)  # Enable CORS for all routes

# Path to HLS stream folder
HLS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hls_stream")

# Ensure HLS folder exists
if not os.path.exists(HLS_FOLDER):
    os.makedirs(HLS_FOLDER)
    logger.info(f"Created HLS folder at {HLS_FOLDER}")
else:
    logger.info(f"HLS folder exists at {HLS_FOLDER}")

# Create HLS stream directory if it doesn't exist
with app.app_context():
    os.makedirs('hls_stream', exist_ok=True)

# Serve React frontend
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

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
    
    try:
        task = process_video_task.AsyncResult(task_id)
        # Revoke the task and mark it as cancelled
        task.revoke(terminate=False)
        
        # Store the REVOKED state with proper exception information
        task.backend.store_result(
            task_id,
            {
                'exc_type': 'TaskCancellation',
                'exc_message': 'Task cancelled by user',
                'exc_module': 'celery.exceptions'
            },
            'REVOKED'
        )
        
        return jsonify({
            'message': f'Task {task_id} has been marked for cancellation',
            'state': 'REVOKED'
        })
    except Exception as e:
        app.logger.error(f"Error cancelling task: {str(e)}")
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

# Update the download_heatmap_video endpoint to handle both task types

@app.route('/download_heatmap_video/<task_id>', methods=['GET'])
def download_heatmap_video(task_id):
    """Returns the heatmap video for a completed task."""
    try:
        # Try both task types since we have both client-side and server-side processing
        for task_func in [server_side_process_video_task, process_video_task]:
            task = task_func.AsyncResult(task_id)
            
            if task.state in ['SUCCESS', 'PROGRESS'] and task.info:
                result = task.info
                
                if 'heatmap_video_path' in result and result['heatmap_video_path']:
                    heatmap_video_path = result['heatmap_video_path']
                    
                    if not os.path.exists(heatmap_video_path):
                        continue  # Try the other task type
                        
                    # Get the correct mimetype based on file extension
                    mimetype = 'video/mp4'
                    extension = '.mp4'
                    if heatmap_video_path.endswith('.avi'):
                        mimetype = 'video/x-msvideo'
                        extension = '.avi'
                    
                    # Return the video file
                    app.logger.info(f"Serving heatmap video for download: {heatmap_video_path}")
                    return send_file(
                        heatmap_video_path, 
                        mimetype=mimetype,
                        as_attachment=True,
                        download_name=f"heatmap_{task_id}{extension}"
                    )
        
        # If we get here, no valid heatmap video was found
        return jsonify({'error': 'No heatmap video found for this task'}), 404
        
    except Exception as e:
        app.logger.error(f"Error downloading heatmap video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error downloading video: {str(e)}'}), 500

@app.route('/stream_heatmap_video/<task_id>', methods=['GET'])
def stream_heatmap_video(task_id):
    """Streams the heatmap video for a completed task for browser playback."""
    try:
        task = process_video_task.AsyncResult(task_id)
        
        # Allow both SUCCESS and PROGRESS states, as the heatmap video might be available
        # before all processing is complete
        if task.state not in ['SUCCESS', 'PROGRESS']:
            app.logger.error(f"Task {task_id} is in state {task.state}, not SUCCESS or PROGRESS")
            return jsonify({'error': 'Heatmap video not available for this task'}), 404
        
        # Get the heatmap video path from the task result
        result = task.info
        if not result or not isinstance(result, dict):
            app.logger.error(f"Task result is not a dictionary: {result}")
            return jsonify({'error': 'Invalid task result format'}), 500
            
        if 'heatmap_video_path' not in result:
            app.logger.error(f"heatmap_video_path not found in task result: {result.keys()}")
            return jsonify({'error': 'Heatmap video path not found in task result'}), 404
        
        heatmap_video_path = result['heatmap_video_path']
        
        if not heatmap_video_path:
            app.logger.error("Heatmap video path is null")
            return jsonify({'error': 'Heatmap video path is null'}), 404
        
        if not os.path.exists(heatmap_video_path):
            app.logger.error(f"Heatmap video file not found at {heatmap_video_path}")
            return jsonify({'error': f'Heatmap video file not found at {heatmap_video_path}'}), 404
        
        # Check if the file exists but is empty (failed to generate properly)
        if os.path.getsize(heatmap_video_path) == 0:
            app.logger.error(f"Heatmap video file exists but is empty: {heatmap_video_path}")
            return jsonify({'error': 'Heatmap video file exists but is empty'}), 500
        
        # Handle both .mp4 and .avi extensions
        mimetype = 'video/mp4'
        if heatmap_video_path.endswith('.avi'):
            mimetype = 'video/x-msvideo'
        
        app.logger.info(f"Streaming heatmap video from {heatmap_video_path} with mimetype {mimetype}")
        app.logger.info(f"File size: {os.path.getsize(heatmap_video_path)} bytes")
        
        # Get file size for range requests
        file_size = os.path.getsize(heatmap_video_path)
        
        # Check if range header is present for partial content
        range_header = request.headers.get('Range', None)
        
        if range_header:
            # Parse the range header
            byte_start, byte_end = 0, None
            match = re.search(r'(\d+)-(\d*)', range_header)
            groups = match.groups()
            
            if groups[0]:
                byte_start = int(groups[0])
            if groups[1]:
                byte_end = int(groups[1])
            
            if byte_end is None:
                byte_end = file_size - 1
            
            length = byte_end - byte_start + 1
            
            # Create the response with partial content
            resp = Response(
                partial_content_generator(heatmap_video_path, byte_start, byte_end),
                status=206,
                mimetype=mimetype,
                content_type=mimetype,
                direct_passthrough=True
            )
            
            resp.headers.add('Content-Range', f'bytes {byte_start}-{byte_end}/{file_size}')
            resp.headers.add('Accept-Ranges', 'bytes')
            resp.headers.add('Content-Length', str(length))
            return resp
        
        # If no range header, return the full file
        return send_file(
            heatmap_video_path,
            mimetype=mimetype,
            as_attachment=False,
            conditional=True
        )
        
    except Exception as e:
        app.logger.error(f"Error streaming heatmap video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error streaming video: {str(e)}'}), 500

def partial_content_generator(path, byte_start, byte_end):
    """Generator for partial content responses"""
    with open(path, 'rb') as video_file:
        video_file.seek(byte_start)
        remaining = byte_end - byte_start + 1
        chunk_size = 8192  # 8KB chunks
        
        while remaining:
            chunk = video_file.read(min(chunk_size, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

@app.route('/get_heatmap_video_info/<task_id>', methods=['GET'])
def get_heatmap_video_info(task_id):
    """Gets information about the heatmap video file for a task"""
    try:
        task = process_video_task.AsyncResult(task_id)
        
        # Allow both SUCCESS and PROGRESS states
        if task.state not in ['SUCCESS', 'PROGRESS']:
            app.logger.error(f"Task {task_id} is in state {task.state}, not SUCCESS or PROGRESS")
            return jsonify({'error': 'Heatmap video not available for this task'}), 404
        
        # Get the heatmap video path from the task result
        result = task.info
        if not result or not isinstance(result, dict):
            app.logger.error(f"Task result is not a dictionary: {result}")
            return jsonify({'error': 'Invalid task result format'}), 500
            
        if 'heatmap_video_path' not in result:
            app.logger.error(f"heatmap_video_path not found in task result: {result.keys()}")
            return jsonify({'error': 'Heatmap video path not found in task result'}), 404
        
        heatmap_video_path = result['heatmap_video_path']
        
        if not heatmap_video_path or not os.path.exists(heatmap_video_path):
            app.logger.error(f"Heatmap video file not found at {heatmap_video_path}")
            return jsonify({'error': 'Heatmap video file not found'}), 404
            
        file_size = os.path.getsize(heatmap_video_path)
        
        # Get the file extension and MIME type
        _, ext = os.path.splitext(heatmap_video_path)
        mime_type = 'video/mp4'
        if ext.lower() == '.avi':
            mime_type = 'video/x-msvideo'
        
        # Check if HLS manifest path is available in the task result
        hls_manifest_path = None
        hls_url = None
        
        if 'heatmap_analysis' in result and isinstance(result['heatmap_analysis'], dict):
            heatmap_analysis = result['heatmap_analysis']
            if 'hls_manifest_path' in heatmap_analysis and heatmap_analysis['hls_manifest_path']:
                hls_manifest_path = heatmap_analysis['hls_manifest_path']
                # Create a URL for the HLS manifest
                hls_url = f"/hls_stream/{task_id}/index.m3u8"
                app.logger.info(f"HLS manifest available at: {hls_manifest_path}, URL: {hls_url}")
        
        # Return video information including HLS URL if available
        response_data = {
            'size': file_size,
            'extension': ext.lstrip('.'),
            'mime_type': mime_type,
            'stream_url': f"/stream_heatmap_video/{task_id}"
        }
        
        if hls_url:
            response_data['hls_url'] = hls_url
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error getting heatmap video info: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting video info: {str(e)}'}), 500

@app.route('/hls_stream/<task_id>/<path:filename>')
def serve_hls_stream(task_id, filename):
    """Serve HLS stream files"""
    stream_dir = os.path.join('hls_stream', task_id)
    if not os.path.exists(stream_dir):
        return jsonify({'error': f'HLS stream directory not found for task {task_id}'}), 404
        
    file_path = os.path.join(stream_dir, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': f'HLS file not found: {filename}'}), 404
    
    # Set content type based on file extension
    content_type = 'application/vnd.apple.mpegurl'  # Default for .m3u8 files
    if filename.endswith('.ts'):
        content_type = 'video/mp2t'
    
    # Add cache control and CORS headers
    response = send_file(file_path, mimetype=content_type)
    response.headers.add('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.add('Pragma', 'no-cache')
    response.headers.add('Expires', '0')
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    
    return response

# Add a route to serve heatmap HLS streams

@app.route('/hls_stream/<task_id>/heatmap_hls/<path:filename>')
def serve_heatmap_hls_stream(task_id, filename):
    """Serve heatmap HLS stream files"""
    stream_dir = os.path.join('hls_stream', task_id, 'heatmap_hls')
    if not os.path.exists(stream_dir):
        return jsonify({'error': f'Heatmap HLS stream directory not found for task {task_id}'}), 404
        
    file_path = os.path.join(stream_dir, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': f'Heatmap HLS file not found: {filename}'}), 404
    
    # Set content type based on file extension
    content_type = 'application/vnd.apple.mpegurl'  # Default for .m3u8 files
    if filename.endswith('.ts'):
        content_type = 'video/mp2t'
    
    # Add cache control and CORS headers
    response = send_file(file_path, mimetype=content_type)
    response.headers.add('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.add('Pragma', 'no-cache')
    
    return response

@app.route('/hls_stream/<task_id>/heatmap_hls/<path:filename>')
def serve_heatmap_hls_files(task_id, filename):
    """Serve heatmap HLS files"""
    try:
        hls_dir = os.path.join('hls_stream', task_id, 'heatmap_hls')
        if not os.path.exists(hls_dir):
            app.logger.error(f"Heatmap HLS directory not found: {hls_dir}")
            return jsonify({'error': f'HLS directory not found for task {task_id}'}), 404
            
        file_path = os.path.join(hls_dir, filename)
        if not os.path.exists(file_path):
            app.logger.error(f"HLS file not found: {file_path}")
            return jsonify({'error': f'HLS file not found: {filename}'}), 404
        
        # Set content type based on file extension
        content_type = 'application/vnd.apple.mpegurl'  # Default for .m3u8 files
        if filename.endswith('.ts'):
            content_type = 'video/mp2t'
        
        # Add cache control headers to prevent caching issues
        response = send_file(file_path, mimetype=content_type)
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        app.logger.error(f"Error serving HLS file: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error serving HLS file: {str(e)}'}), 500

@app.route('/get_heatmap_hls_info/<task_id>', methods=['GET'])
def get_heatmap_hls_info(task_id):
    """Get information about the heatmap HLS stream"""
    try:
        # Try both task types
        for task_func in [server_side_process_video_task, process_video_task]:
            task = task_func.AsyncResult(task_id)
            
            if task.state == 'SUCCESS' and task.info:
                result = task.info
                
                # Check if heatmap_hls_url exists
                if 'heatmap_hls_url' in result:
                    return jsonify({
                        'hls_url': result['heatmap_hls_url'],
                        'use_heatmap': result.get('use_heatmap', False)
                    })
                
                # Check if we have a heatmap_video_path that could be converted
                if 'heatmap_video_path' in result and os.path.exists(result['heatmap_video_path']):
                    return jsonify({
                        'stream_url': f'/stream_heatmap_video/{task_id}',
                        'mime_type': 'video/mp4',
                    })
        
        return jsonify({'error': 'Heatmap HLS stream not found'}), 404
        
    except Exception as e:
        app.logger.error(f"Error getting heatmap HLS info: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting heatmap HLS info: {str(e)}'}), 500

@app.route('/process_video', methods=['POST'])
def process_video():
    """
    Processes a video file for object detection and/or heatmap analysis.
    
    Expected form data:
    - video: The video file
    - model: The model name to use for object detection
    - interval: Frame interval for processing
    - use_heatmap: Whether to generate heatmap analysis ('true' or 'false')
    """
    try:
        app.logger.info("Received process_video request")
        
        # Check if the request contains a file
        if 'video' not in request.files:
            app.logger.error("No video file in request")
            return jsonify({'error': 'No video file provided'}), 400
            
        video_file = request.files['video']
        if video_file.filename == '':
            app.logger.error("Empty filename in video file")
            return jsonify({'error': 'No video file selected'}), 400
            
        # Get other form parameters
        model_name = request.form.get('model', 'yolov8n')
        frame_interval = request.form.get('interval', '1')
        use_heatmap = request.form.get('use_heatmap', 'false')
        
        app.logger.info(f"Processing video with model: {model_name}, interval: {frame_interval}, use_heatmap: {use_heatmap}")
        
        # Save the uploaded file to a temporary location
        temp_dir = tempfile.gettempdir()
        video_path = os.path.join(temp_dir, video_file.filename)
        video_file.save(video_path)
        
        app.logger.info(f"Saved video to temporary path: {video_path}")
        
        # Start the Celery task
        task = process_video_task.delay(video_path, model_name, frame_interval, use_heatmap)
        
        app.logger.info(f"Started task with ID: {task.id}")
        
        # Return the task ID to the client
        return jsonify({'task_id': task.id}), 202
        
    except Exception as e:
        app.logger.error(f"Error processing video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing video: {str(e)}'}), 500

@app.route('/process_video_server_side', methods=['POST'])
def process_video_server_side():
    """Process video with server-side rendering and return HLS stream URL"""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file uploaded'}), 400
    
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get parameters
    model_name = request.form.get('model', 'yolov11s.pt')
    frame_interval = int(request.form.get('interval', 5))
    use_heatmap = request.form.get('use_heatmap', 'false').lower() == 'true'
    
    # Generate unique ID for this processing task
    task_id = str(uuid4())
    
    # Create task directory
    task_dir = os.path.join('hls_stream', task_id)
    os.makedirs(task_dir, exist_ok=True)
    
    # Save uploaded video
    video_path = os.path.join(task_dir, 'input.mp4')
    video_file.save(video_path)
    
    app.logger.info(f"Starting server-side processing task for video {video_path}")
    
    # Start the task
    task = server_side_process_video_task.apply_async(
        args=[video_path, task_dir, model_name, frame_interval, use_heatmap]
    )
    
    # Return task ID and stream URL
    return jsonify({
        'task_id': task.id,
        'stream_url': f'/hls_stream/{task_id}/stream.m3u8',
        'status': 'processing'
    }), 202

@app.route('/get_server_side_status/<task_id>', methods=['GET'])
def get_server_side_status(task_id):
    """Get status of server-side video processing"""
    from src.video_processing_tasks import server_side_process_video_task
    
    task = server_side_process_video_task.AsyncResult(task_id)
    
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Pending...'
        }
    elif task.state == 'PROGRESS':
        response = {
            'state': task.state,
            'status': task.info.get('status', 'Processing...')
        }
    elif task.state == 'SUCCESS':
        response = {
            'state': task.state,
            'status': task.info
        }
    elif task.state == 'FAILURE':
        response = {
            'state': task.state,
            'status': str(task.info)  # exception message
        }
    else:
        response = {
            'state': task.state,
            'status': 'Unknown state'
        }
    
    return jsonify(response)

@app.route('/get_detection_statistics/<task_id>', methods=['GET'])
def get_detection_statistics(task_id):
    """Get object detection statistics for a task"""
    try:
        task = server_side_process_video_task.AsyncResult(task_id)
        
        if task.state != 'SUCCESS':
            return jsonify({'error': 'Task is not yet complete'}), 404
            
        result = task.info
        if not result or not isinstance(result, dict):
            return jsonify({'error': 'Invalid task result'}), 500
            
        # Extract statistics
        stats = {
            'object_frequency': result.get('object_frequency', {}),
            'unique_object_count': result.get('unique_object_count', 0),
            'total_frames': result.get('total_frames', 0),
            'processed_frames': result.get('processed_frames', 0)
        }
        
        return jsonify(stats)
    except Exception as e:
        app.logger.error(f"Error getting detection statistics: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting statistics: {str(e)}'}), 500

@app.route('/get_heatmap_analysis/<task_id>', methods=['GET'])
def get_heatmap_analysis(task_id):
    """Gets heatmap analysis data for a completed task"""
    try:
        from src.video_processing_tasks import server_side_process_video_task, process_video_task
        
        # Try both task types
        for task_func in [server_side_process_video_task, process_video_task]:
            task = task_func.AsyncResult(task_id)
            
            if task.state == 'SUCCESS' and task.info:
                result = task.info
                
                # Extract heatmap analysis data
                heatmap_analysis = {}
                
                # Check if heatmap analysis exists directly
                if 'heatmap_analysis' in result and isinstance(result['heatmap_analysis'], dict):
                    app.logger.info(f"Found heatmap analysis in task result: {result['heatmap_analysis']}")
                    return jsonify(result['heatmap_analysis'])
                    
                # Fall back to object_frequency for movement patterns
                elif 'object_frequency' in result:
                    app.logger.info(f"Generating heatmap analysis from object frequency")
                    total_objects = sum(result['object_frequency'].values()) if result['object_frequency'] else 0
                    
                    heatmap_analysis = {
                        'peak_movement_time': 0,
                        'average_intensity': total_objects / max(1, len(result['object_frequency'])) if result['object_frequency'] else 0,
                        'movement_duration': result.get('processed_frames', 0) / result.get('fps', 30) if result.get('fps', 0) > 0 else 0,
                        'total_duration': result.get('total_frames', 0) / result.get('fps', 30) if result.get('fps', 0) > 0 else 0,
                    }
                    
                    return jsonify(heatmap_analysis)
        
        # If no task contains heatmap data
        app.logger.warning(f"No heatmap data found for task {task_id}")
        return jsonify({
            'peak_movement_time': 0,
            'average_intensity': 0,
            'movement_duration': 0,
            'total_duration': 0
        })
        
    except Exception as e:
        app.logger.error(f"Error getting heatmap analysis: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting heatmap analysis: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
