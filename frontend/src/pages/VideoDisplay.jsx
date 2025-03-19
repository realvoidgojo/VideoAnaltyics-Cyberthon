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
import HeatmapAnalysis from "../components/HeatmapAnalysis";
import HeatmapVideo from "../components/HeatmapVideo";
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
      <div className="sticky top-0 z-10 bg-white p-4 shadow-md">
        <button
          className="bg-blue-500 text-white px-4 py-2 m-2 rounded-lg"
          onClick={() => setShowDialog(true)}
        >
          Job Form
        </button>
        <button
          className="bg-red-500 text-white px-4 py-2 m-2 rounded-lg"
          onClick={handleResetAll}
        >
          Reset All
        </button>
      </div>
      
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
      
      {/* Scrollable container for jobs */}
      <div className="jobs-container max-h-screen overflow-y-auto pb-20">
        {jobs.map((job) => (
          <JobProcessing key={job.id} job={job} setJobs={setJobs} />
        ))}
      </div>
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
    useHeatmap: processingWithHeatmap,
  } = useVideoProcessing();
  
  const [showAnalysis, setShowAnalysis] = useState(false);

  const {
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
    heatmapFrames,
    useHeatmap: hasHeatmapData,
    heatmapAnalysis,
    heatmapVideoUrl,
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
    // If we have a taskID, attempt to cancel it before removing
    if (taskID) {
      handleReset();
    }
    setJobs((prevJobs) => prevJobs.filter((j) => j.id !== job.id));
  };

  const toggleHeatmapView = () => {
    setJobs(prevJobs => 
      prevJobs.map(j => 
        j.id === job.id ? {...j, showHeatmap: !j.showHeatmap} : j
      )
    );
  };
  
  // When heatmap data becomes available, show a notification
  useEffect(() => {
    if (hasHeatmapData && heatmapFrames && heatmapFrames.length > 0 && !job.heatmapNotified) {
      setJobs(prevJobs => 
        prevJobs.map(j => 
          j.id === job.id ? {...j, heatmapNotified: true} : j
        )
      );
      
      // Show notification that heatmap is available
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg';
      notification.textContent = 'Heatmap analysis is now available! Click "Show Heatmap View" to see it.';
      document.body.appendChild(notification);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 5000);
    }
  }, [hasHeatmapData, heatmapFrames, job.id, job.heatmapNotified, setJobs]);

  // Update job when new heatmap frames are available
  useEffect(() => {
    if (heatmapFrames && heatmapFrames.length > 0) {
      setJobs(prevJobs => 
        prevJobs.map(j => 
          j.id === job.id ? {...j, heatmapFrames: heatmapFrames} : j
        )
      );
    }
  }, [heatmapFrames, job.id, setJobs]);

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
      
      {/* Control buttons for heatmap features - show when heatmap was requested */}
      {(hasHeatmapData || processingWithHeatmap) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Toggle button for heatmap view - only show if we have frames */}
          {heatmapFrames && heatmapFrames.length > 0 && (
            <button
              className={`px-4 py-2 text-sm cursor-pointer rounded-lg ${
                job.showHeatmap ? "bg-blue-400" : "bg-blue-600"
              } text-white`}
              onClick={toggleHeatmapView}
            >
              {job.showHeatmap ? "Show Detection View" : "Show Heatmap View"}
            </button>
          )}
          
          {/* Toggle button for heatmap analysis - always show if heatmap was requested */}
          <button
            className={`px-4 py-2 text-sm cursor-pointer rounded-lg ${
              showAnalysis ? "bg-green-400" : "bg-green-600"
            } text-white`}
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            {showAnalysis ? "Hide Heatmap Analysis" : "Show Heatmap Analysis"}
          </button>
        </div>
      )}
      
      {/* Display heatmap analysis data when enabled */}
      {(hasHeatmapData || processingWithHeatmap) && showAnalysis && (
        <HeatmapAnalysis
          heatmapData={heatmapAnalysis || {}}
          taskID={taskID}
        />
      )}
      
      {/* Display heatmap video when heatmap was enabled and we have task ID 
          Only show when in heatmap view mode */}
      {(hasHeatmapData || processingWithHeatmap) && taskID && job.showHeatmap && (
        <HeatmapVideo
          taskID={taskID}
          containerWidth={job.containerWidth}
          visible={true}
        />
      )}

      {/* Show HeatmapVideo when in heatmap view mode (this replaces HeatmapView) */}
      {!job.showHeatmap && (
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
