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
  const [objectFrequency, setObjectFrequency] = useState({});

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
        
        // Calculate object frequency
        if (result.results && result.results.length > 0) {
          const counts = {};
          result.results.forEach(frame => {
            frame.forEach(detection => {
              const className = detection.class_name;
              counts[className] = (counts[className] || 0) + 1;
            });
          });
          setObjectFrequency(counts);
          console.log("Object frequency calculated:", counts);
        }
        
        // Always check useHeatmap flag first
        if (result.use_heatmap) {
          console.log("Heatmap was requested for this task");
          setUseHeatmap(true);
          
          // Set heatmap video URL if heatmap is enabled, even if we don't have frames yet
          if (task_id) {
            setHeatmapVideoUrl(`http://localhost:5000/stream_heatmap_video/${task_id}`);
            console.log(`Set heatmap video URL for task ${task_id}`);
          }
          
          // Check if heatmap frames are available
          if (result.heatmap_frames && result.heatmap_frames.length > 0) {
            console.log(`Received ${result.heatmap_frames.length} heatmap frames`);
            setHeatmapFrames(result.heatmap_frames);
          }
          
          // Check if heatmap analysis data is available
          if (result.heatmap_analysis) {
            console.log("Setting heatmap analysis data:", result.heatmap_analysis);
            setHeatmapAnalysis(result.heatmap_analysis);
          }
        }
        
        setProcessingStatus("Completed");
      } else if (response.data.state === "PROGRESS" && response.data.status) {
        setProcessingStatus(response.data.status.status || "Processing...");
        
        // Check if we have partial results
        if (response.data.status.results) {
          setDetections(response.data.status.results || []);
          
          // Calculate partial object frequency
          if (response.data.status.results.length > 0) {
            const counts = {};
            response.data.status.results.forEach(frame => {
              frame.forEach(detection => {
                const className = detection.class_name;
                counts[className] = (counts[className] || 0) + 1;
              });
            });
            setObjectFrequency(counts);
          }
        }
        
        // Check if we have partial heatmap data
        if (response.data.status.use_heatmap) {
          setUseHeatmap(true);
          
          if (task_id) {
            setHeatmapVideoUrl(`http://localhost:5000/stream_heatmap_video/${task_id}`);
          }
          
          if (response.data.status.heatmap_frames) {
            setHeatmapFrames(response.data.status.heatmap_frames);
          }
          
          if (response.data.status.heatmap_analysis) {
            setHeatmapAnalysis(response.data.status.heatmap_analysis);
          }
        }
      } else if (response.data.state === "FAILURE") {
        setProcessingStatus(`Error: ${response.data.status}`);
      } else if (response.data.state === "REVOKED") {
        setProcessingStatus("Task was cancelled");
      } else {
        setProcessingStatus(`Status: ${response.data.state}`);
      }
    } catch (error) {
      console.error("Error fetching task result:", error);
      setProcessingStatus(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!taskID) return;

    // Initial fetch
    fetchTaskResult(taskID);

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchTaskResult(taskID);
    }, 2000); // Poll every 2 seconds

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [taskID]);

  return {
    detections,
    originalWidth,
    originalHeight,
    preprocessedWidth,
    preprocessedHeight,
    processingStatus,
    heatmapFrames,
    useHeatmap,
    heatmapPath,
    heatmapAnalysis,
    heatmapVideoUrl,
    objectFrequency,
  };
};

export default useDetections;
