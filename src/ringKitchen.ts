// The cellar's kitchen, drawn (stage 3): fight.ts runs it, and this shows it as it is each frame. The prep hall's
// drying racks and salt barrels (and the steam baskets and smokehouses they're swapped for), the grow room's beds and
// glowing shelves, each with what's in it, wet rice drying white and fish going brown; the ledge in front of the hearth
// with what's waiting to go in; the pot, its stew the colour of what's in it, steaming as it cooks; the bowls on the
// counter and in the soup square's counters, steaming while there are any; the dumbwaiter's trays going round;
// the hires at their work, carrying what they carry; and a bubble over the pot when it waits on something (🌾? 🐟?
// 🍄?), or over the bar when fans wait at it with nothing to eat, like the cooks upstairs.
import { CanvasTexture, Color, Group, type Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { cellar, CY, LIFT_LOOP, parts, POT_TOP, potMesh, potStew } from './cellar';
import { BAR, BAR_PLACES, BAR_PAD, BIN_PADS, BINS, CHUTE, chuteY, COUNTER, COUNTER_PAD, HEARTH, type Ing, LEDGE, LIFTS, machineAt, machinePad, MAX_MACHINES, POT, POT_PAD, STORES } from './cellarPlan';
import { decal, drawPad } from './decals';
import { animPerson, belowGround, Person } from './characters';
import { COUNTER_CAP, F, inPot, POT_CAP, poured, slid, sold, type Machine, mach, potWaits, type Role, STALL_CAP, type Worker } from './fight';
import { fly } from './holder';
import { newBowl, newCuredFish, newMushroom, newReadyRice, newRice, newFillet } from './items';
import { apart, Build, dice, K, quietly, rbox, tube } from './kit';
import { floorClear, hatch, underBelt } from './underBelt';
import { FONT, G, mesh } from './render';
import { fanAt, heading, turnedAt } from './swarm';
import { V, type XZ } from './util';

const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
const box = (p: Object3D, c: number | MeshLambertMaterial, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
  const m = add(p, mesh(G.box, c, x, y, z, cast)); m.scale.set(sx, sy, sz); return m;
};
const WOOD = 0x8A5A3B, WOOD_DARK = 0x5B3424, BAMBOO = 0xC9A86A, IRON = 0x2E2E33;
const glow = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1 });

// ---------- the machines ----------
/** One machine in its slot: both its looks (built and upgraded), and the meshes for what's in it, placed for each. */
interface Slot { k: Ing; i: number; g: Group; looks: [Group, Group]; items: Object3D[]; spots: [Vector3[], Vector3[]]; steam: Mesh[] }
/** Where in a machine its items sit, and how many (as many as it holds): the first look's, then the upgraded one's. */
function spotsFor(k: Ing): [Vector3[], Vector3[]] {
  const ring = (n: number, r: number, y: number, a0 = 0) => Array.from({ length: n }, (_, j) => V(Math.sin(a0 + j / n * Math.PI * 2) * r, y, Math.cos(a0 + j / n * Math.PI * 2) * r));
  if (k === 'rice') {
    // two rows of three mounds in the rack's top zaru; ten rice balls on the top steamer, seven round, three in the middle
    return [[0, 1, 2, 3, 4, 5].map(j => V(-0.24 + (j % 3) * 0.24, 1.36, -0.09 + Math.floor(j / 3) * 0.18)), [...ring(7, 0.24, 1.17), ...ring(3, 0.09, 1.17, 0.5)]];
  }
  if (k === 'fish') {
    // six slices laid in the salt, round the barrel's dome; ten hanging in the smokehouse's front, two staggered rows
    return [ring(6, 0.22, 1.11, 0.3), Array.from({ length: 10 }, (_, j) => j < 5 ? V(-0.38 + j * 0.19, 1.0, 0.52) : V(-0.29 + (j - 5) * 0.19, 0.74, 0.54))];
  }
  return [[0, 1, 2, 3, 4, 5].map(j => V(-0.8 + j * 0.32, 0.36, j % 2 ? -0.18 : 0.18)),
    [...[0, 1, 2, 3, 4].map(j => V(-0.8 + j * 0.4, 0.42, 0.05)), ...[0, 1, 2, 3].map(j => V(-0.6 + j * 0.4, 1.02, 0))]];
}
/** One look of a machine, baked into a single mesh (shared by every slot of the line). */
const shape = (draw: (b: Build) => void) => { const b = new Build(); draw(b); return b; };
const looksOnce = new Map<string, Build>();
const look = (key: string, draw: (b: Build) => void) => { let b = looksOnce.get(key); if (!b) looksOnce.set(key, b = shape(draw)); return b.mesh(true); };
const BAMBOO_DARK = 0xA88850, HOOP = 0x3A3A40, SALT = 0xF4F4EE, WATER = 0x5E9EC0;
/** A drying rack (where the washed rice drains and dries): an open timber shelf, three tiers of zaru (the shallow bamboo
 *  baskets a kitchen drains and dries food in) heaped with washed rice, a fourth open to the air on top, and a drip
 *  trough at its foot. Steam baskets: three banded bamboo steamers on an iron brazier, the lid off beside them. */
function riceLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  /** A zaru, oval to fit the shelf, its woven floor (two tones, ringed), its rim bound in darker cane. */
  const zaru = (r: Build, y: number, w: number, d: number) => {
    r.add(tube(w, w * 0.9, 0.05, 18), BAMBOO, 0, y + 0.025, 0, null, [1, 1, d / w]);
    for (const k of [0.75, 0.45]) r.add(K.ring, BAMBOO_DARK, 0, y + 0.052, 0, [Math.PI / 2, 0, 0], [w * k, d * k, 0.05]);
    r.add(K.ring, BAMBOO_DARK, 0, y + 0.05, 0, [Math.PI / 2, 0, 0], [w, d, 0.35]);
  };
  // (built off the game's luck, kit.ts' quietly, as new scenery is)
  add(a, look('rack', r => quietly(() => {
    // the frame: four square posts, rails front and back and across the ends at each tier, the top rails a little
    // proud, and slats across each tier for the basket to sit on
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) r.add(rbox(0.06, 1.3, 0.06, 0.012), WOOD_DARK, x * 0.41, 0.65, z * 0.25);
    for (const y of [0.32, 0.68, 1.04, 1.28]) {
      for (const z of [-0.25, 0.25]) r.add(rbox(0.88, 0.045, 0.04, 0.01), WOOD_DARK, 0, y, z);
      for (const x of [-0.41, 0.41]) r.add(rbox(0.04, 0.045, 0.54, 0.01), WOOD_DARK, x, y, 0);
      for (let j = 0; j < 4; j++) r.add(rbox(0.03, 0.02, 0.5, 0.006), BAMBOO_DARK, -0.27 + j * 0.18, y + 0.03, 0);
    }
    // three tiers of zaru, each heaped with washed rice
    for (const y of [0.34, 0.7, 1.06]) {
      zaru(r, y, 0.37, 0.235);
      r.add(K.dome, 0xF2EEE2, 0, y + 0.05, 0, null, [0.3, 0.06, 0.19]);
    }
    // on top, one more, open to the air: the rice in it is what's drying now (the machine's own mounds)
    zaru(r, 1.3, 0.42, 0.27);
    // the drip trough at its foot, with the water that's run off
    r.add(rbox(0.8, 0.1, 0.46, 0.02), WOOD, 0, 0.05, 0);
    r.add(rbox(0.72, 0.01, 0.38, 0.003), WATER, 0, 0.1, 0);
    // a cloth hung over the top rail at the end, for wiping down
    r.add(rbox(0.02, 0.32, 0.22, 0.005), 0xE8E2D4, 0.435, 1.13, 0.02);
  })));
  add(b, look('steam', r => {
    r.add(rbox(0.8, 0.5, 0.6, 0.05), IRON, 0, 0.25, 0);
    for (const x of [-0.3, 0.3]) for (const z of [-0.22, 0.22]) r.add(K.post, IRON, x, 0.02, z, null, [0.05, 0.04, 0.05]);
    for (let y = 0; y < 3; y++) {
      r.add(tube(0.36, 0.36, 0.17, 14), y % 2 ? 0xB8955A : BAMBOO, 0, 0.6 + y * 0.18, 0);
      r.add(K.ring, BAMBOO_DARK, 0, 0.6 + y * 0.18 + 0.07, 0, [Math.PI / 2, 0, 0], [0.365, 0.365, 0.2]);
    }
    r.add(tube(0.35, 0.35, 0.01, 14), 0xD9BE84, 0, 1.11, 0);
    // the lid, set down on its edge against the brazier
    r.add(tube(0.37, 0.37, 0.05, 14), BAMBOO_DARK, 0.48, 0.42, 0.05, [0, 0, 1.35]);
  }));
  box(b, glow(0xFF7A2A, 0xFF5A10), 0, 0.22, 0.31, 0.4, 0.12, 0.02, false);
  return [a, b];
}
/** A salt barrel: banded staves, a heap of salt to the brim with the fish tails-up in it, the lid leaning against it
 *  and a scoop in the salt. A smokehouse: a little plank hut with a chimney, fish hanging under its eave. */
function fishLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  add(a, look('barrel', r => {
    r.add(tube(0.42, 0.38, 0.96, 16), WOOD, 0, 0.48, 0);
    // the staves' joints, round it
    for (let j = 0; j < 12; j++) {
      const t = j / 12 * Math.PI * 2;
      r.add(rbox(0.012, 0.94, 0.02, 0.004), WOOD_DARK, Math.sin(t) * 0.405, 0.48, Math.cos(t) * 0.405, [0, t, 0]);
    }
    for (const y of [0.14, 0.48, 0.82]) r.add(K.ring, HOOP, 0, y, 0, [Math.PI / 2, 0, 0], [0.42 - (0.82 - y) * 0.04, 0.42 - (0.82 - y) * 0.04, 0.3]);
    // salt heaped over the brim
    r.add(tube(0.39, 0.39, 0.03, 16), SALT, 0, 0.96, 0);
    r.add(K.dome, SALT, 0, 0.96, 0, null, [0.37, 0.16, 0.37]);
    // the lid, leaning against its side (towards the wall), and a wooden scoop stuck in the salt
    r.add(tube(0.4, 0.4, 0.04, 16), WOOD_DARK, 0.02, 0.42, -0.52, [1.35, 0, 0]);
    r.add(rbox(0.05, 0.3, 0.02, 0.008), WOOD_DARK, 0.06, 1.18, -0.06, [0.35, 0, 0.2]);
    r.add(K.dome, WOOD, 0.02, 1.03, -0.1, [Math.PI, 0, 0], [0.07, 0.05, 0.07]);
  }));
  add(b, look('smoke', r => {
    r.add(rbox(0.86, 1.2, 0.7, 0.03), 0x6B4130, 0, 0.6, -0.05);
    for (let j = 0; j < 5; j++) r.add(rbox(0.87, 0.012, 0.71, 0.004), 0x4E2F22, 0, 0.18 + j * 0.24, -0.05);
    r.add(rbox(1.0, 0.08, 0.95, 0.02), WOOD_DARK, 0, 1.25, 0.05);
    r.add(rbox(0.5, 0.7, 0.02, 0.005), 0x3A2A20, 0, 0.6, 0.31);
    r.add(rbox(0.18, 0.6, 0.18, 0.02), 0x4E4A46, 0.3, 1.55, -0.2);
    r.add(rbox(0.95, 0.04, 0.04, 0.01), WOOD_DARK, 0, 1.08, 0.5);
  }));
  return [a, b];
}
/** A mushroom bed: a raised box of dark soil with logs in it. Glowing shelves: two shelves of soil under a soft glow. */
function mushLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  box(a, WOOD_DARK, 0, 0.15, 0, 2.2, 0.3, 1.0);
  box(a, 0x2A1E16, 0, 0.31, 0, 2.05, 0.02, 0.86, false);
  for (const x of [-0.6, 0.2]) { const l = add(a, mesh(G.log, 0x6B4A2E, x, 0.38, 0, true)); l.scale.set(0.8, 0.9, 0.8); l.rotation.z = Math.PI / 2; }
  const GLOW = glow(0x8FE0C0, 0x2E9C7A);
  for (const y of [0.35, 0.95]) {
    box(b, WOOD_DARK, 0, y - 0.03, 0, 2.2, 0.06, 0.8);
    box(b, 0x2A1E16, 0, y + 0.01, 0, 2.1, 0.02, 0.7, false);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(b, WOOD_DARK, x * 1.05, 0.65, z * 0.35, 0.06, 1.3, 0.06);
  box(b, GLOW, 0, 1.32, 0, 2.0, 0.04, 0.1, false);
  return [a, b];
}
const LOOKS = { rice: riceLooks, fish: fishLooks, mush: mushLooks };
const RAW: Record<Ing, Color> = { rice: new Color(0xC8B48A), fish: new Color(0xD8394B), mush: new Color(0x8C6542) };
const DONE: Record<Ing, Color> = { rice: new Color(0xFFFBEF), fish: new Color(0xB8743E), mush: new Color(0x8C6542) };
/** A slice of fish, the market's own fillet as it comes down from upstairs, laid in the salt and hung in the
 *  smokehouse: fresh until it's cured, then the cured one (both in a group, shown in turn). */
function fishSlice() {
  const g = new Group();
  g.add(newFillet(), newCuredFish());
  return g;
}
/** An item in a machine: a mound of rice, a slice of fish, a mushroom cap; each with its own material, to colour as it goes. */
function itemMesh(k: Ing): Object3D {
  const m = k === 'rice' ? mesh(K.dome, new MeshLambertMaterial({ color: RAW.rice })) : k === 'fish' ? fishSlice() : mesh(G.cone, new MeshLambertMaterial({ color: RAW.mush }));
  return m;
}
/** Steam and smoke: soft white puffs. */
const smoke = new MeshLambertMaterial({ color: 0xF4F1EA, transparent: true, opacity: 0.22, depthWrite: false });
const slots: Slot[] = [];
for (const k of ['rice', 'fish', 'mush'] as const) {
  for (let i = 0; i < MAX_MACHINES; i++) {
    const at = machineAt(k, i), g = add(k === 'mush' ? parts.grow : cellar, new Group());
    g.position.set(at.x, CY, at.z);
    // racks face south into the hall, barrels and smokehouses north, beds south
    if (k === 'fish') g.rotation.y = Math.PI;
    const looks = LOOKS[k](g), spots = spotsFor(k);
    const items = Array.from({ length: 10 }, () => add(g, itemMesh(k)));
    const steam = k === 'mush' ? [] : Array.from({ length: 3 }, (_, j) => { const s = add(g, mesh(G.sphere, smoke, 0, 1.3, 0)); s.userData.t = j / 3; return s; });
    g.visible = false;
    slots.push({ k, i, g, looks, items, spots, steam });
  }
}

// ---------- where to stand ----------
// A round marker on the floor at every station, so each is easy to find: what the dumbwaiter hands out, each rack 🌾,
// barrel 🐟 and bed 🍄 (shown with its machine), the pot and the bowl counter 🍲, the soup square's floor 🏮. A little
// smaller than the ground that counts as standing there, so the markers along a line don't run into each other.
const MARK = 0.9;
function marker(at: XZ, icon: string, parent: Object3D = cellar) {
  const d = decal(MARK, (c, w, h) => drawPad(c, w, h, icon));
  d.mesh.position.set(at.x, CY + 0.012, at.z);
  parent.add(d.mesh);
  return d.mesh;
}
for (const k of ['rice', 'fish'] as const) marker(BIN_PADS[k], k === 'rice' ? '🍚' : '🐟');
marker(POT_PAD, '🍲').name = 'potPad'; marker(COUNTER_PAD, '🍲'); marker(BAR_PAD, '🏮');
const MARK_ICON: Record<Ing, string> = { rice: '🌾', fish: '🐟', mush: '🍄' };
// (a marker by each of the grow room's beds; one for all the racks, and one for all the barrels, which moves along the
// row as it grows: cellarPlan.ts's machinePad)
const machineMarks = (['rice', 'fish', 'mush'] as const).flatMap(k => Array.from({ length: k === 'mush' ? MAX_MACHINES : 1 }, (_, i) => {
  const m = marker(machinePad(k, i), MARK_ICON[k], k === 'mush' ? parts.grow : cellar);
  m.visible = false;
  return { k, i, m };
}));

function drawSlot(s: Slot, dt: number) {
  const L = F.lines[s.k], m: Machine | undefined = L.m[s.i];
  s.g.visible = s.i < L.n;
  if (!s.g.visible || !m) return;
  const up = L.up;
  s.looks[0].visible = !up; s.looks[1].visible = !!up;
  const spots = s.spots[up], cap = mach(s.k).cap;
  s.items.forEach((it, j) => {
    let p = -1;
    if (s.k === 'mush') p = j < m.ready ? 1 : j === m.ready && j < cap ? m.p : -1;
    else if (j < m.items.length) p = m.items[j];
    it.visible = p >= 0 && j < spots.length;
    if (!it.visible) return;
    it.position.copy(spots[j]);
    if (s.k === 'fish') { it.children[0].visible = p < 1; it.children[1].visible = p >= 1; }
    else ((it as Mesh).material as MeshLambertMaterial).color.lerpColors(RAW[s.k], DONE[s.k], Math.min(1, p));
    // (a ready one sits up a little bigger, to be seen from across the room)
    const k = s.k === 'mush' ? 0.3 + 0.7 * p : p >= 1 ? 1.25 : 1;
    if (s.k === 'rice') it.scale.set(0.1 * k, (s.looks[1].visible ? 0.08 : 0.06) * k, 0.1 * k);
    else if (s.k === 'fish') {
      // laid flat round the salt, lengthways, leaning down its slope; hung face on along the smokehouse's front
      it.scale.setScalar(0.55 * k);
      if (up) it.rotation.set(Math.PI / 2, 0, 0, 'YXZ');
      else it.rotation.set(-0.35, Math.atan2(spots[j].x, spots[j].z), 0, 'YXZ');
    }
    else it.scale.set(0.15 * k, 0.1 * k, 0.15 * k);
  });
  // the steamers and the smokehouse puff while something's in them
  const busy = up && m.items.some(p => p < 1);
  for (const st of s.steam) {
    st.visible = !!busy;
    if (!busy) continue;
    st.userData.t = (st.userData.t + dt * 0.4) % 1;
    const u = st.userData.t as number;
    st.position.set(Math.sin(u * 6 + st.id) * 0.12 + (s.k === 'fish' ? 0.3 : 0), (s.k === 'fish' ? 1.8 : 1.2) + u * 1.2, Math.cos(u * 5) * 0.1 - (s.k === 'fish' ? 0.2 : 0));
    st.scale.setScalar(0.1 + u * 0.25);
  }
}

// ---------- the ledge, the counter and the soup bar ----------
const MAKE: Record<Ing, () => Mesh> = { rice: newReadyRice, fish: newCuredFish, mush: newMushroom };
/** How each ingredient's laid out in its tray on the ledge, square to it: so many across, so many deep, layer on layer
 *  (`w`, `d` and `h` apart), lying the long way (`turn`) or not. Fish fillets are two piles of four, laid along the tray. */
const TRAY: Record<Ing, { across: number; deep: number; w: number; d: number; h: number; turn: number }> = {
  rice: { across: 2, deep: 2, w: 0.25, d: 0.22, h: 0.09, turn: 0 },
  fish: { across: 2, deep: 1, w: 0.33, d: 0, h: 0.08, turn: Math.PI / 2 },
  mush: { across: 4, deep: 2, w: 0.13, d: 0.18, h: 0.08, turn: 0 },
};
/** The top of the ledge's trays, and the middle of them front to back (cellar.ts lays them in front of the hearth). */
const TRAY_TOP = HEARTH.h * 0.75 + 0.055, TRAY_Z = HEARTH.z + HEARTH.d / 2 + 0.3;
/** The ledge's things a shade darker than anywhere else: they sit right under the hearth's lamp, and lit full by it,
 *  they glared. A darker copy of each material (made once, off the game's luck), put back on after the item changes its
 *  look for the graphics (items.ts) as well. */
const dimmed = new Map<Material, Material>(), dark = new Set<Material>();
function dimOne(m: Mesh) {
  const was = m.material as Material;
  if (Array.isArray(m.material) || dark.has(was)) return;
  let d = dimmed.get(was);
  if (!d) { d = quietly(() => was.clone()); (d as MeshLambertMaterial).color?.multiplyScalar(0.45); dimmed.set(was, d); dark.add(d); }
  m.material = d;
}
const dim = (o: Object3D) => o.traverse(c => {
  const m = c as Mesh;
  if (!m.isMesh) return;
  dimOne(m);
  const wear = m.onBeforeRender;
  m.onBeforeRender = function (...a) { wear.apply(this, a); dimOne(m); };
});
/** What's on the ledge: up to eight of each, in its own tray, the bottom layer filled first. */
const ledge = Object.fromEntries((['rice', 'fish', 'mush'] as const).map(k => [k, Array.from({ length: 8 }, (_, j) => {
  const m = add(cellar, MAKE[k]()), t = TRAY[k], n = t.across * t.deep, i = j % n;
  dim(m);
  const col = i % t.across, row = Math.floor(i / t.across), half = 0.045;
  m.position.set(LEDGE[k].x + (col - (t.across - 1) / 2) * t.w, CY + TRAY_TOP + half + Math.floor(j / n) * t.h, TRAY_Z + (row - (t.deep - 1) / 2) * t.d);
  m.rotation.y = t.turn;
  m.visible = false;
  return m;
})])) as Record<Ing, Mesh[]>;
/** Bowls set out somewhere: a grid of them, plain and mushroom, `cap` of each, `scale` their size, shown as the line
 *  says. */
function bowlRows(cap: number, at: (j: number) => Vector3, scale = 1) {
  return [false, true].map(mush => Array.from({ length: cap }, (_, j) => {
    const b = add(cellar, newBowl(mush)); b.position.copy(at(j)); b.scale.setScalar(scale); b.visible = false; return b;
  }));
}
const counterBowls = bowlRows(COUNTER_CAP, j => V(COUNTER.x - 0.25 + (j % 3) * 0.3, CY + 0.85 + Math.floor(j / 12) * 0.11, COUNTER.z - 0.55 + (Math.floor(j / 3) % 4) * 0.33));
/** The bowls out on the soup square: each in its place on the counters' tops, in the order they're filled (standing
 *  on the top: a bowl's half its height, at this size, over it). */
const ON_TOP = 0.045;
const barBowls = bowlRows(STALL_CAP, j => V(BAR_PLACES[j].x, CY + BAR.top + ON_TOP, BAR_PLACES[j].z), 0.78);
/** Steam off the bowls out on the square: a wisp over each of a few of them, spread along the line. */
const barSteam = Array.from({ length: 3 }, (_, j) => { const s = add(cellar, mesh(G.sphere, smoke, BAR.x, CY + BAR.top, BAR.z)); s.userData.t = j / 3; return s; });
function drawBarSteam(dt: number) {
  const n = F.stall.length;
  barSteam.forEach((s, j) => {
    // (the j-th wisp over the bowl a third of the way further along those out)
    const over = BAR_PLACES[Math.floor(((j + 0.5) / barSteam.length) * n)];
    s.visible = n > j;
    if (!s.visible) return;
    s.userData.t = (s.userData.t + dt * 0.3) % 1;
    const u = s.userData.t as number;
    s.position.set(over.x + Math.sin(u * 6 + s.id) * 0.06, CY + BAR.top + 0.12 + u * 0.8, over.z + Math.cos(u * 5 + s.id) * 0.06);
    s.scale.setScalar(0.05 + u * 0.15);
  });
}
/** Bowls ladled out of the pot (fight.ts' `poured`) and still flying to the counter: the newest of its line, hidden
 *  there until they land. */
let seen = -1, inAir = 0;
function serveBowls() {
  const n = F.counter.length;
  if (seen < 0 || poured.n < seen) seen = poured.n; // (a game just loaded, or a new cellar: nothing in the air)
  const fresh = Math.min(poured.n - seen, n);
  for (let t = 0; t < fresh; t++) {
    const j = n - fresh + t, m = F.counter[j], slot = counterBowls[m ? 1 : 0][j];
    if (!slot) continue;
    const b = add(cellar, newBowl(m));
    b.position.set(POT.x + (j % 3 - 1) * 0.2, CY + POT_TOP + 0.1, POT.z);
    b.name = 'potFlight';
    inAir++;
    fly(b, () => slot.position, 0.5, 1.1, () => { cellar.remove(b); inAir = Math.max(0, inAir - 1); });
  }
  seen = poured.n;
  inAir = Math.min(inAir, n);
  showBowls(counterBowls, F.counter.slice(0, n - inAir));
}
// ---------- the bowl slide ----------
/** The bowl slide (once it's bought): the bowls it sends (fight.ts' `slid`) drop off the bowl counter's north end into
 *  a hatch in the floor, ride a belt under the kitchen and the wall (glimpsed under its grates, underBelt.ts), and come
 *  up through a hatch in the soup square's floor by the north counter's end, onto the counter. Its way: the hatch it
 *  drops into, and the one it comes up through. */
// (square to the rooms: west under the hearth room, then north up the soup square's east side)
const SLIDE_PATH: XZ[] = [{ x: COUNTER.x, z: COUNTER.z - 0.9 }, { x: BAR.x1 - 0.45, z: COUNTER.z - 0.9 }, { x: BAR.x1 - 0.45, z: BAR.z0 + BAR.d + 0.3 }];
const SLIDE_UP = SLIDE_PATH[SLIDE_PATH.length - 1];
/** Bowls in the air on the way: off the counter into the hatch, and up out of the other onto the counter. */
const hops = apart(() => Array.from({ length: 12 }, (_, j) => {
  const b = add(cellar, newBowl(j % 2 === 1)); b.scale.setScalar(0.78); b.visible = false; return { b, mush: j % 2 === 1, busy: false };
}), dice(0x5711DF));
function slideHop(mush: boolean, from: Vector3, to: Vector3, dur: number, done?: () => void) {
  const h = hops.find(o => !o.busy && o.mush === mush);
  if (!h) { done?.(); return; }
  h.busy = true; h.b.position.copy(from); h.b.visible = true;
  fly(h.b, () => to, dur, 0.25, () => { h.busy = false; h.b.visible = false; done?.(); });
}
const slideBelt = apart(() => underBelt(SLIDE_PATH, CY, {
  speed: 3, clear: floorClear,
  arrive: m => slideHop(m, V(SLIDE_UP.x, CY, SLIDE_UP.z), V(SLIDE_UP.x, CY + BAR.top + ON_TOP, BAR.z0 + BAR.d / 2), 0.35),
}), dice(0x5711DE));
// (made on dice of their own, so loading draws from the game's luck just what it did before the slide; and centred on
// its first hatch, so it pops in from there)
export const slideParts = apart(() => {
  const g = add(cellar, new Group()), inner = add(g, new Group());
  g.position.set(SLIDE_PATH[0].x, CY, SLIDE_PATH[0].z); inner.position.set(-SLIDE_PATH[0].x, -CY, -SLIDE_PATH[0].z);
  inner.add(slideBelt.group, hatch(SLIDE_UP.x, SLIDE_UP.z, CY));
  g.visible = false;
  return g;
}, dice(0x5711E0));
/** The bowls on their way down the slide, under the floor, for tests. */
export const slideShows = () => slideBelt.riding();
let slidSeen = -1, dropT = 0;
function drawSlide(dt: number) {
  slideParts.visible = F.slide;
  if (slidSeen < 0 || slid.n < slidSeen) slidSeen = slid.n; // (a game just loaded: nothing on it)
  const fresh = Math.min(slid.n - slidSeen, F.stall.length);
  slidSeen = slid.n;
  // (more go down it a second, at its best, than there's room to draw: one in a while is shown dropping in)
  dropT -= dt;
  if (fresh && dropT <= 0) {
    dropT = 0.3;
    const mush = F.stall[F.stall.length - 1];
    slideHop(mush, V(COUNTER.x, CY + 0.86, COUNTER.z - 0.62), V(SLIDE_PATH[0].x, CY - 0.15, SLIDE_PATH[0].z), 0.3, () => slideBelt.send(mush));
  }
  slideBelt.update(dt);
}

/** The bowls out on the soup square, each in its own place on the counters: a mushroom bowl or a plain one, and whether
 *  it's sold (waiting there for the fan who bought it, on their way to the bar). When the fan gets there, the bowl
 *  nearest them hops into their hands. (A boss's big crowd is drawn a figure for a few fans: each who comes takes the
 *  bowls nobody else is coming for.) */
const onBar: ({ mush: boolean; sold: boolean } | null)[] = Array(STALL_CAP).fill(null);
let soldSeen = -1;
function drawBar() {
  const kept = onBar.filter(b => b && !b.sold).length;
  if (soldSeen < 0 || sold.n < soldSeen) soldSeen = sold.n; // (a game just loaded: nothing's owed)
  let bought = sold.n - soldSeen;
  soldSeen = sold.n;
  // bowls gone from the stall: the ones bought wait for their fan (the oldest out first, as the stall sells them);
  // any other way (a game loaded), they just go
  let gone = kept - F.stall.length;
  for (let j = 0; j < onBar.length && gone > 0; j++) {
    const b = onBar[j];
    if (!b || b.sold) continue;
    if (bought > 0 && F.bout.phase === 'prep') { b.sold = true; bought--; } else onBar[j] = null;
    gone--;
  }
  // and bowls put out on the stall go in the first free places, in the order they were put out
  for (let k = Math.min(kept, F.stall.length); k < F.stall.length; k++) {
    const j = onBar.indexOf(null);
    if (j < 0) break;
    onBar[j] = { mush: F.stall[k], sold: false };
  }
  // the fans just at the bar: each takes the sold bowl nearest them, and any no one else is coming for
  const owed = () => onBar.reduce((n, b) => n + (b?.sold ? 1 : 0), 0);
  const here = turnedAt();
  for (let i = 0; i < here.length; i++) {
    const f = here[i], spare = Math.max(1, Math.ceil((owed() - heading()) / (here.length - i)));
    for (let s = 0; s < spare; s++) {
      let best = -1, bd = Infinity;
      onBar.forEach((b, j) => { if (b?.sold) { const d = Math.hypot(BAR_PLACES[j].x - f.x, BAR_PLACES[j].z - f.z); if (d < bd) { bd = d; best = j; } } });
      if (best < 0) break;
      hop(onBar[best]!.mush, best, f.key, s * 0.07);
      onBar[best] = null;
    }
  }
  // (once the stall shuts, anything still waiting is cleared away)
  if (F.bout.phase !== 'prep') onBar.forEach((b, j) => { if (b?.sold) onBar[j] = null; });
  barBowls.forEach(r => r.forEach(b => { b.visible = false; }));
  onBar.forEach((b, j) => { if (b) barBowls[b.mush ? 1 : 0][j].visible = true; });
}
/** A bowl hopping from its place on the counter into fan `key`'s hands, `wait` seconds from now. */
function hop(mush: boolean, j: number, key: number, wait: number) {
  const b = add(cellar, newBowl(mush)), to = V(0, 0, 0);
  b.position.copy(barBowls[0][j].position); b.scale.setScalar(0.78);
  const hands = () => { const f = fanAt(key); if (f) to.set(f.x, CY + 0.85, f.z); return to; };
  hands();
  fly(b, hands, 0.32 + wait, 0.45, () => cellar.remove(b));
}
function showBowls(rows: Mesh[][], line: boolean[]) {
  rows.forEach(r => r.forEach(b => { b.visible = false; }));
  line.forEach((m, j) => { const b = rows[m ? 1 : 0][j]; if (b) b.visible = true; });
}

// ---------- the pot ----------
const SOUP: Record<Ing, [number, number, number]> = { rice: [239, 230, 207], fish: [233, 138, 107], mush: [140, 101, 66] };
const steam = Array.from({ length: 6 }, (_, j) => { const s = add(cellar, mesh(G.sphere, smoke, POT.x, CY + POT_TOP, POT.z)); s.userData.t = j / 6; s.name = 'potSteam'; return s; });
/** The stew: the bowls in the pot, cooked and not yet ladled out; empty once they're all out, brimming when it's full. */
const potFill = potMesh.getObjectByName('potFill')!;
/** Where the stew stands with none left: on the pot's floor, so the last bowl's worth sinks away rather than vanishing. */
const POT_LOW = HEARTH.h + 0.115;
/** How high the stew's drawn (0 to 1): up at once as a batch goes in, down no faster than this a second. */
let stewK = 0;
const STEW_FALL = 0.3;
/** The tally tag hung on the pot's front, saying how many bowls are in it (unlit, so the fire can't wash it out). */
const tallyCv = document.createElement('canvas'); tallyCv.width = 192; tallyCv.height = 96;
const tallyTex = new CanvasTexture(tallyCv);
const tally = add(potMesh, new Mesh(new PlaneGeometry(0.62, 0.31), new MeshBasicMaterial({ map: tallyTex, transparent: true })));
tally.position.set(0, HEARTH.h + 0.48, 0.93); tally.rotation.x = -0.25; tally.name = 'potTally';
const cord = add(potMesh, mesh(G.box, 0x3E3E44, 0, HEARTH.h + 0.67, 0.89)); cord.scale.set(0.02, 0.1, 0.02); cord.name = 'potCord';
let tallyN = -1;
function drawTally(n: number) {
  tally.visible = cord.visible = n > 0;
  if (n === tallyN) return;
  tallyN = n;
  const c = tallyCv.getContext('2d')!;
  c.clearRect(0, 0, 192, 96);
  c.fillStyle = '#3A2616'; c.beginPath(); c.roundRect(4, 4, 184, 88, 16); c.fill();
  c.fillStyle = '#5C3C22'; c.beginPath(); c.roundRect(10, 10, 172, 76, 12); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 46px ' + FONT; c.fillText('🍲', 58, 50);
  c.fillStyle = '#FFF4DF'; c.font = '900 50px ' + FONT; c.fillText(String(n), 128, 52);
  tallyTex.needsUpdate = true;
}
function drawPot(dt: number) {
  const ready = F.pot.length;
  stewK = Math.max(Math.min(1, ready / POT_CAP), stewK - STEW_FALL * dt);
  potFill.visible = stewK > 0.002;
  const y = POT_LOW + (POT_TOP - POT_LOW) * stewK;
  // the pot narrows towards its foot, so the stew does too
  const r = 0.66 + 0.2 * (y - HEARTH.h - 0.08) / 0.56 - 0.05;
  potFill.position.y = y - POT_TOP; potFill.scale.set(Math.min(1, r / 0.8), 1, Math.min(1, r / 0.8));
  drawTally(ready);
  const ks = inPot();
  const mix = [0, 1, 2].map(i => ks.reduce((v, k) => v + SOUP[k][i] / 255 / ks.length, 0));
  potStew.color.setRGB(mix[0], mix[1], mix[2]);
  // steaming for a while after each batch
  const hot = F.cooked.length > 0 && F.t - F.cooked[F.cooked.length - 1] < 3;
  for (const s of steam) {
    s.visible = hot;
    if (!hot) continue;
    s.userData.t = (s.userData.t + dt * 0.35) % 1;
    const u = s.userData.t as number;
    s.position.set(POT.x + Math.sin(u * 7 + s.id) * 0.3, CY + POT_TOP + u * 1.9, POT.z + Math.cos(u * 5 + s.id) * 0.3);
    s.scale.setScalar(0.18 + u * 0.45);
  }
}

// ---------- the dumbwaiter ----------
// Each dumbwaiter's trays go round and round a loop: down the front, across the bottom, up the back and across the
// top, loaded with a sack of rice (or a fish) as they come over the top. At the bottom of the front, its hatch, each
// tips over a quarter turn towards the hall and drops its load onto the chute under the hatch, then rights itself on
// its way round; the load slides down the chute, faster as it goes, and off its lip into the store by the wall. (It
// never stops: what comes down is endless, and the stores and their trays never empty or fill.)
const LL = LIFT_LOOP, DOWN = LL.top - LL.bottom, ACROSS = LL.front - LL.back, LOOP = 2 * (DOWN + ACROSS), TRAYS = 4;
/** How much of the loop the tip takes, after it reaches the bottom: over, the drop, and back. */
const TIP = 0.5;
function loopAt(s: number) {
  s = ((s % LOOP) + LOOP) % LOOP;
  if (s < DOWN) return { y: LL.top - s, d: LL.front };
  if (s < DOWN + ACROSS) return { y: LL.bottom, d: LL.front - (s - DOWN) };
  if (s < 2 * DOWN + ACROSS) return { y: LL.bottom + (s - DOWN - ACROSS), d: LL.back };
  return { y: LL.top, d: LL.back + (s - 2 * DOWN - ACROSS) };
}
const MAKE_RAW = { rice: newRice, fish: newFillet };
const trays = (['rice', 'fish'] as const).flatMap(k => Array.from({ length: TRAYS }, (_, i) => {
  const g = add(cellar, new Group());
  // (a plank tray with a lip at the back, pivoting on its front edge, the hall's side)
  const pan = add(g, new Group());
  add(pan, mesh(G.box, 0xD9B98A, 0.2, 0, 0, true)).scale.set(0.4, 0.05, 0.62);
  add(pan, mesh(G.box, 0xB8955A, 0.39, 0.04, 0, false)).scale.set(0.03, 0.06, 0.62);
  const load = add(pan, MAKE_RAW[k]()); load.position.set(0.2, 0.07, 0);
  return { k, g, pan, s: (i * LOOP) / TRAYS, load, dropped: false };
}));
// what's in each store and on each tray by the wall: a little heap in each, laid flat, always there
for (const k of ['rice', 'fish'] as const) {
  // (on the tray, two side by side and two on them, lengthways along the wall, clear of the store's trough)
  const tray: [number, number, number, number][] = [[-0.02, 0.64, -0.15, 0.15], [-0.02, 0.64, 0.15, -0.1], [-0.04, 0.7, -0.08, 0.3], [-0.04, 0.7, 0.1, -0.25]];
  // (in the store: the rice's sacks heaped in the tub, over its brim; the fish laid on the crate's ice, side by side)
  const store: [number, number, number, number][] = k === 'rice'
    ? [[-0.12, 0.79, -0.08, 0.4], [0.13, 0.79, -0.05, 1.5], [-0.05, 0.79, 0.14, 2.6], [-0.03, 0.83, 0.02, 3.7]]
    : [[-0.17, 0.8, -0.05, 1.67], [0.17, 0.8, 0.06, 1.45], [-0.05, 0.84, 0.02, 1.8]];
  for (const [at, heap, turn] of [[BINS[k], tray, Math.PI / 2], [STORES[k], store, 0]] as const) {
    for (const [x, y, z, ry] of heap) {
      const m = add(cellar, MAKE_RAW[k]());
      m.position.set(at.x + x, CY + y, at.z + z); m.rotation.y = turn + ry;
    }
  }
}
function drawLift(dt: number) {
  for (const t of trays) {
    t.s = (t.s + dt * 0.55) % LOOP;
    const at = loopAt(t.s), lift = LIFTS[t.k];
    // (the shaft's front faces west, into the hall; the tray pivots on its west edge, and tips its back up)
    t.g.position.set(lift.x - at.d - 0.2, CY + at.y, lift.z);
    const tip = t.s - DOWN;
    const over = tip >= 0 && tip < TIP ? Math.sin((tip / TIP) * Math.PI) : 0;
    t.pan.rotation.z = over * (Math.PI / 2);
    // the load rides down and tips off onto the chute's top end, a hop down; the tray comes back up empty
    if (t.s < DOWN) { t.load.visible = true; t.dropped = false; }
    else if (!t.dropped && tip > TIP * 0.3) {
      t.dropped = true; t.load.visible = false;
      const m = add(cellar, MAKE_RAW[t.k]());
      t.load.getWorldPosition(m.position); m.rotation.set(0, 0, SLOPE);
      const x = CHUTE.from - 0.15, onto = V(x, CY + chuteY(x) + LIE, LIFTS[t.k].z);
      const k = t.k;
      fly(m, () => onto, 0.2, 0.06, () => sliding.push({ m, k, v: 0.25 }));
    }
  }
  // the chutes: what's on them slides down, picking up speed, and drops off the lip into the store
  for (let i = sliding.length - 1; i >= 0; i--) {
    const it = sliding[i], m = it.m;
    it.v = Math.min(SLIDE_MAX, it.v + SLIDE_PULL * dt);
    m.position.x -= dt * it.v * Math.cos(SLOPE);
    m.position.y = CY + chuteY(m.position.x) + LIE;
    if (m.position.x <= CHUTE.to) {
      sliding.splice(i, 1);
      const into = V(STORES[it.k].x, CY + 0.76, m.position.z);
      fly(m, () => into, 0.22, 0.04, () => cellar.remove(m));
    }
  }
}
/** The chutes' slope, and how high off a chute's bed what slides down it lies (its middle). */
const SLOPE = Math.atan2(CHUTE.y0 - CHUTE.y1, CHUTE.from - CHUTE.to), LIE = 0.045;
/** How fast what's on a chute picks up speed down it (gravity, less the boards' rub), the most it gets to, and
 *  what's sliding. */
const SLIDE_PULL = 2.2, SLIDE_MAX = 1.8;
const sliding: { m: Object3D; k: 'rice' | 'fish'; v: number }[] = [];

// ---------- the crew ----------
/** How each hire looks. */
const DRESS: Record<Role, () => Person> = {
  washer: () => { const p = belowGround(new Person(0xD8B65A)); p.headband(0xFFFFFF); return p; },
  salter: () => { const p = belowGround(new Person(0xC9774F)); p.headband(0x2B3A67); return p; },
  picker: () => belowGround(new Person(0x7FA35B, 'farmer')),
  cook: () => belowGround(new Person(0xF4F6F8, 'chef')),
  attendant: () => { const p = belowGround(new Person(0x8E6BB5)); p.headband(0xFFFFFF); return p; },
};
interface Hand { p: Person; key: string; load: Mesh[] }
const hands = new Map<Role, Hand>();
/** The cellar crew's clothes for the level bought, worn by every hire in place of their own (cellarLooks.ts), if any. */
let uniform: ((role: Role) => Person) | null = null;
/** Dresses every hire in what `make` makes (null: their own clothes again), there and then, where they stand: the hires
 *  as they now look, for the spotlight. */
export function dressCrew(make: ((role: Role) => Person) | null): Object3D[] {
  uniform = make;
  return [...hands].map(([role, h]) => {
    const p = add(cellar, make ? make(role) : DRESS[role]());
    p.position.copy(h.p.position); p.rotation.copy(h.p.rotation);
    h.p.removeFromParent();
    // (what they carry goes with the old clothes: it's put in the new ones' arms next frame)
    h.p = p; h.key = ''; h.load = [];
    return p;
  });
}
/** What a hire's carrying, as meshes in their arms: up to eight of it. */
function loadFor(w: Worker): [string, () => Mesh, number] {
  const c = w.carry;
  if (!c) return ['', newRice, 0];
  if (c.k === 'bowl') return ['bowl' + c.bowls.length, () => newBowl(c.bowls[0]), Math.min(8, c.bowls.length)];
  const make = c.ready ? MAKE[c.k] : c.k === 'rice' ? newRice : newFillet;
  return [`${c.k}${c.ready}${c.n}`, make, Math.min(8, c.n)];
}
/** A hire as drawn: made the first time they're wanted, where they stand. */
function handOf(w: Worker) {
  const role = w.role as Role;
  let h = hands.get(role);
  if (!h) {
    const p = add(cellar, uniform ? uniform(role) : DRESS[role]());
    p.position.set(w.x, CY, w.z);
    h = { p, key: '', load: [] };
    hands.set(role, h);
  }
  return h;
}
function drawCrew(dt: number) {
  for (const w of F.crew) {
    if (w.role === 'you') continue;
    const h = handOf(w), p = h.p;
    p.position.set(w.x, CY, w.z);
    if (w.moving) p.rotation.y = w.h;
    else if (w.cooking > 0) p.rotation.y = Math.PI;
    const [key, make, n] = loadFor(w);
    if (key !== h.key) {
      h.key = key;
      h.load.forEach(m => p.remove(m));
      h.load = Array.from({ length: n }, (_, j) => { const m = add(p, make()); m.position.set(0, 0.5 + j * 0.085, 0.42); return m; });
    }
    animPerson(p, w.moving, dt, n > 0);
    if (w.cooking > 0) p.arms[1].rotation.x = -1.4 + Math.sin(F.t * 8) * 0.4;
  }
}
/** The Person for a hire, if they're in (for tests and pointing at them). */
export const crewPerson = (role: Role) => hands.get(role)?.p ?? null;
/** What a cellar upgrade's just built, as drawn, for its moment on camera (ring.ts): a line's newest machine (or, `all`,
 *  every one it has: an upgrade swaps them all), or a new hire, there at once where they start. */
export function built(what: { line: Ing; all?: boolean } | { role: Role }): Object3D[] {
  if ('role' in what) {
    const w = F.crew.find(c => c.role === what.role);
    return w ? [handOf(w).p] : [];
  }
  const n = F.lines[what.line].n;
  return slots.filter(s => s.k === what.line && (what.all ? s.i < n : s.i === n - 1)).map(s => s.g);
}

// ---------- bubbles ----------
/** A white speech bubble with `text` in it (an emoji and a question mark). */
function bubble(text: string) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 58, 52, 0, 7); c.fill();
  c.beginPath(); c.moveTo(52, 104); c.lineTo(64, 124); c.lineTo(76, 104); c.fill();
  c.font = '800 46px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  c.fillText(text, 64, 60);
  const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(cv), depthTest: false }));
  s.renderOrder = 5; s.visible = false; s.scale.setScalar(0.8);
  cellar.add(s);
  return s;
}
const potAsks: Record<Ing, Sprite> = { rice: bubble('🌾?'), fish: bubble('🐟?'), mush: bubble('🍄?') };
const barAsk = bubble('🍲?');
/** Seconds the pot has waited on what it's waiting on, and the bar stood empty with fans at it. */
let waitT = 0, dryT = 0;
const SHOW_AFTER = 1.5;
function drawBubbles(dt: number) {
  const want = potWaits();
  waitT = want ? waitT + dt : 0;
  for (const [k, s] of Object.entries(potAsks) as [Ing, Sprite][]) {
    s.visible = k === want && waitT > SHOW_AFTER;
    s.position.set(POT.x, CY + 2.6, POT.z);
  }
  const hungry = F.bout.phase === 'prep' && (F.rush ? !F.rush.done : F.queue.length > 0) && !F.stall.length;
  dryT = hungry ? dryT + dt : 0;
  // (over the square's middle, by its name board)
  barAsk.visible = dryT > SHOW_AFTER;
  barAsk.position.set(BAR.x, CY + 3.3, BAR.z);
}
/** The pot as drawn, for tests: how high the stew stands (0 empty, 1 brimming), the number on its tag (0: none up),
 *  and how many bowls have landed on the counter (the rest still in the air). */
export const potShows = () => ({
  stew: potFill.visible ? (potFill.position.y + POT_TOP - POT_LOW) / (POT_TOP - POT_LOW) : 0,
  tag: tally.visible ? tallyN : 0,
  landed: F.counter.length - inAir,
});
/** The bowls out on the soup square, for tests: the ones for sale, and the ones sold and waiting for their fan. */
export const barShows = () => ({ out: onBar.filter(b => b && !b.sold).length, waiting: onBar.filter(b => b?.sold).length });
/** Which bubbles are up, for tests: the pot's ask, and whether the bar's asking. */
export const bubbles = () => ({ pot: (Object.keys(potAsks) as Ing[]).find(k => potAsks[k].visible) ?? null, bar: barAsk.visible });

// ---------- every frame ----------
export function updRingKitchen(dt: number) {
  for (const s of slots) drawSlot(s, dt);
  for (const mk of machineMarks) {
    const n = F.lines[mk.k].n, at = machinePad(mk.k, mk.i, n);
    mk.m.visible = mk.i < n;
    mk.m.position.x = at.x; mk.m.position.z = at.z;
  }
  for (const k of ['rice', 'fish', 'mush'] as const) ledge[k].forEach((m, j) => { m.visible = j < F.pantry[k]; });
  serveBowls();
  drawSlide(dt);
  drawBar();
  drawBarSteam(dt);
  drawPot(dt);
  drawLift(dt);
  drawCrew(dt);
  drawBubbles(dt);
}
/** Where a ready ingredient lands on the ledge, and the `j`-th bowl out on the soup square (in its place), for things
 *  flying there. */
export const ledgeAt = (k: Ing) => V(LEDGE[k].x, CY + TRAY_TOP + 0.1, TRAY_Z);
export const barAt = (j: number) => { const h = BAR_PLACES[Math.max(0, Math.min(j, STALL_CAP - 1))]; return V(h.x, CY + BAR.top + 0.1, h.z); };
export const counterAt = () => V(COUNTER.x, CY + 0.9, COUNTER.z);
export const machineSpot = (k: Ing, i: number) => { const m = machineAt(k, i); return V(m.x, CY + 0.9, m.z); };
