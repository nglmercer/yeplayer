import Hls from "hls.js";
import type {
    IPlayer,
    PluginAPI,
    PlayerPluginInstance,
    PluginManifest,
    QualityPlugin,
    QualityLevel,
    AudioTrackPlugin,
    AudioTrack,
} from "../../types";

export interface HlsPluginOptions {
    hlsConfig?: any; // Hls.Config
    Hls?: typeof Hls;
}

export function createHlsPlugin(options: HlsPluginOptions = {}): PluginManifest {
    console.log("HLS Plugin: Factory called");
    return {
        name: "hls-plugin",
        version: "1.0.0",
        description: "HLS playback support using hls.js",
        factory: (player: IPlayer, api: PluginAPI) => {
            console.log("HLS Plugin: Creating instance");
            return new HlsPlugin(player, api, options);
        },
    };
}

class HlsPlugin implements PlayerPluginInstance {
    private hls: Hls | null = null;
    private qualityCallback: ((level: QualityLevel) => void) | null = null;
    private audioTrackCallback: ((track: AudioTrack) => void) | null = null;
    private cleanupListeners: (() => void)[] = [];

    constructor(
        private player: IPlayer,
        private api: PluginAPI,
        private options: HlsPluginOptions,
    ) {
        console.log("HLS Plugin: Constructor");
    }

    install() {
        console.log("HLS Plugin: Installing...");
        // Attempt to locate Hls constructor
        let HlsClass = this.options.Hls || Hls;

        // Fallback to window.Hls if not found in imports
        if (!HlsClass && typeof window !== 'undefined' && (window as any).Hls) {
            console.log("HLS Plugin: Using global window.Hls");
            HlsClass = (window as any).Hls;
        }

        console.log("HLS Plugin: HlsClass found?", !!HlsClass, HlsClass);

        const video = this.player.media as HTMLVideoElement;

        // Check if we should use hls.js
        if (HlsClass && HlsClass.isSupported()) {
            console.log("HLS Plugin: Hls is supported, creating instance");
            this.hls = new HlsClass(this.options.hlsConfig);
            this.setupQualityProvider();
            this.setupAudioTrackProvider();

            // Handle HLS events
            this.hls!.on(HlsClass.Events.MANIFEST_PARSED, (event: any, data: any) => {
                console.log("HLS: Manifest parsed", data);
                // Trigger quality update
                if (this.qualityCallback) {
                    const current = this.getCurrentQuality();
                    if (current) this.qualityCallback(current);
                }
            });

            this.hls!.on(HlsClass.Events.ERROR, (event: any, data: any) => {
                console.error("HLS Error:", data);
            });

            this.hls!.on(HlsClass.Events.LEVEL_SWITCHED, (event: any, data: any) => {
                if (this.qualityCallback) {
                    const current = this.getCurrentQuality();
                    if (current) this.qualityCallback(current);
                }
            });

            // Handle source changes from the player
            const removeListener = this.player.on("sourcechange", (url: string) => {
                if (url.includes(".m3u8")) {
                    if (this.hls) {
                        console.log("HLS: Loading source", url);
                        this.hls.loadSource(url);
                        this.hls.attachMedia(video);
                    }
                } else {
                    if (this.hls) {
                        this.hls.detachMedia();
                    }
                }
            });
            this.cleanupListeners.push(removeListener);

            // Initial check
            if (video.src && video.src.includes(".m3u8")) {
                this.hls!.loadSource(video.src);
                this.hls!.attachMedia(video);
            }
        } else if (
            video.canPlayType("application/vnd.apple.mpegurl")
        ) {
            // Native HLS support (Safari)
            console.log("Using native HLS support");
        }
    }

    private setupQualityProvider() {
        const provider: QualityPlugin = {
            getAvailableQualities: () => {
                if (!this.hls) return [];
                return this.hls.levels.map((level: any, index: number) => ({
                    id: index,
                    label: level.height ? `${level.height}p` : `Level ${index}`,
                    bitrate: level.bitrate,
                    width: level.width,
                    height: level.height,
                    codec: level.videoCodec,
                }));
            },
            getCurrentQuality: () => {
                return this.getCurrentQuality();
            },
            setQuality: (levelId: string | number) => {
                if (!this.hls) return;
                this.hls.currentLevel = Number(levelId);
            },
            onQualityChange: (callback) => {
                this.qualityCallback = callback;
            }
        };
        this.api.registerQualityProvider(provider);
    }

    private setupAudioTrackProvider() {
        const provider: AudioTrackPlugin = {
            getAudioTracks: () => {
                if (!this.hls) return [];
                return this.hls!.audioTracks.map((track: any, index: number) => ({
                    id: String(track.id || index),
                    label: track.name || track.lang || `Track ${index}`,
                    language: track.lang || 'unknown',
                    enabled: this.hls ? this.hls.audioTrack === index : false
                }));
            },
            setActiveTrack: (trackId: string) => {
                if (!this.hls) return;
                this.hls.audioTrack = Number(trackId);
            },
            getActiveTrack: () => {
                if (!this.hls) return null;
                const index = this.hls.audioTrack;
                if (index === -1) return null;
                const track = this.hls.audioTracks[index];
                if (!track) return null;
                return {
                    id: String(track.id || index),
                    label: track.name || track.lang || `Track ${index}`,
                    language: track.lang || 'unknown',
                    enabled: true
                };
            },
            onAudioTrackChange: (callback) => {
                this.audioTrackCallback = callback;
            },
        };

        this.api.registerAudioTrackProvider(provider);

        // Listen for changes
        if (this.hls) {
            const HlsClass = this.options.Hls || Hls || (window as any).Hls;
            this.hls.on(HlsClass.Events.AUDIO_TRACK_SWITCHED, (event: any, data: any) => {
                console.log("HLS: Audio track switched", data);
                if (this.audioTrackCallback) {
                    const track = provider.getActiveTrack();
                    if (track) this.audioTrackCallback(track);
                }
            });
        }
    }

    // Helper to get current quality level object
    private getCurrentQuality(): QualityLevel | null {
        if (!this.hls) return null;
        if (this.hls.autoLevelEnabled) {
            return { id: -1, label: "Auto" };
        }
        const index = this.hls.currentLevel;
        if (index >= 0 && index < this.hls.levels.length) {
            const level = this.hls.levels[index];
            return {
                id: index,
                label: level.height ? `${level.height}p` : `Level ${index}`,
                bitrate: level.bitrate,
                width: level.width,
                height: level.height,
                codec: level.videoCodec,
            };
        }
        return null;
    }

    dispose() {
        this.cleanupListeners.forEach((fn) => fn());
        this.cleanupListeners = [];
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }
}
