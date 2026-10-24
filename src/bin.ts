// The bins, beside the places things are picked up: walk up to one with your arms full and press E (or tap Toss, on a
// touch screen) to throw away everything you're carrying. Up in the world, steel kitchen bins that flip their lids open
// to take it all, with a clunk; down in the cellar's kitchen, old oil drums, open at the top.
import { BackSide, CylinderGeometry, FrontSide, Group, MeshLambertMaterial, TorusGeometry, type Vector3 } from 'three';
import { cellar, KITCHEN_BINS } from './cellar';
import { isTouch } from './hint';
import { fly } from './holder';
import { keyHeld } from './input';
import { level, pushOutOfBox, stage, type StageN, TERRACES } from './layout';
import { player } from './player';
import { G, mesh, scene } from './render';
import { toss as clunk } from './sfx';
import type { TipContent } from './ui';
import { d2xz, FY, V, type XZ } from './util';

interface Bin {
  at: Vector3;
  /** From which stage it's there, and whether it's down in the cellar. */
  stage: StageN;
  down: boolean;
  g: Group;
  /** The lid, hinged at the back, and how open it is (0 shut, 1 open), and for how long more it stays open. */
  lid: Group;
  open: number;
  hold: number;
}

/** How close to stand to a bin to use it. */
const NEAR = 1.1;

const part = (g: Group, geo: Parameters<typeof mesh>[0], c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
  const m = mesh(geo, c, x, y, z, true); m.scale.set(sx, sy, sz); g.add(m); return m;
};
/** A lid hinged at the back edge, `d` deep, at height `y`: what goes in it is placed from the hinge, forward. */
function hinge(g: Group, y: number, d: number) {
  const lid = new Group(); lid.position.set(0, y, -d / 2); g.add(lid);
  return lid;
}

/** A restaurant's kitchen bin: brushed steel, a pedal at the front, a lid that flips up. */
function pedal(g: Group) {
  const STEEL = 0xB8C0C8;
  g.add(mesh(new CylinderGeometry(0.27, 0.25, 0.72, 16), STEEL, 0, 0.36, 0, true));
  part(g, G.cyl, 0x8A939C, 0, 0.06, 0, 0.27, 0.06, 0.27);
  part(g, G.box, 0x5A626A, 0, 0.05, 0.3, 0.16, 0.03, 0.1);
  const lid = hinge(g, 0.73, 0.54);
  part(lid, G.cyl, 0xD0D6DC, 0, 0.02, 0.27, 0.28, 0.04, 0.28);
  part(lid, G.cyl, 0x8A939C, 0, 0.05, 0.27, 0.06, 0.03, 0.06);
  return lid;
}
/** The cellar's: an old oil drum, rusty, with two ribs, open at the top (dark inside, rubbish at the bottom), its lid
 *  long gone to lean against it. (Nothing to flip open, so its `lid` is an empty hinge.) */
function drum(g: Group) {
  const RUST = 0x8E4A2E, R = 0.32, H = 0.9;
  g.add(mesh(new CylinderGeometry(R, R, H, 18, 1, true), new MeshLambertMaterial({ color: RUST, side: FrontSide }), 0, H / 2, 0, true));
  g.add(mesh(new CylinderGeometry(R - 0.01, R - 0.01, H - 0.02, 18, 1, true), new MeshLambertMaterial({ color: 0x24140E, side: BackSide }), 0, H / 2, 0));
  g.add(mesh(new CylinderGeometry(R - 0.01, R - 0.01, 0.02, 18), 0x1A0E0A, 0, 0.12, 0));
  // its rolled rim, and the ribs round it
  const rim = mesh(new TorusGeometry(R, 0.022, 5, 20), 0x6E3A24, 0, H, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  for (const y of [0.3, 0.6]) {
    const r = mesh(new TorusGeometry(R + 0.005, 0.02, 5, 18), 0x5E2E1C, 0, y, 0); r.rotation.x = Math.PI / 2; g.add(r);
  }
  part(g, G.box, 0xC9A23A, 0, 0.62, R, 0.22, 0.12, 0.01);
  // rubbish in the bottom: a crumpled paper, a fish bone, a chopstick
  part(g, G.sphere, 0xE8E4D8, -0.08, 0.17, 0.05, 0.07, 0.05, 0.07);
  part(g, G.box, 0xD9D2C0, 0.08, 0.15, -0.06, 0.16, 0.02, 0.03);
  part(g, G.box, 0xB08A5A, 0, 0.15, 0.1, 0.02, 0.02, 0.22).rotation.y = 0.7;
  // the lid, leaning on its side
  const lid = part(g, G.cyl, 0x5E2E1C, R + 0.1, 0.3, 0.1, 0.34, 0.03, 0.34); lid.rotation.set(0.15, 0, Math.PI / 2 - 0.25);
  return hinge(g, H, 0.64);
}

function bin(at: Vector3, s: StageN, down: boolean, make: (g: Group) => Group, turn: number): Bin {
  const g = new Group(); g.position.copy(at); g.rotation.y = turn;
  const lid = make(g);
  (down ? cellar : scene).add(g);
  return { at, stage: s, down, g, lid, open: 0, hold: 0 };
}
/** Beside the places things are picked up: on the dock, the fish pile (behind it, by the water: out of the way to the
 *  counter, and well away from Mr. Fugu's hatch, and
 *  none by the harpoon at the fishing spot); on the farm path (stage 2), the farmer's stack of rice and the patch; in the cellar's kitchen (stage
 *  3), old oil drums by the arena's door and the dumbwaiter's crate. Each far enough from its
 *  station that the station's own tip still shows there. */
export const BINS: Bin[] = [
  bin(V(3.1, FY, -6.0), 1, false, pedal, -0.4),
  bin(V(-11.7, 0.06, -2.6), 2, false, pedal, Math.PI / 2),
  // (the patch's: on the corner of the bottom terrace by the path, past the patch's last clump, so the path stays clear
  // to the fertilizer shed's yard)
  bin(V(-12.65, TERRACES[0].top, 4.7), 2, false, pedal, Math.PI / 2),
  ...KITCHEN_BINS.map((at, i) => bin(at, 3, true, drum, 0.6 + i)),
];

/** The bin the player's standing at, if any (on their level, and there in this stage). */
export const binAt = (p: XZ) => BINS.find(b => b.down === level.down && stage.n >= b.stage && d2xz(p, b.at) < NEAR * NEAR) ?? null;

/** Throws everything the player's carrying into `b`. */
export function toss(b: Bin) {
  let i = 0;
  while (player.back.items.length) {
    const m = player.back.take()!;
    fly(m, () => V(b.at.x, b.at.y + 0.8, b.at.z), 0.28 + i * 0.015, 0.5, () => scene.remove(m));
    i++;
  }
  if (!i) return;
  player.back.layout(player.h);
  b.hold = 0.7;
  clunk(b.at);
}

const TIP: TipContent = { name: 'Bin', desc: isTouch() ? "Tap Toss to throw away what you're carrying" : "Press E to throw away what you're carrying" };
/** The bin's tip, when the player's at one with something in their arms. */
export const binTip = (p: XZ) => (player.back.n && binAt(p) ? TIP : null);

/** Keeps the player out of the bins up in the world (the cellar's is one of cellar.ts's boxes). */
export function collideBins(p: XZ) {
  for (const b of BINS) if (!b.down && stage.n >= b.stage) pushOutOfBox(p, b.at.x, b.at.z, 0.6, 0.6);
}

// ---------- every frame ----------
const btn = document.getElementById('toss')!;
const touch = isTouch();
btn.addEventListener('pointerdown', e => {
  e.preventDefault();
  const b = binAt(player.g.position);
  if (b) toss(b);
});
btn.addEventListener('contextmenu', e => e.preventDefault());
let wasE = false;

export function updBins(dt: number) {
  for (const b of BINS) {
    b.g.visible = stage.n >= b.stage;
    b.hold = Math.max(0, b.hold - dt);
    b.open += ((b.hold > 0 ? 1 : 0) - b.open) * Math.min(1, dt * (b.hold > 0 ? 16 : 6));
    b.lid.rotation.x = -b.open * 1.7;
  }
  const at = player.held ? null : binAt(player.g.position), full = player.back.n > 0;
  btn.hidden = !(touch && at && full);
  // E pressed (not held: a held E is for buying, on a tile)
  const e = keyHeld('e');
  if (e && !wasE && at && full) toss(at);
  wasE = e;
}
