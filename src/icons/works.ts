// Icons for machines, buildings and tools, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, CREAM, DARK_WOOD, DEEP_GOLD, DEEP_GREEN, DEEP_RED, GOLD, GREEN, INK, NIGHT, RED, STEEL, TAU,
  WOOD, bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

const SHINE = 'rgba(255,255,255,.4)';
/** Bamboo, for the steamer. */
const BAMBOO = '#E3B87A', DEEP_BAMBOO = '#C3875D';
/** Smoke and the darker steel of tools. */
const SMOKE = '#9AA7B0', IRON = '#55636F';

/** A drawing scaled by `k` and moved by (dx, dy), to sit it inside the box. */
const fit = (draw: Drawing, k: number, dx = 0, dy = 0): Drawing => c => { c.translate(dx, dy); c.scale(k, k); draw(c); };

/** ⏩ The faster belt: two bold green fast-forward arrows. */
function fastForward(c: Ctx) {
  solid(c, DEEP_GREEN, () => poly(c, -44, -34, 2, 0, -44, 34));
  solid(c, GREEN, () => poly(c, -4, -34, 44, 0, -4, 34));
  flat(c, SHINE, () => poly(c, 2, -22, 18, -10, 2, -10));
}

/** ♨️ Steam baskets: a stacked bamboo steamer, its lid on, steam curling up out of it. */
function steamer(c: Ctx) {
  bar(c, CREAM, 5, () => {
    for (const x of [-18, 0, 18]) {
      c.moveTo(x, -20); c.quadraticCurveTo(x - 8, -28, x, -36); c.quadraticCurveTo(x + 7, -42, x, -48 + (x ? 4 : 0));
    }
  });
  for (const top of [16, -2]) {
    solid(c, BAMBOO, () => box(c, -42, top, 84, 22, 6));
    flat(c, DEEP_BAMBOO, () => c.rect(-40, top + 9, 80, 4));
  }
  c.beginPath(); box(c, -42, -2, 84, 22, 6); c.stroke();
  solid(c, DEEP_BAMBOO, () => { c.moveTo(-40, -2); c.quadraticCurveTo(-36, -20, 0, -20); c.quadraticCurveTo(36, -20, 40, -2); c.closePath(); });
  solid(c, BAMBOO, () => box(c, -8, -26, 16, 8, 3));
  flat(c, SHINE, () => box(c, -36, 1, 10, 6, 3));
}

/** 🏚️ The smokehouse: a little plank shack, its chimney puffing grey smoke. */
function smokehouse(c: Ctx) {
  blob(c, SMOKE, () => { dot(c, 20, -30, 9); dot(c, 30, -38, 10); dot(c, 40, -32, 7); });
  solid(c, DARK_WOOD, () => c.rect(12, -24, 12, 20));
  const walls = () => c.rect(-34, -2, 68, 44);
  solid(c, WOOD, walls);
  inside(c, walls, () => line(c, DARK_WOOD, 3, () => { for (const x of [-20, -6, 8, 22]) { c.moveTo(x, -2); c.lineTo(x, 42); } }));
  c.beginPath(); walls(); c.stroke();
  solid(c, NIGHT, () => box(c, -10, 14, 20, 28, 3));
  solid(c, DEEP_RED, () => poly(c, -46, 2, 0, -30, 46, 2, 40, 8, 0, -20, -40, 8));
}

/** 🛢️ Another salt barrel: a wooden barrel, its hoops, and white salt heaped on top. */
function barrel(c: Ctx) {
  const body = () => {
    c.moveTo(-28, -30); c.quadraticCurveTo(-42, 4, -28, 40); c.lineTo(28, 40);
    c.quadraticCurveTo(42, 4, 28, -30); c.closePath();
  };
  solid(c, WOOD, body);
  inside(c, body, () => {
    line(c, DARK_WOOD, 3, () => { for (const x of [-14, 0, 14]) { c.moveTo(x, -30); c.quadraticCurveTo(x * 1.35, 4, x, 40); } });
    flat(c, NIGHT, () => { c.rect(-50, -18, 100, 7); c.rect(-50, 24, 100, 7); });
    flat(c, 'rgba(255,255,255,.25)', () => c.rect(-30, -30, 8, 70));
  });
  c.beginPath(); body(); c.stroke();
  solid(c, CREAM, () => { c.moveTo(-28, -30); c.quadraticCurveTo(-20, -48, 0, -46); c.quadraticCurveTo(20, -48, 28, -30); c.quadraticCurveTo(0, -24, -28, -30); c.closePath(); });
}

/** 🛝 The bowl slide: a ladder up to a red chute curving down, a bowl riding off its end. */
function slide(c: Ctx) {
  bar(c, STEEL, 5, () => { for (const y of [-14, 2, 18, 34]) { c.moveTo(-38, y); c.lineTo(-22, y); } });
  bar(c, STEEL, 6, () => { c.moveTo(-38, -34); c.lineTo(-38, 42); c.moveTo(-22, -34); c.lineTo(-22, 42); });
  bar(c, RED, 14, () => { c.moveTo(-24, -32); c.bezierCurveTo(6, -32, 0, 34, 34, 34); });
  line(c, '#F27A7E', 3, () => { c.moveTo(-22, -35); c.bezierCurveTo(4, -35, -2, 31, 32, 31); });
  solid(c, CREAM, () => { c.moveTo(16, 6); c.lineTo(42, 6); c.quadraticCurveTo(40, 24, 29, 24); c.quadraticCurveTo(18, 24, 16, 6); c.closePath(); });
  solid(c, GOLD, () => oval(c, 29, 6, 13, 3.5));
}

/** 🍽️ Mama's dining hall: a white plate between a fork and a knife. */
function place(c: Ctx) {
  solid(c, CREAM, () => dot(c, 0, 2, 30));
  line(c, '#E3E6E0', 3, () => c.arc(0, 2, 20, 0, TAU));
  flat(c, SHINE, () => oval(c, -14, -12, 6, 4, -0.7));
  // the fork: its tines, then its handle
  bar(c, STEEL, 6, () => { c.moveTo(-40, -6); c.lineTo(-40, 42); });
  solid(c, STEEL, () => { c.moveTo(-48, -40); c.lineTo(-48, -14); c.quadraticCurveTo(-48, -4, -40, -4); c.quadraticCurveTo(-32, -4, -32, -14); c.lineTo(-32, -40); c.lineTo(-37, -40); c.lineTo(-37, -18); c.lineTo(-43, -18); c.lineTo(-43, -40); c.closePath(); });
  // the knife: its blade, then its handle
  solid(c, STEEL, () => { c.moveTo(34, 2); c.lineTo(34, -32); c.quadraticCurveTo(46, -30, 46, -6); c.lineTo(46, 2); c.closePath(); });
  bar(c, STEEL, 7, () => { c.moveTo(40, 4); c.lineTo(40, 42); });
}

/** A claw hammer, along +x from its handle's end to its head (its face to -y, its claw to +y), in its own frame. */
function hammerAt(c: Ctx) {
  solid(c, WOOD, () => box(c, -48, -7, 82, 14, 7));
  flat(c, DARK_WOOD, () => box(c, -48, -7, 20, 14, 7));
  solid(c, IRON, () => {
    c.moveTo(26, -24); c.lineTo(22, -34); c.lineTo(46, -34); c.lineTo(42, -24); c.lineTo(42, 6);
    c.quadraticCurveTo(38, 20, 22, 28); c.quadraticCurveTo(28, 16, 26, 6); c.closePath();
  });
  flat(c, 'rgba(255,255,255,.3)', () => c.rect(30, -26, 5, 26));
}

/** 🔨 Fix up the arena: a claw hammer, raised to strike. */
function hammer(c: Ctx) {
  c.save(); c.translate(-4, 4); c.scale(0.88, 0.88); c.rotate(-Math.PI / 4); c.translate(-2, 4);
  hammerAt(c);
  c.restore();
}

/** 🛠️ The demo's tools: a hammer and a spanner, crossed. */
function tools(c: Ctx) {
  c.save(); c.translate(0, 3); c.rotate(-3 * Math.PI / 4); c.scale(0.92, 0.92);
  const r = 13, a = 0.55;
  solid(c, STEEL, () => {
    c.moveTo(-34, -5);
    c.lineTo(22, -5); c.arc(34, 0, r, Math.PI + 0.38, TAU - a); c.lineTo(36, -5); c.lineTo(36, 5); c.lineTo(34 + r * Math.cos(a), r * Math.sin(a));
    c.arc(34, 0, r, a, Math.PI - 0.38); c.lineTo(-34, 5);
    c.arc(-34, 0, 5, Math.PI / 2, -Math.PI / 2);
    c.closePath();
  });
  c.restore();
  c.save(); c.translate(0, 3); c.scale(0.86, 0.86); c.rotate(-Math.PI / 4); c.translate(-2, 4);
  hammerAt(c);
  c.restore();
}

/** 🏷️ The price of a bowl: a gold price tag on its string. */
function tag(c: Ctx) {
  line(c, INK, 3, () => { c.moveTo(-14, -14); c.bezierCurveTo(-30, -30, -40, -20, -44, -40); });
  c.save(); c.rotate(Math.PI / 4);
  const body = () => poly(c, -40, 0, -24, -18, 40, -18, 40, 18, -24, 18);
  solid(c, GOLD, body);
  flat(c, DEEP_GOLD, () => { c.rect(-4, -8, 34, 5); c.rect(-4, 3, 22, 5); });
  c.beginPath(); body(); c.stroke();
  solid(c, CREAM, () => dot(c, -24, 0, 5));
  c.restore();
}

/** 📣 Marketing: a red megaphone calling out, its sound lines spreading. */
function megaphone(c: Ctx) {
  line(c, INK, 4, () => {
    c.arc(30, -8, 12, -0.7, 0.7);
    c.moveTo(30 + 22 * Math.cos(-0.7), -8 + 22 * Math.sin(-0.7)); c.arc(30, -8, 22, -0.7, 0.7);
  });
  c.save(); c.rotate(-0.25); c.translate(-6, 2);
  bar(c, DARK_WOOD, 8, () => { c.moveTo(-12, 8); c.lineTo(-18, 26); });
  solid(c, NIGHT, () => box(c, -42, -9, 14, 18, 4));
  solid(c, RED, () => poly(c, -30, -10, 24, -30, 24, 30, -30, 10));
  flat(c, DEEP_RED, () => poly(c, -30, 4, 24, 16, 24, 30, -30, 10));
  solid(c, CREAM, () => oval(c, 24, 0, 9, 30));
  flat(c, SHINE, () => poly(c, -24, -6, 10, -20, 10, -14, -24, -2));
  c.restore();
}

/** 🗞️ The fix made the papers: a rolled-up newspaper, its headlines out, held by a red band. */
function paper(c: Ctx) {
  c.save(); c.rotate(-0.55);
  const roll = () => box(c, -42, -18, 80, 36, 6);
  solid(c, CREAM, roll);
  inside(c, roll, () => {
    flat(c, NIGHT, () => c.rect(-30, -12, 36, 7));
    line(c, SMOKE, 3, () => { for (const y of [2, 10]) { c.moveTo(-30, y); c.lineTo(20, y); } });
  });
  c.beginPath(); roll(); c.stroke();
  solid(c, '#E8E1CC', () => oval(c, 38, 0, 9, 18));
  line(c, SMOKE, 2.5, () => { c.arc(38, 0, 5, 0, TAU * 0.8); });
  solid(c, RED, () => c.rect(10, -19, 7, 38));
  c.restore();
}

/** ⏱️ The arcade's round timer: a steel stopwatch, its red hand sweeping round. */
function stopwatch(c: Ctx) {
  solid(c, IRON, () => box(c, -8, -46, 16, 10, 3));
  bar(c, IRON, 6, () => { c.moveTo(0, -36); c.lineTo(0, -30); });
  c.save(); c.translate(0, 6); c.rotate(Math.PI / 4);
  solid(c, IRON, () => box(c, -5, -46, 10, 9, 3));
  c.restore();
  solid(c, STEEL, () => dot(c, 0, 6, 38));
  solid(c, CREAM, () => dot(c, 0, 6, 29));
  line(c, INK, 3.5, () => {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      c.moveTo(Math.cos(a) * 21, 6 + Math.sin(a) * 21); c.lineTo(Math.cos(a) * 26, 6 + Math.sin(a) * 26);
    }
  });
  flat(c, 'rgba(229,72,77,.3)', () => { c.moveTo(0, 6); c.arc(0, 6, 26, -Math.PI / 2, 0.1); c.closePath(); });
  bar(c, RED, 4, () => { c.moveTo(0, 6); c.lineTo(18, 13); });
  solid(c, RED, () => dot(c, 0, 6, 5));
  flat(c, SHINE, () => oval(c, -24, -12, 4, 9, 0.7));
}

export const WORKS: Record<string, Drawing> = {
  '⏩': fit(fastForward, 0.92), '♨': fit(steamer, 0.92, 0, 3), '🏚': fit(smokehouse, 0.92, -2, 3), '🛢': fit(barrel, 0.94, 0, 2),
  '🛝': slide, '🍽': fit(place, 0.9), '🔨': hammer, '🛠': tools, '🏷': tag, '📣': megaphone, '🗞': paper,
  '⏱': fit(stopwatch, 0.94, 0, 1),
};
