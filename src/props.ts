// The market's props on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are: rounded
// boards and posts, little details (rope lashings, end grain, crushed ice, a bell), painted and baked. Each one
// builds a `Build` around its own middle; the module that owns the prop puts it in place beside its Low version.
// Call these inside `quietly` (kit.ts), so building them never touches the game's luck.
import { ExtrudeGeometry, Shape, TorusGeometry } from 'three';
import { Build, jitter, K, quietly, rbox, shade, tube } from './kit';
import { C } from './palette';

export const WOOD = { deck: C.deck, deck2: C.deck2, dark: C.timber, log: C.log, post: C.post, end: C.endGrain };
const ROPE = C.rope, IRON = C.iron, SNOW = C.snow;

// ---------- the dock ----------
/**
 * A deck of boards `w` wide (along x) and `d` deep, its top at `top`, laid out exactly like the painted deck on Low
 * (world.ts planks): rows of boards in two alternating shades, one joint per row in each 4 m stretch, in the same
 * places. The boards are real, with rounded edges and thin gaps over a dark frame.
 */
export function deckBoards(w: number, d: number, top: number, rx: number, ry: number) {
  const b = new Build(), rows = 8 * ry, rw = d / rows, span = w / rx, h = 0.08;
  b.add(rbox(w, 0.2, d, 0.02), WOOD.dark, 0, top - h - 0.08, 0);
  for (let r = 0; r < rows; r++) {
    // the painted texture's rows run from the far (-z) edge, and its joint in row i sits (i * 97 + 40) / 256 of the way along
    const z = -d / 2 + rw * (r + 0.5), i = r % 8, joint = (i * 97 + 40) % 256 / 256 * span;
    const cuts = [-w / 2];
    for (let x = -w / 2 + joint; x < w / 2 - 0.05; x += span) if (x > -w / 2 + 0.05) cuts.push(x);
    cuts.push(w / 2);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const len = +(cuts[k + 1] - cuts[k] - 0.03).toFixed(3);
      b.add(rbox(len, h, +(rw - 0.03).toFixed(3), 0.02), i % 2 ? WOOD.deck : WOOD.deck2, (cuts[k] + cuts[k + 1]) / 2, top - h / 2, z);
    }
  }
  return b;
}

/** A piling standing in the water, `h` above it: a rounded log, its end grain on top, lashed with rope. */
export function piling(h: number) {
  const b = new Build();
  b.add(tube(0.17, 0.19, h, 8), WOOD.post, 0, h / 2, 0);
  b.add(K.dome, WOOD.end, 0, h, 0, null, [0.17, 0.05, 0.17]);
  for (const y of [h - 0.18, h - 0.27]) b.add(K.ring, ROPE, 0, y, 0, [Math.PI / 2, 0, 0], [0.185, 0.185, 0.3]);
  return b;
}
/** Snow on top of a piling, for winter. */
export const pilingSnow = (h: number) => new Build().add(K.dome, SNOW, 0, h + 0.02, 0, null, [0.2, 0.09, 0.2]);

/** An iron mooring bollard: a short post with a mushroom top. */
export function bollard() {
  return new Build()
    .add(tube(0.08, 0.1, 0.24, 8), IRON, 0, 0.12, 0)
    .add(K.ball, IRON, 0, 0.26, 0, null, [0.13, 0.06, 0.13])
    .add(tube(0.14, 0.14, 0.03, 8), shade(IRON, 0.8), 0, 0.015, 0);
}
/** A coil of rope lying on the deck. */
export function ropeCoil() {
  const b = new Build();
  for (let i = 0; i < 3; i++) b.add(K.ring, shade(ROPE, 1 - i * 0.05), 0, 0.03 + i * 0.045, 0, [Math.PI / 2, 0, 0], [0.24 - i * 0.03, 0.24 - i * 0.03, 0.35]);
  return b;
}
const buoyArc = quietly(() => new TorusGeometry(0.26, 0.07, 6, 4, Math.PI / 2));
/** A life ring, red and white, standing on edge (in the x-y plane). */
export function lifeRing() {
  const b = new Build();
  for (let i = 0; i < 4; i++) b.add(buoyArc, i % 2 ? 0xFFFFFF : C.tomato, 0, 0, 0, [0, 0, i * Math.PI / 2]);
  return b;
}

/**
 * A fence log `h` tall standing on the ground: rounded on top, its end grain showing, lashed to the next with rope.
 * `toNext` is the gap to the next log along the fence (in the direction `along`, x or z), or 0 for the last one.
 */
export function fenceLog(h: number, toNext: number, along: 'x' | 'z') {
  const b = new Build(), r = 0.15;
  b.add(tube(r * 0.93, r * 1.08, h, 8, true), shade(WOOD.log, jitter(0.92, 1.06)), 0, h / 2, 0);
  b.add(K.dome, WOOD.end, 0, h, 0, null, [r * 0.93, 0.07, r * 0.93]);
  for (const y of [0.32, 0.62]) {
    b.add(K.ring, ROPE, 0, y, 0, [Math.PI / 2, 0, 0], [r * 1.02, r * 1.02, 0.25]);
    if (toNext) {
      const rot: [number, number, number] = along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
      const off = toNext / 2;
      b.add(K.post, ROPE, along === 'x' ? off : 0, y, along === 'z' ? off : 0, rot, [0.022, toNext - r * 1.6, 0.022]);
    }
  }
  return b;
}
/** Snow on a fence log's top. */
export const logSnow = (h: number) => new Build().add(K.dome, SNOW, 0, h + 0.02, 0, null, [0.16, 0.08, 0.16]);

// ---------- ice ----------
/** Three shapes of ice floe, each about 1 across: a slab with rounded edges, and a cushion of snow on top. */
export const FLOES = quietly(() => [0, 1, 2].map(() => {
  const s = new Shape(), n = 7 + Math.floor(jitter(0, 3));
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + jitter(-0.2, 0.2), r = jitter(0.78, 1.0);
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const slab = new ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.07, bevelSegments: 1, curveSegments: 1 });
  slab.rotateX(-Math.PI / 2);
  const b = new Build().add(slab, 0xD8EEF6, 0, -0.06, 0);
  b.add(K.dome, 0xF7FBFD, jitter(-0.15, 0.15), 0.1, jitter(-0.15, 0.15), [0, jitter(0, 3), 0], [0.62, 0.12, 0.5]);
  return b;
}));

// ---------- the counters ----------
/**
 * A fish stall's counter `len` long (along x), its customers on the +z side: a white body with slats and a band of
 * colour down the front, a plinth, a rounded top in `top`'s colour (its surface 0.94 up, where the stock sits), mounds of
 * crushed ice at the ends and a brass bell.
 */
export function stall(len: number, depth: number, topC: number) {
  const b = new Build(), body = C.enamel, y0 = 0.04;
  b.add(rbox(len - 0.06, 0.1, depth - 0.06, 0.03), 0xB8C6CF, 0, y0 + 0.05, 0);
  b.add(rbox(len, 0.76, depth, 0.05), body, 0, y0 + 0.1 + 0.38, 0);
  const n = Math.max(3, Math.round(len / 0.32)), sw = len / n;
  for (let i = 0; i < n; i++) {
    b.add(rbox(+(sw - 0.04).toFixed(3), 0.5, 0.04, 0.015), i % 2 ? 0xDDE9F0 : 0xF2F7FA, -len / 2 + sw * (i + 0.5), y0 + 0.42, depth / 2 + 0.01);
  }
  b.add(rbox(len + 0.02, 0.09, 0.05, 0.02), topC, 0, y0 + 0.74, depth / 2 + 0.015);
  b.add(rbox(len + 0.1, 0.08, depth + 0.1, 0.035), topC, 0, 0.9, 0);
  b.add(rbox(len + 0.12, 0.025, 0.05, 0.012), shade(topC, 1.15), 0, 0.93, depth / 2 + 0.04);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      b.add(K.dot, i % 3 ? 0xF4FAFD : 0xD5ECF5, s * (len / 2 - 0.16 + jitter(-0.1, 0.08)), 0.95 + jitter(0, 0.03),
        jitter(-depth / 2 + 0.12, depth / 2 - 0.12), [jitter(0, 3), jitter(0, 3), 0], [jitter(0.05, 0.08), 0.035, jitter(0.05, 0.08)]);
    }
  }
  // the bell on the customers' corner
  b.add(tube(0.05, 0.05, 0.015, 10), 0x7A5A2A, len / 2 - 0.12, 0.95, depth / 2 - 0.12);
  b.add(K.dome, C.gold, len / 2 - 0.12, 0.955, depth / 2 - 0.12, null, [0.045, 0.05, 0.045]);
  b.add(K.dot, C.gold, len / 2 - 0.12, 1.01, depth / 2 - 0.12, null, 0.012);
  return b;
}

/**
 * The frame round the price board (`w` by `h`, its middle at 0, `y`), its posts `post` apart down to the ground, and a
 * little red roof over it, so it reads as the market's sign.
 */
export function signFrame(w: number, h: number, y: number, post: number) {
  const b = new Build(), wood = C.frame, t = 0.07;
  for (const s of [-1, 1]) {
    b.add(rbox(w + t * 2, t, 0.1, 0.025), wood, 0, y + s * (h / 2 + t / 2), 0);
    b.add(rbox(t, h, 0.1, 0.025), wood, s * (w / 2 + t / 2), y, 0);
    b.add(tube(0.05, 0.06, y + h / 2 + 0.1, 8), wood, s * post / 2, (y + h / 2 + 0.1) / 2, -0.06);
    b.add(rbox(0.16, 0.08, 0.16, 0.025), shade(wood, 0.8), s * post / 2, 0.04, -0.06);
  }
  const ry = y + h / 2 + t + 0.08, pitch = 0.42;
  for (const s of [-1, 1]) {
    b.add(rbox(w + 0.5, 0.05, 0.3, 0.02), C.red, 0, ry + 0.05, s * 0.12, [s * pitch, 0, 0]);
  }
  b.add(tube(0.035, 0.035, w + 0.52, 8), shade(C.red, 0.75), 0, ry + 0.115, 0, [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) b.add(K.dot, C.gold, s * (w / 2 + 0.26), ry + 0.115, 0, null, 0.05);
  return b;
}
/** Snow on the sign's roof, for winter. */
export function signSnow(w: number, h: number, y: number) {
  const b = new Build(), ry = y + h / 2 + 0.07 + 0.08;
  for (const s of [-1, 1]) b.add(rbox(w + 0.44, 0.04, 0.26, 0.02), SNOW, 0, ry + 0.09, s * 0.115, [s * 0.42, 0, 0]);
  return b;
}

/** The chopping bench (its top `y` up): rounded legs on little feet, rails, a towel over the side, and a rope bucket handle. */
export function bench(y: number) {
  const b = new Build(), wood = C.post, dark = C.bark;
  b.add(rbox(1.4, 0.1, 1.0, 0.035), wood, 0, y, 0);
  for (const [dx, dz] of [[-0.6, -0.42], [0.6, -0.42], [-0.6, 0.42], [0.6, 0.42]]) {
    b.add(tube(0.045, 0.055, y - 0.05, 8), dark, dx, (y - 0.05) / 2, dz);
    b.add(K.dome, shade(dark, 0.8), dx, 0, dz, null, [0.07, 0.03, 0.07]);
  }
  for (const s of [-1, 1]) b.add(rbox(1.2, 0.05, 0.05, 0.018), dark, 0, 0.16, s * 0.42);
  for (const s of [-1, 1]) b.add(rbox(0.05, 0.05, 0.8, 0.018), dark, s * 0.6, 0.16, 0);
  // a striped towel over the front edge
  b.add(rbox(0.32, 0.012, 0.18, 0.005), C.paper, 0.38, y + 0.056, 0.42);
  b.add(rbox(0.32, 0.22, 0.012, 0.005), C.paper, 0.38, y - 0.06, 0.51);
  for (const dy of [-0.13, -0.05]) b.add(rbox(0.322, 0.025, 0.014, 0.005), C.tomato, 0.38, y + dy, 0.511);
  return b;
}

/** The ice tray the fish slices are piled on: a steel tray with a lip, crushed ice round the edges. */
export function iceTray(w: number) {
  const b = new Build(), steel = C.steel;
  b.add(rbox(w, 0.04, w, 0.015), steel, 0, 0.02, 0);
  for (const s of [-1, 1]) {
    b.add(rbox(w, 0.08, 0.04, 0.015), shade(steel, 1.1), 0, 0.05, s * (w / 2 - 0.02));
    b.add(rbox(0.04, 0.08, w, 0.015), shade(steel, 1.1), s * (w / 2 - 0.02), 0.05, 0);
  }
  for (let i = 0; i < 28; i++) {
    const side = i % 4, t = jitter(-w / 2 + 0.1, w / 2 - 0.1), e = w / 2 - jitter(0.07, 0.13);
    const x = side < 2 ? t : (side === 2 ? e : -e), z = side < 2 ? (side ? e : -e) : t;
    b.add(K.dot, i % 3 ? 0xF4FAFD : 0xD5ECF5, x, 0.045, z, [jitter(0, 3), jitter(0, 3), 0], [jitter(0.04, 0.07), 0.03, jitter(0.04, 0.07)]);
  }
  return b;
}

/** Leaves (or petals) scattered over a `w` by `d` patch, `n` of them in `colors`, lying flat just over `y`. */
export function scatter(w: number, d: number, y: number, n: number, colors: number[], skip?: (x: number, z: number) => boolean) {
  const b = new Build();
  for (let i = 0; i < n; i++) {
    const x = jitter(-w / 2, w / 2), z = jitter(-d / 2, d / 2);
    if (skip?.(x, z)) continue;
    b.add(K.dot, colors[i % colors.length], x, y, z, [0, jitter(0, 6), 0], [jitter(0.1, 0.15), 0.008, jitter(0.055, 0.08)]);
  }
  return b;
}
