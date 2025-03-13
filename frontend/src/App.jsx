// src/App.js
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import ResultPage from "./pages/ResultPage";
import { useState, useRef, useEffect } from "react";
import useVideoProcessing from "./components/useVideoProcessing";
import useDetections from "./components/UseDetections";
import { getDistinctColor } from "./pages/utils/colorUtils";

function App() {
  const [videoSource, setVideoSource] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [hasVideoUploaded, setHasVideoUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("yolov11n.pt");
  const [frameInterval, setFrameInterval] = useState(1);
  const [containerWidth, setContainerWidth] = useState(720);
  const [classColors, setClassColors] = useState({});
  const [existingColors, setExistingColors] = useState([]);

  const {
    isProcessing,
    isVideoPaused,
    taskID,
    handleStartProcessing,
    handleReset,
    handleStopResume,
  } = useVideoProcessing();

  const {
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
  } = useDetections(taskID);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setVideoSource(URL.createObjectURL(file));
    setHasVideoUploaded(true);
    setSelectedFile(file);
  };

  const handleClassColorChange = (className, color) => {
    setClassColors((prevColors) => ({
      ...prevColors,
      [className]: {
        hue: prevColors[className]?.hue || 0,
        hex: color,
      },
    }));
  };

  useEffect(() => {
    if (detections && detections.length > 0) {
      const detectedClasses = new Set(detections.flat().map((det) => det.class_name));

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
            existingHues.push(distinctColor.hue);
          }
        });

        return newColors;
      });
    }
  }, [detections]);

  const onResetAll = () => {
    setVideoSource(null);
    handleReset();
    setHasVideoUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const onStartVideoProcessing = () => {
    handleStartProcessing(selectedFile, selectedModel, frameInterval);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <TaskPage
              handleVideoUpload={handleVideoUpload}
              fileInputRef={fileInputRef}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onStartVideoProcessing={onStartVideoProcessing}
              isProcessing={isProcessing}
              onResetAll={onResetAll}
              handleStopResume={handleStopResume}
              isVideoPaused={isVideoPaused}
              hasVideoUploaded={hasVideoUploaded}
              frameInterval={frameInterval}
              setFrameInterval={setFrameInterval}
              containerWidth={containerWidth}
              setContainerWidth={setContainerWidth}
            />
          }
        />
        <Route
          path="/result"
          element={
            <ResultPage
              detections={detections}
              classColors={classColors}
              handleClassColorChange={handleClassColorChange}
              videoSource={videoSource}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              preprocessedWidth={preprocessedWidth}
              preprocessedHeight={preprocessedHeight}
              containerWidth={containerWidth}
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
