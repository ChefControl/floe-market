// Where the matkot beach (beach.ts) meets the land: its sand doesn't stop at a hard edge but thins out into the grass in
// a ragged, soft border, and runs on up the coast north of it as a strip of sand that narrows as it goes, so the beach
// is the widest part of a sandy shore rather than a rectangle laid on the grass. Tufts of beach grass stand where the
// sand gives out. Flat, under the beach's own sand, never in anyone's way; one mesh for the sand and one for the grass,
// built on the beach's dice of its own, and gone under the snow in winter.
import {
  BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, RepeatWrapping,
} from 'three';
import { dice } from './kit';
import { BAY, BEACH } from './layout';
import { C } from './palette';
import { canvasTex } from './render';
import { amount, onBlend, PAL, seasonal, type Swatch } from './season';

/** How much snow lies on the sand in each season (as on the beach itself). */
const SNOWY: Swatch = [1, 0, 0, 0];
/** The grid the border is laid on (metres), how far north up the coast the sand runs, and how wide the fade is. */
const STEP = 0.35, NORTH = BEACH.z0 - 46, FADE = 1.4;
/** The far side of the land the sand may reach: short of the stage 2 road's kerb (world.ts ROAD2_X, ROAD_HALF). */
const KERB = 14.2 - 1.3 - 0.15;

const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** The border and the coast's sand, and the grass tufts along them: a group for the beach's own (beach.ts build). */
export function sandEdge() {
  const roll = dice(0x5A4DE);
  // a ragged line: a coarse grid of offsets, smoothed between, so the edge wanders rather than running straight
  const n = 64, wob = Array.from({ length: n * 8 }, () => roll() - 0.5);
  const wobble = (x: number, z: number) => {
    const u = (z - NORTH) / 1.7, v = x / 1.7, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const at = (a: number, b: number) => wob[((a % n) + n) % n * 8 + ((b % 8) + 8) % 8];
    const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    return (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
  };
  /** How wide the coast's sand is at `z`, north of the beach: as wide as the beach where they meet, narrowing to a strip. */
  const coastW = (z: number) => {
    const k = smooth(BEACH.z0 + 2, BEACH.z0 - 30, z);
    return (BEACH.x1 - BAY.x1) * (1 - k) + (1.3 + 0.5 * Math.sin(z * 0.41)) * k;
  };
  /** How much sand there is at (x, z), 0 to 1: the beach's border, or the coast's strip. */
  const sand = (x: number, z: number) => {
    const w = wobble(x, z) * 1.1;
    // past the beach's land edges: east of it, and north of its north end (the coast's strip takes over there)
    const dx = Math.max(0, x - BEACH.x1), dz = Math.max(0, z - BEACH.z1);
    const beach = z >= BEACH.z0 ? 1 - smooth(0, FADE, Math.hypot(dx, dz) + w) : 0;
    const coast = z < BEACH.z0 + 2 ? 1 - smooth(0, FADE, x - BAY.x1 - coastW(z) + w) : 0;
    return Math.max(beach, coast) * (1 - smooth(KERB - 0.6, KERB, x));
  };
  const inBeach = (x: number, z: number) => x > BEACH.x0 + 0.05 && x < BEACH.x1 - 0.05 && z > BEACH.z0 + 0.05 && z < BEACH.z1 - 0.05;

  // ---- the sand: a grid of little squares, each corner as sandy as the place says, wet by the water ----
  const pos: number[] = [], col: number[] = [], uv: number[] = [];
  const dry = new Color(C.sand), wet = new Color(C.wetSand), c = new Color();
  const corner = (x: number, z: number) => {
    const a = sand(x, z);
    c.copy(dry).lerp(wet, 1 - smooth(0, 0.7, x - BAY.x1));
    pos.push(x, 0, z); col.push(c.r, c.g, c.b, a); uv.push(x / 6, z / 6);
  };
  for (let z = NORTH; z < BEACH.z1; z += STEP) {
    for (let x = BAY.x1; x < KERB; x += STEP) {
      const x1 = Math.min(KERB, x + STEP), z1 = Math.min(BEACH.z1, z + STEP);
      // (only where there's some sand, and not wholly under the beach's own)
      if (inBeach(x, z) && inBeach(x1, z) && inBeach(x, z1) && inBeach(x1, z1)) continue;
      if (Math.max(sand(x, z), sand(x1, z), sand(x, z1), sand(x1, z1)) < 0.01) continue;
      for (const [px, pz] of [[x, z], [x, z1], [x1, z1], [x, z], [x1, z1], [x1, z]]) corner(px, pz);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 4));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  // its grains, as the beach's High sand has them, on white (the corners' colours do the rest)
  // (the same grains and ripples, at the same size, as beach.ts paints on its sand: here as how much darker than the
  // corners' sand they are, the wet sand's share of it)
  const darker = 'rgba(221,210,195,', grains = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = darker + '.6)'; g.fillRect(roll() * w, roll() * h, 1.2, 1.2); }
    g.strokeStyle = darker + '.28)'; g.lineWidth = 2;
    for (let y = 6; y < h; y += 12) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.098 + y) * 3);
      g.stroke();
    }
  });
  grains.tex.wrapS = grains.tex.wrapT = RepeatWrapping;
  const mat = new MeshLambertMaterial({
    map: grains.tex, vertexColors: true, transparent: true, depthWrite: false,
    // (just under the beach's own sand where they overlap)
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const border = new Mesh(geo, mat);
  border.position.y = 0.003;
  border.receiveShadow = true;

  // ---- beach grass: tufts of blades where the sand gives out ----
  const blades: number[] = [];
  for (let i = 0; i < 260; i++) {
    const z = NORTH + 4 + roll() * (BEACH.z1 - NORTH - 6), x = BAY.x1 + 0.6 + roll() * (KERB - BAY.x1 - 0.8), s = sand(x, z);
    if (inBeach(x, z) || s < 0.15 || s > 0.7) continue;
    for (let b = 0; b < 6; b++) {
      const t = roll() * Math.PI * 2, lean = 0.12 + roll() * 0.12, h = 0.28 + roll() * 0.22, wdt = 0.035;
      const bx = x + Math.cos(t) * 0.06, bz = z + Math.sin(t) * 0.06, tx = bx + Math.cos(t) * lean, tz = bz + Math.sin(t) * lean;
      const px = -Math.sin(t) * wdt, pz = Math.cos(t) * wdt;
      // both faces, so it shows from either side
      blades.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz, bx + px, 0, bz + pz, bx - px, 0, bz - pz, tx, h, tz);
    }
  }
  const grassGeo = new BufferGeometry();
  grassGeo.setAttribute('position', new Float32BufferAttribute(blades, 3));
  grassGeo.computeVertexNormals();
  const grass = new Mesh(grassGeo, seasonal(PAL.bush));

  const g = new Group();
  g.name = 'beachEdge';
  g.add(border, grass);
  for (const m of [border, grass]) m.raycast = () => {};
  // under the snow in winter, like the rest of the ground
  const thaw = () => {
    const k = 1 - amount(SNOWY);
    mat.opacity = k;
    border.visible = k > 0.01;
  };
  thaw();
  onBlend(thaw);
  return g;
}
