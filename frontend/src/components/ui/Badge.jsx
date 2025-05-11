import React from "react";
import PropTypes from "prop-types";

const Badge = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  icon,
  ...props
}) => {
  // Base styles
  const baseStyles = "inline-flex items-center font-medium rounded-full";
  
  // Size variations
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-base"
  };
  
  // Variant styles
  const variantStyles = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    secondary: "bg-purple-100 text-purple-800",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-cyan-100 text-cyan-800",
    dark: "bg-gray-700 text-white",
    light: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  
  // Combine styles
  const badgeStyles = `
    ${baseStyles} 
    ${sizeStyles[size]} 
    ${variantStyles[variant]} 
    ${className}
  `;
  
  return (
    <span
      className={badgeStyles}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
    "dark",
    "light"
  ]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
  icon: PropTypes.node,
};

export default Badge;