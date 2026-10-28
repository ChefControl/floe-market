// The fight-night faces: the five bosses (fight.ts' BOSSES) and the sparring partner before them (PRACTICE), apart from
// the emoji the game uses for the same creatures elsewhere: 🐙 and 🦀 on the sushi menu, 🐟 the fish, 🐡 Fugu Chips, 🦈
// Harry's loan. Each is a character of its own in the emoji font, from Unicode's private use area, so the page and the
// canvas write it like any emoji.
// The bosses are one set, the fight poster's villains: each faces you head-on, fills the box, glares out from under a
// heavy ink brow slanting down to the middle and bares its teeth. Only Samehada carries an old fight on him, a stitched
// scar across his eye. The sparring partner is the friendly one: a sumo trainee in his head guard, ready for the
// warm-up. Colours from each one's 3D look (creatures.ts).
import {
  type Ctx, type Drawing, BLUE, CREAM, DEEP_RED, GOLD, INK, NIGHT, SKIN, TAU,
  bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

/** The fight-night characters, by kind (`practice`: the sparring partner). */
export const FACE = {
  octopus: '', crab: '', catfish: '', shark: '', puffer: '', practice: '',
} as const;

/** An old scar: pale, healed, stitched across. */
const SCAR = '#F3D3CB';

// ---------- the set's shared parts ----------

/** The brow over an eye at (x, y): ink, thick at the middle, thinning out to the side, cutting the eye's top on the
 *  slant (`s` is the side: -1 left, 1 right). */
function brow(c: Ctx, s: number, x: number, y: number, rx: number, ry: number) {
  solid(c, INK, () => poly(c,
    s * (x + rx * 1.25), y - ry * 1.15,
    s * (x - rx * 1.2), y - ry * 0.35,
    s * (x - rx * 1.2), y + ry * 0.2,
    s * (x + rx * 1.15), y - ry * 0.55));
}

/** A narrowed eye at (x, y): its white (or `iris`), the pupil turned in at you, and the brow over it. */
function glare(c: Ctx, s: number, x: number, y: number, rx: number, ry: number, iris = '#fff') {
  solid(c, iris, () => oval(c, s * x, y, rx, ry));
  flat(c, INK, () => dot(c, s * (x - rx * 0.25), y + ry * 0.2, Math.min(rx, ry) * 0.5));
  brow(c, s, x, y, rx, ry);
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

/** A healed scar: one pale curve from (x0, y0) bowed through (cx, cy) to (x1, y1), a neat stitch across it at each
 *  of `ts` (0 to 1 along it). */
function scar(c: Ctx, [x0, y0, cx, cy, x1, y1]: number[], ts: number[]) {
  line(c, SCAR, 4.5, () => { c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); });
  line(c, SCAR, 3, () => {
    for (const t of ts) {
      const u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy), l = Math.hypot(dx, dy);
      const nx = (-dy / l) * 4.5, ny = (dx / l) * 4.5;
      c.moveTo(x - nx, y - ny); c.lineTo(x + nx, y + ny);
    }
  });
}

/** A whisker: a tapering shape along a curve from (x0, y0) by (ax, ay) and (bx, by) to (x1, y1), `w0` wide at the root
 *  and `w1` at the tip. */
function whisker(c: Ctx, color: string, [x0, y0, ax, ay, bx, by, x1, y1]: number[], w0: number, w1: number, paint = solid) {
  const N = 16, l: number[] = [], r: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1;
    const y = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1;
    const dx = 3 * u * u * (ax - x0) + 6 * u * t * (bx - ax) + 3 * t * t * (x1 - bx);
    const dy = 3 * u * u * (ay - y0) + 6 * u * t * (by - ay) + 3 * t * t * (y1 - by), d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    l.push(x - (dy / d) * w, y + (dx / d) * w); r.unshift(x + (dy / d) * w, y - (dx / d) * w);
  }
  paint(c, color, () => poly(c, ...l, ...r));
}

// ---------- the bosses ----------

/** Hakkaku, the octopus: a big mauve mantle, gold eyes with an octopus's flat bar of a pupil glaring under his brow,
 *  teeth gritted, and thick tentacles curled out under him. */
function hakkaku(c: Ctx) {
  const SK = '#C9739F', DK = '#9E5079';
  for (const [x0, cx, x1, k] of [[-22, -38, -30, -1], [-8, -16, -16, -1], [8, 16, 16, 1], [22, 38, 30, 1]]) {
    bar(c, SK, 12, () => { c.moveTo(x0, 6); c.quadraticCurveTo(cx, 24, x1, 33); c.quadraticCurveTo(x1 + k * 4, 38, x1 + k * 7, 32); });
  }
  solid(c, SK, () => { c.moveTo(-32, 16); c.bezierCurveTo(-42, -10, -35, -42, 0, -42); c.bezierCurveTo(35, -42, 42, -10, 32, 16); c.quadraticCurveTo(0, 30, -34, 16); c.closePath(); });
  flat(c, DK, () => { dot(c, -18, -34, 4.5); dot(c, -4, -39, 3.5); dot(c, -27, -22, 3.5); dot(c, 16, -33, 3.5); });
  // the eyes: gold, a thick bar of a pupil across the middle, the brow pressing down on them
  for (const s of [-1, 1]) {
    const x = 15, y = -3, rx = 10.5, ry = 11, ball = () => oval(c, s * x, y, rx, ry);
    solid(c, GOLD, ball);
    flat(c, INK, () => box(c, s * x - rx * 0.62, y + ry * 0.22, rx * 1.24, ry * 0.4, ry * 0.2));
    brow(c, s, x, y, rx, ry);
  }
  grit(c, -15, 15, 12, 10, 4, 3);
}

/** Yokobashiri, the crab: a dark red shell spiked round its rim, eyes on stalks glaring under their brows, gritted
 *  teeth, and one huge fiddler's claw up beside a small one. Drawn back to front, each piece's outline clear of the
 *  next: legs, arms, claws, then the shell and its eye stalks as one. */
function yokobashiri(c: Ctx) {
  const SH = DEEP_RED, TIP = '#F4E2C8';
  for (const s of [-1, 1]) {
    bar(c, SH, 6, () => { c.moveTo(s * 26, 14); c.lineTo(s * 39, 17); c.lineTo(s * 43, 31); });
    bar(c, SH, 6, () => { c.moveTo(s * 20, 26); c.lineTo(s * 31, 33); c.lineTo(s * 33, 44); });
  }
  // the arms up to the claws: the right one heavier
  bar(c, SH, 8, () => { c.moveTo(-22, 6); c.lineTo(-31, -16); });
  bar(c, SH, 10, () => { c.moveTo(22, 6); c.lineTo(30, -14); });
  // a claw: a round palm with its two fingers open at the top, the gap turned in towards the face
  const claw = (x: number, y: number, r: number, a0: number, a1: number) => solid(c, SH, () => {
    c.moveTo(x, y - r * 0.1); c.arc(x, y, r, a1, a0 + TAU); c.closePath();
  });
  claw(-33, -29, 12, -Math.PI / 2 - 0.05, -Math.PI / 2 + 0.45);
  claw(31, -28, 16, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.05);
  flat(c, TIP, () => { dot(c, 24, -41, 3); dot(c, 33, -42, 3); dot(c, -36, -39, 2.5); dot(c, -28, -39, 2.5); });
  // the shell, spiked round its rim, and the eye stalks standing up out of it: one shape traced round in a single
  // line, so no seam of an inner oval shows through the red
  const RX = 34, RY = 22, CY = 14, at = (a: number) => [Math.cos(a) * RX, CY + Math.sin(a) * RY];
  type Bump = [number, number, () => void];
  const bumps: Bump[] = [];
  for (const t of [0.5, 0.95, 1.4]) for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + s * t, [px, py] = at(a);
    const nx = Math.cos(a) * RY, ny = Math.sin(a) * RX, nl = Math.hypot(nx, ny);
    const d = 5.5 / Math.hypot(Math.sin(a) * RX, Math.cos(a) * RY);
    bumps.push([a - d, a + d, () => c.lineTo(px + (nx / nl) * 9, py + (ny / nl) * 9)]);
  }
  for (const s of [-1, 1]) {
    const x0 = s * 8 - 2.5, x1 = s * 8 + 2.5;
    bumps.push([-Math.acos(x0 / RX), -Math.acos(x1 / RX), () => { c.lineTo(x0, -11.5); c.arc(s * 8, -11.5, 2.5, Math.PI, TAU); }]);
  }
  bumps.sort((p, q) => p[0] - q[0]);
  solid(c, SH, () => {
    // round from the bottom, so every bump (all on the top half) falls inside one turn
    let a = Math.PI / 2;
    c.moveTo(...(at(a) as [number, number]));
    for (const [a0, a1, tip] of bumps) {
      if (a0 + TAU > a) c.ellipse(0, CY, RX, RY, 0, a, a0 + TAU); // spikes side by side can meet at the base
      tip(); c.lineTo(...(at(a1) as [number, number])); a = a1 + TAU;
    }
    c.ellipse(0, CY, RX, RY, 0, a, Math.PI / 2 + TAU);
    c.closePath();
  });
  for (const s of [-1, 1]) glare(c, s, 8.5, -15, 7, 6.5);
  grit(c, -14, 14, 16, 10, 4, 3);
}

/** Dobu, the catfish: a wide, flat, murky olive head, thick pale lips from ear to ear drawn back off small teeth,
 *  little gold eyes set wide on top under their brows, and long dark whiskers sweeping out from the corners of his
 *  mouth. */
function dobu(c: Ctx) {
  const SK = '#6B6748', DK = '#4C4931', UNDER = '#CFC29C';
  // the low fin down his back, behind his head, and his side fins
  solid(c, DK, () => { c.moveTo(-12, -24); c.quadraticCurveTo(-4, -40, 10, -38); c.quadraticCurveTo(8, -30, 12, -24); c.closePath(); });
  for (const s of [-1, 1]) solid(c, DK, () => { c.moveTo(s * 30, 8); c.quadraticCurveTo(s * 46, 14, s * 46, 30); c.quadraticCurveTo(s * 36, 26, s * 24, 18); c.closePath(); });
  // the head: broad, flat on top, widest at the jaw
  const head = () => { c.moveTo(-38, -4); c.bezierCurveTo(-38, -24, -30, -30, 0, -30); c.bezierCurveTo(30, -30, 38, -24, 38, -4); c.bezierCurveTo(38, 12, 24, 20, 0, 20); c.bezierCurveTo(-24, 20, -38, 12, -38, -4); c.closePath(); };
  solid(c, SK, head);
  inside(c, head, () => {
    flat(c, UNDER, () => oval(c, 0, 22, 32, 10));
    flat(c, DK, () => { dot(c, -8, -23, 3.5); dot(c, 8, -25, 3); dot(c, 0, -16, 2.5); });
  });
  c.beginPath(); head(); c.stroke();
  // the mouth from ear to ear, down at the corners, pale lips drawn back off a row of small teeth
  solid(c, UNDER, () => { c.moveTo(-33, 4); c.quadraticCurveTo(0, -18, 33, 4); c.quadraticCurveTo(0, 28, -33, 4); c.closePath(); });
  solid(c, '#2A1E1A', () => { c.moveTo(-25, 4); c.quadraticCurveTo(0, -6, 25, 4); c.quadraticCurveTo(0, 14, -25, 4); c.closePath(); });
  flat(c, CREAM, () => {
    for (let i = 0; i < 7; i++) {
      const x = -15 + i * 5, t = x / 25, y = 4 - 5 * (1 - t * t) + 1;
      c.moveTo(x - 2.5, y - 1); c.lineTo(x, y + 4); c.lineTo(x + 2.5, y - 1); c.closePath();
    }
  });
  // the long whiskers from the corners of his lips, out over his cheeks and drooping
  for (const s of [-1, 1]) whisker(c, UNDER, [s * 29, 3, s * 50, -6, s * 36, 30, s * 48, 42], 10, 4.5);
  for (const s of [-1, 1]) glare(c, s, 21, -15, 6.5, 6, GOLD);
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
  // the old scar down through his left brow, cutting a notch in it, over the eye's rim but not the eye itself, and on
  // down his cheek
  inside(c, () => {
    c.rect(-50, -50, 100, 100);
    c.moveTo(28, -14); c.ellipse(20, -14, 8, 6.5, 0, 0, TAU, true); // the eye's white, left out…
    poly(c, 29.2, -15.6, 10.4, -10.7, 10.4, -16.3, 30, -21.5); // …but not where the brow lies over it
  }, () => scar(c, [13, -31, 25, -19, 27, -1], [0.16, 0.87]));
}

/** Fukure, the pufferfish, blown up for the fight: a big olive ball with a rim of thick spines, darker over his back,
 *  pale under, big gold eyes under angry brows and a wide set of gritted teeth. */
function fukure(c: Ctx) {
  const SK = '#8E8358', UNDER = '#F2EEE2', IRIS = '#E8C640', cy = 2, R = 32, N = 12;
  const ball = () => {
    dot(c, 0, cy, R);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU - Math.PI / 2, b = 0.2, at = (t: number, r: number) => [Math.cos(a + t) * r, cy + Math.sin(a + t) * r];
      poly(c, ...at(-b, R - 3), ...at(0, 46), ...at(b, R - 3));
    }
  };
  blob(c, SK, ball);
  inside(c, ball, () => {
    flat(c, UNDER, () => oval(c, 0, cy + 30, 27, 13));
    flat(c, '#2A2116', () => { dot(c, -16, -20, 2.8); dot(c, 0, -24, 2.8); dot(c, 16, -20, 2.8); });
  });
  // the eyes, and thin brows slanting down to the middle just over them, clear of the pupils
  for (const s of [-1, 1]) {
    const x = 14, y = -3, rx = 10.5, ry = 9.5;
    solid(c, IRIS, () => oval(c, s * x, y, rx, ry));
    flat(c, INK, () => dot(c, s * (x - rx * 0.25), y + ry * 0.2, ry * 0.5));
    solid(c, INK, () => poly(c, s * 1.5, -10, s * 27.5, -17.5, s * 26.5, -14, s * 2, -7));
  }
  grit(c, -17, 17, 17, 12, 4, 4);
}

/** The sparring partner: a round, friendly sumo trainee in a blue padded head guard over his black hair and topknot,
 *  brows set and grinning, ready for the warm-up. */
function sparring(c: Ctx) {
  const PAD = BLUE, SEAM = '#24447A', MOUTH = '#5A1E26', cy = 8;
  const face = () => oval(c, 0, cy, 37, 36);
  solid(c, SKIN, face);
  inside(c, face, () => {
    // his hair, slicked back, its line low on his brow and down his cheeks
    flat(c, NIGHT, () => {
      c.moveTo(-44, cy - 50); c.lineTo(44, cy - 50); c.lineTo(44, cy + 4); c.lineTo(31, cy + 4);
      c.quadraticCurveTo(30, cy - 11, 20, cy - 12); c.quadraticCurveTo(0, cy - 8, -20, cy - 12);
      c.quadraticCurveTo(-30, cy - 11, -31, cy + 4); c.lineTo(-44, cy + 4); c.closePath();
    });
    flat(c, 'rgba(255,255,255,.3)', () => oval(c, -16, cy - 31, 7, 2.6, -0.35));
  });
  c.beginPath(); face(); c.stroke();
  // his topknot, folded forward on the crown
  solid(c, NIGHT, () => oval(c, 0, cy - 39, 11, 6.5));
  flat(c, 'rgba(255,255,255,.3)', () => oval(c, -4, cy - 41, 4, 1.8, -0.2));
  // the head guard: a padded band round his forehead and pads over his ears
  solid(c, PAD, () => box(c, -33, cy - 26, 66, 9, 4.5));
  for (const s of [-1, 1]) solid(c, PAD, () => oval(c, s * 38, cy + 2, 8, 11));
  line(c, SEAM, 2.5, () => { for (const x of [-13, 13]) { c.moveTo(x, cy - 23.5); c.lineTo(x, cy - 19.5); } });
  // set brows, eyes, a grin and rosy cheeks
  for (const s of [-1, 1]) {
    line(c, INK, 5, () => { c.moveTo(s * 21, cy - 5); c.lineTo(s * 8, cy - 2); });
    flat(c, INK, () => dot(c, s * 13, cy + 5, 4.5));
    flat(c, 'rgba(229,72,77,.35)', () => dot(c, s * 24, cy + 16, 6));
  }
  const grin = () => { c.moveTo(-14, cy + 15); c.quadraticCurveTo(0, cy + 18, 14, cy + 15); c.quadraticCurveTo(12, cy + 30, 0, cy + 30); c.quadraticCurveTo(-12, cy + 30, -14, cy + 15); c.closePath(); };
  solid(c, MOUTH, grin);
  inside(c, grin, () => flat(c, CREAM, () => box(c, -16, cy + 12, 32, 8.5, 2)));
  c.beginPath(); grin(); c.stroke();
}

export const BOSS: Record<string, Drawing> = {
  [FACE.octopus]: hakkaku,
  [FACE.crab]: yokobashiri,
  [FACE.catfish]: dobu,
  [FACE.shark]: samehada,
  [FACE.puffer]: fukure,
  [FACE.practice]: sparring,
};
