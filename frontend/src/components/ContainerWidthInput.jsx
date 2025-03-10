// ContainerWidthInput.jsx
import React from "react";

const ContainerWidthInput = ({ containerWidth, setContainerWidth }) => {
  return (
    <label className="ml-4 mr-4">
      <span className="text-sm ml-4 mr-4">Container Width:</span>
      <input
        type="number"
        value={containerWidth}
        onChange={(e) => setContainerWidth(parseInt(e.target.value, 10))}
        min="100" // Ensure container width is at least 100px
        className="border border-gray-300 p-2 m-4 rounded-lg w-20"
      />
    </label>
  );
};

export default ContainerWidthInput;
