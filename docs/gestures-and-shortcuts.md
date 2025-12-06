# Gestures & Shortcuts

## Gestures

The `Gestures` class adds mobile-friendly touch interactions and visual feedback.

- **Double Tap Left/Right**: Seek back/forward 10 seconds.
- **Single Tap**: Toggle Play/Pause.
- **Hold Left/Right**: Speed boost (2x playback rate).

```typescript
import { Gestures } from 'ytplayer';

new Gestures(container, player, {
    skipSeconds: 10,
    speedBoost: 2
});
```

## Keyboard Shortcuts

The player includes built-in keyboard shortcuts matching standard conventions:

| Key | Action |
| --- | --- |
| `Space` / `K` | Play / Pause |
| `J` | Seek backward 10s |
| `L` | Seek forward 10s |
| `Left` / `Right` | Seek backward/forward 5s |
| `Up` / `Down` | Volume Up / Down (5%) |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `0-9` | Seek to 0% - 90% |
