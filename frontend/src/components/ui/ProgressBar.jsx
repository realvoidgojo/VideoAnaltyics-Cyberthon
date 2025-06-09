import React from "react";
import { CheckCircle, Loader2 } from "lucide-react";

const ProgressBar = ({
  progress,
  processingStage,
  estimatedTimeLeft,
  useHeatmap,
}) => {
  // Ensure progress is a valid number between 0 and 100
  const safeProgress =
    !isNaN(progress) && progress >= 0
      ? Math.min(Math.max(progress, 0), 100)
      : 0;

  // Determine if the task is completed
  const isCompleted =
    safeProgress >= 100 ||
    processingStage?.toLowerCase() === "processing complete";

  // Format stage label based on current processing stage
  // Object Detection should always be Phase 1, Heatmap should be Phase 2
  const getStageLabel = () => {
    if (!processingStage) return "Processing...";

    if (useHeatmap) {
      // Object detection processing (Phase 1)
      if (processingStage?.toLowerCase().includes("processing frame") || 
          processingStage?.toLowerCase().includes("object detection") ||
          processingStage?.toLowerCase().includes("detecting")) {
        return "Phase 1: Object Detection";
      }
      // Heatmap processing (Phase 2)
      else if (processingStage?.toLowerCase().includes("heatmap") ||
               processingStage?.toLowerCase().includes("heat map")) {
        return "Phase 2: Heatmap Analysis";
      }
    }

    return processingStage;
  };

  // Get phase number for visual indicator
  // Object Detection = Phase 1, Heatmap = Phase 2
  const getCurrentPhase = () => {
    if (!useHeatmap) return null;

    // Object detection processing (Phase 1)
    if (processingStage?.toLowerCase().includes("processing frame") || 
        processingStage?.toLowerCase().includes("object detection") ||
        processingStage?.toLowerCase().includes("detecting")) {
      return 1;
    }
    // Heatmap processing (Phase 2)
    if (processingStage?.toLowerCase().includes("heatmap") ||
        processingStage?.toLowerCase().includes("heat map")) {
      return 2;
    }

    return null;
  };

  const currentPhase = getCurrentPhase();

  // Determine phase completion status
  const getPhaseStatus = (phase) => {
    if (!useHeatmap) return "inactive";
    
    if (isCompleted) return "completed";
    if (currentPhase === phase) return "active";
    if (currentPhase > phase) return "completed";
    return "inactive";
  };

  // Format estimated time left
  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return null;

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s remaining`;
    }
    return `${secs}s remaining`;
  };

  const timeLeftFormatted = formatTime(estimatedTimeLeft);

  return (
    <div className="mt-4">
      {/* Progress bar container */}
      <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
        {/* Progress bar fill with smoother animation */}
        <div
          className={`h-full flex items-center justify-center transition-all duration-700 ${
            isCompleted ? "bg-green-500" : "bg-blue-600"
          }`}
          style={{
            width: `${safeProgress}%`,
          }}
        >
          <span className="text-xs text-white font-medium shadow-sm">
            {Math.round(safeProgress)}%
          </span>
        </div>
      </div>

      {/* Phase indicator for heatmap processes */}
      {useHeatmap && (
        <div className="flex mt-3 space-x-2">
          {/* Phase 1: Object Detection */}
          <div className="flex-1 bg-gray-100 rounded-md p-2 flex items-center">
            <div
              className={`h-2 w-2 rounded-full mr-2 ${
                getPhaseStatus(1) === "active"
                  ? "bg-blue-500 animate-pulse"
                  : getPhaseStatus(1) === "completed"
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-gray-700 font-medium">
              Phase 1: Object Detection
            </span>
          </div>
          
          {/* Phase 2: Heatmap Analysis */}
          <div className="flex-1 bg-gray-100 rounded-md p-2 flex items-center">
            <div
              className={`h-2 w-2 rounded-full mr-2 ${
                getPhaseStatus(2) === "active"
                  ? "bg-blue-500 animate-pulse"
                  : getPhaseStatus(2) === "completed"
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-gray-700 font-medium">
              Phase 2: Heatmap Analysis
            </span>
          </div>
        </div>
      )}

      {/* Information area with improved time remaining display */}
      <div className="flex justify-between mt-3 text-sm text-gray-600">
        <div className="flex items-center">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          ) : (
            <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
          )}
          <span className="font-medium">{getStageLabel()}</span>
        </div>

        {timeLeftFormatted && !isCompleted && (
          <div className="font-medium text-blue-600">{timeLeftFormatted}</div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
