// The hot spring over stage 2's terraces (farm.ts), and the hillside it's on: a hill with banks that slope down and
// wander, instead of a box; a pool with an uneven shore, deep in the middle and pale at its rim, in a ring of boulders
// of all sizes; a wall of dry stones that holds the hill up over the top terrace; and a stone lantern by the water.
// Everything's placed by dice of its own (kit.ts `dice`), the same every visit. Build with these inside `apart`, so
// they move neither the game's luck nor the scenery's dice.
import { BufferGeometry, Float32BufferAttribute, type Matrix4 } from 'three';
import { at, Build, K, mix, rbox, shade, tube } from './kit';

const STONE = 0x8A949C, STONE2 = 0x9AA4AC, MOSS = 0x5E7F3A, SNOW = 0xFFFFFF, MUD = 0x7A5A3A;
const sm = (k: number) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
/** A wandering line: between -1 and 1, the same for the same `t` and `seed`. */
const wob = (t: number, seed: number) => Math.sin(t * 0.83 + seed) * 0.5 + Math.sin(t * 2.17 + seed * 2.3) * 0.32 + Math.sin(t * 4.3 + seed * 0.7) * 0.18;
/** Smooth noise between 0 and 1 over the ground, the same every visit. */
function noise(x: number, z: number) {
  const h = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j);
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}

/** A box a metre each way, to size: plain-edged (what's hidden behind stones), and bevelled (a capstone). */
const block = () => rbox(1, 1, 1, 0.01), slab = () => rbox(1, 1, 1, 0.14);

// ---------- the hillside ----------
/** The hillside's flat top, as the box it used to be: x0 to x1 (the terraces' side), z0 (the sea's) to z1, `y` high. */
export interface Hill { x0: number; x1: number; z0: number; z1: number; y: number }

/**
 * How high the hillside stands at (x, z): `y` over its top, and sloping down to the ground in banks to the west, the
 * south and (short, at the shore) the north, their feet and brows wandering. Its east side stands straight up over the
 * top terrace, held by the wall, which is as high as the hill is there (so it runs down with the banks at its ends).
 */
export function hillHeight(H: Hill, x: number, z: number) {
  const west = sm((x - (H.x0 - 1.9 + wob(z, 1.3) * 0.35)) / 2.3);
  const south = sm((H.z1 + 0.95 + wob(x, 4.7) * 0.25 - z) / 1.7);
  const north = sm((z - (H.z0 - 0.4 + wob(x, 9.1) * 0.12)) / 1.1);
  return H.y * west * south * north;
}

/**
 * The hillside's ground, about (cx, cz): a sheet over its top and down its banks to just under the ground around it,
 * never quite flat on top (but for `flat`, round the spring), and lighter and darker in broad patches (as vertex
 * colours, for a material that's the lawn's colour through the seasons).
 */
export function hillside(H: Hill, cx: number, cz: number, flat: { x: number; z: number; r: number }) {
  const xa = H.x0 - 2.6, za = H.z0 - 0.7, zb = H.z1 + 1.5, nx = Math.round((H.x1 - xa) / 0.7), nz = Math.round((zb - za) / 0.7);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = xa + (H.x1 - xa) * i / nx, z = za + (zb - za) * j / nz, h = hillHeight(H, x, z), k = h / H.y;
    const calm = sm((Math.hypot(x - flat.x, z - flat.z) - flat.r) / 2);
    const y = h + (noise(x * 0.45, z * 0.45) - 0.5) * 0.07 * k * calm - 0.06 * (1 - sm(h / 0.3));
    pos.push(x - cx, y, z - cz);
    // broad patches, and the banks a little darker than the top
    const slope = 4 * k * (1 - k), b = (0.9 + 0.1 * noise(x * 0.3 + 7.3, z * 0.3 + 2.1)) * (1 - 0.1 * slope);
    col.push(b, b, b * 0.985);
    if (i < nx && j < nz) { const a = j * (nx + 1) + i, c = a + nx + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A plain wall for Low, along z from `z0` to `z1` about `zc`: its face (toward +x) and top, as high as `h` says. */
export function wallSlab(z0: number, z1: number, zc: number, thick: number, h: (z: number) => number) {
  const n = Math.round((z1 - z0) / 0.6), pos: number[] = [], f = thick / 2;
  for (let i = 0; i < n; i++) {
    const a = z0 + (z1 - z0) * i / n - zc, b = z0 + (z1 - z0) * (i + 1) / n - zc;
    const ya = Math.max(0, h(a + zc)), yb = Math.max(0, h(b + zc));
    // the face, from just under the ground up; then the top, back from it
    pos.push(f, -0.05, a, f, ya, a, f, -0.05, b, f, ya, a, f, yb, b, f, -0.05, b);
    pos.push(f, ya, a, -f, ya, a, f, yb, b, -f, ya, a, -f, yb, b, f, yb, b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- the pool ----------
/** How far the pool's shore is from its middle at angle `a`, as a share of its size: never a clean oval. */
export const shore = (a: number) => 1 + 0.09 * Math.sin(2 * a + 0.6) + 0.07 * Math.sin(3 * a + 2.1) + 0.035 * Math.sin(5 * a + 4.0);

/**
 * The pool's water, `rx` by `rz` across (before its shore wanders), for a sheet turned -90° about x (as the farm's
 * other water lies): deep in the middle (`deep`), paler toward the shallows at its rim (`rim`), as vertex colours.
 */
export function poolWater(rx: number, rz: number, deep: number, mid: number, rim: number, d: () => number) {
  const rings = [0, 0.28, 0.52, 0.72, 0.88, 1], seg = 36, pos: number[] = [], col: number[] = [], idx: number[] = [];
  const rgb = (c: number) => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
  rings.forEach((f, r) => {
    for (let s = 0; s < seg; s++) {
      // (a little off the spokes ring by ring, so its facets aren't a wheel's)
      // (and nudged off the rings too, but for the shore itself and the middle)
      const a = (s + (r % 2) * 0.5 + (r && r < 5 ? (d() - 0.5) * 0.7 : 0)) / seg * Math.PI * 2;
      const k = (f + (r && r < 5 ? (d() - 0.5) * 0.11 : 0)) * shore(a);
      pos.push(Math.cos(a) * rx * k, -Math.sin(a) * rz * k, 0);
      col.push(...rgb(f < 0.52 ? mix(deep, mid, f / 0.52) : mix(mid, rim, (f - 0.52) / 0.48)));
      if (r) {
        const o = (r - 1) * seg, n = r * seg, s1 = (s + 1) % seg;
        if (r === 1) idx.push(o, n + s1, n + s);
        else idx.push(o + s, o + s1, n + s, o + s1, n + s1, n + s);
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => i % 3 === 2 ? 1 : 0), 3));
  g.setIndex(idx);
  return g;
}

/**
 * Damp ground: a patch lying flat, dark where it's wettest and fading away to nothing at its edge (vertex colours with
 * alpha, for a see-through material). `ring` gives its outline as points round it: [x, z, alpha] pairs of an inner and
 * an outer one.
 */
export function damp(ring: [x: number, z: number, a: number][][], color: number) {
  const pos: number[] = [], col: number[] = [], idx: number[] = [], n = ring.length;
  const r = (color >> 16 & 255) / 255, g = (color >> 8 & 255) / 255, b = (color & 255) / 255;
  ring.forEach((pair, i) => {
    for (const [x, z, a] of pair) { pos.push(x, 0, z); col.push(r, g, b, a); }
    const o = i * 2, p = ((i + 1) % n) * 2;
    idx.push(o, p, o + 1, o + 1, p, p + 1);
  });
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 4));
  geo.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  geo.setIndex(idx);
  return geo;
}
/** The damp ground round the pool: from just inside its shore out to a wandering edge. */
export function poolDamp(rx: number, rz: number) {
  const ring: [number, number, number][][] = [];
  for (let s = 0; s < 40; s++) {
    const a = s / 40 * Math.PI * 2, k = shore(a), out = 0.75 + 0.3 * wob(a * 3, 2.2);
    ring.push([[Math.cos(a) * rx * k * 0.95, Math.sin(a) * rz * k * 0.95, 0.6], [Math.cos(a) * (rx * k + out), Math.sin(a) * (rz * k + out), 0]]);
  }
  return damp(ring, shade(MUD, 0.7));
}

// ---------- rocks ----------
/** What a rock's made of, ready to bake: its stone (and moss), and the snow that lies on it in winter. */
export interface Rocks { rock: Build; snow: Build }
export const rocks = (): Rocks => ({ rock: new Build(), snow: new Build() });

/**
 * A boulder `s` times the size of the old ring's (about 0.9 across), its foot at y 0: a few lumps of stone run
 * together, each its own shade, mostly with moss on top (snow over it in winter). `d` rolls its shape.
 */
export function boulder(into: Rocks, m: Matrix4, s: number, d: () => number, moss = 0.75) {
  const b = new Build(), snow = new Build(), stone = shade(mix(STONE, STONE2, d()), 0.9 + d() * 0.16);
  const w = 0.44 * s * (0.85 + d() * 0.3), h = 0.3 * s * (0.8 + d() * 0.45), l = 0.38 * s * (0.85 + d() * 0.3);
  b.add(K.ball, stone, 0, h * 0.35, 0, [0, d() * 3, 0], [w, h, l]);
  const lumps = 1 + Math.floor(d() * 2.6);
  for (let i = 0; i < lumps; i++) {
    const a = d() * Math.PI * 2, r = 0.45 + d() * 0.25, k = 0.45 + d() * 0.3;
    b.add(K.ball, shade(stone, 0.9 + d() * 0.18), Math.cos(a) * w * r, h * 0.2 * k, Math.sin(a) * l * r, [0, d() * 3, 0], [w * k, h * k * 0.9, l * k]);
  }
  if (d() < moss) {
    const ox = (d() - 0.5) * w * 0.3, oz = (d() - 0.5) * l * 0.3;
    b.add(K.ball, MOSS, ox, h * 1.22, oz, null, [w * 0.6, h * 0.3, l * 0.56]);
    if (d() < 0.6) b.add(K.ball, shade(MOSS, 1.1), ox + w * 0.3, h * 1.25, oz - l * 0.1, null, [w * 0.28, h * 0.22, l * 0.26]);
  }
  snow.add(K.ball, SNOW, 0, h * 1.2, 0, null, [w * 0.82, h * 0.4, l * 0.8]);
  into.rock.addAll(b, m);
  into.snow.addAll(snow, m);
}

/**
 * The boulders round the pool (`rx` by `rz`, about its own middle): a ring of them along its shore, never evenly
 * spaced or sized, a few big ones anchoring it, small ones tucked between and a few lying loose further out. `gap` is
 * the angle (and half-width) where the water leaves, kept clear.
 */
export function poolRocks(into: Rocks, rx: number, rz: number, y: number, d: () => number, gap: { a: number; w: number }) {
  const off = (a: number) => Math.abs(Math.atan2(Math.sin(a - gap.a), Math.cos(a - gap.a)));
  for (let a = 0.12 + d() * 0.2; a < Math.PI * 2 - 0.1;) {
    // the big ones stand at the back (the north-west) and the south; round the rest they're middling and small
    const back = Math.max(0, Math.cos(a - 3.9)), big = d() < 0.2 + back * 0.35, s = big ? 1.25 + d() * 0.55 : 0.6 + d() * 0.5;
    const k = shore(a) + (d() - 0.4) * 0.07 + 0.11 * s / rx;
    if (off(a) > gap.w) boulder(into, at(Math.cos(a) * rx * k, y - 0.05 * s, Math.sin(a) * rz * k, d() * 6.3), s, d);
    // a small one tucked in front of or behind the gap between two
    if (d() < 0.45 && off(a + 0.14) > gap.w) {
      const k2 = shore(a + 0.14) + (d() < 0.5 ? 0.2 : -0.02);
      boulder(into, at(Math.cos(a + 0.14) * rx * k2, y - 0.03, Math.sin(a + 0.14) * rz * k2, d() * 6.3), 0.32 + d() * 0.25, d, 0.3);
    }
    a += (0.2 + 0.2 * s + d() * 0.1) * 1.9 / rx;
  }
  for (let i = 0; i < 7; i++) {
    const a = d() * Math.PI * 2, k = shore(a) + 0.45 + d() * 0.7;
    if (off(a) > gap.w + 0.15) boulder(into, at(Math.cos(a) * rx * k, y - 0.03, Math.sin(a) * rz * k, d() * 6.3), 0.25 + d() * 0.4, d, 0.4);
  }
}

// ---------- grass ----------
/** A tuft of long grass at (x, y, z), `h` tall: blades fanning out from its foot, wide at the bottom and pointed. */
export function tuft(b: Build, x: number, y: number, z: number, h: number, d: () => number) {
  const blade = tube(0, 1, 1, 3);
  for (let i = 0; i < 7; i++) {
    const a = d() * Math.PI * 2, lean = 0.1 + d() * 0.55, hh = h * (0.55 + d() * 0.55);
    const one = new Build().add(blade, 0, 0, Math.cos(lean) * hh / 2, Math.sin(lean) * hh / 2, [lean, 0, 0], [0.035, hh, 0.012]);
    b.addAll(one, at(x, y, z, a));
  }
}

// ---------- what holds the hill up ----------
/**
 * A dry-stone wall along z from `z0` to `z1`, facing +x from x 0, as high at each place as `h` says: courses of
 * rounded stones of uneven length and shade, some proud of the face and some set back, a dark core behind them, and
 * flat capstones along the top that don't line up. Long grass grows on the cap here and there, and a few tufts from
 * the joints (into `green`). Where something stands in front of its foot (the top terrace), `hidden` says how high, and
 * the stones behind it are left out (rolled for all the same, so the rest are as they'd be).
 */
export function dryWall(b: Build, green: Build, z0: number, z1: number, h: (z: number) => number, d: () => number, hidden: (z: number) => number = () => 0, color = STONE2) {
  const unseen = new Build();
  const rh = 0.29;
  // the core, in lengths as high as the hill behind them
  for (let z = z0; z < z1 - 1e-3; z += 0.9) {
    const l = Math.min(0.9, z1 - z), hh = Math.min(h(z), h(z + l)) - 0.04;
    if (hh > 0.08) b.add(block(), shade(color, 0.62), -0.1, hh / 2, z + l / 2, null, [0.2, hh, l]);
  }
  const top = Math.max(h(z0), h((z0 + z1) / 2), h(z1)), rows = Math.ceil(top / rh);
  for (let r = 0; r < rows; r++) {
    const y = rh * (r + 0.5);
    for (let z = z0 - (r % 2 ? 0.2 : 0) - d() * 0.15; z < z1;) {
      const l = 0.42 + d() * 0.42, a = Math.max(z0, z), e = Math.min(z1, z + l), mid = (a + e) / 2, room = h(mid) - 0.1;
      z += l;
      if (e - a < 0.14 || y + rh * 0.3 > room) continue;
      const out = 0.02 + d() * 0.05, c = shade(mix(color, STONE, d() * 0.7), 0.88 + d() * 0.2);
      const seen = y + rh * 0.65 > Math.min(hidden(a), hidden(e)), to = seen ? b : unseen;
      to.add(K.dot, c, out - 0.03, y + (d() - 0.5) * 0.03, mid, [d() * 0.2 - 0.1, 0, 0], [0.085 + d() * 0.03, rh * (0.5 + d() * 0.1), (e - a) / 2 * 0.98]);
      // moss on a stone now and then, low down where it's damp
      if (r < 3 && d() < 0.1) to.add(K.dot, MOSS, out + 0.03, y + rh * 0.2, mid, null, [0.05, rh * 0.25, (e - a) * 0.3]);
      if (d() < 0.035) tuft(seen ? green : unseen, out + 0.05, y - rh * 0.4, mid, 0.3, d);
    }
  }
  // the capstones, each its own length and thickness, a gap now and then
  for (let z = z0; z < z1 - 0.2;) {
    const l = Math.min(0.5 + d() * 0.6, z1 - z), mid = z + l / 2, y = h(mid);
    z += l + (d() < 0.15 ? 0.12 : 0.015);
    if (y < 0.25) continue;
    const t = 0.07 + d() * 0.04;
    // (tipped along the wall where it runs downhill)
    b.add(slab(), shade(color, 1.0 + d() * 0.12), -0.03 + d() * 0.03, y - 0.05 + t / 2, mid,
      [Math.atan2(h(mid - 0.2) - h(mid + 0.2), 0.4), (d() - 0.5) * 0.06, 0], [0.3 + d() * 0.08, t, l - 0.02]);
    if (d() < 0.45) tuft(green, -0.16 + d() * 0.1, y + 0.01, mid + (d() - 0.5) * l * 0.6, 0.26 + d() * 0.2, d);
  }
}

// ---------- by the water ----------
/** Foam where falling water lands, about the origin on the water: a few soft white lumps. */
export function foam(b: Build, d: () => number, r = 0.3) {
  for (let i = 0; i < 6; i++) {
    const a = d() * Math.PI * 2, k = d() * r;
    b.add(K.ball, i % 2 ? SNOW : mix(SNOW, 0x8FD3E8, 0.25), Math.cos(a) * k, 0.01, Math.sin(a) * k, null, [0.09 + d() * 0.08, 0.035, 0.08 + d() * 0.07]);
  }
}

/**
 * A stone lantern, its foot at y 0, about 0.95 tall: a base, a post, a platform, the fire box (open, for the light
 * that's put in it: `glow` takes its paper panes), a wide roof with its corners turned up, and a knob on top.
 */
export function stoneLantern(b: Build, glow: Build, m: Matrix4, snow: Build) {
  const l = new Build(), g = new Build(), s = new Build(), c = STONE2, dark = shade(c, 0.86);
  l.add(tube(0.2, 0.24, 0.1, 6), dark, 0, 0.05, 0);
  l.add(tube(0.085, 0.11, 0.34, 6), c, 0, 0.27, 0);
  l.add(tube(0.2, 0.13, 0.07, 6), dark, 0, 0.475, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) l.add(rbox(0.035, 0.2, 0.035, 0.008), c, x * 0.105, 0.61, z * 0.105);
  g.add(rbox(0.2, 0.17, 0.2, 0.01), 0xFFD9A0, 0, 0.61, 0);
  l.add(tube(0.06, 0.3, 0.14, 4), dark, 0, 0.78, 0, [0, Math.PI / 4, 0]);
  l.add(tube(0.3, 0.3, 0.025, 4), c, 0, 0.705, 0, [0, Math.PI / 4, 0]);
  l.add(K.ball, c, 0, 0.9, 0, null, [0.055, 0.07, 0.055]);
  s.add(tube(0.05, 0.27, 0.1, 4), SNOW, 0, 0.83, 0, [0, Math.PI / 4, 0]);
  b.addAll(l, m); glow.addAll(g, m); snow.addAll(s, m);
}
