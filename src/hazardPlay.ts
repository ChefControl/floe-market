// Cooking Hazard, the arcade cabinet's game (casinoArcade.ts, or ?arcade=play in dev and demo builds, main.ts), on the
// UI kit's full screen over the game, which waits behind it. Pick a gun and two dishes, then hold the street till the
// horde gets you. The rules are hazard.ts; the street they're played on is hazardSet.ts, in 3D, drawn in the game's
// place (render.ts takeover). This feeds the run the keys, the mouse or the fingers, and puts on the screen what floats
// over the street: the tastes on the zombies, the specials' tickets (an arrow at the edge for one off the screen), the
// technique stamps and the recipe ticket over the chef while a dish's code goes in, with the HUD and the dish buttons.
//
// Keyboard and mouse: WASD to walk, the mouse to aim, hold the button to fire, F to shove, R to reload. Hold 1 or 2 to
// serve a dish: the chef stops while its code goes in on WASD or the arrows; let go, then click to throw.
// Touch (sideways only: it goes full screen and locks the screen sideways where the phone lets it, and asks to turn the
// phone where it doesn't): a stick wherever a thumb lands, the left half to walk, the right half to aim and fire. Hold a
// dish button (on the left), swipe its code with the other thumb, one swipe a move, then tap where it lands. Shove is a
// button on the right; the gun reloads by itself when it's empty, and a tap on the ammo reloads early.
// Esc or ✕ mid-run holds it still and asks first: Keep going, or Leave.
import './hazard.css';
import {
  BAG, DISHES, GRADES, GUNS, INGREDIENTS, LEVELS, MOVES, TASTES, ZONE_R, bestIn, crateAt, haul, letGo, level,
  newRun, press, reload, shove, startServe, step, stripPos, take, throwDish, worstInBag, wouldTake,
  type Crate, type Dir, type DishId, type GunId, type Input, type Item, type Run, type Stamp, type Zombie,
} from './hazard';
import { drawSet, dressChef, headOf, renderSet, resetView, toArena, toScreen } from './hazardSet';
import { dice } from './kit';
import { takeover } from './render';
import { chime, clack, lose, pop, throwSound } from './sfx';
import { panel } from './uiKit';

/** The bests kept on this device: the longest survived (seconds), and the most loot brought home (hazard.ts haul). */
const BEST = 'floe-market-hazard-best', HAUL = 'floe-market-hazard-haul';
/** What's been brought home, kept on this device till the safe house keeps it in the save. */
const PANTRY = 'floe-market-hazard-pantry';
const GUN_IDS = Object.keys(GUNS) as GunId[];
const DISH_IDS = Object.keys(DISHES) as DishId[];
const SLOTS = 4;

const root = document.createElement('div');
root.id = 'hazard';
root.hidden = true;
root.innerHTML = `
  <div class="hz-pick">
    <h2 class="k-title">🕹️ Cooking Hazard</h2>
    <p class="k-cap">Pick a gun and two dishes</p>
    <div class="k-row k-keys hz-guns">${GUN_IDS.map(g => `<button class="k-btn k-choice" data-gun="${g}">${GUNS[g].emoji} ${GUNS[g].name}</button>`).join('')}</div>
    <div class="k-row k-keys hz-dish-pick">${DISH_IDS.map(d => `<button class="k-btn k-choice" data-dish="${d}">${DISHES[d].emoji} ${DISHES[d].name} · ${TASTES[DISHES[d].taste].icon}</button>`).join('')}</div>
    <div class="k-row"><button class="k-btn k-main hz-start">Start run</button></div>
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
      <div class="pill hz-zone-pill" hidden><span class="hz-ic" style="background:#1e8fc0">📻</span><span class="hz-zone"></span></div>
      <div class="pill hz-boost" hidden><span class="hz-ic" style="background:#49c25b">🌿</span><span class="hz-boostn"></span></div>
    </div>
    <div class="hz-dishes"></div>
    <button type="button" class="k-btn hz-shove">💪 Shove</button>
    <button type="button" class="k-btn hz-use" hidden>📻 Radio</button>
    <div class="hz-stick hz-move"><i></i></div>
    <div class="hz-stick hz-aim"><i></i></div>
    <div class="hz-leave" hidden>
      <div class="hz-card">
        <h2 class="k-title">Leave the run?</h2>
        <div class="k-row"><button type="button" class="k-btn k-plain hz-quit">Leave</button><button type="button" class="k-btn k-main hz-stay">Keep going</button></div>
      </div>
    </div>
    <div class="hz-turn"><span>📱↻</span><p class="k-title">Turn your phone sideways</p></div>
  </div>
  <div class="hz-over" hidden>
    <h2 class="k-title hz-verdict"></h2>
    <div class="hz-haul"></div>
    <div class="hz-stats"></div>
    <div class="k-row">
      <button class="k-btn k-plain hz-change">Change loadout</button>
      <button class="k-btn k-main hz-again">Run again</button>
    </div>
  </div>
  <button type="button" class="k-btn k-plain k-x hz-x" aria-label="Leave">✕</button>`;
document.body.append(root);
panel(root, { place: 'full', close: escape });

const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
const pick = $('.hz-pick'), play = $('.hz-play'), over = $('.hz-over'), leave = $('.hz-leave'), tagLayer = $('.hz-tags');

// ---------- the loadout ----------
let gun: GunId = 'spud';
let dishes: DishId[] = ['chiliPot', 'syrup'];
function showPick() {
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-gun]')) b.setAttribute('aria-pressed', String(b.dataset.gun === gun));
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-dish]')) b.setAttribute('aria-pressed', String(dishes.includes(b.dataset.dish as DishId)));
  $<HTMLButtonElement>('.hz-start').disabled = dishes.length !== 2;
}
root.addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.gun) gun = b.dataset.gun as GunId;
  if (b.dataset.dish) {
    const d = b.dataset.dish as DishId;
    // two at a time: a third replaces the older of the two
    dishes = dishes.includes(d) ? dishes.filter(x => x !== d) : [...dishes, d].slice(-2);
  }
  if (b.classList.contains('hz-start') || b.classList.contains('hz-again')) startRun();
  if (b.classList.contains('hz-change')) mode('pick');
  if (b.classList.contains('hz-x')) escape();
  if (b.classList.contains('hz-stay')) leaving(false);
  if (b.classList.contains('hz-quit')) closeHazard();
  showPick();
});

// ---------- screens ----------
let run: Run | null = null;
function mode(m: 'pick' | 'play' | 'over') {
  root.dataset.mode = m;
  pick.hidden = m !== 'pick'; play.hidden = m !== 'play'; over.hidden = m !== 'over';
}

/** The current run, if one's under way or just over (for the tests). */
export const hazardRun = () => run;

/** Whether the device is played by touch (a phone or a tablet). */
const coarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;
/** A phone held upright: the run waits till it's turned sideways. */
const upright = () => coarse() && window.innerHeight > window.innerWidth;
/** The run holds still: the player's been asked whether to leave, or the phone's upright. */
const holding = () => !leave.hidden || upright();

export function openHazard() {
  root.hidden = false;
  root.dataset.touch = coarse() ? '1' : '0';
  takeover.on = true;
  document.body.classList.add('hz-on');
  mode('pick');
  leaving(false);
  showPick();
  resetView(null);
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
  letGoAll();
  clearTags();
  screenBack();
  cancelAnimationFrame(raf);
}

/** Esc or ✕: mid-run, asks first (and Esc again keeps going); otherwise, leaves. */
function escape() {
  if (root.dataset.mode === 'play' && run && !run.over) leaving(!!leave.hidden);
  else closeHazard();
}
function leaving(on: boolean) {
  leave.hidden = !on;
  if (on) letGoAll();
}

function startRun() {
  run = newRun({ gun, dishes: [...dishes] }, dice(Date.now() >>> 0), { intro: true });
  seen = { cooked: 0, servings: run.servings.join() };
  lastAim = { x: run.player.x + 100, y: run.player.y };
  dressChef();
  resetView(run);
  mode('play');
  leaving(false);
  dishBar();
}

const stored = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* kept for this visit only */ } };

/** Puts what the run brought home in the pantry (on this device, for now). */
function bank(r: Run) {
  let pantry: { food: Record<string, number>; cookware: Record<string, number> } = { food: {}, cookware: {} };
  try { pantry = { ...pantry, ...JSON.parse(localStorage.getItem(PANTRY) ?? '{}') }; } catch { /* a fresh pantry */ }
  for (const f of r.bag) pantry.food[`${f.taste}:${f.grade}`] = (pantry.food[`${f.taste}:${f.grade}`] ?? 0) + 1;
  for (const c of r.cookware) pantry.cookware[c.name] = (pantry.cookware[c.name] ?? 0) + 1;
  store(PANTRY, JSON.stringify(pantry));
}

function finish(r: Run) {
  if (r.extracted) { chime(); bank(r); } else lose();
  const time = Math.floor(r.t), best = stored(BEST), isBest = time > best;
  const got = haul(r), bestHaul = stored(HAUL), isHaul = got > bestHaul;
  if (isBest) store(BEST, String(time));
  if (isHaul) store(HAUL, String(got));
  const chip = (s: string) => `<span class="pill">${s}</span>`;
  $('.hz-verdict').textContent = r.extracted ? 'You got out!' : 'The horde got you';
  const carried = [...r.cookware.map(c => c.emoji), ...r.bag.map(f => TASTES[f.taste].food)].join(' ');
  $('.hz-haul').innerHTML = carried ? `<span class="${r.extracted ? '' : 'lost'}">${carried}</span>` : '';
  $('.hz-stats').innerHTML = [
    chip(`⏱️ ${clock(time)} · ${LEVELS[Math.min(3, Math.floor(stripPos(r.t)))]}`),
    chip(`🧟 ${r.kills}`), chip(`🍳 ${r.cooked} cooked`),
    chip(`🧺 Haul ${got}`),
    chip(isHaul ? '🏆 New best haul' : `🏆 Best haul ${bestHaul}`),
    chip(isBest ? '⏱️ Longest yet' : `⏱️ Longest ${clock(best)}`),
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
  if (aimStick.id !== null && aimStick.k > 0.2) lastAim = { x: run.player.x + aimStick.x * 400, y: run.player.y + aimStick.y * 400 };
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

function frame(now: number) {
  if (root.hidden) return;
  advance(Math.min(0.05, Math.max(0, (now - last) / 1000)));
  last = now;
  raf = requestAnimationFrame(frame);
}

/** One frame: the run moves on `dt` seconds (unless it's holding still), and the street and the screen catch up. */
export function advance(dt: number) {
  root.dataset.upright = String(upright());
  const playing = !!run && root.dataset.mode === 'play', still = !playing || holding();
  if (playing && !still) {
    step(run!, dt, input(run!));
    if (run!.cooked > seen.cooked) pop();
    seen.cooked = run!.cooked;
  }
  drawSet(root.dataset.mode === 'pick' ? null : run, still ? 0 : dt, { aim: playing ? aimNow() : null });
  if (playing) {
    tags(run!);
    hud(run!);
    if (seen.servings !== run!.servings.join() || run!.serving) dishBar();
    if (run!.over) finish(run!);
  }
  renderSet();
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
  $('.hz-bag').textContent = `${r.bag.length} / ${BAG}${r.cookware.length ? ` · ${r.cookware.map(c => c.emoji).join('')}` : ''}`;
  // the safe zone: calling the van, holding the ring, hopping in
  const inZone = Math.hypot(r.player.x - r.zone.x, r.player.y - r.zone.y) <= ZONE_R;
  const zone = r.stage === 'hold' ? (inZone ? `Hold on ${clock(Math.ceil(r.holdT))}` : 'Get back in the ring!')
    : r.stage === 'van' ? `🚐 Hop in! ${clock(Math.ceil(r.vanT))}`
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
    if (!id) return `<div class="hz-slot locked"><span>🔒</span>Slot ${i + 1}</div>`;
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

const itemName = (it: Item) => (it.kind === 'food' ? `${TASTES[it.taste].food} ${INGREDIENTS[it.taste]}`
  : it.kind === 'cookware' ? `${it.emoji} ${it.name}` : `📦 +${it.mags} magazines`);
/** An open crate's card: a button for each thing in it; with the bag full, what it would swap (or that it's full). */
function lootHtml(r: Run, c: Crate) {
  return c.items.map((it, i) => {
    const how = wouldTake(r, c, i), worst = how === 'swap' ? r.bag[worstInBag(r)] : null;
    const label = worst && it.kind === 'food'
      ? `Swap ${TASTES[worst.taste].food} ${GRADES[worst.grade]} → ${TASTES[it.taste].food} ${GRADES[it.grade]}`
      : `${itemName(it)}${it.kind === 'food' ? ` <small class="g${it.grade}">${GRADES[it.grade]}</small>` : ''}`;
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
  if ((level(r.t) >= 1 || r.stage === 'hold') && r.stage !== 'van' && offScreen(z)) edge(ZONE, z, `<span class="hz-ticket">📻 ${r.stage === 'hold' ? clock(Math.ceil(r.holdT)) : 'Safe zone'}</span>`);
  if (r.stage === 'van' && offScreen(z)) edge(VAN, z, '<span class="hz-ticket">🚐 Van</span>');
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
