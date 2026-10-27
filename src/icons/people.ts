// Icons for people and faces, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, BLUE, CREAM, GOLD, INK, NIGHT, PINK, RED, SKIN, SKY, STEEL, TAU,
  bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

/** The faces' yellow (😐 😭 in icons.ts), their tears' blue, and the cheeks' blush. */
const FACE = '#F7D038', TEAR = '#6EC3F0', BLUSH = 'rgba(229,72,77,.35)', HAIR = '#3B2A20';
/** A zombie's sickly green, light and deep. */
const ZOMBIE = '#9BCB6A', DEEP_ZOMBIE = '#6E9E48';
/** A shine on the upper left. */
const SHINE = 'rgba(255,255,255,.4)';

// ---------- helpers ----------

/** A chef's toque: its band on the brow at (x, y), `w` wide, and the puffed top above it. */
function toque(c: Ctx, x: number, y: number, w: number) {
  blob(c, CREAM, () => {
    dot(c, x - w * 0.28, y - w * 0.4, w * 0.3); dot(c, x + w * 0.28, y - w * 0.4, w * 0.3); dot(c, x, y - w * 0.52, w * 0.33);
    c.rect(x - w * 0.42, y - w * 0.42, w * 0.84, w * 0.36);
  });
  solid(c, CREAM, () => box(c, x - w / 2, y - w * 0.16, w, w * 0.26, w * 0.08));
}

/** A chef's white jacket: a hump from shoulders at `y` down to the bottom of the box, `w` wide, with two buttons. */
function jacket(c: Ctx, x: number, y: number, w: number, bottom = 46) {
  solid(c, CREAM, () => {
    c.moveTo(x - w / 2, bottom); c.quadraticCurveTo(x - w / 2 + 2, y, x, y); c.quadraticCurveTo(x + w / 2 - 2, y, x + w / 2, bottom);
    c.closePath();
  });
  flat(c, STEEL, () => { dot(c, x + w * 0.1, y + (bottom - y) * 0.45, w * 0.045); dot(c, x + w * 0.1, y + (bottom - y) * 0.78, w * 0.045); });
}

/** A round yellow face emoji, the size of 😐's. */
const face = (c: Ctx) => solid(c, FACE, () => dot(c, 0, 0, 44));

// ---------- the drawings ----------

/** 💪 Fans fed this fight: the wrestler's arm, flexed, bicep bulging, fist up. */
function flex(c: Ctx) {
  c.translate(3, 0); c.scale(0.9, 0.9);
  blob(c, SKIN, () => {
    box(c, -46, 14, 72, 30, 15);
    oval(c, -12, 12, 25, 21, -0.15);
    c.save(); c.translate(14, 28); c.rotate(-0.1); box(c, -12, -50, 25, 56, 12); c.restore();
    oval(c, 8, -30, 17, 15, -0.3);
  });
  line(c, INK, 3, () => { c.moveTo(-8, -34); c.quadraticCurveTo(-2, -30, 4, -34); c.moveTo(-7, -25); c.quadraticCurveTo(-1, -21, 5, -25); });
  line(c, INK, 3, () => { c.moveTo(-6, 30); c.quadraticCurveTo(4, 22, 6, 10); });
  flat(c, SHINE, () => oval(c, -18, 4, 10, 6, -0.3));
}

/** 👥 The fight's crowd: two people side by side, one a step behind. */
function crowd(c: Ctx) {
  const person = (x: number, y: number, s: number, shirt: string) => {
    solid(c, shirt, () => { c.moveTo(x - 26 * s, y + 44 * s); c.quadraticCurveTo(x - 25 * s, y + 8 * s, x, y + 8 * s); c.quadraticCurveTo(x + 25 * s, y + 8 * s, x + 26 * s, y + 44 * s); c.closePath(); });
    solid(c, SKIN, () => dot(c, x, y - 12 * s, 16 * s));
    flat(c, HAIR, () => { c.moveTo(x - 16 * s, y - 12 * s); c.arc(x, y - 12 * s, 16 * s, Math.PI, TAU); c.closePath(); });
  };
  person(14, -6, 0.92, SKY);
  person(-14, 2, 1, BLUE);
}

/** 👨‍🍳 The cook you hire: a chef with a big moustache under his white toque, in his white jacket. */
function cook(c: Ctx) {
  jacket(c, 0, 20, 64);
  flat(c, RED, () => poly(c, -9, 20, 9, 20, 0, 30));
  solid(c, SKIN, () => dot(c, 0, 4, 19));
  flat(c, INK, () => { dot(c, -7, 0, 2.6); dot(c, 7, 0, 2.6); });
  flat(c, BLUSH, () => { dot(c, -12, 8, 4); dot(c, 12, 8, 4); });
  solid(c, HAIR, () => { oval(c, -7, 10, 8, 4, 0.25); oval(c, 7, 10, 8, 4, -0.25); });
  toque(c, 0, -12, 40);
}

/** 🧑‍🍳 The kitchen crew: two chefs in toques, one a step behind the other. */
function crew(c: Ctx) {
  const chef = (x: number, y: number, s: number) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    jacket(c, 0, 20, 52, (46 - y) / s);
    solid(c, SKIN, () => dot(c, 0, 4, 15));
    flat(c, INK, () => { dot(c, -5.5, 2, 2.4); dot(c, 5.5, 2, 2.4); });
    line(c, INK, 2.5, () => c.arc(0, 6, 6, 0.25 * Math.PI, 0.75 * Math.PI));
    toque(c, 0, -8, 32);
    c.restore();
  };
  chef(16, -6, 0.95);
  chef(-14, 4, 1);
}

/** 😋 Yummy: eyes shut with delight, a big smile and the tongue out, licking the lips. */
function yum(c: Ctx) {
  face(c);
  line(c, INK, 6, () => { c.moveTo(-26, -6); c.quadraticCurveTo(-16, -18, -6, -6); c.moveTo(6, -6); c.quadraticCurveTo(16, -18, 26, -6); });
  solid(c, PINK, () => oval(c, 12, 22, 10, 12, -0.4));
  line(c, INK, 6, () => { c.moveTo(-24, 12); c.quadraticCurveTo(0, 32, 24, 12); });
  flat(c, BLUSH, () => { dot(c, -28, 10, 6); dot(c, 28, 10, 6); });
}

/** 😢 Down at the casino: sad brows, a frown, and one tear on the cheek (😭's face, before the sobbing). */
function sad(c: Ctx) {
  face(c);
  line(c, INK, 5, () => { c.moveTo(-28, -18); c.lineTo(-10, -24); c.moveTo(28, -18); c.lineTo(10, -24); });
  flat(c, INK, () => { oval(c, -15, -6, 5, 7); oval(c, 15, -6, 5, 7); });
  line(c, INK, 5, () => c.arc(0, 32, 13, -0.82 * Math.PI, -0.18 * Math.PI));
  solid(c, TEAR, () => { c.moveTo(-17, 2); c.quadraticCurveTo(-26, 16, -26, 21); c.arc(-17, 21, 9, Math.PI, 0, true); c.quadraticCurveTo(-8, 16, -17, 2); c.closePath(); });
}

/** 🙂 A local fighter, nobody special: a plain, friendly smile. */
function smile(c: Ctx) {
  face(c);
  flat(c, INK, () => { oval(c, -15, -8, 5, 7.5); oval(c, 15, -8, 5, 7.5); });
  line(c, INK, 5, () => c.arc(0, 4, 20, 0.22 * Math.PI, 0.78 * Math.PI));
}

/** 🚶 Not today: the chef walking off, in no hurry. */
function walk(c: Ctx) {
  const PANTS = '#22303C', NEAR = '#34495C';
  bar(c, CREAM, 8, () => { c.moveTo(0, -18); c.lineTo(-10, -4); c.lineTo(-14, 6); });
  bar(c, PANTS, 9, () => { c.moveTo(-2, 8); c.lineTo(-10, 24); c.lineTo(-18, 40); });
  solid(c, CREAM, () => box(c, -9, -22, 18, 34, 8));
  bar(c, NEAR, 9, () => { c.moveTo(2, 8); c.lineTo(10, 24); c.lineTo(14, 40); });
  bar(c, NIGHT, 4, () => { c.moveTo(-19, 41); c.lineTo(-13, 42); c.moveTo(15, 41); c.lineTo(21, 41); });
  bar(c, CREAM, 8, () => { c.moveTo(2, -16); c.lineTo(12, -2); c.lineTo(18, 6); });
  solid(c, SKIN, () => dot(c, 2, -34, 11));
  flat(c, HAIR, () => { c.moveTo(-9, -34); c.arc(2, -34, 11, Math.PI, TAU * 0.92); c.closePath(); });
}

/** 🚔 Is this legal?: a police car, front on, its lights on the roof. */
function police(c: Ctx) {
  const LIGHT_BLUE = '#3D8BFF';
  c.translate(0, -3);
  solid(c, NIGHT, () => { box(c, -38, 22, 18, 20, 5); box(c, 20, 22, 18, 20, 5); });
  solid(c, CREAM, () => { c.moveTo(-28, -2); c.lineTo(-22, -24); c.quadraticCurveTo(0, -28, 22, -24); c.lineTo(28, -2); c.closePath(); });
  flat(c, SKY, () => poly(c, -22, -4, -18, -19, 18, -19, 22, -4));
  solid(c, BLUE, () => box(c, -44, -6, 88, 34, 10));
  flat(c, CREAM, () => c.rect(-42, 6, 84, 6));
  solid(c, GOLD, () => { dot(c, -31, 4, 6); dot(c, 31, 4, 6); });
  flat(c, NIGHT, () => box(c, -14, 16, 28, 6, 3));
  solid(c, RED, () => box(c, -16, -36, 16, 10, 4));
  solid(c, LIGHT_BLUE, () => box(c, 0, -36, 16, 10, 4));
}

/** 🤝 Shaking on it: two hands clasped, the chef's in a white sleeve from the left, the other's in a dark one. */
function shake(c: Ctx) {
  const SUIT = '#2E2B33';
  c.rotate(-0.1); c.scale(0.94, 0.94);
  // the other's hand, from the right, behind; the chef's in front, its thumb along the top, its fingers curled round
  solid(c, SKIN, () => box(c, -12, -22, 46, 30, 14));
  solid(c, SUIT, () => box(c, 28, -24, 18, 36, 5));
  solid(c, SKIN, () => box(c, -32, -8, 44, 30, 14));
  solid(c, CREAM, () => box(c, -46, -10, 18, 36, 5));
  bar(c, SKIN, 8, () => { c.moveTo(-22, -10); c.quadraticCurveTo(-8, -16, 6, -12); });
  for (let i = 0; i < 4; i++) solid(c, SKIN, () => box(c, 4, -12 + i * 8, 22, 9, 4.5));
  flat(c, SHINE, () => oval(c, -16, 4, 7, 4));
}

/** 🧟 The arcade's horde: a cute green zombie, arms out, one eye bigger than the other. */
function zombie(c: Ctx) {
  bar(c, ZOMBIE, 9, () => { c.moveTo(-4, 16); c.lineTo(33, 14); });
  solid(c, BLUE, () => { c.moveTo(-36, 46); c.quadraticCurveTo(-34, 12, -8, 12); c.quadraticCurveTo(16, 12, 18, 46); c.closePath(); });
  bar(c, ZOMBIE, 9, () => { c.moveTo(-6, 26); c.lineTo(37, 26); });
  solid(c, ZOMBIE, () => dot(c, -6, -14, 26));
  flat(c, DEEP_ZOMBIE, () => { dot(c, -20, -28, 4); dot(c, 8, -4, 3); });
  flat(c, INK, () => { c.moveTo(-28, -30); c.lineTo(-20, -40); c.lineTo(-14, -32); c.lineTo(-6, -42); c.lineTo(2, -32); c.lineTo(6, -39); c.lineTo(14, -28); c.arc(-6, -14, 26, -0.5, Math.PI + 0.6, true); c.closePath(); });
  solid(c, '#fff', () => dot(c, 4, -14, 7));
  flat(c, INK, () => { dot(c, 6, -14, 3); dot(c, -14, -14, 3); });
  line(c, INK, 3, () => { c.moveTo(-14, -2); c.lineTo(8, -2); });
  flat(c, CREAM, () => c.rect(-6, -2, 5, 4));
}

/** 👁 Watch: one wide eye, its iris and a shine. */
function look(c: Ctx) {
  const almond = () => { c.moveTo(-44, 0); c.quadraticCurveTo(0, -46, 44, 0); c.quadraticCurveTo(0, 46, -44, 0); c.closePath(); };
  solid(c, '#fff', almond);
  inside(c, almond, () => {
    solid(c, SKY, () => dot(c, 0, 0, 20));
    flat(c, INK, () => dot(c, 0, 0, 10));
    flat(c, '#fff', () => dot(c, -7, -7, 5));
  });
  c.beginPath(); almond(); c.stroke();
}

export const PEOPLE: Record<string, Drawing> = {
  '💪': flex, '👥': crowd, '👨‍🍳': cook, '🧑‍🍳': crew, '😋': yum, '😢': sad, '🙂': smile, '🚶': walk, '🚔': police,
  '🤝': shake, '🧟': zombie, '👁': look,
};
