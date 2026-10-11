// The casino harbor's props on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are:
// rounded, with the small details Low leaves out (lantern glass, a scalloped awning, crate slats and barrel hoops, bottle
// necks, padded armrests). Each keeps its Low version's place and size, so High adds detail without moving anything.
// Each builds about its own origin; casino.ts, casinoSalon.ts and the tables put them in place beside their Low
// versions. Call these inside `quietly` (kit.ts), so building them never touches the game's luck.
import { Group, type Material, type Matrix4, Mesh, type Object3D, TorusGeometry } from 'three';
import { Build, detail, dice, K, pack, quietly, rbox, seasonLayer, shade, tube } from './kit';
import { C } from './palette';

/** What a prop is made of: the shapes that cast shadows, small trims that don't, lit glass, and winter's snow. */
export interface Lit { body: Build; trim: Build; glow: Build; snow: Build }
export const lit = (): Lit => ({ body: new Build(), trim: new Build(), glow: new Build(), snow: new Build() });
/** Adds one Lit's builds to another's, moved by `m`. */
export function place(to: Lit, from: Lit, m: Matrix4) {
  to.body.addAll(from.body, m); to.trim.addAll(from.trim, m); to.glow.addAll(from.glow, m); to.snow.addAll(from.snow, m);
}

const IRON = 0x2B2F33, LAMP = 0x234238, GOLD = 0xE3B23C, RED = 0xB0283A, CREAM = 0xFFF8EC, BOOTH = 0xF4EFE6;
const WINE = 0x8E1F2F, TEAK = 0xA8693F, CHROME = 0xC0C6CC, LEATHER = 0x5A1420, SNOW = C.snow;

// ---------- the quay ----------
/** A mooring bollard standing on the kerb (the kerb's top 0.09 up): an iron post on a base ring, flaring to a mushroom
 *  cap where Low's cap is, so the mooring ropes still meet it. */
export function quayBollard(): Lit {
  const L = lit();
  L.body.add(tube(0.16, 0.17, 0.04, 10), shade(IRON, 0.85), 0, 0.11, 0);
  L.body.add(tube(0.1, 0.13, 0.32, 10), IRON, 0, 0.29, 0);
  L.body.add(K.ball, IRON, 0, 0.45, 0, null, [0.18, 0.07, 0.18]);
  L.trim.add(K.ring, shade(IRON, 1.3), 0, 0.38, 0, [Math.PI / 2, 0, 0], [0.105, 0.105, 0.3]);
  L.snow.add(K.dome, SNOW, 0, 0.5, 0, null, [0.16, 0.05, 0.16]);
  return L;
}

/** A lamp post on the quay, its foot at 0: a stepped base, a slim post with collars, and a lantern of four lit panes
 *  between corner posts under a pyramid roof and a finial, where Low's lantern glows. */
export function quayLamp(): Lit {
  const L = lit();
  L.body.add(rbox(0.3, 0.1, 0.3, 0.03), LAMP, 0, 0.05, 0);
  L.body.add(tube(0.09, 0.14, 0.2, 8), LAMP, 0, 0.2, 0);
  L.body.add(tube(0.05, 0.065, 2.2, 8), LAMP, 0, 1.4, 0);
  for (const y of [0.36, 2.44]) L.trim.add(K.ring, shade(LAMP, 1.3), 0, y, 0, [Math.PI / 2, 0, 0], [0.07, 0.07, 0.3]);
  L.body.add(rbox(0.32, 0.04, 0.32, 0.015), LAMP, 0, 2.53, 0);
  L.glow.add(rbox(0.24, 0.3, 0.24, 0.02), 0, 0, 2.7, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.trim.add(rbox(0.03, 0.32, 0.03, 0.01), LAMP, sx * 0.13, 2.7, sz * 0.13);
  L.body.add(tube(0.02, 0.22, 0.18, 4), LAMP, 0, 2.95, 0, [0, Math.PI / 4, 0]);
  L.trim.add(K.dot, GOLD, 0, 3.07, 0, null, 0.035);
  L.snow.add(K.dome, SNOW, 0, 2.97, 0, null, [0.17, 0.07, 0.17]);
  return L;
}

/** The ticket booth, `w` by `d`, its window towards -z: a rounded white kiosk on a plinth, a framed window over a red
 *  counter on brackets, a striped awning with a scalloped edge, and the board its TICKETS sign hangs on. */
export function ticketBooth(w: number, d: number): Lit {
  const L = lit(), front = -d / 2;
  L.body.add(rbox(w + 0.06, 0.1, d + 0.06, 0.03), shade(BOOTH, 0.82), 0, 0.05, 0);
  L.body.add(rbox(w, 1.5, d, 0.05), BOOTH, 0, 0.75, 0);
  L.body.add(rbox(w - 0.3, 0.6, 0.04, 0.01), 0x2A3F4C, 0, 1.05, front - 0.01);
  for (const [sx, sy, x, y] of [[w - 0.22, 0.05, 0, 1.37], [w - 0.22, 0.05, 0, 0.73], [0.05, 0.66, -(w - 0.27) / 2, 1.05], [0.05, 0.66, (w - 0.27) / 2, 1.05]]) {
    L.trim.add(rbox(sx, sy, 0.05, 0.015), 0xFFFFFF, x, y, front - 0.02);
  }
  L.body.add(rbox(w + 0.1, 0.08, 0.4, 0.02), RED, 0, 0.7, front - 0.15);
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) L.trim.add(rbox(0.04, 0.2, 0.18, 0.01), shade(RED, 0.75), x, 0.57, front - 0.08);
  for (let i = 0; i < 6; i++) L.body.add(rbox(0.22, 0.12, d + 0.3, 0.03), i % 2 ? CREAM : RED, -w / 2 + 0.11 + i * 0.22, 1.62, 0);
  for (let i = 0; i < 12; i++) L.trim.add(K.ball, Math.floor(i / 2) % 2 ? CREAM : RED, -w / 2 + 0.055 + i * 0.11, 1.55, -(d + 0.3) / 2, null, [0.06, 0.05, 0.03]);
  L.body.add(rbox(w + 0.1, 0.34, 0.06, 0.02), WINE, 0, 1.86, front - 0.12);
  L.trim.add(rbox(w + 0.16, 0.04, 0.07, 0.01), GOLD, 0, 2.04, front - 0.12);
  L.snow.add(rbox(w + 0.12, 0.05, d + 0.28, 0.025), SNOW, 0, 1.7, 0);
  return L;
}

/** A wooden crate `s` on a side, its middle `s/2` up: boards with darker slats round the edges and a brace across
 *  the front. */
function crate(b: Build, snow: Build, s: number, x: number, y: number, z: number) {
  const wood = 0xB7834F, slat = shade(wood, 0.78), t = 0.045;
  b.add(rbox(s - 0.02, s - 0.02, s - 0.02, 0.015), wood, x, y, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(rbox(t, s, t, 0.012), slat, x + sx * (s / 2 - t / 2), y, z + sz * (s / 2 - t / 2));
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) b.add(rbox(s, t, t, 0.012), slat, x, y + sy * (s / 2 - t / 2), z + sz * (s / 2 - t / 2));
  for (const sz of [-1, 1]) b.add(rbox(s * 1.25, t, 0.02, 0.008), slat, x, y, z + sz * (s / 2 + 0.005), [0, 0, Math.PI / 4]);
  snow.add(rbox(s - 0.04, 0.04, s - 0.04, 0.02), SNOW, x, y + s / 2 + 0.02, z);
}
/** A barrel `h` tall, its foot at `y`: bellied staves under two iron hoops each end and a lid. */
function barrel(b: Build, snow: Build, x: number, y: number, z: number, h: number) {
  const wood = 0x7A4E2D, r = 0.22;
  b.add(tube(r * 1.08, r * 0.92, h / 2, 12), wood, x, y + h * 0.75, z);
  b.add(tube(r * 0.92, r * 1.08, h / 2, 12), wood, x, y + h * 0.25, z);
  b.add(tube(r * 0.9, r * 0.9, 0.02, 12), shade(wood, 1.2), x, y + h + 0.01, z);
  for (const k of [0.1, 0.32, 0.68, 0.9]) b.add(K.ring, IRON, x, y + h * k, z, [Math.PI / 2, 0, 0], [r * (k < 0.5 ? 0.98 + k * 0.3 : 1.28 - k * 0.3), r * (k < 0.5 ? 0.98 + k * 0.3 : 1.28 - k * 0.3), 0.25]);
  snow.add(K.dome, SNOW, x, y + h + 0.02, z, null, [r * 0.85, 0.04, r * 0.85]);
}
/** The crates and barrels piled at the quay's west end, where Low's are, about the pile's middle. */
export function cratePile(): Lit {
  const L = lit();
  crate(L.body, L.snow, 0.6, -0.45, 0.3, 0);
  crate(L.body, L.snow, 0.5, 0.2, 0.25, 0.1);
  crate(L.body, L.snow, 0.45, -0.4, 0.8, 0);
  barrel(L.body, L.snow, 0.7, 0, -0.15, 0.64);
  barrel(L.body, L.snow, 0.75, 0, 0.3, 0.64);
  return L;
}

// ---------- the yacht ----------
/** `n` teak treads from (bx, y0) up to (tx, y1), `half` either side of the middle: each rounded, with a gold nosing. */
export function treads(n: number, bx: number, tx: number, y0: number, y1: number, half: number) {
  const b = new Build(), run = (bx - tx) / n;
  for (let i = 0; i < n; i++) {
    const x = bx - (bx - tx) * (i + 0.5) / n, y = y0 + (y1 - y0) * (i + 1) / n - 0.05;
    b.add(rbox(run + 0.02, 0.09, half * 2, 0.02), TEAK, x, y, 0);
    b.add(rbox(0.03, 0.03, half * 2 - 0.04, 0.01), GOLD, x + run / 2 - 0.005, y + 0.035, 0);
  }
  return b;
}
/** The swim platform across the transom, `w` across: teak boards over a frame, and a chrome ladder down into the
 *  water on the quay side. */
export function swimPlatform(w: number) {
  const b = new Build();
  b.add(rbox(0.6, 0.05, w, 0.02), shade(TEAK, 0.75), 0, -0.02, 0);
  for (let i = 0; i < 4; i++) b.add(rbox(0.135, 0.04, w - 0.04, 0.015), TEAK, -0.225 + i * 0.15, 0.025, 0);
  const lz = w / 2 - 0.35;
  for (const dz of [-0.17, 0.17]) {
    b.add(tube(0.018, 0.018, 0.7, 6), CHROME, -0.26, -0.2, lz + dz);
    b.add(tube(0.018, 0.018, 0.36, 6), CHROME, -0.12, 0.2, lz + dz, [0, 0, 0.9]);
  }
  for (const y of [-0.15, -0.35]) b.add(rbox(0.05, 0.03, 0.36, 0.01), CHROME, -0.26, y, lz);
  return b;
}
/** The sunpad on the bow, about its middle on the deck: a white base, a navy cushion with a piped edge, and two
 *  pillows against its forward end. */
export function sunpad(navy: number) {
  const b = new Build();
  b.add(rbox(0.85, 0.22, 1.4, 0.08), 0xFFFFFF, 0, 0.11, 0);
  b.add(rbox(0.78, 0.1, 1.3, 0.05), navy, 0, 0.27, 0);
  b.add(rbox(0.8, 0.02, 1.32, 0.01), shade(navy, 1.35), 0, 0.225, 0);
  for (const z of [-0.3, 0.3]) b.add(rbox(0.16, 0.1, 0.5, 0.05), 0xFFFFFF, 0.28, 0.35, z, [0, 0, 0.35]);
  return b;
}

// ---------- the salon ----------
/** The bar along the stern, in the ship's space, its floor at `y`: a panelled counter under a dark top with a brass
 *  rail and foot rail, the back bar against the wall with shelves of shaped bottles, and padded stools in front.
 *  (Low's mirror and light over the back bar stay, on both.) */
export function bar(x: number, z0: number, z1: number, y: number, backX: number, stoolX: number, stools: number[]) {
  const b = new Build(), wood = 0x5A2E1F, len = z1 - z0, mid = (z0 + z1) / 2, wide = len - 0.2;
  b.add(rbox(0.5, 1.03, len, 0.04), wood, x, y + 0.515, mid);
  for (let z = z0 + 0.45; z < z1 - 0.2; z += 0.75) b.add(rbox(0.02, 0.7, 0.6, 0.02), shade(wood, 1.18), x + 0.255, y + 0.55, z);
  b.add(rbox(0.64, 0.06, len + 0.12, 0.025), 0x2A1410, x, y + 1.08, mid);
  b.add(rbox(0.04, 0.06, len, 0.015), GOLD, x + 0.27, y + 0.3, mid);
  b.add(tube(0.022, 0.022, len, 8), GOLD, x + 0.4, y + 0.18, mid, [Math.PI / 2, 0, 0]);
  b.add(rbox(0.3, 0.9, wide, 0.03), wood, backX, y + 0.45, mid);
  for (const sy of [1.25, 1.75]) b.add(rbox(0.26, 0.04, wide, 0.012), shade(wood, 1.15), backX + 0.02, y + sy, mid);
  const glass = [0x2E7D4F, 0x8E1F2F, 0xC9A24A];
  let n = 0;
  for (const sy of [0.9, 1.27, 1.77]) for (let z = z0 + 0.2; z <= z1 - 0.2; z += 0.22) {
    const c = glass[n++ % 3], tall = n % 2 ? 0.2 : 0.16;
    b.add(tube(0.042, 0.045, tall, 8), c, backX + 0.02, y + sy + 0.02 + tall / 2, z);
    b.add(tube(0.016, 0.03, 0.06, 6), c, backX + 0.02, y + sy + 0.05 + tall, z);
    b.add(tube(0.017, 0.017, 0.03, 6), n % 3 ? GOLD : 0xF4F1EA, backX + 0.02, y + sy + 0.095 + tall, z);
  }
  for (const z of stools) addStool(b, stoolX, y, z);
  return b;
}
/** A bar stool on the floor at `y`: a gold post on a round foot, a foot ring, and a padded wine-red seat. */
function addStool(b: Build, x: number, y: number, z: number) {
  b.add(tube(0.16, 0.18, 0.04, 12), GOLD, x, y + 0.02, z);
  b.add(tube(0.035, 0.045, 0.64, 8), GOLD, x, y + 0.36, z);
  b.add(K.ring, shade(GOLD, 0.85), x, y + 0.3, z, [Math.PI / 2, 0, 0], [0.16, 0.16, 0.18]);
  b.add(tube(0.19, 0.19, 0.04, 12), GOLD, x, y + 0.69, z);
  b.add(K.ball, WINE, x, y + 0.73, z, null, [0.2, 0.07, 0.2]);
}
/** A potted palm, its pot's foot at 0: a gold pot with a rim, a ringed trunk, and arching fronds. */
export function palm() {
  const b = new Build(), green = 0x2F7D3E;
  b.add(tube(0.24, 0.18, 0.42, 12), GOLD, 0, 0.21, 0);
  b.add(K.ring, shade(GOLD, 1.15), 0, 0.42, 0, [Math.PI / 2, 0, 0], [0.24, 0.24, 0.3]);
  b.add(K.dome, 0x4A3222, 0, 0.4, 0, null, [0.21, 0.04, 0.21]);
  for (let i = 0; i < 5; i++) b.add(tube(0.045, 0.055, 0.24, 7), shade(0x7A5634, 1 - i * 0.05), 0, 0.53 + i * 0.22, 0);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, droop = 0.35 + (i % 3) * 0.15;
    b.add(K.ball, shade(green, 0.9 + (i % 3) * 0.08), Math.cos(a) * 0.3, 1.58 - droop * 0.3, Math.sin(a) * 0.3, [0, -a, droop], [0.34, 0.025, 0.09]);
  }
  return b;
}
/** A sun lounger about its middle on the deck, its back up towards -z: a frame on legs, a padded mattress and
 *  backrest, and a towel folded over the foot. */
export function lounger() {
  const b = new Build(), frame = 0x9A9086;
  b.add(rbox(0.56, 0.06, 1.25, 0.02), frame, 0, 0.12, 0.15);
  for (const sx of [-1, 1]) for (const z of [-0.35, 0.65]) b.add(rbox(0.04, 0.1, 0.04, 0.01), shade(frame, 0.8), sx * 0.24, 0.05, z);
  b.add(rbox(0.54, 0.1, 1.0, 0.045), 0xFFFFFF, 0, 0.21, 0.27);
  b.add(rbox(0.54, 0.08, 0.6, 0.04), 0xFFFFFF, 0, 0.44, -0.6, [0.7, 0, 0]);
  b.add(rbox(0.5, 0.035, 0.34, 0.015), RED, 0, 0.275, 0.55);
  return b;
}

/** A velvet rope on two brass posts, the second `dx`, `dz` from the first, their feet at 0: round feet, slim posts and
 *  ball tops where Low's posts are, and the rope hanging in a curve between them just under the tops. */
export function rope(dx: number, dz: number) {
  const b = new Build(), brass = 0xC9962E;
  for (const [x, z] of [[0, 0], [dx, dz]]) {
    b.add(tube(0.11, 0.13, 0.04, 14), brass, x, 0.02, z);
    b.add(tube(0.022, 0.03, 0.84, 8), brass, x, 0.46, z);
    b.add(K.ball, shade(brass, 1.15), x, 0.91, z, null, [0.045, 0.045, 0.045]);
  }
  // an arc of a ring, its middle hanging lowest, turned to run from one post to the other
  const c = Math.hypot(dx, dz), sag = 0.07, r = c * c / (8 * sag) + sag / 2, a = 2 * Math.asin(c / 2 / r);
  b.add(new TorusGeometry(r, 0.022, 5, 10, a), WINE, dx / 2, 0.82 + r * Math.cos(a / 2), dz / 2, [0, -Math.atan2(dz, dx), -Math.PI / 2 - a / 2]);
  return b;
}

// ---------- the tables ----------
/** A padded leather armrest along the blackjack felt's curve, radius `r`, its middle `y` up: half a ring towards +z. */
const armrestArc = quietly(() => new TorusGeometry(1, 0.06, 6, 28, Math.PI));
export function armrest(r: number, y: number) {
  const b = new Build();
  b.add(armrestArc, LEATHER, 0, y, 0, [Math.PI / 2, 0, 0], [r, r, 1]);
  b.add(armrestArc, shade(LEATHER, 1.25), 0, y + 0.03, 0, [Math.PI / 2, 0, 0], [r, r, 0.4]);
  return b;
}
/** The roulette table's base and rim, `w` by `d` round a felt `fw` by `fd` whose top is at `top`: a panelled wooden
 *  cabinet on a plinth, and a padded leather rail round the felt. */
export function rouletteTable(w: number, d: number, fw: number, fd: number, top: number) {
  const b = new Build(), wood = 0x6B3E26, rim = 0x8A5A3B;
  b.add(rbox(w + 0.04, 0.08, d + 0.04, 0.03), shade(wood, 0.8), 0, 0.04, 0);
  b.add(rbox(w, 0.58, d, 0.04), wood, 0, 0.33, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(w - 0.3, 0.36, 0.02, 0.015), shade(wood, 1.15), 0, 0.34, s * (d / 2 + 0.005));
    b.add(rbox(0.02, 0.36, d - 0.3, 0.015), shade(wood, 1.15), s * (w / 2 + 0.005), 0.34, 0);
  }
  b.add(rbox(fw + 0.12, 0.05, fd + 0.12, 0.02), rim, 0, top - 0.03, 0);
  const t = 0.09;
  for (const s of [-1, 1]) {
    b.add(rbox(fw + 0.18, t, t, 0.04), LEATHER, 0, top + 0.02, s * (fd / 2 + 0.04));
    b.add(rbox(t, t, fd + 0.18, 0.04), LEATHER, s * (fw / 2 + 0.04), top + 0.02, 0);
  }
  return b;
}

// ---------- putting them in ----------
/**
 * Puts High's version of something into `to`: `build`'s shapes baked into one mesh (a Lit's into one each for its
 * shapes, its small trims, its lit glass in `glow`, and winter's snow), on dice of their own so that building them
 * never touches the game's luck. It shows on High, and `low` (what Low shows, left exactly as it was) on Low.
 */
export function casinoHigh(to: Object3D, build: () => Lit | Build, low: Object3D[], glow?: Material) {
  const g = quietly(() => {
    const made = build(), g = new Group();
    if (made instanceof Build) g.add(made.mesh());
    else {
      if (!made.body.empty) g.add(made.body.mesh());
      if (!made.trim.empty) g.add(made.trim.mesh(false));
      if (!made.glow.empty && glow) g.add(new Mesh(pack(made.glow.pieces), glow));
      if (!made.snow.empty) g.add(seasonLayer(made.snow.mesh(false), [1, 0, 0, 0]));
    }
    to.add(g);
    return g;
  }, dice(0xCA51));
  for (const o of low) detail(o, null);
  detail(null, g);
  return g;
}
