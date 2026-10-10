// Floe Sushi's props on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are: the
// restaurant's floor, kerb, posts and tiled roof, its paper lanterns and shoji, the red gate, the garden's stone
// lanterns, pines, tea tables and parasols, the serving counter and the waiters' trays. Each builds a `Build` around its
// own foot or middle; hall.ts and garden.ts put them in place beside their Low versions.
// Call these inside `quietly` (kit.ts), so building them never touches the game's luck.
import { type BufferAttribute, LatheGeometry, type Matrix4, type Mesh, Vector2 } from 'three';
import { at, Build, K, quietly, rbox, shade, tube } from './kit';
import { G } from './render';

/** The restaurant's colours, as on Low. */
export const HALL = {
  board: 0x7A4A30, board2: 0x86533A, boardSide: 0x6B4130, stone: 0x9AA4AC, step: 0x8E979E,
  post: 0x6B2E22, beam: 0x4A2418, frame: 0x5B3424, paper: 0xF7F1E3,
  tile: 0x4A5866, tileBed: 0x3B4652, tileDark: 0x2B333B, red: 0xC0392B, ink: 0x2B1A14, cap: 0x1B2430, gold: 0xF2C14E,
};
const SNOW = 0xFFFFFF, END_GRAIN = 0x8A5A3B;

// ---------- the floor ----------
/**
 * The restaurant's floor, `w` wide (along x) and `d` deep, its top at `top`, laid out like the painted floor on Low
 * (world.ts planks, repeated `rx` by `ry`): rows of boards in two shades, a joint per row in each stretch, in the
 * same places as the paint, over a dark frame (like props.ts deckBoards, in the restaurant's darker wood).
 */
export function floorBoards(w: number, d: number, top: number, rx: number, ry: number) {
  const b = new Build(), rows = Math.round(8 * ry), rw = d / rows, span = w / rx, h = 0.08;
  b.add(rbox(w, 0.2, d, 0.02), HALL.boardSide, 0, top - h - 0.08, 0);
  for (let r = 0; r < rows; r++) {
    const z = -d / 2 + rw * (r + 0.5), i = r % 8, joint = (i * 97 + 40) % 256 / 256 * span;
    const cuts = [-w / 2];
    for (let x = -w / 2 + joint; x < w / 2 - 0.05; x += span) if (x > -w / 2 + 0.05) cuts.push(x);
    cuts.push(w / 2);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const len = +(cuts[k + 1] - cuts[k] - 0.03).toFixed(3);
      b.add(rbox(len, h, +(rw - 0.03).toFixed(3), 0.02), i % 2 ? HALL.board : HALL.board2, (cuts[k] + cuts[k + 1]) / 2, top - h / 2, z);
    }
  }
  return b;
}

/**
 * A run of the stone kerb the walls stand on, `w` by `d` (one of them its 0.3 width) and `h` tall, its middle at
 * (x, z): dressed blocks about a metre long with rounded edges, under a capstone course with the same joints.
 */
export function kerb(b: Build, w: number, d: number, h: number, x: number, z: number) {
  const len = Math.max(w, d), t = Math.min(w, d), ry = d > w ? Math.PI / 2 : 0;
  const run = new Build(), n = Math.max(1, Math.round(len / 1.1)), bw = len / n;
  for (let i = 0; i < n; i++) {
    const cx = -len / 2 + bw * (i + 0.5);
    run.add(rbox(+(bw - 0.03).toFixed(3), h - 0.06, t - 0.02, 0.04), HALL.stone, cx, (h - 0.06) / 2, 0);
    run.add(rbox(+(bw - 0.02).toFixed(3), 0.07, t, 0.025), shade(HALL.stone, 1.07), cx, h - 0.035, 0);
  }
  return b.addAll(run, at(x, 0, z, ry));
}

// ---------- posts and beams ----------
/**
 * A post of radius `r` from `y0` up to `top`, standing on a rounded base stone at `stone` (the kerb's top) in a black
 * iron foot, with a square cap block where it meets the beam.
 */
export function post(r: number, y0: number, stone: number, top: number) {
  const b = new Build();
  b.add(rbox(r * 2.7, 0.1, r * 2.7, 0.035), HALL.step, 0, stone + 0.05, 0);
  b.add(tube(r * 1.12, r * 1.15, 0.16, 10), HALL.ink, 0, stone + 0.18, 0);
  b.add(tube(r, r * 1.04, top - 0.12 - y0, 10), HALL.post, 0, (top - 0.12 + y0) / 2, 0);
  b.add(rbox(r * 2.5, 0.12, r * 2.5, 0.03), HALL.beam, 0, top - 0.06, 0);
  b.add(rbox(r * 2.7, 0.025, r * 2.7, 0.01), shade(HALL.beam, 0.75), 0, top - 0.13, 0);
  return b;
}
/** A beam `len` long (along x), its middle at 0: rounded, with its ends standing proud past the corners, end grain out. */
export function beam(len: number, h: number, d: number) {
  const b = new Build().add(rbox(len, h, d, 0.04), HALL.beam, 0, 0, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(0.26, h * 0.78, d * 0.8, 0.04), HALL.beam, s * (len / 2 + 0.11), -0.02, 0);
    b.add(rbox(0.02, h * 0.62, d * 0.62, 0.008), END_GRAIN, s * (len / 2 + 0.245), -0.02, 0);
  }
  return b;
}
/** A bracket arm under a beam, along it, where it rests on a post. */
export const bracket = (len: number) => new Build().add(rbox(len, 0.09, 0.17, 0.03), shade(HALL.beam, 1.15), 0, 0, 0);

// ---------- the roof ----------
/**
 * One slope of tiled roof, `len` long (along x) and `depth` down the slope, in the frame of the Low slab it replaces
 * (0.14 thick, its middle at 0), its eave along +z and its ridge along -z, which runs from `ridge[0]` to `ridge[1]`
 * along x (where it meets the next slopes' ridges). Rows of round tiles, each course overlapping the one below, end
 * tiles along the eave over a wooden fascia, and a capped ridge. `snow` gets the winter cover.
 */
export function roofSlope(len: number, depth: number, ridge: [number, number], snow: Build) {
  const b = new Build(), top = 0.07;
  b.add(rbox(len, 0.14, depth, 0.03), HALL.tileBed, 0, 0, 0);
  b.add(rbox(len + 0.04, 0.12, 0.09, 0.025), HALL.beam, 0, -0.06, depth / 2 - 0.03);
  const rows = Math.round(len / 0.3), pitch = len / rows, run = depth - 0.3, courses = Math.max(1, Math.round(run / 0.42)), cl = run / courses;
  for (let i = 0; i < rows; i++) {
    const x = -len / 2 + pitch * (i + 0.5);
    for (let c = 0; c < courses; c++) {
      // each course a little wider at its foot, lapping over the next one down
      b.add(tube(0.078, 0.064, +(cl + 0.04).toFixed(3), 6, true), HALL.tile, x, top, depth / 2 - run + cl * (c + 0.5), [Math.PI / 2, 0, 0]);
    }
    b.add(tube(0.085, 0.085, 0.05, 6), HALL.tileDark, x, top, depth / 2 + 0.01, [Math.PI / 2, 0, 0]);
  }
  const [r0, r1] = ridge, rl = r1 - r0, rm = (r0 + r1) / 2, rz = -depth / 2 + 0.14;
  b.add(rbox(rl, 0.16, 0.26, 0.04), HALL.tileDark, rm, top + 0.06, rz);
  b.add(tube(0.085, 0.085, rl, 8), HALL.tile, rm, top + 0.15, rz, [0, 0, Math.PI / 2]);
  for (const x of [r0, r1]) b.add(rbox(0.18, 0.3, 0.3, 0.05), HALL.tileDark, x, top + 0.12, rz);
  // winter: snow over the upper slope and along the ridge, leaving the eave's tiles showing
  const sd = depth * 0.62;
  snow.add(rbox(len - 0.3, 0.06, sd, 0.03), SNOW, 0, top + 0.09, -depth / 2 + 0.25 + sd / 2);
  snow.add(tube(0.1, 0.1, rl - 0.1, 8), SNOW, rm, top + 0.2, rz, [0, 0, Math.PI / 2], [1, 1, 0.8]);
  return b;
}
/**
 * Sweeps a slope's eave up towards its two ends (`len` long, `depth` deep, as built by roofSlope), so the roof's
 * corners turn up the way a temple's do. Works on the baked geometry, so tiles and snow bend together.
 */
export function upturn(m: Mesh, len: number, depth: number, lift: number) {
  const p = m.geometry.getAttribute('position') as BufferAttribute, e = Math.min(2.4, len / 3);
  for (let i = 0; i < p.count; i++) {
    const u = Math.min(1, Math.max(0, (Math.abs(p.getX(i)) - (len / 2 - e)) / e));
    const w = Math.min(1, Math.max(0, (p.getZ(i) + depth / 2) / depth));
    if (u > 0) p.setY(i, p.getY(i) + lift * u * u * w * w);
  }
  p.needsUpdate = true;
}
/** An upturned corner tip, sweeping out (along +x) and up from its middle, ending in a curl. */
export function roofTip() {
  const b = new Build(), c = HALL.tileDark;
  let x = -0.42, y = -0.18;
  for (const [a, l, r] of [[0.15, 0.24, 0.085], [0.45, 0.2, 0.075], [0.85, 0.18, 0.065], [1.25, 0.14, 0.055]]) {
    const dx = Math.cos(a) * l, dy = Math.sin(a) * l;
    b.add(tube(r * 0.9, r, l + 0.03, 6), c, x + dx / 2, y + dy / 2, 0, [0, 0, a - Math.PI / 2]);
    x += dx; y += dy;
  }
  b.add(K.ball, c, x, y + 0.02, 0, null, 0.07);
  b.add(K.ring, c, x - 0.04, y + 0.06, 0, null, [0.06, 0.06, 0.6]);
  return b;
}

// ---------- lanterns ----------
/** A paper lantern's body, a ball 1 across with its ribs showing as ridges, open where its caps go. */
const LANTERN = quietly(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = -0.93 + 1.86 * i / 8, r = Math.sqrt(1 - y * y) * (i % 2 ? 0.955 : 1);
    pts.push(new Vector2(Math.max(0.52, r), y));
  }
  return new LatheGeometry(pts, 10);
});
/**
 * A paper lantern of size `s` (as on Low: a body 0.22s round and 0.29s high) at (x, y, z): its ribbed body into
 * `body` (drawn lit), and its black caps, a hoop to hang it by and a tassel into `trim`.
 */
export function chochin(body: Build, trim: Build, s: number, x: number, y: number, z: number, red: boolean) {
  body.add(LANTERN, 0xFFFFFF, x, y, z, null, [0.22 * s, 0.29 * s, 0.22 * s]);
  for (const d of [-1, 1]) trim.add(tube(0.12 * s, 0.125 * s, 0.06 * s, 8), HALL.cap, x, y + d * 0.265 * s, z);
  trim.add(K.ring, HALL.cap, x, y + 0.31 * s, z, null, [0.03 * s, 0.03 * s, 0.6]);
  trim.add(K.post, HALL.ink, x, y - 0.33 * s, z, null, [0.008 * s, 0.07 * s, 0.008 * s]);
  trim.add(tube(0.014 * s, 0.04 * s, 0.13 * s, 6), red ? HALL.gold : HALL.red, x, y - 0.42 * s, z);
  trim.add(K.dot, red ? HALL.gold : HALL.red, x, y - 0.36 * s, z, null, 0.022 * s);
}

// ---------- shoji ----------
/**
 * A run of shoji `len` long (along x), `h` tall and `t` thick, its foot at 0, moved into place by `m`: paper (into
 * `paper`) in a wooden frame of rails and stiles every couple of metres, with a lattice in the same squares the Low
 * wall's paper has painted on it (into `wood`).
 */
export function shoji(paper: Build, wood: Build, len: number, h: number, t: number, m: Matrix4) {
  const p = new Build(), w = new Build(), c = HALL.frame, rail = 0.08, head = 0.06;
  p.add(rbox(len, h, 0.04, 0.01), HALL.paper, 0, h / 2, 0);
  w.add(rbox(len, rail, t, 0.025), c, 0, rail / 2, 0);
  w.add(rbox(len, head, t, 0.02), c, 0, h - head / 2, 0);
  const n = Math.max(1, Math.round(len / 2)), pw = len / n, sw = 0.07;
  for (let i = 0; i <= n; i++) {
    const x = Math.min(len / 2 - sw / 2, Math.max(-len / 2 + sw / 2, -len / 2 + i * pw));
    w.add(rbox(sw, h, t, 0.02), c, x, h / 2, 0);
  }
  const cols = Math.max(2, Math.round(pw / 0.5)), inner = h - rail - head, rows = Math.max(2, Math.round(inner / 0.6));
  for (let i = 0; i < n; i++) {
    for (let k = 1; k < cols; k++) w.add(G.box, c, -len / 2 + i * pw + k * pw / cols, rail + inner / 2, 0, null, [0.025, inner, t * 0.5]);
  }
  for (let r = 1; r < rows; r++) w.add(G.box, c, 0, rail + r * inner / rows, 0, null, [len - 0.04, 0.025, t * 0.5]);
  paper.addAll(p, m);
  wood.addAll(w, m);
}

// ---------- the gate ----------
/**
 * The red gate as a torii, `span` between its posts' middles, its posts' feet at `y0`: tapering posts in black
 * sleeves on base stones, the tie beam (nuki) through them, wedged, the strut over the sign, and the top beam
 * (kasagi) in two layers, red as on Low over a darker red, sweeping up at its ends. Built about the gate's middle;
 * `snow` for winter.
 */
export function torii(span: number, y0: number, snow: Build) {
  const b = new Build(), red = HALL.red, ink = HALL.ink;
  for (const s of [-1, 1]) {
    const x = s * span / 2;
    b.add(rbox(0.62, 0.15, 0.62, 0.05), HALL.step, x, y0 - 0.06, 0);
    b.add(tube(0.19, 0.215, 3.84, 12), red, x, y0 + 1.92, 0);
    b.add(tube(0.235, 0.24, 0.36, 12), ink, x, y0 + 0.18, 0);
    b.add(K.ring, shade(ink, 1.6), x, y0 + 0.37, 0, [Math.PI / 2, 0, 0], [0.23, 0.23, 0.3]);
    // the wedges holding the nuki
    b.add(rbox(0.07, 0.26, 0.33, 0.02), shade(ink, 1.3), x + s * 0.26, y0 + 3.4, 0);
  }
  // the nuki, its ends past the posts
  b.add(rbox(span + 1.05, 0.2, 0.3, 0.04), ink, 0, y0 + 3.4, 0);
  // the strut in the middle, between the nuki and the kasagi
  b.add(rbox(0.32, 0.26, 0.22, 0.03), red, 0, y0 + 3.63, 0);
  // the shimaki (a darker red) and the kasagi over it, in short lengths that rise toward the ends
  b.add(rbox(span + 1.5, 0.2, 0.38, 0.04), shade(red, 0.78), 0, y0 + 3.86, 0);
  const n = 12, w = span + 2.25, sl = w / n, lift = (x: number) => 0.24 * Math.pow(Math.abs(x) / (w / 2), 3);
  for (let i = 0; i < n; i++) {
    const xa = -w / 2 + i * sl, xb = xa + sl, ya = lift(xa), yb = lift(xb), a = Math.atan2(yb - ya, sl);
    b.add(rbox(+(sl + 0.04).toFixed(3), 0.16, 0.46, 0.04), red, (xa + xb) / 2, y0 + 4.04 + (ya + yb) / 2, 0, [0, 0, a]);
    snow.add(rbox(+(sl + 0.03).toFixed(3), 0.05, 0.4, 0.02), SNOW, (xa + xb) / 2, y0 + 4.13 + (ya + yb) / 2, 0, [0, 0, a]);
  }
  return b;
}
/** A board behind a hanging sign (`w` by `h`, facing +z), so it has thickness, and two hooks over it. */
export function signBoard(w: number, h: number) {
  const b = new Build();
  b.add(rbox(w, h, 0.07, 0.03), HALL.ink, 0, 0, -0.045);
  for (const s of [-1, 1]) b.add(K.ring, HALL.gold, s * w * 0.32, h / 2 + 0.02, -0.04, null, [0.035, 0.035, 0.6]);
  return b;
}
/** The rod a noren hangs from, `len` long (along x), with knobs on its ends. */
export function norenRod(len: number) {
  const b = new Build().add(tube(0.03, 0.03, len, 8), HALL.frame, 0, 0, 0, [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) b.add(K.ball, HALL.ink, s * len / 2, 0, 0, null, 0.045);
  return b;
}

// ---------- the garden ----------
/**
 * A stone lantern (tōrō) on the ground, in the Low one's height and footprint: a two-step hexagonal base, the pillar
 * with a band, the platform, the firebox (its lit core into `glow`, framed by stone posts so it shows on every side),
 * the hexagonal roof with its corners curled up, and the jewel on top. `snow` for winter.
 */
export function toro(glow: Build, snow: Build) {
  const b = new Build(), base = 0x9AA4AC, pillar = 0xA7B0B8, roof = 0x8A949C;
  b.add(tube(0.3, 0.34, 0.12, 6), base, 0, 0.06, 0);
  b.add(tube(0.22, 0.27, 0.08, 6), shade(base, 1.05), 0, 0.16, 0);
  b.add(tube(0.13, 0.16, 0.64, 8), pillar, 0, 0.52, 0);
  b.add(K.ring, shade(pillar, 0.9), 0, 0.5, 0, [Math.PI / 2, 0, 0], [0.15, 0.15, 0.4]);
  b.add(tube(0.3, 0.19, 0.16, 6), base, 0, 0.91, 0);
  b.add(rbox(0.55, 0.05, 0.55, 0.02), pillar, 0, 1.015, 0);
  b.add(rbox(0.55, 0.05, 0.55, 0.02), pillar, 0, 1.385, 0);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(rbox(0.1, 0.34, 0.1, 0.02), pillar, dx * 0.225, 1.2, dz * 0.225);
  glow.add(rbox(0.36, 0.33, 0.36, 0.03), 0xFFFFFF, 0, 1.2, 0);
  b.add(tube(0.6, 0.62, 0.06, 6), roof, 0, 1.44, 0);
  b.add(tube(0.13, 0.6, 0.22, 6), roof, 0, 1.58, 0);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    b.add(K.dot, roof, Math.sin(a) * 0.62, 1.5, Math.cos(a) * 0.62, null, [0.06, 0.08, 0.06]);
  }
  b.add(tube(0.06, 0.08, 0.06, 8), roof, 0, 1.72, 0);
  b.add(K.ball, roof, 0, 1.8, 0, null, 0.085);
  b.add(tube(0, 0.05, 0.08, 8), roof, 0, 1.9, 0);
  snow.add(tube(0.1, 0.5, 0.18, 6), SNOW, 0, 1.625, 0);
  return b;
}
/** A stepping stone in the Low one's place and size (`sx` by `sz`, turned `ry`): a flat stone with a rounded top. */
export function steppingStone(b: Build, x: number, z: number, ry: number, sx: number, sz: number, c: number) {
  b.add(tube(1, 1.05, 1, 10), shade(c, 0.92), x, 0.02, z, [0, ry, 0], [sx, 0.04, sz]);
  b.add(K.dome, c, x, 0.035, z, [0, ry, 0], [sx * 0.97, 0.045, sz * 0.97]);
}
/**
 * A little pine pruned the Japanese way, in the Low one's cone (0.55 round, 1.1 tall), turned `ry`: a crooked trunk
 * (into `trunk`), round pads of needles on it (into `pads`) and, on top of each pad, the snow (or blossom, or leaves)
 * the big pines wear (into `drift`).
 */
export function niwaki(trunk: Build, pads: Build, drift: Build, x: number, z: number, ry: number) {
  const m = at(x, 0, z, ry), t = new Build(), p = new Build(), d = new Build();
  let px = 0, py = 0;
  for (const [nx, ny, r] of [[0.07, 0.36, 0.065], [-0.05, 0.7, 0.05], [0.02, 0.96, 0.035]]) {
    const dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy);
    t.add(tube(r * 0.8, r, l + 0.04, 6), 0xFFFFFF, (px + nx) / 2, (py + ny) / 2, 0, [0, 0, -Math.atan2(dx, dy)]);
    px = nx; py = ny;
  }
  for (const [x0, y0, z0, r, h] of [[0.05, 0.36, 0.02, 0.5, 0.17], [-0.12, 0.62, -0.05, 0.36, 0.15], [0.16, 0.66, 0.08, 0.26, 0.12], [0.02, 0.92, 0, 0.27, 0.15]]) {
    p.add(K.ball, 0xFFFFFF, x0, y0, z0, null, [r, h, r * 0.92]);
    d.add(K.dome, 0xFFFFFF, x0, y0 + h * 0.45, z0, null, [r * 0.82, h * 0.6, r * 0.76]);
  }
  trunk.addAll(t, m); pads.addAll(p, m); drift.addAll(d, m);
}

// ---------- tea tables ----------
const TABLE_WOOD = 0x6B4A2E, LEG = 0x4A3220, STOOL = 0xC0392B;
/** A tea table, top `top` up, in the Low one's footprint (0.8 by 0.62): an oval top with a rim, a pedestal and a round foot. */
export function teaTable(top: number) {
  const b = new Build();
  b.add(tube(1, 1, 1, 18), TABLE_WOOD, 0, top, 0, null, [0.4, 0.06, 0.31]);
  b.add(tube(1, 1, 1, 18), shade(TABLE_WOOD, 0.8), 0, top - 0.035, 0, null, [0.39, 0.03, 0.3]);
  b.add(tube(0.05, 0.065, top - 0.06, 8), LEG, 0, (top - 0.06) / 2, 0);
  b.add(rbox(0.22, 0.05, 0.22, 0.02), LEG, 0, top - 0.08, 0);
  b.add(tube(0.2, 0.24, 0.05, 12), LEG, 0, 0.025, 0);
  return b;
}
/** A round stool 0.48 tall, 0.22 round, like a little barrel: a red body with dark hoops, and a cushioned top. */
export function stool() {
  const b = new Build();
  b.add(tube(0.21, 0.22, 0.44, 12), STOOL, 0, 0.22, 0);
  for (const y of [0.07, 0.38]) b.add(K.ring, LEG, 0, y, 0, [Math.PI / 2, 0, 0], [0.218, 0.218, 0.3]);
  b.add(K.dome, shade(STOOL, 1.12), 0, 0.44, 0, null, [0.2, 0.05, 0.2]);
  return b;
}
/**
 * A paper parasol (wagasa) on a pole `h` tall, its canopy `r` round and `rise` high over (0, top, 0): the canopy with
 * its ribs over it, the band of thread near its crown, a cap, struts under it, and the pole in a little stone foot.
 * `snow` for winter.
 */
export function wagasa(h: number, top: number, r: number, rise: number, snow: Build) {
  const b = new Build(), red = STOOL, wood = TABLE_WOOD, ribs = 16, y0 = top - rise / 2;
  b.add(tube(0.035, 0.04, h, 8), wood, 0, h / 2, 0);
  b.add(K.ring, shade(wood, 0.7), 0, h * 0.55, 0, [Math.PI / 2, 0, 0], [0.04, 0.04, 0.4]);
  b.add(tube(0.1, 0.13, 0.08, 8), 0x8E979E, 0, 0.04, 0);
  b.add(tube(0.03, r, rise, ribs), red, 0, top, 0);
  b.add(tube(r * 1.005, r, 0.025, ribs, true), shade(red, 0.75), 0, y0 + 0.012, 0);
  const slope = Math.atan2(rise, r), l = Math.hypot(rise, r);
  for (let i = 0; i < ribs; i++) {
    const a = i * Math.PI * 2 / ribs, cx = Math.sin(a), cz = Math.cos(a), mid = r / 2;
    b.add(G.box, shade(red, 0.72), cx * mid, top + 0.012, cz * mid, [0, a - Math.PI / 2, -slope], [l, 0.016, 0.018]);
    if (i % 2 === 0) {
      // the struts under it, from a runner on the pole out to the ribs
      const sr = r * 0.55, sy = y0 - 0.01, ry = sy - 0.3, sl = Math.hypot(sr, sy - ry);
      b.add(G.box, wood, cx * sr / 2, (sy + ry) / 2, cz * sr / 2, [0, a - Math.PI / 2, Math.atan2(sy - ry, sr)], [sl, 0.014, 0.014]);
    }
  }
  b.add(K.ring, 0xF7F1E3, 0, top + rise * 0.22 + 0.01, 0, [Math.PI / 2, 0, 0], [r * 0.28, r * 0.28, 0.35]);
  b.add(K.dome, shade(red, 0.6), 0, top + rise / 2 - 0.01, 0, null, [0.07, 0.05, 0.07]);
  snow.add(tube(0.04, r * 0.45, rise * 0.45, ribs), SNOW, 0, top + rise * 0.27 + 0.03, 0);
  return b;
}

// ---------- the serving counter ----------
/**
 * The serving counter, `w` by `d`, its top surface `h` up, front to +z: a body with framed panels on a dark plinth,
 * a rounded top with a lip, a red cloth hung from a rod in three panels with a darker hem, and a brass bell at `bell`.
 */
export function servingCounter(w: number, d: number, h: number, bell: [number, number]) {
  const b = new Build(), wood = 0x6B4A2E, top = 0x8A5A3B, red = 0xC0392B, bh = h - 0.05;
  b.add(rbox(w - 0.04, 0.08, d - 0.04, 0.02), shade(wood, 0.7), 0, 0.04, 0);
  b.add(rbox(w, bh - 0.08, d, 0.035), wood, 0, 0.08 + (bh - 0.08) / 2, 0);
  for (const s of [-1, 1]) b.add(rbox(0.05, bh - 0.12, 0.03, 0.012), shade(wood, 1.15), s * (w / 2 - 0.03), 0.08 + (bh - 0.08) / 2, d / 2 + 0.005);
  b.add(rbox(w + 0.1, 0.05, d + 0.08, 0.02), top, 0, h - 0.025, 0);
  b.add(rbox(w + 0.12, 0.02, 0.03, 0.008), shade(top, 1.15), 0, h - 0.04, d / 2 + 0.045);
  // the cloth, in three panels hung from a rod under the top
  const cw = (w - 0.1) / 3;
  b.add(tube(0.015, 0.015, w - 0.06, 6), 0x4A3220, 0, h - 0.075, d / 2 + 0.02, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 3; i++) {
    const x = -(w - 0.1) / 2 + cw * (i + 0.5);
    b.add(rbox(+(cw - 0.03).toFixed(3), 0.3, 0.02, 0.008), red, x, h - 0.22, d / 2 + 0.011);
    b.add(rbox(+(cw - 0.03).toFixed(3), 0.04, 0.024, 0.008), shade(red, 0.72), x, h - 0.35, d / 2 + 0.011);
  }
  const [bx, bz] = bell;
  b.add(tube(0.06, 0.06, 0.015, 10), 0x7A5A2A, bx, h + 0.008, bz);
  b.add(K.dome, 0xF2C14E, bx, h + 0.015, bz, null, [0.06, 0.055, 0.06]);
  b.add(K.dot, 0xF2C14E, bx, h + 0.075, bz, null, 0.014);
  return b;
}

/** A waiter's round tray, as on Low (0.32 round, 0.03 thick, its middle at 0): lacquered, with a raised rim. */
export function tray() {
  const b = new Build(), c = 0x8E2B2B;
  b.add(tube(0.3, 0.29, 0.03, 18), c, 0, 0, 0);
  b.add(K.ring, shade(c, 0.7), 0, 0.016, 0, [Math.PI / 2, 0, 0], [0.305, 0.305, 0.22]);
  b.add(tube(0.2, 0.2, 0.004, 18), shade(c, 1.12), 0, 0.016, 0);
  return b;
}
