// The upgrade square: each stage has one, and standing on it opens a panel of that stage's repeatable upgrades:
// a better product (prices), marketing (customers) and the crew (speed). Stage 2 also gets a fertilizer shed by the
// water wheel (shed.ts) once the takeout kiosk opens, whose square sells rice fertilizer the same way, or with a
// press of E (buy), as it sells only the one thing. The HUD's top left lists every modifier in play, as a percentage:
// Customers there is marketing and the rating together, as both bring customers in faster. Stage 3's square is down
// in the cellar, at the crafting bench in the workshop, priced in Fugu Chips: pricier bowls, word on the street (fans)
// and the cellar crew; and under them, everything each room has to buy, bought outright: the prep hall's (racks,
// barrels, steamers, the smokehouse, the hires who run its lines), the grow room's (beds, the picker, shelves) and the
// hearth room's (the cook and the attendant).
import { BENCH_PAD, type MenuRoom } from './cellarPlan';
import { BOSSES, F, MACH } from './fight';
import { repriceFish } from './counters';
import { decal, drawMenu } from './decals';
import { boost, MOD, modCost, MODS, mods, type ModId } from './economy';
import { buyHeld } from './input';
import { CELLAR_Y, found, level, SHED_YARD, shedYard, stage, type StageN } from './layout';
import { player } from './player';
import { demand } from './rating';
import { repriceSushi, sushiBoost } from './restaurant';
import { save } from './save';
import { levelUp } from './sfx';
import { SHED_AT } from './shed';
import { staging } from './stage';
import { buyFromMenu, isDone, menuSeen, menuTiles, offered, type Tile } from './unlocks';
import { MAX_MACHINES } from './cellarPlan';
import { toast } from './ui';
import { chips, FY, price } from './util';
import { wallet } from './wallet';

/** Where each stage's square is: by the walk-up counter, in the restaurant's aisle by the kitchen line, and in front of
 *  the crafting bench down in the cellar's workshop. */
export const SHOPS = [{ x: 0.9, z: 5.4 }, { x: -3.6, z: 5.0 }, { x: BENCH_PAD.x, z: BENCH_PAD.z }];
/** Half the square's side. */
const HALF = 0.95;

interface Square {
  x: number;
  z: number;
  stage: StageN;
  /** The panel's title. */
  title: string;
  /** The fertilizer shed's square, which sells only what's bought there (and the upgrade squares, everything else). */
  shed: boolean;
  /** The crafting bench's square: the stage's levels, and every cellar room's upgrades (unlocks.ts's menu tiles). */
  bench?: boolean;
  /** What's on its square, under the icon. */
  label?: string;
}
const SQUARES: Square[] = [
  { ...SHOPS[0], stage: 1, title: 'Market upgrades', shed: false },
  { ...SHOPS[1], stage: 2, title: 'Restaurant upgrades', shed: false },
  { ...SHED_AT, stage: 2, title: 'Fertilizer shed', shed: true },
  { ...SHOPS[2], stage: 3, title: 'Crafting bench', shed: false, bench: true, label: 'Craft' },
];
const pads = SQUARES.map(q => {
  const d = decal(HALF * 2, (c, w, h) => q.shed ? drawMenu(c, w, h, '🌿', 'Fertilizer') : drawMenu(c, w, h, q.bench ? '🔨' : '📈', q.label ?? 'Upgrade'));
  d.mesh.position.set(q.x, (q.shed ? SHED_YARD.y : q.stage === 3 ? CELLAR_Y : FY) + 0.01, q.z);
  return d;
});

/**
 * Whether a square is in place: its stage's (after the stage-up's show), and the shed's once it's open. Stage 3's is
 * only there for the player down in the cellar, and the others only up in the world.
 */
const active = (q: Square) =>
  q.stage === stage.n && !(stage.n >= 2 && staging()) && (!q.shed || shedYard.open) && (q.stage === 3) === level.down;
/** The square whose panel is open, if any. */
let on: Square | null = null;
/** Whether this phone's player is on a square, with its panel open. */
export const atSquare = () => on !== null;
/** Whether an upgrade can be bought yet: fertilizer once the shed is open, crew training once there's a crew. */
export const modOffered = (id: ModId) => (!MOD[id].shed || shedYard.open) && (!MOD[id].needs || isDone(MOD[id].needs));
/** The upgrades on sale on a square. */
const sold = (q: Square) => MODS.filter(m => m.stage === q.stage && !!m.shed === q.shed && modOffered(m.id));

const $ = (id: string) => document.getElementById(id)!;
const panel = $('shop'), title = $('shopTitle'), rows = $('shopRows');
const pct = (k: number) => (k >= 1 ? '+' : '−') + Math.round(Math.abs(k - 1) * 100) + '%';
const EFFECT = { price: 'Prices', customers: 'Customers', speed: 'Speed', growth: 'Rice growth' } as const;
const RING_EFFECT = { price: 'Bowl price', customers: 'Fans', speed: 'Crew', growth: 'Growth' } as const;

/** What a level of an upgrade is called: the marketing campaign, or just its level. */
function levelName(id: ModId, n: number) {
  const names = MOD[id].levels;
  return names ? names[Math.min(n, names.length) - 1] : `level ${n}`;
}

/** Buys the next level of an upgrade, if there's money for it. Returns whether it did. */
export function buyMod(id: ModId) {
  const cost = modCost(id);
  if (cost === null || wallet.money < cost || !modOffered(id)) return false;
  wallet.money -= cost;
  mods[id]++;
  repriceFish(); repriceSushi();
  toast(`${MOD[id].name}: ${levelName(id, mods[id])}`, 'shop');
  levelUp();
  shown = '';
  save();
  return true;
}

// ---------- a room's menu ----------
/** Why a room's upgrade isn't on sale yet: the boss to beat first, or what to buy before it. */
function lockedBy(t: Tile) {
  if (F.beaten < (t.beat ?? 0)) { const b = BOSSES[t.beat! - 1]; return { tag: `🔒 ${b.face}`, why: `After beating ${b.name} ${b.face}` }; }
  return { tag: '🔒', why: 'Not yet' };
}
/** The rooms whose upgrades the bench sells, in the order its menu lists them (the grow room once it's found). */
const BENCH_ROOMS: [MenuRoom, string][] = [['prep', 'Prep hall'], ['grow', 'Grow room'], ['hearth', 'Hearth room']];
const benchRooms = () => BENCH_ROOMS.filter(([r]) => r !== 'grow' || found.grow);
/** Every room's upgrade the bench sells. */
const benchTiles = () => benchRooms().flatMap(([r]) => menuTiles(r));
/** A heading in the bench's menu. */
function heading(text: string) {
  const h = document.createElement('div');
  h.className = 'sect'; h.textContent = text;
  return h;
}
/** The bench's menu: the ring's upgrades, then each room's, under its name. */
function renderBench(q: Square) {
  title.textContent = q.title;
  const out: HTMLElement[] = [heading('The ring'), ...sold(q).map(m => modRow(m, q.stage))];
  // (each room's: on sale first, then the locked ones, then what's done)
  const rank = (t: Tile) => (t.done ? 2 : offered(t) ? 0 : 1);
  for (const [r, name] of benchRooms()) out.push(heading(name), ...menuTiles(r).slice().sort((a, b) => rank(a) - rank(b)).map(tileRow));
  rows.replaceChildren(...out);
}
/** One row for a room's upgrade: what it is and does (a line's machine, how many there are), and its price on a
 *  button; one bought shows as done, one not found yet as locked, with what opens it. */
function tileRow(t: Tile) {
  {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mod'; b.dataset.tile = t.id;
    const sale = !t.done && offered(t);
    b.disabled = !sale || wallet.money < t.cost;
    if (!sale) b.classList.add('locked');
    const n = t.line ? F.lines[t.line].n : 0;
    const head = t.line ? `${t.name} · ${n} of ${MAX_MACHINES}` : t.name;
    const sub = t.done ? (t.line ? `The ${t.line === 'rice' ? 'rice' : t.line === 'fish' ? 'fish' : 'mushroom'} line is full` : t.desc)
      : sale ? t.desc : `${lockedBy(t).why}: ${t.desc.charAt(0).toLowerCase()}${t.desc.slice(1)}`;
    b.innerHTML = '<span class="ic"></span><span class="txt"><b></b><span></span></span><span class="cost"></span>';
    b.children[0].textContent = t.icon;
    b.children[1].children[0].textContent = head;
    b.children[1].children[1].textContent = sub;
    b.children[2].textContent = t.done ? (t.line ? 'Max' : 'Done ✓') : sale ? chips(t.cost, true) : lockedBy(t).tag;
    return b;
  }
}
/** What the bench's rooms' part shows: each upgrade's state, its price, and the line's machines (for rebuilding the
 *  rows). */
const tileKey = () => benchTiles().map(t => `${t.id}${t.done ? '+' : offered(t) ? '' : '-'}${t.cost}`).join() + F.beaten + MACH.rice[0].cap;

// ---------- panel ----------
/** One row per upgrade sold on square `q`: what the next level does, and its price on a button. */
function renderRows(q: Square) {
  if (q.bench) { renderBench(q); return; }
  title.textContent = q.title;
  rows.replaceChildren(...sold(q).map(m => modRow(m, q.stage)));
}
/** One row for an upgrade's next level: what it does, and its price on a button. */
function modRow(m: (typeof MODS)[number], n: StageN) {
  {
    const cost = modCost(m.id), now = boost(m.id), lv = mods[m.id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mod'; b.dataset.mod = m.id;
    b.disabled = cost === null || wallet.money < cost;
    const what = m.kind === 'speed' ? ['Fish, chop, runners', 'Kitchen', 'Training'][n - 1] : n === 3 ? RING_EFFECT[m.kind] : EFFECT[m.kind];
    const then = m.add ? now + m.per - 1 : now * m.per;
    const next = cost === null ? `${what} ${pct(now)} · fully upgraded` : `${what} ${pct(now)} → ${pct(then)}`;
    const head = cost === null ? `${m.name} · ${levelName(m.id, lv)}` : `${m.name} · ${m.levels ? 'next: ' + levelName(m.id, lv + 1) : 'level ' + (lv + 1)}`;
    b.innerHTML = '<span class="ic"></span><span class="txt"><b></b><span></span></span><span class="cost"></span>';
    b.children[0].textContent = m.icon;
    b.children[1].children[0].textContent = head;
    b.children[1].children[1].textContent = next;
    b.children[2].textContent = cost === null ? 'Max' : n === 3 ? chips(cost, true) : price(cost);
    return b;
  }
}
/** Which square's rows are built, at which levels. */
let built = '';
/**
 * Keeps the rows current without rebuilding them while the money ticks over, which would be most frames (and a button
 * replaced mid-tap loses its click): only a new level, an upgrade coming on sale, or another square rebuilds them.
 */
function syncRows(q: Square) {
  const key = q.title + (q.bench ? tileKey() : '') + MODS.map(m => modOffered(m.id) ? mods[m.id] : '-').join();
  if (key !== built) { built = key; renderRows(q); return; }
  const tiles = q.bench ? benchTiles() : [];
  for (const b of rows.children as HTMLCollectionOf<HTMLButtonElement>) {
    let off: boolean;
    if (b.dataset.tile) { const t = tiles.find(x => x.id === b.dataset.tile)!; off = t.done || !offered(t) || wallet.money < t.cost; }
    else if (b.dataset.mod) { const cost = modCost(b.dataset.mod as ModId); off = cost === null || wallet.money < cost; }
    else continue;
    if (b.disabled !== off) b.disabled = off;
  }
}
rows.addEventListener('click', e => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tile]');
  if (t && !t.disabled && on?.bench) {
    const tile = benchTiles().find(x => x.id === t.dataset.tile);
    if (tile && buyFromMenu(tile)) { save(); syncRows(on); }
    return;
  }
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mod]');
  if (b && !b.disabled && on && buyMod(b.dataset.mod as ModId)) syncRows(on);
});

// ---------- overview ----------
const overview = $('mods');
let shown = '';
/**
 * The modifiers in play this stage: each upgrade's effect, with Customers counting the rating in too (×0.6 at ★1 to
 * ×1.4 at ★5), as customers arrive at marketing × rating.
 */
function modifiers(): [icon: string, label: string, k: number][] {
  if (stage.n === 1) return [['🐟', 'Prices', boost('fillets')], ['📣', 'Customers', boost('marketing') * demand()], ['💪', 'Speed', boost('training')]];
  // stage 3 has no rating: word on the street alone brings the fans
  if (stage.n === 3) return [['🏷️', 'Bowl price', boost('bowls')], ['📣', 'Fans', boost('street')], ['🧑‍🍳', 'Crew', boost('cellarcrew')]];
  const out: [string, string, number][] = [['🍣', 'Prices', sushiBoost()], ['📣', 'Customers', boost('promo') * demand()], ['🧑‍🍳', 'Kitchen', boost('crew')]];
  if (shedYard.open) out.push(['🌿', 'Rice growth', boost('fertilizer')]);
  return out;
}
function renderOverview() {
  const list = modifiers(), key = list.map(r => r.join()).join('|');
  if (key === shown) return;
  shown = key;
  overview.replaceChildren(...list.map(([icon, label, k]) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span class="i"></span><span></span><b></b>';
    row.children[0].textContent = icon;
    row.children[1].textContent = label;
    row.children[2].textContent = pct(k);
    row.children[2].className = k > 1.0005 ? 'up' : k < 0.9995 ? 'down' : '';
    return row;
  }));
}

/** Whether buy (E) was held last frame: a square buys once per press, not every frame it's held. */
let held = false;
/**
 * Opens the panel while the player stands on a square that's in place, and keeps it and the overview current. On a
 * square that sells just one upgrade (the shed), pressing buy buys its next level too.
 */
export function updShop() {
  const p = player.g.position;
  let here: Square | null = null;
  SQUARES.forEach((q, i) => {
    const live = active(q);
    pads[i].mesh.visible = live;
    if (live && Math.abs(p.x - q.x) < HALF && Math.abs(p.z - q.z) < HALF) here = q;
  });
  if (here !== on) {
    on = here;
    panel.hidden = !on;
    // (the bench's menu leaves the camera where it is: ui.ts's keepInSight slides the view for the rest)
    panel.dataset.still = (on as Square | null)?.bench ? '1' : '';
    built = '';
  }
  const bench = !!(on as Square | null)?.bench;
  if (bench) for (const [r] of benchRooms()) menuSeen.add(r);
  const press = buyHeld() && !held;
  held = buyHeld();
  if (on && press) {
    if (bench) {
      // E buys the first of the rooms' things on sale there's the chips for
      const t = benchTiles().find(x => !x.done && offered(x) && wallet.money >= x.cost);
      if (t && buyFromMenu(t)) save();
    } else {
      const only = sold(on);
      if (only.length === 1) buyMod(only[0].id);
    }
  }
  // every frame: the money changes most frames, and an upgrade comes on sale with a hire (crew training)
  if (on) syncRows(on);
  renderOverview();
}
