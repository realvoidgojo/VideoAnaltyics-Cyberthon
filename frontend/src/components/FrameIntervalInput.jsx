// FrameIntervalInput.jsx
import React from "react";

const FrameIntervalInput = ({ frameInterval, setFrameInterval }) => {
  return (
    <label>
      <span className="text-sm ml-4 mr-4">Frames</span>
      <input
        type="number"
        value={frameInterval}
        onChange={(e) => setFrameInterval(parseInt(e.target.value, 10))}
        min="1" // Ensure interval is at least 1
        className="border border-gray-300 p-2 m-4 rounded-lg w-14"
      />
    </label>
  );
};

export default FrameIntervalInput;
