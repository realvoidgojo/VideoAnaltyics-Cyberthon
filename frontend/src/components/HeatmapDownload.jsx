// HeatmapDownload.jsx
import React from "react";

const HeatmapDownload = ({ heatmapPath }) => {
  if (!heatmapPath) {
    return null;
  }

  return (
    <div className="mt-4 mb-4 p-4 border border-green-500 rounded-lg bg-green-50">
      <h3 className="text-lg font-semibold text-green-800 mb-2">Heatmap Generated!</h3>
      <p className="text-sm text-green-700 mb-2">
        A heatmap video has been generated from your video, showing movement patterns.
      </p>
      <a
        href={heatmapPath}
        download
        className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
      >
        Download Heatmap Video
      </a>
    </div>
  );
};

export default HeatmapDownload;