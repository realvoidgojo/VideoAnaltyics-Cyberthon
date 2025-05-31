import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "/process_video": {
        target: "http://localhost:5000",
        changeOrigin: true,
        timeout: 300000, // 5 minutes timeout for long-running requests
      },
      "/process_video_server_side": {
        target: "http://localhost:5000",
        changeOrigin: true,
        timeout: 300000, // 5 minutes timeout
      },
      "/task_status": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/get_server_side_status": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/get_video_info": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/get_detection_statistics": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/get_heatmap_analysis": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/get_heatmap_video_info": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/stream_processed_video": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/stream_heatmap_video": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/download_processed_video": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/download_heatmap_video": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/reset_processing": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/hls_stream": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("proxy error", err);
            if (!res.headersSent) {
              res.writeHead(500, {
                "Content-Type": "application/json",
              });
              res.end(
                JSON.stringify({ error: "Proxy error connecting to server" })
              );
            }
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
    },
  },
});
