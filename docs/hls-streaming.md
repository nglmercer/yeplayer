# HLS Streaming

The player supports HLS streaming via the `createHlsPlugin`.

## Setup

1. Include `hls.js` in your project dependencies.
2. Register the plugin with the player.

```typescript
import { Player, createHlsPlugin } from 'ytplayer';
import Hls from 'hls.js';

const video = document.getElementById('video');

const player = new Player({
    media: video
});

// Load the HLS Plugin
player.use(createHlsPlugin({
    hls: Hls, // Pass the Hls constructor
    hlsConfig: {
        debug: false,
        enableWorker: true
    }
}));

// Set an HLS source
player.setSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
player.play();
```

## Quality Control

The HLS plugin automatically registers a `QualityPlugin`. This allows the UI (like Settings menu) to automatically show quality selectors (Auto, 1080p, 720p, etc.).
