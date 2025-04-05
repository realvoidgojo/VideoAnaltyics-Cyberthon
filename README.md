# Video Analytics and OSINT Project

This project demonstrates real-time object detection in videos using a React frontend and a Flask backend. It utilizes the YOLO model for object detection, Celery for asynchronous task management, and Redis for message brokering. The application includes features for video analysis, heatmap generation, and object tracking.

## Features

- **Real-time Object Detection**: Process videos and detect objects using YOLO models
- **Heatmap Analysis**: Generate motion heatmaps to visualize movement patterns
- **Object Tracking**: Track objects across video frames
- **Statistical Analysis**: View frequency charts and statistics about detected objects
- **Multiple Video Processing**: Process multiple videos simultaneously with job management
- **Customizable Detection Parameters**: Adjust frame intervals and model selection

## Prerequisites , checkout [setup](./setup/readme.md)

Before you begin, ensure that you have the following installed:

- **Python 3.12**
- **Node.js and npm**
- **Git** (for cloning the repository)
- **Redis** (for Celery message broker and result backend)
  - **Windows:** [Download Redis for Windows](https://github.com/tporadowski/redis/releases)
  - **Ubuntu:** `sudo apt update && sudo apt install redis-server`

### GPU Acceleration (Optional but Recommended)

- **CUDA Toolkit:** Version 11.6 or higher (check compatibility with PyTorch)
- **cuDNN:** Version matching your CUDA Toolkit
- **PyTorch with CUDA support**

## Installation

1. **Clone the repository:**
   
   First, install Git LFS extension for handling large files: [Download Git LFS](https://git-lfs.com/)

   ```bash
   git clone https://github.com/realvoidgojo/VideoAnaltyics-Cyberthon.git
   cd VideoAnaltyics-Cyberthon
   ```

2. **Backend Setup (Flask & Celery):**

   - Create a virtual environment:

     ```bash
     python -m venv venv
     venv\Scripts\activate  # Windows
     # OR
     source venv/bin/activate  # Linux or macOS
     ```

   - Install the required Python packages:

     ```bash
     pip install -r requirements.txt
     ```

   - For CUDA support (optional):

     ```bash
     pip uninstall torch torchvision
     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu116  # Replace cu116 with your CUDA version
     ```

   - Download YOLO Models:
     Download a YOLO model (e.g., `yolov11n.pt`) from the [official YOLO repository](https://github.com/ultralytics/ultralytics) or the [Ultralytics website](https://ultralytics.com/) and place it in the `models` directory.

   - Set up the data directory:
     Create an empty directory named `data` in your project root. This is where uploaded videos will be temporarily stored.

3. **Frontend Setup (React + Vite):**

   - Navigate to the frontend directory:

     ```bash
     cd frontend
     ```

   - Install the required Node.js packages:

     ```bash
     npm install
     ```

## Running the Application

1. **Start Redis:**

   - Ensure Redis server is running.
   - For Windows, start the Redis server from the installation directory.

2. **Start the Celery worker:**

   - From the project's root directory, run:

     ```bash
     celery -A src.celery.celery_app worker --loglevel=info --pool=threads -c 4
     ```

   - Adjust the `-c` option (concurrency) to match the number of CPU cores you want to use.

3. **Start the Flask backend:**

   - From the project's root directory, run:

     ```bash
     python app.py
     ```

   - The Flask app will run on `http://127.0.0.1:5000` by default.

4. **Start the React frontend:**

   - From the frontend directory, run:

     ```bash
     npm run dev
     ```

   - The React app will open in your browser (usually at `http://localhost:5173`).

## Performance Optimization

This application has been optimized to handle large video files efficiently:

- **Memory Management**: Automatic cleanup of unused resources to prevent browser crashes
- **Request Throttling**: Intelligent polling with cooldown periods to reduce network traffic
- **Caching**: Detection results are cached to prevent redundant fetches
- **Exponential Backoff**: Polling frequency is reduced for completed tasks

## Project Structure

```
VideoAnalytics-OSINT/
├── app.py                   # Main Flask application file
├── src/                     # Source code directory
│   ├── celery.py            # Celery application definition
│   ├── celeryconfig.py      # Celery configuration file
│   ├── video_processing.py  # Frame extraction and preprocessing functions
│   ├── video_processing_tasks.py  # Celery tasks for video processing
│   ├── object_detection.py  # YOLO object detection functions
│   ├── heatmap_analysis.py  # Heatmap generation and analysis
├── models/                  # Directory for YOLO model (.pt file)
├── data/                    # Directory for temporarily storing uploaded videos
├── hls_stream/              # Directory for HLS video streaming
├── frontend/                # React frontend
│   ├── src/                 # React source code
│   │   ├── components/      # React components
│   │   │   ├── UseDetections.jsx  # Hook for fetching and managing detection data
│   │   │   ├── VideoCanvas.jsx    # Component for displaying video with detections
│   │   │   ├── HeatmapVideo.jsx   # Component for displaying heatmap video
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   └── VideoDisplay.jsx  # Main page for video display and analysis
│   ├── public/              # Static assets
│   ├── vite.config.js       # Vite configuration
│   └── package.json         # Node.js dependencies
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Troubleshooting

- **Browser Crashes (SIGILL Error)**:
  - If you experience browser crashes, it may be due to excessive network requests or memory usage.
  - The application has been optimized to reduce these issues, but for very large videos, consider:
    - Reducing the frame interval to process fewer frames
    - Using a smaller model (e.g., yolov11n instead of yolov11l)
    - Closing other browser tabs to free up memory

- **CORS Errors**:
  - If you encounter Cross-Origin Resource Sharing (CORS) errors, ensure that you have correctly enabled CORS in your Flask app.

- **Model Not Found Errors**:
  - If the YOLO model cannot be found, double-check that the path to the model file in `object_detection.py` is correct and that the model file exists in the specified location.

- **Video Not Playing**:
  - If the video is not playing in the React app, make sure that the video file is a supported format and that the `videoSource` state variable is correctly set.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to suggest improvements or report bugs.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
