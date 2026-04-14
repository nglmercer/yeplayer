import { Player } from '../player';
import { IPlayer, PluginAPI, PlayerPluginInstance, PluginManifest } from "../types";
import { ICONS, createSVG } from "./icons";

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

    this.fsBtn.appendChild(createSVG(ICONS.fullscreen));
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
      if (muted || vol === 0) {
        this.showCenter(ICONS.volumeMute);
      } else if (vol < 0.5) {
        this.showCenter(ICONS.volumeLow);
      } else {
        this.showCenter(ICONS.volumeHigh);
      }
    });

    area.addEventListener('pointerdown', e => {
      if (this.pressTimer) window.clearTimeout(this.pressTimer);
      this.pressTimer = window.setTimeout(() => {
        this.pressedBoost = true;
        const rate0 = this.player.getState().playbackRate;
        this.player.setRate(this.opts.speedBoost);
        this.showCenter(rate0 < 1.5 ? ICONS.boost : ICONS.pause);
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
    el.innerHTML = '';
    el.appendChild(createSVG(side === 'left' ? ICONS.back : ICONS.forward, 48));
    el.style.display = 'flex';
    window.setTimeout(() => { el.style.display = 'none'; }, 500);
  }

  private showCenter(iconPath: string) {
    this.center.innerHTML = '';
    this.center.appendChild(createSVG(iconPath, 48));
    this.center.style.display = 'flex';

    // Reset animation/timeout
    this.center.style.animation = 'none';
    this.center.offsetHeight; /* trigger reflow */
    this.center.style.animation = 'fadeIn 0.2s'; 

    if (this.centerTimer) window.clearTimeout(this.centerTimer);
    this.centerTimer = window.setTimeout(() => { this.center.style.display = 'none'; }, 600);
  }
}