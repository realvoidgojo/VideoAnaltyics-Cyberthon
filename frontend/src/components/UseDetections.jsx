// useDetections.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const useDetections = (taskID) => {
  const [detections, setDetections] = useState([]);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [preprocessedWidth, setPreprocessedWidth] = useState(0);
  const [preprocessedHeight, setPreprocessedHeight] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [heatmapFrames, setHeatmapFrames] = useState([]);
  const [useHeatmap, setUseHeatmap] = useState(false);
  const [heatmapPath, setHeatmapPath] = useState(null);
  const [heatmapAnalysis, setHeatmapAnalysis] = useState({});
  const [heatmapVideoUrl, setHeatmapVideoUrl] = useState(null);

  const fetchTaskResult = async (task_id) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/task_status/${task_id}`
      );
      console.log("Task Status:", response.data);
      if (response.data.state === "SUCCESS" && response.data.status) {
        const result = response.data.status;
        setOriginalWidth(result.original_width || 0);
        setOriginalHeight(result.original_height || 0);
        setPreprocessedWidth(result.preprocessed_width || 0);
        setPreprocessedHeight(result.preprocessed_height || 0);
        setDetections(result.results || []);
        
        // Always check useHeatmap flag first
        if (result.use_heatmap) {
          console.log("Heatmap was requested for this task");
          setUseHeatmap(true);
          
          // Set heatmap video URL if heatmap is enabled, even if we don't have frames yet
          if (task_id) {
            setHeatmapVideoUrl(`http://localhost:5000/stream_heatmap_video/${task_id}`);
            console.log(`Set heatmap video URL for task ${task_id}`);
          }
          
          // Set heatmap frames if available
          if (result.heatmap_frames && result.heatmap_frames.length > 0) {
            console.log(`Received ${result.heatmap_frames.length} heatmap frames`);
            setHeatmapFrames(result.heatmap_frames);
          } else {
            console.log("No heatmap frames available in result");
          }
          
          // Set heatmap analysis data if available
          if (result.heatmap_analysis) {
            console.log("Setting heatmap analysis data:", result.heatmap_analysis);
            setHeatmapAnalysis(result.heatmap_analysis);
          } else {
            console.log("No heatmap analysis data in result");
          }
        } else {
          // Make sure heatmap is disabled if not requested
          setUseHeatmap(false);
        }
        
        setProcessingStatus("Completed");
      } else if (
        response.data.state === "PENDING" ||
        response.data.state === "PROCESSING" ||
        response.data.state === "PROGRESS" 
      ) {
        const status = response.data.status || {};
        const progressText = status.percent ? `(${status.percent}%)` : '';
        const statusText = status.status || 'Processing...';
        setProcessingStatus(`${statusText} ${progressText}`);
      } else if (response.data.state === "FAILURE") {
        setProcessingStatus(`Failed: ${response.data.status}`);
      } else if (response.data.state === "REVOKED") {
        // Handle revoked tasks
        setProcessingStatus(`Task cancelled by user`);
        // Clear all data since the task was cancelled
        setDetections([]);
        setHeatmapFrames([]);
        setHeatmapAnalysis({});
        setHeatmapVideoUrl(null);
        // Stop polling for this task
        return false;
      }
    } catch (error) {
      console.error("Error fetching task result:", error);
      setProcessingStatus("Error fetching results.");
    }
  };

  useEffect(() => {
    let intervalId;
    if (taskID) {
      intervalId = setInterval(() => {
        // If fetchTaskResult returns false, it means we should stop polling
        const result = fetchTaskResult(taskID);
        if (result === false) {
          clearInterval(intervalId);
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskID]);

  useEffect(() => {
    if (taskID) {
      fetchTaskResult(taskID);
    }
  }, [taskID]);

  return {
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
    processingStatus,
    heatmapPath,
    heatmapFrames,
    useHeatmap,
    heatmapAnalysis,
    heatmapVideoUrl,
    setDetections,
  };
};

export default useDetections;
