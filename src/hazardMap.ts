// Cooking Hazard's map (hazard.ts plays a run on it, hazardSet.ts builds it in 3D): the food quarter, a town block of
// 64 by 40 metres made by hand. Two streets cross in its middle, Market Street east to west and Baker Lane north to
// south; a grocery, a café, a butcher's and a bakery face Market Street from the north, with a lane behind them; the
// corner supermarket and its car park, a little square with a fountain and a row of houses are to the south. Brick walls
// close it in, with barricades across the streets' ends. Each run picks its crates, the gold cookware crate, the safe
// zone and where the van drops the chef off from fixed spots (a crate's shop hints at what's in it).
//
// What blocks what: buildings, walls and cars block walking and shots; low things (barricades, the fountain, bins) block
// walking but are shot over. The horde finds its way round them on a grid of one-metre cells (`Nav`): each frame the
// walk to the chef from every cell, and each zombie walks straight at the chef when nothing's in the way, and along the
// grid when something is. Everything here is in the rules' units, 40 to the metre, like hazard.ts.

/** The rules' units in a metre. */
export const U = 40;

export type Shop = 'grocery' | 'cafe' | 'butcher' | 'bakery' | 'market' | 'any';
/** Something on the map that's in the way. `low` is shot over; everything else stops shots too. */
export type BlockKind = 'building' | 'car' | 'wall' | 'low';
export interface Block {
  x0: number; y0: number; x1: number; y1: number;
  kind: BlockKind;
  /** How tall it's drawn, in metres. */
  h: number;
  /** A shop's: which, and the side its front (and sign) faces. */
  shop?: Shop; face?: 'n' | 's';
}
export interface Spot { x: number; y: number; shop: Shop }
/** A safe zone: where its ring is (its radio mast stands on its far side), and which way the van comes in from. */
export interface ZoneSpot { x: number; y: number; from: { x: number; y: number } }
/** Where the van drops the chef off: the van (outside the map), the way it faces (away), and where the chef lands. */
export interface DropSpot { x: number; y: number; dir: { x: number; y: number }; chef: { x: number; y: number } }

export interface Town {
  w: number; h: number;
  blocks: Block[];
  crates: Spot[]; ammo: Spot[]; gold: Spot[];
  zones: ZoneSpot[]; drops: DropSpot[];
}

const m = (v: number) => v * U;
const rect = (x0: number, y0: number, x1: number, y1: number, kind: BlockKind, h: number, more: Partial<Block> = {}): Block =>
  ({ x0: m(x0), y0: m(y0), x1: m(x1), y1: m(y1), kind, h, ...more });
const at = (x: number, y: number, shop: Shop = 'any'): Spot => ({ x: m(x), y: m(y), shop });

/** The food quarter, laid out in metres (x east, y south). */
export const QUARTER: Town = {
  w: m(64), h: m(40),
  blocks: [
    // the brick walls round it, with barricades across the streets' ends (seen over, shot over)
    rect(0, 0, 29, 0.6, 'wall', 2.4), rect(35, 0, 64, 0.6, 'wall', 2.4), rect(29, 0, 35, 0.6, 'low', 1),
    // (the south one low: the camera looks over it, from the south)
    rect(0, 39.4, 29, 40, 'wall', 1.1), rect(35, 39.4, 64, 40, 'wall', 1.1), rect(29, 39.4, 35, 40, 'low', 1),
    rect(0, 0.6, 0.6, 17, 'wall', 2.4), rect(0, 23, 0.6, 39.4, 'wall', 2.4), rect(0, 17, 0.6, 23, 'low', 1),
    rect(63.4, 0.6, 64, 17, 'wall', 2.4), rect(63.4, 23, 64, 39.4, 'wall', 2.4), rect(63.4, 17, 64, 23, 'low', 1),
    // north of Market Street: the shops, fronts to the street, a lane behind them
    rect(3, 3, 14, 12, 'building', 3.4, { shop: 'grocery', face: 's' }),
    rect(17, 4, 26, 12, 'building', 3.1, { shop: 'cafe', face: 's' }),
    rect(37, 4, 46, 12, 'building', 3.3, { shop: 'butcher', face: 's' }),
    rect(53, 3, 62, 12, 'building', 3.6, { shop: 'bakery', face: 's' }),
    // south: the supermarket (front to the north), its car park, the square, the houses
    rect(3, 27, 20, 37, 'building', 3.8, { shop: 'market', face: 'n' }),
    rect(52, 26, 61, 37, 'building', 3.2, { shop: 'any', face: 'n' }),
    rect(39, 28, 42, 31, 'low', 0.8),
    // parked in the car park, and wrecked in the streets
    rect(21.5, 26, 23.3, 30, 'car', 1.3), rect(26, 26, 27.8, 30, 'car', 1.3),
    rect(8, 18, 12, 19.8, 'car', 1.3), rect(48, 20.5, 52, 22.3, 'car', 1.3),
    rect(33, 8, 34.8, 12, 'car', 1.3), rect(33, 30, 34.8, 34, 'car', 1.3),
    // bins knocked over
    rect(14.6, 12.6, 15.6, 13.6, 'low', 0.9), rect(46.6, 12.6, 47.6, 13.6, 'low', 0.9), rect(50.5, 25.6, 51.5, 26.6, 'low', 0.9),
  ],
  crates: [
    at(5, 13.4, 'grocery'), at(9, 13.4, 'grocery'), at(12.5, 13.4, 'grocery'), at(8, 1.8, 'grocery'),
    at(19, 13.4, 'cafe'), at(24, 13.4, 'cafe'), at(21, 1.8, 'cafe'),
    at(39, 13.4, 'butcher'), at(44, 13.4, 'butcher'), at(41, 1.8, 'butcher'),
    at(55, 13.4, 'bakery'), at(60, 13.4, 'bakery'), at(57, 1.8, 'bakery'),
    at(5, 25.6, 'market'), at(11, 25.6, 'market'), at(17, 25.6, 'market'), at(1.8, 31, 'market'),
    at(54, 24.8), at(59, 24.8), at(27, 36.5), at(37, 37), at(49, 27), at(47.5, 5),
  ],
  ammo: [at(27.5, 15.5), at(36.5, 24.5), at(2, 15), at(62, 24.5), at(31, 1.8), at(45, 38.3)],
  gold: [at(1.8, 5, 'grocery'), at(12, 38.4, 'market'), at(62.2, 2, 'bakery'), at(62, 38)],
  zones: [
    { x: m(24.6), y: m(34.5), from: { x: 1, y: 0 } },
    { x: m(46.5), y: m(35.5), from: { x: 0, y: -1 } },
    { x: m(49.5), y: m(8), from: { x: 0, y: 1 } },
  ],
  // (the van pulls up outside a barricade, facing away, and the chef hops over it into the street)
  drops: [
    { x: m(-2.4), y: m(20), dir: { x: -1, y: 0 }, chef: { x: m(2.6), y: m(20) } },
    { x: m(66.4), y: m(20), dir: { x: 1, y: 0 }, chef: { x: m(61.4), y: m(20) } },
    { x: m(32), y: m(-2.4), dir: { x: 0, y: -1 }, chef: { x: m(32), y: m(2.6) } },
    { x: m(32), y: m(42.4), dir: { x: 0, y: 1 }, chef: { x: m(32), y: m(37.4) } },
  ],
};

/** An open street of the same size with nothing in it: for trying the rules out without walls in the way. */
export const OPEN: Town = {
  w: m(64), h: m(40), blocks: [],
  crates: [], ammo: [], gold: [],
  zones: [{ x: m(52), y: m(20), from: { x: 1, y: 0 } }],
  drops: [{ x: m(-2.4), y: m(20), dir: { x: -1, y: 0 }, chef: { x: m(32), y: m(20) } }],
};

// ---------- what's in the way ----------
type XY = { x: number; y: number };
export const blocksShots = (b: Block) => b.kind !== 'low';

/** Pushes a circle at `p` (radius `r`) out of everything in its way. */
export function pushOut(p: XY, r: number, blocks: readonly Block[]) {
  for (const b of blocks) {
    const cx = Math.max(b.x0, Math.min(b.x1, p.x)), cy = Math.max(b.y0, Math.min(b.y1, p.y));
    const dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2), k = (r - d) / d;
      p.x += dx * k; p.y += dy * k;
    } else {
      // its middle's inside: out by the nearest side
      const out = [p.x - b.x0 + r, b.x1 - p.x + r, p.y - b.y0 + r, b.y1 - p.y + r], i = out.indexOf(Math.min(...out));
      if (i === 0) p.x = b.x0 - r; else if (i === 1) p.x = b.x1 + r; else if (i === 2) p.y = b.y0 - r; else p.y = b.y1 + r;
    }
  }
}

/** How far along the segment (x0, y0)–(x1, y1) it first meets something shots can't pass, 0 to 1, or null. */
export function wallAlong(x0: number, y0: number, x1: number, y1: number, blocks: readonly Block[]) {
  let first: number | null = null;
  const dx = x1 - x0, dy = y1 - y0;
  for (const b of blocks) {
    if (!blocksShots(b)) continue;
    let t0 = 0, t1 = 1;
    for (const [p, q] of [[-dx, x0 - b.x0], [dx, b.x1 - x0], [-dy, y0 - b.y0], [dy, b.y1 - y0]]) {
      if (p === 0) { if (q < 0) { t0 = 2; break; } continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (t0 <= t1 && t0 <= 1 && (first === null || t0 < first)) first = t0;
  }
  return first;
}

// ---------- finding the way ----------
/** The grid the horde walks on: one-metre cells, those too near anything in the way shut. */
export class Nav {
  readonly cols: number; readonly rows: number;
  readonly open: Uint8Array;
  /** Steps from each cell to the chef's (-1: no way there), worked out from `from`'s cell. */
  readonly dist: Int32Array;
  private from = -1;
  private readonly queue: Int32Array;

  constructor(readonly town: Town, clear = 0.35 * U) {
    this.cols = Math.ceil(town.w / U); this.rows = Math.ceil(town.h / U);
    const n = this.cols * this.rows;
    this.open = new Uint8Array(n); this.dist = new Int32Array(n); this.queue = new Int32Array(n);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const x = (c + 0.5) * U, y = (r + 0.5) * U;
      this.open[r * this.cols + c] = town.blocks.some(b => x > b.x0 - clear && x < b.x1 + clear && y > b.y0 - clear && y < b.y1 + clear) ? 0 : 1;
    }
  }

  cell(x: number, y: number) {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / U))), r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / U)));
    return r * this.cols + c;
  }
  middle(i: number): XY { return { x: (i % this.cols + 0.5) * U, y: (Math.floor(i / this.cols) + 0.5) * U }; }

  /** Works out the walk to (x, y) from every cell (only when it's moved to another cell). */
  towards(x: number, y: number) {
    const start = this.cell(x, y);
    if (start === this.from) return;
    this.from = start;
    const { cols, rows, open, dist, queue } = this;
    dist.fill(-1);
    dist[start] = 0;
    let head = 0, tail = 0;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++], c = i % cols, r = (i - c) / cols;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const j = nr * cols + nc;
        if (dist[j] >= 0 || !open[j]) continue;
        // (no cutting a corner past something in the way)
        if (dr && dc && (!open[r * cols + nc] || !open[nr * cols + c])) continue;
        dist[j] = dist[i] + 1;
        queue[tail++] = j;
      }
    }
  }

  /** Where someone at (x, y) walks next to get to the chef: the middle of the neighbouring cell nearest, or null when
   *  there's no way (or they're already in the chef's cell). */
  next(x: number, y: number): XY | null {
    const i = this.cell(x, y), { cols, rows, dist, open } = this;
    const c = i % cols, r = (i - c) / cols;
    let best = -1, bestD = dist[i] >= 0 ? dist[i] : Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nc = c + dc, nr = r + dr;
      if ((!dr && !dc) || nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const j = nr * cols + nc;
      if (dist[j] < 0 || dist[j] >= bestD) continue;
      if (dr && dc && (!open[r * cols + nc] || !open[nr * cols + c])) continue;
      best = j; bestD = dist[j];
    }
    return best < 0 ? null : this.middle(best);
  }

  /** Whether nothing's in the way walking straight from a to b (checked every half metre). */
  clear(a: XY, b: XY) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / (U / 2));
    for (let k = 1; k < n; k++) if (!this.open[this.cell(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)]) return false;
    return true;
  }
}
