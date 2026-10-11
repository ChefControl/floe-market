// The scoreboard: the 🏆 Scoreboard row in the settings opens the players who have held the most cash at once, with
// the furthest stage each has reached. Signed-in players get on it as their game syncs (cloud.ts); everyone else sees
// their own best under the list and a way to sign in. It only shows when cloud saves are set up.
// It used to be a 🏆 button in the corner, where the 🐞 report button is now. A player who played before (their save
// was here when the game loaded) sees the 🏆 pop up there and fly into the gear a few seconds into their game, once,
// with a toast saying where it went; the row says "Moved here" until they open it.
import { cloud, cloudEnabled, connect, postScore, type Score } from './cloud';
import { stage } from './layout';
import { SAVE_KEY } from './save';
import { openSettings } from './settings';
import { toast } from './ui';
import { money } from './util';
import { wallet } from './wallet';

/** How many players the scoreboard lists. */
export const TOP = 20;

const $ = (id: string) => document.getElementById(id)!;
const scoresRow = $('scoresCat'), chip = $('scoresMoved'), panel = $('scores'), list = $('scoresList'), me = $('scoresMe');
const join = $('scoresJoin');

/** Where this device is with the move: 'new' (not shown yet), 'shown' (flown, not opened since) or 'seen'. */
export const MOVED_KEY = 'floe-market-board-moved';
type Moved = 'new' | 'shown' | 'seen';
let moved: Moved = 'seen';
try {
  const was = localStorage.getItem(MOVED_KEY) as Moved | null;
  moved = was ?? (localStorage.getItem(SAVE_KEY) ? 'new' : 'seen');
  if (!was) localStorage.setItem(MOVED_KEY, moved);
} catch { /* storage unavailable: nobody to tell */ }
function setMoved(m: Moved) {
  moved = m;
  chip.hidden = m === 'seen';
  try { localStorage.setItem(MOVED_KEY, m); } catch { /* it may show again next time */ }
}

const STAGES = { 1: 'Fish Market', 2: 'Floe Sushi' } as const;

function row(s: Score, rank: number, mine: boolean) {
  const li = document.createElement('li');
  li.classList.toggle('me', mine);
  const cells = [
    ['rank', String(rank)], ['name', mine ? `${s.name} (you)` : s.name],
    ['stage', `Stage ${s.stage}`], ['best', money(s.best)],
  ] as const;
  for (const [cls, text] of cells) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    if (cls === 'stage') { span.dataset.stage = String(s.stage); span.title = STAGES[s.stage]; }
    li.append(span);
  }
  return li;
}

/** This device's game, for the line under the list. */
const here = () => `${money(Math.max(wallet.best, wallet.money))} · Stage ${stage.n}`;

/** Each opening fetches the list again; only the latest fetch gets to fill it in. */
let asked = 0;
async function fill() {
  const n = ++asked;
  list.replaceChildren();
  list.setAttribute('aria-busy', 'true');
  me.textContent = 'Loading…';
  join.hidden = true;
  try {
    const b = await connect();
    // so a signed-in player sees their latest best, not the last sync's
    if (cloud.user) await postScore().catch(() => {});
    const top = await b.topScores(TOP);
    if (n !== asked) return;
    const uid = cloud.user?.uid;
    list.replaceChildren(...top.map((s, i) => row(s, i + 1, s.uid === uid)));
    if (!top.length) me.textContent = 'Nobody on the scoreboard yet.';
    else if (!uid) me.textContent = `Your best: ${here()}`;
    else if (!top.some(s => s.uid === uid)) me.textContent = `You: ${here()}`;
    else me.textContent = '';
  } catch {
    if (n !== asked) return;
    me.textContent = "Can't load the scoreboard right now.";
  } finally {
    if (n === asked) list.removeAttribute('aria-busy');
  }
  if (n === asked) join.hidden = !!cloud.user;
}

export function openScores() {
  openSettings(false);
  if (moved !== 'seen') setMoved('seen');
  panel.hidden = false;
  $('scoresClose').focus();
  void fill();
}

export function closeScores() {
  if (panel.hidden) return;
  // a keyboard goes back to the gear the scoreboard was opened from
  const focused = panel.contains(document.activeElement);
  panel.hidden = true;
  if (focused) $('gear').focus();
}

/** Seconds into a returning player's game before the 🏆 flies into the gear. */
export const MOVED_AFTER = 3;
let waited = 0;
/** Call every frame: shows a returning player where the scoreboard went, once (not over a banner, menu or window). */
export function updScores(dt: number) {
  if (moved !== 'new' || scoresRow.hidden) return;
  waited += dt;
  const busy = !$('settings').hidden || !panel.hidden || !$('report').hidden || $('banner').classList.contains('on');
  if (waited < MOVED_AFTER || busy) return;
  setMoved('shown');
  flyToGear();
}

/** The 🏆 pops out under where its button was and flies into the gear, which pings; then a toast says where it went. */
function flyToGear() {
  const gear = $('gear');
  const landed = () => {
    gear.classList.add('ping');
    setTimeout(() => gear.classList.remove('ping'), 1300);
    toast('🏆 Scoreboard moved to ⚙️ Settings', undefined, 5000);
  };
  const fly = document.createElement('span');
  if (typeof fly.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { landed(); return; }
  const centre = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const a = centre($('reportBtn')), b = centre(gear), under = { x: a.x, y: a.y + 58 };
  const at = (p: { x: number; y: number }, scale: number, opacity: number, offset: number) =>
    ({ transform: `translate(${p.x - 13}px, ${p.y - 13}px) scale(${scale})`, opacity, offset });
  fly.id = 'boardFly';
  fly.textContent = '🏆';
  fly.setAttribute('aria-hidden', 'true');
  document.body.append(fly);
  fly.animate([at(a, 0.2, 0, 0), at(under, 1.7, 1, 0.2), at(under, 1.35, 1, 0.5), at(b, 0.35, 0.2, 1)],
    { duration: 1800, easing: 'ease-in-out' }).onfinish = () => { fly.remove(); landed(); };
}

/** Shows the scoreboard row, when cloud saves are set up. */
export function initScores() {
  if (!cloudEnabled()) return;
  scoresRow.hidden = false;
  chip.hidden = moved === 'seen';
  scoresRow.addEventListener('click', openScores);
  $('scoresClose').addEventListener('click', closeScores);
  // a tap on the dimmed game around the card closes it too
  panel.addEventListener('click', e => { if (e.target === panel) closeScores(); });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeScores(); } });
  join.addEventListener('click', () => { closeScores(); $('cloud').click(); });
}
