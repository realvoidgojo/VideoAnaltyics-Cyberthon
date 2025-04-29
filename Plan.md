# Robust Video Analytics Implementation Plan

This document outlines our redesigned architecture to handle extremely long videos (1+ hours) and high-complexity models robustly in our Video Analytics project.

## Current Limitations

Our current implementation sends all detection data to the frontend at once, causing:

- Browser memory overflow (SIGILL errors) with long videos
- Performance degradation as video length increases
- Excessive network traffic and data transfer
- Even short videos (10 sec) using YOLOv11X with frame interval 1 crash with SIGILL errors

## Redesigned Architecture

We'll implement a hybrid architecture that scales gracefully with video length while maintaining all existing functionality.

### 1. Database-Backed Detection Storage

```
Detection Data → PostgreSQL/SQLite → API Endpoints for Time-Range Queries
```

- **Schema Design**:

  ```sql
  CREATE TABLE videos (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    duration FLOAT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    fps FLOAT NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    frame_interval INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_frames INTEGER NOT NULL,
    processed_frames INTEGER NOT NULL
  );

  CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL REFERENCES videos(id),
    frame_number INTEGER NOT NULL,
    timestamp FLOAT NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    confidence FLOAT NOT NULL,
    x1 FLOAT NOT NULL,
    y1 FLOAT NOT NULL,
    x2 FLOAT NOT NULL,
    y2 FLOAT NOT NULL,
    track_id INTEGER,
    segment_id INTEGER
  );

  CREATE INDEX idx_detections_video_timestamp ON detections(video_id, timestamp);
  CREATE INDEX idx_detections_class ON detections(video_id, class_name);
  CREATE INDEX idx_detections_segment ON detections(video_id, segment_id);
  ```

- **API Endpoints**:
  - GET `/api/detections/<video_id>/<start_time>/<end_time>` - Fetch detections in time range
  - GET `/api/statistics/<video_id>` - Get video statistics and object counts
  - GET `/api/heatmap/<video_id>/<start_time>/<end_time>` - Get heatmap data for specific range

### 2. Dual-Mode Progressive Data Loading

Implement an advanced windowed approach to data loading:

- **Time-Based Loading**: Load detection data in 15-30 second chunks
- **Frame-Based Decimation**: Dynamically reduce detection density for distant frames
- **Intelligent Pre-fetching**:

  ```javascript
  // Adaptive prefetching based on playback behavior
  function prefetchStrategy(currentTime, playbackRate, bufferHealth) {
    const lookAheadTime = Math.min(
      30, // Maximum 30 seconds ahead
      10 * Math.abs(playbackRate) // Adjust for playback speed
    );

    // If buffer health is low, prioritize immediate chunks
    if (bufferHealth < 0.5) {
      return {
        priority: [currentTime, currentTime + lookAheadTime],
        background: null,
      };
    }

    // Otherwise fetch ahead and background fetch for seeking
    return {
      priority: [currentTime, currentTime + lookAheadTime],
      background: [
        currentTime + lookAheadTime,
        currentTime + lookAheadTime * 2,
      ],
    };
  }
  ```

- **Multi-Level Memory Management**:
  ```javascript
  const memoryTiers = [
    { distance: 10, decimationFactor: 1 }, // Full resolution for current segment
    { distance: 30, decimationFactor: 2 }, // Half density for near segments
    { distance: 60, decimationFactor: 5 }, // Fifth density for medium segments
    { distance: 120, decimationFactor: 10 }, // Tenth density for far segments
  ];
  ```

### 3. Advanced Video Segmentation

For videos > 15 minutes:

1. **Smart Segmentation**:

   - Analyze video scene changes for natural breakpoints
   - Use uniform segment sizes as fallback (3-5 minute chunks)
   - Store segment metadata for efficient seeking

2. **Parallel Processing with Coordinator**:

   ```python
   def process_video_segments(video_path, model_name, params):
       # Extract video metadata
       duration, fps = extract_video_metadata(video_path)

       # Create segments based on content or fixed size
       segments = create_smart_segments(video_path,
                                       target_size=params['segmentSize'],
                                       min_size=60,  # Minimum 1 minute
                                       max_size=300) # Maximum 5 minutes

       # Create coordination task
       coordinator = SegmentCoordinatorTask.delay(
           video_id=gen_video_id(),
           segments=segments,
           params=params
       )

       # Process segments with automatic scaling based on system load
       segment_tasks = []
       for segment in segments:
           task = process_segment.delay(
               segment_path=segment['path'],
               model_name=model_name,
               params=params,
               coordinator_id=coordinator.id
           )
           segment_tasks.append(task)

       return {
           "coordinator_id": coordinator.id,
           "segment_tasks": [task.id for task in segment_tasks],
           "total_segments": len(segments)
       }
   ```

3. **On-demand Segment Processing**:
   - Initially process first segment at high quality
   - Process additional segments as user navigates the video
   - Prioritize segments near current playback position

### 4. Adaptive Processing Parameters with Machine Learning

```javascript
function getOptimalParameters(
  videoLength,
  modelSize,
  videoComplexity,
  deviceCapabilities
) {
  // Base adaptive parameters
  let params = {};

  // 1. Model-specific base configuration
  switch (modelSize) {
    case "yolov11x":
      params = {
        baseFrameInterval: 8,
        baseResolutionScale: 0.5,
        confidenceThreshold: 0.4,
        nmsThreshold: 0.5,
        trackingEnabled: false,
      };
      break;
    case "yolov11l":
      params = {
        baseFrameInterval: 5,
        baseResolutionScale: 0.6,
        confidenceThreshold: 0.35,
        nmsThreshold: 0.45,
        trackingEnabled: modelComplexityAllowsTracking(videoComplexity),
      };
      break;
    case "yolov11m":
      params = {
        baseFrameInterval: 3,
        baseResolutionScale: 0.7,
        confidenceThreshold: 0.3,
        nmsThreshold: 0.45,
        trackingEnabled: true,
      };
      break;
    case "yolov11s":
      params = {
        baseFrameInterval: 2,
        baseResolutionScale: 0.8,
        confidenceThreshold: 0.25,
        nmsThreshold: 0.4,
        trackingEnabled: true,
      };
      break;
    case "yolov11n":
    default:
      params = {
        baseFrameInterval: 1,
        baseResolutionScale: 1.0,
        confidenceThreshold: 0.25,
        nmsThreshold: 0.4,
        trackingEnabled: true,
      };
      break;
  }

  // 2. Video duration adjustments
  if (videoLength > 3600) {
    // > 1 hour
    params = {
      ...params,
      frameInterval: Math.max(
        params.baseFrameInterval * 5,
        Math.floor(videoLength / 5000)
      ),
      resolutionScale: params.baseResolutionScale * 0.7,
      trackingEnabled: false,
      segmentSize: 300,
      renderMode: "server-side",
      decimationFactor: 2,
    };
  } else if (videoLength > 900) {
    // 15min - 1hr
    params = {
      ...params,
      frameInterval: Math.max(
        params.baseFrameInterval * 3,
        Math.floor(videoLength / 2500)
      ),
      resolutionScale: params.baseResolutionScale * 0.8,
      trackingEnabled: params.trackingEnabled && modelSize !== "yolov11x",
      segmentSize: 180,
      renderMode: "hybrid",
      decimationFactor: 1.5,
    };
  } else if (videoLength > 180) {
    // 3min - 15min
    params = {
      ...params,
      frameInterval: Math.max(params.baseFrameInterval * 2, 2),
      resolutionScale: params.baseResolutionScale * 0.9,
      trackingEnabled: params.trackingEnabled && modelSize !== "yolov11x",
      segmentSize: 90,
      renderMode: "progressive",
      decimationFactor: 1.2,
    };
  } else {
    // < 3min
    params = {
      ...params,
      frameInterval: params.baseFrameInterval,
      resolutionScale: params.baseResolutionScale,
      trackingEnabled: params.trackingEnabled,
      segmentSize: 60,
      renderMode: "client-side",
      decimationFactor: 1,
    };
  }

  // 3. Device capability adjustments
  if (deviceCapabilities.isLowEnd) {
    params.renderMode = "server-side";
    params.frameInterval = Math.max(params.frameInterval * 1.5, 5);
    params.decimationFactor = params.decimationFactor * 2;
  }

  // 4. Video complexity adjustments
  if (videoComplexity === "high") {
    params.frameInterval = Math.max(params.frameInterval * 1.25, 2);
    params.confidenceThreshold += 0.05;
  }

  return params;
}

// Helper function to determine if video complexity allows tracking
function modelComplexityAllowsTracking(videoComplexity) {
  return videoComplexity !== "high";
}
```

### 5. Hybrid Rendering Architecture

Implement a flexible rendering system:

1. **Client-Side Rendering**:

   - For short videos or simple models
   - Full interactive controls
   - Complete object data available

2. **Progressive Rendering**:

   - For medium-length videos
   - Detection data loaded in chunks
   - Memory-aware rendering with dynamic LOD

3. **Hybrid Rendering**:

   - Server pre-renders dense segments
   - Client renders sparse segments
   - Seamless switching between modes

4. **Server-Side Rendering**:
   - For extremely long videos or complex models
   - Bounding boxes rendered directly into video stream
   - Lightweight metadata for UI controls/filtering
   - HLS streaming with segmented playback

### 6. Enhanced Caching Strategy

```javascript
class DetectionCache {
  constructor(maxCacheSize = 100 * 1024 * 1024) {
    // 100MB default
    this.cache = new Map();
    this.maxSize = maxCacheSize;
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
    this.lruList = [];
    this.setupMemoryMonitoring();
  }

  setupMemoryMonitoring() {
    // Check memory pressure periodically
    setInterval(() => {
      if (typeof performance.memory !== "undefined") {
        const memoryUsage =
          performance.memory.usedJSHeapSize /
          performance.memory.jsHeapSizeLimit;

        // If memory usage exceeds 70%, clear half the cache
        if (memoryUsage > 0.7) {
          this.shrinkCache(0.5);
        }
      }
    }, 10000);

    // Listen for memory pressure events in browsers that support it
    if ("onmemorypressure" in window) {
      window.addEventListener("memorypressure", () => {
        this.shrinkCache(0.7); // Clear 70% of cache on memory pressure
      });
    }
  }

  get(key) {
    if (this.cache.has(key)) {
      // Move to front of LRU list
      this.updateLRU(key);
      this.hits++;
      return this.cache.get(key);
    }
    this.misses++;
    return null;
  }

  set(key, data) {
    const size = this.estimateSize(data);

    // Make room if needed
    if (this.currentSize + size > this.maxSize) {
      this.evict(size);
    }

    this.cache.set(key, data);
    this.currentSize += size;
    this.updateLRU(key);

    return true;
  }

  // Other methods: evict(), updateLRU(), shrinkCache(), estimateSize()...
}
```

## Implementation Plan

### Phase 1: Database & API Integration

1. Set up SQLite/PostgreSQL database with optimized schema
2. Implement database migration scripts and schema versioning
3. Create RESTful APIs with time-range and paging support
4. Add Redis caching layer for high-traffic API endpoints

### Phase 2: Smart Detection Loading

1. Implement enhanced UseDetections hook with multi-tiered loading
2. Add memory pressure detection and automatic garbage collection
3. Create adaptive prefetching based on playback behavior
4. Update VideoCanvas for progressive rendering with LOD support

### Phase 3: Advanced Video Processing

1. Create smart video segmentation with content-based boundaries
2. Implement parallel processing pipeline with coordination tasks
3. Add segment metadata for optimized seeking and visualization
4. Develop real-time segment prioritization based on user navigation

### Phase 4: Intelligent Parameter Selection

1. Create video metadata extraction module for complexity analysis
2. Implement machine learning model to predict optimal parameters
3. Add UI controls for parameter adjustment with visual feedback
4. Develop preset profiles for different video types and hardware

### Phase 5: Multi-Mode Rendering Architecture

1. Implement server-side rendering pipeline with FFmpeg
2. Create hybrid rendering mode with seamless transitions
3. Develop lightweight statistics-only mode for extreme cases
4. Add render mode auto-selection with manual override

### Phase 6: Performance Optimization & Monitoring

1. Implement comprehensive performance telemetry
2. Add adaptive quality scaling based on real-time metrics
3. Develop browser capability detection for rendering decisions
4. Create dashboards for monitoring system performance

## Revised Performance Expectations

| Video Length | Model Size   | Recommended Mode | Frame Interval | Memory Usage | Render Method |
| ------------ | ------------ | ---------------- | -------------- | ------------ | ------------- |
| < 30sec      | YOLOv11n/s   | Client-side      | 1              | Low          | Full          |
| < 30sec      | YOLOv11m     | Client-side      | 2              | Low          | Full          |
| < 30sec      | YOLOv11l     | Client-side      | 4-5            | Medium       | Full          |
| < 30sec      | YOLOv11x     | Progressive      | 8-10           | Medium       | Progressive   |
| 30sec-3min   | YOLOv11n/s   | Client-side      | 1-2            | Low          | Full          |
| 30sec-3min   | YOLOv11m     | Progressive      | 3-4            | Medium       | Progressive   |
| 30sec-3min   | YOLOv11l/x   | Progressive      | 8-15           | Medium-High  | Progressive   |
| 3-15min      | YOLOv11n/s   | Progressive      | 2-5            | Low          | Progressive   |
| 3-15min      | YOLOv11m     | Hybrid           | 5-10           | Medium       | Hybrid        |
| 3-15min      | YOLOv11l/x   | Server           | 15-20          | Low          | Server        |
| 15min-1hr    | YOLOv11n/s   | Hybrid           | 5-15           | Low          | Hybrid        |
| 15min-1hr    | YOLOv11m/l/x | Server           | 15-30          | Low          | Server        |
| > 1hr        | Any          | Server           | 30-60          | Minimal      | Server        |

## Technology Stack Additions

- **Database**: PostgreSQL with TimescaleDB extension for time-series data
- **Video Processing**: FFmpeg with hardware acceleration and libx264
- **Memory Management**: Performance API with memory pressure detection
- **Stream Processing**: Redis Streams for real-time data flow
- **Caching**: Multi-level cache with LRU eviction policy
- **Machine Learning**: TensorFlow.js for client-side complexity analysis
- **Metrics**: Prometheus + Grafana for system monitoring

## Advanced Metrics & Monitoring

We'll implement comprehensive monitoring that tracks:

- **Real-time Performance**:
  - Frame processing time histogram
  - Database query latency
  - API response times by endpoint
  - Client rendering FPS
- **Memory Health**:
  - Browser heap usage trending
  - Cache hit/miss ratio
  - Garbage collection frequency
  - Object retention analysis
- **User Experience**:

  - Video load time
  - Time to first detection render
  - Playback stutter frequency
  - Interaction responsiveness

- **System Resource Utilization**:
  - GPU acceleration usage
  - CPU load during processing
  - Network bandwidth consumption
  - Storage I/O patterns

This architecture represents a robust, scalable approach that can handle videos of any length and model complexity while maintaining responsive performance and preventing browser crashes, even on less powerful devices.
