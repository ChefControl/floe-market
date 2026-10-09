// Who the crowd are: walk-up customers, drivers and diners each get a mix of a man's or a woman's wardrobe, so no two
// in a queue look alike. characters.ts dresses a Person in one.

/** A haircut. Men's: short, a quiff, curls, or bald on top. Women's: long, a ponytail, a bun, a bob, or curls. */
export type Cut = 'short' | 'quiff' | 'curly' | 'bald' | 'long' | 'ponytail' | 'bun' | 'bob';
/** What's on the face: a moustache, a beard or a goatee (men), or earrings (women). */
export type Face = 'bare' | 'mustache' | 'beard' | 'goatee' | 'earrings';
/**
 * Eyes, drawn the cartoon way: dots, big round ones, round with a sparkle, happy arcs (^^), sleepy half-closed ones,
 * dots with lashes, dots under angry brows, or a wink.
 */
export type Eyes = 'dot' | 'round' | 'sparkle' | 'happy' | 'sleepy' | 'lashes' | 'angry' | 'wink';
/** A mouth: none, a smile, an open grin with its top teeth, a smile with the tongue out, an "o", flat, a smirk or a frown. */
export type Mouth = 'none' | 'smile' | 'grin' | 'tongue' | 'o' | 'flat' | 'smirk' | 'frown';
/** Cheeks: plain, rosy, or freckled. */
export type Cheeks = 'plain' | 'rosy' | 'freckles';
/** Winter's: the parka's hood, a woolly hat with a bobble, earmuffs (women) or a fur-lined trapper hat (men). */
export type Winter = 'hood' | 'bobble' | 'earmuffs' | 'trapper';
/** Spring's: a baseball cap, a hairband, or nothing over the hair. */
export type Spring = 'cap' | 'band' | 'bare';
/** Summer's: sunglasses, a wide straw sun hat (women) or a little straw hat (men). */
export type Summer = 'shades' | 'sunhat' | 'straw';
/** Autumn's: a woolly hat with a bobble, a beret (women) or a flat cap (men). */
export type Fall = 'bobble' | 'beret' | 'flatcap';
/** A diner's hat: a top hat or a bowler (men), a wide-brimmed hat or a pillbox (women), or none. */
export type Hat = 'top' | 'bowler' | 'brim' | 'pillbox' | 'bare';
/** A diner's neck: a bow tie or a tie (men), or pearls (women). */
export type Neck = 'bow' | 'tie' | 'pearls';

export interface Style {
  woman: boolean;
  skin: number;
  hair: number;
  cut: Cut;
  eyes: Eyes;
  mouth: Mouth;
  cheeks: Cheeks;
  face: Face;
  /** Glasses' frame colour, or null for none. Sunglasses replace them in summer. */
  glasses: number | null;
  /** Trousers, or a woman's tights under her skirt. */
  legs: number;
  /** Shoes, and snow boots in winter. */
  shoes: number;
  /** A woman's skirt in spring and summer, or null for trousers all year. A diner's dress flares into one all year. */
  skirt: number | null;
  /** Scales the whole person. */
  height: number;
  winter: Winter;
  spring: Spring;
  summer: Summer;
  fall: Fall;
  /** The fur trim on the hood or trapper hat. */
  fur: number;
  /**
   * Colours of the winter hat or earmuffs, the spring cap or hairband, the summer hat's ribbon, the autumn hat, and the
   * scarf (worn in autumn, and in winter by anyone out of their hood).
   */
  winterC: number;
  springC: number;
  summerC: number;
  fallC: number;
  scarfC: number;
  hat: Hat;
  hatC: number;
  neck: Neck;
  neckC: number;
}

// ---------- shared pools ----------
/** Light to dark. */
export const SKINS = [0xF6D5BC, 0xF3C9A4, 0xE2AD84, 0xC68B5E, 0x9A6440, 0x6E4630];
/** Hair colours for the lighter skins, then just the dark ones for the darker skins, and grey for anyone older. */
export const HAIR = [0x3B2A20, 0x6B4A2E, 0x1E1B1A, 0xC99A5B, 0x8A4B2A, 0xE0C07A, 0xA8432A];
const DARK_HAIR = [0x1E1B1A, 0x2A1F19, 0x3B2A20];
export const GREY = 0xA8A49F;
export const CAPS = [0xF4A6B8, 0x9AD3E8, 0xF6E27A, 0xB7E4A8, 0xFFFFFF, 0xC9B6F2];
export const KNITS = [0xC0392B, 0xE8A33D, 0x2E7D6B, 0x6A4C93, 0x3A6EA5, 0xD9775B];
export const FRAMES = [0x1F1F1F, 0x6B3A1E, 0x8A8F96, 0x2D4E7A];
const FURS = [0xF8FAFC, 0xF8FAFC, 0xEDE3D0, 0xC9BBA5];
/** Everyone's mouths (nobody in the crowd frowns: an unhappy customer shows it in their review). */
const MOUTHS: Mouth[] = ['none', 'none', 'smile', 'smile', 'grin', 'tongue', 'o', 'flat', 'smirk'];

// ---------- the men's wardrobe ----------
const MEN = {
  cuts: ['short', 'short', 'quiff', 'curly', 'bald'] as Cut[],
  faces: ['bare', 'bare', 'mustache', 'beard', 'goatee'] as Face[],
  eyes: ['dot', 'dot', 'round', 'sparkle', 'happy', 'sleepy', 'angry', 'wink'] as Eyes[],
  legs: [0x2C3A47, 0x3D5A80, 0x5A4A3A, 0x3A3A3A, 0x8A7A5A],
  shoes: [0x3A2E28, 0x1F1F1F, 0x5A3E2B, 0xF4F1EA, 0x6B5B4B],
  cheeks: ['plain', 'plain', 'plain', 'rosy', 'freckles'] as Cheeks[],
  winter: ['hood', 'hood', 'bobble', 'trapper'] as Winter[],
  /** Leather and felt for the trapper hats. */
  trappers: [0x5A3E2B, 0x3A3A3A, 0x6B5B4B, 0x2F3B4A],
  spring: ['cap', 'cap', 'bare'] as Spring[],
  summer: ['shades', 'shades', 'straw'] as Summer[],
  fall: ['bobble', 'flatcap'] as Fall[],
  /** Tweed for the flat caps. */
  caps: [0x6B5B4B, 0x5A6B5A, 0x7A6A55, 0x4A4A55],
  hats: ['top', 'top', 'bowler', 'bare'] as Hat[],
  hatC: [0x1B2430, 0x1B2430, 0x4A3426],
  necks: ['bow', 'tie'] as Neck[],
  neckC: [0xC0392B, 0x1B2430, 0x2E4A7A, 0x7A1F2B],
  height: [0.98, 1.06],
};

// ---------- the women's wardrobe ----------
const WOMEN = {
  cuts: ['long', 'ponytail', 'bun', 'bob', 'curly'] as Cut[],
  faces: ['bare', 'earrings', 'earrings'] as Face[],
  eyes: ['dot', 'round', 'sparkle', 'sparkle', 'happy', 'sleepy', 'lashes', 'lashes', 'wink'] as Eyes[],
  legs: [0x2C3A47, 0x3D5A80, 0x1B1B1B, 0x5B4A6B],
  shoes: [0x1F1F1F, 0xC0392B, 0xF4F1EA, 0x8A5A3A, 0x2C3A47, 0xE8A0B4],
  cheeks: ['plain', 'rosy', 'rosy', 'freckles'] as Cheeks[],
  skirts: [0xE86F7E, 0x5B8DEF, 0xF2B33D, 0x3FA37C, 0x9B5DE5, 0x2C3A47],
  winter: ['hood', 'hood', 'earmuffs', 'bobble'] as Winter[],
  spring: ['cap', 'band', 'band', 'bare'] as Spring[],
  summer: ['shades', 'sunhat', 'sunhat'] as Summer[],
  fall: ['bobble', 'beret'] as Fall[],
  hats: ['brim', 'brim', 'pillbox', 'bare'] as Hat[],
  hatC: [0xF4EBDD, 0x1B2430, 0x7A1F2B, 0x2F4A44],
  height: [0.92, 0.99],
};

/** Every colour of trousers (and tights), and of skirts, either wardrobe has: what the player picks from (customize.ts). */
export const LEGS = [...new Set([...MEN.legs, ...WOMEN.legs])];
/** The shoe colours the player picks from: eight of the two wardrobes' ten. */
export const SHOES = [0x3A2E28, 0x1F1F1F, 0xF4F1EA, 0xC0392B, 0x8A5A3A, 0x2C3A47, 0xE8A0B4, 0x5A3E2B];
export const SKIRTS = WOMEN.skirts;

/** Evening dresses for the women at the sushi bar (the men wear SUITS). */
export const DRESSES = [0x7A1F2B, 0x1B2430, 0x2F4A44, 0x5A2E6B, 0xB8860B, 0x24476B];

/** Small seeded PRNG (mulberry32): the crowd is mixed without touching Math.random, so the game's luck is the same. */
export function rng(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let people = 0;
/** The next person in the crowd: a man or a woman, mixed from their wardrobe. */
export function crowd(): Style {
  const r = rng(++people * 0x9E3779B9);
  const one = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const woman = r() < 0.5;
  const W = woman ? WOMEN : MEN;
  const skin = Math.floor(r() * SKINS.length);
  const old = r() < 0.12;
  let cut = one(W.cuts);
  const winter = one(W.winter);
  if (old && !woman && r() < 0.5) cut = 'bald';
  return {
    woman,
    skin: SKINS[skin],
    hair: old ? GREY : one(skin >= 4 ? DARK_HAIR : HAIR),
    cut,
    face: one(W.faces),
    glasses: r() < (old ? 0.6 : 0.2) ? one(FRAMES) : null,
    legs: one(W.legs),
    skirt: woman && r() < 0.6 ? one(WOMEN.skirts) : null,
    height: W.height[0] + r() * (W.height[1] - W.height[0]),
    winter,
    spring: one(W.spring),
    summer: one(W.summer),
    fall: one(W.fall),
    fur: one(FURS),
    winterC: winter === 'trapper' ? one(MEN.trappers) : winter === 'earmuffs' ? one(CAPS) : one(KNITS),
    springC: one(CAPS),
    summerC: one(KNITS),
    fallC: woman ? one(KNITS) : one([...KNITS, ...MEN.caps]),
    scarfC: one(KNITS),
    hat: one(W.hats),
    hatC: one(woman ? WOMEN.hatC : MEN.hatC),
    neck: woman ? 'pearls' : one(MEN.necks),
    neckC: one(MEN.neckC),
    eyes: one(W.eyes),
    mouth: one(MOUTHS),
    shoes: one(W.shoes),
    cheeks: one(W.cheeks),
  };
}

/**
 * The plain look of everyone outside the crowd (the player, chefs, farmers, waiters...), as they always were: hair,
 * caps and knits handed out in turn by `n`.
 */
export function plain(n: number): Style {
  return {
    woman: false, skin: SKINS[1], hair: HAIR[n % 5], cut: 'short', eyes: 'dot', mouth: 'none', cheeks: 'plain', face: 'bare', glasses: null, legs: 0x2C3A47, shoes: 0x3A2E28,
    skirt: null, height: 1, winter: 'hood', spring: 'cap', summer: 'shades', fall: 'bobble', fur: 0xF8FAFC, winterC: KNITS[0],
    springC: CAPS[n % CAPS.length], summerC: KNITS[0], fallC: KNITS[(n + 2) % KNITS.length], scarfC: KNITS[(n + 4) % KNITS.length],
    hat: 'top', hatC: 0x1B2430, neck: 'bow', neckC: 0xC0392B,
  };
}
