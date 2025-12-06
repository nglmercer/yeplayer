# UI Customization & Menus

The player comes with a rich set of UI components including Controls, Menus, and a Settings panel.

## Controls

The `Controls` class provides the bottom bar with play/pause, volume, time, and fullscreen buttons.

```typescript
import { Controls } from 'ytplayer';

const controls = new Controls(player, container, {
    icons: {
        // You can override default SVG icons here
        play: '<svg>...</svg>'
    }
});
```

## Settings Menu

The `Menu` and `Dropdown` components allow for complex settings interactions.

```typescript
import { Menu, Dropdown } from 'ytplayer';

// Create a main menu
const menu = new Menu(document.body);

// Create the dropdown logic
const dropdown = new Dropdown(menu, player);

// Hook it up to the settings button in controls
const settingsBtn = controls.getSettingsButton();
settingsBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.toggle(settingsBtn);
};
```

The Menu automatically populates with available plugins (Quality, Audio Tracks, etc.) via the `PluginAPI`.
