// The casino boat's slot machines: a bank of three along the back of the deck, the middle one yours to play. Standing
// on its pad opens the panel: pick a stake and pull. The reels spin and stop left to right, and the machine's own
// screen shows the same reels. Walking off mid-spin pays out at once.
import { BoxGeometry, CanvasTexture, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { every } from './audio';
import { gamePad, greeting, Stakes } from './casinoKit';
import { GAMES, pushOutOfBox } from './layout';
import { canvasTex, FONT, G, mesh, rr, scene } from './render';
import { clack, jackpot, lose, reelStop, win } from './sfx';
import { line, lineMultiplier, payout, pull, REEL, THREE, TWO_CHERRIES, type Sym } from './slots';
import { popText } from './ui';
import { FY, money, type XZ } from './util';
import { addMoney, wallet } from './wallet';

const AT = GAMES.slots;
/** The middle machine; the other two stand either side of it. */
const BANK = { x: AT.x, z: AT.z - 2.25, gap: 0.85 };
/** Seconds until each reel stops. */
const STOP = [1.0, 1.4, 1.8];
const N = REEL.length;
const mod = (x: number, m: number) => ((x % m) + m) % m;

// ---------- the reels ----------
const W = 270, H = 180, CELL = 60, REEL_W = 80, GAP = 15;

/** Three reels at positions `pos` (in symbols down the strip), with the pay line across the middle. */
function drawReels(c: CanvasRenderingContext2D, pos: readonly number[], lit = false) {
  c.fillStyle = '#5A1420'; c.fillRect(0, 0, W, H);
  pos.forEach((p, r) => {
    const x = GAP / 2 + r * (REEL_W + 5) + 5;
    c.save();
    rr(c, x, 4, REEL_W, H - 8, 10); c.fillStyle = '#FFF8EC'; c.fill(); c.clip();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // symbol i sits (p - i) cells below the middle: as p grows, the strip runs down
    for (let i = Math.floor(p) - 2; i <= Math.floor(p) + 2; i++) {
      const y = H / 2 + (p - i) * CELL, s = REEL[mod(i, N)];
      if (s === '7') { c.font = `800 46px ${FONT}`; c.fillStyle = '#D8394B'; }
      else { c.font = '38px serif'; c.fillStyle = '#000'; }
      c.fillText(s, x + REEL_W / 2, y + 2);
    }
    // shading top and bottom, so the reels look round
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(40,10,15,.55)'); g.addColorStop(0.3, 'rgba(40,10,15,0)');
    g.addColorStop(0.7, 'rgba(40,10,15,0)'); g.addColorStop(1, 'rgba(40,10,15,.55)');
    c.fillStyle = g; c.fillRect(x, 0, REEL_W, H);
    c.restore();
  });
  c.fillStyle = lit ? '#F2C14E' : 'rgba(255,107,74,.85)';
  c.fillRect(0, H / 2 - 2, W, 4);
  for (const [x, d] of [[0, 1], [W, -1]]) {
    c.beginPath(); c.moveTo(x, H / 2 - 10); c.lineTo(x + d * 10, H / 2); c.lineTo(x, H / 2 + 10); c.closePath(); c.fill();
  }
}

// ---------- 3D machines ----------
/** A cabinet with `screen` on its front, a lit sign on top and a lever on its right. Returns it and its lever. */
function cabinet(x: number, screen: MeshBasicMaterial) {
  const g = new Group(); g.position.set(x, FY, BANK.z);
  g.add(mesh(new BoxGeometry(0.72, 0.5, 0.6), 0x3A1A22, 0, 0.25, 0, true));
  g.add(mesh(new BoxGeometry(0.7, 0.95, 0.55), 0xC0392B, 0, 0.97, 0, true));
  g.add(mesh(new BoxGeometry(0.6, 0.08, 0.2), 0xE3B23C, 0, 0.62, 0.32, true));
  const scr = new Mesh(new PlaneGeometry(0.54, 0.36), screen);
  scr.position.set(0, 1.08, 0.28); g.add(scr);
  g.add(mesh(new BoxGeometry(0.74, 0.3, 0.5), 0xE3B23C, 0, 1.6, 0, true));
  const sign = new Mesh(new PlaneGeometry(0.66, 0.24), new MeshBasicMaterial({ map: SIGN.tex }));
  sign.position.set(0, 1.6, 0.255); g.add(sign);
  g.add(mesh(new CylinderGeometry(0.06, 0.06, 0.1, 10), 0x8A949C, 0.39, 1.0, 0, true).rotateZ(Math.PI / 2));
  const lever = new Group(); lever.position.set(0.44, 1.0, 0); g.add(lever);
  lever.add(mesh(new CylinderGeometry(0.022, 0.022, 0.42, 8), 0xB9C2C9, 0, 0.21, 0, true));
  const knob = mesh(G.sphere, 0xD8394B, 0, 0.44, 0, true); knob.scale.setScalar(0.06); lever.add(knob);
  return { g, lever };
}
const SIGN = canvasTex(256, 96, (c, w, h) => {
  c.fillStyle = '#2A0F16'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#FFD24A';
  for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(8 + i * 16, 7, 4, 0, Math.PI * 2); c.arc(8 + i * 16, h - 7, 4, 0, Math.PI * 2); c.fill(); }
  c.font = `800 58px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FF6B4A';
  c.fillText('7 7 7', w / 2, h / 2 + 4);
});

function buildBank() {
  const live = new CanvasTexture(reels.canvas);
  const side = (pos: number[]) => new MeshBasicMaterial({ map: canvasTex(W, H, c => drawReels(c, pos)).tex });
  const mid = cabinet(BANK.x, new MeshBasicMaterial({ map: live }));
  const g = new Group();
  g.add(cabinet(BANK.x - BANK.gap, side([3, 9, 15])).g, mid.g, cabinet(BANK.x + BANK.gap, side([11, 1, 6])).g);
  return { g, lever: mid.lever, live };
}

// ---------- state ----------
let bank: ReturnType<typeof buildBank> | null = null;
let pos = [0, 7, 13];
interface Spin { t: number; from: number[]; to: number[]; stops: number[]; win: number; stopped: number }
let spin: Spin | null = null;
/** The symbols last under the middle of each reel, for the clacks as they go round. */
let lastSym = [0, 0, 0];

// ---------- panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('slots'), msg = $('slotsMsg');
const pullBtn = $('pull') as HTMLButtonElement;
const reels = { canvas: $('reels') as HTMLCanvasElement, ctx: ($('reels') as HTMLCanvasElement).getContext('2d')! };
const stakes = new Stakes(panel.querySelector<HTMLElement>('.stakes')!, () => !!spin, () => refresh());

// what pays, from the rules
$('pays').replaceChildren(...[...Object.entries(THREE).map(([s, m]) => [[s, s, s], m] as const), [['🍒', '🍒'], TWO_CHERRIES] as const]
  .map(([syms, m]) => {
    const el = document.createElement('span');
    el.textContent = `${syms.join('')} ×${m}`;
    return el;
  }));

function redraw(lit = false) {
  drawReels(reels.ctx, pos, lit);
  if (bank) bank.live.needsUpdate = true;
}

function refresh() {
  stakes.refresh(!!spin);
  pullBtn.disabled = !!spin || !stakes.ok;
  pullBtn.textContent = spin ? 'Spinning…' : `Pull: ${money(stakes.value)}`;
}

function startSpin() {
  const s = stakes.value;
  if (spin || !stakes.ok) return;
  wallet.money -= s;
  const stops = pull();
  const won = payout(stops, s);
  // already won, just not revealed yet: counted as in-flight so a save mid-spin keeps it
  wallet.inFlight += won;
  const from = pos.map(Math.round);
  spin = { t: 0, from, to: from.map((f, i) => f + (3 + i) * N + mod(stops[i] - f, N)), stops, win: won, stopped: 0 };
  played = true;
  msg.textContent = 'Round and round…';
  refresh();
}
pullBtn.addEventListener('click', startSpin);

const say = (syms: readonly Sym[]) => syms.join(' ');
/** Whether the player has pulled yet: until then the panel greets them. */
let played = false;

function settle() {
  const s = spin!;
  spin = null;
  pos = [...s.to];
  wallet.inFlight -= s.win;
  const syms = line(s.stops);
  if (s.win > 0) {
    addMoney(s.win);
    popText('+' + money(s.win), { x: BANK.x, y: 1.9, z: BANK.z });
    if (lineMultiplier(syms) === THREE['7']) jackpot(); else win();
  } else lose();
  msg.textContent = s.win <= 0 ? `${say(syms)}: no luck this time.`
    : lineMultiplier(syms) === THREE['7'] ? `Jackpot! You win ${money(s.win)}!` : `${say(syms)}: you win ${money(s.win)}!`;
  redraw(s.win > 0);
  refresh();
}

const pad = gamePad(AT, '🎰', panel, {
  opened() {
    if (!played) msg.textContent = greeting('Pick a stake and pull');
    redraw();
    refresh();
  },
  closed() { if (spin) settle(); },
});

/** The 'slots' unlock: puts the bank of machines on the boat. Returns it for the pop-in. */
export function enableSlots() {
  bank = buildBank();
  scene.add(bank.g);
  redraw();
  pad.enable();
  return bank.g;
}

/** Keeps the player out of the machines. */
export function collideSlots(p: XZ) {
  if (bank) pushOutOfBox(p, BANK.x, BANK.z, BANK.gap + 0.37 + 0.3, 0.3 + 0.3);
}

export function updSlots(dt: number) {
  if (!bank) return;
  pad.upd();
  const s = spin;
  if (!s) return;
  s.t += dt;
  // the lever goes down and comes back up
  bank.lever.rotation.x = Math.sin(Math.min(1, s.t / 0.4) * Math.PI) * 1.1;
  pos = s.from.map((f, i) => {
    const k = Math.min(1, s.t / STOP[i]);
    return f + (s.to[i] - f) * (1 - Math.pow(1 - k, 3));
  });
  const syms = pos.map(Math.floor);
  if (syms.some((v, i) => v !== lastSym[i]) && every('reel', 0.05)) clack();
  lastSym = syms;
  while (s.stopped < 3 && s.t >= STOP[s.stopped]) { s.stopped++; reelStop(); }
  if (s.stopped === 3) settle(); else redraw();
}
