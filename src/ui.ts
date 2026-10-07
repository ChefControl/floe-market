// DOM overlay: cash/carry/rating HUD, toasts, tile tips and floating "+$" text.
import { player } from './player';
import { rating } from './rating';
import { camera } from './render';
import { V } from './util';
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
}

const toastEl = $('toast');
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(m: string) {
  toastEl.textContent = m;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), 1700);
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
