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

The `Menu` component allows for creating a detailed settings panel (like YouTube's gear icon menu).

### 1. Initialize the Menu
```typescript
import { Menu } from 'ytplayer';

const menu = new Menu(container, [
    { label: 'Quality', items: [] },
    { label: 'Speed', items: [] }
]);

// Hook up to the controls button
controls.getSettingsButton().onclick = (e) => {
    e.stopPropagation();
    refreshMenuData(); // Update data before showing
    menu.toggle();
};
```

### 2. Populate Data from Plugins

The menu does not auto-populate. You should fetch data from the `PluginAPI` and format it for the menu.

```typescript
function refreshMenuData() {
    const api = player.getAPI();
    const groups = [];

    // Example: Add Quality Options
    const qProvider = api.getQualityProvider();
    if (qProvider) {
        groups.push({
            label: 'Quality',
            items: [{
                type: 'select',
                id: 'quality',
                label: 'Quality',
                value: qProvider.getCurrentQuality()?.id,
                options: qProvider.getAvailableQualities().map(q => ({
                    value: q.id,
                    label: q.height + 'p'
                })),
                onChange: (val) => qProvider.setQuality(val)
            }]
        });
    }

    menu.setGroups(groups);
}
```
