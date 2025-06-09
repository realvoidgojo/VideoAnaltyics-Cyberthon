import React from "react";
import { X, VideoIcon, Layers, Gauge, Thermometer } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import PropTypes from "prop-types";
import { useJobContext } from "../../context/JobContext";

const JobHeader = ({ job, onRemove }) => {  
  const { removeJob } = useJobContext();
  
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      removeJob(job.id);
    }
  };
  
  return (
    <div className="bg-gray-800 text-white px-6 py-5 flex justify-between items-center rounded-t-xl shadow-md">
      <div className="flex items-center min-w-0 flex-1">
        <div className="bg-gray-700 p-3 rounded-lg mr-4 shadow-inner flex-shrink-0">
          <VideoIcon className="h-6 w-6 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg text-white truncate">
            {job.selectedFile ? job.selectedFile.name : "Video Processing Job"}
          </h3>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge 
              variant="primary" 
              size="sm" 
              icon={<Layers className="h-3 w-3" />}
            >
              {job.selectedModel.replace(".pt", "")}
            </Badge>
            
            <Badge 
              variant="secondary" 
              size="sm"
              icon={<Gauge className="h-3 w-3" />}
            >
              Interval: {job.frameInterval}
            </Badge>
            
            {job.useHeatmap && (
              <Badge 
                variant="success" 
                size="sm"
                icon={<Thermometer className="h-3 w-3" />}
              >
                Heatmap Enabled
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="ml-4 flex-shrink-0">
        <Button
          variant="danger"
          size="sm"
          icon={<X className="h-4 w-4" />}
          onClick={handleRemove}
          aria-label="Remove Job"
          className="rounded-full p-2 transition-colors hover:bg-red-600"
        />
      </div>
    </div>
  );
};

JobHeader.propTypes = {
  job: PropTypes.shape({
    selectedFile: PropTypes.object,
    selectedModel: PropTypes.string.isRequired,
    frameInterval: PropTypes.number.isRequired,
    useHeatmap: PropTypes.bool,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default JobHeader;
