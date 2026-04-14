import { Emitter } from "./emitter";
import { VideoFrameExtractor, createFrameExtractor } from "./core";
import type {
  PlayerEvents,
  PlayerOptions,
  PlayerState,
  PluginAPI,
  PluginManifest,
  PlayerPluginInstance,
  QualityPlugin,
  TextTrackPlugin,
  AudioTrackPlugin,
  ThumbnailPlugin,
  MenuItem,
  IPlayer,
} from "./types";

export type PlayerPlugin = (player: Player) => void | { dispose(): void };

export class Player implements IPlayer {
  readonly media: HTMLMediaElement;
  readonly events: Emitter<PlayerEvents>;
  private plugins: Array<{ dispose?: () => void }> = [];
  private pluginInstances = new Map<string, PlayerPluginInstance>();
  private ready = false;
  private pluginAPI!: PluginAPI;
  private container: HTMLElement;
  private frameExtractor: VideoFrameExtractor | null = null;

  constructor(options: PlayerOptions) {
    this.media = options.media;
    this.container = options.container || this.getPlayerContainer();
    this.container.classList.add("ap-player");

    // Set crossOrigin attribute if specified
    if (options.crossOrigin) {
      this.media.crossOrigin = options.crossOrigin;
    }

    if (options.volume !== undefined)
      this.media.volume = Math.max(0, Math.min(1, options.volume));
    if (options.muted !== undefined) this.media.muted = options.muted;
    if (options.playbackRate !== undefined)
      this.media.playbackRate = options.playbackRate;

    this.events = new Emitter<PlayerEvents>();
    this.setupPluginAPI();
    this.bind();

    if (options.autoplay) this.play();
  }

  private getPlayerContainer(): HTMLElement {
    // Find the nearest parent with class 'player' or containing class indicating wrapper, otherwise direct parent
    let container = this.media.parentElement;
    while (container && !container.classList.contains("player") && !container.classList.contains("player-wrapper") && container.tagName !== 'BODY') {
      container = container.parentElement;
    }
    // Fallback to direct parent if specific class not found but parent exists
    return container || this.media.parentElement || this.media;
  }

  private setupPluginAPI(): void {
    const providers = {
      quality: null as QualityPlugin | null,
      textTrack: null as TextTrackPlugin | null,
      audioTrack: null as AudioTrackPlugin | null,
      thumbnail: null as ThumbnailPlugin | null,
    };

    this.pluginAPI = {
      registerQualityProvider: (plugin: QualityPlugin) => {
        providers.quality = plugin;
        plugin.onQualityChange?.((level) => {
          this.events.emit("qualitychange", level);
        });
      },
      registerTextTrackProvider: (plugin: TextTrackPlugin) => {
        providers.textTrack = plugin;
        plugin.onTextTrackChange?.((track) => {
          this.events.emit("texttrackchange", track as any);
        });
      },
      registerAudioTrackProvider: (plugin: AudioTrackPlugin) => {
        providers.audioTrack = plugin;
        plugin.onAudioTrackChange?.((track) => {
          this.events.emit("audioplayerchange", track);
        });
      },
      registerThumbnailProvider: (plugin: ThumbnailPlugin) => {
        providers.thumbnail = plugin;
      },
      getQualityProvider: () => providers.quality,
      getTextTrackProvider: () => providers.textTrack,
      getAudioTrackProvider: () => providers.audioTrack,
      getThumbnailProvider: () => providers.thumbnail,
      addMenuItem: (item: MenuItem) => {
        this.events.emit("menuitemadded", item);
      },
      removeMenuItem: (itemId: string) => {
        this.events.emit("menuitemremoved", itemId);
      },
      getFrameExtractor: () => {
        if (!this.frameExtractor) {
          this.frameExtractor = createFrameExtractor(
            this.media as HTMLVideoElement,
          );
        }
        return this.frameExtractor;
      },
    };
  }

  private bind() {
    this.media.addEventListener("loadedmetadata", () => {
      this.ready = true;
      this.events.emit("ready", this.media);
    });
    this.media.addEventListener("loadeddata", () => {
      if (!this.ready && this.media.duration) {
        this.ready = true;
        this.events.emit("ready", this.media);
      }
    });
    this.media.addEventListener("canplay", () => {
      if (!this.ready && this.media.duration) {
        this.ready = true;
        this.events.emit("ready", this.media);
      }
    });
    this.media.addEventListener("play", () => this.events.emit("play"));
    this.media.addEventListener("pause", () => this.events.emit("pause"));
    this.media.addEventListener("timeupdate", () =>
      this.events.emit(
        "timeupdate",
        this.media.currentTime,
        this.media.duration || 0,
      ),
    );
    this.media.addEventListener("volumechange", () =>
      this.events.emit("volumechange", this.media.volume, this.media.muted),
    );
    this.media.addEventListener("seeking", () =>
      this.events.emit("seeking", this.media.currentTime),
    );
    this.media.addEventListener("seeked", () =>
      this.events.emit("seeked", this.media.currentTime),
    );
    this.media.addEventListener("ratechange", () =>
      this.events.emit("ratechange", this.media.playbackRate),
    );
    this.media.addEventListener("error", (e) => {
      const error = this.media.error
        ? new Error(this.media.error.message)
        : new Error("media error");
      this.events.emit("error", error);
    });
    this.media.addEventListener("durationchange", () => {
      if (this.media.duration && this.media.duration > 0) {
        this.events.emit("durationchange", this.media.duration);
      }
    });
    this.media.addEventListener("progress", () => {
      if (this.media.buffered.length > 0) {
        const bufferedEnd = this.media.buffered.end(
          this.media.buffered.length - 1,
        );
        this.events.emit("progress", bufferedEnd, this.media.duration || 0);
      }
    });
    this.media.addEventListener("waiting", () => this.events.emit("waiting"));
    this.media.addEventListener("stalled", () => this.events.emit("stalled"));
    this.media.addEventListener("canplaythrough", () => this.events.emit("canplaythrough"));
    this.media.addEventListener("playing", () => this.events.emit("playing"));
  }

  use(plugin: PlayerPlugin) {
    const res = plugin(this);
    if (
      res &&
      typeof res === "object" &&
      "dispose" in res &&
      typeof res.dispose === "function"
    )
      this.plugins.push({ dispose: res.dispose.bind(res) });
    else this.plugins.push({});
    return this;
  }

  // New plugin manifest system
  async usePlugin(manifest: PluginManifest): Promise<PlayerPluginInstance> {
    try {
      // Check dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          if (!this.pluginInstances.has(dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }

      // Create and install plugin instance
      const instance = manifest.factory(this, this.pluginAPI);
      await instance.install();

      this.pluginInstances.set(manifest.name, instance);

      this.plugins.push({
        dispose: () => instance.dispose?.(),
      });

      return instance;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.name}:`, error);
      throw error;
    }
  }

  // Plugin access helpers
  getPlugin(name: string): PlayerPluginInstance | undefined {
    return this.pluginInstances.get(name);
  }

  hasPlugin(name: string): boolean {
    return this.pluginInstances.has(name);
  }

  on<K extends keyof PlayerEvents>(
    type: K,
    handler: (...args: PlayerEvents[K]) => void,
  ) {
    return this.events.on(type, handler as any);
  }
  once<K extends keyof PlayerEvents>(
    type: K,
    handler: (...args: PlayerEvents[K]) => void,
  ) {
    return this.events.once(type, handler as any);
  }
  off<K extends keyof PlayerEvents>(
    type: K,
    handler: (...args: PlayerEvents[K]) => void,
  ) {
    this.events.off(type, handler as any);
  }

  async play(): Promise<void> {
    try {
      await this.media.play();
    } catch (error) {
      console.warn("Playback failed or interrupted:", error);
      throw error;
    }
  }
  pause() {
    this.media.pause();
  }
  setVolume(v: number) {
    this.media.volume = Math.max(0, Math.min(1, v));
  }
  mute() {
    this.media.muted = true;
  }
  unmute() {
    this.media.muted = false;
  }
  setMuted(m: boolean) {
    this.media.muted = m;
  }
  seek(seconds: number) {
    const duration = this.media.duration || 0;
    this.media.currentTime = Math.max(0, Math.min(seconds, duration));
  }
  setRate(rate: number) {
    this.media.playbackRate = rate;
  }
  setSource(url: string) {
    this.media.src = url;
    this.media.load();
    this.events.emit("sourcechange", url);
  }

  getState(): PlayerState {
    const qualityProvider = this.pluginAPI.getQualityProvider();
    const textTrackProvider = this.pluginAPI.getTextTrackProvider();
    const audioTrackProvider = this.pluginAPI.getAudioTrackProvider();

    return {
      duration: this.media.duration || 0,
      currentTime: this.media.currentTime || 0,
      volume: this.media.volume,
      muted: this.media.muted,
      playbackRate: this.media.playbackRate,
      paused: this.media.paused,
      ready: this.ready,
      fullscreen: !!document.fullscreenElement,
      pip: !!(document as any).pictureInPictureElement,
      quality: qualityProvider?.getCurrentQuality() || undefined,
      textTrack: textTrackProvider?.getActiveTrack() || undefined,
      audioTrack: audioTrackProvider?.getActiveTrack() || undefined,
      buffering: this.media.readyState < 3,
    };
  }

  // Enhanced container access
  getContainer(): HTMLElement {
    return this.container;
  }

  // Plugin API access
  getAPI(): PluginAPI {
    return this.pluginAPI;
  }

  requestFullscreen() {
    const container = this.getPlayerContainer();
    const el = container as any;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
    this.events.emit("fullscreenchange", true);
  }

  exitFullscreen() {
    const doc = document as any;
    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
    this.events.emit("fullscreenchange", false);
  }

  destroy() {
    for (const p of this.plugins) p.dispose?.();
    this.plugins = [];
    this.pluginInstances.clear();

    if (this.frameExtractor) {
      this.frameExtractor.dispose();
      this.frameExtractor = null;
    }

    this.events.removeAll();
  }
}
