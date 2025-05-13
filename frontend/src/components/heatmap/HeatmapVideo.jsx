import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import videojs from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";
import { ArrowUpRightFromSquare, RefreshCw, Download } from "lucide-react";

const HeatmapVideo = ({ taskID, containerWidth, visible }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [streamType, setStreamType] = useState("hls"); // "hls" or "direct"

  useEffect(() => {
    if (!taskID || !visible) return;

    const fetchVideoInfo = async () => {
      try {
        setIsLoading(true);
        setVideoError(false);
        setErrorDetails("");

        // Get server-side status first to check if heatmap video is available
        const statusResponse = await axios.get(
          `/get_server_side_status/${taskID}`
        );
        console.log("Server status for heatmap:", statusResponse.data);

        if (
          statusResponse.data.state === "SUCCESS" &&
          statusResponse.data.status
        ) {
          const result = statusResponse.data.status;

          // Check for HLS URL
          if (result.heatmap_hls_url) {
            console.log("Using HLS stream:", result.heatmap_hls_url);
            setVideoInfo({
              hls_url: result.heatmap_hls_url,
              stream_url: `/stream_heatmap_video/${taskID}`,
              mime_type: "video/mp4",
            });
            setStreamType("hls");
          }
          // Check for direct video path
          else if (result.heatmap_video_path) {
            console.log("Using direct video stream");
            setVideoInfo({
              stream_url: `/stream_heatmap_video/${taskID}`,
              mime_type: "video/mp4",
            });
            setStreamType("direct");
          } else {
            // Fallback to dedicated heatmap video info endpoint
            try {
              const response = await axios.get(
                `/get_heatmap_video_info/${taskID}`
              );
              console.log("Heatmap video info:", response.data);
              setVideoInfo(response.data);
              setStreamType(response.data.hls_url ? "hls" : "direct");
            } catch (fallbackError) {
              throw new Error("No heatmap video available");
            }
          }
        } else {
          // Fallback to dedicated heatmap video info endpoint
          const response = await axios.get(`/get_heatmap_video_info/${taskID}`);
          console.log("Heatmap video info:", response.data);
          setVideoInfo(response.data);
          setStreamType(response.data.hls_url ? "hls" : "direct");
        }
      } catch (error) {
        console.error("Error fetching video info:", error);
        setVideoError(true);
        setErrorDetails(
          error.response?.data?.error || "Failed to fetch heatmap video"
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
      }
    };
  }, [taskID, visible]);

  useEffect(() => {
    if (!videoInfo || !visible || !videoRef.current) return;

    const initializePlayer = () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      try {
        const options = {
          controls: true,
          autoplay: false,
          muted: true,
          preload: "auto",
          responsive: true,
          fluid: true,
          fill: true,
          aspectRatio: "16:9",
          html5: {
            vhs: {
              overrideNative: true,
              enableLowInitialPlaylist: true,
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false,
          },
          sources:
            streamType === "hls" && videoInfo.hls_url
              ? [
                  {
                    src: videoInfo.hls_url,
                    type: "application/x-mpegURL",
                  },
                ]
              : [
                  {
                    src: videoInfo.stream_url,
                    type: videoInfo.mime_type || "video/mp4",
                  },
                ],
        };

        playerRef.current = videojs(videoRef.current, options);

        playerRef.current.on("error", () => {
          console.error("Video player error:", playerRef.current.error());

          // If we're using HLS and it fails, try direct streaming
          if (streamType === "hls" && videoInfo.stream_url) {
            console.log("HLS playback failed, falling back to direct stream");
            setStreamType("direct");
            playerRef.current.src({
              src: videoInfo.stream_url,
              type: videoInfo.mime_type || "video/mp4",
            });
            playerRef.current.load();
          } else if (retryCount < maxRetries) {
            // Try one more time with direct stream after a short delay
            setRetryCount((prev) => prev + 1);
            setTimeout(() => {
              playerRef.current.src({
                src: videoInfo.stream_url + "?t=" + new Date().getTime(), // Add cache-busting parameter
                type: videoInfo.mime_type || "video/mp4",
              });
              playerRef.current.load();
            }, 1000);
          } else {
            setVideoError(true);
            setErrorDetails(
              `The heatmap video couldn't be played. Error: ${
                playerRef.current.error().message
              }`
            );
          }
        });

        playerRef.current.on("loadstart", () =>
          console.log("Video loadstart event")
        );
        playerRef.current.on("loadeddata", () =>
          console.log("Video loadeddata event")
        );
      } catch (error) {
        console.error("Error initializing video player:", error);
        setVideoError(true);
        setErrorDetails(`Failed to initialize video player: ${error.message}`);
      }
    };

    initializePlayer();
  }, [videoInfo, visible, streamType, retryCount]);

  const handleRetry = () => {
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    setVideoError(false);
    setRetryCount(0);
    setIsLoading(true);

    // Try the direct stream first as it's often more reliable
    setStreamType("direct");

    // Re-fetch video info with a slight delay to ensure cleanup is complete
    setTimeout(() => {
      axios
        .get(`/get_heatmap_video_info/${taskID}`)
        .then((response) => {
          setVideoInfo(response.data);
          setIsLoading(false);

          // Give the DOM time to update before initializing the player
          setTimeout(() => {
            if (videoRef.current) {
              try {
                const options = {
                  controls: true,
                  autoplay: false,
                  muted: true,
                  preload: "auto",
                  responsive: true,
                  fluid: true,
                  fill: true,
                  aspectRatio: "16:9",
                  sources: [
                    {
                      src:
                        response.data.stream_url + "?t=" + new Date().getTime(),
                      type: response.data.mime_type || "video/mp4",
                    },
                  ],
                };

                playerRef.current = videojs(videoRef.current, options);
              } catch (error) {
                console.error("Error initializing direct player:", error);
                setVideoError(true);
                setErrorDetails(
                  "Failed to initialize direct video playback. Try downloading instead."
                );
              }
            }
          }, 500);
        })
        .catch((error) => {
          console.error("Error fetching video info:", error);
          setVideoError(true);
          setErrorDetails(
            "Failed to reload video information. Try the download link instead."
          );
          setIsLoading(false);
        });
    }, 1000);
  };

  const openInExternalPlayer = () => {
    if (videoInfo) {
      // Prefer direct stream for external player as it's more compatible
      window.open(videoInfo.stream_url || videoInfo.hls_url, "_blank");
    }
  };

  if (!visible) return null;

  return (
    <div className="video-container relative w-full">
      <div className="w-full max-w-full mx-auto bg-gray-50 rounded-lg p-3 shadow-md">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-gray-800 bg-opacity-70 rounded-lg z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
            <span className="ml-3 text-white">Loading heatmap video...</span>
          </div>
        )}

        {videoError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-3">
            <h3 className="font-bold">Error Loading Heatmap</h3>
            <p className="text-sm">{errorDetails}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Try Direct Stream
              </button>

              <a
                href={`/download_heatmap_video/${taskID}`}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Download Video
              </a>
            </div>
          </div>
        )}

        <div data-vjs-player className="w-full aspect-video">
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered vjs-default-skin w-full h-full rounded-md overflow-hidden"
            playsInline
          />
        </div>

        {videoInfo && !isLoading && !videoError && (
          <div className="mt-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {streamType === "hls"
                ? "Using HLS Stream"
                : "Using Direct Stream"}
            </span>
            <button
              onClick={openInExternalPlayer}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm text-sm"
            >
              <ArrowUpRightFromSquare className="h-4 w-4" />
              External Player
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
