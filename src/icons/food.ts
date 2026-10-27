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
/** Potato skin and its eyes. */
const SPUD = '#D2A064', DEEP_SPUD = '#A9773F';
const SHINE = 'rgba(255,255,255,.4)';

/** ☕ A cup of coffee on its saucer, steam rising (the bitter taste; Ko-fi's "buy me a coffee"). */
function coffee(c: Ctx) {
  line(c, STEEL, 4, () => {
    c.moveTo(-10, -22); c.quadraticCurveTo(-18, -30, -10, -38); c.quadraticCurveTo(-4, -43, -8, -48);
    c.moveTo(8, -22); c.quadraticCurveTo(0, -30, 8, -38);
  });
  solid(c, CREAM, () => oval(c, -2, 36, 44, 9));
  bar(c, CREAM, 6, () => c.arc(26, 4, 11, -Math.PI / 2, Math.PI / 2));
  solid(c, CREAM, () => { c.moveTo(-32, -14); c.lineTo(28, -14); c.lineTo(24, 22); c.quadraticCurveTo(-2, 40, -28, 22); c.closePath(); });
  flat(c, DEEP_RED, () => c.rect(-29, 4, 55, 7));
  solid(c, '#6B3E26', () => oval(c, -2, -14, 30, 7));
  flat(c, SHINE, () => oval(c, -20, 10, 3.5, 9));
}

/** 🌶️ A red chili, its tip curling, under a green cap and stalk (the spicy taste; the Chili Sprayer). */
function chili(c: Ctx) {
  solid(c, RED, () => {
    c.moveTo(-36, -22);
    c.bezierCurveTo(-38, 10, -8, 38, 40, 40);
    c.bezierCurveTo(10, 24, -6, 4, -8, -24);
    c.quadraticCurveTo(-22, -34, -36, -22);
    c.closePath();
  });
  line(c, 'rgba(255,255,255,.4)', 5, () => { c.moveTo(-28, -8); c.quadraticCurveTo(-24, 10, -10, 20); });
  bar(c, DEEP_GREEN, 5, () => { c.moveTo(-22, -30); c.quadraticCurveTo(-22, -42, -10, -46); });
  solid(c, GREEN, () => {
    c.moveTo(-40, -22); c.quadraticCurveTo(-36, -36, -22, -34); c.quadraticCurveTo(-8, -36, -4, -22);
    c.quadraticCurveTo(-14, -26, -22, -20); c.quadraticCurveTo(-30, -26, -40, -22); c.closePath();
  });
}

/** 🍋 A lemon with a leaf (the sour taste; a slot reel's symbol). */
function lemon(c: Ctx) {
  c.save(); c.translate(0, 4); c.rotate(-0.45);
  blob(c, LEMON, () => { oval(c, 0, 0, 36, 28); oval(c, -38, 0, 7, 6); oval(c, 38, 0, 7, 6); });
  flat(c, DEEP_LEMON, () => oval(c, 4, 12, 26, 9));
  flat(c, LEMON, () => oval(c, 0, 6, 32, 14));
  flat(c, SHINE, () => oval(c, -14, -13, 11, 5, -0.15));
  c.restore();
  leaf(c, GREEN, 10, -24, -0.5, 30, 12);
}

/** 🍒 Two cherries on their stalks, joined at the top under a leaf (a slot reel's symbol). */
function cherries(c: Ctx) {
  bar(c, DEEP_GREEN, 4, () => {
    c.moveTo(-20, 16); c.quadraticCurveTo(-14, -20, 6, -38);
    c.moveTo(20, 20); c.quadraticCurveTo(18, -14, 6, -38);
  });
  leaf(c, GREEN, 6, -38, -0.25, 34, 13);
  solid(c, RED, () => dot(c, -22, 22, 19));
  solid(c, RED, () => dot(c, 20, 26, 19));
  flat(c, SHINE, () => { oval(c, -29, 15, 5, 7, 0.5); oval(c, 13, 19, 5, 7, 0.5); });
}

/** 🍜 Mama Moray's: a red bowl of noodle soup with a naruto slice, chopsticks lifting the noodles. */
function noodles(c: Ctx) {
  solid(c, DEEP_RED, () => box(c, -16, 30, 32, 10, 3));
  solid(c, RED, () => { c.moveTo(-44, -6); c.bezierCurveTo(-42, 26, -20, 36, 0, 36); c.bezierCurveTo(20, 36, 42, 26, 44, -6); c.closePath(); });
  flat(c, SHINE, () => oval(c, -26, 12, 4, 9, -0.5));
  solid(c, '#E8B45A', () => oval(c, 0, -6, 44, 11));
  flat(c, CREAM, () => dot(c, -20, -7, 7));
  flat(c, PINK, () => dot(c, -20, -7, 3));
  bar(c, WOOD, 5, () => { c.moveTo(2, -10); c.lineTo(32, -45); c.moveTo(12, -8); c.lineTo(41, -40); });
  bar(c, CREAM, 3.5, () => {
    c.moveTo(12, -26); c.quadraticCurveTo(4, -18, 10, -6);
    c.moveTo(20, -22); c.quadraticCurveTo(14, -14, 22, -4);
  });
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

/** 🍯 Syrup Spill: a pot of honey, dripping over its rim, a wooden dipper in it. */
function honey(c: Ctx) {
  bar(c, WOOD, 6, () => { c.moveTo(6, -22); c.lineTo(28, -44); });
  solid(c, DEEP_GOLD, () => {
    c.moveTo(-24, -18); c.lineTo(24, -18);
    c.bezierCurveTo(48, -4, 46, 40, 0, 42); c.bezierCurveTo(-46, 40, -48, -4, -24, -18); c.closePath();
  });
  solid(c, GOLD, () => {
    c.moveTo(-30, -20); c.lineTo(30, -20); c.lineTo(30, -8);
    c.quadraticCurveTo(26, -2, 22, -8); c.lineTo(22, 4); c.quadraticCurveTo(17, 10, 12, 4); c.lineTo(12, -6);
    c.quadraticCurveTo(4, -2, -4, -6); c.lineTo(-4, 10); c.quadraticCurveTo(-10, 17, -16, 10); c.lineTo(-16, -6);
    c.quadraticCurveTo(-24, -2, -30, -8); c.closePath();
  });
  solid(c, DARK_WOOD, () => box(c, -28, -28, 56, 10, 4));
  flat(c, SHINE, () => oval(c, -26, 20, 4, 9, 0.3));
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
