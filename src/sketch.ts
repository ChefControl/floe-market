// Draw-a-Bug (Draw-an-Idea for an idea): the report's picture (report.ts), big over the dimmed game, to circle what's
// wrong in red with a finger or the mouse. Undo takes back the last line, Clear all of them, Done keeps them, and
// Escape puts it away without the lines drawn this time. The lines are kept apart from the picture, so they can be
// taken back later; report.ts paints them on before sending.

export interface Point { x: number; y: number }
/** One line, in the picture's own pixels. */
export type Stroke = Point[];

const RED = '#FF2D2D';

/** The picture with the lines painted over it, onto `out` (which takes the picture's size). */
export function paint(out: HTMLCanvasElement, base: HTMLCanvasElement, strokes: Stroke[]) {
  if (out.width !== base.width || out.height !== base.height) { out.width = base.width; out.height = base.height; }
  const c = out.getContext('2d');
  if (!c) return;
  c.drawImage(base, 0, 0);
  c.strokeStyle = c.fillStyle = RED;
  c.lineWidth = Math.max(4, base.width / 110);
  c.lineCap = c.lineJoin = 'round';
  for (const s of strokes) {
    c.beginPath();
    if (s.length === 1) { c.arc(s[0].x, s[0].y, c.lineWidth / 2, 0, Math.PI * 2); c.fill(); continue; }
    c.moveTo(s[0].x, s[0].y);
    for (const p of s.slice(1)) c.lineTo(p.x, p.y);
    c.stroke();
  }
}

const $ = (id: string) => document.getElementById(id)!;
const box = $('draw'), cv = $('drawCanvas') as HTMLCanvasElement, heading = $('drawTitle');
const undo = $('drawUndo') as HTMLButtonElement, clear = $('drawClear') as HTMLButtonElement, done = $('drawDone');

let base: HTMLCanvasElement | null = null, lines: Stroke[] = [], line: Stroke | null = null;
let finish: ((s: Stroke[] | null) => void) | null = null;

function redraw() {
  if (base) paint(cv, base, lines);
  undo.disabled = clear.disabled = !lines.length;
}
/** Where a pointer is, in the picture's pixels (the canvas is shown smaller or bigger than it is). */
function at(e: PointerEvent): Point {
  const r = cv.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - r.left) * cv.width / (r.width || cv.width)),
    y: Math.round((e.clientY - r.top) * cv.height / (r.height || cv.height)),
  };
}
function close(kept: Stroke[] | null) {
  box.hidden = true;
  line = null;
  const f = finish;
  finish = null;
  f?.(kept);
}

cv.addEventListener('pointerdown', e => {
  if (!finish) return;
  e.preventDefault();
  cv.setPointerCapture?.(e.pointerId);
  line = [at(e)];
  lines.push(line);
  redraw();
});
cv.addEventListener('pointermove', e => {
  if (!line) return;
  line.push(at(e));
  redraw();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(ev, () => { line = null; });
undo.addEventListener('click', () => { lines.pop(); redraw(); });
clear.addEventListener('click', () => { lines = []; redraw(); });
done.addEventListener('click', () => close(lines));
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !finish) return;
  e.stopImmediatePropagation(); // it closes this, not the settings under it
  close(null);
}, true);

/** Whether Draw-a-Bug is open. */
export const sketching = () => !!finish;

/**
 * Opens Draw-a-Bug on `picture`, with the lines drawn before. Resolves with the lines when Done is pressed, or null
 * if it was put away with Escape.
 */
export function sketch(picture: HTMLCanvasElement, before: Stroke[], idea: boolean): Promise<Stroke[] | null> {
  close(null);
  base = picture;
  lines = before.map(s => [...s]);
  heading.textContent = idea ? 'Draw-an-Idea: sketch it on the game' : "Draw-a-Bug: circle what's wrong";
  box.hidden = false;
  redraw();
  done.focus();
  return new Promise(resolve => { finish = resolve; });
}
