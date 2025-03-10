// ClassColorCustomization.jsx
import React from "react";

const ClassColorCustomization = ({
  detections,
  classColors,
  onClassColorChange,
}) => {
  return (
    <div className="border border-gray-300 p-4 rounded-lg mt-8">
      <h6 className="text-2xl mb-4 mt-4">Customize Class Colors</h6>
      <div className="grid grid-cols-2 gap-4">
        {Array.from(
          new Set(detections.flat().map((det) => det.class_name))
        ).map((className) => (
          <div key={className} className="flex items-center">
            <label htmlFor={`${className}-color`} className="flex-1 text-lg">
              {className}:
            </label>
            <input
              type="color"
              id={`${className}-color`}
              value={classColors[className]?.hex || "#ff0000"} // Default to red
              onChange={(e) => onClassColorChange(className, e.target.value)}
              className="ml-4 flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassColorCustomization;
