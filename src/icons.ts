// Little vector drawings for the icons painted into canvas textures (the markings on the deck, the menu tags, the
// price board, the mood faces), in place of emoji: emoji look different on every phone, and some not at all. They're
// drawn the way the order bubbles' fish, box, rice and sushi are (bubble.ts): a few bold, flat shapes in the game's
// own colours, here with a dark outline so they read at a glance on a white badge or a wooden tag.
// Each is keyed by the emoji it replaces, so the tiles and squares keep their emoji for the page (the tip, the arrows
// at the edge of the screen) and the canvas draws the picture instead.
type Ctx = CanvasRenderingContext2D;
type Drawing = (c: Ctx) => void;

/** The outline's colour and width (in the drawings' units: each is drawn in a box from -50 to 50 each way). */
const INK = '#1B2733', OUT = 4;
const TAU = Math.PI * 2;

const RED = '#E5484D', DEEP_RED = '#C0392B', GOLD = '#F2C14E', DEEP_GOLD = '#C99A22', CREAM = '#FFFDF5';
const GREEN = '#49C25B', DEEP_GREEN = '#3FA34D', WOOD = '#8A5A3B', DARK_WOOD = '#6B4A35', STEEL = '#B9C6CF';
const NIGHT = '#22262B', BLUE = '#355C9E', SKY = '#5FA8C8', SKIN = '#F2C9A0', PINK = '#E8607A';

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

/** One of the bubbles' icons, moved from its box in the bubble ([x, y, w, h]) into the middle of ours, `k` wide. */
const boxed = (draw: Drawing, [x, y, w, h]: [number, number, number, number], k = 92): Drawing => c => {
  const s = k / w;
  c.scale(s, s); c.translate(-(x + w / 2), -(y + h / 2));
  draw(c);
};

// ---------- drawing helpers ----------

/** Adds a circle to the path, as its own shape. */
function dot(c: Ctx, x: number, y: number, r: number) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
/** Adds an ellipse to the path, as its own shape. */
function oval(c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx); c.ellipse(x, y, rx, ry, rot, 0, TAU);
}
/** Adds a rounded rectangle to the path, as its own shape (unlike render.ts' rr, which starts a new path). */
function box(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
/** Adds a closed polygon to the path. */
function poly(c: Ctx, ...pts: number[]) {
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}

/** Fills a shape in `color`, outlined. */
function solid(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill(); c.stroke();
}
/** Fills a shape without its outline: markings on another shape. */
function flat(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path(); c.fillStyle = color; c.fill();
}
/**
 * Fills several overlapping shapes as one, with a single outline round the lot (a bumpy batter, a bottle and its
 * neck): the outline is stroked twice as wide underneath, and the fill covers its inner half.
 */
function blob(c: Ctx, color: string, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = OUT * 2; c.stroke(); c.lineWidth = OUT;
  c.fillStyle = color; c.fill();
}
/** A thick line (a rod, a leg, a stalk) `w` wide in `color`, outlined. */
function bar(c: Ctx, color: string, w: number, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = w + OUT * 2; c.stroke();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.lineWidth = OUT; c.strokeStyle = INK;
}
/** A plain line, no outline. */
function line(c: Ctx, color: string, w: number, path: () => void) {
  c.beginPath(); path();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
  c.lineWidth = OUT; c.strokeStyle = INK;
}
/** Draws `f` clipped to `path`. */
function inside(c: Ctx, path: () => void, f: () => void) {
  c.save(); c.beginPath(); path(); c.clip(); f(); c.restore();
}
/** A leaf `len` long and `w` wide, from (x, y) pointing at `a`. */
function leaf(c: Ctx, color: string, x: number, y: number, a: number, len: number, w: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  solid(c, color, () => { c.moveTo(0, 0); c.quadraticCurveTo(len / 2, -w, len, 0); c.quadraticCurveTo(len / 2, w, 0, 0); });
  line(c, 'rgba(255,255,255,.35)', 2.5, () => { c.moveTo(len * 0.15, 0); c.lineTo(len * 0.75, 0); });
  c.restore();
}
/** An upright cylinder: its side, then its top, `h` tall from `top` down. */
function drum(c: Ctx, x: number, top: number, rx: number, ry: number, h: number, side: string, lid: string) {
  solid(c, side, () => {
    c.moveTo(x - rx, top); c.lineTo(x - rx, top + h);
    c.ellipse(x, top + h, rx, ry, 0, Math.PI, 0, true);
    c.lineTo(x + rx, top);
  });
  solid(c, lid, () => oval(c, x, top, rx, ry));
}
/** A heart, its point at the bottom. */
function heartPath(c: Ctx) {
  c.moveTo(0, 38);
  c.bezierCurveTo(-30, 18, -46, 2, -46, -16);
  c.bezierCurveTo(-46, -34, -30, -42, -21, -42);
  c.bezierCurveTo(-9, -42, -2, -34, 0, -26);
  c.bezierCurveTo(2, -34, 9, -42, 21, -42);
  c.bezierCurveTo(30, -42, 46, -34, 46, -16);
  c.bezierCurveTo(46, 2, 30, 18, 0, 38);
  c.closePath();
}
/** An eye: white with a dark pupil looking `dx` sideways. */
function eye(c: Ctx, x: number, y: number, r: number, dx = 0) {
  solid(c, '#fff', () => dot(c, x, y, r));
  flat(c, INK, () => dot(c, x + dx, y, r * 0.5));
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
/** 🍚 A sack of rice as it's carried (the bubbles' sack, bigger): cream, tied at the neck, 米 on a red band. */
function rice(c: Ctx) {
  solid(c, '#E6DBC0', () => poly(c, -14, -26, -22, -44, 0, -36, 22, -44, 14, -26));
  const body = () => box(c, -32, -28, 64, 68, 16);
  solid(c, '#E6DBC0', body);
  inside(c, body, () => flat(c, DEEP_RED, () => c.rect(-40, -6, 80, 26)));
  c.beginPath(); body(); c.stroke();
  solid(c, DEEP_RED, () => box(c, -13, -32, 26, 8, 3));
  c.fillStyle = CREAM; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('米', 0, 8);
}
/** 🥡 The takeout box. */
const takeout = boxed(boxIcon, [18, 40, 52, 34], 86);

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

// ---------- chef's specials: the dishes on the menu tags ----------

/** 🍤 A tempura prawn: bumpy golden batter and a red tail. */
function tempura(c: Ctx) {
  c.save(); c.rotate(-0.6);
  solid(c, RED, () => { c.moveTo(22, 0); c.lineTo(42, -13); c.quadraticCurveTo(36, 0, 42, 13); c.closePath(); });
  blob(c, '#F2B33D', () => { for (const [x, y, r] of [[-32, 0, 11], [-19, -1, 13], [-5, 0, 14], [9, 0, 13], [21, 1, 10]]) dot(c, x, y, r); });
  flat(c, '#D9922A', () => { dot(c, -22, -4, 2.5); dot(c, -6, 5, 2.5); dot(c, 8, -5, 2.5); dot(c, -30, 4, 2); dot(c, 16, 4, 2); });
  c.restore();
}

/** 🍙 A rice ball with its strip of nori. */
function onigiri(c: Ctx) {
  c.beginPath(); poly(c, 0, -32, 34, 28, -34, 28);
  c.lineWidth = 18 + OUT * 2; c.stroke();
  c.lineWidth = 18; c.strokeStyle = CREAM; c.stroke();
  c.fillStyle = CREAM; c.fill();
  c.lineWidth = OUT; c.strokeStyle = INK;
  solid(c, '#1E2A26', () => box(c, -14, 10, 28, 27, 3));
}

/** 🦐 A pink prawn curled into a C. */
function prawn(c: Ctx) {
  const P = '#FF8A5C';
  solid(c, RED, () => poly(c, -21, 4, -42, -8, -38, 16));
  bar(c, P, 20, () => c.arc(0, 0, 22, -0.3 * Math.PI, 0.95 * Math.PI));
  line(c, '#FFD2BC', 3, () => {
    for (const a of [0.05, 0.25, 0.45, 0.65]) {
      const x = Math.cos(a * Math.PI), y = Math.sin(a * Math.PI);
      c.moveTo(x * 13, y * 13); c.lineTo(x * 31, y * 31);
    }
  });
  solid(c, P, () => oval(c, 14, -20, 14, 11, 0.4));
  flat(c, INK, () => dot(c, 19, -24, 2.8));
  line(c, INK, 2, () => { c.moveTo(24, -26); c.quadraticCurveTo(40, -42, 46, -24); c.moveTo(26, -22); c.quadraticCurveTo(44, -30, 44, -8); });
}

/** 🐙 An octopus, its legs curled. */
function octopus(c: Ctx) {
  for (const [x0, cx, x1] of [[-20, -36, -30], [-8, -16, -18], [8, 16, 18], [20, 36, 30]]) {
    bar(c, PINK, 10, () => { c.moveTo(x0, 6); c.quadraticCurveTo(cx, 28, x1, 40); c.quadraticCurveTo(x1 + Math.sign(x1) * 6, 44, x1 + Math.sign(x1) * 8, 38); });
  }
  solid(c, PINK, () => oval(c, 0, -12, 30, 28));
  flat(c, '#F59AAA', () => { dot(c, -12, -27, 4); dot(c, 8, -31, 3); dot(c, 17, -20, 3); });
  eye(c, -10, -6, 6.5); eye(c, 10, -6, 6.5);
  solid(c, '#C0475E', () => oval(c, 0, 8, 5, 4));
}

/** 🦑 A squid: its pointed fin, its long body, and its legs. */
function squid(c: Ctx) {
  const S = '#F2A7B8';
  for (const x of [-12, -4, 4, 12]) bar(c, S, 6, () => { c.moveTo(x, 8); c.quadraticCurveTo(x * 1.6 + 6, 26, x * 1.3, 44); });
  solid(c, S, () => poly(c, 0, -48, -24, -22, 24, -22));
  solid(c, S, () => box(c, -15, -36, 30, 50, 14));
  flat(c, '#E07A92', () => { dot(c, -6, -24, 3); dot(c, 5, -16, 2.5); dot(c, -4, -8, 2.5); });
  eye(c, -8, 4, 5.5); eye(c, 8, 4, 5.5);
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

/** 🐡 A puffer fish, puffed up and spiky. */
function puffer(c: Ctx) {
  solid(c, '#E3B448', () => poly(c, -30, 0, -46, -14, -46, 14));
  solid(c, '#E3B448', () => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, b = 0.16;
      c.moveTo(Math.cos(a - b) * 28, Math.sin(a - b) * 28);
      c.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
      c.lineTo(Math.cos(a + b) * 28, Math.sin(a + b) * 28);
    }
  });
  solid(c, '#F7D038', () => dot(c, 0, 0, 31));
  flat(c, '#FFF4D6', () => oval(c, 4, 14, 22, 11));
  flat(c, '#B07A3A', () => { dot(c, -14, -14, 3.5); dot(c, -2, -22, 3); dot(c, -18, 0, 3); });
  eye(c, 14, -8, 7.5, 2);
  line(c, INK, 3, () => dot(c, 27, 6, 3));
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

/** 🍵 A cup of green tea. */
function tea(c: Ctx) {
  line(c, STEEL, 4, () => {
    c.moveTo(-8, -26); c.quadraticCurveTo(-16, -34, -8, -42); c.quadraticCurveTo(0, -48, -6, -54);
    c.moveTo(10, -26); c.quadraticCurveTo(2, -34, 10, -42);
  });
  solid(c, '#4E8FB5', () => { c.moveTo(-32, -16); c.lineTo(32, -16); c.lineTo(25, 34); c.quadraticCurveTo(0, 42, -25, 34); c.closePath(); });
  flat(c, '#7DB5D6', () => c.rect(-30, 2, 60, 8));
  solid(c, '#7DBB4A', () => oval(c, 0, -16, 32, 8));
}

/** 🍶 Sake: a white flask with a blue band, and its little cup. */
function sake(c: Ctx) {
  const flask = () => { oval(c, -10, 14, 24, 27); box(c, -19, -44, 18, 40, 6); };
  blob(c, CREAM, flask);
  inside(c, flask, () => flat(c, BLUE, () => c.rect(-40, -2, 60, 9)));
  flat(c, '#E3EAF0', () => oval(c, -10, -42, 7, 2.5));
  solid(c, CREAM, () => poly(c, 14, 20, 40, 20, 36, 40, 18, 40));
  flat(c, BLUE, () => c.rect(16, 30, 22, 4));
  solid(c, '#E3EAF0', () => oval(c, 27, 20, 13, 3.5));
}

/** Every drawing, by the emoji it stands in for. */
const DRAWINGS: Record<string, Drawing> = {
  '🎣': rod, '🐟': fish, '🍚': rice, '🚗': car, '🎰': roulette, '🛴': scooter, '💔': brokenHeart,
  '📈': upgrade, '🌿': sprig,
  '🎒': backpack, '🎯': target, '🏃': runner, '🥾': boot, '🥅': net, '🏯': torii,
  '🌾': sheaf, '🪑': stool, '🔪': knife, '🧑‍🌾': farmer, '🧺': basket, '🌱': seedling, '⛱️': parasol, '⛱': parasol,
  '🥡': takeout, '🏮': lantern, '🎁': present, '🔒': lock,
  '😐': meh, '😠': angry,
  '🍤': tempura, '🍙': onigiri, '🦐': prawn, '🐙': octopus, '🦑': squid, '🦀': crab, '🍱': bento, '🐡': puffer,
  '🍥': naruto, '🍢': oden, '🍵': tea, '🍶': sake,
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
  const draw = DRAWINGS[icon];
  if (!draw) {
    c.font = size + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, x, y);
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
