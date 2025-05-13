# Fully Server-Side Video Analytics Solution

Looking at your implementation plan, I can see why you're still facing browser load issues. Your hybrid approach still sends significant detection data to the client. Let's create a truly server-side solution that minimizes browser load while maintaining interactivity.

## Why Current Solution Still Has Issues

1. **Data Transfer Problem**: Even with chunking, you're still transferring all detection data to the browser
2. **Client-Side Rendering**: The browser is still responsible for rendering detections over video frames
3. **Memory Growth**: Progressive loading helps but memory usage still accumulates during long sessions
4. **Computation Overlap**: Both server and client are handling complex computations

## Fully Server-Side Architecture

```
┌─────────────────────────────┐   ┌────────────────┐   ┌──────────────────────┐
│ Processing Backend          │   │ Video Stream   │   │ Lightweight Frontend │
│ • Video Processing          │◄─►│ Server         │◄─►│ • Video Player       │
│ • YOLO Detection            │   │ • HLS/DASH     │   │ • Control Interface  │
│ • Box Rendering             │   │ • Video+Overlay│   │ • Metadata Display   │
│ • Analysis & Tracking       │   │ • Segments     │   │ • Filtering UI       │
└─────────────────────────────┘   └────────────────┘   └──────────────────────┘
```

### 1. Server-Side Processing & Rendering Engine

```python name=app/server/render_engine.py
import cv2
import numpy as np
from flask import current_app
import ffmpeg
import redis
import time
from app.models import Detection, Video
from app.server.yolo_detector import YoloDetector
from sqlalchemy import create_engine, text
from threading import Thread
from queue import Queue

class VideoRenderEngine:
    def __init__(self, video_id, config=None):
        self.video_id = video_id
        self.config = config or {}
        self.db_engine = create_engine(current_app.config['SQLALCHEMY_DATABASE_URI'])
        self.redis_client = redis.Redis.from_url(current_app.config['REDIS_URL'])
        self.detector = YoloDetector(
            model=self.config.get('model_name', 'yolov11s'),
            confidence=self.config.get('confidence', 0.25)
        )
        self.video_info = self._load_video_info()
        self.frame_queue = Queue(maxsize=150)
        self.output_queue = Queue(maxsize=150)
        
    def _load_video_info(self):
        """Load video info from database"""
        with self.db_engine.connect() as conn:
            result = conn.execute(
                text("SELECT * FROM videos WHERE id = :id"),
                {"id": self.video_id}
            ).fetchone()
            if not result:
                raise ValueError(f"Video {self.video_id} not found")
            return dict(result)
            
    def _get_detections_for_frame(self, frame_number, timestamp):
        """Get detections for a specific frame from database"""
        with self.db_engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT * FROM detections 
                    WHERE video_id = :video_id 
                    AND timestamp BETWEEN :min_time AND :max_time
                """),
                {
                    "video_id": self.video_id,
                    "min_time": timestamp - 0.05,  
                    "max_time": timestamp + 0.05
                }
            ).fetchall()
            return [dict(row) for row in result]
    
    def _process_frame(self, frame, frame_number, timestamp):
        """Process a single frame - either get detections or detect objects"""
        # Either load existing detections or run detection
        if self.config.get('use_existing_detections', True):
            detections = self._get_detections_for_frame(frame_number, timestamp)
        else:
            # Run detection on this frame
            detections = self.detector.detect_frame(frame)
            # Save to database in background
            self._save_detections(detections, frame_number, timestamp)

        # Filter detections by class if specified
        if self.config.get('filter_classes'):
            detections = [d for d in detections if d['class_name'] in self.config['filter_classes']]
            
        # Draw detections on frame
        return self._draw_detections(frame, detections)
    
    def _draw_detections(self, frame, detections):
        """Draw bounding boxes and labels on frame"""
        overlay = frame.copy()
        
        # Configure drawing parameters
        box_thickness = self.config.get('box_thickness', 2)
        text_size = self.config.get('text_size', 0.5)
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Class-specific colors
        color_map = {
            'person': (0, 255, 0),    # Green
            'car': (0, 0, 255),       # Red
            'truck': (255, 0, 0),     # Blue
            # Add more classes as needed
        }
        
        # Draw each detection
        for det in detections:
            # Get coordinates (convert from relative to absolute)
            x1 = int(det['x1'] * frame.shape[1])
            y1 = int(det['y1'] * frame.shape[0])
            x2 = int(det['x2'] * frame.shape[1])
            y2 = int(det['y2'] * frame.shape[0])
            
            # Determine color based on class
            class_name = det['class_name']
            color = color_map.get(class_name, (255, 255, 0))  # Default to yellow
            
            # Draw bounding box
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, box_thickness)
            
            # Prepare label with class name and confidence
            label = f"{class_name}: {det['confidence']:.2f}"
            if 'track_id' in det and det['track_id'] is not None:
                label += f" ID:{det['track_id']}"
                
            # Draw label background
            label_size, _ = cv2.getTextSize(label, font, text_size, 1)
            cv2.rectangle(overlay, (x1, y1 - 20), (x1 + label_size[0], y1), color, -1)
            
            # Draw label text
            cv2.putText(overlay, label, (x1, y1 - 5), font, text_size, (255, 255, 255), 1)
        
        # Set transparency for the overlay
        alpha = self.config.get('overlay_opacity', 0.7)
        return cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)
    
    def _save_detections(self, detections, frame_number, timestamp):
        """Save detections to database asynchronously"""
        # Implementation to save detections to database
        # This would run in a background thread/task
        pass
        
    def start_processing_threads(self):
        """Start frame extraction and processing threads"""
        # Start frame extraction thread
        extract_thread = Thread(target=self._extract_frames_thread)
        extract_thread.daemon = True
        extract_thread.start()
        
        # Start multiple processing threads for better performance
        num_process_threads = self.config.get('num_process_threads', 4)
        process_threads = []
        for _ in range(num_process_threads):
            t = Thread(target=self._process_frames_thread)
            t.daemon = True
            t.start()
            process_threads.append(t)
            
        return extract_thread, process_threads
        
    def _extract_frames_thread(self):
        """Thread to extract frames from video file"""
        video_path = self.video_info['filepath']
        cap = cv2.VideoCapture(video_path)
        
        frame_interval = self.config.get('frame_interval', 1)
        frame_number = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            if frame_number % frame_interval == 0:
                timestamp = frame_number / self.video_info['fps']
                self.frame_queue.put((frame, frame_number, timestamp))
                
            frame_number += 1
            
        # Signal completion
        for _ in range(self.config.get('num_process_threads', 4)):
            self.frame_queue.put(None)
        
        cap.release()
        
    def _process_frames_thread(self):
        """Thread to process frames and add rendered frames to output queue"""
        while True:
            item = self.frame_queue.get()
            if item is None:  # End signal
                self.output_queue.put(None)
                break
                
            frame, frame_number, timestamp = item
            processed_frame = self._process_frame(frame, frame_number, timestamp)
            self.output_queue.put((processed_frame, frame_number, timestamp))
            self.frame_queue.task_done()
            
    def generate_video_stream(self, output_path=None, segment_duration=4):
        """Generate HLS video stream with rendered detections"""
        # Start processing threads
        extract_thread, process_threads = self.start_processing_threads()
        
        # Determine output path
        if output_path is None:
            output_path = f"static/streams/{self.video_id}"
        
        # Ensure directory exists
        import os
        os.makedirs(output_path, exist_ok=True)
        
        # Set up FFmpeg process for HLS output
        input_args = {
            'format': 'rawvideo',
            'pix_fmt': 'bgr24',
            'video_size': f"{self.video_info['width']}x{self.video_info['height']}",
            'framerate': self.video_info['fps']
        }
        
        output_args = {
            'hls_time': segment_duration,
            'hls_list_size': 0,  # Keep all segments
            'hls_segment_type': 'mpegts',
            'hls_flags': 'independent_segments',
            'c:v': 'libx264',
            'preset': 'veryfast',
            'crf': 23,
            'format': 'hls'
        }
        
        # Multiple bitrate variants for adaptive streaming
        variants = [
            # High quality
            {
                'video_bitrate': '2M',
                'width': self.video_info['width'],
                'height': self.video_info['height'],
                'output': f"{output_path}/high.m3u8"
            },
            # Medium quality
            {
                'video_bitrate': '1M',
                'width': min(self.video_info['width'], 1280),
                'height': min(self.video_info['height'], 720),
                'output': f"{output_path}/medium.m3u8"
            },
            # Low quality
            {
                'video_bitrate': '500k',
                'width': min(self.video_info['width'], 854),
                'height': min(self.video_info['height'], 480),
                'output': f"{output_path}/low.m3u8"
            }
        ]
        
        # Create master playlist
        master_content = "#EXTM3U\n"
        for idx, variant in enumerate(variants):
            bitrate = variant['video_bitrate'].replace('M', '000000').replace('k', '000')
            master_content += f"#EXT-X-STREAM-INF:BANDWIDTH={bitrate},RESOLUTION={variant['width']}x{variant['height']}\n"
            master_content += f"{os.path.basename(variant['output'])}\n"
            
        with open(f"{output_path}/master.m3u8", 'w') as f:
            f.write(master_content)
        
        # Process frames and create HLS streams
        ff_processes = []
        for variant in variants:
            process = (
                ffmpeg
                .input('pipe:', **input_args)
                .output(
                    variant['output'],
                    vf=f"scale={variant['width']}:{variant['height']}",
                    b:v=variant['video_bitrate'],
                    **output_args
                )
                .overwrite_output()
                .run_async(pipe_stdin=True)
            )
            ff_processes.append(process)
        
        # Read processed frames from queue and write to FFmpeg
        frame_count = 0
        try:
            while True:
                output = self.output_queue.get()
                if output is None:  # End signal
                    break
                    
                processed_frame, frame_number, timestamp = output
                
                # Send frame to all FFmpeg processes
                for process in ff_processes:
                    process.stdin.write(processed_frame.tobytes())
                
                frame_count += 1
                
                # Update progress in Redis
                if frame_count % 30 == 0:
                    progress = min(99, int(100 * frame_number / self.video_info['total_frames']))
                    self.redis_client.set(f"progress:{self.video_id}", progress)
                    
                self.output_queue.task_done()
        finally:
            # Close FFmpeg processes
            for process in ff_processes:
                process.stdin.close()
                process.wait()
                
            # Set final progress
            self.redis_client.set(f"progress:{self.video_id}", 100)
            
        # Return path to master playlist
        return f"{output_path}/master.m3u8"
```

### 2. Video Processing API Endpoints

```python name=app/server/routes.py
from flask import Blueprint, request, jsonify, current_app, url_for
from app.server.render_engine import VideoRenderEngine
from app.models import Video, Detection
from app import db, celery
import os
import uuid
import json

video_api = Blueprint('video_api', __name__)

@video_api.route('/api/videos', methods=['POST'])
def upload_video():
    """Handle video upload and start processing"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    # Generate unique ID for the video
    video_id = str(uuid.uuid4())
    
    # Get model and other parameters
    model_name = request.form.get('model', 'yolov11s')
    frame_interval = int(request.form.get('frame_interval', 5))
    
    # Save video file temporarily
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{video_id}.mp4")
    file.save(temp_path)
    
    # Extract video metadata (duration, fps, dimensions)
    import cv2
    cap = cv2.VideoCapture(temp_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()
    
    # Create video entry in database
    video = Video(
        id=video_id,
        filename=file.filename,
        filepath=temp_path,
        duration=duration,
        width=width,
        height=height,
        fps=fps,
        model_name=model_name,
        frame_interval=frame_interval,
        total_frames=total_frames,
        processed_frames=0
    )
    db.session.add(video)
    db.session.commit()
    
    # Start processing task
    process_video.delay(video_id, model_name, frame_interval)
    
    return jsonify({
        'id': video_id,
        'status': 'processing',
        'stream_url': url_for('video_api.get_video_stream', video_id=video_id, _external=True)
    }), 202

@video_api.route('/api/videos/<video_id>/stream')
def get_video_stream(video_id):
    """Get HLS stream URL for the processed video"""
    video = Video.query.get_or_404(video_id)
    
    # Determine stream path
    stream_path = f"static/streams/{video_id}/master.m3u8"
    
    # Check if stream exists
    if not os.path.exists(stream_path):
        # Stream not ready yet
        progress = current_app.redis.get(f"progress:{video_id}") or b'0'
        return jsonify({
            'status': 'processing',
            'progress': int(progress),
            'message': 'Video stream is still being processed'
        }), 202
        
    # Stream is ready, return URL
    return jsonify({
        'status': 'ready',
        'stream_url': url_for('static', filename=f'streams/{video_id}/master.m3u8', _external=True),
        'duration': video.duration,
        'width': video.width,
        'height': video.height,
        'fps': video.fps
    })

@video_api.route('/api/videos/<video_id>/detections')
def get_video_detections(video_id):
    """Get filtered detection metadata for a video"""
    # Get time range parameters
    start_time = float(request.args.get('start', 0))
    end_time = float(request.args.get('end', float('inf')))
    
    # Get optional filter parameters
    class_filter = request.args.get('class')
    min_confidence = float(request.args.get('confidence', 0.25))
    
    # Query database for detections
    query = Detection.query.filter(
        Detection.video_id == video_id,
        Detection.timestamp >= start_time,
        Detection.timestamp <= end_time,
        Detection.confidence >= min_confidence
    )
    
    if class_filter:
        query = query.filter(Detection.class_name == class_filter)
    
    # Get detections (limit to prevent too much data)
    limit = min(int(request.args.get('limit', 1000)), 5000)
    detections = query.limit(limit).all()
    
    # Return metadata only
    return jsonify({
        'video_id': video_id,
        'count': len(detections),
        'detections': [d.to_dict() for d in detections]
    })

@video_api.route('/api/videos/<video_id>/stats')
def get_video_stats(video_id):
    """Get statistical information about the video and its detections"""
    # Get video info
    video = Video.query.get_or_404(video_id)
    
    # Get class distribution
    class_counts = db.session.execute(
        """
        SELECT class_name, COUNT(*) as count 
        FROM detections 
        WHERE video_id = :video_id 
        GROUP BY class_name
        ORDER BY count DESC
        """,
        {"video_id": video_id}
    ).fetchall()
    
    # Get time distribution (in 10 second bins)
    time_bins = db.session.execute(
        """
        SELECT 
            CAST((timestamp / 10) AS INTEGER) * 10 as time_bin,
            COUNT(*) as count
        FROM detections
        WHERE video_id = :video_id
        GROUP BY time_bin
        ORDER BY time_bin
        """,
        {"video_id": video_id}
    ).fetchall()
    
    return jsonify({
        'video_id': video_id,
        'duration': video.duration,
        'total_detections': Detection.query.filter_by(video_id=video_id).count(),
        'classes': [{'name': row[0], 'count': row[1]} for row in class_counts],
        'time_distribution': [{'time': row[0], 'count': row[1]} for row in time_bins]
    })

@celery.task
def process_video(video_id, model_name, frame_interval):
    """Celery task to process video with server-side rendering"""
    # Configure processing parameters
    config = {
        'model_name': model_name,
        'frame_interval': frame_interval,
        'use_existing_detections': False,
        'num_process_threads': 4,
        'overlay_opacity': 0.7,
        'box_thickness': 2
    }
    
    # Create render engine
    engine = VideoRenderEngine(video_id, config)
    
    # Generate HLS stream
    stream_path = engine.generate_video_stream()
    
    # Update video status in database
    from app.models import Video
    from app import db
    
    video = Video.query.get(video_id)
    video.processed_frames = video.total_frames
    video.status = 'complete'
    db.session.commit()
    
    return {'video_id': video_id, 'stream_path': stream_path}
```

### 3. Lightweight Frontend Interface

```javascript name=app/static/js/videoPlayer.js
class VideoAnalyticsPlayer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID ${containerId} not found`);
        }
        
        this.options = {
            autoplay: false,
            controls: true,
            fluid: true,
            ...options
        };
        
        this.videoId = null;
        this.player = null;
        this.stats = null;