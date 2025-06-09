import React, { useState, useRef, useEffect } from "react";
import {
  IdCard,
  Activity,
  VideoIcon,
  ArrowDownIcon,
  BarChart3Icon,
  Info,
  Download,
} from "lucide-react";
import ServerRenderedVideo from "../video/ServerRenderedVideo";
import HeatmapVideo from "../heatmap/HeatmapVideo";
import HeatmapAnalysis from "../heatmap/HeatmapAnalysis";
import DetectionStatistics from "../charts/DetectionStatistics";
import useDetections from "../hooks/UseDetections";
import { useJobContext } from "../../context/JobContext";
import StatusIndicator from "./StatusIndicator";
import ProgressBar from "./ProgressBar";
import JobHeader from "./JobHeader";
import axios from "axios";

const JobCard = ({ job }) => {
  const { updateJob, removeJob, toggleHeatmapView } = useJobContext();

  // State for tracking processing status
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const processingStartTime = useRef(null);

  // Get detection data from the server
  const {
    objectFrequency,
    useHeatmap: hasHeatmapData,
    heatmapAnalysis,
  } = useDetections(job.serverTaskId);

  // Initialize processing time tracking
  useEffect(() => {
    if (isProcessing && !processingStartTime.current) {
      processingStartTime.current = new Date();
    } else if (!isProcessing) {
      processingStartTime.current = null;
      setEstimatedTimeLeft(null);
    }
  }, [isProcessing]);

  // Poll for task status
  useEffect(() => {
    if (!job.serverTaskId) return;

    let intervalId;
    const pollInterval = 2000;
    let consecutiveErrorCount = 0;
    const maxErrorCount = 3;

    const pollTaskStatus = async () => {
      try {
        const response = await axios.get(`/task_status/${job.serverTaskId}`);
        const { state, status } = response.data;

        // Reset error count on successful requests
        consecutiveErrorCount = 0;

        // Update processing state based on task state
        if (["SUCCESS", "FAILURE", "REVOKED"].includes(state)) {
          setIsProcessing(false);
          // Clear interval when processing is complete
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        } else {
          setIsProcessing(true);
        }

        // Update progress and status information
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

        // Calculate estimated time remaining
        if (processingStartTime.current && status && status.percent > 0) {
          const elapsedMs = new Date() - processingStartTime.current;
          const totalEstimatedMs = (elapsedMs * 100) / status.percent;
          const remainingMs = totalEstimatedMs - elapsedMs;

          if (remainingMs > 0) {
            // Smooth the time estimate
            const seconds = Math.round(remainingMs / 1000);
            setEstimatedTimeLeft((prevTime) =>
              prevTime ? Math.round((prevTime + seconds) / 2) : seconds
            );
          }
        }
      } catch (error) {
        console.error("Error polling task status:", error);
        consecutiveErrorCount++;

        if (consecutiveErrorCount >= maxErrorCount && intervalId) {
          clearInterval(intervalId);
          setProcessingStage("Connection lost to server");
        }
      }
    };

    pollTaskStatus();
    intervalId = setInterval(pollTaskStatus, pollInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [job.serverTaskId]);

  const handleRemoveJob = () => {
    removeJob(job.id);
  };

  const handleToggleHeatmapView = () => {
    toggleHeatmapView(job.id);
  };

  // Check if heatmap mode should be available
  // FIXED: Only allow heatmap mode if user requested it in the form
  const heatmapModeAvailable = job.useHeatmap === true && hasHeatmapData;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200">
      <JobHeader job={job} onRemove={handleRemoveJob} />

      {isProcessing && (
        <div className="px-6 py-5 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <StatusIndicator status="processing" />
              <span className="ml-3 text-sm text-blue-700 font-medium">
                {processingStage || "Processing video"}
              </span>
            </div>
            {estimatedTimeLeft !== null && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {estimatedTimeLeft > 60
                  ? `${Math.floor(estimatedTimeLeft / 60)}m ${
                      estimatedTimeLeft % 60
                    }s`
                  : `${estimatedTimeLeft}s`} left
              </span>
            )}
          </div>
          <div className="mt-4">
            <ProgressBar
              progress={progress}
              processingStage={processingStage}
              estimatedTimeLeft={estimatedTimeLeft}
              useHeatmap={job.useHeatmap}
            />
          </div>
        </div>
      )}

      {/* View mode selector for heatmap-enabled jobs */}
      {heatmapModeAvailable ? (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                !job.showHeatmap
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => job.showHeatmap && handleToggleHeatmapView()}
            >
              <VideoIcon className="h-5 w-5 mr-2" />
              <span>Object Detection</span>
            </button>

            <button
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                job.showHeatmap
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => !job.showHeatmap && handleToggleHeatmapView()}
            >
              <Activity className="h-5 w-5 mr-2" />
              <span>Heatmap Analysis</span>
            </button>
          </div>
        </div>
      ) : (
        // When heatmap was not requested, show a simpler header
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center">
            <VideoIcon className="h-5 w-5 mr-2 text-blue-500" />
            <span className="font-medium text-blue-700">
              Object Detection Results
            </span>
          </div>
        </div>
      )}

      {/* Content sections */}
      {heatmapModeAvailable && job.showHeatmap ? (
        <HeatmapViewSection
          taskID={job.serverTaskId}
          job={job}
          hasHeatmapData={hasHeatmapData}
          heatmapAnalysis={heatmapAnalysis}
        />
      ) : (
        <ObjectDetectionViewSection taskID={job.serverTaskId} />
      )}
    </div>
  );
};

const ObjectDetectionViewSection = ({ taskID }) => (
  <div className="bg-white">
    {taskID && (
      <>
        {/* Video Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center mb-5">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <VideoIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Object Detection Video
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Processed video with bounding boxes and labels
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-200">
            <ServerRenderedVideo
              taskID={taskID}
              visible={true}
              key={`detection-${taskID}`}
            />
          </div>

          <div className="mt-4 bg-blue-50 px-4 py-3 rounded-lg text-sm text-blue-800 flex items-start">
            <Info className="h-4 w-4 mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>
              Objects are highlighted with bounding boxes in this view. Each detection includes confidence scores and class labels.
            </span>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center mb-5">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <BarChart3Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Detection Statistics
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Analysis of detected objects and their frequencies
              </p>
            </div>
          </div>

          <DetectionStatistics taskID={taskID} key={`stats-${taskID}`} />
        </div>

        {/* Download Section */}
        <div className="px-6 py-6">
          <div className="flex items-center mb-5">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Download Video
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Download the processed video with detections
              </p>
            </div>
          </div>

          <a
            href={`/download_processed_video/${taskID}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Object Detection Video
          </a>
        </div>
      </>
    )}
  </div>
);

const HeatmapViewSection = ({
  taskID,
  job,
  hasHeatmapData,
  heatmapAnalysis,
}) => (
  <div className="bg-white">
    {/* Heatmap Analysis Section */}
    <div className="px-6 py-6 border-b border-gray-200">
      <div className="flex items-center mb-5">
        <div className="bg-green-100 p-3 rounded-lg mr-4">
          <Activity className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Heatmap Analysis</h2>
          <p className="text-sm text-gray-600 mt-1">
            Movement patterns and activity insights
          </p>
        </div>
      </div>

      <HeatmapAnalysis heatmapData={heatmapAnalysis} taskID={taskID} />

      <div className="mt-4 bg-green-50 px-4 py-3 rounded-lg text-sm text-green-800 flex items-start">
        <Info className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
        <span>
          Heatmap analysis shows movement patterns and intensity over time. Warmer colors indicate higher activity levels.
        </span>
      </div>
    </div>

    {/* Heatmap Video Section */}
    <div className="px-6 py-6 border-b border-gray-200">
      <div className="flex items-center mb-5">
        <div className="bg-green-100 p-3 rounded-lg mr-4">
          <VideoIcon className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Heatmap Video</h2>
          <p className="text-sm text-gray-600 mt-1">
            Visual representation of movement intensity
          </p>
        </div>
      </div>

      {taskID && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <HeatmapVideo
            taskID={taskID}
            containerWidth={job.containerWidth}
            visible={true}
            key={`heatmap-${taskID}`}
          />
        </div>
      )}

      <div className="mt-4 bg-green-50 px-4 py-3 rounded-lg text-sm text-green-800 flex items-start">
        <Info className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
        <span>
          Heat intensity represents areas with more movement or activity. Red areas show highest activity levels.
        </span>
      </div>
    </div>

    {/* Download Options Section */}
    {taskID && (
      <div className="px-6 py-6">
        <div className="flex items-center mb-5">
          <div className="bg-green-100 p-3 rounded-lg mr-4">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Download Options
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Download heatmap and detection videos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`/download_heatmap_video/${taskID}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Heatmap Video
          </a>

          <a
            href={`/download_processed_video/${taskID}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Detection Video
          </a>
        </div>
      </div>
    )}
  </div>
);

export default JobCard;
