// The conveyor from the chopping block to the sushi kitchen, and the lever that decides where fresh steaks go.
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, RepeatWrapping, type Texture } from 'three';
import { decal, drawLeverPad, type Decal } from './decals';
import { fly } from './holder';
import { newSteak } from './items';
import { player } from './player';
import { canvasTex, G, mat, mesh, scene } from './render';
import { kitchen } from './restaurant';
import { pile } from './stations';
import { toast } from './ui';
import { d2xz, FY, V } from './util';
import { BELT_Z } from './world';

export type Route = 'market' | 'split' | 'sushi';
export const ROUTES: readonly Route[] = ['market', 'split', 'sushi'];
const ICONS: Record<Route, string> = { market: '🥩', split: '⚖️', sushi: '🍣' };
const NAMES: Record<Route, string> = { market: 'Steaks → Market', split: 'Steaks → Split 50/50', sushi: 'Steaks → Sushi bar' };
/** Lever handle tilt for each route. */
const TILT: Record<Route, number> = { market: 0.6, split: 0, sushi: -0.6 };

/** Out of the chopping block, a little south, then west through the fence to the kitchen's hatch. */
const PATH = [V(0.5, 0, -4.85), V(0.5, 0, BELT_Z), V(-10.5, 0, BELT_Z)];
const LENS = PATH.slice(1).map((p, i) => p.distanceTo(PATH[i]));
export const BELT_LEN = LENS.reduce((a, b) => a + b, 0);
const SPACING = 0.42, SPEED = 1.8, TOP = FY + 0.12, WIDTH = 0.5, STRIPE = 0.5;
/** Steaks the belt holds when it's backed up end to end. */
export const BELT_CAP = Math.floor(BELT_LEN / SPACING) + 1;
const START = V(PATH[0].x, TOP + 0.04, PATH[0].z);

export const belt = {
  built: false,
  mode: 'market' as Route,
  /** Steaks riding the belt, front (nearest the kitchen) first; `s` is the distance travelled. */
  items: [] as { m: Mesh; s: number }[],
  /** Steaks flying from the chopping block onto the belt. */
  incoming: 0,
  /** Alternates destinations in split mode. */
  flip: false,
};

function pointAt(s: number) {
  let i = 0;
  while (i < LENS.length - 1 && s > LENS[i]) { s -= LENS[i]; i++; }
  return PATH[i].clone().lerp(PATH[i + 1], Math.min(1, Math.max(0, s) / LENS[i]));
}

// ---------- routing ----------
const sushiRoom = () => kitchen.cap + BELT_CAP - kitchen.n - belt.items.length - belt.incoming;
const pileRoom = () => pile.cap - pile.n;

/** Room for `n` more steaks wherever the lever sends them, after the `pending` steaks already on their way. */
export function roomFor(n: number, pending: number) {
  const free = !belt.built || belt.mode === 'market' ? pileRoom()
    : belt.mode === 'sushi' ? sushiRoom() : pileRoom() + sushiRoom();
  return free - pending >= n;
}

/** Where the next fresh steak goes: alternating in split mode, and to the other side when one is full. */
export function steakTo(): 'pile' | 'belt' {
  if (!belt.built || belt.mode === 'market') return 'pile';
  let toBelt = true;
  if (belt.mode === 'split') { belt.flip = !belt.flip; toBelt = belt.flip; }
  if (toBelt) return sushiRoom() > 0 || pileRoom() <= 0 ? 'belt' : 'pile';
  return pileRoom() > 0 || sushiRoom() <= 0 ? 'pile' : 'belt';
}

/** Sends a fresh steak from the chopping block onto the belt. */
export function sendToBelt(m: Mesh, dur: number) {
  belt.incoming++;
  scene.add(m);
  fly(m, () => START, dur, 1.1, () => {
    belt.incoming--;
    const last = belt.items[belt.items.length - 1];
    belt.items.push({ m, s: last ? Math.min(0, last.s - SPACING) : 0 });
  });
}

// ---------- lever ----------
const PADS = ROUTES.map((_, i) => ({ x: -3.0 + i * 1.1, z: -2.1 }));
const pads: Decal[] = ROUTES.map((r, i) => {
  const d = decal(1.0, (c, w, h) => drawLeverPad(c, w, h, ICONS[r], r === belt.mode));
  d.mesh.position.set(PADS[i].x, FY + 0.01, PADS[i].z);
  d.mesh.visible = false;
  return d;
});
let handle: Group | null = null;

export function setRoute(mode: Route, announce = false) {
  belt.mode = mode;
  pads.forEach((d, i) => { drawLeverPad(d.ctx, 256, 256, ICONS[ROUTES[i]], ROUTES[i] === mode); d.tex.needsUpdate = true; });
  if (handle) handle.rotation.z = TILT[mode];
  if (announce) toast(NAMES[mode]);
}

// ---------- building ----------
const stripeTex = canvasTex(32, 32, (c, w, h) => {
  c.fillStyle = '#3C4C58'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#566B7C'; c.fillRect(0, 0, w / 3, h);
});
stripeTex.tex.wrapS = RepeatWrapping;
const stripes: Texture[] = [];

/** The 'sushi' unlock's belt and lever, in a group centred on the belt's corner so it can pop in. */
export function buildConveyor() {
  belt.built = true;
  const outer = new Group(); outer.position.set(PATH[1].x, 0, PATH[1].z);
  const g = new Group(); g.position.set(-PATH[1].x, 0, -PATH[1].z); outer.add(g);
  const side = mat(0x2C3A47);
  PATH.slice(1).forEach((b, i) => {
    const a = PATH[i], dir = b.clone().sub(a).normalize();
    // Trim/extend by half the width at the corner so segments meet without overlapping.
    const from = a.clone().addScaledVector(dir, i > 0 ? -WIDTH / 2 : 0);
    const to = b.clone().addScaledVector(dir, i < LENS.length - 1 ? -WIDTH / 2 : 0);
    const len = from.distanceTo(to), mid = from.clone().lerp(to, 0.5), rot = Math.atan2(-dir.z, dir.x);
    const t = stripeTex.tex.clone(); t.repeat.set(len / STRIPE, 1); t.needsUpdate = true; stripes.push(t);
    const seg = new Mesh(new BoxGeometry(len, 0.12, WIDTH), [side, side, new MeshLambertMaterial({ map: t }), side, side, side]);
    seg.position.set(mid.x, FY + 0.06, mid.z); seg.rotation.y = rot; seg.receiveShadow = true;
    g.add(seg);
    for (const s of [-1, 1]) {
      const r = mesh(new BoxGeometry(len, 0.05, 0.05), 0x9AA9B4, mid.x + dir.z * s * 0.27, TOP + 0.02, mid.z - dir.x * s * 0.27, true);
      r.rotation.y = rot; g.add(r);
    }
  });
  // short legs where the belt crosses the snow between the deck and the restaurant
  for (let x = -8.4; x > -10.5; x -= 0.9) {
    const leg = mesh(G.cyl, 0x2C3A47, x, FY / 2, BELT_Z); leg.scale.set(0.05, FY, 0.05); g.add(leg);
  }
  const lv = new Group(); lv.position.set(-1.9, FY, -2.75);
  lv.add(mesh(new BoxGeometry(0.5, 0.16, 0.24), 0x3C4C58, 0, 0.08, 0, true));
  handle = new Group(); handle.position.y = 0.14;
  const stick = mesh(G.cyl, 0xD9E2E8, 0, 0.28, 0, true); stick.scale.set(0.035, 0.56, 0.035); handle.add(stick);
  const knob = mesh(G.sphere, 0xFF6B4A, 0, 0.58, 0, true); knob.scale.setScalar(0.09); handle.add(knob);
  lv.add(handle); g.add(lv);
  scene.add(outer);
  pads.forEach(d => { d.mesh.visible = true; });
  setRoute(belt.mode);
  return outer;
}

export function updConveyor(dt: number) {
  if (!belt.built) return;
  const p = player.g.position;
  ROUTES.forEach((r, i) => { if (r !== belt.mode && d2xz(p, PADS[i]) < 0.45 * 0.45) setRoute(r, true); });
  stripes.forEach(t => { t.offset.x = (t.offset.x - SPEED * dt / STRIPE) % 1; });
  belt.items.forEach((it, i) => {
    const limit = i === 0 ? BELT_LEN : belt.items[i - 1].s - SPACING;
    it.s = Math.max(it.s, Math.min(it.s + SPEED * dt, limit));
    const q = pointAt(it.s);
    it.m.position.set(q.x, TOP + 0.04, q.z);
  });
  const front = belt.items[0];
  if (front && front.s >= BELT_LEN && kitchen.hasRoom()) {
    belt.items.shift();
    kitchen.receive(front.m, 0.3, 0.8);
  }
}

/** Puts saved steaks back on the belt, queued up from the kitchen end. */
export function loadBelt(n: number) {
  for (let i = 0; i < Math.min(n, BELT_CAP); i++) {
    const m = newSteak(), s = BELT_LEN - i * SPACING, q = pointAt(s);
    m.position.set(q.x, TOP + 0.04, q.z); scene.add(m);
    belt.items.push({ m, s });
  }
}
