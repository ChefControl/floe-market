// Her house, far out past the road, at the end of a path from the market's east fence. Standing in the circle out
// front makes it rain: the sky goes grey, the player turns into the singer, Ofer Levy, and cries facing her window,
// and his "מאוהב בגשם" plays from the line "מול ביתך עומד בגשם נרטב". Walking off lets the rain stop and the song fade out.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ExtrudeGeometry, LineBasicMaterial, LineSegments, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, Shape, SphereGeometry,
} from 'three';
import { decal, drawPad } from './decals';
import { player } from './player';
import { G, hemi, mat, mesh, scene, sun } from './render';
import { singerLook } from './singer';
import { popText } from './ui';
import { d2xz, FY } from './util';
import { HOUSE_PATH_Z, makeTree } from './world';
import { Song } from './youtube';

// ---------- layout ----------
/** Her house: front wall faces west, toward the market. */
const HOUSE = { x: 26.4, z: HOUSE_PATH_Z, w: 4, d: 5.6, h: 2.5 };
const FRONT = HOUSE.x - HOUSE.w / 2;
/** The circle out front, where the player stands in the rain. */
export const RAIN_PAD = { x: 21.6, z: HOUSE_PATH_Z, r: 0.95 };
/** Front yard, behind a low picket fence with a gate where the path comes in. */
const YARD = { x0: 19.2, x1: FRONT - 0.7, z0: HOUSE_PATH_Z - 2.3, z1: HOUSE_PATH_Z + 2.3 };
/** Where the player can walk: the path from the deck's east edge (crossing the road), and the front yard. */
export const HOUSE_AREAS = [
  { x0: 7.3, x1: YARD.x0 + 0.3, z0: HOUSE_PATH_Z - 0.25, z1: HOUSE_PATH_Z + 0.25 },
  YARD,
];
const ROAD = { x0: 8.55, x1: 10.65 };

// ---------- the path, the house and the yard ----------
function build() {
  // Packed-snow path, level with the deck, and a zebra crossing where it meets the road.
  const pathX0 = 7.85, pathX1 = YARD.x0 - 0.3;
  for (const [x0, x1] of [[pathX0, ROAD.x0], [ROAD.x1, pathX1]]) {
    scene.add(mesh(new BoxGeometry(x1 - x0, FY + 0.02, 1.1), 0xE2EAF0, (x0 + x1) / 2, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));
  }
  scene.add(mesh(new BoxGeometry(ROAD.x1 - ROAD.x0, FY + 0.02, 1.3), 0x6B7785, (ROAD.x0 + ROAD.x1) / 2, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));
  for (let x = ROAD.x0 + 0.2; x < ROAD.x1 - 0.1; x += 0.42) {
    scene.add(mesh(new BoxGeometry(0.22, 0.01, 1.2), 0xF2F5F7, x + 0.11, FY + 0.005, HOUSE_PATH_Z));
  }
  // The yard: a snowy patch, level with the path.
  scene.add(mesh(new BoxGeometry(FRONT - YARD.x0 + 0.6, FY + 0.02, YARD.z1 - YARD.z0 + 1.1), 0xEEF3F6,
    (YARD.x0 - 0.6 + FRONT) / 2, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));

  // Low picket fence around the yard, open where the path comes in.
  const fx = YARD.x0 - 0.45, fz0 = YARD.z0 - 0.45, fz1 = YARD.z1 + 0.45;
  const picket = (x: number, z: number) => scene.add(mesh(new BoxGeometry(0.08, 0.6, 0.08), 0xFFFFFF, x, FY + 0.3, z, true));
  for (let z = fz0; z <= fz1 + 0.01; z += 0.35) if (Math.abs(z - HOUSE_PATH_Z) > 0.6) picket(fx, z);
  for (let x = fx + 0.35; x < FRONT; x += 0.35) { picket(x, fz0); picket(x, fz1); }
  for (const [z0, z1] of [[fz0, HOUSE_PATH_Z - 0.6], [HOUSE_PATH_Z + 0.6, fz1]]) {
    scene.add(mesh(new BoxGeometry(0.05, 0.06, z1 - z0), 0xFFFFFF, fx, FY + 0.42, (z0 + z1) / 2));
  }
  for (const z of [fz0, fz1]) scene.add(mesh(new BoxGeometry(FRONT - fx, 0.06, 0.05), 0xFFFFFF, (fx + FRONT) / 2, FY + 0.42, z));

  // The house: rose walls, a snowy gable roof, a red door, and her windows, lit.
  const { x, z, w, d, h } = HOUSE;
  scene.add(mesh(new BoxGeometry(w, h, d), 0xE7B3AC, x, FY + h / 2, z, true));
  const gable = new Shape();
  gable.moveTo(-w / 2 - 0.35, 0); gable.lineTo(0, 1.6); gable.lineTo(w / 2 + 0.35, 0); gable.closePath();
  const roofGeo = new ExtrudeGeometry(gable, { depth: d + 0.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.5) / 2);
  scene.add(mesh(roofGeo, [mat(0xE7B3AC), mat(0xF7FAFC)], x, FY + h, z, true));
  scene.add(mesh(new BoxGeometry(w + 0.75, 0.12, d + 0.55), 0x8E4B45, x, FY + h + 0.02, z, true));
  scene.add(mesh(new BoxGeometry(0.5, 1.1, 0.5), 0x9C5A50, x + 0.8, FY + h + 1.1, z - 1.4, true));
  scene.add(mesh(new BoxGeometry(0.08, 1.75, 0.95), 0x8E2B2B, FRONT - 0.03, FY + 0.88, z));
  const knob = mesh(G.sphere, 0xF2C14E, FRONT - 0.09, FY + 0.85, z - 0.32); knob.scale.setScalar(0.05); scene.add(knob);
  const glow = new MeshBasicMaterial({ color: 0xFFD98A });
  for (const wz of [z - 1.65, z + 1.65]) {
    scene.add(mesh(new BoxGeometry(0.06, 0.95, 1.05), 0xFFFFFF, FRONT - 0.03, FY + 1.35, wz));
    scene.add(mesh(new BoxGeometry(0.07, 0.8, 0.9), glow, FRONT - 0.04, FY + 1.35, wz));
    scene.add(mesh(new BoxGeometry(0.08, 0.8, 0.05), 0xFFFFFF, FRONT - 0.05, FY + 1.35, wz));
  }
  // Her bedroom window, on the side that faces the market's camera, so it's always in view.
  for (const wx of [x - 0.85, x + 0.85]) {
    scene.add(mesh(new BoxGeometry(1.05, 0.95, 0.06), 0xFFFFFF, wx, FY + 1.35, z + d / 2 + 0.03));
    scene.add(mesh(new BoxGeometry(0.9, 0.8, 0.07), glow, wx, FY + 1.35, z + d / 2 + 0.04));
    scene.add(mesh(new BoxGeometry(0.05, 0.8, 0.08), 0xFFFFFF, wx, FY + 1.35, z + d / 2 + 0.05));
  }
  const attic = mesh(G.cyl, glow, x, FY + h + 0.55, z + d / 2 + 0.26);
  attic.rotation.x = Math.PI / 2; attic.scale.set(0.32, 0.06, 0.32);
  scene.add(attic);
  // Porch lamp by the door, and a street lamp over the circle.
  const porch = mesh(G.sphere, glow, FRONT - 0.12, FY + 1.95, z + 0.75); porch.scale.setScalar(0.1); scene.add(porch);
  // The street lamp stands just inside the fence, out of the player's way, leaning over toward the circle.
  const lx = RAIN_PAD.x, lz = fz0 + 0.15;
  const pole = mesh(G.cyl, 0x2C3A47, lx, FY + 1.3, lz, true); pole.scale.set(0.06, 2.6, 0.06); scene.add(pole);
  scene.add(mesh(new BoxGeometry(0.08, 0.06, 0.5), 0x2C3A47, lx, FY + 2.6, lz + 0.22));
  const bulb = mesh(G.sphere, glow, lx, FY + 2.5, lz + 0.45); bulb.scale.set(0.13, 0.1, 0.13); scene.add(bulb);
  // Her red mailbox by the gate, outside the fence.
  const mx = fx - 0.4, mz = HOUSE_PATH_Z + 0.9;
  const post = mesh(G.cyl, 0x7A5236, mx, FY + 0.4, mz, true); post.scale.set(0.05, 0.8, 0.05); scene.add(post);
  scene.add(mesh(new BoxGeometry(0.42, 0.26, 0.24), 0xD8394B, mx, FY + 0.9, mz, true));
  // A few trees round the back.
  for (const [tx, tz, s] of [[30.5, HOUSE_PATH_Z - 3.8, 1.2], [31.2, HOUSE_PATH_Z + 3.2, 1], [24.5, HOUSE_PATH_Z + 5.2, 0.9]]) {
    const t = makeTree(s); t.position.set(tx, 0, tz); scene.add(t);
  }
}
build();

const pad = decal(1.9, (c, w, h) => drawPad(c, w, h, '💔'));
pad.mesh.position.set(RAIN_PAD.x, FY + 0.01, RAIN_PAD.z);

// ---------- rain ----------
/** Raindrops fill a box this many metres either side of the player, up to TOP high. */
const SPREAD = 15, TOP = 12, FALL = 13, DROP = 0.6, DROPS = 1800;
/** Seconds for the rain to set in, and to clear once the player walks off. */
const RAIN_IN = 2.5, RAIN_OUT = 3;
const drops = new Float32Array(DROPS * 3);
// Spread evenly with a low-discrepancy sequence: no Math.random, so the rest of the game's randomness is untouched.
for (let i = 0; i < DROPS; i++) {
  drops[i * 3] = ((i * 0.7548776662) % 1 * 2 - 1) * SPREAD;
  drops[i * 3 + 1] = (i * 0.5698402910) % 1 * TOP;
  drops[i * 3 + 2] = ((i * 0.6180339887) % 1 * 2 - 1) * SPREAD;
}
const rainPos = new Float32Array(DROPS * 6);
const rainGeo = new BufferGeometry();
rainGeo.setAttribute('position', new BufferAttribute(rainPos, 3));
const rainMat = new LineBasicMaterial({ color: 0x6F8598, transparent: true, opacity: 0, depthWrite: false });
const rain = new LineSegments(rainGeo, rainMat);
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);

/** The sky and the light, clear and in the rain. */
const sky = (scene.background as Color).clone(), storm = new Color(0x5E6B77);
const HEMI = hemi.intensity, SUN = sun.intensity;

/** How hard it's raining, 0 (clear) to 1. */
export let rainK = 0;

function updRain(dt: number, on: boolean) {
  rainK = on ? Math.min(1, rainK + dt / RAIN_IN) : Math.max(0, rainK - dt / RAIN_OUT);
  (scene.background as Color).lerpColors(sky, storm, rainK);
  scene.fog!.color.lerpColors(sky, storm, rainK);
  hemi.intensity = HEMI * (1 - 0.45 * rainK);
  sun.intensity = SUN * (1 - 0.8 * rainK);
  rain.visible = rainK > 0;
  if (!rain.visible) return;
  rainMat.opacity = 0.75 * rainK;
  rain.position.set(player.g.position.x, 0, player.g.position.z);
  for (let i = 0; i < DROPS; i++) {
    let y = drops[i * 3 + 1] - FALL * dt;
    if (y < 0) y += TOP;
    drops[i * 3 + 1] = y;
    const x = drops[i * 3], z = drops[i * 3 + 2], j = i * 6;
    rainPos[j] = x; rainPos[j + 1] = y; rainPos[j + 2] = z;
    rainPos[j + 3] = x + 0.06; rainPos[j + 4] = y + DROP; rainPos[j + 5] = z + 0.03;
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// ---------- crying ----------
/** Tears run from the corners of the player's eyes down their cheeks, two per eye, out of step. */
const tearGeo = new SphereGeometry(0.022, 8, 6);
const tearMat = new MeshLambertMaterial({ color: 0x8FD8FF, emissive: 0x1A4A66 });
const tears = [0, 1, 2, 3].map(i => {
  const t = new Mesh(tearGeo, tearMat);
  t.scale.y = 1.6;
  t.visible = false;
  player.g.add(t);
  return { m: t, side: i % 2 ? 1 : -1, ph: i < 2 ? 0 : 0.5 };
});
/** Seconds for a tear to run down a cheek. */
const TEAR = 0.8;
let cryT = 0, sobT = 0;
export let crying = false;
/** In the rain he becomes the singer: black hair and stubble, black shirt, gold chain. */
const dressAsSinger = singerLook(player.g);

function updCrying(dt: number) {
  for (const t of tears) t.m.visible = crying;
  const arm = player.g.arms[0]; // the one on the camera's side when facing her house
  arm.rotation.z = 0;
  if (!crying) return;
  cryT += dt;
  for (const t of tears) {
    const f = (cryT / TEAR + t.ph) % 1;
    t.m.position.set(t.side * (0.075 + f * 0.02), 1.03 - f * 0.2, 0.23 - f * 0.03);
  }
  const p = player.g.position;
  if (!player.moving) {
    // Turn to face her window, and wipe the tears with one hand, shoulders shaking.
    let dh = Math.atan2(HOUSE.x - p.x, HOUSE.z - p.z) - player.h;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    player.h += dh * Math.min(1, dt * 3);
    player.g.rotation.y = player.h;
    if (!player.back.n) { arm.rotation.x = -2.4 + Math.sin(cryT * 9) * 0.08; arm.rotation.z = 0.6; }
  }
  sobT -= dt;
  if (sobT <= 0) { sobT = 3; popText('😢', { x: p.x, y: 0.4, z: p.z }); }
}

// ---------- the song ----------
/** "מאוהב בגשם" by Ofer Levy (live at Caesarea, 2011), and the second in the video where "מול ביתך עומד בגשם נרטב" begins. */
export const SONG = { id: 'OQE1efu22BM', start: 107 }; // 1:47
const song = new Song({
  id: SONG.id, start: SONG.start, vol: 60, fadeIn: 2, fadeOut: RAIN_OUT,
  muteKey: 'floe-market-rain-muted', muteBtn: document.getElementById('rainMute') as HTMLButtonElement,
});
const panel = document.getElementById('rain')!;

/** Rain, tears and the song while the player stands in the circle in front of her house. */
export function updHouse(dt: number) {
  const on = d2xz(player.g.position, RAIN_PAD) < RAIN_PAD.r * RAIN_PAD.r;
  if (on !== crying) {
    crying = on;
    panel.hidden = !on;
    dressAsSinger(on);
    cryT = 0; sobT = 0.6;
  }
  updRain(dt, on);
  updCrying(dt);
  song.update(on, dt);
}
