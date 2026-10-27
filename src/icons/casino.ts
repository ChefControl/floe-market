// Icons for the casino, the Undertow and fight night, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, CREAM, DARK_WOOD, DEEP_GOLD, DEEP_GREEN, DEEP_RED, GOLD, INK, NIGHT, RED, TAU,
  bar, box, dot, drum, flat, heartPath, inside, line, oval, poly, solid,
} from './kit';

/** A five-pointed star, `r` out to its points. */
function star(c: Ctx, x: number, y: number, r: number) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r * 0.45 : r;
    if (i) c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); else c.moveTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
}

/** 🃏 The blackjack table: two cards fanned, a red back behind the ace of spades. */
function cards(c: Ctx) {
  c.save(); c.translate(-12, -3); c.rotate(-0.24);
  solid(c, RED, () => box(c, -24, -34, 48, 68, 6));
  line(c, '#F7A3A6', 3, () => box(c, -16, -26, 32, 52, 3));
  c.restore();
  c.save(); c.translate(11, 4); c.rotate(0.16);
  solid(c, CREAM, () => box(c, -24, -34, 48, 68, 6));
  // the spade: a heart upside down, on a little stem
  flat(c, NIGHT, () => {
    c.save(); c.translate(1, 0); c.scale(0.38, -0.38); heartPath(c); c.restore();
    poly(c, 1, 4, -7, 20, 9, 20);
  });
  // the A in the corner, as strokes
  line(c, RED, 3.5, () => { c.moveTo(-18, -16); c.lineTo(-13, -28); c.lineTo(-8, -16); c.moveTo(-16, -20); c.lineTo(-10, -20); });
  c.restore();
}

/** 🎡 The roulette table: the wheel seen from the side, its pockets round a gold spindle, the ball in a pocket. */
function rouletteWheel(c: Ctx) {
  const y = 0, rx = 46, ry = 30;
  drum(c, 0, y, rx, ry, 10, DARK_WOOD, '#8A5A3B');
  c.save(); c.translate(0, y); c.scale(1, ry / rx);
  const n = 12, seg = TAU / n;
  for (let i = 0; i < n; i++) {
    flat(c, i === 0 ? '#2E9E49' : i % 2 ? '#D8394B' : '#22303C', () => {
      c.moveTo(0, 0); c.arc(0, 0, 39, i * seg - seg / 2, i * seg + seg / 2); c.closePath();
    });
  }
  c.restore();
  solid(c, '#C3875D', () => oval(c, 0, y, 19, 12.5));
  solid(c, GOLD, () => { c.moveTo(-8, y + 2); c.lineTo(-3, y - 24); c.lineTo(3, y - 24); c.lineTo(8, y + 2); c.quadraticCurveTo(0, y + 6, -8, y + 2); });
  solid(c, GOLD, () => dot(c, 0, y - 28, 7));
  flat(c, 'rgba(255,255,255,.5)', () => dot(c, -2.5, y - 30.5, 2.5));
  solid(c, '#fff', () => dot(c, 27, y + 16, 6));
}

/** 🎟 The casino boat's ticket: red, a notch each side, a gold star and the tear-off stub. */
function ticket(c: Ctx) {
  c.save(); c.rotate(-0.32);
  const body = () => {
    c.moveTo(-41, -23); c.lineTo(41, -23); c.lineTo(41, -8);
    c.arc(41, 0, 8, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(41, 23); c.lineTo(-41, 23); c.lineTo(-41, 8);
    c.arc(-41, 0, 8, Math.PI / 2, -Math.PI / 2, true);
    c.closePath();
  };
  solid(c, RED, body);
  inside(c, body, () => flat(c, DEEP_RED, () => c.rect(18, -30, 30, 60)));
  flat(c, CREAM, () => { for (let y = -17; y <= 17; y += 8.5) dot(c, 18, y, 2.5); });
  c.beginPath(); body(); c.stroke();
  solid(c, GOLD, () => star(c, -10, 1, 16));
  flat(c, 'rgba(255,255,255,.35)', () => box(c, -34, -17, 16, 5, 2.5));
  c.restore();
}

/** 💎 The slots' gem: a cut diamond, its facets in two blues. */
function gem(c: Ctx) {
  const L = '#C4ECF8', M = '#7FD0EE', D = '#3E9CC4';
  const shape = () => poly(c, -22, -32, 22, -32, 44, -10, 0, 38, -44, -10);
  solid(c, M, shape);
  inside(c, shape, () => {
    flat(c, L, () => { poly(c, -22, -32, 22, -32, 13, -10, -13, -10); });
    flat(c, D, () => { poly(c, 13, -10, 44, -10, 0, 38); poly(c, 22, -32, 44, -10, 13, -10); });
  });
  line(c, D, 2.5, () => { c.moveTo(-44, -10); c.lineTo(44, -10); c.moveTo(-13, -10); c.lineTo(0, 38); });
  c.beginPath(); shape(); c.stroke();
  flat(c, 'rgba(255,255,255,.6)', () => poly(c, -24, -24, -16, -24, -26, -14, -34, -14));
}

/** 💰 Harry's loan booth: a tied sack of money, a green $ on it. */
function moneyBag(c: Ctx) {
  const BAG = '#D8B074', BAG_DEEP = '#B08648';
  solid(c, BAG, () => poly(c, -12, -24, -26, -44, -8, -36, 0, -46, 8, -36, 26, -44, 12, -24));
  const body = () => {
    c.moveTo(-12, -24); c.bezierCurveTo(-52, -4, -50, 44, 0, 44); c.bezierCurveTo(50, 44, 52, -4, 12, -24); c.closePath();
  };
  solid(c, BAG, body);
  inside(c, body, () => flat(c, BAG_DEEP, () => oval(c, 18, 40, 34, 14)));
  c.beginPath(); body(); c.stroke();
  solid(c, DARK_WOOD, () => box(c, -17, -28, 34, 9, 4));
  line(c, DEEP_GREEN, 6, () => {
    c.moveTo(11, 2); c.bezierCurveTo(6, -6, -12, -4, -11, 6); c.bezierCurveTo(-10, 14, 11, 12, 11, 22);
    c.bezierCurveTo(11, 32, -8, 33, -12, 24);
    c.moveTo(0, -6); c.lineTo(0, 34);
  });
  flat(c, 'rgba(255,255,255,.35)', () => oval(c, -24, 0, 6, 12, 0.3));
}

/** 🦈 Samehada, and Harry the loan shark: a mean grey shark, thick fins, a heavy brow over one narrowed eye, a wide grin of teeth. */
function shark(c: Ctx) {
  const S = '#6E8798', S_DEEP = '#4F6575';
  c.save(); c.translate(-1, 3); c.rotate(-0.1);
  // the dorsal fin, tall and thick
  solid(c, S_DEEP, () => { c.moveTo(-14, -18); c.quadraticCurveTo(-4, -34, 4, -46); c.quadraticCurveTo(10, -30, 18, -19); c.closePath(); });
  const body = () => {
    c.moveTo(45, -2); c.quadraticCurveTo(40, -26, 8, -24); c.quadraticCurveTo(-18, -21, -30, -6);
    c.lineTo(-46, -30); c.lineTo(-38, 0); c.lineTo(-46, 26); c.lineTo(-29, 7);
    c.quadraticCurveTo(-6, 27, 22, 24); c.quadraticCurveTo(42, 19, 45, -2); c.closePath();
  };
  solid(c, S, body);
  inside(c, body, () => flat(c, CREAM, () => oval(c, 8, 30, 36, 11)));
  c.beginPath(); body(); c.stroke();
  // the pectoral fin, broad
  solid(c, S_DEEP, () => { c.moveTo(-6, 13); c.quadraticCurveTo(-14, 30, -20, 40); c.quadraticCurveTo(2, 34, 16, 19); c.closePath(); });
  // the grin: a wide white band, one bold zigzag of teeth through it
  solid(c, '#fff', () => { c.moveTo(44, 3); c.quadraticCurveTo(30, 9, 10, 7); c.quadraticCurveTo(28, 34, 44, 3); c.closePath(); });
  line(c, INK, 3.5, () => {
    c.moveTo(12, 9);
    for (let i = 1; i <= 5; i++) { const x = 12 + i * 6.2; c.lineTo(x, (i % 2 ? 18 : 9) - i * 0.9); }
  });
  // one eye, narrowed under a heavy brow slanting down to the snout
  solid(c, '#fff', () => { c.moveTo(11, -15); c.lineTo(35, -7); c.quadraticCurveTo(22, 12, 11, -15); c.closePath(); });
  flat(c, INK, () => dot(c, 26, -3, 4));
  line(c, INK, 6.5, () => { c.moveTo(8, -22); c.lineTo(38, -11); });
  c.restore();
}

/** 🔔 The gong's bell: a gold bell with its clapper, hung from a red cord. */
function bell(c: Ctx) {
  bar(c, DEEP_RED, 5, () => { c.moveTo(0, -46); c.lineTo(0, -34); });
  solid(c, GOLD, () => { c.moveTo(-34, 24); c.quadraticCurveTo(-30, -36, 0, -36); c.quadraticCurveTo(30, -36, 34, 24); c.closePath(); });
  solid(c, DEEP_GOLD, () => box(c, -40, 20, 80, 10, 5));
  solid(c, NIGHT, () => dot(c, 0, 36, 7));
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -14, -12, 6, 14, 0.2));
}

/** 🥁 The ring's second tier: a red taiko drum with its tacks, two sticks crossed on its head. */
function taiko(c: Ctx) {
  const body = () => {
    c.moveTo(-34, -14); c.quadraticCurveTo(-50, 8, -34, 30); c.ellipse(0, 30, 34, 10, 0, Math.PI, 0, true);
    c.quadraticCurveTo(50, 8, 34, -14); c.closePath();
  };
  solid(c, RED, body);
  inside(c, body, () => flat(c, DEEP_RED, () => oval(c, 26, 8, 14, 40)));
  c.beginPath(); body(); c.stroke();
  flat(c, NIGHT, () => {
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      dot(c, Math.cos(a) * 36, -6 + Math.sin(a) * 9, 2.5);
      dot(c, Math.cos(a) * 36, 22 + Math.sin(a) * 9, 2.5);
    }
  });
  solid(c, CREAM, () => oval(c, 0, -14, 34, 10));
  bar(c, '#C3875D', 6, () => { c.moveTo(-38, -42); c.lineTo(18, -12); c.moveTo(38, -42); c.lineTo(-18, -12); });
}

/** ⛩ The ring's third tier: a grand stone shrine gate, its posts leaning in, a dark cap on its swept-up top beam, a gold plaque. */
function shrineGate(c: Ctx) {
  const STONE = '#A9B4BC', STONE_DEEP = '#8996A0';
  for (const s of [-1, 1]) {
    solid(c, STONE, () => poly(c, s * 19, -30, s * 29, -30, s * 34, 38, s * 21, 38));
    solid(c, NIGHT, () => box(c, s * 27.5 - 9, 36, 18, 7, 2));
  }
  solid(c, GOLD, () => box(c, -9, -32, 18, 22, 3));
  flat(c, DEEP_GOLD, () => box(c, -4, -27, 8, 12, 1.5));
  solid(c, STONE, () => c.rect(-42, -14, 84, 9));
  solid(c, STONE_DEEP, () => { c.moveTo(-42, -36); c.quadraticCurveTo(0, -30, 42, -36); c.lineTo(42, -28); c.quadraticCurveTo(0, -22, -42, -28); c.closePath(); });
  solid(c, NIGHT, () => {
    c.moveTo(-48, -47); c.quadraticCurveTo(0, -36, 48, -47);
    c.lineTo(45, -37); c.quadraticCurveTo(0, -30, -45, -37); c.closePath();
  });
}

/** 🏁 The tech tree's Start: a chequered flag waving from its pole. */
function chequered(c: Ctx) {
  const x0 = -30, x1 = 44, top = -40, h = 40, cols = 6, rows = 4;
  const wave = (x: number) => -6 * Math.sin(((x - x0) / (x1 - x0)) * TAU);
  const at = (x: number, k: number) => top + wave(x) + k * h;
  const flag = () => {
    c.moveTo(x0, at(x0, 0));
    for (let i = 1; i <= 24; i++) { const x = x0 + ((x1 - x0) * i) / 24; c.lineTo(x, at(x, 0)); }
    for (let i = 24; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / 24; c.lineTo(x, at(x, 1)); }
    c.closePath();
  };
  bar(c, DARK_WOOD, 6, () => { c.moveTo(-36, -42); c.lineTo(-36, 44); });
  solid(c, CREAM, flag);
  inside(c, flag, () => flat(c, NIGHT, () => {
    const w = (x1 - x0) / cols;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i + j) % 2) continue;
      const a = x0 + i * w, b = a + w, p = j / rows, q = (j + 1) / rows;
      poly(c, a, at(a, p), (a + b) / 2, at((a + b) / 2, p), b, at(b, p), b, at(b, q), (a + b) / 2, at((a + b) / 2, q), a, at(a, q));
    }
  }));
  c.beginPath(); flag(); c.stroke();
  solid(c, GOLD, () => dot(c, -36, -44, 5));
}

/** 🔓 What a beaten boss opens: the padlock again (🔒's), its shackle up and swung open. */
function unlocked(c: Ctx) {
  c.save(); c.translate(0, 4);
  bar(c, '#9AA7B0', 7, () => { c.moveTo(-14, -2); c.lineTo(-14, -30); c.arc(0, -30, 14, Math.PI, TAU); c.lineTo(14, -20); });
  solid(c, GOLD, () => box(c, -25, -6, 50, 42, 8));
  flat(c, '#7A5A14', () => { dot(c, 0, 10, 5.5); c.rect(-2.5, 10, 5, 14); });
  c.restore();
}

export const CASINO: Record<string, Drawing> = {
  '🃏': cards, '🎡': rouletteWheel, '🎟': ticket, '💎': gem, '💰': moneyBag, '🦈': shark, '🔔': bell,
  '🥁': taiko, '⛩': shrineGate, '🏁': chequered, '🔓': unlocked,
};
