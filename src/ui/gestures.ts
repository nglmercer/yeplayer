import { Player } from '../player';
import { IPlayer, PluginAPI, PlayerPluginInstance, PluginManifest } from "../types";

export interface GestureOptions { skipSeconds?: number; speedBoost?: number }

export function createGestures(options: GestureOptions = {}): PluginManifest {
    return {
        name: "gestures",
        version: "1.0.0",
        factory: (player: IPlayer, api: PluginAPI) => new Gestures(player as Player, api, options),
    };
}

export class Gestures implements PlayerPluginInstance {
  root!: HTMLElement;
  player: Player;
  opts: Required<GestureOptions>;
  private center!: HTMLElement;
  private left!: HTMLElement;
  private right!: HTMLElement;
  private fsBtn!: HTMLButtonElement;
  private lastTap = 0;
  private lastTapX = 0;
  private tapTimer: number | null = null;
  private pressTimer: number | null = null;
  private pressedBoost = false;
  private centerTimer: number | null = null;

  constructor(player: Player, api: PluginAPI, opts: GestureOptions = {}) {
    this.player = player;
    this.opts = { skipSeconds: opts.skipSeconds ?? 10, speedBoost: opts.speedBoost ?? 2 };
  }

  async install() {
    this.root = this.player.getContainer();
    const root = this.root;
    this.center = document.createElement('div');
    this.left = document.createElement('div');
    this.right = document.createElement('div');
    this.fsBtn = document.createElement('button');

    this.center.className = 'ap-g-center';
    this.left.className = 'ap-g-left';
    this.right.className = 'ap-g-right';
    this.fsBtn.className = 'ap-g-fs';

    this.fsBtn.innerHTML = this.icon('maximize');
    this.fsBtn.type = 'button';
    this.fsBtn.onclick = () => { const s = this.player.getState().fullscreen; if (s) this.player.exitFullscreen(); else this.player.requestFullscreen(); };

    root.appendChild(this.center);
    root.appendChild(this.left);
    root.appendChild(this.right);
    root.appendChild(this.fsBtn);

    this.bind();
    this.bindKeyboard();
  }

  dispose() {
    if (this.center && this.center.parentNode) this.center.parentNode.removeChild(this.center);
    if (this.left && this.left.parentNode) this.left.parentNode.removeChild(this.left);
    if (this.right && this.right.parentNode) this.right.parentNode.removeChild(this.right);
    if (this.fsBtn && this.fsBtn.parentNode) this.fsBtn.parentNode.removeChild(this.fsBtn);
  }

  private bind() {
    const area = this.player.media || this.player.getContainer();

    // Listen to player volume changes to update feedback
    this.player.on('volumechange', (vol, muted) => {
      // Only show feedback if we are actively adjusting or if it's an external change that warrants feedback
      // To avoid spamming, we might want to check if it's a user interaction.
      // But for now, let's show it.
      if (muted || vol === 0) {
        this.showCenter('volumeMute');
      } else if (vol < 0.5) {
        this.showCenter('volumeLow');
      } else {
        this.showCenter('volumeHigh');
      }
    });

    area.addEventListener('pointerdown', e => {
      // Clear timers
      if (this.pressTimer) window.clearTimeout(this.pressTimer);
      this.pressTimer = window.setTimeout(() => {
        this.pressedBoost = true;
        const rate0 = this.player.getState().playbackRate;
        this.player.setRate(this.opts.speedBoost);
        this.showCenter(rate0 < 1.5 ? 'boost' : 'pause');
      }, 400);
    });

    // Volume drag removed

    area.addEventListener('pointerup', e => {
      if (this.pressTimer) window.clearTimeout(this.pressTimer);
      if (this.pressedBoost) {
        this.pressedBoost = false;
        this.player.setRate(1);
        return;
      }
      const now = Date.now();
      const rect = (area as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const dt = now - this.lastTap;
      const dbl = dt < 300 && Math.abs(x - this.lastTapX) < 80;

      if (dbl) {
        if (x < rect.width * 0.4) this.skip('left');
        else if (x > rect.width * 0.6) this.skip('right');
        this.lastTap = 0; this.lastTapX = 0; 
        if (this.tapTimer) window.clearTimeout(this.tapTimer);
        this.tapTimer = null;
        return;
      }
      this.lastTap = now; this.lastTapX = x;
      if (this.tapTimer) window.clearTimeout(this.tapTimer);
      this.tapTimer = window.setTimeout(() => {
        // Single tap behavior (toggle play)
        const paused = this.player.getState().paused;
        if (paused) this.player.play(); else this.player.pause();
      }, 250);
    });
  }

  private bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';

      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;

      // If focused element is not body or player container, maybe we should still handle it
      // unless it has specific key handling?

      const s = this.player.getState();

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (s.paused) this.player.play(); else this.player.pause();
          break;
        case 'j':
          e.preventDefault();
          this.player.seek(s.currentTime - 10);
          this.skip('left');
          break;
        case 'l':
          e.preventDefault();
          this.player.seek(s.currentTime + 10);
          this.skip('right');
          break;
        case 'arrowleft':
          e.preventDefault();
          this.player.seek(s.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          this.player.seek(s.currentTime + 5);
          break;
        case 'arrowup':
          e.preventDefault();
          this.player.setVolume(Math.min(1, s.volume + 0.05));
          break;
        case 'arrowdown':
          e.preventDefault();
          this.player.setVolume(Math.max(0, s.volume - 0.05));
          break;
        case 'm':
          e.preventDefault();
          this.player.setMuted(!s.muted);
          break;
        case 'f':
          e.preventDefault();
          if (s.fullscreen) this.player.exitFullscreen(); else this.player.requestFullscreen();
          break;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const pct = parseInt(e.key) * 10;
        this.player.seek((pct / 100) * s.duration);
      }
    });
  }

  private skip(side: 'left' | 'right') {
    const s = this.player.getState();
    const to = side === 'left' ? Math.max(0, s.currentTime - this.opts.skipSeconds) : Math.min(s.duration, s.currentTime + this.opts.skipSeconds);
    this.player.seek(to);
    const el = side === 'left' ? this.left : this.right;
    el.innerHTML = this.icon(side === 'left' ? 'back' : 'forward');
    el.style.display = 'flex';
    window.setTimeout(() => { el.style.display = 'none'; }, 500);
  }

  private showCenter(kind: string) {
    this.center.innerHTML = this.icon(kind);
    this.center.style.display = 'flex';

    // Reset animation/timeout
    this.center.style.animation = 'none';
    this.center.offsetHeight; /* trigger reflow */
    this.center.style.animation = 'fadeIn 0.2s'; // Assuming CSS has this or we rely on display

    if (this.centerTimer) window.clearTimeout(this.centerTimer);
    this.centerTimer = window.setTimeout(() => { this.center.style.display = 'none'; }, 600);
  }

  private icon(name: string) {
    switch (name) {
      case 'play': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7-11-7Z"/></svg>';
      case 'pause': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
      case 'forward': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5v14l8-7-8-7Zm9 0v14l8-7-8-7Z"/></svg>';
      case 'back': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 5v14l-8-7 8-7Zm-9 0v14L3 12l8-7Z"/></svg>';
      case 'maximize': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h7v2H6v5H4V4Zm13 0h3v7h-2V6h-5V4h4Zm-2 16h-7v-2h5v-5h2v7Zm-11-7h2v5h5v2H4v-7Z"/></svg>';
      case 'boost': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l4 8H8l4-8Zm0 20l-4-8h8l-4 8Z"/></svg>';
      case 'volumeMute': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
      case 'volumeLow': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
      case 'volumeHigh': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      default: return '';
    }
  }
}