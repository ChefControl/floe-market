// render.ts `place`: each frame, world matrices are worked out only for what shows and only for what's moved, and the
// marks it leaves (`walkedAt`, `movedAt`, `placePass`) say which, for batch.ts.
import { Box3, BoxGeometry, Group, Matrix4, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import * as render from '../src/render';

const { scene } = render;
const place = () => scene.updateMatrixWorld();

/** Its world matrix worked out from scratch, from every pose it's in. */
function truth(o: Object3D) {
  const m = new Matrix4();
  for (let p: Object3D | null = o; p; p = p.parent) m.premultiply(new Matrix4().compose(p.position, p.quaternion, p.scale));
  return m;
}
const near = (a: Matrix4, b: Matrix4) => a.elements.every((v, i) => Math.abs(v - b.elements[i]) < 1e-9);
const right = (o: Object3D) => expect(near(o.matrixWorld, truth(o)), o.name).toBe(true);

/** A group with a child and a grandchild, each a step off its parent, in the scene. */
function tree() {
  const root = new Group(), mid = new Group(), leaf = new Mesh(new BoxGeometry());
  root.name = 'root'; mid.name = 'mid'; leaf.name = 'leaf';
  root.position.set(1, 2, 3); mid.position.set(0, 1, 0); mid.rotation.y = 0.5; leaf.position.set(2, 0, 0); leaf.scale.setScalar(2);
  root.add(mid); mid.add(leaf); scene.add(root);
  place();
  return { root, mid, leaf };
}
const made: Object3D[] = [];
afterEach(() => { for (const o of made.splice(0)) o.removeFromParent(); });
const fresh = () => { const t = tree(); made.push(t.root); return t; };

describe('placing what shows (render.ts place)', () => {
  it('places everything that shows, right, the first time', () => {
    const { root, mid, leaf } = fresh();
    for (const o of [root, mid, leaf]) { right(o); expect(o.walkedAt).toBe(render.placePass); expect(o.movedAt).toBe(render.placePass); }
  });

  it('counts each placing of the scene, and marks what it walks every time', () => {
    const { leaf } = fresh();
    const n = render.placePass;
    place(); place();
    expect(render.placePass).toBe(n + 2);
    expect(leaf.walkedAt).toBe(n + 2);
  });

  it('leaves what stands still alone: no matrix built, no world matrix worked out', () => {
    const { root, mid, leaf } = fresh();
    const at = render.placePass, before = leaf.matrixWorld.clone();
    let built = 0;
    const compose = Matrix4.prototype.compose;
    Matrix4.prototype.compose = function (this: Matrix4, ...a: Parameters<Matrix4['compose']>) {
      if (this === root.matrix || this === mid.matrix || this === leaf.matrix) built++;
      return compose.apply(this, a);
    };
    try { place(); place(); } finally { Matrix4.prototype.compose = compose; }
    expect(built).toBe(0);
    for (const o of [root, mid, leaf]) expect(o.movedAt).toBe(at);
    expect(leaf.matrixWorld.equals(before)).toBe(true);
  });

  it('picks up a move, a turn or a resize, and carries what stands still in it along', () => {
    const { root, mid, leaf } = fresh();
    for (const change of [() => root.position.x += 1, () => root.rotation.z = 0.3, () => root.scale.set(1, 2, 1),
      () => mid.quaternion.set(0, 0, Math.sin(0.2), Math.cos(0.2)), () => leaf.position.z = -1]) {
      change();
      place();
      for (const o of [root, mid, leaf]) right(o);
      expect(leaf.movedAt).toBe(render.placePass);
    }
    // only what moved, and what's in it
    leaf.position.y = 4;
    place();
    expect(leaf.movedAt).toBe(render.placePass);
    expect(mid.movedAt).toBeLessThan(render.placePass);
  });

  it('places something again the moment it shows, if it or what it is in moved while hidden', () => {
    const { root, mid, leaf } = fresh();
    mid.visible = false;
    place();
    const seen = leaf.walkedAt!;
    root.position.x = 9; mid.position.y = 5; leaf.position.z = 2;
    place();
    expect(leaf.walkedAt).toBe(seen); // hidden: not walked
    mid.visible = true;
    place();
    for (const o of [root, mid, leaf]) right(o);
  });

  it('places what is moved into another parent, or taken out and put back after its parent moved', () => {
    const { root, mid, leaf } = fresh();
    const other = new Group();
    other.position.set(-4, 0, 0);
    scene.add(other); made.push(other);
    place();
    leaf.position.x = 2.5; // it's moved since its new parent last did
    place();
    other.add(leaf); // the same pose, somewhere else
    place();
    right(leaf);
    mid.add(leaf);
    place();
    // out of the scene while its parent moves, then back
    leaf.removeFromParent();
    root.position.y = 7;
    place();
    mid.add(leaf);
    place();
    right(leaf);
  });

  it('places again what is taken out, placed by three.js somewhere else, and put back where it was', () => {
    const { mid, leaf } = fresh();
    // measured out of the scene (Box3.setFromObject places it by itself)
    leaf.removeFromParent();
    new Box3().setFromObject(leaf);
    mid.add(leaf);
    place();
    right(leaf);
    expect(leaf.movedAt).toBe(render.placePass);
    // a frame in a hidden group, asked where it is there
    const shed = new Group();
    shed.position.set(50, 0, 0); shed.visible = false;
    scene.add(shed); made.push(shed);
    shed.add(leaf);
    place();
    leaf.getWorldPosition(new Vector3());
    mid.add(leaf);
    place();
    right(leaf);
    // a frame in something that places itself its own way (a camera)
    const cam = new PerspectiveCamera();
    cam.position.set(0, 0, 9);
    scene.add(cam); made.push(cam);
    cam.add(leaf);
    place();
    mid.add(leaf);
    place();
    right(leaf);
  });

  it('places a matrix set by hand whenever it changes, marked or not, and placed by three.js itself or not', () => {
    const { mid } = fresh();
    const o = new Object3D(), want = () => new Matrix4().multiplyMatrices(mid.matrixWorld, o.matrix);
    o.matrixAutoUpdate = false;
    o.matrix.makeTranslation(0, 0, 3);
    mid.add(o);
    place();
    expect(near(o.matrixWorld, want())).toBe(true);
    // changed, not marked (the old place built everything each frame, and so placed it)
    o.matrix.makeTranslation(0, 0, 6);
    place();
    expect(near(o.matrixWorld, want())).toBe(true);
    expect(o.movedAt).toBe(render.placePass);
    // changed, marked, and placed by three.js before the frame: right, and marked as moved for batch.ts
    o.matrix.makeTranslation(0, 0, 9);
    o.matrixWorldNeedsUpdate = true;
    o.updateMatrixWorld();
    place();
    expect(near(o.matrixWorld, want())).toBe(true);
    expect(o.movedAt).toBe(render.placePass);
    // left alone, it stands still
    place();
    expect(o.movedAt).toBe(render.placePass - 1);
    // and built from its pose again once it builds its own
    o.matrixAutoUpdate = true;
    place();
    right(o);
  });

  it('builds a matrix with a pivot, and without it once it is taken away', () => {
    const { leaf } = fresh();
    leaf.pivot = new Vector3(1, 0, 0);
    leaf.rotation.z = 1;
    place();
    const withPivot = new Matrix4().compose(leaf.position, leaf.quaternion, leaf.scale);
    expect(leaf.matrix.equals(withPivot)).toBe(false);
    leaf.pivot = null;
    place();
    right(leaf);
  });

  it('asking where something still is (getWorldPosition) leaves it standing still', () => {
    const { leaf } = fresh();
    const at = leaf.movedAt;
    for (let i = 0; i < 3; i++) { leaf.getWorldPosition(new Vector3()); place(); }
    expect(leaf.movedAt).toBe(at);
  });

  it('places again what three.js placed from another pose, even when put back before the frame is drawn', () => {
    const { root, mid, leaf } = fresh();
    // posed for a measure, placed by three.js itself, and put back (as spotlight.ts and finishRig.ts do)
    mid.rotation.y = 2; root.scale.setScalar(3);
    root.updateMatrixWorld(true);
    mid.rotation.y = 0.5; root.scale.setScalar(1);
    place();
    for (const o of [root, mid, leaf]) right(o);
    // and asked where it is, through getWorldPosition, from another pose
    leaf.position.x = 8;
    leaf.getWorldPosition(new Vector3());
    leaf.position.x = 2;
    place();
    right(leaf);
  });

  it('places what places itself its own way (a camera) when what it is in moves', () => {
    const { mid } = fresh();
    const cam = new PerspectiveCamera();
    cam.position.set(0, 0, 1);
    mid.add(cam);
    place();
    right(cam);
    mid.position.x = 3;
    place();
    right(cam);
    expect(near(cam.matrixWorldInverse.clone().invert(), cam.matrixWorld)).toBe(true);
  });
});
