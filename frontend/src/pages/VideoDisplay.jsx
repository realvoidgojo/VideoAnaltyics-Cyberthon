import React, { useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Film,
  AlertCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import VideoUploadDialog from "../components/video/VideoUploadDialog";
import JobCard from "../components/ui/JobCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useJobContext, JobProvider } from "../context/JobContext";

// Dashboard component to show analytics overview
const DashboardOverview = ({ jobs }) => {
  if (jobs.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-fadeIn">
      <Card className="bg-white shadow-md overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
            Analytics Overview
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              Total Jobs
            </h3>
            <p className="text-2xl font-bold text-blue-600">{jobs.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              Heatmap Enabled
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {jobs.filter((job) => job.useHeatmap).length}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              Latest Job
            </h3>
            <p className="text-lg font-medium text-purple-600 truncate">
              {jobs[jobs.length - 1]?.selectedFile?.name || "N/A"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Main component that uses the JobContext
const VideoDisplayContent = () => {
  const {
    jobs,
    error,
    setError,
    showDialog,
    setShowDialog,
    selectedFile,
    selectedModel,
    frameInterval,
    containerWidth,
    useHeatmap,
    handleVideoUpload,
    saveJobPreset,
    handleResetAll,
    isLoading,
    setFrameInterval, // Add this setter
    setContainerWidth, // Add this setter
    setUseHeatmap, // Add this setter
    setSelectedModel, // Add this setter if needed
  } = useJobContext();

  const fileInputRef = useRef(null);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  // Scroll to top when a new job is added
  useEffect(() => {
    if (jobs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [jobs.length]);

  return (
    <div className="relative bg-gray-100 min-h-screen">
      {/* Header */}
      <Header
        onShowDialog={() => setShowDialog(true)}
        onResetAll={handleResetAll}
        jobCount={jobs.length}
        isLoading={isLoading}
      />

      {/* Error Message - with animation */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2 mt-2">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center animate-fadeIn">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
            <button
              className="ml-auto text-red-500 hover:text-red-700 transition-colors"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Overview */}
      <DashboardOverview jobs={jobs} />

      {/* Job Form Modal */}
      {showDialog && (
        <VideoUploadDialog
          onClose={() => {
            setShowDialog(false);
            setError(null);
          }}
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
          isLoading={isLoading}
        />
      )}

      {/* Jobs Container */}
      <JobsContainer jobs={jobs} onShowDialog={() => setShowDialog(true)} />

      {/* Loading Overlay - shows when isLoading is true */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex items-center">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-3" />
            <p className="text-gray-700 font-medium">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Header component
const Header = ({
  onShowDialog,
  onResetAll,
  jobCount = 0,
  isLoading = false,
}) => (
  <div className="sticky top-0 z-10 bg-gray-800 p-4 shadow-lg">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
      <div className="flex items-center mb-4 sm:mb-0">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Film className="h-6 w-6 mr-2 text-blue-400" />
          CCTV Analytics Dashboard
        </h1>
        {jobCount > 0 && (
          <Badge variant="primary" size="sm" className="ml-3">
            {jobCount} {jobCount === 1 ? "Job" : "Jobs"}
          </Badge>
        )}
      </div>
      <div className="flex space-x-3">
        <Button
          variant="primary"
          icon={<Plus className="h-5 w-5" />}
          onClick={onShowDialog}
          disabled={isLoading}
          className="transition-all duration-300 hover:shadow-lg"
        >
          New Job
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 className="h-5 w-5" />}
          onClick={onResetAll}
          disabled={jobCount === 0 || isLoading}
          className="transition-all duration-300 hover:shadow-lg"
        >
          Reset All
        </Button>
      </div>
    </div>
  </div>
);

// Jobs Container component
const JobsContainer = ({ jobs, onShowDialog }) => (
  <div className="w-full max-w-7xl mx-auto px-4 py-8">
    {" "}
    {/* Increased from max-w-6xl to max-w-7xl */}
    {jobs.length === 0 ? (
      <EmptyJobsView onShowDialog={onShowDialog} />
    ) : (
      <div className="grid grid-cols-1 gap-8 animate-fadeIn">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    )}
  </div>
);

// Empty state component
const EmptyJobsView = ({ onShowDialog }) => (
  <Card
    className="justify-center flex flex-col items-center min-h-[60vh] p-10 text-center animate-fadeIn bg-white rounded-2xl shadow-md"
    variant="default"
  >
    <div className="flex justify-center items-center w-full">
      <div className="relative bg-blue-100 p-6 rounded-full mb-6 flex justify-center items-center">
        <Film className="h-14 w-14 text-blue-500" />
      </div>
    </div>

    <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Jobs Yet</h3>

    <p className="text-gray-600 mb-6 max-w-sm text-sm leading-relaxed">
      Get started by creating your first video analysis job. Upload a video and
      configure the processing parameters to begin detecting objects.
    </p>

    <div className="flex justify-center items-center w-full">
      <Button
        variant="primary"
        size="lg"
        icon={<Plus className="h-5 w-5" />}
        onClick={onShowDialog}
        className="px-6 py-3 text-sm font-medium"
      >
        Create New Job
      </Button>
    </div>
  </Card>
);

// Export the VideoDisplayContent as the main component
const VideoDisplay = VideoDisplayContent;

export default VideoDisplay;
