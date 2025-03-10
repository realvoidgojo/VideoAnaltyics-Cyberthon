// VideoDisplay.jsx
import React, { useState, useRef, useEffect } from "react";
import VideoUpload from "../components/VideoUpload";
import ModelSelection from "../components/ModelSelection";
import ProcessingControls from "../components/ProcessingControls";
import FrameIntervalInput from "../components/FrameIntervalInput";
import ContainerWidthInput from "../components/ContainerWidthInput";
import ClassColorCustomization from "../components/ClassColorCustomization";
import VideoCanvas from "../components/VideoCanvas";
import useVideoProcessing from "../components/useVideoProcessing";
import useDetections from "../components/UseDetections";
import { getDistinctColor } from "./utils/colorUtils";

const VideoDisplay = () => {
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

  // Use custom hook for video processing logic
  const {
    isProcessing,
    isVideoPaused,
    taskID,
    handleStartProcessing,
    handleReset,
    handleStopResume,
    setIsVideoPaused,
  } = useVideoProcessing();

  // Use custom hook for detections logic
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
    <div className="relative">
      <VideoUpload
        onVideoUpload={handleVideoUpload}
        fileInputRef={fileInputRef}
      />
      <ModelSelection
        selectedModel={selectedModel}
        onModelChange={(e) => setSelectedModel(e.target.value)}
      />
      <ProcessingControls
        onStartProcessing={onStartVideoProcessing}
        isProcessing={isProcessing}
        onReset={onResetAll}
        onStopResume={handleStopResume}
        isVideoPaused={isVideoPaused}
        hasVideoUploaded={hasVideoUploaded}
      />
      <FrameIntervalInput
        frameInterval={frameInterval}
        setFrameInterval={(value) => setFrameInterval(value)}
      />
      <ContainerWidthInput
        containerWidth={containerWidth}
        setContainerWidth={(value) => setContainerWidth(value)}
      />
      <ClassColorCustomization
        detections={detections}
        classColors={classColors}
        onClassColorChange={handleClassColorChange}
      />
      <VideoCanvas
        videoSource={videoSource}
        detections={detections}
        originalWidth={originalWidth}
        originalHeight={originalHeight}
        preprocessedWidth={preprocessedWidth}
        preprocessedHeight={preprocessedHeight}
        containerWidth={containerWidth}
        classColors={classColors}
      />
    </div>
  );
};

export default VideoDisplay;
