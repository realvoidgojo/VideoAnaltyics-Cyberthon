import React from "react";
import PropTypes from "prop-types";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

const StatusIndicator = ({ status, className = "" }) => {
  // Determine the appropriate icon and color based on status
  const getStatusDisplay = () => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "Completed",
          bgColor: "bg-green-100",
          textColor: "text-green-800",
        };
      case "processing":
        return {
          icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
          text: "Processing",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
        };
      case "failed":
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          text: "Failed",
          bgColor: "bg-red-100",
          textColor: "text-red-800",
        };
      default:
        return {
          icon: <Loader2 className="h-4 w-4 text-gray-500" />,
          text: status || "Unknown",
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
        };
    }
  };

  const { icon, text, bgColor, textColor } = getStatusDisplay();

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${bgColor} ${textColor} ${className}`}
    >
      {icon}
      <span className="ml-1 text-xs font-medium">{text}</span>
    </div>
  );
};

StatusIndicator.propTypes = {
  status: PropTypes.string,
  className: PropTypes.string,
};

export default StatusIndicator;
