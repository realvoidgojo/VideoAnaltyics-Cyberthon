// FrameIntervalInput.jsx
import React from "react";
import PropTypes from "prop-types";
import Input from "../ui/Input";

const FrameIntervalInput = ({ frameInterval, setFrameInterval }) => {
  return (
    <Input
      label="Frame Interval"
      type="number"
      value={frameInterval}
      onChange={(e) => setFrameInterval(parseInt(e.target.value, 10))}
      min="1"
      max="30"
      helperText="Process every nth frame (1-30)"
      inputClassName="w-full"
    />
  );
};

FrameIntervalInput.propTypes = {
  frameInterval: PropTypes.number.isRequired,
  setFrameInterval: PropTypes.func.isRequired,
};

export default FrameIntervalInput;
