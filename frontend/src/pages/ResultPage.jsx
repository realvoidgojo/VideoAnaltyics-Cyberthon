// src/pages/ResultPage.jsx
import React from "react";
import ClassColorCustomization from "../components/ClassColorCustomization";
import VideoCanvas from "../components/VideoCanvas";

const ResultPage = ({
  detections,
  classColors,
  handleClassColorChange,
  videoSource,
  originalWidth,
  originalHeight,
  preprocessedWidth,
  preprocessedHeight,
  containerWidth,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen text-center">
      <header className="bg-gray-900 text-white w-full h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl">Video Analytics - Result</h1>
        <div className="relative space-y-4">
          <ClassColorCustomization detections={detections} classColors={classColors} onClassColorChange={handleClassColorChange} />
          <VideoCanvas
            videoSource={videoSource}
            detections={detections}
            originalWidth={originalWidth}
            originalHeight={originalHeight}
            preprocessedWidth={preprocessedWidth}
            preprocessedHeight={preprocessedHeight}
            containerWidth={containerWidth}
            classColors={classColors}
          />
        </div>
      </header>
    </div>
  );
};

export default ResultPage;
