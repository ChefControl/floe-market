// Cooking Hazard's safe house in 3D: the room between runs (hazardPlay.ts opens its panels, hazardHouse.ts keeps what's
// in it). A scene and a camera of their own, drawn by the game's renderer like the street (render.ts takeover): a
// lamplit back room with its stations in a row along the back wall, each under its sign. The Stove, the Oven, the Pantry
// shelves, the armory's gun rack, the recipe book on its stand, and the van, nosed in through the roller door on the
// right. A kitchen that's still shut (no cookware for it yet) stands under a dust sheet. The camera looks over the whole
// room, and comes in on a station when it's picked, keeping it clear of the panel on the right.
import {
  BoxGeometry, type BufferGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  type Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Raycaster, Scene, Vector2, Vector3,
} from 'three';
import { isHigh } from './graphics';
import { COUNTERS, counterOpen, type CounterId } from './hazardHouse';
import { dice, quietly } from './kit';
import { bakePainted, canvasTex, FONT, mesh, painted, renderer, type Part } from './render';
import { V } from './util';

export type StationId = CounterId | 'armory' | 'book' | 'van';
/** The stations, in their keys' order (1 to 6), each with its sign and where it stands on the floor (metres). */
export const STATIONS: Record<StationId, { name: string; icon: string; x: number; z: number }> = {
  stove: { name: COUNTERS.stove.name, icon: COUNTERS.stove.icon, x: -5.2, z: -2.6 },
  oven: { name: COUNTERS.oven.name, icon: COUNTERS.oven.icon, x: -3, z: -2.6 },
  pantry: { name: COUNTERS.pantry.name, icon: COUNTERS.pantry.icon, x: -0.8, z: -2.7 },
  armory: { name: 'Armory', icon: '🛡️', x: 1.5, z: -2.7 },
  book: { name: 'Recipe book', icon: '🍽️', x: 3.5, z: -2.4 },
  van: { name: 'Van', icon: '🚗', x: 6.5, z: 1.3 },
};
export const STATION_IDS = Object.keys(STATIONS) as StationId[];

// ---------- the scene ----------
const WALL = 0x5B4A3E;
const scene = new Scene();
scene.background = new Color(0x1E1A17);
scene.add(new HemisphereLight(0xFFE8C8, 0x3A2E26, 0.62 * Math.PI));
const key = new DirectionalLight(0xFFE2B8, 0.5 * Math.PI);
key.position.set(-4, 9, 7);
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 30 });
key.shadow.bias = -0.0006;
scene.add(key, key.target);
const lamp = new PointLight(0xFFC27A, 18, 12, 1.6);
lamp.position.set(0, 3.4, -0.6);
scene.add(lamp);

export const camera = new PerspectiveCamera(42, 1, 0.1, 60);
/** Where the camera looks over the whole room from, and at. */
const WIDE = { at: V(0.2, 0.9, -0.6), from: V(0.2, 7.4, 11.2) };
const look = { at: WIDE.at.clone(), from: WIDE.from.clone() };
const sv = new Vector3();

const box = new BoxGeometry(1, 1, 1), cyl = new CylinderGeometry(1, 1, 1, 14);
type P = Part & { c: number };
const at = (geo: BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rot?: P['rot']): P =>
  ({ geo, c, at: [x, y, z], scale: [sx, sy, sz], rot });
const baked = (parts: P[], x: number, z: number) => mesh(bakePainted(parts), painted, x, 0, z, true);

/** A station's sign, its icon and name on a dark board. */
function sign(text: string) {
  const ct = canvasTex(512, 112, (c, cw, ch) => {
    c.fillStyle = '#1B2430'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#FFF8EC'; c.font = `800 58px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch / 2 + 3);
  });
  return new Mesh(new PlaneGeometry(1.7, 1.7 * 112 / 512), new MeshBasicMaterial({ map: ct.tex, transparent: true }));
}

/** What each station's made of, built round its own middle. */
const LOOKS: Record<StationId, () => P[]> = {
  stove: () => [
    at(box, 0x6E7479, 0, 0.45, 0, 1.8, 0.9, 0.9), at(box, 0x2A2E33, 0, 0.92, 0, 1.8, 0.06, 0.9),
    ...[-0.45, 0.45].map(x => at(cyl, 0x15181B, x, 0.97, 0, 0.26, 0.04, 0.26)),
    at(cyl, 0x8A8F94, -0.45, 1.2, 0, 0.3, 0.42, 0.3), at(cyl, 0x2A2E33, 0.45, 1.02, 0, 0.32, 0.06, 0.32),
    at(box, 0x2A2E33, 0.95, 1.02, 0, 0.5, 0.04, 0.08),
    ...[-0.6, 0, 0.6].map(x => at(cyl, 0xD9C27A, x, 0.6, 0.47, 0.05, 0.05, 0.05, [Math.PI / 2, 0, 0])),
  ],
  oven: () => [
    at(box, 0x8A4A2E, 0, 0.75, 0, 1.6, 1.5, 0.95), at(box, 0x15181B, 0, 0.7, 0.48, 1.1, 0.6, 0.02),
    at(box, 0xFFB24A, 0, 0.7, 0.485, 0.9, 0.4, 0.01), at(box, 0xD9C27A, 0, 1.08, 0.52, 0.8, 0.05, 0.05),
    at(box, 0x4E555C, 0, 1.55, 0, 1.7, 0.1, 1), at(cyl, 0x4E555C, 0.5, 2.1, -0.2, 0.12, 1, 0.12),
  ],
  pantry: () => [
    at(box, 0x7A5A3A, 0, 1.1, -0.1, 1.8, 2.2, 0.06),
    ...[0.15, 0.75, 1.35, 1.95].map(y => at(box, 0x8A6A44, 0, y, 0.15, 1.8, 0.06, 0.55)),
    ...[-0.6, -0.2, 0.25, 0.6].flatMap((x, i) => [
      at(cyl, [0xE0392B, 0x6FA83A, 0xF2C14E, 0x9C7A4C][i], x, 0.95, 0.15, 0.13, 0.36, 0.13),
      at(cyl, [0x9C7A4C, 0xF4F4F0, 0x6A3FA0, 0xE0392B][i], x + 0.1, 1.55, 0.15, 0.12, 0.34, 0.12),
    ]),
    at(cyl, 0xA7B394, -0.4, 0.35, 0.15, 0.22, 0.34, 0.22), at(cyl, 0xC9A66B, 0.4, 0.33, 0.15, 0.25, 0.3, 0.25),
  ],
  armory: () => [
    at(box, 0x4E555C, 0, 1.1, -0.1, 1.9, 2.2, 0.08),
    ...[0.6, 1.2, 1.8].map(y => at(box, 0x2A2E33, 0, y, 0.02, 1.8, 0.05, 0.12)),
    at(box, 0x8A6A44, -0.5, 1.28, 0.1, 0.6, 0.1, 0.12), at(box, 0xD9C27A, -0.86, 1.28, 0.1, 0.1, 0.07, 0.08),
    at(box, 0x7A848C, 0.2, 1.88, 0.1, 0.7, 0.12, 0.13), at(box, 0xC0392B, 0.45, 0.68, 0.1, 0.6, 0.14, 0.13),
    at(box, 0x5B6B3A, -0.2, 0.22, 0.3, 0.9, 0.44, 0.5), at(box, 0xF2C14E, -0.2, 0.3, 0.56, 0.5, 0.08, 0.02),
  ],
  book: () => [
    at(cyl, 0x5C4030, 0, 0.55, 0, 0.08, 1.1, 0.08), at(box, 0x5C4030, 0, 0.04, 0, 0.6, 0.08, 0.5),
    at(box, 0x6E5434, 0, 1.12, 0, 0.7, 0.06, 0.5, [0.45, 0, 0]),
    at(box, 0xF4EFE6, -0.16, 1.17, 0.02, 0.32, 0.03, 0.42, [0.45, 0, 0.06]), at(box, 0xF4EFE6, 0.16, 1.17, 0.02, 0.32, 0.03, 0.42, [0.45, 0, -0.06]),
    at(box, 0xC0392B, 0, 1.18, 0.03, 0.02, 0.035, 0.42, [0.45, 0, 0]),
  ],
  van: () => [
    at(box, 0xE8E2D6, 0, 0.95, 0, 2.1, 1.5, 3.8), at(box, 0xE8E2D6, 0, 0.75, -2.3, 2.1, 1.1, 0.9),
    at(box, 0x15181B, 0, 1.15, -2.4, 1.9, 0.5, 0.75), at(box, 0xC0392B, 1.06, 1.05, 0.4, 0.02, 0.3, 2.6),
    at(box, 0xC0392B, -1.06, 1.05, 0.4, 0.02, 0.3, 2.6), at(box, 0x2A2E33, 0, 0.95, 1.91, 1.9, 1.3, 0.02),
    ...[[0.95, 1.2], [-0.95, 1.2], [0.95, -2], [-0.95, -2]].map(([x, z]) => at(cyl, 0x1E2124, x, 0.32, z, 0.32, 0.22, 0.32, [0, 0, Math.PI / 2])),
  ],
};

/** The stations as built: their meshes (to pick with the mouse) and the dust sheets over the kitchens still shut. */
const built: Partial<Record<StationId, { g: Group; sheet: Mesh | null; signMesh: Mesh }>> = {};
let made = false;
function build() {
  if (made) return;
  made = true;
  quietly(() => {
    const room: P[] = [
      at(box, 0x6B5644, 0, -0.05, -0.5, 14, 0.1, 9), at(box, WALL, 0, 1.8, -3.6, 14, 3.6, 0.2),
      at(box, WALL, -7, 1.8, -0.5, 0.2, 3.6, 9), at(box, WALL, 7, 1.8, -3.1, 0.2, 3.6, 1),
      at(box, WALL, 7, 3.2, 0.5, 0.2, 0.8, 6.2), at(box, 0x8A8F94, 7, 2.68, 0.5, 0.3, 0.24, 4.6),
      at(box, 0x4A3A30, 0, 0.12, -3.48, 14, 0.24, 0.05),
      // a rug, and the floorboards' seams
      at(box, 0x8A3A2E, 0.4, 0.005, 0.6, 4.6, 0.01, 2.6), at(box, 0xC9A66B, 0.4, 0.008, 0.6, 4.2, 0.01, 2.2),
      ...[-5, -3, -1, 1, 3, 5].map(x => at(box, 0x5C4838, x, 0.002, -0.5, 0.03, 0.01, 9)),
    ];
    scene.add(baked(room, 0, 0));
    for (const id of STATION_IDS) {
      const s = STATIONS[id], g = new Group();
      g.add(baked(LOOKS[id](), 0, 0));
      if (id === 'van') g.rotation.y = Math.PI / 2;
      g.position.set(s.x, 0, s.z);
      g.userData.station = id;
      scene.add(g);
      const signMesh = sign(`${s.icon} ${s.name}`);
      signMesh.position.set(s.x, id === 'van' ? 3.05 : 2.75, id === 'van' ? s.z : -3.45);
      if (id === 'van') { signMesh.position.x = 6.86; signMesh.rotation.y = -Math.PI / 2; }
      scene.add(signMesh);
      const sheet = id === 'oven' || id === 'pantry' ? mesh(box, 0xC9C2B4, s.x, 0.85, s.z + 0.05, true) : null;
      if (sheet) { sheet.scale.set(1.95, 1.75, 1.15); scene.add(sheet); }
      built[id] = { g, sheet, signMesh };
    }
  }, dice(0x5AFE));
}

/** Shows the kitchens open now (their dust sheets come off). */
function dressKitchens() {
  for (const c of ['oven', 'pantry'] as const) {
    const b = built[c]!;
    b.sheet!.visible = !counterOpen(c);
    b.g.visible = counterOpen(c);
  }
}

/** The station the camera's on (null: the whole room). */
let focus: StationId | null = null;
/** Comes in on a station (or back out over the room, for null): it eases there as the room's drawn. */
export function focusOn(id: StationId | null) { focus = id; }

function aim(dt: number) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight), portrait = aspect < 0.8;
  const fov = portrait ? 58 : 42;
  if (camera.aspect !== aspect || camera.fov !== fov) { camera.aspect = aspect; camera.fov = fov; camera.updateProjectionMatrix(); }
  // (the whole room's width in view: further back on a narrower screen)
  const k = Math.max(1, 1.45 / aspect);
  let to = { at: WIDE.at, from: sv.copy(WIDE.from).sub(WIDE.at).multiplyScalar(k).add(WIDE.at) };
  if (focus) {
    const s = STATIONS[focus];
    // (the panel's on the right, so the station sits in the left of the screen; the van's seen from the room)
    const side = portrait ? 0 : 1.1;
    to = focus === 'van'
      ? { at: V(s.x - 1.2, 0.9, s.z + side * 0.6), from: V(s.x - 6.2, 3.8, s.z + 4.6 + side) }
      : { at: V(s.x + side, 1, s.z), from: V(s.x + side, 3.3, s.z + 5 + (portrait ? 1.4 : 0)) };
  }
  const ease = dt <= 0 ? 1 : Math.min(1, dt * 5);
  look.at.lerp(to.at, ease); look.from.lerp(to.from, ease);
  camera.position.copy(look.from);
  camera.lookAt(look.at);
  camera.updateMatrixWorld();
}

/** Moves the room on `dt` seconds (0: straight to where the camera's going). */
export function drawRoom(dt: number) {
  build();
  dressKitchens();
  key.castShadow = isHigh();
  aim(dt);
}

/** Draws the room (instead of the game's world). */
export function renderRoom() {
  renderer.render(scene, camera);
}

const ray = new Raycaster(), nd = new Vector2();
/** The station under the screen point (cx, cy), if there is one. */
export function stationAt(cx: number, cy: number): StationId | null {
  build();
  // (where everything is, in case the room hasn't been drawn since it was built)
  scene.updateMatrixWorld();
  nd.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(nd, camera);
  const targets: Object3D[] = STATION_IDS.flatMap(id => [built[id]!.g, built[id]!.sheet, built[id]!.signMesh].filter((o): o is Group | Mesh => !!o));
  for (const hit of ray.intersectObjects(targets, true)) {
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      for (const id of STATION_IDS) if (o === built[id]!.g || o === built[id]!.sheet || o === built[id]!.signMesh) return id;
    }
  }
  return null;
}

/** Where on the screen a station's middle is (for the tests), in CSS pixels. */
export function stationOnScreen(id: StationId) {
  build();
  const s = STATIONS[id], p = new Vector3(s.x, 1, s.z).project(camera);
  return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight };
}

/** For tests: what the room shows. */
export const roomView = () => ({
  focus, sheets: (['oven', 'pantry'] as const).filter(c => built[c]?.sheet?.visible).length, shadows: key.castShadow,
});
