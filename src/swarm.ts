// The fans in the arena (stage 3). While a bout's fans buy their soup they queue on the floor before the bowl stall, and
// each one who eats turns your orange and goes to sit on the champion's side: on the stands' benches first, then on the
// floor round the ring. When the bout's about to start, the ones who didn't eat give up and go home. On a boss night his
// whole crowd floods the floor in his purple, and the ones still his sit down on his side. They turn up out of sight,
// deep in one of the tunnels behind the arena's back walls, and after the result they go home the same way. They walk
// round the ring, the stands and the stall, never through them, each at their own pace, and each acts on their own:
// they look about while they queue, sit, stand up for the charge, and cheer in bursts, the side that's ahead the most.
//
// They're meant to pass for the game's people, so they're made the same way, from the same wardrobe, and walk, sit and
// cheer as people do. But there can be 500 of them, and a Person is six draw calls of its own, so the swarm is drawn in
// batches: a dozen looks, each one's body, arms and legs an instanced mesh (below). If frames run slow while it's
// out, it stops casting shadows.
import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, InstancedMesh, Matrix4, Quaternion, Sprite, SpriteMaterial, Vector3 } from 'three';
import { CY, cellarBoxes, parts, placeBuilt, places, RING } from './cellar';
import { FLOOR, GONG_PAD, STALL, STALL_PAD, TUNNELS, WATCH } from './cellarPlan';
import { crowdModel, PARKAS, SHIRT } from './characters';
import { BOSSES, F } from './fight';
import { onQuality } from './graphics';
import { ARENA, level, pushOutOfBox } from './layout';
import { FONT, painted, rr, scene } from './render';
import { CHAMP } from './rikishi';
import { crowdStyle } from './wardrobe';
import type { XZ } from './util';

/** The most figures the arena holds (a bigger crowd is drawn one figure for every two fans: Fukure's 1,000). */
export const MAX_FANS = 520;
/** Their colours: a boss's crowd's purple, and yours. */
export const BOSS_COLOR = new Color(0x7A4FB0), OURS = new Color(0xFF6B4A);

// ---------- the figures ----------
// Each look is a crowd member made like the game's people (characters.ts), the low life who come down to see a fight:
// yakuza in sharp suits and hooligans in tracksuits, with eyes, hair, hats and all (the same all year: the seasons
// don't reach the cellar). Their body, and an arm and a leg as each hangs from its pivot. Each
// of those is split into the shirt (made in a colour nobody wears, to find it, then white, so each fan's colour can
// tint it) and the rest, and each piece is one instanced mesh for every fan with that look (an arm or a leg twice a
// fan), so arms and legs swing as a walker's do, and the swarm is a few dozen draw calls however big it gets. They're
// made the first time the swarm's drawn, in the graphics' detail (High or Low), and made again if that changes.
const LOOKS = 12, PER = Math.ceil(MAX_FANS / LOOKS * 1.5);
type Part = 'body' | 'arm' | 'leg';
interface Piece { im: InstancedMesh; shirt: boolean }
interface Look { parts: Record<Part, Piece[]>; armAt: Vector3[]; legAt: Vector3[]; height: number }
let looks: Look[] | null = null;
/** Every instanced mesh, for counting and shadows. */
const allMeshes = () => (looks ?? []).flatMap(l => [...l.parts.body, ...l.parts.arm, ...l.parts.leg]).map(p => p.im);
/** A baked geometry's shirt (its SHIRT-coloured triangles, made white) and the rest. */
function split(g: BufferGeometry): [BufferGeometry | null, BufferGeometry | null] {
  const flat = g.index ? g.toNonIndexed() : g, pos = flat.attributes.position, col = flat.attributes.color;
  const out: [number[], number[]][] = [[[], []], [[], []]];
  const shirt = new Color(SHIRT), near = (a: number, b: number) => Math.abs(a - b) < 0.01;
  for (let t = 0; t < pos.count; t += 3) {
    const isShirt = near(col.getX(t), shirt.r) && near(col.getY(t), shirt.g) && near(col.getZ(t), shirt.b);
    const o = out[isShirt ? 0 : 1];
    for (let v = t; v < t + 3; v++) {
      o[0].push(pos.getX(v), pos.getY(v), pos.getZ(v));
      if (isShirt) o[1].push(1, 1, 1); else o[1].push(col.getX(v), col.getY(v), col.getZ(v));
    }
  }
  return out.map(([p, c]) => {
    if (!p.length) return null;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(p, 3));
    geo.setAttribute('color', new Float32BufferAttribute(c, 3));
    geo.computeVertexNormals();
    return geo;
  }) as [BufferGeometry | null, BufferGeometry | null];
}
function makeLooks() {
  looks = Array.from({ length: LOOKS }, (_, k) => {
    const p = crowdModel(crowdStyle(100_000 + k), k % 2 ? 'hooligan' : 'yakuza'), b = p.baked();
    const halves = (g: BufferGeometry) => split(g).map((x, i) => [x, i === 0] as const).filter((x): x is [BufferGeometry, boolean] => !!x[0]);
    const pieces = (geos: BufferGeometry[], per: number) => geos.flatMap(halves).map(([g, shirt]) => {
      const im = new InstancedMesh(g, painted, PER * per);
      im.count = 0; im.castShadow = shadows; im.receiveShadow = false; im.frustumCulled = false;
      if (shirt) im.setColorAt(0, OURS);
      scene.add(im);
      return { im, shirt };
    });
    return {
      parts: { body: pieces(b.body, 1), arm: pieces([b.arm], 2), leg: pieces([b.leg], 2) },
      armAt: p.arms.map(a => a.position.clone()), legAt: p.legs.map(l => l.position.clone()), height: p.style.height,
    };
  });
}
// the graphics changing (High or Low): the looks are made again, in the new detail, the next time the swarm's drawn
onQuality(() => {
  for (const im of allMeshes()) { scene.remove(im); im.geometry.dispose(); im.dispose(); }
  looks = null;
});


// ---------- where they stand ----------
/** Spots on the floor for `n` fans, packed to fit, nearest the stall first. */
const spotCache = new Map<number, { x: number; z: number }[]>();
function spots(n: number) {
  const size = n <= 60 ? 60 : n <= 150 ? 150 : MAX_FANS;
  let out = spotCache.get(size);
  if (out) return out;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const w = FLOOR.x1 - FLOOR.x0, h = FLOOR.z1 - FLOOR.z0, gap = Math.min(0.9, Math.sqrt(w * h / size / 0.87) * 0.95);
  out = [];
  const front = { x: STALL.x - 0.7, z: STALL.z };
  for (let row = 0, z = FLOOR.z0 + gap / 2; z <= FLOOR.z1; row++, z += gap * 0.87) {
    for (let x = FLOOR.x0 + gap / 2 + (row % 2 ? gap / 2 : 0); x <= FLOOR.x1; x += gap) {
      out.push({ x: x + (rnd() - 0.5) * gap * 0.3, z: z + (rnd() - 0.5) * gap * 0.3 });
    }
  }
  // (none in the stall's footprint, or anything else's)
  const { boxes } = navMap();
  out = out.filter(q => !inBox(q, boxes, 0.15));
  out.sort((a, b) => Math.hypot(a.x - front.x, (a.z - front.z) * 1.3) - Math.hypot(b.x - front.x, (b.z - front.z) * 1.3));
  spotCache.set(size, out);
  return out;
}

// ---------- the way round the arena ----------
// A small map of the way round the arena's furniture: the corners of everything in it (the ring, the stands, the stall,
// the gong, the cashier's window, ...), a little out from them, and which of them can see which. A fan's way from where
// they are to where they're going is the shortest along it. Remade when the furniture changes (a new tier).
type Box = [number, number, number, number];
const OUT = 0.4, CLEAR = 0.3, NEAR = 0.05;
let nav: { key: string; boxes: Box[]; nodes: XZ[]; sees: boolean[][] } | null = null;
const venueKey = () => `${+parts.bleachers.visible}${+parts.tier.visible}${+parts.vip.visible}${+parts.drums.visible}`;
const inArena = (q: XZ) => q.x > ARENA.x0 + 0.2 && q.x < ARENA.x1 - 0.2 && q.z > ARENA.z0 + 0.2 && q.z < ARENA.z1 - 0.2;
function inBox(q: XZ, boxes: Box[], m: number) {
  return boxes.some(([cx, cz, hx, hz]) => Math.abs(q.x - cx) < hx + m && Math.abs(q.z - cz) < hz + m);
}
/** Whether the straight way from p to q passes clear of every box, `m` out from it (Liang–Barsky clipping). */
function clear(p: XZ, q: XZ, boxes: Box[], m = CLEAR) {
  return !boxes.some(([cx, cz, hx, hz]) => {
    const x0 = cx - hx - m, x1 = cx + hx + m, z0 = cz - hz - m, z1 = cz + hz + m;
    let t0 = 0, t1 = 1;
    const dx = q.x - p.x, dz = q.z - p.z;
    for (const [pp, qq] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dz, p.z - z0], [dz, z1 - p.z]]) {
      if (pp === 0) { if (qq <= 0) return false; continue; }
      const r = qq / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 < t1;
  });
}
function navMap() {
  const key = venueKey();
  if (nav?.key === key) return nav;
  // (only what's in the arena: the furniture of the other rooms is behind its walls)
  const boxes = cellarBoxes().filter(([cx, cz, hx, hz]) => cx + hx > ARENA.x0 && cx - hx < ARENA.x1 && cz + hz > ARENA.z0 && cz - hz < ARENA.z1) as Box[];
  const nodes: XZ[] = [];
  for (const [cx, cz, hx, hz] of boxes) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const q = { x: cx + sx * (hx + OUT), z: cz + sz * (hz + OUT) };
      if (inArena(q) && !inBox(q, boxes, CLEAR)) nodes.push(q);
    }
  }
  const sees = nodes.map(a => nodes.map(b => a !== b && clear(a, b, boxes)));
  nav = { key, boxes, nodes, sees };
  return nav;
}
/** The way from `a` to `b` round the furniture: the corners to pass, and `b`. */
function wayAround(a: XZ, b: XZ, first = true): XZ[] {
  const { boxes, nodes, sees } = navMap();
  // (caught in something's footprint: out of it first, the shortest way)
  if (first && inBox(a, boxes, NEAR)) {
    const out = { ...a };
    for (const [cx, cz, hx, hz] of boxes) pushOutOfBox(out, cx, cz, hx + NEAR * 2, hz + NEAR * 2);
    return [out, ...wayAround(out, b, false)];
  }
  if (clear(a, b, boxes)) return [b];
  const n = nodes.length, dist = new Array<number>(n).fill(Infinity), prev = new Array<number>(n).fill(-1), done = new Array<boolean>(n).fill(false);
  // (the first and last legs can run closer to things: a fan may be standing nearer one than the map's corners are)
  for (let i = 0; i < n; i++) if (clear(a, nodes[i], boxes, NEAR)) dist[i] = Math.hypot(nodes[i].x - a.x, nodes[i].z - a.z);
  let best = -1, bestD = Infinity;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] >= bestD) break;
    done[u] = true;
    if (clear(nodes[u], b, boxes, NEAR)) { const d = dist[u] + Math.hypot(b.x - nodes[u].x, b.z - nodes[u].z); if (d < bestD) { bestD = d; best = u; } }
    for (let v = 0; v < n; v++) {
      if (done[v] || !sees[u][v]) continue;
      const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  if (best < 0) return [b];
  const way: XZ[] = [b];
  for (let v = best; v >= 0; v = prev[v]) way.unshift(nodes[v]);
  return way;
}

// ---------- where they sit ----------
/** A seat: where they sit (y up from the floor: a bench's plank), which way they face, and where they step up to it
 *  from (a bench's is in front of the stand, on the floor). */
interface Seat { x: number; z: number; y: number; face: number; from: XZ }
/** Seats for `n` fans: the built benches, then as much of the floor round the ring as it takes (wherever isn't
 *  furniture, the floor before the stall or a pad, packed to fit, the nearest the ring). In the order the champion's
 *  fans take them from the front, and his opponent's from the back: the benches east of the ring, the floor (east to
 *  west), then the benches west of the ring, so each side fills its own benches first. */
const seatCache = new Map<string, Seat[]>();
function seatsFor(n: number) {
  const key = `${n}|${venueKey()}`;
  let out = seatCache.get(key);
  if (out) return out;
  const { boxes } = navMap(), pads = [STALL_PAD, GONG_PAD, WATCH];
  const facing = (x: number, z: number) => Math.atan2(RING.x - x, RING.z - z);
  const benches: Seat[] = places.filter(placeBuilt).map(pl => {
    // step out from the stand, the way the seat faces, to the floor in front of it (or from behind a chair by the ring)
    const step = (dir: number) => {
      const at = { x: pl.pos.x, z: pl.pos.z };
      for (let k = 0; k < 40 && inBox(at, boxes, CLEAR); k++) { at.x += Math.sin(pl.h) * 0.1 * dir; at.z += Math.cos(pl.h) * 0.1 * dir; }
      return at;
    };
    const ahead = step(1), from = inBox(ahead, boxes, CLEAR) || !inArena(ahead) ? step(-1) : ahead;
    return { x: pl.pos.x, z: pl.pos.z, y: pl.pos.y - CY, face: pl.h, from };
  });
  const free = (x: number, z: number) => !inBox({ x, z }, boxes, CLEAR + 0.05)
    && !(x > FLOOR.x0 - 0.3 && x < FLOOR.x1 + 0.3 && z > FLOOR.z0 - 0.3)
    && !pads.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 0.35);
  let floor: Seat[] = [];
  const want = n - benches.length;
  for (let gap = 0.9; want > 0 && gap >= 0.4; gap -= 0.05) {
    floor = [];
    for (let row = 0, z = ARENA.z0 + 0.5; z <= ARENA.z1 - 0.5; row++, z += gap * 0.87) {
      for (let x = ARENA.x0 + 0.5 + (row % 2 ? gap / 2 : 0); x <= ARENA.x1 - 0.5; x += gap) {
        if (free(x, z)) floor.push({ x, z, y: 0, face: facing(x, z), from: { x, z } });
      }
    }
    if (floor.length >= want) break;
  }
  floor.sort((a, b) => Math.hypot(a.x - RING.x, a.z - RING.z) - Math.hypot(b.x - RING.x, b.z - RING.z));
  const east = (a: Seat, b: Seat) => b.x - a.x;
  const chosen = floor.slice(0, Math.max(0, n - benches.length)).sort(east);
  out = [...benches.filter(b => b.x >= RING.x).sort(east), ...chosen, ...benches.filter(b => b.x < RING.x).sort(east)];
  if (!out.length) out.push({ x: RING.x, z: RING.z + 5, y: 0, face: Math.PI, from: { x: RING.x, z: RING.z + 5 } });
  seatCache.set(key, out);
  return out;
}

// ---------- who's out there ----------
/** A fan: where they are (and how high: up on a bench), where they're going (a seat, or a spot on the floor, or the way
 *  out) and the way there, their shirt, a delay before they set off, and what makes them themselves: their pace, their
 *  bounce, when they look about and cheer. */
interface Fan {
  x: number; z: number; y: number; h: number; way: XZ[]; seat: Seat | null; spot: XZ; routed: boolean; out: boolean;
  c: Color; t: number; key: number; speed: number; beat: number; ph: number; react: number;
  /** Their look, how far through a stride they are, and how far they're sat down (0 standing, 1 sitting). */
  look: number; step: number; sit: number;
}
/** The fans out now, by who they are: a local bout's (its number and the order they came in) or a boss's crowd's. */
const fans = new Map<number, Fan>();
const PALETTE = PARKAS.map(c => new Color(c));
/** How many figures a crowd of `n` is drawn with: one each, or one for every two past what the arena holds. */
export const figures = (n: number) => (n > MAX_FANS ? Math.ceil(n / 2) : n);
/** A fan's own numbers, fixed by who they are (no Math.random: that's the game's). */
const hash = (k: number, i: number) => { const v = Math.sin(k * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
/** The tunnel a fan comes in by and goes home by (cellarPlan.ts). */
const tunnelOf = (k: number) => TUNNELS[Math.floor(hash(k, 10) * TUNNELS.length)];
/** Who should be out, where, and in what colour: in the preparation, the ones who've eaten go and sit on the
 *  champion's side and the rest wait at the stall; once the fans sit down, a boss's sit on the other side, and a
 *  local's hungry ones go home. */
function sync() {
  const R = F.rush, B = F.bout, prep = B.phase === 'prep';
  const want = new Map<number, { c: Color; seat: Seat | null; spot: XZ }>();
  // (`at` is their place on the floor: a local's queue moves up as the ones ahead are served, a boss's crowd stays put)
  const place = (key: number, i: number, mine: boolean, n: number, theirsAt: number, c: Color, at = theirsAt) => {
    const seats = seatsFor(n), floor = spots(n);
    const seat = mine ? seats[Math.min(i, seats.length - 1)] : prep ? null : seats[Math.max(0, seats.length - 1 - theirsAt)];
    want.set(key, { c, seat, spot: seat ?? floor[Math.min(at, floor.length - 1)] });
  };
  if (R) {
    const n = figures(R.n), ours = Math.min(n, Math.round(R.turned * n / R.n));
    for (let i = 0; i < n; i++) place(-1 - (B.n * 10000 + i), i, i < ours, n, i - ours, i < ours ? OURS : BOSS_COLOR, i);
  } else {
    const n = Math.max(B.crowd, B.came);
    for (let i = 0; i < (prep ? B.came : B.fed); i++) {
      const mine = i < B.fed;
      place(B.n * 10000 + i, i, mine, n, i - B.fed, mine ? OURS : PALETTE[(i * 7) % PALETTE.length]);
    }
  }
  // the last bout's fans go home
  for (const [k, f] of fans) {
    if (want.has(k)) continue;
    if (!f.out) { f.out = true; go(f, null, tunnelOf(k).deep, hash(k, 1) * 1.2); }
    else if (f.routed && !f.way.length) fans.delete(k);
  }
  for (const [k, w] of want) {
    let f = fans.get(k);
    if (!f) {
      f = {
        ...from(k), y: 0, way: [], seat: null, spot: tunnelOf(k).deep, routed: true, out: false, c: w.c, t: 0, key: k,
        speed: 0.8 + hash(k, 3) * 0.45, beat: 6 + hash(k, 4) * 5, ph: hash(k, 5) * 6.28, react: hash(k, 6) * 0.6,
        look: Math.floor(hash(k, 9) * LOOKS), step: 0, sit: 0,
      };
      fans.set(k, f);
      go(f, w.seat, w.spot, R ? (Math.abs(k) % 60) * 0.03 + hash(k, 7) * 0.4 : hash(k, 7) * 0.3);
    }
    f.c = w.c;
    if (w.seat !== f.seat || w.spot !== f.spot) go(f, w.seat, w.spot, w.seat && !f.seat ? hash(k, 8) * 0.5 : 0);
  }
}
/** Where a fan turns up: deep in their tunnel, out of sight, a little to one side or the other, facing the way in. */
function from(k: number) {
  const t = tunnelOf(k), across = (hash(k, 2) - 0.5) * 0.8, back = hash(k, 11) * 1.2;
  return t.side === 'w'
    ? { x: t.deep.x - back, z: t.deep.z + across, h: Math.PI / 2 }
    : { x: t.deep.x + across, z: t.deep.z - back, h: 0 };
}
/** Sends a fan off to a seat (or a spot on the floor), after `delay` seconds; the way's worked out when they set off. */
function go(f: Fan, seat: Seat | null, spot: XZ, delay: number) {
  f.seat = seat; f.spot = spot; f.routed = false; f.way = [];
  f.t = Math.min(f.t, -delay);
}
/** How far a fan has still to go after the next corner. */
function wayLeft(f: Fan) {
  let n = 0;
  for (let i = 1; i < f.way.length; i++) n += Math.hypot(f.way[i].x - f.way[i - 1].x, f.way[i].z - f.way[i - 1].z);
  return n;
}
/** Works out a fan's way: down off their bench if they're up on one, round the furniture, and up onto their seat. */
function route(f: Fan) {
  const start = { x: f.x, z: f.z }, way: XZ[] = [];
  // (up on a bench, they first step down in front of it)
  if (f.y > 0.05) { const { boxes } = navMap(), d = { ...start }; for (let k = 0; k < 40 && inBox(d, boxes, CLEAR); k++) d.z += d.z < RING.z ? 0.1 : -0.1; way.push(d); start.x = d.x; start.z = d.z; }
  // (in their tunnel, they come out through its doorway first; going home, they go in through it)
  // (spreading out a little either side of it, so they don't all file through one spot)
  const t = tunnelOf(f.key), to = f.seat ? f.seat.from : f.spot, across = (hash(f.key, 12) - 0.5) * 0.9, inward = hash(f.key, 13) * 0.8;
  const mouth = t.side === 'w' ? { x: t.mouth.x + inward, z: t.mouth.z + across } : { x: t.mouth.x + across, z: t.mouth.z + inward };
  if (!inArena(start)) { way.push(mouth); start.x = mouth.x; start.z = mouth.z; }
  if (inArena(to)) way.push(...wayAround(start, to));
  else way.push(...wayAround(start, mouth), { ...to });
  if (f.seat && (f.seat.from.x !== f.seat.x || f.seat.from.z !== f.seat.z)) way.push({ x: f.seat.x, z: f.seat.z });
  f.way = way; f.routed = true;
}

// ---------- every frame ----------
const m4 = new Matrix4(), limb = new Matrix4(), out = new Matrix4(), q = new Quaternion(), pos = new Vector3(), scl = new Vector3(), up = new Vector3(0, 1, 0);
/** Ways worked out a frame at most, so a boss's whole crowd setting off at once doesn't stall one. */
const ROUTES_A_FRAME = 200;
/** Frame times while the swarm's big, to see whether it should drop its shadows. */
let slow = 0, shadows = true;
/** How far a seated fan's legs come up in front of them, as a diner's do (ads.ts), and how fast they sit and stand. */
const SIT_LEGS = -1.45, SIT_RATE = 5;
export function updSwarm(dt: number) {
  sync();
  const on = level.down;
  if (on && fans.size && !looks) makeLooks();
  const R = F.rush, B = F.bout, counts = Array<number>(LOOKS).fill(0);
  // (a boss's crowd floods in, and everyone hurries to their seats when the bout's about to start)
  const pace = B.phase === 'sit' ? 5 : R || B.phase !== 'prep' ? 4.2 : 2.6;
  // who's on their feet: everyone for the charge, then the side that's ahead the most (and the winners after)
  const charge = B.phase === 'fight' && B.t < 1.6, ahead = B.phase === 'fight' ? B.tug >= 0 : B.win;
  let routes = 0;
  for (const f of fans.values()) {
    f.t += dt;
    if (f.t > 0 && !f.routed && routes < ROUTES_A_FRAME) { route(f); routes++; }
    let moving = false;
    if (f.t > 0 && f.way.length) {
      const p = f.way[0], dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz);
      // (a boss's crowd is all at the stall by the time his bell starts: anyone running late hurries)
      let v = pace * f.speed * dt;
      if (R && R.walk > 0 && !f.seat) v = Math.max(v, (d + wayLeft(f)) / Math.max(dt, R.walk) * dt);
      // (the last step onto a bench climbs it)
      const last = f.way.length === 1, ty = last && f.seat ? f.seat.y : 0;
      if (d > 1e-6) f.h = Math.atan2(dx, dz);
      if (d <= v) { f.x = p.x; f.z = p.z; f.y = ty; f.way.shift(); } else {
        f.x += dx / d * v; f.z += dz / d * v; f.y += (ty - f.y) * Math.min(1, v / d);
      }
      moving = true;
      // (a stride the length a walker's is, whatever their pace)
      f.step += v * 11 / 1.5;
    } else f.step = 0;
    const sat = !moving && f.routed && !!f.seat && !f.out;
    const mine = f.c === OURS, onFeet = sat && (B.phase === 'fight' || B.phase === 'pay') && (
      (charge && B.t > f.react) || Math.sin(F.t * (0.7 + f.beat * 0.05) + f.ph * 5) > (mine === ahead ? -0.3 : 0.75));
    const cheer = onFeet && Math.sin(F.t * f.beat * 0.35 + f.ph) > -0.6;
    f.sit += Math.sign((sat && !onFeet ? 1 : 0) - f.sit) * Math.min(Math.abs((sat && !onFeet ? 1 : 0) - f.sit), dt * SIT_RATE);
    // how they hold themselves: walking's bob, the queue's shuffle and looking about, sitting still, jumping up
    let bounce = 0, turn: number;
    if (moving) { bounce = Math.abs(Math.sin(f.step)) * 0.04; turn = f.h; }
    else if (f.seat && sat) {
      bounce = onFeet ? Math.abs(Math.sin(F.t * f.beat + f.ph)) * 0.14 : 0;
      turn = f.seat.face + Math.sin(F.t * 0.5 + f.ph * 3) * 0.3 * Math.max(0, Math.sin(F.t * 0.21 + f.ph));
    } else {
      const look = Math.sin(F.t * 0.4 * f.speed + f.ph * 2);
      bounce = R ? Math.abs(Math.sin(F.t * f.beat * 0.8 + f.ph)) * 0.07 : Math.max(0, Math.sin(F.t * 1.3 + f.ph)) * 0.03;
      turn = Math.atan2(STALL.x - f.x, STALL.z - f.z) + (look > 0.6 ? (look - 0.6) * 2.2 : 0) * (f.ph > 3.14 ? 1 : -1);
    }
    if (!looks) continue;
    const arms = cheer || (!f.seat && R && Math.sin(F.t * 0.8 + f.ph * 4) > 0.3);
    // a look with room for them (a crowd's looks are uneven, so one can fill up)
    let k = f.look;
    for (let n = 0; n < LOOKS && counts[k] >= PER; n++) k = (k + 1) % LOOKS;
    if (counts[k] >= PER) continue;
    const L = looks[k], j = counts[k]++, h = L.height;
    // (sat down, the hips come down onto the seat)
    pos.set(f.x, CY + f.y + bounce - 0.3 * h * f.sit + 0.02 * f.sit, f.z);
    q.setFromAxisAngle(up, turn);
    m4.compose(pos, q, scl.setScalar(h));
    for (const p of L.parts.body) { p.im.setMatrixAt(j, m4); if (p.shirt) p.im.setColorAt(j, f.c); }
    const swing = Math.sin(f.step);
    for (let side = 0; side < 2; side++) {
      const s = side ? 1 : -1;
      // arms: swinging with the stride, up in the air cheering (waving), or on the knees sat down
      const a = arms ? -2.7 + Math.sin(F.t * f.beat * 0.9 + f.ph + side * 1.3) * 0.25 : moving ? -s * swing * 0.5 : -0.35 * f.sit;
      out.multiplyMatrices(m4, limb.makeRotationX(a).setPosition(L.armAt[side]));
      for (const p of L.parts.arm) { p.im.setMatrixAt(j * 2 + side, out); if (p.shirt) p.im.setColorAt(j * 2 + side, f.c); }
      const l = moving ? s * swing * 0.7 : SIT_LEGS * f.sit;
      out.multiplyMatrices(m4, limb.makeRotationX(l).setPosition(L.legAt[side]));
      for (const p of L.parts.leg) { p.im.setMatrixAt(j * 2 + side, out); if (p.shirt) p.im.setColorAt(j * 2 + side, f.c); }
    }
  }
  looks?.forEach((L, k) => {
    for (const [part, n] of [['body', 1], ['arm', 2], ['leg', 2]] as const) {
      for (const p of L.parts[part]) {
        p.im.count = on ? counts[k] * n : 0;
        p.im.instanceMatrix.needsUpdate = true;
        if (p.im.instanceColor) p.im.instanceColor.needsUpdate = true;
      }
    }
  });
  talk(dt);
  // the shadow fallback: a big swarm on a slow device stops casting shadows (and casts them again once it's gone)
  if (fans.size > 150 && on) {
    slow = dt > 1 / 45 ? slow + dt : Math.max(0, slow - dt * 0.5);
    if (slow > 2 && shadows) setShadows(false);
  } else if (!fans.size && !shadows) { slow = 0; setShadows(true); }
}
function setShadows(on: boolean) {
  shadows = on;
  allMeshes().forEach(im => { im.castShadow = on; });
}
// ---------- what they say ----------
// Now and then someone in the crowd shouts something, in a speech bubble over their head that goes where they go: the
// queue at an empty stall wants its chanko, the ones who've eaten are happy with it, a boss's crowd talks him up, both
// sides shout through the fight, and the hungry grumble on their way out.
const LINES: Record<string, string[]> = {
  hungry: ["Where's the chanko??", 'Oi! Soup!', "I'm starving here!", 'Hurry up, chef!', 'Chanko! Chanko!', 'Is this a soup stall or what?'],
  queue: ['Smells good...', "What's in the pot?", 'Two bowls, quick!', 'Move up!', 'Chanko time!'],
  fed: ["Now THAT's chanko!", 'Mm, the good stuff', `${CHAMP}! ${CHAMP}!`, 'Worth the wait'],
  turned: ['Free soup? I switch sides!', `Forget {boss}, I'm with ${CHAMP}`, 'This chanko slaps'],
  boss: ['{boss} will flatten him!', '{boss}! {boss}!', "Your guy's a pushover", 'Bet it all on {boss}'],
  sit: ['Here we go!', "My money's on the big guy", 'Sit down in front!'],
  ours: ['Push him out!', `${CHAMP.toUpperCase()}!`, 'Get him!', 'Throw him!'],
  theirs: ['{boss}!!', 'Come on, {boss}!', 'Crush him!'],
  won: ['Told ya!', 'What a bout!', `${CHAMP}! ${CHAMP}!`],
  lost: ['Rigged!', 'Ugh, my money...', 'Next time...'],
  leaving: ['No chanko, no show', "I'm off", 'Waste of a night'],
};
/** What a fan would say now, by where they are and whose side they're on. */
function lineFor(f: Fan): string {
  const R = F.rush, B = F.bout, mine = f.c === OURS;
  if (f.out) return B.phase === 'sit' ? 'leaving' : 'won';
  if (B.phase === 'prep') {
    if (f.seat) return R ? 'turned' : 'fed';
    if (R && R.walk > 0) return 'boss';
    return !F.stall.length ? 'hungry' : R && rnd() < 0.4 ? 'boss' : 'queue';
  }
  if (B.phase === 'sit') return 'sit';
  if (B.phase === 'fight') return mine ? 'ours' : 'theirs';
  return mine === B.win ? 'won' : 'lost';
}
/** The crowd's own dice (Math.random is the game's luck). */
let talkSeed = 11;
const rnd = () => (talkSeed = (talkSeed * 16807) % 2147483647) / 2147483647;
interface Speech { s: Sprite; c: HTMLCanvasElement; tex: CanvasTexture; fan: Fan | null; t: number; text: string }
/** A few bubbles, handed out in turn, each with its own canvas. */
const speech: Speech[] = Array.from({ length: 4 }, () => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const tex = new CanvasTexture(c);
  const s = new Sprite(new SpriteMaterial({ map: tex, depthTest: false }));
  s.renderOrder = 5; s.visible = false;
  scene.add(s);
  return { s, c, tex, fan: null, t: 0, text: '' };
});
/** Seconds a bubble stays up, and until the next one. */
const SAY_FOR = 2.4;
let nextSay = 1;
function draw(sp: Speech, text: string) {
  const c = sp.c.getContext('2d')!, w = sp.c.width, h = sp.c.height;
  c.clearRect(0, 0, w, h);
  c.font = `800 44px ${FONT}`;
  const bw = Math.min(w - 8, c.measureText(text).width + 52), x = (w - bw) / 2;
  c.fillStyle = '#fff';
  rr(c, x, 6, bw, 112, 40); c.fill();
  c.beginPath(); c.moveTo(w / 2 - 16, 116); c.lineTo(w / 2, 148); c.lineTo(w / 2 + 16, 116); c.fill();
  c.fillStyle = '#173042'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, w / 2, 64, w - 40);
  sp.tex.needsUpdate = true;
  sp.text = text;
}
function talk(dt: number) {
  const on = level.down && fans.size > 0;
  nextSay -= dt;
  if (on && nextSay <= 0) {
    // busier when the crowd's bigger, and in the fight
    nextSay = (F.bout.phase === 'fight' ? 0.5 : 1) * (0.6 + rnd() * 0.9) * (fans.size > 60 ? 0.7 : 1);
    const free = speech.find(sp => !sp.fan), all = [...fans.values()].filter(f => f.t > 0 && !speech.some(sp => sp.fan === f));
    if (free && all.length) {
      const f = all[Math.floor(rnd() * all.length)], boss = F.rush ? BOSSES[F.rush.boss].name : 'the local';
      // (never the same thing twice on screen at once)
      const lines = LINES[lineFor(f)].map(l => l.split('{boss}').join(boss)).filter(l => !speech.some(sp => sp.fan && sp.text === l));
      if (lines.length) { draw(free, lines[Math.floor(rnd() * lines.length)]); free.fan = f; free.t = 0; }
    }
  }
  for (const sp of speech) {
    const f = sp.fan;
    if (f && (!on || sp.t >= SAY_FOR || !fans.has(f.key))) sp.fan = null;
    sp.s.visible = !!sp.fan;
    if (!sp.fan || !f) continue;
    sp.t += dt;
    // (popping up, and over their head wherever they go)
    const k = Math.min(1, sp.t / 0.15);
    sp.s.scale.set(2.9 * k, 0.9 * k, 1);
    sp.s.position.set(f.x, CY + f.y + 2.2 - 0.3 * f.sit, f.z);
  }
}
/** What the crowd's saying now, for tests. */
export const said = () => speech.filter(sp => sp.fan).map(sp => sp.text);

/** How many fans are out (not going home), how many in your colour, how many sitting down (and how many of those up on
 *  a bench), and whether they cast shadows (for tests). */
export const swarm = () => {
  const all = [...fans.values()].filter(f => !f.out), sat = all.filter(f => f.seat && f.routed && !f.way.length);
  return { n: all.length, ours: all.filter(f => f.c === OURS).length, seated: sat.length, benched: sat.filter(f => f.y > 0.05).length, shadows };
};
/** Every fan's way, for tests: where they are and the corners they'll pass. */
export const ways = () => [...fans.values()].map(f => [{ x: f.x, z: f.z }, ...f.way]);
