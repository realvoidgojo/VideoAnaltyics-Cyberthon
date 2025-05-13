// HeatmapAnalysis.jsx
import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { Loader2, RefreshCw } from "lucide-react";

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return "N/A";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const HeatmapAnalysis = ({ heatmapData, taskID }) => {
  const [data, setData] = useState(heatmapData || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchAnalysisData = async () => {
    if (!taskID) return;

    try {
      setLoading(true);
      setError(null);

      // First try getting data from server-side status
      const statusResponse = await axios.get(
        `/get_server_side_status/${taskID}`
      );

      if (!mountedRef.current) return;

      if (
        statusResponse.data.state === "SUCCESS" &&
        statusResponse.data.status &&
        statusResponse.data.status.heatmap_analysis
      ) {
        setData(statusResponse.data.status.heatmap_analysis);
        setLoading(false);
        return;
      }

      // If not in server status, try dedicated endpoint
      const response = await axios.get(`/get_heatmap_analysis/${taskID}`);

      if (!mountedRef.current) return;

      if (response.data && typeof response.data === "object") {
        setData(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error("Error fetching heatmap analysis:", err);
        setError(err.message || "Failed to fetch analysis data");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Use provided data or fetch from API
  useEffect(() => {
    // If we have data from props, use it
    if (heatmapData && Object.keys(heatmapData).length > 0) {
      setData(heatmapData);
      return;
    }

    // Otherwise fetch data from API
    fetchAnalysisData();
  }, [heatmapData, taskID, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin h-6 w-6 text-blue-500 mr-2" />
          <span className="text-gray-600">Loading heatmap analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
        <h3 className="text-lg font-medium mb-2 text-gray-700">
          Heatmap Analysis
        </h3>
        <p className="text-red-500 mb-3">Error: {error}</p>
        <button
          onClick={handleRetry}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
        <h3 className="text-lg font-medium mb-2 text-gray-700">
          Heatmap Analysis
        </h3>
        <p className="text-gray-600">
          {taskID
            ? "Heatmap analysis is being processed. This may take a moment..."
            : "No heatmap analysis data available."}
        </p>
        {taskID && (
          <button
            onClick={handleRetry}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </button>
        )}
      </div>
    );
  }

  const {
    peak_movement_time = 0,
    average_intensity = 0,
    movement_duration = 0,
    total_duration = 0,
  } = data;

  return (
    <div className="p-5 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Peak Movement Time</p>
          <p className="text-xl font-semibold">
            {formatTime(peak_movement_time)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Average Movement Intensity</p>
          <p className="text-xl font-semibold">
            {average_intensity ? average_intensity.toFixed(2) + "%" : "N/A"}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Movement Duration</p>
          <p className="text-xl font-semibold">
            {formatTime(movement_duration)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Duration</p>
          <p className="text-xl font-semibold">{formatTime(total_duration)}</p>
        </div>
      </div>
    </div>
  );
};

HeatmapAnalysis.propTypes = {
  heatmapData: PropTypes.object,
  taskID: PropTypes.string,
};

export default HeatmapAnalysis;
