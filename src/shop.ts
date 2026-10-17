// The upgrade square: each stage has one, and standing on it opens a panel of that stage's repeatable upgrades:
// a better product (prices), marketing (customers) and the crew (speed). Stage 2 also gets a fertilizer shed by the
// water wheel (shed.ts) once the takeout kiosk opens, whose square sells rice fertilizer the same way, or with a
// press of E (buy), as it sells only the one thing. The HUD's top left lists every modifier in play, as a percentage:
// Customers there is marketing and the rating together, as both bring customers in faster. Stage 3's square is down
// in the cellar, at the shop counter in the cookware shop, priced in Fugu Chips: pricier bowls, word on the street (fans)
// and the cellar crew; and under them a tree of everything else, bought outright (shopTree.ts): each room's machines,
// hires and big upgrades and the venue's tiers, in bands that open fight by fight (the practice fight, then each boss).
import { touchBuy } from './buy';
import { BENCH_PAD, type MenuRoom } from './cellarPlan';
import { F, MACH, NAME, practiceDue } from './fight';
import { repriceFish } from './counters';
import { decal, drawMenu } from './decals';
import { boost, MOD, modCost, MODS, mods, type ModId } from './economy';
import { buyHeld } from './input';
import { CELLAR_Y, level, SHED_YARD, shedYard, stage, type StageN } from './layout';
import { player } from './player';
import { demand } from './rating';
import { repriceSushi, sushiBoost } from './restaurant';
import { save } from './save';
import { levelUp } from './sfx';
import { SHED_AT } from './shed';
import { spotOn } from './spotlight';
import { staging } from './stage';
import { GATES, gateOf, gateOpen, LANES, nextGate, type Place, PLACES } from './shopTree';
import { buyFromMenu, isDone, menuSeen, offered, type Tile, tiles } from './unlocks';
import { MAX_MACHINES } from './cellarPlan';
import { toast } from './ui';
import { chips, FY, price } from './util';
import { wallet } from './wallet';

/** The rooms whose upgrades the shop sells (all of them, in its tree). */
const MENU_ROOMS: MenuRoom[] = ['prep', 'grow', 'hearth', 'venue'];
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
const panel = $('shop'), title = $('shopTitle'), rows = $('shopRows'), tabsEl = $('shopTabs');
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

// ---------- the cookware shop's tree ----------
/** How a node stands: bought (or its line full), on sale, waiting on another bought first, or behind a fight not won. */
type NodeState = 'done' | 'open' | 'needs' | 'boss';
/** What's still to win before a band opens. */
function gateWhy(g: number) {
  const { face, name } = GATES[g];
  return { tag: `🔒 ${face}`, why: g === 1 ? 'Win the practice fight first' : `Beat ${name} ${face} first` };
}
/** One thing the shop sells, as its node and the line under the tree show it: the ring's next level of an upgrade, or
 *  a room's upgrade (or the buyout, sold at Mr. Fugu's office, at the end of the tree). */
interface Item {
  key: string; icon: string; name: string; desc: string; tag: string; sale: boolean; done?: boolean; cost: number | null; buy: () => boolean;
  state: NodeState;
  /** Its name on its node: a ring level's effect, a tile's short name. */
  label: string;
  /** A ring level's level now. */
  level?: number;
  /** A line's machines: how many it has of how many (the node's dots). */
  pips?: [number, number];
  /** A room's upgrade: its tile, its place in the tree and the gate it's behind. */
  tile?: Tile; place?: Place; gate?: number;
}
function modItem(m: (typeof MODS)[number]): Item {
  const cost = modCost(m.id), now = boost(m.id), lv = mods[m.id];
  const then = m.add ? now + m.per - 1 : now * m.per, what = m.kind === 'speed' ? 'Crew' : RING_EFFECT[m.kind];
  return {
    key: 'mod:' + m.id, icon: m.icon, name: cost === null ? `${m.name} · ${levelName(m.id, lv)}` : `${m.name} ${lv + 1}`, label: what, level: lv,
    desc: cost === null ? `${what} ${pct(now)} · fully upgraded` : `${m.levels ? levelName(m.id, lv + 1) + ': ' : ''}${what} ${pct(now)} → ${pct(then)}`,
    tag: cost === null ? 'Max' : chips(cost, true), sale: cost !== null, done: cost === null, cost, buy: () => buyMod(m.id), state: cost === null ? 'done' : 'open',
  };
}
function tileItem(t: Tile): Item {
  const place = PLACES[t.id] ?? {}, gate = gateOf(t), n = t.line ? F.lines[t.line].n : 0, label = place.label ?? t.name;
  const state: NodeState = t.done ? 'done' : !gateOpen(gate) ? 'boss' : t.needs && !isDone(t.needs) ? 'needs' : offered(t) ? 'open' : 'boss';
  const need = t.needs ? tiles.find(x => x.id === t.needs) : undefined, needName = need ? PLACES[need.id]?.label ?? need.name : '';
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  return {
    key: 'tile:' + t.id, icon: t.icon, name: t.line ? `${label} ${n}/${MAX_MACHINES}` : label, label, tile: t, place, gate, state,
    desc: state === 'done' ? (t.line ? `The ${NAME[t.line]} line is full` : t.desc) : state === 'boss' ? `${gateWhy(gate).why}: ${lower(t.desc)}`
      : state === 'needs' ? `Buy the ${lower(needName)} first` : t.gold ? "At Mr. Fugu's office" : t.desc,
    tag: state === 'done' ? (t.line ? 'Max' : '✓') : state === 'boss' ? gateWhy(gate).tag : chips(t.cost, true),
    sale: state === 'open' && !t.gold, done: state === 'done', cost: t.cost,
    buy: () => { if (t.gold) return false; const ok = buyFromMenu(t); if (ok) save(); return ok; },
    pips: t.line ? [n, MAX_MACHINES] : undefined,
  };
}
/** Everything the shop sells, in its place whatever's bought (so the tree keeps its shape): the ring's three levels,
 *  then the rooms' upgrades and the buyout. */
const treeTiles = () => tiles.filter(t => t.stage === 3 && PLACES[t.id]);
function benchItems(q: Square): { levels: Item[]; nodes: Item[]; items: Item[] } {
  const levels = sold(q).map(modItem), nodes = treeTiles().map(tileItem);
  return { levels, nodes, items: [...levels, ...nodes] };
}
/** With a mouse there's room for the whole road: a wide board, a column a gate (Start, the practice fight, the five
 *  bosses) and a row a room, its things bought with a click on their price. On a touch screen, a ladder down the
 *  bottom sheet: a column a room, a bar a gate, a node picked with a tap and bought with the Buy button under it. */
const boardMode = () => !touchBuy();
/** The board's sizes, in pixels: the rooms' column, a gate's column, a node, the gates' heads, the gap between rows. */
const BOARD = { lane: 64, col: 156, w: 148, h: 54, head: 50, gap: 6 };
/** The ladder's: a node, a gate's bar, the gap between rows (across, it's a fifth of the sheet a room). */
const LADDER = { h: 80, bar: 30, gap: 8 };
/** The line under the mouse, which E buys and the line under the tree describes. */
let hovered = '';
/** The node picked by a thumb, to show what it does and buy it: by default the first there are the chips for. */
let picked = '';
const canBuy = (it: Item) => it.sale && it.cost !== null && wallet.money >= it.cost;
const purseEl = $('shopPurse'), keysEl = $('shopKeys'), pickEl = $('shopPick');
/** A gate's look: won (stamped), the next fight (red), or later (dark). */
const gateLook = (g: number) => (gateOpen(g) ? 'won' : g === nextGate() ? 'next' : 'later');
const div = (cls: string, css: Partial<CSSStyleDeclaration> = {}) => { const e = document.createElement('div'); e.className = cls; Object.assign(e.style, css); return e; };
/** A node: its icon, its name (a line's machines as dots under it) and its price, which a mouse clicks to buy it. */
function nodeEl(it: Item, board: boolean) {
  const e = document.createElement(board ? 'div' : 'button');
  if (!board) { (e as HTMLButtonElement).type = 'button'; e.setAttribute('aria-pressed', String(it.key === picked)); }
  e.className = `node ${it.state}${it.state === 'boss' || it.state === 'needs' ? ' locked' : ''}${it.tile?.gold ? ' gold' : ''}${it.level !== undefined ? ' lv' : ''}`;
  e.dataset.key = it.key;
  if (it.tile) e.dataset.tile = it.tile.id; else e.dataset.mod = it.key.slice(4);
  // (the price, and a line's dots beside it: under the name on the board, under each other on the ladder)
  e.innerHTML = `<span class="ic" aria-hidden="true"></span><span class="txt"><b></b></span><span class="foot">${board ? '<button type="button" class="cost"></button>' : '<span class="cost"></span>'}</span>`;
  e.children[0].textContent = it.icon;
  const name = e.children[1].children[0] as HTMLElement;
  name.textContent = it.label;
  if (it.level !== undefined) { const s = document.createElement('small'); s.textContent = `Level ${it.level}`; e.children[1].append(s); }
  if (it.pips) {
    const [n, max] = it.pips, dots = document.createElement('span');
    dots.className = 'pips'; dots.setAttribute('role', 'img'); dots.setAttribute('aria-label', `${n} of ${max}`);
    for (let i = 0; i < max; i++) { const d = document.createElement('i'); if (i < n) d.className = 'on'; dots.append(d); }
    e.children[2].append(dots);
  }
  if (it.state === 'done' && !it.pips && it.level === undefined) { const tick = document.createElement('span'); tick.className = 'tick'; tick.textContent = '✓'; tick.setAttribute('aria-hidden', 'true'); e.append(tick); }
  const c = e.querySelector('.cost')!;
  c.textContent = it.tag;
  if (board) {
    const b = c as HTMLButtonElement;
    b.dataset.key = it.key; b.disabled = !canBuy(it);
    b.setAttribute('aria-label', it.sale ? `Buy ${it.name}, ${it.tag}` : `${it.name}: ${it.tag}`);
  } else e.setAttribute('aria-label', `${it.name}: ${it.tag}`);
  e.classList.toggle('can', canBuy(it));
  return e;
}
/** A line from the node a node needs to it: gold once it's bought, lit while it's on sale, dashed while it waits. */
function edgeEl(it: Item, css: Partial<CSSStyleDeclaration>) {
  return div(`edge ${it.state === 'done' ? 'gold' : it.state === 'open' ? 'lit' : 'dim'}`, css);
}
/** The ring's three levels, a strip above the tree. */
function levelStrip(levels: Item[], board: boolean) {
  const s = div('levels');
  s.append(...levels.map(it => nodeEl(it, board)));
  return s;
}
/** The board: the gates' heads along the top (stuck there as it scrolls), a row a room, and the buyout at the end. */
function boardEl(nodes: Item[]) {
  const B = BOARD, rowsOf = LANES.map(l => 1 + Math.max(0, ...nodes.filter(i => i.place?.lane === l.id).map(i => i.place?.sub ?? 0)));
  const top: number[] = [];
  let y = 6;
  rowsOf.forEach((n, i) => { top[i] = y; y += n * (B.h + B.gap) + 6; });
  const W = B.lane + GATES.length * B.col, H = y;
  const head = div('treeHead', { width: W + 'px', height: B.head + 'px' }), body = div('treeBody', { width: W + 'px', height: H + 'px' });
  GATES.forEach((g, i) => {
    const look = i === 0 ? 'start' : gateLook(i), x = B.lane + i * B.col, h = div(`gate ${look}`, { left: x + 4 + 'px', width: B.col - 8 + 'px', height: B.head - 6 + 'px' });
    h.dataset.gate = String(i);
    h.innerHTML = '<span class="face" aria-hidden="true"></span><span class="nm"></span>';
    h.children[0].textContent = g.face;
    h.children[1].textContent = look === 'next' ? `Next: ${g.name}` : look === 'later' ? `🔒 ${g.name}` : g.name;
    if (look === 'won') { const s = document.createElement('span'); s.className = 'hanko'; s.textContent = '勝'; s.setAttribute('aria-label', 'beaten'); h.children[0].append(s); }
    head.append(h);
    if (look === 'next' || look === 'later') body.append(div('shade', { left: x + 3 + 'px', width: B.col - 6 + 'px', top: '2px', height: H - 4 + 'px' }));
    if (i > 0) body.append(div(`gateLine${look === 'next' ? ' next' : ''}`, { left: x + 'px', top: '0', height: H + 'px' }));
  });
  LANES.forEach((l, i) => {
    const t = div('laneName', { left: '0', width: B.lane - 6 + 'px', top: top[i] + (rowsOf[i] * (B.h + B.gap) - B.gap) / 2 - 18 + 'px' });
    t.innerHTML = '<span class="ic" aria-hidden="true"></span><span></span>';
    t.children[0].textContent = l.icon; t.children[1].textContent = l.name;
    body.append(t);
  });
  const at = new Map<string, { x: number; y: number }>();
  for (const it of nodes) {
    const li = it.place?.lane ? LANES.findIndex(l => l.id === it.place!.lane) : 2;
    const x = B.lane + it.gate! * B.col + (B.col - B.w) / 2;
    const yy = it.place?.lane ? top[li] + (it.place.sub ?? 0) * (B.h + B.gap) : top[li] + (rowsOf[li] * (B.h + B.gap) - B.gap - B.h) / 2;
    at.set(it.tile!.id, { x, y: yy });
  }
  for (const it of nodes) {
    const from = it.place?.from && at.get(it.place.from), to = at.get(it.tile!.id)!;
    if (!from) continue;
    body.append(from.x === to.x
      ? edgeEl(it, { left: from.x + B.w / 2 - 1.5 + 'px', top: from.y + B.h + 'px', width: '3px', height: to.y - from.y - B.h + 'px' })
      : edgeEl(it, { left: from.x + B.w + 'px', top: to.y + B.h / 2 - 1.5 + 'px', width: to.x - from.x - B.w + 'px', height: '3px' }));
  }
  for (const it of nodes) {
    const p = at.get(it.tile!.id)!, e = nodeEl(it, true);
    Object.assign(e.style, { left: p.x + 'px', top: p.y + 'px', width: B.w + 'px', height: B.h + 'px' });
    body.append(e);
  }
  tree0 = { w: W, h: B.head + H };
  return { els: [head, body], jump: () => {} };
}
/** The ladder: the rooms' names along the top (stuck there as it scrolls), then a band a gate, each under its bar. */
function ladderEl(nodes: Item[]) {
  const L = LADDER, head = div('treeHead');
  LANES.forEach((l, i) => {
    const t = div('laneName', { left: i * 20 + '%', width: '20%' });
    t.innerHTML = '<span class="ic" aria-hidden="true"></span><span></span>';
    t.children[0].textContent = l.icon; t.children[1].textContent = l.name;
    head.append(t);
  });
  const body = div('treeBody'), band: number[] = [], at = new Map<string, { col: number; y: number }>();
  let y = 6;
  GATES.forEach((g, i) => {
    if (i > 0) {
      const look = gateLook(i), bar = div(`bar ${look}`, { top: y + 'px', height: L.bar - 6 + 'px' });
      bar.dataset.gate = String(i);
      bar.textContent = look === 'won' ? `${g.face} ${g.name}` : look === 'next' ? (i === 1 ? '🔒 Win the practice fight 🤼' : `🔒 Beat ${g.name} ${g.face}`) : `🔒 ${g.name} ${g.face}`;
      if (look === 'won') { const s = document.createElement('span'); s.className = 'hanko'; s.textContent = '勝'; s.setAttribute('aria-label', 'beaten'); bar.append(s); }
      body.append(bar);
      y += L.bar;
    }
    band[i] = y;
    const here = nodes.filter(n => n.gate === i);
    for (const it of here) at.set(it.tile!.id, { col: it.place?.lane ? LANES.findIndex(l => l.id === it.place!.lane) : -1, y: y + (it.place?.sub ?? 0) * (L.h + L.gap) });
    y += (here.length ? 1 + Math.max(0, ...here.map(n => n.place?.sub ?? 0)) : 0) * (L.h + L.gap) + 4;
  });
  body.style.height = y + 'px';
  for (const it of nodes) {
    const from = it.place?.from && at.get(it.place.from), to = at.get(it.tile!.id)!;
    if (from) body.append(edgeEl(it, { left: `calc(${to.col * 20 + 10}% - 1.5px)`, top: from.y + L.h + 'px', width: '3px', height: to.y - from.y - L.h + 'px' }));
  }
  for (const it of nodes) {
    const p = at.get(it.tile!.id)!, e = nodeEl(it, false);
    Object.assign(e.style, p.col < 0 ? { left: 'calc(30% + 3px)', width: 'calc(40% - 6px)' } : { left: `calc(${p.col * 20}% + 3px)`, width: 'calc(20% - 6px)' }, { top: p.y + 'px', height: L.h + 'px' });
    body.append(e);
  }
  // (it opens at the newest band, with the bar above it in view)
  return { els: [head, body], jump: (tree: HTMLElement) => { tree.scrollTop = Math.max(0, band[Math.max(0, nextGate() - 1)] - L.bar - 34); } };
}
/** The board's own size, before it's shrunk to fit. */
let tree0 = { w: 0, h: 0 };
/** The board never scrolls: it's shrunk to fit what the screen leaves it (the panel's tallest, less its title, the
 *  ring's levels and the line under it), across and down. */
function fitBoard() {
  const tree = rows.querySelector<HTMLElement>('.tree');
  if (!tree || !panel.classList.contains('board') || panel.hidden || !panel.offsetHeight) return;
  const top = parseFloat(getComputedStyle(panel).top) || 76, room = innerHeight - top - 16;
  tree.style.display = 'none';
  const rest = panel.getBoundingClientRect().height + 8, across = panel.clientWidth - 20;
  tree.style.display = '';
  const k = Math.min(1, (room - rest - 4) / tree0.h, across / tree0.w);
  tree.style.width = tree0.w + 'px';
  tree.style.zoom = String(Math.max(0.4, k));
}
addEventListener('resize', fitBoard);
/** Whether the next build of the tree scrolls to the newest band (on opening it), or keeps its scroll. */
let jump = true;
/** The shop's tree, the same shape whatever's bought: the ring's levels, the tree, and under it the line for the node
 *  under the mouse (or picked): what it does, and its Buy button. */
function renderBench(q: Square) {
  const board = boardMode();
  panel.classList.toggle('board', board); panel.classList.toggle('ladder', !board);
  title.textContent = q.title;
  tabsEl.hidden = true;
  rows.classList.remove('cards');
  const { levels, nodes, items } = benchItems(q);
  if (!board && !items.some(it => it.key === picked)) picked = (items.find(canBuy) ?? items.find(x => x.state === 'open') ?? items[0])?.key ?? '';
  const old = rows.querySelector<HTMLElement>('.tree'), keep = old && !jump ? [old.scrollTop, old.scrollLeft] : null;
  const tree = div('tree'), drawn = board ? boardEl(nodes) : ladderEl(nodes);
  tree.append(...drawn.els);
  rows.replaceChildren(levelStrip(levels, board), tree);
  if (board) fitBoard();
  else if (keep) { tree.scrollTop = keep[0]; tree.scrollLeft = keep[1]; } else drawn.jump(tree);
  jump = false;
  pickEl.hidden = false;
  pickEl.replaceChildren();
  const txt = document.createElement('div'); txt.className = 'what';
  txt.innerHTML = '<b></b><span></span>';
  const buy = document.createElement('button');
  buy.type = 'button'; buy.className = 'buy';
  pickEl.append(txt, buy);
  shownPick = '';
  syncBench(q);
}
/** The item the line under the tree is about: the node under the mouse, or picked by a thumb (else the first there
 *  are the chips for). */
function pickedItem(items: Item[]) {
  const want = boardMode() ? hovered : picked;
  return items.find(x => x.key === want) ?? (boardMode() ? items.find(canBuy) ?? items.find(x => x.state === 'open') : undefined);
}
/** What the line under the tree shows, to rewrite it only when it changes. */
let shownPick = '';
/** What changes with the chips: which nodes can be bought now, the purse, and the line under the tree. */
function syncBench(q: Square) {
  const { items } = benchItems(q), byKey = new Map(items.map(it => [it.key, it]));
  for (const e of rows.querySelectorAll<HTMLElement>('.node[data-key]')) {
    const it = byKey.get(e.dataset.key!), can = !!it && canBuy(it);
    if (e.classList.contains('can') !== can) e.classList.toggle('can', can);
    const b = e.querySelector<HTMLButtonElement>('button.cost');
    if (b && b.disabled === can) b.disabled = !can;
  }
  const purse = chips(wallet.money);
  if (purseEl.textContent !== purse) purseEl.textContent = purse;
  const it = pickedItem(items), buy = pickEl.querySelector<HTMLButtonElement>('.buy');
  const key = it ? `${it.key}|${it.name}|${it.desc}|${it.tag}|${it.state}` : '';
  if (key !== shownPick && buy) {
    shownPick = key;
    const what = pickEl.querySelector('.what')!;
    what.children[0].textContent = it?.name ?? ''; what.children[1].textContent = it?.desc ?? '';
    buy.textContent = !it ? '' : it.state === 'done' ? (it.pips || it.level !== undefined ? 'Max' : 'Done ✓') : it.tile?.gold && it.state === 'open' ? 'At his office' : it.sale ? `Buy · ${it.tag}` : it.state === 'needs' ? '🔒' : it.tag;
    buy.hidden = !it;
  }
  if (buy) { const off = !it || !canBuy(it); if (buy.disabled !== off) buy.disabled = off; }
}
rows.addEventListener('click', e => {
  if (!on?.bench) return;
  const t = e.target as HTMLElement, node = t.closest<HTMLElement>('.node[data-key]');
  if (!node) return;
  // (a computer's board: a click on a node, its price or not, buys it; a touch screen's ladder: a tap picks it)
  if (boardMode()) {
    const it = benchItems(on).items.find(x => x.key === node.dataset.key);
    if (it && canBuy(it) && it.buy()) { built = ''; syncRows(on); }
    return;
  }
  picked = node.dataset.key!;
  built = '';
  syncRows(on);
});
rows.addEventListener('pointerover', e => { hovered = (e.target as HTMLElement).closest<HTMLElement>('.node[data-key]')?.dataset.key ?? ''; });
rows.addEventListener('pointerleave', () => { hovered = ''; });
pickEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.buy');
  if (!b || b.disabled || !on?.bench) return;
  const it = pickedItem(benchItems(on).items);
  if (it && canBuy(it) && it.buy()) { built = ''; syncRows(on); }
});
/** The Shop button's badge: how many things there are the chips for. */
function syncCount(q: Square) {
  const n = benchItems(q).items.filter(canBuy).length, text = n ? String(n) : '';
  if (countEl.textContent !== text) countEl.textContent = text;
}
/** On a touch screen the shop's tree opens folded: no panel, just a round Shop button where the Buy button goes, out
 *  of the way of a thumb coming down to walk off, until it's tapped (or E); ✕ folds it again. With a mouse it opens
 *  whole, as the other squares' panels do, with nothing to fold. */
let unfolded = false;
const craftEl = $('craft'), countEl = $('craftN'), shutEl = $('shopShut');
function fold(open: boolean) {
  unfolded = open;
  panel.hidden = !open; craftEl.hidden = open; shutEl.hidden = !open || !touchBuy();
  built = ''; jump = true;
}
craftEl.addEventListener('click', () => fold(true));
shutEl.addEventListener('click', () => fold(false));
/** What the tree shows: each node's state and price, and the gates won (for rebuilding it). */
const treeKey = () => treeTiles().map(t => `${t.id}${t.done ? '+' : offered(t) ? '' : '-'}${t.cost}`).join() + F.beaten + practiceDue() + MACH.rice[0].cap;

// ---------- panel ----------
/** One row per upgrade sold on square `q`: what the next level does, and its price on a button. */
function renderRows(q: Square) {
  purseEl.hidden = !q.bench; keysEl.hidden = !(q.bench && boardMode());
  if (q.bench) { renderBench(q); return; }
  panel.classList.remove('board', 'ladder');
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
  const key = q.title + (q.bench ? (boardMode() ? 'board' : 'ladder' + picked) + treeKey() : '') + MODS.map(m => modOffered(m.id) ? mods[m.id] : '-').join();
  if (q.bench) syncCount(q);
  if (key !== built) { built = key; renderRows(q); return; }
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
    tabsEl.hidden = true;
    if ((on as Square | null)?.bench) fold(boardMode());
    else { craftEl.hidden = shutEl.hidden = true; unfolded = false; }
    built = ''; jump = true;
  }
  const bench = !!(on as Square | null)?.bench;
  if (bench) for (const r of MENU_ROOMS) menuSeen.add(r);
  // while what was just bought has the camera, the menu (and its Shop button) steps out of the way; E still buys (the
  // spotlight goes straight on over to the next one, spotlight.ts), as the shed's square sells a level a press
  const away = spotOn();
  panel.classList.toggle('away', away); craftEl.classList.toggle('away', away);
  const press = buyHeld() && !held;
  held = buyHeld();
  if (on && press) {
    if (bench && !unfolded) fold(true);
    else if (bench) {
      // E buys the picked node (with a mouse, the one under it), or else the first there are the chips for
      const { items } = benchItems(on), want = boardMode() ? hovered : picked;
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
