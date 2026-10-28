// The game's icon drawings (src/icons.ts) as SVG, for the emoji font (scripts/fonts/build.py turns them into its
// glyphs). A drawing is replayed on a stand-in canvas that writes each fill and stroke down as an SVG path, in the
// drawings' own box (-50 to 50 each way). `node scripts/icons/svg.ts <folder>` writes one file per emoji, named the way
// nanoemoji reads them: emoji_u1f41f.svg, emoji_u1f9d1_200d_1f373.svg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { DRAWINGS } from '../../src/icons.ts';
import { INK, OUT } from '../../src/icons/kit.ts';

type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const n = (v: number) => +v.toFixed(2);

/** A colour as SVG wants it: rgba() split into the colour and its opacity. */
function paint(c: string): [string, number] {
  const m = /^rgba?\(([^)]+)\)$/.exec(c.replace(/\s/g, ''));
  if (!m) return [c, 1];
  const [r, g, b, a = '1'] = m[1].split(',');
  return [`rgb(${r},${g},${b})`, Number(a)];
}

interface State { m: M; fill: string; stroke: string; lw: number; cap: string; join: string; clip: string[] }

/** The stand-in canvas: only what the drawings use. Text has no place in an icon (draw the letters as shapes). */
export class SvgCtx {
  out: string[] = [];
  defs: string[] = [];
  private s: State = { m: [1, 0, 0, 1, 0, 0], fill: '#000', stroke: INK, lw: OUT, cap: 'round', join: 'round', clip: [] };
  private stack: State[] = [];
  private d: string[] = [];
  private x = 0; private y = 0; private sx = 0; private sy = 0;
  private clips = 0;

  set fillStyle(v: string) { this.s.fill = v; } get fillStyle() { return this.s.fill; }
  set strokeStyle(v: string) { this.s.stroke = v; } get strokeStyle() { return this.s.stroke; }
  set lineWidth(v: number) { this.s.lw = v; } get lineWidth() { return this.s.lw; }
  set lineCap(v: string) { this.s.cap = v; } get lineCap() { return this.s.cap; }
  set lineJoin(v: string) { this.s.join = v; } get lineJoin() { return this.s.join; }
  set globalAlpha(v: number) { if (v !== 1) throw new Error('globalAlpha: fade a shape with an rgba() colour instead'); }
  get globalAlpha() { return 1; }
  set font(_: string) { throw new Error('text: draw letters as shapes, an icon has no text'); }
  set textAlign(_: string) {} set textBaseline(_: string) {}
  fillText() { throw new Error('text: draw letters as shapes, an icon has no text'); }

  save() { this.stack.push({ ...this.s, clip: [...this.s.clip] }); }
  restore() { const s = this.stack.pop(); if (s) this.s = s; }
  translate(x: number, y: number) { this.s.m = mul(this.s.m, [1, 0, 0, 1, x, y]); }
  scale(x: number, y: number) { this.s.m = mul(this.s.m, [x, 0, 0, y, 0, 0]); }
  rotate(a: number) { const c = Math.cos(a), s = Math.sin(a); this.s.m = mul(this.s.m, [c, s, -s, c, 0, 0]); }

  private p(x: number, y: number) { const m = this.s.m; return `${n(m[0] * x + m[2] * y + m[4])} ${n(m[1] * x + m[3] * y + m[5])}`; }
  beginPath() { this.d = []; }
  moveTo(x: number, y: number) { this.d.push('M' + this.p(x, y)); this.x = this.sx = x; this.y = this.sy = y; }
  lineTo(x: number, y: number) { this.d.push((this.d.length ? 'L' : 'M') + this.p(x, y)); this.x = x; this.y = y; }
  closePath() { this.d.push('Z'); this.x = this.sx; this.y = this.sy; }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    this.d.push(`Q${this.p(cx, cy)} ${this.p(x, y)}`); this.x = x; this.y = y;
  }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) {
    this.d.push(`C${this.p(a, b)} ${this.p(c, d)} ${this.p(x, y)}`); this.x = x; this.y = y;
  }
  rect(x: number, y: number, w: number, h: number) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath();
  }
  fillRect(x: number, y: number, w: number, h: number) { const d = this.d; this.d = []; this.rect(x, y, w, h); this.fill(); this.d = d; }
  /** An elliptical arc as cubic Béziers (each at most a quarter turn), so it survives any transform. */
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false) {
    let sweep = a1 - a0;
    if (!ccw && sweep < 0) sweep = sweep % (2 * Math.PI) + 2 * Math.PI;
    if (ccw && sweep > 0) sweep = sweep % (2 * Math.PI) - 2 * Math.PI;
    if (Math.abs(a1 - a0) >= 2 * Math.PI) sweep = ccw ? -2 * Math.PI : 2 * Math.PI;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const at = (a: number) => [cx + rx * Math.cos(a) * cr - ry * Math.sin(a) * sr, cy + rx * Math.cos(a) * sr + ry * Math.sin(a) * cr];
    const d = (a: number) => [-rx * Math.sin(a) * cr - ry * Math.cos(a) * sr, -rx * Math.sin(a) * sr + ry * Math.cos(a) * cr];
    const [x0, y0] = at(a0);
    if (this.d.length) this.lineTo(x0, y0); else this.moveTo(x0, y0);
    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9)), h = sweep / steps;
    const k = 4 / 3 * Math.tan(h / 4);
    for (let i = 0; i < steps; i++) {
      const s = a0 + i * h, e = s + h, [px, py] = at(s), [qx, qy] = at(e), [dx0, dy0] = d(s), [dx1, dy1] = d(e);
      this.bezierCurveTo(px + k * dx0, py + k * dy0, qx - k * dx1, qy - k * dy1, qx, qy);
    }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
    const x0 = this.x, y0 = this.y;
    const v1 = [x0 - x1, y0 - y1], v2 = [x2 - x1, y2 - y1];
    const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    if (!r || !l1 || !l2 || Math.abs(cross) < 1e-9) { this.lineTo(x1, y1); return; }
    const ang = Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)), t = r / Math.tan(ang / 2);
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const p1 = [x1 + u1[0] * t, y1 + u1[1] * t], p2 = [x1 + u2[0] * t, y1 + u2[1] * t];
    const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(bis[0], bis[1]), dc = r / Math.sin(ang / 2);
    const cx = x1 + bis[0] / bl * dc, cy = y1 + bis[1] / bl * dc;
    this.lineTo(p1[0], p1[1]);
    this.arc(cx, cy, r, Math.atan2(p1[1] - cy, p1[0] - cx), Math.atan2(p2[1] - cy, p2[0] - cx), cross > 0);
  }

  private clipAttr() { return this.s.clip.length ? ` clip-path="url(#${this.s.clip[this.s.clip.length - 1]})"` : ''; }
  fill() {
    if (!this.d.length) return;
    const [col, a] = paint(this.s.fill);
    this.out.push(`<path d="${this.d.join('')}" fill="${col}"${a < 1 ? ` fill-opacity="${a}"` : ''}${this.clipAttr()}/>`);
  }
  stroke() {
    if (!this.d.length) return;
    const [col, a] = paint(this.s.stroke), m = this.s.m, k = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    this.out.push(`<path d="${this.d.join('')}" fill="none" stroke="${col}"${a < 1 ? ` stroke-opacity="${a}"` : ''}`
      + ` stroke-width="${n(this.s.lw * k)}" stroke-linecap="${this.s.cap}" stroke-linejoin="${this.s.join}"${this.clipAttr()}/>`);
  }
  clip() {
    const id = `c${this.clips++}`, parent = this.clipAttr();
    this.defs.push(`<clipPath id="${id}"><path d="${this.d.join('')}"${parent}/></clipPath>`);
    this.s.clip.push(id);
  }
}

/** One drawing as an SVG, 100 units square, centred like the game paints it (icons.ts' paint). */
export function svgOf(emoji: string) {
  const c = new SvgCtx();
  c.translate(50, 50);
  DRAWINGS[emoji](c as unknown as CanvasRenderingContext2D);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${c.defs.join('')}</defs>${c.out.join('')}</svg>`;
}

/** nanoemoji's name for an emoji's file: its code points, without the presentation selector. */
export const fileOf = (emoji: string) =>
  'emoji_u' + [...emoji].map(ch => ch.codePointAt(0)!).filter(cp => cp !== 0xFE0F).map(cp => cp.toString(16)).join('_') + '.svg';

if (process.argv[1]?.endsWith('svg.ts')) {
  const dir = process.argv[2];
  mkdirSync(dir, { recursive: true });
  for (const e of Object.keys(DRAWINGS)) if ([...e].some(ch => ch.codePointAt(0)! > 0x7F)) writeFileSync(`${dir}/${fileOf(e)}`, svgOf(e));
}
