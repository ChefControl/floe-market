// The scoreboard: the 🏆 button in the corner opens the players who have held the most cash at once, with the
// furthest stage each has reached. Signed-in players get on it as their game syncs (cloud.ts); everyone else sees
// their own best under the list and a way to sign in. It only shows when cloud saves are set up.
import { cloud, cloudEnabled, connect, postScore, type Score } from './cloud';
import { stage } from './layout';
import { money } from './util';
import { wallet } from './wallet';

/** How many players the scoreboard lists. */
export const TOP = 20;

const $ = (id: string) => document.getElementById(id)!;
const btn = $('board'), panel = $('scores'), list = $('scoresList'), me = $('scoresMe'), join = $('scoresJoin');

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
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  $('scoresClose').focus();
  void fill();
}

export function closeScores() {
  if (panel.hidden) return;
  panel.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  btn.focus();
}

/** Shows the scoreboard button, when cloud saves are set up. */
export function initScores() {
  if (!cloudEnabled()) return;
  btn.hidden = false;
  btn.addEventListener('click', () => { if (panel.hidden) openScores(); else closeScores(); });
  $('scoresClose').addEventListener('click', closeScores);
  // a tap on the dimmed game around the card closes it too
  panel.addEventListener('click', e => { if (e.target === panel) closeScores(); });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeScores(); } });
  join.addEventListener('click', () => { closeScores(); $('cloud').click(); });
}
