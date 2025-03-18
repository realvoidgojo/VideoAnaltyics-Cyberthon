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

  // Preload heatmap images
  useEffect(() => {
    if (!heatmapFrames || !heatmapFrames.length || !visible) return;
    
    // Clear previous preloaded images
    preloadedImages.current = [];
    
    // Preload all images
    const images = heatmapFrames.map((frame, index) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${frame}`;
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
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
      }
    };

    video.addEventListener("loadedmetadata", updateCanvasSize);
    updateCanvasSize();

    return () => {
      video.removeEventListener("loadedmetadata", updateCanvasSize);
    };
  }, [videoSource, containerWidth, visible]);

  // Handle frame display based on video time
  useEffect(() => {
    if (!visible || !videoRef.current || !canvasRef.current || !heatmapFrames || !heatmapFrames.length) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    const updateHeatmapFrame = () => {
      if (video.paused || !preloadedImages.current.length) return;
      
      // Calculate which frame to show based on current video time
      const videoDuration = video.duration;
      const currentTime = video.currentTime;
      const frameIndex = Math.min(
        Math.floor((currentTime / videoDuration) * heatmapFrames.length),
        heatmapFrames.length - 1
      );
      
      if (frameIndex !== currentFrameIndex) {
        setCurrentFrameIndex(frameIndex);
      }
      
      // Draw the frame on canvas
      if (preloadedImages.current[frameIndex] && preloadedImages.current[frameIndex].complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(preloadedImages.current[frameIndex], 0, 0, canvas.width, canvas.height);
      }
      
      requestAnimationFrame(updateHeatmapFrame);
    };
    
    const frameRequestId = requestAnimationFrame(updateHeatmapFrame);
    
    const handlePlay = () => {
      requestAnimationFrame(updateHeatmapFrame);
    };
    
    video.addEventListener("play", handlePlay);
    
    return () => {
      cancelAnimationFrame(frameRequestId);
      video.removeEventListener("play", handlePlay);
    };
  }, [heatmapFrames, currentFrameIndex, visible]);

  if (!visible) return null;

  return (
    <div className="flex flex-row w-full p-4">
      <div className="w-1/2 mr-4">
        <video
          ref={videoRef}
          src={videoSource}
          controls
          className="w-full h-auto object-contain"
        />
      </div>
      <div className="w-1/2">
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto pointer-events-none"
        />
        <div className="text-center mt-2 text-sm text-gray-600">
          {heatmapFrames && heatmapFrames.length ? (
            <span>Showing heatmap frame {currentFrameIndex + 1} of {heatmapFrames.length}</span>
          ) : (
            <span>No heatmap frames available</span>
          )}
        </div>
      </div>
    </div>
  );
};

HeatmapView.propTypes = {
  videoSource: PropTypes.string,
  heatmapFrames: PropTypes.array,
  containerWidth: PropTypes.number,
  visible: PropTypes.bool
};

export default React.memo(HeatmapView);