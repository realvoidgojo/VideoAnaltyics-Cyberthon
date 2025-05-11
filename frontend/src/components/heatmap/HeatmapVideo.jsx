import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import videojs from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";
import { ArrowUpRightFromSquare } from "lucide-react";

const HeatmapVideo = ({ taskID, containerWidth, visible }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);

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
        setErrorDetails(
          error.response?.data?.error || "Failed to fetch video information"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoInfo();

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  }, [taskID, visible]);

  useEffect(() => {
    if (!videoInfo || !visible || !videoRef.current) return;

    // Make sure DOM is fully rendered before initializing player
    const timer = setTimeout(() => {
      initializePlayer();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  }, [videoInfo, visible]);

  const initializePlayer = () => {
    if (!videoRef.current || !videoInfo) return;

    // Clean up previous player instance if it exists
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const options = {
      controls: true,
      autoplay: false,
      muted: true,
      preload: "auto",
      responsive: true,
      fluid: true,
      fill: true, // Make player fill the container
      aspectRatio: "16:9", // Set a standard aspect ratio
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          handleManifestRedirects: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: videoInfo.hls_url
        ? [
            {
              src: videoInfo.hls_url,
              type: "application/x-mpegURL",
            },
          ]
        : [
            {
              src: videoInfo.stream_url,
              type: videoInfo.mime_type,
            },
          ],
    };

    try {
      // Initialize video.js player
      playerRef.current = videojs(videoRef.current, options);

      // Handle errors
      playerRef.current.on("error", () => {
        console.error("Video.js player error:", playerRef.current.error());
        if (videoInfo.hls_url && playerRef.current.error().code === 4) {
          console.log("HLS playback failed, falling back to direct stream");
          playerRef.current.src({
            src: videoInfo.stream_url,
            type: videoInfo.mime_type,
          });
          playerRef.current.load();
        } else {
          setVideoError(true);
          setErrorDetails(`Player error: ${playerRef.current.error().message}`);
        }
      });

      // Log when the player is ready
      playerRef.current.ready(function () {
        console.log("Player is ready");
        setIsPlayerReady(true);
      });

      // Add debugging events
      playerRef.current.on("loadstart", () =>
        console.log("Video loadstart event fired")
      );
      playerRef.current.on("loadedmetadata", () =>
        console.log("Video loadedmetadata event fired")
      );
      playerRef.current.on("loadeddata", () =>
        console.log("Video loadeddata event fired")
      );
    } catch (error) {
      console.error("Error initializing video player:", error);
      setVideoError(true);
      setErrorDetails(`Failed to initialize video player: ${error.message}`);
    }
  };

  const openInExternalPlayer = () => {
    if (videoInfo) {
      window.open(videoInfo.stream_url, "_blank");
    }
  };

  if (!visible) return null;

  return (
    <div className="video-container relative space-y-4 w-full">
      <div className="w-full max-w-full mx-auto bg-gray-50 rounded-lg p-4 shadow-md">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-gray-800 bg-opacity-70 rounded-lg z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            <span className="ml-3 text-white">Loading heatmap video...</span>
          </div>
        )}

        {videoError && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            <h3 className="font-bold">Error Loading Heatmap Video</h3>
            <p>{errorDetails}</p>
          </div>
        )}

        <div data-vjs-player className="w-full aspect-video">
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered vjs-default-skin w-full h-full rounded-md overflow-hidden"
            playsInline
          />
        </div>

        {/* External Player Button - Always visible when video info is available */}
        {videoInfo && (
          <div className="mt-4 flex justify-start">
            <button
              onClick={openInExternalPlayer}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ArrowUpRightFromSquare className="h-5 w-5" />
              Open in External Player
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

HeatmapVideo.propTypes = {
  taskID: PropTypes.string.isRequired,
  containerWidth: PropTypes.number,
  visible: PropTypes.bool,
};

HeatmapVideo.defaultProps = {
  containerWidth: 720,
  visible: true,
};

export default HeatmapVideo;
