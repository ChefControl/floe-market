// Stage 2's farm scenery west of the restaurant: three rice terraces stepping up to a snowy hillside with a hot
// spring that feeds them, a farmhouse with a water wheel, drying racks, the irrigation channel along the
// restaurant, and the stepping-stone path and bridge to the farm door. The rice itself is in rice.ts.
// Every walking surface here is either raised off the ground or kept clear of its neighbours, so no two of them
// share a plane (overlapping flat surfaces at the same height flicker).
import {
  BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, Mesh, MeshLambertMaterial, MeshPhongMaterial, PlaneGeometry,
  PointLight, Sprite, SpriteMaterial, TorusGeometry, type Object3D,
} from 'three';
import { at, Build, detail, quietly, seasonLayer } from './kit';
import { CHANNEL_X, FARM_DOOR, HALL_BOX, PATH_X, TERRACE_Z, TERRACES } from './layout';
import {
  bambooPipe, bridge, dryingRack, farmhouse, farmhouseSnow, kerb, pebbles, rippleDisc, rippleMaterial, rippleSheet,
  rockSnow, springRock, steppingStone, stoneWall, terraceStep, updRipples, waterWheel, wheelStand,
} from './propsFarm';
import { bake, canvasTex, G, mesh, scene, type Part } from './render';
import { PAL, seasonal, shelter, type Swatch } from './season';
import { FY, rand } from './util';
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
const hill = piece((HILL.x0 + HILL.x1) / 2, (HILL.z0 + HILL.z1) / 2), hillLo = lowOf(hill);
/** Steam puffs rising off the spring. */
const steam: { s: Sprite; t: number }[] = [];
/** A warm glow over the spring at dusk. */
export const springLamp = new PointLight(0xFFB46A, 0, 12, 1.4);
springLamp.position.set(SPRING.x, HILL.y + 1.6, SPRING.z);
{
  const cx = hill.position.x, cz = hill.position.z;
  put(hill, mesh(new BoxGeometry(HILL.x1 - HILL.x0, HILL.y, HILL.z1 - HILL.z0), seasonal(PAL.lawn), 0, 0, 0, true), cx, HILL.y / 2, cz);
  put(hill, mesh(new BoxGeometry(0.25, HILL.y + 0.1, HILL.z1 - HILL.z0 + 0.2), 0xA9B3BA, 0, 0, 0, true), HILL.x1, (HILL.y + 0.1) / 2, cz, hillLo);
  // the spring: a steaming pool in a ring of rocks
  const rocks: Part[] = [];
  const rock = new DodecahedronGeometry(0.42);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    rocks.push({ geo: rock, at: [SPRING.x - cx + Math.cos(a) * 2.1, HILL.y + 0.12, SPRING.z - cz + Math.sin(a) * 1.7], rot: [0, a, 0], scale: [1, 0.6, 1] });
  }
  hillLo.add(mesh(bake(rocks), 0x8A949C, 0, 0, 0, true));
  const pool = mesh(new CylinderGeometry(2.0, 2.0, 0.08, 28), new MeshPhongMaterial({ color: 0x7FD6D2, emissive: 0x1E4D4C, shininess: 90 }));
  pool.scale.z = 0.82; put(hill, pool, SPRING.x, HILL.y + 0.06, SPRING.z, hillLo);
  // a bamboo pipe from the spring down to the top terrace
  const pipe = mesh(G.cyl, 0x7FA650, 0, 0, 0, true); pipe.scale.set(0.09, 2.2, 0.09); pipe.rotation.z = Math.PI / 2;
  put(hill, pipe, HILL.x1 - 1.0, HILL.y + 0.15, SPRING.z, hillLo);
  put(hill, mesh(new BoxGeometry(0.08, HILL.y + 0.1 - TERRACES[2].top, 0.5), fallMat), HILL.x1 + 0.2, (HILL.y + TERRACES[2].top) / 2 + 0.1, SPRING.z);
  const sp: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) sp.push([rand(HILL.x0 + 1, HILL.x0 + 4.5) - cx, rand(HILL.z0 + 1, HILL.z1 - 1) - cz, rand(.8, 1.2)]);
  for (let i = 0; i < 4; i++) sp.push([rand(-33.5, -32) - cx, rand(HILL.z0 + 1, HILL.z0 + 3) - cz, rand(.8, 1.1)]);
  const pines = treeGroup(sp); pines.position.y = HILL.y; hill.add(pines);
  const puff = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  for (let i = 0; i < 14; i++) {
    const s = new Sprite(new SpriteMaterial({ map: puff.tex, transparent: true, depthWrite: false, opacity: 0 }));
    put(hill, s, SPRING.x, HILL.y, SPRING.z);
    steam.push({ s, t: i / 14 * 3.2 });
  }
  // High: the hillside's face walled with rounded stones; mossy rocks round the spring (snow on them in winter); its
  // water rippling; and a jointed bamboo pipe on a stake
  high(hill, () => {
    const hi = new Group(), b = new Build(), snow = new Build(), sx = SPRING.x - cx, sz = SPRING.z - cz;
    b.addAll(stoneWall(HILL.y + 0.1, HILL.z1 - HILL.z0 + 0.2, 0xA9B3BA, 0.9), at(HILL.x1 + 0.055 - cx, 0, 0));
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, m = at(sx + Math.cos(a) * 2.1, HILL.y - 0.02, sz + Math.sin(a) * 1.7, -a - Math.PI / 2);
      b.addAll(springRock(), m);
      snow.addAll(rockSnow(), m);
    }
    b.addAll(bambooPipe(2.2, 0.09, 0.15), at(HILL.x1 - 1.0 - cx, HILL.y + 0.15, sz));
    const water = new Mesh(rippleDisc(2.0, 0.82), rippleMaterial({ color: 0x7FD6D2, emissive: 0x1E4D4C, shininess: 90 }, 0.01));
    water.rotation.x = -Math.PI / 2; water.receiveShadow = true;
    water.position.set(sx, HILL.y + 0.1, sz);
    hi.add(b.mesh(), seasonLayer(snow.mesh(false), SNOWY), water);
    return hi;
  }, hillLo);
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
{
  const z0 = -6.5, z1 = STREAM_Z + 0.3, len = z1 - z0, zc = (z0 + z1) / 2;
  // the channel along the restaurant's west wall, out to the sea, with stone edges
  put(ways, mesh(new BoxGeometry(0.6, 0.06, len), streamMat), CHANNEL_X, 0.03, zc, waysLo);
  const edges: Part[] = [];
  for (const s of [-1, 1]) edges.push({ geo: G.box, at: [s * 0.37, 0.08, zc - DOOR_Z], scale: [0.14, 0.16, len] });
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
  // High: the water rippling, kerbs of rounded stone blocks, pebbles along the stream, rounded stepping stones in the
  // same places, and a bridge of boards with rounded rails and capped posts
  high(ways, () => {
    const hi = new Group(), b = new Build(), small = new Build();
    const channel = sheet(0.6, len, streamRipple, 0.3); channel.position.set(0, 0.055, zc - DOOR_Z);
    const stream = sheet(sx1 - sx0, 0.5, streamRipple, 0.3); stream.position.set((sx0 + sx1) / 2 - CHANNEL_X, 0.055, STREAM_Z - DOOR_Z);
    for (const s of [-1, 1]) b.addAll(kerb(len, 0.14, 0.16, 0x9AA4AC), at(s * 0.37, 0, zc - DOOR_Z));
    small.addAll(pebbles(sx1 - sx0 - 0.4, 0.5), at((sx0 + sx1) / 2 - CHANNEL_X, 0, STREAM_Z - DOOR_Z));
    for (const p of stones) {
      const [sx, , sz] = p.scale!;
      b.addAll(steppingStone(sx, sz), at(p.at[0], 0, p.at[2], p.rot![1]));
    }
    b.addAll(bridge(bw, bd, FY, [-bw / 2 + 0.1, bw / 2 - 0.1], FY + 0.45), at((bx0 + bx1) / 2 - CHANNEL_X, 0, 0));
    hi.add(b.mesh(), small.mesh(false), channel, stream);
    return hi;
  }, waysLo);
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
  updRipples(dt);
  wheel.rotation.z += dt * 0.8; // its bottom moves east, with the stream
  for (const p of steam) {
    p.t = (p.t + dt) % 3.2;
    const k = p.t / 3.2, s = p.s;
    s.position.set(SPRING.x - hill.position.x + Math.sin(p.t * 2 + s.id) * 0.8, HILL.y + 0.2 + k * 3.2, SPRING.z - hill.position.z + Math.cos(p.t * 1.7 + s.id) * 0.6);
    s.scale.setScalar(0.8 + k * 2.2);
    s.material.opacity = 0.55 * (1 - k);
  }
}

