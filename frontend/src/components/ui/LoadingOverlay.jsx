import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ message = 'Processing...', showSpinner = true }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-4">
        {showSpinner && (
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        )}
        <div>
          <p className="text-gray-700 font-medium">{message}</p>
          <p className="text-gray-500 text-sm mt-1">
            This may take several minutes depending on video size
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;