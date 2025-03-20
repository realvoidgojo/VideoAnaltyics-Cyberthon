// HeatmapVideo.jsx
import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const HeatmapVideo = ({ taskID, containerWidth, visible }) => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [embedUrl, setEmbedUrl] = useState(null);

  // Fetch video info when taskID changes or becomes visible
  useEffect(() => {
    if (!taskID || !visible) return;
    
    const fetchVideoInfo = async () => {
      try {
        setIsLoading(true);
        setVideoError(false);
        
        const response = await axios.get(`http://localhost:5000/get_heatmap_video_info/${taskID}`);
        console.log("Video info:", response.data);
        setVideoInfo(response.data);
        
        // Create URL with cache-busting parameter
        const streamUrl = `${response.data.stream_url}?t=${Date.now()}`;
        setEmbedUrl(streamUrl);
        
        if (videoRef.current) {
          videoRef.current.load();
        }
      } catch (error) {
        console.error("Error fetching video info:", error);
        setVideoError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideoInfo();
  }, [taskID, visible]);
  
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
      // Log extended debug info
      console.log("Current video src:", videoRef.current.currentSrc);
      console.log("Video network state:", videoRef.current.networkState);
      console.log("Video ready state:", videoRef.current.readyState);
    }
    
    // Try to reload the video one time with a different approach
    if (!videoError && embedUrl) {
      console.log("Attempting to reload video with cache-busting query parameter");
      const reloadUrl = `${embedUrl}&t=${Date.now()}`;
      if (videoRef.current) {
        videoRef.current.src = reloadUrl;
        videoRef.current.load();
        return; // Don't set error state yet, give it another chance
      }
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

  const downloadUrl = videoInfo ? `http://localhost:5000${videoInfo.download_url}` : `http://localhost:5000/download_heatmap_video/${taskID}`;

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
          <p className="text-red-500 mb-2">Error loading heatmap video.</p>
          <p className="text-sm text-gray-500 mb-2">
            Please try again or use one of the options below:
          </p>
          <div className="flex space-x-2">
            <a 
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download Video
            </a>
            {/* Direct link for opening in external player */}
            <a 
              href={videoInfo ? `http://localhost:5000${videoInfo.stream_url}` : `http://localhost:5000/stream_heatmap_video/${taskID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Open in External Player
            </a>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            controls
            style={videoStyle}
            className="rounded-lg"
            onError={handleVideoError}
            onLoadedData={handleVideoLoaded}
            onCanPlayThrough={handleCanPlayThrough}
            preload="auto"
            playsInline
          >
            {/* Add proper MIME type based on video extension */}
            <source 
              src={embedUrl} 
              type={videoInfo && videoInfo.mime_type ? videoInfo.mime_type : "video/mp4"} 
            />
            Your browser does not support HTML5 video.
          </video>
          
          {/* Always show download link for convenience */}
          <div className="mt-2 text-right">
            <a 
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Download video file
            </a>
          </div>
        </>
      )}
      
      <p className="text-sm text-gray-500 mt-2">
        This video shows the movement heatmap overlay on the original video.
        {videoInfo && videoInfo.extension && (
          <span> (Format: {videoInfo.extension})</span>
        )}
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