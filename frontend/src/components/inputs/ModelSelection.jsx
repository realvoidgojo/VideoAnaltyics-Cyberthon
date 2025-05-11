// ModelSelection.jsx
import React from "react";
import PropTypes from "prop-types";
import Select from "../ui/Select";

const ModelSelection = ({ selectedModel, onModelChange }) => {
  const modelOptions = [
    { value: "yolov11n.pt", label: "YOLOv11n (Fastest)" },
    { value: "yolov11s.pt", label: "YOLOv11s (Small)" },
    { value: "yolov11m.pt", label: "YOLOv11m (Medium)" },
    { value: "yolov11l.pt", label: "YOLOv11l (Large)" },
    { value: "yolov11x.pt", label: "YOLOv11x (Extra Large)" },
  ];

  return (
    <Select
      value={selectedModel}
      onChange={onModelChange}
      options={modelOptions}
      label="Model"
      helperText="Select model size based on performance needs"
    />
  );
};

ModelSelection.propTypes = {
  selectedModel: PropTypes.string.isRequired,
  onModelChange: PropTypes.func.isRequired,
};

export default ModelSelection;
