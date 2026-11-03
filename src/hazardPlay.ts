// Cooking Hazard, the arcade cabinet's game (casinoArcade.ts, or ?arcade=play in dev and demo builds, main.ts), on the
// UI kit's full screen over the game, which waits behind it. It opens in the safe house (hazardRoom.ts in 3D, its rules
// and what's kept in it hazardHouse.ts): pick a station (a click or a tap on it, or 1 to 6) and the camera comes in on it
// and its panel opens. Cook a batch at a counter (the timing tap: the dish's code slides past a line twice, pressed as
// each move crosses it), buy guns and slots at the armory, read the recipe book, and pack the van, then 🚗 Go (E). A run
// holds the street till the chef gets out or the horde gets them. The rules are hazard.ts; the street they're played on
// is hazardSet.ts, in 3D, drawn in the game's place (render.ts takeover). This feeds the run the keys, the mouse or the
// fingers, and puts on the screen what floats over the street: the tastes on the zombies, the specials' tickets (an
// arrow at the edge for one off the screen), the technique stamps and the recipe ticket over the chef while a dish's
// code goes in, with the HUD and the dish buttons.
//
// Keyboard and mouse: WASD to walk, the mouse to aim, hold the button to fire, F to shove, R to reload. Hold 1 to 4 to
// serve a dish: the chef stops while its code goes in on WASD or the arrows; let go, then click to throw.
// Touch (sideways only: it goes full screen and locks the screen sideways where the phone lets it, and asks to turn the
// phone where it doesn't): a stick wherever a thumb lands, the left half to walk, the right half to aim and fire. Hold a
// dish button (on the left), swipe its code with the other thumb, one swipe a move, then tap where it lands. Shove is a
// button on the right; the gun reloads by itself when it's empty, and a tap on the ammo reloads early.
// Esc or ✕ mid-run holds it still and asks first: Keep going, or Leave (losing what's carried). In the safe house Esc
// steps back: out of a cook, off a station, then out of the game.
//
// The guns' feel (docs/cooking-hazard.md, "Gun feel"; the set shows most of it): a dot where the gun points, lit gold
// when a shot would go through a zombie's crit area (the mouse's pointer, or ahead of the aiming thumb, whose aim is
// pulled a little onto the nearest zombie); the world held still for a blink on a big hit, and an Android phone's buzz;
// the guns' sounds (hazardSound.ts). The firing range (?arcade=range in dev and demo builds) is a row of zombies that
// stand there, a gun to pick and a switch for each layer of the feel, to try it with and without; nothing's kept.
import './hazard.css';
import {
  DISHES, GRADES, GUNS, INGREDIENTS, LEVELS, MOVES, TASTES, TECHNIQUES, ZONE_R, bestIn, crateAt, feel, letGo, level,
  lineUp, newRun, press, pullAim, reload, shove, startServe, step, stripPos, take, throwDish, worstInBag, wouldTake,
  type Crate, type Dir, type DishId, type GunId, type Input, type Item, type Run, type Stamp, type Zombie,
} from './hazard';
import {
  BAGS, COUNTERS, DAMAGE, RECIPES, SUITS, buy, canCook, cook, cookScore, counterOpen, depart, have, homecoming, house,
  pack, pressCook, price, rollNext, startCooking, starsFor, stepCooking, type Buy, type Cooking, type CounterId,
} from './hazardHouse';
import { STATIONS, STATION_IDS, drawRoom, focusOn, renderRoom, stationAt, type StationId } from './hazardRoom';
import { U } from './hazardMap';
import { drawSet, dressChef, headOf, renderSet, resetView, toArena, toScreen } from './hazardSet';
import { blastSound, crackle, critSound, flameSound, groanSound, gunSound, hitSound, igniteSound, rushSound, shellSound, sizzleSound } from './hazardSound';
import { dice } from './kit';
import { takeover } from './render';
import { chime, clack, lose, pop, throwSound } from './sfx';
import { panel, state, usable } from './uiKit';

const GUN_IDS = Object.keys(GUNS) as GunId[];
/** The feel's layers, as the firing range's switches name them. */
const LAYERS: [keyof typeof feel, string][] = [
  ['centre', 'Centre hits'], ['push', 'Push'], ['rush', 'Rush'], ['stop', 'Hit-stop'], ['nudge', 'Camera nudge'],
  ['buzz', 'Buzz'], ['pull', 'Aim pull'], ['sound', 'Sound'], ['kick', 'Kick'], ['casings', 'Shells'], ['flash', 'Flash'],
  ['wear', 'Wear'], ['mess', 'Mess'], ['fling', 'Fling'], ['areas', 'Crit areas'],
];
/** The feel as the game has it (the firing range's switches are put back to these). */
const FEEL = { ...feel };
/** The firing range's row: four zombies across the street ahead of the chef, and a special behind them. */
const RANGE = {
  at: { x: 20 * U, y: 20 * U },
  posts: [...[17.6, 19.2, 20.8, 22.4].map(y => ({ x: 25.5 * U, y: y * U, special: false })), { x: 28 * U, y: 20 * U, special: true }],
};
const DISH_IDS = Object.keys(DISHES) as DishId[];
const SLOTS = 4;
const PADS: Dir[] = ['left', 'up', 'down', 'right'];

const root = document.createElement('div');
root.id = 'hazard';
root.hidden = true;
root.innerHTML = `
  <div class="hz-house">
    <div class="hz-house-hud">
      <div class="pill"><span class="hz-ic" style="background:var(--hot)">🎟️</span><span class="hz-tickets"></span></div>
      <div class="pill hz-hint" hidden><span class="hz-ic" style="background:var(--go)">💬</span>Cook something before you go</div>
    </div>
    <div class="hz-room">
      <div class="k-row k-keys hz-stations">${STATION_IDS.map(id => `<button type="button" class="k-btn k-plain" data-station="${id}">${STATIONS[id].icon} ${STATIONS[id].name}</button>`).join('')}</div>
      <div class="k-row"><button type="button" class="k-btn k-main hz-go">🚗 Go</button></div>
    </div>
    <div class="hz-station" hidden>
      <h2 class="k-title hz-st-title"></h2>
      <p class="k-cap hz-st-cap"></p>
      <div class="hz-st-body"></div>
      <div class="k-row hz-st-foot"><button type="button" class="k-btn k-plain hz-back">Back</button><button type="button" class="k-btn k-main hz-go hz-van-go" hidden></button></div>
    </div>
    <div class="hz-cook" hidden>
      <h2 class="k-title hz-cook-title"></h2>
      <div class="hz-lane"><i class="hz-line"></i><div class="hz-notes"></div><b class="hz-call"></b></div>
      <div class="k-row hz-pads">${PADS.map(d => `<button type="button" class="k-btn k-plain" data-move="${d}">${MOVES[d]}</button>`).join('')}</div>
    </div>
  </div>
  <div class="hz-play" hidden>
    <div class="hz-tags"></div>
    <div class="hz-hud">
      <div class="pill"><span class="hz-ic" style="background:var(--hot)">❤️</span><span class="hz-bar"><i class="hz-hp"></i></span><span class="hz-hpn"></span></div>
      <div class="pill"><span class="hz-ic" style="background:#e0702a">⏱️</span><span class="hz-time"></span>
        <span class="hz-strip"><span class="hz-track">${LEVELS.map(l => `<b>${l === 'BIOHAZARD' ? '☣️ ' : ''}${l}</b>`).join('')}</span><span class="hz-mark"></span></span></div>
      <div class="pill hz-ammo-pill"><span class="hz-ic hz-gun"></span><span class="hz-ammo"></span></div>
      <div class="pill"><span class="hz-ic" style="background:#49c25b">🧟</span><span class="hz-score"></span></div>
      <div class="pill hz-bag-pill"><span class="hz-ic" style="background:#c9a66b">🎒</span><span class="hz-bag"></span></div>
      <div class="pill hz-zone-pill" hidden><span class="hz-ic" style="background:#1e8fc0">📣</span><span class="hz-zone"></span></div>
      <div class="pill hz-boost" hidden><span class="hz-ic" style="background:#49c25b">🌿</span><span class="hz-boostn"></span></div>
    </div>
    <div class="hz-dishes"></div>
    <button type="button" class="k-btn hz-shove">💪 Shove</button>
    <button type="button" class="k-btn hz-use" hidden>📣 Radio</button>
    <div class="hz-stick hz-move"><i></i></div>
    <div class="hz-stick hz-aim"><i></i></div>
    <i class="hz-dot" hidden></i>
    <div class="hz-range k-sheet" hidden>
      <h2 class="k-title">🎯 Firing range</h2>
      <p class="k-cap">Switch a layer off to feel it</p>
      <div class="k-row">${GUN_IDS.map(g => `<button type="button" class="k-btn k-choice" data-range-gun="${g}">${GUNS[g].emoji} ${GUNS[g].name}</button>`).join('')}</div>
      <div class="k-row">${LAYERS.map(([k, label]) => `<button type="button" class="k-btn k-choice" data-layer="${k}">${label}</button>`).join('')}</div>
    </div>
    <div class="hz-leave" hidden>
      <div class="hz-card">
        <h2 class="k-title">Leave the run?</h2>
        <p class="k-cap">You lose what you carry</p>
        <div class="k-row"><button type="button" class="k-btn k-plain hz-quit">Leave</button><button type="button" class="k-btn k-main hz-stay">Keep going</button></div>
      </div>
    </div>
    <div class="hz-turn"><span class="hz-phone"></span><p class="k-title">Turn your phone sideways</p></div>
  </div>
  <div class="hz-over" hidden>
    <h2 class="k-title hz-verdict"></h2>
    <div class="hz-haul"></div>
    <div class="hz-stats"></div>
    <div class="k-row"><button type="button" class="k-btn k-main hz-home">🏚️ Back to the safe house</button></div>
  </div>
  <button type="button" class="k-btn k-plain k-x hz-x" aria-label="Leave">✕</button>`;
document.body.append(root);
panel(root, { place: 'full', close: escape });

const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
const play = $('.hz-play'), over = $('.hz-over'), leave = $('.hz-leave'), tagLayer = $('.hz-tags');
const home = $('.hz-house'), room = $('.hz-room'), stationEl = $('.hz-station'), cookEl = $('.hz-cook');

// ---------- the safe house ----------
/** The station open (null: the whole room), the recipe book's page, and the line under a counter after a cook. */
let station: StationId | null = null;
let page: 'dishes' | 'techniques' = 'dishes';
let note = '';
/** A batch being cooked: the timing tap under way. */
let cooking: Cooking | null = null;

function openStation(id: StationId | null) {
  station = id;
  note = '';
  focusOn(id);
  showHouse();
}

const tk = (n: number) => `🎟️ ${n}`;
/** A button that buys `b`, labelled `label` and its price: greyed when the tickets don't reach. */
function buyButton(b: Buy, label: string) {
  const p = price(b);
  return p === null ? '' : `<button type="button" class="k-btn k-plain${house.tickets < p ? ' hz-broke' : ''}" data-buy='${JSON.stringify(b)}'>${label} · ${tk(p)}</button>`;
}
const row = (html: string, keys = true) => html ? `<div class="k-row${keys ? ' k-keys' : ''}">${html}</div>` : '';
const chip = (s: string) => `<span class="pill">${s}</span>`;
const stars = (n: number) => '★'.repeat(n);

/** What a counter shows: what's in the pantry for it, and a button to cook each of its dishes. */
function counterHtml(c: CounterId) {
  const open = counterOpen(c), dishes = DISH_IDS.filter(d => RECIPES[d].counter === c);
  const tastes = [...new Set(dishes.map(d => DISHES[d].taste))];
  return {
    cap: open ? note || 'Pick a dish to cook' : `Find a ${COUNTERS[c].opens!.toLowerCase()} first`,
    body: `<div class="hz-chips">${tastes.map(t => chip(`${TASTES[t].food} ${INGREDIENTS[t]} ${have(t)}`)).join('')}</div>`
      + row(dishes.map(d => `<button type="button" class="k-btn k-plain" data-cook="${d}">${DISHES[d].emoji} Cook ${DISHES[d].name} · ${RECIPES[d].needs} ${TASTES[DISHES[d].taste].food}</button>`).join('')),
  };
}
function armoryHtml() {
  const lv = house.damage[house.gun] ?? 0;
  return {
    cap: 'Pick your gun',
    body: row(GUN_IDS.map(g => house.guns.includes(g)
      ? `<button type="button" class="k-btn k-choice" data-gun="${g}" aria-pressed="${g === house.gun}">${GUNS[g].emoji} ${GUNS[g].name}</button>`
      : buyButton({ kind: 'gun', gun: g }, `${GUNS[g].emoji} ${GUNS[g].name}`)).join(''))
      + row(buyButton({ kind: 'damage', gun: house.gun }, `💪 Damage ×${DAMAGE[lv + 1]}`) + buyButton({ kind: 'slot' }, `🍽️ Dish slot ${house.slots + 1}`))
      + `<div class="hz-chips">${chip(`💪 Damage ×${DAMAGE[lv]}`)}${chip(`🍽️ ${house.slots} dish slots`)}</div>`,
  };
}
function vanHtml() {
  const shelf = house.batches.map((b, i) => `<button type="button" class="k-btn k-choice" data-pack="${i}" aria-pressed="${house.packed.includes(i)}">${DISHES[b.dish].emoji} ${DISHES[b.dish].name} ${stars(b.servings)}</button>`).join('');
  return {
    cap: `Pack up to ${house.slots} dishes`,
    body: `<div class="hz-chips hz-map">${house.next.map(t => `<span class="pill hz-ticket">🧟 ${t.map(x => `<i>${TASTES[x].icon}</i>`).join('')}</span>`).join('')}</div>`
      + (shelf ? row(shelf) : `<div class="hz-chips">${chip('🍽️ Nothing cooked yet')}</div>`)
      + row(buyButton({ kind: 'cargo' }, `🎒 Bag ${BAGS[house.cargo + 1]}`) + buyButton({ kind: 'armour' }, `🛡️ Armour ${SUITS[house.armour + 1]}`))
      + `<div class="hz-chips">${chip(`🎒 Bag ${BAGS[house.cargo]}`)}${chip(`❤️ ${SUITS[house.armour]}`)}</div>`,
  };
}
function bookHtml() {
  const tabs = row(`<button type="button" class="k-btn k-choice" data-page="dishes" aria-pressed="${page === 'dishes'}">🍲 Dishes</button>`
    + `<button type="button" class="k-btn k-choice" data-page="techniques" aria-pressed="${page === 'techniques'}">💥 Techniques</button>`);
  const lines = page === 'dishes'
    ? DISH_IDS.map(d => {
      const ds = DISHES[d], c = RECIPES[d].counter;
      return counterOpen(c)
        ? `<li>${ds.emoji} ${ds.name} <i>${TASTES[ds.taste].icon}</i> <b>${ds.code.map(m => MOVES[m]).join('')}</b> <small>${COUNTERS[c].icon} ${COUNTERS[c].name}</small></li>`
        : `<li class="unknown">??? <small>🔒 ${COUNTERS[c].name}</small></li>`;
    })
    : Object.keys(TECHNIQUES).map(k => {
      const [a, b] = k.split('+') as [keyof typeof TASTES, keyof typeof TASTES];
      const found = house.found.includes(k), name = TECHNIQUES[k].name.replace('!', '').toLowerCase();
      return `<li${found ? '' : ' class="unknown"'}><i>${TASTES[a].icon}${TASTES[b].icon}</i> ${found ? name[0].toUpperCase() + name.slice(1) : '???'}</li>`;
    });
  return { cap: `${house.found.length} of ${Object.keys(TECHNIQUES).length} techniques found`, body: tabs + `<ul class="hz-page">${lines.join('')}</ul>` };
}

/** Puts the safe house's screen as things are: the tickets, the hint, the room's bar or the station's panel. */
function showHouse() {
  $('.hz-tickets').textContent = String(house.tickets);
  $('.hz-hint').hidden = house.hinted || house.batches.length > 0;
  room.hidden = !!station || !!cooking;
  stationEl.hidden = !station || !!cooking;
  cookEl.hidden = !cooking;
  home.dataset.station = station ?? '';
  if (!station || cooking) return;
  const s = STATIONS[station];
  const v = station === 'armory' ? armoryHtml() : station === 'van' ? vanHtml() : station === 'book' ? bookHtml() : counterHtml(station);
  $('.hz-st-title').textContent = `${s.icon} ${s.name}`;
  $('.hz-st-cap').textContent = v.cap;
  $('.hz-st-body').innerHTML = v.body;
  for (const b of root.querySelectorAll<HTMLButtonElement>('.hz-st-body [data-cook]')) {
    const d = b.dataset.cook as DishId, c = RECIPES[d].counter;
    state(b, !counterOpen(c) ? 'locked' : canCook(d) ? 'ok' : 'broke', `Needs a ${COUNTERS[c].opens?.toLowerCase()}`);
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('.hz-st-body .hz-broke')) state(b, 'broke');
  const go = $<HTMLButtonElement>('.hz-van-go');
  go.hidden = station !== 'van';
  go.textContent = `🚗 Go · ${house.packed.length} ${house.packed.length === 1 ? 'dish' : 'dishes'}`;
}

/** The timing tap at a counter: the dish's code, twice through, sliding left past the line. */
function startCook(d: DishId) {
  cooking = startCooking(d);
  $('.hz-cook-title').textContent = `${DISHES[d].emoji} ${DISHES[d].name}`;
  $('.hz-notes').innerHTML = cooking.notes.map(n => `<i>${MOVES[n.dir]}</i>`).join('');
  $('.hz-call').textContent = '';
  showHouse();
  lane();
}
/** A move pressed while cooking. */
function cookPress(d: Dir) {
  if (!cooking) return;
  const got = pressCook(cooking, d);
  if (!got) return;
  if (got === 'miss') clack(); else pop();
  call(got);
}
function call(got: 'perfect' | 'good' | 'miss') {
  const el = $('.hz-call');
  el.textContent = got === 'perfect' ? 'Perfect!' : got === 'good' ? 'Good' : 'Miss';
  el.dataset.hit = got;
}
/** The cook's over: the stars it earned make the batch's servings, and it goes on the shelf (and in the van, if there's room). */
function doneCook() {
  const c = cooking!, n = starsFor(cookScore(c));
  cooking = null;
  const b = cook(c.dish, n);
  if (b) {
    if (house.packed.length < house.slots) house.packed.push(house.batches.length - 1);
    house.hinted = true;
    chime();
    note = `${stars(n)} ${DISHES[c.dish].name} · ${n} ${n === 1 ? 'serving' : 'servings'}`;
  }
  showHouse();
}
/** Moves the cook's code along its lane. */
function lane() {
  if (!cooking) return;
  const els = $('.hz-notes').children;
  cooking.notes.forEach((n, i) => {
    const el = els[i] as HTMLElement;
    el.style.transform = `translateX(${((n.at - cooking!.t) * 150).toFixed(1)}px)`;
    el.className = n.hit ?? '';
  });
}

function doBuy(b: Buy) {
  if (buy(b)) chime(); else clack();
  showHouse();
}

// ---------- the loadout, the safe house's buttons ----------
root.addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.station) openStation(b.dataset.station as StationId);
  if (b.dataset.move) cookPress(b.dataset.move as Dir);
  if (b.dataset.cook) { if (usable(b)) startCook(b.dataset.cook as DishId); else clack(); }
  if (b.dataset.buy) doBuy(JSON.parse(b.dataset.buy) as Buy);
  if (b.dataset.gun) { house.gun = b.dataset.gun as GunId; showHouse(); }
  if (b.dataset.pack) { pack(Number(b.dataset.pack)); showHouse(); }
  if (b.dataset.page) { page = b.dataset.page as typeof page; showHouse(); }
  if (b.classList.contains('hz-back')) back();
  if (b.classList.contains('hz-go')) startRun();
  if (b.classList.contains('hz-home')) toHouse();
  if (b.classList.contains('hz-x')) escape();
  if (b.classList.contains('hz-stay')) leaving(false);
  if (b.classList.contains('hz-quit')) { if (run && !run.over && !ranging) homecoming(run); closeHazard(); }
  if (b.dataset.rangeGun) startRange(b.dataset.rangeGun as GunId);
  if (b.dataset.layer) { const k = b.dataset.layer as keyof typeof feel; feel[k] = !feel[k]; rangePanel(); }
});
// a station picked in the room itself
home.addEventListener('pointerdown', e => {
  if ((e.target as Element).closest('button, .hz-station, .hz-cook') || cooking) return;
  const id = stationAt(e.clientX, e.clientY);
  if (id) openStation(id);
});
home.addEventListener('pointermove', e => {
  home.style.cursor = !cooking && stationAt(e.clientX, e.clientY) ? 'pointer' : '';
});

// ---------- screens ----------
let run: Run | null = null;
function mode(m: 'house' | 'play' | 'over') {
  root.dataset.mode = m;
  home.hidden = m !== 'house'; play.hidden = m !== 'play'; over.hidden = m !== 'over';
}
function toHouse() {
  run = null;
  if (!house.next.length) rollNext();
  mode('house');
  openStation(null);
  drawRoom(0);
}

/** The current run, if one's under way or just over (for the tests). */
export const hazardRun = () => run;
/** The safe house's station open now, and the cook under way (for the tests). */
export const houseView = () => ({ station, cooking });

/** Whether the device is played by touch (a phone or a tablet). */
const coarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;
/** A phone held upright: the run waits till it's turned sideways. */
const upright = () => coarse() && window.innerHeight > window.innerWidth;
/** The run holds still: the player's been asked whether to leave, or the phone's upright. */
const holding = () => !leave.hidden || upright();

/** Opens the game in the safe house; or, with `range`, straight onto the firing range (dev and demo builds). */
export function openHazard(opts: { range?: boolean } = {}) {
  root.hidden = false;
  root.dataset.touch = coarse() ? '1' : '0';
  takeover.on = true;
  document.body.classList.add('hz-on');
  cooking = null;
  Object.assign(feel, FEEL);
  if (opts.range) startRange('spud'); else toHouse();
  leaving(false);
  if (coarse()) void sideways();
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

export function closeHazard() {
  root.hidden = true;
  takeover.on = false;
  document.body.classList.remove('hz-on');
  run = null;
  ranging = false;
  flameSound(false);
  $('.hz-range').hidden = true;
  Object.assign(feel, FEEL);
  cooking = null;
  letGoAll();
  clearTags();
  screenBack();
  cancelAnimationFrame(raf);
}

/** Esc or ✕: mid-run, asks first (and Esc again keeps going); in the safe house, steps back; otherwise, leaves. */
function escape() {
  if (root.dataset.mode === 'play' && run && !run.over) leaving(!!leave.hidden);
  else if (root.dataset.mode === 'house' && (cooking || station)) back();
  else closeHazard();
}
/** Out of a cook (nothing's used till it's done), or off a station. */
function back() {
  if (cooking) { cooking = null; showHouse(); } else openStation(null);
}
function leaving(on: boolean) {
  leave.hidden = !on;
  if (on) letGoAll();
}

function startRun() {
  const { loadout, opts } = depart();
  ranging = false;
  run = newRun(loadout, dice(Date.now() >>> 0), opts);
  begin();
}
/** The firing range, with `gun`: a row of zombies that stand there, two dishes to throw that never run out, nothing kept. */
let ranging = false;
function startRange(gun: GunId) {
  ranging = true;
  run = newRun({ gun, dishes: ['chiliPot', 'lemon'], servings: [99, 99] }, dice(1), { at: RANGE.at, range: RANGE.posts });
  begin();
  rangePanel();
}
function rangePanel() {
  $('.hz-range').hidden = !ranging;
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-range-gun]')) b.setAttribute('aria-pressed', String(b.dataset.rangeGun === run?.loadout.gun));
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-layer]')) b.setAttribute('aria-pressed', String(feel[b.dataset.layer as keyof typeof feel]));
}
function begin() {
  const r = run!;
  seen = { cooked: 0, servings: r.servings.join() };
  stopT = 0;
  $('.hz-range').hidden = !ranging;
  lastAim = { x: r.player.x + 100, y: r.player.y };
  dressChef();
  resetView(r);
  mode('play');
  leaving(false);
  dishBar();
}

function finish(r: Run) {
  if (ranging) { startRange(r.loadout.gun); return; }
  if (r.extracted) chime(); else lose();
  const h = homecoming(r), time = Math.floor(r.t);
  $('.hz-verdict').textContent = r.extracted ? 'You got out!' : 'The horde got you';
  const carried = [...r.cookware.map(c => c.emoji), ...r.bag.map(f => TASTES[f.taste].food)].join(' ');
  $('.hz-haul').innerHTML = carried ? `<span class="${r.extracted ? '' : 'lost'}">${carried}</span>` : '';
  $('.hz-stats').innerHTML = [
    chip(`⏱️ ${clock(time)} · ${LEVELS[Math.min(3, Math.floor(stripPos(r.t)))]}`),
    chip(`🧟 ${r.kills}`), chip(`🍳 ${r.cooked} cooked`),
    chip(`🧺 Haul ${h.haul}`), chip(`🎟️ +${h.tickets}`),
    ...h.techniques.map(k => chip(`💥 ${TECHNIQUES[k].name}`)),
    chip(h.bestHaul ? '🏆 New best haul' : `🏆 Best haul ${house.best.haul}`),
    chip(h.bestTime ? '⏱️ Longest yet' : `⏱️ Longest ${clock(house.best.time)}`),
  ].join('');
  letGoAll();
  clearTags();
  mode('over');
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- sideways, on a phone ----------
type Lockable = { lock?: (o: string) => Promise<void>; unlock?: () => void };
let wentFull = false;
/** Full screen, locked sideways, where the phone lets a page do that (not iPhones: they're asked to turn instead). */
async function sideways() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      wentFull = true;
    }
    await (screen.orientation as Lockable | undefined)?.lock?.('landscape');
  } catch { /* the phone won't: the turn-your-phone screen asks instead */ }
}
function screenBack() {
  try { (screen.orientation as Lockable | undefined)?.unlock?.(); } catch { /* never locked */ }
  if (wentFull && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  wentFull = false;
}

// ---------- keys and mouse ----------
const held = new Set<string>();
let firing = false;
/** The mouse, on the screen (it's turned into a spot on the street each frame, as the camera follows the chef). */
let mouse: { x: number; y: number } | null = null;
/** Where the chef last aimed, kept when nothing's aiming. */
let lastAim = { x: 0, y: 0 };
const DIRS: Record<string, Dir> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
/** A dish slot's key (1 to 4), or -1. */
const slotKey = (code: string) => { const m = /^(?:Digit|Numpad)([1-4])$/.exec(code); return m ? Number(m[1]) - 1 : -1; };

/** A step of a dish's code went in (or slipped). */
function typed(got: ReturnType<typeof press>) {
  if (got === 'done') chime(); else if (got) clack();
}

/** Takes the best thing in the crate the chef's at (E, or the use button). */
function takeBest(r: Run) {
  const c = crateAt(r);
  if (c) took(take(r, c, bestIn(c)));
}
function took(got: ReturnType<typeof take>) {
  if (got === 'took' || got === 'swapped') pop(); else if (got === 'full') clack();
}

window.addEventListener('keydown', e => {
  // (a cook at a counter takes the moves)
  if (!root.hidden && cooking && DIRS[e.code]) { e.preventDefault(); if (!e.repeat) cookPress(DIRS[e.code]); return; }
  if (root.hidden || root.dataset.mode !== 'play' || !run || run.over || holding()) return;
  // (any key skips the drop-off)
  if (run.dropT > 0) { run.dropT = 0; return; }
  if (e.code === 'KeyE') {
    if (!e.repeat) takeBest(run);
    held.add('KeyE');
    return;
  }
  const dir = DIRS[e.code], slot = slotKey(e.code);
  if (dir || slot >= 0 || e.code === 'KeyF' || e.code === 'KeyR') e.preventDefault();
  if (e.repeat) return;
  if (dir && run.serving && !run.serving.ready) { typed(press(run, dir)); return; }
  if (dir) held.add(e.code);
  if (slot >= 0) startServe(run, slot);
  if (e.code === 'KeyF') shove(run);
  if (e.code === 'KeyR') reload(run);
});
window.addEventListener('keyup', e => {
  held.delete(e.code);
  if (run && slotKey(e.code) >= 0) letGo(run);
});
window.addEventListener('blur', letGoAll);

// ---------- fingers ----------
/** A stick under a thumb: where it went down, and how far it's pushed (-1 to 1 each way, `k` how far altogether). */
interface Stick { id: number | null; ox: number; oy: number; x: number; y: number; k: number; el: HTMLElement }
const stick = (el: HTMLElement): Stick => ({ id: null, ox: 0, oy: 0, x: 0, y: 0, k: 0, el });
const moveStick = stick($('.hz-move')), aimStick = stick($('.hz-aim'));
/** How far a stick's knob goes, and how far a swipe goes to count as one move of a code (CSS pixels). */
const REACH = 56, SWIPE = 34;
/** The finger holding a dish's button, and the one swiping its code. */
let dishFinger: number | null = null;
let swipe: { id: number; x: number; y: number } | null = null;
/** The finger holding the use button (radioing the van). */
let useFinger: number | null = null;

const pid = (e: PointerEvent) => e.pointerId ?? -1;
const isTouch = (e: PointerEvent) => e.pointerType === 'touch' || e.pointerType === 'pen';

function stickTo(s: Stick, e: PointerEvent) {
  let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
  const d = Math.hypot(dx, dy);
  if (d > REACH) { dx *= REACH / d; dy *= REACH / d; }
  s.x = dx / REACH; s.y = dy / REACH; s.k = Math.min(1, d / REACH);
  (s.el.firstElementChild as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`;
}
function endStick(s: Stick) {
  s.id = null; s.x = s.y = s.k = 0;
  s.el.classList.remove('on');
}
function letGoAll() {
  held.clear();
  firing = false;
  endStick(moveStick); endStick(aimStick);
  swipe = null;
  useFinger = null;
  if (dishFinger !== null && run) letGo(run);
  dishFinger = null;
}

play.addEventListener('pointerdown', e => {
  if (!run || run.over || holding()) return;
  const touch = isTouch(e), t = e.target as Element;
  root.dataset.touch = touch ? '1' : '0';
  if (run.dropT > 0) { run.dropT = 0; return; }
  const item = t.closest<HTMLElement>('.hz-loot [data-item]');
  if (item) {
    const c = run.crates.find(o => o.id === Number(item.dataset.crate));
    if (c) took(take(run, c, Number(item.dataset.item)));
    return;
  }
  if (t.closest('.hz-use')) { useFinger = pid(e); takeBest(run); return; }
  const slot = t.closest<HTMLElement>('.hz-slot');
  if (slot?.dataset.slot) {
    if (startServe(run, Number(slot.dataset.slot))) { dishFinger = pid(e); dishBar(); }
    e.preventDefault();
    return;
  }
  if (t.closest('.hz-shove')) { shove(run); return; }
  if (t.closest('.hz-ammo-pill')) { reload(run); return; }
  if (t.closest('button')) return;
  // a dish in hand goes where the tap or click is
  if (run.serving?.ready) {
    const at = toArena(e.clientX, e.clientY);
    if (at && throwDish(run, at)) throwSound(0);
    return;
  }
  if (!touch) {
    if (e.button !== 0) return;
    mouse = { x: e.clientX, y: e.clientY };
    firing = true;
    return;
  }
  // a code going in: any other finger swipes it
  if (run.serving) { swipe = { id: pid(e), x: e.clientX, y: e.clientY }; return; }
  const s = e.clientX < window.innerWidth / 2 ? moveStick : aimStick;
  if (s.id !== null) return;
  s.id = pid(e); s.ox = e.clientX; s.oy = e.clientY; s.x = s.y = s.k = 0;
  s.el.style.left = `${e.clientX}px`; s.el.style.top = `${e.clientY}px`;
  (s.el.firstElementChild as HTMLElement).style.transform = '';
  s.el.classList.add('on');
  try { play.setPointerCapture(e.pointerId); } catch { /* the finger's already gone */ }
});
window.addEventListener('pointermove', e => {
  if (root.hidden) return;
  const id = pid(e);
  if (id === moveStick.id) stickTo(moveStick, e);
  else if (id === aimStick.id) stickTo(aimStick, e);
  else if (swipe && id === swipe.id) {
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.hypot(dx, dy) < SWIPE || !run) return;
    typed(press(run, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')));
    swipe.x = e.clientX; swipe.y = e.clientY;
  } else if (!isTouch(e)) mouse = { x: e.clientX, y: e.clientY };
});
function fingerUp(e: PointerEvent) {
  const id = pid(e);
  if (id === moveStick.id) endStick(moveStick);
  if (id === aimStick.id) endStick(aimStick);
  if (swipe?.id === id) swipe = null;
  if (dishFinger !== null && id === dishFinger) { dishFinger = null; if (run) letGo(run); }
  if (id === useFinger) useFinger = null;
  if (!isTouch(e)) firing = false;
}
window.addEventListener('pointerup', fingerUp);
window.addEventListener('pointercancel', fingerUp);

/** Where the chef aims now, in the rules' units: the aiming stick, else the mouse, else where they aimed last. */
function aimNow() {
  if (!run) return null;
  if (aimStick.id !== null && aimStick.k > 0.2) {
    // (pulled a little onto the nearest zombie in a narrow cone round it)
    const a = pullAim(run, Math.atan2(aimStick.y, aimStick.x));
    lastAim = { x: run.player.x + Math.cos(a) * 400, y: run.player.y + Math.sin(a) * 400 };
  }
  else if (mouse) lastAim = toArena(mouse.x, mouse.y) ?? lastAim;
  return lastAim;
}

function input(r: Run): Input {
  // (a stick barely pushed is a thumb resting on it)
  const pushed = moveStick.k > 0.15;
  const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) + (pushed ? moveStick.x : 0);
  const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) + (pushed ? moveStick.y : 0);
  return { move: { x, y }, aim: aimNow()!, fire: firing || (aimStick.k > 0.3 && !r.serving), use: held.has('KeyE') || useFinger !== null };
}

// ---------- the loop ----------
let raf = 0, last = 0;
let seen = { cooked: 0, servings: '' };
/** The hit-stop: how much longer the world holds still for a big hit. */
let stopT = 0;
const STOP_TIME = 0.04;

function frame(now: number) {
  if (root.hidden) return;
  advance(Math.min(0.05, Math.max(0, (now - last) / 1000)));
  last = now;
  raf = requestAnimationFrame(frame);
}

/** One frame: the run moves on `dt` seconds (unless it's holding still), and the street and the screen catch up. */
export function advance(dt: number) {
  root.dataset.upright = String(upright());
  if (root.dataset.mode === 'house') {
    if (cooking) {
      // (a move gone past the line unpressed is a miss)
      const missed = cooking.notes.filter(n => n.hit === 'miss').length;
      const done = stepCooking(cooking, dt);
      if (cooking.notes.filter(n => n.hit === 'miss').length > missed) { clack(); call('miss'); }
      if (done) doneCook(); else lane();
    }
    drawRoom(dt);
    renderRoom();
    return;
  }
  const playing = !!run && root.dataset.mode === 'play';
  // (a big hit holds everything still for a blink)
  const stopped = stopT > 0;
  stopT = Math.max(0, stopT - dt);
  const still = !playing || holding() || stopped;
  if (playing && !still) {
    flameT = Math.max(0, flameT - dt);
    step(run!, dt, input(run!));
    if (run!.cooked > seen.cooked) pop();
    seen.cooked = run!.cooked;
    felt(run!, dt);
  }
  // the flame's sound, held while it fires (through a hit-stop too), let go when it stops or the run holds still
  if (!stopped) flameSound(playing && !still && feel.sound && flameT > 0);
  drawSet(run, still ? 0 : dt, { aim: playing ? aimNow() : null });
  if (playing) {
    tags(run!);
    hud(run!);
    dot(run!);
    if (seen.servings !== run!.servings.join() || run!.serving) dishBar();
    if (run!.over) finish(run!);
  }
  renderSet();
}

/** The flame's sound is held while its drops keep coming (fourteen a second), till this long after the last; and the
 *  next crackle of whatever's burning. */
let flameT = 0, crackleT = 0;
const FLAME_HOLD = 0.12;
const jig = dice(0xC4AC);

/** What the rules say happened this step, heard and felt: the guns' sounds, a big hit's hit-stop and buzz; and
 *  whatever's burning, crackling. */
function felt(r: Run, dt: number) {
  for (const f of r.fx) {
    if (f.kind === 'shot') {
      if (f.gun === 'chili') flameT = FLAME_HOLD;
      else if (feel.sound) { gunSound(f.gun); if (f.gun === 'salt') shellSound(); }
    }
    // (the flame's hits are its roar and the crackle)
    else if (f.kind === 'hit') { if (feel.sound && f.gun !== 'chili') { hitSound(f.taste, f.gun); if (f.crit) critSound(); } }
    else if (f.kind === 'blast') { if (feel.sound) blastSound(); }
    else if (f.kind === 'rush') { if (feel.sound) rushSound(); }
    else if (f.kind === 'ignite') { if (feel.sound) { igniteSound(); groanSound(); } }
    else if (f.kind === 'charred') { if (feel.sound) sizzleSound(); }
    else if (f.kind === 'stop') {
      if (feel.stop) stopT = STOP_TIME;
      // (phones that can: Android's; never iPhones, which can't, nor a computer)
      if (feel.buzz && coarse()) navigator.vibrate?.(30);
    }
  }
  crackleT -= dt;
  if (crackleT <= 0 && feel.sound && r.zombies.some(z => z.burnT > 0)) { crackle(); crackleT = 0.2 + jig() * 0.13; }
}

/** The aim dot: at the mouse, or ahead of the aiming thumb (on the zombie it's lined up on); gold over a crit area. */
function dot(r: Run) {
  const el = $('.hz-dot'), touch = root.dataset.touch === '1';
  const aim = aimNow(), aiming = touch ? aimStick.id !== null && aimStick.k > 0.2 : !!mouse;
  el.hidden = !aiming || !aim || !!r.serving || r.dropT > 0;
  if (el.hidden || !aim) return;
  const line = lineUp(r, aim);
  let at = mouse && !touch ? mouse : null;
  if (!at) {
    const p = r.player, d = Math.hypot(aim.x - p.x, aim.y - p.y) || 1, far = 5 * U;
    at = line ? toScreen(line.z.x, line.z.y, 0.8) : toScreen(p.x + (aim.x - p.x) / d * far, p.y + (aim.y - p.y) / d * far, 0.8);
  }
  el.style.transform = `translate(${at.x.toFixed(1)}px,${at.y.toFixed(1)}px)`;
  el.classList.toggle('crit', !!line?.crit);
}

// ---------- the HUD ----------
function hud(r: Run) {
  const g = GUNS[r.loadout.gun];
  $('.hz-hp').style.width = `${r.player.hp}%`;
  $('.hz-hpn').textContent = String(Math.ceil(r.player.hp));
  $('.hz-time').textContent = clock(r.t);
  // the words slide left past the marker, 120px a word
  $('.hz-track').style.transform = `translateX(${60 - stripPos(r.t) * 120}px)`;
  const ic = $('.hz-gun');
  ic.textContent = g.emoji;
  ic.style.background = g.taste ? TASTES[g.taste].color : '';
  $('.hz-ammo').textContent = r.reloadT > 0 ? 'Reloading' : r.ammo + r.spare === 0 ? 'Empty' : `${r.ammo} / ${g.mag} · ×${r.spare}`;
  $('.hz-score').textContent = `${r.kills} · 🍳 ${r.cooked}`;
  $('.hz-bag').textContent = `${r.bag.length} / ${r.bagMax}${r.cookware.length ? ` · ${r.cookware.map(c => c.emoji).join('')}` : ''}`;
  // the safe zone: calling the van, holding the ring, hopping in
  const inZone = Math.hypot(r.player.x - r.zone.x, r.player.y - r.zone.y) <= ZONE_R;
  const zone = r.stage === 'hold' ? (inZone ? `Hold on ${clock(Math.ceil(r.holdT))}` : 'Get back in the ring!')
    : r.stage === 'van' ? `🚗 Hop in! ${clock(Math.ceil(r.vanT))}`
    : inZone ? (r.radioT > 0 ? 'Calling the van…' : root.dataset.touch === '1' ? 'Hold Radio to call the van' : 'Hold E to call the van') : '';
  $('.hz-zone-pill').hidden = !zone;
  $('.hz-zone').textContent = zone;
  $('.hz-use').hidden = !(root.dataset.touch === '1' && r.stage === 'run' && inZone);
  $('.hz-boost').hidden = r.boost <= 0;
  $('.hz-boostn').textContent = `Boost ×${r.boost}`;
}

function dishBar() {
  if (!run) return;
  const r = run;
  seen.servings = r.servings.join();
  $('.hz-dishes').innerHTML = Array.from({ length: SLOTS }, (_, i) => {
    const id = r.loadout.dishes[i];
    if (!id && i >= house.slots) return `<div class="hz-slot locked"><span>🔒</span>Slot ${i + 1}</div>`;
    if (!id) return `<div class="hz-slot empty none"><span>🍽️</span>Empty</div>`;
    const d = DISHES[id], t = TASTES[d.taste], n = r.servings[i];
    const cls = n <= 0 ? ' empty' : r.serving?.slot === i ? ' on' : '';
    const ink = d.taste === 'spicy' || d.taste === 'bitter' || d.taste === 'umami' ? '#fff' : 'var(--ink)';
    return `<div class="hz-slot${cls}" data-slot="${i}" style="--c:${t.color};--c-ink:${ink}"><span>${d.emoji}</span>${d.name.split(' ')[0]}<b>${n}</b></div>`;
  }).join('');
}

// ---------- what floats over the street ----------
interface Tag { el: HTMLElement; html: string; used: boolean }
const tagged = new Map<object, Tag>();
/** The recipe ticket over the chef has this key. */
const SERVING = {};
/** How far in from the screen's edge an arrow to a special off it sits (its middle), and a ticket on it at least. */
const EDGE = 64, MARGIN = 44;

/** Puts the tag for `key` (made the first time) at screen point (x, y), showing `html`. */
function tag(key: object, cls: string, html: string, x: number, y: number) {
  let t = tagged.get(key);
  if (!t) {
    const el = document.createElement('div');
    tagLayer.append(el);
    t = { el, html: '', used: true };
    tagged.set(key, t);
  }
  t.used = true;
  if (t.el.className !== cls) t.el.className = cls;
  if (t.html !== html) { t.html = html; t.el.innerHTML = html; }
  t.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
}
function clearTags() {
  for (const t of tagged.values()) t.el.remove();
  tagged.clear();
}

const ticketHtml = (z: Zombie) => z.ticket!.map((t, i) => `<i${i < z.step ? ' class="done"' : ''}>${TASTES[t].icon}</i>`).join('')
  + `<u style="width:${Math.max(0, Math.round(z.hp / z.maxHp * 100))}%"></u>`;

/** Whether a point is off the screen. */
const offScreen = (s: ReturnType<typeof toScreen>) => s.behind || s.x < 0 || s.x > window.innerWidth || s.y < 0 || s.y > window.innerHeight;
/** An arrow at the screen's edge (on its outer side) pointing at `at`, which is off it, with `html` beside it. */
function edge(key: object, at: ReturnType<typeof toScreen>, html: string) {
  const w = window.innerWidth, h = window.innerHeight;
  let dx = at.x - w / 2, dy = at.y - h / 2;
  if (at.behind) { dx = -dx; dy = -dy; }
  const k = Math.min((w / 2 - EDGE) / Math.max(1e-6, Math.abs(dx)), (h / 2 - EDGE) / Math.max(1e-6, Math.abs(dy)));
  tag(key, `hz-tag hz-edge${dx > 0 ? ' right' : ''}`, `<b style="transform:rotate(${Math.atan2(dy, dx).toFixed(2)}rad)">➤</b>${html}`,
    w / 2 + dx * k, h / 2 + dy * k);
}
/** The arrows' keys for the safe zone and the van. */
const ZONE = {}, VAN = {}, LOOT = {};

/** A thing in a crate, as its button names it (magazines with the gun's own icon). */
const itemName = (r: Run, it: Item) => (it.kind === 'food' ? `${TASTES[it.taste].food} ${INGREDIENTS[it.taste]}`
  : it.kind === 'cookware' ? `${it.emoji} ${it.name}` : `${GUNS[r.loadout.gun].emoji} +${it.mags} magazines`);
/** An open crate's card: a button for each thing in it; with the bag full, what it would swap (or that it's full). */
function lootHtml(r: Run, c: Crate) {
  return c.items.map((it, i) => {
    const how = wouldTake(r, c, i), worst = how === 'swap' ? r.bag[worstInBag(r)] : null;
    const label = worst && it.kind === 'food'
      ? `Swap ${TASTES[worst.taste].food} ${GRADES[worst.grade]} → ${TASTES[it.taste].food} ${GRADES[it.grade]}`
      : `${itemName(r, it)}${it.kind === 'food' ? ` <small class="g${it.grade}">${GRADES[it.grade]}</small>` : ''}`;
    return `<button type="button" class="k-btn${how === 'full' ? ' full' : ''}" data-crate="${c.id}" data-item="${i}">${label}${how === 'full' ? '<small>Bag full</small>' : ''}</button>`;
  }).join('');
}

function tags(r: Run) {
  for (const t of tagged.values()) t.used = false;
  const w = window.innerWidth;
  for (const z of r.zombies) {
    if (!z.ticket && !z.coat) continue;
    const s = toScreen(z.x, z.y, headOf(z)), mid = toScreen(z.x, z.y, 0.8);
    if (z.ticket && offScreen(mid)) edge(z, mid, `<span class="hz-ticket">${ticketHtml(z)}</span>`);
    else if (z.ticket) {
      // (kept on the screen when its head's just off it)
      tag(z, 'hz-tag hz-ticket', ticketHtml(z), Math.max(MARGIN, Math.min(w - MARGIN, s.x)), Math.max(MARGIN, s.y));
    }
    else tag(z, 'hz-tag hz-coat', TASTES[z.coat!].icon, s.x, s.y);
    const t = tagged.get(z)!;
    t.el.style.opacity = !z.ticket ? String(0.35 + 0.65 * Math.min(1, z.coatT)) : '';
  }
  for (const st of r.stamps) stamp(st);
  // the open crate the chef's at: what's in it
  const c = crateAt(r);
  if (c) { const at = toScreen(c.x, c.y, 1); tag(LOOT, 'hz-tag hz-loot', lootHtml(r, c), at.x, at.y); }
  // the safe zone (from Stale on, or once the van's called) and the van, when they're off the screen
  const z = toScreen(r.zone.x, r.zone.y, 0.5);
  if ((level(r.t) >= 1 || r.stage === 'hold') && r.stage !== 'van' && offScreen(z)) edge(ZONE, z, `<span class="hz-ticket">📣 ${r.stage === 'hold' ? clock(Math.ceil(r.holdT)) : 'Safe zone'}</span>`);
  if (r.stage === 'van' && offScreen(z)) edge(VAN, z, '<span class="hz-ticket">🚗 Van</span>');
  if (r.serving) {
    const s = r.serving, code = DISHES[r.loadout.dishes[s.slot]].code, at = toScreen(r.player.x, r.player.y, 2.2);
    tag(SERVING, `hz-tag hz-serve${s.smudge > 0 ? ' smudged' : ''}`,
      code.map((d, i) => `<i${s.ready || i < s.typed ? ' class="done"' : ''}>${MOVES[d]}</i>`).join(''), at.x, at.y);
  }
  for (const [k, t] of tagged) if (!t.used) { t.el.remove(); tagged.delete(k); }
}

/** A technique's stamp, rising and fading where it popped. */
function stamp(st: Stamp) {
  const at = toScreen(st.x, st.y + 40, 2.2);
  tag(st, 'hz-tag hz-stamp', `<b style="color:${st.color};border-color:${st.color}">${st.text}</b>`, at.x, at.y - (1.2 - st.t) * 30);
  tagged.get(st)!.el.style.opacity = String(Math.min(1, st.t * 2));
}
