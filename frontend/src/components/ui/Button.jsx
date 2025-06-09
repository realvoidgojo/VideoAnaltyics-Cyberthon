import React from "react";
import PropTypes from "prop-types";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  isLoading = false,
  disabled = false,
  onClick,
  type = "button",
  ...props
}) => {
  // Base styles
  const baseStyles = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  // Size variations
  const sizeStyles = {
    sm: "px-3 py-2 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2"
  };
  
  // Variant styles with focus rings
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-sm focus:ring-gray-500",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm focus:ring-green-500",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm focus:ring-red-500",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700 bg-white focus:ring-gray-500",
  };
  
  // Disabled styles
  const disabledStyles = "opacity-60 cursor-not-allowed";
  
  // Combine styles
  const buttonStyles = `
    ${baseStyles} 
    ${sizeStyles[size]} 
    ${variantStyles[variant]} 
    ${disabled || isLoading ? disabledStyles : ""} 
    ${className}
  `;
  
  return (
    <button
      type={type}
      className={buttonStyles}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !isLoading && icon}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(["primary", "secondary", "success", "danger", "outline"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
  icon: PropTypes.node,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.string,
};

export default Button;