// Icons for people and faces, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, BLUE, CREAM, DEEP_RED, GOLD, INK, NIGHT, OUT, PINK, RED, SKIN, SKY, STEEL, TAU,
  bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

/** The faces' yellow (😐 in icons.ts), their tears' blue, and the cheeks' blush. */
const FACE = '#F7D038', TEAR = '#6EC3F0', BLUSH = 'rgba(229,72,77,.35)', HAIR = '#3B2A20';
/** A zombie's sickly green, light and deep. */
const ZOMBIE = '#9BCB6A', DEEP_ZOMBIE = '#6E9E48';
/** Eddie's purple suit (🤝), as on his 3D model (family.ts). */
const SUIT = '#5E3A7E';
/** A deeper skin for the hand behind in a handshake (🤝), so the two hands part. */
const DEEP_SKIN = '#E0A97C';
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

/** 💪 Fans fed this fight: the wrestler's arm, flexed: a white sleeve at the shoulder, the upper arm out flat with
 * its bicep bulging, the forearm straight up and the fist on top. */
function flex(c: Ctx) {
  blob(c, SKIN, () => {
    box(c, -36, 14, 74, 28, 14);
    oval(c, -8, 10, 21, 18);
    box(c, 18, -24, 24, 60, 12);
  });
  // the fist: one round knob, two of its curled fingers' creases on the front, towards the head
  solid(c, SKIN, () => box(c, 10, -46, 34, 30, 14));
  line(c, INK, 3, () => { c.moveTo(10, -36); c.quadraticCurveTo(16, -37, 21, -34); c.moveTo(10, -26); c.quadraticCurveTo(16, -27, 21, -24); });
  flat(c, SHINE, () => oval(c, -14, 2, 9, 5, -0.3));
  solid(c, CREAM, () => box(c, -46, 8, 16, 38, 6));
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

/** 😋 Yummy: eyes shut happy, a big smile, and the tongue out at the corner, licking the lip. */
function yum(c: Ctx) {
  face(c);
  line(c, INK, 5, () => { c.moveTo(-26, -6); c.quadraticCurveTo(-16, -20, -6, -6); c.moveTo(6, -6); c.quadraticCurveTo(16, -20, 26, -6); });
  flat(c, BLUSH, () => { dot(c, -29, 10, 6); dot(c, 29, 10, 6); });
  solid(c, PINK, () => { c.moveTo(6, 18); c.quadraticCurveTo(10, 38, 22, 36); c.quadraticCurveTo(34, 32, 26, 12); c.closePath(); });
  line(c, DEEP_RED, 3, () => { c.moveTo(16, 21); c.quadraticCurveTo(20, 27, 21, 31); });
  line(c, INK, 5, () => { c.moveTo(-26, 10); c.quadraticCurveTo(0, 30, 28, 12); });
}

/** 😢 Down at the casino, and the restroom to cry it out in: sad brows, a frown, and one tear on the cheek. */
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

/** 🤝 Shaking on it: Eddie fixing a fight, the chef joining the fights. Drawn the way emoji draw a handshake: two hands
 * meet at a gentle slant, Eddie's in front from his purple suit and white shirt cuff on the left, its four fingers as
 * bands wrapped over the chef's hand; the chef's from his white sleeve on the right, behind, his fingertips peeking out
 * under Eddie's palm and his thumb across the back of it. */
function shake(c: Ctx) {
  const B = 8.5, TIPS = [38, 39, 34, 27];
  c.save(); c.translate(0, -3);
  /** Eddie's fingers' frame: from the index finger's root, pointing down-right, the other fingers stacked below it. */
  const F = (f: () => void) => { c.save(); c.translate(-8, -20); c.rotate(0.62); f(); c.restore(); };
  // the chef's hand, behind: the back of it on the right, and his fingertips curled round under Eddie's palm
  blob(c, DEEP_SKIN, () => {
    c.moveTo(34, -22); c.lineTo(2, -22); c.lineTo(-8, 8); c.lineTo(2, 24); c.quadraticCurveTo(8, 27, 14, 22);
    c.lineTo(30, 8); c.quadraticCurveTo(34, 5, 34, 0); c.closePath();
  });
  F(() => { for (let i = 0; i < 4; i++) solid(c, DEEP_SKIN, () => box(c, 1 + i * 7.4, 26, 7.4, 16 - i * 0.5, 3.7)); });
  // Eddie's hand in front: palm and four fingers as one shape, the fingers parted by three creases
  blob(c, SKIN, () => {
    c.moveTo(-34, -22); c.lineTo(-6, -22); c.lineTo(-6, 0); c.lineTo(-30, 10); c.lineTo(-34, 6); c.closePath();
    F(() => {
      c.moveTo(-2, 0); c.lineTo(TIPS[0] - B / 2, 0);
      TIPS.forEach((t, i) => c.arc(t - B / 2, i * B + B / 2, B / 2, -Math.PI / 2, Math.PI / 2));
      c.lineTo(-2, 4 * B); c.closePath();
    });
  });
  F(() => line(c, INK, 3, () => { for (let i = 1; i < 4; i++) { c.moveTo(16, i * B); c.lineTo(TIPS[i] - 7, i * B); } }));
  // the chef's thumb across the back of Eddie's hand, its root hidden in the chef's palm (no outline there)
  const thumb = () => {
    c.moveTo(18, -22); c.lineTo(-8, -26); c.quadraticCurveTo(-20, -28, -20, -19);
    c.quadraticCurveTo(-20, -12, -10, -12); c.lineTo(12, -10);
  };
  flat(c, DEEP_SKIN, () => { thumb(); c.lineTo(22, -16); c.closePath(); });
  line(c, INK, OUT, thumb);
  flat(c, SHINE, () => oval(c, -22, -10, 5, 3.5, -0.3));
  // the sleeves: Eddie's purple with a white shirt cuff, the chef's white
  const sleeve = (side: number, cloth: string, cuff?: string) => {
    c.save(); c.scale(side, 1); c.translate(-38, -8); c.rotate(-0.12);
    solid(c, cloth, () => box(c, -8, -19, 16, 36, 4));
    if (cuff) solid(c, cuff, () => box(c, 3, -18, 6, 34, 3));
    c.restore();
  };
  sleeve(1, SUIT, CREAM);
  sleeve(-1, CREAM);
  c.restore();
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
