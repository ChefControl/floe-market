// Cooking Hazard's arcade cabinet, in the casino yacht's salon: against the bow wall beside the door, where the guests'
// slot machine nearest the door used to stand (the other still stands in the corner beyond it). A tall sea-blue cabinet
// with the six tastes' colours down its sides, its name lit on the marquee, a joystick and four buttons, and on its
// screen the game's attract loop: zombies shambling past with their tastes over their heads. It faces aft, away from
// the camera, so stepping on the 🕹️ pad in front of it brings the camera round onto its face (as at the slot machines),
// and opens a card (the casino's skin) with the best haul so far and Play, which opens the game itself over the whole screen
// (hazardPlay.ts, loaded the first time it's played). Built on its own dice, so none of it touches the game's luck.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry } from 'three';
import { atTable, leaveSeat, takeSeat, type Seat } from './casinoKit';
import { decal, drawPad } from './decals';
import { TASTES, TASTE_LIST } from './hazard';
import { dice, quietly } from './kit';
import { inSalon, pushOutOfBox, SALON, SHIP, UPPER } from './layout';
import { player } from './player';
import { bake, bakePainted, canvasTex, FONT, mesh, painted, type Part } from './render';
import { panel as kitPanel } from './uiKit';
import { d2xz, V, type XZ } from './util';

/** Where it stands, in the ship's own space: its middle against the bow wall, facing aft; and the pad in front. */
export const CABINET = { x: SALON.x1 - 0.42, z: -1.7 };
const PAD = { x: CABINET.x - 0.93, z: CABINET.z };
/** How close to the pad's middle the card opens. */
const REACH = 0.6;
/** The best haul so far (the most loot brought home in one run), kept on this device by the game (hazardPlay.ts). */
const BEST = 'floe-market-hazard-haul';
const NAVY = 0x14203A, BLUE = 0x1E8FC0, INK = 0x1B2430, STEEL = 0x9AA4AC, GOLD = 0xE3B23C;
/** How often the screen's picture moves on: a cabinet's attract loop doesn't need more. */
const FRAME = 1 / 12;

/** The marquee: the game's name in fat letters, outlined in ink, gold over red. */
const SIGN = canvasTex(256, 96, (c, w) => {
  c.fillStyle = '#14203A'; c.fillRect(0, 0, w, 96);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const [text, y, fill] of [['COOKING', 30, '#F2C14E'], ['HAZARD', 70, '#E0392B']] as const) {
    c.font = `800 38px ${FONT}`;
    c.lineWidth = 8; c.strokeStyle = '#173042'; c.strokeText(text, w / 2, y);
    c.fillStyle = fill; c.fillText(text, w / 2, y);
  }
});

/** The screen's attract loop, `t` seconds in: zombies shambling across, each with a taste over its head, the title, the
 *  best haul, and PRESS E blinking. */
function attract(c: CanvasRenderingContext2D, w: number, h: number, t: number, best: number) {
  c.fillStyle = '#2C3A47'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#4A5560'; c.fillRect(0, h * 0.62, w, h * 0.38);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 20px ${FONT}`; c.fillStyle = '#FFC34A';
  c.fillText('ALLERGIC ZOMBIES', w / 2, 22);
  for (let i = 0; i < 3; i++) {
    const x = ((t * 34 + i * w / 3) % (w + 60)) - 30, y = h * 0.62 + Math.sin(t * 5 + i * 2) * 3;
    c.font = '34px serif'; c.fillText('🧟', x, y);
    c.font = '18px serif'; c.fillText(TASTES[TASTE_LIST[(i * 2 + Math.floor(t / 3)) % 6]].icon, x, y - 30);
  }
  c.font = `800 16px ${FONT}`; c.fillStyle = '#FFE7A8';
  c.fillText(best ? `BEST HAUL ${best}` : 'NO BEST YET', w / 2, h - 34);
  if (Math.floor(t * 2) % 2 === 0) { c.fillStyle = '#FFF8EC'; c.fillText('PRESS E', w / 2, h - 14); }
}
/** The best haul on this device (0 for none yet). */
function best() {
  try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; }
}

/** The cabinet, standing on the floor facing +z: its body and trim baked into one mesh, the marquee and the screen apart. */
function build(g: Group) {
  const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
  const parts: (Part & { c: number })[] = [
    { geo: box(0.7, 1.5, 0.6), at: [0, 0.75, 0], c: BLUE },
    // the marquee's box, the screen's bezel, the control deck sloping up to it, and the coin door
    { geo: box(0.74, 0.3, 0.52), at: [0, 1.65, -0.02], c: NAVY },
    { geo: box(0.58, 0.44, 0.04), at: [0, 1.22, 0.3], c: INK },
    { geo: box(0.72, 0.08, 0.3), at: [0, 0.95, 0.4], rot: [0.25, 0, 0], c: NAVY },
    { geo: box(0.26, 0.32, 0.02), at: [0, 0.42, 0.31], c: 0x23384A },
    { geo: box(0.06, 0.012, 0.012), at: [-0.05, 0.5, 0.325], c: GOLD },
    { geo: box(0.06, 0.012, 0.012), at: [0.05, 0.5, 0.325], c: GOLD },
    // the joystick: its stick and red ball
    { geo: new CylinderGeometry(0.012, 0.012, 0.1, 8), at: [-0.18, 1.03, 0.41], c: STEEL },
    { geo: new SphereGeometry(0.035, 10, 8), at: [-0.18, 1.09, 0.41], c: 0xE0392B },
  ];
  // the four dish buttons, in tastes' colours
  [0xE0392B, 0xF08BB0, 0x7FC4E0, 0xB0724A].forEach((c, i) =>
    parts.push({ geo: new CylinderGeometry(0.025, 0.025, 0.02, 10), at: [0.02 + (i % 2) * 0.08, 1.0, 0.36 + Math.floor(i / 2) * 0.08], rot: [0.25, 0, 0], c }));
  // down each side, a stripe of each of the six tastes' colours
  for (const s of [-1, 1]) TASTE_LIST.forEach((t, i) =>
    parts.push({ geo: box(0.012, 0.25, 0.58), at: [s * 0.356, 1.375 - i * 0.25, 0], c: Number.parseInt(TASTES[t].color.slice(1), 16) }));
  g.add(mesh(bakePainted(parts), painted, 0, 0, 0, true));
  const sign = new Mesh(bake([{ geo: new PlaneGeometry(0.68, 0.26), at: [0, 1.65, 0.241] }]), new MeshBasicMaterial({ map: SIGN.tex }));
  const screen = canvasTex(256, 192, (c, w, h) => attract(c, w, h, 0, best()));
  const scr = new Mesh(new PlaneGeometry(0.5, 0.36), new MeshBasicMaterial({ map: screen.tex }));
  scr.position.set(0, 1.22, 0.322); scr.rotation.x = -0.12;
  g.add(sign, scr);
  return screen;
}

interface Cabinet { screen: ReturnType<typeof canvasTex>; t: number; tick: number }
let cab: Cabinet | null = null;
/** The camera's view while the player's on the pad: from aft and a little to the windows' side, on its screen. */
const VIEW: Seat = {
  at: V(SHIP.x + CABINET.x - 0.2, UPPER + 1.15, SHIP.z + CABINET.z), from: V(-1, 0.42, 0.38).normalize(), wide: 1.5, tall: 2.1,
};
/** Whether the cabinet has the camera. */
let seat = false;

const panel = document.getElementById('arcade')!, bestEl = document.getElementById('arcadeBest')!;
const playBtn = document.getElementById('arcadePlay') as HTMLButtonElement;
const card = kitPanel(panel, { place: 'card', skin: 'casino' });

/** Plays: the game opens over the whole screen (its code comes in the first time). */
export async function playArcade() {
  const { openHazard } = await import('./hazardPlay');
  openHazard();
}
playBtn.addEventListener('click', () => { void playArcade(); });

/** Builds the cabinet and its pad into the ship's group `g` (in the ship's own space), off the game's luck. */
export function buildArcade(g: Group) {
  cab = quietly(() => {
    const cabinet = new Group();
    const screen = build(cabinet);
    // facing aft, like the guests' machine beside it
    cabinet.position.set(CABINET.x, UPPER, CABINET.z); cabinet.rotation.y = -Math.PI / 2;
    g.add(cabinet);
    const pad = decal(1.15, (c, cw, ch) => drawPad(c, cw, ch, '🕹️'));
    pad.mesh.position.set(SHIP.x + PAD.x, UPPER + 0.012, SHIP.z + PAD.z);
    return { screen, t: 0, tick: 0 };
  }, dice(0xA4CADE));
}

/** Whether the player's on the pad in front of the cabinet. */
export function byTheCabinet() {
  const p = player.g.position;
  return !!cab && inSalon(p) && d2xz(p, { x: SHIP.x + PAD.x, z: SHIP.z + PAD.z }) < REACH * REACH;
}

/** Runs the cabinet: its screen's attract loop, and its card while the player's on the pad. */
export function updArcade(dt: number) {
  if (!cab) return;
  const near = card.near(byTheCabinet() && (seat || !atTable()));
  if (near !== seat) {
    seat = near;
    panel.hidden = !near;
    if (near) takeSeat(VIEW, panel); else leaveSeat(panel);
    const b = best();
    if (near) bestEl.textContent = b ? `🏆 Best haul ${b}` : '🏆 No best yet';
  }
  cab.t += dt; cab.tick += dt;
  if (cab.tick < FRAME) return;
  cab.tick = 0;
  const { ctx, canvas, tex } = cab.screen;
  attract(ctx, canvas.width, canvas.height, cab.t, best());
  tex.needsUpdate = true;
}

/** Keeps the player out of the cabinet (and its control deck, which sticks out aft). */
export function collideArcade(p: XZ) {
  if (!cab) return;
  pushOutOfBox(p, SHIP.x + CABINET.x - 0.12, SHIP.z + CABINET.z, 0.43 + 0.3, 0.37 + 0.3);
}

/** For tests: the screen's clock, and whether the card's showing. */
export const arcadeView = () => ({ t: cab?.t ?? 0, open: !panel.hidden });
/** For tests: where the pad is, in the world. */
export const arcadePad = () => ({ x: SHIP.x + PAD.x, z: SHIP.z + PAD.z });

