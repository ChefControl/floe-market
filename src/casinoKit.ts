// What the casino boat's games share: a pad that opens the game's panel while you stand on it, the stake chips, and
// the speech bubbles the croupier, the dealer and the slot machine's sign say things in.
import { Sprite, SpriteMaterial, type Object3D } from 'three';
import { decal, drawPad } from './decals';
import { stage } from './layout';
import { player } from './player';
import { canvasTex, FONT, rr } from './render';
import { d2xz, FY, type XZ } from './util';
import { wallet } from './wallet';

/** How far from a pad's centre the player can stand and still be playing. */
const REACH = 0.95;

/** Visits to the boat: it goes up each time the player steps off it, so each game greets them once a visit. */
export const visits = { n: 0 };

/**
 * A game's pad on the boat's deck. Once `enable`d, `upd` opens the panel when the player steps on the pad and closes
 * it when they step off, calling `opened`/`closed`, and `greet` the first time they step on it each visit. It
 * returns whether the panel is open.
 */
export function gamePad(at: XZ & { y?: number }, icon: string, panel: HTMLElement, h: { opened(): void; closed(): void; greet(): void }) {
  const d = decal(1.9, (c, w, ht) => drawPad(c, w, ht, icon));
  d.mesh.position.set(at.x, (at.y ?? FY) + 0.01, at.z);
  d.mesh.visible = false;
  let enabled = false, open = false, greeted = -1;
  return {
    /** The marking on the deck. */
    mark: d.mesh,
    enable() { enabled = true; d.mesh.visible = true; },
    upd() {
      if (!enabled) return false;
      const near = d2xz(player.g.position, at) < REACH * REACH;
      if (near !== open) {
        open = near;
        panel.hidden = !open;
        if (open) {
          h.opened();
          if (greeted !== visits.n) { greeted = visits.n; h.greet(); }
        } else h.closed();
      }
      return open;
    },
  };
}

/** The chips for each stage: stage 2 earns about ten times as much, so its chips are ten times bigger. */
export const CHIPS: Record<1 | 2, number[]> = { 1: [5, 25, 100, 500], 2: [50, 250, 1000, 5000] };
const chipLabel = (v: number) => v >= 1000 ? `$${v / 1000}k` : `$${v}`;

/**
 * The stake chips in a game's panel: four amounts that follow the stage, or all in. The choice is which chip (the
 * second, say), so it moves to its counterpart at the stage-up. Picking one calls `picked`; nothing while `busy`.
 */
export class Stakes {
  choice: number | 'all' = 1;
  constructor(readonly el: HTMLElement, busy: () => boolean, picked: () => void) {
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-stake]');
      if (!b || busy()) return;
      this.choice = b.dataset.stake === 'all' ? 'all' : Number(b.dataset.stake);
      picked();
    });
  }

  /** The stake in dollars. */
  get value() { return this.choice === 'all' ? wallet.money : CHIPS[stage.n][this.choice]; }
  /** Whether the stake can be put down now. */
  get ok() { return this.value > 0 && this.value <= wallet.money; }

  /** Labels the chips for the stage, marks the chosen one and greys out what the player can't cover (all while `busy`). */
  refresh(busy: boolean) {
    this.el.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach(b => {
      const v = b.dataset.stake!, amount = v === 'all' ? wallet.money : CHIPS[stage.n][Number(v)];
      if (v !== 'all') b.textContent = chipLabel(amount);
      b.setAttribute('aria-pressed', String(v === String(this.choice)));
      b.disabled = busy || amount <= 0 || amount > wallet.money;
    });
  }
}

/** The line a game greets you with: how to start, or that you need cash first. */
export const greeting = (start: string) => wallet.money > 0 ? start : 'Come back with some cash to play';

// ---------- speech bubbles ----------
const W = 256, H = 128, SAY_SECS = 2.2, FADE = 0.25;
/** A white speech bubble with `text` in it, its tail pointing down at the speaker; long lines shrink to fit. */
function drawSay(c: CanvasRenderingContext2D, text: string) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff';
  rr(c, 6, 6, W - 12, H - 34, 34); c.fill();
  c.beginPath(); c.moveTo(W / 2 - 14, H - 30); c.lineTo(W / 2, H - 6); c.lineTo(W / 2 + 14, H - 30); c.fill();
  c.font = `800 44px ${FONT}`;
  const k = Math.min(1, (W - 44) / Math.max(1, c.measureText(text).width));
  c.save(); c.translate(W / 2, (H - 28) / 2 + 4); c.scale(k, k);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  c.fillText(text, 0, 0);
  c.restore();
}

/** Someone (or something) on the boat that says things in a bubble `y` above `on`. */
export function speaker(on: Object3D, y: number) {
  const t = canvasTex(W, H, () => {});
  const mat = new SpriteMaterial({ map: t.tex, depthTest: false, transparent: true, opacity: 0 });
  const s = new Sprite(mat);
  s.scale.set(1.7, 0.85, 1); s.position.set(0, y, 0); s.renderOrder = 5; s.visible = false;
  on.add(s);
  let left = 0;
  return {
    /** What it's saying now, or '' while it's quiet. */
    text: '',
    say(text: string) {
      this.text = text;
      drawSay(t.ctx, text); t.tex.needsUpdate = true;
      left = SAY_SECS; s.visible = true;
    },
    upd(dt: number) {
      if (!s.visible) return;
      left -= dt;
      mat.opacity = Math.max(0, Math.min(1, (SAY_SECS - left) / FADE, left / FADE));
      if (left <= 0) { s.visible = false; this.text = ''; }
    },
  };
}
