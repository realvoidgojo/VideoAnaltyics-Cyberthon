import React, { useState, useRef } from "react";
import { Plus, Trash2, Film } from "lucide-react";
import VideoUploadDialog from "../components/VideoUploadDialog";
import JobCard from "../components/JobCard";

const VideoDisplay = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState("yolov11n.pt");
  const [frameInterval, setFrameInterval] = useState(1);
  const [containerWidth, setContainerWidth] = useState(720);
  const [useHeatmap, setUseHeatmap] = useState(false);
  const fileInputRef = useRef(null);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const saveJobPreset = () => {
    if (!selectedFile) {
      alert("Please upload a video first!");
      return;
    }

    const newJob = {
      id: Date.now(),
      videoSource: URL.createObjectURL(selectedFile),
      selectedFile,
      selectedModel,
      frameInterval,
      containerWidth,
      useHeatmap,
      classColors: {},
      showHeatmap: false,
      heatmapFrames: [],
    };

    setJobs((prevJobs) => [...prevJobs, newJob]);
    setShowDialog(false);
  };

  const handleResetAll = () => {
    setJobs([]);
  };

  return (
    <div className="relative bg-gray-500 min-h-screen">
      {/* Header */}
      <Header
        onShowDialog={() => setShowDialog(true)}
        onResetAll={handleResetAll}
      />

      {/* Job Form Modal */}
      {showDialog && (
        <VideoUploadDialog
          onClose={() => setShowDialog(false)}
          onSave={saveJobPreset}
          selectedFile={selectedFile}
          selectedModel={selectedModel}
          frameInterval={frameInterval}
          containerWidth={containerWidth}
          useHeatmap={useHeatmap}
          onVideoUpload={handleVideoUpload}
          onModelChange={(e) => setSelectedModel(e.target.value)}
          setFrameInterval={setFrameInterval}
          setContainerWidth={setContainerWidth}
          setUseHeatmap={setUseHeatmap}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Jobs Container */}
      <JobsContainer
        jobs={jobs}
        setJobs={setJobs}
        onShowDialog={() => setShowDialog(true)}
      />
    </div>
  );
};

// Header component
const Header = ({ onShowDialog, onResetAll }) => (
  <div className="sticky top-0 z-10 bg-gray-500 p-5 shadow-lg border-b border-gray-200">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <h1 className="text-2xl px-4 font-bold text-white">
        CCTV Analytics Dashboard
      </h1>
      <div className="flex space-x-3">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
          onClick={onShowDialog}
        >
          <Plus className="h-5 w-5 mr-2" />
          New Job
        </button>
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors duration-200 shadow-md"
          onClick={onResetAll}
        >
          <Trash2 className="h-5 w-5 mr-2" />
          Reset All
        </button>
      </div>
    </div>
  </div>
);

// Jobs Container component
const JobsContainer = ({ jobs, setJobs, onShowDialog }) => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    {jobs.length === 0 ? (
      <EmptyJobsView onShowDialog={onShowDialog} />
    ) : (
      <div className="grid grid-cols-1 gap-8">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} setJobs={setJobs} />
        ))}
      </div>
    )}
  </div>
);

// Empty state component
const EmptyJobsView = ({ onShowDialog }) => (
  <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-10 text-center">
    <Film className="h-16 w-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-medium text-gray-700 mb-2">No Jobs Yet</h3>
    <p className="text-gray-500 mb-6">
      Click the "New Job" button to create your first video analysis job.
    </p>
    <button
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors duration-200"
      onClick={onShowDialog}
    >
      <Plus className="h-5 w-5 mr-2" />
      Create New Job
    </button>
  </div>
);

export default VideoDisplay;
