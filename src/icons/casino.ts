// Icons for the casino, the Undertow and fight night, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, CREAM, DARK_WOOD, DEEP_GOLD, DEEP_GREEN, DEEP_RED, GOLD, INK, NIGHT, PINK, RED, SKIN, TAU,
  bar, blob, box, dot, drum, flat, heartPath, inside, line, oval, poly, solid,
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

/** 🦈 Harry the loan shark, and Samehada: a grey shark side on, fin up, grinning with its teeth. */
function shark(c: Ctx) {
  const S = '#7D96A8', S_DEEP = '#5E7789';
  c.save(); c.translate(0, 5);
  solid(c, S_DEEP, () => { c.moveTo(-10, -16); c.quadraticCurveTo(-2, -30, 6, -44); c.quadraticCurveTo(8, -26, 18, -16); c.closePath(); });
  const body = () => {
    c.moveTo(46, 0); c.quadraticCurveTo(30, -22, 0, -18); c.quadraticCurveTo(-24, -15, -34, -2);
    c.lineTo(-45, -24); c.lineTo(-40, 2); c.lineTo(-45, 24); c.lineTo(-32, 6);
    c.quadraticCurveTo(-8, 22, 20, 18); c.quadraticCurveTo(38, 14, 46, 0); c.closePath();
  };
  solid(c, S, body);
  inside(c, body, () => flat(c, CREAM, () => oval(c, 18, 18, 30, 9)));
  c.beginPath(); body(); c.stroke();
  solid(c, S_DEEP, () => { c.moveTo(0, 12); c.lineTo(-12, 32); c.lineTo(14, 16); c.closePath(); });
  line(c, S_DEEP, 2.5, () => { for (const x of [10, 15]) { c.moveTo(x, -6); c.lineTo(x - 2, 6); } });
  // the grin, and its teeth
  solid(c, '#fff', () => { c.moveTo(42, 4); c.quadraticCurveTo(34, 12, 22, 8); c.quadraticCurveTo(32, 6, 42, 4); });
  line(c, INK, 2.5, () => { c.moveTo(27, 8); c.lineTo(29, 11); c.moveTo(33, 8); c.lineTo(35, 10); });
  flat(c, INK, () => dot(c, 30, -6, 3.5));
  flat(c, 'rgba(255,255,255,.35)', () => oval(c, 0, -10, 12, 3.5, -0.1));
  c.restore();
}

/** 🐀 A boss on the odds board: a grey dock rat, side on, its pink tail curled up behind it. */
function rat(c: Ctx) {
  const R = '#8E8C94', R_DEEP = '#6E6C75';
  bar(c, PINK, 4, () => { c.moveTo(-28, 22); c.bezierCurveTo(-52, 28, -50, -6, -34, -16); });
  for (const x of [-14, 18]) solid(c, PINK, () => oval(c, x, 34, 7, 4));
  blob(c, R, () => {
    oval(c, -6, 12, 28, 21);
    c.moveTo(4, -6); c.quadraticCurveTo(30, -6, 45, 12); c.quadraticCurveTo(30, 24, 6, 28); c.closePath();
  });
  flat(c, '#B8B6BD', () => oval(c, 2, 24, 20, 7));
  solid(c, R, () => dot(c, 12, -10, 11));
  flat(c, PINK, () => dot(c, 12, -10, 6));
  flat(c, R_DEEP, () => oval(c, -16, 6, 8, 12, 0.3));
  solid(c, PINK, () => dot(c, 44, 11, 4));
  flat(c, INK, () => dot(c, 28, 4, 3.5));
  line(c, INK, 2.5, () => { c.moveTo(38, 16); c.lineTo(46, 22); });
}

/** 🔔 The gong's bell: a gold bell with its clapper, hung from a red cord. */
function bell(c: Ctx) {
  bar(c, DEEP_RED, 5, () => { c.moveTo(0, -46); c.lineTo(0, -34); });
  solid(c, GOLD, () => { c.moveTo(-34, 24); c.quadraticCurveTo(-30, -36, 0, -36); c.quadraticCurveTo(30, -36, 34, 24); c.closePath(); });
  solid(c, DEEP_GOLD, () => box(c, -40, 20, 80, 10, 5));
  solid(c, NIGHT, () => dot(c, 0, 36, 7));
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -14, -12, 6, 14, 0.2));
}

/** 🤼 The sparring partner: two sumo wrestlers locked head to head, a blue belt and a red. */
function wrestlers(c: Ctx) {
  const BELT = ['#355C9E', DEEP_RED];
  for (const s of [-1, 1]) {
    bar(c, SKIN, 10, () => { c.moveTo(s * 20, 22); c.lineTo(s * 30, 42); c.moveTo(s * 34, 18); c.lineTo(s * 40, 42); });
  }
  for (const [i, s] of [-1, 1].entries()) {
    const body = () => oval(c, s * 24, 6, 20, 25, s * 0.5);
    solid(c, SKIN, body);
    inside(c, body, () => flat(c, BELT[i], () => { c.save(); c.translate(s * 24, 6); c.rotate(s * 0.5); c.rect(-30, 4, 60, 16); c.restore(); }));
    c.beginPath(); body(); c.stroke();
  }
  // arms round each other, hands on the other's belt
  bar(c, SKIN, 9, () => { c.moveTo(18, 4); c.quadraticCurveTo(0, 18, -22, 14); });
  bar(c, SKIN, 9, () => { c.moveTo(-20, -8); c.quadraticCurveTo(4, -22, 30, -10); });
  for (const s of [-1, 1]) {
    solid(c, NIGHT, () => oval(c, s * 20, -36, 6, 4.5, s * 0.4));
    const head = () => dot(c, s * 10, -26, 12);
    solid(c, SKIN, head);
    inside(c, head, () => flat(c, NIGHT, () => oval(c, s * 17, -35, 13, 10, s * 0.5)));
    c.beginPath(); head(); c.stroke();
    flat(c, INK, () => dot(c, s * 4, -23, 2.5));
  }
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

/** ⛩ The ring's third tier: the grand shrine gate, black and gold, a straw rope with paper streamers hung across it. */
function shrineGate(c: Ctx) {
  for (const x of [-28, 28]) {
    solid(c, GOLD, () => c.rect(x - 5, -24, 10, 62));
    solid(c, NIGHT, () => box(c, x - 8, 34, 16, 9, 2));
  }
  solid(c, DEEP_GOLD, () => c.rect(-40, -16, 80, 8));
  solid(c, NIGHT, () => box(c, -8, -29, 16, 13, 2));
  solid(c, NIGHT, () => {
    c.moveTo(-48, -44); c.quadraticCurveTo(0, -32, 48, -44);
    c.lineTo(44, -30); c.quadraticCurveTo(0, -22, -44, -30); c.closePath();
  });
  line(c, GOLD, 3, () => { c.moveTo(-44, -37); c.quadraticCurveTo(0, -26, 44, -37); });
  // the shimenawa, sagging between the posts, and its zigzag paper
  for (const x of [-10, 10]) bar(c, CREAM, 4, () => { c.moveTo(x, 8); c.lineTo(x + 5, 14); c.lineTo(x - 3, 20); c.lineTo(x + 3, 27); });
  bar(c, '#EBD9A8', 9, () => { c.moveTo(-32, -2); c.quadraticCurveTo(0, 16, 32, -2); });
  line(c, '#B99A52', 2.5, () => { for (const x of [-20, -8, 4, 16]) { const y = -2 + 18 * (1 - ((x + 2) / 32) ** 2) * 0.5; c.moveTo(x, y - 3); c.lineTo(x + 5, y + 3); } });
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
  '🃏': cards, '🎡': rouletteWheel, '🎟': ticket, '💎': gem, '💰': moneyBag, '🦈': shark, '🐀': rat, '🔔': bell,
  '🤼': wrestlers, '🥁': taiko, '⛩': shrineGate, '🏁': chequered, '🔓': unlocked,
};
