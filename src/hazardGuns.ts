// Cooking Hazard's guns as the chef holds them (hazardSet.ts puts them in the chef's right hand), picked by the owner
// from the concept models (3 November 2026, https://claude.ai/artifact/FGebC1oagGQKhUED4ybzCK): the Spud Rifle is the
// Spud Cannon, a backyard potato cannon; the Rock Salt Shotgun is the Grinder Double, two wooden salt mills for
// barrels; the Chili Sprayer is the Backpack Burner, a real flamethrower, two chili-oil tanks and a pressure tank on
// the chef's back and a hose down to the wand in the hand. Each has three looks for the armory's damage levels, each
// adding parts to the same gun, never a new shape: base; ×1.15; ×1.3 and up.
//
// Each gun's built in its own space (the barrel along +x, up +y, the grip at `GRIP`), the concept page's, then turned
// into the arm's (it points along the arm, -y, held where the hand is) and baked into one mesh in the game's painted
// colours.
import { BoxGeometry, type BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import type { GunId } from './hazard';
import { bakePainted, mesh, painted, type Part } from './render';

type P = Part & { c: number };
/** The game's colours for them. */
const C = {
  potato: 0xC9A15E, wood: 0x8A6A44, woodDark: 0x6E5434, steel: 0x7A848C, dark: 0x2A2E33, cream: 0xF4EFE6, red: 0xC0392B,
  tomato: 0xE0392B, brass: 0xD9A84A, salt: 0xF4F4F0, ink: 0x1B2430, glass: 0xBDEBFA, pipe: 0xE6E2D8, orange: 0xF08A24, flame: 0xFFC34A,
};

// ---------- shapes ----------
const box = new BoxGeometry(1, 1, 1), ball = new SphereGeometry(1, 14, 10), cone = new ConeGeometry(1, 1, 12), crystal = new SphereGeometry(1, 4, 2); // (a rough salt crystal: indexed like the rest, so they bake together)
const tapers = new Map<number, CylinderGeometry>(), rings = new Map<number, TorusGeometry>();
/** A cylinder whose top is `q` of its bottom's width (cached by q). */
const taper = (q: number) => tapers.get(q) ?? (tapers.set(q, new CylinderGeometry(q, 1, 1, 16)), tapers.get(q)!);
/** A ring `t` of its radius thick (cached by t). */
const torus = (t: number) => rings.get(t) ?? (rings.set(t, new TorusGeometry(1, t, 8, 20)), rings.get(t)!);

// the parts, in a gun's own space: as the concept page's helpers made them
const B = (p: P[], c: number, x: number, y: number, z: number, w: number, h: number, d: number, rot?: P['rot']) => p.push({ geo: box, c, at: [x, y, z], scale: [w, h, d], rot });
/** A cylinder along x, r thick at its back and r2 at its front. */
const tube = (p: P[], c: number, x: number, y: number, z: number, r: number, len: number, r2 = r) => p.push({ geo: taper(r2 / r), c, at: [x, y, z], scale: [r, len, r], rot: [0, 0, -Math.PI / 2] });
/** An upright cylinder, r thick at its top and r2 at its bottom (`rot` to turn it). */
const can = (p: P[], c: number, x: number, y: number, z: number, r: number, h: number, r2 = r, rot?: P['rot']) => p.push({ geo: taper(r / r2), c, at: [x, y, z], scale: [r2, h, r2], rot });
const sphere = (p: P[], c: number, x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1) => p.push({ geo: ball, c, at: [x, y, z], scale: [r * sx, r * sy, r * sz] });
/** A ring round the barrel (`rot` to face it some other way). */
const ring = (p: P[], c: number, x: number, y: number, z: number, r: number, t = 0.012, rot: P['rot'] = [0, Math.PI / 2, 0]) => p.push({ geo: torus(t / r), c, at: [x, y, z], scale: [r, r, r], rot });
const grip = (p: P[], c: number, x: number, y = -0.13) => B(p, c, x, y, 0, 0.07, 0.19, 0.06, [0, 0, 0.32]);
const trigger = (p: P[], x: number) => { ring(p, C.dark, x, -0.07, 0, 0.035, 0.008, [0, 0, 0]); B(p, C.dark, x, -0.06, 0, 0.014, 0.045, 0.014); };

// ---------- the guns ----------
/** A gun: its parts at a look (1 to 3), where its grip and its muzzle are along it (x), and how high its barrel sits. */
interface GunModel { parts: (level: number) => P[]; grip: number; muzzle: number; bore: number }

export const MODELS: Record<GunId, GunModel> = {
  // the Spud Cannon: a fat chamber, a long pipe, a spud peeking out; taped bands and a measuring-cup sight; brass
  // fittings, steam vents and a spud hopper
  spud: { grip: -0.17, muzzle: 0.72, bore: 0.02, parts(l) {
    const p: P[] = [];
    tube(p, C.pipe, -0.26, 0.02, 0, 0.11, 0.34); tube(p, C.pipe, -0.05, 0.02, 0, 0.11, 0.1, 0.05); tube(p, C.pipe, 0.32, 0.02, 0, 0.05, 0.66);
    B(p, C.red, -0.3, 0.14, 0, 0.05, 0.04, 0.05); grip(p, C.wood, -0.17); trigger(p, -0.12); B(p, C.wood, -0.48, -0.02, 0, 0.12, 0.12, 0.07);
    sphere(p, C.potato, 0.66, 0.02, 0, 0.055, 1.3, 1, 1);
    if (l >= 2) {
      ring(p, C.ink, 0.14, 0.02, 0, 0.053, 0.014); ring(p, C.ink, 0.44, 0.02, 0, 0.053, 0.014);
      can(p, C.steel, -0.24, 0.17, 0, 0.035, 0.07); B(p, C.steel, -0.2, 0.17, 0, 0.05, 0.012, 0.012);
    }
    if (l >= 3) {
      ring(p, C.brass, -0.42, 0.02, 0, 0.113, 0.018); ring(p, C.brass, -0.1, 0.02, 0, 0.113, 0.018);
      for (const z of [-0.06, 0, 0.06]) can(p, C.brass, -0.36 + z, 0.16, z, 0.012, 0.07);
      B(p, C.woodDark, -0.2, 0.22, 0, 0.16, 0.08, 0.12);
      for (const [x, z] of [[-0.24, -0.03], [-0.18, 0.03], [-0.21, 0]]) sphere(p, C.potato, x, 0.27, z, 0.035, 1.2, 1, 1);
    }
    return p;
  } },
  // the Grinder Double: two wooden salt mills for barrels, knobs at the muzzle; brass bands; grinding cranks and a
  // crystal hopper
  salt: { grip: -0.06, muzzle: 0.47, bore: 0.04, parts(l) {
    const p: P[] = [];
    for (const z of [-0.035, 0.035]) { tube(p, C.wood, 0.2, 0.04, z, 0.034, 0.44, 0.03); sphere(p, C.woodDark, 0.44, 0.04, z, 0.03); }
    B(p, C.steel, -0.08, 0.03, 0, 0.12, 0.1, 0.11); B(p, C.wood, -0.33, -0.01, 0, 0.36, 0.1, 0.08, [0, 0, 0.12]); grip(p, C.woodDark, -0.06); trigger(p, -0.02);
    if (l >= 2) for (const x of [0.06, 0.32]) for (const z of [-0.035, 0.035]) ring(p, C.brass, x, 0.04, z, 0.037, 0.01);
    if (l >= 3) {
      for (const z of [-0.075, 0.075]) { B(p, C.steel, 0, 0.08, z, 0.012, 0.08, 0.012); sphere(p, C.dark, 0, 0.12, z, 0.016); }
      can(p, C.glass, -0.1, 0.12, 0, 0.04, 0.07); p.push({ geo: crystal, c: C.salt, at: [-0.1, 0.12, 0], scale: [0.025, 0.025, 0.025] });
    }
    return p;
  } },
  // the Backpack Burner's wand (its tanks are on the chef's back: packParts): rear and front grips, a valve, a long
  // barrel, the igniter; a valve wheel and brass; a heat shield
  chili: { grip: -0.06, muzzle: 0.42, bore: 0.02, parts(l) {
    const p: P[] = [];
    tube(p, C.steel, 0.12, 0.02, 0, 0.026, 0.44); tube(p, C.dark, -0.07, 0.02, 0, 0.034, 0.1);
    grip(p, C.dark, -0.06, -0.1); trigger(p, -0.02); B(p, C.dark, 0.17, -0.07, 0, 0.05, 0.14, 0.05, [0, 0, -0.1]);
    B(p, C.dark, 0.36, 0.06, 0, 0.06, 0.05, 0.06); tube(p, C.steel, 0.37, 0.02, 0, 0.034, 0.05, 0.026);
    if (l >= 2) {
      ring(p, C.brass, -0.12, 0.02, 0, 0.036, 0.01);
      ring(p, C.tomato, 0.06, 0.08, 0, 0.04, 0.008, [Math.PI / 2, 0, 0]); can(p, C.steel, 0.06, 0.05, 0, 0.008, 0.06);
    }
    if (l >= 3) for (let i = 0; i < 6; i++) ring(p, C.steel, 0.1 + i * 0.04, 0.02, 0, 0.042, 0.007);
    return p;
  } },
};

/** How big the guns are in the chef's hand, and where the hand is along the arm (its own space: down the arm is -y). */
export const GUN_K = 0.62, HAND = -0.36;
/** Where a gun's point `x` along it (the muzzle, say), `y` above its barrel, is in the arm's space. */
export const onArm = (gun: GunId, x: number, y = MODELS[gun].bore) => new Vector3(0, HAND - (x - MODELS[gun].grip) * GUN_K, y * GUN_K);
/** The turn from a gun's own space into the arm's: along it is down the arm, its up is the arm's front (which faces up
 *  while the arm's held out), its side the arm's side; the grip in the hand. */
const toArm = (gun: GunId) => new Matrix4().set(
  0, 0, -GUN_K, 0,
  -GUN_K, 0, 0, HAND + MODELS[gun].grip * GUN_K,
  0, GUN_K, 0, 0,
  0, 0, 0, 1,
);

/** The look for an armory damage level (0 to 3): base; ×1.15; ×1.3 and ×1.5. */
export const lookFor = (damageK: number) => (damageK >= 1.3 - 1e-6 ? 3 : damageK >= 1.15 - 1e-6 ? 2 : 1);

/** A gun at a look, baked for the arm: one mesh in the painted colours (the flamethrower's pilot light, unlit, in it). */
export function gunMesh(gun: GunId, level: number) {
  const geo = bakePainted(MODELS[gun].parts(level)).applyMatrix4(toArm(gun));
  const m = mesh(geo, painted, 0, 0, 0, true) as Mesh;
  if (gun === 'chili') {
    // (the pilot light, burning at the igniter: bigger on the top look)
    const k = level >= 3 ? 1.6 : 1.1;
    for (const [c, r, h, x] of [[C.orange, 0.03, 0.1, 0.045], [C.flame, 0.016, 0.06, 0.032]] as const) {
      const f = new Mesh(cone, new MeshBasicMaterial({ color: c }));
      f.position.copy(onArm('chili', MODELS.chili.muzzle - 0.02 + x * k));
      f.scale.set(r * k * GUN_K, h * k * GUN_K, r * k * GUN_K);
      f.rotation.x = Math.PI;
      m.add(f);
    }
  }
  return m;
}

// ---------- the backpack ----------
/** The Backpack Burner's pack, in the chef's body's space (its back is -z): two chili-oil tanks with cream bands, a
 *  pressure tank between and behind them, the frame and its shoulder straps, the manifold under the tanks and the hose
 *  from it round the right side to the shoulder; a gauge and brass fittings; riveted armour plates. `shoulder` is where
 *  the right arm hangs from (null: it's off, standing on the floor, with no straps or hose). */
export function packMesh(level: number, shoulder: Vector3 | null) {
  return mesh(bakePainted(packParts(level, shoulder)), painted, 0, 0, 0, true) as Mesh;
}

function packParts(level: number, shoulder: Vector3 | null) {
  const p: P[] = [], z0 = -0.36, y0 = 0.62;
  for (const x of [-0.095, 0.095]) {
    can(p, C.tomato, x, y0, z0, 0.078, 0.3); sphere(p, C.tomato, x, y0 + 0.15, z0, 0.078, 1, 0.8, 1); sphere(p, C.tomato, x, y0 - 0.15, z0, 0.078, 1, 0.8, 1);
    can(p, C.cream, x, y0 + 0.04, z0, 0.081, 0.07); can(p, C.dark, x, y0 + 0.22, z0, 0.022, 0.04);
  }
  sphere(p, C.steel, 0, y0, z0 - 0.1, 0.063);
  for (const y of [y0 - 0.17, y0 + 0.17]) B(p, C.dark, 0, y, z0 + 0.07, 0.3, 0.03, 0.045);
  B(p, C.dark, 0, y0, -0.25, 0.24, 0.42, 0.025);
  can(p, C.steel, 0, y0 - 0.25, z0, 0.017, 0.24, 0.017, [0, 0, Math.PI / 2]);
  if (level >= 2) {
    can(p, C.cream, 0, y0 + 0.08, z0 - 0.16, 0.032, 0.014, 0.032, [Math.PI / 2, 0, 0]); B(p, C.tomato, 0, y0 + 0.09, z0 - 0.168, 0.004, 0.022, 0.002);
    for (const x of [-0.12, 0.12]) can(p, C.brass, x, y0 - 0.25, z0, 0.021, 0.02, 0.021, [0, 0, Math.PI / 2]);
  }
  if (level >= 3) for (const x of [-0.17, 0.17]) {
    B(p, C.steel, x, y0, z0, 0.014, 0.33, 0.15);
    for (const y of [y0 - 0.13, y0 + 0.13]) for (const z of [z0 - 0.05, z0 + 0.05]) sphere(p, C.brass, x + Math.sign(x) * 0.008, y, z, 0.008);
  }
  if (!shoulder) return p;
  // the straps over the shoulders, and the hose from the manifold round the right side up to the shoulder
  const tubes: [number, number[][], number][] = [
    ...[-0.1, 0.1].map(x => [C.dark, [[x, y0 + 0.2, -0.26], [x * 1.2, 1.0, -0.12], [x * 1.3, 0.98, 0.12], [x * 1.2, 0.72, 0.24]], 0.016] as [number, number[][], number]),
    [C.ink, [[0.12, y0 - 0.25, z0], [shoulder.x * 0.6, y0 - 0.2, -0.3], [shoulder.x * 1.1, 0.6, -0.16], [shoulder.x, shoulder.y - 0.06, -0.09]], 0.02],
  ];
  return [...p, ...tubes.map(([c, pts, r]) => ({ geo: hoseGeo(pts, r), c, at: [0, 0, 0] as [number, number, number] }))];
}

/** The hose's last stretch, in the arm's space: from the shoulder, along under the arm, into the back of the wand. */
export function armHoseMesh() {
  const back = onArm('chili', -0.13, -0.01), geo = bakePainted([{ geo: hoseGeo([[0.02, -0.05, -0.07], [0.04, -0.16, -0.09], [0.02, back.y + 0.04, back.z - 0.04], [0, back.y, back.z]], 0.02), c: C.ink, at: [0, 0, 0] }]);
  return mesh(geo, painted, 0, 0, 0, true) as Mesh;
}

/** A hose along `pts`, `r` thick. */
const hoseGeo = (pts: number[][], r: number): BufferGeometry => new TubeGeometry(new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z))), 24, r, 8);

// ---------- on the armory's rack ----------
/** Where each gun hangs on the safe house's armory rack (hazardRoom.ts), in the rack's space: its grip, and its barrel's
 *  height on the pegs above a shelf (the Spud Cannon on the middle shelf, the Grinder Double on the top one, the
 *  Backpack Burner's wand on the bottom one, its pack standing on the floor under it, the gauge to the room). */
const RACK: Record<GunId, [number, number]> = { spud: [-0.38, 1.4], salt: [0.12, 2.0], chili: [0.5, 0.78] };
/** How far the guns on the rack lean their tops out to the room (so both the Grinder Double's barrels show). */
const RACK_TILT = 0.55, sv = new Vector3();
const PACK_AT = new Matrix4().makeRotationY(Math.PI).setPosition(0.6, -0.34, -0.11);

/** The rack's guns, each at its three looks, and the pack at its three with the hose up to the wand: all hidden, for
 *  the room to show the ones the player has, at their looks. Side on to the room, leaning out a little, the size they
 *  are in the hand. */
export function rackMeshes() {
  const guns = Object.fromEntries((Object.keys(MODELS) as GunId[]).map(id => {
    const [x, y] = RACK[id], m = MODELS[id];
    const to = new Matrix4().makeRotationX(RACK_TILT).scale(sv.set(GUN_K, GUN_K, GUN_K)).setPosition(x - m.grip * GUN_K, y - m.bore * GUN_K, 0.1);
    return [id, [1, 2, 3].map(l => mesh(bakePainted(m.parts(l)).applyMatrix4(to), painted, 0, 0, 0, true) as Mesh)];
  })) as Record<GunId, Mesh[]>;
  const pack = [1, 2, 3].map(l => mesh(bakePainted(packParts(l, null)).applyMatrix4(PACK_AT), painted, 0, 0, 0, true) as Mesh);
  // (from the manifold's end, round in front of the bottom shelf, into the back of the wand)
  const [wx, wy] = RACK.chili, back = [wx + (-0.13 - MODELS.chili.grip) * GUN_K, wy - 0.03 * GUN_K, 0.1];
  const hose = mesh(bakePainted([{ geo: hoseGeo([[0.48, 0.03, 0.25], [0.33, 0.1, 0.42], [0.3, 0.5, 0.32], [back[0] - 0.05, back[1] - 0.02, 0.14], back], 0.02), c: C.ink, at: [0, 0, 0] }]), painted, 0, 0, 0, true) as Mesh;
  for (const m of [...Object.values(guns).flat(), ...pack, hose]) m.visible = false;
  return { guns, pack, hose };
}
