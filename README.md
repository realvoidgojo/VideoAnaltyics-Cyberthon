# 🔍 Video Analytics and OSINT Platform

![Video Analytics](https://img.shields.io/badge/Video-Analytics-blue)
![Object Detection](https://img.shields.io/badge/Object-Detection-green)
![Heatmap Analysis](https://img.shields.io/badge/Heatmap-Analysis-red)
![React](https://img.shields.io/badge/React-Frontend-61DBFB)
![Flask](https://img.shields.io/badge/Flask-Backend-lightgrey)

A comprehensive video analytics platform with real-time object detection, movement heatmap analysis, and object tracking capabilities. Powered by YOLO models for detection, with a React frontend and Flask+Celery backend.

## ✨ Features

- **📊 Real-time Object Detection**: Process videos and detect objects using latest YOLO models
- **🔥 Heatmap Analysis**: Generate motion heatmaps to visualize movement patterns over time
- **📈 Statistical Analysis**: Visualize detected object frequencies and detailed statistics
- **🔄 Object Tracking**: Track objects across video frames with persistence
- **⚡ Multiple Video Processing**: Process multiple videos simultaneously with intuitive job management
- **🛠️ Customizable Parameters**: Adjust frame intervals and model selection for optimal results
- **📱 Responsive UI**: Modern interface that works across devices

## 🛠️ Prerequisites

Before getting started, ensure you have installed:

- **Python 3.12**
- **[Node.js & npm](https://nodejs.org/en/download)**
- **[Git](https://git-scm.com/downloads)** (with [Git LFS](https://git-lfs.com/))
- **Redis** (Celery message broker and result backend)
  - **Windows:** [Download Redis for Windows](https://github.com/tporadowski/redis/releases)
  - **Ubuntu:** `sudo apt update && sudo apt install redis-server`
- **[Miniconda](https://www.anaconda.com/docs/getting-started/miniconda/install#quickstart-install-instructions)** (recommended)

### 🚀 Optional: GPU Acceleration

For significantly faster processing:

- **CUDA Toolkit:** Version 11.6 or higher
  - [Download CUDA Toolkit](https://developer.nvidia.com/cuda-downloads)
- **cuDNN:** Matching your CUDA version
  - [cuDNN Download Page](https://developer.nvidia.com/cudnn-downloads)
- **PyTorch with CUDA:** Installed via custom index
  - [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)

## 🧱 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/realvoidgojo/VideoAnaltyics-Cyberthon.git
cd VideoAnaltyics-Cyberthon
```

⚠️ **Important:** Download YOLO models manually from:

- [YOLOv11 models repository](https://github.com/ultralytics/ultralytics)
- [Ultralytics website](https://ultralytics.com/)
- Place downloaded model(s) in the models directory

### 2. Set Up Conda Environment (Recommended)

```bash
conda create -n video_env python=3.12 -y
conda activate video_env
conda install -c conda-forge opencv ffmpeg -y
conda install -c conda-forge ffmpeg=6.1.1=gpl* -y
```

### 3. Backend Setup

```bash
# With conda environment activated:
pip install -r requirements.txt

# For CUDA support (optional, replace cu116 with your CUDA version):
pip uninstall torch torchvision -y
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu116

# Create necessary directories
mkdir -p data hls_stream
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

## ▶️ Running the Application

### 1. Start Redis Server

```bash
# Windows: Start from the installed location
# Linux/macOS:
redis-server
```

### 2. Start Celery Worker

```bash
# From project root, in a new terminal:
conda activate video_env  # If using conda
celery -A src.celery.celery_app worker --loglevel=info --pool=threads -c 4
```

> Adjust `-c` option to match your CPU cores

### 3. Start Flask Backend

```bash
# From project root, in a new terminal:
conda activate video_env  # If using conda
python app.py
```

> Flask will run at: http://127.0.0.1:5000

### 4. Start React Frontend

```bash
# From frontend directory, in a new terminal:
npm run dev
```

> Frontend will be available at: http://localhost:5173

## 🖥️ Using the Application

1. **Upload Videos**: Use the upload interface to submit video files
2. **Choose Detection Settings**:
   - Select YOLO model (smaller models are faster)
   - Set frame interval (higher values = faster processing, fewer detections)
   - Enable heatmap generation
3. **Analysis Modes**:
   - **Object Detection View**: See detected objects with bounding boxes and statistics
   - **Heatmap Analysis**: Visualize movement intensity and patterns over time

## 🌟 Features in Detail

### Object Detection

- Real-time object recognition with latest YOLO models
- Customizable confidence thresholds
- Detailed statistics of detected objects
- Frequency charts and object counts
- HLS video streaming for smooth playback

### Heatmap Analysis

- Movement intensity visualization
- Temporal activity mapping
- Peak movement time identification
- Duration analysis
- Downloadable heatmap videos


## 📁 Project Structure

```
VideoAnalytics-Cyberthon/
├── app.py                   # Main Flask application
├── src/                     # Source code directory
│   ├── celery.py            # Celery application definition
│   ├── video_processing.py  # Frame extraction and preprocessing
│   ├── object_detection.py  # YOLO detection functions
│   ├── heatmap_analysis.py  # Heatmap generation and analysis
│   └── ...
├── models/                  # YOLO model files (.pt)
├── data/                    # Temporary video storage
├── hls_stream/              # HLS video streaming files
├── frontend/                # React frontend
│   ├── src/                 # React source code
│   │   ├── components/      # UI components
│   │   │   ├── video/       # Video-related components
│   │   │   ├── heatmap/     # Heatmap components
│   │   │   ├── charts/      # Data visualization
│   │   │   └── ...
│   │   └── ...
├── setup/                   # Setup documentation
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to suggest improvements or report bugs.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Ultralytics](https://ultralytics.com/) for YOLO models
- [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) for the frontend framework
- [Flask](https://flask.palletsprojects.com/) for the backend API
- [Celery](https://docs.celeryq.dev/) for asynchronous task processing

---

_For detailed setup instructions, see the setup guide_
