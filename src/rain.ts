// Her house, far out past the road, at the end of a path from the market's east fence (in stage 2, from the
// restaurant's east door). Standing in the circle out
// front makes it rain: the sky goes grey, the player turns into the singer, Ofer Levy, and cries facing her window,
// and his "מאוהב בגשם" plays from the line "מול ביתך עומד בגשם נרטב". Walking off lets the rain stop and the song fade out.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ExtrudeGeometry, Group, LineBasicMaterial, LineSegments,
  type Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, Shape, SphereGeometry,
} from 'three';
import { decal, drawPad } from './decals';
import { chimney } from './fx';
import { at, Build, detail, pack, quietly, seasonLayer } from './kit';
import { player } from './player';
import { HALL_BOX, HOUSE_PATH_Z, YARD } from './layout';
import { bake, G, hemi, mat, mesh, type Part, scene, sky, sun } from './render';
import { PAL, seasonal, shelter } from './season';
import { singerLook } from './singer';
import { house, type Lit, mailbox, pathEdging, picketFence, streetLamp } from './propsWorld';
import { popText } from './ui';
import { d2xz, FY, V } from './util';
import { ROAD1_X, ROAD2_X, ROAD_HALF, treeGroup } from './world';
import { Song, type SongStatus } from './youtube';

// ---------- layout ----------
/** Her house: front wall faces west, toward the market. */
const HOUSE = { x: 26.4, z: HOUSE_PATH_Z, w: 4, d: 5.6, h: 2.5 };
const FRONT = HOUSE.x - HOUSE.w / 2;
/** Where her lawn starts, west of the fence; and the deck's east edge, where stage 1's path starts. */
const LAWN_X0 = YARD.x0 - 0.6, DECK_X1 = 8;
/** The circle out front, where the player stands in the rain. */
export const RAIN_PAD = { x: 21.6, z: HOUSE_PATH_Z, r: 0.95 };
// The front yard (behind a low picket fence with a gate where the path comes in) and the path are in layout.ts.

/** The path (packed snow in winter, earth the rest of the year), her lawn, and the snow on her roof. */
const pathMat = seasonal(PAL.path), lawnMat = seasonal(PAL.lawn);
const roofMat = seasonal([0xF7FAFC, 0xB0574F, 0xB0574F, 0xB0574F]);

/**
 * Packed-snow path from `x0` to the yard, level with the deck, with a zebra crossing where it meets the road at
 * `roadX`. Stage 1's starts at the deck's east edge and crosses the first road; stage 2's starts at the
 * restaurant's east door and crosses the road past the takeout kiosk. It stops where her lawn starts: level with
 * it, the two would flicker where they overlapped.
 */
function path(x0: number, roadX: number) {
  const g = new Group(); scene.add(g);
  const road = { x0: roadX - ROAD_HALF, x1: roadX + ROAD_HALF }, x1 = LAWN_X0;
  for (const [a, b] of [[x0, road.x0], [road.x1, x1]]) {
    g.add(mesh(new BoxGeometry(b - a, FY + 0.02, 1.1), pathMat, (a + b) / 2, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));
  }
  g.add(mesh(new BoxGeometry(road.x1 - road.x0, FY + 0.02, 1.3), 0x6B7785, roadX, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));
  for (let x = road.x0 + 0.2; x < road.x1 - 0.1; x += 0.42) {
    g.add(mesh(new BoxGeometry(0.22, 0.01, 1.2), 0xF2F5F7, x + 0.11, FY + 0.005, HOUSE_PATH_Z));
  }
  // High: stones edging the path either side, up to the road and on from it to her lawn
  quietly(() => {
    const b = new Build();
    for (const [a, c] of [[x0, road.x0], [road.x1, x1]]) b.addAll(pathEdging(a, c, 0.55, FY), at(0, 0, HOUSE_PATH_Z));
    const edging = b.mesh(false);
    g.add(edging);
    detail(null, edging);
  });
  return g;
}
const path1 = path(DECK_X1, ROAD1_X), path2 = path(HALL_BOX.x1 + 0.15, ROAD2_X);
path2.visible = false;

/** Stage 2 moves the path's start to the restaurant's east door and its crossing to the new road. */
export function houseStage2() {
  path1.visible = false;
  path2.visible = true;
}

// ---------- the house and the yard ----------
function build() {
  // The yard: a snowy patch (a lawn out of winter), level with the path.
  scene.add(mesh(new BoxGeometry(FRONT - LAWN_X0, FY + 0.02, YARD.z1 - YARD.z0 + 1.1), lawnMat,
    (LAWN_X0 + FRONT) / 2, (FY + 0.02) / 2 - 0.02, HOUSE_PATH_Z));

  // Everything but the lawn and the trees, as it's drawn on Low (a High version is built beside it, below).
  const low: Object3D[] = [], put = (...o: Object3D[]) => { low.push(...o); };

  // Low picket fence around the yard, open where the path comes in.
  const fx = YARD.x0 - 0.45, fz0 = YARD.z0 - 0.45, fz1 = YARD.z1 + 0.45;
  // baked: the pickets (which cast shadows) in one mesh, the rails (which don't) in another
  const pickets: Part[] = [], rails: Part[] = [], picketGeo = new BoxGeometry(0.08, 0.6, 0.08);
  const picket = (x: number, z: number) => pickets.push({ geo: picketGeo, at: [x, FY + 0.3, z] });
  for (let z = fz0; z <= fz1 + 0.01; z += 0.35) if (Math.abs(z - HOUSE_PATH_Z) > 0.6) picket(fx, z);
  for (let x = fx + 0.35; x < FRONT; x += 0.35) { picket(x, fz0); picket(x, fz1); }
  for (const [z0, z1] of [[fz0, HOUSE_PATH_Z - 0.6], [HOUSE_PATH_Z + 0.6, fz1]]) {
    rails.push({ geo: new BoxGeometry(0.05, 0.06, z1 - z0), at: [fx, FY + 0.42, (z0 + z1) / 2] });
  }
  for (const z of [fz0, fz1]) rails.push({ geo: new BoxGeometry(FRONT - fx, 0.06, 0.05), at: [(fx + FRONT) / 2, FY + 0.42, z] });
  put(mesh(bake(pickets), 0xFFFFFF, 0, 0, 0, true), mesh(bake(rails), 0xFFFFFF));

  // The house: rose walls, a gable roof (snowy in winter), a red door, and her windows, lit.
  const { x, z, w, d, h } = HOUSE;
  put(mesh(new BoxGeometry(w, h, d), 0xE7B3AC, x, FY + h / 2, z, true));
  const gable = new Shape();
  gable.moveTo(-w / 2 - 0.35, 0); gable.lineTo(0, 1.6); gable.lineTo(w / 2 + 0.35, 0); gable.closePath();
  const roofGeo = new ExtrudeGeometry(gable, { depth: d + 0.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -(d + 0.5) / 2);
  put(mesh(roofGeo, [mat(0xE7B3AC), roofMat], x, FY + h, z, true));
  put(mesh(new BoxGeometry(w + 0.75, 0.12, d + 0.55), 0x8E4B45, x, FY + h + 0.02, z, true));
  put(mesh(new BoxGeometry(0.5, 1.1, 0.5), 0x9C5A50, x + 0.8, FY + h + 1.1, z - 1.4, true));
  put(mesh(new BoxGeometry(0.08, 1.75, 0.95), 0x8E2B2B, FRONT - 0.03, FY + 0.88, z));
  const knob = mesh(G.sphere, 0xF2C14E, FRONT - 0.09, FY + 0.85, z - 0.32); knob.scale.setScalar(0.05); put(knob);
  const glow = new MeshBasicMaterial({ color: 0xFFD98A });
  for (const wz of [z - 1.65, z + 1.65]) {
    put(mesh(new BoxGeometry(0.06, 0.95, 1.05), 0xFFFFFF, FRONT - 0.03, FY + 1.35, wz));
    put(mesh(new BoxGeometry(0.07, 0.8, 0.9), glow, FRONT - 0.04, FY + 1.35, wz));
    put(mesh(new BoxGeometry(0.08, 0.82, 0.05), 0xFFFFFF, FRONT - 0.05, FY + 1.35, wz));
  }
  // Her bedroom window, on the side that faces the market's camera, so it's always in view.
  for (const wx of [x - 0.85, x + 0.85]) {
    put(mesh(new BoxGeometry(1.05, 0.95, 0.06), 0xFFFFFF, wx, FY + 1.35, z + d / 2 + 0.03));
    put(mesh(new BoxGeometry(0.9, 0.8, 0.07), glow, wx, FY + 1.35, z + d / 2 + 0.04));
    put(mesh(new BoxGeometry(0.05, 0.82, 0.08), 0xFFFFFF, wx, FY + 1.35, z + d / 2 + 0.05));
  }
  const attic = mesh(G.cyl, glow, x, FY + h + 0.55, z + d / 2 + 0.26);
  attic.rotation.x = Math.PI / 2; attic.scale.set(0.32, 0.06, 0.32);
  put(attic);
  // Porch lamp by the door, and a street lamp over the circle.
  const porch = mesh(G.sphere, glow, FRONT - 0.12, FY + 1.95, z + 0.75); porch.scale.setScalar(0.1); put(porch);
  // The street lamp stands just inside the fence, out of the player's way, leaning over toward the circle.
  const lx = RAIN_PAD.x, lz = fz0 + 0.15;
  const pole = mesh(G.cyl, 0x2C3A47, lx, FY + 1.3, lz, true); pole.scale.set(0.06, 2.6, 0.06); put(pole);
  put(mesh(new BoxGeometry(0.08, 0.06, 0.5), 0x2C3A47, lx, FY + 2.6, lz + 0.22));
  const bulb = mesh(G.sphere, glow, lx, FY + 2.5, lz + 0.45); bulb.scale.set(0.13, 0.1, 0.13); put(bulb);
  // Her red mailbox by the gate, out on the grass well clear of the fence, its door facing the path.
  const mx = fx - 0.95, mz = HOUSE_PATH_Z + 0.95;
  const post = mesh(G.cyl, 0x7A5236, mx, (FY + 0.8) / 2, mz, true); post.scale.set(0.05, FY + 0.8, 0.05); put(post);
  put(mesh(new BoxGeometry(0.24, 0.26, 0.42), 0xD8394B, mx, FY + 0.9, mz, true));
  // High: the same house, yard fence, lamp and mailbox in more detail (propsWorld.ts), the windows lit the same.
  quietly(() => {
    const g = new Group(), lo = new Group();
    lo.add(...low);
    scene.add(lo);
    // everything the house, fence, lamp and mailbox are made of, put in place, baked into four meshes
    const hi: Lit = { body: new Build(), trim: new Build(), glow: new Build(), snow: new Build() };
    const place = (L: Lit, m: Matrix4) => {
      hi.body.addAll(L.body, m); hi.trim.addAll(L.trim, m); hi.glow.addAll(L.glow, m); hi.snow.addAll(L.snow, m);
    };
    place(house(w, d, h, [0.8, -1.4]), at(x, FY, z));
    // smoke from the chimney pot (fx.ts, on High)
    chimney(V(x + 0.88, FY + h + 2.0, z - 1.4));
    place(streetLamp(2.6, 0.45, 2.5), at(lx, FY, lz));
    place(mailbox(FY + 1.03), at(mx, 0, mz));
    // the fence: its three stretches (the west one in two either side of the gate), posts at the corners and the gate
    const gate = [HOUSE_PATH_Z - 0.55, HOUSE_PATH_Z + 0.55], posts: [number, number][] = [[fx, fz0], [fx, fz1], [fx, gate[0]], [fx, gate[1]]];
    const free = ([px, pz]: [number, number]) => posts.every(([qx, qz]) => Math.hypot(px - qx, pz - qz) > 0.1);
    const along = (pts: [number, number][]) => pts.filter(free);
    const west = pickets.map(p => [p.at[0], p.at[2]] as [number, number]).filter(([px]) => px === fx);
    const xs: number[] = [];
    for (let px = fx + 0.35; px < FRONT; px += 0.35) xs.push(px);
    const { fence, snow } = picketFence([
      { from: [fx, fz0], to: [fx, gate[0]], pickets: along(west.filter(([, pz]) => pz < HOUSE_PATH_Z)), inward: [1, 0] },
      { from: [fx, gate[1]], to: [fx, fz1], pickets: along(west.filter(([, pz]) => pz > HOUSE_PATH_Z)), inward: [1, 0] },
      { from: [fx, fz0], to: [FRONT, fz0], pickets: along(xs.map(px => [px, fz0])), inward: [0, 1] },
      { from: [fx, fz1], to: [FRONT, fz1], pickets: along(xs.map(px => [px, fz1])), inward: [0, -1] },
    ], posts, FY);
    hi.body.addAll(fence, at(0, 0, 0));
    hi.snow.addAll(snow, at(0, 0, 0));
    g.add(hi.body.mesh(), hi.trim.mesh(false), seasonLayer(hi.snow.mesh(false), [1, 0, 0, 0]));
    g.add(new Mesh(pack(hi.glow.pieces), glow));
    scene.add(g);
    detail(lo, g);
  });
  // A few trees round the back.
  scene.add(treeGroup([[30.5, HOUSE_PATH_Z - 3.8, 1.2, 0], [31.2, HOUSE_PATH_Z + 3.2, 1, 0], [24.5, HOUSE_PATH_Z + 5.2, 0.9, 0]]));
}
build();
shelter({ x0: FRONT - 0.4, x1: FRONT + HOUSE.w + 0.4, z0: HOUSE.z - HOUSE.d / 2 - 0.3, z1: HOUSE.z + HOUSE.d / 2 + 0.3, top: FY + HOUSE.h + 1.6, on: () => true });

const pad = decal(1.9, (c, w, h) => drawPad(c, w, h, '💔'));
pad.mesh.position.set(RAIN_PAD.x, FY + 0.01, RAIN_PAD.z);

// ---------- rain ----------
/**
 * Raindrops fill a box this many metres either side of the player, up to TOP high. They stay put in the world as the
 * player walks (only falling): a drop that ends up more than SPREAD behind comes back in ahead.
 */
const SPREAD = 15, TOP = 12, FALL = 13, DROP = 0.6, DROPS = 1800;
/** Wraps an offset from the player into the box round them. */
const wrap = (v: number) => v - 2 * SPREAD * Math.floor((v + SPREAD) / (2 * SPREAD));
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

/** The sky in the rain; the clear sky (day, or stage 2's dusk) is `sky` in render.ts. */
const storm = new Color(0x5E6B77);

/** How hard it's raining, 0 (clear) to 1. */
export let rainK = 0;

function updRain(dt: number, on: boolean) {
  rainK = on ? Math.min(1, rainK + dt / RAIN_IN) : Math.max(0, rainK - dt / RAIN_OUT);
  (scene.background as Color).lerpColors(sky.bg, storm, rainK);
  scene.fog!.color.lerpColors(sky.bg, storm, rainK);
  hemi.intensity = sky.hemi * (1 - 0.45 * rainK);
  sun.intensity = sky.sun * (1 - 0.8 * rainK);
  rain.visible = rainK > 0;
  if (!rain.visible) return;
  rainMat.opacity = 0.75 * rainK;
  const p = player.g.position;
  for (let i = 0; i < DROPS; i++) {
    let y = drops[i * 3 + 1] - FALL * dt;
    if (y < 0) y += TOP;
    drops[i * 3 + 1] = y;
    const x = p.x + wrap(drops[i * 3] - p.x), z = p.z + wrap(drops[i * 3 + 2] - p.z), j = i * 6;
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
  player.g.body.add(t);
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
  const arm = player.g.arms[0]; // the one on the camera's side when facing her house (animPerson sets it each frame)
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
const panel = document.getElementById('rain')!;
const hint = document.getElementById('rainHint')!;
/** What the banner says when the song can't be heard, by what's stopping it. */
const HINTS: Record<SongStatus, string> = {
  ok: '',
  muted: 'Tap 🔇 to hear the song',
  tap: 'Tap anywhere to hear the song',
  unavailable: "YouTube won't play this song here. Tap its name to listen on YouTube",
  offline: "Couldn't load YouTube's player. Check your connection, or allow YouTube in your ad blocker",
};
const song = new Song({
  id: SONG.id, start: SONG.start, vol: 60, fadeIn: 2, fadeOut: RAIN_OUT,
  muteKey: 'floe-market-rain-muted', muteBtn: document.getElementById('rainMute') as HTMLButtonElement,
  onStatus: s => { hint.textContent = HINTS[s]; hint.hidden = s === 'ok'; },
});

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
