// The gong, and what's shown about the fight night (stage 3), as a TV sumo broadcast with an arcade's punch. Standing
// at the gong opens its panel: the champion against the next boss, their faces (portraits.ts), the crowd he brings,
// his bell and his prize, and your chances in a word (Win to Lose), worked out by running the rush ahead in a copy of
// the cellar, with the player in it working as a good player would (fight.ts's forecast). No numbers there: finding
// out you never had a chance is part of it. No fee, no luck: ring it whenever. With Slick Eddie's fix paid for
// (eddie.ts), it gives a word for each face of his coin: the fix holding (fewer of his fans), and it getting out (all of
// them). Rung with a fix on, his coin's tossed (and the whole world waits on it, game.ts): it spins, lands on its edge,
// drops flat on one face, says what that means, and waits for a tap. Then a banner walks the boss in (入場). The strip
// along the top follows every boss's fight (and a local's, from the watch spot): the faces, the fans each way, his bell
// running down, then the fight, a tug of war on a rope in their colours. After a boss's fight a card stamps the result:
// the prize and what's new, or how short and the one thing that cost it. The HUD's 💪 is the fans fed in this fight's
// preparation. And the watch spot 👁️ by the ring: stand on it and the camera closes in on the fight (on a boss's fight,
// the watch button under the strip does it from anywhere).
import { AdditiveBlending, DoubleSide, Mesh, MeshBasicMaterial, NormalBlending, RingGeometry, Vector3 } from 'three';
import { cellar, CY, gongBronze, gongDisc, RING } from './cellar';
import { GONG, GONG_PAD, WATCH } from './cellarPlan';
import { decal, drawPad } from './decals';
import { dustFx } from './fx';
import { ringCam } from './dohyo';
import {
  type Boss, bossOf, BOSSES, BUYOUT, canRing, canShow, type Carry, F, type Forecast, fixOn, forecast, ICON, type Ing, keptHome, NAME, nextBoss, practiceDue, ringGong,
  grand, type Rush, sides, slam, SLAM, slamDue, strength, toBeat, worstShort, you,
} from './fight';
import { isTouch } from './hint';
import { kindOf } from './items';
import { buyHeld, keyHeld } from './input';
import { level, stage } from './layout';
import { player } from './player';
import { landsOf, moveOf } from './finishers';
import { epicFx } from './epicFx';
import { showFace } from './portraits';
import { CHAMP } from './rikishi';
import { chime, coinDrop, coinEdge, coinPing, lose, win } from './sfx';
import { CELLAR_ZOOM, view } from './stage';
import { d2xz } from './util';

const $ = (id: string) => document.getElementById(id)!;
const amount = (v: number) => Math.floor(v).toLocaleString('en-US');
/** Shrinks a name's text until it fits its box (down to `least` of its size), so a long one ("Sparring partner") is
 *  never cut off; past that, it takes two lines. Again once the web fonts are in, and when the window's resized. */
export function fit(el: HTMLElement, least = Number(el.dataset.least) || 0.7) {
  el.style.fontSize = ''; el.classList.remove('two');
  if (!el.isConnected || el.clientWidth <= 0) return;
  const base = parseFloat(getComputedStyle(el).fontSize) || 16;
  for (let k = 1; k >= least - 1e-9 && el.scrollWidth > el.clientWidth + 0.5; k -= 0.05) el.style.fontSize = `${(base * k).toFixed(1)}px`;
  if (el.scrollWidth > el.clientWidth + 0.5) { el.style.fontSize = ''; el.classList.add('two'); }
}
const fitted: HTMLElement[] = [];
const refit = () => fitted.forEach(fit);
document.fonts?.ready.then(refit);
window.addEventListener('resize', refit);

// ---------- the pads ----------
const pads = [
  { at: GONG_PAD, d: decal(GONG_PAD.r * 2, (c, w, h) => drawPad(c, w, h, '🔔')) },
  { at: WATCH, d: decal(WATCH.r * 2, (c, w, h) => drawPad(c, w, h, '👁️')) },
];
for (const p of pads) { p.d.mesh.position.set(p.at.x, CY + 0.012, p.at.z); cellar.add(p.d.mesh); }
const on = (p: { x: number; z: number; r: number }) => level.down && d2xz(player.g.position, p) < p.r * p.r;

// ---------- the player, as the forecast sees them ----------
/** What's most of what the player's carrying: bowls first, then ready ingredients, then raw ones. */
function carried(): Carry | null {
  const all = player.back.all(), of = (k: string) => all.filter(m => kindOf(m) === k);
  const bowls = of('bowl');
  if (bowls.length) return { k: 'bowl', bowls: bowls.map(b => !!b.userData.mush) };
  const ready: [Ing, number][] = [['rice', of('rrice').length], ['fish', of('cfish').length], ['mush', of('mush').length]];
  const [k, n] = ready.sort((a, b) => b[1] - a[1])[0];
  return n ? { k, ready: true, n } : null;
}
/** How much the player's arms can take: what's in them that isn't their load (raw rice and fish, mostly) takes room. */
function room(c: Carry | null) {
  const n = player.back.all().length, load = !c ? 0 : c.k === 'bowl' ? c.bowls.length : c.n;
  return Math.max(1, player.back.cap - (n - load));
}
you.now = () => {
  if (!level.down) return null;
  const c = carried();
  return { x: player.g.position.x, z: player.g.position.z, speed: player.speed, cap: room(c), carry: c };
};

// ---------- your chances ----------
export type Verdict = 'win' | 'likelywin' | 'maybe' | 'likelylose' | 'lose';
export const VERDICT: Record<Verdict, string> = { win: 'Win', likelywin: 'Likely win', maybe: 'Maybe', likelylose: 'Likely lose', lose: 'Lose' };
/**
 * Ringing now, in a word: the fans the forecast turns against his strength (💪, the fans that beat him) (of `n`, with a fix's
 * fans kept home): 120% or more a win, from 100% likely. Short of that, it goes by what a bonus from the cooking game at
 * the pot (chanko.ts) could do, when `cooked` has the forecasts with one bought at the gong: maybe if +35% would win,
 * likely lost if only +50% would, lost if not even that. (Without them: from 85% maybe, from 60% likely lost.)
 */
export function verdict(boss: Boss, f: Forecast, n = boss.crowd, cooked?: { at35: Forecast; at50: Forecast }): Verdict {
  const need = toBeat(boss, n), r = f.turned / need;
  if (r >= 1) return r >= 1.2 || f.turned >= n ? 'win' : 'likelywin';
  if (cooked) return cooked.at35.turned >= need ? 'maybe' : cooked.at50.turned >= need ? 'likelylose' : 'lose';
  return r >= 0.85 ? 'maybe' : r >= 0.6 ? 'likelylose' : 'lose';
}
/** The forecasts with a cooking bonus bought at the gong, `kept` fans home: only while one could still be bought (not
 *  while one's running, which the plain forecast already counts). */
function cookedAt(kept = 0) {
  if (!canShow()) return undefined;
  const at35 = forecast(kept, { bonus: 35 }), at50 = forecast(kept, { bonus: 50 });
  return at35 && at50 ? { at35, at50 } : undefined;
}

// ---------- the gong's panel ----------
const panel = $('gong'), vsEl = panel.querySelector<HTMLElement>('.vs')!, bossEl = $('gongBoss'), chipsEl = $('gongCrowd');
const castEl = $('gongCast'), go = $('gongGo') as HTMLButtonElement, youP = $('gongYouP'), themP = $('gongThemP');
fitted.push(bossEl);
/** Eddie's face, small, as on his coin: grinning (the fix holds) or grimacing (caught). */
const mini = (face: 'Grin' | 'Grimace') => `<svg class="mini" viewBox="-60 -60 120 120" aria-hidden="true"><use href="#coinRim"/><use href="#coinEddie"/><use href="#coin${face}"/></svg>`;
/** A line of the panel: Eddie's face for one way his coin could land, what it says, and a verdict's seal. */
interface Row { face?: 'Grin' | 'Grimace'; say: string; v?: Verdict }
/** What the panel says, so it's only rewritten when something in it changes. */
let said = '';
function render() {
  const b = nextBoss(), R = F.rush, on = R && !R.done ? bossOf(R.boss) : b;
  // (the sparring partner's practice fight says so, first)
  const practice = R && !R.done ? R.boss < 0 : practiceDue();
  let chips: string[] = [], rows: Row[] = [], button: string | null = 'Ring the gong';
  if (R && !R.done) {
    chips = [`👥 ${R.n}`, `💪 ${toBeat(on!, R.n)}`, `🔔 ${on!.bell} s`, `🐡 ${amount(on!.prize)}`];
    if (practice) chips.unshift('🤼 Practice');
    rows = [{ say: 'Keep the bowls coming!' }];
    button = null;
  } else if (b && F.called) {
    // (rung while a local fight was on: he walks in once it's over)
    chips = [`👥 ${b.crowd}`, `💪 ${toBeat(b)}`, `🔔 ${b.bell} s`, `🐡 ${amount(b.prize)}`];
    rows = [{ say: 'He walks in after this fight' }];
    button = null;
  } else if (!b) {
    rows = [{ say: 'All five beaten' }, { say: `Buy Mr. Fugu out: 🐡 ${amount(BUYOUT)}` }];
    button = null;
  } else {
    chips = [`👥 ${b.crowd}`, `💪 ${toBeat(b)}`, `🔔 ${b.bell} s`, `🐡 ${amount(b.prize)}`];
    if (practice) chips.unshift('🤼 Practice');
    // (no forecast while the last boss's crowd is still on the floor: the gong can't be rung until it clears)
    const f = R ? null : forecast(), fix = fixOn();
    if (f && fix) {
      // one for each way his coin could land: the fix holding, his boys keeping some home; or caught, all of them
      const kept = keptHome(b, fix.cut);
      rows = [{ face: 'Grin', say: 'Fix holds', v: verdict(b, forecast(kept)!, b.crowd - kept, cookedAt(kept)) }, { face: 'Grimace', say: 'Caught', v: verdict(b, f, b.crowd, cookedAt()) }];
    } else if (f) rows = [{ say: 'Your chances', v: verdict(b, f, b.crowd, cookedAt()) }];
    if (R) button = 'Wait for the ring to clear';
  }
  const key = JSON.stringify([on?.name, chips, rows, button]);
  if (key === said) return;
  said = key;
  vsEl.hidden = !on;
  if (on) { bossEl.textContent = on.name; fit(bossEl); showFace(youP, 'champ', '🍙'); showFace(themP, on.kind ?? 'local', on.face); }
  chipsEl.replaceChildren(...chips.map(c => { const e = document.createElement('span'); e.className = 'fchip'; e.textContent = c; return e; }));
  castEl.replaceChildren(...rows.map(r => {
    const e = document.createElement('div');
    e.className = r.face ? 'odds fix' : 'odds';
    if (r.face) e.insertAdjacentHTML('beforeend', mini(r.face));
    const say = document.createElement('span'); say.className = 'lbl'; say.textContent = r.say; e.append(say);
    if (r.v) { const v = document.createElement('span'); v.className = `seal v-${r.v}`; v.textContent = VERDICT[r.v]; e.append(v); }
    return e;
  }));
  go.hidden = button === null;
  if (button) { go.textContent = button; go.disabled = !!R; }
}
/** Rings the gong, if a boss can be called in now: Eddie's coin first, if he's in on it, and the banner as the boss
 *  walks in (walkIn: at once, or once the local fight that's on is over). */
export function ring() {
  if (!canRing()) return false;
  const boss = nextBoss()!, e = fixOn();
  // (the coin's up before he's called in, so his banner waits for it)
  if (e) toss(boss, e.caught, e.caught ? boss.crowd : boss.crowd - keptHome(boss, e.cut));
  ringGong();
  struck();
  said = '';
  return true;
}
/** A boss walks in (fight.ts's on.rush, by way of ring.ts): his banner, unless Eddie's coin is still up (then it
 *  comes after the tap). */
export function walkIn(R: Rush) {
  if (!coinUp()) banner(R);
}
go.addEventListener('click', () => { if (!go.disabled) ring(); });

// ---------- the banner: a boss walks in ----------
const bannerEl = $('fightBanner'), bannerWho = $('bannerWho'), bannerGoal = $('bannerGoal');
let bannerT = 0;
/** 入場: his name, the crowd he's brought, and how many of them to turn, across the screen for a few seconds. */
function banner(R: Rush) {
  const boss = bossOf(R.boss);
  bannerWho.textContent = `${boss.name} ${boss.face} · ${R.n} fans`;
  bannerGoal.textContent = `💪 ${toBeat(boss, R.n)} TO WIN`;
  bannerEl.classList.remove('on');
  bannerEl.hidden = false;
  void bannerEl.offsetWidth; // (so the animation starts over)
  bannerEl.classList.add('on');
  bannerT = 2.8;
}

// ---------- Slick Eddie's coin ----------
// Tossed at the gong with his fix on. It was rolled when he was paid (and kept, so a reload can't toss it again), and
// comes out here: it spins up, comes down spinning on its edge (his two faces flicking past slower and slower), drops
// flat, and a second later says what it means. The whole world waits on it (game.ts), the boss's crowd at the door
// and his bell, until it's tapped away. (With less motion: it's down already, and still waits.) The timings are the
// stylesheet's (index.html, #coin).
const coinEl = $('coin'), coinHead = $('coinHead'), coinSub = $('coinSub');
/** Seconds since the toss (-1: no coin up); when it comes down on its edge, drops flat, and says what it means. */
let coinT = -1;
const EDGE = 1.4, DROP = 3.71, SAYS = 4.95, READY = 5.3;
/** Whether Eddie's coin is up: the world waits for it. */
export const coinUp = () => coinT >= 0;
function toss(boss: Boss, caught: boolean, n: number) {
  coinEl.className = caught ? 'caught' : 'hold';
  coinHead.textContent = caught ? '🗞️ CAUGHT!' : 'THE FIX HOLDS';
  coinSub.textContent = caught ? `He brings all ${n}` : `${boss.name} brings ${n}, not ${boss.crowd}`;
  coinEl.hidden = false;
  panel.hidden = true;
  player.held = true; player.moving = false;
  coinT = 0;
  if (lessMotion.matches) { coinT = SAYS; sting(caught); }
  else coinPing();
}
const sting = (caught: boolean) => { if (caught) lose(); else { win(); chime(); } };
function endCoin() {
  coinEl.hidden = true; coinEl.classList.remove('ready');
  coinT = -1;
  player.held = false;
  said = '';
  // (or, with a local fight being seen out, when he walks in after it)
  if (F.rush) banner(F.rush);
}
coinEl.addEventListener('click', () => { if (coinT >= READY) endCoin(); });
/** The coin, while the world waits on it (game.ts): its sounds as it goes, and a tap (or E) once it's said its piece.
 *  (And the gong's stroke, still ringing.) */
export function updCoin(dt: number) {
  if (coinT < 0) return;
  const was = coinT;
  coinT += dt;
  const passed = (t: number) => was < t && coinT >= t;
  if (passed(EDGE)) coinEdge();
  if (passed(DROP)) coinDrop();
  if (passed(SAYS)) sting(coinEl.classList.contains('caught'));
  if (coinT >= READY) coinEl.classList.add('ready');
  const press = buyHeld() && !held;
  held = buyHeld();
  if (press && coinT >= READY) endCoin();
  updStroke(dt);
}

// ---------- the strip, and the card after a boss ----------
const rushEl = $('rush'), rushBell = $('rushBell'), rushBar = $('rushBar'), rushGoal = $('rushGoal'), rushKnot = $('rushKnot');
const rushYou = $('rushYou'), rushThem = $('rushThem'), rushYouP = $('rushYouP'), rushThemP = $('rushThemP');
fitted.push(rushYou, rushThem);
// (the strip's small already: two lines sooner)
rushYou.dataset.least = rushThem.dataset.least = '0.85';
const card = $('fightCard');
/** Seconds the card stays up; seconds till it shows (it's up, but waits unseen, `wait`, for the loser to land:
 *  finishers.ts's landsOf), and what plays as it does. */
let cardT = 0, cardIn = 0, cardSting: (() => void) | null = null;
/** Whether a boss's card is up after his fight (or waiting to show). */
export const cardUp = () => !card.hidden;
card.addEventListener('click', () => { card.hidden = true; cardIn = 0; cardSting = null; });
/** What cost a lost fight, in one chip: the pot waiting on an ingredient, the soup bar standing empty, or neither (the
 *  kitchen just too slow for him). */
export function lossReason(R: Rush) {
  const worst = worstShort(R);
  if (R.dryT > 1 && worst) return `${ICON[worst]} Pot waited on ${NAME[worst]}`;
  if (R.dryT > 1) return `🍲 Soup bar empty ${Math.round(R.dryT)} s`;
  return '🍲 Kitchen too slow for his crowd';
}
/** The card after a boss's rush: a stamp on a burst, and YOU WIN with the prize and what's new, or how short and why.
 *  It comes up once the loser's landed off the mound (with `sting` played then), not as the fight ends. */
export function showCard(R: Rush, sting?: () => void) {
  const boss = bossOf(R.boss), el = (tag: string, cls: string, text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; };
  const kids = [el('div', 'burst'), el('div', 'hanko', R.win ? '勝' : '負')];
  // practice: what it takes to beat the first boss (his prize hires it)
  const next = BOSSES[0];
  if (R.win && R.boss < 0) kids.push(el('h2', '', 'PRACTICE WON'), el('div', 'prize', `🐡 ${amount(boss.prize)}`), el('div', 'unlock', `Next: ${next.name} ${next.face} · hire a washer and salter`));
  else if (R.win) kids.push(el('h2', '', 'YOU WIN'), el('div', 'prize', `🐡 ${amount(boss.prize)}`), el('div', 'unlock', `🔓 New: ${boss.opens}`));
  else kids.push(el('h2', '', `SHORT BY ${toBeat(boss, R.n) - R.turned}`), el('span', 'fchip reason', lossReason(R)));
  // (a slam landed: its bonus)
  if (R.win && R.slam > 0) kids.splice(kids.findIndex(k => k.className === 'prize') + 1, 0, el('span', 'fchip slam', `💥 Slam +🐡 ${amount(boss.prize * SLAM.bonus[R.slam] + 0.5)}`));
  kids.push(el('div', 'tap', 'Tap to close'));
  card.className = `${R.win ? 'win' : 'lose'} wait`;
  card.replaceChildren(...kids);
  card.hidden = false;
  cardIn = landsOf(R, F.bout.finish) + 0.35; cardSting = sting ?? null;
}
/** What the strip said last, so it's only rewritten when something in it changes. */
let barSaid = '';
/** The strip along the top, every boss's fight (and a local's, from the watch spot): the champion's face and his fans
 *  on the left, the other's on the right; the bell (or the fight, or how it went) between; and the rope, orange for his
 *  fans, purple for theirs: his goal marked on it while his crowd's turning, and in the fight the knot, pulled one way
 *  or the other. */
function renderBout() {
  // (a local's from the watch spot only once the doors are open: before, there's no fight to show)
  const R = F.rush, show = level.down && stage.n === 3 && !coinUp() && (!!R || (watch > 0.5 && !F.quiet));
  if (show === rushEl.hidden) { rushEl.hidden = !show; rushEl.classList.toggle('in', show); }
  if (!show) { barSaid = ''; return; }
  const B = F.bout, boss = R ? bossOf(R.boss) : null, name = boss ? boss.name : 'Local', move = moveOf(R, B.finish), lands = landsOf(R, B.finish);
  const { yours, theirs } = sides();
  let left = `${CHAMP} ${yours}`, right = `${theirs} ${name}`, mid: string, fill = yours + theirs ? yours / (yours + theirs) : 0.5, goal = -1;
  if (R && B.phase === 'prep') {
    // (his bell waits for his whole crowd to reach the bar)
    left = `${CHAMP} ${R.turned}`; right = `${R.n - R.turned} ${name}`;
    mid = `🔔 ${Math.max(0, Math.ceil(boss!.bell - R.t))}`;
    fill = R.turned / R.n; goal = toBeat(boss!, R.n) / R.n;
  } else if (B.phase === 'pay' && move && B.t >= 0.5 && B.t < lands + 1.2) mid = move.name;
  else if (B.phase === 'fight' || (B.phase === 'pay' && B.t < lands)) mid = 'FIGHT!';
  // (who won, once the loser's down)
  else if (B.phase === 'pay') mid = B.win ? 'WIN!' : 'LOSE';
  else mid = 'VS';
  // (the knot waits on the middle until the fight pulls it one way or the other)
  const knot = B.phase === 'fight' || B.phase === 'pay' ? 50 - B.tug * 46 : -1;
  const key = [name, left, mid, right, Math.round(fill * 200), Math.round(goal * 200), Math.round(knot * 2)].join('|');
  if (key === barSaid) return;
  barSaid = key;
  showFace(rushYouP, 'champ', '🍙');
  if (boss) showFace(rushThemP, boss.kind ?? 'local', boss.face); else showFace(rushThemP, 'local', '🙂');
  rushYou.textContent = left; rushBell.textContent = mid; rushThem.textContent = right;
  fit(rushYou); fit(rushThem);
  rushBar.style.width = Math.round(fill * 1000) / 10 + '%';
  rushGoal.hidden = goal < 0; rushGoal.style.left = Math.round(goal * 1000) / 10 + '%';
  rushKnot.hidden = knot < 0; rushKnot.style.left = Math.round(knot * 10) / 10 + '%';
}

// ---------- the slam ----------
// A grand win (fight.ts's SLAM): in the fight, a white ring closes on the champion's face on the strip to meet a gold
// one at the belly bump, and Space (or a click of the button) as they meet lands the slam: perfect or good, for more of
// his prize. On a phone a tap anywhere lands it, counted as the finger touches. One try. What it came to stays on the
// button for a moment.
const slamRing = $('slamRing'), slamClose = slamRing.querySelector('b')!, slamGo = $('slamGo') as HTMLButtonElement;
/** Whether this is a touch screen (or a finger's been seen on it): the button says tap, not Space. */
let touch = isTouch();
const slamAsk = () => touch ? 'SLAM! Tap on gold' : 'SLAM! <kbd>Space</kbd> on gold';
slamGo.innerHTML = slamAsk();
/** Seconds the button keeps saying how the slam went. */
let slamSaid = 0, spaceHeld = false;
const SLAM_SAYS = ['Missed', 'Good slam!', 'Perfect slam!'];
function goSlam() {
  const q = slam();
  if (q < 0) return;
  slamGo.textContent = SLAM_SAYS[q];
  slamGo.classList.add('said');
  slamSaid = 1.2;
  if (q > 0) chime();
}
slamGo.addEventListener('click', goSlam);
// (a finger, or a pen, anywhere on the screen; the button's own click after it finds the slam already tried)
window.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  if (!touch) {
    touch = true;
    if (!slamGo.classList.contains('said')) slamGo.innerHTML = slamAsk();
  }
  if (!rushEl.hidden && slamDue()) goSlam();
}, { capture: true });
function updSlam(dt: number) {
  const space = keyHeld(' '), press = space && !spaceHeld;
  spaceHeld = space;
  const on = !rushEl.hidden && slamDue();
  if (on && press) goSlam();
  if (slamSaid > 0) slamSaid -= dt;
  const show = !rushEl.hidden && (slamDue() || slamSaid > 0);
  slamRing.hidden = !slamDue() || rushEl.hidden;
  if (!slamRing.hidden) slamClose.style.transform = `scale(${(1 + 1.4 * Math.max(0, SLAM.at - F.bout.t) / SLAM.lead).toFixed(3)})`;
  if (show === slamGo.hidden) slamGo.hidden = !show;
  if (!show && slamGo.classList.contains('said')) {
    slamGo.classList.remove('said');
    slamGo.innerHTML = slamAsk();
  }
}
/** Whether a rush is a grand win with the slam still to try (for tests). */
export const slamOffered = () => !!F.rush && grand(F.rush) && F.rush.slam < 0;

// ---------- 💪 ----------
const power = $('power'), powerN = $('powerN'), seasonChip = $('season');
let shownPower = -1, shownOn: boolean | null = null;
function renderPower() {
  const show = stage.n === 3 && level.down;
  if (show !== shownOn) { shownOn = show; power.hidden = !show; seasonChip.hidden = show; }
  const n = strength();
  if (show && n !== shownPower) { shownPower = n; powerN.textContent = String(n); }
}

// ---------- the watch button ----------
// A boss's fight (or the practice one), from his fans sitting down till its result: a button under the strip, or V,
// does what standing on the watch spot does, wherever the player is. Pressed again, or once the fight's over, the
// camera comes back to them. A local's fight is still watched from the spot.
const watchGo = $('watchGo') as HTMLButtonElement;
/** The button's on (for this fight only), and whether V was down last frame. */
let watchOn = false, vHeld = false;
/** Whether the watch button's offered: a fight the gong called, its fans sat down. */
export const watchOffered = () => level.down && stage.n === 3 && !!F.rush && F.bout.phase !== 'prep' && !coinUp();
watchGo.addEventListener('click', () => { if (watchOffered()) watchOn = !watchOn; });
function updWatchGo() {
  const v = keyHeld('v'), press = v && !vHeld;
  vHeld = v;
  const offered = watchOffered();
  if (!offered) watchOn = false;
  else if (press) watchOn = !watchOn;
  if (offered === watchGo.hidden) watchGo.hidden = !offered;
  // (standing on the spot watches too, and says so)
  const shown = watchOn || on(WATCH);
  if (watchGo.getAttribute('aria-pressed') !== String(shown)) {
    watchGo.setAttribute('aria-pressed', String(shown));
    watchGo.textContent = shown ? '👁️ Watching' : '👁️ Watch';
  }
}

// ---------- the watch spot ----------
/** How far the camera's closed in on the ring, 0 to 1. */
let watch = 0;
const flashEl = document.getElementById('ringFlash')!;
const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false };
function updWatch(dt: number) {
  // (an epic, dohyo.ts, may take the camera even off the watch spot; and the watch button, wherever the player is)
  const want = on(WATCH) || ringCam.take || watchOn ? 1 : 0;
  view.shake = 0;
  if (want === 0 && watch === 0) { flashEl.style.opacity = '0'; epicFx.watch = 0; return; }
  watch += (want - watch) * Math.min(1, dt * 2.5);
  if (Math.abs(want - watch) < 0.002) watch = want;
  epicFx.watch = watch;
  // The ring's big hits (dohyo.ts): the camera punches in on the pair, shakes, and the screen flashes white. (0.4 up:
  // the camera aims at the middle of what it's on, main.ts, so this is where it aimed over the player's feet.)
  const punch = Math.min(1, ringCam.punch) * watch;
  // (and an epic looks up after a man thrown high, and pulls back to keep it all in)
  view.focus.set(RING.x + (ringCam.at.x - RING.x) * 0.6 * punch, CY + 0.4 + ringCam.y * watch, RING.z + (ringCam.at.z - RING.z) * 0.6 * punch);
  view.k = 0.85 * watch;
  view.zoom = CELLAR_ZOOM * (1 - 0.45 * watch) * (1 - 0.25 * punch) * (1 + 0.8 * ringCam.wide * watch);
  view.shake = ringCam.shake * watch;
  flashEl.style.opacity = lessMotion.matches ? '0' : String(Math.min(1, ringCam.flash) * 0.8 * watch);
}
/** Whether the camera's on the ring (for tests). */
export const watching = () => watch > 0.5;

// ---------- the stroke ----------
// Struck, the gong has weight: the disc swings back slow and heavy on its ropes and shivers, its bronze flares, two
// rings of shock spread off its face and one across the floor, dust jumps at the frame's feet, the camera jolts, and
// the player, at the pad, is knocked back a step, leaning away with their arm flung up, then finds their feet.
// (The sound, and the second of silence everything else falls into: sfx.ts.)
/** Seconds since the gong was struck (Infinity: not since the cellar was opened). */
let since = Infinity;
/** The player's stroke: which way they're knocked (away from the gong) and how far they've gone so far. */
let recoil: { x: number; z: number; gone: number } | null = null;
/** How far the player's knocked back, and how long the stroke's pose takes to wear off. */
const KNOCK = 0.3, POSE = 0.9;
/** The disc's middle (cellar.ts hangs it 0.95 under its ropes, 2.38 up). */
const DISC_Y = 1.43;
/** The shock waves: [ring, seconds after the stroke it starts, seconds it lasts, how far it spreads]. */
const waveMat = (color: number, add: boolean) => new MeshBasicMaterial({
  color, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, blending: add ? AdditiveBlending : NormalBlending,
});
const waves: [Mesh, number, number, number][] = [
  [new Mesh(new RingGeometry(0.92, 1, 48), waveMat(0xFFE2A0, true)), 0, 0.45, 1.2],
  [new Mesh(new RingGeometry(0.94, 1, 48), waveMat(0xFFE2A0, true)), 0.13, 0.5, 1.6],
  [new Mesh(new RingGeometry(0.85, 1, 48), waveMat(0xC9B48C, false)), 0.03, 0.6, 2.3],
];
waves.forEach(([m], i) => {
  m.visible = false;
  if (i < 2) m.position.set(GONG.x, CY + DISC_Y, GONG.z + 0.06);
  else { m.position.set(GONG.x, CY + 0.03, GONG.z); m.rotation.x = -Math.PI / 2; }
  cellar.add(m);
});
const feet = new Vector3();
function struck() {
  since = 0;
  feet.set(GONG.x, CY + 0.05, GONG.z);
  for (const s of [-1, 1]) dustFx(feet.setX(GONG.x + s * 0.85), 5, 0.8);
  if (!on(GONG_PAD)) return;
  const p = player.g.position, d = Math.hypot(p.x - GONG.x, p.z - GONG.z) || 1;
  recoil = { x: (p.x - GONG.x) / d, z: (p.z - GONG.z) / d, gone: 0 };
  player.h = Math.atan2(-recoil.x, -recoil.z);
}
const ease = (k: number) => 1 - (1 - k) ** 3;
function updStroke(dt: number) {
  if (since === Infinity) return;
  since += dt;
  const t = since;
  // the disc: thrown back away from the striker, and swinging slow (a heavy pendulum) and shivering as it rings
  gongDisc.rotation.x = 0.2 * Math.exp(-t * 0.9) * Math.sin(t * 4.6) + 0.012 * Math.exp(-t * 3) * Math.sin(t * 70);
  if (gongBronze) gongBronze.emissiveIntensity = 1 + 2.4 * Math.exp(-t * 3.5);
  for (const [m, at, life, far] of waves) {
    const k = (t - at) / life;
    m.visible = k > 0 && k < 1;
    if (!m.visible) continue;
    m.scale.setScalar(0.7 + far * ease(k));
    (m.material as MeshBasicMaterial).opacity = (1 - k) ** 1.5 * (m === waves[2][0] ? 0.4 : 0.75);
  }
  if (t > 6) { since = Infinity; gongDisc.rotation.x = 0; if (gongBronze) gongBronze.emissiveIntensity = 1; }
  // the player: knocked back (easing out), leaning away and squashed by the blow, their striking arm flung up
  if (!recoil) return;
  const p = player.g.position, to = KNOCK * ease(Math.min(1, t / 0.3)), step = to - recoil.gone;
  p.x += recoil.x * step; p.z += recoil.z * step; recoil.gone = to;
  const b = player.g.body, w = Math.max(0, 1 - t / POSE) ** 2;
  b.rotation.x = -0.3 * Math.exp(-t * 5) * Math.cos(t * 9) * (t < 0.08 ? t / 0.08 : 1);
  b.scale.y *= 1 - 0.07 * Math.exp(-t * 9);
  const arm = player.g.arms[0];
  arm.rotation.x += (-2.3 - arm.rotation.x) * w;
  arm.rotation.z += (-0.5 - arm.rotation.z) * w;
  if (t >= POSE) recoil = null;
}

// ---------- every frame ----------
let held = false;
export function updGong(dt: number) {
  const atGong = on(GONG_PAD) && stage.n === 3;
  if (atGong !== !panel.hidden) { panel.hidden = !atGong; said = ''; }
  if (atGong) render();
  // E rings it, once a press
  const press = buyHeld() && !held;
  held = buyHeld();
  if (atGong && press) ring();
  updStroke(dt);
  renderBout();
  updSlam(dt);
  renderPower();
  updWatchGo();
  updWatch(dt);
  // the stroke's jolt (on top of the ring's, if the camera's on it)
  if (since < 0.6) view.shake = Math.max(view.shake, 0.45 * (1 - since / 0.6) ** 2);
  if (cardIn > 0 && (cardIn -= dt) <= 0) { cardIn = 0; card.classList.remove('wait'); cardT = 10; cardSting?.(); cardSting = null; }
  else if (cardT > 0) { cardT -= dt; if (cardT <= 0) card.hidden = true; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) { bannerEl.hidden = true; bannerEl.classList.remove('on'); } }
}
