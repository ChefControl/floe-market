// Stage 2's farm on High graphics (graphics.ts), built with the kit (kit.ts) the way the people are: terraces walled
// with rounded stones, a farmhouse of boards under a thick layered thatch, a water wheel with rims, blades and
// buckets, sheaves hung over their racks, and water that ripples in the same low-poly way as the sea (sea.ts). Also the
// little drawings on the fertilizer shed's cloth, sign and sacks. Each prop builds a `Build` around its own middle;
// the module that owns it puts it in place beside its Low version. Call these inside `quietly` (kit.ts), so building
// them never touches the game's luck.
import {
  type BufferGeometry, CylinderGeometry, MeshPhongMaterial, type MeshPhongMaterialParameters, PlaneGeometry,
  RingGeometry, TorusGeometry,
} from 'three';
import { at, Build, jitter, K, pack, quietly, rbox, shade, tube } from './kit';

const ROPE = 0xC9A66B, IRON = 0x3C2A1C, SNOW = 0xFFFFFF;

// ---------- water ----------
/** Seconds of play, for the ripples (updRipples). */
const time = { value: 0 };
// The water's height at a point, in the vertex shader: three small ripples crossing, the shortest giving the facets
// their tilt. Shorter and lower than the sea's swell, since it's still water in a paddy or a channel.
const RIPPLE = /* glsl */`
float ripple(vec2 p, float t) {
  return sin(p.x * 2.3 + t * 1.2) * 0.4 + sin(p.y * 2.9 - t * 1.0 + p.x * 1.2) * 0.35
    + sin((p.x - p.y) * 5.7 + t * 1.8) * 0.25;
}`;

/**
 * Water that ripples gently, in the low-poly style of the sea: the material `p` describes (the pond's colours and how
 * see-through it is), drawn facet by facet, its surface rising and falling `amp` either side of its level. For a flat
 * sheet turned -90° about x, so its own z is up.
 */
export function rippleMaterial(p: MeshPhongMaterialParameters, amp = 0.012) {
  const m = new MeshPhongMaterial({ ...p, flatShading: true });
  const a = { value: amp };
  m.onBeforeCompile = s => {
    s.uniforms.uTime = time;
    s.uniforms.uAmp = a;
    s.vertexShader = `uniform float uTime;\nuniform float uAmp;\n${RIPPLE}\n` + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.z += ripple((modelMatrix * vec4(position, 1.0)).xz, uTime) * uAmp;`);
    s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', `
      // as on the sea, how far a facet tilts off level shades it, and the ones tilted toward the light glint
      vec3 tilt = normal - normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      gl_FragColor.rgb *= 1.0 + dot(tilt, vec3(1.1, 1.4, 0.7)) * 2.2;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), smoothstep(0.035, 0.055, dot(tilt, normalize(vec3(-0.5, 0.8, 0.4)))) * 0.4);
      #include <fog_fragment>`);
  };
  m.customProgramCacheKey = () => 'ripple';
  return m;
}

/** A sheet of water `w` by `d`, cut into small triangles nudged off the grid (like the sea's), its edges kept straight. */
export function rippleSheet(w: number, d: number, cell = 0.4) {
  const nx = Math.max(1, Math.round(w / cell)), ny = Math.max(1, Math.round(d / cell));
  const g = new PlaneGeometry(w, d, nx, ny);
  const p = g.attributes.position, sx = w / nx, sy = d / ny;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    if (Math.abs(Math.abs(x) - w / 2) > 1e-3) p.setX(i, x + jitter(-0.3, 0.3) * sx);
    if (Math.abs(Math.abs(y) - d / 2) > 1e-3) p.setY(i, y + jitter(-0.3, 0.3) * sy);
  }
  return g;
}

/** A round pool of water `r` across, squashed to `k` of that the other way, in rings of small triangles. */
export function rippleDisc(r: number, k: number) {
  const g = new RingGeometry(0, r, 24, 6);
  g.scale(1, k, 1);
  return g;
}

let clock = 0;
/** Moves the farm's water on (farm.ts' updFarm, every frame). */
export function updRipples(dt: number) {
  clock += dt;
  time.value = clock;
}

// ---------- stone ----------
/**
 * A wall of rounded stones (the terraces' faces, the hillside's), `h` tall and `d` long (along z), its foot at y 0,
 * facing +x with its stones' fronts 0.07 out from x 0: a dark core, rows of stones laid with every other row offset by
 * half a stone, like a castle's dry-stone wall, and flat capstones along the top.
 */
export function stoneWall(h: number, d: number, color: number, size = 0.62) {
  const b = new Build(), rows = Math.max(2, Math.round((h - 0.06) / 0.27)), rh = (h - 0.06) / rows;
  const n = Math.max(2, Math.round(d / size)), sl = d / n;
  b.add(rbox(0.18, h - 0.03, d, 0.03), shade(color, 0.78), -0.09, (h - 0.03) / 2, 0);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? sl / 2 : 0;
    for (let k = 0; k <= n; k++) {
      const z0 = Math.max(-d / 2, -d / 2 + k * sl - off), z1 = Math.min(d / 2, -d / 2 + (k + 1) * sl - off);
      if (z1 - z0 < 0.1) continue;
      b.add(K.dot, color, 0, rh * (r + 0.5), (z0 + z1) / 2, null, [0.07, rh * 0.56, (z1 - z0) / 2 * 0.97]);
    }
  }
  b.add(rbox(0.26, 0.07, d, 0.03), shade(color, 1.08), -0.04, h - 0.035, 0);
  return b;
}

/** One of the rocks round the hot spring, its long side along x: a lumpy rounded stone with moss on top. */
export function springRock() {
  const b = new Build(), stone = 0x8A949C, moss = 0x5E7F3A;
  b.add(K.ball, stone, 0, 0.1, 0, null, [0.44, 0.27, 0.38]);
  b.add(K.ball, shade(stone, 0.92), 0.16, 0.05, 0.1, [0, 0.6, 0], [0.26, 0.18, 0.22]);
  b.add(K.ball, shade(stone, 1.06), -0.2, 0.04, -0.08, [0, -0.4, 0], [0.22, 0.16, 0.2]);
  b.add(K.ball, moss, -0.04, 0.31, 0.02, null, [0.26, 0.08, 0.21]);
  b.add(K.ball, shade(moss, 1.1), 0.1, 0.33, -0.02, null, [0.12, 0.06, 0.1]);
  return b;
}
/** Snow on a spring rock's moss, for winter. */
export const rockSnow = () => new Build().add(K.ball, SNOW, -0.01, 0.31, 0, null, [0.36, 0.115, 0.3]);

/** A flat stepping stone `sx` by `sz` across, its top 0.105 up: a smooth, rounded slab. */
export function steppingStone(sx: number, sz: number) {
  const c = 0xB9C2C9;
  return new Build().add(K.ball, c, 0, 0.045, 0, null, [sx, 0.06, sz]);
}

/** A bamboo pipe `len` long along x, `r` thick: green, ringed with a node every 0.55, on a crossed stake. */
export function bambooPipe(len: number, r: number, standH: number) {
  const b = new Build(), green = 0x7FA650;
  b.add(tube(r, r, len, 8), green, 0, 0, 0, [0, 0, Math.PI / 2]);
  for (let x = -len / 2 + 0.3; x < len / 2 - 0.1; x += 0.55) b.add(K.ring, shade(green, 0.82), x, 0, 0, [0, Math.PI / 2, 0], [r * 1.02, r * 1.02, 0.35]);
  // the cut ends, paler
  for (const s of [-1, 1]) b.add(K.ring, 0xC9D98A, s * len / 2, 0, 0, [0, Math.PI / 2, 0], [r * 0.9, r * 0.9, 0.3]);
  // a crossed stake under it, a third of the way along
  for (const s of [-1, 1]) b.add(tube(0.025, 0.03, standH + 0.2, 6), 0x8A6A3A, -len / 6, -standH / 2 + 0.05, s * 0.06, [s * 0.35, 0, 0]);
  return b;
}

// ---------- the terraces ----------
/**
 * A terrace's earth step and its mud ridges, `w` wide, `top` high and `d` deep, with its stone face on the +x side:
 * the step rounded off, the ridges rounded like packed mud, and a little wooden sluice where the water spills over.
 */
export function terraceStep(w: number, top: number, d: number) {
  const b = new Build(), earth = 0x8B6B47, mud = 0x7A5A3A;
  b.add(rbox(w, top, d, 0.05), earth, 0, top / 2, 0);
  b.addAll(stoneWall(top + 0.14, d + 0.2, 0x8E979E), at(w / 2 + 0.04, 0, 0));
  for (const s of [-1, 1]) b.add(rbox(w, 0.16, 0.24, 0.07), mud, 0, top + 0.08, s * d / 2);
  b.add(rbox(0.24, 0.16, d, 0.07), mud, -w / 2 + 0.12, top + 0.08, 0);
  // the sluice: a gate board between two posts over the spill, in the middle of the face
  for (const s of [-1, 1]) b.add(rbox(0.08, 0.34, 0.08, 0.025), 0x5B3A26, w / 2 - 0.02, top + 0.1, s * 0.49);
  b.add(rbox(0.04, 0.14, 0.9, 0.015), 0x7A5A3A, w / 2 - 0.02, top + 0.17, 0);
  return b;
}

// ---------- the farmhouse ----------
/** The thatch's colour, and the farmhouse's walls and timber. */
const THATCH = 0xB8894A, CREAM = 0xEDE2CB, TIMBER = 0x5B3A26;
/** A four-sided frustum with flat faces (a cylinder's smooth normals would round off a roof). */
function facets(top: number, bottom: number, h: number) {
  const g = new CylinderGeometry(top, bottom, h, 4, 1).toNonIndexed();
  g.computeVertexNormals();
  return g;
}
/** The roof's radius (to its corners, before it's squashed to the house's shape) `y` up the 1.9 tall pyramid. */
const roofR = (y: number) => 3.0 * (1 - y / 1.9);
const ROOF: [number, number, number] = [1.05, 1, 0.8];
/** Where each tier of the thatch starts, up from the eaves. */
const TIERS = [0.2, 0.68, 1.12, 1.5];
/**
 * The farmhouse, its middle at the origin: walls of cream boards in a dark timber frame (corner posts, a beam round
 * the top, a sill) on a stone plinth, the sliding door on the north side, and paper windows on the south and east;
 * then the thatch, the same pyramid as on Low but thick at the eaves and laid in tiers, each tier's edge standing
 * proud of the one under it, with a darker band in its shadow.
 */
export function farmhouse() {
  const b = new Build(), W = 4.2, H = 1.9, D = 3.0;
  b.add(rbox(W + 0.04, 0.1, D + 0.04, 0.03), 0x9AA4AC, 0, 0.05, 0);
  b.add(rbox(W - 0.16, H, D - 0.16, 0.02), shade(CREAM, 0.72), 0, H / 2, 0);
  const rows = 7, ph = (H - 0.2) / rows;
  for (let r = 0; r < rows; r++) {
    const y = 0.1 + ph * (r + 0.5);
    for (const s of [-1, 1]) {
      b.add(rbox(W - 0.1, ph - 0.025, 0.07, 0.02), CREAM, 0, y, s * (D / 2 - 0.035));
      b.add(rbox(0.07, ph - 0.025, D - 0.1, 0.02), CREAM, s * (W / 2 - 0.035), y, 0);
    }
  }
  // the frame
  for (const [x, z] of [[-2.1, -1.5], [2.1, -1.5], [-2.1, 1.5], [2.1, 1.5]]) b.add(rbox(0.18, H, 0.18, 0.04), TIMBER, x, H / 2, z);
  for (const s of [-1, 1]) {
    b.add(rbox(W + 0.08, 0.14, 0.12, 0.03), TIMBER, 0, H - 0.07, s * (D / 2 + 0.01));
    b.add(rbox(0.12, 0.14, D + 0.08, 0.03), TIMBER, s * (W / 2 + 0.01), H - 0.07, 0);
    b.add(rbox(W, 0.1, 0.1, 0.03), TIMBER, 0, 0.15, s * (D / 2 + 0.01));
    b.add(rbox(0.1, 0.1, D, 0.03), TIMBER, s * (W / 2 + 0.01), 0.15, 0);
    // a post in the middle of each long wall
    b.add(rbox(0.12, H - 0.2, 0.1, 0.03), TIMBER, -0.7, H / 2, s * (D / 2 + 0.01));
  }
  // the sliding door on the north side, where the dark panel is on Low: two boards in a frame, and a pull
  const dx = 0.8, dz = -D / 2 - 0.03;
  b.add(rbox(1.04, 0.1, 0.08, 0.025), TIMBER, dx, 1.35, dz);
  for (const s of [-1, 1]) b.add(rbox(0.08, 1.35, 0.08, 0.025), TIMBER, dx + s * 0.5, 0.675, dz);
  for (const s of [-1, 1]) {
    b.add(rbox(0.43, 1.24, 0.05, 0.02), 0x7A5A3A, dx + s * 0.22, 0.68, dz - 0.01);
    for (const y of [0.4, 0.95]) b.add(rbox(0.43, 0.04, 0.02, 0.008), shade(0x7A5A3A, 0.8), dx + s * 0.22, y, dz - 0.04);
  }
  b.add(K.dot, IRON, dx - 0.06, 0.7, dz - 0.05, null, [0.025, 0.06, 0.02]);
  // paper windows: one on the south wall, one on the east
  window(b, -0.15, 1.05, D / 2 + 0.035, 0, 1.0);
  window(b, W / 2 + 0.035, 1.05, 0.25, Math.PI / 2, 0.8);
  window(b, 1.25, 1.05, D / 2 + 0.035, 0, 0.6);
  // the thatch: eaves first, then the tiers up to the top
  const rot: [number, number, number] = [0, Math.PI / 4, 0];
  const base = 1.9;
  b.add(facets(roofR(0.22) + 0.12, roofR(0) + 0.06, 0.24), shade(THATCH, 1.12), 0, base + 0.1, 0, rot, ROOF);
  b.add(facets(roofR(0) + 0.06, roofR(0) + 0.04, 0.04), shade(THATCH, 0.7), 0, base - 0.04, 0, rot, ROOF);
  TIERS.forEach((y0, i) => {
    const y1 = i + 1 < TIERS.length ? TIERS[i + 1] + 0.06 : 1.9;
    b.add(facets(roofR(y1), roofR(y0) + 0.1, y1 - y0), i % 2 ? shade(THATCH, 1.05) : THATCH, 0, base + (y0 + y1) / 2, 0, rot, ROOF);
    // the straw's cut ends, paler, along the tier's edge, and the shadow under it
    b.add(facets(roofR(y0 + 0.07) + 0.105, roofR(y0) + 0.105, 0.07), shade(THATCH, 1.14), 0, base + y0 + 0.035, 0, rot, ROOF);
    if (i) b.add(facets(roofR(y0 + 0.02) + 0.03, roofR(y0 - 0.05) + 0.02, 0.07), shade(THATCH, 0.72), 0, base + y0 - 0.015, 0, rot, ROOF);
  });
  // a knot of straw bound at the top
  b.add(K.dome, shade(THATCH, 0.85), 0, base + 1.84, 0, null, [0.15, 0.13, 0.13]);
  return b;
}
/** Snow on the thatch's upper tiers, for winter (on Low, the roof's cap turns white). */
export function farmhouseSnow() {
  const b = new Build(), rot: [number, number, number] = [0, Math.PI / 4, 0], base = 1.9;
  // a skin over each of the top two tiers, just proud of it and following its edge
  TIERS.slice(2).forEach((y0, i) => {
    const y1 = i ? 1.9 : TIERS[3] + 0.06;
    b.add(facets(roofR(y1) + 0.03, roofR(y0) + 0.14, y1 - y0), SNOW, 0, base + (y0 + y1) / 2 + 0.03, 0, rot, ROOF);
  });
  b.add(K.dome, SNOW, 0, base + 1.9, 0, null, [0.18, 0.1, 0.16]);
  return b;
}
/** A paper window `w` wide in the wall at (x, y, z), turned `ry`: a timber frame, white paper and a lattice. */
function window(b: Build, x: number, y: number, z: number, ry: number, w: number) {
  const h = 0.62, m = new Build(), dark = 0x4A2E1E;
  m.add(rbox(w + 0.12, h + 0.12, 0.05, 0.02), TIMBER, 0, 0, 0);
  m.add(rbox(w, h, 0.04, 0.01), 0xF4EBD6, 0, 0, 0.01);
  for (let i = 1; i < Math.round(w / 0.2); i++) m.add(rbox(0.018, h, 0.03, 0.005), dark, -w / 2 + i * w / Math.round(w / 0.2), 0, 0.025);
  for (const dy of [-h / 6, h / 6]) m.add(rbox(w, 0.018, 0.03, 0.005), dark, 0, dy, 0.025);
  m.add(rbox(w + 0.2, 0.05, 0.1, 0.02), TIMBER, 0, -h / 2 - 0.08, 0.03);
  b.addAll(m, at(x, y, z, ry));
}

/** The water wheel's posts and axle (they stand still while it turns), its middle at (0, `y`, 0), the axle along z. */
export function wheelStand(y: number) {
  const b = new Build();
  b.add(tube(0.06, 0.06, 1.0, 8), IRON, 0, y, 0, [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    b.add(tube(0.06, 0.075, y + 0.05, 8), TIMBER, 0, (y + 0.05) / 2, s * 0.45);
    b.add(rbox(0.18, 0.12, 0.16, 0.03), shade(TIMBER, 0.85), 0, y, s * 0.45);
    b.add(K.dome, shade(TIMBER, 1.2), 0, y + 0.06, s * 0.45, null, [0.08, 0.04, 0.07]);
  }
  return b;
}
const rim = quietly(() => new TorusGeometry(1, 0.045, 5, 28));
/**
 * The water wheel, turning about its middle on the z axis: two rims tied by blades that stand out past them (as the
 * paddles do on Low), a little bucket on the end of each, eight spokes a side and an iron-banded hub.
 */
export function waterWheel() {
  const b = new Build(), wood = 0x6B4A2E, blade = 0x7A5A3A;
  for (const z of [-0.19, 0.19]) {
    b.add(rim, wood, 0, 0, z, null, [1.02, 1.02, 1]);
    b.add(rim, wood, 0, 0, z, null, [0.8, 0.8, 1]);
    for (let i = 0; i < 4; i++) b.add(rbox(1.6, 0.07, 0.06, 0.02), shade(wood, 0.92), 0, 0, z, [0, 0, i / 4 * Math.PI + Math.PI / 8]);
  }
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    b.add(rbox(0.46, 0.045, 0.42, 0.015), blade, c, s, 0, [0, 0, a]);
    // the bucket: a lip turned back at the blade's end, with the sides closed
    const t = a + Math.PI / 2, lx = c * 1.21 + Math.cos(t) * 0.06, ly = s * 1.21 + Math.sin(t) * 0.06;
    b.add(rbox(0.04, 0.13, 0.42, 0.012), shade(blade, 0.85), lx, ly, 0, [0, 0, a]);
  }
  b.add(tube(0.16, 0.16, 0.5, 10), TIMBER, 0, 0, 0, [Math.PI / 2, 0, 0]);
  for (const z of [-0.2, 0.2]) b.add(K.ring, IRON, 0, 0, z, null, [0.165, 0.165, 0.3]);
  b.add(K.ring, IRON, 0, 0, 0, null, [0.165, 0.165, 0.3]);
  return b;
}

// ---------- drying racks ----------
/**
 * A drying rack, `len` long along x between two posts `post` from its middle, its rail `railY` up, with `n` sheaves of
 * rice hung over the rail, each the shape of the Low cone: two bunches either side of the rail, bound round the middle.
 */
export function dryingRack(post: number, railY: number, xs: number[]) {
  const b = new Build(), wood = 0x6B4A2E, gold = 0xE0B84A;
  for (const s of [-1, 1]) {
    b.add(tube(0.05, 0.065, 1.6, 8), wood, s * post, 0.8, 0);
    b.add(K.dome, shade(wood, 1.3), s * post, 1.6, 0, null, [0.05, 0.03, 0.05]);
    // a strut braced against it
    b.add(tube(0.035, 0.04, 1.2, 6), shade(wood, 0.9), s * (post + 0.18), 0.56, 0, [0, 0, s * 0.33]);
    for (const y of [railY - 0.03, railY + 0.03]) b.add(K.ring, ROPE, s * post, y, 0, [Math.PI / 2, 0, 0], [0.07, 0.07, 0.25]);
  }
  b.add(tube(0.045, 0.05, post * 2 + 0.2, 8), wood, 0, railY, 0, [0, 0, Math.PI / 2]);
  for (const x of xs) {
    // two bunches either side of the rail, spreading apart as they hang
    for (const s of [-1, 1]) {
      b.add(tube(0.06, 0.1, 0.8, 7), s > 0 ? gold : shade(gold, 0.93), x, railY - 0.43, s * 0.09, [-s * 0.2, 0, 0]);
      // the seed heads' ends, darker, at the bottom of each bunch
      b.add(K.dome, shade(gold, 0.8), x, railY - 0.82, s * 0.17, [Math.PI - s * 0.2, 0, 0], [0.095, 0.05, 0.095]);
    }
    // folded over the rail, and bound under it
    b.add(K.ball, shade(gold, 0.97), x, railY + 0.02, 0, null, [0.075, 0.05, 0.11]);
    b.add(K.ring, shade(gold, 0.7), x, railY - 0.1, 0, [Math.PI / 2, 0, 0], [0.13, 0.11, 0.3]);
  }
  return b;
}

// ---------- the ways ----------
/** A run of stone kerb `len` long (along z) and `h` high: rounded blocks about 0.9 long, end to end. */
export function kerb(len: number, w: number, h: number, color: number) {
  const b = new Build(), n = Math.max(1, Math.round(len / 0.9)), sl = len / n;
  for (let i = 0; i < n; i++) b.add(rbox(w, h, +(sl - 0.03).toFixed(3), 0.035), color, 0, h / 2, -len / 2 + sl * (i + 0.5));
  return b;
}
/** Pebbles along both banks of a stream `len` long (along x), `w` wide. */
export function pebbles(len: number, w: number) {
  const b = new Build();
  for (let x = -len / 2 + 0.3, i = 0; x < len / 2 - 0.2; x += 0.62, i++) {
    for (const s of [-1, 1]) b.add(K.ball, i % 2 ? 0x9AA4AC : 0xB9C2C9, x + s * 0.15, 0.02, s * (w / 2 + 0.04), null, [0.09, 0.05, 0.07]);
  }
  return b;
}
/**
 * The bridge to the farm door, `w` long (along x) and `d` wide, its deck's top at `top`: boards laid across it on two
 * beams, and rounded rails `railY` up on posts at either end, with caps on the posts.
 */
export function bridge(w: number, d: number, top: number, posts: number[], railY: number) {
  const b = new Build(), wood = 0xB0724A, rail = 0x8A5A3B;
  b.add(rbox(w - 0.04, 0.08, d - 0.1, 0.02), shade(wood, 0.55), 0, top - 0.1, 0);
  for (const s of [-1, 1]) b.add(rbox(w, 0.14, 0.12, 0.03), rail, 0, top - 0.09, s * (d / 2 - 0.06));
  const n = Math.round(w / 0.2), pw = w / n;
  for (let i = 0; i < n; i++) b.add(rbox(+(pw - 0.025).toFixed(3), 0.05, d, 0.015), wood, -w / 2 + pw * (i + 0.5), top - 0.025, 0);
  for (const s of [-1, 1]) {
    const z = s * (d / 2 - 0.04);
    b.add(tube(0.04, 0.04, w + 0.06, 8), rail, 0, railY, z, [0, 0, Math.PI / 2]);
    b.add(tube(0.025, 0.025, w, 6), rail, 0, top + 0.2, z, [0, 0, Math.PI / 2]);
    for (const x of posts) {
      b.add(tube(0.045, 0.05, railY - top + 0.04, 8), rail, x, (railY + top) / 2 + 0.02, z);
      b.add(K.ball, shade(rail, 1.15), x, railY + 0.07, z, null, [0.055, 0.05, 0.055]);
      b.add(K.dot, shade(rail, 1.15), x, railY + 0.13, z, null, 0.02);
    }
  }
  return b;
}

// ---------- the rice ----------
/**
 * One clump of rice on High, shared by every clump: twelve stalks in two rings, the inner taller, leaning out a little
 * (`stalks`), and their seed heads drooping off the tall ones' tips (`heads`, shown when ripe). Plain geometry, drawn
 * with the clump's own green, gold and grain materials like the Low one.
 */
export function riceClump(): { stalks: BufferGeometry; heads: BufferGeometry } {
  const stalks = new Build(), heads = new Build(), cone = new CylinderGeometry(0, 1, 1, 5), blade = new CylinderGeometry(0, 1, 1, 3);
  /** Adds `geo` standing at (0, 0, `r`), `h` tall, leaning `lean` out (to +z), then turns it all to face angle `a`. */
  const lean = (into: Build, geo: BufferGeometry, a: number, r: number, h: number, l: number, sx: number, sz: number) => {
    const one = new Build().add(geo, 0, 0, Math.cos(l) * h / 2, r + Math.sin(l) * h / 2, [l, 0, 0], [sx, h, sz]);
    into.addAll(one, at(0, 0, 0, Math.PI / 2 - a));
  };
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, r = 0.09, l = 0.16, h = 0.66;
    lean(stalks, cone, a, r, h, l, 0.035, 0.035);
    // a leaf arching further out between them, bent the way it faces
    lean(stalks, blade, a + Math.PI / 6, 0.12, 0.46, 0.5, 0.045, 0.014);
    // the seed heads hang off the stalk's tip, drooping further out and down
    const ty = Math.cos(l) * h, tz = r + Math.sin(l) * h, one = new Build();
    for (let k = 0; k < 3; k++) one.add(K.dot, 0, 0, ty - k * k * 0.03, tz + 0.03 + k * 0.045, [0.5 + k * 0.45, 0, 0], [0.024, 0.052, 0.024]);
    heads.addAll(one, at(0, 0, 0, Math.PI / 2 - a));
  }
  return { stalks: pack(stalks.pieces), heads: pack(heads.pieces) };
}

/** The pallet the farmer stacks bags on, its top 0.06 up: slats across three bearers. */
export function pallet(w: number, d: number) {
  const b = new Build(), wood = 0x8A5A3B;
  for (const s of [-1, 0, 1]) b.add(rbox(w, 0.035, 0.09, 0.012), shade(wood, 0.82), 0, 0.0175, s * (d / 2 - 0.045));
  for (let i = 0; i < 5; i++) b.add(rbox(0.13, 0.025, d, 0.01), wood, -w / 2 + 0.065 + i * (w - 0.13) / 4, 0.0475, 0);
  return b;
}

// ---------- the shed's little drawings ----------
/** What's drawn on the shed's cloth, its sign and the labels on its sacks, in place of emoji. */
export type FarmIcon = 'sprig' | 'leaves' | 'fish' | 'spring';
/** Draws icon `kind` `s` pixels across with its middle at (x, y). */
export function farmIcon(c: CanvasRenderingContext2D, kind: FarmIcon, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s / 64, s / 64);
  c.lineCap = 'round'; c.lineJoin = 'round';
  ICONS[kind](c);
  c.restore();
}
/** A pointed leaf from (0, 0) to (0, -len), `w` wide, with a vein down its middle. */
function leaf(c: CanvasRenderingContext2D, len: number, w: number, fill: string, vein: string) {
  c.fillStyle = fill;
  c.beginPath(); c.moveTo(0, 0);
  c.quadraticCurveTo(w, -len * 0.45, 0, -len);
  c.quadraticCurveTo(-w, -len * 0.45, 0, 0);
  c.fill();
  c.strokeStyle = vein; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -2); c.lineTo(0, -len * 0.85); c.stroke();
}
// each drawn in a 64 by 64 box round the origin
const ICONS: Record<FarmIcon, (c: CanvasRenderingContext2D) => void> = {
  /** A sprig of green leaves on a curving stem (the fertilizer's sign). */
  sprig(c) {
    c.strokeStyle = '#3F7A34'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-14, 26); c.quadraticCurveTo(-6, 0, 12, -24); c.stroke();
    const at: [number, number, number][] = [[-11, 16, -1.1], [-7, 8, 0.7], [-2, -2, -0.9], [3, -9, 0.9], [9, -18, -0.5]];
    for (const [x, y, a] of at) {
      c.save(); c.translate(x, y); c.rotate(a);
      leaf(c, 20, 10, '#5E9B3E', '#3F7A34');
      c.restore();
    }
    c.save(); c.translate(12, -24); c.rotate(0.5); leaf(c, 14, 7, '#7DB84F', '#3F7A34'); c.restore();
  },
  /** Two fallen leaves, orange and brown (compost). */
  leaves(c) {
    c.save(); c.translate(-6, 20); c.rotate(-0.6); leaf(c, 40, 20, '#E0812E', '#9A4E1E'); c.restore();
    c.save(); c.translate(8, 22); c.rotate(0.5); leaf(c, 36, 18, '#B8642C', '#7A3A16'); c.restore();
    c.strokeStyle = '#7A3A16'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-6, 20); c.lineTo(-9, 26); c.moveTo(8, 22); c.lineTo(10, 28); c.stroke();
  },
  /** A fish, as the order bubbles draw it (fish meal). */
  fish(c) {
    c.fillStyle = '#355C9E';
    c.beginPath(); c.moveTo(-14, 0); c.lineTo(-28, -12); c.lineTo(-28, 12); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(4, 0, 22, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#E3EAF0'; c.beginPath(); c.ellipse(6, 4, 17, 6, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#F2C14E'; c.beginPath(); c.moveTo(-2, -11); c.lineTo(8, -20); c.lineTo(12, -11); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(17, -3, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1B2733'; c.beginPath(); c.arc(18, -3, 1.8, 0, Math.PI * 2); c.fill();
  },
  /** The hot spring's sign: a red bowl with three wisps of steam rising from it (spring minerals). */
  spring(c) {
    c.strokeStyle = '#C0392B'; c.lineWidth = 5;
    c.beginPath(); c.ellipse(0, 10, 24, 14, 0, 0.15, Math.PI - 0.15); c.stroke();
    c.beginPath(); c.moveTo(-24, 10); c.lineTo(-20, 10); c.moveTo(20, 10); c.lineTo(24, 10); c.stroke();
    for (const x of [-11, 0, 11]) {
      c.beginPath(); c.moveTo(x, 12);
      c.bezierCurveTo(x - 7, 4, x + 7, -4, x, -10);
      c.bezierCurveTo(x - 6, -15, x + 4, -20, x, -26);
      c.stroke();
    }
  },
};
