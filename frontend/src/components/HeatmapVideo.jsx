// HeatmapVideo.jsx
import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";

const HeatmapVideo = ({ taskID, containerWidth, visible }) => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset video and error state when taskID changes
    setVideoError(false);
    setIsLoading(true);
    
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [taskID]);
  
  // Handle visibility changes - pause video when hidden
  useEffect(() => {
    const video = videoRef.current;
    if (!visible && video && !video.paused) {
      // If component becomes invisible, pause the video
      video.pause();
    }
    
    return () => {
      // Make sure to pause when unmounting
      if (video && !video.paused) {
        video.pause();
      }
    };
  }, [visible]);

  const handleVideoError = (e) => {
    console.error("Error loading heatmap video:", e);
    // Check if video processing might still be in progress
    if (videoRef.current && videoRef.current.error) {
      console.error("Video error code:", videoRef.current.error.code);
      console.error("Video error message:", videoRef.current.error.message);
    }
    setVideoError(true);
    setIsLoading(false);
  };

  const handleVideoLoaded = () => {
    console.log("Heatmap video loaded successfully");
    setIsLoading(false);
    setVideoError(false);
  };
  
  const handleCanPlayThrough = () => {
    console.log("Video can play through without buffering");
    setIsLoading(false);
  };

  if (!visible || !taskID) return null;

  const videoStyle = {
    width: containerWidth || "100%",
    height: "auto",
    maxWidth: "100%"
  };

  // Add timestamp to avoid caching issues
  const videoUrl = `http://localhost:5000/stream_heatmap_video/${taskID}?t=${Date.now()}`;

  return (
    <div className="p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Heatmap Video</h3>
      
      {isLoading && (
        <div className="flex justify-center items-center h-48 bg-gray-100 rounded-lg mb-4">
          <p>Loading heatmap video...</p>
        </div>
      )}
      
      {videoError ? (
        <div className="mt-4">
          <p className="text-red-500 mb-2">Unable to display heatmap video in the browser.</p>
          <a 
            href={`http://localhost:5000/download_heatmap_video/${taskID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download Heatmap Video Instead
          </a>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          style={videoStyle}
          className="rounded-lg"
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          onCanPlayThrough={handleCanPlayThrough}
          preload="auto"
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace('?t=', '.avi?t=')} type="video/x-msvideo" />
          Your browser does not support HTML5 video.
        </video>
      )}
      
      <p className="text-sm text-gray-500 mt-2">
        This video shows the movement heatmap overlay on the original video.
      </p>
    </div>
  );
};

HeatmapVideo.propTypes = {
  taskID: PropTypes.string,
  containerWidth: PropTypes.number,
  visible: PropTypes.bool
};

export default HeatmapVideo;