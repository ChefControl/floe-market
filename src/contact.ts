// Contact shadows: a soft dark smudge on the floor under something lying or standing on it, so it sits on the floor
// rather than floating over it (the cheapest ambient occlusion there is: a few see-through quads, merged into one mesh,
// drawn once). For loose things the cellar's baked furniture shading (cellar.ts, occlude) doesn't reach.
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from './render';

/** One smudge: its middle on the floor, its half-sizes across (`rx`, and `rz`, or round), turned `ry`. */
export interface Smudge { x: number; z: number; rx: number; rz?: number; ry?: number }

let mat: MeshBasicMaterial | null = null;
/** The smudge's look: black, fading from the middle out (made once). */
function smudgeMat() {
  return mat ??= new MeshBasicMaterial({
    map: canvasTex(64, 64, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    }).tex,
    transparent: true, depthWrite: false,
  });
}

/** How far past what's on it a smudge reaches (its sizes are what's on it). */
const REACH = 1.4;
/** The smudges under `spots`, on the floor at `y`, as one mesh, `opacity` dark at their darkest. */
export function contactShadows(spots: Smudge[], y: number, opacity = 0.8) {
  const geos = spots.map(s => {
    const g = new PlaneGeometry(2 * REACH * s.rx, 2 * REACH * (s.rz ?? s.rx));
    g.rotateX(-Math.PI / 2); g.rotateY(s.ry ?? 0); g.translate(s.x, y, s.z);
    return g;
  });
  const m = smudgeMat().clone();
  m.opacity = opacity;
  const o = new Mesh(mergeGeometries(geos)!, m);
  o.renderOrder = -1;
  geos.forEach(g => g.dispose());
  return o;
}
