// Stage 2's farm scenery west of the restaurant: three rice terraces stepping up to a snowy hillside with a hot
// spring that feeds them, a farmhouse with a water wheel, drying racks, the irrigation channel along the
// restaurant, and the stepping-stone path and bridge to the farm door. The rice itself is in rice.ts.
// Every walking surface here is either raised off the ground or kept clear of its neighbours, so no two of them
// share a plane (overlapping flat surfaces at the same height flicker).
import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DodecahedronGeometry, Float32BufferAttribute, Group,
  Matrix4, Mesh, MeshLambertMaterial, MeshPhongMaterial, PlaneGeometry, PointLight, Sprite, SpriteMaterial, TorusGeometry,
  TubeGeometry, type Object3D,
} from 'three';
import { apart, at, Build, detail, dice, mix, quietly, seasonLayer, shade, tube } from './kit';
import { C } from './palette';
import { casinoBoat, CHANNEL_X, FARM_DOOR, HALL_BOX, PATH_X, QUAY, TERRACE_Z, TERRACES } from './layout';
import {
  bambooPipe, bridge, dryingRack, farmhouse, farmhouseSnow, kerb, pebbles, rippleMaterial, rippleSheet, steppingStone, terraceStep,
  updRipples, waterWheel, wheelStand,
} from './propsFarm';
import { dryWall, foam, hillHeight, hillside, poolDamp, poolRocks, poolWater, rocks, shore, stoneLantern, tuft, wallSlab } from './propsSpring';
import { bake, canvasTex, G, mesh, scene, sky, type Part } from './render';
import { amount, PAL, seasonal, shelter, type Swatch } from './season';
import { FY, rand, V } from './util';
import { treeGroup } from './world';

const ZC = (TERRACE_Z.z0 + TERRACE_Z.z1) / 2, DEPTH = TERRACE_Z.z1 - TERRACE_Z.z0;

function piece(x: number, z: number) {
  const g = new Group(); g.position.set(x, 0, z); g.visible = false; scene.add(g);
  return g;
}
/** Puts `o` at world (x, y, z) in piece `g` (or in `into`, a group of `g`'s at its origin). */
function put<T extends Object3D>(g: Group, o: T, x: number, y: number, z: number, into: Object3D = g) {
  o.position.set(x - g.position.x, y, z - g.position.z); into.add(o);
  return o;
}
/** A group for a piece's Low meshes, beside its High ones (graphics.ts). */
function lowOf(g: Group) {
  const lo = quietly(() => new Group());
  g.add(lo);
  return lo;
}
/** Adds what's drawn only on High to `to`, built off the game's luck, and shows it instead of `low`. */
function high(to: Object3D, build: () => Object3D, low: Object3D | null) {
  const g = quietly(build);
  to.add(g);
  detail(low, g);
  return g;
}
const SNOWY: Swatch = [1, 0, 0, 0];
/** How thick the spring's steam is through the year: thickest in the cold. */
const STEAMY: Swatch = [1.5, 1, 0.75, 1.1];
const WHITE = new Color(0xFFFFFF);

const pondMat = new MeshPhongMaterial({ color: 0x5FB1B4, specular: 0xFFFFFF, shininess: 80, transparent: true, opacity: .92 });
const fallMat = new MeshLambertMaterial({ color: 0xBFEFFF, transparent: true, opacity: .7, emissive: 0x204050 });
const streamMat = new MeshLambertMaterial({ color: 0x8FD3E8, emissive: 0x204050 });
// High: the same water, rippling (propsFarm.ts)
const [pondRipple, streamRipple] = quietly(() => [
  rippleMaterial({ color: 0x5FB1B4, specular: 0xFFFFFF, shininess: 80, transparent: true, opacity: .92 }),
  rippleMaterial({ color: 0x8FD3E8, emissive: 0x204050, specular: 0x203038, shininess: 30 }, 0.008),
]);
/** A rippling sheet of water `w` by `d` lying flat in `m`. */
function sheet(w: number, d: number, m: MeshPhongMaterial, cell = 0.4) {
  const o = new Mesh(rippleSheet(w, d, cell), m);
  o.rotation.x = -Math.PI / 2; o.receiveShadow = true;
  return o;
}

// ---------- terraces ----------
/** Each terrace: an earth step with a stone face, mud ridges, and the flooded paddy on top. */
const terracePieces = TERRACES.map((t, i) => {
  const w = t.x1 - t.x0, cx = (t.x0 + t.x1) / 2, below = i ? TERRACES[i - 1].top : 0;
  const g = piece(cx, ZC), lo = lowOf(g);
  put(g, mesh(new BoxGeometry(w, t.top, DEPTH), 0x8B6B47, 0, 0, 0, true), cx, t.top / 2, ZC, lo);
  put(g, mesh(new BoxGeometry(0.22, t.top + 0.14, DEPTH + 0.2), 0x8E979E, 0, 0, 0, true), t.x1, (t.top + 0.14) / 2, ZC, lo);
  const ridges: Part[] = [
    { geo: G.box, at: [0, t.top + 0.08, -DEPTH / 2], scale: [w, 0.16, 0.24] },
    { geo: G.box, at: [0, t.top + 0.08, DEPTH / 2], scale: [w, 0.16, 0.24] },
    { geo: G.box, at: [-w / 2 + 0.12, t.top + 0.08, 0], scale: [0.24, 0.16, DEPTH] },
  ];
  lo.add(mesh(bake(ridges), 0x7A5A3A, 0, 0, 0, true));
  const pond = new Mesh(new PlaneGeometry(w - 0.5, DEPTH - 0.5), pondMat);
  pond.rotation.x = -Math.PI / 2; pond.receiveShadow = true;
  put(g, pond, cx - 0.05, t.top + 0.07, ZC, lo);
  // water spilling over the stone face to the terrace below (the bottom one drains under the path)
  if (i) put(g, mesh(new BoxGeometry(0.08, t.top - below + 0.1, 0.9), fallMat), t.x1 + 0.15, (t.top + below) / 2 + 0.05, ZC);
  // High: the step rounded, walled with rounded stones, its ridges like packed mud, and its water rippling
  high(g, () => {
    const hi = new Group(), water = sheet(w - 0.5, DEPTH - 0.5, pondRipple);
    water.position.set(-0.05, t.top + 0.07, 0);
    hi.add(terraceStep(w, t.top, DEPTH).mesh(), water);
    return hi;
  }, lo);
  return g;
});

// ---------- hillside and hot spring ----------
const HILL = { x0: -37, x1: TERRACES[2].x0 - 0.05, z0: -6.0, z1: 12.0, y: 2.4 };
const SPRING = { x: -29.6, z: 0.8 };
/** How far the spring's pool reaches each way (before its shore wanders, propsSpring.ts). */
const POOL = { rx: 1.85, rz: 1.5 };
/** The stone lantern by the pool, north-west of it: where the glow at dusk comes from. */
const LANTERN = { x: SPRING.x + Math.cos(2.3) * (POOL.rx + 0.8), z: SPRING.z + Math.sin(2.3) * (POOL.rz + 0.75) };
const hill = piece((HILL.x0 + HILL.x1) / 2, (HILL.z0 + HILL.z1) / 2), hillLo = lowOf(hill);
/** Wisps of steam rising off the spring: each from its own place on the water (`a` round it, `r` out). */
const steam: { s: Sprite; t: number; a: number; r: number }[] = [];
const STEAM_LIFE = 4.2;
/** A warm glow over the spring at dusk: from over its lantern, high enough to lie soft on the rocks and the water. */
export const springLamp = new PointLight(0xFFB46A, 0, 12, 1.7);
springLamp.position.set(LANTERN.x, HILL.y + 2.4, LANTERN.z);
/** The lantern's paper panes, which light up with the glow (updFarm). */
const lanternGlow = apart(() => new MeshLambertMaterial({ color: 0xFFD9A0, emissive: 0xFFB46A, emissiveIntensity: 0.12 }), dice(0x5910));
{
  const cx = hill.position.x, cz = hill.position.z, H = HILL, sx = SPRING.x - cx, sz = SPRING.z - cz, { rx: RX, rz: RZ } = POOL;
  /** How high the wall over the top terrace stands at `z` (as high as the hill behind it), and where its ends are. */
  const wallH = (z: number) => hillHeight(H, H.x1, z), ZA = H.z0 - 0.4, ZB = H.z1 + 0.95;
  const d = dice(0x5912);
  // The hill was a box once, with a ring of rocks on it. What's made here on the game's luck is what that made, one
  // for one (a ground, a wall, fourteen rocks, a pool, a pipe, falling water, the pines, the steam), so the luck's
  // where it was afterwards. Everything else is built apart, further down.

  // the hillside itself: banks that slope and wander, a top that's never quite flat or one colour
  const lawn = seasonal(PAL.lawn);
  lawn.vertexColors = true;
  hill.add(mesh(hillside(H, cx, cz, { x: SPRING.x, z: SPRING.z, r: 2.6 }), lawn));
  // Low: a plain wall as high as the hill, running down with its banks at both ends
  hillLo.add(mesh(wallSlab(ZA, ZB, cz, 0.25, wallH), 0xA9B3BA, H.x1 - cx, 0, 0, true));
  // Low: fourteen plain rocks along the pool's shore, big and small
  const plain: Part[] = [], rock = new DodecahedronGeometry(0.42), ld = dice(0x5913);
  for (let i = 0; i < 14; i++) {
    const a = 0.32 + (i + ld() * 0.5) / 14 * (Math.PI * 2 - 0.6), k = 0.65 + ld() * 0.85, r = shore(a) + 0.07 * k;
    plain.push({ geo: rock, at: [sx + Math.cos(a) * RX * r, H.y + 0.1 * k, sz + Math.sin(a) * RZ * r], rot: [0, ld() * 6, 0], scale: [k, 0.6 * k, k * (0.8 + ld() * 0.3)] });
  }
  hillLo.add(mesh(bake(plain), 0x8A949C, 0, 0, 0, true));
  // the pool: an uneven shore, deep in the middle and pale in the shallows
  const WY = H.y + 0.04, water = poolWater(RX, RZ, mix(0x5FB1B4, C.sea, 0.4), 0x5FB1B4, mix(0x7FD6D2, 0xFFFFFF, 0.3), dice(0x591B));
  const still = mesh(water, new MeshPhongMaterial({ vertexColors: true, specular: mix(0x203038, 0xFFFFFF, 0.24), shininess: 24 }));
  still.rotation.x = -Math.PI / 2; still.position.set(sx, WY, sz);
  hillLo.add(still);
  // a bamboo pipe from the pool's edge out over the wall, tipped down a little toward the top terrace
  const PIPE = { x0: SPRING.x + RX * 0.9, x1: H.x1 + 0.5, y: H.y + 0.3, r: 0.085 }, len = PIPE.x1 - PIPE.x0, tilt = Math.atan2(0.14, len);
  const pipe = mesh(G.cyl, 0x7FA650, 0, 0, 0, true); pipe.scale.set(PIPE.r, len, PIPE.r); pipe.rotation.z = Math.PI / 2 - tilt;
  put(hill, pipe, (PIPE.x0 + PIPE.x1) / 2, PIPE.y, SPRING.z, hillLo);
  // and a thread of water falling from its mouth to the paddy
  const paddy = TERRACES[2].top + 0.07, mouth = V(PIPE.x1 - cx, PIPE.y - 0.08, sz);
  const drop = Array.from({ length: 7 }, (_, i) => V(mouth.x + 0.34 * i / 6, mouth.y - (mouth.y - paddy) * (i / 6) ** 2, sz));
  hill.add(mesh(new TubeGeometry(new CatmullRomCurve3(drop), 10, 0.035, 5), fallMat));
  // the pines, at the back of the hill and by the shore
  const sp: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) sp.push([rand(HILL.x0 + 1, HILL.x0 + 4.5) - cx, rand(HILL.z0 + 1, HILL.z1 - 1) - cz, rand(.8, 1.2)]);
  for (let i = 0; i < 4; i++) sp.push([rand(-33.5, -32) - cx, rand(HILL.z0 + 1, HILL.z0 + 3) - cz, rand(.8, 1.1)]);
  const pines = treeGroup(sp); pines.position.y = HILL.y; hill.add(pines);
  // the steam: soft puffs, from all over the water
  const puff = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  for (let i = 0; i < 14; i++) {
    const s = new Sprite(new SpriteMaterial({ map: puff.tex, transparent: true, depthWrite: false, opacity: 0 }));
    put(hill, s, SPRING.x, HILL.y, SPRING.z);
    steam.push({ s, t: i / 14 * STEAM_LIFE, a: d() * Math.PI * 2, r: Math.sqrt(d()) * 0.8 });
  }
  // (the scenery's dice, as many as the old hill's High took, so what's built after looks the same)
  quietly(() => { for (let i = 0; i < 76; i++) Math.random(); });

  apart(() => {
    const lamp = at(LANTERN.x - cx, H.y - 0.02, LANTERN.z - cz, 0.5);
    // Low: the lantern in one piece, its panes painted on
    const lowLamp = new Build();
    stoneLantern(lowLamp, lowLamp, lamp, new Build());
    hillLo.add(lowLamp.mesh());

    // High: damp ground round the pool
    const hi = new Group(), b = new Build(), green = new Build(), glow = new Build(), snow = new Build(), pool = rocks();
    const wet = new Mesh(poolDamp(RX, RZ), new MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    wet.position.set(sx, H.y + 0.014, sz); wet.receiveShadow = true;
    // boulders of all sizes along its shore, mossy (snow on them in winter), but for where the pipe leaves it
    poolRocks(pool, RX, RZ, H.y, dice(0x5915), { a: 0, w: 0.16 });
    b.addAll(pool.rock, at(sx, 0, sz)); snow.addAll(pool.snow, at(sx, 0, sz));
    // a dry-stone wall holding the hill up over the top terrace, long grass on its cap and in its joints
    const face = at(H.x1 + 0.055 - cx, 0, -cz), wall = new Build(), wallGreen = new Build();
    /** How much of the wall's foot the top terrace stands in front of, at `z`. */
    const behind = (z: number) => z > TERRACE_Z.z0 + 0.25 && z < TERRACE_Z.z1 - 0.25 ? TERRACES[2].top - 0.05 : 0;
    dryWall(wall, wallGreen, ZA, ZB, wallH, dice(0x5916), behind);
    b.addAll(wall, face); green.addAll(wallGreen, face);
    // tufts of long grass here and there on top, and round the pool
    for (let i = 0; i < 26; i++) {
      const x = H.x0 + 0.6 + d() * (H.x1 - H.x0 - 1.2), z = H.z0 + 0.8 + d() * (H.z1 - H.z0 - 1.4);
      if (Math.hypot(x - SPRING.x, z - SPRING.z) < 2.6) continue;
      tuft(green, x - cx, hillHeight(H, x, z) - 0.02, z - cz, 0.24 + d() * 0.2, d);
    }
    for (let i = 0; i < 9; i++) {
      const a = 0.5 + d() * 5.3, k = shore(a) + 0.32 + d() * 0.35;
      tuft(green, sx + Math.cos(a) * RX * k, H.y - 0.02, sz + Math.sin(a) * RZ * k, 0.3 + d() * 0.3, d);
    }
    // the water rippling
    const rippling = new Mesh(water, rippleMaterial({ vertexColors: true, specular: mix(0x203038, 0xFFFFFF, 0.24), shininess: 24 }, 0.008));
    rippling.rotation.x = -Math.PI / 2; rippling.position.set(sx, WY, sz); rippling.receiveShadow = true;
    // the pipe jointed, on crossed stakes at the wall; foam where its water lands
    b.addAll(bambooPipe(len, PIPE.r, 0.32), new Matrix4().makeRotationZ(-tilt).setPosition((PIPE.x0 + PIPE.x1) / 2 - cx, PIPE.y, sz));
    for (const s of [-1, 1]) b.add(tube(0.025, 0.03, 0.5, 6), 0x8A6A3A, H.x1 - 0.45 - cx, H.y + 0.13, sz + s * 0.06, [s * 0.35, 0, 0]);
    const fm = new Build(); foam(fm, d, 0.2);
    b.addAll(fm, at(mouth.x + 0.36, paddy, sz));
    // the lantern, its paper panes lit by the glow
    stoneLantern(b, glow, lamp, snow);
    // (the grass is the lawn's colour through the year, a little darker out of winter)
    const grass = seasonal([PAL.lawn[0], shade(PAL.lawn[1], 0.9), shade(PAL.lawn[2], 0.9), shade(PAL.lawn[3], 0.9)]);
    hi.add(wet, rippling, b.mesh(), glow.mesh(false, lanternGlow), seasonLayer(snow.mesh(false), SNOWY), green.mesh(false, grass));
    hill.add(hi);
    detail(hillLo, hi);
  }, dice(0x5911));
}


// ---------- farmhouse, water wheel, drying racks ----------
const HOUSE = { x: -18.6, z: 9.8 };
const house = piece(HOUSE.x, HOUSE.z), houseLo = lowOf(house);
let wheel: Group;
{
  const at = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
  houseLo.add(mesh(new BoxGeometry(4.2, 1.9, 3.0), 0xEDE2CB, 0, 0.95, 0, true));
  const posts: Part[] = [];
  for (const [x, z] of [[-2.1, -1.5], [2.1, -1.5], [-2.1, 1.5], [2.1, 1.5]]) posts.push({ geo: G.box, at: at(x, 0.95, z), scale: [0.18, 1.9, 0.18] });
  posts.push({ geo: G.box, at: at(0.8, 0.65, -1.52), scale: [0.9, 1.3, 0.06] });
  houseLo.add(mesh(bake(posts), 0x5B3A26, 0, 0, 0, true));
  // a steep thatched roof, just wider than the house, with snow on its peak in winter
  const thatch = mesh(new CylinderGeometry(0, 3.0, 1.9, 4), 0xB8894A, 0, 2.85, 0, true);
  thatch.rotation.y = Math.PI / 4; thatch.scale.set(1.05, 1, 0.8); houseLo.add(thatch);
  const cap = mesh(new CylinderGeometry(0, 1.5, 0.95, 4), seasonal([0xFFFFFF, 0xB8894A, 0xB8894A, 0xB8894A]), 0, 3.33, 0);
  cap.rotation.y = Math.PI / 4; cap.scale.set(1.05, 1, 0.8); houseLo.add(cap);
  // The water wheel stands in the stream where it leaves the house (the stream runs east from under it, to the
  // channel), its axle on a post either side, and turns with the water: paddles standing out from the rim, spokes
  // and a hub.
  wheel = new Group(); wheel.position.set(3.3, 1.05, -0.4); house.add(wheel);
  const wheelLo = lowOf(wheel);
  wheelLo.add(mesh(new TorusGeometry(1.0, 0.07, 6, 20), 0x6B4A2E, 0, 0, 0, true));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const p = mesh(new BoxGeometry(0.5, 0.08, 0.42), 0x7A5A3A, Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0, true);
    p.rotation.z = a; wheelLo.add(p);
    if (i < 4) { const s = mesh(G.box, 0x6B4A2E, 0, 0, 0, true); s.scale.set(2, 0.07, 0.07); s.rotation.z = a; wheelLo.add(s); }
  }
  const hub = mesh(new CylinderGeometry(0.16, 0.16, 0.5, 10), 0x5B3A26, 0, 0, 0, true); hub.rotation.x = Math.PI / 2; wheelLo.add(hub);
  const axle = mesh(new CylinderGeometry(0.06, 0.06, 1.0, 8), 0x3C2A1C, 3.3, 1.05, -0.4); axle.rotation.x = Math.PI / 2; houseLo.add(axle);
  for (const s of [-1, 1]) {
    const post = mesh(G.box, 0x5B3A26, 3.3, 0.55, -0.4 + s * 0.45, true);
    post.scale.set(0.12, 1.1, 0.12); houseLo.add(post);
  }
  // High: board walls in a timber frame, a door and paper windows, a thick thatch laid in tiers (snow on its top in
  // winter), and the water wheel rimmed, with blades and buckets, turning on the same pivot as the Low one
  high(house, () => {
    const hi = new Group();
    const stand = wheelStand(1.05).mesh(); stand.position.set(3.3, 0, -0.4);
    hi.add(farmhouse().mesh(), seasonLayer(farmhouseSnow().mesh(false), SNOWY), stand);
    return hi;
  }, houseLo);
  high(wheel, () => waterWheel().mesh(), wheelLo);
}
shelter({ x0: HOUSE.x - 2.2, x1: HOUSE.x + 2.2, z0: HOUSE.z - 1.7, z1: HOUSE.z + 1.7, top: 3.8, on: () => house.visible });
// the drying racks, south of the stream and clear of the water wheel
const racks = piece(-14.5, 12.4), racksLo = lowOf(racks);
{
  const wood: Part[] = [], sheaves: Part[] = [];
  for (const z of [-1.4, 0, 1.4]) {
    for (const x of [-1.1, 1.1]) wood.push({ geo: G.cyl, at: [x, 0.8, z], scale: [0.06, 1.6, 0.06] });
    wood.push({ geo: G.cyl, at: [0, 1.4, z], rot: [0, 0, Math.PI / 2], scale: [0.05, 2.4, 0.05] });
    for (let i = 0; i < 6; i++) sheaves.push({ geo: new CylinderGeometry(0.12, 0.2, 0.9, 7), at: [-0.9 + i * 0.36, 1.0, z] });
  }
  racksLo.add(mesh(bake(wood), 0x6B4A2E, 0, 0, 0, true));
  racksLo.add(mesh(bake(sheaves), 0xE0B84A, 0, 0, 0, true));
  // High: tapered posts braced with struts and lashed to the rails, and sheaves hung over them, bound round the middle
  high(racks, () => {
    const b = new Build(), xs = [0, 1, 2, 3, 4, 5].map(i => -0.9 + i * 0.36);
    for (const z of [-1.4, 0, 1.4]) b.addAll(dryingRack(1.1, 1.4, xs), at(0, 0, z));
    return b.mesh();
  }, racksLo);
}

// ---------- channel, path and bridge ----------
const DOOR_Z = (FARM_DOOR.z0 + FARM_DOOR.z1) / 2;
const STREAM_Z = HOUSE.z - 0.4;
const ways = piece(CHANNEL_X, DOOR_Z), waysLo = lowOf(ways);
/** Where the land ends and the sea begins (and the quay's wall, when it's there), along the channel. */
const SHORE_Z = QUAY.z0;
/** How high the channel's stone edges stand: under the quay's planks (their top at FY), which run over the channel. */
const KERB_H = FY - 0.01;
/** The dark openings in the casino's quay, where the channel runs under it: only while the quay's there. */
let culvert: Group;

/**
 * Where the channel runs out into the sea: a fan of its paler water, flaring out and fading away as it goes, with a
 * few faint streaks along it where it flows. It's only a tint on the water, nothing standing up out of it, so it never
 * looks like it's in the yacht's way, and it fades out short of the yacht's bow.
 */
const MOUTH = { len: 1.5, w0: 0.6, w1: 1.9 };
const mouthMat = quietly(() => new MeshLambertMaterial({
  color: 0xBFEFF5, emissive: 0x204050, transparent: true, depthWrite: false,
  map: canvasTex(32, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // the bottom row is the channel's end (the texture's v runs up from it); faded at the sides
      const u = x / (w - 1), k = 1 - y / (h - 1), side = Math.min(1, (1 - Math.abs(2 * u - 1)) / 0.4);
      const streak = 0.8 + 0.2 * Math.cos(u * Math.PI * 8);
      c.fillStyle = `rgba(255,255,255,${(0.5 * (1 - k) ** 1.25 * streak * side * side * (3 - 2 * side)).toFixed(3)})`;
      c.fillRect(x, y, 1, 1);
    }
  }).tex,
}), dice(5));
function mouth() {
  return quietly(() => {
    const n = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      // it flares like a funnel: slowly at first, then wider
      const k = i / n, hw = (MOUTH.w0 + (MOUTH.w1 - MOUTH.w0) * k ** 1.6) / 2, z = -k * MOUTH.len;
      pos.push(-hw, 0, z, hw, 0, z); uv.push(0, k, 1, k);
      if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new Mesh(geo, mouthMat);
    m.receiveShadow = true; m.userData.noBatch = true;
    return m;
  }, dice(6));
}
{
  const z0 = SHORE_Z, z1 = STREAM_Z + 0.3, len = z1 - z0, zc = (z0 + z1) / 2;
  // the channel along the restaurant's west wall, out to the sea, with stone edges (under the casino's quay, when
  // it's there: the quay's planks hide it, and it comes out through the quay's wall into the sea)
  put(ways, mesh(new BoxGeometry(0.6, 0.06, len), streamMat), CHANNEL_X, 0.03, zc, waysLo);
  const edges: Part[] = [];
  for (const s of [-1, 1]) edges.push({ geo: G.box, at: [s * 0.37, KERB_H / 2, zc - DOOR_Z], scale: [0.14, KERB_H, len] });
  waysLo.add(mesh(bake(edges), 0x9AA4AC, 0, 0, 0, true));
  // the stream from the water wheel to the channel
  const sx0 = HOUSE.x + 2.6, sx1 = CHANNEL_X - 0.3;
  put(ways, mesh(new BoxGeometry(sx1 - sx0, 0.06, 0.5), streamMat), (sx0 + sx1) / 2, 0.03, STREAM_Z, waysLo);
  // stepping stones along the bottom terrace, raised a little off the snow
  const stones: Part[] = [];
  const px = (PATH_X.x0 + PATH_X.x1) / 2;
  for (let z = TERRACE_Z.z0 - 0.3; z < TERRACE_Z.z1 + 1.2; z += 1.0) {
    stones.push({ geo: G.cyl, at: [px + rand(-.08, .08) - CHANNEL_X, 0.05, z - DOOR_Z], rot: [0, rand(0, 3), 0], scale: [0.42, 0.1, 0.36] });
  }
  waysLo.add(mesh(bake(stones), 0xB9C2C9, 0, 0, 0, true));
  // the bridge over the channel to the farm door, level with the restaurant's floor
  const bx0 = PATH_X.x1 - 0.2, bx1 = HALL_BOX.x0, bw = bx1 - bx0, bd = FARM_DOOR.z1 - FARM_DOOR.z0;
  put(ways, mesh(new BoxGeometry(bw, 0.14, bd), 0xB0724A, 0, 0, 0, true), (bx0 + bx1) / 2, FY - 0.07, DOOR_Z, waysLo);
  const rails: Part[] = [];
  for (const s of [-1, 1]) rails.push({ geo: G.box, at: [(bx0 + bx1) / 2 - CHANNEL_X, FY + 0.45, s * (bd / 2 - 0.04)], scale: [bw, 0.08, 0.08] });
  for (const s of [-1, 1]) for (const x of [bx0 + 0.1, bx1 - 0.1]) rails.push({ geo: G.box, at: [x - CHANNEL_X, FY + 0.22, s * (bd / 2 - 0.04)], scale: [0.08, 0.45, 0.08] });
  waysLo.add(mesh(bake(rails), 0x8A5A3B, 0, 0, 0, true));
  // where it runs out into the sea: a faint fan of its paler water on the flat sea (on High, over the swell)
  put(ways, mouth(), CHANNEL_X, 0.016, SHORE_Z, waysLo);
  // High: the water rippling, kerbs of rounded stone blocks, pebbles along the stream, rounded stepping stones in the
  // same places, and a bridge of boards with rounded rails and capped posts
  high(ways, () => {
    const hi = new Group(), b = new Build(), small = new Build();
    const channel = sheet(0.6, len, streamRipple, 0.3); channel.position.set(0, 0.055, zc - DOOR_Z);
    const stream = sheet(sx1 - sx0, 0.5, streamRipple, 0.3); stream.position.set((sx0 + sx1) / 2 - CHANNEL_X, 0.055, STREAM_Z - DOOR_Z);
    for (const s of [-1, 1]) b.addAll(kerb(len, 0.14, KERB_H, 0x9AA4AC), at(s * 0.37, 0, zc - DOOR_Z));
    small.addAll(pebbles(sx1 - sx0 - 0.4, 0.5), at((sx0 + sx1) / 2 - CHANNEL_X, 0, STREAM_Z - DOOR_Z));
    for (const p of stones) {
      const [sx, , sz] = p.scale!;
      b.addAll(steppingStone(sx, sz), at(p.at[0], 0, p.at[2], p.rot![1]));
    }
    b.addAll(bridge(bw, bd, FY, [-bw / 2 + 0.1, bw / 2 - 0.1], FY + 0.45), at((bx0 + bx1) / 2 - CHANNEL_X, 0, 0));
    hi.add(b.mesh(), small.mesh(false), channel, stream, put(ways, mouth(), CHANNEL_X, 0.112, SHORE_Z, hi));
    return hi;
  }, waysLo);
  // with the casino's quay over it: dark openings in the quay where the water goes under, from the land and out to the
  // sea, between the channel's edges
  culvert = quietly(() => {
    const g = new Group(), dark = new MeshLambertMaterial({ color: 0x1B2A31 });
    g.add(new Mesh(new BoxGeometry(0.6, 0.075, 0.01), dark), new Mesh(new BoxGeometry(0.6, 0.1, 0.01), dark));
    g.children[0].position.set(0, 0.1, QUAY.z1 + 0.005 - DOOR_Z);
    g.children[1].position.set(0, 0.085, QUAY.z0 - 0.005 - DOOR_Z);
    return g;
  }, dice(7));
  culvert.visible = false;
  ways.add(culvert);
}

/** Everything above, for the stage-up (terraces first, in order up the slope). */
export const farmPieces = [ways, ...terracePieces, hill, house, racks];

/** Shows the farm (stage 2). */
export function showFarm() {
  farmPieces.forEach(p => { p.visible = true; });
  scene.add(springLamp);
}

/** Turns the water wheel and lets steam rise off the spring. */
export function updFarm(dt: number) {
  if (!hill.visible) return;
  culvert.visible = casinoBoat.open;
  updRipples(dt);
  wheel.rotation.z += dt * 0.8; // its bottom moves east, with the stream
  // wisps that rise from all over the water, thin as they leave it, then spread, drift east and fade; thicker in the cold
  const thick = amount(STEAMY), lit = springLamp.intensity / 9;
  for (const p of steam) {
    p.t = (p.t + dt) % STEAM_LIFE;
    const k = p.t / STEAM_LIFE, s = p.s;
    s.position.set(SPRING.x - hill.position.x + Math.cos(p.a) * p.r * 1.7 + Math.sin(p.t * 0.9 + p.a) * 0.25 + k * k * 0.9,
      HILL.y + 0.25 + k * 3.4, SPRING.z - hill.position.z + Math.sin(p.a) * p.r * 1.35 + Math.cos(p.t * 0.7 + p.a) * 0.2);
    s.scale.setScalar(0.9 + k * 2.4);
    s.material.opacity = 0.34 * thick * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k) ** 1.3;
    // (it takes the dusk's light, rather than standing out white against it)
    s.material.color.copy(sky.bg).lerp(WHITE, 0.55 - 0.2 * lit);
  }
  lanternGlow.emissiveIntensity = 0.12 + 0.88 * lit;
}

