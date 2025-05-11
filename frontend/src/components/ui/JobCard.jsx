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
  Smartphone,
  Tablet,
  Monitor,
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
import { useJobContext } from "../../context/JobContext";

const JobCard = ({ job }) => {
  const { updateJob, removeJob, toggleHeatmapView } = useJobContext();
  const {
    isProcessing,
    isVideoPaused,
    handleStartProcessing,
    handleReset,
    handleStopResume,
    taskID,
    useHeatmap: processingWithHeatmap,
  } = useVideoProcessing();

  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null);
  const processingStartTime = useRef(null);
  const [refreshCanvas, setRefreshCanvas] = useState(0);
  const videoCanvasRef = useRef(null);

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
    if (isProcessing && !processingStartTime.current) {
      processingStartTime.current = new Date();
    } else if (!isProcessing) {
      processingStartTime.current = null;
      setEstimatedTimeLeft(null);
    }
  }, [isProcessing]);

  useEffect(() => {
    if (!taskID || !isProcessing) return;

    let intervalId;
    const pollInterval = 1000;

    const pollTaskStatus = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/task_status/${taskID}`
        );
        const { state, status } = response.data;

        if (status) {
          if (status.percent !== undefined) {
            const progressValue = parseFloat(status.percent);
            if (!isNaN(progressValue)) {
              setProgress(progressValue);
            }
          }

          if (status.status) {
            setProcessingStage(status.status);
          }
        }

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

    pollTaskStatus();

    intervalId = setInterval(pollTaskStatus, pollInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [taskID, isProcessing]);

  useEffect(() => {
    if (detections && detections.length > 0) {
      const uniqueClasses = new Set();
      detections.flat().forEach((detection) => {
        if (detection.class_name) {
          uniqueClasses.add(detection.class_name);
        }
      });

      let needsUpdate = false;
      const updatedClassColors = { ...job.classColors };

      Array.from(uniqueClasses).forEach((className) => {
        if (!updatedClassColors[className]) {
          const existingHues = Object.values(updatedClassColors).map(
            (c) => c.hue
          );
          const newColor = getDistinctColor(existingHues);
          updatedClassColors[className] = newColor;
          needsUpdate = true;
        }
        if (updatedClassColors[className].hex.startsWith("hsl")) {
          const hue = updatedClassColors[className].hue;
          updatedClassColors[className].hex = hslToHex(hue, 70, 50);
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        updateJob(job.id, { classColors: updatedClassColors });
      }
    }
  }, [detections, job.id]);

  const handleRemoveJob = () => {
    if (taskID) {
      handleReset();
    }
    removeJob(job.id);
  };

  const handleToggleHeatmapView = () => {
    console.log(
      `Toggling heatmap view. Current state: ${
        job.showHeatmap ? "Showing heatmap" : "Showing detections"
      }`
    );

    toggleHeatmapView(job.id);
  };

  useEffect(() => {
    if (
      hasHeatmapData &&
      heatmapFrames &&
      heatmapFrames.length > 0 &&
      !job.heatmapNotified
    ) {
      updateJob(job.id, {
        heatmapFrames,
        heatmapNotified: true,
      });
    }
  }, [hasHeatmapData, heatmapFrames, job.id, job.heatmapNotified, updateJob]);

  const [viewportSize, setViewportSize] = useState("desktop");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setViewportSize("mobile");
      } else if (width < 1024) {
        setViewportSize("tablet");
      } else {
        setViewportSize("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRefreshCanvas = () => {
    setRefreshCanvas((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
      <JobHeader job={job} onRemove={handleRemoveJob} />

      {/* Processing Controls & Progress - make more compact */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-3">
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

          {taskID && (
            <div className="bg-gray-100 px-2 py-1 rounded-lg text-xs text-gray-700 flex items-center">
              <IdCard className="h-3 w-3 mr-1" />
              <span className="font-mono text-xs">
                Task: {taskID.substring(0, 8)}...
              </span>
            </div>
          )}

          {isProcessing && (
            <StatusIndicator processingStage={processingStage} />
          )}
        </div>

        {isProcessing && (
          <ProgressBar
            progress={progress}
            processingStage={processingStage}
            estimatedTimeLeft={estimatedTimeLeft}
            useHeatmap={job.useHeatmap}
          />
        )}

        {(hasHeatmapData || processingWithHeatmap) &&
          heatmapFrames &&
          heatmapFrames.length > 0 && (
            <ViewModeSelector
              jobShowHeatmap={job.showHeatmap}
              toggleHeatmapView={handleToggleHeatmapView}
            />
          )}
      </div>

      {/* Conditional rendering based on view mode - more compact layout */}
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

const ViewModeSelector = React.memo(({ jobShowHeatmap, toggleHeatmapView }) => (
  <div className="mt-6 border border-gray-200 rounded-lg bg-gray-50 p-5 shadow-sm">
    <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center">
      <EyeIcon className="mr-2 h-5 w-5 text-blue-600" />
      View Mode
    </h3>

    <div className="flex items-center justify-center max-w-md mx-auto">
      <div
        className={`flex-1 flex items-center justify-center px-4 py-3 rounded-l-lg transition-all ${
          !jobShowHeatmap
            ? "bg-blue-100 text-blue-700 font-medium border-2 border-blue-300"
            : "bg-gray-100 text-gray-600"
        }`}
        onClick={() => jobShowHeatmap && toggleHeatmapView()}
        role="button"
        tabIndex={0}
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
        <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>

      <div
        className={`flex-1 flex items-center justify-center px-4 py-3 rounded-r-lg transition-all ${
          jobShowHeatmap
            ? "bg-blue-100 text-blue-700 font-medium border-2 border-blue-300"
            : "bg-gray-100 text-gray-600"
        }`}
        onClick={() => !jobShowHeatmap && toggleHeatmapView()}
        role="button"
        tabIndex={0}
      >
        <Activity className="h-5 w-5 mr-2" />
        <span>Heatmap View</span>
      </div>
    </div>
  </div>
));

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

const HeatmapViewSection = ({
  taskID,
  job,
  hasHeatmapData,
  processingWithHeatmap,
  heatmapAnalysis,
}) => (
  <div className="border-t border-gray-200 bg-gray-50">
    <div className="p-6 border-b border-gray-200 bg-white">
      <div className="flex items-center mb-4">
        <div className="bg-green-100 p-2 rounded-md mr-3">
          <Activity className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-800">Heatmap Analysis</h2>
      </div>

      <HeatmapAnalysis heatmapData={heatmapAnalysis || {}} taskID={taskID} />
    </div>

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
