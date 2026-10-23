// Speech bubbles in close at someone's table: one keeps clear of another put up the same frame, never of itself (it used
// to see its own spot from the frame before, on a fast screen, and jump under it and back, many times a second).
import { Group, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { camera } from '../src/render';
import { bubble, newBubbleFrame } from '../src/speech';

let panel: HTMLElement;
beforeEach(() => {
  // (a vendor's panel open along the bottom: the camera's in close)
  panel = document.createElement('div');
  panel.className = 'casino';
  document.body.append(panel);
  const h = window.innerHeight;
  panel.getBoundingClientRect = () => ({ top: h * 0.75, bottom: h, left: 0, right: 300, width: 300, height: h * 0.25, x: 0, y: h * 0.75, toJSON() {} });
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  newBubbleFrame();
});
afterEach(() => panel.remove());

/** Where a bubble is on the screen (NDC). */
const onScreen = (b: ReturnType<typeof bubble>) => b.sprite.getWorldPosition(new Vector3()).project(camera);

it('stays put when placed again, frame after frame, high in the view', () => {
  const room = new Group();
  const b = bubble(room);
  b.say('His lot eat fast. Keep that pot going.');
  // (up near the top of the view, with no room for it above its own spot)
  b.place(0, 3.4, 0);
  const first = onScreen(b);
  for (let i = 0; i < 5; i++) {
    b.place(0, 3.4, 0);
    expect(onScreen(b).y).toBeCloseTo(first.y, 5);
  }
  newBubbleFrame();
  b.place(0, 3.4, 0);
  expect(onScreen(b).y).toBeCloseTo(first.y, 5);
});

it('still keeps clear of another bubble up in the same frame', () => {
  const room = new Group();
  const a = bubble(room), b = bubble(room);
  a.say('First.'); b.say('Second.');
  a.place(0, 0, 0);
  b.place(0, 0, 0);
  const pa = onScreen(a), pb = onScreen(b);
  expect(Math.abs(pa.y - pb.y)).toBeGreaterThan(0.05);
  // and the next frame, they sit where they did
  newBubbleFrame();
  a.place(0, 0, 0);
  b.place(0, 0, 0);
  expect(onScreen(a).y).toBeCloseTo(pa.y, 5);
  expect(onScreen(b).y).toBeCloseTo(pb.y, 5);
});
