// VideoUpload.jsx
import React, { useState, useCallback } from "react";
import { Upload, FileVideo, Check } from "lucide-react";
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
      className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
        isDragging 
          ? "border-blue-500 bg-blue-50 scale-[1.02]" 
          : fileName 
          ? "border-green-400 bg-green-50 hover:border-green-500" 
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
      }`}
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
        <div className={`mb-4 p-4 rounded-full transition-colors ${
          isDragging 
            ? "bg-blue-100" 
            : fileName 
            ? "bg-green-100" 
            : "bg-gray-100"
        }`}>
          {fileName ? (
            <FileVideo className="h-10 w-10 text-green-600" />
          ) : isDragging ? (
            <Upload className="h-10 w-10 text-blue-500 animate-bounce" />
          ) : (
            <Upload className="h-10 w-10 text-gray-400" />
          )}
        </div>

        {fileName ? (
          <div className="mb-4">
            <div className="flex items-center justify-center mb-2">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-sm font-semibold text-green-700">File Selected</p>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1 truncate max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-gray-500">
              Click below to replace with a different file
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragging ? "Drop your video here" : "Drag and drop your video here"}
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Supports MP4, MOV, AVI, and WebM files
            </p>
            <p className="text-xs text-gray-400">
              Maximum file size: 500MB
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleButtonClick}
          className={`px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
            fileName 
              ? "bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md" 
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
          }`}
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
