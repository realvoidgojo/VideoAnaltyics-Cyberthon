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
      <div className="flex items-center h-6">
        <input
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-5 w-5 rounded border-2
            text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-all duration-200
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
            ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}
            ${className}
          `}
          {...props}
        />
      </div>
      <div className="ml-3 flex-1">
        {label && (
          <label 
            htmlFor={checkboxId} 
            className={`
              block font-medium text-gray-700 leading-6
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              ${labelClassName}
            `}
          >
            {label}
          </label>
        )}
        {helperText && (
          <p className="text-gray-500 mt-1 text-sm leading-5">{helperText}</p>
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