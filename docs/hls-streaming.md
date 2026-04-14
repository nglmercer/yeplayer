# HLS Streaming

yeplayer provides a powerful HLS plugin powered by `hls.js`.

## Setup

First, ensure you have `hls.js` installed:

```bash
npm install hls.js
```

## Basic HLS Integration

```typescript
import { Player, createHlsPlugin } from 'ssassplayer';
import Hls from 'hls.js';

const player = new Player({
  media: document.getElementById('video'),
});

// Use the HLS plugin
await player.usePlugin(createHlsPlugin({
  hlsConfig: {
    // Standard hls.js configuration
    capLevelToPlayerSize: true,
  }
}));

player.setSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
```

## Quality Management

When using the HLS plugin, it automatically registers a Quality Provider. You can access it via:

```typescript
const qualityPlugin = player.getAPI().getQualityProvider();

if (qualityPlugin) {
  const levels = qualityPlugin.getQualities();
  qualityPlugin.setQuality(levels[0].id);
}
```

The HLS plugin will also emit `qualitychange` events on the player.
