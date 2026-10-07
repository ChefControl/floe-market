// Purchasable upgrades: pay-in tiles and what they build. Stage 1 has the fish market's seven upgrades, then the
// gold tile that opens Floe Sushi (stage 2), which has upgrades of its own.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import { enableCasino } from './casino';
import { openSled, openTakeout } from './counters';
import { decal, drawTile, type Decal } from './decals';
import { boost } from './economy';
import { tryCatch } from './fishing';
import { enableKorki, KORKI } from './korki';
import { PATH_X, stage, TERRACES } from './layout';
import { player } from './player';
import { rating } from './rating';
import { showKiosk } from './hall';
import { G, mesh, scene } from './render';
import { addSeats, hireChef, setPremium } from './restaurant';
import { hireFarmer, hireRicePorter, plantTerrace } from './rice';
import { hireRunner } from './runner';
import { enterStage2, staging } from './stage';
import { showStage, toast, type TipContent } from './ui';
import { FY, V } from './util';

export type UnlockId =
  | 'pack' | 'turret' | 'roulette' | 'runner' | 'boots' | 'sled' | 'net' | 'sushi'
  | 'paddy' | 'seats' | 'farmer' | 'chef' | 'kiosk' | 'porter' | 'plot2' | 'chef3' | 'plot3' | 'premium' | 'korki';
interface Unlock {
  id: UnlockId;
  cost: number;
  x: number;
  z: number;
  icon: string;
  name: string;
  desc: string;
  stage: 1 | 2;
  /** Rating needed before the tile takes money. */
  stars?: number;
  /** Offered only once this is bought (the terraces' upgrades need the first terrace). */
  needs?: UnlockId;
  /** On offer all through its stage, outside the two-at-a-time queue (and not counted toward the stage). */
  always?: boolean;
  /** On offer in every stage (Korki's statue). */
  everywhere?: boolean;
  /** The gold tile that opens stage 2: bigger, and offered once the rest of stage 1 is built. */
  gold?: boolean;
  /** Ground height under the tile, where it isn't the deck (the terraces and the path). */
  y?: number;
}
export interface Tile extends Unlock {
  paid: number;
  done: boolean;
  /** The star requirement has been met. It stays met even if the rating drops later. */
  open: boolean;
  d: Decal;
  /** What the tip shows while the player stands on the tile. */
  tip: TipContent;
  /** Half its width, for standing on it. */
  half: number;
}

const PX = (PATH_X.x0 + PATH_X.x1) / 2;
const onTerrace = (i: number) => ({ x: (TERRACES[i].x0 + TERRACES[i].x1) / 2, z: 0.8, y: TERRACES[i].top + 0.08 });

// The price list. Upgrades roughly double in price each time, and stage 2 starts about ten times higher than
// stage 1 (see economy.ts; the repeatable price, marketing and crew upgrades are in the upgrade circles, shop.ts).
const UNLOCKS: Unlock[] = [
  { id: 'pack', cost: 30, x: -1.3, z: 6.0, icon: '🎒', name: 'Bigger arms', desc: 'Carry 14 things at once', stage: 1 },
  { id: 'turret', cost: 90, x: -6.0, z: -3.3, icon: '🎯', name: 'Auto harpoon', desc: 'Keeps catching fish while you are away', stage: 1 },
  { id: 'roulette', cost: 150, x: -4.3, z: 0.6, icon: '🎰', name: 'Roulette table', desc: 'Bet your cash on the wheel', stage: 1 },
  { id: 'runner', cost: 300, x: -4.0, z: 3.6, icon: '🏃', name: 'Hire a runner', desc: 'Carries fish from the pile to your counters', stars: 3.5, stage: 1 },
  { id: 'boots', cost: 500, x: -6.0, z: 6.2, icon: '🥾', name: 'Snow boots', desc: 'Walk faster', stage: 1 },
  { id: 'sled', cost: 900, x: 6.55, z: -1.0, icon: '🛷', name: 'Sled window', desc: 'Snowmobiles buy fish in bulk, for half as much again', stars: 3.8, stage: 1 },
  { id: 'net', cost: 1600, x: -1.9, z: -4.4, icon: '🥅', name: 'Ice net', desc: 'Hauls in fish nonstop', stars: 4.0, stage: 1 },
  { id: 'sushi', cost: 12000, x: -1.6, z: 1.4, icon: '🏯', name: 'Open Floe Sushi', desc: 'Stage 2: rebuild the market as a sushi restaurant, with rice terraces to the west', stage: 1, gold: true },
  { id: 'paddy', cost: 1500, ...onTerrace(0), icon: '🌾', name: 'Rice terrace', desc: 'Plant rice on the bottom terrace. Wade through it to harvest', stage: 2 },
  { id: 'chef', cost: 3000, x: 8.0, z: 9.0, icon: '🔪', name: 'Second chef', desc: 'Another chef at the bar', stars: 3.6, stage: 2 },
  { id: 'seats', cost: 5000, x: -8.0, z: 9.0, icon: '🪑', name: 'More seats', desc: 'Eight more seats at the bar', stars: 3.8, stage: 2 },
  { id: 'farmer', cost: 6000, x: PX, z: -2.6, y: 0.06, icon: '🧑‍🌾', name: 'Hire a farmer', desc: 'Harvests the terraces onto a stack on the path', stars: 3.9, needs: 'paddy', stage: 2 },
  { id: 'kiosk', cost: 8000, x: 8.0, z: 6.2, icon: '🥡', name: 'Takeout kiosk', desc: 'Snowmobiles on the road buy boxes of sushi; the chefs pack them', stars: 4.0, stage: 2 },
  { id: 'porter', cost: 12000, x: -8.2, z: 5.0, icon: '🧺', name: 'Rice porter', desc: 'Carries harvested rice in to the kitchen line', stars: 4.1, needs: 'paddy', stage: 2 },
  { id: 'plot2', cost: 18000, ...onTerrace(1), icon: '🌱', name: 'Second terrace', desc: 'Twice the rice', stars: 4.2, needs: 'paddy', stage: 2 },
  { id: 'chef3', cost: 25000, x: 8.0, z: 11.8, icon: '🔪', name: 'Third chef', desc: 'A third chef at the bar', stars: 4.3, stage: 2 },
  { id: 'plot3', cost: 35000, ...onTerrace(2), icon: '🌱', name: 'Third terrace', desc: 'Rice right up to the hot spring', stars: 4.4, needs: 'plot2', stage: 2 },
  { id: 'premium', cost: 60000, x: -6.2, z: 13.6, icon: '🏮', name: 'Premium menu', desc: 'Everything sells for 60% more', stars: 4.5, stage: 2 },
  { id: 'korki', cost: 10, x: KORKI.x, z: KORKI.z, icon: '🛴', name: "Korki's golden statue", desc: 'In memory of a good scooter', stage: 1, always: true, everywhere: true },
];

export const locked = (t: Tile) => !!t.stars && !t.open;
const money = (v: number) => '$' + v.toLocaleString('en-US');
function tipOf(t: Tile): TipContent {
  return locked(t) ? { name: t.name, desc: `Needs a ★${t.stars!.toFixed(1)} rating (now ★${rating().toFixed(1)}) · ${money(t.cost)}` } : t;
}

export const tiles: Tile[] = UNLOCKS.map(u => {
  const size = u.gold ? 2.6 : 2.0;
  const state = { ...u, paid: 0, done: false, open: false };
  const t: Tile = Object.assign(state, { d: decal(size, (c, w, h) => drawTile(c, w, h, state)), tip: u, half: size / 2 });
  t.tip = tipOf(t);
  t.d.mesh.position.set(t.x, (t.y ?? FY) + 0.012, t.z);
  t.d.mesh.visible = false;
  return t;
});

export function redrawTile(t: Tile) {
  drawTile(t.d.ctx, 256, 256, t);
  t.d.tex.needsUpdate = true;
}
// Tiles drawn before the web font loaded fall back to a system font; redraw once it's ready.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tiles.forEach(redrawTile));

const isDone = (id: UnlockId) => tiles.some(t => t.id === id && t.done);
/** A stage's own upgrades: what its progress chip counts. */
const goal = (n: 1 | 2) => tiles.filter(t => t.stage === n && !t.always && !t.gold);
const built = (n: 1 | 2) => goal(n).every(t => t.done);

function offered(t: Tile) {
  if (t.gold) return built(1);
  // stage 2's tiles wait for the stage-up's show to finish
  if (t.stage !== stage.n || (t.stage === 2 && staging())) return false;
  return !t.needs || isDone(t.needs);
}

/** Upgrades on offer all through the current stage (or every stage), once the stage-up's show is over. */
const always = (t: Tile) => t.always && (t.everywhere || (t.stage === stage.n && !(t.stage === 2 && staging())));

/** At most two unpaid upgrades are offered at a time, in order, plus any that are always on offer. */
export function visibleTiles() {
  const next = tiles.filter(t => !t.done && !t.always && offered(t)).slice(0, 2);
  const v = tiles.filter(t => !t.done && (always(t) || next.includes(t)));
  tiles.forEach(t => { t.d.mesh.visible = v.includes(t); });
  return v;
}

/** Updates the stage chip. */
function showProgress() {
  const g = goal(stage.n);
  showStage(stage.n, g.filter(t => t.done).length, g.length);
}
showProgress();

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

/** Korki's tile follows the statue's spot to the garden in stage 2, if it's still for sale. */
function moveKorkiTile() {
  const t = tiles.find(x => x.id === 'korki')!;
  t.x = KORKI.x; t.z = KORKI.z; t.y = KORKI.y;
  t.d.mesh.position.set(t.x, t.y + 0.012, t.z);
}

/** Applies an upgrade's effect. `silent` skips animations and toasts (used when loading a save). */
export function applyUnlock(id: UnlockId, silent = false) {
  const t = tiles.find(x => x.id === id)!;
  t.done = true; t.d.mesh.visible = false;
  const pop = (...os: Object3D[]) => { if (!silent) os.forEach(popIn); };
  if (id === 'pack') player.back.cap = 14;
  if (id === 'turret') { turret = buildTurret(); pop(turret.g); }
  if (id === 'roulette') pop(enableCasino());
  if (id === 'runner') pop(hireRunner().g);
  if (id === 'boots') player.speed = 5.8;
  if (id === 'sled') pop(...openSled());
  if (id === 'net') { net = buildNet(); pop(net.g); }
  if (id === 'sushi') enterStage2(silent, moveKorkiTile);
  if (id === 'paddy') pop(...plantTerrace(0));
  if (id === 'plot2') pop(...plantTerrace(1));
  if (id === 'plot3') pop(...plantTerrace(2));
  if (id === 'farmer') pop(hireFarmer());
  if (id === 'porter') pop(hireRicePorter());
  if (id === 'seats') pop(...addSeats());
  if (id === 'chef' || id === 'chef3') pop(hireChef());
  if (id === 'kiosk') pop(...showKiosk(), ...openTakeout());
  if (id === 'premium') setPremium();
  if (id === 'korki') pop(enableKorki());
  showProgress();
  if (silent || t.gold) return;
  toast(t.name + ' unlocked');
  if (t.always || !goal(t.stage).every(x => x.done)) return;
  setTimeout(() => toast(t.stage === 1 ? 'Floe Sushi is ready to open' : 'Floe Sushi is fully built'), 1800);
}

export function updAuto(dt: number) {
  if (turret) {
    const tr = turret;
    tr.t -= dt;
    if (tr.t <= 0) {
      const src = V(tr.g.position.x, FY + 0.6, tr.g.position.z);
      const f = tryCatch(() => src, 'turret');
      tr.t = (f ? 2.0 : 0.5) / boost('training');
      if (f) tr.head.rotation.y = Math.atan2(f.g.position.x - src.x, f.g.position.z - src.z);
    }
  }
  if (net) {
    const n = net;
    n.t -= dt;
    if (n.t <= 0) {
      const f = tryCatch(() => n.src, 'net');
      n.t = (f ? 0.75 : 0.4) / boost('training');
    }
  }
}
