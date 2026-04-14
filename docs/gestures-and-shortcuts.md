# Gestures & Shortcuts

yeplayer includes a built-in gesture and keyboard shortcut system.

## Enabling Gestures

Add the `Gestures` plugin to enable double-tap to seek, swipe to volume/brightness (on supported devices), and keyboard shortcuts.

```typescript
import { Player, createGestures } from 'ssassplayer';

const player = new Player({ /* ... */ });
await player.usePlugin(createGestures({
  keyboard: true,    // Enable space, arrows, m, f, etc.
  seekStep: 10,      // Seconds to jump
  volumeStep: 0.1    // Volume change increment
}));
```

## Default Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `k` | Play / Pause |
| `Left Arrow` / `j` | Seek Back 10s |
| `Right Arrow` / `l` | Seek Forward 10s |
| `f` | Toggle Fullscreen |
| `m` | Toggle Mute |
| `Up Arrow` | Volume Up |
| `Down Arrow` | Volume Down |
| `0-9` | Seek to % of video |

## Double Tap Regions

The `Gestures` plugin overlays invisible layers on the left and right sides of the player for double-tap seeking, similar to mobile apps.
