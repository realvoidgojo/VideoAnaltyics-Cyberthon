// src/pages/TaskPage.jsx
import React from "react";
import VideoUpload from "../components/VideoUpload";
import ModelSelection from "../components/ModelSelection";
import ProcessingControls from "../components/ProcessingControls";
import FrameIntervalInput from "../components/FrameIntervalInput";
import ContainerWidthInput from "../components/ContainerWidthInput";

const TaskPage = ({
  handleVideoUpload,
  fileInputRef,
  selectedModel,
  setSelectedModel,
  onStartVideoProcessing,
  isProcessing,
  onResetAll,
  handleStopResume,
  isVideoPaused,
  hasVideoUploaded,
  frameInterval,
  setFrameInterval,
  containerWidth,
  setContainerWidth,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen text-center">
      <header className="bg-gray-900 text-white w-full h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl">Video Analytics - Task</h1>
        <div className="relative space-y-4">
          <VideoUpload onVideoUpload={handleVideoUpload} fileInputRef={fileInputRef} />
          <ModelSelection selectedModel={selectedModel} onModelChange={(e) => setSelectedModel(e.target.value)} />
          <ProcessingControls
            onStartProcessing={onStartVideoProcessing}
            isProcessing={isProcessing}
            onReset={onResetAll}
            onStopResume={handleStopResume}
            isVideoPaused={isVideoPaused}
            hasVideoUploaded={hasVideoUploaded}
          />
          <FrameIntervalInput frameInterval={frameInterval} setFrameInterval={setFrameInterval} />
          <ContainerWidthInput containerWidth={containerWidth} setContainerWidth={setContainerWidth} />
        </div>
      </header>
    </div>
  );
};

export default TaskPage;
