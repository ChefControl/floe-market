// The bosses (stage 3) are sea creatures, each taken from his name, built on the same jointed wrestler as the champion
// (rikishi.ts), so every one of them still stamps, slaps, grips and falls through the whole bout. A creature's parts
// hang on the wrestler's bones and move with them: a head on the neck, claws on the elbows, fins on the spine,
// tentacles and legs on the hips. The long soft ones (tentacles, whiskers, tails) are short chains of joints that sway.
// Each part is baked into one mesh per bone (kit.ts), like the wrestler's own.
import { BoxGeometry, ConeGeometry, Euler, ExtrudeGeometry, type Group, Matrix4, type Object3D, Quaternion, Shape, SphereGeometry, Vector3 } from 'three';
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
  puffer: { kind: 'puffer', skin: 0xD9C8A2, back: 0xD3BE92, under: 0xF1EDE2, belt: 0xC9A23A },
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
/** A round shape: its middle, its radii, and how it's turned. */
interface Round { at: V3; r: V3; rot?: V3 }
const qq = new Quaternion(), ee = new Euler(), Z = new Vector3(0, 0, 1), UP = new Vector3(0, 1, 0);
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
      const shell: Round = { at: [0, 0.52, -0.13 * f], r: [0.5 * f, 0.34, 0.3 * f] };
      b.add(SPH, SH, ...shell.at, null, shell.r);
      dots(b, shell, 8, 0.05, tint(SH, 0.8), 11, d => d.z < 0.2);
      for (let i = -3; i <= 3; i++) b.add(CONE, tint(SH, 1.15), i * 0.13 * f, 0.84 - Math.abs(i) * 0.045 - (Math.abs(i) > 2 ? 0.06 : 0), -0.1 * f, [0, 0, -i * 0.32], [0.035, 0.11, 0.035]);
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
    r.arms.forEach(A => { k.part(A.sh, b => b.add(SPH, SH, 0, -0.03, 0, null, [0.16, 0.13, 0.15])); k.part(A.el, b => b.add(SPH, SH, 0, -0.11, 0, null, [0.105, 0.15, 0.105])); });
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
    k.part(r.neck, b => {
      b.add(SPH, sk, 0, 0.14, 0.03, null, [0.21, 0.22, 0.24]);
      b.add(SPH, sk, 0, 0.19, 0.22, [0.16, 0, 0], [0.14, 0.115, 0.27]);
      b.add(SPH, L.under!, 0, 0.05, 0.11, null, [0.18, 0.085, 0.2]);
      b.add(SPH, 0x3A1418, 0, 0.088, 0.2, null, [0.165, 0.038, 0.11]);
      for (let i = 0; i < 9; i++) {
        const x = -0.12 + i * 0.03, z = 0.2 + 0.105 * Math.sqrt(Math.max(0, 1 - (x / 0.165) ** 2));
        b.add(CONE, 0xFBF8F0, x, 0.105, z - 0.01, [Math.PI, 0, 0], [0.012, 0.036, 0.012]);
        if (i < 8) b.add(CONE, 0xFBF8F0, x + 0.015, 0.07, z - 0.015, null, [0.011, 0.03, 0.011]);
      }
      for (const s of [-1, 1]) {
        b.add(SPH, 0x0E0B09, s * 0.165, 0.205, 0.16, null, [0.032, 0.034, 0.03]);
        b.add(SPH, sk, s * 0.165, 0.235, 0.165, null, [0.045, 0.022, 0.04]);
        for (let n = 0; n < 3; n++) b.add(BOX, dk, s * 0.2, 0.06, -0.03 + n * 0.045, [0, 0, s * 0.12], [0.012, 0.1, 0.014]);
      }
      b.add(BOX, 0xE9D4CC, 0.178, 0.205, 0.16, [0.6, 0, 0.2], [0.012, 0.14, 0.016]);
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

  // Fukure 膨れ, "swollen": Mr. Fugu's own champion, a porcupine puffer (harisenbon). A puffer is a ball with a face, so
  // he is one: everything above his belt one round body, tan over the top peppered with small dark spots and pale
  // underneath, his face on the front of it. Big round eyes high on the ball, a small pouting beak with its tooth plates
  // bared (one capped in gold), little fins fluttering on his sides and a tail fin behind. Meaner than the fish: the lids
  // pulled down slanting in, a brow ridge, an old scar across one eye. At rest his spines lie back; angry (puffTo, from
  // dohyo.ts) he blows up a third bigger and they stand out long; beaten, he goes down like a balloon.
  puffer(k, L) {
    const r = k.r, pale = L.under!, tan = L.back!, DOT = 0x3A2A1C, FINC = 0xE6D9A6, f = r.f;
    // the ball, on the chest's bone so it swells with him, and the tan over its top and back
    const ball: Round = { at: [0, 0.06, 0.02], r: [0.43 * f, 0.6, 0.39 * f] };
    const cap: Round = { at: [0, 0.14, -0.15], r: [0.437 * f, 0.56, 0.39 * f] };
    const belly: Round = { at: [0, 0, 0], r: [0.42 * f, 0.31, 0.38 * f] };
    // where his face is, on the front of the ball
    const ez = (x: number, y: number) => ball.at[2] + ball.r[2] * Math.sqrt(Math.max(0, 1 - (x / ball.r[0]) ** 2 - ((y - ball.at[1]) / ball.r[1]) ** 2));
    const face = (d: Vector3) => d.z > 0.55 && d.y > -0.45 && d.y < 0.8;
    k.part(r.chestAt, b => {
      b.add(SPH, pale, ...ball.at, null, ball.r);
      b.add(SPH, tan, ...cap.at, null, cap.r);
      dots(b, cap, 240, 0.02, DOT, 61, d => d.y > -0.45 && !(d.z > 0.6 && d.y < 0.6));
      const my = 0.1, mz = ez(0, my);
      for (const s of [-1, 1]) {
        // big round eyes, bulging: a tan rim, a gold ring, a wide black pupil looking forward, a glint
        const x = s * 0.27, y = 0.33, z = ez(x, y) - 0.05, d = new Vector3(s * 0.4, 0.05, 1).normalize();
        b.add(SPH, tint(tan, 0.85), x, y, z, null, [0.135, 0.135, 0.12]);
        b.add(SPH, 0xB08A2E, x + d.x * 0.03, y + d.y * 0.03, z + d.z * 0.03, null, [0.12, 0.12, 0.11]);
        b.add(SPH, 0x0C0C0E, x + d.x * 0.075, y + d.y * 0.075, z + d.z * 0.075, null, [0.078, 0.082, 0.07]);
        b.add(SPH, 0xFFFFFF, x + d.x * 0.13 - s * 0.02, y + 0.04, z + d.z * 0.13, null, [0.016, 0.016, 0.01]);
        // the lid pulled down over the top of it, slanting in, and the brow ridge over that
        b.add(SPH, tan, x + d.x * 0.02, y + 0.075, z + d.z * 0.02, [0, 0, s * 0.42], [0.142, 0.07, 0.13]);
        b.add(SPH, tint(tan, 0.62), x - s * 0.02, y + 0.13, z + 0.02, [0, 0, s * 0.5], [0.14, 0.03, 0.09]);
        // the corners of his mouth, turned down
        b.add(SPH, tint(pale, 0.78), s * 0.135, my - 0.05, mz - 0.02, [0, 0, s * 0.6], [0.06, 0.018, 0.035]);
      }
      // a small pouting beak: thick pale lips, a dark gap, the tooth plates (one capped in gold)
      b.add(SPH, 0xEFE4CB, 0, my, mz - 0.01, null, [0.15, 0.11, 0.11]);
      b.add(SPH, 0x24120E, 0, my, mz + 0.075, null, [0.1, 0.05, 0.035]);
      b.add(BOX, 0xFBF8F0, 0, my + 0.04, mz + 0.085, null, [0.12, 0.034, 0.02]);
      b.add(BOX, 0xE2B436, 0.031, my - 0.038, mz + 0.085, null, [0.058, 0.03, 0.02]);
      b.add(BOX, 0xFBF8F0, -0.031, my - 0.038, mz + 0.085, null, [0.058, 0.03, 0.02]);
      // an old scar across his left eye
      b.add(BOX, 0xE9C8BA, 0.27, 0.33, ez(0.27, 0.33) + 0.07, [0, 0.4, -0.4], [0.016, 0.3, 0.016]);
    });
    // little fins fluttering on his sides behind his eyes, and a tail fin behind his belt
    const fins = [-1, 1].map(s => {
      const g = k.bone(r.chestAt, s * ball.r[0] * 0.97, 0.12, 0.05);
      k.part(g, b => b.add(SPH, FINC, s * 0.02, 0, -0.08, null, [0.022, 0.12, 0.13]));
      return g;
    });
    const tail = k.bone(r.hips, 0, -0.02, -0.38 * f);
    k.part(tail, b => b.add(SPH, FINC, 0, 0, -0.13, null, [0.025, 0.17, 0.18]));
    // the spines, all over him but his face: lying back at rest, standing out long when he's blown up
    const spines = (at: Object3D, o: Round, keep: (d: Vector3) => boolean, N: number, size: number) => {
      const rest = k.bone(at, 0, 0, 0), out = k.bone(at, 0, 0, 0), n = new Vector3();
      for (const [g, up] of [[rest, false], [out, true]] as const) k.part(g, b => {
        for (let i = 0; i < N; i++) {
          const y = 1 - ((i + 0.5) / N) * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
          const d = new Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
          if (!keep(d)) continue;
          n.set(d.x / o.r[0], d.y / o.r[1], d.z / o.r[2]).normalize();
          if (!up) { n.z -= 0.9; n.normalize(); }
          const len = (up ? 0.3 : 0.06) * size, w = 0.022 * size + 0.004;
          ee.setFromQuaternion(qq.setFromUnitVectors(UP, n));
          b.add(CONE, 0xF2EEE4, o.at[0] + d.x * o.r[0] + n.x * len * 0.3, o.at[1] + d.y * o.r[1] + n.y * len * 0.3, o.at[2] + d.z * o.r[2] + n.z * len * 0.3, [ee.x, ee.y, ee.z], [w, len, w]);
        }
      });
      return { rest, out };
    };
    const sets = [
      spines(r.chestAt, ball, d => d.y > -0.75 && !face(d), 240, 1),
      spines(r.bellyAt, belly, d => d.y < -0.05 && d.y >= -0.8 && d.z > 0.3, 50, 0.8),
    ];
    return {
      hands: true,
      anim(t, dt) {
        r.puff += (r.puffTo - r.puff) * Math.min(1, dt * (r.puffTo > r.puff ? 7 : 2.5));
        const p = r.puff, big = 1 + 0.32 * p;
        r.chestAt.scale.setScalar(big); r.bellyAt.scale.multiplyScalar(big);
        // his arms out from the sides of the ball, further as it swells
        r.arms.forEach(A => { A.sh.position.x = A.s * (0.4 * f + 0.2 * p); });
        for (const s of sets) { s.out.visible = p > 0.4; s.rest.visible = !s.out.visible; }
        fins.forEach((e, i) => { e.rotation.y = (i ? 1 : -1) * (0.25 + 0.35 * Math.sin(t * 9 + i)); });
        tail.rotation.y = 0.4 * Math.sin(t * 7);
      },
    };
  },
};
