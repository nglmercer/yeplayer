# Agnostic Player

> Un reproductor de video/audio modular y extensible con sistema de plugins.

## 🚀 Características

- **Core headless** - Player sin UI, totalmente personalizable
- **Sistema de plugins** - Extensible con HLS, DASH, thumbnails, etc.
- **TypeScript first** - Tipado fuerte y autocompletado
- **Event-driven** - Arquitectura reactiva con emitter
- **Framework agnostic** - Compatible con React, Vue, Svelte, etc.
- **Bundle size óptimo** - Tree-shaking y imports condicionales
- **Accesibilidad** - Soporte ARIA y keyboard navigation

## 📦 Instalación

```bash
npm install agnostic-player
```

## 🎯 Uso básico

```typescript
import { Player } from 'agnostic-player';

const video = document.querySelector('video') as HTMLVideoElement;
const player = new Player({ media: video });

// Escuchar eventos
player.on('play', () => console.log('Reproduciendo'));
player.on('timeupdate', (time, duration) => {
  console.log(`${time}s / ${duration}s`);
});

// Control básico
player.play();
player.pause();
player.setVolume(0.8);
player.seek(10); // 10 segundos
```

## 🔌 Sistema de Plugins

### Plugin HLS

```typescript
import { Player } from 'agnostic-player';
import { createHLSPlugin } from 'agnostic-player/plugins/hls';

const player = new Player({ media: video });
player.use(createHLSPlugin({
  autoQuality: true,
  bufferSize: 60
}));

// Acceso a controles de calidad
const qualityPlugin = player.getPlugin('hls');
qualityPlugin.setQuality('720p');
```
