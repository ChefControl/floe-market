// The icons' drawing kit (icons.ts and its batches in this folder draw with it): the box, the outline, the colours
// and the shapes. Every drawing is a few bold, flat shapes in the game's colours, outlined in INK (the Icons section
// of the design book).
export type Ctx = CanvasRenderingContext2D;
export type Drawing = (c: Ctx) => void;

/** The outline's colour and width (in the drawings' units: each is drawn in a box from -50 to 50 each way). */
export const INK = '#1B2733', OUT = 4;
export const TAU = Math.PI * 2;

export const RED = '#E5484D', DEEP_RED = '#C0392B', GOLD = '#F2C14E', DEEP_GOLD = '#C99A22', CREAM = '#FFFDF5';
export const GREEN = '#49C25B', DEEP_GREEN = '#3FA34D', WOOD = '#8A5A3B', DARK_WOOD = '#6B4A35', STEEL = '#B9C6CF';
export const NIGHT = '#22262B', BLUE = '#355C9E', SKY = '#5FA8C8', SKIN = '#F2C9A0', PINK = '#E8607A';

/** One of the bubbles' icons, moved from its box in the bubble ([x, y, w, h]) into the middle of ours, `k` wide. */
export const boxed = (draw: Drawing, [x, y, w, h]: [number, number, number, number], k = 92): Drawing => c => {
  const s = k / w;
  c.scale(s, s); c.translate(-(x + w / 2), -(y + h / 2));
  draw(c);
};

// ---------- drawing helpers ----------

/** Adds a circle to the path, as its own shape. */
export function dot(c: Ctx, x: number, y: number, r: number) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
/** Adds an ellipse to the path, as its own shape. */
export function oval(c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); c.ellipse(x, y, rx, ry, rot, 0, TAU);
}
/** Adds a rounded rectangle to the path, as its own shape (unlike render.ts' rr, which starts a new path). */
export function box(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
/** Adds a closed polygon to the path. */
export function poly(c: Ctx, ...pts: number[]) {
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}

/** Fills a shape in `color`, outlined. */
export function solid(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill(); c.stroke();
}
/** Fills a shape without its outline: markings on another shape. */
export function flat(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill();
}
/**
 * Fills several overlapping shapes as one, with a single outline round the lot (a bumpy batter, a bottle and its
 * neck): the outline is stroked twice as wide underneath, and the fill covers its inner half.
 */
export function blob(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = OUT * 2; c.stroke(); c.lineWidth = OUT;
  c.fillStyle = color; c.fill();
}
/** A thick line (a rod, a leg, a stalk) `w` wide in `color`, outlined. */
export function bar(c: Ctx, color: string, w: number, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = w + OUT * 2; c.stroke();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.lineWidth = OUT; c.strokeStyle = INK;
}
/** A plain line, no outline. */
export function line(c: Ctx, color: string, w: number, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.lineWidth = OUT; c.strokeStyle = INK;
}
/** Draws `f` clipped to `path`. */
export function inside(c: Ctx, path: () => void, f: () => void) {
  c.save(); c.beginPath(); path(); c.clip(); f(); c.restore();
}
/** A leaf `len` long and `w` wide, from (x, y) pointing at `a`. */
export function leaf(c: Ctx, color: string, x: number, y: number, a: number, len: number, w: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  solid(c, color, () => { c.moveTo(0, 0); c.quadraticCurveTo(len / 2, -w, len, 0); c.quadraticCurveTo(len / 2, w, 0, 0); });
  line(c, 'rgba(255,255,255,.35)', 2.5, () => { c.moveTo(len * 0.15, 0); c.lineTo(len * 0.75, 0); });
  c.restore();
}
/** An upright cylinder: its side, then its top, `h` tall from `top` down. */
export function drum(c: Ctx, x: number, top: number, rx: number, ry: number, h: number, side: string, lid: string) {
  solid(c, side, () => {
    c.moveTo(x - rx, top); c.lineTo(x - rx, top + h);
    c.ellipse(x, top + h, rx, ry, 0, Math.PI, 0, true);
    c.lineTo(x + rx, top);
  });
  solid(c, lid, () => oval(c, x, top, rx, ry));
}
/** A heart, its point at the bottom. */
export function heartPath(c: Ctx) {
  c.moveTo(0, 38);
  c.bezierCurveTo(-30, 18, -46, 2, -46, -16);
  c.bezierCurveTo(-46, -34, -30, -42, -21, -42);
  c.bezierCurveTo(-9, -42, -2, -34, 0, -26);
  c.bezierCurveTo(2, -34, 9, -42, 21, -42);
  c.bezierCurveTo(30, -42, 46, -34, 46, -16);
  c.bezierCurveTo(46, 2, 30, 18, 0, 38);
  c.closePath();
}
/** An eye: white with a dark pupil looking `dx` sideways. */
export function eye(c: Ctx, x: number, y: number, r: number, dx = 0) {
  solid(c, '#fff', () => dot(c, x, y, r));
  flat(c, INK, () => dot(c, x + dx, y, r * 0.5));
}
