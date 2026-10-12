// What the casino boat's games share: a pad that opens the game's controls while you stand on it and brings the
// camera in close over the table, the stake chips (buttons, and stacks of them on the felt), little moves for the
// cards, chips and ball, total badges, and the speech bubbles the croupier, the dealer and the slot machine's sign say
// things in.
import {
  CylinderGeometry, Group, MeshLambertMaterial, Sprite, SpriteMaterial, Vector3, type Object3D,
} from 'three';
import { decal, drawPad } from './decals';
import { quietly } from './kit';
import { stage } from './layout';
import { player } from './player';
import { camera, canvasTex, FONT, mesh, rr } from './render';
import { besideView, tableRoom, topOfView } from './ui';
import { d2xz, FY, type XZ } from './util';
import { wallet } from './wallet';

/** How far from a pad's centre the player can stand and still be playing. */
const REACH = 0.95;

/** Visits to the boat: it goes up each time the player steps off it, so each game greets them once a visit. */
export const visits = { n: 0 };

/**
 * Where the camera comes in to while a game is open: the point it looks at, the way back from it to the camera, and
 * how wide and tall a view (in metres) it has to fit into the part of the screen the controls leave.
 */
export interface Seat { at: Vector3; from: Vector3; wide: number; tall: number }

/**
 * A game's pad on the boat's deck. Once `enable`d, `upd` opens the panel when the player steps on the pad and closes
 * it when they step off, calling `opened`/`closed`, and `greet` the first time they step on it each visit. While it's
 * open the camera comes in to `seat`. It returns whether the panel is open.
 */
export function gamePad(
  at: XZ & { y?: number }, icon: string, panel: HTMLElement, h: { opened(): void; closed(): void; greet(): void }, view: Seat,
) {
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
        if (open) seated = { ...view, panel };
        else if (seated?.panel === panel) seated = null;
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
 * The stake in a game's panel, made up as at a real table: each tap on a chip puts one more of it down (three $1k chips
 * make $3k), Clear takes them all back, and All in puts down everything. What's down is kept as how many of each chip
 * (one of the second, to start with), so it grows with the stage at the stage-up, and it stays down from one round to
 * the next. Changing it calls `picked`; nothing while `busy`.
 */
export class Stakes {
  /** How many of each of the stage's chips are down. */
  pile = [0, 1, 0, 0];
  /** All in: everything the player has, instead of the pile. */
  all = false;
  constructor(readonly el: HTMLElement, busy: () => boolean, picked: () => void) {
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-stake]');
      if (!b || busy()) return;
      const v = b.dataset.stake!, chip = v !== 'all' && v !== 'clear';
      // all in, clear, or a chip after all in: start again from nothing
      if (!chip || this.all) { this.all = v === 'all'; this.pile.fill(0); }
      if (chip) this.pile[Number(v)]++;
      picked();
    });
  }

  /** The stake in dollars. */
  get value() { return this.all ? wallet.money : this.pile.reduce((s, n, i) => s + n * CHIPS[stage.n][i], 0); }
  /** Whether the stake can be put down now. */
  get ok() { return this.value > 0 && this.value <= wallet.money; }
  /** The stake to the dollar, never shortened: $10,250 isn't $10.2k when it's made of chips. */
  get label() { return '$' + this.value.toLocaleString('en-US'); }

  /** Labels the chips for the stage, with how many of each are down, and greys out what the player can't add to the
   *  stake (all of it while `busy`). */
  refresh(busy: boolean) {
    this.el.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach(b => {
      const v = b.dataset.stake!;
      if (v === 'all') {
        b.setAttribute('aria-pressed', String(this.all));
        b.disabled = busy || wallet.money <= 0;
      } else if (v === 'clear') b.disabled = busy || (!this.all && this.value === 0);
      else {
        const amount = CHIPS[stage.n][Number(v)], n = this.all ? 0 : this.pile[Number(v)];
        b.textContent = chipLabel(amount);
        if (n) { b.dataset.n = `×${n}`; b.setAttribute('aria-label', `${chipLabel(amount)} ×${n}`); }
        else { delete b.dataset.n; b.removeAttribute('aria-label'); }
        b.setAttribute('aria-pressed', String(n > 0));
        b.disabled = busy || (this.all ? 0 : this.value) + amount > wallet.money;
      }
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

const tmp = new Vector3(), up = new Vector3();
/** How near the top of the view a bubble can come (in the camera's -1 to 1). */
const VIEW_TOP = 0.95;
/**
 * Someone (or something) on the boat that says things in a bubble `y` above `on`. Close up, at a table, it's smaller
 * (`near` of its size), and if it would go off the top of the view it comes down, over the speaker, till it's in.
 */
export function speaker(on: Object3D, y: number, near = 0.35) {
  const t = canvasTex(W, H, () => {});
  const mat = new SpriteMaterial({ map: t.tex, depthTest: false, transparent: true, opacity: 0 });
  const s = new Sprite(mat);
  s.scale.set(1.7, 0.85, 1); s.position.set(0, y, 0); s.renderOrder = 5; s.visible = false;
  on.add(s);
  let left = 0;
  /** How high the top of the bubble is on screen, with it `h` above `on`. */
  const top = (h: number) => {
    s.position.y = h;
    return s.getWorldPosition(tmp).addScaledVector(up, s.scale.y / 2).project(camera).y;
  };
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
      s.position.y = y;
      // smaller close up, at a table, so it doesn't fill the view
      const d = s.getWorldPosition(tmp).distanceTo(camera.position) / 12, k = Math.min(1, Math.max(near, d));
      s.scale.set(1.7 * k, 0.85 * k, 1);
      if (d < near) {
        // and down into the view, if it's over the top of it
        up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const at = top(y), lower = top(y - 0.5);
        s.position.y = at > VIEW_TOP && at > lower ? y - 0.5 * Math.min(2, (at - VIEW_TOP) / (at - lower)) : y;
      }
      left -= dt;
      mat.opacity = Math.max(0, Math.min(1, (SAY_SECS - left) / FADE, left / FADE));
      if (left <= 0) { s.visible = false; this.text = ''; }
    },
  };
}

// ---------- the camera at the table ----------
type Seated = Seat & { panel: HTMLElement };
let seated: Seated | null = null, lastSeat: Seated | null = null, seatK = 0, seatD = 3;
/** How much of the screen the controls take (the most they have since sitting down, so the camera doesn't move as
 *  they change), and the screen size that was for. */
let room = 0, roomFor = '';
const out = { k: 0, eye: new Vector3(), at: new Vector3() };
/** Seconds the player has left feeling the champagne (they zigzag as they walk, the camera sways), and a clock for it. */
export const tipsy = { t: 0, clock: 0 };
/** How tipsy, 0 to 1: full until the last second, then wearing off. */
export const tipsyK = () => Math.min(1, tipsy.t);

/** Brings the camera in to `view`, with `panel` as the controls, for something besides a game's pad (the champagne). */
export function takeSeat(view: Seat, panel: HTMLElement) { seated = { ...view, panel }; }
/** Gives the camera back, if `panel`'s still got it. */
export function leaveSeat(panel: HTMLElement) { if (seated?.panel === panel) seated = null; }
/** Whether a game has the camera. */
export const atTable = () => seated !== null;
/**
 * The camera's place at the table, eased in and out: `k` (0 to 1) is how far to move it from where it would be to
 * `eye`, looking at `at`. It sits back as far as it needs to fit the seat's view into the screen above the controls
 * (or beside them, on a phone held sideways), and slides the view so the table is in the middle of that space.
 */
export function tableView(dt: number) {
  // players who'd rather less motion get cut straight to the table and back
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  seatK += ((seated ? 1 : 0) - seatK) * (reduce ? 1 : Math.min(1, dt * 3.5));
  if (seated !== lastSeat && seated) room = 0;
  if (seated) lastSeat = seated;
  out.k = 0;
  tableRoom.on = !!seated;
  if (!lastSeat || seatK < 0.001) return out;
  const s = lastSeat, w = window.innerWidth, h = window.innerHeight;
  if (!s.panel.hidden) {
    const r = s.panel.getBoundingClientRect(), side = besideView(r, w), top = topOfView(h);
    if (roomFor !== `${w}x${h}`) { roomFor = `${w}x${h}`; room = 0; }
    room = Math.max(room, side ? w - r.left : h - r.top);
    const fw = Math.max(0.35, side ? (w - room) / w : 1), fh = Math.max(0.3, (h - top - (side ? 0 : room)) / h);
    const t = Math.tan(camera.fov * Math.PI / 360);
    seatD = Math.max(1.2, s.wide / (2 * t * camera.aspect * fw), s.tall / (2 * t * fh));
    tableRoom.x = side ? room / 2 : 0;
    tableRoom.y = side ? 0 : Math.max(0, (room - top) / 2);
  }
  out.at.copy(s.at);
  out.eye.copy(s.from).multiplyScalar(seatD).add(s.at);
  out.k = seatK * seatK * (3 - 2 * seatK);
  return out;
}

// ---------- moves ----------
interface Tween { t: number; dur: number; step(k: number): void; done?: () => void }
let tweens: Tween[] = [];
/** Runs `step` from 0 to 1 over `dur` seconds, then `done`. */
export function tween(dur: number, step: (k: number) => void, done?: () => void) {
  step(0);
  tweens.push({ t: 0, dur, step, done });
}
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const easeInOut = (k: number) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
/** Glides `o` to `to` (in its parent's space) with a little hop of `lift` on the way. */
export function slide(o: Object3D, to: Vector3, dur: number, lift = 0.05, done?: () => void) {
  const from = o.position.clone();
  tween(dur, k => {
    const e = easeOut(k);
    o.position.lerpVectors(from, to, e);
    o.position.y += Math.sin(Math.PI * e) * lift;
  }, done);
}
export function updTweens(dt: number) {
  if (!tweens.length) return;
  const now = tweens;
  tweens = [];
  for (const tw of now) {
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.step(k);
    if (k < 1) tweens.push(tw); else tw.done?.();
  }
}
/** Finishes every move at once (and any it leads on to): the player walked away. */
export function settleTweens() {
  for (let i = 0; i < 50 && tweens.length; i++) updTweens(1e3);
}

// ---------- chips on the felt ----------
const CHIP_COLORS = [0xC8323F, 0x22874A, 0x1F2A33, 0x6A3FA0];
const CHIP_R = 0.055, CHIP_H = 0.013;
const chipGeo = new CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 20);
const chipMats = new Map<number, MeshLambertMaterial[]>();
/** A chip's look: its colour, with white marks round the edge and a dashed ring on top. */
function chipMat(color: number) {
  let m = chipMats.get(color);
  if (m) return m;
  const css = '#' + color.toString(16).padStart(6, '0');
  const side = canvasTex(64, 8, (c, w, h) => {
    c.fillStyle = css; c.fillRect(0, 0, w, h);
    c.fillStyle = '#FFF8EC';
    for (let i = 0; i < 6; i++) c.fillRect(i * w / 6 + 2, 0, 5, h);
  });
  const top = canvasTex(64, 64, (c, w) => {
    c.fillStyle = css; c.fillRect(0, 0, w, w);
    c.strokeStyle = '#FFF8EC'; c.lineWidth = 5; c.setLineDash([7, 6]);
    c.beginPath(); c.arc(w / 2, w / 2, w * 0.36, 0, Math.PI * 2); c.stroke();
  });
  const face = new MeshLambertMaterial({ map: top.tex });
  m = [new MeshLambertMaterial({ map: side.tex }), face, face];
  chipMats.set(color, m);
  return m;
}
/** A stack of chips for `amount`, made up as a dealer would: as many of the stage's biggest chip as fit, then the
 *  next, and so on, the biggest at the bottom (up to 12 chips, and at least one). */
export function chipStack(amount: number) {
  const vals = CHIPS[stage.n], kinds: number[] = [];
  let left = amount;
  for (let i = vals.length - 1; i >= 0; i--) {
    while (left >= vals[i] && kinds.length < 12) { kinds.push(i); left -= vals[i]; }
  }
  if (!kinds.length) kinds.push(0);
  return quietly(() => {
    const g = new Group();
    kinds.forEach((i, j) => {
      const c = mesh(chipGeo, chipMat(CHIP_COLORS[i]), (j % 2) * 0.004, CHIP_H / 2 + j * CHIP_H, 0, true);
      c.rotation.y = j * 0.7;
      g.add(c);
    });
    return g;
  });
}

// ---------- badges ----------
/** A small dark pill with a number in it, floating over the felt: a hand's total. */
export function badge(on: Object3D) {
  const t = canvasTex(128, 64, () => {});
  const m = new SpriteMaterial({ map: t.tex, depthTest: false, transparent: true });
  const s = new Sprite(m);
  s.scale.set(0.2, 0.1, 1); s.renderOrder = 4; s.visible = false;
  on.add(s);
  return {
    sprite: s,
    /** What it shows, or '' while it's hidden. */
    text: '',
    set(text: string, gold = false) {
      s.visible = text !== '';
      if (text === this.text && !gold === !s.userData.gold) return;
      this.text = text; s.userData.gold = gold;
      const c = t.ctx;
      c.clearRect(0, 0, 128, 64);
      c.font = `800 40px ${FONT}`;
      const w = Math.min(120, Math.max(56, c.measureText(text).width + 30));
      c.fillStyle = gold ? '#F2C14E' : 'rgba(20,12,16,.82)';
      rr(c, 64 - w / 2, 6, w, 52, 26); c.fill();
      c.fillStyle = gold ? '#2A0F16' : '#FFF8EC';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, 64, 34, 112);
      t.tex.needsUpdate = true;
    },
  };
}

// ---------- cheers ----------
const cheerers: (() => void)[] = [];
/** Someone in the salon who reacts when the player wins (casinoSalon.ts). */
export const onCheer = (f: () => void) => { cheerers.push(f); };
/** The player won at one of the games: the guests watching cheer. */
export const cheer = () => cheerers.forEach(f => f());
