// Little vector drawings for the icons painted into canvas textures (the markings on the deck, the menu tags, the
// price board, the mood faces), in place of emoji: emoji look different on every phone, and some not at all. They're
// drawn the way the order bubbles' fish, box, rice and sushi are (bubble.ts): a few bold, flat shapes in the game's
// own colours, here with a dark outline so they read at a glance on a white badge or a wooden tag.
// Each is keyed by the emoji it replaces, so the tiles and squares keep their emoji for the page (the tip, the arrows
// at the edge of the screen) and the canvas draws the picture instead.
import {
  type Ctx, type Drawing, BLUE, CREAM, DARK_WOOD, DEEP_GOLD, DEEP_GREEN, DEEP_RED, GOLD, GREEN, INK, NIGHT, OUT, PINK,
  RED, SKIN, SKY, STEEL, TAU, WOOD,
  bar, blob, box, boxed, dot, drum, eye, flat, heartPath, inside, leaf, line, oval, poly, solid,
} from './icons/kit';
import { HUD } from './icons/hud';
import { NATURE } from './icons/nature';
import { FOOD } from './icons/food';
import { CASINO } from './icons/casino';
import { PEOPLE } from './icons/people';
import { WORKS } from './icons/works';
import { ARCADE } from './icons/arcade';
import { BOSS } from './icons/bosses';

// ---------- the bubbles' own icons (shared with bubble.ts, drawn in its coordinates) ----------

/** A blue fish with a yellow fin, like the ones in the water. */
export function fishIcon(c: Ctx) {
  c.fillStyle = BLUE;
  c.beginPath(); c.moveTo(24, 58); c.lineTo(10, 46); c.lineTo(10, 70); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(42, 58, 22, 12, 0, 0, 7); c.fill();
  c.fillStyle = '#E3EAF0'; c.beginPath(); c.ellipse(44, 62, 17, 6, 0, 0, Math.PI); c.fill();
  c.fillStyle = GOLD; c.beginPath(); c.moveTo(36, 47); c.lineTo(46, 38); c.lineTo(50, 47); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(55, 55, 3.5, 0, 7); c.fill();
  c.fillStyle = INK; c.beginPath(); c.arc(56, 55, 1.8, 0, 7); c.fill();
}

/** Takeout box: black with a red lid band. */
export function boxIcon(c: Ctx) {
  c.fillStyle = NIGHT; c.beginPath(); box(c, 20, 44, 48, 30, 6); c.fill();
  c.fillStyle = DEEP_RED; c.beginPath(); box(c, 18, 40, 52, 10, 4); c.fill();
}

/** A sack of rice, as the bags look: cream, with a red band and 米 on it. */
export function riceIcon(c: Ctx) {
  c.fillStyle = '#E6DBC0'; c.beginPath(); box(c, 18, 38, 52, 38, 9); c.fill();
  c.fillStyle = DEEP_RED; c.fillRect(18, 50, 52, 14);
  c.fillStyle = CREAM; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('米', 44, 58);
}

export function sushiIcon(c: Ctx) {
  c.fillStyle = CREAM; c.beginPath(); box(c, 24, 56, 40, 18, 8); c.fill();
  c.fillStyle = '#FF8A5C'; c.beginPath(); box(c, 22, 44, 44, 16, 8); c.fill();
  c.strokeStyle = '#FFD2BC'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(34, 47); c.lineTo(39, 57); c.moveTo(47, 47); c.lineTo(52, 57); c.stroke();
}


// ---------- the market: pads, squares and stage 1's tiles ----------

/** 🎣 A rod with its reel, the line hanging from its tip to a red and white float. */
function rod(c: Ctx) {
  line(c, INK, 2.5, () => { c.moveTo(30, -40); c.lineTo(30, 16); });
  bar(c, WOOD, 7, () => { c.moveTo(-38, 40); c.lineTo(30, -40); });
  bar(c, '#3B2A20', 9, () => { c.moveTo(-38, 40); c.lineTo(-27, 27); });
  solid(c, STEEL, () => dot(c, -14, 26, 9));
  flat(c, INK, () => dot(c, -14, 26, 3));
  solid(c, CREAM, () => dot(c, 30, 26, 10));
  flat(c, RED, () => { c.moveTo(20, 26); c.arc(30, 26, 10, Math.PI, TAU); c.closePath(); });
  c.beginPath(); dot(c, 30, 26, 10); c.stroke();
}

/** 🐟 The bubbles' fish. */
const fish = boxed(fishIcon, [10, 38, 54, 32], 88);
/** 🍚 A sack of rice as it's carried: one cloth sack, gathered and tied at the neck with a red cord, 米 on a red seal. */
function rice(c: Ctx) {
  solid(c, '#E6DBC0', () => {
    // the frilled top, the neck, then the full body (one sack, one outline)
    c.moveTo(-10, -26); c.lineTo(-22, -44); c.lineTo(-11, -38); c.lineTo(0, -45); c.lineTo(11, -38); c.lineTo(22, -44);
    c.lineTo(10, -26);
    c.bezierCurveTo(30, -18, 38, 2, 37, 22); c.quadraticCurveTo(37, 42, 18, 42);
    c.lineTo(-18, 42); c.quadraticCurveTo(-37, 42, -37, 22); c.bezierCurveTo(-38, 2, -30, -18, -10, -26);
    c.closePath();
  });
  bar(c, DEEP_RED, 6, () => { c.moveTo(-13, -26); c.lineTo(13, -26); });
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -25, 4, 4.5, 12, 0.2));
  flat(c, DEEP_RED, () => dot(c, 2, 14, 18));
  // 米, brushed in strokes (an icon carries no text: it's a glyph in the emoji font too)
  line(c, CREAM, 4, () => {
    c.moveTo(-9, 14); c.lineTo(13, 14); c.moveTo(2, 1); c.lineTo(2, 27);
    c.moveTo(-6, 4); c.lineTo(-2, 9); c.moveTo(10, 4); c.lineTo(6, 9);
    c.moveTo(0, 17); c.lineTo(-8, 25); c.moveTo(4, 17); c.lineTo(12, 25);
  });
}
/** 🥡 The takeout kiosk's box: a white folded pail, wider at the top, its flaps closed into a roof, a wire handle and a red stripe. */
function takeout(c: Ctx) {
  c.save(); c.translate(2, 3);
  // a small wire loop, rising out of the ridge
  bar(c, STEEL, 2.5, () => { c.moveTo(-15, -28); c.quadraticCurveTo(-3, -60, 9, -28); });
  // the front, wider at the top; the right side, narrower and shaded
  const front = () => poly(c, -40, -6, 8, -6, 2, 40, -32, 40);
  const side = () => poly(c, 8, -6, 34, -18, 26, 28, 2, 40);
  solid(c, CREAM, front);
  inside(c, front, () => flat(c, RED, () => c.rect(-50, 6, 70, 9)));
  c.beginPath(); front(); c.stroke();
  solid(c, '#DCE4EA', side);
  inside(c, side, () => flat(c, DEEP_RED, () => poly(c, 0, 6, 40, -14, 40, -5, 0, 15)));
  c.beginPath(); side(); c.stroke();
  // the flaps on top: the front one folded back to the ridge, the gable end on the side
  solid(c, '#DCE4EA', () => poly(c, 8, -6, 34, -18, 22, -32));
  solid(c, CREAM, () => poly(c, -40, -6, 8, -6, 22, -32, -26, -32));
  line(c, '#DCE4EA', 3, () => { c.moveTo(-16, -9); c.lineTo(-6, -29); });
  c.restore();
}

/** 🚗 A little red car, side on. */
function car(c: Ctx) {
  solid(c, RED, () => poly(c, -26, 0, -16, -24, 14, -24, 26, 0));
  flat(c, '#BFE3F2', () => { poly(c, -18, -2, -11, -18, -3, -18, -3, -2); poly(c, 2, -2, 2, -18, 11, -18, 18, -2); });
  solid(c, RED, () => box(c, -44, -4, 88, 26, 10));
  flat(c, '#FFE9A8', () => box(c, 34, 2, 8, 6, 2));
  flat(c, DEEP_RED, () => box(c, -40, 12, 80, 4, 2));
  for (const x of [-24, 24]) {
    solid(c, NIGHT, () => dot(c, x, 22, 11));
    flat(c, STEEL, () => dot(c, x, 22, 4.5));
  }
}

/** 🎰 The roulette wheel from above: red and black pockets round a wooden middle, and the ball. */
function roulette(c: Ctx) {
  solid(c, '#6B3E26', () => dot(c, 0, 0, 44));
  const n = 14, seg = TAU / n;
  for (let i = 0; i < n; i++) {
    flat(c, i === 0 ? '#2E9E49' : i % 2 ? '#D8394B' : '#22303C', () => {
      c.moveTo(0, 0); c.arc(0, 0, 38, i * seg - Math.PI / 2 - seg / 2, i * seg - Math.PI / 2 + seg / 2); c.closePath();
    });
  }
  solid(c, '#C3875D', () => dot(c, 0, 0, 23));
  line(c, GOLD, 4, () => { c.moveTo(-14, 0); c.lineTo(14, 0); c.moveTo(0, -14); c.lineTo(0, 14); });
  solid(c, GOLD, () => dot(c, 0, 0, 6));
  solid(c, '#fff', () => dot(c, 22, -22, 5));
}

/** 🛴 Korki: a kick scooter, in gold like the statue. */
function scooter(c: Ctx) {
  bar(c, GOLD, 8, () => { c.moveTo(-30, 26); c.lineTo(22, 26); });
  bar(c, GOLD, 7, () => { c.moveTo(30, 30); c.lineTo(20, -36); });
  bar(c, GOLD, 7, () => { c.moveTo(8, -36); c.lineTo(32, -36); });
  bar(c, NIGHT, 7, () => { c.moveTo(8, -36); c.lineTo(13, -36); });
  for (const x of [-30, 30]) {
    solid(c, NIGHT, () => dot(c, x, 30, 10));
    flat(c, DEEP_GOLD, () => dot(c, x, 30, 4));
  }
}

/** 💔 A red heart, cracked in two. */
function brokenHeart(c: Ctx) {
  const crack = [0, -26, -7, -12, 5, 0, -5, 14, 2, 25, 0, 38];
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 4, 2); c.rotate(side * 0.1);
    // this half: everything on its side of the crack
    c.beginPath(); c.moveTo(side * 70, -70); c.lineTo(0, -70);
    for (let i = 0; i < crack.length; i += 2) c.lineTo(crack[i], crack[i + 1]);
    c.lineTo(0, 70); c.lineTo(side * 70, 70); c.closePath(); c.clip();
    c.beginPath(); heartPath(c); c.fillStyle = RED; c.fill();
    if (side < 0) flat(c, 'rgba(255,255,255,.45)', () => oval(c, -29, -24, 8, 5, -0.7));
    // the outline is cut in half by the clip, so it's stroked twice as wide, round the crack too
    c.lineWidth = OUT * 2;
    c.beginPath(); heartPath(c); c.stroke();
    c.beginPath(); c.moveTo(crack[0], crack[1]);
    for (let i = 2; i < crack.length; i += 2) c.lineTo(crack[i], crack[i + 1]);
    c.stroke();
    c.restore();
  }
}

/** 🍳 The cookware shop's square: a black frying pan at a slant, its wooden handle, an egg frying in it. */
function pan(c: Ctx) {
  c.save(); c.rotate(-Math.PI / 7);
  solid(c, WOOD, () => box(c, 22, -7, 32, 14, 6));
  flat(c, DARK_WOOD, () => c.rect(46, -7, 4, 14));
  solid(c, '#3A3D44', () => dot(c, -8, 0, 34));
  flat(c, '#24262B', () => dot(c, -8, 0, 26));
  solid(c, CREAM, () => { c.moveTo(-26, -2); c.bezierCurveTo(-28, -20, -4, -22, 4, -12); c.bezierCurveTo(14, -2, 6, 16, -10, 14); c.bezierCurveTo(-24, 14, -24, 8, -26, -2); c.closePath(); });
  solid(c, GOLD, () => dot(c, -9, -3, 8));
  flat(c, 'rgba(255,255,255,.7)', () => dot(c, -12, -6, 2.5));
  c.restore();
}

/** 📈 The upgrade square: rising bars, and a green arrow climbing over them. */
function upgrade(c: Ctx) {
  [[-40, 18], [-14, 32], [12, 48]].forEach(([x, h]) => solid(c, SKY, () => box(c, x, 40 - h, 20, h, 4)));
  bar(c, GREEN, 9, () => { c.moveTo(-40, 6); c.lineTo(-16, -10); c.lineTo(2, -2); c.lineTo(30, -28); });
  solid(c, GREEN, () => poly(c, 44, -42, 39, -14, 18, -35));
}

/** 🌿 A sprig of green leaves, for fertilizer. */
function sprig(c: Ctx) {
  bar(c, DEEP_GREEN, 5, () => { c.moveTo(-22, 42); c.quadraticCurveTo(-6, 0, 18, -36); });
  leaf(c, GREEN, -14, 22, -2.6, 30, 11);
  leaf(c, DEEP_GREEN, -10, 14, -0.5, 32, 11);
  leaf(c, GREEN, -3, 0, -2.4, 30, 11);
  leaf(c, DEEP_GREEN, 3, -8, -0.3, 30, 10);
  leaf(c, GREEN, 12, -24, -1.4, 26, 10);
}

/** 🎒 A red backpack with its flap, buckle and front pocket. */
function backpack(c: Ctx) {
  bar(c, '#7A2A22', 6, () => c.arc(0, -30, 11, Math.PI, TAU));
  solid(c, RED, () => box(c, -32, -30, 64, 74, 16));
  solid(c, DEEP_RED, () => box(c, -32, -30, 64, 32, 16));
  solid(c, DEEP_RED, () => box(c, -22, 12, 44, 24, 8));
  flat(c, '#7A2A22', () => c.rect(-4, -4, 8, 18));
  solid(c, GOLD, () => box(c, -7, 4, 14, 10, 2));
}

/** 🎯 The auto harpoon: a target with a dart in the bull. */
function target(c: Ctx) {
  [[42, RED], [32, CREAM], [22, RED], [12, CREAM]].forEach(([r, col]) => solid(c, col as string, () => dot(c, 0, 0, r as number)));
  solid(c, RED, () => dot(c, 0, 0, 5));
  bar(c, DARK_WOOD, 5, () => { c.moveTo(0, 0); c.lineTo(36, -36); });
  solid(c, GREEN, () => { poly(c, 30, -30, 34, -46, 40, -40); poly(c, 30, -30, 46, -34, 40, -40); });
}

/** 🏃 A runner in a blue jacket, leaning into it. */
function runner(c: Ctx) {
  const PANTS = '#22303C', JACKET = '#2F6FD0';
  line(c, '#8FB3C9', 4, () => { c.moveTo(-46, -14); c.lineTo(-32, -14); c.moveTo(-48, -2); c.lineTo(-30, -2); c.moveTo(-44, 10); c.lineTo(-32, 10); });
  bar(c, JACKET, 8, () => { c.moveTo(4, -12); c.lineTo(-10, -2); c.lineTo(-20, -14); });
  bar(c, PANTS, 10, () => { c.moveTo(-2, 10); c.lineTo(-14, 24); c.lineTo(-30, 30); });
  bar(c, JACKET, 16, () => { c.moveTo(-2, 10); c.lineTo(6, -14); });
  bar(c, PANTS, 10, () => { c.moveTo(-2, 10); c.lineTo(16, 18); c.lineTo(12, 40); });
  bar(c, JACKET, 8, () => { c.moveTo(4, -12); c.lineTo(18, -2); c.lineTo(30, -12); });
  solid(c, SKIN, () => dot(c, 14, -32, 11));
  flat(c, '#3B2A20', () => { c.moveTo(3, -33); c.arc(14, -32, 11, Math.PI, TAU * 0.86); c.closePath(); });
}

/** 🥾 A snow boot: brown leather, a woolly cuff and a thick sole. */
function boot(c: Ctx) {
  solid(c, '#3B2A20', () => box(c, -32, 30, 72, 11, 5));
  solid(c, WOOD, () => {
    c.moveTo(-28, 32); c.lineTo(-28, -26); c.lineTo(6, -26); c.lineTo(8, 4);
    c.quadraticCurveTo(36, 8, 38, 32); c.closePath();
  });
  flat(c, DARK_WOOD, () => oval(c, 28, 24, 10, 6));
  line(c, GOLD, 3, () => { for (const y of [-14, -4, 6]) { c.moveTo(-6, y); c.lineTo(6, y + 5); c.moveTo(-6, y + 5); c.lineTo(6, y); } });
  solid(c, CREAM, () => box(c, -34, -40, 46, 17, 8));
}

/** 🥅 The ice net: a net strung between two posts, orange floats along its top rope. */
function net(c: Ctx) {
  inside(c, () => c.rect(-38, -26, 76, 62), () => {
    line(c, '#5B7A8C', 2.5, () => {
      for (let x = -80; x <= 40; x += 12) { c.moveTo(x, 36); c.lineTo(x + 62, -26); c.moveTo(x + 40, 36); c.lineTo(x - 22, -26); }
    });
  });
  bar(c, '#E6DBC0', 4, () => { c.moveTo(-38, -26); c.lineTo(38, -26); });
  for (const x of [-38, 38]) bar(c, DARK_WOOD, 8, () => { c.moveTo(x, -38); c.lineTo(x, 42); });
  for (const x of [-18, 0, 18]) solid(c, '#F08A24', () => dot(c, x, -26, 6));
}

/** 🏯 Open Floe Sushi: the red torii gate at the restaurant's door. */
function torii(c: Ctx) {
  for (const x of [-26, 26]) {
    solid(c, DEEP_RED, () => c.rect(x - 5, -26, 10, 64));
    solid(c, NIGHT, () => box(c, x - 7, 34, 14, 8, 2));
  }
  solid(c, DEEP_RED, () => c.rect(-40, -14, 80, 8));
  solid(c, NIGHT, () => c.rect(-5, -26, 10, 12));
  solid(c, RED, () => c.rect(-40, -30, 80, 8));
  solid(c, NIGHT, () => {
    c.moveTo(-48, -42); c.quadraticCurveTo(0, -30, 48, -42);
    c.lineTo(44, -30); c.quadraticCurveTo(0, -22, -44, -30); c.closePath();
  });
}

/** 🌾 A sheaf of ripe rice, tied with red. */
function sheaf(c: Ctx) {
  const stalks: [number, number][] = [[-22, -30], [0, -40], [22, -30]];
  for (const [x, y] of stalks) bar(c, DEEP_GOLD, 3, () => { c.moveTo(0, 42); c.quadraticCurveTo(x * 0.2, 0, x, y); });
  for (const [x, y] of stalks) {
    const a = Math.atan2(y - 10, x), along = [Math.cos(a), Math.sin(a)], across = [-along[1], along[0]];
    for (let i = 0; i < 5; i++) {
      const s = i % 2 ? 1 : -1, d = -i * 7;
      solid(c, GOLD, () => oval(c, x + along[0] * d + across[0] * s * 5, y + along[1] * d + across[1] * s * 5, 6, 3.5, a + s * 0.5));
    }
  }
  solid(c, DEEP_RED, () => box(c, -9, 16, 18, 8, 3));
}

// ---------- the restaurant's tiles ----------

/** 🪑 More seats: a red bar stool like the ones round the belt. */
function stool(c: Ctx) {
  drum(c, 0, 32, 22, 7, 6, '#3B4652', '#55636F');
  bar(c, '#3B4652', 8, () => { c.moveTo(0, -10); c.lineTo(0, 32); });
  bar(c, '#55636F', 4, () => c.ellipse(0, 12, 14, 4, 0, 0, Math.PI));
  drum(c, 0, -26, 32, 11, 12, DEEP_RED, RED);
}

/** 🔪 A chef's knife: a broad steel blade on a wooden handle. */
function knife(c: Ctx) {
  c.save(); c.rotate(-Math.PI / 4); c.scale(1.12, 1.12);
  solid(c, DARK_WOOD, () => box(c, -44, -7, 32, 14, 5));
  flat(c, STEEL, () => { dot(c, -36, 0, 2.5); dot(c, -24, 0, 2.5); });
  solid(c, '#9AA7B0', () => c.rect(-14, -8, 6, 16));
  solid(c, '#DDE5EA', () => { c.moveTo(-8, -9); c.lineTo(44, -9); c.quadraticCurveTo(38, 10, 14, 10); c.lineTo(-8, 10); c.closePath(); });
  line(c, '#fff', 3, () => { c.moveTo(-4, 6); c.lineTo(16, 6); });
  c.restore();
}

/** 🧑‍🌾 The farmer: a smiling face under a wide straw hat. */
function farmer(c: Ctx) {
  solid(c, DEEP_GREEN, () => { c.moveTo(-32, 46); c.quadraticCurveTo(-30, 18, 0, 18); c.quadraticCurveTo(30, 18, 32, 46); c.closePath(); });
  solid(c, SKIN, () => dot(c, 0, 0, 19));
  flat(c, INK, () => { dot(c, -7, 0, 2.6); dot(c, 7, 0, 2.6); });
  flat(c, 'rgba(229,72,77,.35)', () => { dot(c, -12, 8, 4); dot(c, 12, 8, 4); });
  line(c, INK, 2.5, () => c.arc(0, 6, 7, 0.25 * Math.PI, 0.75 * Math.PI));
  solid(c, '#E3B448', () => oval(c, 0, -14, 42, 9));
  solid(c, GOLD, () => { c.moveTo(-19, -14); c.quadraticCurveTo(-17, -40, 0, -40); c.quadraticCurveTo(17, -40, 19, -14); c.closePath(); });
  flat(c, DEEP_RED, () => c.rect(-18, -22, 36, 6));
}

/** 🧺 The porter's woven basket. */
function basket(c: Ctx) {
  bar(c, DARK_WOOD, 6, () => c.arc(0, -8, 30, Math.PI, TAU));
  const body = () => poly(c, -40, -6, 40, -6, 30, 40, -30, 40);
  solid(c, '#C3875D', body);
  inside(c, body, () => line(c, '#8A5A3B', 3, () => {
    for (const y of [8, 22]) { c.moveTo(-40, y); c.lineTo(40, y); }
    for (let x = -30; x <= 30; x += 12) { c.moveTo(x, -6); c.lineTo(x * 0.8, 40); }
  }));
  c.beginPath(); body(); c.stroke();
  solid(c, '#A86B44', () => box(c, -44, -14, 88, 11, 5));
}

/** 🌱 A seedling: two leaves up out of a mound of earth. */
function seedling(c: Ctx) {
  bar(c, DEEP_GREEN, 6, () => { c.moveTo(0, 30); c.lineTo(0, -2); });
  leaf(c, GREEN, 0, -2, -2.6, 36, 15);
  leaf(c, DEEP_GREEN, 0, -2, -0.45, 40, 16);
  solid(c, WOOD, () => { c.moveTo(-38, 40); c.quadraticCurveTo(0, 10, 38, 40); c.closePath(); });
}

/** ⛱️ Garden tables: a red tea-house parasol. */
function parasol(c: Ctx) {
  bar(c, DARK_WOOD, 5, () => { c.moveTo(0, -30); c.lineTo(0, 40); });
  solid(c, NIGHT, () => oval(c, 0, 42, 14, 4));
  const n = 4, w = 88 / n;
  solid(c, RED, () => {
    c.moveTo(-44, -4); c.quadraticCurveTo(-40, -44, 0, -44); c.quadraticCurveTo(40, -44, 44, -4);
    for (let i = 0; i < n; i++) c.quadraticCurveTo(44 - w * (i + 0.5), -14, 44 - w * (i + 1), -4);
    c.closePath();
  });
  line(c, DEEP_RED, 3, () => { for (let i = 1; i < n; i++) { c.moveTo(0, -42); c.lineTo(-44 + w * i, -6); } });
  solid(c, RED, () => dot(c, 0, -46, 4));
}

/** 🏮 The premium menu: a red paper lantern with black caps and a gold tassel. */
function lantern(c: Ctx) {
  line(c, INK, 3, () => { c.moveTo(0, -48); c.lineTo(0, -38); });
  bar(c, GOLD, 5, () => { c.moveTo(0, 36); c.lineTo(0, 48); });
  const body = () => oval(c, 0, 0, 30, 34);
  solid(c, RED, body);
  inside(c, body, () => line(c, DEEP_RED, 3, () => { for (let y = -21; y <= 21; y += 10.5) { c.moveTo(-30, y); c.lineTo(30, y); } }));
  flat(c, 'rgba(255,255,255,.28)', () => oval(c, -14, -8, 6, 15));
  c.beginPath(); body(); c.stroke();
  solid(c, NIGHT, () => box(c, -15, -40, 30, 9, 3));
  solid(c, NIGHT, () => box(c, -15, 31, 30, 9, 3));
}

/** 🎁 A present: a red box, its lid and a gold ribbon tied in a bow. */
function present(c: Ctx) {
  solid(c, RED, () => box(c, -34, -8, 68, 48, 5));
  solid(c, '#F06A6E', () => box(c, -39, -20, 78, 16, 5));
  solid(c, GOLD, () => c.rect(-7, -20, 14, 60));
  solid(c, GOLD, () => { oval(c, -14, -29, 14, 8, -0.4); oval(c, 14, -29, 14, 8, 0.4); });
  solid(c, DEEP_GOLD, () => dot(c, 0, -25, 6));
}

/** 🗳️ A ballot box, a slip going in at its slot (the voting boat's, votingBoat.ts). */
function ballot(c: Ctx) {
  solid(c, CREAM, () => poly(c, -14, -6, -10, -46, 18, -44, 14, -4));
  line(c, BLUE, 3, () => { c.moveTo(-5, -36); c.lineTo(10, -35); c.moveTo(-6, -27); c.lineTo(5, -26); });
  solid(c, BLUE, () => box(c, -40, -10, 80, 50, 6));
  solid(c, SKY, () => box(c, -44, -16, 88, 12, 4));
  flat(c, INK, () => box(c, -16, -12, 32, 4, 2));
  flat(c, 'rgba(255,255,255,.3)', () => box(c, -32, 0, 10, 32, 4));
}

/** 🔒 The padlock on a tile whose rating hasn't been reached yet. */
function lock(c: Ctx) {
  bar(c, '#9AA7B0', 7, () => { c.moveTo(-14, -2); c.lineTo(-14, -18); c.arc(0, -18, 14, Math.PI, TAU); c.lineTo(14, -2); });
  solid(c, GOLD, () => box(c, -25, -6, 50, 42, 8));
  flat(c, '#7A5A14', () => { dot(c, 0, 10, 5.5); c.rect(-2.5, 10, 5, 14); });
}

// ---------- faces ----------

/** 😐 A customer fed up with waiting. */
function meh(c: Ctx) {
  solid(c, '#F7D038', () => dot(c, 0, 0, 44));
  flat(c, INK, () => { oval(c, -15, -8, 5, 7.5); oval(c, 15, -8, 5, 7.5); });
  bar(c, INK, 4, () => { c.moveTo(-15, 20); c.lineTo(15, 20); });
}

/** 😠 One that's had enough: redder, brows down, and a frown. */
function angry(c: Ctx) {
  solid(c, '#F08A3C', () => dot(c, 0, 0, 44));
  flat(c, INK, () => { oval(c, -15, -2, 5, 6.5); oval(c, 15, -2, 5, 6.5); });
  line(c, INK, 7, () => { c.moveTo(-28, -22); c.lineTo(-6, -12); c.moveTo(28, -22); c.lineTo(6, -12); });
  line(c, INK, 6, () => c.arc(0, 34, 15, -0.82 * Math.PI, -0.18 * Math.PI));
}

/** 😭 The casino's restroom, for a good cry: eyes squeezed shut, mouth wide open, tears streaming down both cheeks. */
function sob(c: Ctx) {
  const face = () => dot(c, 0, 0, 44);
  solid(c, '#F7D038', face);
  // a stream of tears from under each eye, widening a little as it runs down the cheek to the chin's edge, a shine down
  // its left side; the face's own outline closes them off at the bottom
  const stream = (s: number) => {
    c.moveTo(s * 12, -13); c.lineTo(s * 26, -13);
    c.bezierCurveTo(s * 27, 8, s * 30, 26, s * 33, 50);
    c.lineTo(s * 12, 50);
    c.bezierCurveTo(s * 13, 24, s * 12, 6, s * 12, -13); c.closePath();
  };
  inside(c, face, () => {
    solid(c, '#6EC3F0', () => { stream(1); stream(-1); });
    line(c, 'rgba(255,255,255,.55)', 3.5, () => {
      c.moveTo(-21.5, -4); c.bezierCurveTo(-22, 10, -24, 24, -26, 40); c.moveTo(16.5, -4); c.bezierCurveTo(16.5, 10, 17, 24, 17.5, 40);
    });
  });
  line(c, INK, OUT, face);
  line(c, INK, 6, () => { c.moveTo(-31, -10); c.quadraticCurveTo(-19, -23, -7, -10); c.moveTo(7, -10); c.quadraticCurveTo(19, -23, 31, -10); });
  const mouth = () => { c.moveTo(-9, 5); c.quadraticCurveTo(0, 3, 9, 5); c.quadraticCurveTo(13, 32, 0, 32); c.quadraticCurveTo(-13, 32, -9, 5); c.closePath(); };
  solid(c, '#8E2B2B', mouth);
  inside(c, mouth, () => flat(c, '#E8607A', () => oval(c, 0, 31, 9, 6)));
}

// ---------- chef's specials: the dishes on the menu tags ----------

/** A spine that bends as it goes: its points, each with its heading `th` and half-width `w`. */
type Spine = { x: number; y: number; th: number; w: number }[];
/**
 * The spine of a tapering, bending thing (a leg curling at its tip, a prawn's back): from (x, y) heading `a`, `len`
 * long, turning `curl` radians by its end (more of the turn near the end as `p` grows), `w0` wide at the start and `w1`
 * at the end.
 */
function spine(x: number, y: number, a: number, len: number, curl: number, w0: number, w1: number, p = 2): Spine {
  const n = 32, s: Spine = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, th = a + curl * t ** p;
    s.push({ x, y, th, w: (w0 + (w1 - w0) * t) / 2 });
    x += Math.cos(th) * len / n; y += Math.sin(th) * len / n;
  }
  return s;
}
/** A point beside spine point `q`: `f` along it and `g` across it (positive to its right as it goes). */
const along = (q: Spine[number], f: number, g: number) =>
  [q.x + Math.cos(q.th) * f - Math.sin(q.th) * g, q.y + Math.sin(q.th) * f + Math.cos(q.th) * g];
/** Adds a spine's shape to the path, round at both ends, always wound the same way (so blob can join several). */
function spinePath(c: Ctx, s: Spine) {
  const pts: number[][] = [], cap = (q: Spine[number], from: number) => {
    for (let k = 1; k < 8; k++) { const b = from - k * Math.PI / 8; pts.push([q.x + Math.cos(b) * q.w, q.y + Math.sin(b) * q.w]); }
  };
  for (const q of s) pts.push(along(q, 0, q.w));
  cap(s[s.length - 1], s[s.length - 1].th + Math.PI / 2);
  for (let i = s.length - 1; i >= 0; i--) pts.push(along(s[i], 0, -s[i].w));
  cap(s[0], s[0].th - Math.PI / 2);
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; area += x0 * y1 - x1 * y0; }
  if (area < 0) pts.reverse();
  poly(c, ...pts.flat());
}
/** A prawn's tail fan, two lobes spread out past the end of spine `s`, `k` big. */
function tailFan(c: Ctx, s: Spine, k = 1) {
  const e = s[s.length - 1];
  const p = (f: number, g: number) => along(e, f * k, g * k);
  solid(c, RED, () => poly(c, ...p(-5, -5), ...p(15, -19), ...p(18, -8), ...p(25, 0), ...p(18, 8), ...p(15, 19), ...p(-5, 5)));
  line(c, DEEP_RED, 3, () => { const [x0, y0] = p(2, 0), [x1, y1] = p(16, 0); c.moveTo(x0, y0); c.lineTo(x1, y1); });
}

/** 🍤 A tempura prawn: a long, gently curved body in crunchy golden batter, its red tail fanned out of one end. */
function tempura(c: Ctx) {
  const s = spine(-30, 27, -0.15, 62, -1.25, 26, 13, 1.2);
  tailFan(c, s, 1.1);
  blob(c, '#F2B33D', () => {
    spinePath(c, s);
    for (let i = 2; i < s.length - 2; i += 4) {
      const q = s[i], r = 4 + (i % 8 ? 1.5 : 0);
      dot(c, ...(along(q, 0, q.w) as [number, number]), r);
      dot(c, ...(along(q, 2, -q.w) as [number, number]), 9.5 - r);
    }
  });
  flat(c, '#D9922A', () => { for (const [i, g] of [[5, -6], [11, 5], [17, -3], [23, 4], [27, -4], [8, 1]]) { const [x, y] = along(s[i], 0, g); dot(c, x, y, 2.6); } });
  flat(c, 'rgba(255,255,255,.4)', () => { for (const [i, g] of [[6, -10], [14, -8]]) { const [x, y] = along(s[i], 0, g); oval(c, x, y, 6, 3.5, s[i].th); } });
}

/** 🍙 A rice ball, a soft rounded triangle with puffy sides, wrapped at the bottom in its strip of nori. */
function onigiri(c: Ctx) {
  const ball = () => {
    c.moveTo(-9, -36); c.quadraticCurveTo(0, -46, 9, -36);
    c.quadraticCurveTo(30, -14, 39, 14); c.quadraticCurveTo(46, 36, 22, 38);
    c.quadraticCurveTo(0, 41, -22, 38); c.quadraticCurveTo(-46, 36, -39, 14);
    c.quadraticCurveTo(-30, -14, -9, -36); c.closePath();
  };
  solid(c, CREAM, ball);
  inside(c, ball, () => flat(c, '#1E2A26', () => box(c, -18, 6, 36, 40, 4)));
  c.beginPath(); ball(); c.stroke();
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, 7, 22, 2.5, 7, 0.1));
  flat(c, '#E9E2CF', () => { dot(c, -24, 18, 2.5); dot(c, 22, 8, 2.5); dot(c, -6, -18, 2.5); });
}

/** 🦐 A pink prawn curled up, head high on the right, its tail fan tucked in under its chin. */
function prawn(c: Ctx) {
  const P = '#FF8A5C', LIGHT = '#FFD2BC';
  // the back runs from the head (upper right) up over the top, down the left and round under, the tail fan tucked
  // in pointing back up at the head; its legs on the inside of the curl (to its left as it goes)
  const s = spine(10, -20, -2.62, 92, -4.1, 24, 10, 1.25), h = s[0];
  tailFan(c, s, 0.8);
  solid(c, P, () => spinePath(c, s));
  line(c, LIGHT, 3, () => { for (const i of [6, 11, 16, 21, 26]) { const [x0, y0] = along(s[i], 0, s[i].w - 3), [x1, y1] = along(s[i], 0, -s[i].w + 3); c.moveTo(x0, y0); c.lineTo(x1, y1); } });
  // the head: its shell, the spike on its brow, an eye, and two feelers swept back up over its back
  const [hx, hy] = along(h, -10, 0);
  solid(c, P, () => { const [a, b] = along(h, -18, 6), [d, e] = along(h, -29, 4), [f, g] = along(h, -18, 0); c.moveTo(a, b); c.lineTo(d, e); c.lineTo(f, g); c.closePath(); });
  solid(c, P, () => oval(c, hx, hy, 15, 12.5, h.th));
  { const [x, y] = along(h, -15, 4.5); flat(c, INK, () => dot(c, x, y, 3.4)); }
  line(c, INK, 2.5, () => {
    const [x, y] = along(h, -22, -1);
    c.moveTo(x, y); c.bezierCurveTo(x + 14, y - 22, x - 2, y - 40, x - 30, y - 34);
    c.moveTo(x, y); c.bezierCurveTo(x + 18, y - 12, x + 16, y - 30, x + 4, y - 40);
  });
}

/** 🐙 An octopus: a big round head with its eyes low on it, over eight legs curling out, suckers showing. */
function octopus(c: Ctx) {
  const BACK = '#C0475E', SUCK = '#F7B3C0';
  const leg = (x: number, y: number, a: number, len: number, curl: number, w: number) => [spine(x, y, a, len, curl, w, 4, 2.5), spine(-x, y, Math.PI - a, len, -curl, w, 4, 2.5)];
  // the legs behind, darker; then the four in front, joined to the head as one body
  for (const s of leg(-9, -4, 1.72, 44, -2.4, 11)) solid(c, BACK, () => spinePath(c, s));
  const front = [...leg(-17, -8, 2.1, 33, 2.5, 12), ...leg(-6, -4, 1.82, 44, 2.3, 12)];
  blob(c, PINK, () => { c.ellipse(0, -22, 26, 24, 0, 0, TAU); for (const s of front) spinePath(c, s); });
  flat(c, SUCK, () => { for (const s of front) for (const i of [20, 24, 27]) { const q = s[i], [x, y] = along(q, 0, Math.sign(s[32].th - s[0].th) * q.w * 0.3); dot(c, x, y, 2.6); } });
  flat(c, '#F59AAA', () => { dot(c, -12, -34, 4.5); dot(c, 7, -39, 3.5); dot(c, 16, -28, 3.5); });
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -13, -36, 5, 8, 0.6));
  eye(c, -10, -6, 6.5, 1); eye(c, 10, -6, 6.5, -1);
}

/** 🦑 A squid: its long body narrowing up to the fin it ends in, big eyes, and its legs and two long arms. */
function squid(c: Ctx) {
  const S = '#F2A7B8', DEEP = '#E07A92';
  // the two long arms with their club tips, then the eight short legs
  for (const sd of [-1, 1]) {
    const s = spine(sd * 10, 16, Math.PI / 2 - sd * 0.4, 27, -sd * 0.6, 5, 5, 1.5);
    blob(c, S, () => { spinePath(c, s); const e = s[s.length - 1]; oval(c, e.x, e.y, 7.5, 4.5, e.th); });
  }
  for (const [x, a, curl] of [[-9, 1.9, 0.5], [-3, 1.67, 0.35], [3, 1.47, -0.35], [9, 1.24, -0.5]]) solid(c, S, () => spinePath(c, spine(x, 14, a, 26, curl, 8, 4)));
  // the body and its fin as one shape, and the head below
  blob(c, S, () => {
    c.moveTo(0, -47);
    c.quadraticCurveTo(10, -38, 25, -27); c.quadraticCurveTo(27, -20, 20, -18); c.quadraticCurveTo(14, -17, 13, -13);
    c.lineTo(15, 8); c.quadraticCurveTo(0, 14, -15, 8);
    c.lineTo(-13, -13); c.quadraticCurveTo(-14, -17, -20, -18); c.quadraticCurveTo(-27, -20, -25, -27);
    c.quadraticCurveTo(-10, -38, 0, -47); c.closePath();
    c.moveTo(16, 13); c.ellipse(0, 13, 16, 9, 0, 0, TAU);
  });
  flat(c, DEEP, () => { dot(c, -5, -24, 3); dot(c, 6, -14, 3); dot(c, -5, -4, 3); dot(c, 3, -34, 2.5); });
  flat(c, 'rgba(255,255,255,.4)', () => oval(c, -8, -14, 3.5, 9));
  eye(c, -8, 12, 6); eye(c, 8, 12, 6);
}

/** 🦀 A red crab, claws up. */
function crab(c: Ctx) {
  for (const s of [-1, 1]) {
    for (const [y, dy] of [[4, 10], [12, 18], [20, 26]]) bar(c, RED, 5, () => { c.moveTo(s * 20, y); c.lineTo(s * 38, y + 4); c.lineTo(s * 44, dy + 12); });
    bar(c, RED, 7, () => { c.moveTo(s * 16, 0); c.lineTo(s * 28, -20); });
    solid(c, RED, () => { c.moveTo(s * 30, -28); c.arc(s * 30, -28, 12, -Math.PI / 2 + 0.45, -Math.PI / 2 - 0.45 + TAU); c.closePath(); });
    bar(c, INK, 3, () => { c.moveTo(s * 7, -4); c.lineTo(s * 9, -16); });
  }
  solid(c, RED, () => oval(c, 0, 10, 30, 20));
  eye(c, -9, -18, 5); eye(c, 9, -18, 5);
  line(c, INK, 3, () => c.arc(0, 8, 8, 0.2 * Math.PI, 0.8 * Math.PI));
}

/** 🍱 A bento box from above: rice with a plum in it, salmon, greens and egg. */
function bento(c: Ctx) {
  solid(c, NIGHT, () => box(c, -44, -34, 88, 68, 8));
  flat(c, DEEP_RED, () => box(c, -39, -29, 78, 58, 5));
  solid(c, CREAM, () => box(c, -35, -25, 36, 50, 4));
  flat(c, DEEP_RED, () => dot(c, -17, 0, 6));
  solid(c, '#FF8A5C', () => box(c, 5, -25, 30, 22, 4));
  line(c, '#FFD2BC', 3, () => { c.moveTo(14, -22); c.lineTo(10, -6); c.moveTo(26, -22); c.lineTo(22, -6); });
  solid(c, GREEN, () => box(c, 5, 3, 14, 22, 4));
  solid(c, '#F7D038', () => box(c, 21, 3, 14, 22, 4));
}

/**
 * 🐡 Fugu Chips, the cellar's money: a round gold puffer, spikes out all round, one mean eye under a heavy brow, teeth
 * bared. Kept to big shapes, since it mostly sits on a HUD pill at 18 pixels.
 */
function puffer(c: Ctx) {
  const cx = 2, cy = 2, R = 30;
  solid(c, DEEP_GOLD, () => { c.moveTo(-24, 2); c.lineTo(-45, -15); c.quadraticCurveTo(-39, 2, -45, 19); c.closePath(); });
  solid(c, DEEP_GOLD, () => {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU - Math.PI / 2, b = 0.25;
      if (Math.cos(a) < -0.8) continue;
      c.moveTo(cx + Math.cos(a - b) * (R - 4), cy + Math.sin(a - b) * (R - 4));
      c.lineTo(cx + Math.cos(a) * 45, cy + Math.sin(a) * 45);
      c.lineTo(cx + Math.cos(a + b) * (R - 4), cy + Math.sin(a + b) * (R - 4));
    }
  });
  solid(c, GOLD, () => dot(c, cx, cy, R));
  flat(c, '#FFF4D6', () => oval(c, cx + 3, cy + 18, 20, 9));
  flat(c, 'rgba(255,255,255,.45)', () => oval(c, -14, -13, 6, 10, 0.5));
  // one big eye, narrowed under a brow that slants down to the front
  solid(c, '#fff', () => oval(c, 13, -4, 10, 9));
  flat(c, INK, () => dot(c, 16, -2, 5.5));
  solid(c, INK, () => poly(c, -4, -22, 32, -11, 30, -3, -2, -13));
  // teeth bared at the front
  solid(c, CREAM, () => poly(c, 8, 13, 31, 9, 31, 21, 9, 22));
  line(c, INK, 3, () => { c.moveTo(16, 11); c.lineTo(16, 22); c.moveTo(24, 10); c.lineTo(24, 21); });
}

/**
 * Mr. Fugu meaning business, for the tile that buys into his ring (the menu's 🐡 is the dish): puffed up, his spines
 * out, under his fedora, behind shades set in a glare, a scar down over one eye, and a scowl with a gold tooth and his
 * toothpick in the corner of it.
 */
function mrFugu(c: Ctx) {
  const FISH = '#E3B448', HAT = '#2E2B33', SHADES = '#15181D', SCAR = '#B5364A', cy = 10;
  // spines all round, long and sharp, the ones on top hidden under the hat
  solid(c, '#F6E7B4', () => {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + 0.17, b = 0.13;
      if (Math.sin(a) < -0.55) continue;
      c.moveTo(Math.cos(a - b) * 27, cy + Math.sin(a - b) * 27);
      c.lineTo(Math.cos(a) * 41, cy + Math.sin(a) * 41);
      c.lineTo(Math.cos(a + b) * 27, cy + Math.sin(a + b) * 27);
    }
  });
  solid(c, FISH, () => dot(c, 0, cy, 30));
  flat(c, '#FFF4D6', () => oval(c, 0, cy + 21, 19, 8));
  flat(c, '#B07A3A', () => { dot(c, -21, cy + 8, 3); dot(c, -15, cy + 15, 2.5); dot(c, 22, cy + 13, 2.5); });
  // the scar, from the brow to the cheek, stitched; the shades go over the middle of it
  line(c, SCAR, 4, () => { c.moveTo(9, -9); c.lineTo(23, 22); });
  line(c, SCAR, 2.5, () => { for (const k of [0.25, 0.55, 0.85]) { const x = 9 + 14 * k, y = -9 + 31 * k; c.moveTo(x - 4, y + 2); c.lineTo(x + 4, y - 2); } });
  // the shades, their tops slanting down to the middle: a glare
  for (const s of [-1, 1]) {
    solid(c, SHADES, () => poly(c, s * 28, -3, s * 4, 4, s * 5, 13, s * 25, 11));
    line(c, 'rgba(255,255,255,.55)', 2.5, () => { c.moveTo(s * 22, 1); c.lineTo(s * 15, 3); });
  }
  bar(c, SHADES, 3, () => { c.moveTo(-4, 5); c.lineTo(4, 5); });
  // the scowl, a gold tooth under it, and the toothpick
  solid(c, '#F2C14E', () => box(c, -9, 30, 6, 6, 1.5));
  line(c, INK, 5, () => { c.moveTo(-14, 33); c.quadraticCurveTo(0, 24, 14, 32); });
  bar(c, '#E3C26B', 2.5, () => { c.moveTo(12, 32); c.lineTo(31, 24); });
  // the fedora, tipped a little: its brim, its pinched crown, and its red band
  c.save(); c.translate(0, -16); c.rotate(-0.12);
  solid(c, HAT, () => oval(c, 0, 0, 43, 7));
  const crown = () => { c.moveTo(-24, 0); c.lineTo(-20, -27); c.quadraticCurveTo(-10, -34, 0, -27); c.quadraticCurveTo(10, -34, 20, -27); c.lineTo(24, 0); c.closePath(); };
  solid(c, HAT, crown);
  inside(c, crown, () => flat(c, '#A8322D', () => c.rect(-30, -9, 60, 7)));
  c.beginPath(); crown(); c.stroke();
  c.restore();
}

/** 🍥 A slice of naruto: a scalloped white fishcake with its pink swirl. */
function naruto(c: Ctx) {
  solid(c, CREAM, () => {
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU, r = 40 + 3 * Math.cos(a * 12);
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(r, 0);
    }
    c.closePath();
  });
  line(c, PINK, 6, () => {
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * 4 * Math.PI, r = 2 + a * 2.3;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(2, 0);
    }
  });
}

/** 🍢 Oden on a skewer: konjac, a fishcake ball and tofu. */
function oden(c: Ctx) {
  c.save(); c.rotate(0.35);
  bar(c, '#C3875D', 4, () => { c.moveTo(0, -48); c.lineTo(0, 48); });
  solid(c, '#7D8790', () => poly(c, 0, -44, -17, -18, 17, -18));
  flat(c, '#5D6770', () => { dot(c, -4, -26, 1.8); dot(c, 5, -30, 1.8); dot(c, 3, -22, 1.8); });
  solid(c, '#F2E3C0', () => dot(c, 0, -1, 14));
  solid(c, '#E3B05A', () => box(c, -14, 16, 28, 24, 4));
  c.restore();
}

/** 🍵 Green tea in a yunomi: a cream cup with no handle, gently tapered, a green band round it, the tea at the brim and steam. */
function tea(c: Ctx) {
  line(c, STEEL, 4, () => {
    c.moveTo(-8, -24); c.quadraticCurveTo(-15, -31, -8, -38); c.quadraticCurveTo(-1, -44, -7, -48);
    c.moveTo(9, -24); c.quadraticCurveTo(2, -31, 9, -38);
  });
  solid(c, '#DCE4EA', () => box(c, -15, 34, 30, 8, 3));
  const cup = () => {
    c.moveTo(-29, -16); c.lineTo(29, -16); c.bezierCurveTo(29, 8, 26, 28, 18, 36);
    c.quadraticCurveTo(14, 39, 8, 39); c.lineTo(-8, 39); c.quadraticCurveTo(-14, 39, -18, 36);
    c.bezierCurveTo(-26, 28, -29, 8, -29, -16); c.closePath();
  };
  solid(c, CREAM, cup);
  // one glaze band, curving round the cup
  inside(c, cup, () => flat(c, DEEP_GREEN, () => {
    c.moveTo(-40, 10); c.quadraticCurveTo(0, 16, 40, 10); c.lineTo(40, 19); c.quadraticCurveTo(0, 25, -40, 19); c.closePath();
  }));
  c.beginPath(); cup(); c.stroke();
  solid(c, CREAM, () => oval(c, 0, -16, 29, 8));
  flat(c, '#9BD15A', () => oval(c, 0, -15, 23, 5));
}

/** 🍶 Sake: a tokkuri flask (narrow neck, round body) with a blue band, and its little ochoko cup beside it. */
function sake(c: Ctx) {
  const x = -12;
  const flask = () => {
    c.moveTo(x - 9, -44); c.lineTo(x + 9, -44);
    c.quadraticCurveTo(x + 5, -38, x + 5, -28);
    c.bezierCurveTo(x + 5, -14, x + 28, -8, x + 28, 14);
    c.bezierCurveTo(x + 28, 32, x + 18, 40, x + 14, 42);
    c.lineTo(x - 14, 42);
    c.bezierCurveTo(x - 18, 40, x - 28, 32, x - 28, 14);
    c.bezierCurveTo(x - 28, -8, x - 5, -14, x - 5, -28);
    c.quadraticCurveTo(x - 5, -38, x - 9, -44); c.closePath();
  };
  solid(c, CREAM, flask);
  inside(c, flask, () => flat(c, BLUE, () => c.rect(x - 40, 6, 80, 11)));
  c.beginPath(); flask(); c.stroke();
  flat(c, INK, () => oval(c, x, -42, 5, 1.8));
  flat(c, '#E3EAF0', () => oval(c, x - 16, 26, 4, 8, 0.3));
  const cup = () => { c.moveTo(18, 22); c.lineTo(44, 22); c.quadraticCurveTo(43, 38, 36, 42); c.lineTo(26, 42); c.quadraticCurveTo(19, 38, 18, 22); c.closePath(); };
  solid(c, CREAM, cup);
  inside(c, cup, () => flat(c, BLUE, () => c.rect(10, 31, 40, 5)));
  c.beginPath(); cup(); c.stroke();
  solid(c, '#E3EAF0', () => oval(c, 31, 22, 13, 3.5));
}

/** 🍲 Chanko: an iron pot of orange stew, with a bit of fish, a slice of carrot and greens, and steam over it. */
function chanko(c: Ctx) {
  line(c, STEEL, 4, () => {
    c.moveTo(-12, -24); c.quadraticCurveTo(-20, -32, -12, -40); c.quadraticCurveTo(-4, -46, -10, -52);
    c.moveTo(10, -24); c.quadraticCurveTo(2, -32, 10, -40);
  });
  bar(c, '#3A3A40', 6, () => { c.moveTo(-44, -6); c.lineTo(-34, -6); c.moveTo(34, -6); c.lineTo(44, -6); });
  solid(c, '#4A4A52', () => { c.moveTo(-38, -10); c.lineTo(38, -10); c.lineTo(32, 26); c.quadraticCurveTo(0, 40, -32, 26); c.closePath(); });
  flat(c, '#6A6A74', () => c.rect(-36, 4, 72, 5));
  solid(c, '#E8873A', () => oval(c, 0, -10, 38, 10));
  flat(c, CREAM, () => oval(c, -14, -11, 9, 4));
  flat(c, '#F2A65A', () => dot(c, 10, -9, 5));
  flat(c, GREEN, () => oval(c, 2, -14, 7, 3, 0.4));
}

/** 🍄 A mushroom: a round brown cap with pale spots on a thick cream stalk. */
function mushroom(c: Ctx) {
  solid(c, CREAM, () => box(c, -12, -6, 24, 40, 8));
  solid(c, '#9C6A3E', () => { c.moveTo(-40, 0); c.quadraticCurveTo(-40, -42, 0, -42); c.quadraticCurveTo(40, -42, 40, 0); c.closePath(); });
  flat(c, '#E8D6B8', () => { dot(c, -16, -22, 6); dot(c, 12, -28, 5); dot(c, 22, -12, 4); });
}

/** Every drawing, by the emoji it stands in for. */
export const DRAWINGS: Record<string, Drawing> = {
  '🎣': rod, '🐟': fish, '🍚': rice, '🚗': car, '🎰': roulette, '🛴': scooter, '💔': brokenHeart,
  '📈': upgrade, '🍳': pan, '🌿': sprig,
  '🎒': backpack, '🎯': target, '🏃': runner, '🥾': boot, '🥅': net, '🏯': torii,
  '🌾': sheaf, '🪑': stool, '🔪': knife, '🧑‍🌾': farmer, '🧺': basket, '🌱': seedling, '⛱️': parasol, '⛱': parasol,
  '🥡': takeout, '🏮': lantern, '🎁': present, '🔒': lock, '🗳️': ballot, '🗳': ballot,
  '😐': meh, '😠': angry, '😭': sob,
  '🍤': tempura, '🍙': onigiri, '🦐': prawn, '🐙': octopus, '🦑': squid, '🦀': crab, '🍱': bento, '🐡': puffer,
  '🍥': naruto, '🍢': oden, '🍵': tea, '🍶': sake, '🍲': chanko, '🍄': mushroom,
  // (a drawing of its own, with no emoji: the buy-in tile's, unlocks.ts' `art`)
  'mrFugu': mrFugu,
  // (the rest, drawn by theme: src/icons/*.ts)
  ...HUD, ...NATURE, ...FOOD, ...CASINO, ...PEOPLE, ...WORKS, ...ARCADE, ...BOSS,
};
/** The emoji that have a drawing (the contact sheet goes through them all). */
export const DRAWN = Object.keys(DRAWINGS);

/** A spare canvas, for drawing an icon see-through as a whole rather than shape by shape. */
let spare: HTMLCanvasElement | null = null;

/**
 * Draws `icon`'s picture centred on (x, y), `size` across (the size the emoji's font was), in the context's current
 * transform and opacity. An emoji with no picture is written as it was.
 */
export function drawIcon(c: Ctx, icon: string, x: number, y: number, size: number) {
  const draw = DRAWINGS[icon] ?? DRAWINGS[icon.replace(/\uFE0F/g, '')];
  if (!draw) {
    c.font = `${size}px "Floe Emoji",serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, x, y);
    return;
  }
  // see-through, the overlapping shapes would show through each other: draw it whole on the spare, then fade that
  if (c.globalAlpha < 1) {
    const px = Math.ceil(size * 1.1);
    spare ??= document.createElement('canvas');
    spare.width = spare.height = px;
    const s = spare.getContext('2d');
    if (s) { paint(s, draw, px / 2, px / 2, size); c.drawImage(spare, x - px / 2, y - px / 2); }
    return;
  }
  paint(c, draw, x, y, size);
}

/** Draws a drawing centred on (x, y), `size` across. */
function paint(c: Ctx, draw: Drawing, x: number, y: number, size: number) {
  c.save();
  c.translate(x, y); c.scale(size / 100, size / 100);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = OUT; c.strokeStyle = INK;
  draw(c);
  c.restore();
}
