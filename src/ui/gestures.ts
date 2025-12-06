import { Player } from '../player';

export interface GestureOptions { skipSeconds?: number; speedBoost?: number }

export class Gestures {
  readonly root: HTMLElement;
  readonly player: Player;
  readonly opts: Required<GestureOptions>;
  private center: HTMLElement;
  private left: HTMLElement;
  private right: HTMLElement;
  private vol: HTMLElement;
  private fsBtn: HTMLButtonElement;
  private lastTap = 0;
  private lastTapX = 0;
  private tapTimer: any = null;
  private pressTimer: any = null;
  private pressedBoost = false;
  private startY = 0;
  private adjustingVol = false;

  constructor(root: HTMLElement, player: Player, opts: GestureOptions = {}) {
    this.root = root;
    this.player = player;
    this.opts = { skipSeconds: opts.skipSeconds ?? 10, speedBoost: opts.speedBoost ?? 2 };
    this.center = document.createElement('div');
    this.left = document.createElement('div');
    this.right = document.createElement('div');
    this.vol = document.createElement('div');
    this.fsBtn = document.createElement('button');
    this.center.className = 'ap-g-center';
    this.left.className = 'ap-g-left';
    this.right.className = 'ap-g-right';
    this.vol.className = 'ap-g-vol';
    this.fsBtn.className = 'ap-g-fs';
    this.fsBtn.innerHTML = this.icon('maximize');
    this.fsBtn.type = 'button';
    this.fsBtn.onclick = () => { const s = player.getState().fullscreen; if (s) player.exitFullscreen(); else player.requestFullscreen(); };
    root.appendChild(this.center);
    root.appendChild(this.left);
    root.appendChild(this.right);
    root.appendChild(this.vol);
    root.appendChild(this.fsBtn);
    this.bind();
  }

  private bind() {
    const area = this.root.querySelector('video') || this.root;
    area.addEventListener('pointerdown', e => {
      this.startY = e.clientY;
      const rect = (area as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.adjustingVol = x > rect.width * 0.6;
      clearTimeout(this.pressTimer);
      this.pressTimer = setTimeout(() => {
        this.pressedBoost = true;
        const rate0 = this.player.getState().playbackRate;
        this.player.setRate(this.opts.speedBoost);
        this.showCenter(rate0 < 1.5 ? 'boost' : 'pause');
      }, 400);
    });
    area.addEventListener('pointermove', e => {
      if (!this.adjustingVol) return;
      const dy = this.startY - e.clientY;
      const delta = dy / 300;
      const v = Math.max(0, Math.min(1, this.player.getState().volume + delta));
      this.player.setVolume(v);
      this.showVolume(v);
      this.startY = e.clientY;
    });
    area.addEventListener('pointerup', e => {
      clearTimeout(this.pressTimer);
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
        this.lastTap = 0; this.lastTapX = 0; clearTimeout(this.tapTimer); this.tapTimer = null;
        return;
      }
      this.lastTap = now; this.lastTapX = x;
      clearTimeout(this.tapTimer);
      this.tapTimer = setTimeout(() => {
        const paused = this.player.getState().paused;
        if (paused) this.player.play(); else this.player.pause();
        this.showCenter(paused ? 'play' : 'pause');
      }, 250);
    });
  }

  private skip(side: 'left' | 'right') {
    const s = this.player.getState();
    const to = side === 'left' ? Math.max(0, s.currentTime - this.opts.skipSeconds) : Math.min(s.duration, s.currentTime + this.opts.skipSeconds);
    this.player.seek(to);
    const el = side === 'left' ? this.left : this.right;
    el.innerHTML = this.icon(side === 'left' ? 'back' : 'forward');
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 500);
  }

  private showCenter(kind: 'play' | 'pause' | 'boost') {
    this.center.innerHTML = this.icon(kind);
    this.center.style.display = 'flex';
    setTimeout(() => { this.center.style.display = 'none'; }, 600);
  }

  private showVolume(v: number) {
    this.vol.innerHTML = `<div class="ap-g-volbar" style="width:${Math.round(v*100)}%"></div>`;
    this.vol.style.display = 'block';
    clearTimeout((this.vol as any)._t);
    (this.vol as any)._t = setTimeout(() => { this.vol.style.display = 'none'; }, 800);
  }

  private icon(name: 'play'|'pause'|'forward'|'back'|'maximize'|'boost') {
    switch (name) {
      case 'play': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7-11-7Z"/></svg>';
      case 'pause': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
      case 'forward': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5v14l8-7-8-7Zm9 0v14l8-7-8-7Z"/></svg>';
      case 'back': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 5v14l-8-7 8-7Zm-9 0v14L3 12l8-7Z"/></svg>';
      case 'maximize': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h7v2H6v5H4V4Zm13 0h3v7h-2V6h-5V4h4Zm-2 16h-7v-2h5v-5h2v7Zm-11-7h2v5h5v2H4v-7Z"/></svg>';
      case 'boost': return '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l4 8H8l4-8Zm0 20l-4-8h8l-4 8Z"/></svg>';
    }
  }
}