// What the casino boat's games share: a pad that opens the game's controls while you stand on it and brings the
// camera in close over the table, the stake chips (buttons, and stacks of them on the felt), little moves for the
// cards, chips and ball, total badges, and the speech bubbles the croupier, the dealer and the slot machine's sign say
// things in. And how the boat is drawn: off the game's luck, each part twice, plain on Low graphics and in the kit's
// rounded shapes on High (graphics.ts).
import {
  BufferAttribute, BufferGeometry, CylinderGeometry, Euler, Group, type Material, type Matrix4,
  MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, Quaternion, Sprite, SpriteMaterial, Vector3, type Object3D,
} from 'three';
import { decal, drawPad } from './decals';
import { baked, Build, detail, dice, K, pack, quietly, rbox, tube } from './kit';
import { stage } from './layout';
import { player } from './player';
import { camera, canvasTex, FONT, G, mesh, painted, rr } from './render';
import { besideView, tableRoom, topOfView } from './ui';
import { d2xz, FY, type XZ } from './util';
import { wallet } from './wallet';

// ---------- off the game's luck ----------
/**
 * three.js names everything it makes with Math.random, the game's luck (kit.ts). Everything on the boat is made with
 * its own dice in its place instead: what's made when the game loads, the boat when it's bought or a save with it is
 * loaded, and the cards and chips as they're played. So none of it moves the orders, the fish or the customers.
 */
const boatDice = dice(0xB0A7);
/** Runs `f` with the boat's own dice in Math.random's place. */
export const offLuck = <T>(f: () => T) => quietly(f, boatDice);

// ---------- drawing the boat ----------
type V3 = [x: number, y: number, z: number];
const UP_AXIS = new Vector3(0, 1, 0), turn = new Quaternion(), along = new Vector3(), tilt = new Euler();
const cyls = new Map<string, BufferGeometry>();
/**
 * Draws part of the boat for one graphics setting. Low's is plain, in the old way: boxes and cylinders in flat
 * colours, merged as they are. High's is the kit's (kit.ts): bevelled boxes, baked with a plainer copy for its shadow.
 * The same calls put the same things in the same places on both, so the layout's the same; what's drawn on High only
 * goes under `if (pen.high)`.
 */
export class Pen {
  readonly b = new Build();
  constructor(readonly high: boolean) {}
  /** A box `w` by `h` by `d` with its middle at (x, y, z), turned by `rot`. On High its edges are bevelled `r` in. */
  box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, rot?: V3 | null, r = 0.02) {
    if (this.high) this.b.add(rbox(w, h, d, r), c, x, y, z, rot);
    else this.b.add(G.box, c, x, y, z, rot, [w, h, d]);
    return this;
  }
  /** A box with square edges on both: a pane of glass, a line of light. */
  flat(w: number, h: number, d: number, c: number, x: number, y: number, z: number, rot?: V3 | null) {
    this.b.add(G.box, c, x, y, z, rot, [w, h, d]);
    return this;
  }
  /** A post `h` tall with its middle at (x, y, z), `top` and `bottom` its radii (0 for a cone), `sides` round. */
  cyl(top: number, bottom: number, h: number, c: number, x: number, y: number, z: number, rot?: V3 | null, sides = 10) {
    const k = `${top},${bottom},${h},${sides}`;
    let g = cyls.get(k);
    if (!g) cyls.set(k, g = tube(top, bottom, h, sides));
    this.b.add(g, c, x, y, z, rot);
    return this;
  }
  /** A rod of radius `r` from `a` to `b`: a rail, a rope, a strut. */
  rod(a: Vector3, b: Vector3, r: number, c: number, sides = 8) {
    const len = along.subVectors(b, a).length();
    tilt.setFromQuaternion(turn.setFromUnitVectors(UP_AXIS, along.normalize()));
    return this.cyl(r, r, len, c, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, [tilt.x, tilt.y, tilt.z], sides);
  }
  /** A ball `r` across (or `r` each way). */
  ball(r: number | V3, c: number, x: number, y: number, z: number) {
    this.b.add(K.ball, c, x, y, z, null, r);
    return this;
  }
  /** Any shape, drawn the same on both. */
  add(geo: BufferGeometry, c: number, x: number, y: number, z: number, rot?: V3 | null, scale?: V3 | number) {
    this.b.add(geo, c, x, y, z, rot, scale);
    return this;
  }
  /** Another pen's drawing, moved into place by `m`. */
  addAll(p: Pen, m: Matrix4) {
    this.b.addAll(p.b, m);
    return this;
  }
  /** All of it as one mesh in `material` (any number of colours, one draw call), casting shadows if `cast`. */
  mesh(cast = true, material: Material = painted) {
    if (this.high) return baked(this.b.pieces, cast, material);
    // Low's in plain floats, as the old things are (render.ts bake), not the kit's bytes
    const g = pack(this.b.pieces), n = g.attributes.normal.array, c = g.attributes.color.array;
    g.setAttribute('normal', new BufferAttribute(Float32Array.from(n, v => v / 127), 3));
    g.setAttribute('color', new BufferAttribute(Float32Array.from(c, v => v / 255), 3));
    return mesh(g, material, 0, 0, 0, cast);
  }
}
/**
 * Draws `draw` into `g` both ways, each shown on its own setting (kit.ts detail): Low's plain version and High's.
 * Returns the two meshes (null where a setting draws nothing).
 */
export function both(g: Object3D, draw: (p: Pen) => void, cast = true, material?: Material) {
  const [low, high] = [false, true].map(h => {
    const p = new Pen(h);
    draw(p);
    if (p.b.empty) return null;
    const m = p.mesh(cast, material);
    g.add(m);
    return m;
  });
  detail(low, high);
  return [low, high];
}
/** A group in `g` that shows on High only: for the extras that move (the bulbs, the jacuzzi's foam). */
export function highOnly(g: Object3D) {
  const h = offLuck(() => new Group());
  g.add(h);
  detail(null, h);
  return h;
}
/** The boat's lit things (lanterns, LED lines) and its dark glass, painted, so each bakes into one mesh. */
export const LIT = offLuck(() => new MeshBasicMaterial({ vertexColors: true }));
export const DARK_GLASS = offLuck(() => new MeshPhongMaterial({ vertexColors: true, specular: 0x9FB4C4, shininess: 70 }));

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
  const d = offLuck(() => decal(1.9, (c, w, ht) => drawPad(c, w, ht, icon)));
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

const tmp = new Vector3();
/** Someone (or something) on the boat that says things in a bubble `y` above `on`. */
export function speaker(on: Object3D, y: number) {
  const t = offLuck(() => canvasTex(W, H, () => {}));
  const mat = offLuck(() => new SpriteMaterial({ map: t.tex, depthTest: false, transparent: true, opacity: 0 }));
  const s = offLuck(() => new Sprite(mat));
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
      // smaller close up, at a table, so it doesn't fill the view
      const k = Math.min(1, Math.max(0.35, s.getWorldPosition(tmp).distanceTo(camera.position) / 12));
      s.scale.set(1.7 * k, 0.85 * k, 1);
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
const chipGeo = offLuck(() => new CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 20));
const chipMats = new Map<number, MeshLambertMaterial[]>();
/** A chip's look: its colour, with white marks round the edge and a dashed ring on top (its side, then its faces). */
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
  m = [new MeshLambertMaterial({ map: side.tex }), new MeshLambertMaterial({ map: top.tex })];
  chipMats.set(color, m);
  return m;
}
const stacks = new Map<number, BufferGeometry>();
/**
 * `n` chips in a stack, each turned a little from the one under it and every other one nudged aside, as one shape:
 * all their sides first and then all their faces, so the stack is two draw calls however tall it is.
 */
function stackGeo(n: number) {
  let g = stacks.get(n);
  if (g) return g;
  const sides = chipGeo.groups[0].count, per = chipGeo.index!.count;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j < n; j++) {
    const c = chipGeo.clone().rotateY(j * 0.7).translate((j % 2) * 0.004, CHIP_H / 2 + j * CHIP_H, 0);
    pos.push(...c.attributes.position.array); nor.push(...c.attributes.normal.array); uv.push(...c.attributes.uv.array);
  }
  const verts = chipGeo.attributes.position.count, I = chipGeo.index!.array;
  for (const [from, to] of [[0, sides], [sides, per]]) for (let j = 0; j < n; j++) for (let k = from; k < to; k++) idx.push(I[k] + j * verts);
  g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.clearGroups(); g.addGroup(0, sides * n, 0); g.addGroup(sides * n, (per - sides) * n, 1);
  stacks.set(n, g);
  return g;
}
/** A stack of chips for `amount`: the biggest of the stage's chips that fits, as many as make it up (up to 12). */
export function chipStack(amount: number) {
  const vals = CHIPS[stage.n];
  let i = vals.length - 1;
  while (i > 0 && vals[i] > amount) i--;
  const n = Math.max(1, Math.min(12, Math.round(amount / vals[i])));
  return offLuck(() => new Group().add(mesh(stackGeo(n), chipMat(CHIP_COLORS[i]), 0, 0, 0, true)));
}

// ---------- badges ----------
/** A small dark pill with a number in it, floating over the felt: a hand's total. */
export function badge(on: Object3D) {
  const t = offLuck(() => canvasTex(128, 64, () => {}));
  const s = offLuck(() => new Sprite(new SpriteMaterial({ map: t.tex, depthTest: false, transparent: true })));
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
