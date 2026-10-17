// Purchasable upgrades: pay-in tiles and what they build. Stage 1 has the fish market's upgrades, then the gold tile
// that opens Floe Sushi (stage 2), which has upgrades of its own; then, once Mr. Fugu's offer is taken, the gold tile
// at his hatch that buys into the ring under the dock (stage 3). Down there they're priced in Fugu Chips 🐡 (still the
// same wallet): another machine for a line (up to six, each dearer), the big machine upgrades, the hires and the
// venue's tiers, all sold at the cookware shop as a tree whose bands open boss by boss (the practice fight opens the two
// hires, then each boss the next band), some needing another bought first; and once all five are beaten, the gold tile in
// Mr. Fugu's office: buying him out.
import type { Group, Object3D, Vector3 } from 'three';
import { enableBlackjack } from './blackjackTable';
import { enableCasino } from './casino';
import { CY, showVenue } from './cellar';
import { openSled, openTakeout } from './counters';
import { decal, drawTile, type Decal } from './decals';
import { boost } from './economy';
import { addMachine, BATCH, BOSSES, BUYOUT, CHIP, COOK_BATCH, F, hire, HIRES, type Ing, MACH, MACH_COST, machineCost, on, practiceDue, setTier, TIERS, upgradeLine, UPS } from './fight';
import { tryCatch } from './fishing';
import { addTables } from './garden';
import { enableKorki, KORKI } from './korki';
import { unlockFx } from './fx';
import { GAMES, HATCH_AT, stage, TERRACES, type StageN } from './layout';
import { buildNet, buildTurret } from './machines';
import { player } from './player';
import { offer } from './offer';
import { pointAt } from './pointers';
import { popIn } from './pop';
import { rating } from './rating';
import { showKiosk } from './hall';
import { addSeats, hireChef, setPremium } from './restaurant';
import { hireFarmer, hireRicePorter, plantTerrace } from './rice';
import { openShed } from './shed';
import { hireRunner } from './runner';
import { chime, unlock } from './sfx';
import { enableSlots } from './slotMachine';
import { spotlight } from './spotlight';
import { enterStage2, enterStage3, finishStage3, staging } from './stage';
import { showStage, toast, type TipContent } from './ui';
import { chips, FY, price, V } from './util';
import { MAX_MACHINES, type MenuRoom, ROOM_MENUS } from './cellarPlan';
import { wallet } from './wallet';

export type UnlockId =
  | 'pack' | 'turret' | 'roulette' | 'runner' | 'boots' | 'sled' | 'runner2' | 'net' | 'runner3' | 'sushi'
  | 'paddy' | 'seats' | 'chef' | 'farmer' | 'porter' | 'plot2' | 'tables' | 'chef3' | 'tables2' | 'plot3' | 'kiosk'
  | 'premium' | 'korki' | 'blackjack' | 'slots'
  | 'dohyo' | 'rack' | 'barrel' | 'bed' | 'washer' | 'salter' | 'picker' | 'cook' | 'attendant' | 'steam' | 'smoke' | 'shelves'
  | 'tier1' | 'tier2' | 'tier3' | 'buyout';
interface Unlock {
  id: UnlockId;
  cost: number;
  x: number;
  z: number;
  icon: string;
  /** A drawing of its own for the tile, in place of the icon's (icons.ts); the icon stays for the page. */
  art?: string;
  name: string;
  desc: string;
  stage: StageN;
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
  /** A gold tile that ends its stage (and opens the next): bigger, and offered once the rest of the stage is built. */
  gold?: boolean;
  /** Ground height under the tile, where it isn't the deck (the terraces and the path). */
  y?: number;
  /** Down in the cellar (stage 3): how many bosses must be beaten before it's found (it's hidden till then), the line
   *  it adds another machine to (bought again and again, each dearer, up to six), and how big it is. */
  beat?: number;
  /** Down in the cellar: on sale only once the practice fight's won (a game that's beaten a boss has). */
  spar?: boolean;
  line?: Ing;
  size?: number;
  /** Sold on its room's upgrade square, in a menu with the room's other upgrades, rather than on a tile of its own. */
  menu?: MenuRoom;
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
/** Down in the cellar (stage 3's upgrades are on its floor). */
const below = (x: number, z: number) => ({ x, z, y: CY + 0.02 });
/** A tile in the cellar: priced in chips (a machine's, as its line has it now), found once `beat` bosses are beaten. */
function ring(id: UnlockId, x: number, z: number, icon: string, name: string, desc: string, beat: number, chipCost: number, line?: Ing, needs?: UnlockId): Unlock[] {
  return [{ id, cost: chipCost * CHIP, ...below(x, z), icon, name, desc, stage: 3, beat, line, needs, size: 1.6 }];
}

// The price list. Upgrades roughly double in price each time, and stage 2 starts about ten times higher than
// stage 1 (see economy.ts; the repeatable price, marketing and crew upgrades are on the upgrade squares, shop.ts).
const UNLOCKS: Unlock[] = [
  { id: 'pack', cost: 30, x: -1.3, z: 6.0, icon: '🎒', name: 'Bigger arms', desc: 'Carry 14 things at once', stage: 1 },
  { id: 'turret', cost: 90, x: -6.0, z: -3.3, icon: '🎯', name: 'Auto harpoon', desc: 'Keeps catching fish while you are away', stage: 1 },
  // by the gap in the west fence the jetty goes out through, so the jetty builds out from where you stand
  { id: 'roulette', cost: 150, x: -6.3, z: -1.2, icon: '🛳️', name: 'Casino boat', desc: 'A casino moored off the dock, with a roulette table', stage: 1 },
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
  // the porter carries from the farmer's stack, which only the farmer fills
  { id: 'porter', cost: 12000, x: -8.2, z: 5.0, icon: '🧺', name: 'Rice porter', desc: 'Carries harvested rice in to the kitchen line', stars: 4.1, needs: 'farmer', stage: 2 },
  { id: 'plot2', cost: 15000, ...onTerrace(1), icon: '🌱', name: 'Second terrace', desc: 'Plant the middle terrace: rice for more diners', stars: 4.1, needs: 'paddy', stage: 2 },
  { id: 'tables', cost: 20000, x: 6.2, z: 17.7, y: 0.02, icon: '⛱️', name: 'Garden tables', desc: 'Four tables in the front garden, and a waiter to serve them', stars: 4.2, stage: 2 },
  { id: 'chef3', cost: 25000, x: 8.0, z: 11.8, icon: '🔪', name: 'Third chef', desc: 'A third chef at the bar', stars: 4.3, needs: 'chef', shown: true, stage: 2 },
  { id: 'tables2', cost: 32000, x: -2.6, z: 21.2, y: 0.02, icon: '⛱️', name: 'More garden tables', desc: 'Four more tables west of the path, and a second waiter', stars: 4.3, needs: 'tables', stage: 2 },
  { id: 'plot3', cost: 40000, ...onTerrace(2), icon: '🌱', name: 'Third terrace', desc: 'Rice right up to the hot spring, for a full garden', stars: 4.4, needs: 'plot2', stage: 2 },
  { id: 'kiosk', cost: 50000, x: 8.2, z: 3.6, icon: '🥡', name: 'Takeout kiosk', desc: 'Drivers on the road buy boxes of sushi with the rice to spare; the chefs pack them', stars: 4.4, stage: 2 },
  { id: 'premium', cost: 60000, x: -6.2, z: 13.6, icon: '🏮', name: 'Premium menu', desc: 'Everything sells for 60% more', stars: 4.5, stage: 2 },
  // by Mr. Fugu's hatch, once the player has said yes to him
  // (just in front of his hatch, on the restaurant's side, where the player stands to meet him: any nearer the
  // restaurant and its eaves hide it from the camera)
  { id: 'dohyo', cost: 1_000_000, x: HATCH_AT.x, z: HATCH_AT.z + 1.65, size: 2.0, icon: '🐡', art: 'mrFugu', name: 'Buy into the ring', desc: "Stage 3: Mr. Fugu's sumo ring under the dock. Your cash stays in the till", stage: 2, gold: true },
  // down in the cellar, priced in chips (all but the buyout sold at the cookware shop: these spots are only where their
  // tiles were), and the buyout in Mr. Fugu's office
  ...ring('rack', 13.2, 3.9, '🌾', 'Another drying rack', 'More room on the rice line', 0, MACH_COST.rice, 'rice'),
  ...ring('washer', 14.8, 3.9, '🧺', HIRES.washer.name, 'Runs the rice line: fills the racks and carries rice to the pot', HIRES.washer.beat, HIRES.washer.cost),
  ...ring('steam', 16.4, 3.9, '♨️', MACH.rice[1].name, `Swaps every drying rack for steam baskets: ${MACH.rice[1].cap} rice every ${MACH.rice[1].time} s`, UPS.rice.beat, UPS.rice.cost),
  ...ring('barrel', 13.2, 5.9, '🛢️', 'Another salt barrel', 'More room on the fish line', 0, MACH_COST.fish, 'fish'),
  ...ring('salter', 14.8, 5.9, '🧂', HIRES.salter.name, 'Runs the fish line: fills the barrels and carries fish to the pot', HIRES.salter.beat, HIRES.salter.cost),
  ...ring('smoke', 16.4, 5.9, '🏚️', MACH.fish[1].name, `Swaps every salt barrel for a smokehouse: ${MACH.fish[1].cap} fish every ${MACH.fish[1].time} s`, UPS.fish.beat, UPS.fish.cost),
  ...ring('bed', 13.3, -3.95, '🍄', 'Another mushroom bed', 'More room on the mushroom line', 1, MACH_COST.mush, 'mush'),
  ...ring('picker', 14.7, -3.95, '🧑‍🌾', HIRES.picker.name, 'Runs the mushroom line: picks the beds and carries mushrooms to the pot', HIRES.picker.beat, HIRES.picker.cost),
  ...ring('shelves', 16.1, -3.95, '✨', 'Glowing grow shelves', `Swaps every bed for glowing shelves: ${MACH.mush[1].cap} mushrooms, one every ${MACH.mush[1].time} s`, UPS.mush.beat, UPS.mush.cost),
  ...ring('attendant', 9.6, 5.9, '🍲', HIRES.attendant.name, 'Carries bowls from the counter to the soup bar', HIRES.attendant.beat, HIRES.attendant.cost),
  ...ring('cook', 7.6, 5.9, '👨‍🍳', HIRES.cook.name, `Cooks while you're away: ${COOK_BATCH} bowls, not ${BATCH}`, HIRES.cook.beat, HIRES.cook.cost),
  ...[1, 2, 3].flatMap(i => ring(`tier${i}` as UnlockId, 1.6, 1.9, ['', '🏮', '🥁', '⛩️'][i], TIERS[i].name,
    `The venue grows to ${TIERS[i].seats} seats${i === 2 ? ', with taiko drummers' : ''}`, [0, 1, 3, 4][i], [0, 200, 900, 2500][i], undefined, i > 1 ? `tier${i - 1}` as UnlockId : undefined)),
  { id: 'buyout', cost: BUYOUT * CHIP, ...below(7.55, -5.25), icon: '🐡', name: 'Buy back all his chips', desc: "The ring is yours: Mr. Fugu's 30% ends, the restaurant's till comes back, and stage 4 opens", stage: 3, gold: true, beat: BOSSES.length },
  { id: 'korki', cost: 10, x: KORKI.x, z: KORKI.z, icon: '🛴', name: "Korki's golden statue", desc: 'In memory of a good scooter', stage: 1, always: true, everywhere: true },
  // the casino boat's other games, on its deck: fun extras, for sale from when the boat comes in
  { id: 'slots', cost: 250, ...GAMES.slots, icon: '🎰', name: 'Slot machine', desc: 'Pull the lever for three of a kind', stage: 1, always: true, everywhere: true, needs: 'roulette' },
  { id: 'blackjack', cost: 400, ...GAMES.blackjack, icon: '🃏', name: 'Blackjack table', desc: 'Beat the dealer to 21', stage: 1, always: true, everywhere: true, needs: 'roulette' },
];

// The cellar's rooms sell their upgrades at the cookware shop (shop.ts's tree): the prep hall's racks, barrels,
// steamers, smokehouse and the two hires who run its lines; the grow room's beds, picker and shelves; the hearth room's
// attendant and cook; and the venue's tiers.
const MENU_OF: Partial<Record<UnlockId, MenuRoom>> = {
  rack: 'prep', barrel: 'prep', washer: 'prep', salter: 'prep', steam: 'prep', smoke: 'prep',
  bed: 'grow', picker: 'grow', shelves: 'grow', attendant: 'hearth', cook: 'hearth', tier1: 'venue', tier2: 'venue', tier3: 'venue',
};
// The tree's lines: a line's big upgrade needs its hand first, and the cook the attendant (the tiers need the one
// before, above). The two lines' hands wait for the practice fight, whose prize hires them.
const NEEDS: Partial<Record<UnlockId, UnlockId>> = { steam: 'washer', smoke: 'salter', shelves: 'picker', cook: 'attendant' };
for (const u of UNLOCKS) {
  const room = MENU_OF[u.id];
  if (room) Object.assign(u, { menu: room, ...below(ROOM_MENUS[room].x, ROOM_MENUS[room].z) });
  if (NEEDS[u.id]) u.needs = NEEDS[u.id];
  if (u.id === 'washer' || u.id === 'salter') u.spar = true;
}

export const locked = (t: Tile) => !!t.stars && !t.open;
function tipOf(t: Tile): TipContent {
  if (locked(t)) return { name: t.name, desc: `Needs a ★${t.stars!.toFixed(1)} rating (now ★${rating().toFixed(1)}) · ${price(t.cost)}` };
  if (t.line) return { name: t.name, desc: `${t.desc} (${F.lines[t.line].n} of ${MAX_MACHINES}) · ${chips(t.cost, true)}` };
  return t.stage === 3 ? { name: t.name, desc: `${t.desc} · ${chips(t.cost, true)}` } : t;
}

export const tiles: Tile[] = UNLOCKS.map(u => {
  const size = u.size ?? (u.gold ? 2.6 : 2.0);
  const state = { ...u, paid: 0, done: false, open: false };
  const t: Tile = Object.assign(state, { d: decal(size, (c, w, h) => drawTile(c, w, h, state)), tip: u, half: size / 2 });
  t.tip = tipOf(t);
  t.d.mesh.position.set(t.x, (t.y ?? FY) + 0.012, t.z);
  t.d.mesh.visible = false;
  return t;
});

export function redrawTile(t: Tile) {
  drawTile(t.d.ctx, 256, 256, { ...t, chips: t.stage === 3 });
  t.d.tex.needsUpdate = true;
}
// Tiles drawn before the web font loaded fall back to a system font; redraw once it's ready.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => tiles.forEach(redrawTile));

/** Whether an upgrade tile has been bought. */
export const isDone = (id: UnlockId) => tiles.some(t => t.id === id && t.done);
/** A stage's own upgrades: what its progress chip counts. */
const goal = (n: StageN) => tiles.filter(t => t.stage === n && !t.always && !t.gold);
const built = (n: StageN) => goal(n).every(t => t.done);
/** All of a stage's own upgrades are built. */
export const stageBuilt = built;

export function offered(t: Tile) {
  // down in the cellar, once the bosses that reveal them are beaten (the buyout too)
  if (t.stage === 3) return stage.n === 3 && !staging() && F.beaten >= (t.beat ?? 0) && (!t.spar || !practiceDue()) && (!t.needs || isDone(t.needs));
  // the gold tiles, once their stage is built: stage 2's only once Mr. Fugu's offer has been taken
  if (t.gold) {
    if (t.stage !== stage.n || staging() || !built(t.stage)) return false;
    return t.stage !== 2 || offer.answer === 2;
  }
  // a new stage's tiles wait for the stage-up's show to finish
  if (t.stage !== stage.n || staging()) return false;
  return !t.needs || isDone(t.needs);
}

/** Upgrades on offer all through the current stage (or every stage), once the stage-up's show is over and what they need is bought. */
const always = (t: Tile) => t.always && !staging() && (!t.needs || isDone(t.needs)) && (t.everywhere || t.stage === stage.n);

/** The tiles on offer last time, to spot new ones; null before the first look (at a fresh start or a loaded save). */
let before: Set<Tile> | null = null;
/** The tiles on offer, as of the last look (`visibleTiles`, every tick). */
export const onOffer = () => [...before ?? []];

/** At most two unpaid upgrades are offered at a time, in order, plus any that are always on offer or shown. (Down in
 *  the cellar, every one that's been found: the arena's tiers and the buyout on tiles, the rest in their rooms' menus.) */
export function visibleTiles() {
  const next = tiles.filter(t => !t.done && !t.always && !t.shown && t.stage !== 3 && offered(t)).slice(0, 2);
  const v = tiles.filter(t => !t.done && !t.menu && (always(t) || ((t.shown || t.stage === 3) && offered(t)) || next.includes(t)));
  tiles.forEach(t => { t.d.mesh.visible = v.includes(t); });
  // (and what's on the rooms' menus, for saying what's new)
  const all = [...v, ...menuOffer()];
  if (before) announce(all.filter(t => !before!.has(t)));
  before = new Set(all);
  return v;
}
/** The cellar's upgrades on sale in the rooms' menus now. */
export const menuOffer = () => tiles.filter(t => t.menu && !t.done && offered(t));
/** A room's upgrades, in the menu's order: everything it sells, bought, on sale or still to be found. */
export const menuTiles = (room: MenuRoom) => tiles.filter(t => t.menu === room);
/** The menus the player has looked at since something new came on sale in them (till then, an arrow points at it). */
export const menuSeen = new Set<MenuRoom>();
/** Buys a menu's upgrade outright, if it's on sale and there are the chips for it. Returns whether it did. */
export function buyFromMenu(t: Tile) {
  if (!t.menu || t.done || !offered(t) || wallet.money < t.cost) return false;
  wallet.money -= t.cost;
  applyUnlock(t.id);
  return true;
}

/** Says what's newly on offer, and points the way to it until the player has seen it (a room's menu: until they've
 *  looked at it). */
function announce(fresh: Tile[]) {
  for (const t of fresh) {
    if (t.menu) {
      const room = t.menu;
      menuSeen.delete(room);
      pointAt({ x: t.x, y: t.y ?? FY, z: t.z }, t.icon, () => !t.done && !menuSeen.has(room) && offered(t));
    } else pointAt({ x: t.x, y: t.y ?? FY, z: t.z }, t.icon, () => t.d.mesh.visible);
  }
  // the gold tile has its own message ("Floe Sushi is ready to open")
  const named = fresh.filter(t => !t.gold).map(t => t.name);
  if (named.length) { toast(named.length === 1 ? `New upgrade: ${named[0]}` : `New upgrades: ${named.join(', ')}`); chime(); }
}

/** How much of this stage's upgrades are bought, 0 to 1 (the music brings in more parts as it grows). Down in the
 *  cellar, how many of the bosses are beaten. */
export function stageProgress() {
  if (stage.n === 3) return F.beaten / BOSSES.length;
  const g = goal(stage.n);
  return g.filter(t => t.done).length / g.length;
}

/** Updates the stage chip: upgrades built, or (stage 3) bosses beaten. */
export function showProgress() {
  if (stage.n === 3) { showStage(3, F.beaten, BOSSES.length); return; }
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
  // what it builds first is what the spotlight goes to (the kiosk, not the shed that opens with it)
  const shown: Object3D[] = [];
  const pop = (...os: Object3D[]) => { if (silent) return; os.forEach(popIn); if (!shown.length) shown.push(...os); };
  if (id === 'pack') player.back.cap = 14;
  if (id === 'turret') { turret = { ...buildTurret(), t: 1 }; pop(turret.g); }
  if (id === 'roulette') pop(...enableCasino(silent));
  if (id === 'blackjack') pop(enableBlackjack());
  if (id === 'slots') pop(enableSlots());
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
  if (id === 'dohyo') enterStage3(silent);
  // (the cellar's own: loading a save, the cellar's state comes back by itself, ring.ts's loadCellar)
  if (t.stage === 3 && !t.gold) {
    if (silent) return;
    ringUnlock(t);
    if (!t.done) return;
  }
  if (id === 'buyout') finishStage3(silent);
  showProgress();
  if (silent || t.gold) return;
  toast(t.name + ' unlocked');
  if (id === 'kiosk') toast('New: the Fertilizer shed, by the water wheel');
  if (id === 'runner') toast('New at the Upgrade square: Crew training');
  unlock();
  unlockFx(t, 1.1, (t.y ?? FY) + 0.05);
  // a moment on camera for what it built, or for the player with nothing new to see (boots, bigger arms); the casino
  // boat has its own, out to the ship as it comes in, and the cellar's have theirs (ring.ts's on.built)
  if (id !== 'roulette' && t.stage !== 3) spotlight(shown.length ? shown : [player.g]);
  if (t.always || !goal(t.stage).every(x => x.done)) return;
  toast(t.stage === 1 ? 'Floe Sushi is ready to open' : 'Floe Sushi is fully built');
}

/** A cellar tile bought: what it does to the cellar, and its moment on camera (ring.ts's on.built). Another machine
 *  leaves the tile there for the next, dearer one, until the line has six. */
function ringUnlock(t: Tile) {
  const id = t.id;
  if (t.line) {
    addMachine(t.line);
    syncRingTile(t);
    toast(`${t.name.replace('Another', 'A new')}: ${F.lines[t.line].n} of ${MAX_MACHINES}`);
    unlock();
    on.built({ line: t.line });
    return;
  }
  if (id === 'washer' || id === 'salter' || id === 'picker' || id === 'cook' || id === 'attendant') {
    hire(id);
    on.built({ role: id });
  }
  // (an upgrade swaps every machine of its line)
  const up = ({ steam: 'rice', smoke: 'fish', shelves: 'mush' } as const)[id as 'steam' | 'smoke' | 'shelves'];
  if (up) {
    upgradeLine(up);
    on.built({ line: up, all: true });
  }
  if (id === 'tier1' || id === 'tier2' || id === 'tier3') {
    const n = Number(id.slice(4));
    setTier(n); showVenue(n);
    on.built({ tier: n });
  }
}
/** Puts a cellar tile in line with the cellar: a line's tile at its next machine's price, or gone once it has six;
 *  the rest bought or not as the cellar says (after loading a save). */
function syncRingTile(t: Tile) {
  if (t.line) {
    const full = F.lines[t.line].n >= MAX_MACHINES;
    t.done = full;
    if (!full) { const c = machineCost(t.line) * CHIP; if (c !== t.cost) { t.cost = c; t.paid = Math.min(t.paid, c - 1); } }
    if (t.done || t.paid >= t.cost) t.paid = 0;
  } else if (!t.gold) {
    const id = t.id;
    t.done = id === 'washer' || id === 'salter' || id === 'picker' || id === 'cook' || id === 'attendant' ? !!F.hires[id]
      : id === 'steam' ? F.lines.rice.up === 1 : id === 'smoke' ? F.lines.fish.up === 1 : id === 'shelves' ? F.lines.mush.up === 1
      : id.startsWith('tier') ? F.tier >= Number(id.slice(4)) : t.done;
  }
  t.tip = tipOf(t);
  if (t.done) t.d.mesh.visible = false;
  redrawTile(t);
}
/** All the cellar's tiles, in line with it (a fresh cellar, or one loaded from a save). */
export function syncRingTiles() {
  for (const t of tiles) if (t.stage === 3 && !t.gold) syncRingTile(t);
  showProgress();
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
