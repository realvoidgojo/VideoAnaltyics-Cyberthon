// useVideoProcessing.jsx
import { useState } from "react";
import axios from "axios";

const useVideoProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [taskID, setTaskID] = useState(null);
  const [useHeatmap, setUseHeatmap] = useState(false);

  const handleStartProcessing = async (
    selectedFile,
    selectedModel,
    frameInterval,
    useHeatmapValue
  ) => {
    setIsProcessing(true);
    // Update local state to match what's being sent
    setUseHeatmap(useHeatmapValue);

    // Convert frameInterval to integer and ensure it's a valid number
    const interval = parseInt(frameInterval, 10) || 1;

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("model", selectedModel);
    formData.append("interval", interval);
    formData.append("use_heatmap", useHeatmapValue ? "true" : "false");

    try {
      const response = await axios.post(
        "http://localhost:5000/process_video",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setTaskID(response.data.task_id);
      console.log("Task ID:", response.data.task_id);
      console.log("Heatmap enabled:", useHeatmapValue);
      alert(
        "Processing started in background with task ID: " +
          response.data.task_id +
          (useHeatmapValue ? " (with heatmap analysis)" : "")
      );
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    // Send signal to backend to stop the current task and reset processing
    if (taskID) {
      try {
        // Set processing to true to indicate operation in progress
        setIsProcessing(true);
        
        const response = await axios.post(
          "http://localhost:5000/reset_processing",
          {
            task_id: taskID,
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`Processing reset signal sent to the backend for task ${taskID}.`);
        console.log(`Response:`, response.data);
        
        // Force UI to return to idle state
        alert(`Task ${taskID} was cancelled by user.`);
        
        // We don't need to do anything else here since the backend will update the task state
        // The next time useDetections polls for the task status, it will see the REVOKED state
      } catch (error) {
        console.error("Error sending reset signal:", error);
        alert("Error cancelling task. Please try again.");
      } finally {
        // Always reset the state
        setTaskID(null);
        setIsProcessing(false);
        setIsVideoPaused(false);
      }
    } else {
      // Even if no task is running, reset the UI state
      setTaskID(null);
      setIsProcessing(false);
      setIsVideoPaused(false);
    }
  };

  const pauseVideoProcessing = async () => {
    try {
      await axios.post("http://localhost:5000/pause_processing");
      console.log("Video processing paused on the backend.");
    } catch (error) {
      console.error("Error pausing video processing:", error);
    }
  };

  const resumeVideoProcessing = async () => {
    try {
      await axios.post("http://localhost:5000/resume_processing");
      console.log("Video processing resumed on the backend.");
    } catch (error) {
      console.error("Error resuming video processing:", error);
    }
  };

  const handleStopResume = () => {
    if (isVideoPaused) {
      resumeVideoProcessing();
    } else {
      pauseVideoProcessing();
    }
    setIsVideoPaused(!isVideoPaused);
  };

  return {
    isProcessing,
    isVideoPaused,
    taskID,
    useHeatmap,
    setUseHeatmap,
    handleStartProcessing,
    handleReset,
    handleStopResume,
    setIsVideoPaused,
    setTaskID,
  };
};

export default useVideoProcessing;
