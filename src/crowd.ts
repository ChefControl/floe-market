// The Undertow's locals (stage 3): the fish who fill the club of an evening, there to make it feel alive. None of them
// has a word for you (the regulars and the Family do the talking). A dozen in the audience at the little tables fanned
// round the stage, in twos and threes, watching the show, nodding along on the beat, now and then a sip of their drink
// or a word with whoever they're with, and a round of applause at the end of each time through the tune; pairs in the
// booths round the walls, talking across their tables, taking turns; three on the bar stools; two talking at the high
// table by the bar; two couples dancing slowly on the dance floor in front of the band; and a shrimp of
// a waiter in a white jacket doing the rounds with a tray, from the bar to the tables and the booths and back. Built like the Family (family.ts),
// each from one of a few fish heads in its own colours, and each figure's still parts merged into a few meshes.
import { CylinderGeometry, Group, MeshLambertMaterial, type Object3D, TorusGeometry } from 'three';
import { groove } from './band';
import { CY, parts } from './cellar';
import { AUDIENCE_CHAIRS, BAR_STOOLS, BOOTH_SEATS, CHAT, DANCERS, STAGE, WAITER_ROUND } from './cellarPlan';
import { Hood, settle } from './family';
import { eye } from './regulars';
import { G, mesh } from './render';

const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };
const glowing = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive });
const DRINK = glowing(0xE8A83A, 0x5A3200), WINE = glowing(0xB8324A, 0x3A0812);

// ---------- their heads ----------
type Shape = 'round' | 'long' | 'tall' | 'flat' | 'clown' | 'spiky';
interface Fish {
  shape: Shape; skin: number; belly: number; fin: number; iris?: number; lid?: number;
  coat: number; lapel: number; shirt: number;
  hat?: 'fedora' | 'cloche' | 'cap'; hatColor?: number; band?: number;
  pearls?: boolean; monocle?: boolean; stripes?: number; lips?: number;
}
/** A stripe round a fish's head (`r` round `at`, its radii), `d` from its middle along its length and `w` wide, tipped
 *  forward `tilt`: a slice of the head's own shape, a shade bigger, so it hugs the head instead of standing out of it
 *  like a card; with `arch`, only over the top (a stripe across the back). */
function band(h: Object3D, c: number, at: readonly number[], r: readonly number[], d: number, w: number, tilt = 0, arch = false) {
  const slice = (z: number) => Math.sqrt(Math.max(0.04, 1 - (z / r[2]) ** 2)) * 1.03;
  const geo = new CylinderGeometry(slice(d + w / 2), slice(d - w / 2), 1, 16, 1, false, arch ? Math.PI / 2 : 0, arch ? Math.PI : Math.PI * 2);
  const b = put(h, mesh(geo, c, at[0], at[1] - d * Math.sin(tilt), at[2] + d * Math.cos(tilt)));
  b.scale.set(r[0], w, r[1]); b.rotation.x = Math.PI / 2 + tilt;
  return b;
}
/** One of the locals: a Hood in its coat, and a fish's head on it, `f`'s shape and colours, its hat and its trimmings. */
function local(f: Fish) {
  const g = new Hood({ coat: f.coat, lapel: f.lapel, shirt: f.shirt, hand: f.skin }), h = g.head;
  const eyes = (x: number, y: number, z: number, r: number) => { for (const sx of [-1, 1]) eye(h, sx * x, y, z, r, { skin: f.skin, white: 0xF2EEE2, iris: f.iris ?? 0x2A2A2E, lid: f.lid ?? -0.1 }); };
  const fin = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0) => { const c = put(h, mesh(G.cone, f.fin, x, y, z)); c.scale.set(sx, sy, sz); c.rotation.x = rx; return c; };
  let top = 0.38;
  if (f.shape === 'round' || f.shape === 'clown') {
    put(h, mesh(G.sphere, f.skin, 0, 0.2, 0.02, true)).scale.set(0.2, 0.2, 0.21);
    put(h, mesh(G.sphere, f.belly, 0, 0.12, 0.08)).scale.set(0.15, 0.1, 0.15);
    eyes(0.1, 0.25, 0.15, 0.05);
    const lip = put(h, mesh(new TorusGeometry(0.04, 0.018, 6, 12), f.lips ?? f.fin, 0, 0.14, 0.215)); lip.scale.set(1, 0.8, 1);
    fin(0, 0.42, -0.05, 0.02, 0.1, 0.12, -0.5);
    if (f.shape === 'clown') for (const d of [0.1, -0.1]) band(h, 0xF6F2EA, [0, 0.2, 0.02], [0.2, 0.2, 0.21], d, 0.06, 0.15);
  } else if (f.shape === 'long') {
    put(h, mesh(G.sphere, f.skin, 0, 0.2, 0.06, true)).scale.set(0.15, 0.16, 0.27);
    put(h, mesh(G.sphere, f.belly, 0, 0.12, 0.1)).scale.set(0.12, 0.07, 0.22);
    const snout = put(h, mesh(G.cone, f.skin, 0, 0.18, 0.36)); snout.scale.set(0.07, 0.14, 0.06); snout.rotation.x = Math.PI / 2;
    put(h, mesh(G.box, 0x2A2A30, 0, 0.13, 0.3)).scale.set(0.08, 0.008, 0.09);
    for (let i = 0; i < (f.stripes ?? 0); i++) band(h, f.fin, [0, 0.2, 0.06], [0.15, 0.16, 0.27], -0.2 + i * 0.075, 0.025, 0, true);
    eyes(0.1, 0.24, 0.2, 0.04);
    fin(0, 0.38, -0.05, 0.02, 0.12, 0.16, -0.6);
    top = 0.33;
  } else if (f.shape === 'tall' || f.shape === 'spiky') {
    put(h, mesh(G.sphere, f.skin, 0, 0.22, 0.03, true)).scale.set(0.13, 0.24, 0.2);
    for (let i = 0; i < (f.stripes ?? 0); i++) band(h, f.fin, [0, 0.22, 0.03], [0.13, 0.24, 0.2], -0.15 + i * 0.09, 0.03);
    eyes(0.08, 0.27, 0.15, 0.045);
    put(h, mesh(G.sphere, f.lips ?? 0x2A2A30, 0, 0.12, 0.21)).scale.set(0.035, 0.02, 0.015);
    if (f.shape === 'spiky') for (let i = 0; i < 5; i++) fin(0, 0.44 + (i % 2) * 0.03, -0.12 + i * 0.06, 0.012, 0.2, 0.012, -0.35 + i * 0.12);
    else { fin(0, 0.52, -0.06, 0.018, 0.22, 0.1, -0.5); fin(0, -0.02, -0.06, 0.018, 0.18, 0.08, Math.PI + 0.5); }
    top = 0.44;
  } else {
    // a flatfish: wide and low, both eyes up on top on one side, a crooked mouth
    put(h, mesh(G.sphere, f.skin, 0, 0.16, 0.03, true)).scale.set(0.27, 0.11, 0.22);
    for (const [x, z] of [[-0.15, 0.06], [0.12, -0.08], [0.02, 0.1], [0.18, 0.08]]) put(h, mesh(G.sphere, f.fin, x, 0.255, z)).scale.set(0.03, 0.01, 0.03);
    for (const [x, z] of [[-0.03, 0.12], [0.09, 0.08]]) eye(h, x, 0.26, z, 0.04, { skin: f.skin, white: 0xF2EEE2, iris: f.iris ?? 0x6A5A2A, lid: -0.4 });
    const m = put(h, mesh(G.box, 0x3A2E24, -0.08, 0.12, 0.23)); m.scale.set(0.1, 0.01, 0.01); m.rotation.z = 0.25;
    top = 0.27;
  }
  if (f.hat === 'fedora') {
    const hat = put(h, new Group()); hat.position.set(0, top, -0.01); hat.rotation.set(-0.08, 0, 0.06);
    put(hat, mesh(new CylinderGeometry(0.13, 0.15, 0.12, 16), f.hatColor ?? 0x2A2A30, 0, 0.06, 0));
    put(hat, mesh(new CylinderGeometry(0.25, 0.25, 0.014, 20), f.hatColor ?? 0x2A2A30, 0, 0, 0));
    put(hat, mesh(new CylinderGeometry(0.152, 0.152, 0.025, 16), f.band ?? 0x8E1E2E, 0, 0.018, 0));
  } else if (f.hat === 'cloche') {
    const hat = put(h, new Group()); hat.position.set(0, top - 0.06, -0.01); hat.rotation.set(-0.15, 0, 0);
    put(hat, mesh(G.sphere, f.hatColor ?? 0x6A1E3A, 0, 0.02, 0)).scale.set(0.19, 0.12, 0.2);
    put(hat, mesh(new CylinderGeometry(0.21, 0.23, 0.02, 18), f.hatColor ?? 0x6A1E3A, 0, -0.04, 0.01));
    put(hat, mesh(G.sphere, f.band ?? 0xF2E2B0, 0.13, 0.04, 0.08)).scale.set(0.03, 0.03, 0.02);
  } else if (f.hat === 'cap') {
    const hat = put(h, new Group()); hat.position.set(0, top - 0.02, 0.02); hat.rotation.set(-0.12, 0, 0);
    put(hat, mesh(G.sphere, f.hatColor ?? 0x5A4E3A, 0, 0.02, -0.02)).scale.set(0.18, 0.06, 0.2);
    put(hat, mesh(G.box, f.hatColor ?? 0x5A4E3A, 0, 0.0, 0.17)).scale.set(0.2, 0.015, 0.12);
  }
  if (f.pearls) for (let i = 0; i < 9; i++) { const a = -1.2 + 2.4 * i / 8; put(g.body, mesh(G.sphere, 0xF4F0E4, Math.sin(a) * 0.17, 0.9 - Math.cos(a) * 0.05, 0.12 + Math.cos(a) * 0.1)).scale.setScalar(0.022); }
  if (f.monocle) { const m = put(h, mesh(new TorusGeometry(0.05, 0.007, 5, 16), 0xC9A23A, 0.1, f.shape === 'long' ? 0.24 : 0.25, 0.2)); m.rotation.y = 0.3; }
  return g;
}

/** A shrimp of a waiter: a long pink head curling forward to a spike, its shell in bands, eyes on stalks, long feelers
 *  swept back; a short white jacket and a black bow tie, a tray of drinks held up on one hand. */
function shrimp() {
  const PINK = 0xF08A6A, PALE = 0xF8C8B0, g = new Hood({ coat: 0xF2EEE6, lapel: 0xDCD6CA, shirt: 0xF2EEE6, hand: PINK }), h = g.head;
  put(g.body, mesh(G.sphere, 0x111114, -0.04, 0.88, 0.235)).scale.set(0.04, 0.025, 0.02);
  put(g.body, mesh(G.sphere, 0x111114, 0.04, 0.88, 0.235)).scale.set(0.04, 0.025, 0.02);
  for (let i = 0; i < 4; i++) put(h, mesh(G.sphere, i % 2 ? PINK : PALE, 0, 0.12 + i * 0.07, 0.04 - i * 0.03, true)).scale.set(0.16 - i * 0.015, 0.06, 0.18 - i * 0.02);
  const spike = put(h, mesh(G.cone, PINK, 0, 0.36, 0.2)); spike.scale.set(0.02, 0.2, 0.02); spike.rotation.x = 1.3;
  for (const sx of [-1, 1]) {
    const stalk = put(h, mesh(G.cyl, PINK, sx * 0.07, 0.36, 0.1)); stalk.scale.set(0.012, 0.08, 0.012);
    put(h, mesh(G.sphere, 0x111114, sx * 0.07, 0.41, 0.11)).scale.setScalar(0.028);
    const feeler = put(h, mesh(G.cyl, PINK, sx * 0.06, 0.55, -0.15)); feeler.scale.set(0.005, 0.5, 0.005); feeler.rotation.set(-0.9, 0, -sx * 0.25);
  }
  const tray = put(g.arms[0], new Group()); tray.position.set(0, -0.4, 0.02);
  put(tray, mesh(new CylinderGeometry(0.17, 0.17, 0.015, 20), 0xC9CDD2, 0, 0, 0));
  put(tray, mesh(new CylinderGeometry(0.03, 0.025, 0.09, 10), DRINK, 0.06, 0.05, 0.03));
  put(tray, mesh(new CylinderGeometry(0.03, 0.025, 0.09, 10), WINE, -0.05, 0.05, -0.04));
  return { g, tray };
}

/** A drink in a hand: on the hand at the end of arm `a`. */
const holding = (a: Group, mat: MeshLambertMaterial) => put(a, mesh(new CylinderGeometry(0.03, 0.025, 0.09, 10), mat, 0, -0.42, 0.04));

// ---------- who's in ----------
/** Their colours: a fish's skin, belly and fins. */
const KIND = {
  goldfish: [0xF29A3A, 0xF8D08A, 0xE0602A], mackerel: [0x5A7A9A, 0xD8E0E8, 0x2A3A4E], angel: [0xE8E2C0, 0xF4F0E0, 0x1E1E22],
  carp: [0xB89A5A, 0xE0CC98, 0x8A6A34], flounder: [0x9A8A6A, 0xD8CCA8, 0x6A5A3E], tuna: [0x2E3E5E, 0xC8D0D8, 0xE8C43A],
  betta: [0x8A2A6A, 0xC85A9A, 0x5A1A8A], snapper: [0xD8604A, 0xF0A890, 0xA83A2A], herring: [0xB8C4CC, 0xE8EEF2, 0x4E7A8E],
  cod: [0x7A8A5A, 0xC8CCA0, 0x4E5A34], parrot: [0x3AB8A0, 0xA8E8D8, 0x2A7A9A], tang: [0x2A5AC8, 0x8AB0F0, 0xF2C83A],
  yellow: [0xF2D03A, 0xF8E890, 0xC8A020], wrasse: [0x6AC86A, 0xC8F0C0, 0x2A6A3A], clown: [0xF07A2A, 0xF8B070, 0x1E1E22],
} as const;
/** Their clothes: coat, lapels, shirt. */
const DRESS = {
  plum: [0x7A1E3A, 0x5A1028, 0xF2E2D0], charcoal: [0x2E3440, 0x22272F, 0xE8E2D4], teal: [0x2A4A5A, 0x1E3844, 0xF2EEE2],
  tweed: [0x4A3A2A, 0x3A2C1E, 0xE8E0CC], navy: [0x1E2A3A, 0x141C28, 0xF2EEE2], moss: [0x3A4A3A, 0x2A382A, 0xE8E2D0],
  black: [0x1A1A20, 0x0E0E12, 0xF2EEE2], violet: [0x2A1A3A, 0x1E1028, 0xE8D8E8], camel: [0x8A6A44, 0x6A5034, 0xF2E8D8],
  wine: [0x5A1A24, 0x401018, 0xF2E2D0], cream: [0xE8E0CC, 0xCFC6B0, 0x3A2A2A],
} as const;
const fish = (shape: Shape, kind: keyof typeof KIND, dress: keyof typeof DRESS, more: Partial<Fish> = {}): Fish => {
  const [skin, belly, fin] = KIND[kind], [coat, lapel, shirt] = DRESS[dress];
  return { shape, skin, belly, fin, coat, lapel, shirt, ...more };
};
/** Someone sat down: who they look at (the stage, or whoever they're with), how often they drink, how much they nod,
 *  whether they clap at the end of the tune; and, if they're with someone, who, and when it's their turn to talk. */
interface Sitter { g: Hood; sip: number; every: number; nod: number; claps: boolean; watch: { x: number; z: number } | null; mate?: Hood; turn: number }
const sitters: Sitter[] = [];
const watchStage = { x: STAGE.x, z: STAGE.z + 0.3 };
const seat = (f: Fish, at: { x: number; z: number; face: number }, h: number, drink: MeshLambertMaterial, o: Partial<Sitter> = {}) => {
  const g = local(f).sit(h);
  g.position.set(at.x, CY, at.z); g.rotation.y = at.face;
  holding(g.arms[1], drink);
  settle(g); parts.den.add(g);
  const n = sitters.length;
  const s: Sitter = { g, sip: 2 + (n * 2.9) % 9, every: 8 + (n * 2.3) % 7, nod: [0.08, 0.05, 0.1, 0.03, 0.09, 0.06, 0.07, 0.04][n % 8], claps: true, watch: null, turn: (n * 3.7) % 11, ...o };
  sitters.push(s);
  return s;
};
// (the audience, at the tables fanned round the stage: who sits where, chair by chair; the rest of the chairs empty)
const AUDIENCE_FISH: (Fish | null)[] = [
  fish('round', 'goldfish', 'plum', { hat: 'cloche', hatColor: 0x8E1E2E, pearls: true, lips: 0xD8402A }), fish('long', 'mackerel', 'charcoal', { stripes: 4, hat: 'fedora', hatColor: 0x3A3E46 }),
  null, fish('tall', 'angel', 'teal', { stripes: 3, pearls: true, lips: 0xC8324A }),
  fish('round', 'carp', 'tweed', { hat: 'cap', monocle: true }), fish('clown', 'clown', 'navy', { lips: 0xD85A1A }),
  fish('tall', 'betta', 'violet', { hat: 'cloche', hatColor: 0x1E1028, band: 0xE8C43A, lips: 0xE8486A }), fish('long', 'tuna', 'black', { stripes: 2, hat: 'fedora', hatColor: 0x6A6E74, band: 0x1A1A20 }),
  fish('flat', 'flounder', 'moss', { iris: 0x2A6A3A }), null, fish('round', 'snapper', 'charcoal', { hat: 'fedora' }),
  null, fish('round', 'yellow', 'camel', { hat: 'cloche', hatColor: 0x3A6A8A, pearls: true }), null,
  fish('long', 'tang', 'wine', { stripes: 0, hat: 'fedora', hatColor: 0x2A2A30, band: 0xC9A23A }), fish('tall', 'wrasse', 'cream', { stripes: 2, lips: 0xC8324A }), fish('round', 'cod', 'tweed', { hat: 'cap', hatColor: 0x5A4E3A }),
];
const audience: Sitter[] = [];
AUDIENCE_FISH.forEach((f, i) => { if (f) audience.push(seat(f, AUDIENCE_CHAIRS[i], 0.47, i % 3 === 1 ? WINE : DRINK, { watch: watchStage })); });
// (those sat at the same table are together: now and then one turns to the other for a word)
for (const a of audience) {
  const mate = audience.filter(b => b !== a).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0];
  if (mate && mate.g.position.distanceTo(a.g.position) < 1.1) a.mate = mate.g;
}
// (in the booths round the walls, facing each other across their tables, talking; the first booth's Doc Murk's)
const BOOTH_FISH: [Fish | null, Fish | null][] = [
  [null, null],
  [fish('long', 'herring', 'camel', { hat: 'cap', hatColor: 0x3A3430 }), fish('round', 'parrot', 'wine', { hat: 'cloche', hatColor: 0x2A5A6A, pearls: true, lips: 0xE87A9A })],
  [fish('tall', 'angel', 'black', { stripes: 3, hat: 'fedora', hatColor: 0x1A1A20 }), fish('round', 'goldfish', 'teal', { pearls: true, lips: 0xD8402A })],
  [fish('flat', 'flounder', 'charcoal', {}), null],
  [fish('long', 'mackerel', 'navy', { stripes: 3, monocle: true }), fish('tall', 'betta', 'plum', { hat: 'cloche', hatColor: 0x5A1A8A, lips: 0xE8486A })],
];
BOOTH_FISH.forEach((pair, b) => {
  const placed = pair.map((f, n) => (f ? seat(f, BOOTH_SEATS[b][n], 0.51, n ? WINE : DRINK, { claps: false }) : null));
  if (placed[0] && placed[1]) { placed[0].mate = placed[1].g; placed[1].mate = placed[0].g; placed[1].turn = placed[0].turn + 4; }
});
// (three at the bar, sat on the stools either side of where you order, their backs to the room)
const BAR_FISH: [number, Fish][] = [
  [0, fish('long', 'herring', 'tweed', { stripes: 0, hat: 'cap', hatColor: 0x3A3430 })],
  [1, fish('round', 'cod', 'violet', { hat: 'fedora', hatColor: 0x4A3A2A })],
  [4, fish('round', 'snapper', 'moss', { hat: 'cap', hatColor: 0x2A3A2A })],
];
const bar = BAR_FISH.map(([i, f]) => seat(f, { ...BAR_STOOLS[i], face: Math.PI }, 0.85, DRINK, { claps: false, nod: 0.05 }));

// (the two at the high table by the bar: a barracuda and a parrotfish, taking turns)
const talkers = [
  local(fish('long', 'herring', 'tweed', { stripes: 3, hat: 'fedora', hatColor: 0x22262C, band: 0xC9A23A })),
  local(fish('round', 'parrot', 'plum', { hat: 'cloche', hatColor: 0x2A5A6A, pearls: true, lips: 0xE87A9A })),
];
talkers.forEach((g, n) => {
  const at = n ? CHAT.b : CHAT.a;
  g.position.set(at.x, CY, at.z); g.rotation.y = at.face;
  holding(g.arms[0], n ? WINE : DRINK);
  settle(g); parts.den.add(g);
});

// (two couples on the dance floor in front of the band: a lionfish in red with a sailfish in a white dinner jacket, and
// a goldfish in green with a tuna in a dark suit)
const dancers = [
  local({ shape: 'spiky', skin: 0xF2E2D0, belly: 0xF8F0E4, fin: 0xC83A2A, stripes: 4, coat: 0xA81E2E, lapel: 0x7A1020, shirt: 0xF2E2D0, lips: 0xC8243A, pearls: true }),
  local({ shape: 'long', skin: 0x2A4A8A, belly: 0xD0D8E8, fin: 0x1A2A5A, stripes: 0, coat: 0xF2EEE6, lapel: 0xDCD6CA, shirt: 0x1A1A20 }),
  local(fish('round', 'goldfish', 'moss', { hat: 'cloche', hatColor: 0x1E3A2E, band: 0xE8C43A, lips: 0xD8402A })),
  local(fish('long', 'tuna', 'charcoal', { stripes: 2, hat: 'fedora', hatColor: 0x22262C })),
];
for (const g of dancers) { settle(g); parts.den.add(g); }

// (the waiter)
const waiter = shrimp();
settle(waiter.g, true);
waiter.g.position.set(WAITER_ROUND[0].x, CY, WAITER_ROUND[0].z);
parts.den.add(waiter.g);
waiter.g.arms[0].rotation.set(-1.45, 0, 0.2);
let leg = 0, next = 1, pause = 0;

/** Everyone, for the tests. */
export const crowd = { audience: audience.map(s => s.g), booths: sitters.filter(s => !s.claps && !bar.includes(s)).map(s => s.g), bar: bar.map(s => s.g), talkers, dancers, waiter: waiter.g };

let t = 0, clap = 0, lastBar = 0, turn = 0;
/** The locals, every frame (once the club's found). */
export function updCrowd(dt: number) {
  t += dt;
  // the end of the tune, each time round: a round of applause from the audience
  if (lastBar === 15 && groove.bar === 0) clap = 2.6;
  lastBar = groove.bar;
  clap = Math.max(0, clap - dt);
  for (const s of sitters) {
    // a word with whoever they're with now and then (the booths, all the time, taking turns)
    const cycle = s.watch ? 14 : 8, into = (t + s.turn) % cycle, talking = !!s.mate && into < (s.watch ? 2.2 : 3.6);
    s.g.watch = talking ? s.mate!.position : s.watch;
    s.g.talking = talking;
    if (talking && Math.floor((t + s.turn) * 4) !== Math.floor((t + s.turn - dt) * 4)) s.g.syllable();
    s.g.update(dt);
    s.g.head.rotation.x += groove.beat * s.nod;
    s.sip -= dt;
    if (s.sip < -1.6) s.sip += s.every;
    const sip = s.sip < 0 ? Math.sin(Math.PI * -s.sip / 1.6) : 0;
    if (s.claps && clap > 0) {
      const k = Math.min(1, clap / 0.4, (2.6 - clap) / 0.25), open = Math.abs(Math.sin(t * 17));
      for (const [i, a] of s.g.arms.entries()) { const sd = i ? 1 : -1; a.rotation.set(-0.5 - k * 0.75, 0, -sd * k * (0.3 + 0.25 * open)); }
    } else {
      s.g.arms[0].rotation.set(talking ? -0.9 + Math.sin(t * 3.3) * 0.25 : -0.45, 0, 0.05);
      s.g.arms[1].rotation.set(-0.45 - sip * 1.6, 0, -0.05 - sip * 0.35);
    }
  }
  // the two at the high table: one talking a while, hands going, the other nodding, then the other way about
  const who = Math.floor(t / 4.5) % 2;
  talkers.forEach((g, n) => {
    const on = n === who;
    g.talking = on;
    if (on && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) g.syllable();
    g.update(dt);
    if (!on) g.head.rotation.x += Math.max(0, Math.sin(t * 2.4)) * 0.06;
    g.arms[1].rotation.set(on ? -0.9 + Math.sin(t * 3.1 + n) * 0.3 : -0.25, 0, on ? -0.25 + Math.sin(t * 2.3) * 0.15 : -0.05);
    g.arms[0].rotation.set(-0.7, 0, 0.15);
  });
  // the dancers: round and round, slowly, facing each other, swaying with the music
  turn += dt * 0.35;
  dancers.forEach((g, n) => {
    const at = DANCERS[n >> 1], a = turn * (n >> 1 ? -1 : 1) + (n & 1) * Math.PI, x = at.x + Math.sin(a) * 0.3, z = at.z + Math.cos(a) * 0.3;
    g.position.set(x, CY, z); g.rotation.y = a + Math.PI;
    g.update(dt);
    g.body.rotation.z = groove.sway * 0.07;
    g.head.rotation.x += groove.beat * 0.03;
    for (const [i, arm] of g.arms.entries()) arm.rotation.set(-1.2 + (i === (n & 1) ? -0.25 : 0), 0, (i ? -1 : 1) * 0.35);
    for (const [i, l] of g.legs.entries()) l.rotation.x = Math.sin(t * 2.2 + i * Math.PI) * 0.12;
  });
  // the waiter: from the bar round the tables and the booths, a pause at each
  const w = waiter.g, to = WAITER_ROUND[next], dx = to.x - w.position.x, dz = to.z - w.position.z, d = Math.hypot(dx, dz);
  if (pause > 0) { pause -= dt; leg *= 0.8; }
  else if (d < 0.05) { pause = WAITER_ROUND[next].stop ? 1.6 : 0.3; next = (next + 1) % WAITER_ROUND.length; }
  else {
    const step = Math.min(d, 0.85 * dt);
    w.position.x += dx / d * step; w.position.z += dz / d * step;
    let turnTo = Math.atan2(dx, dz) - w.rotation.y; turnTo = Math.atan2(Math.sin(turnTo), Math.cos(turnTo));
    w.rotation.y += turnTo * Math.min(1, dt * 8);
    leg += dt * 7;
  }
  w.update(dt);
  w.legs.forEach((l, i) => { l.rotation.x = Math.sin(leg + i * Math.PI) * 0.45 * (pause > 0 ? 0 : 1); });
  w.arms[1].rotation.x = -Math.sin(leg + Math.PI) * 0.3 * (pause > 0 ? 0 : 1);
}
