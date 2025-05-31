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
  const getStageLabel = () => {
    if (!processingStage) return "Processing...";

    if (useHeatmap) {
      if (processingStage?.toLowerCase().includes("heatmap")) {
        return "Phase 1: Heatmap Analysis";
      } else if (processingStage?.toLowerCase().includes("processing frame")) {
        return "Phase 2: Object Detection";
      }
    }

    return processingStage;
  };

  // Get phase number for visual indicator
  const getCurrentPhase = () => {
    if (!useHeatmap) return null;

    if (processingStage?.toLowerCase().includes("heatmap")) return 1;
    if (processingStage?.toLowerCase().includes("processing frame")) return 2;

    return null;
  };

  const currentPhase = getCurrentPhase();

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
        <div className="flex mt-2 space-x-2">
          <div className="flex-1 bg-gray-100 rounded-md p-1 flex items-center">
            <div
              className={`h-1.5 w-1.5 rounded-full mr-2 ${
                currentPhase === 1
                  ? "bg-blue-500 animate-pulse"
                  : currentPhase > 1 || isCompleted
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-gray-600">
              Phase 1: Heatmap Analysis
            </span>
          </div>
          <div className="flex-1 bg-gray-100 rounded-md p-1 flex items-center">
            <div
              className={`h-1.5 w-1.5 rounded-full mr-2 ${
                currentPhase === 2
                  ? "bg-blue-500 animate-pulse"
                  : isCompleted
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-gray-600">
              Phase 2: Object Detection
            </span>
          </div>
        </div>
      )}

      {/* Information area with improved time remaining display */}
      <div className="flex justify-between mt-2 text-sm text-gray-600">
        <div className="flex items-center">
          {isCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          ) : (
            <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
          )}
          <span>{getStageLabel()}</span>
        </div>

        {timeLeftFormatted && !isCompleted && (
          <div className="font-medium text-blue-600">{timeLeftFormatted}</div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
