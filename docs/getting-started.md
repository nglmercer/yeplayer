# Getting Started with ssassplayer

**ssassplayer** is a modern, framework-agnostic video player built with TypeScript, designed for performance and customizability.

## Installation

```bash
npm install ssassplayer hls.js
```

## Basic Usage

To use ssassplayer, you need a video element and a container.

### HTML

```html
<div class="player-container">
  <video id="my-video" crossorigin="anonymous"></video>
</div>
```

### TypeScript / JavaScript

```typescript
import { Player } from 'ssassplayer';

const video = document.getElementById('my-video') as HTMLVideoElement;
const container = document.querySelector('.player-container') as HTMLElement;

const player = new Player({
  media: video,
  container: container,
  autoplay: false,
});

player.setSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
```

## Adding UI Controls

By default, the player is just a wrapper around the video element. You can add the built-in UI:

```typescript
import { Player, createControls } from 'ssassplayer';

const player = new Player({ /* options */ });

// Add the default controls
await player.usePlugin(createControls());
```
