// Roulette table: an unlockable station where the player bets cash on a European wheel.
// Standing on its pad opens the betting panel; walking off closes it (settling any spin in progress).
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from 'three';
import { every } from './audio';
import { decal, drawPad } from './decals';
import { player } from './player';
import { canvasTex, FONT, mat, mesh, scene } from './render';
import { colorOf, multiplier, payout, spinWheel, WHEEL, type Bet, type EvenBet } from './roulette';
import { lose, tick, win } from './sfx';
import { popText } from './ui';
import { d2xz, FY } from './util';
import { addMoney, wallet } from './wallet';

/** Where the player stands to play. */
export const CASINO = { x: -4.3, z: 0.6 };
const TABLE = { x: -5.75, y: 0.5, z: 0.6 };
const SPIN_TIME = 3.2;
const TAU = Math.PI * 2;
const SEG = TAU / WHEEL.length;
const mod = (x: number, m: number) => ((x % m) + m) % m;

// ---------- wheel drawing ----------
const POCKET = { red: '#D8394B', black: '#22303C', green: '#2E9E49' };

/** Wheel face rotated by `angle` (pocket 0 at the top when 0). `ball` is polar: angle, radius as a fraction of R. */
function drawWheel(c: CanvasRenderingContext2D, size: number, angle: number, ball?: { a: number; r: number }) {
  const m = size / 2, R = m - 4;
  c.clearRect(0, 0, size, size);
  c.fillStyle = '#6B3E26'; c.beginPath(); c.arc(m, m, R, 0, TAU); c.fill();
  c.font = `800 ${Math.round(size * 0.05)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  WHEEL.forEach((n, i) => {
    const a = angle + i * SEG - Math.PI / 2;
    c.fillStyle = POCKET[colorOf(n)];
    c.beginPath(); c.moveTo(m, m); c.arc(m, m, R * 0.9, a - SEG / 2, a + SEG / 2); c.closePath(); c.fill();
    c.save(); c.translate(m, m); c.rotate(a + Math.PI / 2);
    c.fillStyle = '#fff'; c.fillText(String(n), 0, -R * 0.78);
    c.restore();
  });
  c.fillStyle = '#C3875D'; c.beginPath(); c.arc(m, m, R * 0.56, 0, TAU); c.fill();
  c.fillStyle = '#F2C14E'; c.beginPath(); c.arc(m, m, R * 0.12, 0, TAU); c.fill();
  if (ball) {
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(m + Math.cos(ball.a) * R * ball.r, m + Math.sin(ball.a) * R * ball.r, size * 0.032, 0, TAU); c.fill();
  }
}

// ---------- 3D table ----------
const pad = decal(1.9, (c, w, h) => drawPad(c, w, h, '🎰'));
pad.mesh.position.set(CASINO.x, FY + 0.01, CASINO.z);
pad.mesh.visible = false;

function buildTable() {
  const g = new Group(); g.position.set(TABLE.x, FY, TABLE.z);
  g.add(mesh(new BoxGeometry(1.4, 0.62, 1.1), 0x6B3E26, 0, 0.31, 0, true));
  g.add(mesh(new BoxGeometry(1.55, 0.06, 1.25), 0x2E7D4F, 0, 0.65, 0, true));
  g.add(mesh(new CylinderGeometry(0.46, 0.4, 0.12, 28), 0x8A5A3B, 0, 0.74, 0, true));
  const faceTex = canvasTex(256, 256, (c, w) => drawWheel(c, w, 0));
  const face = new Mesh(new CylinderGeometry(0.4, 0.4, 0.03, 37), [mat(0x5B3A26), new MeshLambertMaterial({ map: faceTex.tex }), mat(0x5B3A26)]);
  face.position.y = 0.81;
  face.add(mesh(new ConeGeometry(0.07, 0.12, 8), 0xF2C14E, 0, 0.07, 0));
  g.add(face);
  scene.add(g);
  return { g, face };
}

// ---------- state ----------
let enabled = false;
let open = false;
let table: ReturnType<typeof buildTable> | null = null;
let bet: Bet = { kind: 'red' };
let stakeChoice: number | 'all' = 25;
let pickedNumber = 17;
/** Current wheel rotation (radians). */
let angle = 0;
interface Spin { t: number; from: number; to: number; result: number; win: number; bet: Bet }
let spin: Spin | null = null;
/** The pocket the ball was last over, for its clicks. */
let lastPocket = 0;
const history: number[] = [];

// ---------- panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('casino'), msg = $('casinoMsg'), numPick = $('numPick'), numVal = $('numVal'), historyEl = $('history');
const spinBtn = $('spin') as HTMLButtonElement;
const wctx = ($('wheel') as HTMLCanvasElement).getContext('2d')!;
const WHEEL_PX = 240;

const LABELS: Record<EvenBet, string> = { red: 'Red', black: 'Black', odd: 'Odd', even: 'Even', low: '1–18', high: '19–36' };
const betLabel = (b: Bet) => b.kind === 'number' ? `number ${b.n}` : LABELS[b.kind];
const stake = () => stakeChoice === 'all' ? wallet.money : stakeChoice;
const money = (v: number) => '$' + v.toLocaleString('en-US');

function drawPanelWheel() {
  if (!spin) drawWheel(wctx, WHEEL_PX, angle, history.length ? { a: -Math.PI / 2, r: 0.67 } : undefined);
  else {
    const k = Math.min(1, spin.t / SPIN_TIME), e = 1 - Math.pow(1 - k, 3);
    // The ball runs the other way around the rim, then drops into the winning pocket at the top.
    drawWheel(wctx, WHEEL_PX, angle, { a: -Math.PI / 2 - (1 - e) * 5 * TAU, r: 0.93 - 0.26 * e });
  }
  // pointer marking the winning pocket
  const m = WHEEL_PX / 2;
  wctx.fillStyle = '#FF6B4A';
  wctx.beginPath(); wctx.moveTo(m - 9, 0); wctx.lineTo(m + 9, 0); wctx.lineTo(m, 16); wctx.closePath(); wctx.fill();
}

/** Syncs buttons and labels with the current bet, stake and cash. */
function refresh() {
  panel.querySelectorAll<HTMLButtonElement>('[data-bet]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.bet === bet.kind));
    b.disabled = !!spin;
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach(b => {
    const v = b.dataset.stake!;
    b.setAttribute('aria-pressed', String(v === String(stakeChoice)));
    b.disabled = !!spin || (v === 'all' ? wallet.money <= 0 : Number(v) > wallet.money);
  });
  numPick.hidden = bet.kind !== 'number';
  numVal.textContent = String(pickedNumber);
  const s = stake();
  spinBtn.disabled = !!spin || s <= 0 || s > wallet.money;
  spinBtn.textContent = spin ? 'Spinning…' : `Spin: ${money(s)} on ${betLabel(bet)} (pays ×${multiplier(bet)})`;
}

$('betKinds').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-bet]');
  if (!b || spin) return;
  const kind = b.dataset.bet as Bet['kind'];
  bet = kind === 'number' ? { kind, n: pickedNumber } : { kind };
  refresh();
});
numPick.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-step]');
  if (!b || spin) return;
  pickedNumber = mod(pickedNumber + Number(b.dataset.step), WHEEL.length);
  bet = { kind: 'number', n: pickedNumber };
  refresh();
});
$('stakes').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-stake]');
  if (!b || spin) return;
  stakeChoice = b.dataset.stake === 'all' ? 'all' : Number(b.dataset.stake);
  refresh();
});
spinBtn.addEventListener('click', startSpin);

function startSpin() {
  const s = stake();
  if (spin || s <= 0 || s > wallet.money) return;
  wallet.money -= s;
  const result = spinWheel();
  const win = payout(bet, s, result);
  // Already won, just not revealed yet: counted as in-flight so a save mid-spin keeps it.
  wallet.inFlight += win;
  const k = WHEEL.indexOf(result as typeof WHEEL[number]);
  spin = { t: 0, from: angle, to: angle + 4 * TAU + mod(-k * SEG - angle, TAU), result, win, bet };
  msg.textContent = 'No more bets…';
  refresh();
}

function settle() {
  const s = spin!;
  spin = null;
  angle = mod(s.to, TAU);
  wallet.inFlight -= s.win;
  if (s.win > 0) { addMoney(s.win); popText('+' + money(s.win), TABLE); win(); } else lose();
  history.unshift(s.result);
  history.length = Math.min(history.length, 10);
  historyEl.replaceChildren(...history.map(n => {
    const el = document.createElement('span');
    el.className = 'pocket ' + colorOf(n);
    el.textContent = String(n);
    return el;
  }));
  const color = colorOf(s.result);
  const name = `${s.result} ${color[0].toUpperCase()}${color.slice(1)}`;
  msg.textContent = s.win > 0 ? `${name}: you win ${money(s.win)}!` : `${name}: the house wins.`;
  refresh();
  drawPanelWheel();
}

/** The table, once it's built. */
export const casinoTable = () => table?.g ?? null;

/** Moves the table and its pad along the dock (stage 2 has less of it). */
export function moveCasino(dz: number) {
  CASINO.z += dz; TABLE.z += dz;
  pad.mesh.position.z = CASINO.z;
  if (table) table.g.position.z = TABLE.z;
}

/** The 'roulette' unlock: puts the table and its pad on the deck. Returns the table for the pop-in. */
export function enableCasino() {
  enabled = true;
  table = buildTable();
  pad.mesh.visible = true;
  return table.g;
}

export function updCasino(dt: number) {
  if (!enabled) return;
  const near = d2xz(player.g.position, CASINO) < 0.95 * 0.95;
  if (near !== open) {
    open = near;
    panel.hidden = !open;
    if (open) {
      if (!history.length) msg.textContent = wallet.money > 0 ? 'Pick a bet and spin' : 'Come back with some cash to play';
      refresh();
      drawPanelWheel();
    } else if (spin) settle(); // walked away mid-spin: pay out now
  }
  if (spin) {
    spin.t += dt;
    const k = Math.min(1, spin.t / SPIN_TIME);
    angle = spin.from + (spin.to - spin.from) * (1 - Math.pow(1 - k, 3));
    // the ball clatters past the pockets, slower and slower
    const pocket = Math.floor((5 * TAU * Math.pow(1 - k, 3) + angle) / SEG);
    if (pocket !== lastPocket && every('pocket', 0.035)) tick();
    lastPocket = pocket;
    if (k >= 1) settle(); else drawPanelWheel();
  }
  table!.face.rotation.y = -angle;
}
