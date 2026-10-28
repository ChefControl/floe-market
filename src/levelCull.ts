// Down in the cellar, nothing up in the world can be seen: it's 30 m up, above the camera. But three.js would still go
// through all of it every frame, draw whatever its bounds don't rule out (the merged scenery, the sea) and cast its
// shadows, about half of what a frame in the cellar draws. So while the player's down there, whatever's wholly up top
// is hidden just for the render, and shown again straight after: the world above carries on just the same, and what
// its own code hides or shows stays its own business.
//
// What's up top is worked out from each thing's bounds, a few dozen things a frame (all of them on the way down), and
// anything that comes down (a dumbwaiter's tray, what the player carries) shows the moment it's below. The effects'
// and the fans' instanced meshes are never hidden: they're drawn on both levels, wherever their instances are.
//
// Upstairs in stage 3 it's the other way round: the cellar's 30 m down, under the dock's floor, and the fans' meshes
// (never culled: they're drawn wherever their instances are) and everything else wholly down there would still be
// gone through and drawn. So while the player's up top, all of that is hidden for the render too: what's marked as
// the cellar's own (`userData.below`) and whatever's wholly below. (It holds still meanwhile: ring.ts.)
//
// And down there, the sun's shadows are cast only over what's on screen: its shadow box, a fixed square 36 m across up
// in the world, is fitted to the floor the camera sees (and a little round it, for what stands off screen and throws
// its shadow on). Otherwise everything in that square is drawn again for the shadows, seen or not: from the ring, the
// Undertow's whole club, a third of a boss night's shadows. It's sharper for it, too. The floor seen is narrower
// near the camera than far off, so a box round it still takes in a corner or two off screen: the Undertow's figures, a
// few thousand triangles each, are looked at one by one, and cast their shadows only while they, or the shadow they'd
// throw, could be on screen.
import { Box3, Frustum, type InstancedMesh, Matrix4, type Mesh, type Object3D, Ray, Sphere, Vector3 } from 'three';
import { CELLAR_Y, level } from './layout';
import { camera, scene, sun, sunOff } from './render';

/** Anything wholly above this is up in the world, and anything wholly below it down in the cellar. */
const ABOVE = CELLAR_Y + 15;
/** Whether the cellar's out of sight now: stage 3, the player upstairs, and no stage-up show taking them down (ring.ts
 *  says). */
export const cellarAway = { now: () => false };
/** Things whose bounds are looked at again each frame. */
const PER_FRAME = 48;
const up = new WeakMap<Object3D, boolean>(), below = new WeakMap<Object3D, boolean>(), box = new Box3(), hidden: Object3D[] = [];
let next = 0, wasDown = false, last = 0, nextBelow = 0, wasAway = false;

const piece = new Box3();
/** `box.setFromObject(o)`, piece by piece in the same order, each placed as it's come to (`updateWorldMatrix`), but
 *  given up as soon as `settled()` says what the whole would: the cellar's group is thousands of pieces, and the first
 *  of them down on its floor says it isn't wholly up top. False if it gave up. */
function bounds(o: Object3D, settled: () => boolean): boolean {
  o.updateWorldMatrix(false, false);
  const geo = (o as Mesh).geometry;
  if (geo !== undefined) {
    // (an instanced mesh's own box, round all its copies, as three.js' Box3 takes it)
    const im = o as InstancedMesh;
    if (im.boundingBox !== undefined) { if (im.boundingBox === null) im.computeBoundingBox(); piece.copy(im.boundingBox!); }
    else { if (geo.boundingBox === null) geo.computeBoundingBox(); piece.copy(geo.boundingBox!); }
    box.union(piece.applyMatrix4(o.matrixWorld));
    if (settled()) return false;
  }
  for (const c of o.children) if (!bounds(c, settled)) return false;
  return true;
}
/** Whether something reaches down out of the world, or up out of the cellar: what it reaches so far, past ABOVE. */
const reachesDown = () => box.min.y <= ABOVE, reachesUp = () => box.max.y >= ABOVE;
function judge(o: Object3D) {
  // (the effects' and the fans' instanced meshes are drawn on both levels: never measured)
  box.makeEmpty();
  const v = !(o as InstancedMesh).isInstancedMesh && bounds(o, reachesDown) && !box.isEmpty() && box.min.y > ABOVE;
  up.set(o, v);
  return v;
}
function judgeBelow(o: Object3D) {
  // (what's marked as the cellar's own needn't be measured)
  box.makeEmpty();
  const v = !!o.userData.below || (!(o as InstancedMesh).isInstancedMesh && bounds(o, reachesUp) && !box.isEmpty() && box.max.y < ABOVE);
  below.set(o, v);
  return v;
}
/** Upstairs: hides the cellar for this frame's render. */
function hideBelow() {
  const kids = scene.children;
  if (!wasAway) { kids.forEach(judgeBelow); wasAway = true; }
  else for (let i = 0; i < Math.min(PER_FRAME, kids.length); i++) judgeBelow(kids[nextBelow = (nextBelow + 1) % kids.length]);
  for (const o of kids) {
    if (o.visible && (below.get(o) ?? judgeBelow(o))) { o.visible = false; hidden.push(o); }
  }
}
const show = () => {
  for (const o of hidden) o.visible = true;
  hidden.length = 0;
};
/** Hides what's up in the world while the player's down in the cellar, for this frame's render; call what it
 *  returns once it's drawn. */
export function hideAbove(): () => void {
  if (!level.down) {
    if (wasDown) { unfit(); seenAll(); }
    wasDown = false; last = 0;
    if (cellarAway.now()) hideBelow(); else wasAway = false;
    return show;
  }
  wasAway = false;
  fitShadows();
  cullFigures();
  const now = performance.now(), dt = Math.min(0.1, (now - drawnAt) / 1000);
  drawnAt = now;
  for (const f of beforeDrawing) f(dt);
  const kids = scene.children;
  if (!wasDown) { kids.forEach(judge); wasDown = true; }
  else for (let i = 0; i < Math.min(PER_FRAME, kids.length); i++) judge(kids[next = (next + 1) % kids.length]);
  for (const o of kids) {
    if (o.visible && (up.get(o) ?? judge(o)) && o.position.y > ABOVE) { o.visible = false; hidden.push(o); }
  }
  last = hidden.length;
  return show;
}
/** What's done each time the cellar's drawn (`dt` seconds since the last time), whatever the game's doing: Low's lamps
 *  (cellar.ts), which have to be right in a scene, a menu or a game held still as much as in play. */
const beforeDrawing: ((dt: number) => void)[] = [];
let drawnAt = performance.now();
export const eachDrawing = (f: (dt: number) => void) => { beforeDrawing.push(f); };
/** How many things the last render left out (for tests). */
export const leftOut = () => last;
/** Whether `o` is taken to be wholly up top, and wholly down in the cellar (for tests). */
export const judged = (o: Object3D) => ({ up: judge(o), below: judgeBelow(o) });

// ---------- the shadows, fitted to the screen ----------
/** Heights over the floor the screen's edges are taken at (the floor, and the tops of the walls it sees), and how far
 *  past them a shadow's caster may stand (a 3 m wall's shadow, with the sun as high as it is). */
const LEVELS = [0, 3.2], MARGIN = 2.5, STEP = 0.5, MOST = 24;
/** The screen's corners (in the camera's -1 to 1 across and up). */
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
const shadowCam = sun.shadow.camera, kept = { left: 0, right: 0, top: 0, bottom: 0 };
let fitted = false;
const ray = new Ray(), hit = new Vector3(), ax = new Vector3(), ay = new Vector3(), az = new Vector3(), d = new Vector3();
/** The shadow box round what the camera sees of the cellar's floor, in the sun's own view (centred where it looks). */
function fitShadows() {
  if (!fitted) { fitted = true; Object.assign(kept, { left: shadowCam.left, right: shadowCam.right, top: shadowCam.top, bottom: shadowCam.bottom }); }
  // the sun's view, looking along -sunOff, turned so its up is the screen's up along the floor: the floor seen is a long
  // narrow strip up the screen, and a box square to the screen fits it (one square to the world would take a slice
  // twice as big, diagonally across it) (three.js' lookAt, as the shadow takes its view)
  camera.updateMatrixWorld();
  shadowCam.up.set(-camera.matrixWorld.elements[8], 0, -camera.matrixWorld.elements[10]).normalize();
  az.copy(sunOff).normalize(); ax.copy(shadowCam.up).cross(az).normalize(); ay.copy(az).cross(ax);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const h of LEVELS) {
    for (const [u, v] of CORNERS) {
      ray.origin.setFromMatrixPosition(camera.matrixWorld);
      ray.direction.set(u, v, 0.5).unproject(camera).sub(ray.origin).normalize();
      // (a corner that misses the floor, over the horizon: as far as the fog)
      const t = ray.direction.y < -1e-3 ? (CELLAR_Y + h - ray.origin.y) / ray.direction.y : 60;
      ray.at(Math.min(t, 60), hit).sub(sun.target.position);
      const px = d.copy(hit).dot(ax), py = d.copy(hit).dot(ay);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
  }
  // (in half-metre steps, so it isn't remade every frame as the camera eases)
  const snap = (v: number, up: boolean) => Math.max(-MOST, Math.min(MOST, (up ? Math.ceil : Math.floor)(v / STEP) * STEP));
  const b = { left: snap(x0 - MARGIN, false), right: snap(x1 + MARGIN, true), bottom: snap(y0 - MARGIN, false), top: snap(y1 + MARGIN, true) };
  if (b.left !== shadowCam.left || b.right !== shadowCam.right || b.top !== shadowCam.top || b.bottom !== shadowCam.bottom) {
    Object.assign(shadowCam, b);
    shadowCam.updateProjectionMatrix();
  }
}
/** Back up in the world: the shadow box as it was. */
function unfit() {
  if (!fitted) return;
  fitted = false;
  Object.assign(shadowCam, kept);
  shadowCam.up.set(0, 1, 0);
  shadowCam.updateProjectionMatrix();
}
/** The shadow box now (for tests). */
export const shadowBox = () => ({ left: shadowCam.left, right: shadowCam.right, top: shadowCam.top, bottom: shadowCam.bottom });

// ---------- figures' shadows, while they could be seen ----------
/** Figures that cast their shadows only while on screen (or their shadow is), each with whether it does now. */
const figures = new Map<Object3D, boolean>();
/** A figure (family.ts' Hood) that casts its shadow only while it could be seen (down in the cellar). */
export function castsWhenSeen(o: Object3D) { figures.set(o, true); }
/** How tall a figure is taken to be, and how far its shadow reaches along the floor for each metre of it. */
const TALL = 2.2, view = new Frustum(), vp = new Matrix4(), ball = new Sphere(), lay = new Vector3();
function casting(o: Object3D, on: boolean) {
  figures.set(o, on);
  o.traverse(c => {
    const m = c as Mesh;
    if (!m.isMesh) return;
    if (on) { if (m.userData.castWhenSeen) m.castShadow = true; }
    else if (m.castShadow) { m.userData.castWhenSeen = true; m.castShadow = false; }
  });
}
function cullFigures() {
  if (!figures.size) return;
  vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  view.setFromProjectionMatrix(vp);
  // (the shadow's tip, from a figure's top: away from the sun, as far along the floor as the sun is low)
  lay.set(-sunOff.x, 0, -sunOff.z).multiplyScalar(TALL / sunOff.y);
  for (const [o, was] of figures) {
    o.getWorldPosition(ball.center);
    ball.center.y += TALL / 2;
    ball.center.addScaledVector(lay, 0.5);
    ball.radius = TALL / 2 + lay.length() / 2 + 0.4;
    const seen = o.visible && view.intersectsSphere(ball);
    if (seen !== was) casting(o, seen);
  }
}
/** Up in the world (nothing of theirs to see): all cast again, as they were. */
function seenAll() { for (const [o, was] of figures) if (!was) casting(o, true); }
/** How many figures cast their shadows now (for tests). */
export const figuresCasting = () => [...figures.values()].filter(Boolean).length;
