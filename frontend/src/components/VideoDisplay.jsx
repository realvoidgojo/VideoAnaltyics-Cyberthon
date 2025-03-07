import { useState, useRef, useEffect } from "react";
import axios from "axios";

// Helper function to generate a distinct color

const getDistinctColor = (existingColors) => {
  let hue = Math.random() * 360; // Initial random hue
  const minHueDifference = 30; // Minimum degrees of hue difference

  // Function to calculate the hue difference
  const hueDifference = (hue1, hue2) => {
    let diff = Math.abs(hue1 - hue2);
    return Math.min(diff, 360 - diff);
  };

  // Ensure the new color is distinct from existing colors
  if (existingColors.length > 0) {
    let validHue = false;
    let attempts = 0;
    while (!validHue && attempts < 100) {
      validHue = true;
      for (let i = 0; i < existingColors.length; i++) {
        const existingHue = existingColors[i];
        if (hueDifference(hue, existingHue) < minHueDifference) {
          hue = Math.random() * 360; // Generate a new hue
          validHue = false;
          break;
        }
      }

      attempts++;
    }
  }

  // Convert HSL to hex

  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0"); // convert to Hex and pad
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  // Convert the HSL value to Hex
  const hexColor = hslToHex(hue, 90, 50); // High saturation and brightness
  return { hue: hue, hex: hexColor };
};

const VideoDisplay = () => {
  const [videoSource, setVideoSource] = useState(null);
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [preprocessedWidth, setPreprocessedWidth] = useState(0);
  const [preprocessedHeight, setPreprocessedHeight] = useState(0);
  const [selectedModel, setSelectedModel] = useState("yolov11n.pt");
  const [frameInterval, setFrameInterval] = useState(1);
  const [containerWidth, setContainerWidth] = useState(720);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const fileInputRef = useRef(null);
  const [hasVideoUploaded, setHasVideoUploaded] = useState(false); // Track if video is uploaded
  const [selectedFile, setSelectedFile] = useState(null);
  const [classColors, setClassColors] = useState({});
  const [taskID, setTaskID] = useState(null);
  const [existingColors, setExistingColors] = useState([]);
  const [processingStatus, setProcessingStatus] = useState("");

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setVideoSource(URL.createObjectURL(file));
    setHasVideoUploaded(true);
    setSelectedFile(file);
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true); // Start processing

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("model", selectedModel);
    formData.append("interval", frameInterval);

    try {
      const response = await axios.post(
        "http://localhost:5000/process_video",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      //get TaskID from backend
      setTaskID(response.data.task_id);
      console.log("Task ID:", response.data.task_id);
      alert(
        "Processing started in background with task ID: " +
          response.data.task_id
      );
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please check the console for details.");
    } finally {
      setIsProcessing(false); // Processing done
    }
  };

  const handleReset = async () => {
    // Reset video source, detections, and other relevant states
    setVideoSource(null);
    setDetections([]);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setPreprocessedWidth(0);
    setPreprocessedHeight(0);
    setIsProcessing(false);
    setIsVideoPaused(false);
    setHasVideoUploaded(false); // Reset the flag
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the selected file
    }
    // If you have a video element, you might want to pause it
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Send signal to backend to skip current processing
    try {
      await axios.post("http://localhost:5000/reset_processing");
      console.log("Processing reset signal sent to the backend.");
    } catch (error) {
      console.error("Error sending reset signal:", error);
    }
  };

  // Add the methods to tell the flask server what to do
  const pauseVideoProcessing = async () => {
    try {
      await axios.post("http://localhost:5000/pause_processing");
      console.log("Video processing paused on the backend.");
    } catch (error) {
      console.error("Error pausing video processing:", error);
    }
  };
  // Add the method to tell the flask server what to do

  const resumeVideoProcessing = async () => {
    try {
      await axios.post("http://localhost:5000/resume_processing");
      console.log("Video processing resumed on the backend.");
    } catch (error) {
      console.error("Error resuming video processing:", error);
    }
  };

  const handleStopResume = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPaused) {
      video.play();
      resumeVideoProcessing(); // Resume video processing on the backend
    } else {
      video.pause();
      pauseVideoProcessing(); // Pause video processing on the backend
    }
    setIsVideoPaused(!isVideoPaused);
  };

  // Handler for updating class colors

  const handleClassColorChange = (className, color) => {
    setClassColors((prevColors) => ({
      ...prevColors,

      [className]: {
        hue: prevColors[className]?.hue || 0,
        hex: color,
      },
    }));
  };

  // Update class colors when new detections arrive
  useEffect(() => {
    if (detections && detections.length > 0) {
      const detectedClasses = new Set(
        detections.flat().map((det) => det.class_name)
      );

      setClassColors((prevColors) => {
        let newColors = { ...prevColors };

        let existingHues = Object.values(newColors).map((color) => color.hue);

        detectedClasses.forEach((className) => {
          if (!newColors[className]) {
            const distinctColor = getDistinctColor(existingHues);
            newColors[className] = {
              hue: distinctColor.hue,
              hex: distinctColor.hex,
            };
            // Assign random color if not already assigned
            existingHues.push(distinctColor.hue);
          }
        });

        return newColors;
      });
    }
  }, [detections]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");

    const drawDetections = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentTime = video.currentTime;
      const frameIndex = Math.floor(
        currentTime * (detections.length / video.duration)
      );

      const widthScaleFactor = canvas.width / preprocessedWidth;
      const heightScaleFactor = canvas.height / preprocessedHeight;

      if (detections.length > 0 && frameIndex < detections.length) {
        const currentFrameDetections = detections[frameIndex];
        currentFrameDetections.forEach((detection) => {
          const { class_name, confidence, box, track_id } = detection;
          if (box && box.length === 4) {
            const x1 = box[0] * widthScaleFactor;
            const y1 = box[1] * heightScaleFactor;
            const x2 = box[2] * widthScaleFactor;
            const y2 = box[3] * heightScaleFactor;

            // Get class color from state

            const classColor = classColors[class_name]?.hex || "#ff0000"; // Default to red

            ctx.beginPath();
            ctx.rect(x1, y1, x2 - x1, y2 - y1);
            ctx.strokeStyle = classColor; // Use class-specific color or default to red
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw the label
            ctx.font = "12px Arial";
            ctx.fillStyle = classColor;
            ctx.fillRect(
              x1,
              y1 - 1,
              ctx.measureText(class_name).width + 65,
              15
            ); // Background rectangle
            ctx.fillStyle = "#000";

            // Include track_id in the label if available
            const label = track_id
              ? `${class_name} ${confidence.toFixed(2)} (ID: ${track_id})`
              : `${class_name} ${confidence.toFixed(2)}`;
            ctx.fillText(label, x1, y1 + 10);
          }
        });
      }
      requestAnimationFrame(drawDetections);
    };

    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
      }
    };

    video.addEventListener("loadedmetadata", updateCanvasSize);
    video.addEventListener("play", drawDetections);

    return () => {
      video.removeEventListener("loadedmetadata", updateCanvasSize);
      video.removeEventListener("play", drawDetections);
    };
  }, [
    videoSource,
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
    selectedModel,
    containerWidth,
    isVideoPaused,
    classColors, // React to changes in class colors
  ]);

  const fetchTaskResult = async (task_id) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/task_status/${task_id}`
      );
      console.log("Task Status:", response.data);
      if (response.data.state === "SUCCESS" && response.data.status) {
        // Check if results are available
        const result = response.data.status;
        setOriginalWidth(result.original_width || 0);
        setOriginalHeight(result.original_height || 0);
        setPreprocessedWidth(result.preprocessed_width || 0);
        setPreprocessedHeight(result.preprocessed_height || 0);
        setDetections(result.results || []);
        setProcessingStatus("Completed"); // Update processing status
      } else if (
        response.data.state === "PENDING" ||
        response.data.state === "PROCESSING"
      ) {
        setProcessingStatus("Processing..."); // Update processing status
      } else if (response.data.state === "FAILURE") {
        setProcessingStatus(`Failed: ${response.data.status}`); // Update processing status
      }
    } catch (error) {
      console.error("Error fetching task result:", error);
      setProcessingStatus("Error fetching results."); // Update processing status
    }
  };

  useEffect(() => {
    let intervalId;
    if (taskID) {
      intervalId = setInterval(() => {
        fetchTaskResult(taskID);
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(intervalId); // Cleanup on unmount or taskID change
  }, [taskID]);

  useEffect(() => {
    // Start fetching task result immediately after taskID is set
    if (taskID) {
      fetchTaskResult(taskID);
    }
  }, [taskID]);

  return (
    <div className="relative">
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        ref={fileInputRef}
        className="border border-gray-300 p-2 m-4 rounded-lg bg-black-100"
      />

      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="border border-gray-300 p-2 m-4 rounded-lg"
      >
        <option value="yolov11n.pt" className="bg-gray-00">
          YOLOv11n
        </option>
        <option value="yolov11s.pt" className="bg-gray-600">
          YOLOv11s
        </option>
        <option value="yolov11m.pt" className="bg-gray-600">
          YOLOv11m
        </option>
        <option value="yolov11l.pt" className="bg-gray-600">
          YOLOv11l
        </option>
        <option value="yolov11x.pt" className="bg-gray-600">
          YOLOv11x
        </option>
      </select>

      {/* Add a condition where to process the video */}

      {hasVideoUploaded && (
        <button
          onClick={handleStartProcessing}
          disabled={isProcessing}
          className={`px-4 py-2 text-sm cursor-pointer rounded-lg ${
            isProcessing ? "bg-gray-400" : "bg-green-600"
          } text-white`}
        >
          {isProcessing ? "Processing..." : "Start Processing"}
        </button>
      )}

      <label>
        <span className="text-sm ml-4 mr-4">Frames</span>
        <input
          type="number"
          value={frameInterval}
          onChange={(e) => setFrameInterval(parseInt(e.target.value, 10))}
          min="1" // Ensure interval is at least 1
          className="border border-gray-300 p-2 m-4 rounded-lg w-14"
        />
      </label>
      <label className="ml-4 mr-4">
        <span className="text-sm ml-4 mr-4">Container Width:</span>
        <input
          type="number"
          value={containerWidth}
          onChange={(e) => setContainerWidth(parseInt(e.target.value, 10))}
          min="100" // Ensure container width is at least 100px
          className="border border-gray-300 p-2 m-4 rounded-lg w-20"
        />
      </label>

      {/* Reset and Stop buttons */}
      <button
        onClick={handleReset}
        className="px-4 py-2 text-sm cursor-pointer rounded-lg bg-red-500 text-white"
      >
        Reset
      </button>
      <button
        onClick={handleStopResume}
        className={`px-4 py-2 text-sm cursor-pointer rounded-lg ml-4 ${
          isVideoPaused ? "bg-green-500" : "bg-red-500"
        } text-white`}
      >
        {isVideoPaused ? "Resume" : "Stop"}
      </button>

      {/* Class Color Customization */}
      <div className="border border-gray-300 p-4 rounded-lg mt-8">
        <h6 className="text-2xl mb-4 mt-4">Customize Class Colors</h6>
        <div className="grid grid-cols-2 gap-4">
          {Array.from(
            new Set(detections.flat().map((det) => det.class_name))
          ).map((className) => (
            <div key={className} className="flex items-center">
              <label htmlFor={`${className}-color`} className="flex-1 text-lg">
                {className}:
              </label>
              <input
                type="color"
                id={`${className}-color`}
                value={classColors[className]?.hex || "#ff0000"} // Default to red
                onChange={(e) =>
                  handleClassColorChange(className, e.target.value)
                }
                className="ml-4 flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      {videoSource && (
        <div className="flex flex-row w-full p-4">
          <div className="w-1/2 mr-4">
            <video
              ref={videoRef}
              src={videoSource}
              controls
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="w-1/2">
            <canvas
              ref={canvasRef}
              className="w-full h-auto pointer-events-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
