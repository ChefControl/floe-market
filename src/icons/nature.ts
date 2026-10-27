// Icons for seasons, weather and marks, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, CREAM, DEEP_GOLD, DEEP_RED, GOLD, PINK, RED, SKIN, TAU,
  bar, blob, box, dot, flat, heartPath, line, oval, poly, solid,
} from './kit';

// colours of their own: an orange for flames and autumn leaves, ice for frost, blossom pink, and a hand's shading
const ORANGE = '#F08A3C', DEEP_ORANGE = '#D9622B', ICE = '#BFE8F7', BLOSSOM = '#F9B4C6', SKIN_LINE = '#C98E62';

/** A star with `n` points, from radius `r` to `ri` between them, its first point at angle `a0`. */
function starPath(c: Ctx, x: number, y: number, n: number, r: number, ri: number, a0 = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const a = a0 + (i * Math.PI) / n, k = i % 2 ? ri : r;
    if (i) c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); else c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
}

// ---------- the seasons ----------

/** ☀ Summer: a gold sun, its rays all round. */
function sun(c: Ctx) {
  solid(c, GOLD, () => {
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8, s = Math.sin(a), k = Math.cos(a);
      c.moveTo(k * 46, s * 46);
      c.lineTo(k * 30 - s * 10, s * 30 + k * 10); c.lineTo(k * 30 + s * 10, s * 30 - k * 10); c.closePath();
    }
  });
  solid(c, GOLD, () => dot(c, 0, 0, 28));
  flat(c, 'rgba(255,255,255,.45)', () => oval(c, -10, -11, 9, 6, -0.7));
}

/** 🌸 Spring: a cherry blossom, five notched pink petals round a deep-pink heart. */
function blossom(c: Ctx) {
  blob(c, BLOSSOM, () => {
    for (let i = 0; i < 5; i++) {
      c.save(); c.translate(0, 3); c.rotate((i * TAU) / 5);
      c.moveTo(0, 0);
      c.bezierCurveTo(-26, -8, -28, -40, -11, -45);
      c.lineTo(0, -37); c.lineTo(11, -45);
      c.bezierCurveTo(28, -40, 26, -8, 0, 0);
      c.closePath();
      c.restore();
    }
  });
  flat(c, PINK, () => starPath(c, 0, 3, 5, 15, 7));
  flat(c, DEEP_GOLD, () => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; dot(c, Math.cos(a) * 15, 3 + Math.sin(a) * 15, 3.5); } });
  flat(c, GOLD, () => dot(c, 0, 3, 6));
}

/** One fallen leaf, `len` long, its stalk at (x, y), pointing at `a`. */
function autumnLeaf(c: Ctx, color: string, vein: string, x: number, y: number, a: number, len: number, w: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  bar(c, vein, 4, () => { c.moveTo(-10, 0); c.lineTo(4, 0); });
  solid(c, color, () => { c.moveTo(0, 0); c.bezierCurveTo(len * 0.2, -w, len * 0.75, -w, len, 0); c.bezierCurveTo(len * 0.75, w, len * 0.2, w, 0, 0); });
  line(c, vein, 3, () => {
    c.moveTo(len * 0.1, 0); c.lineTo(len * 0.85, 0);
    for (const t of [0.3, 0.55]) { c.moveTo(len * t, 0); c.lineTo(len * (t + 0.15), -w * 0.42); c.moveTo(len * t, 0); c.lineTo(len * (t + 0.15), w * 0.42); }
  });
  c.restore();
}

/** 🍂 Autumn: two fallen leaves, one orange, one rusty red. */
function fallenLeaves(c: Ctx) {
  autumnLeaf(c, RED, DEEP_RED, -36, 28, -0.12, 80, 26);
  autumnLeaf(c, ORANGE, DEEP_ORANGE, -36, 28, -0.88, 86, 26);
}

/** ❄ Winter (and the arcade's Freeze): an icy snowflake, six branched arms. */
function snowflake(c: Ctx) {
  bar(c, ICE, 7, () => {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 6;
      const at = (r: number, da = 0) => [Math.cos(a + da) * r, Math.sin(a + da) * r];
      c.moveTo(0, 0); c.lineTo(...(at(39) as [number, number]));
      const [bx, by] = at(22);
      for (const s of [-1, 1]) {
        const [tx, ty] = [bx + Math.cos(a + s * 0.9) * 14, by + Math.sin(a + s * 0.9) * 14];
        c.moveTo(bx, by); c.lineTo(tx, ty);
      }
    }
  });
  solid(c, ICE, () => starPath(c, 0, 0, 6, 11, 9));
}

// ---------- weather and light ----------

/** 🌙 Nightfall: a gold crescent moon, a little star in its hollow. */
function moon(c: Ctx) {
  c.save(); c.translate(6, 2);
  // the big circle, less a smaller one bitten out of its upper right
  const R = 42, cx = 18, cy = -15, r = 35;
  const d = Math.hypot(cx, cy), ux = cx / d, uy = cy / d;
  const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const p1 = [a * ux - h * uy, a * uy + h * ux], p2 = [a * ux + h * uy, a * uy - h * ux];
  const crescent = () => {
    c.moveTo(p1[0], p1[1]);
    c.arc(0, 0, R, Math.atan2(p1[1], p1[0]), Math.atan2(p2[1], p2[0]));
    c.arc(cx, cy, r, Math.atan2(p2[1] - cy, p2[0] - cx), Math.atan2(p1[1] - cy, p1[0] - cx), true);
    c.closePath();
  };
  solid(c, GOLD, crescent);
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -30, -6, 5, 13, 0.25));
  solid(c, GOLD, () => starPath(c, 20, -18, 5, 13, 5.5));
  c.restore();
}

/** 🔥 Fire (the pot's heat, the arcade's Fire): an orange flame round a gold heart. */
function flame(c: Ctx) {
  solid(c, ORANGE, () => {
    c.moveTo(0, 46);
    c.bezierCurveTo(-24, 46, -38, 30, -36, 8);
    c.bezierCurveTo(-35, -6, -27, -14, -24, -28);
    c.bezierCurveTo(-14, -20, -12, -14, -11, -8);
    c.bezierCurveTo(-8, -24, 0, -36, 6, -46);
    c.bezierCurveTo(24, -30, 37, -12, 37, 10);
    c.bezierCurveTo(37, 32, 22, 46, 0, 46);
    c.closePath();
  });
  solid(c, GOLD, () => {
    c.moveTo(0, 40);
    c.bezierCurveTo(-14, 40, -21, 30, -19, 18);
    c.bezierCurveTo(-17, 6, -6, 0, -2, -14);
    c.bezierCurveTo(10, -2, 20, 8, 20, 20);
    c.bezierCurveTo(20, 32, 12, 40, 0, 40);
    c.closePath();
  });
  flat(c, 'rgba(255,255,255,.35)', () => oval(c, -24, 10, 5, 11, 0.2));
}

/** ⚡ The arcade's Electric: a gold lightning bolt. */
function bolt(c: Ctx) {
  solid(c, GOLD, () => poly(c, 4, -46, 32, -46, 14, -12, 34, -12, -16, 46, -4, 2, -28, 2));
  flat(c, 'rgba(255,255,255,.45)', () => poly(c, 9, -40, 22, -40, 6, -10, -1, -10));
}

// ---------- marks ----------

/** ❗ Look here: a red exclamation mark (over a hatch or a door). */
function exclaim(c: Ctx) {
  solid(c, RED, () => {
    c.moveTo(-15, -32); c.arc(0, -32, 15, Math.PI, TAU);
    c.lineTo(7, 14); c.arc(0, 14, 7, 0, Math.PI); c.closePath();
  });
  solid(c, RED, () => dot(c, 0, 36, 10));
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -6, -32, 4, 9, 0.1));
}

/** 💥 The Slam: a red impact burst, a gold flash inside. */
function burst(c: Ctx) {
  const ring = (r: number[], k: number) => {
    r.forEach((v, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / (r.length / 2);
      const x = Math.cos(a) * v * k, y = Math.sin(a) * v * k;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    });
    c.closePath();
  };
  // points and dips round the burst, irregular on purpose but always the same
  const r = [46, 24, 40, 22, 46, 25, 36, 22, 45, 24, 38, 21, 46, 25, 37, 22];
  solid(c, RED, () => ring(r, 1));
  solid(c, GOLD, () => ring(r, 0.58));
  flat(c, CREAM, () => dot(c, 0, 0, 8));
}

/** ✋ Press (an arcade move): an open hand, fingers up. */
function hand(c: Ctx) {
  c.save(); c.translate(4, 0);
  blob(c, SKIN, () => {
    box(c, -24, -8, 48, 52, 16);
    ([[-24, -36], [-11, -44], [2, -42], [15, -30]] as const).forEach(([x, top]) => box(c, x, top, 12, 30 - top, 6));
    c.save(); c.translate(-20, 18); c.rotate(-0.75); box(c, -7, -34, 14, 36, 7); c.restore();
  });
  flat(c, 'rgba(255,255,255,.35)', () => oval(c, -6, -30, 3, 7));
  c.restore();
}

/** 👆 The touch hint: a hand, its finger pointing up to tap, in the chef's white cuff. */
function pointUp(c: Ctx) {
  c.save(); c.translate(2, 0);
  blob(c, SKIN, () => {
    box(c, -22, -6, 44, 40, 14);
    box(c, -16, -46, 15, 54, 7.5);
  });
  // the curled fingers and the thumb
  line(c, SKIN_LINE, 3, () => { c.moveTo(2, -4); c.lineTo(2, 10); c.moveTo(12, -4); c.lineTo(12, 10); });
  c.save(); c.translate(-6, 14); c.rotate(-0.22); solid(c, SKIN, () => box(c, -16, -7, 30, 14, 7)); c.restore();
  flat(c, 'rgba(255,255,255,.35)', () => oval(c, -11, -32, 3, 7));
  solid(c, CREAM, () => box(c, -24, 30, 48, 16, 5));
  c.restore();
}

/** ❤ The arcade's health: a red heart. */
function heart(c: Ctx) {
  c.save(); c.translate(0, 3);
  solid(c, RED, () => heartPath(c));
  flat(c, 'rgba(255,255,255,.45)', () => oval(c, -27, -22, 9, 6, -0.7));
  c.restore();
}

export const NATURE: Record<string, Drawing> = {
  '☀': sun, '🌸': blossom, '🍂': fallenLeaves, '❄': snowflake,
  '🌙': moon, '🔥': flame, '⚡': bolt,
  '❗': exclaim, '💥': burst, '✋': hand, '👆': pointUp, '❤': heart,
};
