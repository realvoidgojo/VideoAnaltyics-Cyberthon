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
        setProcessingStatus("Completed");
      } else if (
        response.data.state === "PENDING" ||
        response.data.state === "PROCESSING"
      ) {
        setProcessingStatus("Processing...");
      } else if (response.data.state === "FAILURE") {
        setProcessingStatus(`Failed: ${response.data.status}`);
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
        fetchTaskResult(taskID);
      }, 2000);
    }
    return () => clearInterval(intervalId);
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
    setDetections,
  };
};

export default useDetections;
