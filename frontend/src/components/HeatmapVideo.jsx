// HeatmapVideo.jsx
import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import videojs from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";

const HeatmapVideo = ({ taskID, containerWidth, visible }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState("");
  const [playerInitialized, setPlayerInitialized] = useState(false);
  
  // Fetch video info when taskID changes or becomes visible
  useEffect(() => {
    if (!taskID || !visible) return;
    
    const fetchVideoInfo = async () => {
      try {
        setIsLoading(true);
        setVideoError(false);
        setErrorDetails("");
        
        const response = await axios.get(`/get_heatmap_video_info/${taskID}`);
        console.log("Video info:", response.data);
        setVideoInfo(response.data);
      } catch (error) {
        console.error("Error fetching video info:", error);
        setVideoError(true);
        setErrorDetails(error.response?.data?.error || "Failed to fetch video information");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVideoInfo();
    
    // Cleanup function
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
          playerRef.current = null;
          setPlayerInitialized(false);
        } catch (e) {
          console.error("Error disposing player:", e);
        }
      }
    };
  }, [taskID, visible]);
  
  // Initialize video.js player when video info is available
  useEffect(() => {
    if (!videoInfo || !visible || playerInitialized) return;
    
    const initializePlayer = () => {
      try {
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
        
        if (!videoRef.current) return;
        
        console.log("Initializing video.js player with options:", {
          hls: videoInfo.hls_url,
          direct: videoInfo.stream_url
        });
        
        const playerOptions = {
          autoplay: false,
          controls: true,
          responsive: true,
          fluid: true,
          html5: {
            vhs: {
              overrideNative: true,
              limitRenditionByPlayerDimensions: false,
              smoothQualityChange: true,
              handlePartialData: true
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false
          },
          sources: []
        };
        
        // Prefer HLS if available
        if (videoInfo.hls_url) {
          playerOptions.sources.push({
            src: videoInfo.hls_url,
            type: 'application/x-mpegURL'
          });
        } else {
          playerOptions.sources.push({
            src: videoInfo.stream_url,
            type: videoInfo.mime_type
          });
        }
        
        const player = videojs(videoRef.current, playerOptions, function onPlayerReady() {
          console.log('Player is ready');
        });
        
        player.on('error', function(e) {
          console.error('Video.js player error:', player.error());
          
          // If HLS fails, try falling back to direct stream
          if (videoInfo.hls_url && player.error().code === 4) {
            console.log("HLS playback failed, falling back to direct stream");
            player.src({
              src: videoInfo.stream_url,
              type: videoInfo.mime_type
            });
            player.load();
            player.play();
          } else {
            setVideoError(true);
            setErrorDetails(`Player error: ${player.error().message}`);
          }
        });
        
        // Add debugging events
        player.on('loadstart', () => console.log('Video loadstart event fired'));
        player.on('loadedmetadata', () => console.log('Video loadedmetadata event fired'));
        player.on('loadeddata', () => console.log('Video loadeddata event fired'));
        player.on('play', () => console.log('Video play event fired'));
        player.on('playing', () => console.log('Video playing event fired'));
        player.on('waiting', () => console.log('Video waiting event fired'));
        
        playerRef.current = player;
        setPlayerInitialized(true);
      } catch (error) {
        console.error("Error initializing video player:", error);
        setVideoError(true);
        setErrorDetails(`Failed to initialize video player: ${error.message}`);
      }
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(initializePlayer, 100);
    
  }, [videoInfo, visible, playerInitialized]);
  
  // Update player dimensions when containerWidth changes
  useEffect(() => {
    if (!playerRef.current || !containerWidth) return;
    
    try {
      playerRef.current.width(containerWidth);
      const aspectRatio = 9/16; // Assuming 16:9 aspect ratio
      playerRef.current.height(containerWidth * aspectRatio);
    } catch (e) {
      console.error("Error updating player dimensions:", e);
    }
  }, [containerWidth]);
  
  if (!visible) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-700">Loading heatmap video...</span>
      </div>
    );
  }
  
  if (videoError) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        <h3 className="font-bold">Error Loading Heatmap Video</h3>
        <p>{errorDetails || "An unknown error occurred while loading the heatmap video."}</p>
        <div className="mt-2">
          <a 
            href={videoInfo?.stream_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Open in external player
          </a>
          {" | "}
          <a 
            href={`/download_heatmap_video/${taskID}`}
            className="text-blue-600 hover:underline"
          >
            Download video
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-xl font-semibold mb-2 text-gray-900">Heatmap Video</h3>
      <div className="relative rounded-lg overflow-hidden" style={{ width: `${containerWidth}px` }}>
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-default-skin vjs-big-play-centered"
            controls
            preload="auto"
            width={containerWidth}
            height={containerWidth * (9/16)}
          ></video>
        </div>
      </div>
      {videoInfo && (
        <div className="mt-2 text-sm text-gray-600">
          <p>
            Can't see the video? Try{" "}
            <a 
              href={`/download_heatmap_video/${taskID}`}
              className="text-blue-600 hover:underline"
            >
              downloading it
            </a>
            {" or "}
            <a 
              href={videoInfo.stream_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              opening in an external player
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

HeatmapVideo.propTypes = {
  taskID: PropTypes.string,
  containerWidth: PropTypes.number,
  visible: PropTypes.bool,
};

HeatmapVideo.defaultProps = {
  containerWidth: 720,
  visible: true,
};

export default HeatmapVideo;