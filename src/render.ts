import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ColorManagement, ConeGeometry, CylinderGeometry,
  DirectionalLight, Euler, ExtrudeGeometry, Fog, HemisphereLight, LinearSRGBColorSpace, Material, Matrix4, Mesh,
  MeshLambertMaterial, Object3D, PCFShadowMap, PerspectiveCamera, Quaternion, Scene, ShapeGeometry, SphereGeometry,
  TorusGeometry, Vector3, WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glBack, glGone } from './errors';
import { highBuilt, isHigh, isPotato, lowAfterLoss, onQuality } from './graphics';
import { V } from './util';
import { viewSize } from './viewSize';

// ---------- renderer / scene ----------
// The art was tuned for three.js' pre-r152 color pipeline: hex colors and canvas textures used as-is,
// no sRGB output encoding. Keep it that way. This must run before any Color is created.
ColorManagement.enabled = false;

export const canvas = document.getElementById('game') as HTMLCanvasElement;
// (a stencil buffer for the hole under Mr. Fugu's hatch, fugu.ts, which shows the shaft below the deck through it)
export const renderer = (() => {
  try {
    // (Potato smooths no edges: smoothing takes several times the drawing's memory, and it's only chosen as the view's made)
    return new WebGLRenderer({ canvas, antialias: highBuilt, stencil: true });
  } catch (e) {
    // the browser won't give the game a 3D view (errors.ts): the game can't go on, but the dialog says why
    glGone('start', (e as Error).message);
    throw e;
  }
})();
// The browser can take the 3D view back mid-game (errors.ts). three.js asks for it back and, once it's back, sends
// everything up again; if it isn't back LOST_WAIT seconds into the game being on screen, the dialog offers a reload.
// Taken while the game's on screen, it's the phone running short (not just the tab put away): Low from now on.
const LOST_WAIT = 3;
let lostT: ReturnType<typeof setTimeout> | undefined;
const waitForIt = () => { lostT = setTimeout(() => (document.hidden ? waitForIt() : glGone('lost')), LOST_WAIT * 1000); };
canvas.addEventListener('webglcontextlost', () => {
  if (!document.hidden) lowAfterLoss();
  clearTimeout(lostT);
  waitForIt();
});
canvas.addEventListener('webglcontextrestored', () => { clearTimeout(lostT); glBack(); });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = LinearSRGBColorSpace;
// the fish on the chopping block is cut with a clipping plane (fishing.ts)
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

export const scene = new Scene();
scene.background = new Color(0xCFEAF5);
// Where things are is worked out afresh each frame, but only for what shows: three.js would do it for everything,
// hidden or not, and the setting not in use (graphics.ts) is built and hidden beside the one that is. Something
// hidden is marked to be placed again the moment it shows (its own world matrix, and so everything in it).
const placeAll = Object3D.prototype.updateMatrixWorld;
function place(o: Object3D, force: boolean) {
  if (o.matrixAutoUpdate) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || force) {
    if (o.parent) o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix);
    else o.matrixWorld.copy(o.matrix);
    o.matrixWorldNeedsUpdate = false;
    force = true;
  }
  for (const c of o.children) {
    if (!c.matrixWorldAutoUpdate) continue;
    if (!c.visible) c.matrixWorldNeedsUpdate = true;
    else if (c.updateMatrixWorld !== placeAll) c.updateMatrixWorld(force); // one that places itself its own way
    else place(c, force);
  }
}
scene.updateMatrixWorld = (force = false) => place(scene, force);
export const fog = new Fog(0xCFEAF5, 34, 70);
scene.fog = fog;

export const camera = new PerspectiveCamera(40, 1, 0.1, 200);
/** Camera offset from the player. */
export const OFF = V(5, 15, 12);
export const CAM_YAW = Math.atan2(OFF.x, OFF.z);
/** Camera distance multiplier; the camera pulls back in portrait. */
export let camK = 1;

function resize() {
  const w = viewSize.w, h = viewSize.h;
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
  const w = viewSize.w, h = viewSize.h;
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

/** How big the sun's shadow map is on High (stage 2 widens it, stage.ts). */
export const shadowSize = { px: 1024 };
/**
 * Fits the renderer to the graphics (graphics.ts). High: soft-edged shadows, up to two pixels a point. Low, for phones
 * that can't keep up: a shadow map half the size with hard edges, and no more than one and a half pixels a point.
 * Potato: no shadows at all (and no shadow map held), and one pixel a point.
 */
export function fitRenderer() {
  const high = isHigh(), potato = isPotato(), px = high ? shadowSize.px : shadowSize.px / 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : potato ? 1 : 1.5));
  sun.shadow.radius = high ? 3 : 1;
  sun.castShadow = !potato;
  if (sun.shadow.mapSize.x !== px || potato) {
    sun.shadow.mapSize.set(px, px);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
}
fitRenderer();
onQuality(fitRenderer);

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

/**
 * A canvas's drawing context for a texture, kept in the computer's own memory rather than the graphics chip's: a phone
 * can drop or scramble what's on a canvas held on the graphics chip (iOS, Firefox on Android, after a while in the
 * background), and a texture sent up after that comes out blank (black, or not there at all) or with another's
 * picture. (Only a canvas's first context counts: ask for it this way before any other.)
 */
export const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

export function canvasTex(w: number, h: number, draw: Draw): CanvasTex {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = ctx2d(c);
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

/** The game's fonts on canvas (index.html loads them; fonts.ts waits for them before the game draws anything). The
 *  bundled emoji go first: they're only ever picked for emoji. */
export const FONT = '"Floe Emoji","Baloo 2","Trebuchet MS",system-ui,sans-serif';
/** The brush lettering: Shippori Mincho B1 carries the kanji and kana the game writes (scripts/fonts/build.py). */
export const MINCHO = '"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
/** An emoji on its own, as a picture. */
export const EMOJI = '"Floe Emoji",serif';

/** One copy of a shape for `bake`: where it goes, and optionally its rotation (Euler XYZ) and scale. */
export interface Part {
  geo: BufferGeometry;
  at: [x: number, y: number, z: number];
  rot?: [x: number, y: number, z: number];
  scale?: [x: number, y: number, z: number];
}
const tmpM = new Matrix4(), tmpQ = new Quaternion(), tmpE = new Euler(), tmpP = new Vector3(), tmpS = new Vector3();
/**
 * A copy of `geo`, to move or paint. three.js' own clone() first builds a whole new shape of the same kind at its
 * default size (a 32-sided cylinder, a 32 by 16 ball), only to copy over it: that was a quarter of loading the game.
 * This copies into a plain geometry, which draws the same one name from Math.random (the game's luck, kit.ts). A
 * Shape's geometry still goes through clone(), since its default shape draws a name of its own, and leaving that out
 * would change the luck.
 */
export const copyGeo = (geo: BufferGeometry) =>
  geo instanceof ShapeGeometry || geo instanceof ExtrudeGeometry ? geo.clone() : new BufferGeometry().copy(geo);
/** Bakes many copies of simple shapes into one geometry, so a whole batch of props draws as one mesh. */
export function bake(parts: Part[]) {
  return mergeGeometries(parts.map(p => {
    tmpQ.setFromEuler(tmpE.set(...(p.rot ?? [0, 0, 0])));
    tmpM.compose(tmpP.set(...p.at), tmpQ, tmpS.set(...(p.scale ?? [1, 1, 1])));
    return copyGeo(p.geo).applyMatrix4(tmpM);
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
  bake(parts.map(p => ({ ...p, geo: paint(copyGeo(p.geo), p.c) })));

// shared geometry
export const G = {
  sphere: new SphereGeometry(1, 14, 10),
  tail: new ConeGeometry(0.2, 0.36, 4),
  fillet: new CylinderGeometry(0.19, 0.19, 0.08, 14),
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
