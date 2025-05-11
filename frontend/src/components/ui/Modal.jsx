import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import Button from "./Button";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
  overlayClassName = "",
  contentClassName = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  ...props
}) => {
  // Handle ESC key press to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      // Prevent scrolling on body when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      // Restore scrolling when modal is closed
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Size variations
  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    full: "max-w-full",
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75 backdrop-blur-sm ${overlayClassName}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      {...props}
    >
      <div
        className={`w-full ${sizeStyles[size]} bg-white rounded-xl shadow-2xl relative animate-fadeIn ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex justify-between items-center p-6 border-b border-gray-200 ${headerClassName}`}>
            {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
            {showCloseButton && (
              <button
                className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 transition-colors"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`p-6 ${bodyClassName}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className={`p-6 border-t border-gray-200 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "full"]),
  closeOnOverlayClick: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  footerClassName: PropTypes.string,
};

// Predefined footer with common button combinations
export const ModalFooter = {
  OkCancel: ({ onOk, onCancel, okText = "OK", cancelText = "Cancel", okVariant = "primary", isLoading = false }) => (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button variant={okVariant} onClick={onOk} isLoading={isLoading}>
        {okText}
      </Button>
    </div>
  ),
  
  SaveCancel: ({ onSave, onCancel, isLoading = false }) => (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant="success" onClick={onSave} isLoading={isLoading}>
        Save
      </Button>
    </div>
  ),
  
  DeleteCancel: ({ onDelete, onCancel, isLoading = false }) => (
    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onDelete} isLoading={isLoading}>
        Delete
      </Button>
    </div>
  ),
  
  Close: ({ onClose, closeText = "Close" }) => (
    <div className="flex justify-end">
      <Button variant="secondary" onClick={onClose}>
        {closeText}
      </Button>
    </div>
  ),
};

export default Modal;