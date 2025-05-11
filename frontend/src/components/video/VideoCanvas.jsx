import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { drawBoundingBox, drawLabel } from "../utils/canvasUtils";

const VideoCanvas = ({
  videoSource,
  detections,
  preprocessedWidth,
  preprocessedHeight,
  containerWidth,
  classColors,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastDrawnFrame = useRef(-1);

  // Canvas scaling calculations
  const getScaleFactors = () => ({
    width: canvasRef.current?.width / preprocessedWidth || 1,
    height: canvasRef.current?.height / preprocessedHeight || 1,
  });

  // Detection drawing handler with frame synchronization
  const drawFrameDetections = () => {
    const ctx = canvasRef.current?.getContext("2d");
    const video = videoRef.current;
    if (!ctx || !video || !detections?.length) return;

    // Calculate current frame index with better precision
    const frameRate = detections.length / video.duration;
    const currentFrame = Math.floor(video.currentTime * frameRate);

    // Only redraw if we're on a new frame
    if (
      currentFrame !== lastDrawnFrame.current &&
      currentFrame < detections.length
    ) {
      lastDrawnFrame.current = currentFrame;

      // Clear and draw video frame
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);

      const { width: wScale, height: hScale } = getScaleFactors();

      // Draw detections for current frame
      if (detections[currentFrame]) {
        detections[currentFrame].forEach(
          ({ class_name, confidence, box, track_id }) => {
            if (!box || box.length !== 4) return;

            const [x1, y1, x2, y2] = box.map(
              (val, i) => val * (i % 2 === 0 ? wScale : hScale)
            );

            const color = classColors[class_name]?.hex || "#ff0000";
            const labelText = track_id
              ? `${class_name} ${confidence.toFixed(2)} (ID: ${track_id})`
              : `${class_name} ${confidence.toFixed(2)}`;

            drawBoundingBox(ctx, x1, y1, x2, y2, color);
            drawLabel(ctx, x1, y1, labelText, color);
          }
        );
      }
    }

    // Request next frame
    animationFrameId.current = requestAnimationFrame(drawFrameDetections);
  };

  // Initialize video and canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Set initial canvas size
    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
      }
    };

    // Event handlers
    const handleTimeUpdate = () => (lastDrawnFrame.current = -1);
    const handlePlay = () => {
      lastDrawnFrame.current = -1;
      animationFrameId.current = requestAnimationFrame(drawFrameDetections);
    };

    // Add event listeners
    video.addEventListener("loadedmetadata", updateCanvasSize);
    video.addEventListener("play", handlePlay);
    video.addEventListener("seeking", handleTimeUpdate);
    video.addEventListener("seeked", handleTimeUpdate);

    // Initial setup
    if (video.readyState >= 2) {
      updateCanvasSize();
    }

    // Cleanup
    return () => {
      video.removeEventListener("loadedmetadata", updateCanvasSize);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("seeking", handleTimeUpdate);
      video.removeEventListener("seeked", handleTimeUpdate);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [videoSource, containerWidth]);

  // Handle detection updates
  useEffect(() => {
    if (!videoRef.current?.paused) {
      lastDrawnFrame.current = -1;
      drawFrameDetections();
    }
  }, [detections, classColors]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <div className="relative aspect-video bg-black rounded-lg shadow-md overflow-hidden">
        <video
          ref={videoRef}
          src={videoSource}
          controls
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
      <div className="relative aspect-video bg-black rounded-lg shadow-md overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

VideoCanvas.propTypes = {
  videoSource: PropTypes.string,
  detections: PropTypes.arrayOf(PropTypes.array),
  preprocessedWidth: PropTypes.number,
  preprocessedHeight: PropTypes.number,
  containerWidth: PropTypes.number,
  classColors: PropTypes.object,
};

export default React.memo(VideoCanvas);
