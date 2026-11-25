// Fish swimming in the water, hooking them, and chopping them into slices.
import { type BufferGeometry, type Group, type Material, type Mesh, Plane, Vector3 } from 'three';
import { boost } from './economy';
import { bodyMat, newFish } from './fishModel';
import { newFillet } from './items';
import { chipsFx, dripFx, pourFx, splashFx } from './fx';
import { apart, dice } from './kit';
import { PIER } from './layout';
import { G, mat, mesh, scene } from './render';
import { lay, ropeGeometry } from './rope';
import { cast, chop, flop, splash } from './sfx';
import { BLADE_HOME, BLADE_Y, blade, CHOP, chopTop, pile } from './stations';
import { d2xz, FY, rand, V, type XZ } from './util';

export interface Fish {
  g: Group;
  body: Mesh;
  tail: Group;
  h: number;
  sp: number;
  state: 'swim' | 'hooked' | 'gone';
  /** Respawn countdown while gone. */
  re: number;
  /** How far it's dipped down to pass under the pier, 0 to 1. */
  dive: number;
}

const FISH_BOX = { x0: -15, x1: 6, z0: -16, z1: -7.6 };
/** How high they swim, their backs and fins out of the water, bobbing by SWIM_BOB; and how deep they dip to pass under
 *  the pier (layout.ts PIER), their dorsal fins clear under the boards, starting DIP_NEAR before. */
const SWIM_Y = 0.04, SWIM_BOB = 0.03, DIP_Y = -0.16, DIP_NEAR = 1.0;
/** Whether `p` is under (or near) the pier. */
function underDeck(p: Vector3) {
  const near = (x0: number, x1: number, z0: number, z1: number) =>
    p.x > x0 - DIP_NEAR && p.x < x1 + DIP_NEAR && p.z > z0 - DIP_NEAR && p.z < z1 + DIP_NEAR;
  const { x0, x1, edge, arm } = PIER;
  return near(x0, x1, arm.z0, edge) || near(arm.x0, x1, arm.z0, arm.z1);
}
const fish: Fish[] = [];

function placeFish(f: Fish, far = false) {
  f.g.position.set(rand(FISH_BOX.x0, FISH_BOX.x1), SWIM_Y, far ? rand(-16, -12) : rand(FISH_BOX.z0, FISH_BOX.z1));
  f.dive = underDeck(f.g.position) ? 1 : 0;
  f.h = rand(0, Math.PI * 2); f.state = 'swim'; f.g.visible = true; f.g.scale.setScalar(1); f.g.rotation.set(0, 0, 0);
  // whole again, after being chopped
  f.body.material = bodyMat;
  f.g.children.forEach(c => { c.visible = true; });
}

for (let i = 0; i < 16; i++) {
  const f: Fish = { ...newFish(), h: 0, sp: rand(.7, 1.3), state: 'swim', re: 0, dive: 0 };
  scene.add(f.g); placeFish(f); fish.push(f);
}

export function updFish(dt: number, time: number) {
  for (const f of fish) {
    if (f.state === 'swim') {
      f.h += Math.sin(time * 0.7 + f.sp * 10) * dt * 0.9;
      const p = f.g.position, b = FISH_BOX;
      if (p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1) {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
        const want = Math.atan2(cz - p.z, cx - p.x);
        f.h += Math.sin(want - f.h) * dt * 3;
      }
      p.x += Math.cos(f.h) * f.sp * dt; p.z += Math.sin(f.h) * f.sp * dt;
      f.dive += ((underDeck(p) ? 1 : 0) - f.dive) * Math.min(1, dt * 5);
      p.y = SWIM_Y + (DIP_Y - SWIM_Y) * f.dive + Math.sin(time * 3 + f.sp * 7) * SWIM_BOB;
      f.g.rotation.y = -f.h;
      f.tail.rotation.y = Math.sin(time * 12 + f.sp * 5) * 0.45;
    } else if (f.state === 'gone') {
      f.re -= dt;
      if (f.re <= 0) placeFish(f, true);
    }
  }
}

// ---------- catching ----------
export type CatchSource = 'player' | 'turret' | 'net';
/**
 * What draws a catch's line. The player's is a plain line off the rod (below); the auto harpoon brings its own, with
 * the harpoon on its end (machines.ts). One catch at a time draws with it: a new catch on the same line takes it over.
 */
export interface Line {
  /** The rope's shape (a `ropeGeometry`, rope.ts), and what it's drawn in. */
  geo: BufferGeometry;
  material: Material;
  /**
   * Lays the rope `t` seconds into the catch, from where the fisher holds it (`from`): on its way out to the fish
   * (`q` null) until it reaches it at REACH, then with the fish `q` of the way through the air to the block (0 to 1).
   * Says whether the rope still shows.
   */
  draw(t: number, from: Vector3, fish: Vector3, q: number | null): boolean;
  /** The catch has landed (or another has taken the line). */
  done(): void;
}
/** Seconds a line takes to reach its fish, and the fish then takes through the air to the block. */
export const REACH = 0.22, FLIGHT = 0.6;
interface Hook {
  f: Fish;
  rope: Mesh | null;
  line: Line | null;
  origin: () => Vector3;
  src: CatchSource;
  t: number;
  start: Vector3 | null;
  /** Which way it was heading when it was pulled out, which comes round to the block's as it flies. */
  yaw: number;
  /** Seconds until it next drips. */
  drip: number;
}

/** Fish hooked but not yet chopped; each will become 3 slices. */
let incomingFish = 0;
const hooks: Hook[] = [];
/** Fish that have just landed on the block, and how long ago: they flatten against it and spring back. */
const landed: { f: Fish; t: number }[] = [];

/** Fillets still on their way: fish being reeled in or chopped. */
export function filletsInProgress() { return incomingFish * 3; }

/** Whether the fish pile has room for another catch's slices (counting what's still being reeled in and chopped). */
export const pileHasRoom = () => pile.n + filletsInProgress() + 3 <= pile.cap;

/** The nearest fish swimming free within a line's reach of `from`, if there is one. */
export function nearestFish(from: XZ): Fish | null {
  let best: Fish | null = null, bd = 1e9;
  for (const f of fish) {
    if (f.state !== 'swim') continue;
    const d = d2xz(f.g.position, from);
    if (d < bd) { bd = d; best = f; }
  }
  return best && bd <= 11 * 11 ? best : null;
}

/** The lowest a line hangs: on the water, or on the dock's boards this side of its edge. */
export const lineFloor = (x: number, z: number) => z > PIER.edge && Math.abs(x) < 7.6 ? FY + 0.04 : 0.02;

// The player's line: plain and gold, whipping out to the fish with a wave along it, taut as it takes the fish's weight,
// then slack as the fish comes over, and gone before it lands.
const GOLD = 0xF2C14E;
const tip = new Vector3();
function rodLine(n: number): Line & { busy: boolean } {
  const geo = apart(() => ropeGeometry(0.025), dice(0x20D + n));
  return {
    geo, material: mat(GOLD), busy: false,
    draw(t, from, fp, q) {
      if (q === null) {
        const s = t / REACH;
        tip.lerpVectors(from, fp, s);
        lay(geo, from, tip, { sag: -0.35 * s * (1 - s), wave: 0.12 * (1 - s), waves: 1.5, phase: t * 46, floor: lineFloor });
        return true;
      }
      if (q >= 0.7) return false;
      const slack = Math.max(0, (q - 0.3) / 0.4), since = q * FLIGHT;
      lay(geo, from, fp, { sag: 0.5 * slack * slack, wave: 0.05 * Math.exp(-since / 0.07) * Math.cos(since * 70), phase: -Math.PI / 2, floor: lineFloor });
      return true;
    },
    done() { this.busy = false; },
  };
}
const rods: ReturnType<typeof rodLine>[] = [];
function freeRod() {
  let r = rods.find(x => !x.busy);
  if (!r) rods.push(r = rodLine(rods.length));
  r.busy = true;
  return r;
}

/**
 * Hooks the nearest free fish in range and reels it to the chopping block.
 * `origin` is re-read every frame so the rope follows a moving fisher. `line` draws it (the player's, if none's given).
 */
export function tryCatch(origin: () => Vector3, src: CatchSource, line?: Line): Fish | null {
  if (!pileHasRoom()) return null;
  const from = origin();
  const best = nearestFish(from);
  if (!best) return null;
  best.state = 'hooked'; incomingFish++;
  // (a rope's made for each catch, as one always was: three.js names what it makes from the game's luck, so a catch
  // still takes just as much of it, and the same game plays out the same)
  const rope = src === 'net' ? null : mesh(G.rope, GOLD);
  const drawn = rope ? line ?? freeRod() : null;
  if (rope && drawn) {
    // a line that's still out on an earlier catch lets go of it
    for (const h of hooks) if (h.line === drawn) { if (h.rope) scene.remove(h.rope); h.rope = h.line = null; }
    rope.geometry = drawn.geo; rope.material = drawn.material;
    rope.frustumCulled = false; rope.visible = false;
    scene.add(rope);
  }
  hooks.push({ f: best, rope, line: drawn, origin, src, t: 0, start: null, yaw: 0, drip: 0 });
  cast(from, src);
  return best;
}

/** The angle `a` as one between -π and π. */
const wrap = (a: number) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

export function updHooks(dt: number) {
  for (let i = hooks.length - 1; i >= 0; i--) {
    const k = hooks[i]; k.t += dt;
    const from = k.origin();
    const fp = k.f.g.position;
    const reach = k.src === 'net' ? 0 : REACH;
    if (k.t < reach) {
      if (k.rope && k.line) k.rope.visible = k.line.draw(k.t, from, fp, null);
      continue;
    }
    if (!k.start) { k.start = fp.clone(); k.yaw = wrap(k.f.g.rotation.y); splash(fp); splashFx(fp); }
    const q = Math.min(1, (k.t - reach) / FLIGHT);
    fp.lerpVectors(k.start, chopTop, q); fp.y += 2.4 * 4 * q * (1 - q);
    // Through the air it turns once, head over tail: slowly off the water, fast over the top and slowly onto the block,
    // where it comes down lying flat, its nose the way the block wants it. Its tail flaps, and it drips on the way up.
    const turn = q * q * (3 - 2 * q);
    k.f.g.rotation.set(0, k.yaw * (1 - turn), turn * Math.PI * 2);
    k.f.tail.rotation.y = Math.sin(k.t * 38) * 0.6 * (1 - q * 0.6);
    k.drip -= dt;
    if (q < 0.55 && k.drip <= 0) { k.drip = 0.045; pourFx(fp, 0xBDEFF8, 1, 0.03); }
    if (k.rope && k.line) k.rope.visible = k.line.draw(k.t, from, fp, q);
    if (q >= 1) {
      if (k.rope) scene.remove(k.rope);
      k.line?.done();
      k.f.g.rotation.set(0, 0, 0); // lands across the block, waiting its turn
      k.f.tail.rotation.y = 0;
      flop(chopTop);
      dripFx(chopTop);
      landed.push({ f: k.f, t: 0 });
      chopper.queue.push(k.f); hooks.splice(i, 1);
    }
  }
  // a fish that's just landed flattens against the block, springs back a little too far, and settles
  for (let i = landed.length - 1; i >= 0; i--) {
    const l = landed[i]; l.t += dt;
    const u = Math.min(1, l.t / 0.26), squash = 1 - 0.3 * (1 - u) ** 2 * Math.cos(u * Math.PI * 2.5);
    l.f.g.scale.set(1, squash, 1 + (1 - squash) * 0.6);
    if (u >= 1) { l.f.g.scale.setScalar(1); landed.splice(i, 1); }
  }
}

// ---------- chopping ----------
// The fish lies across the block, nose towards +x, and the cleaver comes down three times from the tail towards the
// head. Each cut takes a slice off (the fish's body is clipped at the cut, and its fins and tail behind it go) and
// sends it to the pile; what's left of the head goes in the bin.
const chopper = { queue: [] as Fish[], cur: null as Fish | null, t: 0, cuts: 0 };
/** Where the three cuts fall, from the middle of the fish. */
const CUTS = [-0.32, 0.02, 0.36];
/** The fish on the block gets its own body material, clipped by this plane: everything behind the last cut is gone. */
const cut = new Plane(new Vector3(1, 0, 0), Infinity);
const choppedMat = bodyMat.clone();
choppedMat.clippingPlanes = [cut];

export function updChopper(dt: number) {
  if (!chopper.cur && chopper.queue.length) {
    const f = chopper.cur = chopper.queue.shift()!;
    chopper.t = 0; chopper.cuts = 0;
    f.g.position.copy(chopTop); f.g.rotation.set(0, 0, 0);
    cut.constant = Infinity;
    f.body.material = choppedMat;
  }
  const c = chopper.cur;
  if (!c) { blade.position.set(BLADE_HOME.x, BLADE_Y, BLADE_HOME.z); return; }
  chopper.t += dt;
  const each = 0.42 / boost('training') / CUTS.length, i = Math.min(CUTS.length - 1, Math.floor(chopper.t / each));
  const x = chopTop.x + CUTS[i], k = Math.min(1, (chopper.t - i * each) / each);
  // the cleaver moves over the next cut and comes down through it
  blade.position.set(x, BLADE_Y - Math.sin(k * Math.PI) * 0.36, CHOP.z);
  c.g.position.copy(chopTop);
  if (chopper.cuts <= i && k >= 0.5) {
    chopper.cuts++;
    chop(CHOP, i);
    chipsFx(V(x, chopTop.y + 0.05, CHOP.z));
    cut.constant = -x;
    c.g.children.forEach(m => { if (m !== c.body) m.visible = m.position.x > CUTS[i]; });
    const m = newFillet(); m.position.set(x - 0.15, chopTop.y, CHOP.z);
    pile.receive(m, 0.32, 1.1);
  }
  if (chopper.cuts === CUTS.length && chopper.t >= each * CUTS.length) {
    incomingFish--; c.state = 'gone'; c.re = rand(1, 3); c.g.visible = false; chopper.cur = null;
  }
}
