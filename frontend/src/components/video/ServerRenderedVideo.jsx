import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import videojs from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";
import {
  ArrowUpRightFromSquare,
  RefreshCw,
  Download,
  Info,
} from "lucide-react";

const ServerRenderedVideo = ({ taskID, visible }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState("");
  const [streamType, setStreamType] = useState("hls"); // "hls" or "direct"
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (!taskID || !visible) return;

    const fetchVideoInfo = async () => {
      try {
        setIsLoading(true);
        setVideoError(false);
        setErrorDetails("");

        // Add a status check with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (!success && retryCount < maxRetries) {
          try {
            // Get server-side status first
            const statusResponse = await axios.get(
              `/get_server_side_status/${taskID}`
            );

            if (
              statusResponse.data.state === "SUCCESS" &&
              statusResponse.data.status
            ) {
              const result = statusResponse.data.status;

              // Check if we have HLS URL
              if (result.hls_url) {
                setVideoInfo({
                  hls_url: result.hls_url,
                  master_url: result.master_url || result.hls_url,
                  width: result.width,
                  height: result.height,
                  stream_url: `/stream_processed_video/${taskID}`,
                });
                setStreamType("hls");
                success = true;
              }
              // Try alternate URLs if available
              else if (result.master_url) {
                setVideoInfo({
                  hls_url: result.master_url,
                  stream_url: `/stream_processed_video/${taskID}`,
                  width: result.width,
                  height: result.height,
                });
                setStreamType("hls");
                success = true;
              } else {
                // Fall back to direct stream
                setVideoInfo({
                  stream_url: `/stream_processed_video/${taskID}`,
                  mime_type: "video/mp4",
                });
                setStreamType("direct");
                success = true;
              }
            } else if (statusResponse.data.state === "PROGRESS") {
              // Update UI to show that video is still being processed
              setErrorDetails(
                "Video processing is still in progress. Please wait."
              );
              // Don't set success=true here so we'll retry
            } else if (
              statusResponse.data.state === "FAILURE" ||
              statusResponse.data.state === "REVOKED"
            ) {
              setVideoError(true);
              setErrorDetails(
                `Video processing failed: ${
                  statusResponse.data.status || "Unknown error"
                }`
              );
              break; // Don't retry on failures
            } else {
              // Try fallback endpoint
              const response = await axios.get(`/get_video_info/${taskID}`);
              if (response.data) {
                setVideoInfo(response.data);
                setStreamType(response.data.hls_url ? "hls" : "direct");
                success = true;
              }
            }
          } catch (err) {
            console.error(`Attempt ${retryCount + 1} failed:`, err);
            retryCount++;

            // Wait longer between retries
            if (retryCount < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, 2000 * retryCount)
              );
            }
          }
        }

        // If we've exhausted retries without success
        if (!success) {
          setVideoError(true);
          setErrorDetails(
            "Unable to load video after multiple attempts. Please try again later."
          );
        }
      } catch (error) {
        console.error("Error fetching video info:", error);
        setVideoError(true);
        setErrorDetails(error.response?.data?.error || "Failed to fetch video");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoInfo();

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setVideoLoaded(false);
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
          } else {
            setVideoError(true);
            setErrorDetails(
              `The video couldn't be played. Try using the download link or external player.`
            );
          }
        });

        playerRef.current.on("loadeddata", () => {
          setVideoLoaded(true);
        });
      } catch (error) {
        console.error("Error initializing video player:", error);
        setVideoError(true);
        setErrorDetails(`Failed to initialize video player: ${error.message}`);
      }
    };

    // Initialize player with a small delay to ensure DOM is ready
    setTimeout(initializePlayer, 100);
  }, [videoInfo, visible, streamType]);

  const handleRetry = () => {
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    setVideoError(false);
    setVideoLoaded(false);
    setIsLoading(true);

    // Toggle between HLS and direct stream
    setStreamType(streamType === "hls" ? "direct" : "hls");

    // Re-fetch video info
    setTimeout(() => {
      axios
        .get(`/get_video_info/${taskID}`)
        .then((response) => {
          setVideoInfo(response.data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching video info:", error);
          setVideoError(true);
          setErrorDetails("Failed to reload video information");
          setIsLoading(false);
        });
    }, 1000);
  };

  const openInExternalPlayer = () => {
    if (videoInfo) {
      window.open(videoInfo.stream_url || videoInfo.hls_url, "_blank");
    }
  };

  if (!visible) return null;

  return (
    <div className="video-container relative w-full">
      <div className="w-full max-w-full mx-auto bg-gray-50 rounded-lg p-3 shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-gray-800 bg-opacity-70 rounded-lg z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
            <span className="ml-3 text-white">Loading video...</span>
          </div>
        )}

        {videoError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-3">
            <h3 className="font-bold">Error Loading Video</h3>
            <p className="text-sm">{errorDetails}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Try {streamType === "hls" ? "Direct Stream" : "HLS Stream"}
              </button>

              <a
                href={
                  videoInfo?.stream_url || `/stream_processed_video/${taskID}`
                }
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                target="_blank"
                rel="noopener noreferrer"
                download
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
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-xs text-gray-600">
                {videoLoaded
                  ? "Video loaded successfully"
                  : "Initializing player..."}
              </span>
            </div>
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

ServerRenderedVideo.propTypes = {
  taskID: PropTypes.string.isRequired,
  visible: PropTypes.bool,
};

ServerRenderedVideo.defaultProps = {
  visible: true,
};

export default ServerRenderedVideo;
