// ModelSelection.jsx
import React from "react";
import PropTypes from "prop-types";
import Select from "../ui/Select";

const ModelSelection = ({ value, onChange, options }) => {
  // Use the provided options if available, otherwise use the default options
  const modelOptions = options || [
    { value: "yolov11n.pt", label: "YOLOv11n (Fastest)" },
    { value: "yolov11s.pt", label: "YOLOv11s (Small)" },
    { value: "yolov11m.pt", label: "YOLOv11m (Medium)" },
    { value: "yolov11l.pt", label: "YOLOv11l (Large)" },
    { value: "yolov11x.pt", label: "YOLOv11x (Extra Large)" },
  ];

  return (
    <Select
      value={value}
      onChange={onChange}
      options={modelOptions}
      label="Model"
      helperText="Select model size based on performance needs"
      selectClassName="py-2" // Ensure enough height for the dropdown
    />
  );
};

ModelSelection.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

export default ModelSelection;
