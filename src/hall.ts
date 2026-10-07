// The Floe Sushi building for stage 2: its floor, posts and tiled roof ring, shoji and low walls, lanterns under
// the eaves, the red front gate and the garden before it, and the takeout kiosk's booth by the road.
// All scenery; the bar, kitchen line and register (things people use) are in restaurant.ts.
import {
  BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, PointLight, RepeatWrapping,
  type Object3D,
} from 'three';
import { EAST_DOOR, FARM_DOOR, GATE_W, HALL_BOX } from './layout';
import { bake, canvasTex, FONT, G, mat, mesh, rr, scene, type Part } from './render';
import { FY, rand, type XZ } from './util';
import { planks } from './world';

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = HALL_BOX;
const MID = (Z0 + Z1) / 2;
/** The takeout kiosk, outside the east wall at its north end, clear of the path to her house. */
export const KIOSK = { x: 12.2, z: 2.8 };

/** A group at (x, z) that pops in about its own centre; `put` places things in it by world position. */
/** The stone kerb the walls stand on: how high it is, and where its outside face is on the east side. */
const KERB_H = 0.36, KERB_X = HALL_BOX.x1 + 0.15;

function piece(x: number, z: number) {
  const g = new Group(); g.position.set(x, 0, z); g.visible = false; scene.add(g);
  return g;
}
function put<T extends Object3D>(g: Group, o: T, x: number, y: number, z: number) {
  o.position.set(x - g.position.x, y, z - g.position.z); g.add(o);
  return o;
}

// ---------- textures ----------
const shoji = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#F7F1E3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5B3424'; c.lineWidth = 4;
  for (let i = 1; i < 4; i++) {
    c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.stroke();
    c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(w, i * h / 4); c.stroke();
  }
  c.lineWidth = 12; c.strokeRect(0, 0, w, h);
});
const roofTiles = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#3B4652'; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#4A5866' : '#435160'; c.fillRect(x, 0, 12, h); }
  c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 3);
});
roofTiles.tex.wrapS = roofTiles.tex.wrapT = RepeatWrapping;
const roofMat = new MeshLambertMaterial({ map: roofTiles.tex });

/** A sign: light text on a coloured board with a gold rim. */
function signTex(w: number, h: number, bg: string, text: string, size: number) {
  return canvasTex(w, h, c => {
    c.fillStyle = bg; rr(c, 4, 4, w - 8, h - 8, 18); c.fill();
    c.strokeStyle = '#F2C14E'; c.lineWidth = 6; rr(c, 12, 12, w - 24, h - 24, 12); c.stroke();
    c.fillStyle = '#FFF4E6'; c.font = `800 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + 4);
  }).tex;
}

// ---------- glow ----------
/** Lantern materials, which light up as the stage-up turns day to dusk. */
export const glowMats: MeshLambertMaterial[] = [];
function glow(color: number, emissive: number) {
  const m = new MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.12 });
  glowMats.push(m);
  return m;
}
const RED = glow(0xE0392B, 0xB0250F), PAPER = glow(0xFFF1D6, 0xFFC46A), STONE_LAMP = glow(0xFFE2A8, 0xFFB050);
/** Warm lights over the bar and the gate, off until dusk. */
export const lamps = [new PointLight(0xFFB46A, 0, 13, 1.4), new PointLight(0xFFB46A, 0, 13, 1.4)];
lamps[0].position.set(0, 3.2, 9); lamps[1].position.set(0, 3.2, 16.8);

/** Paper lanterns at the given spots, baked into three meshes (red bodies, cream bodies, black caps). */
function lanterns(g: Group, at: [x: number, y: number, z: number, s: number, red: boolean][]) {
  const bodies: [Part[], Part[]] = [[], []], caps: Part[] = [];
  for (const [x, y, z, s, red] of at) {
    const lx = x - g.position.x, lz = z - g.position.z;
    bodies[red ? 0 : 1].push({ geo: G.sphere, at: [lx, y, lz], scale: [0.22 * s, 0.29 * s, 0.22 * s] });
    for (const d of [-1, 1]) caps.push({ geo: G.cyl, at: [lx, y + d * 0.27 * s, lz], scale: [0.12 * s, 0.05 * s, 0.12 * s] });
  }
  bodies.forEach((b, i) => { if (b.length) g.add(mesh(bake(b), i ? PAPER : RED, 0, 0, 0, true)); });
  g.add(mesh(bake(caps), 0x1B2430));
}

// ---------- the building ----------
const floor = piece(0, MID);
{
  const top = new MeshLambertMaterial({ map: planks('#7A4A30', '#86533A', 5, 4) });
  const side = mat(0x6B4130);
  put(floor, new Mesh(new BoxGeometry(X1 - X0, 0.3, Z1 - Z0), [side, side, top, side, side, side]), 0, 0, MID).receiveShadow = true;
  // a raised stone kerb round three sides, open at the gate and the farm door; walls stand on it
  const kerb: Part[] = [];
  const k = (w: number, d: number, x: number, z: number) => kerb.push({ geo: G.box, at: [x, KERB_H / 2, z - MID], scale: [w, KERB_H, d] });
  const fw = X1 + 0.15 - GATE_W;
  k(fw, 0.3, -(GATE_W + fw / 2), Z1); k(fw, 0.3, GATE_W + fw / 2, Z1);
  k(0.3, FARM_DOOR.z0 - Z0, X0, (Z0 + FARM_DOOR.z0) / 2); k(0.3, Z1 - FARM_DOOR.z1, X0, (FARM_DOOR.z1 + Z1) / 2);
  k(0.3, EAST_DOOR.z0 - Z0, X1, (Z0 + EAST_DOOR.z0) / 2); k(0.3, Z1 - EAST_DOOR.z1, X1, (EAST_DOOR.z1 + Z1) / 2);
  // the north side meets the dock, so it only has kerb (and wall) beyond the dock's fences
  for (const s of [-1, 1]) k(X1 + 0.15 - 7.85, 0.3, s * (7.85 + X1 + 0.15) / 2, Z0);
  floor.add(mesh(bake(kerb), 0x9AA4AC, 0, 0, 0, true));
  // the step out through the gate
  put(floor, mesh(new BoxGeometry(GATE_W * 2, 0.15, 0.9), 0x8E979E, 0, 0, 0, true), 0, 0.075, Z1 + 0.45);
}

const frame = piece(0, MID);
{
  const posts: Part[] = [];
  const post = (x: number, z: number) => posts.push({ geo: G.cyl, at: [x, FY + 1.7, z - MID], scale: [0.16, 3.4, 0.16] });
  for (const x of [X0, -7.9, 7.9, X1]) post(x, Z0);
  for (let i = 0; i <= 6; i++) { const x = X0 + i * (X1 - X0) / 6; if (Math.abs(x) > GATE_W + 0.4) post(x, Z1); }
  for (const z of [5.0, 8.5, 12.0]) { post(X0, z); post(X1, z); }
  frame.add(mesh(bake(posts), 0x6B2E22, 0, 0, 0, true));
  const beams: Part[] = [
    { geo: G.box, at: [0, FY + 3.4, Z0 - MID], scale: [X1 - X0 + 0.3, 0.3, 0.24] },
    { geo: G.box, at: [0, FY + 3.4, Z1 - MID], scale: [X1 - X0 + 0.3, 0.3, 0.24] },
    { geo: G.box, at: [X0, FY + 3.4, 0], scale: [0.24, 0.3, Z1 - Z0 + 0.3] },
    { geo: G.box, at: [X1, FY + 3.4, 0], scale: [0.24, 0.3, Z1 - Z0 + 0.3] },
  ];
  frame.add(mesh(bake(beams), 0x4A2418, 0, 0, 0, true));
}

/**
 * Roof slopes, each with the stretch of ground where standing would put it between the player and the camera
 * (which looks in from the south-east, high up). They fade out while the player is there.
 */
const slabs: { s: Mesh; m: MeshLambertMaterial; near: (p: XZ) => boolean }[] = [];
const roof = piece(0, MID);
{
  // Tiled slopes round an open courtyard; the south and east ones are narrow.
  const slab = (w: number, d: number, x: number, z: number, rx: number, rz: number, near: (p: XZ) => boolean) => {
    const m = roofMat.clone(); m.transparent = true;
    const s = mesh(new BoxGeometry(w, 0.14, d), m, 0, 0, 0, true);
    s.rotation.set(rx, 0, rz); put(roof, s, x, FY + 3.85, z);
    slabs.push({ s, m, near });
  };
  slab(22.6, 3.0, 0, Z0 + 0.1, -0.42, 0, p => p.z < 7.5 && p.z > -7.5 && p.x > -13);
  slab(22.6, 1.7, 0, Z1 + 0.55, 0.42, 0, p => p.z > 10 && p.x > -13);
  slab(3.0, 16.6, X0 + 0.1, MID, 0, 0.42, p => p.x < -6.5 && p.z > -1 && p.z < 18);
  slab(1.7, 16.6, X1 + 0.55, MID, 0, -0.42, p => p.x > 6 && p.z > -1 && p.z < 18);
  const tips: Part[] = [];
  for (const [x, z] of [[X0 - 1.1, Z0 - 1.1], [X1 + 1.1, Z0 - 1.1], [X0 - 1.1, Z1 + 1.1], [X1 + 1.1, Z1 + 1.1]]) {
    tips.push({ geo: G.cone, at: [x, FY + 3.55, z - MID], rot: [0, 0, (x < 0 ? 1 : -1) * 0.7], scale: [0.16, 0.5, 0.16] });
  }
  roof.add(mesh(bake(tips), 0x2B333B, 0, 0, 0, true));
  // lanterns hung from the beams, red and cream in turn
  const at: [number, number, number, number, boolean][] = [];
  let i = 0;
  for (let x = X0 + 1.2; x <= X1 - 1.0; x += 2.2) { at.push([x, FY + 3.0, Z0, 0.8, i++ % 2 === 0]); at.push([x, FY + 3.0, Z1, 0.8, i % 2 === 0]); }
  for (let z = Z0 + 1.8; z <= Z1 - 1.0; z += 2.2) { at.push([X0, FY + 3.0, z, 0.8, i++ % 2 === 0]); at.push([X1, FY + 3.0, z, 0.8, i % 2 === 0]); }
  lanterns(roof, at);
}

const walls = piece(0, MID);
{
  const wall = (w: number, h: number, d: number, x: number, z: number) => {
    const t = shoji.tex.clone(); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(Math.max(w, d) / 2, h / 2.4); t.needsUpdate = true;
    put(walls, mesh(new BoxGeometry(w, h, d), new MeshLambertMaterial({ map: t }), 0, 0, 0, true), x, 0.36 + h / 2, z);
  };
  // tall at the back (west), with the farm door; low elsewhere so the inside stays in view
  wall(0.18, 3.0, FARM_DOOR.z0 - Z0, X0, (Z0 + FARM_DOOR.z0) / 2);
  wall(0.18, 3.0, Z1 - FARM_DOOR.z1, X0, (FARM_DOOR.z1 + Z1) / 2);
  for (const s of [-1, 1]) wall(X1 - 7.9, 0.75, 0.18, s * (7.9 + X1) / 2, Z0);
  // the east wall: open to the takeout kiosk at its north end, and a door for the path to her house
  const win = KIOSK.z + 1.8;
  wall(0.18, 0.75, EAST_DOOR.z0 - win, X1, (win + EAST_DOOR.z0) / 2);
  wall(0.18, 0.75, Z1 - EAST_DOOR.z1, X1, (EAST_DOOR.z1 + Z1) / 2);
  const fw = X1 - GATE_W - 0.4;
  for (const s of [-1, 1]) wall(fw, 0.65, 0.18, s * (GATE_W + 0.4 + fw / 2), Z1);
  // the farm door's frame
  const door: Part[] = [];
  for (const z of [FARM_DOOR.z0, FARM_DOOR.z1]) door.push({ geo: G.box, at: [X0, FY + 1.6, z - MID], scale: [0.26, 3.2, 0.16] });
  door.push({ geo: G.box, at: [X0, FY + 3.1, (FARM_DOOR.z0 + FARM_DOOR.z1) / 2 - MID], scale: [0.26, 0.2, FARM_DOOR.z1 - FARM_DOOR.z0 + 0.16] });
  walls.add(mesh(bake(door), 0x5B3424, 0, 0, 0, true));
}

// ---------- the gate ----------
const gate = piece(0, Z1 + 0.4);
{
  const z = Z1 + 0.4;
  const parts: Part[] = [];
  for (const s of [-1, 1]) parts.push({ geo: G.cyl, at: [s * (GATE_W + 0.15), FY + 2.0, 0], scale: [0.2, 4.0, 0.2] });
  parts.push({ geo: G.box, at: [0, FY + 4.05, 0], scale: [GATE_W * 2 + 2.0, 0.3, 0.42] });
  gate.add(mesh(bake(parts), 0xC0392B, 0, 0, 0, true));
  put(gate, mesh(new BoxGeometry(GATE_W * 2 + 1.0, 0.2, 0.3), 0x2B1A14, 0, 0, 0, true), 0, FY + 3.55, z);
  const sign = new Mesh(new PlaneGeometry(3.4, 0.85), new MeshBasicMaterial({ map: signTex(512, 128, '#8E2B2B', '鮨  Floe Sushi', 66), transparent: true }));
  put(gate, sign, 0, FY + 3.0, z + 0.22);
  const noren = canvasTex(256, 128, (c, w, h) => {
    for (let i = 0; i < 4; i++) { c.fillStyle = '#1F3A5F'; c.fillRect(i * 64 + 2, 0, 60, h); }
    c.fillStyle = '#F7F1E3'; c.font = `800 64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('すし', w / 2, h / 2 + 6);
  });
  put(gate, new Mesh(new PlaneGeometry(GATE_W * 2 - 0.2, 0.9), new MeshLambertMaterial({ map: noren.tex, transparent: true, side: DoubleSide })), 0, FY + 2.4, z);
  lanterns(gate, [[-(GATE_W + 0.95), FY + 2.4, z + 0.3, 2.1, true], [GATE_W + 0.95, FY + 2.4, z + 0.3, 2.1, true]]);
}

// ---------- the garden ----------
const GARDEN_Z = 18.4;
const garden = piece(0, GARDEN_Z);
{
  // two stone lanterns either side of a stepping-stone path down to the street
  for (const x of [-3.4, 3.4]) {
    const t = new Group(); put(garden, t, x, 0, 17.8);
    t.add(mesh(new BoxGeometry(0.7, 0.2, 0.7), 0x9AA4AC, 0, 0.1, 0, true));
    const p = mesh(G.cyl, 0xA7B0B8, 0, 0.6, 0, true); p.scale.set(0.16, 0.8, 0.16); t.add(p);
    t.add(mesh(new BoxGeometry(0.55, 0.42, 0.55), STONE_LAMP, 0, 1.2, 0, true));
    const r = mesh(G.cone, 0x8A949C, 0, 1.62, 0, true); r.scale.set(0.62, 0.42, 0.62); r.rotation.y = Math.PI / 4; t.add(r);
  }
  const stones: Part[] = [];
  for (let i = 0; i < 8; i++) {
    stones.push({ geo: G.cyl, at: [rand(-0.3, 0.3), 0.04, Z1 + 1.4 + i * 0.95 - GARDEN_Z], rot: [0, rand(0, 3), 0], scale: [rand(.42, .55), 0.08, rand(.38, .5)] });
  }
  garden.add(mesh(bake(stones), 0xB9C2C9, 0, 0, 0, true));
  // little snowy pines in the corners
  const pines: Part[] = [], snow: Part[] = [];
  for (const [x, z] of [[-8.4, 22.9], [8.6, 21.9], [-8.4, 16.8], [8.6, 17.0]]) {
    pines.push({ geo: G.cone, at: [x, 0.55, z - GARDEN_Z], scale: [0.55, 1.1, 0.55] });
    snow.push({ geo: G.cone, at: [x, 0.85, z - GARDEN_Z], scale: [0.34, 0.5, 0.34] });
  }
  garden.add(mesh(bake(pines), 0x2E6E5E, 0, 0, 0, true));
  garden.add(mesh(bake(snow), 0xFFFFFF));
}

// ---------- the takeout kiosk's booth (its counter is the takeout window's, in counters.ts) ----------
const kiosk = piece(11.4, KIOSK.z);
{
  // its floor meets the restaurant's stone kerb flush, at the kerb's height
  put(kiosk, mesh(new BoxGeometry(12.8 - KERB_X, KERB_H, 4.8), 0x7A4A30, 0, 0, 0, true), (12.8 + KERB_X) / 2, KERB_H / 2, KIOSK.z);
  const m = roofMat.clone(); m.transparent = true;
  const r = mesh(new BoxGeometry(3.0, 0.12, 5.2), m, 0, 0, 0, true); r.rotation.z = -0.25;
  put(kiosk, r, 11.4, FY + 2.7, KIOSK.z);
  slabs.push({ s: r, m, near: p => p.x > 5.5 && p.z > 1 && p.z < 12 });
  const posts: Part[] = [];
  for (const z of [-2.2, 2.2]) posts.push({ geo: G.cyl, at: [1.3, FY + 1.25, z], scale: [0.12, 2.5, 0.12] });
  kiosk.add(mesh(bake(posts), 0x6B2E22, 0, 0, 0, true));
  const sign = new Mesh(new PlaneGeometry(1.9, 0.5), new MeshBasicMaterial({ map: signTex(256, 72, '#C0392B', 'Takeout', 40) }));
  sign.rotation.y = Math.PI / 2; put(kiosk, sign, 12.75, FY + 2.25, KIOSK.z);
}

/** The building, for the stage-up: shown, then popped in one by one. Lamps light up separately. */
export const hallPieces = [floor, frame, walls, roof, gate, garden];

/** The 'kiosk' unlock puts up the takeout kiosk's booth. Returns it for the pop-in. */
export function showKiosk() {
  kiosk.visible = true;
  return [kiosk];
}

/** Fades the roof slopes that would hide the player's surroundings from the camera; `all` shows every one. */
export function updRoof(dt: number, p: XZ, all: boolean) {
  if (!roof.visible) return;
  for (const s of slabs) {
    const want = !all && s.near(p) ? 0.12 : 1;
    s.m.opacity += (want - s.m.opacity) * Math.min(1, dt * 8);
    s.m.depthWrite = s.s.castShadow = s.m.opacity > 0.95;
  }
}

/** Builds the restaurant's shell (stage 2). */
export function showHall() {
  hallPieces.forEach(p => { p.visible = true; });
  lamps.forEach(l => scene.add(l));
}
