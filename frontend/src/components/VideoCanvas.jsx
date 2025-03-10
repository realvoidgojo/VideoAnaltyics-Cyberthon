import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { drawBoundingBox, drawLabel } from "./utils/canvasUtils";

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

  // Canvas scaling calculations
  const getScaleFactors = () => ({
    width: canvasRef.current?.width / preprocessedWidth || 1,
    height: canvasRef.current?.height / preprocessedHeight || 1,
  });

  // Detection drawing handler
  const drawFrameDetections = () => {
    const ctx = canvasRef.current?.getContext("2d");
    const video = videoRef.current;
    if (!ctx || !video) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);

    const currentTime = video.currentTime;
    const frameIndex = Math.floor(
      currentTime * (detections.length / video.duration)
    );
    const { width: wScale, height: hScale } = getScaleFactors();

    if (detections[frameIndex]) {
      detections[frameIndex].forEach(
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

    animationFrameId.current = requestAnimationFrame(drawFrameDetections);
  };

  // Canvas sizing and event handlers
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const updateCanvasSize = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        canvas.width = containerWidth;
        canvas.height = containerWidth / aspectRatio;
      }
    };

    const handlePlay = () => {
      animationFrameId.current = requestAnimationFrame(drawFrameDetections);
    };

    video.addEventListener("loadedmetadata", updateCanvasSize);
    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("loadedmetadata", updateCanvasSize);
      video.removeEventListener("play", handlePlay);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [videoSource, containerWidth]);

  // Detection updates handler
  useEffect(() => {
    if (videoRef.current?.paused) return;
    drawFrameDetections();
  }, [detections, classColors]);

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
        <canvas ref={canvasRef} className="w-full h-auto pointer-events-none" />
      </div>
    </div>
  );
};

VideoCanvas.propTypes = {
  videoSource: PropTypes.string,
  detections: PropTypes.arrayOf(PropTypes.object),
  preprocessedWidth: PropTypes.number,
  preprocessedHeight: PropTypes.number,
  containerWidth: PropTypes.number,
  classColors: PropTypes.object,
};

export default React.memo(VideoCanvas);
