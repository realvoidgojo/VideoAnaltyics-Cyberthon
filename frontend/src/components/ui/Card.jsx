import React from "react";
import PropTypes from "prop-types";

const Card = ({
  children,
  className = "",
  title,
  subtitle,
  icon,
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  footer,
  variant = "default",
  ...props
}) => {
  // Card variants
  const variantStyles = {
    default: "bg-white border-gray-200",
    primary: "bg-blue-50 border-blue-200",
    secondary: "bg-purple-50 border-purple-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
    dark: "bg-gray-800 text-white border-gray-700",
  };

  return (
    <div
      className={`rounded-xl border shadow-sm overflow-hidden ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Card Header */}
      {(title || icon) && (
        <div className={`px-6 py-4 border-b ${headerClassName}`}>
          <div className="flex items-center">
            {icon && <div className="mr-3">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>

      {/* Card Footer */}
      {footer && (
        <div className={`px-6 py-4 border-t ${footerClassName}`}>{footer}</div>
      )}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  icon: PropTypes.node,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  footerClassName: PropTypes.string,
  footer: PropTypes.node,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "dark",
  ]),
};

export default Card;