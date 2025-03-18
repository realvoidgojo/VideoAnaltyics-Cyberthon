// ProcessingControls.jsx
import React from "react";

const ProcessingControls = ({
  onStartProcessing,
  isProcessing,
  onReset,
  onStopResume,
  isVideoPaused,
  hasVideoUploaded,
}) => {
  return (
    <div>
      {hasVideoUploaded && (
        <button
          onClick={onStartProcessing}
          disabled={isProcessing}
          className={`px-4 py-2 text-sm cursor-pointer rounded-lg ${
            isProcessing ? "bg-gray-400" : "bg-green-600"
          } text-white`}
        >
          {isProcessing ? "Processing..." : "Start Processing"}
        </button>
      )}

      {/* Reset and Stop buttons */}
      <button
        onClick={onReset}
        className="px-4 py-2 text-sm cursor-pointer rounded-lg bg-red-500 text-white"
      >
        Reset
      </button>
    </div>
  );
};

export default ProcessingControls;
