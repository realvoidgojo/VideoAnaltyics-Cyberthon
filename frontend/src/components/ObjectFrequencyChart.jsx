import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ObjectFrequencyChart = ({ detections }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    if (!detections || detections.length === 0) return;

    // Count frequency of each object class
    const objectCounts = {};
    
    // Process all frames
    detections.forEach(frame => {
      // Process all detections in this frame
      frame.forEach(detection => {
        const className = detection.class_name;
        if (objectCounts[className]) {
          objectCounts[className]++;
        } else {
          objectCounts[className] = 1;
        }
      });
    });

    // Prepare data for Chart.js
    const labels = Object.keys(objectCounts);
    const data = Object.values(objectCounts);
    
    // Generate random colors for each class
    const backgroundColors = labels.map(() => 
      `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
    );
    
    setChartData({
      labels,
      datasets: [
        {
          label: 'Object Frequency',
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
          borderWidth: 1,
        },
      ],
    });
  }, [detections]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Detected Object Classes Frequency',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Count: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count',
        },
        ticks: {
          precision: 0,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Object Class',
        },
      },
    },
  };

  if (chartData.labels.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 mt-4">
        <p className="text-gray-500 text-center">No detection data available for chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ObjectFrequencyChart;