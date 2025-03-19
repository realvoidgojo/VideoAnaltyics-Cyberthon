import React, { useState, useRef, useEffect } from "react";
import VideoUpload from "../components/VideoUpload";
import ModelSelection from "../components/ModelSelection";
import ProcessingControls from "../components/ProcessingControls";
import FrameIntervalInput from "../components/FrameIntervalInput";
import ContainerWidthInput from "../components/ContainerWidthInput";
import ClassColorCustomization from "../components/ClassColorCustomization";
import VideoCanvas from "../components/VideoCanvas";
import HeatmapCheckbox from "../components/HeatmapCheckbox";
import HeatmapAnalysis from "../components/HeatmapAnalysis";
import HeatmapVideo from "../components/HeatmapVideo";
import useVideoProcessing from "../components/useVideoProcessing";
import useDetections from "../components/UseDetections";
import { getDistinctColor } from "../components/utils/colorUtils";

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
    <div className="relative bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white p-5 shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl px-4 font-bold text-gray-800 ">
            CCTV Analytics Dashboard
          </h1>
          <div className="flex space-x-3">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
              onClick={() => setShowDialog(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Job
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
              onClick={handleResetAll}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Job Form Modal */}
      {showDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Create New Job
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowDialog(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Upload Video
                </h3>
                <VideoUpload
                  onVideoUpload={handleVideoUpload}
                  fileInputRef={fileInputRef}
                />
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Model Selection
                </h3>
                <ModelSelection
                  selectedModel={selectedModel}
                  onModelChange={(e) => setSelectedModel(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Frame Interval
                  </h3>
                  <FrameIntervalInput
                    frameInterval={frameInterval}
                    setFrameInterval={setFrameInterval}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Container Width
                  </h3>
                  <ContainerWidthInput
                    containerWidth={containerWidth}
                    setContainerWidth={setContainerWidth}
                  />
                </div>
              </div>

              <div className="mb-4">
                <HeatmapCheckbox
                  useHeatmap={useHeatmap}
                  setUseHeatmap={setUseHeatmap}
                />
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 hover:bg-green-900 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                onClick={saveJobPreset}
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Container */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-10 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No Jobs Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Click the "New Job" button to create your first video analysis
              job.
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors duration-200"
              onClick={() => setShowDialog(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Create New Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {jobs.map((job) => (
              <JobProcessing key={job.id} job={job} setJobs={setJobs} />
            ))}
          </div>
        )}
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
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === job.id ? { ...j, showHeatmap: !j.showHeatmap } : j
      )
    );
  };

  // When heatmap data becomes available, show a notification
  useEffect(() => {
    if (
      hasHeatmapData &&
      heatmapFrames &&
      heatmapFrames.length > 0 &&
      !job.heatmapNotified
    ) {
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === job.id ? { ...j, heatmapNotified: true } : j
        )
      );

      // Show notification that heatmap is available
      const notification = document.createElement("div");
      notification.className =
        "fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg";
      notification.textContent =
        'Heatmap analysis is now available! Click "Show Heatmap View" to see it.';
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
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === job.id ? { ...j, heatmapFrames: heatmapFrames } : j
        )
      );
    }
  }, [heatmapFrames, job.id, setJobs]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Job Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="font-semibold text-lg">
            {job.selectedFile ? job.selectedFile.name : "Video Processing Job"}
          </h3>
        </div>
        <div className="flex space-x-2">
          <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">
            Model: {job.selectedModel.replace(".pt", "")}
          </span>
          <span className="bg-purple-500 text-xs px-2 py-1 rounded-full">
            Interval: {job.frameInterval}
          </span>
          {job.useHeatmap && (
            <span className="bg-green-600 text-xs px-2 py-1 rounded-full">
              Heatmap Enabled
            </span>
          )}
          <button
            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors duration-200"
            onClick={handleRemoveJob}
            title="Remove Job"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Processing Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
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

          {/* Task ID display */}
          {taskID && (
            <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm text-gray-700 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-mono">Task ID: {taskID}</span>
            </div>
          )}

          {/* Status indicator */}
          {isProcessing && (
            <div className="bg-yellow-100 px-3 py-1 rounded-lg text-sm text-yellow-700 flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </div>
          )}
        </div>

        {/* Heatmap Control Buttons */}
        {(hasHeatmapData || processingWithHeatmap) && (
          <div className="flex flex-wrap gap-3 mt-6">
            {/* Toggle button for heatmap view - only show if we have frames */}
            {heatmapFrames && heatmapFrames.length > 0 && (
              <button
                className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center ${
                  job.showHeatmap
                    ? "bg-blue-100 text-blue-700"
                    : "bg-blue-600 text-white"
                }`}
                onClick={toggleHeatmapView}
              >
                {job.showHeatmap ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Show Detection View
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Show Heatmap View
                  </>
                )}
              </button>
            )}

            {/* Toggle button for heatmap analysis */}
            <button
              className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center ${
                showAnalysis
                  ? "bg-green-100 text-green-700"
                  : "bg-green-600 text-white"
              }`}
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Hide Heatmap Analysis
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Show Heatmap Analysis
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Class Color Customization */}
      {detections && detections.length > 0 && (
        <div className="p-6 border-b border-gray-200">
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
        </div>
      )}

      {/* Heatmap Analysis */}
      {(hasHeatmapData || processingWithHeatmap) && showAnalysis && (
        <div className="p-6 border-b border-gray-200">
          <HeatmapAnalysis
            heatmapData={heatmapAnalysis || {}}
            taskID={taskID}
          />
        </div>
      )}

      {/* Video Display */}
      <div className="p-6">
        {/* Display heatmap video when in heatmap view mode */}
        {(hasHeatmapData || processingWithHeatmap) &&
          taskID &&
          job.showHeatmap && (
            <HeatmapVideo
              taskID={taskID}
              containerWidth={job.containerWidth}
              visible={true}
            />
          )}

        {/* Show VideoCanvas when in detection view mode */}
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
    </div>
  );
};

export default VideoDisplay;
