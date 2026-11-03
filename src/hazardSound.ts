// Cooking Hazard's guns, heard (hazardPlay.ts plays them as the rules say what happened; docs/cooking-hazard.md, "Gun
// feel"). Built from audio.ts's voices like the rest of the game's sounds, low and soft-edged so a fight full of them
// never clicks: every attack at least 8 ms, nothing much over 4 kHz.
//
// - The Spud Rifle: a potato cannon's puff of air and a soft thump. The Rock Salt Shotgun: a boom with the salt
//   rattling out. The Chili Sprayer: a short hiss for each drop (fourteen a second, so it's quiet).
// - A hit, in its taste: a plain potato's thud, chili sauce's wet sizzle, salt crystals cracking, a sticky sweet plop,
//   a sour splash, a dull bitter thunk, a mushroom's squish. A crit adds a crunch on top.
// - The salt shell clattering down, a dish's blast, and the rush's slow whoosh.
//
// Each has two styles to audition (a and b, on the audition page); `STYLE` is the one the game plays.
import { ac, between, noise, tone } from './audio';
import type { GunId, Taste } from './hazard';

export type Style = 'a' | 'b';
/** The style each sound plays in. */
export const STYLE: Record<'spud' | 'salt' | 'chili' | 'hit' | 'crit' | 'shell' | 'blast' | 'rush', Style> = {
  spud: 'a', salt: 'a', chili: 'a', hit: 'a', crit: 'a', shell: 'a', blast: 'a', rush: 'a',
};

const last: Record<string, number> = {};
/** Whether `key` hasn't sounded in the last `gap` seconds (a spray's hits would pile up otherwise). */
function spaced(key: string, gap: number) {
  const now = ac?.currentTime ?? 0;
  if (now - (last[key] ?? -1e9) < gap) return false;
  last[key] = now;
  return true;
}

/** A shot from `gun`. */
export function gunSound(gun: GunId, style: Style = STYLE[gun]) {
  if (gun === 'spud') {
    if (style === 'a') {
      // a puff of air out of the barrel, and the thump of it
      noise({ f: 900, f2: 320, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.09, v: 0.12 });
      tone({ f: between(118, 128), f2: 72, type: 'triangle', a: 0.01, d: 0.13, v: 0.2 });
    } else {
      // a pop gun: a rounder pop, a little air
      tone({ f: between(200, 215), f2: 120, a: 0.01, d: 0.08, v: 0.16 });
      noise({ f: 1500, q: 1, a: 0.008, d: 0.045, v: 0.05 });
    }
  } else if (gun === 'salt') {
    if (style === 'a') {
      // the boom, and the salt rattling out after it
      tone({ f: 96, f2: 48, type: 'triangle', a: 0.012, d: 0.24, v: 0.3 });
      noise({ f: 1300, f2: 260, kind: 'lowpass', q: 0.7, a: 0.008, d: 0.2, v: 0.2 });
      noise({ t: 0.02, f: 2600, q: 2, a: 0.01, d: 0.08, v: 0.04 });
    } else {
      // a deeper, rounder boom
      tone({ f: 84, f2: 44, a: 0.012, d: 0.32, v: 0.32 });
      noise({ f: 900, f2: 200, kind: 'lowpass', q: 0.7, a: 0.01, d: 0.26, v: 0.22 });
    }
  } else {
    if (!spaced('chili', 0.06)) return;
    if (style === 'a') noise({ f: 2300, q: 0.8, a: 0.01, d: 0.05, v: 0.06 });
    else noise({ f: 1500, q: 0.6, a: 0.012, d: 0.06, v: 0.06 });
  }
}

/** A hit in `taste` (none: a plain potato). Style b leans on the thump, a on the squelch. */
export function hitSound(taste: Taste | null, gun: GunId, style: Style = STYLE.hit) {
  if (!spaced('hit', gun === 'chili' ? 0.07 : 0.035)) return;
  const k = gun === 'chili' ? 0.5 : 1, body = style === 'b' ? 1.6 : 1, wet = style === 'b' ? 0.5 : 1;
  switch (taste) {
    case null:
      tone({ f: between(170, 185), f2: 110, type: 'triangle', a: 0.008, d: 0.06, v: 0.1 * k * body });
      noise({ f: 700, kind: 'lowpass', q: 0.8, a: 0.008, d: 0.05, v: 0.07 * k * wet });
      break;
    case 'spicy':
      noise({ f: 2600, q: 0.7, a: 0.01, d: 0.1, v: 0.035 * k * wet });
      noise({ f: 520, kind: 'lowpass', q: 1, a: 0.008, d: 0.05, v: 0.06 * k });
      tone({ f: 160, f2: 120, a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'salty':
      noise({ f: 2000, q: 3, a: 0.008, d: 0.03, v: 0.06 * k * wet });
      noise({ t: 0.025, f: 1700, q: 3, a: 0.008, d: 0.03, v: 0.045 * k * wet });
      tone({ f: 200, f2: 150, type: 'triangle', a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'sweet':
      tone({ f: 300, f2: 200, a: 0.01, d: 0.07, v: 0.08 * k * body });
      noise({ f: 420, kind: 'lowpass', q: 1.2, a: 0.01, d: 0.06, v: 0.05 * k * wet });
      break;
    case 'sour':
      noise({ f: 1300, f2: 600, q: 0.9, a: 0.008, d: 0.08, v: 0.06 * k * wet });
      tone({ f: 190, f2: 140, a: 0.008, d: 0.04, v: 0.05 * k * body });
      break;
    case 'bitter':
      tone({ f: 140, f2: 92, type: 'triangle', a: 0.01, d: 0.07, v: 0.1 * k * body });
      noise({ f: 320, kind: 'lowpass', q: 0.8, a: 0.008, d: 0.05, v: 0.05 * k * wet });
      break;
    case 'umami':
      tone({ f: 220, f2: 150, a: 0.01, d: 0.06, v: 0.07 * k * body });
      noise({ f: 460, kind: 'lowpass', q: 2, a: 0.01, d: 0.07, v: 0.06 * k * wet });
      break;
  }
}

/** A crit, on top of the hit: a crunch (a), or a crunch and a little ring (b). */
export function critSound(style: Style = STYLE.crit) {
  if (!spaced('crit', 0.05)) return;
  noise({ f: 1600, q: 1.5, a: 0.008, d: 0.05, v: 0.09 });
  tone({ f: 400, f2: 230, type: 'triangle', a: 0.008, d: 0.07, v: 0.08 });
  if (style === 'b') tone({ t: 0.01, f: 880, a: 0.01, d: 0.16, v: 0.035 });
}

/** The shotgun's spent salt shell, landing a moment after the shot and bouncing once. */
export function shellSound(style: Style = STYLE.shell) {
  if (style === 'a') {
    tone({ t: 0.35, f: 1100, f2: 900, type: 'triangle', a: 0.008, d: 0.03, v: 0.035 });
    tone({ t: 0.47, f: 1050, f2: 880, type: 'triangle', a: 0.008, d: 0.025, v: 0.02 });
  } else {
    noise({ t: 0.35, f: 2400, q: 4, a: 0.008, d: 0.03, v: 0.12 });
    noise({ t: 0.47, f: 2300, q: 4, a: 0.008, d: 0.025, v: 0.07 });
  }
}

/** A dish's blast: a deep thump and the splash of it (b: wetter). */
export function blastSound(style: Style = STYLE.blast) {
  tone({ f: 78, f2: 38, a: 0.012, d: 0.42, v: 0.34 });
  noise({ f: 1100, f2: 160, kind: 'lowpass', q: 0.7, a: 0.01, d: 0.36, v: 0.24 });
  noise({ f: 620, q: 1, a: 0.008, d: 0.12, v: 0.08 });
  if (style === 'b') noise({ t: 0.04, f: 2400, f2: 500, kind: 'lowpass', q: 0.8, a: 0.02, d: 0.32, v: 0.14 });
}

/** The rush: a slow whoosh rising, and a low thump under it (b: a whoosh falling away). */
export function rushSound(style: Style = STYLE.rush) {
  if (style === 'a') {
    noise({ f: 380, f2: 1400, q: 1.2, a: 0.15, d: 0.5, v: 0.09 });
    tone({ f: 70, f2: 52, a: 0.03, d: 0.6, v: 0.12 });
  } else {
    noise({ f: 2000, f2: 300, kind: 'lowpass', q: 0.9, a: 0.06, d: 0.7, v: 0.3 });
  }
}
