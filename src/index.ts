export { Emitter } from "./emitter";
export { Player } from "./player";
export * from "./types";
export * from "./core";
export { Menu, Dropdown } from "./ui/menu";
export { Controls } from "./ui/controls";
export { Gestures } from "./ui/gestures";
export { APMenuElement, APGesturesElement } from "./ui/components";

// Plugin interfaces (re-export for convenience)
export type {
  QualityPlugin,
  TextTrackPlugin,
  AudioTrackPlugin,
  ThumbnailPlugin,
  PluginManifest,
  PlayerPluginInstance,
  QualityLevel,
  TextTrack,
  AudioTrack,
  ThumbnailData,
  ThumbnailSprite,
} from "./types";



// HLS Plugin
export { createHlsPlugin } from "./plugins/hls";
export type { HlsPluginOptions } from "./plugins/hls";
export { createAssPlugin } from "./plugins/ass/index";
