import React, { useState, useRef, useEffect } from "react";
import VideoUpload from "../components/VideoUpload";
import ModelSelection from "../components/ModelSelection";
import ProcessingControls from "../components/ProcessingControls";
import FrameIntervalInput from "../components/FrameIntervalInput";
import ContainerWidthInput from "../components/ContainerWidthInput";
import ClassColorCustomization from "../components/ClassColorCustomization";
import VideoCanvas from "../components/VideoCanvas";
import HeatmapCheckbox from "../components/HeatmapCheckbox";
import HeatmapDownload from "../components/HeatmapDownload";
import HeatmapView from "../components/HeatmapView";
import useVideoProcessing from "../components/useVideoProcessing";
import useDetections from "../components/UseDetections";
import { getDistinctColor } from "./utils/colorUtils";

const VideoDisplay = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("yolov11n.pt");
  const [frameInterval, setFrameInterval] = useState(1);
  const [containerWidth, setContainerWidth] = useState(720);
  const [useHeatmap, setUseHeatmap] = useState(false);
  const fileInputRef = useRef(null);
  const [jobs, setJobs] = useState([]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const saveJobPreset = () => {
    if (!selectedFile) {
      alert("Please upload a video first!");
      return;
    }

    const newJob = {
      id: Date.now(),
      videoSource: URL.createObjectURL(selectedFile),
      selectedFile,
      selectedModel,
      frameInterval,
      containerWidth,
      useHeatmap,
      classColors: {},
      showHeatmap: false,
      heatmapFrames: [],
    };

    setJobs((prevJobs) => [...prevJobs, newJob]);
    setShowDialog(false);
  };

  const handleResetAll = () => {
    setJobs([]);
  };

  return (
    <div className="relative">
      <button
        className="bg-blue-500 text-white px-4 py-2 m-5 rounded-lg"
        onClick={() => setShowDialog(true)}
      >
        Job Form
      </button>
      <button
        className="bg-red-500 text-white px-4 py-2 m-5 rounded-lg"
        onClick={handleResetAll}
      >
        Reset All
      </button>
      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative z-50">
            <h2 className="text-lg font-semibold mb-4 text-black">Job Form</h2>
            <VideoUpload
              onVideoUpload={handleVideoUpload}
              fileInputRef={fileInputRef}
            />
            <ModelSelection
              selectedModel={selectedModel}
              onModelChange={(e) => setSelectedModel(e.target.value)}
            />
            <FrameIntervalInput
              frameInterval={frameInterval}
              setFrameInterval={setFrameInterval}
            />
            <ContainerWidthInput
              containerWidth={containerWidth}
              setContainerWidth={setContainerWidth}
            />
            <HeatmapCheckbox
              useHeatmap={useHeatmap}
              setUseHeatmap={setUseHeatmap}
            />
            <div className="flex justify-between mt-4">
              <button
                className="bg-green-500 text-black px-4 py-2 rounded-lg"
                onClick={saveJobPreset}
              >
                Save
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
                onClick={() => setShowDialog(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {jobs.map((job) => (
        <JobProcessing key={job.id} job={job} setJobs={setJobs} />
      ))}
    </div>
  );
};

const JobProcessing = ({ job, setJobs }) => {
  const {
    isProcessing,
    isVideoPaused,
    handleStartProcessing,
    handleReset,
    handleStopResume,
    taskID,
  } = useVideoProcessing();

  const {
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
    heatmapFrames,
    useHeatmap: hasHeatmapData,
  } = useDetections(taskID);

  useEffect(() => {
    if (detections && detections.length > 0) {
      const detectedClasses = new Set(
        detections.flat().map((det) => det.class_name)
      );
      let newColors = { ...job.classColors };
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
      job.classColors = newColors;
    }
  }, [detections]);

  const handleRemoveJob = () => {
    setJobs((prevJobs) => prevJobs.filter((j) => j.id !== job.id));
  };

  return (
    <div className="border p-4 my-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold text-black">Processing Job</h3>
      <button
        className="bg-red-500 text-white px-4 py-2 rounded-lg float-right"
        onClick={handleRemoveJob}
      >
        Remove
      </button>
      <ProcessingControls
        onStartProcessing={() =>
          handleStartProcessing(
            job.selectedFile,
            job.selectedModel,
            job.frameInterval,
            job.useHeatmap
          )
        }
        isProcessing={isProcessing}
        onReset={handleReset}
        onStopResume={handleStopResume}
        isVideoPaused={isVideoPaused}
        hasVideoUploaded={true}
      />
      <ClassColorCustomization
        detections={detections}
        classColors={job.classColors}
        onClassColorChange={(className, color) =>
          (job.classColors[className] = {
            hue: job.classColors[className]?.hue || 0,
            hex: color,
          })
        }
      />
      {job.showHeatmap ? (
        <HeatmapView
          videoSource={job.videoSource}
          heatmapFrames={heatmapFrames}
          containerWidth={job.containerWidth}
          visible
        />
      ) : (
        <VideoCanvas
          videoSource={job.videoSource}
          detections={detections}
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          preprocessedWidth={preprocessedWidth}
          preprocessedHeight={preprocessedHeight}
          containerWidth={job.containerWidth}
          classColors={job.classColors}
        />
      )}
    </div>
  );
};

export default VideoDisplay;
