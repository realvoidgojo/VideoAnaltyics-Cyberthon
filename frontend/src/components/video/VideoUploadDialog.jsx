import React, { useState, useEffect } from "react";
import { X, Upload, Sliders, Thermometer, AlertCircle } from "lucide-react";
import VideoUpload from "./VideoUpload";
import ModelSelection from "../inputs/ModelSelection";
import FrameIntervalInput from "../inputs/FrameIntervalInput";
import ContainerWidthInput from "../inputs/ContainerWidthInput";
import HeatmapCheckbox from "../heatmap/HeatmapCheckbox";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useJobContext } from "../../context/JobContext";

const VideoUploadDialog = ({
  onClose,
  onSave,
  selectedFile,
  selectedModel,
  frameInterval,
  containerWidth,
  useHeatmap,
  onVideoUpload,
  onModelChange,
  setFrameInterval,
  setContainerWidth,
  setUseHeatmap,
  fileInputRef,
  isLoading,
}) => {
  const {
    setError,
    saveJobPreset: contextSaveJob,
    handleVideoUpload: contextHandleUpload,
    setSelectedModel: contextSetModel,
  } = useJobContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Check if file is already selected
  useEffect(() => {
    setFileSelected(!!selectedFile);
  }, [selectedFile]);

  // Validate file size before upload
  const validateFile = (file) => {
    // Check file size (limit to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB in bytes
    if (file.size > maxSize) {
      setValidationError(`File too large. Maximum size is 500MB.`);
      return false;
    }

    // Check file type
    if (!file.type.startsWith("video/")) {
      setValidationError("Please select a valid video file.");
      return false;
    }

    return true;
  };

  // Enhance handleVideoUpload method
  const handleVideoUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setFileSelected(true);
        setValidationError(null);

        if (onVideoUpload) {
          onVideoUpload(e);
        } else if (contextHandleUpload) {
          contextHandleUpload(e);
        }
      } else {
        // Clear the file input if validation fails
        e.target.value = null;
        setFileSelected(false);
      }
    }
  };

  // Enhanced save method with better error handling
  const handleSave = async () => {
    if (!selectedFile) {
      setValidationError("Please select a video file");
      return;
    }

    if (frameInterval < 1 || frameInterval > 30) {
      setValidationError("Frame interval must be between 1 and 30");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Always use server-side rendering
      await onSave(
        selectedFile,
        selectedModel,
        frameInterval,
        containerWidth,
        useHeatmap,
        true // force server-side rendering
      );
      onClose();
    } catch (error) {
      console.error("Error saving job:", error);

      // More specific error messages
      if (error.response?.status === 413) {
        setValidationError(
          "File size too large. Please select a smaller video."
        );
      } else if (error.response?.data?.error) {
        setValidationError(error.response.data.error);
      } else {
        setValidationError("Failed to create job. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white p-5 rounded-xl shadow-2xl w-full max-w-lg relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Create New Job</h2>
          <button
            className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Video Upload Section */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center mb-2">
              <Upload className="h-4 w-4 text-blue-500 mr-2" />
              <h3 className="text-md font-medium text-gray-700">
                Upload Video
              </h3>
            </div>
            <VideoUpload
              onVideoUpload={handleVideoUpload}
              fileInputRef={fileInputRef}
            />
          </div>

          {/* Model Selection */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <ModelSelection
              value={selectedModel}
              onChange={onModelChange}
              options={[
                { value: "yolov11n.pt", label: "YOLOv11n (Nano)" },
                { value: "yolov11s.pt", label: "YOLOv11s (Small)" },
                { value: "yolov11m.pt", label: "YOLOv11m (Medium)" },
                { value: "yolov11l.pt", label: "YOLOv11l (Large)" },
                { value: "yolov11x.pt", label: "YOLOv11x (Extra Large)" },
              ]}
              helperText="Select model size"
            />
          </div>

          {/* Processing Parameters - side by side */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center mb-3">
              <Sliders className="h-4 w-4 text-gray-500 mr-2" />
              <h3 className="text-md font-medium text-gray-700">Parameters</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Frame Interval"
                type="number"
                value={frameInterval}
                onChange={(e) => setFrameInterval(parseInt(e.target.value, 10))}
                min="1"
                helperText="Every nth frame"
              />

              <Input
                label="Width"
                type="number"
                value={containerWidth}
                onChange={(e) =>
                  setContainerWidth(parseInt(e.target.value, 10))
                }
                min="100"
                max="1920"
                helperText="Display width"
              />
            </div>
          </div>

          {/* Heatmap Section - compact */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center mb-2">
              <Thermometer className="h-4 w-4 text-green-500 mr-2" />
              <h3 className="text-md font-medium text-gray-700">
                Heatmap Analysis
              </h3>
            </div>
            <HeatmapCheckbox
              useHeatmap={useHeatmap}
              setUseHeatmap={setUseHeatmap}
            />
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center animate-fadeIn text-sm">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="transition-all duration-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            isLoading={isSubmitting || isLoading}
            disabled={!fileSelected || isSubmitting || isLoading}
            className="transition-all duration-300 hover:shadow-md"
          >
            Create Job
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadDialog;
