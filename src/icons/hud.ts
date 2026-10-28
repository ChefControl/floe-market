// Icons for the HUD, settings and the buttons, keyed by the emoji they stand for (icons.ts gathers them). Drawn with the kit (kit.ts), the
// design book's Icons section has the rules.
import {
  type Ctx, type Drawing, BLUE, CREAM, DEEP_GOLD, DEEP_RED, GOLD, INK, NIGHT, RED, SKY, STEEL, TAU, WOOD,
  bar, blob, box, dot, flat, inside, line, oval, poly, solid,
} from './kit';

const SHINE = 'rgba(255,255,255,.4)';

/** ⚙️ The settings button: a steel gear with eight teeth and a hole through its middle. */
function gear(c: Ctx) {
  const teeth = 8, R = 44, r = 33, hole = 12;
  const path = () => {
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU - Math.PI / 2, w = 0.2;
      const pts: [number, number][] = [[r, a - 0.36], [R, a - w], [R, a + w], [r, a + 0.36]];
      pts.forEach(([rad, an], j) => {
        const x = Math.cos(an) * rad, y = Math.sin(an) * rad;
        if (i === 0 && j === 0) c.moveTo(x, y); else c.lineTo(x, y);
      });
    }
    c.closePath();
    // the hole: wound the other way, so it's left empty
    c.moveTo(hole, 0); c.arc(0, 0, hole, 0, -TAU, true);
  };
  solid(c, STEEL, path);
  flat(c, '#9AA7B0', () => { c.moveTo(22, 0); c.arc(0, 0, 22, 0, TAU); c.moveTo(hole, 0); c.arc(0, 0, hole, 0, -TAU, true); });
  c.beginPath(); c.moveTo(hole, 0); c.arc(0, 0, hole, 0, TAU); c.stroke();
  flat(c, SHINE, () => oval(c, -20, -18, 6, 9, 0.8));
}

/** 🏆 The scoreboard button: a gold cup with two handles on a wooden plinth. */
function trophy(c: Ctx) {
  bar(c, DEEP_GOLD, 6, () => {
    c.moveTo(-24, -32); c.bezierCurveTo(-46, -32, -44, -4, -18, 0);
    c.moveTo(24, -32); c.bezierCurveTo(46, -32, 44, -4, 18, 0);
  });
  solid(c, DEEP_GOLD, () => poly(c, -7, 6, 7, 6, 9, 26, -9, 26));
  solid(c, GOLD, () => { c.moveTo(-28, -40); c.lineTo(28, -40); c.bezierCurveTo(28, -6, 14, 10, 0, 10); c.bezierCurveTo(-14, 10, -28, -6, -28, -40); c.closePath(); });
  flat(c, SHINE, () => oval(c, -14, -24, 5, 11, 0.15));
  solid(c, WOOD, () => box(c, -24, 24, 48, 20, 4));
  flat(c, GOLD, () => box(c, -10, 30, 20, 7, 2));
}

/** The speaker that 🔊 and 🔇 share: a steel box and its cone, facing right. */
function speaker(c: Ctx) {
  blob(c, STEEL, () => { box(c, -44, -14, 20, 28, 4); poly(c, -28, -14, -4, -34, -4, 34, -28, 14); });
  flat(c, SHINE, () => box(c, -40, -10, 6, 12, 3));
}

/** 🔊 Sound on: the speaker, two sound waves coming out of it. */
function loud(c: Ctx) {
  c.translate(2, 0);
  speaker(c);
  bar(c, SKY, 6, () => {
    c.moveTo(8, -14); c.quadraticCurveTo(16, 0, 8, 14);
    c.moveTo(20, -28); c.quadraticCurveTo(36, 0, 20, 28);
  });
}

/** 🔇 Muted: the speaker with a red cross where its sound was. */
function muted(c: Ctx) {
  speaker(c);
  bar(c, RED, 7, () => { c.moveTo(12, -16); c.lineTo(40, 16); c.moveTo(40, -16); c.lineTo(12, 16); });
}

/** ☁️ Cloud save: a white puffy cloud. */
function cloud(c: Ctx) {
  const shape = () => {
    dot(c, -22, 8, 18); dot(c, -2, -8, 24); dot(c, 22, 2, 18);
    box(c, -40, 4, 80, 26, 13);
  };
  blob(c, CREAM, shape);
  inside(c, shape, () => flat(c, '#D6E7EF', () => c.rect(-50, 20, 100, 20)));
  flat(c, SHINE, () => oval(c, -10, -18, 8, 5, -0.5));
}

/** A four-pointed sparkle at (x, y), `r` from the middle to each point. */
function sparkle(c: Ctx, x: number, y: number, r: number) {
  const k = r * 0.16;
  solid(c, GOLD, () => {
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x + k, y - k, x + r, y);
    c.quadraticCurveTo(x + k, y + k, x, y + r);
    c.quadraticCurveTo(x - k, y + k, x - r, y);
    c.quadraticCurveTo(x - k, y - k, x, y - r);
    c.closePath();
  });
}
/** ✨ Graphics: three gold sparkles, one big and two small. */
function sparkles(c: Ctx) {
  sparkle(c, -8, 8, 36);
  sparkle(c, 28, -26, 17);
  sparkle(c, 30, 30, 12);
}

/** 🕹️ Controls (and the arcade): a red-topped joystick on a dark base with a gold button. */
function joystick(c: Ctx) {
  solid(c, '#55636F', () => { c.moveTo(-42, 42); c.lineTo(-34, 14); c.lineTo(34, 14); c.lineTo(42, 42); c.closePath(); });
  flat(c, '#7A8894', () => poly(c, -32, 18, 32, 18, 34, 25, -34, 25));
  solid(c, NIGHT, () => oval(c, 4, 18, 12, 4));
  bar(c, '#3B4652', 7, () => { c.moveTo(4, 18); c.lineTo(-6, -18); });
  solid(c, RED, () => dot(c, -8, -26, 18));
  flat(c, SHINE, () => oval(c, -15, -33, 6, 4, -0.6));
  solid(c, GOLD, () => oval(c, -22, 31, 8, 4));
}

/** 👕 Your look: a T-shirt from the wardrobe, sky blue with a darker collar. */
function tshirt(c: Ctx) {
  solid(c, SKY, () => {
    c.moveTo(-12, -38); c.quadraticCurveTo(0, -28, 12, -38);
    c.lineTo(46, -22); c.lineTo(36, 0); c.lineTo(26, -6);
    c.lineTo(26, 40); c.lineTo(-26, 40); c.lineTo(-26, -6);
    c.lineTo(-36, 0); c.lineTo(-46, -22); c.closePath();
  });
  line(c, BLUE, 5, () => { c.moveTo(-11, -36); c.quadraticCurveTo(0, -26, 11, -36); });
  flat(c, SHINE, () => box(c, -20, -12, 7, 28, 3.5));
}

/** 🎲 Surprise me: a white die, three of its faces showing, the red one-spot on top. */
function die(c: Ctx) {
  solid(c, CREAM, () => box(c, -36, -12, 54, 52, 6));
  solid(c, '#E6DBC0', () => poly(c, 18, -12, 40, -30, 40, 20, 18, 40));
  solid(c, CREAM, () => poly(c, -36, -12, -14, -30, 40, -30, 18, -12));
  flat(c, RED, () => oval(c, 2, -21, 7, 4));
  flat(c, INK, () => { dot(c, -24, 0, 4.5); dot(c, -9, 14, 4.5); dot(c, 6, 28, 4.5); });
  flat(c, INK, () => { oval(c, 29, -12, 3, 4); oval(c, 29, 18, 3, 4); });
}

/** 🐞 Report a bug: a chubby red ladybird from above, a big black head with two friendly eyes, four big spots. */
function ladybird(c: Ctx) {
  // stubby legs and two curled feelers, under everything
  line(c, INK, 5, () => {
    for (const s of [-1, 1]) { c.moveTo(s * 32, 6); c.lineTo(s * 45, 2); c.moveTo(s * 30, 30); c.lineTo(s * 42, 38); }
  });
  line(c, INK, 4, () => { for (const s of [-1, 1]) { c.moveTo(s * 7, -36); c.quadraticCurveTo(s * 10, -46, s * 20, -44); } });
  flat(c, INK, () => { dot(c, -20, -43, 4.5); dot(c, 20, -43, 4.5); });
  const shell = () => oval(c, 0, 12, 40, 33);
  solid(c, RED, shell);
  inside(c, shell, () => flat(c, NIGHT, () => { dot(c, -21, 8, 8.5); dot(c, 21, 8, 8.5); dot(c, -16, 31, 7.5); dot(c, 16, 31, 7.5); }));
  line(c, INK, 4, () => { c.moveTo(0, -6); c.lineTo(0, 45); });
  flat(c, SHINE, () => oval(c, -25, -6, 5, 8, 0.7));
  solid(c, NIGHT, () => oval(c, 0, -20, 22, 17));
  for (const s of [-1, 1]) {
    solid(c, '#fff', () => dot(c, s * 9, -22, 6.5));
    flat(c, INK, () => dot(c, s * 9 + 1, -21, 3.5));
    flat(c, '#fff', () => dot(c, s * 9 - 0.5, -23.5, 1.3));
  }
  flat(c, 'rgba(232,96,122,.75)', () => { oval(c, -15, -11, 4, 2.6); oval(c, 15, -11, 4, 2.6); });
}

/** 🖍️ Draw-a-Bug: a red crayon at a slant, its paper wrapper banded dark. */
function crayon(c: Ctx) {
  c.save(); c.rotate(-Math.PI / 4);
  solid(c, RED, () => { c.moveTo(20, -12); c.lineTo(43, -4); c.quadraticCurveTo(47, 0, 43, 4); c.lineTo(20, 12); c.closePath(); });
  const body = () => box(c, -46, -14, 68, 28, 6);
  solid(c, RED, body);
  inside(c, body, () => {
    flat(c, DEEP_RED, () => { c.rect(-34, -14, 8, 28); c.rect(4, -14, 8, 28); });
    flat(c, SHINE, () => c.rect(-46, -9, 68, 5));
  });
  c.beginPath(); body(); c.stroke();
  c.restore();
}

/** 🗑️ Toss: a steel bin with its lid and handle, ribs down its side. */
function bin(c: Ctx) {
  const body = () => poly(c, -30, -22, 30, -22, 24, 42, -24, 42);
  solid(c, STEEL, body);
  inside(c, body, () => line(c, '#9AA7B0', 4, () => { for (const x of [-12, 0, 12]) { c.moveTo(x, -16); c.lineTo(x * 0.85, 36); } }));
  flat(c, SHINE, () => poly(c, -24, -18, -17, -18, -15, 36, -19, 36));
  c.beginPath(); body(); c.stroke();
  bar(c, '#9AA7B0', 5, () => { c.moveTo(-10, -32); c.lineTo(-10, -40); c.lineTo(10, -40); c.lineTo(10, -32); });
  solid(c, STEEL, () => box(c, -38, -32, 76, 11, 5));
}

/** 🛒 Buy: a shopping trolley, its red wire basket on a steel frame, the handle up the back and two black wheels. */
function trolley(c: Ctx) {
  c.save(); c.translate(2, -1); c.scale(0.92, 0.92);
  // the basket: its back edge runs along the frame, its floor level with the bottom rail
  const TL = [-28, -26], TR = [44, -26], BR = [36, 12], BL = [-18, 12];
  const back = (y: number) => TL[0] + (BL[0] - TL[0]) * (y - TL[1]) / (BL[1] - TL[1]);
  // the frame: the handle's grip, down the basket's back edge, along the bottom rail and up to the basket's front
  bar(c, STEEL, 6, () => {
    c.moveTo(-42, -36); c.lineTo(back(-36), -36); c.lineTo(back(24), 24); c.lineTo(BR[0], 24); c.lineTo(BR[0], BR[1]);
  });
  const basket = () => poly(c, TL[0], TL[1], TR[0], TR[1], BR[0], BR[1], BL[0], BL[1]);
  solid(c, RED, basket);
  inside(c, basket, () => line(c, DEEP_RED, 3.5, () => {
    for (const f of [0.25, 0.5, 0.75]) {
      c.moveTo(TL[0] + (TR[0] - TL[0]) * f, TL[1]); c.lineTo(BL[0] + (BR[0] - BL[0]) * f, BL[1]);
    }
    c.moveTo(-50, -7); c.lineTo(50, -7);
  }));
  c.beginPath(); basket(); c.stroke();
  // the wheels, evenly under the rail
  for (const x of [back(24) + 8, BR[0] - 8]) { solid(c, NIGHT, () => dot(c, x, 34, 8)); flat(c, STEEL, () => dot(c, x, 34, 3)); }
  c.restore();
}

/** 💬 Talk: a white speech bubble, its tail down to the left, three dots inside: bubble and tail one outlined shape. */
function talk(c: Ctx) {
  const L = -44, R = 44, T = -36, B = 22, r = 20;
  solid(c, CREAM, () => {
    c.moveTo(L + r, T);
    c.arcTo(R, T, R, B, r); c.arcTo(R, B, L, B, r);
    // along the bottom to the tail, out to its tip and back
    c.lineTo(-6, B);
    c.quadraticCurveTo(-14, 36, -36, 44);
    c.quadraticCurveTo(-24, 34, -22, B);
    c.arcTo(L, B, L, T, r); c.arcTo(L, T, R, T, r);
    c.closePath();
  });
  flat(c, INK, () => { dot(c, -18, -7, 5.5); dot(c, 0, -7, 5.5); dot(c, 18, -7, 5.5); });
  flat(c, SHINE, () => oval(c, -26, -25, 9, 4, -0.2));
}

/** 🛡️ The privacy notice: a blue shield, its left half lighter, with a gold tick across it. */
function shield(c: Ctx) {
  const path = () => {
    c.moveTo(0, -44);
    c.quadraticCurveTo(20, -34, 40, -34); c.lineTo(40, -6);
    c.quadraticCurveTo(38, 28, 0, 46); c.quadraticCurveTo(-38, 28, -40, -6);
    c.lineTo(-40, -34); c.quadraticCurveTo(-20, -34, 0, -44);
    c.closePath();
  };
  solid(c, BLUE, path);
  inside(c, path, () => flat(c, SKY, () => c.rect(-50, -50, 50, 100)));
  // the outline again, over the lighter half
  c.beginPath(); path(); c.stroke();
  bar(c, GOLD, 8, () => { c.moveTo(-18, 0); c.lineTo(-5, 14); c.lineTo(20, -14); });
  flat(c, SHINE, () => oval(c, -24, -24, 8, 4, -0.4));
}

export const HUD: Record<string, Drawing> = {
  '⚙': gear, '🏆': trophy, '🔊': loud, '🔇': muted, '☁': cloud, '✨': sparkles, '🕹': joystick,
  '👕': tshirt, '🎲': die, '🐞': ladybird, '🖍': crayon, '🗑': bin, '🛒': trolley, '💬': talk,
  '🛡': shield,
};
