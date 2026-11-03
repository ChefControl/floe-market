// The wall of shame: a board hung from the wall behind the casino boat's bar, out over its window end, with the worst
// bet ever made at the boat's games on it, and a 💔 pad in front of the bar by it. On the pad, a card offers the whole
// wall: a dialog with the ten worst bets of all, everyone's, each with who made it, on what and when. A player's idea
// (report 12): tease whoever made the dumbest bet. A signed-in player's worst goes up as they make it (cloud.ts,
// shame/{uid}); anyone else's stays on their device (worstBet.ts) and shows only to them, among the rest. None of it
// touches the game's luck.
import { Group, Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';
import { atTable } from './casinoKit';
import { byTheStall } from './casinoRestroom';
import { cloud, onCloud, postShame, publicName, topShame, type Shame } from './cloud';
import { decal, drawPad } from './decals';
import { inSalon, SALON, SHIP, UPPER } from './layout';
import { player } from './player';
import { canvasTex, FONT, G, mesh } from './render';
import { panel as kitPanel } from './uiKit';
import { d2xz, money } from './util';
import { betOn, onWorse, worstBet } from './worstBet';

/** How many bets the wall lists. */
export const TOP = 10;
/** The board, in the ship's own space: a sign hung out from the stern wall over the bar's window end, square to the
 *  wall like a pub's, so it faces the camera; where its middle is, how wide (out from the wall) and tall. Its card's
 *  size in pixels. */
export const SHAME_WALL = { x: SALON.x0 + 0.74, z: 2.5, w: 1.3, h: 0.84, y: 1.66 };
const CARD = { w: 390, h: 252 };
/** The 💔 pad, in front of the bar by the sign (the bar's stools stand between), level with the 😢 pad at the salon's
 *  other end (casinoRestroom.ts); and how close to its middle the card opens. */
export const SHAME_PAD = { x: SALON.x0 + 2.6, z: 2.34 };
const REACH = 0.6;
/** Seconds between fetches of the wall while the player's in the salon. */
const FETCH_EVERY = 60;
const GOLD = 0xE3B23C, WOOD = 0x4A2416;

/** A bet on the wall: someone's, or the player's own (`mine`). */
export type Entry = Omit<Shame, 'uid'> & { mine: boolean };

/** The wall as last fetched, and whether that worked (null: not yet, or the cloud's out of reach). */
let top: Shame[] | null = null;
/** A made-up wall, put up instead of the cloud's (the demo build's &shame, fuguDemo.ts; and the tests). */
let standIn: Shame[] | null = null;
export function fakeWall(s: Shame[] | null) {
  standIn = s; top = s;
  updBoard();
}

/** The wall as the player sees it: the ten worst, theirs among them if it's bad enough (ahead of the cloud's copy). */
export function entries(): Entry[] {
  const uid = cloud.user?.uid, mine = worstBet();
  const list: Entry[] = (top ?? []).filter(s => s.uid !== uid || !mine || s.lost >= mine.lost)
    .map(({ uid: who, ...s }) => ({ ...s, mine: who === uid }));
  if (mine && !list.some(e => e.mine)) list.push({ ...mine, name: cloud.user ? publicName(cloud.user.name) : 'You', mine: true });
  return list.sort((a, b) => b.lost - a.lost).slice(0, TOP);
}

// ---------- the board ----------
/** Writes `text` centred at `y`, `size` px, shrunk to fit the card's width less `pad` either side. */
function line(c: CanvasRenderingContext2D, text: string, y: number, size: number, colour: string, weight = 800, pad = 40) {
  c.font = `${weight} ${size}px ${FONT}`;
  const k = Math.min(1, (CARD.w - pad * 2) / Math.max(1, c.measureText(text).width));
  c.save(); c.translate(CARD.w / 2, y); c.scale(k, k);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = colour; c.fillText(text, 0, 0);
  c.restore();
}
/** The board's card: the worst bet of all and whose it was; or, with nothing lost yet, nobody's. */
function drawBoard(c: CanvasRenderingContext2D, w: number, h: number) {
  const worst = entries()[0], INK = '#2A0F16', RED = '#8E1F2F';
  c.fillStyle = '#F4EFE6'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#E3B23C'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24);
  line(c, 'WALL OF SHAME', 50, 46, RED, 800, 30);
  line(c, worst ? money(worst.lost) : '$0', 128, 96, INK);
  line(c, worst ? worst.name : 'Nobody yet', 202, 44, INK, 700);
}

/** The board, its card and what's on it now. */
let board: { card: ReturnType<typeof canvasTex>; says: string } | null = null;

/** Builds the board and the pad into the ship's group `g` (in the ship's own space). */
export function buildShame(g: Group) {
  const { x, z, w, h, y } = SHAME_WALL, top = y + h / 2;
  const card = canvasTex(CARD.w, CARD.h, drawBoard);
  // a dark wooden board in a gold frame, the card on its window side, hung on two short rods from a gold bracket
  const back = mesh(G.box, WOOD, x, UPPER + y, z, true); back.scale.set(w + 0.12, h + 0.12, 0.05);
  const frame = mesh(G.box, GOLD, x, UPPER + y, z + 0.02); frame.scale.set(w + 0.04, h + 0.04, 0.03);
  const face = new Mesh(new PlaneGeometry(w, h), new MeshLambertMaterial({ map: card.tex }));
  face.position.set(x, UPPER + y, z + 0.037);
  const arm = mesh(G.box, GOLD, (SALON.x0 + x + w / 2 + 0.1) / 2, UPPER + top + 0.2, z); arm.scale.set(x + w / 2 + 0.1 - SALON.x0, 0.04, 0.04);
  g.add(back, frame, face, arm);
  for (const dx of [-0.5, 0.5]) {
    const rod = mesh(G.cyl, GOLD, x + dx, UPPER + top + 0.11, z); rod.scale.set(0.012, 0.18, 0.012);
    g.add(rod);
  }
  const pad = decal(1.15, (c, cw, ch) => drawPad(c, cw, ch, '💔'));
  pad.mesh.position.set(SHAME_PAD.x, UPPER + 0.01, SHAME_PAD.z); g.add(pad.mesh);
  board = { card, says: '' };
  // a worse bet goes up on the board at once, and online for a signed-in player; signing in or out changes whose is
  // whose
  onWorse(() => {
    updBoard();
    void postShame().catch(() => { /* it goes up at the next sync */ });
  });
  onCloud(updBoard);
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
    const got = standIn ?? await topShame(TOP);
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
    span('rank', String(rank)), span('name', e.mine && cloud.user ? `${e.name} (you)` : e.name), span('lost', money(e.lost)),
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
  // (a made-up wall is the demo's, which never goes online)
  join.hidden = !!cloud.user || !ok || !!standIn;
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
join.addEventListener('click', () => { closeWall(); $('cloud').click(); });

/** Whether the player's on the 💔 pad. */
export function atTheWall() {
  const p = player.g.position;
  return !!board && inSalon(p) && d2xz(p, { x: SHIP.x + SHAME_PAD.x, z: SHIP.z + SHAME_PAD.z }) < REACH * REACH;
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
