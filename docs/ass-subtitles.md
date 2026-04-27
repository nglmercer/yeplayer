# ASS/SSA Subtitle Support

The **ssassplayer** supports advanced subtitle rendering (ASS/SSA) through the `AssJsPlugin`. This plugin uses [ASS.js](https://github.com/Dizzy7/assjs) to render subtitles in a DOM-based overlay.

## Installation

```typescript
import { Player, createAssJsPlugin } from 'ssassplayer';
import ASS from 'assjs';

const player = new Player({ ... });

await player.usePlugin(createAssJsPlugin({ 
  ass: ASS,
  resampling: 'video_height' // 'video_width' | 'video_height' | 'script_width' | 'script_height'
}));
```

## Adding Tracks

You can add ASS tracks via the `TextTrackProvider` API:

```typescript
const provider = player.getAPI().getTextTrackProvider();

if (provider) {
  const trackId = provider.addTrack({
    id: 'my-subtitle-en', // Optional: unique ID for the track
    label: 'English (ASS)',
    language: 'en',
    content: assContentString // Raw ASS script content
  });

  provider.setActiveTrack(trackId);
}
```

## Important Considerations

### Rendering Lifecycle
The `AssJsPlugin` is designed to be "smart" about rendering. It automatically handles:
- **Time Synchronization**: Listens to `timeupdate` and `playing` events on the video element.
- **Dynamic Switching**: Automatically destroys the old renderer and creates a new one when the active track changes.
- **Already Playing State**: If you activate a subtitle track while the video is already playing, the plugin will automatically kick-start the rendering loop.

### Track Persistence
The plugin's `addTrack` method implements an "upsert" logic. If you add a track with an ID that already exists, the plugin will update the existing track instead of creating a duplicate. This is useful when the player is re-initialized (e.g., on source change) but you want to maintain the same track IDs.

### Container Styling
The plugin creates a `div.assjs-container` overlay with a high `zIndex`. Ensure your CSS does not inadvertently hide or block pointer events for this container if you need to interact with it, though by default it uses `pointer-events: none` to avoid interfering with player controls.
