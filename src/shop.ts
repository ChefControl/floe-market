// The upgrade square: each stage has one, and standing on it opens a panel of that stage's repeatable upgrades:
// a better product (prices), marketing (customers) and the crew (speed). Stage 2 also gets a fertilizer shed by the
// water wheel (shed.ts) once the takeout kiosk opens, whose square sells rice fertilizer the same way, or with a
// press of E (buy), as it sells only the one thing. The HUD's top left lists every modifier in play, as a percentage:
// Customers there is marketing and the rating together, as both bring customers in faster.
import { repriceFish } from './counters';
import { decal, drawMenu } from './decals';
import { boost, MOD, modCost, MODS, mods, type ModId } from './economy';
import { buyHeld } from './input';
import { SHED_YARD, shedYard, stage } from './layout';
import { player } from './player';
import { demand } from './rating';
import { repriceSushi, sushiBoost } from './restaurant';
import { save } from './save';
import { levelUp } from './sfx';
import { SHED_AT } from './shed';
import { staging } from './stage';
import { isDone } from './unlocks';
import { toast } from './ui';
import { FY, price } from './util';
import { wallet } from './wallet';

/** Where each stage's square is: by the walk-up counter, and in the restaurant's aisle by the kitchen line. */
export const SHOPS = [{ x: 0.9, z: 5.4 }, { x: -3.6, z: 5.0 }];
/** Half the square's side. */
const HALF = 0.95;

interface Square {
  x: number;
  z: number;
  stage: 1 | 2;
  /** The panel's title. */
  title: string;
  /** The fertilizer shed's square, which sells only what's bought there (and the upgrade squares, everything else). */
  shed: boolean;
}
const SQUARES: Square[] = [
  { ...SHOPS[0], stage: 1, title: 'Market upgrades', shed: false },
  { ...SHOPS[1], stage: 2, title: 'Restaurant upgrades', shed: false },
  { ...SHED_AT, stage: 2, title: 'Fertilizer shed', shed: true },
];
const pads = SQUARES.map(q => {
  const d = decal(HALF * 2, (c, w, h) => q.shed ? drawMenu(c, w, h, '🌿', 'Fertilizer') : drawMenu(c, w, h, '📈', 'Upgrade'));
  d.mesh.position.set(q.x, (q.shed ? SHED_YARD.y : FY) + 0.01, q.z);
  return d;
});

/** Whether a square is in place: its stage's (stage 2's after the stage-up's show), and the shed's once it's open. */
const active = (q: Square) => q.stage === stage.n && !(stage.n === 2 && staging()) && (!q.shed || shedYard.open);
/** The square whose panel is open, if any. */
let on: Square | null = null;
/** Whether an upgrade can be bought yet: fertilizer once the shed is open, crew training once there's a crew. */
export const modOffered = (id: ModId) => (!MOD[id].shed || shedYard.open) && (!MOD[id].needs || isDone(MOD[id].needs));
/** The upgrades on sale on a square. */
const sold = (q: Square) => MODS.filter(m => m.stage === q.stage && !!m.shed === q.shed && modOffered(m.id));

const $ = (id: string) => document.getElementById(id)!;
const panel = $('shop'), title = $('shopTitle'), rows = $('shopRows');
const pct = (k: number) => (k >= 1 ? '+' : '−') + Math.round(Math.abs(k - 1) * 100) + '%';
const EFFECT = { price: 'Prices', customers: 'Customers', speed: 'Speed', growth: 'Rice growth' } as const;

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

// ---------- panel ----------
/** One row per upgrade sold on square `q`: what the next level does, and its price on a button. */
function renderRows(q: Square) {
  const n = q.stage;
  title.textContent = q.title;
  rows.replaceChildren(...sold(q).map(m => {
    const cost = modCost(m.id), now = boost(m.id), lv = mods[m.id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mod'; b.dataset.mod = m.id;
    b.disabled = cost === null || wallet.money < cost;
    const what = m.kind === 'speed' && n === 1 ? 'Fishing & runners' : m.kind === 'speed' ? 'Kitchen' : EFFECT[m.kind];
    const next = cost === null ? `${what} ${pct(now)} · fully upgraded` : `${what} ${pct(now)} → ${pct(now * m.per)}`;
    const head = cost === null ? `${m.name} · ${levelName(m.id, lv)}` : `${m.name} · ${m.levels ? 'next: ' + levelName(m.id, lv + 1) : 'level ' + (lv + 1)}`;
    b.innerHTML = '<span class="ic"></span><span class="txt"><b></b><span></span></span><span class="cost"></span>';
    b.children[0].textContent = m.icon;
    b.children[1].children[0].textContent = head;
    b.children[1].children[1].textContent = next;
    b.children[2].textContent = cost === null ? 'Max' : price(cost);
    return b;
  }));
}
/** Which square's rows are built, at which levels. */
let built = '';
/**
 * Keeps the rows current without rebuilding them while the money ticks over, which would be most frames (and a button
 * replaced mid-tap loses its click): only a new level, an upgrade coming on sale, or another square rebuilds them.
 */
function syncRows(q: Square) {
  const key = q.title + MODS.map(m => modOffered(m.id) ? mods[m.id] : '-').join();
  if (key !== built) { built = key; renderRows(q); return; }
  for (const b of rows.children as HTMLCollectionOf<HTMLButtonElement>) {
    const cost = modCost(b.dataset.mod as ModId), off = cost === null || wallet.money < cost;
    if (b.disabled !== off) b.disabled = off;
  }
}
rows.addEventListener('click', e => {
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
    built = '';
  }
  const press = buyHeld() && !held;
  held = buyHeld();
  if (on && press) {
    const only = sold(on);
    if (only.length === 1) buyMod(only[0].id);
  }
  // every frame: the money changes most frames, and an upgrade comes on sale with a hire (crew training)
  if (on) syncRows(on);
  renderOverview();
}
