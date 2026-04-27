import {
    IPlayer,
    PluginAPI,
    PlayerPluginInstance,
    PluginManifest,
    TextTrackPlugin,
    TextTrack
} from "../../types";

// Import ASS from assjs. Since it might not have types, we use require or simple import
// We'll trust the user has installed it.
// In a real TS project without types, we might need a d.ts, but we'll use 'any' for the library instance.
// import ASS from 'assjs'; // Removed to avoid bundler issues in browser if not built correctly

// Interface for the ASS instance from assjs
export interface ASSInstance {
    show(): void;
    hide(): void;
    destroy(): void;
    delay: number;
    resampling: string;
    [key: string]: any;
}

// Interface for the ASS constructor
export interface ASSConstructor {
    new(content: string, video: HTMLVideoElement, options?: any): ASSInstance;
}

export interface AssJsPluginOptions {
    container?: HTMLElement; // Container where ASS.js adds its elements. If not provided, one will be created.
    resampling?: 'video_width' | 'video_height' | 'script_width' | 'script_height';
    ass?: ASSConstructor; // The ASS constructor
    [key: string]: any;
}

export function createAssJsPlugin(options: AssJsPluginOptions = {}): PluginManifest {
    return {
        name: "assjs-plugin",
        version: "1.0.0",
        description: "ASS/SSA rendering support using ASS.js (DOM-based)",
        factory: (player: IPlayer, api: PluginAPI) => {
            return new AssJsPlugin(player, api, options);
        },
    };
}

class AssJsPlugin implements PlayerPluginInstance {
    private assInstance: ASSInstance | null = null;
    private tracks: TextTrack[] = [];
    private activeTrackId: string | null = null;
    private cleanupListeners: (() => void)[] = [];
    private container: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private player: IPlayer,
        private api: PluginAPI,
        private options: AssJsPluginOptions,
    ) { }

    install() {
        // Prepare container if not provided
        // We need a stable container for ASS.js to render into.
        // It should overlay the video.
        // If the user didn't provide one, plugins usually don't want to mess too much with DOM,
        // but ASS.js needs it.
        // We will defer container creation/selection to when we actually have a track to load
        // OR we can do it now if we have a parent.

        this.api.registerTextTrackProvider({
            getTextTracks: () => this.tracks,
            addTrack: (track) => {
                const id = track.id || `assjs-${Date.now()}`;
                const existingIdx = this.tracks.findIndex(t => t.id === id);
                const newTrack = {
                    ...track,
                    id,
                    kind: 'subtitles' as const
                };
                
                if (existingIdx >= 0) {
                    this.tracks[existingIdx] = newTrack;
                } else {
                    this.tracks.push(newTrack);
                }
                return id;
            },
            removeTrack: (trackId) => {
                this.tracks = this.tracks.filter(t => t.id !== trackId);
                if (this.activeTrackId === trackId) {
                    this.setActiveTrack(null);
                }
            },
            setActiveTrack: (trackId) => this.setActiveTrack(trackId),
            getActiveTrack: () => {
                return this.tracks.find(t => t.id === this.activeTrackId) || null;
            },
            onTextTrackChange: (cb) => {
                this.trackChangeCallback = cb;
            }
        });
    }

    private trackChangeCallback: ((track: TextTrack | null) => void) | null = null;

    private async setActiveTrack(trackId: string | null) {
        this.activeTrackId = trackId;
        const track = this.tracks.find(t => t.id === trackId);

        if (this.trackChangeCallback) {
            this.trackChangeCallback(track || null);
        }

        // Always destroy previous instance when switching
        if (this.assInstance) {
            this.assInstance.destroy();
            this.assInstance = null;
        }

        if (!track) {
            return;
        }

        // Prepare content
        let content = "";
        if (track.content) {
            content = track.content;
        } else if (track.src) {
            try {
                const response = await fetch(track.src);
                content = await response.text();
            } catch (e) {
                console.error("AssJsPlugin: Failed to load ASS track", e);
                return;
            }
        }

        if (!content) return;

        this.initAss(content);
    }

    private initAss(content: string) {
        const video = this.player.media as HTMLVideoElement;

        // Determine container
        if (this.options.container) {
            this.container = this.options.container;
        } else if (!this.container) {
            // Create a container if one wasn't provided or created yet
            // This container needs to overlay the video. 
            // We assume the video is in a wrapper or we can append to video's parent.
            const parent = video.parentElement;
            if (parent) {
                this.container = document.createElement('div');
                this.container.className = 'assjs-container';
                // Basic overlay styles to ensure it matches video
                this.container.style.position = 'absolute';
                this.container.style.top = '0';
                this.container.style.left = '0';
                this.container.style.width = '100%';
                this.container.style.height = '100%';
                this.container.style.pointerEvents = 'none'; // Click-through
                this.container.style.zIndex = '2147483647'; // Max z-index

                // Usually we want to insert it after the video or append to parent
                parent.appendChild(this.container);
            }
        }

        if (!this.container) {
            console.error("AssJsPlugin: Could not find or create a container for ASS.js");
            return;
        }

        try {
            console.log("AssJsPlugin: Initializing ASS.js");

            // Resolve ASS constructor
            let AssClass = this.options.ass;
            if (!AssClass && typeof window !== 'undefined' && (window as any).ASS) {
                AssClass = (window as any).ASS;
            }

            if (!AssClass) {
                console.error("AssJsPlugin: ASS.js library not found. Please load it via <script> tag or pass it in options.");
                return;
            }

            this.assInstance = new AssClass(content, video, {
                container: this.container,
                resampling: this.options.resampling || 'video_height',
                ...this.options
            });

            // Handle resize for ASS.js
            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    if (this.assInstance && typeof this.assInstance.resample === 'function') {
                        this.assInstance.resample();
                    }
                });
                this.resizeObserver.observe(video);
            }

            // ASS.js starts its render loop from 'play' / 'playing' events.
            // When switching tracks while the video is already playing those
            // events have already fired, so the new ASS instance might not begin
            // rendering. Dispatch a synthetic 'playing' event to kick-start it.
            if (!video.paused) {
                console.log("AssJsPlugin: Video already playing, dispatching synthetic playing event");
                video.dispatchEvent(new Event("playing"));
            }
        } catch (e) {
            console.error("AssJsPlugin: Failed to initialize ASS.js", e);
        }
    }

    dispose() {
        if (this.assInstance) {
            this.assInstance.destroy();
            this.assInstance = null;
        }
        // If we created the container, maybe we should remove it?
        // If it was passed in options, we leave it.
        if (this.container && !this.options.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.cleanupListeners.forEach(fn => fn());
        this.tracks = [];
    }
}
