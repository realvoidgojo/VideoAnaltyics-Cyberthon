import React from "react";
import { useNavigate } from "react-router-dom";

const ProcessingControls = ({
  onStartProcessing,
  isProcessing,
  onReset,
  onStopResume,
  isVideoPaused,
  hasVideoUploaded,
}) => {
  const navigate = useNavigate();

  const handleStartProcessing = () => {
    if (!isProcessing) {
      onStartProcessing(); // Call the original function
      navigate("/result"); // Navigate to the /result page
    }
  };

  return (
    <div>
      {hasVideoUploaded && (
        <button
          onClick={handleStartProcessing}
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
      <button
        onClick={onStopResume}
        className={`px-4 py-2 text-sm cursor-pointer rounded-lg ml-4 ${
          isVideoPaused ? "bg-green-500" : "bg-red-500"
        } text-white`}
      >
        {isVideoPaused ? "Resume" : "Stop"}
      </button>
    </div>
  );
};

export default ProcessingControls;
