// Icons for the arcade, ads and the beach, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, BLUE, SKY, CREAM, DEEP_RED, GOLD, INK, NIGHT, PINK, RED, STEEL, TAU,
  bar, blob, box, dot, flat, heartPath, inside, line, oval, poly, solid,
} from './kit';

/** The arcade's Acid green (hazard.ts' sour), light and deep. */
const LIME = '#A3D94A', DEEP_LIME = '#6FA83A';
/** The reef fish's yellow and orange. */
const YELLOW = '#F7D038', ORANGE = '#F08A24';
const SHINE = 'rgba(255,255,255,.4)';
/** A matkot paddle's light wood (the beach's paddles, C.endGrain). */
const BLADE = '#D9A877', GRAIN = '#B9875A';

/** ☠ Poison: a friendly cartoon skull, big round eyes with a glint, over two crossed bones. */
function skull(c: Ctx) {
  for (const s of [-1, 1]) {
    c.save(); c.translate(0, 20); c.rotate(s * 0.42);
    blob(c, CREAM, () => { box(c, -34, -5, 68, 10, 5); dot(c, -36, -5, 7); dot(c, -36, 5, 7); dot(c, 36, -5, 7); dot(c, 36, 5, 7); });
    c.restore();
  }
  blob(c, CREAM, () => { dot(c, 0, -14, 29); box(c, -17, 0, 34, 26, 8); });
  flat(c, SHINE, () => oval(c, -15, -30, 7, 4.5, -0.6));
  flat(c, NIGHT, () => { oval(c, -11, -12, 9, 10); oval(c, 11, -12, 9, 10); poly(c, 0, 1, -4, 8, 4, 8); });
  flat(c, '#fff', () => { dot(c, -13, -15, 3); dot(c, 9, -15, 3); });
  line(c, INK, 3, () => { for (const x of [-7, 0, 7]) { c.moveTo(x, 15); c.lineTo(x, 23); } });
}

/** ☣ BIOHAZARD, the strip's top danger level: the black biohazard sign on a gold warning disc. */
function biohazard(c: Ctx) {
  const disc = () => dot(c, 0, 0, 45);
  const A = 1.3, cy = 4;
  const at = (k: number, d: number) => [Math.cos(k) * d, cy + Math.sin(k) * d];
  const arms = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
  solid(c, GOLD, disc);
  inside(c, disc, () => {
    flat(c, NIGHT, () => { for (const k of arms) { const [x, y] = at(k, 11 * A); dot(c, x, y, 15 * A); } });
    line(c, NIGHT, 3 * A, () => dot(c, 0, cy, 12.5 * A));
    flat(c, GOLD, () => { for (const k of arms) { const [x, y] = at(k, 15.5 * A); dot(c, x, y, 10.5 * A); } });
    flat(c, GOLD, () => dot(c, 0, cy, 3.5 * A));
    line(c, GOLD, 1.6 * A, () => { for (const k of arms) { const [x, y] = at(k, 9 * A); c.moveTo(0, cy); c.lineTo(x, y); } });
  });
  c.beginPath(); disc(); c.stroke();
}

/** 🧪 Acid: a glass test tube at a slant, half full of bubbling green acid, bubbles rising out of it. */
function testTube(c: Ctx) {
  c.save(); c.translate(-6, 8); c.rotate(0.55);
  const tube = () => { c.moveTo(-17, -30); c.lineTo(-17, 22); c.arc(0, 22, 17, Math.PI, 0, true); c.lineTo(17, -30); c.closePath(); };
  solid(c, '#E3EEF3', tube);
  inside(c, tube, () => {
    flat(c, LIME, () => c.rect(-20, -6, 40, 50));
    flat(c, DEEP_LIME, () => c.rect(-20, 18, 40, 30));
    flat(c, 'rgba(255,255,255,.6)', () => { dot(c, 5, 6, 4); dot(c, -5, 24, 3.5); });
  });
  line(c, 'rgba(255,255,255,.75)', 4.5, () => { c.moveTo(-9, -24); c.lineTo(-9, -12); });
  c.beginPath(); tube(); c.stroke();
  solid(c, '#E3EEF3', () => box(c, -22, -40, 44, 11, 5));
  c.restore();
  solid(c, LIME, () => dot(c, 26, -30, 7.5));
  solid(c, LIME, () => dot(c, 38, -42, 5));
}

/** 🧲 Lure: a red horseshoe magnet, its steel poles pulling down to the right. */
function magnet(c: Ctx) {
  c.save(); c.translate(-2, -2); c.rotate(-0.55);
  c.lineCap = 'butt';
  bar(c, RED, 22, () => { c.moveTo(-24, 22); c.lineTo(-24, -4); c.arc(0, -4, 24, Math.PI, 0); c.lineTo(24, 22); });
  c.lineCap = 'round';
  line(c, 'rgba(255,255,255,.4)', 4, () => c.arc(0, -4, 28, Math.PI * 1.1, Math.PI * 1.45));
  solid(c, STEEL, () => { box(c, -35, 20, 22, 16, 3); box(c, 13, 20, 22, 16, 3); });
  c.restore();
}

/** 🎵 Music from an ad or a radio: two sky-blue quavers joined by their beam. */
function notes(c: Ctx) {
  const shape = () => {
    oval(c, -24, 28, 14, 10.5, -0.35);
    oval(c, 22, 18, 14, 10.5, -0.35);
    c.rect(-17, -30, 7, 56);
    c.rect(29, -40, 7, 56);
    poly(c, -17, -32, 36, -44, 36, -28, -17, -16);
  };
  blob(c, SKY, shape);
  flat(c, SHINE, () => { oval(c, -28, 24, 5, 3, -0.35); oval(c, 18, 14, 5, 3, -0.35); });
}

/** A four-pointed sparkle at (x, y), `r` out. */
function sparkle(c: Ctx, x: number, y: number, r: number) {
  const k = r * 0.28;
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + k, y - k, x + r, y); c.quadraticCurveTo(x + k, y + k, x, y + r);
  c.quadraticCurveTo(x - k, y + k, x - r, y); c.quadraticCurveTo(x - k, y - k, x, y - r);
  c.closePath();
}

/** 💗 A like on an ad: a pink heart in a soft pink glow, a sparkle at its shoulder. */
function glowHeart(c: Ctx) {
  c.save(); c.translate(-2, 4);
  solid(c, '#F9B8C6', () => heartPath(c));
  c.save(); c.translate(0, 1); c.scale(0.66, 0.66);
  solid(c, PINK, () => heartPath(c));
  flat(c, SHINE, () => oval(c, -26, -22, 9, 6, -0.7));
  c.restore();
  c.restore();
  solid(c, CREAM, () => sparkle(c, 33, -32, 14));
}

/** 🐠 A tropical fish: a deep yellow body with blue stripes, an orange tail and fin. */
function reefFish(c: Ctx) {
  solid(c, ORANGE, () => poly(c, -20, 0, -46, -24, -38, 0, -46, 24));
  solid(c, ORANGE, () => { c.moveTo(-16, -20); c.quadraticCurveTo(-2, -46, 22, -22); c.closePath(); });
  solid(c, ORANGE, () => { c.moveTo(-10, 22); c.quadraticCurveTo(0, 40, 14, 24); c.closePath(); });
  const body = () => { c.moveTo(44, 0); c.ellipse(6, 0, 38, 28, 0, 0, TAU); };
  solid(c, YELLOW, body);
  inside(c, body, () => flat(c, BLUE, () => { c.rect(-12, -30, 10, 60); c.rect(13, -30, 8, 60); }));
  c.beginPath(); body(); c.stroke();
  solid(c, '#fff', () => dot(c, 29, -6, 6.5));
  flat(c, INK, () => dot(c, 31, -6, 3.2));
}

/**
 * 🏓 Matkot: two flat plywood beach paddles, face-on, and the ball: a red-painted one behind and a plain wooden one in
 * front, each a flat disc with a thin rim line on a short, straight, flat handle.
 */
function matkot(c: Ctx) {
  const paddle = (x: number, y: number, a: number, r: number, face: string, rim: string, grain: boolean) => {
    c.save(); c.translate(x, y); c.rotate(a);
    solid(c, BLADE, () => box(c, -7, r - 4, 14, 22, 2));
    const disc = () => dot(c, 0, 0, r);
    solid(c, face, disc);
    if (grain) inside(c, disc, () => line(c, rim, 2.5, () => { for (const gx of [-12, -2, 9, 18]) { c.moveTo(gx, -r); c.lineTo(gx, r); } }));
    line(c, rim, 3, () => dot(c, 0, 0, r - 5));
    c.beginPath(); disc(); c.stroke();
    c.restore();
  };
  paddle(-17, -13, 0.35, 23, RED, DEEP_RED, false);
  paddle(12, 2, -0.35, 25, BLADE, GRAIN, true);
  solid(c, GOLD, () => dot(c, 35, -35, 8));
}

export const ARCADE: Record<string, Drawing> = {
  '☠': skull, '☣': biohazard, '🧪': testTube, '🧲': magnet,
  '🎵': notes, '💗': glowHeart, '🐠': reefFish, '🏓': matkot,
};
