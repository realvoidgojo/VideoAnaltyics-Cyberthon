import React, { useState, useEffect } from "react";
import { X, Upload, Sliders, Thermometer, AlertCircle } from "lucide-react";
import VideoUpload from "./VideoUpload";
import ModelSelection from "../inputs/ModelSelection";
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
  useHeatmap,
  onVideoUpload,
  onModelChange,
  setFrameInterval,
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

  // Use local state for form values to avoid closing dialog on change
  const [localFrameInterval, setLocalFrameInterval] = useState(frameInterval);
  const [localUseHeatmap, setLocalUseHeatmap] = useState(useHeatmap);
  const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);

  // Sync local state with props if they change externally
  useEffect(() => {
    setLocalFrameInterval(frameInterval);
    setLocalUseHeatmap(useHeatmap);
    setLocalSelectedModel(selectedModel);
  }, [frameInterval, useHeatmap, selectedModel]);

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

  // Enhanced handleVideoUpload method
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

  // Enhanced save method with proper validation
  const handleSave = async () => {
    if (!selectedFile) {
      setValidationError("Please select a video file");
      return;
    }

    // Validate frame interval
    if (!localFrameInterval || localFrameInterval < 1 || localFrameInterval > 30) {
      setValidationError("Frame interval must be between 1 and 30");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Update global state before submitting
      setFrameInterval(localFrameInterval);
      setUseHeatmap(localUseHeatmap);

      // Handle model change specifically to ensure it's properly updated
      if (localSelectedModel !== selectedModel) {
        if (onModelChange) {
          // Use the expected format for the event handler
          onModelChange({ target: { value: localSelectedModel } });
        } else if (contextSetModel) {
          // Use context setter if available as fallback
          contextSetModel(localSelectedModel);
        }
      }

      // Save the job without containerWidth (using default value from backend)
      await onSave(
        selectedFile,
        localSelectedModel,
        localFrameInterval,
        720, // Use default container width for HLS player
        localUseHeatmap,
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

  // Handle local model change with proper event normalization
  const handleLocalModelChange = (e) => {
    // Handle both direct value changes and event objects
    const newModelValue = e.target ? e.target.value : e;
    console.log("Model changed to:", newModelValue);
    setLocalSelectedModel(newModelValue);
  };

  // Handle frame interval change with proper validation
  const handleFrameIntervalChange = (e) => {
    const value = e.target.value;
    // Allow empty string during typing, but use 1 as minimum
    if (value === "") {
      setLocalFrameInterval("");
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        setLocalFrameInterval(Math.max(1, Math.min(30, parsed)));
      }
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative animate-fadeIn my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Create New Job</h2>
          <button
            className="text-gray-500 hover:text-gray-700 rounded-full p-2 hover:bg-gray-100 transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Video Upload Section */}
            <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <Upload className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-700">
                  Upload Video
                </h3>
              </div>
              <VideoUpload
                onVideoUpload={handleVideoUpload}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* Model Selection */}
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <svg
                  className="h-5 w-5 text-blue-500 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <h3 className="text-lg font-medium text-gray-700">
                  Model Selection
                </h3>
              </div>
              <ModelSelection
                value={localSelectedModel}
                onChange={handleLocalModelChange}
                options={[
                  {
                    value: "yolov11n.pt",
                    label: "YOLOv11n (Nano) - Fastest, Lower Accuracy",
                  },
                  {
                    value: "yolov11s.pt",
                    label: "YOLOv11s (Small) - Fast, Good Accuracy",
                  },
                  { value: "yolov11m.pt", label: "YOLOv11m (Medium) - Balanced" },
                  {
                    value: "yolov11l.pt",
                    label: "YOLOv11l (Large) - High Accuracy",
                  },
                  {
                    value: "yolov11x.pt",
                    label: "YOLOv11x (Extra Large) - Best Accuracy",
                  },
                ]}
              />
            </div>

            {/* Processing Parameters */}
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <Sliders className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-700">Processing Parameters</h3>
              </div>

              <div className="max-w-sm">
                <Input
                  label="Frame Interval"
                  type="number"
                  value={localFrameInterval}
                  onChange={handleFrameIntervalChange}
                  min="1"
                  max="30"
                  placeholder="5"
                  helperText="Process every nth frame (1-30)"
                />
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="p-5 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center mb-3">
                <Thermometer className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-700">
                  Heatmap Analysis
                </h3>
              </div>
              <HeatmapCheckbox
                useHeatmap={localUseHeatmap}
                setUseHeatmap={setLocalUseHeatmap}
              />
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center animate-fadeIn text-sm">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
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
