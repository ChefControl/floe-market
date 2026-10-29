// batch.ts `sync`: what's merged is looked at every frame, cheaply. What render.ts `place` walked shows, and has moved
// only if `place` worked out its world matrix since (`placed.movedAt`); only then are its 16 numbers compared. Anything that
// moves, hides, goes, changes shape or colour still drops out the same frame.
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, type Object3D, PerspectiveCamera } from 'three';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { batchStill } from '../src/batch';
import { mat, scene } from '../src/render';

let now = 1000;
/** A frame drawn `s` seconds after the last: the scene placed, then merged (as renderer.render does). */
const frame = (s = 0.05) => { now += s * 1000; scene.updateMatrixWorld(); scene.onBeforeRender(null!, null!, null!, null!, null!, null!); };
/** Long enough for anything that's stood still to be merged (a second, and its turn of eight frames). */
const settle = () => { for (let i = 0; i < 40; i++) frame(); };
/** Long enough for what's been seen to move to be merged again (20 s). */
const resettle = () => { for (let i = 0; i < 20 / 0.05 + 20; i++) frame(); };
const merged = (o: Object3D) => o.layers.mask === 0;

beforeAll(() => batchStill(scene));
// (mocks are put back after each test, vite.config.ts)
beforeEach(() => { vi.spyOn(performance, 'now').mockImplementation(() => now); });
const made: Object3D[] = [];
afterEach(() => { for (const o of made.splice(0)) o.removeFromParent(); frame(); });

/** A group in the scene, far from anything else, with two boxes in it a step apart (one plain colour, one shared box). */
function stand(x = 1000) {
  const g = new Group(), box = new BoxGeometry(1, 1, 1);
  const a = new Mesh(box, mat(0xC3875D)), b = new Mesh(box, mat(0x8A5A3B));
  g.position.set(x, 0, 1000); b.position.x = 2;
  g.add(a, b); scene.add(g); made.push(g);
  settle();
  expect([merged(a), merged(b)]).toEqual([true, true]);
  return { g, a, b, box };
}
/** Counts reads of its world matrix's numbers (what the long compare reads). */
function readsOf(o: Object3D) {
  let n = 0;
  const e = o.matrixWorld.elements;
  o.matrixWorld.elements = new Proxy(e, { get: (t, k, r) => { if (typeof k === 'string' && /^\d+$/.test(k)) n++; return Reflect.get(t, k, r); } });
  return () => n;
}

describe('looking at what is merged (batch.ts sync)', () => {
  it("doesn't compare what stands still, frame after frame", () => {
    const { a } = stand();
    const reads = readsOf(a);
    for (let i = 0; i < 20; i++) frame();
    expect(reads()).toBe(0);
    expect(merged(a)).toBe(true);
  });

  it('takes a false alarm (its matrix built again where it stands) for a compare, and keeps it merged', () => {
    const { a } = stand();
    const reads = readsOf(a);
    a.updateMatrix(); // three.js marks its world matrix to be worked out again: `place` does, and it's the same
    frame();
    expect(reads()).toBeGreaterThan(0);
    expect(merged(a)).toBe(true);
    const n = reads();
    frame();
    expect(reads()).toBe(n); // only the once
  });

  it('drops out the same frame it moves, turns or is resized', () => {
    for (const change of [(o: Mesh) => o.position.y = 0.5, (o: Mesh) => o.rotation.y = 0.3, (o: Mesh) => o.scale.set(1, 2, 1)]) {
      const { a, b } = stand();
      change(a);
      frame();
      expect([merged(a), merged(b)]).toEqual([false, true]);
    }
  });

  it('drops out the same frame what it is in moves, all of it', () => {
    const { g, a, b } = stand();
    g.position.z += 1;
    frame();
    expect([merged(a), merged(b)]).toEqual([false, false]);
  });

  it('drops out when moved and placed by three.js itself before the frame is drawn', () => {
    const { a } = stand();
    a.position.y = 1;
    a.updateMatrixWorld(true);
    frame();
    expect(merged(a)).toBe(false);
  });

  it('drops out the same frame it hides, what it is in hides, or it is taken away', () => {
    let s = stand();
    s.a.visible = false;
    frame();
    expect([merged(s.a), merged(s.b)]).toEqual([false, true]);
    s = stand();
    s.g.visible = false;
    frame();
    expect([merged(s.a), merged(s.b)]).toEqual([false, false]);
    s = stand();
    s.g.remove(s.a);
    frame();
    expect([merged(s.a), merged(s.b)]).toEqual([false, true]);
  });

  it('drops out the same frame its colour, shape or material changes, but not for a change too small to show', () => {
    let s = stand();
    const own = new MeshLambertMaterial({ color: 0x336699 });
    s.a.material = own; // (a change of material counts as a move)
    resettle();
    expect(merged(s.a)).toBe(true);
    own.color.setHex(0x336699);
    frame();
    expect(merged(s.a)).toBe(true);
    own.color.r += 1e-6; // (the same hex)
    frame();
    expect(merged(s.a)).toBe(true);
    own.color.setHex(0x336698);
    frame();
    expect(merged(s.a)).toBe(false);
    // a shape both share, edited: both drop out
    s = stand();
    s.box.attributes.position.needsUpdate = true;
    frame();
    expect([merged(s.a), merged(s.b)]).toEqual([false, false]);
    s = stand();
    s.a.material = mat(0x8A5A3B);
    frame();
    expect(merged(s.a)).toBe(false);
  });

  it('looks the long way at what `place` does not walk (in a camera), and still drops it out when it moves', () => {
    const cam = new PerspectiveCamera(), box = new Mesh(new BoxGeometry(), mat(0xC3875D));
    cam.position.set(1000, 0, 1000); cam.add(box); scene.add(cam); made.push(cam);
    settle();
    expect(merged(box)).toBe(true);
    const reads = readsOf(box);
    frame();
    expect(reads()).toBeGreaterThan(0);
    box.position.x = 1;
    cam.updateMatrixWorld(true);
    frame();
    expect(merged(box)).toBe(false);
  });

  it("looks the long way when the scene hasn't been placed since the last look", () => {
    const { a } = stand();
    const reads = readsOf(a);
    now += 50;
    scene.onBeforeRender(null!, null!, null!, null!, null!, null!);
    expect(reads()).toBeGreaterThan(0);
    // moved and placed by three.js itself in between: still seen
    a.position.y = 1;
    a.updateMatrixWorld(true);
    now += 50;
    scene.onBeforeRender(null!, null!, null!, null!, null!, null!);
    expect(merged(a)).toBe(false);
  });

  it('merges again what stood still after a move, and keeps it merged', () => {
    const { a } = stand();
    a.position.y = 0.5;
    frame();
    expect(merged(a)).toBe(false);
    resettle();
    expect(merged(a)).toBe(true);
    const reads = readsOf(a);
    frame();
    expect(reads()).toBe(0);
  });
});
