// HeatmapAnalysis.jsx
import React from "react";
import PropTypes from "prop-types";

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return "N/A";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const HeatmapAnalysis = ({ heatmapData, taskID }) => {
  if (!heatmapData || Object.keys(heatmapData).length === 0) {
    return (
      <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
        <h3 className="text-lg font-medium mb-2 text-gray-700">
          Heatmap Analysis
        </h3>
        <p className="text-gray-600">
          {taskID
            ? "Heatmap analysis is being processed. This may take a moment..."
            : "No heatmap analysis data available."}
        </p>
        {taskID && (
          <div className="mt-4">
            <a
              href={`http://localhost:5000/download_heatmap_video/${taskID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Try Download Heatmap Video
            </a>
          </div>
        )}
      </div>
    );
  }

  const {
    peak_movement_time,
    average_intensity,
    movement_duration,
    total_duration,
  } = heatmapData;

  return (
    <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Peak Movement Time</p>
          <p className="text-xl font-semibold">
            {formatTime(peak_movement_time)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Average Movement Intensity</p>
          <p className="text-xl font-semibold">
            {average_intensity ? average_intensity.toFixed(2) + "%" : "N/A"}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Movement Duration</p>
          <p className="text-xl font-semibold">
            {formatTime(movement_duration)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Duration</p>
          <p className="text-xl font-semibold">{formatTime(total_duration)}</p>
        </div>
      </div>
    </div>
  );
};

HeatmapAnalysis.propTypes = {
  heatmapData: PropTypes.object,
  taskID: PropTypes.string,
};

export default HeatmapAnalysis;
