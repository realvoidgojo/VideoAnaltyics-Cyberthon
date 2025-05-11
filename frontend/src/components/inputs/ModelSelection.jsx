// ModelSelection.jsx
import React from "react";

const ModelSelection = ({ selectedModel, onModelChange }) => {
  return (
    <select
      value={selectedModel}
      onChange={onModelChange}
      className=" text-gray-900 border border-gray-300 p-2 m-4 rounded-lg"
    >
      <option value="yolov11n.pt" className="bg-gray-00">
        YOLOv11n
      </option>
      <option value="yolov11s.pt" className="bg-gray-600">
        YOLOv11s
      </option>
      <option value="yolov11m.pt" className="bg-gray-600">
        YOLOv11m
      </option>
      <option value="yolov11l.pt" className="bg-gray-600">
        YOLOv11l
      </option>
      <option value="yolov11x.pt" className="bg-gray-600">
        YOLOv11x
      </option>
    </select>
  );
};

export default ModelSelection;
