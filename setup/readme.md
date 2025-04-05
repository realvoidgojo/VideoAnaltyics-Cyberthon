# 🔧 Setup Guide for VideoAnalytics-Cyberthon

## 📋 Prerequisites

Before getting started, ensure the following are installed on your system:

- **Python 3.12**
- **[Node.js & npm](https://nodejs.org/en/download)**
- **[Git](https://git-scm.com/downloads)**
- **Redis** (used for Celery message broker and result backend)  
  - **Windows:** [Download Redis for Windows](https://github.com/tporadowski/redis/releases)  
  - **Ubuntu:**  
    ```bash
    sudo apt update && sudo apt install redis-server
    ```

- **[Miniconda (recommended)](https://www.anaconda.com/docs/getting-started/miniconda/install#quickstart-install-instructions)**

### 🚀 Optional: GPU Acceleration

- **CUDA Toolkit:** Version 11.6 or higher  
  - [Download CUDA Toolkit (Ubuntu 24.04)](https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=Ubuntu&target_version=24.04)
- **cuDNN:** Matching your CUDA version  
  - [cuDNN Download Page](https://developer.nvidia.com/cudnn-downloads?target_os=Linux&target_arch=x86_64)  
  - [cuDNN Support Matrix (for version compatibility)](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html)
- **PyTorch with CUDA support:** Installed via custom index  
  - [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)

---

## 🧱 Conda Environment Setup

```bash
conda search python
conda create -n video_env python=3.12 -y
conda activate video_env

conda install -c conda-forge opencv ffmpeg -y
conda install -c conda-forge ffmpeg=6.1.1=gpl* -y

ffmpeg -codecs | grep 264  # Check if H.264 codec is available
```

---

## 🧬 Project Installation

### 1. Clone the Repository

Install Git LFS first to handle large files:

- [Git LFS Download](https://git-lfs.com/)

```bash
git clone https://github.com/realvoidgojo/VideoAnaltyics-Cyberthon.git
cd VideoAnaltyics-Cyberthon
```

⚠️ **Important:**  
YOLOv11 model files may become corrupted during cloning.  
**Instead, download them manually** from the official sources and place them in the `models/` directory:

- [YOLOv11 models](https://github.com/ultralytics/ultralytics)
- [Ultralytics website](https://ultralytics.com/)

---

### 2. Backend Setup (Flask + Celery)

Create and activate a virtual environment but conda env recommended (`conda activate video_env`):

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# OR macOS/Linux
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

#### Optional: CUDA Support

```bash
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu116
# Replace cu116 with your CUDA version
```

Create a `data/` folder in the root directory (used for temporary video storage):

```bash
mkdir data
```

---

### 3. Frontend Setup (React + Vite)

Navigate to the frontend directory:

```bash
cd frontend
npm install
```

---

## ▶️ Running the Application

### 1. Start Redis

Ensure Redis server is running:

- **Windows:** Start from the [Redis for Windows installation](https://github.com/tporadowski/redis/releases)
- **Linux/macOS:**  
  ```bash
  redis-server
  ```

---

### 2. Start Celery Worker

In the root of the project:

```bash
celery -A src.celery.celery_app worker --loglevel=info --pool=threads -c 4
```

- Adjust `-c` to match the number of CPU cores.

---

### 3. Start Flask Backend

```bash
python app.py
```

- Runs by default on: `http://127.0.0.1:5000`

---

### 4. Start React Frontend

In the `frontend/` directory:

```bash
npm run dev
```

- Opens in browser at: `http://localhost:5173`

---

## ✅ You're Ready!

Happy hacking with **VideoAnalytics-Cyberthon**!  
Feel free to open an issue or PR on the [GitHub repo](https://github.com/realvoidgojo/VideoAnaltyics-Cyberthon) if you run into any trouble.

---

Let me know if you'd like this exported as a PDF or markdown file!

