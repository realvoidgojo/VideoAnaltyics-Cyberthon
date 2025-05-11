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
    <div className="p-4 rounded-lg">
      <Checkbox
        label="Enable Heatmap Analysis"
        checked={useHeatmap}
        onChange={handleChange}
        helperText="Generate a heatmap visualization highlighting movement intensity over time"
        labelClassName="font-medium"
      />
    </div>
  );
};

HeatmapCheckbox.propTypes = {
  useHeatmap: PropTypes.bool.isRequired,
  setUseHeatmap: PropTypes.func.isRequired,
};

export default HeatmapCheckbox;
