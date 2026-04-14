# UI Customization

ssassplayer is highly customizable through its plugin system and CSS variables.

## Using Controls

The `Controls` plugin provides a modern UI with play/pause, volume, seek bar, time, and settings.

```typescript
import { Player, createControls } from 'ssassplayer';

const player = new Player({ /* ... */ });
await player.usePlugin(createControls({
  // Optional configuration
  compact: false,
  hideOnIdle: true,
  idleDelay: 3000
}));
```

## Styling (CSS Variables)

You can customize the look and feel using CSS variables:

```css
.player-container {
  --player-primary: #ff0000;
  --player-glass-bg: rgba(0, 0, 0, 0.4);
  --player-accent: #00ff00;
  --player-font: 'Inter', sans-serif;
}
```

### Key Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `--player-primary` | Main accent color | `#ffffff` |
| `--player-bg` | Background of controls | `rgba(0,0,0,0.6)` |
| `--player-radius` | Border radius for UI | `12px` |

## Adding Custom Menu Items

The settings menu can be extended:

```typescript
player.getAPI().addMenuItem({
  id: 'custom-action',
  label: 'My Action',
  icon: '<svg>...</svg>',
  onClick: () => console.log('Action clicked!')
});
```
