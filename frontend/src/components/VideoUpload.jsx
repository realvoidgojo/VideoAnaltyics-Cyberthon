// VideoUpload.jsx
import React from "react";

const VideoUpload = ({ onVideoUpload, fileInputRef }) => {
  return (
    <div>
      <input
        type="file"
        accept="video/*"
        onChange={onVideoUpload}
        ref={fileInputRef}
        className="border text-gray-900 border-gray-300 p-2 m-4 rounded-lg bg-black-100"
      />
    </div>
  );
};

export default VideoUpload;
