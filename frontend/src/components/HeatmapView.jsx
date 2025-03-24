// HeatmapView.jsx
import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";

const HeatmapView = ({
  videoSource,
  heatmapFrames,
  containerWidth,
  visible
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const preloadedImages = useRef([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [canvasError, setCanvasError] = useState(null);

  // Preload heatmap images
  useEffect(() => {
    if (!heatmapFrames || !heatmapFrames.length || !visible) return;
    
    console.log(`Preloading ${heatmapFrames.length} heatmap frames`);
    
    // Clear previous preloaded images
    preloadedImages.current = [];
    
    // Preload all images
    const images = heatmapFrames.map((frame, index) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${frame}`;
      // Add load event listener to track loading progress
      img.onload = () => {
        console.log(`Heatmap frame ${index} loaded`);
      };
      img.onerror = (e) => {
        console.error(`Error loading heatmap frame ${index}:`, e);
      };
      return img;
    });
    
    preloadedImages.current = images;
    
  }, [heatmapFrames, visible]);

  // Handle canvas sizing
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !visible) return;

    const updateCanvasSize = () => {
      try {
        if (video.videoWidth && video.videoHeight) {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Set canvas CSS dimensions to match container width while maintaining aspect ratio
          const aspectRatio = video.videoHeight / video.videoWidth;
          const displayWidth = containerWidth || video.clientWidth;
          const displayHeight = displayWidth * aspectRatio;
          
          canvas.style.width = `${displayWidth}px`;
          canvas.style.height = `${displayHeight}px`;
          
          setCanvasReady(true);
          console.log(`Canvas size updated: ${canvas.width}x${canvas.height}, display: ${displayWidth}x${displayHeight}`);
        }
      } catch (error) {
        console.error("Error updating canvas size:", error);
        setCanvasError("Failed to set up canvas for heatmap display");
      }
    };

    // Set up video event listeners
    const handleVideoLoad = () => {
      console.log("Video loaded, updating canvas size");
      updateCanvasSize();
      setVideoLoaded(true);
    };

    // Add event listeners
    video.addEventListener("loadedmetadata", handleVideoLoad);
    
    // Initial size update attempt
    updateCanvasSize();

    return () => {
      // Clean up event listeners
      video.removeEventListener("loadedmetadata", handleVideoLoad);
    };
  }, [containerWidth, visible]);

  // Handle video timeupdate to sync heatmap frames
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !visible || !heatmapFrames || !heatmapFrames.length) return;

    const handleTimeUpdate = () => {
      if (!preloadedImages.current.length) return;
      
      // Calculate which frame to show based on current video time
      const videoProgress = video.currentTime / video.duration;
      const frameIndex = Math.min(
        Math.floor(videoProgress * preloadedImages.current.length),
        preloadedImages.current.length - 1
      );
      
      if (frameIndex !== currentFrameIndex) {
        setCurrentFrameIndex(frameIndex);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [heatmapFrames, currentFrameIndex, visible]);

  // Draw heatmap frame on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible || !canvasReady || !preloadedImages.current.length) return;

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Could not get canvas context");
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get current frame
      const frameIndex = Math.min(currentFrameIndex, preloadedImages.current.length - 1);
      const img = preloadedImages.current[frameIndex];
      
      if (img && img.complete) {
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log(`Drew heatmap frame ${frameIndex} on canvas`);
      }
    } catch (error) {
      console.error("Error drawing heatmap frame:", error);
    }
  }, [currentFrameIndex, canvasReady, visible]);

  // Handle container width changes
  useEffect(() => {
    if (canvasReady && visible) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      
      try {
        // Update canvas display size while maintaining aspect ratio
        const aspectRatio = video.videoHeight / video.videoWidth;
        const displayWidth = containerWidth || video.clientWidth;
        const displayHeight = displayWidth * aspectRatio;
        
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        console.log(`Canvas display size updated for container width ${containerWidth}: ${displayWidth}x${displayHeight}`);
      } catch (error) {
        console.error("Error updating canvas display size:", error);
      }
    }
  }, [containerWidth, canvasReady, visible]);

  if (!visible) return null;

  return (
    <div className="relative" style={{ width: containerWidth || "100%" }}>
      {canvasError && (
        <div className="absolute inset-0 bg-red-100 bg-opacity-75 flex items-center justify-center z-10 p-4 text-red-700">
          {canvasError}
        </div>
      )}
      
      <video
        ref={videoRef}
        src={videoSource}
        className="w-full"
        controls
        style={{ display: "block" }}
        onError={(e) => console.error("Video error:", e)}
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: "100%",
          height: "100%",
          opacity: 0.7,
        }}
      />
      
      {heatmapFrames && heatmapFrames.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Heatmap overlay: Frame {currentFrameIndex + 1} of {heatmapFrames.length}
        </div>
      )}
    </div>
  );
};

HeatmapView.propTypes = {
  videoSource: PropTypes.string,
  heatmapFrames: PropTypes.array,
  containerWidth: PropTypes.number,
  visible: PropTypes.bool
};

HeatmapView.defaultProps = {
  heatmapFrames: [],
  visible: true
};

export default HeatmapView;