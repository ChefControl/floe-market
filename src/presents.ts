// Presents for her: a $100 tile in her front yard, bought again and again just by standing on it (no holding E).
// Each one is left by her door, and she never takes them in, so they pile up against the front wall and spill out
// into the yard.
import { BoxGeometry, Group, type Mesh } from 'three';
import { decal, drawTile } from './decals';
import { HOUSE_PATH_Z, pushOutOfBox } from './layout';
import { popIn } from './pop';
import { bake, mesh, scene, type Part } from './render';
import { toast, type TipContent } from './ui';
import { FY, type XZ } from './util';

/** The tile, on her lawn on the gate side of the circle. */
export const PRESENT = {
  x: 20.3, z: 7.6, half: 0.7, cost: 100, paid: 0, icon: '🎁',
  tip: { name: 'A present for her', desc: "Maybe she will take me back (she won't)" } as TipContent,
};
const tile = decal(PRESENT.half * 2, (c, w, h) => drawTile(c, w, h, PRESENT));
tile.mesh.position.set(PRESENT.x, FY + 0.012, PRESENT.z);
tile.tex.userData.local = true; // co-op: each phone draws it from what's been paid (coop.ts)

export function redrawPresentTile() {
  drawTile(tile.ctx, 256, 256, PRESENT);
  tile.tex.needsUpdate = true;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawPresentTile);

/** Standing on the tile. */
export const onPresentTile = (p: XZ) => Math.abs(p.x - PRESENT.x) < PRESENT.half && Math.abs(p.z - PRESENT.z) < PRESENT.half;

// ---------- the pile ----------
/**
 * Her front wall, and the spots on the ground the pile grows from: along the wall from just beside the door to the
 * corner of the house, and out into the yard. (Right in front of the door is hidden under the eaves from where the
 * camera looks, so the pile starts beside it, on the camera's side.)
 */
const WALL = 24.4, CELL = 0.3;
const COLS = [0, 1, 2, 3, 4].map(i => WALL - 0.2 - i * CELL); // against the wall first
const ROWS = [0, 1, 2, 3, 4, 5].map(i => HOUSE_PATH_Z + 0.85 + i * CELL); // nearest the door first
/** Where the pile starts, and grows up and out from. */
const HEART = { c: 1.6, r: 2 };
/** How high the pile gets before new presents stop showing (they're still counted): about up to the eaves. */
const TOP = 2.1;
const WRAPS = [0xD8394B, 0x2E9E8F, 0xF2C14E, 0xE58FB4, 0x7B5EA7, 0x3D7CC9, 0xF4F1EA];
const RIBBONS = [0xF2C14E, 0xFFFFFF, 0xD8394B];

interface Gift { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; wrap: number; ribbon: number }
/** Presents left so far (once the pile's up to the eaves, more are counted but not drawn). */
export const presents = { n: 0 };
const gifts: Gift[] = [];
const heights = COLS.map(() => ROWS.map(() => 0));
/** The ground the pile covers, for keeping the player out of it (co-op sends it to the guest's phone too). */
export const pileCover = { x0: WALL, z0: Infinity, z1: -Infinity };

/** Where the `i`th present goes: the lowest spot, nearest where the pile started, so it grows as a mound. Null once
 *  it's up to the eaves everywhere. */
function nextGift(i: number): Gift | null {
  let c = -1, r = -1, bestScore = Infinity;
  for (let ci = 0; ci < COLS.length; ci++) {
    for (let ri = 0; ri < ROWS.length; ri++) {
      const h = heights[ci][ri], score = h + Math.hypot(ci - HEART.c, ri - HEART.r) * 0.16;
      if (h <= TOP && score < bestScore) { bestScore = score; c = ci; r = ri; }
    }
  }
  if (c < 0) return null;
  // Sizes, turns and colours from low-discrepancy sequences: the same pile every load, and no Math.random.
  const f = (k: number) => (i * k) % 1;
  const w = 0.22 + f(0.618034) * 0.12, d = 0.22 + f(0.754878) * 0.12, h = 0.15 + f(0.569840) * 0.15;
  const g: Gift = {
    x: COLS[c] + (f(0.414214) - 0.5) * 0.06, y: FY + heights[c][r], z: ROWS[r] + (f(0.302776) - 0.5) * 0.06,
    w, h, d, yaw: (f(0.7236068) - 0.5) * 0.9, wrap: WRAPS[i % WRAPS.length], ribbon: RIBBONS[(i * 2 + (i >> 2)) % RIBBONS.length],
  };
  heights[c][r] += h;
  pileCover.x0 = Math.min(pileCover.x0, COLS[c] - CELL / 2);
  pileCover.z0 = Math.min(pileCover.z0, ROWS[r] - CELL / 2);
  pileCover.z1 = Math.max(pileCover.z1, ROWS[r] + CELL / 2);
  return g;
}

const BOX = new BoxGeometry(1, 1, 1);
/** A present's parts, by colour, around its base at `o`: the box, a ribbon each way round it, and a bow. */
function parts(g: Gift, o: [number, number, number]): [colour: number, Part][] {
  const [x, y, z] = o, rot: [number, number, number] = [0, g.yaw, 0];
  const c = Math.cos(g.yaw), s = Math.sin(g.yaw);
  const bow = (k: number): Part => ({ geo: BOX, at: [x + k * 0.035 * c, y + g.h + 0.03, z - k * 0.035 * s], rot: [0, g.yaw, k * 0.6], scale: [0.07, 0.05, 0.035] });
  return [
    [g.wrap, { geo: BOX, at: [x, y + g.h / 2, z], rot, scale: [g.w, g.h, g.d] }],
    [g.ribbon, { geo: BOX, at: [x, y + g.h / 2, z], rot, scale: [g.w + 0.012, g.h + 0.012, 0.045] }],
    [g.ribbon, { geo: BOX, at: [x, y + g.h / 2, z], rot, scale: [0.045, g.h + 0.012, g.d + 0.012] }],
    [g.ribbon, bow(1)], [g.ribbon, bow(-1)],
  ];
}

/** Everything but the newest present, baked into one mesh per colour; the newest pops in on its own. */
const pile = new Group();
scene.add(pile);
let newest: Group | null = null;

function rebuild(upTo: number) {
  pile.children.forEach(m => (m as Mesh).geometry.dispose());
  pile.clear();
  const byColour = new Map<number, Part[]>();
  for (const g of gifts.slice(0, upTo)) {
    for (const [colour, p] of parts(g, [g.x, g.y, g.z])) {
      if (!byColour.has(colour)) byColour.set(colour, []);
      byColour.get(colour)!.push(p);
    }
  }
  for (const [colour, ps] of byColour) pile.add(mesh(bake(ps), colour, 0, 0, 0, true));
}

/** Snubs, in turn, for every present after the first. */
const SNUBS = [
  "She didn't come to the door",
  "The curtains moved. Then they didn't",
  'Her porch light went off',
  "She's seen it. She isn't coming out",
  'Another one for the pile',
];

/** Leaves `n` more presents at her door. `silent` (loading a save) skips the pop-in and the toast. */
export function givePresents(n = 1, silent = false) {
  let added = false;
  for (let k = 0; k < n; k++) {
    presents.n++;
    const g = nextGift(presents.n);
    added = !!g;
    if (g) gifts.push(g);
    else { presents.n += n - k - 1; break; } // the pile's full: the rest are only counted
  }
  const folding = !!newest;
  if (newest) { scene.remove(newest); newest.children.forEach(m => (m as Mesh).geometry.dispose()); newest = null; }
  // a full pile only needs baking again to fold the last one to pop in back into it
  if (silent || !added) { if (silent || folding) rebuild(gifts.length); }
  else {
    // the newest is its own group, at its base so it grows up out of the pile
    rebuild(gifts.length - 1);
    const g = gifts[gifts.length - 1];
    newest = new Group();
    newest.position.set(g.x, g.y, g.z);
    for (const [colour, p] of parts(g, [0, 0, 0])) newest.add(mesh(bake([p]), colour, 0, 0, 0, true));
    scene.add(newest);
    popIn(newest);
  }
  if (!silent) toast(presents.n === 1 ? 'You left a present at her door' : SNUBS[(presents.n - 2) % SNUBS.length], 'present');
}

/** Keeps the player out of the pile. */
export function collidePresents(p: XZ) {
  const { x0, z0, z1 } = pileCover;
  if (z1 < z0) return; // no pile yet
  pushOutOfBox(p, (x0 + WALL) / 2, (z0 + z1) / 2, (WALL - x0) / 2 + 0.25, (z1 - z0) / 2 + 0.25);
}
