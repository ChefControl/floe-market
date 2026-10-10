// The casino boat's roulette table: bet on red, black or green, and watch the ball. Standing on its pad brings the
// camera in over the table and opens the controls. The chips go down on the felt, the wheel spins one way and the
// ball runs round its rim the other, slows, drops in, rattles about and settles in a pocket as the wheel comes to a
// stop. A board by the wheel shows the last numbers, and a croupier stands behind it all. Walking off settles any spin
// in progress.
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, Object3D, PlaneGeometry, TorusGeometry, Vector2,
} from 'three';
import { every } from './audio';
import { chipStack, gamePad, greeting, settleTweens, slide, speaker, Stakes, tween } from './casinoKit';
import { Person, SUITS } from './characters';
import { GAMES, pushOutOfBox } from './layout';
import { bake, canvasTex, FONT, G, mat, mesh, rr, scene, type Part } from './render';
import { colorOf, multiplier, payout, spinWheel, WHEEL, type Bet } from './roulette';
import { lose, tick, win } from './sfx';
import { popText } from './ui';
import { money, V, type XZ } from './util';
import { addMoney, wallet } from './wallet';

const AT = GAMES.roulette;
const TABLE = { x: AT.x, y: AT.y + 0.5, z: AT.z - 1.65 };
/** The felt's height, how far it runs each way, and the wheel's middle (towards the croupier). */
const TOP = 0.68, HALF = { x: 0.78, z: 0.82 }, WHEEL_AT = { z: -0.3 };
/** Seconds: the whole spin, and when the ball has dropped into its pocket (it rides there while the wheel stops). */
const SPIN_TIME = 5.6, LAND = 4.3;
const TAU = Math.PI * 2;
const SEG = TAU / WHEEL.length;
const mod = (x: number, m: number) => ((x % m) + m) % m;

// ---------- the wheel's face ----------
const POCKET = { red: '#D8394B', black: '#22303C', green: '#2E9E49' };

/** The wheel's face, pocket 0 at the top: the numbers round the outside, and the pockets inside them (their gold
 *  frets and the hub in the middle stand up off it, in 3D). */
function drawWheel(c: CanvasRenderingContext2D, size: number) {
  const m = size / 2, R = m - 4;
  c.clearRect(0, 0, size, size);
  c.fillStyle = '#6B3E26'; c.beginPath(); c.arc(m, m, R, 0, TAU); c.fill();
  c.font = `800 ${Math.round(size * 0.048)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const line = (a: number, r0: number, r1: number) => {
    c.beginPath(); c.moveTo(m + Math.cos(a) * R * r0, m + Math.sin(a) * R * r0);
    c.lineTo(m + Math.cos(a) * R * r1, m + Math.sin(a) * R * r1); c.stroke();
  };
  WHEEL.forEach((n, i) => {
    const a = i * SEG - Math.PI / 2, col = POCKET[colorOf(n)];
    c.fillStyle = col;
    c.beginPath(); c.moveTo(m, m); c.arc(m, m, R * 0.97, a - SEG / 2, a + SEG / 2); c.closePath(); c.fill();
    // the pocket itself, a shade darker: it's down in the wheel
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath(); c.arc(m, m, POCKETS.r1 * R, a - SEG / 2, a + SEG / 2); c.arc(m, m, POCKETS.r0 * R, a + SEG / 2, a - SEG / 2, true); c.closePath(); c.fill();
    c.strokeStyle = '#E3B23C'; c.lineWidth = size * 0.004;
    line(a - SEG / 2, POCKETS.r1, 0.97);
    c.save(); c.translate(m, m); c.rotate(a + Math.PI / 2);
    c.fillStyle = '#fff'; c.fillText(String(n), 0, -R * 0.87);
    c.restore();
  });
  c.strokeStyle = '#E3B23C'; c.lineWidth = size * 0.006;
  c.beginPath(); c.arc(m, m, R * 0.97, 0, TAU); c.stroke();
  c.fillStyle = '#C3875D'; c.beginPath(); c.arc(m, m, R * POCKETS.r0, 0, TAU); c.fill();
}
/** The face's radius, and its band of pockets (as fractions of it) between the hub and the ring of numbers. */
const FACE_R = 0.4, POCKETS = { r0: 0.52, r1: 0.76 };
/** Where the ball sits in a pocket, and runs round the track, as a fraction of the face's radius. */
const IN_POCKET = (POCKETS.r0 + POCKETS.r1) / 2, ON_RIM = 1.13;
/** The ball's size, and its height over its pivot on the track and down in a pocket. */
const BALL = { r: 0.026, rim: 0.045, pocket: 0.03 };

// ---------- the layout on the felt ----------
const BETS: { bet: Bet; x: number; label: string }[] = [
  { bet: 'red', x: -0.46, label: 'RED' }, { bet: 'black', x: 0, label: 'BLACK' }, { bet: 'green', x: 0.46, label: '0' },
];
const BOX = { w: 0.42, d: 0.3, z: 0.5 };
const FELT = 512;
/** The felt, with the three betting boxes along the player's side and what each pays. */
function drawFelt(c: CanvasRenderingContext2D, w: number, h: number) {
  const k = w / (2 * HALF.x);
  c.fillStyle = '#2E7D4F'; c.fillRect(0, 0, w, h);
  for (const b of BETS) {
    const x = (b.x + HALF.x - BOX.w / 2) * k, y = (BOX.z + HALF.z - BOX.d / 2) * k;
    c.fillStyle = POCKET[b.bet]; rr(c, x, y, BOX.w * k, BOX.d * k, 14); c.fill();
    c.strokeStyle = '#F2C14E'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#FFF8EC'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${b.bet === 'green' ? 46 : 32}px ${FONT}`; c.fillText(b.label, x + BOX.w * k / 2, y + BOX.d * k * 0.38);
    c.font = `800 22px ${FONT}`; c.fillStyle = '#FFE7A8'; c.fillText(`×${multiplier(b.bet)}`, x + BOX.w * k / 2, y + BOX.d * k * 0.75);
  }
}

// ---------- the board of last numbers ----------
const BOARD = { w: 128, h: 256 };
function drawBoard(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#1A0A0F'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#E3B23C'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
  c.textBaseline = 'middle';
  history.slice(0, 7).forEach((n, i) => {
    const col = colorOf(n), y = 26 + i * 33, x = col === 'red' ? 40 : col === 'black' ? 88 : 64;
    c.font = `800 ${i ? 26 : 34}px ${FONT}`; c.textAlign = 'center';
    c.fillStyle = col === 'black' ? '#D8DEE3' : POCKET[col];
    c.fillText(String(n), x, y);
  });
}

// ---------- 3D table ----------
/** The table, its wheel and ball, the board, and the croupier behind it all. */
function buildTable() {
  const g = new Group(); g.position.set(TABLE.x, AT.y, TABLE.z);
  g.add(mesh(new BoxGeometry(1.4, 0.62, 1.5), 0x6B3E26, 0, 0.31, 0, true));
  g.add(mesh(new BoxGeometry(2 * HALF.x + 0.12, 0.05, 2 * HALF.z + 0.12), 0x8A5A3B, 0, TOP - 0.03, 0, true));
  const felt = new Mesh(new PlaneGeometry(2 * HALF.x, 2 * HALF.z).rotateX(-Math.PI / 2),
    new MeshLambertMaterial({ map: canvasTex(FELT, Math.round(FELT * HALF.z / HALF.x), drawFelt).tex }));
  felt.position.y = TOP + 0.001; felt.receiveShadow = true;
  g.add(felt);
  // the wheel: a wooden bowl, its track sloping down to the turning face inside a gold rim; on the face, the pockets
  // sit down between raised gold frets, round a raised hub with a gold turret
  const bowl = new Group(); bowl.position.set(0, TOP, WHEEL_AT.z); g.add(bowl);
  bowl.add(mesh(new CylinderGeometry(0.5, 0.46, 0.08, 36), 0x6B3E26, 0, 0.04, 0, true));
  const track = new Mesh(new LatheGeometry([new Vector2(0.4, 0.108), new Vector2(0.49, 0.132)], 48),
    new MeshLambertMaterial({ color: 0x3A2014, side: DoubleSide }));
  track.receiveShadow = true; bowl.add(track);
  const rim = mesh(new TorusGeometry(0.49, 0.02, 8, 48), 0xE3B23C, 0, 0.132, 0);
  rim.rotation.x = Math.PI / 2; bowl.add(rim);
  const faceTex = canvasTex(512, 512, (c, w) => drawWheel(c, w));
  const face = new Mesh(new CylinderGeometry(FACE_R, FACE_R, 0.03, 37), [mat(0x5B3A26), new MeshLambertMaterial({ map: faceTex.tex }), mat(0x5B3A26)]);
  face.position.y = 0.09; face.receiveShadow = true;
  const up = 0.015, R = FACE_R * 0.984, r0 = POCKETS.r0 * R, r1 = POCKETS.r1 * R, FRET_H = 0.03;
  const frets: Part[] = WHEEL.map((_, k) => {
    const b = -(k + 0.5) * SEG, rm = (r0 + r1) / 2;
    return { geo: G.box, at: [rm * Math.cos(b), up + FRET_H / 2, -rm * Math.sin(b)], rot: [0, b, 0], scale: [r1 - r0, FRET_H, 0.007] };
  });
  face.add(mesh(bake(frets), 0xE3B23C, 0, 0, 0, true));
  const wall = mesh(new TorusGeometry(r1, 0.006, 6, 74), 0xE3B23C, 0, up + 0.006, 0);
  wall.rotation.x = Math.PI / 2; face.add(wall);
  face.add(mesh(new CylinderGeometry(r0 * 0.6, r0, 0.045, 37), 0xC3875D, 0, up + 0.0225, 0, true));
  face.add(mesh(new ConeGeometry(0.05, 0.1, 8), 0xF2C14E, 0, up + 0.045 + 0.05, 0, true));
  const cross = new BoxGeometry(0.15, 0.012, 0.012);
  face.add(mesh(cross, 0xF2C14E, 0, up + 0.13, 0), mesh(cross, 0xF2C14E, 0, up + 0.13, 0).rotateY(Math.PI / 2));
  bowl.add(face);
  // the ball goes round on its own pivot, in the bowl but not turning with the face: bright white, so it shows
  const pivot = new Object3D(); pivot.position.y = 0.1; bowl.add(pivot);
  const ball = new Mesh(G.sphere, new MeshLambertMaterial({ color: 0xFFFFFF, emissive: 0x8A8A8A }));
  ball.castShadow = true; ball.scale.setScalar(BALL.r); pivot.add(ball);
  ball.visible = false;
  // the board of last numbers on its post, by the wheel
  const boardTex = canvasTex(BOARD.w, BOARD.h, drawBoard);
  const board = new Group(); board.position.set(0.62, 0, -0.62); g.add(board);
  board.add(mesh(new CylinderGeometry(0.02, 0.02, 1.1, 8), 0x8A949C, 0, TOP + 0.3, 0));
  board.add(mesh(new BoxGeometry(0.26, 0.5, 0.05), 0x2A0F16, 0, TOP + 0.75, 0, true));
  const screen = new Mesh(new PlaneGeometry(0.22, 0.44), new MeshBasicMaterial({ map: boardTex.tex }));
  screen.position.set(0, TOP + 0.75, 0.027); board.add(screen);
  board.rotation.y = -0.35;
  const croupier = new Person(SUITS[2], 'fancy');
  croupier.position.set(0, 0, -1.15);
  g.add(croupier);
  const voice = speaker(g, 2.0);
  return { g, face, pivot, ball, boardTex, voice };
}

// ---------- state ----------
let table: ReturnType<typeof buildTable> | null = null;
let bet: Bet = 'red';
/** Current wheel rotation (radians). */
let angle = 0;
interface Spin { t: number; from: number; to: number; result: number; win: number; bet: Bet; stake: number; chips: Group }
let spin: Spin | null = null;
/** The pocket the ball was last over, for its clicks. */
let lastPocket = 0;
const history: number[] = [];
/** The stacks of chips on the felt. */
const stacks = new Set<Group>();

// ---------- controls ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('roulette'), msg = $('rouletteMsg'), historyEl = $('history');
const spinBtn = $('spin') as HTMLButtonElement;

const LABELS: Record<Bet, string> = { red: 'Red', black: 'Black', green: 'Green' };
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, () => !!spin, () => refresh());

/** Syncs buttons and labels with the current bet, stake and cash. */
function refresh() {
  panel.querySelectorAll<HTMLButtonElement>('[data-bet]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.bet === bet));
    b.disabled = !!spin;
  });
  stakes.refresh(!!spin);
  spinBtn.disabled = !!spin || !stakes.ok;
  spinBtn.textContent = spin ? 'Spinning…' : `Spin · ${money(stakes.value)} on ${LABELS[bet]}`;
}

$('betKinds').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-bet]');
  if (!b || spin) return;
  bet = b.dataset.bet as Bet;
  refresh();
});
spinBtn.addEventListener('click', startSpin);

const boxAt = (b: Bet) => V(BETS.find(x => x.bet === b)!.x, TOP, BOX.z);

function startSpin() {
  const s = stakes.value;
  if (spin || !stakes.ok || !table) return;
  wallet.money -= s;
  const result = spinWheel();
  const win = payout(bet, s, result);
  // Already won, just not revealed yet: counted as in-flight so a save mid-spin keeps it.
  wallet.inFlight += win;
  const k = WHEEL.indexOf(result as typeof WHEEL[number]);
  // the chips go down on the box first
  const chips = chipStack(s);
  chips.position.copy(boxAt(bet)).setZ(HALF.z + 0.3);
  table.g.add(chips); stacks.add(chips);
  slide(chips, boxAt(bet), 0.35, 0.05);
  spin = { t: 0, from: angle, to: angle + 5 * TAU + mod(-k * SEG - angle, TAU), result, win, bet, stake: s, chips };
  table.ball.visible = true;
  msg.textContent = 'No more bets…';
  refresh();
}

/**
 * The ball, `t` seconds into a spin: it runs round the rim against the wheel, slows, drops in with a few hops, and
 * ends in the winning pocket. Its angle is measured from that pocket, so wherever it's been it lands there.
 */
function placeBall(s: Spin, t: number) {
  const b = table!.ball, k = Math.min(1, t / LAND);
  // the winning pocket's place round the bowl, as the wheel turns: it ends up at the pivot's +x
  const pocket = -WHEEL.indexOf(s.result as typeof WHEEL[number]) * SEG - angle;
  const behind = -9 * TAU * Math.pow(1 - k, 2);
  table!.pivot.rotation.y = pocket + behind;
  const drop = Math.min(1, Math.max(0, (k - 0.62) / 0.38));
  const inward = Math.min(1, drop * 1.6);
  const r = ON_RIM + (IN_POCKET - ON_RIM) * inward;
  const hop = Math.abs(Math.sin(drop * Math.PI * 3)) * 0.04 * (1 - drop);
  b.position.set(r * FACE_R, BALL.rim + (BALL.pocket - BALL.rim) * inward + hop, 0);
  return behind;
}

function settle() {
  const s = spin!;
  spin = null;
  angle = mod(s.to, TAU);
  if (table) { table.face.rotation.y = -angle; placeBall(s, SPIN_TIME); }
  wallet.inFlight -= s.win;
  if (s.win > 0) { addMoney(s.win); popText('+' + money(s.win), TABLE); win(); } else lose();
  if (s.win > 0 && s.bet === 'green') table!.voice.say('Green!');
  payChips(s);
  history.unshift(s.result);
  history.length = Math.min(history.length, 10);
  historyEl.replaceChildren(...history.map(n => {
    const el = document.createElement('span');
    el.className = 'pocket ' + colorOf(n);
    el.textContent = String(n);
    return el;
  }));
  if (table) { drawBoard(table.boardTex.ctx, BOARD.w, BOARD.h); table.boardTex.tex.needsUpdate = true; }
  const color = colorOf(s.result);
  const name = `${s.result} ${color[0].toUpperCase()}${color.slice(1)}`;
  msg.textContent = s.win > 0 ? `${name}: you win ${money(s.win)}!` : `${name}: the house wins.`;
  refresh();
}

/** Lost chips go to the croupier; winnings come out beside them and both slide back to the player. */
function payChips(s: Spin) {
  const g = table!.g, chips = s.chips;
  const away = (c: Group, z: number) => slide(c, c.position.clone().setZ(z), 0.45, 0.05, () => { g.remove(c); stacks.delete(c); });
  stacks.add(chips);
  if (!s.win) { away(chips, -0.75); return; }
  const won = chipStack(s.win - s.stake);
  won.position.set(chips.position.x, TOP, -0.75); g.add(won); stacks.add(won);
  slide(won, chips.position.clone().setX(chips.position.x + 0.12), 0.45, 0.05,
    () => tween(0.5, () => {}, () => { away(won, HALF.z + 0.3); away(chips, HALF.z + 0.3); }));
}

const pad = gamePad(AT, '🎡', panel, {
  opened() {
    if (!history.length) msg.textContent = greeting('Pick a colour and spin');
    refresh();
  },
  closed() { if (spin) { settle(); settleTweens(); } }, // walked away mid-spin: pay out now
  greet() { table!.voice.say('Welcome aboard!'); },
}, {
  at: V(TABLE.x, AT.y + TOP + 0.12, TABLE.z - 0.02), from: V(0, 1.7, 1).normalize(), wide: 1.2, tall: 1.25,
});

/** Sets the table up on the boat. Returns it and its pad's marking, for the pop-in. */
export function enableRoulette() {
  table = buildTable();
  scene.add(table.g);
  pad.enable();
  return [table.g, pad.mark];
}

/** Keeps the player out of the table. */
export function collideRoulette(p: XZ) {
  if (table) pushOutOfBox(p, TABLE.x, TABLE.z, HALF.x + 0.06 + 0.3, HALF.z + 0.06 + 0.3);
}

export function updRoulette(dt: number) {
  if (!table) return;
  pad.upd();
  if (spin) {
    spin.t += dt;
    const k = Math.min(1, spin.t / SPIN_TIME);
    angle = spin.from + (spin.to - spin.from) * (1 - Math.pow(1 - k, 3));
    table.face.rotation.y = -angle;
    // the ball clatters past the pockets, slower and slower, until it's in
    const behind = placeBall(spin, spin.t);
    const pocket = Math.floor(behind / SEG);
    if (spin.t < LAND && pocket !== lastPocket && every('pocket', 0.035)) tick();
    lastPocket = pocket;
    if (k >= 1) settle();
  }
  table.voice.upd(dt);
}

/** What the croupier is saying, for tests. */
export const croupierSays = () => table?.voice.text ?? '';
/** For tests: how far round the bowl the ball is from the last result's pocket (0 when it's in it). */
export const ballOff = () => table ? mod(table.pivot.rotation.y + angle + WHEEL.indexOf(history[0] as typeof WHEEL[number]) * SEG + Math.PI, TAU) - Math.PI : 0;
/** For tests: how many stacks of chips are on the felt. */
export const chipsOnFelt = () => stacks.size;
