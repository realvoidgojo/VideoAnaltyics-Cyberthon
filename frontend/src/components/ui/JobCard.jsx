import React, { useState, useRef, useEffect } from "react";
import {
  Loader2,
  IdCard,
  CheckCircle,
  RefreshCw,
  EyeIcon,
  BarChart3Icon,
  Activity,
  VideoIcon,
  ArrowDownIcon,
  DownloadIcon,
} from "lucide-react";
import VideoCanvas from "../video/VideoCanvas";
import HeatmapVideo from "../heatmap/HeatmapVideo";
import HeatmapAnalysis from "../heatmap/HeatmapAnalysis";
import ClassColorCustomization from "./ClassColorCustomization";
import DetectionStatistics from "../charts/DetectionStatistics";
import ProcessingControls from "./ProcessingControls";
import useVideoProcessing from "../hooks/useVideoProcessing";
import useDetections from "../hooks/UseDetections";
import { getDistinctColor } from "../utils/colorUtils";
import JobHeader from "./JobHeader";
import ProgressBar from "./ProgressBar";
import axios from "axios";

const JobCard = ({ job, setJobs }) => {
  // Keep all existing state except showAnalysis
  const {
    isProcessing,
    isVideoPaused,
    handleStartProcessing,
    handleReset,
    handleStopResume,
    taskID,
    useHeatmap: processingWithHeatmap,
  } = useVideoProcessing();

  // Remove the showAnalysis state - we're always showing analysis in Heatmap View now
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null);
  const processingStartTime = useRef(null);
  const [refreshCanvas, setRefreshCanvas] = useState(0); // State to trigger canvas refresh
  const videoCanvasRef = useRef(null);

  // Get detections and related data from useDetections hook
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

  // Timer effect
  useEffect(() => {
    if (isProcessing && !processingStartTime.current) {
      processingStartTime.current = new Date();
    } else if (!isProcessing) {
      processingStartTime.current = null;
      setEstimatedTimeLeft(null);
    }
  }, [isProcessing]);

  // Poll task status
  useEffect(() => {
    if (!taskID || !isProcessing) return;

    let intervalId;
    const pollInterval = 1000; // Poll every second for smoother updates

    const pollTaskStatus = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/task_status/${taskID}`
        );
        const { state, status } = response.data;

        // Extract progress percentage and status message
        if (status) {
          if (status.percent !== undefined) {
            // Ensure the progress value is a number and update state
            const progressValue = parseFloat(status.percent);
            if (!isNaN(progressValue)) {
              setProgress(progressValue); // Update progress state
            }
          }

          if (status.status) {
            setProcessingStage(status.status);
          }
        }

        // Calculate estimated time remaining
        if (processingStartTime.current && status && status.percent > 0) {
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
              setEstimatedTimeLeft(`Approx. ${mins} min ${secs} sec remaining`);
            }
          }
        }

        // Handle task completion states
        if (state === "SUCCESS" || state === "FAILURE" || state === "REVOKED") {
          clearInterval(intervalId);

          if (state === "SUCCESS") {
            setProgress(100);
            setProcessingStage("Processing complete");
          } else if (state === "REVOKED") {
            setProcessingStage("Task cancelled");
          } else {
            setProcessingStage("Processing failed");
          }
        }
      } catch (error) {
        console.error("Error fetching task status:", error);
      }
    };

    // Initial poll
    pollTaskStatus();

    // Set up polling at fixed interval
    intervalId = setInterval(pollTaskStatus, pollInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [taskID, isProcessing]);

  // Class colors effect
  useEffect(() => {
    if (detections && detections.length > 0) {
      updateClassColors(detections, job, setJobs);
    }
  }, [detections, job, setJobs]);

  const handleRemoveJob = () => {
    if (taskID) {
      handleReset();
    }
    setJobs((prevJobs) => prevJobs.filter((j) => j.id !== job.id));
  };

  const toggleHeatmapView = () => {
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

  // Notification effect for heatmap data
  useEffect(() => {
    showHeatmapNotification(hasHeatmapData, heatmapFrames, job, setJobs);
  }, [hasHeatmapData, heatmapFrames, job, setJobs]);

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

  // Function to refresh the canvas when colors change
  const handleRefreshCanvas = () => {
    setRefreshCanvas((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Job Header */}
      <JobHeader job={job} onRemove={handleRemoveJob} />

      {/* Processing Controls & Progress */}
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
            <StatusIndicator processingStage={processingStage} />
          )}
        </div>

        {/* Progress Bar Component */}
        {isProcessing && (
          <ProgressBar
            progress={progress}
            processingStage={processingStage}
            estimatedTimeLeft={estimatedTimeLeft}
            useHeatmap={job.useHeatmap}
          />
        )}

        {/* View Mode Selector */}
        {(hasHeatmapData || processingWithHeatmap) &&
          heatmapFrames &&
          heatmapFrames.length > 0 && (
            <ViewModeSelector
              jobShowHeatmap={job.showHeatmap}
              toggleHeatmapView={toggleHeatmapView}
            />
          )}
      </div>

      {/* Conditional rendering based on view mode */}
      {job.showHeatmap ? (
        <HeatmapViewSection
          taskID={taskID}
          job={job}
          hasHeatmapData={hasHeatmapData}
          processingWithHeatmap={processingWithHeatmap}
          heatmapAnalysis={heatmapAnalysis}
        />
      ) : (
        <ObjectDetectionViewSection
          job={job}
          detections={detections}
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          preprocessedWidth={preprocessedWidth}
          preprocessedHeight={preprocessedHeight}
          classColors={job.classColors}
          onColorChange={(className, color) => {
            job.classColors[className] = {
              hue: job.classColors[className]?.hue || 0,
              hex: color,
            };
          }}
          refreshCanvas={refreshCanvas}
          onRefreshCanvas={handleRefreshCanvas}
          taskID={taskID}
        />
      )}
    </div>
  );
};

// Helper functions and sub-components
const updateClassColors = (detections, job, setJobs) => {
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
};

const showHeatmapNotification = (
  hasHeatmapData,
  heatmapFrames,
  job,
  setJobs
) => {
  if (hasHeatmapData && heatmapFrames?.length > 0 && !job.heatmapNotified) {
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === job.id ? { ...j, heatmapNotified: true } : j
      )
    );

    const notification = document.createElement("div");
    notification.className =
      "fixed bottom-4 right-4 text-green-600 border-green-500 bg-green-100 p-4 rounded-lg shadow-lg";
    notification.textContent =
      'Heatmap analysis is now available! Click "Show Heatmap View" to see it.';
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 5000);
  }
};

const StatusIndicator = ({ processingStage }) => (
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
);

// View mode selector with toggle switch
const ViewModeSelector = ({ jobShowHeatmap, toggleHeatmapView }) => (
  <div className="mt-6 border border-gray-200 rounded-lg bg-gray-50 p-5 shadow-sm">
    <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
      <EyeIcon className="mr-2 h-5 w-5 text-blue-600" />
      View Mode
    </h3>

    <div className="flex items-center justify-center max-w-md mx-auto">
      <div
        className={`flex-1 flex items-center justify-center px-2 py-3 rounded-l-lg transition-all ${
          !jobShowHeatmap
            ? "bg-blue-100 text-blue-700 font-medium border-2 border-blue-300"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        <VideoIcon className="h-5 w-5 mr-2" />
        <span>Object Detection</span>
      </div>

      <label className="relative inline-flex items-center cursor-pointer mx-4">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={jobShowHeatmap}
          onChange={toggleHeatmapView}
        />
        <div
          className="w-12 h-6 bg-gray-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                        after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 
                        after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                        peer-checked:bg-blue-600"
        ></div>
      </label>

      <div
        className={`flex-1 flex items-center justify-center px-4 py-3 rounded-r-lg transition-all ${
          jobShowHeatmap
            ? "bg-blue-100 text-blue-700 font-medium border-2 border-blue-300"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        <Activity className="h-5 w-5 mr-2" />
        <span>Heatmap View</span>
      </div>
    </div>
  </div>
);

// Object Detection view content
const ObjectDetectionViewSection = ({
  job,
  detections,
  originalWidth,
  originalHeight,
  preprocessedWidth,
  preprocessedHeight,
  classColors,
  onColorChange,
  refreshCanvas,
  onRefreshCanvas,
  taskID,
}) => (
  <div className="border-t border-gray-200 bg-gray-50">
    {/* Class Colors Section */}
    {detections && detections.length > 0 && (
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-md mr-3">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-800">
              Customize Class Colors
            </h2>
          </div>
          <button
            onClick={onRefreshCanvas}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Canvas
          </button>
        </div>

        <ClassColorCustomization
          detections={detections}
          classColors={classColors}
          onClassColorChange={onColorChange}
        />
      </div>
    )}

    {/* Video Canvas Section */}
    <div className="p-6 border-b border-gray-200 bg-white">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-2 rounded-md mr-3">
          <VideoIcon className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-800">
          Video with Detections
        </h2>
      </div>

      <VideoCanvas
        key={`video-canvas-${refreshCanvas}`}
        videoSource={job.videoSource}
        detections={detections}
        originalWidth={originalWidth}
        originalHeight={originalHeight}
        preprocessedWidth={preprocessedWidth}
        preprocessedHeight={preprocessedHeight}
        containerWidth={job.containerWidth}
        classColors={classColors}
      />
    </div>

    {/* Detection Statistics Section */}
    {taskID && detections && detections.length > 0 && (
      <div className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-md mr-3">
            <BarChart3Icon className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-800">
            Detection Statistics
          </h2>
        </div>

        <DetectionStatistics detections={detections} />
      </div>
    )}
  </div>
);

// Heatmap view content
const HeatmapViewSection = ({
  taskID,
  job,
  hasHeatmapData,
  processingWithHeatmap,
  heatmapAnalysis,
}) => (
  <div className="border-t border-gray-200 bg-gray-50">
    {/* Heatmap Analysis Section */}
    <div className="p-6 border-b border-gray-200 bg-white">
      <div className="flex items-center mb-4">
        <div className="bg-green-100 p-2 rounded-md mr-3">
          <Activity className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-800">Heatmap Analysis</h2>
      </div>

      <HeatmapAnalysis heatmapData={heatmapAnalysis || {}} taskID={taskID} />
    </div>

    {/* Heatmap Video Section */}
    <div className="p-6 border-b border-gray-200 bg-white">
      <div className="flex items-center mb-4">
        <div className="bg-green-100 p-2 rounded-md mr-3">
          <VideoIcon className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-800">Heatmap Video</h2>
      </div>

      {(hasHeatmapData || processingWithHeatmap) && taskID && (
        <HeatmapVideo
          taskID={taskID}
          containerWidth={job.containerWidth}
          visible={true}
        />
      )}
    </div>

    {/* Download Section */}
    {taskID && (
      <div className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-2 rounded-md mr-3">
            <ArrowDownIcon className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-800">Download</h2>
        </div>

        <a
          href={`http://localhost:5000/download_heatmap_video/${taskID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Download Heatmap Video
        </a>
      </div>
    )}
  </div>
);

export default JobCard;
