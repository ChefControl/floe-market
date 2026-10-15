// The bosses (stage 3) are sea creatures, each taken from his name, built on the same jointed wrestler as the champion
// (rikishi.ts), so every one of them still stamps, slaps, grips and falls through the whole bout. A creature's parts
// hang on the wrestler's bones and move with them: a head on the neck, claws on the elbows, fins on the spine,
// tentacles and legs on the hips. The long soft ones (tentacles, whiskers, tails) are short chains of joints that sway.
// Each part is baked into one mesh per bone (kit.ts), like the wrestler's own.
import { BoxGeometry, CircleGeometry, ConeGeometry, Euler, ExtrudeGeometry, type Group, Matrix4, type Object3D, Quaternion, Shape, SphereGeometry, Vector3 } from 'three';
import { slimeFx } from './fx';
import { Build, K, quietly, shade } from './kit';
import type { Pose, RikishiModel } from './rikishi';

/** What each boss is. */
export type Kind = 'octopus' | 'crab' | 'catfish' | 'shark' | 'puffer';
/** How a wrestler looks: his skin and belt, and, for a boss, the creature he is, the pale of his belly, a crab's shell
 *  and a puffer's tan back. */
export interface Look { skin: number; belt: number; kind?: Kind; under?: number; shell?: number; back?: number }
/** Each creature's colours. */
export const LOOKS: Record<Kind, Look> = {
  octopus: { kind: 'octopus', skin: 0xC9739F, under: 0xE7B7CF, belt: 0x5B2A4A },
  crab: { kind: 'crab', skin: 0xE58A62, shell: 0xC2452B, under: 0xF2C9A0, belt: 0x5A2416 },
  catfish: { kind: 'catfish', skin: 0x6B6748, under: 0xCFC29C, belt: 0x3B342E },
  shark: { kind: 'shark', skin: 0x6F88A0, under: 0xEEF0F0, belt: 0x2B3440 },
  puffer: { kind: 'puffer', skin: 0x8E8358, back: 0x6E6542, under: 0xF2EEE2, belt: 0x2B2238 },
};
/** What each one shouts when his slap lands (on High, as the other words). */
export const SLAPS: Record<Kind, string[]> = {
  octopus: ['SPLAT!', 'SLAP!', 'THWAP!'], crab: ['SNIP!', 'CLACK!', 'SNAP!'], catfish: ['SPLOP!', 'SLAP!', 'GLORP!'],
  shark: ['CHOMP!', 'SLAP!', 'CHOMP!'], puffer: ['PAF!', 'POMF!', 'WHAP!'],
};

/** What building a creature hands back: whether he keeps the wrestler's hands, and what moves every frame. */
export interface Beast { hands: boolean; anim?: (t: number, dt: number, p: Pose) => void }
/** What a creature is built with: the wrestler, a new bone (gone when he changes), a mesh baked onto a bone, and a
 *  chain of joints. */
export interface Kit {
  r: RikishiModel;
  bone(p: Object3D, x: number, y: number, z: number, rot?: V3 | null, scale?: number): Group;
  part(at: Object3D, make: (b: Build) => void): void;
}
type V3 = [number, number, number];

const SPH = quietly(() => new SphereGeometry(1, 12, 9)), CONE = quietly(() => new ConeGeometry(1, 1, 8)), BOX = quietly(() => new BoxGeometry(1, 1, 1));
/** A flat fin, swept back like a shark's: its base along x (-0.5 to 0.5, the front at -0.5), its tip 1 up and back
 *  past the base's end, 1 thick (z, centred). */
const FIN = quietly(() => {
  const s = new Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.3, 0.6, 1.1, 1); s.quadraticCurveTo(0.72, 0.5, 1, 0); s.lineTo(0, 0);
  return new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 }).translate(-0.5, 0, -0.5);
});
/** A shark's tail fin, its root at the origin and running back along x: the top lobe long, the bottom short. */
const TAIL = quietly(() => {
  const s = new Shape();
  s.moveTo(0, 0.1); s.quadraticCurveTo(0.3, 0.42, 0.78, 1); s.quadraticCurveTo(0.42, 0.48, 0.38, 0.04);
  s.quadraticCurveTo(0.5, -0.2, 0.62, -0.48); s.quadraticCurveTo(0.24, -0.26, 0, -0.1); s.lineTo(0, 0.1);
  return new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.5);
});
/** The turn that lays a fin's x (its base) along `x` and its y (its height) along `y`. */
function lay(x: Vector3, y: Vector3): V3 {
  ee.setFromRotationMatrix(new Matrix4().makeBasis(x.normalize(), y.normalize(), x.clone().cross(y).normalize()));
  return [ee.x, ee.y, ee.z];
}
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** The same number for the same `i`, between 0 and 1 (never the luck). */
const hash = (i: number) => { const x = Math.sin(i * 12.9898 + 0.7) * 43758.5453; return x - Math.floor(x); };
/** `c` darkened (`k` under 1) or paled toward white (`k` over 1). */
const tint = (c: number, k: number) => k < 1 ? shade(c, k) : mixWhite(c, k - 1);
function mixWhite(c: number, k: number) {
  const ch = (s: number) => Math.round(((c >> s) & 255) + (255 - ((c >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A soft chain hanging down from `p`: `n` joints `len` long, thinning from `r0` to `r1`; `flat` makes it a fin (thin
 *  side to side), `suck` puts a pale sucker on the front of each. */
function chain(k: Kit, p: Object3D, n: number, len: number, r0: number, r1: number, c: number, o: { flat?: boolean; suck?: number } = {}) {
  const js: Group[] = [];
  let at = p;
  for (let i = 0; i < n; i++) {
    const j = k.bone(at, 0, i ? -len : 0, 0), rad = lerp(r0, r1, i / Math.max(1, n - 1));
    k.part(j, b => {
      b.add(SPH, c, 0, -len / 2, 0, null, [o.flat ? 0.022 : rad, len * 0.64, rad]);
      if (o.suck) b.add(SPH, o.suck, 0, -len / 2, rad * 0.82, null, [rad * 0.55, rad * 0.55, 0.015]);
    });
    js.push(j); at = j;
  }
  return js;
}
/** Broad shoulders: his arms set `w` further out, a yoke of muscle across the top of his back from one to the other,
 *  and rounder shoulders, in `c`. */
function broad(k: Kit, w: number, c: number) {
  const r = k.r, x = 0.32 + 0.12 * r.f + w;
  r.arms.forEach(A => { A.sh.position.x = A.s * x; k.part(A.sh, b => b.add(SPH, c, 0, -0.05, 0, null, [0.165, 0.17, 0.16])); });
  k.part(r.spine, b => b.add(SPH, c, 0, 0.6, -0.05, null, [x + 0.05, 0.17, 0.27 * r.f]));
}
/** A round shape: its middle, its radii, and how it's turned. */
interface Round { at: V3; r: V3; rot?: V3 }
const qq = new Quaternion(), ee = new Euler(), Z = new Vector3(0, 0, 1), UP = new Vector3(0, 1, 0);

/** Balls for the puffer: a big one for his body, and a small one for the little parts of his face. */
const BALL = quietly(() => new SphereGeometry(1, 16, 12)), SMALL = quietly(() => new SphereGeometry(1, 8, 6));
/** A flat round spot (facing z). */
const DISC = quietly(() => new CircleGeometry(1, 6));
/** A spine: its root at the origin, its point 1 up along y. */
const SPIKE = quietly(() => new ConeGeometry(1, 1, 6, 1, true).translate(0, 0.5, 0));
/** A fan fin: its root at the origin, opening up along y to a scalloped edge 1 up, 1 wide (x), 1 thick (z, centred). */
const FAN = quietly(() => {
  const s = new Shape();
  s.moveTo(-0.07, 0); s.quadraticCurveTo(-0.5, 0.5, -0.46, 0.86);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x0 = -0.46 + (0.92 * i) / n, x1 = -0.46 + (0.92 * (i + 1)) / n, y = (x: number) => 0.86 + 0.12 * Math.cos(x * 2.2);
    s.quadraticCurveTo((x0 + x1) / 2, y((x0 + x1) / 2) + 0.07, x1, y(x1) - 0.02);
  }
  s.quadraticCurveTo(0.5, 0.5, 0.07, 0); s.lineTo(-0.07, 0);
  return new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.5);
});

/** The turn that lays a shape's y along `y`, its x as near `x` as it can be. */
function orient(y: Vector3, x: Vector3): V3 {
  const yy = y.clone().normalize(), zz = x.clone().cross(yy).normalize(), xx = yy.clone().cross(zz).normalize();
  ee.setFromRotationMatrix(new Matrix4().makeBasis(xx, yy, zz));
  return [ee.x, ee.y, ee.z];
}
/** The turn that points a shape's y along `d`. */
function point(d: Vector3): V3 { ee.setFromQuaternion(qq.setFromUnitVectors(UP, d.clone().normalize())); return [ee.x, ee.y, ee.z]; }
/** Evenly spread directions over a ball (a Fibonacci spiral). */
function spread(n: number) {
  const out: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    out.push(new Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return out;
}
/** Small round spots painted on the round `o` where `keep` says (by the direction out to them), each about `size` across. */
function spots(b: Build, o: Round, n: number, size: number, c: number, seed: number, keep: (d: Vector3) => boolean) {
  const s = new Build(), mean = (o.r[0] + o.r[1] + o.r[2]) / 3;
  for (let i = 0, made = 0; made < n && i < n * 10; i++) {
    const d = new Vector3(hash(seed + i) * 2 - 1, hash(seed + i + 0.31) * 2 - 1, hash(seed + i + 0.63) * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 0.05) continue;
    d.normalize();
    if (!keep(d)) continue;
    made++;
    const sz = (size * (0.7 + hash(seed + i + 0.9) * 0.6)) / mean;
    ee.setFromQuaternion(qq.setFromUnitVectors(Z, d));
    s.add(DISC, c, d.x, d.y, d.z, [ee.x, ee.y, ee.z], [sz, sz, 1]);
  }
  b.addAll(s, new Matrix4().compose(new Vector3(...o.at), qq.identity(), new Vector3(...o.r)));
}
/** A puffer's big round eye bulging out along `d`: its socket, the dark ball, a gold ring round the pupil, a glint, and a heavy
 *  lid over the top of it slanted down to the middle, in a glare. */
function glare(b: Build, s: number, c: Vector3, d: Vector3, er: number, skin: number, brow: number, iris: number) {
  const n = d.clone().normalize(), at = (k: number) => c.clone().addScaledVector(n, k), o = point(n);
  let p = at(-er * 0.5); b.add(SPH, skin, p.x, p.y, p.z, null, [er * 1.12, er * 1.12, er * 1.12]);
  b.add(SPH, 0x1A1612, c.x, c.y, c.z, null, [er, er, er]);
  p = at(er * 0.5); b.add(SPH, iris, p.x, p.y, p.z, o, [er * 0.8, er * 0.56, er * 0.8]);
  p = at(er * 0.72); b.add(SPH, 0x070605, p.x, p.y - er * 0.02, p.z, o, [er * 0.36, er * 0.38, er * 0.36]);
  p = at(er * 0.9); b.add(K.dot, 0xFFFFFF, p.x - s * er * 0.22, p.y + er * 0.3, p.z, o, [er * 0.14, er * 0.12, er * 0.14]);
  const yaw = Math.atan2(n.x, n.z);
  const lid = c.clone().addScaledVector(n, -er * 0.06); lid.y += er * 0.42; lid.x -= s * er * 0.1;
  b.add(SPH, skin, lid.x, lid.y, lid.z, [0, yaw, s * 0.34], [er * 1.04, er * 0.74, er * 1.04]);
  const bw = c.clone().addScaledVector(n, er * 0.3); bw.y += er * 0.72; bw.x -= s * er * 0.3;
  b.add(SMALL, brow, bw.x, bw.y, bw.z, [0.3, yaw, s * 0.5], [er * 0.85, er * 0.22, er * 0.55]);
}
/** `n` small spots scattered over the round `o` where `keep` says (by the direction out to them), each about `size`
 *  across. */
function dots(b: Build, o: Round, n: number, size: number, c: number, seed: number, keep: (d: Vector3) => boolean, out = 1) {
  const s = new Build(), mean = (o.r[0] + o.r[1] + o.r[2]) / 3;
  for (let i = 0, made = 0; made < n && i < n * 6; i++) {
    const d = new Vector3(hash(seed + i) * 2 - 1, hash(seed + i + 0.31) * 2 - 1, hash(seed + i + 0.63) * 2 - 1).normalize();
    if (!keep(d)) continue;
    made++;
    const sz = (size * (0.6 + hash(seed + i + 0.9) * 0.7)) / mean;
    ee.setFromQuaternion(qq.setFromUnitVectors(Z, d));
    s.add(K.dot, c, d.x * out, d.y * out, d.z * out, [ee.x, ee.y, ee.z], [sz, sz, sz * 0.3]);
  }
  b.addAll(s, new Matrix4().compose(new Vector3(...o.at), qq.setFromEuler(ee.set(...(o.rot ?? [0, 0, 0]))), new Vector3(...o.r)));
}
/** Mean, sleepy eyes: a white ball, a pupil (a bar, for the octopus), and a lid of his skin over the top half. */
function eye(b: Build, x: number, y: number, z: number, rad: number, skin: number, bar = false) {
  b.add(SPH, 0xF6EEDA, x, y, z, null, [rad, rad, rad]);
  if (bar) b.add(BOX, 0x15110F, x * 1.04, y, z + rad * 0.92, null, [rad * 1.1, rad * 0.32, 0.01]);
  else b.add(SPH, 0x15110F, x * 1.04, y - rad * 0.05, z + rad * 0.72, null, [rad * 0.52, rad * 0.52, rad * 0.4]);
  b.add(SPH, skin, x, y + rad * 0.42, z + rad * 0.05, null, [rad * 1.12, rad * 0.62, rad * 1.08]);
}

export const BEASTS: Record<Kind, (k: Kit, L: Look) => Beast> = {
  // Hakkaku 八角, "eight corners": the octopus. A mantle swelling up behind his head, big barred eyes under heavy
  // lids, arms that end in curling tentacles with suckers, and four more tentacles hanging from under his belt: eight
  // limbs, swaying while he waits and thrashing in the fight. (He squirts ink: dohyo.ts.)
  octopus(k, L) {
    const r = k.r, sk = L.skin, dk = tint(sk, 0.72), pale = tint(sk, 1.55), f = r.f;
    k.part(r.neck, b => {
      b.add(SPH, sk, 0, 0.12, 0.02, null, [0.23, 0.21, 0.22]);
      const mantle: Round = { at: [0, 0.37, -0.15], r: [0.25, 0.34, 0.27], rot: [-0.55, 0, 0] };
      b.add(SPH, sk, ...mantle.at, mantle.rot, mantle.r);
      dots(b, mantle, 12, 0.05, dk, 3, d => d.y > -0.4);
      for (const s of [-1, 1]) eye(b, s * 0.125, 0.16, 0.13, 0.072, sk, true);
      b.add(K.post, sk, 0.2, 0.06, 0.05, [0, 0, -1.15], [0.035, 0.11, 0.035]);
    });
    const arms = r.arms.map(A => chain(k, k.bone(A.el, 0, -0.2, 0.01), 4, 0.1, 0.07, 0.028, sk, { suck: pale }));
    const skirt = [-150, -100, 100, 150].map((deg, i) => {
      const a = (deg * Math.PI) / 180, base = k.bone(r.hips, Math.sin(a) * 0.3 * f, -0.1, Math.cos(a) * 0.28 * f, [0, a, 0]);
      return { js: chain(k, base, 5, 0.12, 0.08, 0.026, sk, { suck: pale }), ph: i * 1.7 };
    });
    return {
      hands: false,
      anim(t) {
        const low = clamp01((0.57 - r.hips.position.y) * 2.4), wild = 1 + r.agitate * 1.5;
        skirt.forEach(T => T.js.forEach((j, n) => { j.rotation.set(-((n ? 0.25 : 0.3) + low * 0.22 + 0.13 * wild * Math.sin(t * 2.6 * wild + n * 0.9 + T.ph)), 0, 0.08 * Math.sin(t * 1.7 + n + T.ph)); }));
        arms.forEach((js, i) => js.forEach((j, n) => { j.rotation.set(-(0.32 + 0.14 * Math.sin(t * 3.1 + n * 0.8 + i * 2)), 0, (i ? 1 : -1) * 0.12 * Math.sin(t * 2.2 + n)); }));
      },
    };
  },

  // Yokobashiri 横走り, "running sideways": the crab. A red shell over his back and shoulders with spikes round its
  // rim, eyes on stalks, mouthparts that never stop, one claw and one huge one (a fiddler crab's) that open as he winds
  // up and snap shut on the slap, armoured shins and forearms, and two thin legs a side out from his belt. (He walks in
  // sideways: dohyo.ts.)
  crab(k, L) {
    const r = k.r, SH = L.shell!, TIP = 0xF4E2C8, f = r.f;
    k.part(r.spine, b => {
      const shell: Round = { at: [0, 0.52, -0.13 * f], r: [0.5 * f + 0.14, 0.34, 0.3 * f] };
      b.add(SPH, SH, ...shell.at, null, shell.r);
      dots(b, shell, 8, 0.05, tint(SH, 0.8), 11, d => d.z < 0.2);
      for (let i = -3; i <= 3; i++) b.add(CONE, tint(SH, 1.15), i * (0.13 * f + 0.045), 0.84 - Math.abs(i) * 0.045 - (Math.abs(i) > 2 ? 0.06 : 0), -0.1 * f, [0, 0, -i * 0.32], [0.035, 0.11, 0.035]);
    });
    k.part(r.neck, b => {
      b.add(SPH, SH, 0, 0.09, 0.06, null, [0.22, 0.13, 0.19]);
      for (const s of [-1, 1]) {
        b.add(K.post, SH, s * 0.075, 0.24, 0.12, [0, 0, -s * 0.28], [0.02, 0.16, 0.02]);
        b.add(SPH, 0x15110F, s * 0.098, 0.33, 0.12, null, [0.048, 0.048, 0.048]);
        b.add(SPH, 0xFFFFFF, s * 0.105, 0.345, 0.16, null, [0.012, 0.012, 0.01]);
      }
    });
    const mouth = [-1, 1].map(s => { const m = k.bone(r.neck, s * 0.035, 0.03, 0.235); k.part(m, b => b.add(BOX, TIP, 0, 0, 0, null, [0.05, 0.06, 0.03])); return m; });
    // armour on the shoulders, forearms, shins and feet
    broad(k, 0.14, SH);
    r.arms.forEach(A => { k.part(A.sh, b => b.add(SPH, SH, 0, -0.01, 0, null, [0.2, 0.15, 0.19])); k.part(A.el, b => b.add(SPH, SH, 0, -0.11, 0, null, [0.105, 0.15, 0.105])); });
    r.legs.forEach(G => { k.part(G.knee, b => b.add(SPH, SH, 0, -0.11, 0, null, [0.15, 0.165, 0.16])); k.part(G.foot, b => b.add(SPH, SH, 0, -0.035, 0.05, null, [0.106, 0.05, 0.156])); });
    // the claws: a palm, a fixed finger, and a jaw that snaps; the right one huge
    const jaws = r.arms.map((A, i) => {
      const g = k.bone(A.el, 0, -0.22, 0.01, null, i ? 2.2 : 1.15);
      k.part(g, b => {
        b.add(SPH, SH, 0, -0.05, 0, null, [0.085, 0.09, 0.075]);
        b.add(SPH, SH, 0, -0.16, 0.03, null, [0.04, 0.11, 0.042]); b.add(SPH, TIP, 0, -0.255, 0.035, null, [0.026, 0.04, 0.026]);
        for (let n = 0; n < 3; n++) b.add(K.dot, TIP, 0, -0.12 - n * 0.04, 0, null, [0.012, 0.012, 0.012]);
      });
      const jaw = k.bone(g, 0, -0.08, -0.025);
      k.part(jaw, b => { b.add(SPH, SH, 0, -0.075, 0, null, [0.034, 0.09, 0.036]); b.add(SPH, TIP, 0, -0.155, 0, null, [0.022, 0.034, 0.022]); });
      return jaw;
    });
    // two thin legs a side, out from the belt
    const legs: { root: Group; kn: Group; s: number; ph: number }[] = [];
    for (const s of [-1, 1]) for (const [z, len, ph] of [[0.06, 1, 0], [-0.16, 0.92, 1.3]]) {
      const root = k.bone(r.hips, s * 0.35 * f, 0.03, z * f);
      k.part(root, b => b.add(SPH, SH, 0, -0.14, 0, null, [0.034, 0.16, 0.034]));
      const kn = k.bone(root, 0, -0.28, 0);
      k.part(kn, b => { b.add(SPH, SH, 0, -0.22 * len, 0, null, [0.027, 0.24 * len, 0.027]); b.add(SPH, TIP, 0, -0.44 * len, 0, null, [0.016, 0.03, 0.016]); });
      legs.push({ root, kn, s, ph: ph + (s > 0 ? 0.6 : 0) });
    }
    return {
      hands: false,
      anim(t, _, p) {
        const low = clamp01((0.57 - r.hips.position.y) * 2.4);
        legs.forEach(G => { G.root.rotation.z = G.s * (1.95 - low * 0.35 + 0.08 * Math.sin(t * 7 + G.ph)); G.kn.rotation.z = -G.s * (1.55 - low * 0.4 + 0.1 * Math.sin(t * 7 + G.ph + 1)); });
        jaws.forEach((j, i) => { const e = i ? p.a1e : p.a0e, snap = Math.sin(t * 3.3 + i * 2) > 0.92 ? 0 : 1; j.rotation.x = (0.08 + 0.55 * clamp01(e / 1.4)) * snap + 0.05; });
        mouth.forEach((m, i) => { m.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.25; });
      },
    };
  },

  // Dobu どぶ, "the gutter": a namazu, the mud catfish of Japanese legend whose thrashing shakes the earth. A wide flat
  // head with a mouth from ear to ear and tiny yellow eyes, long whiskers that sway, a mottled slimy hide that drips, a
  // low fin down his back and a tail behind his belt. (His stamps shake the ring: dohyo.ts.)
  catfish(k, L) {
    const r = k.r, sk = L.skin, dk = tint(sk, 0.68), f = r.f;
    broad(k, 0.13, sk);
    k.part(r.neck, b => {
      const head: Round = { at: [0, 0.1, 0.06], r: [0.3, 0.16, 0.27] };
      b.add(SPH, sk, ...head.at, null, head.r);
      dots(b, head, 8, 0.06, dk, 21, d => d.y > 0);
      b.add(SPH, L.under!, 0, 0.01, 0.12, null, [0.27, 0.08, 0.22]);
      b.add(SPH, tint(L.under!, 1.1), 0, 0.05, 0.2, null, [0.262, 0.036, 0.125]);
      b.add(SPH, 0x2A1E1A, 0, 0.05, 0.205, null, [0.25, 0.02, 0.125]);
      for (const s of [-1, 1]) { b.add(SPH, 0xD8C24A, s * 0.215, 0.16, 0.19, null, [0.042, 0.042, 0.03]); b.add(SPH, 0x0E0B09, s * 0.225, 0.162, 0.205, null, [0.024, 0.026, 0.02]); }
    });
    k.part(r.chestAt, b => dots(b, { at: [0, 0, 0], r: [0.44 * f, 0.3, 0.36 * f] }, 12, 0.08, dk, 31, d => d.z < 0.3));
    // whiskers: two long ones from the corners of his mouth, two short under his chin
    const whisk = [-1, 1].flatMap(s => [
      { js: chain(k, k.bone(r.neck, s * 0.24, 0.055, 0.21, [0, s * 0.3, s * 0.95]), 6, 0.095, 0.026, 0.01, dk), s, ph: s, long: true },
      { js: chain(k, k.bone(r.neck, s * 0.07, -0.04, 0.22, [0, 0, s * 0.3]), 3, 0.06, 0.013, 0.006, dk), s, ph: s + 2, long: false },
    ]);
    // the fin down his back, and his tail
    k.part(r.spine, b => b.add(SPH, dk, 0, 0.7, -0.27 * f, [0.5, 0, 0], [0.022, 0.2, 0.2]));
    const tail = chain(k, k.bone(r.hips, 0, -0.05, -0.34 * f, [0.55, 0, 0]), 3, 0.17, 0.12, 0.17, dk, { flat: true });
    let drip = 0;
    const at = new Vector3();
    return {
      hands: true,
      anim(t, dt) {
        whisk.forEach(W => W.js.forEach((j, n) => { j.rotation.set((W.long ? 0.12 : 0.05) * Math.sin(t * 2 + n * 0.7 + W.ph) - (W.long ? 0.12 : 0), 0, W.s * (W.long ? 0.06 + 0.06 * Math.sin(t * 1.6 + n + W.ph) : 0.04)); }));
        tail.forEach((j, n) => { j.rotation.set(0.18, 0, 0.22 * Math.sin(t * 2.4 - n * 0.8) * (1 + r.agitate)); });
        // slime: a drip off him now and then
        drip -= dt;
        if (drip < 0 && r.visible) { drip = 0.35 + hash(t) * 0.6; slimeFx((hash(t * 3) > 0.5 ? r.arms[hash(t * 7) > 0.5 ? 0 : 1].hand : r.bellyAt).getWorldPosition(at)); }
      },
    };
  },

  // Samehada 鮫肌, "shark skin": the shark. A shark's head with a snout, a wide grin full of teeth, gill slits and an
  // old scar across one eye, blue-grey over a white belly; a tall fin on his back that reads from the far camera, fins
  // on his forearms, and a tail behind his belt that swishes.
  shark(k, L) {
    const r = k.r, sk = L.skin, dk = tint(sk, 0.7), f = r.f;
    broad(k, 0.15, sk);
    // his head twice a man's, as a shark's is to its body: sat low on his shoulders, no neck
    const head = k.bone(r.neck, 0, -0.12, 0.02, null, 2);
    k.part(head, b => {
      // a torpedo of a skull tapering to a pointed snout, white underneath, the mouth slung under the snout
      b.add(SPH, sk, 0, 0.13, 0.04, [0.08, 0, 0], [0.19, 0.16, 0.25]);
      b.add(SPH, sk, 0, 0.14, 0.23, [0.18, 0, 0], [0.1, 0.085, 0.2]);
      b.add(SPH, L.under!, 0, 0.06, 0.11, [0.06, 0, 0], [0.165, 0.07, 0.23]);
      // the grin: a wide open mouth under the snout, rows of teeth top and bottom
      b.add(SPH, 0x3A1418, 0, 0.08, 0.22, [0.1, 0, 0], [0.135, 0.045, 0.11]);
      for (let i = 0; i < 9; i++) {
        const x = -0.11 + i * 0.0275, z = 0.22 + 0.105 * Math.sqrt(Math.max(0, 1 - (x / 0.135) ** 2));
        b.add(CONE, 0xFBF8F0, x, 0.105, z - 0.006, [Math.PI, 0, 0], [0.013, 0.04, 0.013]);
        if (i < 8) b.add(CONE, 0xFBF8F0, x + 0.014, 0.055, z - 0.012, null, [0.012, 0.034, 0.012]);
      }
      for (const s of [-1, 1]) {
        // small black eyes on the sides, a hard ridge over each
        b.add(SPH, 0x0E0B09, s * 0.15, 0.165, 0.16, null, [0.026, 0.028, 0.026]);
        b.add(SPH, sk, s * 0.145, 0.188, 0.165, [0, 0, s * 0.35], [0.045, 0.018, 0.04]);
        // gill slits behind
        for (let n = 0; n < 3; n++) b.add(BOX, dk, s * 0.185, 0.1, -0.06 + n * 0.04, [0, 0, s * 0.12], [0.01, 0.09, 0.012]);
      }
      // an old scar across his left eye
      b.add(BOX, 0xE9D4CC, 0.155, 0.17, 0.165, [0.6, 0, 0.2], [0.01, 0.11, 0.013]);
    });
    // grey all over his back, white only down his front (the chest and belly are pale under it)
    k.part(r.chestAt, b => b.add(SPH, sk, 0, 0.03, -0.08, null, [0.45 * f, 0.29, 0.33 * f]));
    k.part(r.bellyAt, b => b.add(SPH, sk, 0, 0, -0.1, null, [0.43 * f, 0.3, 0.33 * f]));
    // the fin on his back, standing up off the top of it and swept back
    k.part(r.spine, b => b.add(FIN, sk, 0, 0.74, -0.07 - 0.21 * f, lay(new Vector3(0, -0.42, -0.91), new Vector3(0, 0.91, -0.42)), [0.42, 0.5, 0.045]));
    // a fin trailing back off each forearm
    r.arms.forEach(A => k.part(A.el, b => b.add(FIN, sk, A.s * 0.02, -0.12, -0.07, lay(new Vector3(0, -1, 0), new Vector3(A.s * 0.15, 0, -1)), [0.18, 0.13, 0.03])));
    // and his tail behind the belt: a thick root, the long top lobe and the short bottom one
    const tail = k.bone(r.hips, 0, -0.03, -0.34 * f, [-0.25, 0, 0]);
    k.part(tail, b => {
      b.add(SPH, sk, 0, 0, -0.08, null, [0.06, 0.08, 0.15]);
      b.add(TAIL, sk, 0, 0, -0.17, lay(new Vector3(0, 0, -1), new Vector3(0, 1, 0)), [0.42, 0.42, 0.035]);
    });
    return {
      hands: true,
      anim(t) { tail.rotation.y = 0.3 * Math.sin(t * 2.2) * (1 + r.agitate); },
    };
  },

  // Fukure 膨れ, "swollen": Mr. Fugu's own champion, a porcupine puffer (harisenbon) on the wrestler's body. At rest he's
  // a fat round fish no bigger than a 200 kg wrestler: olive-tan over the back with small dark spots and his spines laid
  // flat, pale down the front, a broad blunt head with no neck, big gold eyes under scowling lids, thick pale lips drawn
  // back off the beak, fan fins fluttering behind his eyes and a tail behind his belt. Angry, he blows up into a ball
  // half as big again, every spine standing out.
  puffer(k, L) {
    const r = k.r, f = r.f, sk = L.skin, bk = L.back ?? shade(sk, 0.85), pale = L.under!, SPOT = 0x2A2116;
    const FINC = 0xD9CC9C, QUILL = 0xF3EEE0, IRIS = 0xE8C640, LIP = 0xEADCC6;

    // ---- his trunk: a fish's body from the belt up, tan over the back and sides, pale down the front ----
    // At rest it's a wrestler's chest and belly and no bigger; blown up it's a ball. Its shape is the bone's scale: the
    // shell is a unit ball.
    const REST = { at: new Vector3(0, 0.38, 0.03), r: new Vector3(0.465 * f, 0.52, 0.425 * f) };
    const PUFF = { at: new Vector3(0, 0.6, 0.06), r: new Vector3(0.6 * f, 0.74, 0.56 * f) };
    const orb = k.bone(r.spine, 0, 0, 0);
    k.part(orb, b => {
      b.add(BALL, pale, 0, -0.1, 0.16, null, [0.92, 0.9, 0.86]);
      b.add(BALL, sk, 0, 0.03, -0.08, null, [1, 0.97, 0.93]);
      b.add(BALL, bk, 0, 0.13, -0.16, null, [0.95, 0.9, 0.86]);
      const tan = (d: Vector3) => d.z < 0.25 || d.y > 0.55;
      spots(b, { at: [0, 0.06, -0.08], r: [1, 0.95, 0.93] }, 46, 0.055, SPOT, 7, tan);
      // the spines laid flat, pointing down his back as a fish's point to its tail
      for (const d of spread(150)) {
        if (!tan(d) || d.y < -0.6 || (Math.abs(d.x) > 0.75 && Math.abs(d.y) < 0.5 && d.z > -0.3)) continue;
        const p = new Vector3(d.x, 0.06 + d.y * 0.95, -0.08 + d.z * 0.93).multiplyScalar(0.99);
        const down = new Vector3(0, -1, 0).addScaledVector(d, d.y).normalize().addScaledVector(d, 0.28);
        b.add(SPIKE, QUILL, p.x, p.y, p.z, point(down), [0.028, 0.15, 0.028]);
      }
    });
    // and his spines standing out, hidden inside him until he swells
    const PR = PUFF.r, quills = k.bone(r.spine, 0, 0, 0);
    k.part(quills, b => {
      for (const d of spread(150)) {
        if (d.y < -0.5) continue; // the belt
        if (d.z > 0.5 && d.y > -0.25 && Math.abs(d.x) < 0.6) continue; // his face
        if (Math.abs(d.x) > 0.8 && Math.abs(d.y) < 0.35) continue; // his arms
        const len = 0.24 + 0.07 * hash(d.x * 31 + d.y * 7);
        const p = new Vector3(d.x * PR.x, d.y * PR.y, d.z * PR.z).multiplyScalar(0.9);
        const nrm = new Vector3(d.x / PR.x, d.y / PR.y, d.z / PR.z).normalize();
        b.add(SPIKE, QUILL, p.x, p.y, p.z, point(nrm), [0.032, len, 0.032]);
      }
    });

    // ---- his head: broad and blunt, the top of his body with no neck between; big gold eyes bulging out of its sides
    // under heavy lids, thick lips drawn back off the beak, and a fan fin behind each eye. Blown up, it swells with the
    // ball and rides on its front, so the face stays on him ----
    const head = k.bone(r.neck, 0, -0.06, 0.08);
    const HD: Round = { at: [0, 0.1, 0], r: [0.6, 0.4, 0.52] };
    k.part(head, b => {
      b.add(BALL, sk, ...HD.at, null, HD.r);
      b.add(BALL, bk, 0, 0.15, -0.07, null, [0.57, 0.36, 0.47]);
      b.add(BALL, pale, 0, -0.06, 0.1, null, [0.55, 0.3, 0.45]);
      spots(b, HD, 22, 0.04, SPOT, 3, d => d.y > 0.25 && d.z < 0.6);
      for (const d of spread(60)) {
        if (d.y < 0.2 || d.z > 0.4) continue;
        const p = new Vector3(d.x * 0.6, 0.1 + d.y * 0.4, d.z * 0.52).multiplyScalar(0.99);
        const back = new Vector3(0, 0.15, -1).addScaledVector(d, 0.35);
        b.add(SPIKE, QUILL, p.x, p.y, p.z, point(back), [0.026, 0.13, 0.026]);
      }
      // the blunt snout, and its thick pale lips in a scowl round the beak, the teeth bared between them
      b.add(SPH, pale, 0, -0.03, 0.42, null, [0.25, 0.15, 0.16]);
      b.add(SMALL, 0x2A1414, 0, -0.02, 0.565, null, [0.12, 0.05, 0.03]);
      for (const s of [-1, 1]) {
        // the lips, thick and drawn back off the teeth, down at the corners
        b.add(SMALL, LIP, s * 0.07, 0.035, 0.555, [0, s * 0.4, -s * 0.32], [0.09, 0.032, 0.045]);
        b.add(SMALL, LIP, s * 0.065, -0.075, 0.55, [0, s * 0.4, -s * 0.1], [0.085, 0.034, 0.045]);
        b.add(SMALL, LIP, s * 0.135, -0.035, 0.515, null, [0.03, 0.045, 0.035]);
        // and the beak bared between them: two teeth over two, fused, a notch between
        b.add(BOX, 0xFFFDF5, s * 0.027, 0.0, 0.585, [0, 0, -s * 0.14], [0.05, 0.034, 0.016]);
        b.add(BOX, 0xFFFDF5, s * 0.025, -0.045, 0.582, [0, 0, s * 0.1], [0.046, 0.03, 0.016]);
      }
      for (const s of [-1, 1]) glare(b, s, new Vector3(s * 0.36, 0.19, 0.31), new Vector3(s * 0.55, 0.3, 0.78), 0.165, sk, shade(bk, 0.7), IRIS);
    });
    const pecs = r.arms.map(A => {
      const at = k.bone(head, A.s * 0.57, 0.04, -0.08, orient(new Vector3(A.s * 0.85, 0.15, -0.5), new Vector3(0, 1, 0)));
      const fl = k.bone(at, 0, 0, 0);
      k.part(fl, b => { b.add(FAN, FINC, 0, 0, 0, null, [0.34, 0.34, 0.018]); for (const x of [-0.06, 0, 0.06]) b.add(K.post, shade(FINC, 0.85), x, 0.12, 0, [0, 0, -x * 4], [0.006, 0.2, 0.012]); });
      return { at, fl, s: A.s };
    });
    // thick arms, spotted, set out on the sides of his body
    const SHX = 0.32 + 0.12 * f + 0.06;
    r.arms.forEach((A, i) => {
      k.part(A.sh, b => {
        const up: Round = { at: [0, -0.11, 0], r: [0.15, 0.2, 0.15] };
        b.add(SPH, sk, ...up.at, null, up.r);
        spots(b, up, 5, 0.035, SPOT, 40 + i, d => d.x * A.s > -0.3 && d.z < 0.5);
      });
      k.part(A.el, b => b.add(SPH, sk, 0, -0.1, 0, null, [0.115, 0.15, 0.115]));
    });

    // ---- a small fin low on his back, and his tail behind the belt ----
    const dors = k.bone(r.spine, 0, 0, 0), DD = new Vector3(0, -0.3, -1).normalize();
    k.part(dors, b => b.add(FAN, FINC, 0, 0, 0, orient(new Vector3(0, 0.3, -1), new Vector3(0, 1, 0)), [0.2, 0.16, 0.02]));
    const tail = k.bone(r.hips, 0, -0.02, -0.33 * f, [-0.15, 0, 0]);
    k.part(tail, b => {
      b.add(SPH, sk, 0, 0, -0.05, null, [0.08, 0.1, 0.12]);
      b.add(FAN, FINC, 0, 0, -0.1, orient(new Vector3(0, 0.1, -1), new Vector3(0, 1, 0)), [0.36, 0.3, 0.025]);
    });

    const cur = new Vector3(), at = new Vector3();
    return {
      hands: true,
      anim(t, dt) {
        r.puff += (r.puffTo - r.puff) * Math.min(1, dt * (r.puffTo > r.puff ? 7 : 2.5));
        const p = r.puff, br = Math.sin(t * 1.7);
        // the trunk: breathing at rest, a ball blown up
        cur.lerpVectors(REST.r, PUFF.r, p).multiplyScalar(1 + 0.012 * br);
        at.lerpVectors(REST.at, PUFF.at, p);
        orb.position.copy(at); orb.scale.copy(cur);
        // (and bristling a little while he fights)
        const g = 0.74 + 0.26 * p + 0.09 * r.agitate * (1 - p);
        quills.position.copy(at); quills.scale.set((cur.x / PR.x) * g, (cur.y / PR.y) * g, (cur.z / PR.z) * g);
        quills.visible = p > 0.02 || r.agitate > 0.05;
        r.chestAt.scale.set(1 + 0.28 * p, 1 + 0.6 * p, 1 + 0.2 * p);
        r.bellyAt.scale.x *= 0.92 + 0.3 * p; r.bellyAt.scale.z *= 0.9 + 0.3 * p;
        // the head pushed out onto the front of the ball, its fins and his arms out to its sides
        r.neck.position.set(0, 0.74 - 0.12 * p + 0.008 * br, 0.03 + 0.07 * p);
        head.scale.setScalar(1 + 0.4 * p);
        r.neck.rotation.x += 0.12 * (1 - p); // chin down, glaring up from under his lids
        r.arms.forEach(A => { A.sh.position.x = A.s * (SHX + 0.26 * p); });
        dors.position.set(at.x + cur.x * DD.x, at.y + cur.y * DD.y, at.z + cur.z * DD.z);
        // the fins never stop
        pecs.forEach((P, i) => { P.fl.rotation.x = 0.35 * Math.sin(t * 11 + i * 1.3) + 0.1; });
        tail.rotation.y = 0.28 * Math.sin(t * 2.3) * (1 + r.agitate);
      },
    };
  },
};
