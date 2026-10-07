// Arrows at the edge of the screen pointing the way to something new (an upgrade tile that has just appeared) while
// it's off-screen. Each goes once the player has had it in view for a moment, or once it's gone.
import { camera } from './render';
import { V } from './util';

interface Mark {
  at: { x: number; y: number; z: number };
  /** False once there's nothing to point to any more (the tile was bought). */
  alive: () => boolean;
  el: HTMLElement;
  arrow: HTMLElement;
  /** Seconds it's been in view. */
  seen: number;
}

/** Seconds something must be in view before it no longer needs pointing to. */
const SEEN = 1;
/** How far the arrows keep in from the edges of the screen. */
const EDGE = 34;

const marks: Mark[] = [];
const box = document.getElementById('pointers')!;
const blockers = ['hud', 'corner'].map(id => document.getElementById(id)!);

/** Points to `at` (labelled with `icon`) until the player has seen it, or until `alive` says it's gone. */
export function pointAt(at: { x: number; y: number; z: number }, icon: string, alive: () => boolean) {
  const el = document.createElement('div');
  el.className = 'ptr';
  el.hidden = true;
  el.innerHTML = '<i></i><span></span>';
  el.lastChild!.textContent = icon;
  box.appendChild(el);
  marks.push({ at, alive, el, arrow: el.firstChild as HTMLElement, seen: 0 });
}

export function updPointers(dt: number) {
  const w = window.innerWidth, h = window.innerHeight, cx = w / 2, cy = h / 2;
  for (const m of [...marks]) {
    if (!m.alive() || m.seen >= SEEN) {
      m.el.remove();
      marks.splice(marks.indexOf(m), 1);
      continue;
    }
    const v = V(m.at.x, m.at.y + 0.3, m.at.z).project(camera);
    // behind the camera, the projection comes out mirrored
    const s = v.z > 1 ? -1 : 1;
    const dx = s * v.x * cx, dy = -s * v.y * cy;
    if (s > 0 && Math.abs(dx) < cx - EDGE && Math.abs(dy) < cy - EDGE) {
      m.seen += dt;
      m.el.hidden = true;
      continue;
    }
    // where the line from the middle of the screen towards it meets the edge
    const k = Math.min((cx - EDGE) / Math.max(Math.abs(dx), 1e-6), (cy - EDGE) / Math.max(Math.abs(dy), 1e-6));
    const x = cx + dx * k;
    let y = cy + dy * k;
    // keep clear of the HUD and the buttons in the corner
    for (const b of blockers) {
      const r = b.getBoundingClientRect();
      if (x > r.left - EDGE && x < r.right + EDGE && y < r.bottom + EDGE) y = r.bottom + EDGE;
    }
    m.el.hidden = false;
    m.el.style.transform = `translate(${x}px, ${y}px)`;
    m.arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }
}
