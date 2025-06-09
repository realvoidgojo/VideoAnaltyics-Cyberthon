import React, { useEffect, useState, useRef } from "react";
import ObjectFrequencyChart from "./ObjectFrequencyChart";
import axios from "axios";
import PropTypes from "prop-types";
import { Loader2, RefreshCw } from "lucide-react";

const DetectionStatistics = ({ taskID }) => {
  const [objectFrequency, setObjectFrequency] = useState({});
  const [totalObjects, setTotalObjects] = useState(0);
  const [mostFrequentClass, setMostFrequentClass] = useState("");
  const [maxCount, setMaxCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const pollingIntervalRef = useRef(null);
  const dataFetchedRef = useRef(false);
  const mountedRef = useRef(true);

  // Fetch statistics from the server
  useEffect(() => {
    // Cleanup function to set mounted to false when component unmounts
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!taskID) {
      setIsLoading(false);
      return;
    }

    // Don't fetch if we already have data
    if (dataFetchedRef.current && hasLoadedData) {
      return;
    }

    dataFetchedRef.current = true;

    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await axios.get(`/get_server_side_status/${taskID}`);

        // Don't update state if component is unmounted
        if (!mountedRef.current) return;

        if (response.data.state === "SUCCESS" && response.data.status) {
          // Check if object_frequency is available in the response
          if (response.data.status.object_frequency) {
            const frequency = response.data.status.object_frequency;
            setObjectFrequency(frequency);

            // Calculate total objects
            const totalCount =
              response.data.status.unique_object_count ||
              Object.values(frequency).reduce((sum, count) => sum + count, 0);
            setTotalObjects(totalCount);

            // Find most frequent class
            let mostFrequent = "";
            let maxFrequency = 0;

            Object.entries(frequency).forEach(([className, count]) => {
              if (count > maxFrequency) {
                mostFrequent = className;
                maxFrequency = count;
              }
            });

            setMostFrequentClass(mostFrequent);
            setMaxCount(maxFrequency);
            setHasLoadedData(true);

            // Cancel polling if we got successful data
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
          } else {
            setError("No detection frequency data available");
          }
        } else if (response.data.state === "FAILURE") {
          setError(`Error: ${response.data.status}`);
        } else if (
          response.data.state === "PENDING" ||
          response.data.state === "PROGRESS"
        ) {
          setError(null);
        } else {
          setError("Unexpected response from server");
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setError(`Error fetching statistics: ${error.message}`);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStatistics();

    // Set up polling for updates, but only if we don't have data yet
    if (!hasLoadedData) {
      pollingIntervalRef.current = setInterval(fetchStatistics, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [taskID, hasLoadedData]);

  const handleRefresh = () => {
    dataFetchedRef.current = false;
    setHasLoadedData(false);
    setIsLoading(true);
    // The useEffect will automatically fetch new data
  };

  if (isLoading && !hasLoadedData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-4" />
          <p className="text-gray-600 text-center font-medium">
            Loading detection statistics...
          </p>
          <p className="text-gray-400 text-sm text-center mt-2">
            This may take a moment for large videos
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-700 mb-2">
            Error Loading Statistics
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (Object.keys(objectFrequency).length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600">No detection data available</p>
          <button
            onClick={handleRefresh}
            className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Detection Overview
          </h3>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-100"
            title="Refresh statistics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Total Unique Objects
            </h4>
            <p className="text-2xl font-bold text-blue-600">{totalObjects}</p>
          </div>

          <div className="bg-green-50 p-5 rounded-lg border border-green-100">
            <h4 className="text-sm font-medium text-green-800 mb-2">Unique Classes</h4>
            <p className="text-2xl font-bold text-green-600">
              {Object.keys(objectFrequency).length}
            </p>
          </div>

          <div className="bg-purple-50 p-5 rounded-lg border border-purple-100 sm:col-span-2 lg:col-span-1">
            <h4 className="text-sm font-medium text-purple-800 mb-2">Most Frequent</h4>
            <p className="text-2xl font-bold text-purple-600">
              {mostFrequentClass ? `${mostFrequentClass} (${maxCount})` : "None"}
            </p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="mb-8">
          <ObjectFrequencyChart objectCounts={objectFrequency} />
        </div>

        {/* Detailed Table */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-gray-800">
            Detailed Counts
          </h4>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left text-sm font-semibold text-gray-700 px-4 py-3">
                      Object Class
                    </th>
                    <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3">
                      Count
                    </th>
                    <th className="text-right text-sm font-semibold text-gray-700 px-4 py-3">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(objectFrequency)
                    .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
                    .map(([className, count], index) => (
                      <tr key={className} className={`${index !== Object.keys(objectFrequency).length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{className}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {count}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {((count / totalObjects) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

DetectionStatistics.propTypes = {
  taskID: PropTypes.string.isRequired,
};

export default DetectionStatistics;
