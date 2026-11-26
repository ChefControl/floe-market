// Cooking Hazard's street in 3D: the set the arcade cabinet's game is played on (hazardPlay.ts runs it, hazard.ts has
// the rules). A scene and a camera of its own, drawn by the game's renderer while the game waits behind (render.ts
// takeover): one wrecked street under a grey sky, the road running off both ends, burnt-out cars, crates, bins and cones
// along its pavements, a row of boarded-up buildings beyond the far one and concrete barriers along the near one (low,
// so they never hide the fight). Nothing on it blocks anyone yet: the street's cover comes with the runs' maps.
//
// The rules' street is 1280 by 720 of their own units; here a metre is 40 of them, so it's 32 by 18 metres. The camera
// looks down at the main game's tilt, square to the street (so up on the keys is up the screen), and follows the chef.
// Zombies are the game's own blocky people, grey-green, arms out, tinted by the taste they wear; specials are bigger,
// in a stained chef's bib. Dying, a zombie swells up like an allergic reaction and pops (into confetti, on High). The
// chef is the player's own, in a hazmat apron and goggles, the gun in one hand. Shots are food (potatoes, rock salt,
// chili), splatting in their taste's colour; the build-up rings are painted on the ground at the zombies' feet. High
// graphics add the shadows, the confetti and the smoke clouds; Low leaves them out, and plays the same.
import {
  BoxGeometry, type BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide, Fog, Group,
  HemisphereLight, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  type Object3D, PerspectiveCamera, Plane, Quaternion, Raycaster, RingGeometry, Scene, SphereGeometry, TorusGeometry,
  Vector2, Vector3,
} from 'three';
import { animPerson, Person } from './characters';
import { isHigh } from './graphics';
import { DISHES, H, TASTES, W, type GunId, type Run, type Shot, type Taste, type Zombie } from './hazard';
import { dice, quietly } from './kit';
import { player } from './player';
import { bakePainted, mesh, painted, renderer, type Part } from './render';
import { V } from './util';
import { plain } from './wardrobe';

/** Metres for one of the rules' units. */
export const M = 1 / 40;
/** The arena's half width and half depth, in metres. */
const HW = W * M / 2, HD = H * M / 2;
/** Where a point of the rules' street is in the set. */
const wx = (x: number) => (x - W / 2) * M, wz = (y: number) => (y - H / 2) * M;

// ---------- the scene ----------
const SKY = 0x3A434C;
const scene = new Scene();
scene.background = new Color(SKY);
scene.fog = new Fog(SKY, 26, 52);
scene.add(new HemisphereLight(0xDCE4EA, 0x4A4F55, 0.72 * Math.PI));
const sun = new DirectionalLight(0xFFF0DC, 0.55 * Math.PI);
sun.position.set(-9, 20, 9);
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -21, right: 21, top: 15, bottom: -15, near: 1, far: 60 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

export const camera = new PerspectiveCamera(40, 1, 0.1, 120);
/** The camera's offset from what it follows: the main game's tilt (render.ts OFF), square to the street. */
const OFF = V(0, 13, 11.3);
const follow = V(0, 0, 0);

// ---------- the street ----------
const box = new BoxGeometry(1, 1, 1), cyl = new CylinderGeometry(1, 1, 1, 10), cone = new ConeGeometry(1, 1, 8);
type P = Part & { c: number };
const at = (geo: BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rot?: P['rot']): P =>
  ({ geo, c, at: [x, y, z], scale: [sx, sy, sz], rot });

/** A burnt-out car, at (x, z) turned `a`: a charred shell, rust, blown-out windows, sitting on its rims. */
function car(parts: P[], x: number, z: number, a: number, rnd: () => number) {
  const c = Math.cos(a), s = Math.sin(a);
  const put = (geo: BufferGeometry, col: number, lx: number, y: number, lz: number, sx: number, sy: number, sz: number) =>
    parts.push(at(geo, col, x + lx * c + lz * s, y, z - lx * s + lz * c, sx, sy, sz, [0, a, 0]));
  const body = rnd() < 0.5 ? 0x3B2F2A : 0x4A3A30;
  put(box, body, 0, 0.42, 0, 3.8, 0.55, 1.7);
  put(box, 0x2A2522, -0.15, 0.95, 0, 2.1, 0.55, 1.5);
  put(box, 0x15181B, 0.92, 0.95, 0, 0.06, 0.42, 1.3);
  put(box, 0x15181B, -1.22, 0.95, 0, 0.06, 0.42, 1.3);
  put(box, 0x7A4A2A, 1.2 - rnd() * 2.4, 0.72, 0.4 - rnd() * 0.8, 0.6, 0.04, 0.5);
  put(box, 0x7A4A2A, -1.7, 0.4, 0.86, 0.5, 0.3, 0.02);
  for (const [lx, lz] of [[1.25, 0.8], [1.25, -0.8], [-1.25, 0.8], [-1.25, -0.8]]) put(cyl, 0x1E2124, lx, 0.2, lz, 0.28, 0.12, 0.28);
}

/** A stack of one to three crates. */
function crates(parts: P[], x: number, z: number, rnd: () => number) {
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const s = 0.75, ox = i === 2 ? 0.2 : i * 0.8, y = i === 2 ? s * 1.5 : s / 2, a = rnd() * 0.5;
    parts.push(at(box, 0x9C7A4C, x + ox, y, z, s, s, s, [0, a, 0]));
    parts.push(at(box, 0x6E5434, x + ox, y, z, s + 0.02, 0.08, s + 0.02, [0, a, 0]));
  }
}

/** Builds the street (baked into one mesh) and puts it in the scene. */
function buildStreet() {
  const rnd = dice(0x5EE7);
  const parts: P[] = [];
  // the ground beyond, the road running off both ends, the pavements, the dashes down the middle
  parts.push(at(box, 0x2B3036, 0, -0.08, 0, 110, 0.1, 80));
  parts.push(at(box, 0x3A434C, 0, -0.02, 0, 110, 0.04, H * M - 5.5));
  for (const s of [-1, 1]) {
    parts.push(at(box, 0x6E7882, 0, -0.012, s * (HD - 1.375), 110, 0.04, 2.75));
    parts.push(at(box, 0x8A939B, 0, -0.008, s * (HD - 2.75), 110, 0.04, 0.16));
  }
  for (let x = -54; x < 54; x += 3) parts.push(at(box, 0xC9A66B, x, 0.004, 0, 1.6, 0.02, 0.18));
  // cracks and patches in the road
  for (let i = 0; i < 46; i++) {
    const x = -24 + rnd() * 48, z = -5.5 + rnd() * 11;
    parts.push(rnd() < 0.7
      ? at(box, 0x262C31, x, 0.006, z, 0.6 + rnd() * 1.6, 0.02, 0.05, [0, rnd() * Math.PI, 0])
      : at(box, 0x323A42, x, 0.005, z, 0.8 + rnd(), 0.02, 0.6 + rnd() * 0.8, [0, rnd() * 0.4, 0]));
  }
  // beyond the far pavement: boarded-up buildings, with gaps for alleys
  for (let x = -42; x < 42;) {
    const w = 5 + rnd() * 4, h = 4 + rnd() * 5, gap = rnd() < 0.18 ? 3 : 0;
    const c = [0x5A5F66, 0x6B6259, 0x4E555C, 0x75695E][Math.floor(rnd() * 4)], cx = x + w / 2, front = -HD - 0.3;
    parts.push(at(box, c, cx, h / 2, front - 3, w - 0.1, h, 6));
    for (let fy = 1.4; fy < h - 0.6; fy += 1.6) for (let fx = -w / 2 + 0.9; fx < w / 2 - 0.6; fx += 1.4) {
      parts.push(at(box, rnd() < 0.3 ? 0x8A6A44 : 0x1B2026, cx + fx, fy, front, 0.8, 1, 0.06));
    }
    parts.push(at(box, 0x2A2E33, cx - w / 4, 0.8, front, 0.9, 1.6, 0.08));
    x += w + gap;
  }
  // beyond the near pavement, low barriers and sandbags (nothing tall: the camera looks over them)
  for (let x = -40; x < 40; x += 2.6) {
    if (rnd() < 0.2) continue;
    parts.push(at(box, 0x8A9096, x, 0.35, HD + 0.6, 2.2, 0.7, 0.45));
    if (rnd() < 0.4) parts.push(at(box, 0xA89A72, x + 1.1, 0.18, HD + 0.2, 0.7, 0.3, 0.4));
  }
  // along the pavements: burnt-out cars, crates, bins knocked over, cones and a lamp post bent over
  car(parts, -12.5, -HD + 1.6, 0.12, rnd); car(parts, 9.5, HD - 1.5, Math.PI - 0.2, rnd); car(parts, 2.5, -HD + 1.4, -0.08, rnd);
  car(parts, -HW - 2.5, 3.5, 1.2, rnd);
  for (const [x, z] of [[-6, -HD + 1.2], [14, -HD + 1.1], [-15, HD - 1.2], [3, HD - 1.1], [HW - 1.2, -2.5]] as const) crates(parts, x, z, rnd);
  for (const [x, z] of [[-3, -HD + 0.8], [6.5, HD - 0.8], [-9, HD - 0.9]] as const) {
    parts.push(at(cyl, 0x3F6B4A, x, 0.32, z, 0.32, 0.9, 0.32, [Math.PI / 2, 0, rnd() * 2]));
    parts.push(at(box, 0x5B4B3A, x + 0.6, 0.03, z, 0.7, 0.04, 0.5, [0, rnd(), 0]));
  }
  for (const [x, z] of [[-1, 4.5], [0.4, 5.1], [8, -4.8], [-14, 2]] as const) {
    parts.push(at(cone, 0xF07A2A, x, 0.3, z, 0.22, 0.6, 0.22));
    parts.push(at(cyl, 0xF4F4F0, x, 0.3, z, 0.12, 0.08, 0.12));
    parts.push(at(box, 0xF07A2A, x, 0.02, z, 0.4, 0.04, 0.4));
  }
  parts.push(at(cyl, 0x5E666E, 12, 1.6, -HD + 0.5, 0.07, 3.4, 0.07, [0, 0, 0.5]));
  parts.push(at(box, 0x5E666E, 13.4, 3, -HD + 0.5, 0.9, 0.1, 0.2, [0, 0, -0.3]));
  const street = mesh(bakePainted(parts), painted, 0, 0, 0, true);
  scene.add(street);
}

// ---------- the people ----------
const ZOMBIE_SKIN = [0x9DB08A, 0x8FA27C, 0xA7B394];
const RAGS = [0x6B7B5E, 0x7A6A58, 0x5C6B7A, 0x8A7560, 0x6E5F70];
/** How tall a zombie is to the top of its head, before a special's size. */
const HEAD = 1.3;
/** A special's size against the horde's. */
const BIG = 1.4;

/** Extra things worn (an apron, a bib, the gun) baked into one mesh, kept out of the zombies' tints. */
function gear(parts: P[]) {
  const m = mesh(bakePainted(parts), painted, 0, 0, 0, true);
  m.userData.gear = true;
  return m;
}

/** The tints a zombie's body takes: its own colours, a glow of the taste it wears, or candied pink all over. (A glow
 *  rather than a colour over its own: the rags are dark, and no colour over dark shows.) */
const tints = new Map<string, MeshLambertMaterial>();
function tint(key: string, c: string, k: number) {
  let m = tints.get(key);
  if (!m) {
    m = painted.clone();
    m.emissive.set(c).multiplyScalar(k);
    tints.set(key, m);
  }
  return m;
}

interface Body {
  p: Person;
  bib: Mesh;
  /** The zombie it plays, and the look it's in now (a tint's key). */
  z: Zombie | null;
  look: string;
  /** Seconds into its pop, once its zombie's gone (it swells, then goes). */
  dying: number;
  ring: Mesh; meter: Mesh;
}
const bodies: Body[] = [];
let made = 0;

/** A zombie's body, from the pool or made new (off the game's luck). */
function newBody(): Body {
  return quietly(() => {
    const n = made++;
    const style = { ...plain(n), skin: ZOMBIE_SKIN[n % 3], spring: 'bare' as const, cut: (['short', 'bald', 'quiff', 'long'] as const)[n % 4] };
    const p = new Person(RAGS[n % RAGS.length], 'parka', style);
    p.season = 'spring';
    p.redress();
    const bib = gear([
      at(box, 0xF4EFE6, 0, 0.6, 0.262, 0.36, 0.38, 0.025, [-0.13, 0, 0]),
      at(box, 0x8A3B24, 0.07, 0.66, 0.278, 0.1, 0.08, 0.01, [-0.13, 0, 0.4]),
      at(box, 0x8A3B24, -0.08, 0.52, 0.29, 0.07, 0.06, 0.01, [-0.13, 0, -0.3]),
    ]);
    p.body.add(bib);
    const ring = flat(new RingGeometry(1.12, 1.26, 32)), meter = flat(ARCS[0]);
    scene.add(p, ring, meter);
    return { p, bib, z: null, look: '', dying: 0, ring, meter };
  }, dice(0x2B1E5 + made));
}

/** The build-up ring's arc, in 24 steps round, from twelve o'clock. */
const ARCS = Array.from({ length: 25 }, (_, i) => new RingGeometry(1.32, 1.52, 32, 1, Math.PI / 2 - (i / 24) * Math.PI * 2, (i / 24) * Math.PI * 2));
/** Something painted flat on the street (a ring, a splat, a zone), drawn over it. */
function flat(geo: RingGeometry | CircleGeometry, color = 0xFFFFFF) {
  const m = new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  m.visible = false;
  return m;
}

/** The chef: the player's own, in a hazmat apron and goggles, a gun in the right hand and a plate in the left. */
let chef: { p: Person; guns: Record<GunId, Mesh>; plate: Group } | null = null;
function newChef() {
  return quietly(() => {
    const p = new Person(player.g.color, 'parka', player.g.style);
    p.body.add(gear([
      at(box, 0xE8C93A, 0, 0.55, 0.268, 0.42, 0.52, 0.025, [-0.13, 0, 0]),
      at(box, 0x1B2430, 0, 0.82, 0.24, 0.3, 0.035, 0.02, [-0.13, 0, 0]),
      at(new TorusGeometry(0.205, 0.022, 6, 20), 0x1B2430, 0, 1.08, 0.05, 1, 1, 1, [Math.PI / 2, 0, 0]),
      at(box, 0x1B2430, 0.075, 1.08, 0.24, 0.11, 0.085, 0.04),
      at(box, 0x1B2430, -0.075, 1.08, 0.24, 0.11, 0.085, 0.04),
      at(box, 0x9FD8E8, 0.075, 1.08, 0.262, 0.085, 0.06, 0.01),
      at(box, 0x9FD8E8, -0.075, 1.08, 0.262, 0.085, 0.06, 0.01),
    ]));
    // the guns, along the right arm (it points them when it's held out ahead)
    const gun = (c: number, tip: number) => gear([
      at(box, c, 0, -0.42, 0.02, 0.09, 0.4, 0.11), at(box, tip, 0, -0.64, 0.02, 0.06, 0.08, 0.06), at(box, 0x2A2E33, 0, -0.34, 0.09, 0.05, 0.08, 0.1),
    ]);
    const guns = { spud: gun(0x8A6A44, 0xD9C27A), salt: gun(0x7A848C, 0xF4F4F0), chili: gun(0xC0392B, 0xE8742A) };
    for (const g of Object.values(guns)) p.arms[0].add(g);
    const plate = new Group();
    plate.add(mesh(new CylinderGeometry(0.2, 0.16, 0.04, 14), 0xF4F4F0, 0, -0.42, 0), mesh(new SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new MeshLambertMaterial(), 0, -0.4, 0));
    plate.visible = false;
    p.arms[1].add(plate);
    scene.add(p);
    return { p, guns, plate };
  }, dice(0xC4EF));
}

// ---------- shots, splats, dishes, zones, garnishes, confetti ----------
const MAX_SHOTS = 256;
/** A gun's shots as one instanced mesh: potatoes, rock salt or chili. */
function shotMesh(gun: GunId) {
  const geo = gun === 'spud' ? new SphereGeometry(0.14, 8, 6) : gun === 'salt' ? new IcosahedronGeometry(0.09, 0) : new SphereGeometry(0.11, 6, 4);
  const m = new InstancedMesh(geo, new MeshLambertMaterial({ color: 0xFFFFFF }), MAX_SHOTS);
  const c = new Color();
  for (let i = 0; i < MAX_SHOTS; i++) m.setColorAt(i, c.setHex(gun === 'spud' ? 0xC9A15E : gun === 'salt' ? 0xF4F4F0 : i % 3 ? 0xE0392B : 0xF08A24));
  m.count = 0;
  m.frustumCulled = false;
  scene.add(m);
  return m;
}
let shots: Record<GunId, InstancedMesh> | null = null;
/** Where each shot was last frame, to tell which hit something (the rules zero a shot's life when it hits). */
let flying = new Set<Shot>();

interface Fading { m: Mesh; t: number; life: number }
const splats: Fading[] = [];
const SPLAT_LIFE = 1.6;
function splat(x: number, y: number, taste: Taste | null) {
  let s = splats.find(f => f.t <= 0);
  if (!s) {
    if (splats.length >= 48) s = splats.reduce((a, b) => (a.t < b.t ? a : b));
    else { s = { m: quietly(() => flat(new CircleGeometry(1, 9)), dice(splats.length)), t: 0, life: SPLAT_LIFE }; scene.add(s.m); splats.push(s); }
  }
  const m = s.m.material as MeshBasicMaterial;
  m.color.set(taste ? TASTES[taste].color : '#d9c27a');
  s.m.position.set(wx(x), 0.02, wz(y));
  s.m.scale.setScalar(0.18 + 0.1 * Math.abs(Math.sin(x + y)));
  s.m.rotation.z = x * 0.1;
  s.t = SPLAT_LIFE;
}

/** Dishes in the air, the target ring while one's in hand, zones on the ground, garnishes, smoke puffs. */
const plates: Group[] = [], zones: Mesh[] = [], herbs: Group[] = [], puffs: Mesh[] = [];
let target: Mesh | null = null;
function pool<T extends Object3D>(list: T[], i: number, make: () => T) {
  if (!list[i]) { list[i] = quietly(make, dice(0x9A7E + i)); scene.add(list[i]); }
  list[i].visible = true;
  return list[i];
}
const hideFrom = (list: Object3D[], n: number) => { for (let i = n; i < list.length; i++) list[i].visible = false; };

const ZONE_COLOR: Record<string, number> = { smoke: 0x6A3FA0, caramel: 0xB8561E, battery: 0x7FC4E0, syrup: 0xF08BB0 };

const CONFETTI = 400;
let confetti: InstancedMesh | null = null;
interface Bit { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; spin: number }
const bits: Bit[] = [];
const BITS_A_POP = 34;
function pop(x: number, y: number, z: number, colors: number[]) {
  if (!isHigh() || !confetti) return;
  const c = new Color();
  for (let i = 0; i < BITS_A_POP; i++) {
    const n = bits.length < CONFETTI ? bits.length : (bitAt++ % CONFETTI);
    const a = (i / BITS_A_POP) * Math.PI * 2, up = 2.5 + (i % 5) * 0.6, out = 1.4 + (i % 3) * 0.7;
    bits[n] = { x, y, z, vx: Math.cos(a) * out, vy: up, vz: Math.sin(a) * out, t: 1.3, spin: i };
    confetti.setColorAt(n, c.setHex(colors[i % colors.length]));
  }
  confetti.instanceColor!.needsUpdate = true;
}
let bitAt = 0;

// ---------- building it ----------
let built = false;
/** Builds the set, the first time it's needed. */
export function buildSet() {
  if (built) return;
  built = true;
  quietly(() => {
    buildStreet();
    shots = { spud: shotMesh('spud'), salt: shotMesh('salt'), chili: shotMesh('chili') };
    target = flat(new RingGeometry(0.9, 1, 40), 0xFFC34A);
    scene.add(target);
    confetti = new InstancedMesh(new BoxGeometry(0.14, 0.025, 0.09), new MeshLambertMaterial({ color: 0xFFFFFF }), CONFETTI);
    confetti.setColorAt(0, new Color(0xFFFFFF));
    confetti.count = 0;
    confetti.frustumCulled = false;
    scene.add(confetti);
  }, dice(0xA4CADE));
}

/** Dresses the chef as the player is now (their look may have changed since the last run). */
export function dressChef() {
  buildSet();
  if (!chef) chef = newChef();
  else quietly(() => chef!.p.restyle(player.g.color, player.g.style), dice(0xC4EF));
  chef.p.season = player.g.season;
  quietly(() => chef!.p.redress(), dice(0xC4EF));
}

// ---------- drawing a run ----------
const m4 = new Matrix4(), q = new Quaternion(), sv = new Vector3(), pv = new Vector3(), yAxis = V(0, 1, 0);

/** Points the camera at the chef (or the street's middle), at the screen's shape now. */
function aimCamera(dt: number, x: number, z: number) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight), portrait = aspect < 0.8;
  // (in on a wide screen, a phone held sideways above all, where everyone would be small; out on a tall one)
  const fov = portrait ? 46 : 40, k = portrait ? 1.3 : aspect > 1.6 ? 0.82 : 1;
  if (camera.aspect !== aspect || camera.fov !== fov) { camera.aspect = aspect; camera.fov = fov; camera.updateProjectionMatrix(); }
  // (it keeps a little in from the street's ends and pavements, but never so far that the chef's ticket goes off it)
  const tx = Math.max(-HW + 4, Math.min(HW - 4, x)), tz = Math.max(-HD + 2.5, Math.min(HD - 2.5, z));
  if (dt <= 0) follow.set(tx, 0, tz);
  else follow.lerp(sv.set(tx, 0, tz), Math.min(1, dt * 6));
  camera.position.copy(follow).addScaledVector(OFF, k);
  camera.lookAt(follow.x, 0.4, follow.z);
  camera.updateMatrixWorld();
}

/** Puts the camera straight onto the street's middle, or the chef if there's a run (no easing in). */
export function resetView(run: Run | null) {
  buildSet();
  aimCamera(0, run ? wx(run.player.x) : 0, run ? wz(run.player.y) : 0);
}

const faceTo = (o: Object3D, dx: number, dz: number, dt: number) => {
  if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
  const want = Math.atan2(dx, dz);
  let d = want - o.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  o.rotation.y += d * Math.min(1, dt * 12);
};

/** What the chef's doing this frame: where they aim (in the rules' units), and whether a dish is in hand to aim. */
export interface ChefView { aim: { x: number; y: number } | null }

/** The run the set shows now. */
let drawn: Run | null = null;
/** Clears the street of the last run: its zombies, shots, splats, dishes, zones, garnishes, confetti and the chef. */
function clearSet() {
  for (const b of bodies) { b.z = null; b.dying = 0; b.p.visible = b.ring.visible = b.meter.visible = false; }
  for (const s of splats) { s.t = 0; s.m.visible = false; }
  bits.length = 0;
  flying = new Set();
  for (const m of Object.values(shots!)) m.count = 0;
  confetti!.count = 0;
  for (const l of [plates, zones, herbs, puffs]) hideFrom(l, 0);
  target!.visible = false;
  if (chef) chef.p.visible = false;
}

/** Moves everything on the set to where `run` has it, `dt` seconds on (none before a run: just the empty street). */
export function drawSet(run: Run | null, dt: number, view: ChefView) {
  buildSet();
  if (run !== drawn) { clearSet(); drawn = run; }
  if (!run) { aimCamera(dt, 0, 0); return; }
  if (!chef) dressChef();
  const c = chef!, p = run.player, cx = wx(p.x), cz = wz(p.y);
  c.p.visible = true;
  aimCamera(dt, cx, cz);
  sun.castShadow = isHigh();

  // the chef: walks, turns to aim, holds the gun out ahead; a dish in hand goes up over the head
  const moved = Math.hypot(cx - c.p.position.x, cz - c.p.position.z);
  c.p.position.set(cx, 0, cz);
  const aim = view.aim;
  if (aim) faceTo(c.p, wx(aim.x) - cx, wz(aim.y) - cz, dt);
  animPerson(c.p, moved > 0.001, dt, false);
  c.p.arms[0].rotation.x = -1.45;
  const holding = !!run.serving;
  c.plate.visible = holding;
  if (holding) c.p.arms[1].rotation.x = run.serving!.ready ? -2.8 : -1.1;
  for (const [id, g] of Object.entries(c.guns)) g.visible = id === run.loadout.gun;
  if (holding) ((c.plate.children[1] as Mesh).material as MeshLambertMaterial).color.set(TASTES[DISHES[run.loadout.dishes[run.serving!.slot]].taste].color);

  drawZombies(run, dt);
  drawShots(run);
  drawThings(run, dt, view);
}

/** The zombies' bodies: each living zombie has one (the pool grows as it needs), the dead swell and pop. */
function drawZombies(run: Run, dt: number) {
  const playing = new Map<Zombie, Body>();
  for (const b of bodies) if (b.z) playing.set(b.z, b);
  const alive = new Set(run.zombies);
  // the gone: they swell and pop
  for (const b of bodies) {
    if (!b.z || alive.has(b.z)) continue;
    if (b.dying === 0) b.dying = 1e-6;
    b.dying += dt;
    const k = Math.min(1, b.dying / 0.22), s = (b.z.ticket ? BIG : 1) * (1 + 0.5 * k);
    b.p.scale.set(s, s * (1 - 0.15 * k), s);
    b.ring.visible = b.meter.visible = false;
    if (b.dying >= 0.22) {
      const z = b.z;
      pop(b.p.position.x, 0.8 * s, b.p.position.z, [z.coat ? Number.parseInt(TASTES[z.coat].color.slice(1), 16) : 0x9DB08A, 0xFFC34A, 0xF4F4F0, 0xE0392B, 0x6FA83A]);
      b.z = null; b.dying = 0; b.p.visible = false;
    }
  }
  for (const z of run.zombies) {
    let b = playing.get(z);
    if (!b) {
      b = bodies.find(o => !o.z) ?? (bodies.push(newBody()), bodies[bodies.length - 1]);
      b.z = z; b.dying = 0; b.look = '';
      b.p.visible = true;
      b.p.position.set(wx(z.x), 0, wz(z.y));
      b.p.rotation.y = Math.atan2(wx(run.player.x) - wx(z.x), wz(run.player.y) - wz(z.y));
    }
    drawZombie(b, z, run, dt);
  }
}

function drawZombie(b: Body, z: Zombie, run: Run, dt: number) {
  const x = wx(z.x), zz = wz(z.y), p = b.p;
  const dx = x - p.position.x, dz = zz - p.position.z, moving = Math.hypot(dx, dz) > 0.002;
  const size = z.ticket ? BIG : 1;
  p.scale.setScalar(size);
  b.bib.visible = !!z.ticket;
  // twitching: shaken on the spot; candied: stock still
  const shake = z.twitchT > 0 ? Math.sin(run.t * 90) * 0.05 : 0;
  p.position.set(x + shake, 0, zz);
  if (moving) faceTo(p, dx, dz, dt);
  if (z.freezeT <= 0) animPerson(p, moving, dt, true);
  // its tint: candied, or the taste it wears
  const look = z.freezeT > 0 ? 'candy' : z.coat ?? 'plain';
  if (look !== b.look) {
    b.look = look;
    const m = look === 'candy' ? tint('candy', '#f08bb0', 0.75) : look === 'plain' ? painted : tint(look, TASTES[look as Taste].color, 0.4);
    p.traverse(o => { if (o instanceof Mesh && !o.userData.gear) o.material = m; });
  }
  // the coat's ring at its feet, and how full a building taste's ring is
  const coat = z.coat;
  b.ring.visible = !!coat;
  b.meter.visible = !!coat && TASTES[coat].builds && z.meter > 0;
  if (coat) {
    const r = z.r * M, fade = 0.35 + 0.65 * Math.min(1, z.coatT);
    for (const m of [b.ring, b.meter]) {
      m.position.set(x, 0.03, zz);
      m.scale.setScalar(r);
      const mat = m.material as MeshBasicMaterial;
      mat.color.set(TASTES[coat].color);
      mat.opacity = fade;
    }
    b.meter.geometry = ARCS[Math.min(24, Math.round(z.meter * 24))];
  }
}

/** The shots in the air, and a splat where each one that hit landed. */
function drawShots(run: Run) {
  const now = new Set(run.shots);
  for (const s of flying) if (!now.has(s) && s.life === 0) splat(s.x, s.y, s.taste);
  flying = now;
  for (const [id, m] of Object.entries(shots!)) {
    if (id !== run.loadout.gun) { m.count = 0; continue; }
    const n = Math.min(MAX_SHOTS, run.shots.length);
    for (let i = 0; i < n; i++) {
      const s = run.shots[i];
      q.setFromAxisAngle(yAxis, Math.atan2(s.vx, s.vy) + i);
      m4.compose(pv.set(wx(s.x), 0.78, wz(s.y)), q, sv.set(1, id === 'spud' ? 0.85 : 1, id === 'spud' ? 1.3 : 1));
      m.setMatrixAt(i, m4);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  }
}

function drawThings(run: Run, dt: number, view: ChefView) {
  // splats fade
  for (const s of splats) {
    if (s.t <= 0) continue;
    s.t -= dt;
    s.m.visible = s.t > 0;
    (s.m.material as MeshBasicMaterial).opacity = Math.min(0.85, s.t / s.life * 1.4);
  }
  // dishes in the air: up in an arc from the chef to where they land
  run.thrown.forEach((th, i) => {
    const g = pool(plates, i, () => {
      const d = new Group();
      d.add(mesh(new CylinderGeometry(0.3, 0.24, 0.06, 16), 0xF4F4F0), mesh(new SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new MeshLambertMaterial(), 0, 0.02, 0));
      return d;
    });
    const k = 1 - th.t / 0.5;
    g.position.set(wx(th.fromX + (th.x - th.fromX) * k), 0.9 + Math.sin(k * Math.PI) * 2.6, wz(th.fromY + (th.y - th.fromY) * k));
    g.rotation.z = k * 6;
    ((g.children[1] as Mesh).material as MeshLambertMaterial).color.set(TASTES[DISHES[th.dish].taste].color);
  });
  hideFrom(plates, run.thrown.length);
  // where a dish in hand will land
  const ready = run.serving?.ready ? DISHES[run.loadout.dishes[run.serving.slot]] : null;
  target!.visible = !!ready && !!view.aim;
  if (ready && view.aim) {
    const p = run.player, d = Math.hypot(view.aim.x - p.x, view.aim.y - p.y), k = d > 420 ? 420 / d : 1;
    target!.position.set(wx(p.x + (view.aim.x - p.x) * k), 0.04, wz(p.y + (view.aim.y - p.y) * k));
    target!.scale.setScalar(ready.r * M);
    (target!.material as MeshBasicMaterial).opacity = 0.85;
  }
  // zones on the ground, breathing; on High, smoke rolls over a smoke cloud
  let puffN = 0;
  run.zones.forEach((zn, i) => {
    const m = pool(zones, i, () => flat(new CircleGeometry(1, 36)));
    m.visible = true;
    m.position.set(wx(zn.x), 0.025, wz(zn.y));
    m.scale.setScalar(zn.r * M);
    const mat = m.material as MeshBasicMaterial;
    mat.color.setHex(ZONE_COLOR[zn.kind]);
    mat.opacity = Math.min(1, zn.t) * (0.32 + 0.06 * Math.sin(run.t * 5 + i));
    if (zn.kind === 'smoke' && isHigh()) for (let j = 0; j < 6; j++) {
      const puff = pool(puffs, puffN++, () => new Mesh(new SphereGeometry(1, 10, 7), new MeshLambertMaterial({ color: 0x8A6AB8, transparent: true, depthWrite: false })));
      const a = run.t * 0.6 + j * 1.05, r = zn.r * M * 0.55;
      puff.position.set(wx(zn.x) + Math.cos(a) * r, 0.5 + 0.2 * Math.sin(run.t * 2 + j), wz(zn.y) + Math.sin(a) * r);
      puff.scale.setScalar(0.7 + 0.15 * Math.sin(run.t * 3 + j));
      (puff.material as MeshLambertMaterial).opacity = 0.45 * Math.min(1, zn.t);
    }
  });
  hideFrom(zones, run.zones.length);
  hideFrom(puffs, puffN);
  // garnishes: a sprig of herbs, bobbing and turning, waiting to be picked up
  run.garnishes.forEach((g, i) => {
    const h = pool(herbs, i, () => {
      const s = new Group();
      s.add(mesh(bakePainted([
        at(cyl, 0x3E7A34, 0, 0.15, 0, 0.02, 0.3, 0.02),
        ...[0, 2.1, 4.2].map(a => at(cone, 0x5DBB4A, Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08, 0.09, 0.22, 0.05, [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6])),
      ]), painted));
      return s;
    });
    h.position.set(wx(g.x), 0.25 + 0.08 * Math.sin(run.t * 4 + i), wz(g.y));
    h.rotation.y = run.t * 2 + i;
    h.scale.setScalar(Math.min(1, g.t) * 1.6);
  });
  hideFrom(herbs, run.garnishes.length);
  // confetti: thrown up, tumbling down, gone
  if (confetti) {
    let n = 0;
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      if (b.t <= 0) { m4.makeScale(0, 0, 0); confetti.setMatrixAt(i, m4); continue; }
      b.t -= dt; b.vy -= 9 * dt;
      b.x += b.vx * dt; b.y = Math.max(0.02, b.y + b.vy * dt); b.z += b.vz * dt;
      if (b.y <= 0.02) { b.vx *= 0.8; b.vz *= 0.8; b.vy = 0; }
      q.setFromAxisAngle(sv.set(1, 0.6, 0.3).normalize(), b.spin + run.t * 9);
      m4.compose(pv.set(b.x, b.y, b.z), q, sv.setScalar(Math.min(1, b.t * 2)));
      confetti.setMatrixAt(i, m4);
      n = i + 1;
    }
    confetti.count = n;
    confetti.instanceMatrix.needsUpdate = true;
  }
}

/** Draws the set (instead of the game's world, which isn't drawn under it). */
export function renderSet() {
  renderer.render(scene, camera);
}

// ---------- from the screen to the street and back ----------
const pj = new Vector3(), ray = new Raycaster(), ground = new Plane(V(0, 1, 0), 0), nd = new Vector2(), hitAt = new Vector3();
/** Where on the screen a point `h` metres over the rules' (x, y) is, in CSS pixels, and whether it's behind the camera. */
export function toScreen(x: number, y: number, h: number) {
  pj.set(wx(x), h, wz(y)).project(camera);
  return { x: (pj.x + 1) / 2 * window.innerWidth, y: (1 - pj.y) / 2 * window.innerHeight, behind: pj.z > 1 };
}
/** Where on the street (in the rules' units) the screen point (cx, cy) is, or null off it (above the horizon). */
export function toArena(cx: number, cy: number) {
  nd.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(nd, camera);
  if (!ray.ray.intersectPlane(ground, hitAt)) return null;
  return { x: hitAt.x / M + W / 2, y: hitAt.z / M + H / 2 };
}
/** How high over the street a zombie's head is, in metres (a special's is higher). */
export const headOf = (z: Zombie) => HEAD * (z.ticket ? BIG : 1) + 0.15;

/** For tests: what's on the set. */
export const setView = () => ({
  bodies: bodies.filter(b => b.z).length, made: bodies.length,
  looks: bodies.filter(b => b.z).map(b => b.look),
  splats: splats.filter(s => s.t > 0).length,
  confetti: bits.filter(b => b.t > 0).length,
  plates: plates.filter(p => p.visible).length, zones: zones.filter(z => z.visible).length,
  herbs: herbs.filter(h => h.visible).length, puffs: puffs.filter(p => p.visible).length,
  target: !!target?.visible, chef: chef?.p.position.clone() ?? null, shadows: sun.castShadow,
  shots: shots ? Object.values(shots).reduce((n, m) => n + m.count, 0) : 0,
});
