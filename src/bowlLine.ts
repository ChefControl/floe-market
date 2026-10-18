// The bowl line (stage 3): the bowl slide, once it's bought, the hearth room's conveyor. The bowl counter by the east
// wall goes, and in its place stands the line's motor, a squat steel drive box with a red flywheel turning on its side and
// its drive belt down through a slot into the floor; the bowls the pot ladles out drop into a steel hopper over the
// line's start by the hearth's east end, and ride a stretch of belt into a hood in the floor; under the hearth room
// (and the motor) and the arena's wall, to come up out of a hood on the ringside of the soup square's north counter,
// by the east wall (where the sake barrels stood, now further up the wall), and climb a cleated ramp onto the counter's
// top, where they're slid into their places. Mama Moray's turn off under the floor before it, and go on under the
// square and the arena's wall, up through the slot in her counter (resto.ts). The game's numbers are the counter's
// still (fight.ts): the bowls it held wait in the hopper and on the line, a few of them on show.
import { Group, type Mesh, type Object3D, type Vector3 } from 'three';
import { bowlTable, cellar, CY, lineRamp, POT_TOP } from './cellar';
import { BAR, BAR_PLACES, COUNTER, MAMA_COUNTER, POT, RISE } from './cellarPlan';
import { F, restoOpen } from './fight';
import { fly } from './holder';
import { newBowl } from './items';
import { apart, dice } from './kit';
import { KITCHEN, RESTO } from './layout';
import { G, mesh } from './render';
import { underBelt } from './underBelt';
import { V, type XZ } from './util';

const STEEL = 0x5E676E, STEEL_DARK = 0x33393D, HOLE = 0x0B0C0D, BRASS = 0xB8923A, HOUSING = 0x7E8890, PAINT = 0x8E2B2B;
/** Where the line starts (under the hopper, by the hearth's east end), and how it gets to the soup square: south under
 *  the hearth room by the east wall (under the motor), west under it and north, then west under the arena's wall to
 *  the ramp's foot, and south up it, its top over the north counter. Mama's turn off there, under the floor: south
 *  under the square and the arena's wall into her hall, and across under her counter's slot. */
const START = { x: COUNTER.x + 0.2, z: KITCHEN.z0 + 0.4 }, WEST = KITCHEN.x0 + 0.3, RAMP = lineRamp.at;
const LINE: XZ[] = [
  START, { x: START.x, z: COUNTER.z }, { x: WEST, z: COUNTER.z }, { x: WEST, z: RAMP.z0 }, { x: RAMP.x, z: RAMP.z0 },
  { x: RAMP.x, z: RAMP.z1 },
];
const HALL = (RESTO.z0 + MAMA_COUNTER.z0) / 2;
const TO_MAMA: XZ[] = [{ x: RAMP.x, z: RAMP.z0 }, { x: RAMP.x, z: HALL }, { x: RISE.x, z: HALL }, { x: RISE.x, z: RISE.z }];
/** How far along the line its `i`-th point is, plus `off`. */
const along = (i: number, off = 0) => LINE.slice(1, i + 1).reduce((s, q, j) => s + Math.hypot(q.x - LINE[j].x, q.z - LINE[j].z), 0) + off;
/** Where Mama's turn off, under the floor; and the ramp: up out of its hood, climbing to the counter's top. */
const FORK = along(4);
const line = apart(() => underBelt(LINE, CY, {
  speed: 3,
  stretches: [
    { from: 0, to: 0.85, down: true },
    { from: along(4, RAMP.foot - RAMP.z0), to: along(5), up: true, rise: BAR.top - 0.075 },
  ],
}), dice(0xB0371E));
const toMama = apart(() => underBelt(TO_MAMA, CY, { speed: 3, stretches: [] }), dice(0xB03720));

/** The hopper over the line's start the pot's bowls are ladled into, and how high its mouth is. */
const HOPPER = V(START.x, CY + 0.62, START.z + 0.25), HOPPER_TOP = 0.24;
/** The bowls waiting in the hopper (a few of what the counter's numbers hold), the line's motor's flywheel, and the
 *  bowls in the air: from the pot into the hopper, and off the line up onto the stall's counter. */
let tableUp = true, waitBowls: Object3D[] = [], wheel: Group | null = null, flights: { b: Object3D; mush: boolean; busy: boolean }[] = [];

/** All of the line (shown once it's bought): its stretches, the hopper and the motor; centred on the motor, so it
 *  pops in from there. */
export const lineParts = apart(() => {
  const g = new Group(), inner = new Group();
  cellar.add(g); g.add(inner);
  g.position.set(COUNTER.x, CY, COUNTER.z); inner.position.set(-COUNTER.x, -CY, -COUNTER.z);
  inner.add(line.group);
  const box = (p: Object3D, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, shadow = true) => {
    const o = mesh(G.box, c, x, y, z, shadow); o.scale.set(sx, sy, sz); p.add(o); return o;
  };
  // the hopper: an open steel funnel on two legs over the belt, its sides leaning out to a brass rim, dark inside
  const h = new Group(); h.position.copy(HOPPER); inner.add(h);
  const LEAN = 0.35, W = 0.56;
  for (const s of [-1, 1]) {
    const a = box(h, STEEL, s * (W / 2 - 0.04), HOPPER_TOP / 2, 0, 0.03, HOPPER_TOP + 0.04, W); a.rotation.z = -s * LEAN;
    const b = box(h, STEEL, 0, HOPPER_TOP / 2, s * (W / 2 - 0.04), W, HOPPER_TOP + 0.04, 0.03); b.rotation.x = s * LEAN;
    box(h, BRASS, s * (W / 2 + 0.005), HOPPER_TOP + 0.01, 0, 0.03, 0.02, W + 0.04, false);
    box(h, BRASS, 0, HOPPER_TOP + 0.01, s * (W / 2 + 0.005), W + 0.04, 0.02, 0.03, false);
    box(h, STEEL_DARK, s * 0.2, -0.29, 0, 0.04, 0.6, 0.04);
  }
  box(h, HOLE, 0, 0.01, 0, W - 0.22, 0.01, W - 0.22, false);
  waitBowls = [0, 1, 2].map(i => { const b = newBowl(false); b.scale.setScalar(0.78); b.position.set((i - 1) * 0.15, 0.05 + (i % 2) * 0.04, (i % 2) * 0.1 - 0.05); b.visible = false; h.add(b); return b; });
  // the motor, where the counter was: on a plinth, a steel drive box, a vent along it and a brass maker's plate, a
  // lamp on top; a flywheel on its west side, its drive belt down through a slot into the floor to the line
  const m = new Group(); g.add(m);
  box(m, STEEL_DARK, 0, 0.04, 0, 0.85, 0.08, 1.05);
  box(m, HOUSING, 0.15, 0.37, 0, 0.5, 0.58, 0.8);
  box(m, STEEL_DARK, 0.15, 0.67, 0, 0.54, 0.04, 0.84);
  for (let i = 0; i < 4; i++) box(m, STEEL_DARK, -0.105, 0.3 + i * 0.07, 0.15, 0.01, 0.025, 0.36, false);
  box(m, BRASS, -0.105, 0.42, -0.22, 0.012, 0.12, 0.2, false);
  const lamp = mesh(G.sphere, 0x7CFF8A, 0.3, 0.73, 0.28, false); lamp.scale.setScalar(0.05); m.add(lamp);
  // (the flywheel painted red, a brass rim and hub, so it reads turning)
  wheel = new Group(); wheel.position.set(-0.19, 0.42, -0.1); m.add(wheel);
  const rim = mesh(G.cyl, BRASS, 0, 0, 0, true) as Mesh; rim.scale.set(0.36, 0.07, 0.36); rim.rotation.z = Math.PI / 2; wheel.add(rim);
  const face = mesh(G.cyl, PAINT, -0.01, 0, 0, false); face.scale.set(0.31, 0.06, 0.31); face.rotation.z = Math.PI / 2; wheel.add(face);
  const hub = mesh(G.cyl, BRASS, -0.045, 0, 0, false); hub.scale.set(0.08, 0.04, 0.08); hub.rotation.z = Math.PI / 2; wheel.add(hub);
  for (let i = 0; i < 3; i++) { const sp = box(wheel, STEEL_DARK, -0.045, 0, 0, 0.015, 0.56, 0.06, false); sp.rotation.x = (i * Math.PI) / 3; }
  box(m, 0x1E2022, -0.17, 0.2, -0.12, 0.05, 0.42, 0.07);
  box(m, HOLE, -0.17, 0.085, -0.12, 0.09, 0.01, 0.16, false);
  // the bowls in the air
  flights = [false, true].flatMap(mush => Array.from({ length: 6 }, () => {
    const b = newBowl(mush); b.scale.setScalar(0.78); b.visible = false; cellar.add(b); return { b, mush, busy: false };
  }));
  g.visible = false;
  return g;
}, dice(0xB0371F));

function hop(mush: boolean, from: Vector3, to: () => Vector3, dur: number, done?: () => void, arc = 0.3) {
  const f = flights.find(o => !o.busy && o.mush === mush);
  if (!f) { done?.(); return; }
  f.busy = true; f.b.position.copy(from); f.b.visible = true;
  fly(f.b, to, dur, arc, () => { f.busy = false; f.b.visible = false; done?.(); });
}
/** Where a bowl ladled out of the pot lands: in the hopper. */
export const hopperAt = () => V(HOPPER.x, HOPPER.y + 0.08, HOPPER.z);
/** The north counter's places nearest the ramp's top, for the stall's bowls to be slid into off it. */
const NEAR = BAR_PLACES.map((q, j) => ({ q, j })).filter(({ q }) => q.z < BAR.z0 + BAR.d)
  .sort((a, b) => Math.abs(a.q.x - RAMP.x) - Math.abs(b.q.x - RAMP.x)).slice(0, 4);
let nearI = 0;
/** A bowl for the stall: out of the hopper, along the line, up the ramp and slid along the counter's top. */
export function lineToStall(mush: boolean) {
  line.send(mush, undefined, m => {
    const q = NEAR[nearI++ % NEAR.length].q;
    hop(m, V(RAMP.x, CY + BAR.top + 0.045, RAMP.z1), () => V(q.x, CY + BAR.top + 0.045, q.z), 0.25, undefined, 0.04);
  });
}
/** A bowl for Mama Moray's: ladled across from the pot into the hopper, along the line to where hers turn off, then
 *  on under the floor, `done` as it comes up under her counter's slot. */
export function lineToMama(done: () => void) {
  hop(false, V(POT.x + 0.4, CY + POT_TOP, POT.z), hopperAt, 0.5, () => line.send(false, FORK, () => toMama.send(false, undefined, done)));
}
/** The bowls on the line (for tests): all of them, or those going on to Mama's. */
export const lineShows = (mama = false) => (mama ? line.riding() - line.riding(line.length) + toMama.riding() : line.riding() + toMama.riding());
/** Whether the line's laid, and whether it takes bowls on to Mama's (once she's open). */
export const lineLaid = () => lineParts.visible;
export const mamaLeg = () => lineParts.visible && restoOpen();

/** Every frame, from ringKitchen.ts: the line shown once it's bought (the counter gone), its way on to Mama's once
 *  she's open; its flywheel turning, the hopper's bowls, and the bowls along it. */
export function updLine(dt: number) {
  lineParts.visible = F.slide;
  // (and the ramp's in the way once it's there: cellar.ts)
  lineRamp.up = F.slide;
  // (the counter's meshes hidden one by one, not its group: hidden, each drops out of the scenery's merged draws)
  if (bowlTable.g && tableUp !== !F.slide) { tableUp = !F.slide; bowlTable.g.traverse(o => { if ((o as Mesh).isMesh) o.visible = tableUp; }); }
  if (!F.slide) return;
  if (wheel) wheel.rotation.x -= dt * 5;
  const n = Math.min(F.counter.length, waitBowls.length);
  waitBowls.forEach((b, i) => { b.visible = i < n; });
  line.update(dt);
  toMama.update(dt);
}
