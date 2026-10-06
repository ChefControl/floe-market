// Fish swimming in the water, hooking them, and chopping them into steaks.
import { Group, Mesh, Vector3 } from 'three';
import { newSteak } from './items';
import { G, mesh, scene } from './render';
import { BLADE_Y, blade, chopTop, pile } from './stations';
import { d2xz, rand, UP } from './util';

export interface Fish {
  g: Group;
  tail: Group;
  h: number;
  sp: number;
  state: 'swim' | 'hooked' | 'gone';
  /** Respawn countdown while gone. */
  re: number;
}

function makeFish() {
  const g = new Group();
  const body = mesh(G.sphere, 0x355C9E); body.scale.set(0.62, 0.22, 0.2); g.add(body);
  const belly = mesh(G.sphere, 0xE3EAF0, 0, -0.06, 0); belly.scale.set(0.54, 0.15, 0.18); g.add(belly);
  const tail = new Group(); tail.position.x = -0.52;
  const fin = mesh(G.tail, 0x2B4C86, -0.15, 0, 0); fin.rotation.z = -Math.PI / 2; fin.scale.z = 0.3;
  tail.add(fin); g.add(tail);
  const dorsal = mesh(G.tail, 0xF2C14E, 0, 0.2, 0); dorsal.scale.set(0.5, 0.6, 0.25); g.add(dorsal);
  return { g, tail };
}

const FISH_BOX = { x0: -15, x1: 6, z0: -16, z1: -7.6 };
const fish: Fish[] = [];

function placeFish(f: Fish, far = false) {
  f.g.position.set(rand(FISH_BOX.x0, FISH_BOX.x1), 0.04, far ? rand(-16, -12) : rand(FISH_BOX.z0, FISH_BOX.z1));
  f.h = rand(0, Math.PI * 2); f.state = 'swim'; f.g.visible = true; f.g.scale.setScalar(1); f.g.rotation.set(0, 0, 0);
}

for (let i = 0; i < 16; i++) {
  const f: Fish = { ...makeFish(), h: 0, sp: rand(.7, 1.3), state: 'swim', re: 0 };
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
      p.y = 0.04 + Math.sin(time * 3 + f.sp * 7) * 0.03;
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
interface Hook {
  f: Fish;
  rope: Mesh | null;
  origin: () => Vector3;
  src: CatchSource;
  t: number;
  start: Vector3 | null;
}

/** Fish hooked but not yet chopped; each will become 3 steaks. */
let incomingFish = 0;
const hooks: Hook[] = [];

function projectedPile() { return pile.n + incomingFish * 3; }

/**
 * Hooks the nearest free fish in range and reels it to the chopping block.
 * `origin` is re-read every frame so the rope follows a moving fisher.
 */
export function tryCatch(origin: () => Vector3, src: CatchSource): Fish | null {
  if (projectedPile() + 3 > pile.cap) return null;
  const from = origin();
  let best: Fish | null = null, bd = 1e9;
  for (const f of fish) {
    if (f.state !== 'swim') continue;
    const d = d2xz(f.g.position, from);
    if (d < bd) { bd = d; best = f; }
  }
  if (!best || bd > 11 * 11) return null;
  best.state = 'hooked'; incomingFish++;
  const rope = src === 'net' ? null : mesh(G.rope, 0xF2C14E);
  if (rope) scene.add(rope);
  hooks.push({ f: best, rope, origin, src, t: 0, start: null });
  return best;
}

function setRope(r: Mesh, a: Vector3, b: Vector3) {
  const d = b.clone().sub(a);
  const L = Math.max(0.01, d.length());
  r.position.copy(a).addScaledVector(d, 0.5);
  r.scale.set(1, L, 1);
  r.quaternion.setFromUnitVectors(UP, d.normalize());
}

export function updHooks(dt: number) {
  for (let i = hooks.length - 1; i >= 0; i--) {
    const k = hooks[i]; k.t += dt;
    const from = k.origin();
    const fp = k.f.g.position;
    const reach = k.src === 'net' ? 0 : 0.22;
    if (k.t < reach) {
      if (k.rope) setRope(k.rope, from, from.clone().lerp(fp, k.t / reach));
      continue;
    }
    if (!k.start) k.start = fp.clone();
    const q = Math.min(1, (k.t - reach) / 0.6);
    fp.lerpVectors(k.start, chopTop, q); fp.y += 2.4 * 4 * q * (1 - q);
    k.f.g.rotation.z += dt * 12;
    if (k.rope) { if (q < 0.7) setRope(k.rope, from, fp); else k.rope.visible = false; }
    if (q >= 1) {
      if (k.rope) scene.remove(k.rope);
      k.f.g.rotation.set(0, Math.PI / 2, 0);
      chopper.queue.push(k.f); hooks.splice(i, 1);
    }
  }
}

// ---------- chopping ----------
const chopper = { queue: [] as Fish[], cur: null as Fish | null, t: 0 };

export function updChopper(dt: number) {
  if (!chopper.cur && chopper.queue.length) {
    chopper.cur = chopper.queue.shift()!; chopper.t = 0;
    chopper.cur.g.position.copy(chopTop);
  }
  const c = chopper.cur;
  if (c) {
    chopper.t += dt;
    blade.position.y = BLADE_Y - Math.abs(Math.sin(chopper.t * 26)) * 0.32;
    c.g.position.copy(chopTop); c.g.scale.setScalar(Math.max(0.3, 1 - chopper.t * 1.4));
    if (chopper.t >= 0.42) {
      for (let s = 0; s < 3; s++) {
        const m = newSteak(); m.position.copy(chopTop);
        pile.receive(m, 0.32 + s * 0.06, 1.1);
      }
      incomingFish--; c.state = 'gone'; c.re = rand(1, 3); c.g.visible = false; chopper.cur = null;
    }
  } else blade.position.y = BLADE_Y;
}
