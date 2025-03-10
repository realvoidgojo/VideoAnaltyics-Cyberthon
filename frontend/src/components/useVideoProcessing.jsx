// useVideoProcessing.jsx
import { useState } from "react";
import axios from "axios";

const useVideoProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [taskID, setTaskID] = useState(null);

  const handleStartProcessing = async (
    selectedFile,
    selectedModel,
    frameInterval
  ) => {
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("model", selectedModel);
    formData.append("interval", frameInterval);

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
      alert(
        "Processing started in background with task ID: " +
          response.data.task_id
      );
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please check the console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    // Send signal to backend to skip current processing
    try {
      await axios.post("http://localhost:5000/reset_processing");
      console.log("Processing reset signal sent to the backend.");
    } catch (error) {
      console.error("Error sending reset signal:", error);
    }
    setTaskID(null);
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
    handleStartProcessing,
    handleReset,
    handleStopResume,
    setIsVideoPaused,
    setTaskID,
  };
};

export default useVideoProcessing;
