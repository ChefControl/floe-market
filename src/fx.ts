// Little effects at the moments that matter, on High graphics only (graphics.ts): water splashing up and a ring
// spreading when a fish is hooked out of the sea, chips flying off the board as the cleaver comes down, coins popping
// up when cash lands in your pocket and a glint where a customer pays, gold sparkles when an upgrade is bought, smoke
// from chimneys and steam from the rice cookers. Each kind is one instanced mesh with a pool of bits, so a burst costs
// one draw call however many bits it throws; nothing is made while playing (making things would use the game's luck).
import {
  Color, CylinderGeometry, DoubleSide, type BufferGeometry, InstancedMesh, type Material, Matrix4, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, OctahedronGeometry, Quaternion, RingGeometry, Euler, Vector3,
} from 'three';
import { isHigh, onQuality } from './graphics';
import { jitter, K, quietly } from './kit';
import { scene } from './render';
import type { XZ } from './util';

/** One bit in flight: where it is and how it's moving, how long it has left, its size and spin. */
interface Bit {
  p: Vector3; v: Vector3; life: number; max: number; size: number; spin: Vector3; rot: Euler; grow: number;
}
interface Kind {
  /** Pulls bits down (negative lifts them, for smoke and steam). */
  gravity: number;
  /** How much of their speed bits keep each second. */
  drag: number;
  /** How a bit's size changes over its life (0 to 1): shrinks away, or puffs up then thins. */
  sizeAt: (k: number) => number;
}

const m4 = new Matrix4(), q = new Quaternion(), s3 = new Vector3(), tint = new Color();

class Pool {
  readonly mesh: InstancedMesh;
  private bits: Bit[] = [];
  private free: Bit[] = [];
  constructor(geo: BufferGeometry, material: Material, readonly cap: number, readonly kind: Kind) {
    this.mesh = new InstancedMesh(geo, material, cap);
    this.mesh.count = 0;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'fx';
    for (let i = 0; i < cap; i++) {
      this.free.push({ p: new Vector3(), v: new Vector3(), life: 0, max: 1, size: 1, spin: new Vector3(), rot: new Euler(), grow: 1 });
      this.mesh.setColorAt(i, tint.setHex(0xFFFFFF));
    }
    scene.add(this.mesh);
  }
  /** Throws a bit from `at` at velocity (vx, vy, vz), living `life` seconds, `size` big, coloured `c`. */
  emit(at: Vector3, vx: number, vy: number, vz: number, life: number, size: number, c: number, spin = 0) {
    const b = this.free.pop();
    if (!b) return;
    b.p.copy(at); b.v.set(vx, vy, vz); b.life = b.max = life; b.size = size;
    b.spin.set(jitter(-spin, spin), jitter(-spin, spin), jitter(-spin, spin)); b.rot.set(jitter(0, 6), jitter(0, 6), 0);
    this.mesh.setColorAt(this.bits.length, tint.setHex(c));
    this.bits.push(b);
    this.mesh.instanceColor!.needsUpdate = true;
  }
  update(dt: number) {
    const { gravity, drag, sizeAt } = this.kind, keep = Math.pow(drag, dt);
    let colours = false;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      if ((b.life -= dt) <= 0) {
        // the last bit takes this one's place, colour and all
        const last = this.bits.length - 1;
        if (i !== last) {
          this.bits[i] = this.bits[last];
          this.mesh.getColorAt(last, tint); this.mesh.setColorAt(i, tint); colours = true;
        }
        this.bits.pop(); this.free.push(b);
      }
    }
    for (let i = 0; i < this.bits.length; i++) {
      const b = this.bits[i];
      b.v.y -= gravity * dt;
      b.v.multiplyScalar(keep);
      b.p.addScaledVector(b.v, dt);
      b.rot.x += b.spin.x * dt; b.rot.y += b.spin.y * dt; b.rot.z += b.spin.z * dt;
      const k = 1 - b.life / b.max, s = b.size * sizeAt(k);
      this.mesh.setMatrixAt(i, m4.compose(b.p, q.setFromEuler(b.rot), s3.set(s, s, s)));
    }
    if (colours) this.mesh.instanceColor!.needsUpdate = true;
    // with nothing in the air it's left out of the drawing altogether, rather than drawn empty
    const was = this.mesh.count;
    this.mesh.count = this.bits.length;
    this.mesh.visible = this.bits.length > 0;
    if (this.bits.length || was) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { while (this.bits.length) this.free.push(this.bits.pop()!); this.mesh.count = 0; this.mesh.visible = false; }
}

const shrink = (k: number) => 1 - k * k;
const puff = (k: number) => Math.min(1, k * 4) * (1 - k * 0.35);
/** Smoke swells as it rises and thins away at the top, rather than shrinking. */
const billow = (k: number) => (0.45 + 1.3 * k) * Math.min(1, k * 6) * (k > 0.8 ? (1 - k) / 0.2 : 1);
/** A flat ring of foam that spreads and fades on the water. */
interface Ripple { m: Mesh; mat: MeshBasicMaterial; t: number; max: number; r: number }

const P = quietly(() => {
  const coinGeo = new CylinderGeometry(1, 1, 0.22, 10).rotateX(Math.PI / 2);
  const lit = new MeshLambertMaterial({ color: 0xFFFFFF });
  const smokeMat = new MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55, depthWrite: false });
  const steamMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35, depthWrite: false });
  const ringMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide });
  const ringGeo = new RingGeometry(0.8, 1, 24);
  return {
    drops: new Pool(K.dot, lit, 120, { gravity: 9, drag: 0.6, sizeAt: shrink }),
    chips: new Pool(K.dot, lit, 80, { gravity: 9, drag: 0.5, sizeAt: shrink }),
    coins: new Pool(coinGeo, lit, 60, { gravity: 7, drag: 0.7, sizeAt: k => k < 0.85 ? 1 : (1 - k) / 0.15 }),
    sparks: new Pool(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ color: 0xFFFFFF }), 120, { gravity: -0.6, drag: 0.25, sizeAt: k => Math.sin(Math.PI * Math.min(1, k * 1.2)) }),
    smoke: new Pool(K.ball, smokeMat, 90, { gravity: -0.25, drag: 0.7, sizeAt: billow }),
    steam: new Pool(K.ball, steamMat, 60, { gravity: -0.5, drag: 0.6, sizeAt: puff }),
    ripples: Array.from({ length: 8 }, (): Ripple => {
      const mat = ringMat.clone(), m = new Mesh(ringGeo, mat);
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
      return { m, mat, t: 0, max: 1, r: 1 };
    }),
  };
});
const pools = [P.drops, P.chips, P.coins, P.sparks, P.smoke, P.steam];
onQuality(() => { if (!isHigh()) { pools.forEach(p => p.clear()); P.ripples.forEach(r => { r.m.visible = false; }); } });

const at3 = new Vector3();
const on = () => isHigh();

/** A fish pulled out of the water at `at`: a crown of droplets, and a ring spreading where it was. */
export function splashFx(at: XZ, y = 0.08) {
  if (!on()) return;
  at3.set(at.x, y, at.z);
  for (let i = 0; i < 24; i++) {
    const a = jitter(0, Math.PI * 2), out = jitter(0.6, 1.7);
    P.drops.emit(at3, Math.cos(a) * out, jitter(2.4, 3.8), Math.sin(a) * out, jitter(0.5, 0.75), jitter(0.05, 0.09), i % 3 ? 0xFFFFFF : 0xBDEFF8);
  }
  ripple(at, y + 0.04, 1.1);
}
function ripple(at: XZ, y: number, r: number) {
  const free = P.ripples.find(x => !x.m.visible) ?? P.ripples[0];
  free.m.position.set(at.x, y, at.z); free.t = 0; free.max = 0.9; free.r = r; free.m.visible = true;
}

/** The cleaver coming down at `at` on the board: chips of fish and wood flying off. */
export function chipsFx(at: Vector3) {
  if (!on()) return;
  for (let i = 0; i < 9; i++) {
    const a = jitter(0, Math.PI * 2), out = jitter(0.4, 1.0);
    P.chips.emit(at, Math.cos(a) * out, jitter(1.2, 2.2), Math.sin(a) * out, jitter(0.35, 0.55), jitter(0.02, 0.035),
      i % 3 === 0 ? 0xE8CFA6 : i % 3 === 1 ? 0xFF8A80 : 0xFFFFFF, 12);
  }
}

/** Cash landing in your pocket at `at` (the top of your stack): a few gold coins hop up, spinning. */
let lastCoins = 0;
export function coinsFx(at: Vector3, n = 2) {
  // a stack of bills arrives a few dozen a second: a hop of coins for every few of them is plenty
  const now = performance.now();
  if (!on() || now - lastCoins < 90) return;
  lastCoins = now;
  for (let i = 0; i < n; i++) {
    const a = jitter(0, Math.PI * 2);
    P.coins.emit(at, Math.cos(a) * 0.5, jitter(2.2, 2.9), Math.sin(a) * 0.5, 0.55, 0.075, i % 2 ? 0xF2C14E : 0xFFD966, 10);
  }
  glint(at, 4, 0.35);
}

/** A little glint of gold where a customer pays. */
export function glint(at: Vector3, n = 5, spread = 0.3) {
  if (!on()) return;
  for (let i = 0; i < n; i++) {
    P.sparks.emit(at3.set(at.x + jitter(-spread, spread), at.y + jitter(0, spread), at.z + jitter(-spread, spread)),
      0, jitter(0.4, 0.9), 0, jitter(0.4, 0.7), jitter(0.04, 0.07), i % 2 ? 0xFFF3B0 : 0xFFFFFF, 3);
  }
}

/** An upgrade bought on the tile at `at`, `r` across: a ring of gold sparkles rising round it. */
export function unlockFx(at: XZ, r = 1, y = 0.2) {
  if (!on()) return;
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2 + jitter(-0.1, 0.1), rr = r * jitter(0.75, 1.05);
    P.sparks.emit(at3.set(at.x + Math.cos(a) * rr, y + jitter(0, 0.3), at.z + Math.sin(a) * rr),
      Math.cos(a) * 0.3, jitter(1.2, 2.4), Math.sin(a) * 0.3, jitter(0.7, 1.1), jitter(0.05, 0.09), i % 3 ? 0xF2C14E : 0xFFFFFF, 4);
  }
  ripple(at, y, r * 1.2);
}

/** Somewhere that smokes or steams all the time while it's there: `on` says whether it's there now. */
interface Source { at: Vector3; kind: 'smoke' | 'steam'; every: number; t: number; on: () => boolean }
const sources: Source[] = [];
/** A chimney at `at` that smokes while `on()`: a puff every so often, drifting up and away with the wind. */
export const chimney = (at: Vector3, on: () => boolean = () => true) => { sources.push({ at, kind: 'smoke', every: 0.22, t: 0, on }); };
/** Steam rising from a pot at `at` while `on()`. */
export const steamer = (at: Vector3, on: () => boolean = () => true) => { sources.push({ at, kind: 'steam', every: 0.3, t: 0, on }); };

const from = new Vector3();
let clock = 0;
/** Moves every effect on by `dt`. */
export function updFx(dt: number) {
  if (!on()) return;
  clock += dt;
  // the wind comes and goes, so a chimney's smoke sways rather than standing in a column
  const gust = Math.sin(clock * 0.5) * 0.12 + Math.sin(clock * 1.3 + 1) * 0.05;
  for (const s of sources) {
    if (!s.on() || (s.t -= dt) > 0) continue;
    if (s.kind === 'smoke') {
      s.t = s.every * jitter(0.5, 1.5);
      from.set(s.at.x + jitter(-0.07, 0.07), s.at.y, s.at.z + jitter(-0.07, 0.07));
      P.smoke.emit(from, 0.18 + gust + jitter(-0.09, 0.09), jitter(0.4, 0.65), jitter(-0.16, 0.12), jitter(2.6, 3.6), jitter(0.11, 0.18),
        jitter(0, 1) < 0.5 ? 0xE9EDF0 : 0xD7DDE2, 0.6);
      continue;
    }
    s.t = s.every * jitter(0.7, 1.3);
    P.steam.emit(s.at, jitter(-0.05, 0.05), jitter(0.35, 0.5), jitter(-0.05, 0.05), jitter(1.0, 1.5), jitter(0.06, 0.1), 0xFFFFFF);
  }
  pools.forEach(p => p.update(dt));
  for (const r of P.ripples) {
    if (!r.m.visible) continue;
    r.t += dt;
    const k = r.t / r.max;
    if (k >= 1) { r.m.visible = false; continue; }
    r.m.scale.setScalar(r.r * (0.3 + k * 0.9));
    r.mat.opacity = 0.8 * (1 - k);
  }
}

/** Every kind of effect, for the demo build's buttons. */
export const FX_KINDS = ['splash', 'chips', 'coins', 'unlock', 'glint'] as const;
