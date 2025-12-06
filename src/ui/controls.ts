
import { Player } from "../player";

export interface ControlIcons {
    play?: string | HTMLElement;
    pause?: string | HTMLElement;
    volumeOn?: string | HTMLElement;
    volumeMute?: string | HTMLElement;
    settings?: string | HTMLElement;
    fullscreen?: string | HTMLElement;
    exitFullscreen?: string | HTMLElement;
    // Feedback icons
    playBig?: string | HTMLElement;
    pauseBig?: string | HTMLElement;
}

export interface ControlsOptions {
    icons?: ControlIcons;
}

const DEFAULT_ICONS = {
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
    volumeOn: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
    volumeMute: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
    fullscreen: '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
    exitFullscreen: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>',
    settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L5.09 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    // Big icons for feedback
    playBig: '<path d="M8 5v14l11-7z"/>',
    pauseBig: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
};

function formatTime(seconds: number): string {
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    const p = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}:${p(m)}:${p(s)}`;
    return `${m}:${p(s)}`;
}

function createSVG(path: string | HTMLElement, size: number = 24): HTMLElement | SVGSVGElement {
    if (path instanceof HTMLElement) return path;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size.toString());
    svg.setAttribute("height", size.toString());
    svg.style.fill = "currentColor";
    svg.innerHTML = path;
    return svg;
}

export class Controls {
    element: HTMLElement;
    private player: Player;
    private options: ControlsOptions;
    private icons: any;

    private progressContainer!: HTMLElement;
    private progressBar!: HTMLElement;
    private progressPlayed!: HTMLElement;
    private progressLoaded!: HTMLElement;
    private scrubber!: HTMLElement;
    private playBtn!: HTMLElement;
    private muteBtn!: HTMLElement;
    private volRange!: HTMLInputElement;
    private timeDisplay!: HTMLElement;
    private fullscreenBtn!: HTMLElement;
    private settingsBtn!: HTMLElement;

    // Feedback
    private feedbackOverlay!: HTMLElement;
    private feedbackTimeout: any;

    constructor(player: Player, container: HTMLElement, options: ControlsOptions = {}) {
        this.player = player;
        this.options = options;
        this.icons = { ...DEFAULT_ICONS, ...(options.icons || {}) };

        this.element = this.createDOM();
        container.appendChild(this.element);
        this.bindEvents();
    }

    private createDOM(): HTMLElement {
        const controls = document.createElement("div");
        controls.className = "controls";

        // Feedback Overlay (Visual Bezel)
        this.feedbackOverlay = document.createElement("div");
        this.feedbackOverlay.className = "feedback-overlay";
        // We append it to the player container (parent of controls), not controls itself usually, to center over video
        // But the constructor takes container. Let's append to container if we can, or controls parent.
        // Actually, let's append to the passed container (which is player wrapper)
        this.player.getContainer().appendChild(this.feedbackOverlay);

        // Progress
        const progRow = document.createElement("div");
        progRow.className = "controls-progress";
        this.progressContainer = document.createElement("div");
        this.progressContainer.className = "progress-container";
        this.progressContainer.tabIndex = 0; // Focusable

        this.progressBar = document.createElement("div");
        this.progressBar.className = "progress-bar";

        this.progressLoaded = document.createElement("div");
        this.progressLoaded.className = "progress-loaded";
        this.progressPlayed = document.createElement("div");
        this.progressPlayed.className = "progress-played";

        this.scrubber = document.createElement("div");
        this.scrubber.className = "scrubber";

        this.progressBar.appendChild(this.progressLoaded);
        this.progressBar.appendChild(this.progressPlayed);
        this.progressPlayed.appendChild(this.scrubber);

        this.progressContainer.appendChild(this.progressBar);
        progRow.appendChild(this.progressContainer);
        controls.appendChild(progRow);

        // Main controls
        const mainRow = document.createElement("div");
        mainRow.className = "controls-main";

        // Left
        const left = document.createElement("div");
        left.className = "controls-left";

        this.playBtn = document.createElement("button");
        this.playBtn.className = "ctrl btn play-pause";
        this.playBtn.appendChild(createSVG(this.icons.play));
        left.appendChild(this.playBtn);

        const volContainer = document.createElement("div");
        volContainer.className = "volume-container";
        this.muteBtn = document.createElement("button");
        this.muteBtn.className = "ctrl btn";
        this.muteBtn.appendChild(createSVG(this.icons.volumeOn));

        this.volRange = document.createElement("input");
        this.volRange.type = "range";
        this.volRange.className = "ctrl";
        this.volRange.min = "0";
        this.volRange.max = "1";
        this.volRange.step = "0.05";
        this.volRange.value = "1";
        // Fix for volume thumb vertical alignment: relying on flexbox alignment in CSS
        // The issue is likely the default browser appearance or margin. 
        // We ensure it has no extra margin and is aligned.
        this.volRange.style.margin = "0";
        this.volRange.style.verticalAlign = "middle";

        volContainer.appendChild(this.muteBtn);
        volContainer.appendChild(this.volRange);
        left.appendChild(volContainer);

        this.timeDisplay = document.createElement("div");
        this.timeDisplay.className = "time-display";
        this.timeDisplay.textContent = "0:00 / 0:00";
        left.appendChild(this.timeDisplay);

        mainRow.appendChild(left);

        // Right
        const right = document.createElement("div");
        right.className = "controls-right";

        this.settingsBtn = document.createElement("button");
        this.settingsBtn.className = "ctrl btn settings-button";
        this.settingsBtn.appendChild(createSVG(this.icons.settings));
        right.appendChild(this.settingsBtn);

        this.fullscreenBtn = document.createElement("button");
        this.fullscreenBtn.className = "ctrl btn";
        this.fullscreenBtn.appendChild(createSVG(this.icons.fullscreen));
        right.appendChild(this.fullscreenBtn);

        mainRow.appendChild(right);
        controls.appendChild(mainRow);

        return controls;
    }

    private bindEvents() {
        // Play/Pause override to show feedback
        this.playBtn.onclick = (e) => {
            e.stopPropagation(); // prevent bubbling to container click if any
            this.togglePlay();
        };

        // Click on video to toggle play (if not handled by gestures plugin separately)
        // We'll attach to the video element for a basic fallback
        this.player.media.addEventListener('click', () => {
            this.togglePlay();
        });

        this.muteBtn.onclick = () => {
            const s = this.player.getState();
            this.player.setMuted(!s.muted);
        };

        this.volRange.oninput = (e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            this.player.setVolume(v);
        };

        this.fullscreenBtn.onclick = () => {
            const s = this.player.getState();
            if (s.fullscreen) this.player.exitFullscreen();
            else this.player.requestFullscreen();
        };

        // Seeking
        let isDragging = false;

        const updateScrubber = (clientX: number) => {
            const rect = this.progressContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const duration = this.player.getState().duration || 0;

            // Update UI immediately (visual feedback)
            this.progressPlayed.style.width = `${pos * 100}%`;
            this.timeDisplay.textContent = `${formatTime(pos * duration)} / ${formatTime(duration)}`;

            return pos * duration;
        };

        const seek = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const targetTime = updateScrubber(clientX);
            this.player.seek(targetTime);
        };

        this.progressContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            // Don't seek immediately on mousedown? users prefer click-to-seek, drag-to-scrub.
            // standard: mousedown seeks immediately too.
            seek(e);
        });

        document.addEventListener('mousemove', (e: MouseEvent | TouchEvent) => {
            if (isDragging) {
                const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
                updateScrubber(clientX); // Just visual update during drag?
                // Or seek? seeking continuously can be heavy.
                // Better: update visual, seek heavily throttled or only on mouseup. 
                // BUT user wants "scrubber follows cursor".
                // We'll do BOTH: visual update forces scrubber to cursor, seek happens.
                seek(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                seek(e); // Final seek
            }
        });

        // Player Events
        this.player.on('play', () => {
            this.updatePlayBtn(false);
            this.showFeedback(this.icons.playBig);
        });
        this.player.on('pause', () => {
            this.updatePlayBtn(true);
            this.showFeedback(this.icons.pauseBig);
        });

        this.player.on('volumechange', (vol, muted) => {
            this.volRange.value = vol.toString();
            this.muteBtn.innerHTML = '';
            this.muteBtn.appendChild(createSVG(muted || vol === 0 ? this.icons.volumeMute : this.icons.volumeOn));
        });

        this.player.on('timeupdate', (time, duration) => {
            if (!isDragging) {
                const pct = duration > 0 ? (time / duration) * 100 : 0;
                this.progressPlayed.style.width = `${pct}%`;
                this.timeDisplay.textContent = `${formatTime(time)} / ${formatTime(duration)}`;
            }
        });

        this.player.on('progress', (buffered, duration) => {
            const pct = duration > 0 ? (buffered / duration) * 100 : 0;
            this.progressLoaded.style.width = `${pct}%`;
        });

        this.player.on('fullscreenchange', (isFull) => {
            this.fullscreenBtn.innerHTML = '';
            this.fullscreenBtn.appendChild(createSVG(isFull ? this.icons.exitFullscreen : this.icons.fullscreen));
        });

        // Initial state
        this.updatePlayBtn(this.player.getState().paused);
    }

    private togglePlay() {
        if (this.player.getState().paused) this.player.play();
        else this.player.pause();
    }

    private updatePlayBtn(paused: boolean) {
        this.playBtn.innerHTML = '';
        this.playBtn.appendChild(createSVG(paused ? this.icons.play : this.icons.pause));
    }

    private showFeedback(iconContent: string | HTMLElement) {
        if (!iconContent) return;

        // Clear existing
        this.feedbackOverlay.innerHTML = '';
        this.feedbackOverlay.style.opacity = '0';

        // Create icon wrapper
        const icon = createSVG(iconContent, 48); // Bigger size for feedback
        this.feedbackOverlay.appendChild(icon);

        // Animate
        // Force reflow
        void this.feedbackOverlay.offsetWidth;

        this.feedbackOverlay.style.opacity = '1';
        this.feedbackOverlay.style.transform = 'translate(-50%, -50%) scale(1)';

        if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            this.feedbackOverlay.style.opacity = '0';
            this.feedbackOverlay.style.transform = 'translate(-50%, -50%) scale(1.5)';
        }, 500);
    }

    public getSettingsButton(): HTMLElement {
        return this.settingsBtn;
    }

    public addButton(side: 'left' | 'right', content: string | HTMLElement, onClick: () => void, options: { className?: string } = {}): HTMLElement {
        const btn = document.createElement("button");
        btn.className = `ctrl btn ${options.className || ''}`;
        btn.appendChild(createSVG(content));
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };

        const row = this.element.querySelector(side === 'left' ? '.controls-left' : '.controls-right');
        if (row) {
            // If right side, assume settings/fullscreen are at the end, so we prepend or append?
            // Usually custom buttons go before Settings.
            if (side === 'right') {
                if (this.settingsBtn && this.settingsBtn.parentNode === row) {
                    row.insertBefore(btn, this.settingsBtn);
                } else {
                    row.appendChild(btn);
                }
            } else {
                row.appendChild(btn);
            }
        }
        return btn;
    }
}

