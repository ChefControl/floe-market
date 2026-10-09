import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ColorManagement, ConeGeometry, CylinderGeometry,
  DirectionalLight, Euler, Fog, HemisphereLight, LinearSRGBColorSpace, Material, Matrix4, Mesh, MeshLambertMaterial, PCFShadowMap,
  PerspectiveCamera, Quaternion, Scene, SphereGeometry, TorusGeometry, Vector3, WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './boot'; // before anything's built: the scene is built the same on every device (co-op)
import { V } from './util';

// ---------- renderer / scene ----------
// The art was tuned for three.js' pre-r152 color pipeline: hex colors and canvas textures used as-is,
// no sRGB output encoding. Keep it that way. This must run before any Color is created.
ColorManagement.enabled = false;

export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = LinearSRGBColorSpace;
// the fish on the chopping block is cut with a clipping plane (fishing.ts)
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

export const scene = new Scene();
scene.background = new Color(0xCFEAF5);
export const fog = new Fog(0xCFEAF5, 34, 70);
scene.fog = fog;

export const camera = new PerspectiveCamera(40, 1, 0.1, 200);
/** Camera offset from the player. */
export const OFF = V(5, 15, 12);
export const CAM_YAW = Math.atan2(OFF.x, OFF.z);
/** Camera distance multiplier; the camera pulls back in portrait. */
export let camK = 1;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const portrait = camera.aspect < 0.8;
  camK = portrait ? 1.28 : 1;
  camera.fov = portrait ? 46 : 40;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/** Slides what the camera shows by (x, y) screen pixels: the scene moves left by x and up by y. */
export function slideView(x: number, y: number) {
  if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
    if (camera.view?.enabled) camera.clearViewOffset();
    return;
  }
  const w = window.innerWidth, h = window.innerHeight;
  camera.setViewOffset(w, h, x, y, w, h);
}

// Intensities are scaled by PI to match the legacy lighting mode (removed in r165), which multiplied
// hemisphere and directional light by PI.
/** The sky colour and light levels in clear weather (stage 2 turns them to dusk; the rain greys them out). */
export const sky = { bg: new Color(0xCFEAF5), hemi: 0.78 * Math.PI, sun: 0.62 * Math.PI };
export const hemi = new HemisphereLight(0xEAF7FF, 0xA9BCCB, 0.78 * Math.PI);
scene.add(hemi);
export const sun = new DirectionalLight(0xFFFFFF, 0.62 * Math.PI);
/** Where the sun sits relative to what the camera looks at. */
export const sunOff = V(-5, 14, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);
// Co-op: each phone lights its own sky (the sun follows its own camera, and the rain greys out its own player's).
hemi.userData.net = sun.userData.net = sun.target.userData.net = 'local';

// ---------- materials / meshes ----------
const matCache = new Map<number, MeshLambertMaterial>();
export function mat(c: number) {
  let m = matCache.get(c);
  if (!m) {
    m = new MeshLambertMaterial({ color: c });
    matCache.set(c, m);
  }
  return m;
}

export function mesh(geo: BufferGeometry, m: number | Material | Material[], x = 0, y = 0, z = 0, cast = false) {
  const o = new Mesh(geo, typeof m === 'number' ? mat(m) : m);
  o.position.set(x, y, z);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
}

export interface CanvasTex {
  tex: CanvasTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
export type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTex(w: number, h: number, draw: Draw): CanvasTex {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new CanvasTexture(c);
  tex.anisotropy = 4;
  return { tex, canvas: c, ctx };
}

/** Rounded-rect path. */
export function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';

/** One copy of a shape for `bake`: where it goes, and optionally its rotation (Euler XYZ) and scale. */
export interface Part {
  geo: BufferGeometry;
  at: [x: number, y: number, z: number];
  rot?: [x: number, y: number, z: number];
  scale?: [x: number, y: number, z: number];
}
const tmpM = new Matrix4(), tmpQ = new Quaternion(), tmpE = new Euler(), tmpP = new Vector3(), tmpS = new Vector3();
/** Bakes many copies of simple shapes into one geometry, so a whole batch of props draws as one mesh. */
export function bake(parts: Part[]) {
  return mergeGeometries(parts.map(p => {
    tmpQ.setFromEuler(tmpE.set(...(p.rot ?? [0, 0, 0])));
    tmpM.compose(tmpP.set(...p.at), tmpQ, tmpS.set(...(p.scale ?? [1, 1, 1])));
    return p.geo.clone().applyMatrix4(tmpM);
  }))!;
}

/**
 * Draws vertex colours: with colour management off (see the top of this file), a vertex coloured `c` shades exactly
 * like `mat(c)`, so differently coloured parts can be baked into one mesh and still look the same.
 */
export const painted = new MeshLambertMaterial({ vertexColors: true });
const tmpC = new Color();
/** Gives a geometry one colour, as a vertex colour (for `painted`). Returns it. */
export function paint<T extends BufferGeometry>(geo: T, c: number) {
  tmpC.setHex(c);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
  geo.setAttribute('color', new BufferAttribute(a, 3));
  return geo;
}
/** `bake` for parts of different colours, drawn with `painted`. */
export const bakePainted = (parts: (Part & { c: number })[]) =>
  bake(parts.map(p => ({ ...p, geo: paint(p.geo.clone(), p.c) })));

// shared geometry
export const G = {
  sphere: new SphereGeometry(1, 14, 10),
  tail: new ConeGeometry(0.2, 0.36, 4),
  steak: new CylinderGeometry(0.19, 0.19, 0.08, 14),
  bill: new BoxGeometry(0.4, 0.06, 0.24),
  log: new CylinderGeometry(0.15, 0.17, 1, 7),
  rope: new CylinderGeometry(0.025, 0.025, 1, 5),
  body: new CylinderGeometry(0.22, 0.3, 0.6, 10),
  head: new SphereGeometry(0.2, 12, 10),
  hoodBack: new SphereGeometry(0.235, 12, 10),
  hood: new TorusGeometry(0.19, 0.065, 6, 14),
  leg: new BoxGeometry(0.13, 0.3, 0.15),
  arm: new BoxGeometry(0.1, 0.34, 0.12),
  eye: new SphereGeometry(0.03, 6, 4),
  cone: new ConeGeometry(1, 1, 8),
  cyl: new CylinderGeometry(1, 1, 1, 10),
  box: new BoxGeometry(1, 1, 1),
};
