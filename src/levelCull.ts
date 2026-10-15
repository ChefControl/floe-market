// Down in the cellar, nothing up in the world can be seen: it's 30 m up, above the camera. But three.js would still go
// through all of it every frame, draw whatever its bounds don't rule out (the merged scenery, the sea) and cast its
// shadows, about half of what a frame in the cellar draws. So while the player's down there, whatever's wholly up top
// is hidden just for the render, and shown again straight after: the world above carries on just the same, and what
// its own code hides or shows stays its own business.
//
// What's up top is worked out from each thing's bounds, a few dozen things a frame (all of them on the way down), and
// anything that comes down (a dumbwaiter's tray, what the player carries) shows the moment it's below. The effects'
// and the fans' instanced meshes are never hidden: they're drawn on both levels, wherever their instances are.
import { Box3, type InstancedMesh, type Object3D } from 'three';
import { CELLAR_Y, level } from './layout';
import { scene } from './render';

/** Anything wholly above this is up in the world. */
const ABOVE = CELLAR_Y + 15;
/** Things whose bounds are looked at again each frame. */
const PER_FRAME = 48;
const up = new WeakMap<Object3D, boolean>(), box = new Box3(), hidden: Object3D[] = [];
let next = 0, wasDown = false, last = 0;

function judge(o: Object3D) {
  box.setFromObject(o);
  const v = !(o as InstancedMesh).isInstancedMesh && !box.isEmpty() && box.min.y > ABOVE;
  up.set(o, v);
  return v;
}
const show = () => {
  for (const o of hidden) o.visible = true;
  hidden.length = 0;
};
/** Hides what's up in the world while the player's down in the cellar, for this frame's render; call what it
 *  returns once it's drawn. */
export function hideAbove(): () => void {
  if (!level.down) { wasDown = false; last = 0; return show; }
  const kids = scene.children;
  if (!wasDown) { kids.forEach(judge); wasDown = true; }
  else for (let i = 0; i < Math.min(PER_FRAME, kids.length); i++) judge(kids[next = (next + 1) % kids.length]);
  for (const o of kids) {
    if (o.visible && (up.get(o) ?? judge(o)) && o.position.y > ABOVE) { o.visible = false; hidden.push(o); }
  }
  last = hidden.length;
  return show;
}
/** How many things the last render left out (for tests). */
export const leftOut = () => last;
