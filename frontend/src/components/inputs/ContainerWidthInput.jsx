// ContainerWidthInput.jsx
import React from "react";
import PropTypes from "prop-types";
import Input from "../ui/Input";

const ContainerWidthInput = ({ containerWidth, setContainerWidth }) => {
  return (
    <Input
      label="Container Width"
      type="number"
      value={containerWidth}
      onChange={(e) => setContainerWidth(parseInt(e.target.value, 10))}
      min="100"
      max="1920"
      helperText="Width in pixels (100-1920)"
      inputClassName="w-full"
    />
  );
};

ContainerWidthInput.propTypes = {
  containerWidth: PropTypes.number.isRequired,
  setContainerWidth: PropTypes.func.isRequired,
};

export default ContainerWidthInput;
