// DOM overlay: cash/carry/rating HUD, the stage chip, toasts, tile tips, floating "+$" text, and the stage-up's
// banner and confetti.
import { player } from './player';
import { rating } from './rating';
import { camera, slideView } from './render';
import { pick, rand, V } from './util';
import { wallet } from './wallet';

const $ = (id: string) => document.getElementById(id)!;

const cashN = $('cashN'), cashEl = $('cash');
const carryN = $('carryN'), carryEl = $('carry');
const starsN = $('starsN');
let shownMoney = -1, shownCarry = '', shownStars = '';

export function hud(dt: number) {
  if (shownMoney !== wallet.money) {
    shownMoney = wallet.money;
    cashN.textContent = wallet.money.toLocaleString('en-US');
  }
  const cs = player.back.n + '/' + player.back.cap;
  if (cs !== shownCarry) {
    shownCarry = cs;
    carryN.textContent = cs;
    carryEl.classList.toggle('full', player.back.n >= player.back.cap);
  }
  const st = rating().toFixed(1);
  if (st !== shownStars) {
    shownStars = st;
    starsN.textContent = st;
  }
  if (wallet.bumpT > 0) { wallet.bumpT -= dt; cashEl.classList.add('bump'); }
  else cashEl.classList.remove('bump');
  if (bits.length) drawConfetti(dt);
}

// ---------- stage ----------
const stageEl = $('stage'), stageNum = $('stageNum'), stageName = $('stageName'), stageBar = $('stageBar'), stageCount = $('stageCount');
/** The stage chip: which stage, and how many of its upgrades are built. */
export function showStage(n: 1 | 2, done: number, total: number) {
  stageEl.classList.toggle('s2', n === 2);
  stageNum.textContent = String(n);
  stageName.textContent = n === 1 ? 'Fish Market' : 'Floe Sushi';
  stageBar.style.width = Math.round(done / total * 100) + '%';
  stageCount.textContent = done < total ? `${done}/${total}` : n === 1 ? 'Floe Sushi ready' : 'Complete';
  stageEl.classList.toggle('ready', done >= total);
}

// The stage chip opens and closes the modifiers under it. They start closed on phone-sized screens (index.html's
// media query), where they'd cover the game, and follow the screen size until the player taps the chip.
const modsEl = $('mods'), phone = window.matchMedia?.('(max-width: 720px), (max-height: 500px)');
let modsPicked = false;
function showMods(open: boolean) {
  modsEl.hidden = !open;
  stageEl.setAttribute('aria-expanded', String(open));
}
showMods(!phone?.matches);
// (Safari before 14 has no addEventListener on a media query)
phone?.addEventListener?.('change', () => { if (!modsPicked) showMods(!phone.matches); });
stageEl.addEventListener('click', () => { modsPicked = true; showMods(modsEl.hidden !== false); });

// ---------- keeping the player in sight ----------
const panels = [$('shop'), $('casino')];
const slid = { x: 0, y: 0 };
/** Slides the view so an open panel doesn't cover the player: sideways for a panel down the right-hand side (a phone
 *  held sideways), up for one along the bottom of a short screen. Eases there and back. */
export function keepInSight(dt: number) {
  const w = window.innerWidth, h = window.innerHeight, open = panels.find(p => !p.hidden);
  let x = 0, y = 0;
  if (open) {
    const r = open.getBoundingClientRect();
    if (r.left > w * 0.25) x = Math.max(0, w / 2 + 50 - r.left);
    else y = Math.max(0, h / 2 + 70 - r.top);
  }
  const k = Math.min(1, dt * 8);
  slid.x += (x - slid.x) * k;
  slid.y += (y - slid.y) * k;
  slideView(slid.x, slid.y);
}

const bannerEl = $('banner');
/** The big centred banner for the stage-up; `null` hides it. */
export function banner(kicker: string | null, title = '') {
  if (kicker === null) { bannerEl.classList.remove('on'); return; }
  bannerEl.querySelector('.k')!.textContent = kicker;
  bannerEl.querySelector('.t')!.textContent = title;
  bannerEl.classList.add('on');
}

const confettiEl = $('confetti') as HTMLCanvasElement, cctx = confettiEl.getContext('2d')!;
const COLORS = ['#FFC34A', '#FF6B4A', '#49C25B', '#5B8DEF', '#FFFFFF', '#E0392B'];
interface Bit { x: number; y: number; vx: number; vy: number; r: number; c: string; a: number; va: number }
let bits: Bit[] = [];
/** A burst of confetti from the middle of the screen (none for players who'd rather not have motion). */
export function confetti() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const k = Math.min(window.devicePixelRatio || 1, 2);
  confettiEl.hidden = false;
  const w = confettiEl.width = window.innerWidth * k, h = confettiEl.height = window.innerHeight * k;
  for (let i = 0; i < 160; i++) {
    bits.push({
      x: w / 2 + rand(-w * .2, w * .2), y: h * .45, vx: rand(-1, 1) * w * .5, vy: rand(-1.2, -.4) * h,
      r: rand(4, 9) * k, c: pick(COLORS), a: rand(0, 6), va: rand(-8, 8),
    });
  }
}
function drawConfetti(dt: number) {
  const w = confettiEl.width, h = confettiEl.height;
  cctx.clearRect(0, 0, w, h);
  for (const p of bits) {
    p.vy += h * 1.1 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.99; p.a += p.va * dt;
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.a);
    cctx.fillStyle = p.c; cctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    cctx.restore();
  }
  bits = bits.filter(p => p.y < h + 40);
  // Once it's all fallen, the canvas goes away: a full-screen layer over the game costs a phone even when empty.
  if (!bits.length) { confettiEl.width = confettiEl.height = 0; confettiEl.hidden = true; }
}

const toastEl = $('toast');
let toastT: ReturnType<typeof setTimeout> | undefined;
/** Messages waiting their turn (with how long each stays up, in ms), and the `key` of the one showing. */
const waiting: { m: string; key?: string; ms: number }[] = [];
let busy = false, showing: string | undefined;
function nextToast() {
  const n = waiting.shift();
  busy = !!n;
  if (!n) return;
  showing = n.key;
  toastEl.textContent = n.m;
  toastEl.classList.add('on');
  holdToast(n.ms);
}
function holdToast(ms = 1700) {
  clearTimeout(toastT);
  toastT = setTimeout(() => { toastEl.classList.remove('on'); toastT = setTimeout(nextToast, 250); }, ms);
}
/**
 * Shows a message for a moment. Messages take turns, so none is missed. One with the same `key` as the message
 * showing or waiting replaces it instead (buying the same kind of upgrade several times in a row). A longer one can
 * stay up for `ms`.
 */
export function toast(m: string, key?: string, ms = 1700) {
  if (key && key === showing && toastEl.classList.contains('on')) { toastEl.textContent = m; holdToast(); return; }
  const same = waiting.find(w => (key ? w.key === key : w.m === m));
  if (same) { same.m = m; return; }
  waiting.push({ m, key, ms });
  if (!busy) nextToast();
}

export interface TipContent { name: string; desc: string }
const tipEl = $('tip');
let tipFor: TipContent | null = null;
export function setTip(t: TipContent | null) {
  if (t === tipFor) return;
  tipFor = t;
  if (t) {
    tipEl.innerHTML = '<b></b><span></span>';
    tipEl.firstChild!.textContent = t.name;
    tipEl.lastChild!.textContent = t.desc;
    tipEl.classList.add('on');
  } else tipEl.classList.remove('on');
}

/** Floating text that rises from a world position. */
export function popText(txt: string, wp: { x: number; y?: number; z: number }, cls?: string) {
  const v = V(wp.x, (wp.y || 0) + 1.2, wp.z).project(camera);
  if (v.z > 1) return;
  const el = document.createElement('div');
  el.className = cls ? 'pop ' + cls : 'pop';
  el.textContent = txt;
  el.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px';
  el.style.top = ((1 - v.y) / 2 * window.innerHeight) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/** A customer's review rising over their head: stars, or an angry face for a 1★. */
export function popStars(stars: number, wp: { x: number; y?: number; z: number }) {
  popText(stars > 1 ? '★'.repeat(stars) : '😠', { x: wp.x, y: (wp.y || 0) + 0.6, z: wp.z }, 'review');
}
