// The wall of shame: a board hung on the wall behind the casino boat's bar, at its window end, with the worst bet ever
// made at the boat's games on it, and a 💔 pad in front of the bar under it. On the pad, a card offers the whole wall:
// a dialog with the ten worst bets of all, everyone's, each with who made it, on what and when. A player's idea (report
// 12): tease whoever made the dumbest bet. A signed-in player's worst goes up as they make it (cloud.ts, shame/{uid});
// anyone else's stays on their device (worstBet.ts) and shows only to them, among the rest. Off the game's luck.
import { Group, Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';
import { atTable } from './casinoKit';
import { byTheStall } from './casinoRestroom';
import { cloud, connect, onCloud, postShame, publicName, topShame, type Shame } from './cloud';
import { decal, drawPad } from './decals';
import { drawIcon } from './icons';
import { inSalon, SALON, SHIP, UPPER } from './layout';
import { player } from './player';
import { canvasTex, FONT, G, mesh } from './render';
import { panel as kitPanel } from './uiKit';
import { d2xz, money } from './util';
import { betOn, onWorse, worstBet } from './worstBet';

/** How many bets the wall lists. */
export const TOP = 10;
/** The board, in the ship's own space: on the stern wall behind the bar (which keeps its mirror and shelves clear of
 *  it, casinoSalon.ts), how wide and tall, how high its middle is and how far its foot stands out from the wall, so it
 *  tips up to the room. Its card's size in pixels. */
export const SHAME_WALL = { z: 1.45, w: 1.3, h: 0.86, y: 1.62, tip: 0.3 };
const CARD = { w: 390, h: 258 };
/** The 💔 pad, in front of the bar under the board (the bar's stools stand between), and how close to its middle the
 *  card opens. */
const PAD = { x: SALON.x0 + 2.75, z: SHAME_WALL.z }, REACH = 0.6;
/** Seconds between fetches of the wall while the player's in the salon. */
const FETCH_EVERY = 60;
const GOLD = 0xE3B23C, WOOD = 0x4A2416;

/** A bet on the wall: someone's, or the player's own (`mine`). */
export type Entry = Omit<Shame, 'uid'> & { mine: boolean };

/** The wall as last fetched, and whether that worked (null: not yet, or the cloud's out of reach). */
let top: Shame[] | null = null;

/** The wall as the player sees it: the ten worst, theirs among them if it's bad enough (ahead of the cloud's copy). */
export function entries(): Entry[] {
  const uid = cloud.user?.uid, mine = worstBet();
  const list: Entry[] = (top ?? []).filter(s => s.uid !== uid || !mine || s.lost >= mine.lost)
    .map(({ uid: who, ...s }) => ({ ...s, mine: who === uid }));
  if (mine && !list.some(e => e.mine)) list.push({ ...mine, name: cloud.user ? publicName(cloud.user.name) : 'You', mine: true });
  return list.sort((a, b) => b.lost - a.lost).slice(0, TOP);
}

// ---------- the board ----------
/** Writes `text` centred at `y`, `size` px, shrunk to fit the card's width. */
function line(c: CanvasRenderingContext2D, text: string, y: number, size: number, colour: string, weight = 800) {
  c.font = `${weight} ${size}px ${FONT}`;
  const k = Math.min(1, (CARD.w - 40) / Math.max(1, c.measureText(text).width));
  c.save(); c.translate(CARD.w / 2, y); c.scale(k, k);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = colour; c.fillText(text, 0, 0);
  c.restore();
}
/** The board's card: the worst bet of all, whose it was and what on; or, with nothing lost yet, a warning. */
function drawBoard(c: CanvasRenderingContext2D, w: number, h: number) {
  const worst = entries()[0], INK = '#2A0F16', RED = '#8E1F2F';
  c.fillStyle = '#F4EFE6'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#E3B23C'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24);
  drawIcon(c, '💔', 62, 46, 40); drawIcon(c, '💔', w - 62, 46, 40);
  line(c, 'WALL OF SHAME', 47, 34, RED);
  line(c, worst ? money(worst.lost) : '$0', 118, 80, INK);
  line(c, worst ? worst.name : 'Nobody yet', 178, 36, INK, 700);
  line(c, worst ? betOn(worst) : 'Give it time.', 222, 32, RED);
}

/** The board, its card and what's on it now. */
let board: { card: ReturnType<typeof canvasTex>; says: string } | null = null;

/** Builds the board and the pad into the ship's group `g` (in the ship's own space). */
export function buildShame(g: Group) {
  const { z, w, h, y, tip } = SHAME_WALL;
  const card = canvasTex(CARD.w, CARD.h, drawBoard);
  // a dark wooden board in a gold frame, hung flat to the wall at the top and tipped out at the foot
  const hang = new Group();
  hang.position.set(SALON.x0 + 0.06, UPPER + y, z); hang.rotation.y = Math.PI / 2;
  const tilt = new Group();
  tilt.rotation.x = -tip;
  tilt.position.z = Math.sin(tip) * h / 2;
  const back = mesh(G.box, WOOD, 0, 0, 0, true); back.scale.set(w + 0.14, h + 0.14, 0.04);
  const frame = mesh(G.box, GOLD, 0, 0, 0.025); frame.scale.set(w + 0.05, h + 0.05, 0.02);
  const face = new Mesh(new PlaneGeometry(w, h), new MeshLambertMaterial({ map: card.tex }));
  face.position.z = 0.037;
  tilt.add(back, frame, face);
  hang.add(tilt);
  g.add(hang);
  const pad = decal(1.15, (c, cw, ch) => drawPad(c, cw, ch, '💔'));
  pad.mesh.position.set(PAD.x, UPPER + 0.01, PAD.z); g.add(pad.mesh);
  board = { card, says: '' };
}

/** Redraws the board if what's at the top of the wall has changed. */
function updBoard() {
  if (!board) return;
  const worst = entries()[0], says = worst ? `${worst.name}|${worst.lost}|${worst.game}|${worst.on ?? ''}` : '';
  if (says === board.says) return;
  board.says = says;
  drawBoard(board.card.ctx, CARD.w, CARD.h);
  board.card.tex.needsUpdate = true;
}

/** Fetches the wall, if the cloud's been started (the demo build never starts it); true if it could. Only the latest
 *  fetch gets to fill it in. */
let asked = 0;
async function fetchWall() {
  const n = ++asked;
  try {
    const got = await topShame(TOP);
    if (n === asked) top = got;
  } catch {
    if (n === asked) top = null;
  }
  updBoard();
  return top !== null;
}

// ---------- the card and the dialog ----------
const $ = (id: string) => document.getElementById(id)!;
const cardEl = $('shameCard'), cardMsg = $('shameCardMsg'), openBtn = $('shameOpen') as HTMLButtonElement;
const dialog = $('shame'), list = $('shameList'), me = $('shameMe'), join = $('shameJoin') as HTMLButtonElement;
const card = kitPanel(cardEl, { place: 'card', skin: 'casino' });
kitPanel(dialog, { place: 'dialog', skin: 'casino', close: closeWall });

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
function row(e: Entry, rank: number) {
  const li = document.createElement('li');
  li.classList.toggle('me', e.mine);
  const span = (cls: string, text: string) => {
    const s = document.createElement('span'); s.className = cls; s.textContent = text; return s;
  };
  li.append(
    span('rank', String(rank)), span('name', e.mine ? `${e.name} (you)` : e.name), span('lost', money(e.lost)),
    span('what', `${betOn(e)}${e.broke ? ' · all in' : ''} · ${day(e.at)}`),
  );
  return li;
}

/** Fills the dialog with the wall: the ten worst, and the player's own under them if it's not among them. */
let showing = 0;
async function fill() {
  const n = ++showing;
  list.replaceChildren();
  list.setAttribute('aria-busy', 'true');
  me.textContent = 'Loading…';
  join.hidden = true;
  // so a signed-in player's latest is up before the wall's read
  if (cloud.user) await postShame().catch(() => {});
  const ok = await fetchWall();
  if (n !== showing) return;
  const all = entries(), mine = worstBet();
  list.replaceChildren(...all.map((e, i) => row(e, i + 1)));
  list.removeAttribute('aria-busy');
  me.textContent = !ok ? "Can't reach the wall right now."
    : !all.length ? 'Nobody on the wall yet.'
    : mine && !all.some(e => e.mine) ? `Your worst: ${money(mine.lost)} ${betOn(mine)}`
    : !mine ? 'Nothing lost yet. Give it time.' : '';
  join.hidden = !!cloud.user || !ok;
}

export function openWall() {
  dialog.hidden = false;
  ($('shameClose') as HTMLButtonElement).focus();
  void fill();
}
function closeWall() {
  if (dialog.hidden) return;
  dialog.hidden = true;
  if (!cardEl.hidden) openBtn.focus();
}
openBtn.addEventListener('click', openWall);
$('shameClose').addEventListener('click', closeWall);
dialog.addEventListener('click', e => { if (e.target === dialog) closeWall(); });
join.addEventListener('click', () => { closeWall(); void connect().then(() => $('cloud').click()); });

/** Whether the player's on the 💔 pad. */
export function atTheWall() {
  const p = player.g.position;
  return !!board && inSalon(p) && d2xz(p, { x: SHIP.x + PAD.x, z: SHIP.z + PAD.z }) < REACH * REACH;
}

/** The card's message: the player's own worst, to start them off. */
function refresh() {
  const mine = worstBet();
  const say = mine ? `Your worst: ${money(mine.lost)}` : 'The worst bets ever made here';
  if (cardMsg.textContent !== say) cardMsg.textContent = say;
}

/** Runs the wall: its card on the pad, and fetching it now and then while the player's in the salon. */
let fetchT = 0;
export function updShame(dt: number) {
  if (!board) return;
  const p = player.g.position;
  if (inSalon(p)) { if ((fetchT -= dt) <= 0) { fetchT = FETCH_EVERY; void fetchWall(); } }
  else fetchT = 0;
  const near = card.near(atTheWall() && !atTable() && !byTheStall());
  if (near !== !cardEl.hidden) cardEl.hidden = !near;
  if (near) refresh();
}

// a worse bet goes up on the board at once, and online for a signed-in player
onWorse(() => {
  updBoard();
  void postShame().catch(() => { /* it goes up at the next sync */ });
});
// and signing in or out changes whose is whose
onCloud(() => updBoard());
