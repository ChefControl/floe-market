// The cellar under the dock (stage 3): Mr. Fugu's sumo ring and the stew kitchen that feeds its fans, in rooms side by
// side, with thin walls and doorways between them. The arena: a big clay dohyo between four posts in the middle, crates
// and planks for stands along the back and west walls, the bowl stall by the hearth room's door, and the gong and the
// cashier's window against the east wall. Down the middle, Mr. Fugu's office (his desk on a dais), the landing with the
// ladder up to the hatch in the dock, and the hearth room: the big pot, its ledge and the bowl counter. To the east the
// prep hall, where the dumbwaiter from the restaurant's kitchen comes down beside the racks and barrels, and behind its
// tall north wall the grow room, which nobody knows is there until the first boss is beaten. It's built CELLAR_Y under
// the dock, out of the camera's sight from up there. Only the outer back walls go up high: the rest are low, so the
// camera sees into every room.
// This module is the rooms and their furniture; where things are is cellarPlan.ts, and the kitchen's lines, the bouts
// and the swarm draw themselves (ringKitchen.ts, dohyo.ts, swarm.ts).
import {
  AdditiveBlending, BackSide, BoxGeometry, type BufferGeometry, Color, ConeGeometry, CylinderGeometry, Group, type Material, Matrix4,
  Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PointLight, type Side as Facing, TorusGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BINS, CASHIER, COUNTER, GONG, HEARTH, LIFTS, machineAt, MAX_MACHINES, POT, STALL, TEPPO, TUNNEL_D, TUNNEL_W, TUNNELS,
} from './cellarPlan';
import { Fugu } from './fugu';
import { ARENA, CELLAR_Y, type CellarRoom, DOORS, found, GROW, keepOnFloor, KITCHEN, LANDING, OFFICE_ROOM, PREP, pushOutOfBox, ROOMS, walkable } from './layout';
import { canvasTex, FONT, G, mat, mesh, paint, rr, scene } from './render';
import type { XZ } from './util';

export { cellarWay, roomAt } from './cellarPlan';

/** The cellar's floor height. */
export const CY = CELLAR_Y;
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
type Rect = typeof ARENA;

// ---------- where everything is (x, z; the floor is CY) ----------
// the arena
/** The middle of the ring, the height of its top, and half the width of its top. */
export const RING = V(-4.4, CY, -1.4);
export const RING_TOP = 0.6;
export const RING_HALF = 3.3;
/** How far the mound's clay slopes out past its top, each side. */
const RING_FOOT = 0.6;
/** The straw circle: inside it is in, past it is out. */
export const RING_R = 2.6;
// the landing
/** The ladder up to Mr. Fugu's hatch, by the middle of the landing's east wall, halfway between the office and the
 *  hearth room (the levels are never seen together, so it needn't stand right under the hatch), far enough out that the
 *  daylight round it (BEAM_R out from it) stays clear of the wall; where the player stands to climb up, at its foot; and
 *  where they land coming down, a step off that. */
const BEAM_R = 1.0;
export const LADDER = V(LANDING.x1 - BEAM_R - 0.2, CY, (LANDING.z0 + LANDING.z1) / 2);
export const LADDER_PAD = { x: LADDER.x - 0.75, z: LADDER.z, r: 0.6 };
export const LADDER_FOOT = V(LADDER_PAD.x - 0.9, CY, LADDER_PAD.z + 0.4);
/** The cellar's bins (bin.ts): an old oil drum in the hearth room, and one in the prep hall. */
export const KITCHEN_BINS = [V(KITCHEN.x0 + 0.5, CY, KITCHEN.z1 - 0.5), V(PREP.x1 - 0.55, CY, PREP.z1 - 0.55)];
// the office
/** Mr. Fugu's office: his desk, on its dais against the back wall, and his safe in the corner. */
export const OFFICE = V((OFFICE_ROOM.x0 + OFFICE_ROOM.x1) / 2, CY, -7.9);
const DAIS = { x0: OFFICE.x - 1.8, x1: OFFICE.x + 1.8, z0: OFFICE_ROOM.z0, z1: OFFICE.z + 0.85, h: 0.18 };
export const VAULT = V(OFFICE_ROOM.x1 - 0.75, CY, OFFICE_ROOM.z0 + 0.65);
/** The rest of the office's furniture: two chairs for visitors, the filing cabinet, the fish tank, a plant, and the
 *  coat rack by the door. */
const GUESTS = [{ x: OFFICE.x - 0.75, z: DAIS.z1 + 0.75 }, { x: OFFICE.x + 0.75, z: DAIS.z1 + 0.75 }];
const CABINET = { x: OFFICE_ROOM.x1 - 0.45, z: -7.3 }, TANK = { x: OFFICE_ROOM.x0 + 0.45, z: -8.4 };
const PLANT = { x: OFFICE_ROOM.x1 - 0.5, z: OFFICE_ROOM.z1 - 0.5 }, RACK = { x: 9.65, z: OFFICE_ROOM.z1 - 0.45 };
// the hearth room and the prep hall
/** The dumbwaiter's height, and where in it the trays go round (front and back, bottom and top). */
export const LIFT_H = 4.6;
export const LIFT_LOOP = { front: 0.25, back: -0.25, bottom: 0.75, top: LIFT_H - 0.45 };
/** (Just over the pot's iron top, at 1.39, and under its rim: two faces at one height flicker.) */
export const POT_TOP = 1.43;
const SACKS = { x: PREP.x1 - 0.6, z: PREP.z0 + 0.55 };

// ---------- materials ----------
const WOOD = 0x8A5A3B, WOOD_DARK = 0x5B3424, PILE = 0x4A3A30, CLAY = 0xB88A57, STRAW = 0xD9C47E;
const PURPLE = 0x5B3A7A, IRON = 0x2E2E33;
/** Glowing materials (lanterns, the hearth's fire, the hatch's daylight): lit only in the cellar's light. */
const glow = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1 });
const LANTERN_RED = glow(0xE0392B, 0xB0250F), LANTERN_PAPER = glow(0xFFF1D6, 0xFFC46A);

const add = <T extends Object3D>(parent: Object3D, o: T) => { parent.add(o); return o; };
const box = (parent: Object3D, c: number | Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
  const m = add(parent, mesh(G.box, c, x, y, z, cast)); m.scale.set(sx, sy, sz); return m;
};
const log = (parent: Object3D, c: number, x: number, y: number, z: number, r: number, h: number, cast = true) => {
  const m = add(parent, mesh(G.log, c, x, y, z, cast)); m.scale.set(r, h, r); return m;
};

/** The whole cellar, hidden until stage 3. Everything in it is placed in world coordinates (y from CY). */
export const cellar = new Group();
cellar.visible = false;
scene.add(cellar);
/** Parts that come with the venue's tiers, shown when they're bought: the bleachers (the Back-Alley Ring), the upper
 *  tier and the taiko drums (the Underground Arena), and the VIP boxes (the Grand Hall Below). And the grow room, with
 *  the doorway into it, found when the first boss is beaten (until then, `hidden`: the prep hall's tall back wall). */
export const parts = { bleachers: new Group(), tier: new Group(), vip: new Group(), drums: new Group(), grow: new Group(), hidden: new Group() };
Object.values(parts).forEach(g => { g.visible = false; cellar.add(g); });
parts.hidden.visible = true;

// ---------- the rooms ----------
const earth = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#6A5444'; c.fillRect(0, 0, w, h);
  // blotches scattered by a fixed hash (no Math.random: that's the game's; and no steady step, which lines them up
  // in stripes)
  const hash = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 260; i++) {
    c.fillStyle = i % 2 ? 'rgba(40,28,20,.16)' : 'rgba(150,120,90,.10)';
    c.beginPath(); c.arc(hash(i) * w, hash(i + 500) * h, 3 + hash(i + 1000) * 12, 0, Math.PI * 2); c.fill();
  }
});
earth.tex.wrapS = earth.tex.wrapT = 1000; // RepeatWrapping
/** A board floor, for the kitchen. */
const boards = canvasTex(256, 256, (c, w, h) => {
  for (let i = 0; i < 8; i++) {
    c.fillStyle = ['#8A6244', '#93694A', '#80593D', '#8E6546'][i % 4]; c.fillRect(0, i * h / 8, w, h / 8);
    c.fillStyle = 'rgba(40,24,14,.5)'; c.fillRect(0, i * h / 8, w, 2);
    c.fillRect(((i * 97) % 200) + 20, i * h / 8, 2, h / 8);
  }
});
boards.tex.wrapS = boards.tex.wrapT = 1000;
/** Stone flags, for the landing: grey slabs of a few sizes, in rows, with dark joints. */
const flags = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E2A26'; c.fillRect(0, 0, w, h);
  const hash = (i: number) => { const x = Math.sin(i * 91.17) * 43758.5453; return x - Math.floor(x); };
  const ROW = h / 4;
  for (let r = 0, i = 0; r < 4; r++) {
    // each row's joints, staggered, wrapping round so the texture tiles
    let x = (r % 2) * 40;
    while (x < w + (r % 2) * 40) {
      const len = 52 + Math.floor(hash(i++) * 40), g = 90 + Math.floor(hash(i++) * 24);
      c.fillStyle = `rgb(${g + 4},${g - 2},${g - 12})`;
      for (const off of [0, -w]) c.fillRect(x + off + 2, r * ROW + 2, len - 4, ROW - 4);
      c.fillStyle = 'rgba(255,255,255,.06)';
      for (const off of [0, -w]) c.fillRect(x + off + 2, r * ROW + 2, len - 4, 3);
      x += len;
    }
  }
});
flags.tex.wrapS = flags.tex.wrapT = 1000;
/** Dark basket-weave parquet, for Mr. Fugu's office: squares of four strips, each square turned from the last. */
const parquet = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E180F'; c.fillRect(0, 0, w, h);
  const S = 64, T = S / 4, tones = ['#5C3322', '#53301F', '#64392A', '#4E2C1D'];
  for (let gy = 0; gy < h / S; gy++) {
    for (let gx = 0; gx < w / S; gx++) {
      const across = (gx + gy) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        c.fillStyle = tones[(k + gx * 3 + gy) % 4];
        if (across) c.fillRect(gx * S + 1, gy * S + k * T + 1, S - 2, T - 2);
        else c.fillRect(gx * S + k * T + 1, gy * S + 1, T - 2, S - 2);
      }
    }
  }
});
parquet.tex.wrapS = parquet.tex.wrapT = 1000;
const SIDE = mat(0x3A2C22);
/** A floor over `r`, out to the middle of its walls, of earth or boards, its texture repeating every 4 m. */
function floor(r: Rect, tex: typeof earth, pad = 0.3, parent: Object3D = cellar) {
  const w = r.x1 - r.x0 + pad * 2, d = r.z1 - r.z0 + pad * 2;
  const t = tex.tex.clone(); t.repeat.set(w / 4, d / 4); t.needsUpdate = true;
  const f = add(parent, new Mesh(new BoxGeometry(w, 0.4, d), [SIDE, SIDE, new MeshLambertMaterial({ map: t }), SIDE, SIDE, SIDE]));
  f.position.set((r.x0 + r.x1) / 2, CY - 0.2, (r.z0 + r.z1) / 2);
  f.receiveShadow = true;
}
type Side = 'n' | 's' | 'e' | 'w';
/** Where along a room's side the doorways go through it, so its wall leaves them open. */
function gaps(r: Rect, side: Side): [number, number][] {
  const on = (a: number, b: number) => Math.abs(a - b) < 0.01;
  return DOORS.filter(t => side === 'n' ? on(t.z1, r.z0) : side === 's' ? on(t.z0, r.z1) : side === 'w' ? on(t.x1, r.x0) : on(t.x0, r.x1))
    .map(t => (side === 'n' || side === 's' ? [t.x0 - 0.3, t.x1 + 0.3] : [t.z0 - 0.3, t.z1 + 0.3]) as [number, number])
    // (and the fans' tunnels, through the arena's back walls)
    .concat(r === ARENA ? TUNNELS.filter(t => t.side === side).map(t => [t.at - TUNNEL_W / 2, t.at + TUNNEL_W / 2] as [number, number]) : []);
}
/** The stretches of a side between its doorways. */
function spans(r: Rect, side: Side): [number, number][] {
  const along = side === 'n' || side === 's';
  let a = (along ? r.x0 : r.z0) - 0.3;
  const out: [number, number][] = [];
  for (const [g0, g1] of gaps(r, side).sort((x, y) => x[0] - y[0])) { if (g0 > a) out.push([a, g0]); a = g1; }
  const end = (along ? r.x1 : r.z1) + 0.3;
  if (end > a) out.push([a, end]);
  return out;
}
/** Where a side's wall stands: `off` outside the floor. */
const line = (r: Rect, side: Side, off: number) =>
  side === 'n' ? r.z0 - off : side === 's' ? r.z1 + off : side === 'w' ? r.x0 - off : r.x1 + off;
/** A tall wall at the back of the cellar: the dock's piles going up into the dark, planks behind them, beams across,
 *  and a stone footing (none of it casting shadows: the sun's light doesn't reach down here, and the piles' would
 *  streak the floor). Only on the outer back walls, where it hides nothing. */
function tallWall(r: Rect, side: 'n' | 'w', parent: Object3D = cellar) {
  for (const [a0, a1] of spans(r, side)) {
    const mid = (a0 + a1) / 2, len = a1 - a0;
    const at = (o: number) => line(r, side, o);
    const put = (o: number, y: number, sx: number, sy: number, sz: number, c: number, cast = false) =>
      side === 'n' ? box(parent, c, mid, CY + y, at(o), sx, sy, sz, cast) : box(parent, c, at(o), CY + y, mid, sz, sy, sx, cast);
    for (let a = a0 + 0.3; a <= a1; a += 1.1) side === 'n' ? log(parent, PILE, a, CY + 3.2, at(0.6), 1.9, 7, false) : log(parent, PILE, at(0.6), CY + 3.2, a, 1.9, 7, false);
    put(1.1, 3, len, 6.4, 0.3, 0x2A201A);
    for (const y of [2.2, 4.6]) put(0.25, y, len, 0.22, 0.18, WOOD_DARK, true);
    put(0.3, 0.25, len, 0.5, 0.5, 0x4E4A46, true);
  }
}
/** Mortared cellar stone: blocks in staggered courses, a few tones in a fixed order. */
const stone = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#2E2925'; c.fillRect(0, 0, w, h);
  const ROW = h / 6, tones = ['#6E665C', '#787064', '#645D54', '#817869', '#6A6358'];
  for (let r = 0; r < 6; r++) {
    for (let i = 0, x = (r % 2) * -32; x < w; i++, x += 64) {
      c.fillStyle = tones[(r * 3 + i) % tones.length]; rr(c, x + 3, r * ROW + 3, 58, ROW - 6, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x + 7, r * ROW + 5, 50, 4);
      c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x + 7, r * ROW + ROW - 9, 50, 4);
    }
  }
});
stone.tex.wrapS = stone.tex.wrapT = 1000;
/** The prep hall's back while the grow room behind it is a secret: not the dock's piles but a mortared stone wall, tall
 *  enough to hide it, with an iron gate in it, chained and padlocked, dark beyond. All of it comes down when the first
 *  boss is beaten, for the low wall and the same gate swung open (built in parts.grow). */
function stoneWall() {
  const p = parts.hidden, H = 4.6, z = PREP.z0 - 0.4, T = 0.5;
  const t = DOORS.find(d => d.b === 'grow')!, gx = (t.x0 + t.x1) / 2, gw = t.x1 - t.x0 + 0.6, GH = 2.5;
  const edge = mat(0x3A3530);
  const block = (x0: number, x1: number, y0: number, y1: number) => {
    const tex = stone.tex.clone(); tex.repeat.set((x1 - x0) / 2, (y1 - y0) / 2); tex.needsUpdate = true;
    const m = add(p, new Mesh(new BoxGeometry(x1 - x0, y1 - y0, T), [edge, edge, edge, edge, new MeshLambertMaterial({ map: tex }), edge]));
    m.position.set((x0 + x1) / 2, CY + (y0 + y1) / 2, z); m.receiveShadow = true;
  };
  block(PREP.x0 - 0.3, gx - gw / 2, 0, H); block(gx + gw / 2, PREP.x1 + 0.3, 0, H); block(gx - gw / 2, gx + gw / 2, GH, H);
  // a footing, a timber cap, and pilasters every few metres
  box(p, 0x4E4A46, (PREP.x0 + PREP.x1) / 2, CY + 0.15, z + 0.08, PREP.x1 - PREP.x0 + 0.6, 0.3, T + 0.16);
  box(p, WOOD_DARK, (PREP.x0 + PREP.x1) / 2, CY + H, z, PREP.x1 - PREP.x0 + 0.7, 0.25, T + 0.2, false);
  for (const x of [PREP.x0 + 0.2, PREP.x0 + 3.2, PREP.x0 + 6.0, PREP.x1 - 0.2]) box(p, 0x5E574E, x, CY + H / 2, z + 0.2, 0.4, H, 0.2, false);
  // the gate: a heavy timber frame, dark beyond, iron bars and straps
  for (const s of [-1, 1]) box(p, WOOD_DARK, gx + s * (gw / 2 - 0.12), CY + GH / 2, z + 0.12, 0.26, GH, T + 0.1);
  box(p, WOOD_DARK, gx, CY + GH, z + 0.12, gw + 0.2, 0.3, T + 0.12);
  box(p, new MeshBasicMaterial({ color: 0x0A0908 }), gx, CY + (GH - 0.15) / 2, z - 0.1, gw - 0.4, GH - 0.15, 0.1, false);
  bars(p, gx, z + 0.18, gw - 0.5, GH - 0.25, 0);
  // the chain across where the leaves meet, and the padlock on it
  for (let i = 0; i < 8; i++) {
    const l = add(p, mesh(new TorusGeometry(0.05, 0.016, 5, 10), 0x8A8F96, gx - 0.3 + i * 0.086, CY + 1.2 - Math.sin((i / 7) * Math.PI) * 0.08, z + 0.24));
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
  }
  box(p, 0xC9A23A, gx, CY + 0.98, z + 0.27, 0.22, 0.22, 0.08);
  box(p, 0x1B1A1E, gx, CY + 0.95, z + 0.315, 0.03, 0.07, 0.01, false);
  const shackle = add(p, mesh(new TorusGeometry(0.075, 0.022, 6, 12, Math.PI), 0x9AA4AC, gx, CY + 1.09, z + 0.27));
  shackle.castShadow = true;
  for (const s of [-1, 1]) lantern(p, gx + s * (gw / 2 + 0.45), CY + 2.3, z + 0.45, false);
}
/** An iron gate's bars, `w` wide and `h` tall, centred on `x` (or, `open` > 0, its two leaves swung back that far into the
 *  room behind, hinged on the frame). */
function bars(p: Object3D, x: number, z: number, w: number, h: number, open: number) {
  for (const s of [-1, 1]) {
    const leaf = add(p, new Group()); leaf.position.set(x + s * w / 2, CY, z); leaf.rotation.y = -s * open;
    const n = 4, lw = w / 2;
    for (let i = 0; i < n; i++) {
      const bx = -s * (lw * (i + 0.5) / n);
      add(leaf, mesh(G.box, IRON, bx, h / 2, 0, true)).scale.set(0.045, h, 0.045);
      add(leaf, mesh(G.cone, IRON, bx, h + 0.06, 0)).scale.set(0.05, 0.12, 0.05);
    }
    for (const y of [0.3, h * 0.55, h - 0.12]) add(leaf, mesh(G.box, IRON, -s * lw / 2, y, 0.02, true)).scale.set(lw, 0.07, 0.05);
  }
}
/** The office's back wall, his own and not the dock's piles: dark red wallpaper with a gold pattern over a dark wood
 *  wainscot, a cornice, a portrait of Mr. Fugu, the ring's ranking sheet, a clock, and brass wall lamps. */
function officeWall() {
  const r = OFFICE_ROOM, x0 = r.x0 - 0.3, x1 = r.x1 + 0.3, len = x1 - x0, mid = (x0 + x1) / 2, z = r.z0 - 0.25, H = 4.2;
  const paper = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#5A1E22'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(214,170,90,.55)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w - 8, h / 2); c.lineTo(w / 2, h - 8); c.lineTo(8, h / 2); c.closePath(); c.stroke();
    c.fillStyle = 'rgba(214,170,90,.55)'; c.beginPath(); c.arc(w / 2, h / 2, 7, 0, Math.PI * 2); c.fill();
  });
  paper.tex.wrapS = paper.tex.wrapT = 1000; paper.tex.repeat.set(len / 1.2, (H - 1.1) / 1.2);
  const edge = mat(0x3A1418);
  const back = add(cellar, new Mesh(new BoxGeometry(len, H - 1.1, 0.2), [edge, edge, edge, edge, new MeshLambertMaterial({ map: paper.tex }), edge]));
  back.position.set(mid, CY + 1.1 + (H - 1.1) / 2, z);
  // the wainscot, its panels, the rail over it, the skirting, and the cornice
  box(cellar, 0x3E2418, mid, CY + 0.55, z + 0.04, len, 1.1, 0.24);
  for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.9) box(cellar, 0x4E2E1E, x, CY + 0.55, z + 0.17, 0.7, 0.75, 0.02, false);
  box(cellar, WOOD_DARK, mid, CY + 1.12, z + 0.16, len, 0.08, 0.1, false);
  box(cellar, 0x2A1810, mid, CY + 0.06, z + 0.17, len, 0.12, 0.06, false);
  box(cellar, WOOD_DARK, mid, CY + H, z + 0.08, len + 0.1, 0.22, 0.4, false);
  /** A picture on the wall: a canvas in a gold frame. */
  const picture = (x: number, y: number, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const t = canvasTex(Math.round(w * 160), Math.round(h * 160), draw), f = mat(0xC9A23A);
    box(cellar, f, x, CY + y, z + 0.13, w + 0.14, h + 0.14, 0.05, false);
    add(cellar, new Mesh(new BoxGeometry(w, h, 0.02), [f, f, f, f, new MeshBasicMaterial({ map: t.tex }), f])).position.set(x, CY + y, z + 0.17);
  };
  // his portrait: a puffer fish in a gold chain, on green
  picture(OFFICE.x, 2.65, 1.0, 1.25, (c, w, h) => {
    c.fillStyle = '#2E4A3A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#E8B04A'; c.beginPath(); c.arc(w / 2, h * 0.48, w * 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#B8862E'; c.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.3, h * 0.48 + Math.sin(a) * w * 0.3); c.lineTo(w / 2 + Math.cos(a) * w * 0.38, h * 0.48 + Math.sin(a) * w * 0.38); c.stroke(); }
    c.fillStyle = '#1B1A1E'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * w * 0.1, h * 0.43, 6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#F2D06B'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h * 0.62, w * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  });
  // the ring's ranking sheet (banzuke): columns of brushed names under a heading
  picture(OFFICE.x + 2.4, 2.45, 1.5, 1.1, (c, w, h) => {
    c.fillStyle = '#EFE3C4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7A1E1E'; c.fillRect(w * 0.1, h * 0.07, w * 0.8, h * 0.12);
    c.strokeStyle = '#2A2420'; c.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = w * (0.12 + i * 0.095);
      c.beginPath(); c.moveTo(x, h * 0.28); c.lineTo(x, h * 0.92); c.stroke();
      for (let k = 0; k < 4; k++) { c.fillStyle = '#2A2420'; c.fillRect(x + 4, h * (0.32 + k * 0.15), w * 0.05, 5 + ((i + k) % 3) * 3); }
    }
  });
  // a clock
  for (const [c, r, y, d] of [[0xC9A23A, 0.36, 0.14, 0.05], [0xF4F1EA, 0.3, 0.17, 0.02]]) {
    const disc = add(cellar, mesh(G.cyl, c, OFFICE.x - 2.3, CY + 2.7, z + y)); disc.scale.set(r, d, r); disc.rotation.x = Math.PI / 2;
  }
  box(cellar, 0x1B1A1E, OFFICE.x - 2.3, CY + 2.77, z + 0.19, 0.03, 0.18, 0.01, false);
  box(cellar, 0x1B1A1E, OFFICE.x - 2.24, CY + 2.7, z + 0.19, 0.13, 0.03, 0.01, false);
  // brass wall lamps, each a glowing shade on a bracket
  for (const x of [OFFICE.x - 1.0, OFFICE.x + 1.0]) {
    box(cellar, 0xB8862E, x, CY + 3.0, z + 0.2, 0.06, 0.06, 0.3, false);
    add(cellar, mesh(G.cone, LANTERN_PAPER, x, CY + 3.08, z + 0.38)).scale.set(0.18, 0.22, 0.18);
  }
}
/** A thin plank wall, waist high so it never hides a room from the camera: boards on a stone sill, posts, and a rail
 *  along the top. Between two rooms it stands in the gap between their floors (`off` 0.3); round the outside, at the
 *  floor's edge. */
const WALL = 1.1;
function wall(r: Rect, side: Side, off = 0.1, parent: Object3D = cellar) {
  const along = side === 'n' || side === 's', at = line(r, side, off);
  for (const [a0, a1] of spans(r, side)) {
    const mid = (a0 + a1) / 2, len = a1 - a0;
    const put = (y: number, l: number, h: number, t: number, c: number) =>
      along ? box(parent, c, mid, CY + y, at, l, h, t) : box(parent, c, at, CY + y, mid, t, h, l);
    put(0.08, len, 0.16, 0.22, 0x4E4A46);
    put(WALL / 2, len, WALL, 0.12, WOOD);
    put(WALL + 0.04, len + 0.1, 0.08, 0.2, WOOD_DARK);
    const n = Math.max(1, Math.round(len / 1.8));
    for (let k = 0; k <= n; k++) {
      const a = a0 + (len * k) / n;
      along ? box(parent, WOOD_DARK, a, CY + WALL / 2, at, 0.16, WALL + 0.1, 0.16) : box(parent, WOOD_DARK, at, CY + WALL / 2, a, 0.16, WALL + 0.1, 0.16);
    }
  }
}
// the ground under it all, so nothing shows the void past a floor's edge
box(cellar, 0x2A201A, (ARENA.x0 + PREP.x1) / 2, CY - 0.3, (ARENA.z0 + PREP.z1) / 2, PREP.x1 - ARENA.x0 + 4, 0.5, PREP.z1 - ARENA.z0 + 4, false);
// the rooms: floors, and their walls (tall at the very back, thin and low everywhere else)
// (each room its own: packed earth round the ring and in the grow room, stone flags in the landing and the prep hall,
// parquet in the office, boards in the hearth room)
floor(ARENA, earth); floor(LANDING, flags); floor(OFFICE_ROOM, parquet); floor(KITCHEN, boards); floor(PREP, flags);
tallWall(ARENA, 'n'); tallWall(ARENA, 'w'); wall(ARENA, 's');
officeWall(); wall(OFFICE_ROOM, 'w', 0.3); wall(OFFICE_ROOM, 'e', 0.3);
wall(LANDING, 'n', 0.3); wall(LANDING, 'w', 0.3); wall(LANDING, 'e', 0.3);
wall(KITCHEN, 'n', 0.3); wall(KITCHEN, 'w', 0.3); wall(KITCHEN, 'e', 0.3); wall(KITCHEN, 's');
wall(PREP, 'e'); wall(PREP, 's');
// the prep hall's back: a stone wall with a locked gate the player walks past every day, until the gate opens on the
// grow room behind
stoneWall();
wall(PREP, 'n', 0.3, parts.grow);
{ // the gate, swung open into the grow room
  const t = DOORS.find(d => d.b === 'grow')!;
  bars(parts.grow, (t.x0 + t.x1) / 2, PREP.z0 - 0.4, t.x1 - t.x0 + 0.1, 1.75, Math.PI / 2 - 0.15);
}
floor(GROW, earth, 0.3, parts.grow); tallWall(GROW, 'n', parts.grow); wall(GROW, 'e', 0.1, parts.grow);
// ceiling beams over the arena's back
for (let x = ARENA.x0 + 1; x <= ARENA.x1; x += 2.2) box(cellar, WOOD_DARK, x, CY + 6.3, ARENA.z0 + 0.7, 0.25, 0.3, 2.4, false);
// the fans' tunnels: a doorway through the back wall, framed in timber with the wall carried on over it and a lantern
// over it, into a low dark passage, roofed over so nobody's seen till they come out
for (const t of TUNNELS) {
  const west = t.side === 'w', edge = west ? ARENA.x0 : ARENA.z0;
  /** A box `o` out from the arena's wall (into the tunnel) and `a` along it. */
  const put = (o: number, y: number, a: number, so: number, sy: number, sa: number, c: number, cast = false) =>
    west ? box(cellar, c, edge - o, CY + y, a, so, sy, sa, cast) : box(cellar, c, a, CY + y, edge - o, sa, sy, so, cast);
  const D = TUNNEL_D, W = TUNNEL_W;
  put(D / 2, 0.01, t.at, D, 0.02, W + 0.4, 0x2A1A12);
  for (const s of [-1, 1]) put(D / 2 + 0.1, 1.3, t.at + s * (W / 2 + 0.15), D, 2.6, 0.3, 0x2A201A);
  put(D + 0.1, 1.3, t.at, 0.2, 2.6, W + 0.6, 0x2A201A);
  put(D / 2 + 0.1, 2.7, t.at, D + 0.2, 0.2, W + 0.6, 0x2A201A);
  put(0.7, 4.4, t.at, 1.2, 4.0, W + 0.1, 0x2A201A);
  for (const s of [-1, 1]) put(0.05, 1.15, t.at + s * (W / 2 + 0.05), 0.16, 2.3, 0.16, WOOD_DARK, true);
  put(0.05, 2.36, t.at, 0.2, 0.16, W + 0.4, WOOD_DARK, true);
  west ? lantern(cellar, edge + 0.2, CY + 2.75, t.at, true) : lantern(cellar, t.at, CY + 2.75, edge + 0.2, true);
}

// the doorways: a timber frame in the wall, posts and a lintel
const FRAME_H = 2.0;
/** Whether a doorway's wall runs east-west (between rooms one behind the other), or north-south (side by side). */
const acrossX = (t: (typeof DOORS)[number]) => !Object.values(ROOMS).some(r => Math.abs(r.x1 - t.x0) < 0.01 || Math.abs(r.x0 - t.x1) < 0.01);
for (const t of DOORS) {
  const ax = acrossX(t), cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, w = (ax ? t.x1 - t.x0 : t.z1 - t.z0) + 0.6;
  const g = t.b === 'grow' ? parts.grow : cellar;
  for (const s of [-1, 1]) {
    ax ? box(g, WOOD_DARK, cx + s * w / 2, CY + FRAME_H / 2, cz, 0.2, FRAME_H, 0.22) : box(g, WOOD_DARK, cx, CY + FRAME_H / 2, cz + s * w / 2, 0.22, FRAME_H, 0.2);
  }
  ax ? box(g, WOOD_DARK, cx, CY + FRAME_H, cz, w + 0.3, 0.2, 0.26) : box(g, WOOD_DARK, cx, CY + FRAME_H, cz, 0.26, 0.2, w + 0.3);
}
/**
 * A room's name on a plaque facing the camera, `w` wide: on the room's back wall (standing on a low one's rail, or high
 * on a tall one), so each room's name is on its own side of the wall it's on; and the office's over its door.
 */
function sign(text: string, x: number, y: number, z: number, parent: Object3D = cellar, w = 1.3) {
  const h = w * 0.3, tex = canvasTex(256, 77, (c, cw, ch) => {
    c.fillStyle = '#15181D'; rr(c, 4, 4, cw - 8, ch - 8, 16); c.fill();
    c.fillStyle = '#F2C14E'; c.font = '800 44px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch / 2 + 3);
  });
  const edge = mat(0x15181D);
  const m = add(parent, new Mesh(new BoxGeometry(w, h, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge]));
  m.position.set(x, CY + y, z);
}
/** On a low wall along a room's back (`off` 0.3: between two rooms), standing on its rail; and just in front of a tall
 *  one's front beams. */
const onLow = (r: Rect) => r.z0 - 0.3 + 0.1, onTall = (r: Rect) => r.z0 - 0.1, onRail = WALL + 0.08 + 0.2;
const mid = (r: Rect) => (r.x0 + r.x1) / 2;
sign('RING', mid(ARENA), 2.85, onTall(ARENA), cellar, 2.2);
sign('KITCHEN', KITCHEN.x1 - 0.95, onRail, onLow(KITCHEN) - 0.1);
// the prep hall's: on its tall back wall, then on the low one once that's come down for the grow room
sign('PREP', mid(PREP), 2.85, onTall(PREP), parts.hidden, 1.8);
sign('PREP', mid(PREP) - 1.5, onRail, onLow(PREP) - 0.1, parts.grow);
sign('GROW ROOM', mid(GROW), 2.85, onTall(GROW), parts.grow, 2.2);
const door = (to: CellarRoom) => DOORS.find(t => t.b === to)!;
sign('OFFICE', (door('office').x0 + door('office').x1) / 2, FRAME_H + 0.3, LANDING.z0 - 0.15, cellar, 1.15);

// ---------- lanterns along the walls ----------
function lantern(parent: Object3D, x: number, y: number, z: number, red: boolean) {
  const g = add(parent, new Group()); g.position.set(x, y, z);
  add(g, mesh(G.sphere, red ? LANTERN_RED : LANTERN_PAPER)).scale.set(0.24, 0.31, 0.24);
  for (const s of [-1, 1]) add(g, mesh(G.cyl, 0x1B2430, 0, s * 0.29, 0)).scale.set(0.13, 0.05, 0.13);
  add(g, mesh(G.rope, 0x1B2430, 0, 0.6, 0)).scale.y = 0.6;
}
for (let x = ARENA.x0 + 1.5, i = 0; x <= ARENA.x1 - 1; x += 2.4, i++) lantern(cellar, x, CY + 3.6, ARENA.z0 + 0.1, i % 2 === 0);
for (let z = ARENA.z0 + 1.5, i = 0; z <= ARENA.z1 - 1; z += 2.4, i++) lantern(cellar, ARENA.x0 + 0.1, CY + 3.6, z, i % 2 === 1);

// ---------- the dohyo ----------
// A raised mound of clay, with steps cut into it, a square of straw bales round its top and the circle of bales inside
// it, sand on top raked smooth, and the two white lines they crouch behind. Over it, instead of a hanging roof (which
// would hide the bout from the camera above), the four posts of an old ring, each wrapped in its season's colour
// (green, red, white and black), with a purple rope and paper streamers between them along the back.
/** The sand on the ring's top: raked smooth, a little paler in a band round the straw circle. */
const sandTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#CFA56B'; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5);
  g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.55, 'rgba(255,240,210,.28)'); g.addColorStop(1, 'rgba(255,240,210,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = Math.sin(i * 12.9898) * 43758.5453, y = Math.sin(i * 78.233) * 43758.5453;
    c.fillStyle = i % 3 ? 'rgba(120,80,40,.10)' : 'rgba(255,245,220,.16)';
    c.fillRect((x - Math.floor(x)) * w, (y - Math.floor(y)) * h, 2, 2);
  }
});
/** A straw bale (tawara) lying along x, `len` long, at x, y, z in `parent`, turned `turn` about y. */
const BALE = new CylinderGeometry(0.13, 0.13, 1, 7);
function bale(parent: Object3D, x: number, y: number, z: number, len: number, turn: number, i: number) {
  const m = add(parent, mesh(BALE, i % 2 ? STRAW : 0xCDB56C, x, y, z, true));
  m.scale.y = len; m.rotation.set(0, turn, Math.PI / 2, 'YXZ');
  return m;
}
{
  const g = add(cellar, new Group()); g.position.copy(RING);
  const d = Math.SQRT2;
  // the mound: four-sided, so a turned cylinder is a square with sloping sides
  const base = add(g, mesh(new CylinderGeometry(RING_HALF * d, (RING_HALF + RING_FOOT) * d, RING_TOP, 4, 1), CLAY, 0, RING_TOP / 2, 0, true));
  base.rotation.y = Math.PI / 4;
  const top = add(g, new Mesh(new BoxGeometry(RING_HALF * 2 - 0.02, 0.02, RING_HALF * 2 - 0.02), [mat(CLAY), mat(CLAY), new MeshLambertMaterial({ map: sandTex.tex }), mat(CLAY), mat(CLAY), mat(CLAY)]));
  top.position.y = RING_TOP + 0.01; top.receiveShadow = true;
  // steps cut into the clay on each side, the east ones where the wrestlers come up
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 0; k < 2; k++) {
      const out = RING_HALF + RING_FOOT * (k ? 0.7 : 0.25), h = RING_TOP * (k ? 0.36 : 0.7);
      box(g, 0xB0814F, x * out, h / 2, z * out, x ? 0.4 : 1.3, h, x ? 1.3 : 0.4);
      bale(g, x * (out + (x ? 0.16 : 0)), h, z * (out + (z ? 0.16 : 0)), 1.2, x ? Math.PI / 2 : 0, k);
    }
  }
  // the square of bales round the top's edge
  const edge = RING_HALF - 0.15, n = 8, len = (edge * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = -edge + len * (i + 0.5);
    bale(g, a, RING_TOP + 0.08, edge, len - 0.04, 0, i); bale(g, a, RING_TOP + 0.08, -edge, len - 0.04, 0, i + 1);
    bale(g, edge, RING_TOP + 0.08, a, len - 0.04, Math.PI / 2, i); bale(g, -edge, RING_TOP + 0.08, a, len - 0.04, Math.PI / 2, i + 1);
  }
  // the circle of bales, with the four at the compass points set out a little (the tokudawara)
  const N = 24;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, r = RING_R + (i % 6 === 0 ? 0.12 : 0);
    bale(g, Math.cos(t) * r, RING_TOP + 0.08, Math.sin(t) * r, ((Math.PI * 2 * RING_R) / N) * 0.92, -t + Math.PI / 2, i);
  }
  // the two white lines they crouch behind
  for (const s of [-1, 1]) box(g, 0xFFFFFF, s * 0.42, RING_TOP + 0.03, 0, 0.08, 0.01, 0.7, false);
  // salt and water at the corners, outside the circle
  const c = RING_HALF - 0.55;
  add(g, mesh(G.cyl, 0x9C6644, c, RING_TOP + 0.16, -c, true)).scale.set(0.2, 0.32, 0.2);
  add(g, mesh(G.cyl, 0xFFFFFF, c, RING_TOP + 0.33, -c)).scale.set(0.17, 0.03, 0.17);
  add(g, mesh(G.cyl, 0x3C6E8F, -c, RING_TOP + 0.15, c, true)).scale.set(0.22, 0.3, 0.22);
  add(g, mesh(G.rope, WOOD, -c + 0.1, RING_TOP + 0.4, c, true)).rotation.z = 0.5;
  // the four posts, in the seasons' colours, with a tassel each, and the rope and streamers between them
  const POST = 3.4, at = RING_HALF + RING_FOOT * 0.5;
  [[1, -1, 0x2F8F5B], [1, 1, 0xC0392B], [-1, 1, 0xF4F1EA], [-1, -1, 0x1B2430]].forEach(([x, z, col]) => {
    log(g, col, x * at, POST / 2, z * at, 1.25, POST);
    box(g, WOOD_DARK, x * at, POST + 0.05, z * at, 0.38, 0.1, 0.38);
    add(g, mesh(G.cone, col, x * at, POST - 0.55, z * at, true)).scale.set(0.15, 0.6, 0.15);
    add(g, mesh(G.sphere, col, x * at, POST - 0.22, z * at)).scale.setScalar(0.1);
  });
  // the rope runs only along the back and west sides: on the near sides it would cut across the ring
  const ropeH = POST - 0.12;
  for (const along of ['x', 'z'] as const) {
    const r = add(g, mesh(G.log, PURPLE, along === 'x' ? 0 : -at, ropeH, along === 'x' ? -at : 0));
    r.scale.set(0.5, at * 2, 0.5);
    r.rotation.set(along === 'x' ? 0 : Math.PI / 2, 0, along === 'x' ? Math.PI / 2 : 0);
    // white paper streamers (shide) hanging from it
    for (let k = -2; k <= 2; k++) {
      const o = k * at * 0.36;
      const [x, z] = along === 'x' ? [o, -at] : [-at, o];
      box(g, 0xFFFFFF, x, ropeH - 0.2, z, along === 'x' ? 0.1 : 0.02, 0.3, along === 'x' ? 0.02 : 0.1, false);
    }
  }
}

// ---------- the stands: crates and planks, in tiers, with a cushioned seat for each fan ----------
/** A seat in the stands: where a fan sits (on the plank), which way they face, and which part it's in (swarm.ts). */
export interface Place { pos: Vector3; h: number; part: 'base' | 'bleachers' | 'tier' | 'vip' }
export const places: Place[] = [];
/** A stand's tiers: three when it's all built, the highest at the back wall, stepping down towards the ring. */
const TIERS = 3;
/** The seats' cushions: deep red, indigo and gold, in turn (colours the cellar already uses). */
const CUSHIONS = [0x8E2B2B, 0x2B3A67, 0xF2C14E];
/** Builds `tiers` of a stand along one wall, from tier `from` (counted out from the wall), into `g`, with places
 *  spaced along each. */
function stand(g: Group, part: Place['part'], along: 'x' | 'z', a0: number, a1: number, wall: number, out: number, from: number, tiers: number, gap: number) {
  for (let i = from; i < from + tiers; i++) {
    const h = 0.3 + (TIERS - 1 - i) * 0.42, at = wall + out * (0.45 + i * 0.85), len = Math.abs(a1 - a0), mid = (a0 + a1) / 2;
    const [cx, cz] = along === 'x' ? [mid, at] : [at, mid];
    box(g, i % 2 ? WOOD : 0x9C6644, cx, CY + h / 2, cz, along === 'x' ? len : 0.85, h, along === 'x' ? 0.85 : len);
    // the crates' slats, on the face towards the ring
    for (let k = -len / 2 + 0.6; k < len / 2; k += 2.1) {
      const [bx, bz] = along === 'x' ? [cx + k, cz + out * 0.43] : [cx + out * 0.43, cz + k];
      box(g, WOOD_DARK, bx, CY + h / 2, bz, along === 'x' ? 0.6 : 0.02, h - 0.02, along === 'x' ? 0.02 : 0.6, false);
    }
    const face = along === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let k = -len / 2 + 0.4, n = 0; k < len / 2 - 0.2; k += gap, n++) {
      const [px, pz] = along === 'x' ? [cx + k, cz] : [cx, cz + k];
      places.push({ pos: V(px, CY + h, pz), h: face, part });
      // a cushion (zabuton) on the plank for each seat, in the ring's colours
      box(g, CUSHIONS[(n + i) % CUSHIONS.length], px, CY + h + 0.03, pz, 0.46, 0.06, 0.46, false);
    }
  }
}
// the back stands (the two back tiers to start, the lowest, front one with the upper tier), and the west stands (the
// bleachers)
const BACK = { a0: RING.x - 5.6, a1: RING.x + 5.6, wall: ARENA.z0 + 0.1 };
const WEST = { a0: RING.z - 3.7, a1: RING.z + 3.7, wall: ARENA.x0 + 0.1 };
const baseStand = add(cellar, new Group());
stand(baseStand, 'base', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 0, 2, 0.62);
stand(parts.bleachers, 'bleachers', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 0, 2, 0.62);
stand(parts.tier, 'tier', 'x', BACK.a0, BACK.a1, BACK.wall, 1, 2, 1, 0.62);
stand(parts.tier, 'tier', 'z', WEST.a0, WEST.a1, WEST.wall, 1, 2, 1, 0.62);
// the VIP boxes: red cushioned chairs right by the ring, on its south side
const VIP_Z = RING.z + RING_HALF + RING_FOOT + 0.7;
for (let i = 0; i < 8; i++) {
  const x = RING.x - 3.15 + i * 0.9, z = VIP_Z;
  const chair = add(parts.vip, new Group()); chair.position.set(x, CY, z);
  box(chair, 0xC0392B, 0, 0.42, 0, 0.5, 0.12, 0.5);
  box(chair, 0xC0392B, 0, 0.75, 0.24, 0.5, 0.6, 0.1);
  box(chair, 0xF2C14E, 0, 0.2, 0, 0.42, 0.4, 0.42, false);
  places.push({ pos: V(x, CY + 0.25, z - 0.05), h: Math.PI, part: 'vip' });
}
/** Keeps a spectator's place hidden until it's built. */
export const placeBuilt = (p: Place) => p.part === 'base' || parts[p.part].visible;

// ---------- the arena's east side: the bowl stall, the gong and the cashier's window ----------
/** The stall's sign, a curtain over the counter: "ちゃんこ" in white on indigo. */
{
  // the stall: a long low counter facing the floor, a cloth over it, posts and a short roof of planks, and its sign
  const g = add(cellar, new Group()); g.position.set(STALL.x, CY, STALL.z);
  box(g, WOOD, 0, 0.45, 0, 0.7, 0.9, 2.2);
  box(g, 0x6B4130, 0, 0.92, 0, 0.82, 0.06, 2.3);
  box(g, 0x2B3A67, -0.36, 0.6, 0, 0.02, 0.5, 2.1, false);
  for (const z of [-1.05, 1.05]) box(g, WOOD_DARK, 0.3, 1.2, z, 0.1, 2.4, 0.1);
  box(g, WOOD_DARK, 0.1, 2.42, 0, 1.0, 0.08, 2.5);
  const tex = canvasTex(256, 96, (c, w, h) => {
    c.fillStyle = '#2B3A67'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#F4F1EA'; c.font = '800 54px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ちゃんこ', w / 2, h / 2 + 2);
  });
  const edge = mat(0x2B3A67);
  const sgn = add(g, new Mesh(new BoxGeometry(1.8, 0.5, 0.03), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge]));
  sgn.position.set(-0.3, 2.1, 0); sgn.rotation.y = -Math.PI / 2;
}
/** The gong: a bronze disc hung in a black frame (gong.ts swings it). */
export const gongDisc = new Group();
{
  const g = add(cellar, new Group()); g.position.set(GONG.x, CY, GONG.z); g.rotation.y = -Math.PI / 2;
  for (const s of [-1, 1]) box(g, 0x1B1A1E, s * 0.85, 1.25, 0, 0.12, 2.5, 0.12);
  box(g, 0x1B1A1E, 0, 2.5, 0, 1.95, 0.14, 0.16);
  box(g, 0x8E2B2B, 0, 2.62, 0, 2.1, 0.08, 0.22);
  gongDisc.position.set(0, 2.38, 0);
  g.add(gongDisc);
  const disc = add(gongDisc, mesh(new CylinderGeometry(0.62, 0.62, 0.05, 24), new MeshLambertMaterial({ color: 0xC9A23A, emissive: 0x5A3A0A }), 0, -0.95, 0, true));
  disc.rotation.x = Math.PI / 2;
  add(gongDisc, mesh(new TorusGeometry(0.62, 0.04, 6, 24), 0x8A6A1E, 0, -0.95, 0));
  add(gongDisc, mesh(G.cyl, 0xE0BE5A, 0, -0.95, 0.03)).scale.set(0.2, 0.02, 0.2);
  for (const s of [-1, 1]) add(gongDisc, mesh(G.rope, 0x3A2A20, s * 0.3, -0.17, 0)).scale.y = 0.32;
  // the mallet, leaning on the frame
  const m = add(g, new Group()); m.position.set(1.05, 0.55, 0.1); m.rotation.z = 0.25;
  add(m, mesh(G.rope, WOOD, 0, 0, 0)).scale.set(1.4, 1.1, 1.4);
  add(m, mesh(G.sphere, 0xC0392B, 0, 0.58, 0)).scale.setScalar(0.12);
}
/** The cashier's window, where the chips go: a cage window like a bookie's, its counter stacked with Fugu Chips. */
{
  const g = add(cellar, new Group()); g.position.set(CASHIER.x, CY, CASHIER.z); g.rotation.y = -Math.PI / 2;
  box(g, WOOD, 0, 0.5, 0, 2.2, 1, 0.8);
  box(g, 0x6B4130, 0, 1.02, 0.08, 2.3, 0.06, 1.0);
  for (let x = -1.05; x <= 1.06; x += 0.21) add(g, mesh(G.rope, 0x9AA4AC, x, 1.6, 0.38)).scale.y = 1.1;
  box(g, 0x9AA4AC, 0, 2.15, 0.38, 2.2, 0.05, 0.05);
  box(g, 0x2A201A, 0, 1.6, -0.45, 2.2, 2.2, 0.1, false);
  // stacks of chips: red, stamped with a gold puffer
  for (let i = 0; i < 6; i++) {
    const h = 3 + ((i * 5) % 4);
    for (let k = 0; k < h; k++) add(g, mesh(G.cyl, k % 2 ? 0xC0392B : 0xE8B04A, -0.7 + i * 0.28, 1.08 + k * 0.03, 0.25)).scale.set(0.11, 0.028, 0.11);
  }
  const tex = canvasTex(256, 80, (c, w, h) => {
    c.fillStyle = '#15181D'; rr(c, 4, 4, w - 8, h - 8, 16); c.fill();
    c.fillStyle = '#F2C14E'; c.font = '800 44px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CHIPS 🐡', w / 2, h / 2 + 3);
  });
  const edge = mat(0x15181D);
  add(g, new Mesh(new BoxGeometry(1.5, 0.46, 0.04), [edge, edge, edge, edge, new MeshBasicMaterial({ map: tex.tex }), edge])).position.set(0, 2.55, 0.3);
}

// ---------- the hearth room: the hearth and its pot, the ledge, the bowl counter ----------
{
  // a short indigo curtain (noren) in three strips hanging in the hearth room's doorway from the landing, with a white
  // crest on the middle one
  const t = door('kitchen'), span = t.x1 - t.x0 + 0.6, x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2 + 0.06;
  for (let i = -1; i <= 1; i++) {
    box(cellar, 0x2B3A67, x + i * span / 3, CY + FRAME_H - 0.35, z, span / 3 - 0.04, 0.5, 0.02, false).receiveShadow = false;
  }
  box(cellar, 0xF4F1EA, x, CY + FRAME_H - 0.32, z + 0.02, 0.16, 0.16, 0.01, false);

  // the hearth: a long clay stove with a glowing fire-mouth under the pot, and a prep counter behind it
  const H = HEARTH, g = add(cellar, new Group()); g.position.set(H.x, CY, H.z);
  box(g, 0x9A5B3E, 0, H.h / 2, 0, H.w, H.h, H.d);
  box(g, 0x5E3B2C, 0, H.h + 0.04, 0, H.w + 0.12, 0.08, H.d + 0.12);
  box(g, 0x7E4A33, 0, 0.06, 0, H.w + 0.2, 0.12, H.d + 0.2);
  // the ledge along its front, where each ingredient waits in its own tray
  box(g, 0x5E3B2C, 0, H.h * 0.75, H.d / 2 + 0.3, H.w - 0.2, 0.06, 0.6);
  for (const dx of [-0.7, 0, 0.7]) box(g, 0x3E2A20, dx, H.h * 0.75 + 0.04, H.d / 2 + 0.3, 0.6, 0.03, 0.5, false);
  const EMBER = glow(0xFF7A2A, 0xFF5A10);
  box(g, 0x1E1410, 0, 0.3, H.d / 2 + 0.005, 0.62, 0.36, 0.02, false);
  box(g, EMBER, 0, 0.2, H.d / 2 + 0.012, 0.46, 0.12, 0.02, false);
  for (const x of [-0.12, 0.1]) add(g, mesh(G.sphere, EMBER, x, 0.3, H.d / 2 + 0.02)).scale.set(0.08, 0.13, 0.03);
  add(g, mesh(new TorusGeometry(0.72, 0.05, 6, 24), IRON, 0, H.h + 0.09, 0)).rotation.x = Math.PI / 2;
  // the prep counter behind the hearth, against the wall: a board, a fish, cabbages and a knife
  const back = (KITCHEN.z0 - 0.3 + H.z - H.d / 2) / 2 - H.z;
  box(g, WOOD, 0, 0.45, back, H.w, 0.9, 0.35);
  box(g, 0xE6CFA0, -0.9, 0.92, back, 0.7, 0.04, 0.3);
  add(g, mesh(G.sphere, 0xE59A6B, -0.95, 0.98, back, true)).scale.set(0.28, 0.07, 0.1);
  box(g, 0xC9CDD2, -0.55, 0.95, back + 0.05, 0.26, 0.01, 0.05, false);
  for (const x of [0.3, 0.6, 1.25]) add(g, mesh(G.sphere, 0x8FC46A, x, 1.02, back, true)).scale.set(0.15, 0.13, 0.15);
}
/** The big iron pot of chanko on the hearth: stew to the brim, full of cabbage, tofu, carrot and fish, with a ladle in
 *  it (ringKitchen.ts adds the steam, and colours the stew by what's in it). */
export const potStew = new MeshLambertMaterial({ color: 0xC9803A });
export const potMesh = (() => {
  const g = add(cellar, new Group()); g.position.set(POT.x, CY, POT.z);
  const y = HEARTH.h + 0.08;
  // open, so the stew can sink inside it: an iron shell, its dark inside and a floor
  add(g, mesh(new CylinderGeometry(0.86, 0.66, 0.56, 20, 1, true), IRON, 0, y + 0.28, 0, true));
  add(g, mesh(new CylinderGeometry(0.82, 0.62, 0.56, 20, 1, true), new MeshLambertMaterial({ color: 0x1C1C20, side: BackSide }), 0, y + 0.28, 0));
  add(g, mesh(new CylinderGeometry(0.62, 0.62, 0.02, 20), 0x1C1C20, 0, y + 0.03, 0));
  add(g, mesh(new TorusGeometry(0.85, 0.06, 6, 24), 0x3E3E44, 0, y + 0.56, 0)).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) add(g, mesh(new TorusGeometry(0.12, 0.035, 5, 10), 0x3E3E44, s * 0.92, y + 0.44, 0)).rotation.y = Math.PI / 2;
  // the stew and what's in it, which rise and fall with the bowls waiting (ringKitchen moves this)
  const fill = add(g, new Group()); fill.name = 'potFill';
  add(fill, mesh(new CylinderGeometry(0.8, 0.8, 0.02, 20), potStew, 0, POT_TOP, 0));
  // what's in it, on a fixed scatter
  const bits: [number, number, number, number][] = [
    [0x8FC46A, 0.32, 0.05, 0.16], [0x8FC46A, 0.28, 0.05, 0.14], [0x8FC46A, 0.3, 0.05, 0.15], // cabbage
    [0xF4F1EA, 0.13, 0.11, 0.13], [0xF4F1EA, 0.13, 0.11, 0.13], [0xF4F1EA, 0.13, 0.11, 0.13], // tofu
    [0xE8833A, 0.1, 0.04, 0.1], [0xE8833A, 0.1, 0.04, 0.1], [0xE8833A, 0.1, 0.04, 0.1], // carrot
    [0xF2A68A, 0.18, 0.07, 0.12], [0xF2A68A, 0.18, 0.07, 0.12], // fish
  ];
  bits.forEach(([c, sx, sy, sz], i) => {
    const a = i * 2.4, r = 0.18 + ((i * 0.37) % 0.45), tofu = c === 0xF4F1EA;
    const m = add(fill, mesh(tofu ? G.box : G.sphere, c, Math.cos(a) * r, POT_TOP + 0.02, Math.sin(a) * r));
    m.scale.set(sx, sy, sz); m.rotation.y = a;
  });
  // the ladle, leaning on the rim
  const ladle = add(g, new Group()); ladle.position.set(0.55, POT_TOP + 0.05, -0.35); ladle.rotation.z = -0.6;
  add(ladle, mesh(G.rope, WOOD, 0, 0.5, 0)).scale.set(1.3, 1.1, 1.3);
  add(ladle, mesh(G.sphere, 0x9AA4AC, 0, -0.02, 0)).scale.set(0.13, 0.07, 0.13);
  return g;
})();
{
  // the counter the bowls come out on: a low table against the west wall by the arena's door, a cloth, and empty
  // bowls stacked at the end
  const t = add(cellar, new Group()); t.position.set(COUNTER.x, CY, COUNTER.z);
  box(t, WOOD, 0, 0.76, 0, 1.0, 0.08, 1.6);
  for (const [x, z] of [[-0.42, -0.7], [0.42, -0.7], [-0.42, 0.7], [0.42, 0.7]]) box(t, WOOD_DARK, x, 0.36, z, 0.09, 0.72, 0.09);
  box(t, 0x2B3A67, 0.2, 0.81, 0, 0.5, 0.01, 1.5, false);
  for (let i = 0; i < 4; i++) add(t, mesh(new CylinderGeometry(0.15, 0.09, 0.08, 12), 0xC0392B, -0.3, 0.84 + i * 0.07, -0.62));
}

// ---------- the prep hall: the two dumbwaiters, and the plate at the foot of each ----------
{
  // The dumbwaiters from the restaurant's kitchen upstairs, rice down one and fish down the other: tall timber shafts
  // up into the dark, open at the front (to the west), their chains and the wheels they go round at the top and
  // bottom (ringKitchen.ts sends their trays round, loaded on the way down; at the bottom each tips over and drops its
  // load onto the plate in front).
  for (const k of ['rice', 'fish'] as const) {
    const g = add(cellar, new Group()); g.position.set(LIFTS[k].x, CY, LIFTS[k].z); g.rotation.y = -Math.PI / 2;
    const W = 0.95, D = 0.85, L = LIFT_LOOP;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, WOOD_DARK, x * W / 2, LIFT_H / 2, z * D / 2, 0.12, LIFT_H, 0.12);
    for (let y = 0.4; y < LIFT_H; y += 1.4) {
      box(g, WOOD_DARK, 0, y, -D / 2, W, 0.1, 0.1);
      for (const s of [-1, 1]) box(g, WOOD_DARK, s * W / 2, y, 0, 0.1, 0.1, D);
    }
    // (its back boarded dark, so the trays going round in front of it show)
    box(g, 0x2A1E17, 0, LIFT_H / 2, -D / 2 + 0.02, W - 0.1, LIFT_H, 0.04, false);
    box(g, WOOD_DARK, 0, LIFT_H + 0.05, 0, W + 0.2, 0.14, D + 0.2);
    for (const s of [-1, 1]) {
      for (const z of [L.front, L.back]) add(g, mesh(G.rope, IRON, s * 0.36, (L.bottom + L.top) / 2, z)).scale.set(1.2, L.top - L.bottom, 1.2);
      for (const y of [L.bottom, L.top]) {
        const wheel = add(g, mesh(new CylinderGeometry(0.27, 0.27, 0.05, 14), IRON, s * 0.36, y, 0)); wheel.rotation.z = Math.PI / 2;
      }
    }
    // a lamp on its front post, lighting the trays coming down
    lantern(g, W / 2 + 0.05, 2.7, D / 2 + 0.05, false);
    // the plate at its foot, on a low stand: a wide glazed one for the rice, a steel one on ice for the fish
    const st = add(cellar, new Group()); st.position.set(BINS[k].x, CY, BINS[k].z);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(st, WOOD_DARK, x * 0.26, 0.27, z * 0.26, 0.07, 0.54, 0.07);
    box(st, WOOD, 0, 0.56, 0, 0.66, 0.05, 0.66);
    if (k === 'rice') {
      add(st, mesh(new CylinderGeometry(0.4, 0.3, 0.07, 18), 0xF2EAD8, 0, 0.62, 0, true));
      add(st, mesh(new TorusGeometry(0.39, 0.025, 5, 20), 0x355C9E, 0, 0.655, 0)).rotation.x = Math.PI / 2;
    } else {
      add(st, mesh(new CylinderGeometry(0.4, 0.34, 0.06, 18), 0x9AA5AE, 0, 0.61, 0, true));
      add(st, mesh(new CylinderGeometry(0.36, 0.36, 0.02, 18), 0xD9E4EA, 0, 0.645, 0));
    }
  }
  // rice sacks in the corner
  const k = add(cellar, new Group()); k.position.set(SACKS.x, CY, SACKS.z);
  [[0, 0, 0], [-0.45, 0.1, 0.5], [-0.2, 0.3, 0.3]].forEach(([x, z, r]) => {
    const sack = add(k, mesh(G.sphere, 0xE8DCC0, x, 0.32, z, true)); sack.scale.set(0.3, 0.34, 0.26); sack.rotation.y = r;
    add(k, mesh(G.cyl, 0xB08A5A, x, 0.64, z)).scale.set(0.08, 0.08, 0.08);
  });
  // a chalk board by the door, ruled into the three lines
  box(cellar, 0x23302A, PREP.x0 + 0.2, CY + 1.5, 2.6, 0.06, 0.9, 1.3, false);
}

// ---------- the grow room: dark earth, damp walls, and glowing toadstools in the corners ----------
{
  const SPORE = glow(0x9CE6C8, 0x2E9C7A);
  for (const [x, z] of [[GROW.x0 + 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z0 + 0.5], [GROW.x1 - 0.4, GROW.z1 - 0.6], [GROW.x0 + 0.5, GROW.z1 - 2.2]]) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7, r = 0.15 + i * 0.07;
      add(parts.grow, mesh(G.cyl, 0xE6DCC8, x + Math.cos(a) * r, CY + 0.08 + i * 0.03, z + Math.sin(a) * r)).scale.set(0.03, 0.16 + i * 0.05, 0.03);
      add(parts.grow, mesh(G.sphere, SPORE, x + Math.cos(a) * r, CY + 0.18 + i * 0.06, z + Math.sin(a) * r)).scale.set(0.09, 0.05, 0.09);
    }
  }
  // dripping pipes along the back
  for (let x = GROW.x0 + 1; x < GROW.x1; x += 3.1) add(parts.grow, mesh(G.log, 0x4A5A5A, x, CY + 2.6, GROW.z0 + 0.2)).scale.set(0.6, 5, 0.6);
}

// ---------- the teppo post, where the sparring partner slaps ----------
log(cellar, 0x7A5236, TEPPO.x, CY + 1.3, TEPPO.z, 2.2, 2.6);

// ---------- Mr. Fugu's office ----------
/** Mr. Fugu, behind his desk (dohyo.ts puffs him up when the crowd roars). */
export const boss = new Fugu();
/** The fish in his tank: little ones, each its own colour, up and down the glass at their own depth and pace. */
export const tankFish = new Group();
const FISH = [0xE8833A, 0xF2C14E, 0x4FA3D9, 0xE85A6A, 0xF4F1EA, 0xE8833A].map((c, i) => {
  const f = add(tankFish, new Group());
  add(f, mesh(G.sphere, c)).scale.set(0.028, 0.038, 0.07);
  const tail = add(f, new Group()); tail.position.z = -0.065;
  const fin = add(tail, mesh(G.cone, c, 0, 0, -0.025)); fin.scale.set(0.006, 0.05, 0.045); fin.rotation.x = Math.PI / 2;
  f.userData = { tail, x: -0.13 + (i % 3) * 0.13, y: 1.06 + i * 0.075, pace: 0.45 + (i % 4) * 0.12, phase: i * 1.7 };
  return f;
});
let swimT = 0;
/** The tank's fish swimming the length of it and back, wagging their tails, turning at the ends. */
export function swimTank(dt: number) {
  swimT += dt;
  for (const f of FISH) {
    const u = f.userData, a = swimT * u.pace + u.phase, dz = Math.cos(a);
    f.position.set(u.x, u.y + Math.sin(a * 2.3) * 0.02, Math.sin(a) * 0.55);
    f.rotation.y += ((dz >= 0 ? 0 : Math.PI) - f.rotation.y) * Math.min(1, dt * 6);
    u.tail.rotation.y = Math.sin(swimT * 11 + u.phase) * 0.5;
  }
}
{
  // the dais the desk stands on, carpeted red
  const D = DAIS, dw = D.x1 - D.x0, dd = D.z1 - D.z0;
  box(cellar, 0x4A2A1C, (D.x0 + D.x1) / 2, CY + D.h / 2, (D.z0 + D.z1) / 2, dw, D.h, dd);
  box(cellar, 0x8E2B2B, (D.x0 + D.x1) / 2, CY + D.h + 0.005, (D.z0 + D.z1) / 2 + 0.05, dw - 0.2, 0.01, dd - 0.1, false);
  // the desk: a mahogany top, two pedestals of drawers with brass pulls, a front panel with a gold trim
  const g = add(cellar, new Group()); g.position.set(OFFICE.x, CY + D.h, OFFICE.z);
  const MAHOGANY = 0x5A2618, DESK = 0x6E3220, BRASS = 0xC9A23A;
  box(g, MAHOGANY, 0, 0.8, 0, 2.5, 0.08, 0.9);
  for (const s of [-1, 1]) {
    box(g, DESK, s * 0.85, 0.38, 0, 0.7, 0.76, 0.8);
    for (const y of [0.18, 0.42, 0.64]) box(g, BRASS, s * 0.85, y, 0.41, 0.18, 0.03, 0.02, false);
  }
  box(g, DESK, 0, 0.5, 0.36, 1.0, 0.5, 0.06);
  box(g, BRASS, 0, 0.74, 0.4, 2.4, 0.03, 0.02, false);
  // on it: a green banker's lamp, bricks of cash, gold coins, a black telephone, and the ledger
  box(g, BRASS, -0.85, 0.86, -0.2, 0.2, 0.04, 0.14);
  add(g, mesh(G.rope, BRASS, -0.85, 1.0, -0.2)).scale.set(1.2, 0.3, 1.2);
  const shade = add(g, mesh(new CylinderGeometry(0.12, 0.12, 0.34, 10, 1, false, 0, Math.PI), glow(0x2F7A4A, 0x1E5A34), -0.85, 1.16, -0.2));
  shade.rotation.set(0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    box(g, 0x5E9C5A, 0.35 + (i % 3) * 0.24, 0.88 + Math.floor(i / 3) * 0.07, -0.15, 0.22, 0.07, 0.12);
    box(g, 0xF4F1EA, 0.35 + (i % 3) * 0.24, 0.88 + Math.floor(i / 3) * 0.07, -0.15, 0.05, 0.075, 0.125, false);
  }
  for (let i = 0; i < 4; i++) add(g, mesh(G.cyl, 0xF2C14E, 0.95, 0.86 + i * 0.025, 0.15)).scale.set(0.07, 0.02, 0.07);
  box(g, 0x1B1A1E, -0.35, 0.89, -0.25, 0.26, 0.1, 0.18);
  const handset = box(g, 0x1B1A1E, -0.35, 0.97, -0.25, 0.32, 0.05, 0.07); handset.rotation.y = 0.1;
  box(g, 0x7A1E1E, -0.1, 0.86, 0.15, 0.36, 0.04, 0.26);
  box(g, 0xEFE3C4, -0.1, 0.885, 0.15, 0.32, 0.01, 0.22, false);
  // his chair: tall and red, a throne of a desk chair
  const c = add(cellar, new Group()); c.position.set(OFFICE.x, CY + D.h, OFFICE.z - 1.35);
  const LEATHER = 0x6B1E22;
  box(c, LEATHER, 0, 0.45, 0, 0.8, 0.14, 0.6);
  box(c, LEATHER, 0, 1.05, -0.24, 0.86, 1.2, 0.14);
  for (const s of [-1, 1]) box(c, LEATHER, s * 0.42, 0.65, 0, 0.12, 0.3, 0.5);
  add(c, mesh(G.cyl, 0x2A2A2E, 0, 0.2, 0)).scale.set(0.06, 0.4, 0.06);
  for (let i = 0; i < 5; i++) {
    const leg = box(c, 0x2A2A2E, Math.cos(i * 1.257) * 0.2, 0.04, Math.sin(i * 1.257) * 0.2, 0.4, 0.04, 0.05); leg.rotation.y = -i * 1.257;
  }
  for (let x = -0.33; x <= 0.34; x += 0.165) add(c, mesh(G.sphere, BRASS, x, 1.62, -0.16)).scale.setScalar(0.03);
  // and him, standing behind the desk in front of it, a size bigger than the people who work for him
  boss.position.set(OFFICE.x, CY + D.h, OFFICE.z - 0.8);
  boss.scale.setScalar(1.15);
  cellar.add(boss);

  // his safe: black iron, a gold wheel and a dial, turned a little to the room
  const safe = add(cellar, new Group()); safe.position.copy(VAULT); safe.rotation.y = -0.45;
  // (the body stops short of the iron bands, so their tops aren't level with its own)
  box(safe, 0x2E3238, 0, 0.7, 0, 1.1, 1.32, 1.0);
  box(safe, 0x3A3F46, 0, 0.7, 0.505, 0.94, 1.24, 0.02, false);
  add(safe, mesh(new TorusGeometry(0.2, 0.035, 6, 16), BRASS, 0.1, 0.7, 0.53));
  for (let i = 0; i < 4; i++) { const spoke = box(safe, BRASS, 0.1, 0.7, 0.53, 0.4, 0.03, 0.02, false); spoke.rotation.z = i * Math.PI / 4; }
  const dial = add(safe, mesh(G.cyl, 0xE8E4D8, -0.28, 0.95, 0.53)); dial.scale.set(0.09, 0.03, 0.09); dial.rotation.x = Math.PI / 2;
  for (const y of [0.05, 1.36]) box(safe, 0x1E2024, 0, y, 0, 1.14, 0.08, 1.04);

  // the visitors' chairs, facing the desk, on the rug from the door (in the middle of the wall, facing the desk)
  const door = DOORS.find(t => t.b === 'office')!;
  box(cellar, 0xC9A23A, (door.x0 + door.x1) / 2, CY + 0.01, (DAIS.z1 + OFFICE_ROOM.z1) / 2, 3.0, 0.02, OFFICE_ROOM.z1 - DAIS.z1 - 0.2, false);
  box(cellar, 0x8E2B2B, (door.x0 + door.x1) / 2, CY + 0.02, (DAIS.z1 + OFFICE_ROOM.z1) / 2, 2.8, 0.02, OFFICE_ROOM.z1 - DAIS.z1 - 0.4, false);
  for (const at of GUESTS) {
    const ch = add(cellar, new Group()); ch.position.set(at.x, CY, at.z); ch.rotation.y = Math.PI;
    for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) box(ch, WOOD_DARK, x, 0.22, z, 0.06, 0.44, 0.06);
    box(ch, 0xA8322D, 0, 0.47, 0, 0.52, 0.08, 0.5);
    box(ch, WOOD_DARK, 0, 0.8, -0.23, 0.52, 0.6, 0.06);
  }
  // the filing cabinet, with a lucky cat on it, waving
  const cab = add(cellar, new Group()); cab.position.set(CABINET.x, CY, CABINET.z);
  box(cab, 0x5B4636, 0, 0.7, 0, 0.6, 1.4, 0.8);
  for (const y of [0.35, 0.8, 1.2]) box(cab, BRASS, -0.31, y, 0, 0.02, 0.05, 0.22, false);
  add(cab, mesh(G.sphere, 0xF4F1EA, 0, 1.55, 0)).scale.set(0.15, 0.16, 0.13);
  add(cab, mesh(G.sphere, 0xF4F1EA, 0, 1.76, 0)).scale.setScalar(0.12);
  for (const s of [-1, 1]) add(cab, mesh(G.cone, 0xF4F1EA, 0, 1.86, s * 0.07)).scale.set(0.04, 0.07, 0.04);
  add(cab, mesh(G.sphere, 0xF4F1EA, -0.02, 1.8, 0.14)).scale.set(0.05, 0.08, 0.05);
  add(cab, mesh(G.cyl, 0xC0392B, 0, 1.66, 0)).scale.set(0.12, 0.02, 0.12);
  add(cab, mesh(G.cyl, 0xF2C14E, -0.12, 1.55, 0)).scale.set(0.06, 0.02, 0.06);
  // a fish tank on a cabinet against the west wall, with a little puffer in it
  const tank = add(cellar, new Group()); tank.position.set(TANK.x, CY, TANK.z);
  box(tank, 0x3E2418, 0, 0.42, 0, 0.6, 0.84, 1.5);
  box(tank, 0xC9B98E, 0, 0.9, 0, 0.5, 0.08, 1.4, false);
  const glass = add(tank, mesh(G.box, new MeshLambertMaterial({ color: 0x7FC4E8, emissive: 0x1E4A66, transparent: true, opacity: 0.45, depthWrite: false }), 0, 1.2, 0));
  glass.scale.set(0.52, 0.66, 1.42); glass.renderOrder = 1;
  box(tank, 0x1B1A1E, 0, 1.55, 0, 0.56, 0.05, 1.46, false);
  // a weed or two, and the little puffer on the sand (the swimmers are tankFish, below)
  add(tank, mesh(G.sphere, 0xEBD38E, 0.05, 1.04, 0.3)).scale.setScalar(0.07);
  for (const [z, h] of [[0.45, 0.25], [0.55, 0.18], [-0.5, 0.22]]) add(tank, mesh(G.cone, 0x5E9C5A, 0.08, 0.94 + h / 2, z)).scale.set(0.04, h, 0.04);
  tankFish.position.copy(tank.position);
  cellar.add(tankFish);
  // a plant in the corner, and the coat rack by the door with his spare hat
  const plant = add(cellar, new Group()); plant.position.set(PLANT.x, CY, PLANT.z);
  add(plant, mesh(new CylinderGeometry(0.28, 0.22, 0.5, 12), 0x8E4A2E, 0, 0.25, 0, true));
  for (const [x, y, z, r] of [[0, 0.8, 0, 0.32], [0.15, 1.05, 0.05, 0.24], [-0.12, 1.0, -0.08, 0.22], [0, 1.25, 0, 0.18]]) {
    add(plant, mesh(G.sphere, 0x3E7A3E, x, y, z, true)).scale.setScalar(r);
  }
  const rack = add(cellar, new Group()); rack.position.set(RACK.x, CY, RACK.z);
  add(rack, mesh(G.cyl, WOOD_DARK, 0, 0.9, 0, true)).scale.set(0.04, 1.8, 0.04);
  for (let i = 0; i < 3; i++) { const foot = box(rack, WOOD_DARK, 0, 0.03, 0, 0.5, 0.04, 0.05); foot.rotation.y = i * Math.PI / 3; }
  // his spare, not another of the fedora he's wearing: a straw boater with a navy band, the same size (fugu.ts' brim, at
  // his 1.15), hung on the top of the pole
  const spare = add(rack, new Group()); spare.position.set(0.06, 1.84, 0); spare.rotation.set(0.12, 0, -0.2);
  add(spare, mesh(new CylinderGeometry(0.425, 0.425, 0.028, 20), STRAW, 0, 0, 0, true));
  add(spare, mesh(new TorusGeometry(0.425, 0.016, 5, 24), 0xC9AE62)).rotation.x = Math.PI / 2;
  add(spare, mesh(new CylinderGeometry(0.25, 0.26, 0.17, 18), STRAW, 0, 0.095, 0, true));
  add(spare, mesh(new CylinderGeometry(0.265, 0.265, 0.06, 18), 0x1F3A5F, 0, 0.045, 0));
  add(rack, mesh(G.box, 0xC49A5A, -0.1, 1.35, 0, true)).scale.set(0.12, 0.7, 0.3);
}

// ---------- the ladder up to the dock, in the daylight coming down through the hatch ----------
{
  const g = add(cellar, new Group()); g.position.copy(LADDER); g.rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) box(g, WOOD, s * 0.3, 3.4, 0, 0.08, 6.8, 0.08);
  for (let y = 0.35; y < 6.6; y += 0.42) box(g, WOOD, 0, y, 0, 0.6, 0.05, 0.06);
  const beam = add(g, mesh(new ConeGeometry(BEAM_R, 7.2, 20, 1, true), new MeshBasicMaterial({ color: 0xBFE3FF, transparent: true, opacity: 0.09, blending: AdditiveBlending, depthWrite: false })));
  beam.position.y = 3.6;
  beam.renderOrder = 2;
}

// ---------- the drummers' drums (the Underground Arena's) ----------
export const DRUMS = [V(-9.9, CY, RING.z - 2.6), V(-9.9, CY, RING.z + 2.6)];
for (const at of DRUMS) {
  const g = add(parts.drums, new Group()); g.position.set(at.x, CY, at.z);
  const d = add(g, mesh(new CylinderGeometry(0.42, 0.42, 0.55, 16), 0x7A3B2E, 0, 0.75, 0, true));
  d.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) add(g, mesh(new CylinderGeometry(0.43, 0.43, 0.02, 16), 0xF2E6CC, s * 0.28, 0.75, 0)).rotation.z = Math.PI / 2;
  box(g, WOOD_DARK, 0, 0.3, 0, 0.5, 0.6, 0.5);
}

/** Puts up the venue's tier `t` (0 to 3), and everything below it: the stands it adds, and its decorations. */
export function showVenue(t: number) {
  parts.bleachers.visible = t >= 1;
  parts.tier.visible = parts.drums.visible = t >= 2;
  parts.vip.visible = t >= 3;
}
/** The grow room is found: the prep hall's stone wall comes down, its gate open, and there it is. */
export function showGrowRoom(on = true) {
  parts.grow.visible = on;
  parts.hidden.visible = !on;
  found.grow = on;
  lights[7].intensity = on ? GROW_GLOW : 0;
}

// ---------- light ----------
/** The cellar's lights: the lamp over the ring, two lanterns' worth of warm light over the stands, the hearth's fire
 *  (lighting the hearth room), the hatch's daylight (the landing), the office's lamp, the dumbwaiter's lamp in the prep
 *  hall, and (once it's found) the grow room's sickly glow. */
export const lights = [
  new PointLight(0xFFD7A0, 16, 15, 1.2), new PointLight(0xFF9A5A, 9, 10, 1.5), new PointLight(0xFF9A5A, 9, 10, 1.5),
  new PointLight(0xFF9A4A, 8, 8, 1.5), new PointLight(0xCFE8FF, 10, 7, 1.4), new PointLight(0xFFC77A, 8, 9, 1.4),
  new PointLight(0xFFD08A, 8, 9, 1.4), new PointLight(0x9CE6C8, 9, 11, 1.4),
];
lights[0].position.set(RING.x, CY + 5.4, RING.z);
lights[1].position.set(RING.x, CY + 3.4, ARENA.z0 + 1.5);
lights[2].position.set(ARENA.x0 + 1.5, CY + 3.4, RING.z + 1);
lights[3].position.set(HEARTH.x, CY + 1.1, HEARTH.z + 1.3);
lights[4].position.set(LADDER.x - 1.2, CY + 4, LADDER.z + 0.8);
lights[5].position.set(OFFICE.x + 1.5, CY + 3.4, OFFICE.z + 1.2);
lights[6].position.set((PREP.x0 + PREP.x1) / 2 + 1, CY + 3.2, (PREP.z0 + PREP.z1) / 2);
lights[7].position.set((GROW.x0 + GROW.x1) / 2, CY + 3.0, (GROW.z0 + GROW.z1) / 2);
const GROW_GLOW = lights[7].intensity;
lights[7].intensity = 0;
lights.forEach(l => { l.visible = false; scene.add(l); });
/** The cellar's sky: near-black brown, warm low light, as stage.ts's day and dusk are for the world above. */
export const CELLAR_SKY = { bg: new Color(0x1B1512), sky: 0xFFD7A8, grd: 0x4A3428, hemi: 0.4, sun: 0xFFC98F, sunI: 0.34 };

/** Shows the cellar (stage 3). */
export function showCellar() { cellar.visible = true; }
/** The cellar's lights on while the player's down there, off above (each light costs every material in the scene). */
// (the grow room's glow is there all along, dark till it's found: lighting a new light mid-bout would recompile every
// material in the scene)
export function cellarLights(on: boolean) { lights.forEach(l => { l.visible = on; }); }

// ---------- walking ----------
/** What a walker can't walk through down here, as boxes (centre and half-sizes, a walker's width included): the ring,
 *  the stands, the stall, the gong and the cashier's window, the hearth and the counter, the dumbwaiter and its bins,
 *  the machines built so far, the teppo post, the office's furniture, and what the venue's tiers add. (The rooms'
 *  walls are where the floor ends: layout.ts.) */
export function cellarBoxes(machines: Record<'rice' | 'fish' | 'mush', number> = { rice: 0, fish: 0, mush: 0 }) {
  const t = parts.tier.visible;
  const boxes: [cx: number, cz: number, hx: number, hz: number][] = [
    [RING.x, RING.z, RING_HALF + RING_FOOT + 0.2, RING_HALF + RING_FOOT + 0.2],
    [(BACK.a0 + BACK.a1) / 2, BACK.wall + (t ? 1.5 : 1.1), (BACK.a1 - BACK.a0) / 2 + 0.2, t ? 1.65 : 1.2],
    [STALL.x, STALL.z, 0.55, 1.3],
    [GONG.x, GONG.z, 0.45, 1.15],
    [CASHIER.x, CASHIER.z, 0.65, 1.3],
    [TEPPO.x, TEPPO.z, 0.5, 0.5],
    // the hearth room: the hearth and the counter behind it, and the bowl counter
    [HEARTH.x, (KITCHEN.z0 + HEARTH.z + HEARTH.d / 2 + 0.6) / 2, HEARTH.w / 2 + 0.3, (HEARTH.z + HEARTH.d / 2 + 0.6 - KITCHEN.z0) / 2 + 0.3],
    [COUNTER.x, COUNTER.z, 0.75, 1.05],
    // the prep hall: the dumbwaiters, their plates, the sacks
    // (long enough along the wall to meet the sacks and the bins in the corners, leaving no slot between to wedge into)
    [LIFTS.rice.x, LIFTS.rice.z, 0.6, 0.95],
    [LIFTS.fish.x, LIFTS.fish.z, 0.6, 0.95],
    [BINS.rice.x, BINS.rice.z, 0.5, 0.5],
    [BINS.fish.x, BINS.fish.z, 0.5, 0.5],
    [SACKS.x, SACKS.z, 0.75, 0.75],
    ...KITCHEN_BINS.map((b): [number, number, number, number] => [b.x, b.z, 0.65, 0.65]),
    // the office: the dais and the desk, the safe, the visitors' chairs, the cabinet, the fish tank, the plant and the rack
    [(DAIS.x0 + DAIS.x1) / 2, (DAIS.z0 + DAIS.z1) / 2, (DAIS.x1 - DAIS.x0) / 2 + 0.3, (DAIS.z1 - DAIS.z0) / 2 + 0.3],
    [VAULT.x, VAULT.z, 0.9, 0.85],
    ...GUESTS.map((g): [number, number, number, number] => [g.x, g.z, 0.5, 0.5]),
    [CABINET.x, CABINET.z, 0.6, 0.7],
    [TANK.x, TANK.z, 0.6, 1.05],
    [PLANT.x, PLANT.z, 0.55, 0.55],
    [RACK.x, RACK.z, 0.4, 0.4],
  ];
  for (const k of ['rice', 'fish', 'mush'] as const) {
    if (k === 'mush' && !found.grow) continue;
    for (let i = 0; i < Math.min(MAX_MACHINES, machines[k]); i++) {
      const m = machineAt(k, i);
      boxes.push(k === 'mush' ? [m.x, m.z, 1.25, 0.65] : [m.x, m.z, 0.5, 0.5]);
    }
  }
  if (parts.bleachers.visible) boxes.push([WEST.wall + (t ? 1.5 : 1.1), (WEST.a0 + WEST.a1) / 2, t ? 1.65 : 1.2, (WEST.a1 - WEST.a0) / 2 + 0.2]);
  if (parts.vip.visible) boxes.push([RING.x, VIP_Z + 0.05, 3.75, 0.5]);
  if (parts.drums.visible) for (const d of DRUMS) boxes.push([d.x, d.z, 0.6, 0.6]);
  return boxes;
}
/** Keeps the player out of everything in the cellar they can't walk through: out by the nearest side that's clear of
 *  every box and still on the floor. (Pushed out of each box in turn, two that touch, or one against a wall, would
 *  bounce them back and forth between, a frame each.) */
export function collideCellar(p: XZ, machines?: Record<'rice' | 'fish' | 'mush', number>) {
  const boxes = cellarBoxes(machines), floors = walkable();
  const inside = (x: number, z: number, [cx, cz, hx, hz]: (typeof boxes)[number], e = 1e-6) => Math.abs(x - cx) < hx - e && Math.abs(z - cz) < hz - e;
  const blocked = (x: number, z: number) => boxes.some(b => inside(x, z, b));
  if (!blocked(p.x, p.z)) return;
  let bx = 0, bz = 0, bd = Infinity;
  for (const b of boxes) {
    if (!inside(p.x, p.z, b, 0)) continue;
    const [cx, cz, hx, hz] = b;
    for (const [x, z] of [[cx - hx, p.z], [cx + hx, p.z], [p.x, cz - hz], [p.x, cz + hz]]) {
      const q = { x, z }; keepOnFloor(q, floors);
      const d = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (q.x === x && q.z === z && d < bd && !blocked(x, z)) { bd = d; bx = x; bz = z; }
    }
  }
  if (bd < Infinity) { p.x = bx; p.z = bz; return; }
  for (const [cx, cz, hx, hz] of boxes) pushOutOfBox(p, cx, cz, hx, hz);
}

// ---------- one mesh for the furniture ----------
/** The vertex-coloured material the furniture's baked with, by side. */
const bakedMats = new Map<Facing, MeshLambertMaterial>();
const bakedMat = (side: Facing) => bakedMats.get(side) ?? bakedMats.set(side, new MeshLambertMaterial({ vertexColors: true, side })).get(side)!;
/** Whether a mesh is plain furniture: one flat colour, nothing drawn on it, not glowing, not see-through. */
const plain = (m: Material | Material[]): m is MeshLambertMaterial => !Array.isArray(m) && m instanceof MeshLambertMaterial
  && !m.map && !m.transparent && m.opacity === 1 && !m.vertexColors && m.emissive.getHex() === 0;
/**
 * Bakes the still furniture under `root` into a few meshes: every plain one that's shown is merged, its colour as a
 * vertex colour, into one mesh per side and shadow setting, in `root`'s own space (so a part popping in still pops).
 * What moves or changes (`keep`) is left as it is. The cellar has nearly two thousand meshes, and a phone can't draw
 * that many one by one with a boss's crowd on the floor.
 */
function bakeStill(root: Object3D, keep: Set<Object3D>) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), m4 = new Matrix4();
  const bins = new Map<string, BufferGeometry[]>(), baked: Mesh[] = [];
  const walk = (o: Object3D) => {
    for (const c of o.children) {
      if (keep.has(c) || !c.visible) continue;
      const m = c as Mesh;
      if (!m.isMesh || (m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || c.children.length || !plain(m.material)) { walk(c); continue; }
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      m4.multiplyMatrices(toRoot, m.matrixWorld);
      g.applyMatrix4(m4);
      // (mirrored, its triangles turn inside out: turned back)
      if (m4.determinant() < 0) {
        for (const a of [g.attributes.position, g.attributes.normal]) {
          for (let i = 0; i < a.count; i += 3) for (let j = 0; j < a.itemSize; j++) { const t = a.array[(i + 1) * a.itemSize + j]; a.array[(i + 1) * a.itemSize + j] = a.array[(i + 2) * a.itemSize + j]; a.array[(i + 2) * a.itemSize + j] = t; }
        }
      }
      paint(g, m.material.color.getHex());
      const key = `${+m.castShadow}${+m.receiveShadow}${m.material.side}`;
      (bins.get(key) ?? bins.set(key, []).get(key)!).push(g);
      baked.push(m);
    }
  };
  walk(root);
  for (const m of baked) m.removeFromParent();
  for (const [key, geos] of bins) {
    const o = new Mesh(mergeGeometries(geos)!, bakedMat(Number(key[2]) as Facing));
    o.castShadow = key[0] === '1'; o.receiveShadow = key[1] === '1';
    root.add(o);
    geos.forEach(g => g.dispose());
  }
}
// (the gong's disc swings, the pot's stew changes colour, Mr. Fugu puffs up; and the venue's parts and the grow room
// come and go, so each is baked on its own)
bakeStill(cellar, new Set<Object3D>([gongDisc, potMesh, boss, tankFish, ...Object.values(parts)]));
for (const g of Object.values(parts)) bakeStill(g, new Set());
