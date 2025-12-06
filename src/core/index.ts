/**
 * Core utilities and APIs for the YTPlayer
 */

// Video frame extraction utilities
export { VideoFrameExtractor, createFrameExtractor } from './video/frame-extractor';
export type { FrameExtractorOptions, ExtractedFrame } from './video/frame-extractor';

// Re-export commonly used types from main types
export type {
  PlayerOptions,
  PlayerState,
  PlayerEvents,
  PluginAPI,
  PluginManifest,
  PlayerPluginInstance,
} from '../types';
