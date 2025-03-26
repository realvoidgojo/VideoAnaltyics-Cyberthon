import React from 'react';
import ObjectFrequencyChart from './ObjectFrequencyChart';

// Remove objectFrequency from props, we'll calculate it internally
const DetectionStatistics = ({ detections }) => {
  // Calculate object frequency
  const objectFrequency = {};
  if (detections && detections.length > 0) {
    detections.forEach(frame => {
      frame.forEach(detection => {
        const className = detection.class_name;
        objectFrequency[className] = (objectFrequency[className] || 0) + 1;
      });
    });
  }

  // Calculate total objects detected
  const totalObjects = Object.values(objectFrequency).reduce((sum, count) => sum + count, 0);
  
  // Get the most frequent object class
  let mostFrequentClass = '';
  let maxCount = 0;
  
  Object.entries(objectFrequency).forEach(([className, count]) => {
    if (count > maxCount) {
      mostFrequentClass = className;
      maxCount = count;
    }
  });

  // Rest of the component remains the same
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Detection Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Objects</h3>
          <p className="text-2xl font-bold text-blue-600">{totalObjects}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Unique Classes</h3>
          <p className="text-2xl font-bold text-green-600">{Object.keys(objectFrequency).length}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800">Most Frequent</h3>
          <p className="text-2xl font-bold text-purple-600">
            {mostFrequentClass ? `${mostFrequentClass} (${maxCount})` : 'None'}
          </p>
        </div>
      </div>
      
      <ObjectFrequencyChart detections={detections} />
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2 text-gray-800">Detailed Counts</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-gray-700 py-2">Object Class</th>
                <th className="text-right text-sm font-medium text-gray-700 py-2">Count</th>
                <th className="text-right text-sm font-medium text-gray-700 py-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(objectFrequency)
                .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
                .map(([className, count]) => (
                  <tr key={className} className="border-t border-gray-200">
                    <td className="py-2 text-sm text-gray-900">{className}</td>
                    <td className="py-2 text-sm text-right text-gray-900">{count}</td>
                    <td className="py-2 text-sm text-right text-gray-900">
                      {totalObjects > 0 ? `${((count / totalObjects) * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetectionStatistics;