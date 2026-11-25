// Where the matkot beach (beach.ts) meets the land. Its sand is a rectangle, a step short of the road's kerb: left
// alone, its edge along the road is one straight line, and its north end another. Here the sand's own edge is cut to a
// line that wanders (the grass reaching into it by up to a metre, never as far as the court, the tower or the
// umbrellas), sand thins out softly over that line, the wet sand by the water laps in and out instead of lying in a
// straight strip, and north of the beach the sand runs on up the coast as a strip that
// narrows as it goes, in the beach's own grains and ripples, so the beach is the widest part of a sandy shore rather
// than a rectangle laid on the grass. Tufts of beach grass stand where the sand gives out. All flat, at the sand's own
// level, in nobody's way; a mesh each for the soft sand, the wet sand and the grass, built on dice of its own, and gone under the
// snow in winter.
import {
  BufferGeometry, DataTexture, Float32BufferAttribute, Group, LinearFilter, Mesh, MeshLambertMaterial, PlaneGeometry, RepeatWrapping,
  RGBAFormat, SRGBColorSpace,
} from 'three';
import { highBuilt, isHigh, isPotato, onQuality } from './graphics';
import { dice } from './kit';
import { BAY, BEACH } from './layout';
import { C } from './palette';
import { amount, onBlend, PAL, seasonal, type Swatch } from './season';

/** How much snow lies on the sand in each season (as on the beach itself). */
const SNOWY: Swatch = [1, 0, 0, 0];
/** The grid the soft sand is laid on (metres), how far north up the coast it runs, and how wide its fade is. */
const STEP = 0.3, NORTH = BEACH.z0 - 46, FADE = 1.1;
/** The far side of the land the sand may reach: short of the stage 2 road's kerb (world.ts ROAD2_X, ROAD_HALF). */
const KERB = 14.2 - 1.3 - 0.15;
/** How much sand the beach's own keeps: it's cut away where there's less than this, and the soft sand takes over. */
const CUT = 0.92;

/** A picture made of numbers, read smoothly between its spots. */
function smoothed(t: DataTexture) {
  t.magFilter = t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}
const smooth = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/**
 * Cuts the beach's sand (`lo` and `hi`, beach.ts `sand`, lying in place) to its wandering edge, takes the place of its
 * straight strip of wet sand (`wetStrip`) with one that laps in and out, and returns that with the soft sand round the
 * beach and up the coast and the grass tufts along it: a group for the beach's own.
 */
export function sandEdge(lo: Mesh, hi: Mesh, wetStrip: Mesh) {
  const roll = dice(0x5A4DE);
  // a line that wanders: offsets a couple of metres apart, smoothed between (-0.5 to 0.5)
  const wob = Array.from({ length: 96 }, () => roll() - 0.5);
  const wander = (z: number, every: number, from = 0) => {
    const u = (z - NORTH) / every, i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f);
    return wob[(i + from) % 96] * (1 - s) + wob[(i + 1 + from) % 96] * s;
  };
  /** Where the sand gives out at `z`: just inside the beach's road side, in and out by most of a metre; north of the
   *  beach, closing in on the water to a narrow strip. */
  const edgeX = (z: number) => {
    const k = smooth(BEACH.z0 - 1, BEACH.z0 - 30, z);
    const beach = BEACH.x1 - 0.5 + wander(z, 2.3) * 0.8 + wander(z, 0.7, 40) * 0.18;
    const coast = BAY.x1 + 1.5 + wander(z, 3.1, 20) * 1.2;
    return beach * (1 - k) + coast * k;
  };
  /** How much sand there is at (x, z), 0 to 1. */
  const sand = (x: number, z: number) => (1 - smooth(-FADE * 0.25, FADE * 0.75, x - edgeX(z))) * (1 - smooth(KERB - 0.25, KERB, x));

  // ---- the beach's own sand, cut to that line: where there's less than CUT of it, it's not drawn ----
  const w = BEACH.x1 - BEACH.x0, d = BEACH.z1 - BEACH.z0;
  // (a picture made of plain numbers, not drawn on a canvas: how sandy each spot is. Its rows run from the south up,
  // as the sand's own picture is laid: the north end is its top)
  const CW = 64, CH = 256, cutData = new Uint8Array(CW * CH * 4);
  for (let row = 0; row < CH; row++) {
    for (let px = 0; px < CW; px++) {
      const a = Math.round(sand(BEACH.x0 + (px + 0.5) / CW * w, BEACH.z1 - (row + 0.5) / CH * d) * 255), i = (row * CW + px) * 4;
      cutData[i] = cutData[i + 1] = cutData[i + 2] = a; cutData[i + 3] = 255;
    }
  }
  const cut = smoothed(new DataTexture(cutData, CW, CH, RGBAFormat));
  for (const m of [lo, hi]) {
    // (a copy: Low's sand is the palette's shared colour)
    const mat = (m.material as MeshLambertMaterial).clone();
    mat.alphaMap = cut; mat.alphaTest = CUT;
    m.material = mat;
  }
  // the beach's High picture carries on north in the soft sand (its ripples and grains at the same size)
  const picture = (hi.material as MeshLambertMaterial).map!;
  picture.wrapS = picture.wrapT = RepeatWrapping;
  picture.needsUpdate = true;

  // ---- the soft sand: a grid of little squares, each corner as sandy as the place says, wet by the water ----
  const pos: number[] = [], col: number[] = [], uv: number[] = [];
  const inBeach = (x: number, z: number) => x > BEACH.x0 && x < BEACH.x1 && z > BEACH.z0 && z < BEACH.z1;
  const corner = (x: number, z: number) => {
    pos.push(x, 0, z); col.push(1, 1, 1, sand(x, z)); uv.push((x - BEACH.x0) / w, 1 - (z - BEACH.z0) / d);
  };
  for (let z = NORTH; z < BEACH.z1; z += STEP) {
    for (let x = BAY.x1; x < KERB; x += STEP) {
      const x1 = Math.min(KERB, x + STEP), z1 = Math.min(BEACH.z1, z + STEP);
      const s = [sand(x, z), sand(x1, z), sand(x, z1), sand(x1, z1)];
      if (Math.max(...s) < 0.01) continue;
      // (not where the beach's own sand lies whole over it)
      if (Math.min(...s) > 0.97 && inBeach(x, z) && inBeach(x1, z1)) continue;
      for (const [px, pz] of [[x, z], [x, z1], [x1, z1], [x, z], [x1, z1], [x1, z]]) corner(px, pz);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 4));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  const mat = new MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const soft = new Mesh(geo, mat);
  // a hair under the beach's own sand, and drawn before anything else see-through, so what lies on the sand (a shadow, a
  // pad) is drawn over it
  soft.position.y = 0.0035;
  soft.renderOrder = -1;
  soft.receiveShadow = true;
  // as the beach's sand is on each setting: its picture on High, the plain colour on Low
  const look = () => {
    mat.map = isHigh() ? picture : null;
    mat.color.setHex(isHigh() ? 0xFFFFFF : C.sand);
    mat.needsUpdate = true;
  };
  look();
  onQuality(look);

  // ---- the wet sand by the water: not a straight strip but the mark the last waves left, lapping further up the sand
  // here than there and drying out softly into it, along the beach and on up the coast ----
  const WET_W = 2.0, wetLen = BEACH.shore - NORTH;
  /** How far up the sand it's wet at `z`: scallops a couple of metres long, each a little different. */
  const lap = (z: number) => 1.0 + wander(z, 1.9, 60) * 0.6 + Math.abs(Math.sin(z * 0.9 + wander(z, 4.3, 10) * 3)) * 0.3;
  const WW = 32, WH = 1024, wetData = new Uint8Array(WW * WH * 4);
  for (let row = 0; row < WH; row++) {
    // (rows from the south end up, as above)
    const z = BEACH.shore - (row + 0.5) / WH * wetLen, reach = lap(z);
    for (let px = 0; px < WW; px++) {
      const out = (px + 0.5) / WW * WET_W, i = (row * WW + px) * 4;
      // wet through by the water, drying out over the last stretch of its reach; and only where there's sand
      const a = (1 - smooth(reach * 0.55, reach, out)) * sand(BAY.x1 + out, z) * smooth(NORTH, NORTH + 4, z);
      wetData[i] = C.wetSand >> 16; wetData[i + 1] = C.wetSand >> 8 & 255; wetData[i + 2] = C.wetSand & 255; wetData[i + 3] = Math.round(a * 255);
    }
  }
  const wetTex = smoothed(new DataTexture(wetData, WW, WH, RGBAFormat));
  wetTex.colorSpace = SRGBColorSpace;
  const wetMat = new MeshLambertMaterial({ map: wetTex, transparent: true, depthWrite: false });
  const wet = new Mesh(new PlaneGeometry(WET_W, wetLen), wetMat);
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(BAY.x1 + WET_W / 2, wetStrip.position.y, NORTH + wetLen / 2);
  // (after the soft sand, before anything else see-through)
  wet.renderOrder = -0.5;
  wet.receiveShadow = true;
  wetStrip.visible = false;

  // ---- beach grass: tufts of blades where the sand gives out ----
  // (left out on Potato: never built on a load that starts there, hidden on one that goes there)
  const blades: number[] = [];
  for (let i = 0; highBuilt && i < 420; i++) {
    const z = NORTH + 4 + roll() * (BEACH.z1 - NORTH - 5), x = edgeX(z) + (roll() - 0.3) * 1.1, s = sand(x, z);
    if (x < BAY.x1 + 0.7 || x > KERB - 0.1 || s < 0.1 || s > 0.75) continue;
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
  // (dry straw through the snow and in autumn, green like the bushes in between)
  const grass = new Mesh(grassGeo, seasonal([C.rope, PAL.bush[1], PAL.bush[2], C.rope]));

  const g = new Group();
  g.name = 'beachEdge';
  g.add(soft, wet, grass);
  for (const m of [soft, wet, grass]) m.raycast = () => {};
  const lean = () => { grass.visible = !isPotato(); };
  lean();
  onQuality(lean);
  // under the snow in winter, like the rest of the ground
  const thaw = () => {
    const k = 1 - amount(SNOWY);
    mat.opacity = wetMat.opacity = k;
    soft.visible = wet.visible = k > 0.01;
  };
  thaw();
  onBlend(thaw);
  return g;
}
