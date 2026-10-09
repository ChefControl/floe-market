// Drag-anywhere virtual joystick plus WASD/arrow keys.
import { canvas, OFF } from './render';
import { V } from './util';

const stick = document.getElementById('stick')!;
const knob = document.getElementById('knob')!;

const joy = { id: null as number | null, sx: 0, sy: 0, x: 0, y: 0 };
const keys: Record<string, boolean> = {};

canvas.addEventListener('pointerdown', e => {
  joy.id = e.pointerId; joy.sx = e.clientX; joy.sy = e.clientY; joy.x = joy.y = 0;
  stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px';
  stick.style.display = 'block'; knob.style.transform = '';
  try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.sx, dy = e.clientY - joy.sy;
  const d = Math.hypot(dx, dy), R = 48;
  if (d > R) { dx = dx / d * R; dy = dy / d * R; }
  joy.x = dx / R; joy.y = dy / R;
  knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
});
function endJoy(e: PointerEvent) {
  if (e.pointerId !== joy.id) return;
  joy.id = null; joy.x = joy.y = 0;
  stick.style.display = 'none';
}
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);
canvas.addEventListener('lostpointercapture', endJoy);
/** Keys typed into a control (the volume sliders, the look's tabs) are for it, not for walking. */
const forControl = (e: KeyboardEvent) => !!(e.target as Element | null)?.closest?.('input, select, textarea, [role="tablist"]');
/**
 * Which key: letters by where they are on the keyboard (KeyW is "w"), so WASD and E work on any layout, Hebrew or
 * AZERTY too; anything else (the arrows) by its name.
 */
const keyOf = (e: KeyboardEvent) => e.code?.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
window.addEventListener('keydown', e => {
  if (forControl(e)) return;
  keys[keyOf(e)] = true;
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[keyOf(e)] = false; });

/** The Buy button (on a touch screen) held down. */
let buyButton = false;
export const holdBuyButton = (on: boolean) => { buyButton = on; };

// A key let go in another window never comes back as a keyup here: switching away lets go of everything, so the
// player doesn't walk on, or keep paying into a tile, by themselves.
function letGo() {
  for (const k in keys) keys[k] = false;
  buyButton = false;
  if (joy.id !== null) endJoy({ pointerId: joy.id } as PointerEvent);
}
window.addEventListener('blur', letGo);
document.addEventListener('visibilitychange', () => { if (document.hidden) letGo(); });
/** Buying: E held, or the Buy button. */
export const buyHeld = () => !!keys['e'] || buyButton;

// Screen-relative directions projected onto the ground, so "up" walks away from the camera.
const camF = V(-OFF.x, 0, -OFF.z).normalize(), camR = V(-camF.z, 0, camF.x);

/** World-space movement direction (length ≤ 1), or null when idle. */
export function inputVec() {
  let x = joy.x, y = joy.y;
  if (keys['a'] || keys['arrowleft']) x -= 1;
  if (keys['d'] || keys['arrowright']) x += 1;
  if (keys['w'] || keys['arrowup']) y -= 1;
  if (keys['s'] || keys['arrowdown']) y += 1;
  const m = Math.hypot(x, y);
  if (m < 0.12) return null;
  if (m > 1) { x /= m; y /= m; }
  return V(camR.x * x + camF.x * -y, 0, camR.z * x + camF.z * -y);
}
