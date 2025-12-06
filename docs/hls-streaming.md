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

## Supported Features

- **Adaptive Bitrate**: Automatically switches quality based on network conditions.
- **Quality Manual Control**: Users can select specific resolutions (e.g., 1080p, 720p).
- **Subtitles/Captions**: Support for WebVTT and embedded subtitles.
- **Audio Tracks**: Support for multiple audio languages (e.g., dubbing).

## Plugin API

When you use the HLS plugin, it registers several providers with the core player API:

- **QualityProvider**: Read available levels (`getAvailableQualities`) and set quality (`setQuality`).
- **TextTrackProvider**: Read subtitle tracks (`getTextTracks`) and set active caption (`setActiveTrack`).
- **AudioTrackProvider**: Read audio languages (`getAudioTracks`) and switch language (`setActiveTrack`).

These providers can be accessed via `player.getAPI().getQualityProvider()`, etc., allowing you to build custom menus or settings panels.
