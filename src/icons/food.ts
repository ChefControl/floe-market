// Icons for food and drink, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, CREAM, DARK_WOOD, DEEP_GOLD, DEEP_GREEN, DEEP_RED, GOLD, GREEN, INK, PINK, RED, SKY, STEEL, WOOD,
  bar, blob, box, dot, flat, inside, leaf, line, oval, poly, solid,
} from './kit';

/** Lemon yellow and its shadow (no kit colour is a lemon's). */
const LEMON = '#F7D038', DEEP_LEMON = '#D9B21F';
/** Glass: a pale blue-white. */
const GLASS = '#E3EAF0';
/** Darker, runny honey (the pot itself is GOLD). */
const HONEY = '#E8952A';
/** Potato skin and its eyes. */
const SPUD = '#D2A064', DEEP_SPUD = '#A9773F';
const SHINE = 'rgba(255,255,255,.4)';
/** Ramen noodles: a pale wheat yellow. */
const NOODLE = '#FBE7A1';

/** ☕ A cup of coffee on its saucer, steam rising (the bitter taste; Ko-fi's "buy me a coffee"). */
function coffee(c: Ctx) {
  line(c, STEEL, 5, () => {
    c.moveTo(-10, -24); c.bezierCurveTo(-18, -32, -2, -38, -10, -46);
    c.moveTo(8, -24); c.bezierCurveTo(0, -32, 16, -36, 8, -44);
  });
  solid(c, CREAM, () => oval(c, -4, 34, 42, 9));
  bar(c, CREAM, 6, () => { c.moveTo(18, -6); c.bezierCurveTo(42, -10, 42, 18, 16, 18); });
  const cup = () => { c.moveTo(-34, -12); c.lineTo(26, -12); c.bezierCurveTo(26, 14, 16, 32, -4, 32); c.bezierCurveTo(-24, 32, -34, 14, -34, -12); c.closePath(); };
  solid(c, CREAM, cup);
  solid(c, CREAM, () => oval(c, -4, -12, 30, 8));
  flat(c, '#6B3E26', () => oval(c, -4, -11, 24, 5));
  flat(c, SHINE, () => oval(c, -24, 6, 4, 10, 0.15));
}

/** 🌶️ A red chili, its tip curling, under a green cap and stalk (the spicy taste; the Chili Sprayer). */
function chili(c: Ctx) {
  // the pod is one smooth width swept along a hooked spine (a cubic curve): plump under the cap, tapering to a fine
  // tip that lifts at the end
  const P = [-24, -17, -20, 14, 4, 42, 44, 19];
  const at = (t: number) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
    return [a * P[0] + b * P[2] + d * P[4] + e * P[6], a * P[1] + b * P[3] + d * P[5] + e * P[7]];
  };
  const half = (t: number) => 17.5 * Math.pow(1 - t, 0.85) * (1 + 0.18 * Math.sin(Math.PI * Math.min(1, t * 2.4))) + 0.9;
  const n = 40, left: number[] = [], right: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.01)), [x1, y1] = at(Math.max(0, t - 0.01));
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), w = half(t);
    left.push(x + dy / l * w, y - dx / l * w); right.push(x - dy / l * w, y + dx / l * w);
  }
  const tilt = Math.atan2(P[3] - P[1], P[2] - P[0]) - Math.PI / 2;
  solid(c, RED, () => {
    c.moveTo(left[0], left[1]);
    c.quadraticCurveTo(P[0] + Math.sin(tilt) * 14, P[1] - Math.cos(tilt) * 14, right[0], right[1]);
    for (let i = 2; i < right.length; i += 2) c.lineTo(right[i], right[i + 1]);
    for (let i = left.length - 2; i >= 0; i -= 2) c.lineTo(left[i], left[i + 1]);
    c.closePath();
  });
  line(c, 'rgba(255,255,255,.4)', 5, () => {
    const [ax, ay] = at(0.12), [bx, by] = at(0.3), [ex, ey] = at(0.48);
    const k = 8;
    c.moveTo(ax - k, ay - 1); c.quadraticCurveTo(bx - k - 3, by + 2, ex - 2, ey + k - 1);
  });
  // the cap and stalk, turned to sit square on the shoulder
  c.save(); c.translate(P[0], P[1]); c.rotate(tilt);
  bar(c, DEEP_GREEN, 5, () => { c.moveTo(0, -6); c.bezierCurveTo(0, -16, 4, -21, 14, -22); });
  solid(c, GREEN, () => {
    c.moveTo(-19, 4); c.quadraticCurveTo(-16, -10, -1, -9); c.quadraticCurveTo(15, -10, 19, 2);
    c.quadraticCurveTo(13, -1, 9, 6); c.quadraticCurveTo(4, -1, -2, 5);
    c.quadraticCurveTo(-8, -2, -11, 7); c.quadraticCurveTo(-14, 1, -19, 4); c.closePath();
  });
  c.restore();
}

/** 🍋 A lemon with its stalk and a leaf (the sour taste; a slot reel's symbol). */
function lemon(c: Ctx) {
  c.save(); c.translate(-3, 7); c.rotate(-0.42);
  const fruit = () => {
    c.moveTo(-43, 3); c.quadraticCurveTo(-38, -4, -31, -8);
    c.bezierCurveTo(-22, -32, 20, -33, 31, -11);
    c.quadraticCurveTo(37, -9, 38, -3); c.quadraticCurveTo(37, 4, 32, 7);
    c.bezierCurveTo(22, 31, -20, 32, -31, 11);
    c.quadraticCurveTo(-38, 8, -43, 3); c.closePath();
  };
  solid(c, LEMON, fruit);
  inside(c, fruit, () => flat(c, DEEP_LEMON, () => oval(c, 4, 26, 40, 13)));
  c.beginPath(); fruit(); c.stroke();
  flat(c, SHINE, () => oval(c, -14, -14, 11, 5, -0.12));
  bar(c, DARK_WOOD, 4, () => { c.moveTo(37, -3); c.lineTo(44, -4); });
  c.restore();
  leaf(c, GREEN, 36, -19, -2.45, 30, 12);
}

/** 🍒 Two cherries on their stalks, joined at the top where a leaf sprouts (a slot reel's symbol). */
function cherries(c: Ctx) {
  bar(c, DEEP_GREEN, 4, () => {
    c.moveTo(-21, 10); c.quadraticCurveTo(-14, -20, 12, -32);
    c.moveTo(20, 12); c.quadraticCurveTo(22, -12, 12, -32);
  });
  leaf(c, GREEN, 12, -32, -2.55, 32, 13);
  solid(c, RED, () => dot(c, -22, 24, 19));
  solid(c, RED, () => dot(c, 20, 27, 18));
  flat(c, SHINE, () => { oval(c, -29, 17, 5, 7, 0.5); oval(c, 13, 20, 5, 7, 0.5); });
}

/** 🍜 Mama Moray's: a red bowl of ramen with an egg and a naruto slice, chopsticks lifting wavy noodles. */
function noodles(c: Ctx) {
  // the bowl: its foot, its red side, then the rim with the broth sitting just below it
  solid(c, DEEP_RED, () => box(c, -16, 30, 32, 9, 3));
  solid(c, RED, () => { c.moveTo(-45, -6); c.bezierCurveTo(-43, 24, -20, 34, 0, 34); c.bezierCurveTo(20, 34, 43, 24, 45, -6); c.closePath(); });
  flat(c, SHINE, () => oval(c, -29, 10, 4, 9, -0.5));
  solid(c, DEEP_RED, () => oval(c, 0, -6, 45, 12));
  const broth = () => oval(c, 0, -4, 40, 9);
  flat(c, '#E8B45A', broth);
  inside(c, broth, () => line(c, NOODLE, 3.5, () => {
    for (const y of [-6, 1]) { c.moveTo(-40, y); for (let x = -40; x < 40; x += 10) c.quadraticCurveTo(x + 5, y - 4, x + 10, y); }
  }));
  solid(c, CREAM, () => oval(c, -24, -4, 9, 5));
  flat(c, GOLD, () => oval(c, -23, -4, 4, 3));
  solid(c, CREAM, () => oval(c, 24, -3, 8, 4.5));
  flat(c, PINK, () => oval(c, 24, -3, 3.5, 2));
  // chopsticks lifting a short bit of noodle just clear of the rim
  bar(c, NOODLE, 4, () => {
    for (const x of [-5, 3]) { c.moveTo(x, -20); c.bezierCurveTo(x - 5, -15, x + 5, -11, x, -5); }
  });
  bar(c, WOOD, 4, () => { c.moveTo(-7, -21); c.lineTo(20, -39); c.moveTo(-1, -19); c.lineTo(38, -32); });
}

/** 🍣 Nigiri: a slice of salmon draped over a block of rice, like the restaurant's. */
function nigiri(c: Ctx) {
  c.save(); c.translate(0, -2);
  solid(c, CREAM, () => box(c, -36, -2, 72, 30, 13));
  solid(c, '#FF8A5C', () => {
    c.moveTo(-44, 6); c.quadraticCurveTo(-46, -20, -20, -22); c.lineTo(22, -24);
    c.quadraticCurveTo(46, -24, 44, 2); c.quadraticCurveTo(0, 14, -44, 6); c.closePath();
  });
  line(c, '#FFD2BC', 4, () => {
    c.moveTo(-22, -17); c.lineTo(-30, 2); c.moveTo(-2, -18); c.lineTo(-10, 4); c.moveTo(18, -19); c.lineTo(10, 4);
  });
  flat(c, SHINE, () => oval(c, -30, -12, 6, 3, -0.3));
  c.restore();
}

/** 🍬 A pink sweet in its twisted wrapper (the sweet taste). */
function candy(c: Ctx) {
  c.save(); c.rotate(-0.35);
  solid(c, '#F59AB0', () => poly(c, -18, 0, -46, -20, -38, -7, -44, 0, -38, 7, -46, 20));
  solid(c, '#F59AB0', () => poly(c, 18, 0, 46, -20, 38, -7, 44, 0, 38, 7, 46, 20));
  const sweet = () => oval(c, 0, 0, 24, 20);
  solid(c, PINK, sweet);
  inside(c, sweet, () => line(c, CREAM, 5, () => {
    c.moveTo(-14, -24); c.lineTo(-24, 24); c.moveTo(4, -24); c.lineTo(-6, 24); c.moveTo(22, -24); c.lineTo(12, 24);
  }));
  c.beginPath(); sweet(); c.stroke();
  c.restore();
}

/** 🍯 Syrup Spill: a jar of bright gold honey, a red cloth tied over its mouth with string, honey dripping down its side. */
function honey(c: Ctx) {
  solid(c, GOLD, () => {
    c.moveTo(-24, -20); c.lineTo(24, -20); c.quadraticCurveTo(40, -16, 40, 2); c.lineTo(40, 34);
    c.quadraticCurveTo(40, 44, 30, 44); c.lineTo(-30, 44); c.quadraticCurveTo(-40, 44, -40, 34); c.lineTo(-40, 2);
    c.quadraticCurveTo(-40, -16, -24, -20); c.closePath();
  });
  flat(c, DEEP_GOLD, () => box(c, -36, 30, 72, 10, 5));
  flat(c, 'rgba(255,255,255,.45)', () => { box(c, -32, -4, 7, 28, 3.5); dot(c, -28, 30, 2.5); });
  solid(c, HONEY, () => {
    c.moveTo(-26, -22); c.lineTo(26, -22); c.lineTo(26, -14); c.lineTo(19, -14); c.lineTo(19, 4);
    c.bezierCurveTo(22, 10, 22, 19, 14.5, 19); c.bezierCurveTo(7, 19, 7, 10, 10, 4); c.lineTo(10, -14);
    c.lineTo(-8, -14); c.lineTo(-8, -6); c.quadraticCurveTo(-12, 0, -16, -6); c.lineTo(-16, -14); c.lineTo(-26, -14); c.closePath();
  });
  solid(c, RED, () => {
    c.moveTo(-26, -30); c.quadraticCurveTo(-26, -42, 0, -42); c.quadraticCurveTo(26, -42, 26, -30);
    c.lineTo(32, -16); c.quadraticCurveTo(24, -12, 18, -16); c.quadraticCurveTo(9, -11, 0, -16);
    c.quadraticCurveTo(-9, -11, -18, -16); c.quadraticCurveTo(-24, -12, -32, -16); c.closePath();
  });
  bar(c, CREAM, 3, () => { c.moveTo(-26, -28); c.quadraticCurveTo(0, -24, 26, -28); });
  flat(c, CREAM, () => { dot(c, -12, -35, 2.5); dot(c, 6, -36, 2.5); dot(c, 16, -21, 2.5); dot(c, -14, -19, 2.5); });
}

/** 🍸 The Undertow's bar: a cocktail glass, an olive on a pick. */
function cocktail(c: Ctx) {
  bar(c, GLASS, 5, () => { c.moveTo(0, 6); c.lineTo(0, 38); });
  solid(c, GLASS, () => oval(c, 0, 40, 22, 5));
  solid(c, GLASS, () => poly(c, -44, -34, 44, -34, 0, 10));
  flat(c, SKY, () => poly(c, -36, -28, 36, -28, 0, 5));
  bar(c, WOOD, 3, () => { c.moveTo(-6, -12); c.lineTo(22, -46); });
  solid(c, GREEN, () => dot(c, -4, -14, 9));
  flat(c, RED, () => dot(c, -1, -16, 3.5));
  flat(c, SHINE, () => poly(c, -30, -27, -20, -27, -8, -6));
}

/** One champagne flute, standing at (x, 42) and leaning `a`. */
function flute(c: Ctx, x: number, a: number) {
  c.save(); c.translate(x, 42); c.rotate(a);
  bar(c, GLASS, 4, () => { c.moveTo(0, -2); c.lineTo(0, -30); });
  solid(c, GLASS, () => oval(c, 0, 0, 14, 4));
  const bowl = () => { c.moveTo(-14, -86); c.lineTo(14, -86); c.lineTo(12, -42); c.quadraticCurveTo(0, -28, -12, -42); c.closePath(); };
  solid(c, GLASS, bowl);
  inside(c, bowl, () => {
    flat(c, GOLD, () => c.rect(-20, -72, 40, 50));
    flat(c, CREAM, () => { dot(c, -3, -48, 2.5); dot(c, 3, -58, 2.5); });
  });
  c.beginPath(); bowl(); c.stroke();
  c.restore();
}

/** 🥂 Cheers: two flutes of champagne clinking. */
function cheers(c: Ctx) {
  flute(c, -24, 0.3);
  flute(c, 24, -0.3);
}

/** 🥔 The Spud Rifle's ammo: a lumpy brown potato with its eyes. */
function potato(c: Ctx) {
  c.save(); c.rotate(-0.3);
  blob(c, SPUD, () => { oval(c, -8, -2, 36, 28); oval(c, 18, 4, 26, 24); });
  flat(c, DEEP_SPUD, () => { oval(c, -20, 6, 4, 2.5); oval(c, 4, -12, 4, 2.5); oval(c, 24, 12, 4, 2.5); oval(c, -4, 16, 3, 2); });
  flat(c, SHINE, () => oval(c, -22, -14, 10, 5, -0.2));
  c.restore();
}

/** 🧂 The pot's Season move (the salty taste): a glass salt shaker, its steel cap pricked with holes. */
function salt(c: Ctx) {
  const body = () => { c.moveTo(-22, -18); c.lineTo(22, -18); c.lineTo(30, 38); c.quadraticCurveTo(30, 44, 24, 44); c.lineTo(-24, 44); c.quadraticCurveTo(-30, 44, -30, 38); c.closePath(); };
  solid(c, GLASS, body);
  inside(c, body, () => flat(c, CREAM, () => c.rect(-40, 4, 80, 50)));
  c.beginPath(); body(); c.stroke();
  flat(c, SHINE, () => box(c, -20, -12, 6, 50, 3));
  solid(c, STEEL, () => { c.moveTo(-22, -18); c.quadraticCurveTo(-22, -46, 0, -46); c.quadraticCurveTo(22, -46, 22, -18); c.closePath(); });
  flat(c, INK, () => { dot(c, -8, -32, 2.8); dot(c, 6, -36, 2.8); dot(c, 6, -26, 2.8); });
}

/** 🥄 The pot's Stir move: a steel spoon at a slant. */
function spoon(c: Ctx) {
  c.save(); c.rotate(-Math.PI / 4);
  solid(c, STEEL, () => { c.moveTo(-14, -3); c.lineTo(48, -6); c.quadraticCurveTo(58, -6, 58, 0); c.quadraticCurveTo(58, 6, 48, 6); c.lineTo(-14, 3); c.closePath(); });
  solid(c, STEEL, () => oval(c, -34, 0, 24, 17));
  flat(c, '#9AAAB5', () => oval(c, -32, 2, 17, 11));
  flat(c, SHINE, () => oval(c, -40, -6, 7, 3.5, -0.2));
  c.restore();
}

export const FOOD: Record<string, Drawing> = {
  '☕': coffee, '🌶': chili, '🍋': lemon, '🍒': cherries, '🍜': noodles, '🍣': nigiri, '🍬': candy, '🍯': honey,
  '🍸': cocktail, '🥂': cheers, '🥔': potato, '🧂': salt, '🥄': spoon,
};
