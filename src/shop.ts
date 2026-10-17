// The upgrade square: each stage has one, and standing on it opens a panel of that stage's repeatable upgrades:
// a better product (prices), marketing (customers) and the crew (speed). Stage 2 also gets a fertilizer shed by the
// water wheel (shed.ts) once the takeout kiosk opens, whose square sells rice fertilizer the same way, or with a
// press of E (buy), as it sells only the one thing. The HUD's top left lists every modifier in play, as a percentage:
// Customers there is marketing and the rating together, as both bring customers in faster. Stage 3's square is down
// in the cellar, at the shop counter in the cookware shop, priced in Fugu Chips: pricier bowls, word on the street (fans)
// and the cellar crew; and under them, everything each room has to buy, bought outright: the prep hall's (racks,
// barrels, steamers, the smokehouse, the hires who run its lines), the grow room's (beds, the picker, shelves) and the
// hearth room's (the attendant and the cook).
import { touchBuy } from './buy';
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
import { spotOn } from './spotlight';
import { staging } from './stage';
import { buyFromMenu, isDone, menuSeen, menuTiles, offered, type Tile } from './unlocks';
import { MAX_MACHINES } from './cellarPlan';
import { toast } from './ui';
import { chips, FY, price } from './util';
import { wallet } from './wallet';

/** Where each stage's square is: by the walk-up counter, in the restaurant's aisle by the kitchen line, and in front of
 *  the shop counter down in the cellar's cookware shop. */
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
  /** The shop counter's square: the stage's levels, and every cellar room's upgrades (unlocks.ts's menu tiles). */
  bench?: boolean;
  /** What's on its square, under the icon. */
  label?: string;
}
const SQUARES: Square[] = [
  { ...SHOPS[0], stage: 1, title: 'Market upgrades', shed: false },
  { ...SHOPS[1], stage: 2, title: 'Restaurant upgrades', shed: false },
  { ...SHED_AT, stage: 2, title: 'Fertilizer shed', shed: true },
  { ...SHOPS[2], stage: 3, title: 'Cookware shop', shed: false, bench: true, label: 'Shop' },
];
const pads = SQUARES.map(q => {
  const d = decal(HALF * 2, (c, w, h) => q.shed ? drawMenu(c, w, h, '🌿', 'Fertilizer') : drawMenu(c, w, h, q.bench ? '🍳' : '📈', q.label ?? 'Upgrade'));
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
/** The bench's menu is in tabs, one short list at a time (a phone has room for little more): the ring's upgrades, and
 *  each room's (the grow room's once it's found). */
type BenchTab = 'ring' | MenuRoom;
const TABS: { id: BenchTab; icon: string; label: string; heading: string }[] = [
  { id: 'ring', icon: '🏷️', label: 'Ring', heading: 'The ring' }, { id: 'prep', icon: '🌾', label: 'Prep', heading: 'Prep hall' },
  { id: 'grow', icon: '🍄', label: 'Grow', heading: 'Grow room' }, { id: 'hearth', icon: '🍲', label: 'Hearth', heading: 'Hearth room' },
];
const benchTabs = () => TABS.filter(t => t.id !== 'grow' || found.grow);
const benchRooms = () => benchTabs().map(t => t.id).filter((t): t is MenuRoom => t !== 'ring');
/** Every room's upgrade the bench sells. */
const benchTiles = () => benchRooms().flatMap(r => menuTiles(r));
/** The tab open, and whether there's something in a tab there are the chips for now (its dot). */
let tab: BenchTab = 'prep';
function affordable(t: BenchTab, q: Square) {
  if (t === 'ring') return sold(q).some(m => { const c = modCost(m.id); return c !== null && wallet.money >= c; });
  return menuTiles(t).some(x => !x.done && offered(x) && wallet.money >= x.cost);
}
const tabsEl = $('shopTabs');
tabsEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
  if (!b || !on?.bench) return;
  tab = b.dataset.tab as BenchTab;
  built = '';
  syncRows(on);
});
/** One thing the bench sells, as its card and the line under the cards show it: the ring's next level of an upgrade,
 *  or a room's upgrade. */
interface Item {
  key: string; icon: string; name: string; desc: string; tag: string; sale: boolean; done?: boolean; cost: number | null; buy: () => boolean;
  /** A line's machine: its name without the count, and how many the line has of how many (the list's dots). */
  plain?: string; pips?: [number, number];
}
function modItem(m: (typeof MODS)[number]): Item {
  const cost = modCost(m.id), now = boost(m.id), lv = mods[m.id];
  const then = m.add ? now + m.per - 1 : now * m.per, what = m.kind === 'speed' ? 'Crew' : RING_EFFECT[m.kind];
  return {
    key: 'mod:' + m.id, icon: m.icon, name: cost === null ? `${m.name} · ${levelName(m.id, lv)}` : `${m.name} ${lv + 1}`,
    desc: cost === null ? `${what} ${pct(now)} · fully upgraded` : `${m.levels ? levelName(m.id, lv + 1) + ': ' : ''}${what} ${pct(now)} → ${pct(then)}`,
    tag: cost === null ? 'Max' : chips(cost, true), sale: cost !== null, cost, buy: () => buyMod(m.id),
  };
}
function tileItem(t: Tile): Item {
  const sale = !t.done && offered(t), n = t.line ? F.lines[t.line].n : 0;
  return {
    key: 'tile:' + t.id, icon: t.icon, name: t.line ? `${t.name.replace(/^Another (\w)/, (_, c: string) => c.toUpperCase())} ${n}/${MAX_MACHINES}` : t.name,
    desc: t.done ? (t.line ? `The ${t.line === 'rice' ? 'rice' : t.line === 'fish' ? 'fish' : 'mushroom'} line is full` : t.desc)
      : sale ? t.desc : `${lockedBy(t).why}: ${t.desc.charAt(0).toLowerCase()}${t.desc.slice(1)}`,
    tag: t.done ? (t.line ? 'Max' : '✓') : sale ? chips(t.cost, true) : lockedBy(t).tag, sale, done: t.done, cost: t.cost,
    buy: () => { const ok = buyFromMenu(t); if (ok) save(); return ok; },
    plain: t.line ? t.name.replace(/^Another (\w)/, (_, c: string) => c.toUpperCase()) : undefined, pips: t.line ? [n, MAX_MACHINES] : undefined,
  };
}
/** What a tab sells, each in its place whatever's bought (so the menu keeps its size and shape): the ring's three
 *  upgrades, or a room's, what's done ticked. */
const itemsOf = (t: BenchTab, q: Square) => (t === 'ring' ? sold(q).map(modItem) : menuTiles(t).map(tileItem));
function benchItems(q: Square): { items: Item[] } {
  return { items: listMode() ? benchTabs().flatMap(t => itemsOf(t.id, q)) : itemsOf(tab, q) };
}
/** With a mouse and keys there's room for it all: one list down the side, a heading for each tab's things (which folds
 *  them away, as its number key does), and a line for each with a price button that buys it there and then (no
 *  picking first: that's for a thumb on a phone). What's locked comes last in its room, thinner; the grow room, till
 *  it's found, is just a line saying who opens it. */
const listMode = () => !touchBuy();
/** The rooms folded away in the list. */
const shut = new Set<BenchTab>();
/** The line under the mouse, which E buys. */
let hovered = '';
const purseEl = $('shopPurse'), keysEl = $('shopKeys');
function listRow(it: Item) {
  const row = document.createElement('div');
  row.className = 'mod row'; row.dataset.key = it.key;
  if (it.key.startsWith('tile:')) row.dataset.tile = it.key.slice(5); else row.dataset.mod = it.key.slice(4);
  if (it.done) row.classList.add('done'); else if (!it.sale) row.classList.add('locked');
  row.innerHTML = '<span class="ic"></span><span class="txt"><b></b><span class="sub"></span></span><button type="button" class="cost"></button>';
  row.children[0].textContent = it.icon;
  const name = row.children[1].children[0];
  name.textContent = it.plain ?? it.name;
  if (it.pips) {
    const [n, max] = it.pips, dots = document.createElement('span');
    dots.className = 'pips'; dots.setAttribute('role', 'img'); dots.setAttribute('aria-label', `${n} of ${max}`);
    for (let i = 0; i < max; i++) { const d = document.createElement('i'); if (i < n) d.className = 'on'; dots.append(d); }
    name.append(dots);
  }
  const sub = row.children[1].children[1] as HTMLElement;
  sub.textContent = it.desc; sub.title = it.desc;
  const b = row.children[2] as HTMLButtonElement;
  b.dataset.key = it.key; b.textContent = it.tag; b.disabled = !canBuy(it);
  b.setAttribute('aria-label', it.sale ? `Buy ${it.name}, ${it.tag}` : `${it.name}: ${it.tag}`);
  return row;
}
function renderBenchList(q: Square) {
  title.textContent = q.title;
  panel.classList.add('side');
  tabsEl.hidden = true; pickEl.hidden = true;
  rows.classList.remove('cards');
  const out: HTMLElement[] = [];
  TABS.forEach((t, i) => {
    const h = document.createElement('button');
    h.type = 'button'; h.className = 'sect'; h.dataset.sect = t.id;
    h.setAttribute('aria-expanded', String(!shut.has(t.id)));
    h.innerHTML = '<span class="chev" aria-hidden="true">▾</span><span class="nm"></span><span class="cnt"></span><kbd></kbd>';
    h.children[1].textContent = t.heading; h.children[3].textContent = String(i + 1);
    const box = document.createElement('div');
    box.className = 'sectRows'; box.dataset.of = t.id; box.hidden = shut.has(t.id);
    if (t.id === 'grow' && !found.grow) {
      const note = document.createElement('div'), b = BOSSES[0];
      note.className = 'sectNote'; note.textContent = `🔒 Found after beating ${b.name} ${b.face}`;
      box.append(note);
    } else {
      const its = itemsOf(t.id, q);
      box.append(...[...its.filter(x => x.sale || x.done), ...its.filter(x => !x.sale && !x.done)].map(listRow));
    }
    out.push(h, box);
  });
  rows.replaceChildren(...out);  syncBench(q);
}
/** Folds a room of the list away, or opens it again (and brings it into view). */
function toggleRoom(t: BenchTab) {
  if (shut.has(t)) shut.delete(t); else shut.add(t);
  const h = rows.querySelector<HTMLElement>(`.sect[data-sect="${t}"]`), box = rows.querySelector<HTMLElement>(`.sectRows[data-of="${t}"]`);
  h?.setAttribute('aria-expanded', String(!shut.has(t)));
  if (box) box.hidden = shut.has(t);
  if (!shut.has(t)) h?.scrollIntoView?.({ block: 'nearest' });
}
window.addEventListener('keydown', e => {
  const i = /^Digit([1-4])$/.exec(e.code)?.[1];
  if (!i || e.repeat || !on?.bench || !listMode() || panel.hidden || (e.target as HTMLElement).closest?.('input, textarea')) return;
  toggleRoom(TABS[+i - 1].id);
});
/** The card picked, to show what it does and buy it: by default the first there are the chips for. */
let picked = '';
const canBuy = (it: Item) => it.sale && it.cost !== null && wallet.money >= it.cost;
const pickEl = $('shopPick');
/** The bench's menu, the same size whatever's in the tab: its tabs, the open one's cards (each with its price, its lock
 *  or its tick), and under them the picked card: what it does, and its Buy button. Two taps to buy (pick, then buy),
 *  so a thumb on a phone doesn't buy what it brushes past. */
function renderBench(q: Square) {
  if (listMode()) { renderBenchList(q); return; }
  panel.classList.remove('side');
  title.textContent = q.title;
  tabsEl.hidden = false;
  if (!benchTabs().some(t => t.id === tab)) tab = 'prep';
  tabsEl.replaceChildren(...benchTabs().map(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = t.id;
    b.setAttribute('aria-selected', String(t.id === tab)); b.setAttribute('aria-label', t.label);
    b.innerHTML = '<span class="i" aria-hidden="true"></span><span class="l"></span><span class="dot" aria-hidden="true"></span>';
    b.children[0].textContent = t.icon; b.children[1].textContent = t.label;
    return b;
  }));
  const { items } = benchItems(q);
  if (!items.some(it => it.key === picked)) picked = (items.find(canBuy) ?? items.find(x => !x.done) ?? items[0])?.key ?? '';
  const out: HTMLElement[] = items.map(it => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card'; b.dataset.key = it.key;
    if (it.key.startsWith('tile:')) b.dataset.tile = it.key.slice(5); else b.dataset.mod = it.key.slice(4);
    b.setAttribute('aria-pressed', String(it.key === picked));
    if (it.done) b.classList.add('done'); else if (!it.sale) b.classList.add('locked');
    b.innerHTML = '<span class="ic"></span><b></b><span class="cost"></span>';
    b.children[0].textContent = it.icon; b.children[1].textContent = it.name; b.children[2].textContent = it.tag;
    return b;
  });
  rows.replaceChildren(...out);
  rows.classList.add('cards');
  const it = items.find(x => x.key === picked);
  pickEl.hidden = false;
  pickEl.replaceChildren();
  const txt = document.createElement('div'); txt.className = 'what';
  txt.innerHTML = '<b></b><span></span>';
  txt.children[0].textContent = it?.name ?? ''; txt.children[1].textContent = it ? it.desc : '';
  const buy = document.createElement('button');
  buy.type = 'button'; buy.className = 'buy';
  buy.textContent = !it ? '' : it.done ? 'Done ✓' : it.sale ? `Buy · ${it.tag}` : it.tag;
  buy.hidden = !it;
  pickEl.append(txt, buy);
  syncBench(q);
}
/** What changes with the chips: which cards can be bought now, and whether the Buy button can. */
function syncBench(q: Square) {
  const { items } = benchItems(q);
  if (listMode()) {
    for (const b of rows.querySelectorAll<HTMLButtonElement>('button.cost')) {
      const it = items.find(x => x.key === b.dataset.key), off = !it || !canBuy(it);
      if (b.disabled !== off) b.disabled = off;
    }
    for (const h of rows.querySelectorAll<HTMLElement>('.sect')) {
      const t = h.dataset.sect as BenchTab, n = t === 'grow' && !found.grow ? 0 : itemsOf(t, q).filter(canBuy).length;
      const text = n ? `${n} to buy` : '', c = h.querySelector('.cnt')!;
      if (c.textContent !== text) c.textContent = text;
    }
    const purse = chips(wallet.money);
    if (purseEl.textContent !== purse) purseEl.textContent = purse;
    return;
  }
  for (const b of rows.children as HTMLCollectionOf<HTMLButtonElement>) {
    const it = items.find(x => x.key === b.dataset.key);
    b.classList.toggle('can', !!it && canBuy(it));
  }
  const it = items.find(x => x.key === picked), buy = pickEl.querySelector<HTMLButtonElement>('.buy');
  if (buy) { const off = !it || !canBuy(it); if (buy.disabled !== off) buy.disabled = off; }
}
rows.addEventListener('click', e => {
  if (!on?.bench) return;
  // (a computer's list: a heading folds its room, and a price button buys it)
  const h = (e.target as HTMLElement).closest<HTMLElement>('.sect[data-sect]');
  if (h) { toggleRoom(h.dataset.sect as BenchTab); return; }
  const p = (e.target as HTMLElement).closest<HTMLButtonElement>('button.cost[data-key]');
  if (p) {
    const it = benchItems(on).items.find(x => x.key === p.dataset.key);
    if (!p.disabled && it && canBuy(it) && it.buy()) { built = ''; syncRows(on); }
    return;
  }
  const c = (e.target as HTMLElement).closest<HTMLButtonElement>('.card');
  if (!c) return;
  picked = c.dataset.key!;
  built = '';
  syncRows(on);
});
rows.addEventListener('pointerover', e => { hovered = (e.target as HTMLElement).closest<HTMLElement>('.mod.row')?.dataset.key ?? ''; });
rows.addEventListener('pointerleave', () => { hovered = ''; });
pickEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.buy');
  if (!b || b.disabled || !on?.bench) return;
  const it = benchItems(on).items.find(x => x.key === picked);
  if (it && canBuy(it) && it.buy()) { built = ''; syncRows(on); }
});
/** Each tab's dot: lit while there's something in it there are the chips for; and, folded, how many things that is. */
function syncDots(q: Square) {
  for (const b of tabsEl.children as HTMLCollectionOf<HTMLButtonElement>) b.classList.toggle('can', affordable(b.dataset.tab as BenchTab, q));
  const n = sold(q).filter(m => { const c = modCost(m.id); return c !== null && wallet.money >= c; }).length
    + benchTiles().filter(x => !x.done && offered(x) && wallet.money >= x.cost).length;
  const text = n ? String(n) : '';
  if (countEl.textContent !== text) countEl.textContent = text;
}
/** On a touch screen the bench's menu opens folded: no panel, just a round Craft button where the Buy button goes, out
 *  of the way of a thumb coming down to walk off, until it's tapped (or E); ✕ folds it again. With a mouse and keys
 *  it opens whole, as the other squares' panels do, with nothing to fold. */
let unfolded = false;
const craftEl = $('craft'), countEl = $('craftN'), shutEl = $('shopShut');
function fold(open: boolean) {
  unfolded = open;
  panel.hidden = !open; craftEl.hidden = open; shutEl.hidden = !open || !touchBuy();
  built = '';
}
craftEl.addEventListener('click', () => fold(true));
shutEl.addEventListener('click', () => fold(false));
/** What the bench's rooms' part shows: each upgrade's state, its price, and the line's machines (for rebuilding the
 *  rows). */
const tileKey = () => benchTiles().map(t => `${t.id}${t.done ? '+' : offered(t) ? '' : '-'}${t.cost}`).join() + F.beaten + MACH.rice[0].cap;

// ---------- panel ----------
/** One row per upgrade sold on square `q`: what the next level does, and its price on a button. */
function renderRows(q: Square) {
  purseEl.hidden = keysEl.hidden = !(q.bench && listMode());
  if (q.bench) { renderBench(q); return; }
  panel.classList.remove('side');
  rows.classList.remove('cards');
  pickEl.hidden = true;
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
  const key = q.title + (q.bench ? (listMode() ? 'list' : tab + picked) + tileKey() : '') + MODS.map(m => modOffered(m.id) ? mods[m.id] : '-').join();
  if (q.bench) syncDots(q);
  if (key !== built) { built = key; renderRows(q); if (q.bench) syncDots(q); return; }
  if (q.bench) { syncBench(q); return; }
  const tiles: Tile[] = [];
  for (const b of rows.children as HTMLCollectionOf<HTMLButtonElement>) {
    let off: boolean;
    if (b.dataset.tile) { const t = tiles.find(x => x.id === b.dataset.tile)!; off = t.done || !offered(t) || wallet.money < t.cost; }
    else if (b.dataset.mod) { const cost = modCost(b.dataset.mod as ModId); off = cost === null || wallet.money < cost; }
    else continue;
    if (b.disabled !== off) b.disabled = off;
  }
}
rows.addEventListener('click', e => {
  if (on?.bench) return;
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
    tabsEl.hidden = !(on as Square | null)?.bench;
    if ((on as Square | null)?.bench) fold(listMode());
    else { craftEl.hidden = shutEl.hidden = true; unfolded = false; }
    // (the bench opens on its last tab if there's something in it to buy, or the first tab that has)
    const q = on as Square | null;
    if (q?.bench && !affordable(tab, q)) tab = benchTabs().find(t => affordable(t.id, q))?.id ?? tab;
    built = '';
  }
  const bench = !!(on as Square | null)?.bench;
  if (bench) for (const r of benchRooms()) menuSeen.add(r);
  // while what was just bought has the camera, the menu (and its Shop button) steps out of the way, and buys nothing
  const away = spotOn();
  panel.classList.toggle('away', away); craftEl.classList.toggle('away', away);
  const press = buyHeld() && !held && !away;
  held = buyHeld();
  if (on && press) {
    if (bench && !unfolded) fold(true);
    else if (bench) {
      // E buys the picked card (with a mouse, the line under it), or else the first there are the chips for
      const { items } = benchItems(on), want = listMode() ? hovered : picked;
      const it = items.find(x => x.key === want && canBuy(x)) ?? items.find(canBuy);
      if (it && it.buy()) built = '';
    } else {
      const only = sold(on);
      if (only.length === 1) buyMod(only[0].id);
    }
  }
  // every frame: the money changes most frames, and an upgrade comes on sale with a hire (crew training)
  if (on) syncRows(on);
  renderOverview();
}
