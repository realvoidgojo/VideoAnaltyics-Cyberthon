// ClassColorCustomization.jsx
import React from "react";

const ClassColorCustomization = ({
  detections,
  classColors,
  onClassColorChange,
}) => {
  return (
    <div className="border border-gray-200 p-5 rounded-lg bg-gray-50 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from(
          new Set(detections.flat().map((det) => det.class_name))
        ).map((className) => (
          <div
            key={className}
            className="flex items-center bg-white p-3 rounded-md border border-gray-100"
          >
            <label
              htmlFor={`${className}-color`}
              className="text-gray-900 flex-1 text-sm font-medium"
            >
              {className}:
            </label>
            <input
              type="color"
              id={`${className}-color`}
              value={classColors[className]?.hex || "#ff0000"}
              onChange={(e) => onClassColorChange(className, e.target.value)}
              className="ml-4 h-8 w-12 rounded cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassColorCustomization;
