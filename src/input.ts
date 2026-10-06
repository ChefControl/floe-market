// Drag-anywhere virtual joystick plus WASD/arrow keys.
import { canvas, OFF } from './render';
import { V } from './util';

const stick = document.getElementById('stick')!;
const knob = document.getElementById('knob')!;
const intro = document.getElementById('intro')!;

const joy = { id: null as number | null, sx: 0, sy: 0, x: 0, y: 0 };
const keys: Record<string, boolean> = {};

export function dismissIntro() {
  if (!intro.classList.contains('gone')) {
    intro.classList.add('gone');
    setTimeout(() => intro.remove(), 400);
  }
}

canvas.addEventListener('pointerdown', e => {
  dismissIntro();
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
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.startsWith('Arrow')) e.preventDefault();
  dismissIntro();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

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
