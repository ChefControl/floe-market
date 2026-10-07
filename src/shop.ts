// The upgrade square: each stage has one, and standing on it opens a panel of that stage's repeatable upgrades:
// a better product (prices), marketing (customers) and the crew (speed). The HUD's top left lists every modifier
// in play, as a percentage.
import { repriceFish } from './counters';
import { decal, drawMenu } from './decals';
import { boost, MOD, modCost, MODS, mods, type ModId } from './economy';
import { stage } from './layout';
import { player } from './player';
import { demand } from './rating';
import { repriceSushi, sushiBoost } from './restaurant';
import { save } from './save';
import { levelUp } from './sfx';
import { staging } from './stage';
import { toast } from './ui';
import { FY } from './util';
import { wallet } from './wallet';

/** Where each stage's square is: by the walk-up counter, and in the restaurant's aisle by the kitchen line. */
export const SHOPS = [{ x: 0.9, z: 5.4 }, { x: -3.6, z: 5.0 }];
/** Half the square's side. */
const HALF = 0.95;
const pads = SHOPS.map(at => {
  const d = decal(HALF * 2, (c, w, h) => drawMenu(c, w, h, '📈', 'Upgrade'));
  d.mesh.position.set(at.x, FY + 0.01, at.z);
  return d;
});

const $ = (id: string) => document.getElementById(id)!;
const panel = $('shop'), title = $('shopTitle'), rows = $('shopRows');
const money = (v: number) => '$' + v.toLocaleString('en-US');
const pct = (k: number) => (k >= 1 ? '+' : '−') + Math.round(Math.abs(k - 1) * 100) + '%';
const EFFECT = { price: 'Prices', customers: 'Customers', speed: 'Speed' } as const;

/** This stage's square, once it's in place (stage 2's after the stage-up's show). */
const active = () => (stage.n === 2 && staging() ? -1 : stage.n - 1);

/** What a level of an upgrade is called: the marketing campaign, or just its level. */
function levelName(id: ModId, n: number) {
  const names = MOD[id].levels;
  return names ? names[Math.min(n, names.length) - 1] : `level ${n}`;
}

/** Buys the next level of an upgrade, if there's money for it. Returns whether it did. */
export function buyMod(id: ModId) {
  const cost = modCost(id);
  if (cost === null || wallet.money < cost) return false;
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
/** One row per upgrade: what the next level does, and its price on a button. */
function renderRows() {
  const n = stage.n;
  title.textContent = n === 1 ? 'Market upgrades' : 'Restaurant upgrades';
  rows.replaceChildren(...MODS.filter(m => m.stage === n).map(m => {
    const cost = modCost(m.id), now = boost(m.id), lv = mods[m.id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mod'; b.dataset.mod = m.id;
    b.disabled = cost === null || wallet.money < cost;
    const what = m.kind === 'speed' && n === 1 ? 'Fishing' : m.kind === 'speed' ? 'Kitchen' : EFFECT[m.kind];
    const next = cost === null ? `${what} ${pct(now)} · fully upgraded` : `${what} ${pct(now)} → ${pct(now * m.per)}`;
    const head = cost === null ? `${m.name} · ${levelName(m.id, lv)}` : `${m.name} · ${m.levels ? 'next: ' + levelName(m.id, lv + 1) : 'level ' + (lv + 1)}`;
    b.innerHTML = '<span class="ic"></span><span class="txt"><b></b><span></span></span><span class="cost"></span>';
    b.children[0].textContent = m.icon;
    b.children[1].children[0].textContent = head;
    b.children[1].children[1].textContent = next;
    b.children[2].textContent = cost === null ? 'Max' : money(cost);
    return b;
  }));
}
rows.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-mod]');
  if (b && !b.disabled && buyMod(b.dataset.mod as ModId)) renderRows();
});

// ---------- overview ----------
const overview = $('mods');
let shown = '';
/** The modifiers in play this stage: each upgrade's effect, and how much the rating brings customers in. */
function modifiers(): [icon: string, label: string, k: number][] {
  const rep: [string, string, number] = ['★', 'Reputation', demand()];
  if (stage.n === 1) return [['🐟', 'Prices', boost('fillets')], ['📣', 'Customers', boost('marketing')], ['💪', 'Speed', boost('training')], rep];
  return [['🍣', 'Prices', sushiBoost()], ['📣', 'Customers', boost('promo')], ['🧑‍🍳', 'Kitchen', boost('crew')], rep];
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

let open = false, money0 = -1;
/** Opens the panel while the player stands on the stage's circle, and keeps it and the overview current. */
export function updShop() {
  const a = active();
  pads.forEach((d, i) => { d.mesh.visible = i === a; });
  const p = player.g.position, near = a >= 0 && Math.abs(p.x - SHOPS[a].x) < HALF && Math.abs(p.z - SHOPS[a].z) < HALF;
  if (near !== open) {
    open = near;
    panel.hidden = !open;
    money0 = -1;
  }
  if (open && wallet.money !== money0) { money0 = wallet.money; renderRows(); }
  renderOverview();
}
