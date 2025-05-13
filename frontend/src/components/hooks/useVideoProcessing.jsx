// useVideoProcessing.jsx
import { useState } from "react";

const useVideoProcessing = () => {
  // We only need minimal state for UI indication
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskID, setTaskID] = useState(null);
  const [useHeatmap, setUseHeatmap] = useState(false);

  const handleReset = () => {
    setTaskID(null);
    setIsProcessing(false);
  };

  return {
    isProcessing,
    taskID,
    useHeatmap,
    setUseHeatmap,
    handleReset,
    setTaskID,
  };
};

export default useVideoProcessing;
