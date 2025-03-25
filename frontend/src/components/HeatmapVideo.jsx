import React, { useEffect, useRef, useState } from "react";
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
      width: containerWidth,
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

  if (!visible) return null;

  return (
    <div
      className="video-container relative"
      style={{ width: containerWidth || "100%" }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-700">Loading heatmap video...</span>
        </div>
      )}

      {videoError && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <h3 className="font-bold">Error Loading Heatmap Video</h3>
          <p>{errorDetails}</p>
          {videoInfo && (
            <div className="mt-2">
              <a
                href={videoInfo.stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open in external player
              </a>
            </div>
          )}
        </div>
      )}
      <div data-vjs-player className="w-full">
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-default-skin"
          playsInline
        />
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
