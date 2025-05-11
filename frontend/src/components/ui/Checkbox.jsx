import React from "react";
import PropTypes from "prop-types";

const Checkbox = ({
  label,
  checked,
  onChange,
  name,
  id,
  disabled = false,
  helperText,
  className = "",
  labelClassName = "",
  containerClassName = "",
  ...props
}) => {
  // Generate an ID if not provided
  const checkboxId = id || name || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <div className={`flex items-start ${containerClassName}`}>
      <div className="flex items-center h-5">
        <input
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-5 w-5 rounded
            text-blue-600 border-gray-300 focus:ring-blue-500
            transition-colors duration-200
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        {label && (
          <label 
            htmlFor={checkboxId} 
            className={`
              font-medium text-gray-700
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              ${labelClassName}
            `}
          >
            {label}
          </label>
        )}
        {helperText && (
          <p className="text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    </div>
  );
};

Checkbox.propTypes = {
  label: PropTypes.node,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
  helperText: PropTypes.node,
  className: PropTypes.string,
  labelClassName: PropTypes.string,
  containerClassName: PropTypes.string,
};

export default Checkbox;