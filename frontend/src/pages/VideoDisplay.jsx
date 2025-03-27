import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
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
import DetectionStatistics from "../components/DetectionStatistics";
import { getDistinctColor } from "../components/utils/colorUtils";

import {
  Plus,
  Trash2,
  X,
  Film,
  ChevronDown,
  ChevronUp,
  Loader2,
  IdCard,
  Video,
  CheckCircle, // Add this import for the check icon
} from "lucide-react";

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
    <div className="relative bg-gray-500 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-500 p-5 shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto  flex justify-between items-center">
          <h1 className="text-2xl px-4 font-bold text-white ">
            CCTV Analytics Dashboard
          </h1>
          <div className="flex space-x-3">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
              onClick={() => setShowDialog(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              New Job
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
              onClick={handleResetAll}
            >
              <Trash2 className="h-5 w-5 mr-2" />
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
                <X className="h-6 w-6" />
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
            <Film className="h-16 w-16 text-gray-400 mb-4" />
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
              <Plus className="h-5 w-5 mr-2" />
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
  const [progress, setProgress] = useState(0); // State for progress percentage
  const [processingStage, setProcessingStage] = useState(""); // Track current processing stage
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null); // For estimated time remaining
  const processingStartTime = useRef(null); // To track processing start time

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
    objectFrequency, // Make sure this is included in the destructuring
  } = useDetections(taskID);

  // Start timer when processing begins
  useEffect(() => {
    if (isProcessing && !processingStartTime.current) {
      processingStartTime.current = new Date();
    } else if (!isProcessing) {
      processingStartTime.current = null;
      setEstimatedTimeLeft(null);
    }
  }, [isProcessing]);

  // Poll task status to update progress bar
  useEffect(() => {
    if (!taskID || !isProcessing) return;

    let intervalId;
    let pollCount = 0;
    let pollInterval = 2000; // Start with 2 seconds
    const maxPolls = 300; // Maximum number of polls (10 minutes at 2-second intervals)

    const pollTaskStatus = async () => {
      try {
        pollCount++;

        // If we've reached the maximum number of polls, stop polling
        if (pollCount > maxPolls) {
          console.log(
            `Reached maximum number of polls (${maxPolls}). Stopping.`
          );
          clearInterval(intervalId);
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/task_status/${taskID}`
        );
        const { state, status } = response.data;

        // Extract progress percentage and status message
        if (status) {
          if (status.percent !== undefined) {
            setProgress(status.percent);
          }

          if (status.status) {
            setProcessingStage(status.status);
          }

          // Calculate estimated time remaining
          if (processingStartTime.current && status.percent > 0) {
            const elapsedMs = new Date() - processingStartTime.current;
            const totalEstimatedMs = (elapsedMs * 100) / status.percent;
            const remainingMs = totalEstimatedMs - elapsedMs;

            if (remainingMs > 0) {
              const remainingSec = Math.floor(remainingMs / 1000);
              if (remainingSec < 60) {
                setEstimatedTimeLeft(`Less than a minute remaining`);
              } else {
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;
                setEstimatedTimeLeft(
                  `Approx. ${mins} min ${secs} sec remaining`
                );
              }
            }
          }
        }

        // Handle task completion states
        if (state === "REVOKED") {
          clearInterval(intervalId);
          setEstimatedTimeLeft(null);
          setProcessingStage("Task cancelled by user");
          // Keep isProcessing true until user acknowledges
          setTimeout(() => {
            setIsProcessing(false);
          }, 2000); // Show the cancelled message for 2 seconds
        } else if (state === "SUCCESS" || state === "FAILURE") {
          clearInterval(intervalId);
          setEstimatedTimeLeft(null);

          if (state === "SUCCESS") {
            setProgress(100);
            setProcessingStage("Processing complete");
          } else {
            setProcessingStage("Processing failed");
          }
        }
      } catch (error) {
        console.error("Error fetching task status:", error);
        // Increase polling interval on error (exponential backoff)
        pollInterval = Math.min(pollInterval * 1.5, 10000); // Max 10 seconds

        // If we've had too many errors, stop polling
        if (pollCount > 10) {
          clearInterval(intervalId);
        }
      }
    };

    // Initial poll
    pollTaskStatus();

    // Set up interval with dynamic polling rate
    intervalId = setInterval(pollTaskStatus, pollInterval);

    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (intervalId) {
        console.log("Cleaning up task status polling interval");
        clearInterval(intervalId);
      }
    };
  }, [taskID, isProcessing]);

  // Other existing useEffect hooks and functions...

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
    // Log the current state before toggling
    console.log(
      `Toggling heatmap view. Current state: ${
        job.showHeatmap ? "Showing heatmap" : "Showing detections"
      }`
    );
    console.log(`Heatmap video URL: ${heatmapVideoUrl}`);

    setJobs((prevJobs) =>
      prevJobs.map((j) => {
        if (j.id === job.id) {
          const newState = !j.showHeatmap;
          console.log(`Setting job ${j.id} showHeatmap to ${newState}`);
          return { ...j, showHeatmap: newState };
        }
        return j;
      })
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
        "fixed bottom-4 right-4 text-green-600 border-green-500 bg-green-100 p-4 rounded-lg shadow-lg";
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
          <Video className="h-5 w-5 mr-2" />
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
            <X className="h-5 w-5" />
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
              <IdCard className="h-4 w-4 mr-1" />
              <span className="font-mono">Task ID: {taskID}</span>
            </div>
          )}

          {/* Status indicator */}
          {isProcessing && (
            <div
              className={`px-3 py-1 rounded-lg text-sm flex items-center ${
                processingStage === "Processing complete"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {processingStage === "Processing complete" ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <Loader2 className="animate-spin h-4 w-4 mr-1" />
              )}
              {processingStage || "Processing..."}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-4">
            <div
              className="w-full bg-gray-200 rounded-full"
              style={{ height: "20px", overflow: "hidden" }}
            >
              <div
                className="bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ width: `${progress}%`, height: "20px" }}
              >
                <span className="text-xs text-white font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <div>
                {job.useHeatmap
                  ? processingStage.includes("heatmap")
                    ? "Phase 1: Heatmap Analysis"
                    : processingStage.includes("Processing frame")
                    ? "Phase 2: Object Detection"
                    : processingStage
                  : "Object Detection"}
              </div>
              {estimatedTimeLeft && (
                <div className="font-medium">{estimatedTimeLeft}</div>
              )}
            </div>
          </div>
        )}

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
                    <ChevronDown className="h-5 w-5 mr-2" />
                    Show Detection View
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-5 w-5 mr-2" />
                    Show Heatmap View
                  </>
                )}
              </button>
            )}

            {/* Toggle button for heatmap analysis */}
            <button
              className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center ${
                showAnalysis
                  ? "bg-green-100 text-green-600"
                  : "bg-green-600 text-white"
              }`}
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? (
                <>
                  <ChevronDown className="h-5 w-5 mr-2" />
                  Hide Heatmap Analysis
                </>
              ) : (
                <>
                  <ChevronUp className="h-5 w-5 mr-2" />
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

        {/* Remove the standalone Object Frequency Chart and only keep the DetectionStatistics component */}
        {taskID && detections.length > 0 && (
          <DetectionStatistics detections={detections} />
        )}
      </div>
    </div>
  );
};

export default VideoDisplay;
