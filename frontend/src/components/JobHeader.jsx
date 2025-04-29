import React from "react";
import { X, VideoIcon } from "lucide-react";

const JobHeader = ({ job, onRemove }) => (
  <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
    <div className="flex items-center">
      <div className="bg-gray-700 p-2 rounded-md mr-3">
        <VideoIcon className="h-5 w-5 text-blue-400" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">
          {job.selectedFile ? job.selectedFile.name : "Video Processing Job"}
        </h3>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">
            Model: {job.selectedModel.replace(".pt", "")}
          </span>
          <span className="bg-purple-500 text-xs px-2 py-1 rounded-full">
            Interval: {job.frameInterval}
          </span>
          {job.useHeatmap && (
            <span className="bg-green-600 text-xs px-2 py-1 rounded-full">
              Heatmap Enabled
            </span>
          )}
        </div>
      </div>
    </div>
    <button
      className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors duration-200"
      onClick={onRemove}
      title="Remove Job"
    >
      <X className="h-5 w-5" />
    </button>
  </div>
);

export default JobHeader;
