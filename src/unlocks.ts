// Purchasable upgrades: pay-in tiles on the deck and the machines they build.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import { enableCasino } from './casino';
import { buildConveyor } from './conveyor';
import { C2 } from './counters';
import { decal, drawTile, type Decal } from './decals';
import { tryCatch } from './fishing';
import { enableKorki, KORKI } from './korki';
import { player } from './player';
import { rating } from './rating';
import { G, mesh, scene } from './render';
import { addSeats, hireChef, openRestaurant, setPremium } from './restaurant';
import { hireRunner } from './runner';
import { toast, type TipContent } from './ui';
import { FY, V } from './util';
import { gapLogs, openWestGaps } from './world';

export type UnlockId =
  | 'pack' | 'turret' | 'roulette' | 'runner' | 'boots' | 'sled' | 'net'
  | 'sushi' | 'seats' | 'chef' | 'premium' | 'korki';
interface Unlock {
  id: UnlockId;
  cost: number;
  x: number;
  z: number;
  icon: string;
  name: string;
  desc: string;
  /** Market rating needed before the tile takes money. */
  stars?: number;
  /** The market's own upgrades, or the sushi restaurant and its upgrades. */
  zone: 'market' | 'sushi';
  /** Offered from the start, outside the two-at-a-time queue (and not needed for the market to count as built). */
  always?: boolean;
}
export interface Tile extends Unlock {
  paid: number;
  done: boolean;
  /** The star requirement has been met. It stays met even if the rating drops later. */
  open: boolean;
  d: Decal;
  /** What the tip shows while the player stands on the tile. */
  tip: TipContent;
}

const UNLOCKS: Unlock[] = [
  { id: 'pack', cost: 25, x: -1.3, z: 6.0, icon: '🎒', name: 'Bigger arms', desc: 'Carry 14 steaks at once', zone: 'market' },
  { id: 'turret', cost: 60, x: -6.0, z: -3.3, icon: '🎯', name: 'Auto harpoon', desc: 'Keeps catching fish while you are away', zone: 'market' },
  { id: 'roulette', cost: 80, x: -4.3, z: 0.6, icon: '🎰', name: 'Roulette table', desc: 'Bet your cash on the wheel', zone: 'market' },
  { id: 'runner', cost: 120, x: -4.0, z: 3.6, icon: '🏃', name: 'Hire a runner', desc: 'Carries steaks to your counters', stars: 3.5, zone: 'market' },
  { id: 'boots', cost: 150, x: -6.0, z: 6.2, icon: '🥾', name: 'Snow boots', desc: 'Walk faster', zone: 'market' },
  { id: 'sled', cost: 220, x: 6.55, z: -1.0, icon: '🛷', name: 'Sled window', desc: 'Snowmobiles buy in bulk at $6 a steak', stars: 3.8, zone: 'market' },
  { id: 'net', cost: 320, x: -1.9, z: -4.4, icon: '🕸️', name: 'Ice net', desc: 'Hauls in fish nonstop', stars: 4.0, zone: 'market' },
  { id: 'sushi', cost: 1200, x: -6.3, z: 2.5, icon: '🍣', name: 'Sushi restaurant', desc: 'Fancy diners pay $12 a plate. Send it steaks with the lever', stars: 4.2, zone: 'sushi' },
  { id: 'seats', cost: 900, x: -21.4, z: -3.7, icon: '🪑', name: 'More seats', desc: 'Four more seats round the bar', stars: 4.3, zone: 'sushi' },
  { id: 'chef', cost: 1500, x: -19.0, z: -3.7, icon: '🔪', name: 'Second chef', desc: 'Twice the sushi', stars: 4.4, zone: 'sushi' },
  { id: 'premium', cost: 2500, x: -16.6, z: -3.7, icon: '🏮', name: 'Premium menu', desc: 'New plates sell for $20', stars: 4.6, zone: 'sushi' },
  { id: 'korki', cost: 10, x: KORKI.x, z: KORKI.z, icon: '🛴', name: "Korki's golden statue", desc: 'In memory of a good scooter', zone: 'market', always: true },
];

export const locked = (t: Tile) => !!t.stars && !t.open;
const money = (v: number) => '$' + v.toLocaleString('en-US');
function tipOf(t: Tile): TipContent {
  return locked(t)
    ? { name: t.name, desc: `Needs a ★${t.stars!.toFixed(1)} rating (now ★${rating().toFixed(1)}) · ${money(t.cost)}` }
    : t;
}

export const tiles: Tile[] = UNLOCKS.map(u => {
  const state = { ...u, paid: 0, done: false, open: false };
  const t: Tile = Object.assign(state, { d: decal(2.0, (c, w, h) => drawTile(c, w, h, state)), tip: u });
  t.tip = tipOf(t);
  t.d.mesh.position.set(t.x, FY + 0.012, t.z);
  t.d.mesh.visible = false;
  return t;
});

export function redrawTile(t: Tile) {
  drawTile(t.d.ctx, 256, 256, t);
  t.d.tex.needsUpdate = true;
}
// Tiles drawn before the web font loaded fall back to a system font; redraw once it's ready.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tiles.forEach(redrawTile));

const zoneBuilt = (zone: Unlock['zone']) => tiles.every(t => t.zone !== zone || t.always || t.done);
const isDone = (id: UnlockId) => tiles.some(t => t.id === id && t.done);
/** The restaurant goes on sale once the market is fully built; its own upgrades once it's open. */
const offered = (t: Tile) => t.zone === 'market' || (t.id === 'sushi' ? zoneBuilt('market') : isDone('sushi'));

/** At most two unpaid upgrades are offered at a time, in order, plus any that are always on offer. */
export function visibleTiles() {
  const next = tiles.filter(t => !t.done && !t.always && offered(t)).slice(0, 2);
  const v = tiles.filter(t => !t.done && (t.always || next.includes(t)));
  tiles.forEach(t => { t.d.mesh.visible = v.includes(t); });
  return v;
}

let shownRating = -1;
/** Opens star-locked tiles once the rating reaches them, and keeps locked tiles' tips current. */
export function updStars(silent = false) {
  const r = rating();
  if (r === shownRating) return;
  shownRating = r;
  for (const t of tiles) {
    if (locked(t) && r >= t.stars!) {
      t.open = true;
      redrawTile(t);
      if (!silent && t.d.mesh.visible) toast(`★${t.stars!.toFixed(1)} reached: ${t.name} for sale`);
    }
    t.tip = tipOf(t);
  }
}

// ---------- pop-in animation ----------
const pops: { o: Object3D; t: number }[] = [];
function popIn(o: Object3D) {
  o.scale.setScalar(0.01);
  pops.push({ o, t: 0 });
}
export function updPops(dt: number) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    const k = Math.min(1, p.t / 0.45);
    // easeOutBack
    const c1 = 1.70158, c3 = c1 + 1;
    const s = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    p.o.scale.setScalar(Math.max(0.01, s));
    if (k >= 1) { p.o.scale.setScalar(1); pops.splice(i, 1); }
  }
}

// ---------- machines ----------
let turret: { g: Group; head: Group; t: number } | null = null;
let net: { g: Group; t: number; src: Vector3 } | null = null;

function buildTurret() {
  const g = new Group(); g.position.set(-6.9, FY, -5.9);
  const base = mesh(G.cyl, 0x3C4C58, 0, 0.15, 0, true); base.scale.set(0.45, 0.3, 0.45); g.add(base);
  const head = new Group(); head.position.y = 0.55; g.add(head);
  head.add(mesh(new BoxGeometry(0.26, 0.26, 1.0), 0xFF6B4A, 0, 0, 0.3, true));
  head.add(mesh(new BoxGeometry(0.06, 0.06, 0.5), 0xF2C14E, 0, 0, 0.95));
  scene.add(g);
  return { g, head, t: 1 };
}

function buildNet() {
  const g = new Group(); g.position.set(-1.2, 0, -10.8);
  for (const s of [-1, 1]) {
    const p = mesh(G.cyl, 0xFF6B4A, s * 1.7, 0.7, 0, true); p.scale.set(0.09, 1.6, 0.09); g.add(p);
  }
  const bar = mesh(G.cyl, 0xFF6B4A, 0, 1.5, 0, true); bar.scale.set(0.07, 3.4, 0.07); bar.rotation.z = Math.PI / 2; g.add(bar);
  const webbing = new Mesh(
    new PlaneGeometry(3.4, 1.4, 10, 5),
    new MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true, transparent: true, opacity: .8 }),
  );
  webbing.position.y = 0.8; g.add(webbing);
  for (let i = 0; i < 6; i++) {
    const b = mesh(G.sphere, 0xF2C14E, -1.5 + i * 0.6, 0.05, 0.35); b.scale.setScalar(0.12); g.add(b);
  }
  scene.add(g);
  return { g, t: 0.5, src: V(-1.2, 0.3, -10.8) };
}

/** Applies an upgrade's effect. `silent` skips animations and toasts (used when loading a save). */
export function applyUnlock(id: UnlockId, silent = false) {
  const t = tiles.find(x => x.id === id)!;
  t.done = true; t.d.mesh.visible = false;
  if (id === 'pack') player.back.cap = 14;
  if (id === 'turret') { turret = buildTurret(); if (!silent) popIn(turret.g); }
  if (id === 'roulette') { const g = enableCasino(); if (!silent) popIn(g); }
  if (id === 'runner') { const r = hireRunner(); if (!silent) popIn(r.g); }
  if (id === 'boots') player.speed = 5.8;
  if (id === 'sled') {
    C2.enabled = true;
    gapLogs.forEach(l => l.visible = false);
    C2.meshes.forEach(m => { m.visible = true; if (!silent && m.geometry.type === 'BoxGeometry') popIn(m); });
  }
  if (id === 'net') { net = buildNet(); if (!silent) popIn(net.g); }
  if (id === 'sushi') {
    const built = [...openRestaurant(), buildConveyor()];
    openWestGaps();
    if (!silent) built.forEach(popIn);
  }
  if (id === 'seats') { const stools = addSeats(); if (!silent) stools.forEach(popIn); }
  if (id === 'chef') { const c = hireChef(); if (!silent) popIn(c); }
  if (id === 'premium') setPremium();
  if (id === 'korki') { const g = enableKorki(); if (!silent) popIn(g); }
  if (!silent) {
    toast(t.name + ' unlocked');
    if (!t.always && zoneBuilt(t.zone)) {
      setTimeout(() => toast(t.zone === 'market' ? 'Floe Market is fully built' : 'Floe Sushi is fully built'), 1800);
    }
  }
}

export function updAuto(dt: number) {
  if (turret) {
    const tr = turret;
    tr.t -= dt;
    if (tr.t <= 0) {
      const src = V(tr.g.position.x, FY + 0.6, tr.g.position.z);
      const f = tryCatch(() => src, 'turret');
      tr.t = f ? 2.0 : 0.5;
      if (f) tr.head.rotation.y = Math.atan2(f.g.position.x - src.x, f.g.position.z - src.z);
    }
  }
  if (net) {
    const n = net;
    n.t -= dt;
    if (n.t <= 0) {
      const f = tryCatch(() => n.src, 'net');
      n.t = f ? 0.75 : 0.4;
    }
  }
}
