// HeatmapCheckbox.jsx
import React from "react";
import PropTypes from "prop-types";
import Checkbox from "../ui/Checkbox";
import { Thermometer } from "lucide-react";

const HeatmapCheckbox = ({ useHeatmap, setUseHeatmap }) => {
  const handleChange = (e) => {
    setUseHeatmap(e.target.checked);
  };

  return (
    <div className="space-y-2">
      <Checkbox
        label="Enable Heatmap Analysis"
        checked={useHeatmap}
        onChange={handleChange}
        helperText="Generate a heatmap visualization highlighting movement intensity and activity patterns over time"
        labelClassName="font-medium text-gray-700"
      />
      
      {useHeatmap && (
        <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-200">
          <div className="flex items-start">
            <Thermometer className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Heatmap will be generated</p>
              <p className="text-xs text-green-700">
                This will create an additional visualization showing movement patterns and high-activity areas in your video.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

HeatmapCheckbox.propTypes = {
  useHeatmap: PropTypes.bool.isRequired,
  setUseHeatmap: PropTypes.func.isRequired,
};

export default HeatmapCheckbox;
