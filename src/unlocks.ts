// Purchasable upgrades: pay-in tiles and what they build. Stage 1 has the fish market's seven upgrades, then the
// gold tile that opens Floe Sushi (stage 2), which has upgrades of its own.
import type { Group, Object3D, Vector3 } from 'three';
import { enableCasino } from './casino';
import { openSled, openTakeout } from './counters';
import { decal, drawTile, type Decal } from './decals';
import { boost } from './economy';
import { tryCatch } from './fishing';
import { addTables } from './garden';
import { enableKorki, KORKI } from './korki';
import { stage, TERRACES } from './layout';
import { buildNet, buildTurret } from './machines';
import { player } from './player';
import { pointAt } from './pointers';
import { popIn } from './pop';
import { rating } from './rating';
import { showKiosk } from './hall';
import { addSeats, hireChef, setPremium } from './restaurant';
import { hireFarmer, hireRicePorter, plantTerrace } from './rice';
import { openShed } from './shed';
import { hireRunner } from './runner';
import { chime, unlock } from './sfx';
import { enterStage2, staging } from './stage';
import { showStage, toast, type TipContent } from './ui';
import { FY, price, V } from './util';

export type UnlockId =
  | 'pack' | 'turret' | 'roulette' | 'runner' | 'boots' | 'sled' | 'runner2' | 'net' | 'runner3' | 'sushi'
  | 'paddy' | 'seats' | 'chef' | 'farmer' | 'porter' | 'plot2' | 'tables' | 'chef3' | 'tables2' | 'plot3' | 'kiosk'
  | 'premium' | 'korki';
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
  /** Out from the start of its stage (once what it needs is bought), outside the two-at-a-time queue, showing the
   *  rating it needs until it's reached. It counts toward the stage. */
  shown?: boolean;
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

const onTerrace = (i: number) => ({ x: (TERRACES[i].x0 + TERRACES[i].x1) / 2, z: 0.8, y: TERRACES[i].top + 0.08 });

// The price list. Upgrades roughly double in price each time, and stage 2 starts about ten times higher than
// stage 1 (see economy.ts; the repeatable price, marketing and crew upgrades are on the upgrade squares, shop.ts).
const UNLOCKS: Unlock[] = [
  { id: 'pack', cost: 30, x: -1.3, z: 6.0, icon: '🎒', name: 'Bigger arms', desc: 'Carry 14 things at once', stage: 1 },
  { id: 'turret', cost: 90, x: -6.0, z: -3.3, icon: '🎯', name: 'Auto harpoon', desc: 'Keeps catching fish while you are away', stage: 1 },
  { id: 'roulette', cost: 150, x: -4.3, z: 0.6, icon: '🎰', name: 'Roulette table', desc: 'Bet your cash on the wheel', stage: 1 },
  { id: 'runner', cost: 300, x: -4.0, z: 3.6, icon: '🏃', name: 'Hire a runner', desc: 'Carries fish from the pile to your counters', stars: 3.5, stage: 1 },
  { id: 'boots', cost: 500, x: -6.0, z: 6.2, icon: '🥾', name: 'Snow boots', desc: 'Walk faster', stage: 1 },
  { id: 'sled', cost: 900, x: 6.55, z: -1.0, icon: '🚗', name: 'Drive-up window', desc: 'Drivers on the road buy fish in bulk, for half as much again', stars: 3.8, stage: 1 },
  { id: 'runner2', cost: 1200, x: -4.0, z: 3.6, icon: '🏃', name: 'Second runner', desc: 'Another runner carrying fish to your counters', stars: 3.9, needs: 'runner', stage: 1 },
  { id: 'net', cost: 1600, x: -1.9, z: -4.4, icon: '🥅', name: 'Ice net', desc: 'Hauls in fish nonstop', stars: 4.0, stage: 1 },
  { id: 'runner3', cost: 3500, x: -4.0, z: 3.6, icon: '🏃', name: 'Third runner', desc: 'A third runner carrying fish to your counters', stars: 4.2, needs: 'runner2', stage: 1 },
  { id: 'sushi', cost: 12000, x: -1.6, z: 1.4, icon: '🏯', name: 'Open Floe Sushi', desc: 'Stage 2: rebuild the market as a sushi restaurant, with rice terraces to the west', stage: 1, gold: true },
  { id: 'paddy', cost: 800, ...onTerrace(0), z: -1.4 /* north of the starting patch */, icon: '🌾', name: 'Rice terrace', desc: 'Plant the rest of the bottom terrace round your patch: three times the rice', stage: 2 },
  { id: 'seats', cost: 2500, x: -8.0, z: 9.0, icon: '🪑', name: 'More seats', desc: 'Eight more seats at the bar', stars: 3.6, stage: 2 },
  { id: 'chef', cost: 3000, x: 8.0, z: 9.0, icon: '🔪', name: 'Second chef', desc: 'Another chef at the bar', stars: 3.6, shown: true, stage: 2 },
  // out on the deck by the west end of the kitchen line, where rice comes in from the farm door: in the open (the
  // restaurant's west wall and roof hide the farm path from most of the room) and passed on every trip for rice
  { id: 'farmer', cost: 6000, x: -6.4, z: 0.6, icon: '🧑‍🌾', name: 'Hire a farmer', desc: 'Harvests the terraces onto a stack on the path', stars: 3.9, needs: 'paddy', stage: 2 },
  { id: 'porter', cost: 12000, x: -8.2, z: 5.0, icon: '🧺', name: 'Rice porter', desc: 'Carries harvested rice in to the kitchen line', stars: 4.1, needs: 'paddy', stage: 2 },
  { id: 'plot2', cost: 15000, ...onTerrace(1), icon: '🌱', name: 'Second terrace', desc: 'Plant the middle terrace: rice for more diners', stars: 4.1, needs: 'paddy', stage: 2 },
  { id: 'tables', cost: 20000, x: 6.2, z: 17.7, y: 0.02, icon: '⛱️', name: 'Garden tables', desc: 'Four tables in the front garden, and a waiter to serve them', stars: 4.2, stage: 2 },
  { id: 'chef3', cost: 25000, x: 8.0, z: 11.8, icon: '🔪', name: 'Third chef', desc: 'A third chef at the bar', stars: 4.3, needs: 'chef', shown: true, stage: 2 },
  { id: 'tables2', cost: 32000, x: -2.6, z: 21.2, y: 0.02, icon: '⛱️', name: 'More garden tables', desc: 'Four more tables west of the path, and a second waiter', stars: 4.3, needs: 'tables', stage: 2 },
  { id: 'plot3', cost: 40000, ...onTerrace(2), icon: '🌱', name: 'Third terrace', desc: 'Rice right up to the hot spring, for a full garden', stars: 4.4, needs: 'plot2', stage: 2 },
  { id: 'kiosk', cost: 50000, x: 8.2, z: 3.6, icon: '🥡', name: 'Takeout kiosk', desc: 'Drivers on the road buy boxes of sushi with the rice to spare; the chefs pack them', stars: 4.4, stage: 2 },
  { id: 'premium', cost: 60000, x: -6.2, z: 13.6, icon: '🏮', name: 'Premium menu', desc: 'Everything sells for 60% more', stars: 4.5, stage: 2 },
  { id: 'korki', cost: 10, x: KORKI.x, z: KORKI.z, icon: '🛴', name: "Korki's golden statue", desc: 'In memory of a good scooter', stage: 1, always: true, everywhere: true },
];

export const locked = (t: Tile) => !!t.stars && !t.open;
function tipOf(t: Tile): TipContent {
  return locked(t) ? { name: t.name, desc: `Needs a ★${t.stars!.toFixed(1)} rating (now ★${rating().toFixed(1)}) · ${price(t.cost)}` } : t;
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

/** The tiles on offer last time, to spot new ones; null before the first look (at a fresh start or a loaded save). */
let before: Set<Tile> | null = null;
/** The tiles on offer, as of the last look (`visibleTiles`, every tick). */
export const onOffer = () => [...before ?? []];

/** At most two unpaid upgrades are offered at a time, in order, plus any that are always on offer or shown. */
export function visibleTiles() {
  const next = tiles.filter(t => !t.done && !t.always && !t.shown && offered(t)).slice(0, 2);
  const v = tiles.filter(t => !t.done && (always(t) || (t.shown && offered(t)) || next.includes(t)));
  tiles.forEach(t => { t.d.mesh.visible = v.includes(t); });
  if (before) announce(v.filter(t => !before!.has(t)));
  before = new Set(v);
  return v;
}

/** Says what's newly on offer, and points the way to it until the player has seen it. */
function announce(fresh: Tile[]) {
  for (const t of fresh) pointAt({ x: t.x, y: t.y ?? FY, z: t.z }, t.icon, () => t.d.mesh.visible);
  // the gold tile has its own message ("Floe Sushi is ready to open")
  const named = fresh.filter(t => !t.gold).map(t => t.name);
  if (named.length) { toast(named.length === 1 ? `New upgrade: ${named[0]}` : `New upgrades: ${named.join(', ')}`); chime(); }
}

/** How much of this stage's upgrades are bought, 0 to 1 (the music brings in more parts as it grows). */
export function stageProgress() {
  const g = goal(stage.n);
  return g.filter(t => t.done).length / g.length;
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
      if (!silent && t.d.mesh.visible) { toast(`★${t.stars!.toFixed(1)} reached: ${t.name} for sale`); chime(); }
    }
    t.tip = tipOf(t);
  }
}

// ---------- machines ----------
let turret: { g: Group; head: Group; t: number } | null = null;
let net: { g: Group; t: number; src: Vector3 } | null = null;

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
  if (id === 'turret') { turret = { ...buildTurret(), t: 1 }; pop(turret.g); }
  if (id === 'roulette') pop(enableCasino());
  if (id === 'runner' || id === 'runner2' || id === 'runner3') pop(hireRunner().g);
  if (id === 'boots') player.speed = 5.8;
  if (id === 'sled') pop(...openSled());
  if (id === 'net') { net = { ...buildNet(), t: 0.5 }; pop(net.g); }
  if (id === 'sushi') enterStage2(silent, moveKorkiTile);
  if (id === 'paddy') pop(...plantTerrace(0));
  if (id === 'plot2') pop(...plantTerrace(1));
  if (id === 'plot3') pop(...plantTerrace(2));
  if (id === 'farmer') pop(hireFarmer());
  if (id === 'porter') pop(hireRicePorter());
  if (id === 'seats') pop(...addSeats());
  if (id === 'chef' || id === 'chef3') pop(hireChef());
  // the kiosk eats into the rice, so the fertilizer shed opens with it
  if (id === 'kiosk') { pop(...showKiosk(), ...openTakeout()); pop(...openShed(silent)); }
  if (id === 'tables') pop(...addTables(0));
  if (id === 'tables2') pop(...addTables(1));
  if (id === 'premium') setPremium();
  if (id === 'korki') pop(enableKorki());
  showProgress();
  if (silent || t.gold) return;
  toast(t.name + ' unlocked');
  if (id === 'kiosk') toast('New: the Fertilizer shed, by the water wheel');
  unlock();
  if (t.always || !goal(t.stage).every(x => x.done)) return;
  toast(t.stage === 1 ? 'Floe Sushi is ready to open' : 'Floe Sushi is fully built');
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
