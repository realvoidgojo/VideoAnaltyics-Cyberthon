// HeatmapCheckbox.jsx
import React from "react";

const HeatmapCheckbox = ({ useHeatmap, setUseHeatmap }) => {
  return (
    <div className="mb-4 p-4 border   border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useHeatmap}
            onChange={(e) => setUseHeatmap(e.target.checked)}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Enable Heatmap Analysis
          </span>
        </label>
      </div>

      <p className="text-xs text-gray-600 mt-2">
        This static video feed includes a heatmap highlighting movement
        intensity over time
      </p>
    </div>
  );
};

export default HeatmapCheckbox;
