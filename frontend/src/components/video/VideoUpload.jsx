// VideoUpload.jsx
import React, { useState, useCallback } from "react";
import { Upload, FileVideo } from "lucide-react";
import PropTypes from "prop-types";

const VideoUpload = ({ onVideoUpload, fileInputRef }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/")) {
          setFileName(file.name);
          // Create a synthetic event to pass to the onVideoUpload handler
          const syntheticEvent = { target: { files: files } };
          onVideoUpload(syntheticEvent);
        }
      }
    },
    [onVideoUpload]
  );

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
    onVideoUpload(e);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        aria-label="Upload video file"
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className={`mb-3 p-3 rounded-full ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}>
          {fileName ? (
            <FileVideo className="h-8 w-8 text-blue-500" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400" />
          )}
        </div>

        {fileName ? (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1 truncate max-w-xs">{fileName}</p>
            <p className="text-xs text-gray-500">Click or drag to replace</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drag and drop your video here
            </p>
            <p className="text-xs text-gray-500 mb-3">MP4, MOV, AVI, or WebM files</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleButtonClick}
          className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
        >
          {fileName ? "Replace Video" : "Select Video"}
        </button>
      </div>
    </div>
  );
};

VideoUpload.propTypes = {
  onVideoUpload: PropTypes.func.isRequired,
  fileInputRef: PropTypes.object.isRequired,
};

export default VideoUpload;
