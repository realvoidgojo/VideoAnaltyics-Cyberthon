import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

// Create the context
const JobContext = createContext();

// Custom hook to use the job context
export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error("useJobContext must be used within a JobProvider");
  }
  return context;
};

// Provider component
export const JobProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("yolov11n.pt");
  const [frameInterval, setFrameInterval] = useState(5); // Default value
  const [useHeatmap, setUseHeatmap] = useState(false);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const saveJobPreset = async (
    selectedFile,
    selectedModel,
    frameInterval,
    containerWidth, // Still accept it for compatibility but use default
    useHeatmap
  ) => {
    try {
      setIsLoading(true);

      // Use default container width for consistency
      const defaultContainerWidth = 720;

      // Create a new job
      const newJob = {
        id: uuidv4(),
        selectedFile,
        selectedModel,
        frameInterval,
        containerWidth: defaultContainerWidth, // Always use default
        useHeatmap,
        videoSource: selectedFile ? URL.createObjectURL(selectedFile) : null,
        showHeatmap: false,
        heatmapNotified: false,
        classColors: {},
        useServerRendering: true, // Always use server-side rendering
      };

      // Process video using server-side rendering
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("model", selectedModel);
      formData.append("interval", frameInterval);
      formData.append("use_heatmap", useHeatmap ? "true" : "false");

      const response = await axios.post(
        "/process_video_server_side",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update job with task ID for server-side processing
      newJob.serverTaskId = response.data.task_id;
      newJob.serverStreamUrl = response.data.stream_url;

      // Add it to jobs list
      setJobs((prevJobs) => [newJob, ...prevJobs]);

      // Reset selection for next job
      setSelectedFile(null);
      setSelectedModel("yolov11n.pt");
      setFrameInterval(5);
      setUseHeatmap(false);
    } catch (error) {
      console.error("Error processing video:", error);
      setError("Error processing video. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAll = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all jobs? This action cannot be undone."
      )
    ) {
      setJobs([]);
    }
  };

  const removeJob = (jobId) => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
  };

  const updateJob = (jobId, updates) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  const toggleHeatmapView = (jobId) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id === jobId) {
          return { ...job, showHeatmap: !job.showHeatmap };
        }
        return job;
      })
    );
  };

  const contextValue = {
    jobs,
    setJobs,
    error,
    setError,
    showDialog,
    setShowDialog,
    selectedFile,
    setSelectedFile,
    selectedModel,
    setSelectedModel,
    frameInterval,
    setFrameInterval,
    useHeatmap,
    setUseHeatmap,
    handleVideoUpload,
    saveJobPreset,
    handleResetAll,
    removeJob,
    toggleHeatmapView,
    updateJob,
    isLoading,
    setIsLoading,
  };

  return (
    <JobContext.Provider value={contextValue}>{children}</JobContext.Provider>
  );
};
