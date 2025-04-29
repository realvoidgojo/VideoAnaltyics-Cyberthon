import React from "react";
import { X } from "lucide-react";
import VideoUpload from "./VideoUpload";
import ModelSelection from "./ModelSelection";
import FrameIntervalInput from "./FrameIntervalInput";
import ContainerWidthInput from "./ContainerWidthInput";
import HeatmapCheckbox from "./HeatmapCheckbox";

const VideoUploadDialog = ({
  onClose,
  onSave,
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
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create New Job</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Upload Video
            </h3>
            <VideoUpload
              onVideoUpload={onVideoUpload}
              fileInputRef={fileInputRef}
            />
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Model Selection
            </h3>
            <ModelSelection
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Frame Interval
              </h3>
              <FrameIntervalInput
                frameInterval={frameInterval}
                setFrameInterval={setFrameInterval}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Container Width
              </h3>
              <ContainerWidthInput
                containerWidth={containerWidth}
                setContainerWidth={setContainerWidth}
              />
            </div>
          </div>

          <div className="mb-4">
            <HeatmapCheckbox
              useHeatmap={useHeatmap}
              setUseHeatmap={setUseHeatmap}
            />
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-green-600 hover:bg-green-900 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            onClick={onSave}
          >
            Create Job
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadDialog;
