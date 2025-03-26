// useVideoProcessing.jsx
import { useState } from "react";
import axios from "axios";

const useVideoProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [taskID, setTaskID] = useState(null);
  const [useHeatmap, setUseHeatmap] = useState(false);

  const showNotification = (message) => {
    const notification = document.createElement("div");
    notification.className =
      "fixed bottom-4 right-4 bg-blue-100 text-blue-700 p-4 rounded-lg shadow-lg";
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 5000);
  };

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
        "/process_video", // <-- Changed to relative URL to work with proxy
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

      // Show notification without affecting the isProcessing state
      showNotification(
        "Processing started in background with task ID: " +
          response.data.task_id +
          (useHeatmapValue ? " (with heatmap analysis)" : "")
      );

      // IMPORTANT: Don't set isProcessing to false here!
      // The progress bar should remain visible and update as processing continues
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please check the console for details.");
      // Only set isProcessing to false if there's an error
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (taskID) {
      try {
        await axios.post("http://localhost:5000/reset_processing", {
          task_id: taskID,
        });
        // Don't reset state here - wait for the task status polling to detect REVOKED state
        console.log(`Reset signal sent for task ${taskID}`);
      } catch (error) {
        console.error("Error sending reset signal:", error);
        alert("Error cancelling task. Please try again.");
      }
    } else {
      // If no task is running, just reset the UI state
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
