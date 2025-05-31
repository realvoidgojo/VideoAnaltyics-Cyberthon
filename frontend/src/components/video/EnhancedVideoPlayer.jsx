import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import videojs from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";
import {
  ArrowUpRightFromSquare,
  RefreshCw,
  Download,
  Info,
} from "lucide-react";

const EnhancedVideoPlayer = ({
  videoUrl,
  fallbackUrl = null,
  type = "application/x-mpegURL",
  poster = null,
  onError = () => {},
  onReady = () => {},
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadRetries, setLoadRetries] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);

    // Clean up previous player instance
    if (playerRef.current) {
      try {
        playerRef.current.dispose();
        playerRef.current = null;
      } catch (e) {
        console.error("Error disposing player:", e);
      }
    }

    // Initialize player
    try {
      const options = {
        controls: true,
        autoplay: false,
        preload: "auto",
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.5, 2],
        poster: poster,
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [
          {
            src: videoUrl,
            type: type,
          },
        ],
      };

      // Create player instance
      playerRef.current = videojs(videoRef.current, options);

      // Add event listeners
      playerRef.current.on("ready", () => {
        setIsLoading(false);
        onReady(playerRef.current);
      });

      playerRef.current.on("error", () => {
        const error = playerRef.current.error();
        console.error("Video player error:", error);

        // Try fallback if available and we haven't exceeded retries
        if (fallbackUrl && loadRetries < maxRetries) {
          console.log(`Attempt ${loadRetries + 1}: Trying fallback URL`);
          setLoadRetries((prev) => prev + 1);
          playerRef.current.src({
            src: fallbackUrl,
            type: type === "application/x-mpegURL" ? "video/mp4" : type,
          });
          playerRef.current.load();
        } else {
          setError(error?.message || "Failed to load video");
          setIsLoading(false);
          onError(error);
        }
      });

      playerRef.current.on("play", () => {
        setIsPlaying(true);
      });

      playerRef.current.on("pause", () => {
        setIsPlaying(false);
      });
    } catch (error) {
      console.error("Error initializing video player:", error);
      setError(`Failed to initialize video player: ${error.message}`);
      setIsLoading(false);
      onError(error);
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
          playerRef.current = null;
        } catch (e) {
          console.error("Error disposing player on unmount:", e);
        }
      }
    };
  }, [videoUrl, fallbackUrl, type, poster, loadRetries]);

  // Handle retry
  const handleRetry = () => {
    setLoadRetries(0);
    setError(null);
    setIsLoading(true);

    if (playerRef.current) {
      playerRef.current.src({
        src: videoUrl,
        type: type,
      });
      playerRef.current.load();
    }
  };

  // Handle open in new tab
  const openInExternalPlayer = () => {
    window.open(videoUrl, "_blank");
  };

  return (
    <div className="video-player-container relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-white mt-3">Loading video player...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-red-900 bg-opacity-20 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md text-center">
            <h4 className="text-red-600 font-bold mb-2">
              Video Playback Error
            </h4>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
              <button
                onClick={openInExternalPlayer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <ArrowUpRightFromSquare className="h-4 w-4 mr-2" />
                External Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video element */}
      <div data-vjs-player className="w-full aspect-video">
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered vjs-default-skin w-full h-full rounded-lg overflow-hidden shadow-lg"
          playsInline
        />
      </div>

      {/* Controls under video */}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center">
          <Info className="h-4 w-4 text-blue-500 mr-1" />
          <span className="text-xs text-gray-600">
            {isPlaying ? "Video is playing" : "Click to play video"}
          </span>
        </div>
        <div className="flex space-x-2">
          <a
            href={videoUrl}
            download
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          <button
            onClick={openInExternalPlayer}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowUpRightFromSquare className="h-4 w-4" />
            External
          </button>
        </div>
      </div>
    </div>
  );
};

EnhancedVideoPlayer.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  fallbackUrl: PropTypes.string,
  type: PropTypes.string,
  poster: PropTypes.string,
  onError: PropTypes.func,
  onReady: PropTypes.func,
};

export default EnhancedVideoPlayer;
