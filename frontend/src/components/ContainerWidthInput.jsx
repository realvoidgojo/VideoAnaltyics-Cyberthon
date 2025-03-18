// ContainerWidthInput.jsx
import React from "react";

const ContainerWidthInput = ({ containerWidth, setContainerWidth }) => {
  return (
    <label className=" text-gray-900 ml-4 mr-4">
      <span className=" text-gray-900 text-sm ml-4 mr-4">Container Width:</span>
      <input
        type="number"
        value={containerWidth}
        onChange={(e) => setContainerWidth(parseInt(e.target.value, 10))}
        min="100" // Ensure container width is at least 100px
        className="text-gray-900 border border-gray-300 p-2 m-4 rounded-lg w-20"
      />
    </label>
  );
};

export default ContainerWidthInput;
