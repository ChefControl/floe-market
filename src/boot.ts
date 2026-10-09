// While the game's modules load they build the whole scene: the dock, the trees, the restaurant waiting to go up.
// Co-op (coop.ts) needs that scene built exactly the same on every device, so the guest's phone can show the host's
// game by naming the same objects. So while the modules load, Math.random is a seeded sequence (the trees and the ice
// floes come out the same every time), and three.js' running ids are noted before and after: every object, geometry,
// material and texture made in between is named by its id counted from the first.
import { BufferGeometry, Material, Object3D, Texture } from 'three';

/** Running ids at a moment: objects, geometries, materials and textures. */
export interface Ids { o: number; g: number; m: number; t: number }
const ids = (): Ids => ({ o: new Object3D().id, g: new BufferGeometry().id, m: (new Material() as unknown as { id: number }).id, t: new Texture().id });

/** The ids just before the modules build anything. */
export const BASE = ids();

const native = Math.random;
// The tests seed Math.random themselves (test/setup.ts).
if (import.meta.env.MODE !== 'test') {
  let seed = 0x5EA50F;
  Math.random = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** The ids once the modules have loaded (set by endBoot). */
export let END: Ids | null = null;

/** The modules have loaded: the game's luck goes back to the browser's, and the ids are noted. */
export function endBoot() {
  if (import.meta.env.MODE !== 'test') Math.random = native;
  END = ids();
  return END;
}
