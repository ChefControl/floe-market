// The five fight-night bosses' own faces (fight.ts' BOSSES), apart from the emoji the game uses for the same creatures
// elsewhere: 🐙 and 🦀 on the sushi menu, 🐟 the fish, 🐡 Fugu Chips, 🦈 Harry's loan. Each is a character of its own
// in the emoji font, from Unicode's private use area, so the page and the canvas write it like any emoji.
// They're one set, the fight poster's villains: each faces you head-on, fills the box, glares out from under a heavy
// ink brow slanting down to the middle, bares its teeth, and carries an old fight on it (a stitched scar, a chipped
// claw, a snapped whisker, a bitten fin, a broken spine). Colours from each one's 3D look (creatures.ts).
import {
  type Ctx, type Drawing, CREAM, DEEP_RED, GOLD, INK, TAU,
  bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

/** The bosses' characters, by kind. */
export const FACE = { octopus: '\uE001', crab: '\uE002', catfish: '\uE003', shark: '\uE004', puffer: '\uE005' } as const;

/** An old scar: pale, healed, stitched across. */
const SCAR = '#F3D3CB';

// ---------- the set's shared parts ----------

/** A narrowed eye at (x, y): its white, the pupil turned in at you, and an ink brow over its top slanting down to the
 *  middle (`s` is the side: -1 left, 1 right). `bar` draws the pupil as an octopus's slot. */
function glare(c: Ctx, s: number, x: number, y: number, rx: number, ry: number, opts: { iris?: string; bar?: boolean } = {}) {
  solid(c, opts.iris ?? '#fff', () => oval(c, s * x, y, rx, ry));
  if (opts.bar) flat(c, INK, () => box(c, s * x - rx * 0.7 - s * 1.5, y + ry * 0.05, rx * 1.4, ry * 0.42, ry * 0.2));
  else flat(c, INK, () => dot(c, s * (x - rx * 0.25), y + ry * 0.2, Math.min(rx, ry) * 0.5));
  // the brow: thick at the middle, thinning out to the side, cutting the eye's top on the slant
  solid(c, INK, () => poly(c,
    s * (x + rx * 1.25), y - ry * 1.15,
    s * (x - rx * 1.2), y - ry * 0.35,
    s * (x - rx * 1.2), y + ry * 0.2,
    s * (x + rx * 1.15), y - ry * 0.55));
}

/** A scar from (x0, y0) to (x1, y1), `n` stitches across it. */
function scar(c: Ctx, x0: number, y0: number, x1: number, y1: number, n = 2) {
  line(c, SCAR, 4, () => { c.moveTo(x0, y0); c.lineTo(x1, y1); });
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = (-dy / l) * 4.5, ny = (dx / l) * 4.5;
  line(c, SCAR, 2.5, () => {
    for (let i = 1; i <= n; i++) { const t = i / (n + 1), x = x0 + dx * t, y = y0 + dy * t; c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny); }
  });
}

/** Gritted teeth in a frown: a cream band from x0 to x1, its corners pulled down, ink gaps between `n` teeth. */
function grit(c: Ctx, x0: number, x1: number, y: number, h: number, n: number, bow = 6) {
  const mid = (x0 + x1) / 2;
  const shape = () => {
    c.moveTo(x0, y + bow); c.quadraticCurveTo(mid, y - bow, x1, y + bow);
    c.lineTo(x1, y + bow + h * 0.6); c.quadraticCurveTo(mid, y - bow + h * 1.1, x0, y + bow + h * 0.6); c.closePath();
  };
  solid(c, CREAM, shape);
  line(c, INK, 2.5, () => {
    c.moveTo(x0 + 2, y + bow + h * 0.3); c.quadraticCurveTo(mid, y - bow + h * 0.55, x1 - 2, y + bow + h * 0.3);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, t = (x - mid) / ((x1 - x0) / 2), top = y - bow + bow * 2 * t * t;
      c.moveTo(x, top + 1); c.lineTo(x, top + h * 0.85);
    }
  });
}

// ---------- the bosses ----------

/** Hakkaku, the octopus: a big mauve mantle, slot-pupilled eyes glaring under his brow, teeth gritted, a stitched
 *  scar over his dome, and thick tentacles curled out under him. */
function hakkaku(c: Ctx) {
  const SK = '#C9739F', DK = '#9E5079';
  for (const [x0, cx, x1, k] of [[-22, -38, -30, -1], [-8, -16, -16, -1], [8, 16, 16, 1], [22, 38, 30, 1]]) {
    bar(c, SK, 12, () => { c.moveTo(x0, 6); c.quadraticCurveTo(cx, 24, x1, 33); c.quadraticCurveTo(x1 + k * 4, 38, x1 + k * 7, 32); });
  }
  solid(c, SK, () => { c.moveTo(-32, 16); c.bezierCurveTo(-42, -10, -35, -42, 0, -42); c.bezierCurveTo(35, -42, 42, -10, 32, 16); c.quadraticCurveTo(0, 30, -34, 16); c.closePath(); });
  flat(c, DK, () => { dot(c, -18, -34, 4.5); dot(c, -4, -39, 3.5); dot(c, -27, -22, 3.5); });
  scar(c, 11, -37, 24, -18);
  for (const s of [-1, 1]) glare(c, s, 15, -4, 10, 8, { bar: true });
  grit(c, -15, 15, 12, 10, 4, 3);
}

/** Yokobashiri, the crab: a dark red spiked shell, eyes on stalks under their brows, gritted teeth, one huge fiddler's
 *  claw up and the other chipped. */
function yokobashiri(c: Ctx) {
  const SH = DEEP_RED, TIP = '#F4E2C8';
  for (const s of [-1, 1]) {
    for (const [y, dy] of [[14, 22], [22, 32]]) bar(c, SH, 6, () => { c.moveTo(s * 24, y); c.lineTo(s * 36, y + 2); c.lineTo(s * 40, dy + 10); });
  }
  // the arms up to the claws: the right one huge
  bar(c, SH, 8, () => { c.moveTo(-18, 4); c.lineTo(-28, -14); });
  bar(c, SH, 10, () => { c.moveTo(20, 4); c.lineTo(28, -12); });
  // the small claw, the tip of one finger snapped off
  solid(c, SH, () => {
    const x = -30, y = -25, r = 13, at = (a: number, k: number) => c.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k);
    c.moveTo(x, y);
    at(-Math.PI / 2 + 0.55, 0.62); at(-Math.PI / 2 + 1.05, 1);
    c.arc(x, y, r, -Math.PI / 2 + 1.05, -Math.PI / 2 - 0.5 + TAU);
    c.closePath();
  });
  // the big claw
  solid(c, SH, () => { const x = 26, y = -24, r = 18; c.moveTo(x, y); c.arc(x, y, r, -Math.PI / 2 + 0.2, -Math.PI / 2 - 0.55 + TAU); c.closePath(); });
  flat(c, TIP, () => { dot(c, 21, -38, 3); dot(c, 33, -37, 3); dot(c, -36, -34, 2.5); });
  // the shell, spiked round its top
  blob(c, SH, () => {
    oval(c, 0, 14, 34, 22);
    for (let i = -3; i <= 3; i++) { const x = i * 10, y = -6 + Math.abs(i) * Math.abs(i) * 1.2; c.moveTo(x - 5, y + 4); c.lineTo(x, y - 7); c.lineTo(x + 5, y + 4); c.closePath(); }
  });
  scar(c, -26, 6, -10, 28, 1);
  // eyes on stalks
  for (const s of [-1, 1]) {
    bar(c, SH, 5, () => { c.moveTo(s * 6, 0); c.lineTo(s * 9, -12); });
    glare(c, s, 10, -17, 7, 6.5);
  }
  grit(c, -14, 14, 16, 10, 4, 3);
}

/** A whisker: a tapering shape along a curve from (x0, y0) by (cx, cy) to (x1, y1), `w0` wide at the root and `w1` at
 *  the tip (a blunt tip is one snapped off). */
function whisker(c: Ctx, color: string, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number) {
  const N = 12, l: number[] = [], r: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy), d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    l.push(x - (dy / d) * w, y + (dx / d) * w); r.unshift(x + (dy / d) * w, y - (dx / d) * w);
  }
  solid(c, color, () => poly(c, ...l, ...r));
}

/** Dobu, the catfish: a wide, flat, murky olive head, little gold eyes set wide under their brows, a mouth from ear to
 *  ear lined with teeth, and long whiskers drooping from its corners, the right one snapped short. */
function dobu(c: Ctx) {
  const SK = '#6B6748', DK = '#4C4931', UNDER = '#CFC29C', WHISK = '#CFC29C';
  const head = () => { c.moveTo(-42, 6); c.bezierCurveTo(-42, -22, -24, -32, 0, -32); c.bezierCurveTo(24, -32, 42, -22, 42, 6); c.bezierCurveTo(42, 22, 24, 28, 0, 28); c.bezierCurveTo(-24, 28, -42, 22, -42, 6); c.closePath(); };
  solid(c, SK, head);
  inside(c, head, () => {
    flat(c, UNDER, () => oval(c, 0, 30, 40, 13));
    flat(c, DK, () => { dot(c, -18, -24, 4); dot(c, 2, -27, 3.5); dot(c, 22, -23, 3); dot(c, -33, -8, 3); dot(c, 34, -6, 2.5); });
  });
  c.beginPath(); head(); c.stroke();
  scar(c, -6, -31, 6, -14, 1);
  // the mouth from ear to ear, down at the corners, a row of small teeth along its top
  solid(c, '#2A1E1A', () => { c.moveTo(-34, 14); c.quadraticCurveTo(0, -4, 34, 14); c.quadraticCurveTo(0, 26, -34, 14); c.closePath(); });
  flat(c, CREAM, () => {
    for (let i = 0; i < 9; i++) {
      const x = -22 + i * 5.5, t = x / 34, y = 14 - 9 * (1 - t * t);
      c.moveTo(x - 3, y - 1); c.lineTo(x, y + 5); c.lineTo(x + 3, y - 1); c.closePath();
    }
  });
  for (const s of [-1, 1]) glare(c, s, 23, -12, 7, 6, { iris: GOLD });
  // the whiskers from the corners of his mouth, the right one snapped short
  whisker(c, WHISK, -30, 13, -50, 18, -40, 44, 8, 2);
  whisker(c, WHISK, 30, 13, 44, 16, 43, 28, 8, 5.5);
}

/** Samehada, the shark: a blue-grey head coming straight at you, jaws wide on two rows of teeth, eyes narrowed under a
 *  hard brow, a scar across his left eye, and a bite out of the fin behind. */
function samehada(c: Ctx) {
  const SK = '#6F88A0', DK = '#4F6575', UNDER = '#EEF0F0';
  // the fin on his back behind his head, a bite out of its edge
  solid(c, DK, () => { c.moveTo(-6, -24); c.lineTo(4, -48); c.lineTo(9, -40); c.quadraticCurveTo(5, -36, 11, -32); c.lineTo(16, -24); c.closePath(); });
  // the pectoral fins out to the sides
  for (const s of [-1, 1]) solid(c, DK, () => poly(c, s * 30, 14, s * 48, 32, s * 26, 28));
  const head = () => { c.moveTo(0, -36); c.bezierCurveTo(30, -36, 42, -12, 40, 10); c.bezierCurveTo(38, 34, 20, 42, 0, 42); c.bezierCurveTo(-20, 42, -38, 34, -40, 10); c.bezierCurveTo(-42, -12, -30, -36, 0, -36); c.closePath(); };
  solid(c, SK, head);
  inside(c, head, () => flat(c, UNDER, () => oval(c, 0, 32, 38, 20)));
  c.beginPath(); head(); c.stroke();
  for (const s of [-1, 1]) line(c, DK, 2.5, () => { for (const x of [33, 37]) { c.moveTo(s * x, -4); c.lineTo(s * (x - 1), 10); } });
  // the jaws, gaping, a row of teeth top and bottom
  const mouth = () => { c.moveTo(-28, 6); c.quadraticCurveTo(0, -4, 28, 6); c.quadraticCurveTo(26, 38, 0, 38); c.quadraticCurveTo(-26, 38, -28, 6); c.closePath(); };
  solid(c, '#5A1E26', mouth);
  inside(c, mouth, () => {
    flat(c, '#fff', () => {
      for (let i = 0; i < 7; i++) { const x = -24 + i * 8, y = 2 + Math.abs(x) * 0.12 + 1; c.moveTo(x - 4.5, y); c.lineTo(x, y + 11); c.lineTo(x + 4.5, y); c.closePath(); }
      for (let i = 0; i < 6; i++) { const x = -20 + i * 8, y = 40 - Math.abs(x) * 0.25; c.moveTo(x - 4, y); c.lineTo(x, y - 10); c.lineTo(x + 4, y); c.closePath(); }
    });
  });
  c.beginPath(); mouth(); c.stroke();
  for (const s of [-1, 1]) glare(c, s, 20, -14, 8, 6.5);
  scar(c, 13, -30, 28, -2, 2);
}

/** Fukure, the pufferfish: blown up into a ball, every spine out (one snapped short), olive over a pale belly, big gold
 *  eyes under heavy brows, thick lips drawn back off his beak, a scar on his brow. */
function fukure(c: Ctx) {
  const SK = '#8E8358', BK = '#6E6542', UNDER = '#F2EEE2', QUILL = '#F3EEE0', LIP = '#EADCC6', cy = 2;
  blob(c, QUILL, () => {
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * TAU - Math.PI / 2 + TAU / 30, b = 0.3;
      const at = (t: number, r: number) => c.lineTo(Math.cos(a + t) * r, cy + Math.sin(a + t) * r);
      c.moveTo(Math.cos(a - b) * 25, cy + Math.sin(a - b) * 25);
      if (i === 12) { at(-0.1, 37); at(0.07, 34); } else at(0, 44);
      at(b, 25);
    }
  });
  const body = () => dot(c, 0, cy, 32);
  solid(c, SK, body);
  inside(c, body, () => {
    flat(c, BK, () => oval(c, 0, cy - 32, 38, 17));
    flat(c, UNDER, () => oval(c, 0, cy + 30, 30, 16));
    flat(c, '#2A2116', () => { dot(c, -18, -18, 2.8); dot(c, -4, -25, 2.5); dot(c, 12, -22, 2.5); dot(c, -26, 0, 2.5); dot(c, 26, -6, 2.5); });
  });
  c.beginPath(); body(); c.stroke();
  scar(c, -24, -22, -10, -2, 1);
  for (const s of [-1, 1]) glare(c, s, 15, -4, 10, 9, { iris: '#E8C640' });
  // thick lips in a scowl, the beak's teeth bared between them
  solid(c, LIP, () => { c.moveTo(-17, 22); c.quadraticCurveTo(0, 6, 17, 22); c.quadraticCurveTo(0, 36, -17, 22); c.closePath(); });
  solid(c, CREAM, () => { c.moveTo(-10, 20); c.quadraticCurveTo(0, 13, 10, 20); c.lineTo(10, 25); c.quadraticCurveTo(0, 29, -10, 25); c.closePath(); });
  line(c, INK, 2.5, () => { c.moveTo(-9, 22.5); c.quadraticCurveTo(0, 19, 9, 22.5); c.moveTo(0, 16); c.lineTo(0, 27); });
}

export const BOSS: Record<string, Drawing> = {
  [FACE.octopus]: hakkaku,
  [FACE.crab]: yokobashiri,
  [FACE.catfish]: dobu,
  [FACE.shark]: samehada,
  [FACE.puffer]: fukure,
};
