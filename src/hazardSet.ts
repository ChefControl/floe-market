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
  type Material, type Object3D, PerspectiveCamera, PlaneGeometry, Plane, Quaternion, Raycaster, RingGeometry, Scene, SphereGeometry, TorusGeometry,
  Vector2, Vector3,
} from 'three';
import { animPerson, Person } from './characters';
import { isHigh } from './graphics';
import { DISHES, H, HOLD_TIME, TASTES, W, ZONE_R, type Crate, type GunId, type Run, type Shot, type Taste, type Zombie } from './hazard';
import { QUARTER, U, type Block, type Shop, type Town } from './hazardMap';
import { dice, quietly } from './kit';
import { player } from './player';
import { bakePainted, canvasTex, FONT, G, mesh, painted, renderer, type Part } from './render';
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
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 13, bottom: -13, near: 1, far: 60 });
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

/** Where something on the map is in the set: the middle of its block, in metres. */
const mid = (b: Block) => ({ x: wx((b.x0 + b.x1) / 2), z: wz((b.y0 + b.y1) / 2), w: (b.x1 - b.x0) * M, d: (b.y1 - b.y0) * M });

/** What each shop's called on its sign, its colours (walls, the awning's stripe), and what's spilt out front. */
const SHOPS: Record<Shop, { name: string; wall: number; stripe: number; spilt: number[] }> = {
  grocery: { name: 'GROCERY 🍋', wall: 0x6E8B5A, stripe: 0x49C25B, spilt: [0xF2D23C, 0xE0392B, 0x6FA83A] },
  cafe: { name: 'CAFÉ ☕', wall: 0x8A6A52, stripe: 0xE8A33D, spilt: [0x4A2E1E, 0xF4EFE6] },
  butcher: { name: 'BUTCHER 🥩', wall: 0x9A4A44, stripe: 0xC0392B, spilt: [0xD96A6A, 0xF4EFE6] },
  bakery: { name: 'BAKERY 🥖', wall: 0xC9A66B, stripe: 0xF08BB0, spilt: [0xE0B070, 0xF4EFE6] },
  market: { name: 'SUPERMARKET 🛒', wall: 0x5A6E8A, stripe: 0x1E8FC0, spilt: [0xF2D23C, 0xE0392B, 0xB0724A, 0x7FC4E0] },
  any: { name: '', wall: 0x75695E, stripe: 0x8A939B, spilt: [] },
};

/** A shop's sign, its name on a board. */
function sign(text: string, w: number) {
  const ct = canvasTex(512, 96, (c, cw, ch) => {
    c.fillStyle = '#1B2430'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#FFF8EC'; c.font = `800 56px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch / 2 + 3);
  });
  return new Mesh(new PlaneGeometry(Math.min(w - 0.6, 5), Math.min(w - 0.6, 5) * 96 / 512), new MeshBasicMaterial({ map: ct.tex, transparent: true }));
}

/** The map's buildings, each its own mesh, to fade when it stands between the camera and the chef. */
const buildings: { g: Group; b: Block; mats: Material[]; k: number }[] = [];

/** A building, its front a smashed shop (an awning over it, its sign on it) and its other sides windowed. */
function building(b: Block, rnd: () => number) {
  const { x, z, w, d } = mid(b), h = b.h, look = SHOPS[b.shop ?? 'any'], parts: P[] = [];
  parts.push(at(box, look.wall, 0, h / 2, 0, w, h, d));
  parts.push(at(box, 0x4E555C, 0, h + 0.06, 0, w + 0.12, 0.14, d + 0.12));
  const front = b.face === 'n' ? -1 : 1, fz = front * (d / 2 + 0.02);
  // the front: a broken window band, a door, the awning in the shop's stripes
  parts.push(at(box, 0x1B2026, 0, 1.15, fz, w - 1.2, 1.5, 0.06));
  parts.push(at(box, 0x2A2E33, -w / 4, 1.05, fz + front * 0.02, 1, 2.1, 0.06));
  for (let ax = -w / 2 + 0.5; ax < w / 2 - 0.4; ax += 1) {
    parts.push(at(box, Math.round(ax + w) % 2 ? look.stripe : 0xF4EFE6, ax + 0.5, 2.25, fz + front * 0.45, 1, 0.06, 0.9, [front * 0.35, 0, 0]));
  }
  // round the sides and back: windows, some boarded up
  for (const side of [-1, 1]) for (let wy = 1.3; wy < h - 0.5; wy += 1.4) for (let wz = -d / 2 + 1; wz < d / 2 - 0.6; wz += 1.6) {
    parts.push(at(box, rnd() < 0.35 ? 0x8A6A44 : 0x1B2026, side * (w / 2 + 0.02), wy, wz, 0.06, 0.8, 0.7));
  }
  for (let wx2 = -w / 2 + 1; wx2 < w / 2 - 0.6; wx2 += 1.6) parts.push(at(box, rnd() < 0.35 ? 0x8A6A44 : 0x1B2026, wx2, 1.6, -fz, 0.7, 0.8, 0.06));
  const mat = painted.clone();
  const g = new Group();
  g.add(mesh(bakePainted(parts), mat, 0, 0, 0, true));
  const mats: Material[] = [mat];
  if (look.name) {
    const sg = sign(look.name, w);
    sg.position.set(0, 2.85, fz + front * 0.04);
    if (front < 0) sg.rotation.y = Math.PI;
    mats.push(sg.material as Material);
    g.add(sg);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  buildings.push({ g, b, mats, k: 1 });
}

/** Builds the food quarter (hazardMap.ts): the ground and everything low baked into one mesh, each building its own. */
function buildTown(town: Town) {
  const rnd = dice(0x5EE7);
  const parts: P[] = [];
  const W2 = town.w * M, H2 = town.h * M;
  // the ground beyond, the asphalt, the pavements round the buildings
  parts.push(at(box, 0x2B3036, 0, -0.08, 0, W2 + 60, 0.1, H2 + 50));
  parts.push(at(box, 0x3A434C, 0, -0.02, 0, W2, 0.04, H2));
  // the streets running on out past the barricades, where the van pulls up
  parts.push(at(box, 0x3A434C, 0, -0.02, wz(20 * U), W2 + 30, 0.04, 6), at(box, 0x3A434C, wx(32 * U), -0.02, 0, 6, 0.04, H2 + 30));
  for (const b of town.blocks) if (b.kind === 'building') {
    const { x, z, w, d } = mid(b);
    parts.push(at(box, 0x6E7882, x, -0.012, z, w + 3, 0.04, d + 3));
    parts.push(at(box, 0x8A939B, x, -0.009, z, w + 3.16, 0.04, d + 3.16));
  }
  // the streets' dashes, a zebra crossing at the crossroads, the car park's bays
  for (let x = 1.5; x < 62; x += 3) if (Math.abs(x - 32) > 4) parts.push(at(box, 0xC9A66B, wx(x * U), 0.004, wz(20 * U), 1.6, 0.02, 0.18));
  for (let y = 1.5; y < 39; y += 3) if (Math.abs(y - 20) > 4) parts.push(at(box, 0xC9A66B, wx(32 * U), 0.004, wz(y * U), 0.18, 0.02, 1.6));
  for (let k = 0; k < 6; k++) {
    parts.push(at(box, 0xE8E4DA, wx((29.6 + k) * U), 0.005, wz(16.4 * U), 0.5, 0.02, 1.2));
    parts.push(at(box, 0xE8E4DA, wx((29.6 + k) * U), 0.005, wz(23.6 * U), 0.5, 0.02, 1.2));
  }
  for (let x = 21; x <= 28; x += 2.5) parts.push(at(box, 0xE8E4DA, wx(x * U), 0.005, wz(28 * U), 0.1, 0.02, 4));
  // cracks and patches
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W2 - W2 / 2, z = rnd() * H2 - H2 / 2;
    parts.push(rnd() < 0.7
      ? at(box, 0x262C31, x, 0.006, z, 0.6 + rnd() * 1.6, 0.02, 0.05, [0, rnd() * Math.PI, 0])
      : at(box, 0x323A42, x, 0.005, z, 0.8 + rnd(), 0.02, 0.6 + rnd() * 0.8, [0, rnd() * 0.4, 0]));
  }
  for (const b of town.blocks) {
    const { x, z, w, d } = mid(b);
    if (b.kind === 'building') {
      building(b, rnd);
      // what's spilt out of the shop on to the pavement
      const front = b.face === 'n' ? -1 : 1;
      for (const c of SHOPS[b.shop ?? 'any'].spilt) for (let k = 0; k < 4; k++) {
        parts.push(at(G.sphere, c, x + (rnd() - 0.5) * w, 0.08, z + front * (d / 2 + 0.4 + rnd() * 1), 0.1 + rnd() * 0.06, 0.08, 0.1 + rnd() * 0.06));
      }
    } else if (b.kind === 'wall') {
      parts.push(at(box, 0x8A5A44, x, b.h / 2, z, w, b.h, d));
      parts.push(at(box, 0x6E4A38, x, b.h + 0.06, z, w + 0.1, 0.12, d + 0.1));
    } else if (b.kind === 'car') car(parts, x, z, w > d ? 0 : Math.PI / 2, rnd);
    else if (b.h < 0.95 && w < 1.2) {
      // a bin knocked over, its rubbish out
      parts.push(at(cyl, 0x3F6B4A, x, 0.32, z, 0.32, 0.9, 0.32, [Math.PI / 2, 0, rnd() * 2]));
      parts.push(at(box, 0x5B4B3A, x + 0.5, 0.03, z + 0.2, 0.7, 0.04, 0.5, [0, rnd(), 0]));
    } else if (w > 2.5 && d > 2.5) {
      // the dry fountain: its basin, broken, and the column in the middle
      parts.push(at(cyl, 0x9AA4AC, x, 0.4, z, w / 2, 0.8, d / 2));
      parts.push(at(cyl, 0x5E666E, x, 0.82, z, w / 2 - 0.3, 0.06, d / 2 - 0.3));
      parts.push(at(cyl, 0x9AA4AC, x, 1.3, z, 0.3, 1.8, 0.3));
    } else {
      // a barricade across a street's end: concrete blocks, striped
      const along = w > d, n = Math.max(1, Math.round((along ? w : d) / 2));
      for (let k = 0; k < n; k++) {
        const o = -((along ? w : d) / 2) + (k + 0.5) * (along ? w : d) / n;
        parts.push(at(box, 0x8A9096, x + (along ? o : 0), 0.45, z + (along ? 0 : o), along ? 1.8 : 0.5, 0.9, along ? 0.5 : 1.8));
        parts.push(at(box, 0xE8742A, x + (along ? o : 0), 0.7, z + (along ? 0 : o), along ? 1.82 : 0.52, 0.14, along ? 0.52 : 1.82));
      }
    }
  }
  // cones and lamp posts along Market Street
  for (const [x, y] of [[30.2, 15], [35.5, 25.2], [14, 22.5], [44, 17.6], [56, 22.8]]) {
    parts.push(at(cone, 0xF07A2A, wx(x * U), 0.3, wz(y * U), 0.22, 0.6, 0.22));
    parts.push(at(cyl, 0xF4F4F0, wx(x * U), 0.3, wz(y * U), 0.12, 0.08, 0.12));
  }
  for (let x = 6; x < 62; x += 12) for (const y of [16.6, 23.4]) {
    const lean = rnd() < 0.3 ? 0.35 : 0;
    parts.push(at(cyl, 0x5E666E, wx(x * U), 1.7, wz(y * U), 0.07, 3.4, 0.07, [0, 0, lean]));
  }
  scene.add(mesh(bakePainted(parts), painted, 0, 0, 0, true));
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

// ---------- the run's crates, the safe zone and the van ----------
interface CrateLook { g: Group; lid: Mesh; c: Crate; opened: boolean }
let crateLooks: CrateLook[] = [];
const CRATE_LOOK = { food: [0x9C7A4C, 0x6E5434], ammo: [0x5B6B3A, 0xF2C14E], gold: [0xE3B23C, 0xFFF1B0] } as const;
/** The run's crates: closed, or open with the lid off to one side. */
function buildCrates(run: Run) {
  for (const l of crateLooks) scene.remove(l.g);
  crateLooks = quietly(() => run.crates.map(c => {
    const [col, band] = CRATE_LOOK[c.kind], g = new Group();
    g.add(mesh(bakePainted([
      at(box, col, 0, 0.3, 0, 0.9, 0.6, 0.7), at(box, band, 0, 0.3, 0, 0.92, 0.1, 0.72), at(box, 0x1B2026, 0, 0.6, 0, 0.8, 0.02, 0.6),
    ]), painted, 0, 0, 0, true));
    const lid = mesh(bakePainted([at(box, col, 0, 0, 0, 0.94, 0.08, 0.74), at(box, band, 0, 0, 0, 0.2, 0.09, 0.76)]), painted, 0, 0.64, 0, true);
    g.add(lid);
    g.position.set(wx(c.x), 0, wz(c.y));
    g.rotation.y = (c.id * 1.3) % 0.6 - 0.3;
    scene.add(g);
    return { g, lid, c, opened: false };
  }), dice(0xC7A7E));
}

/** The safe zone: its ring on the ground, how much of the hold is done round it, and the radio mast with its light. */
const ZONE_ARCS = Array.from({ length: 49 }, (_, i) => new RingGeometry(1.04, 1.14, 64, 1, Math.PI / 2 - (i / 48) * Math.PI * 2, (i / 48) * Math.PI * 2));
let zoneLook: { ring: Mesh; arc: Mesh; mast: Group; light: Mesh } | null = null;
function buildZone() {
  zoneLook = quietly(() => {
    const ring = flat(new RingGeometry(0.94, 1, 64), 0x7FC4E0), arc = flat(ZONE_ARCS[0], 0xFFC34A);
    const mast = new Group(), legs: P[] = [];
    for (const [lx, lz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) legs.push(at(cyl, 0x9AA4AC, lx * 0.6, 3.5, lz * 0.6, 0.04, 7, 0.04));
    for (let y = 0.8; y < 7; y += 0.9) legs.push(at(box, 0x9AA4AC, 0, y, 0, 0.42, 0.04, 0.42));
    legs.push(at(box, 0xE8E4DA, 0.3, 5.6, 0, 0.12, 0.7, 0.5), at(box, 0x5E666E, 0, 0.1, 0, 1.2, 0.2, 1.2));
    mast.add(mesh(bakePainted(legs), painted, 0, 0, 0, true));
    const light = new Mesh(new SphereGeometry(0.16, 10, 8), new MeshBasicMaterial({ color: 0xFF3B30 }));
    light.position.y = 7.1;
    mast.add(light);
    scene.add(ring, arc, mast);
    return { ring, arc, mast, light };
  }, dice(0x2A0E));
}

/** The van: cream with a blue stripe, its back doors open to let the chef out (or in). */
let van: {
  g: Group; doors: Group[]; mode: 'gone' | 'drop' | 'leave' | 'arrive' | 'wait'; t: number;
  /** Where it is and the way it faces; and the way it goes when it leaves (on ahead, or backing out). */
  x: number; z: number; dx: number; dz: number; lx: number; lz: number;
} | null = null;
function buildVan() {
  van = quietly(() => {
    const g = new Group(), body: P[] = [
      at(box, 0xF4EFE6, 0, 1.15, -0.3, 2, 1.7, 3.6), at(box, 0xF4EFE6, 0, 0.85, 1.85, 1.9, 1.1, 0.9),
      at(box, 0x1B2026, 0, 1.55, 1.55, 1.8, 0.6, 0.06, [-0.5, 0, 0]),
      at(box, 0x1E8FC0, 0, 1.0, -0.3, 2.02, 0.22, 3.62), at(box, 0x2A2E33, 0, 0.32, 0, 2.06, 0.22, 4.5),
      at(box, 0xFFF1B0, 0.7, 0.85, 2.31, 0.3, 0.16, 0.04), at(box, 0xFFF1B0, -0.7, 0.85, 2.31, 0.3, 0.16, 0.04),
    ];
    for (const [lx, lz] of [[0.95, 1.4], [-0.95, 1.4], [0.95, -1.4], [-0.95, -1.4]]) body.push(at(cyl, 0x1E2124, lx, 0.36, lz, 0.36, 0.26, 0.36, [0, 0, Math.PI / 2]));
    g.add(mesh(bakePainted(body), painted, 0, 0, 0, true));
    const doors = [-1, 1].map(s => {
      const hinge = new Group();
      hinge.position.set(s * 0.98, 0, -2.1);
      hinge.add(mesh(bakePainted([at(box, 0xF4EFE6, -s * 0.49, 1.15, 0, 0.98, 1.6, 0.06), at(box, 0x1E8FC0, -s * 0.49, 1.0, -0.01, 0.98, 0.22, 0.06)]), painted, 0, 0, 0, true));
      g.add(hinge);
      return hinge;
    });
    g.visible = false;
    scene.add(g);
    return { g, doors, mode: 'gone' as const, t: 0, x: 0, z: 0, dx: 0, dz: 1, lx: 0, lz: 1 };
  }, dice(0x7A4));
}
/** Puts the van at (x, z) facing (dx, dz), its doors open by `open` (0 to 1). */
function placeVan(x: number, z: number, dx: number, dz: number, open: number) {
  const v = van!;
  v.g.visible = true;
  v.g.position.set(x, 0, z);
  v.g.rotation.y = Math.atan2(dx, dz);
  v.doors.forEach((d, i) => { d.rotation.y = (i ? 1 : -1) * -open * 1.9; });
}

/** The van: parked at the drop-off with its doors open while the chef hops out, then driving off; screeching into the
 *  safe zone when the hold's done, waiting with its doors open, and driving off again if it's missed. */
function drawVan(run: Run, dt: number) {
  const v = van!, z = run.zone, drop = run.drop;
  v.t += dt;
  // (got in: it's there at the zone, doors shut)
  if (run.extracted) { placeVan(wx(z.x), wz(z.y), -z.from.x, -z.from.y, 0); return; }
  if (run.dropT > 0) {
    v.mode = 'drop'; v.x = wx(drop.x); v.z = wz(drop.y); v.dx = v.lx = drop.dir.x; v.dz = v.lz = drop.dir.y;
  } else if (v.mode === 'drop') { v.mode = 'leave'; v.t = 0; }
  if (run.stage === 'van' && v.mode !== 'arrive' && v.mode !== 'wait') {
    v.mode = 'arrive'; v.t = 0; v.dx = -z.from.x; v.dz = -z.from.y; v.lx = z.from.x; v.lz = z.from.y; v.x = wx(z.x); v.z = wz(z.y);
  } else if (run.stage !== 'van' && !run.extracted && (v.mode === 'arrive' || v.mode === 'wait')) { v.mode = 'leave'; v.t = 0; }
  if (v.mode === 'arrive' && v.t >= 0.9) v.mode = 'wait';
  if (v.mode === 'leave' && v.t >= 2.2) v.mode = 'gone';
  if (v.mode === 'gone') { v.g.visible = false; return; }
  if (v.mode === 'drop' || v.mode === 'wait') { placeVan(v.x, v.z, v.dx, v.dz, 1); return; }
  if (v.mode === 'arrive') {
    // in fast from where it comes, braking hard, its back swinging round a little
    const k = 1 - (1 - v.t / 0.9) ** 3, back = 14 * (1 - k);
    placeVan(v.x - v.dx * back, v.z - v.dz * back, v.dx + v.dz * 0.25 * (1 - k), v.dz - v.dx * 0.25 * (1 - k), 0);
    return;
  }
  // off, faster and faster: on ahead from the drop-off, backing out the way it came from the safe zone
  const go = v.t * v.t * 3;
  placeVan(v.x + v.lx * go, v.z + v.lz * go, v.dx, v.dz, 0);
}

/** The safe zone's ring and mast: the ring turns gold and fills round as the hold goes, red while the chef's out of it. */
function drawZone(run: Run) {
  const l = zoneLook!, z = run.zone, x = wx(z.x), zz = wz(z.y), r = ZONE_R * M;
  l.ring.visible = true;
  l.ring.position.set(x, 0.035, zz);
  l.ring.scale.setScalar(r);
  const out = run.stage === 'hold' && Math.hypot(run.player.x - z.x, run.player.y - z.y) > ZONE_R;
  const ringMat = l.ring.material as MeshBasicMaterial;
  ringMat.color.setHex(run.stage === 'run' ? 0x7FC4E0 : out ? 0xE0392B : 0xFFC34A);
  ringMat.opacity = 0.75 + 0.25 * Math.sin(run.t * 5);
  l.arc.visible = run.stage === 'hold';
  l.arc.position.set(x, 0.04, zz);
  l.arc.scale.setScalar(r);
  l.arc.geometry = ZONE_ARCS[Math.round(48 * (1 - Math.max(0, run.holdT) / HOLD_TIME))];
  (l.arc.material as MeshBasicMaterial).opacity = 0.9;
  // (on the ring's far side, standing up in view)
  l.mast.position.set(x, 0, zz - r - 0.6);
  l.light.visible = Math.floor(run.t * 2) % 2 === 0;
}

/** Buildings between the camera and the chef fade, so the chef's never lost behind one. */
function fadeBuildings(run: Run, dt: number) {
  const p = run.player;
  for (const f of buildings) {
    const b = f.b, south = (b.y0 - p.y) * M;
    const hide = p.x > b.x0 - U && p.x < b.x1 + U && south > -0.3 && south < (b.h - 0.6) / 1.15;
    const k = f.k + ((hide ? 0.28 : 1) - f.k) * Math.min(1, dt > 0 ? dt * 8 : 1);
    if (k === f.k) continue;
    f.k = k;
    for (const m of f.mats) {
      const see = k < 0.995;
      if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
      m.opacity = see ? k : 1;
      m.depthWrite = !see;
    }
  }
}

// ---------- building it ----------
let built = false;
/** Builds the set, the first time it's needed. */
export function buildSet() {
  if (built) return;
  built = true;
  quietly(() => {
    buildTown(QUARTER);
    buildZone();
    buildVan();
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
  // (the sun's shadows only need to cover what's in view)
  sun.position.set(follow.x - 9, 20, follow.z + 9);
  sun.target.position.copy(follow);
  sun.target.updateMatrixWorld();
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
  for (const l of crateLooks) scene.remove(l.g);
  crateLooks = [];
  zoneLook!.ring.visible = zoneLook!.arc.visible = false;
  zoneLook!.mast.position.set(0, -50, 0);
  van!.mode = 'gone'; van!.g.visible = false;
}

/** Moves everything on the set to where `run` has it, `dt` seconds on (none before a run: just the empty street). */
export function drawSet(run: Run | null, dt: number, view: ChefView) {
  buildSet();
  if (run !== drawn) { clearSet(); drawn = run; if (run) buildCrates(run); }
  if (!run) { aimCamera(dt, 0, 0); return; }
  if (!chef) dressChef();
  const c = chef!, p = run.player;
  let cx = wx(p.x), cz = wz(p.y);
  // hopping out of the van at the drop-off; gone into it at the end
  c.p.visible = run.dropT <= 1 && !run.extracted;
  if (run.dropT > 0) {
    const k = 1 - run.dropT, door = { x: wx(run.drop.x) - run.drop.dir.x * 2.4, z: wz(run.drop.y) - run.drop.dir.y * 2.4 };
    cx = door.x + (cx - door.x) * k; cz = door.z + (cz - door.z) * k;
  }
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

  // (over the barricade)
  if (run.dropT > 0) c.p.position.y = Math.sin(Math.min(1, 1 - run.dropT) * Math.PI) * 1.2;
  drawZombies(run, dt);
  drawShots(run);
  drawThings(run, dt, view);
  drawZone(run);
  drawVan(run, dt);
  fadeBuildings(run, dt);
  // crates: the lid comes off as one opens
  for (const l of crateLooks) if (l.c.open && !l.opened) {
    l.opened = true;
    l.lid.position.set(0.62, 0.05, 0.25);
    l.lid.rotation.set(0, 0.5, 0.25);
  }
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
  van: van?.mode, faded: buildings.filter(b => b.k < 0.9).length, lids: crateLooks.filter(l => l.opened).length,
  shots: shots ? Object.values(shots).reduce((n, m) => n + m.count, 0) : 0,
});
