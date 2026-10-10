// Floe Sushi's furniture and its dishes on High graphics (graphics.ts), built with the kit (kit.ts) the way the people
// are: the bar with its wood lip and kick plate, the belt's chain of slats, the steel kitchen line with its doors and
// handles, the rice cookers, the register, the stools and the chefs' boards, and the rounder slices, sacks, boxes and
// plates that get passed around. Each builds around its own middle (or, for the big pieces, around its group's origin);
// restaurant.ts and items.ts put them beside their Low versions. Call these inside `quietly` (kit.ts), so building
// them never touches the game's luck.
import {
  BufferAttribute, BufferGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, type Mesh, Shape, SphereGeometry,
  Vector2, Vector3, type Path,
} from 'three';
import { onQuality, isHigh } from './graphics';
import { Build, K, mix, quietly, rbox, shade, tube } from './kit';
import { G } from './render';

const STEEL = 0xB8C4CC, STEEL_TOP = 0xE9EEF2, CHROME = 0xD5DEE5, WOOD = 0xB5774A, HINOKI = 0xE9D9C0, KNIFE_GRIP = 0x4A2F22;

// ---------- the bar ----------
/** A stadium (straights `L` either side of the middle, joined by half circles) of radius `r`, on `p`. */
function stadium(p: Path, L: number, r: number) {
  p.moveTo(-L, -r); p.lineTo(L, -r);
  p.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
  p.lineTo(-L, r);
  p.absarc(-L, 0, r, Math.PI / 2, Math.PI * 1.5, false);
}
/**
 * The band between stadiums of radius r0 and r1, from y0 up to y1, its edges rounded off by `bevel` without
 * growing past r0 and r1. Lies flat (in x-z) once added with `flat`.
 */
function ring(L: number, r0: number, r1: number, y0: number, y1: number, bevel = 0) {
  const s = new Shape(); stadium(s, L, r1);
  const hole = new Shape(); stadium(hole, L, r0); s.holes.push(hole);
  return new ExtrudeGeometry(s, {
    depth: y1 - y0 - bevel * 2, curveSegments: 18, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelOffset: -bevel, bevelSegments: 2,
  });
}
const flat: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * The sushi bar round the belt, around its middle, the floor at `fy`: a lacquered body on a dark kick plate, panelled
 * between the seats, a cream counter top with a wood lip on its outer edge, and the belt's steel channel. `L` and the
 * radii are the bar's (restaurant.ts); the counter top is `h` up, exactly where the Low one's is.
 */
export function sushiBar(L: number, rIn: number, rOut: number, h: number, beltR: number, beltHalf: number, fy: number) {
  const b = new Build(), body = 0x7A3B2E, top = HINOKI;
  const add = (r0: number, r1: number, y0: number, y1: number, c: number, bevel = 0) =>
    b.add(ring(L, r0, r1, y0, y1, bevel), c, 0, fy + y0 + bevel, 0, flat);
  // kick plate, set back a little under the body
  add(rIn + 0.04, rOut - 0.04, 0, 0.11, 0x3A2420);
  add(rIn, rOut, 0.1, h - 0.04, body, 0.015);
  // panels between the seats on the straights, and round the ends
  const trim = shade(body, 1.22), th = h - 0.26, ty = fy + 0.15 + th / 2;
  for (let x = -L + 0.525; x < L; x += 1.05) for (const s of [-1, 1]) b.add(rbox(0.05, th, 0.03, 0.012), trim, x, ty, s * (rOut + 0.008));
  for (const s of [-1, 1]) for (const a of [-Math.PI / 3, 0, Math.PI / 3]) {
    const r = rOut + 0.008;
    b.add(rbox(0.05, th, 0.03, 0.012), trim, s * (L + Math.cos(a) * r), ty, Math.sin(a) * r, [0, s * Math.PI / 2 - a * s, 0]);
  }
  // a rail just over the kick plate
  add(rOut - 0.005, rOut + 0.01, 0.13, 0.17, shade(body, 0.8), 0.006);
  // the counter top: cream, with a rounded wood lip round the outside and a thin one on the chefs' side
  add(rIn + 0.03, rOut - 0.08, h - 0.05, h, top);
  add(rOut - 0.09, rOut + 0.03, h - 0.07, h, WOOD, 0.015);
  add(rIn - 0.01, rIn + 0.04, h - 0.06, h, WOOD, 0.012);
  // the belt's channel: a dark bed between two steel rails
  add(beltR - beltHalf, beltR + beltHalf, h - 0.01, h + 0.003, 0x26323B);
  for (const s of [-1, 1]) {
    const r = beltR + s * (beltHalf + 0.017);
    add(r - 0.017, r + 0.017, h - 0.01, h + 0.03, CHROME, 0.007);
  }
  return b;
}

/** One slat of the belt's chain, `len` along it and `w` across, its ends riding on steel links. */
export function beltSlat(len: number, w: number) {
  const b = new Build();
  b.add(rbox(len, 0.01, w - 0.03, 0.004), 0x3C4C58, 0, 0, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(len * 0.8, 0.012, 0.022, 0.005), 0x8A99A6, 0, -0.001, s * (w / 2 - 0.012));
  }
  return b;
}

// ---------- the kitchen line ----------
/**
 * The steel kitchen line, `w` long and `d` deep, its top `h` up from the floor at `fy`, around its middle: a cabinet on
 * a dark plinth, its doors on both long sides with bar handles, a rounded top with a drip lip, and on it the glass
 * case's steel frame and bed of ice with six blocks of fish (salmon and tuna with their fat lines, tamago in a band of
 * nori), two rice cookers with their buttons and lid handles, and the chopping board under the tuna with a knife.
 * The glass itself is drawn apart from this (see-through). Returns what casts a shadow, and the small things that don't.
 */
export function kitchenLine(w: number, d: number, h: number, fy: number) {
  const b = new Build(), fine = new Build();
  b.add(rbox(w - 0.1, 0.08, d - 0.1, 0.02), shade(STEEL, 0.55), 0, fy + 0.04, 0);
  b.add(rbox(w, h - 0.08, d, 0.03), STEEL, 0, fy + 0.08 + (h - 0.08) / 2, 0);
  const n = Math.round(w), dw = w / n;
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const x = -w / 2 + dw * (i + 0.5), z = s * (d / 2 + 0.008);
    b.add(rbox(dw - 0.08, h - 0.26, 0.02, 0.01), shade(STEEL, 1.07), x, fy + 0.13 + (h - 0.26) / 2, z);
    // a bar handle on two little posts, near the top of each door
    fine.add(rbox(dw * 0.36, 0.022, 0.022, 0.009), CHROME, x, fy + h - 0.17, z + s * 0.035);
    for (const e of [-1, 1]) fine.add(tube(0.008, 0.008, 0.03, 6), CHROME, x + e * dw * 0.15, fy + h - 0.17, z + s * 0.017, [Math.PI / 2, 0, 0]);
  }
  b.add(rbox(w + 0.06, 0.05, d + 0.06, 0.02), STEEL_TOP, 0, fy + h + 0.01, 0);
  for (const s of [-1, 1]) fine.add(rbox(w + 0.04, 0.012, 0.02, 0.005), shade(STEEL_TOP, 0.92), 0, fy + h + 0.038, s * (d / 2 + 0.015));

  // the glass case: steel corners and rim, a tray of crushed ice, the fish laid on it
  const gy = fy + h + 0.04, gh = 0.42, gw = 2.4, gd = 0.7;
  b.add(rbox(gw + 0.04, 0.025, gd + 0.04, 0.01), CHROME, 0, fy + h + 0.045, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) fine.add(tube(0.014, 0.014, gh, 6), CHROME, sx * gw / 2, gy + gh / 2, sz * gd / 2);
  for (const s of [-1, 1]) {
    fine.add(rbox(gw + 0.03, 0.025, 0.025, 0.01), CHROME, 0, gy + gh, s * gd / 2);
    fine.add(rbox(0.025, 0.025, gd + 0.03, 0.01), CHROME, s * gw / 2, gy + gh, 0);
  }
  b.add(rbox(gw - 0.1, 0.02, gd - 0.18, 0.008), 0xF2F8FB, 0, fy + h + 0.065, 0);
  [0xFF8A5C, 0xD8394B, 0xFFD24A, 0xFF8A5C, 0xD8394B, 0xFFD24A].forEach((c, i) => {
    const x = -0.95 + i * 0.38, y = fy + h + 0.07;
    b.add(rbox(0.32, 0.06, 0.24, 0.015), c, x, y, 0);
    if (c === 0xFFD24A) fine.add(rbox(0.07, 0.064, 0.244, 0.012), 0x1F3A2A, x, y, 0);
    else for (const k of [-1, 0, 1]) {
      fine.add(rbox(0.01, 0.004, 0.2, 0.002), mix(c, 0xFFFFFF, 0.45), x + k * 0.085, y + 0.03, 0, [0, 0.4, 0]);
    }
    // a little price tag in front of each
    fine.add(rbox(0.1, 0.05, 0.008, 0.004), 0xFFFDF5, x, y + 0.0, 0.19, [-0.3, 0, 0]);
    fine.add(K.dot, 0xC0392B, x - 0.025, y + 0.005, 0.195, null, 0.01);
  });

  // the rice cookers, their fronts to the cooks
  for (const x of [-5.3, -4.4]) {
    const y0 = fy + h + 0.02, body = 0x9AA9B4, lid = 0x5B6B78;
    b.add(tube(0.38, 0.34, 0.5, 16), body, x, y0 + 0.25, 0);
    b.add(tube(0.385, 0.385, 0.04, 16), shade(body, 1.1), x, y0 + 0.44, 0);
    b.add(tube(0.33, 0.3, 0.03, 16), shade(body, 0.6), x, y0 + 0.005, 0);
    b.add(tube(0.4, 0.4, 0.05, 16), lid, x, y0 + 0.53, 0);
    b.add(K.dome, shade(lid, 1.12), x, y0 + 0.55, 0, null, [0.36, 0.07, 0.36]);
    // the lid's handle, and its steam vent
    b.add(rbox(0.2, 0.03, 0.05, 0.012), 0x2C3A47, x, y0 + 0.66, 0);
    for (const e of [-1, 1]) b.add(rbox(0.03, 0.05, 0.04, 0.01), 0x2C3A47, x + e * 0.08, y0 + 0.63, 0);
    fine.add(tube(0.03, 0.035, 0.025, 8), 0x2C3A47, x + 0.2, y0 + 0.6, -0.06);
    // carrying handles at the sides
    for (const e of [-1, 1]) fine.add(rbox(0.04, 0.03, 0.16, 0.01), 0x2C3A47, x + e * 0.39, y0 + 0.4, 0);
    // the control panel: a little screen and two buttons
    const pz = 0.358, py = y0 + 0.22;
    fine.add(rbox(0.22, 0.13, 0.02, 0.008), 0x2C3A47, x, py, pz, [-0.08, 0, 0]);
    fine.add(rbox(0.12, 0.035, 0.01, 0.004), 0xBFF3E8, x, py + 0.03, pz + 0.009, [-0.08, 0, 0]);
    fine.add(K.dot, 0x5BC26B, x - 0.04, py - 0.03, pz + 0.012, null, [0.02, 0.02, 0.01]);
    fine.add(K.dot, 0xF2A33D, x + 0.04, py - 0.03, pz + 0.012, null, [0.02, 0.02, 0.01]);
  }

  // the chopping board under the tuna, with the end grain darker, and a long knife in front of the fish
  b.add(rbox(1.5, 0.05, 0.6, 0.018), HINOKI, 4.9, fy + h + 0.05, 0);
  for (const s of [-1, 1]) fine.add(rbox(0.04, 0.052, 0.6, 0.012), shade(HINOKI, 0.88), 4.9 + s * 0.73, fy + h + 0.05, 0);
  fine.add(rbox(0.36, 0.006, 0.035, 0.003), CHROME, 4.55, fy + h + 0.078, 0.24, [0, 0.12, 0]);
  fine.add(rbox(0.15, 0.022, 0.026, 0.009), KNIFE_GRIP, 4.31, fy + h + 0.086, 0.27, [0, 0.12, 0]);
  return { b, fine };
}

// ---------- the register desk ----------
/**
 * The register desk, `w` by `d` and 0.8 tall from the floor at `fy`, around its middle: a lacquered desk on a dark
 * plinth with two raised panels each side, its gold top, and the till where the Low block stands (`tx` along it):
 * a cash drawer, a sloping keypad and a little screen, turned to the room's front.
 */
export function registerDesk(w: number, d: number, fy: number, tx: number) {
  const b = new Build(), red = 0x8E2B2B, gold = 0xF2C14E, till = 0x22303C;
  b.add(rbox(w - 0.06, 0.08, d - 0.06, 0.02), shade(red, 0.55), 0, fy + 0.04, 0);
  b.add(rbox(w, 0.72, d, 0.03), red, 0, fy + 0.44, 0);
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    b.add(rbox(w / 2 - 0.12, 0.5, 0.02, 0.015), shade(red, 1.15), e * w / 4, fy + 0.43, s * (d / 2 + 0.006));
  }
  b.add(rbox(w + 0.04, 0.05, d + 0.04, 0.018), gold, 0, fy + 0.82, 0);
  for (const s of [-1, 1]) b.add(K.dot, gold, 0, fy + 0.43, s * (d / 2 + 0.02), null, [0.035, 0.035, 0.012]);
  // the till: its drawer, a sloping keypad, and a screen at the back facing the same way
  const y = fy + 0.845;
  b.add(rbox(0.4, 0.13, 0.3, 0.02), till, tx, y + 0.065, 0);
  b.add(rbox(0.36, 0.006, 0.01, 0.003), shade(till, 1.8), tx, y + 0.05, 0.151);
  b.add(rbox(0.08, 0.016, 0.014, 0.006), CHROME, tx, y + 0.075, 0.156);
  b.add(rbox(0.34, 0.05, 0.15, 0.015), shade(till, 1.25), tx, y + 0.15, 0.05, [0.35, 0, 0]);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const c = i === 3 && j === 2 ? 0x5BC26B : i === 3 && j === 0 ? 0xE0392B : 0xE8EEF2;
    // laid on the keypad's slope: its top is 0.025 over its middle, and falls 0.365 for each step toward the front
    const kz = -0.045 + j * 0.045;
    b.add(rbox(0.045, 0.012, 0.03, 0.004), c, tx - 0.07 + i * 0.047, y + 0.15 + 0.029 - kz * 0.365, 0.05 + kz, [0.35, 0, 0]);
  }
  b.add(rbox(0.3, 0.13, 0.05, 0.015), till, tx, y + 0.235, -0.1, [-0.15, 0, 0]);
  b.add(rbox(0.24, 0.08, 0.01, 0.005), 0x7FE0C0, tx, y + 0.24, -0.072, [-0.15, 0, 0]);
  // a roll of receipt paper
  b.add(tube(0.03, 0.03, 0.06, 10), 0xFFFDF5, tx - 0.15, y + 0.16, -0.08, [0, 0, Math.PI / 2]);
  return b;
}

// ---------- seats and boards ----------
/** A bar stool, standing on the floor at its middle: a round foot, a steel post with a footrest ring, a padded red seat. */
export function stool() {
  const b = new Build(), leg = 0x2C3A47, red = 0xC0392B;
  b.add(tube(0.15, 0.18, 0.03, 14), leg, 0, 0.015, 0);
  b.add(K.dome, shade(leg, 1.2), 0, 0.03, 0, null, [0.07, 0.025, 0.07]);
  b.add(tube(0.042, 0.05, 0.42, 8), leg, 0, 0.24, 0);
  b.add(K.ring, shade(leg, 1.9), 0, 0.2, 0, [Math.PI / 2, 0, 0], [0.16, 0.16, 0.14]);
  for (const r of [0, Math.PI / 2]) b.add(tube(0.01, 0.01, 0.3, 6), shade(leg, 1.9), 0, 0.2, 0, [0, r, Math.PI / 2]);
  b.add(tube(0.2, 0.16, 0.035, 14), shade(leg, 1.3), 0, 0.47, 0);
  b.add(tube(0.22, 0.22, 0.05, 16), red, 0, 0.5, 0);
  b.add(K.dome, shade(red, 1.08), 0, 0.523, 0, null, [0.205, 0.022, 0.205]);
  b.add(K.ring, shade(red, 0.8), 0, 0.522, 0, [Math.PI / 2, 0, 0], [0.214, 0.214, 0.12]);
  return b;
}

/** A chef's chopping board, around its middle: rounded hinoki, darker at the ends, a knife lying along its near edge. */
export function chefBoard() {
  const b = new Build();
  b.add(rbox(0.5, 0.04, 0.22, 0.012), HINOKI, 0, 0, 0);
  for (const s of [-1, 1]) b.add(rbox(0.025, 0.042, 0.22, 0.008), shade(HINOKI, 0.88), s * 0.235, 0, 0);
  b.add(rbox(0.17, 0.005, 0.024, 0.002), CHROME, 0.02, 0.023, -0.085);
  b.add(rbox(0.08, 0.016, 0.02, 0.007), KNIFE_GRIP, -0.1, 0.027, -0.085);
  return b;
}

// ---------- the chefs' toques ----------
/** A toque's band, pleated all round: a unit cylinder (as the Low band's) with every other edge drawn in. */
const PLEATED = quietly(() => {
  const n = 20, g = new CylinderGeometry(1, 1, 1, n, 1, true), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = (i % (n + 1)) % 2 ? 0.9 : 1;
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
});
/** The puff on top, in lobes where the pleats gather: a unit ball (as the Low puff's). */
const PUFF = quietly(() => {
  const g = new SphereGeometry(1, 20, 9), p = g.attributes.position, v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const lobe = 1 + 0.08 * Math.cos(Math.atan2(v.z, v.x) * 10) * Math.max(0, 1 - Math.abs(v.y - 0.1) * 1.4);
    p.setXYZ(i, v.x * lobe, v.y, v.z * lobe);
  }
  g.computeVertexNormals();
  return g;
});
/**
 * Pleats a chef's toque on High (the band and puff keep their size, place and growing: only their shape changes),
 * and puts the plain one back on Low.
 */
export function pleatToque(p: object) {
  const t = p as { toqueBand?: Mesh; toquePuff?: Mesh };
  const band = t.toqueBand, puff = t.toquePuff;
  if (!band || !puff) return;
  const show = () => {
    const h = isHigh();
    band.geometry = h ? PLEATED : G.cyl;
    puff.geometry = h ? PUFF : G.sphere;
  };
  show();
  onQuality(show);
}

// ---------- the dishes ----------
/**
 * A round slice `r` across and `h` thick, its edges rounded off by `b`, made like three.js' cylinder: the side, then
 * the top, then the bottom as its three groups, with the cylinder's texture coordinates (the caps' picture running out
 * over the rounding, to 0.47 of the way to the edge). For items.ts to texture as it does the Low slice.
 */
export function roundSlice(r: number, h: number, b: number, seg = 14) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const vert = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) => {
    pos.push(x, y, z); const l = Math.hypot(nx, ny, nz); nor.push(nx / l, ny / l, nz / l); uv.push(u, v);
    return pos.length / 3 - 1;
  };
  // a ring of seg + 1 vertices (the last on top of the first, for the texture's seam)
  const ringAt = (rad: number, y: number, ny: number, side: boolean, cap: number) => {
    const ids: number[] = [];
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), out = Math.abs(ny) < 1 ? 1 : 0;
      const ur = side ? 0 : cap;
      ids.push(vert(rad * s, y, rad * c, s * out, ny, c * out, side ? j / seg : 0.5 + c * ur, side ? (y > 0 ? 1 : 0) : 0.5 + s * ur * Math.sign(y)));
    }
    return ids;
  };
  const groups: number[][] = [[], [], []];
  const quad = (g: number, a: number[], b2: number[]) => {
    for (let j = 0; j < seg; j++) groups[g].push(a[j], b2[j], a[j + 1], a[j + 1], b2[j], b2[j + 1]);
  };
  const capUv = (rad: number) => rad / r * 0.5, edge = 0.47;
  // side: straight down between the roundings
  quad(0, ringAt(r, h / 2 - b, 0, true, 0), ringAt(r, -h / 2 + b, 0, true, 0));
  // top and bottom: the cap, then the rounding out to the side
  for (const [g, sy] of [[1, 1], [2, -1]] as const) {
    const mid = vert(0, sy * h / 2, 0, 0, sy, 0, 0.5, 0.5);
    const inner = ringAt(r - b, sy * h / 2, sy, false, capUv(r - b));
    const outer = ringAt(r, sy * (h / 2 - b), sy * 0.9, false, edge);
    for (let j = 0; j < seg; j++) groups[g].push(mid, inner[j], inner[j + 1]);
    quad(g, inner, outer);
  }
  const index: number[] = [];
  const geo = new BufferGeometry();
  // each triangle turned to face outward (the way its vertices' normals point)
  const P = (i: number) => new Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const N = (i: number) => new Vector3(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]);
  groups.forEach((tris, g) => {
    const start = index.length;
    for (let k = 0; k < tris.length; k += 3) {
      const [a, b2, c] = [tris[k], tris[k + 1], tris[k + 2]];
      const face = P(b2).sub(P(a)).cross(P(c).sub(P(a)));
      if (face.dot(N(a).add(N(b2)).add(N(c))) < 0) index.push(a, c, b2); else index.push(a, b2, c);
    }
    geo.addGroup(start, index.length - start, g);
  });
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(index);
  return geo;
}

/** Turns a profile (radius, height pairs, from the middle underneath round to the middle on top) into a lathed ring. */
const lathe = (pts: number[][], seg = 16) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);

/**
 * A sushi plate in `c`, 0.4 across and 0.035 thick around its middle like the Low one: a foot ring underneath, a
 * shallow well, and a rim with a coloured line round it (`line`), the way a sushi bar marks its plates.
 */
export function plate(c: number, line: number) {
  const b = new Build(), y0 = -0.0175, y1 = 0.0175;
  b.add(lathe([[0, y0 + 0.006], [0.118, y0 + 0.006], [0.12, y0], [0.14, y0], [0.15, y0 + 0.008]]), shade(c, 0.9), 0, 0, 0);
  b.add(lathe([[0.15, y0 + 0.008], [0.198, y1 - 0.007], [0.2, y1 - 0.002]]), c, 0, 0, 0);
  b.add(lathe([[0.2, y1 - 0.002], [0.196, y1], [0.19, y1]]), c, 0, 0, 0);
  b.add(lathe([[0.19, y1], [0.18, y1]], 16), line, 0, 0, 0);
  b.add(lathe([[0.18, y1], [0.16, y1 - 0.004], [0.14, y1 - 0.007], [0, y1 - 0.007]]), c, 0, 0, 0);
  return b;
}
/** A slice of fish for nigiri: a ball flattened to a slice, with enough sides to keep its outline smooth. */
const SLICE = quietly(() => new SphereGeometry(1, 12, 4));
/** Nigiri on a plate, in a row across it (as the Low blocks are): a rounded mound of rice under each draped slice. */
export function nigiri(tops: number[]) {
  const b = new Build();
  tops.forEach((c, i) => {
    const x = (i - (tops.length - 1) / 2) * 0.11;
    b.add(K.dot, 0xFFFDF5, x, 0.045, 0, null, [0.047, 0.03, 0.074]);
    b.add(SLICE, c, x, 0.076, 0, null, [0.053, 0.018, 0.09]);
  });
  return b;
}

/** A takeout box's tray, its edges rounded, as big as the Low one. */
export const boxTray = () => new Build().add(rbox(0.34, 0.08, 0.26, 0.014), 0x22262B, 0, 0, 0);
/**
 * A takeout box's lid in `c`, around its middle, with a paper band (`band`) round the box over it and down both sides,
 * sealed with a dot: the box sits under it, the lid's middle 0.045 above the box's.
 */
export function boxLid(c: number, band: number, seal: number) {
  const b = new Build();
  b.add(rbox(0.35, 0.025, 0.27, 0.009), c, 0, 0, 0);
  b.add(rbox(0.07, 0.004, 0.274, 0.0015), band, 0.06, 0.012, 0);
  for (const s of [-1, 1]) b.add(rbox(0.07, 0.085, 0.004, 0.0015), band, 0.06, -0.045, s * 0.135);
  b.add(K.dot, seal, 0.06, 0.014, 0, null, [0.018, 0.004, 0.018]);
  return b;
}
