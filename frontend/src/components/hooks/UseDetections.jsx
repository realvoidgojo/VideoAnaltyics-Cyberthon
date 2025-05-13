// useDetections.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const useDetections = (taskID) => {
  // State for detection data
  const [objectFrequency, setObjectFrequency] = useState({});
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);

  // State for heatmap data
  const [useHeatmap, setUseHeatmap] = useState(false);
  const [heatmapVideoUrl, setHeatmapVideoUrl] = useState(null);
  const [heatmapAnalysis, setHeatmapAnalysis] = useState(null);

  // Processing state
  const [processingStatus, setProcessingStatus] = useState("Initializing");
  const [lastTaskID, setLastTaskID] = useState(null);

  // Clear all data when taskID changes
  useEffect(() => {
    if (taskID !== lastTaskID) {
      // Clear previous data when taskID changes
      setObjectFrequency({});
      setOriginalWidth(0);
      setOriginalHeight(0);
      setUseHeatmap(false);
      setHeatmapVideoUrl(null);
      setHeatmapAnalysis(null);
      setProcessingStatus("Initializing");
      setLastTaskID(taskID);
    }
  }, [taskID, lastTaskID]);

  // Fetch task results from the server
  useEffect(() => {
    if (!taskID) return;

    const fetchTaskResult = async () => {
      try {
        const response = await axios.get(`/get_server_side_status/${taskID}`);

        if (response.data.state === "SUCCESS" && response.data.status) {
          const result = response.data.status;

          // Set object frequency data if available
          if (result.object_frequency) {
            setObjectFrequency(result.object_frequency);
          }

          // Set dimensions
          setOriginalWidth(result.width || 0);
          setOriginalHeight(result.height || 0);

          // Check for heatmap data
          if (
            result.use_heatmap ||
            result.heatmap_analysis ||
            result.heatmap_hls_url ||
            result.heatmap_video_path
          ) {
            setUseHeatmap(true);

            // Set heatmap video URL - preferring HLS but falling back to direct stream
            if (result.heatmap_hls_url) {
              setHeatmapVideoUrl(result.heatmap_hls_url);
            } else if (result.heatmap_video_path) {
              setHeatmapVideoUrl(`/stream_heatmap_video/${taskID}`);
            }

            // Set heatmap analysis data
            if (result.heatmap_analysis) {
              setHeatmapAnalysis(result.heatmap_analysis);
            } else {
              // Try to fetch heatmap analysis specifically
              try {
                const analysisResponse = await axios.get(
                  `/get_heatmap_analysis/${taskID}`
                );
                if (
                  analysisResponse.data &&
                  typeof analysisResponse.data === "object"
                ) {
                  setHeatmapAnalysis(analysisResponse.data);
                }
              } catch (analysisError) {
                console.error(
                  "Error fetching heatmap analysis:",
                  analysisError
                );
              }
            }
          }

          setProcessingStatus("Completed");
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

    // Fetch immediately
    fetchTaskResult();

    // Then set up polling interval - but only if not in SUCCESS state
    const intervalId = setInterval(async () => {
      try {
        const statusResponse = await axios.get(`/task_status/${taskID}`);
        if (statusResponse.data.state === "SUCCESS") {
          fetchTaskResult(); // Fetch one last time to get final data
          clearInterval(intervalId); // Stop polling
        } else if (["FAILURE", "REVOKED"].includes(statusResponse.data.state)) {
          clearInterval(intervalId); // Stop polling on failure too
        } else {
          fetchTaskResult(); // Continue polling
        }
      } catch (error) {
        console.error("Error checking task status:", error);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [taskID]);

  return {
    objectFrequency,
    originalWidth,
    originalHeight,
    useHeatmap,
    heatmapVideoUrl,
    heatmapAnalysis,
    processingStatus,
  };
};

export default useDetections;
