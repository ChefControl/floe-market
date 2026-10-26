// A voting booth in her front yard for Israel's election day (flags.ts ELECTION_DAYS, or ?vote=on): a curtained booth
// in blue and white, a ballot box marked 🗳️ on a table beside it, small Israeli flags on its roof and a string of
// blue-and-white bunting from the street lamp to the booth and on to her house. Walking up to it, a bubble says every
// vote counts. Nothing else: no money, no items, nothing saved. It's for voting itself, not for anyone on the ballot.
// Off those days nothing of it is built, so the game is just as it was.
import { BoxGeometry, CylinderGeometry, Group, MeshLambertMaterial, PlaneGeometry } from 'three';
import { votingBoothOn } from './flags';
import { drawIcon } from './icons';
import { apart, Build, detail, dice, K, rbox, seasonLayer } from './kit';
import { level, pushOutOfBox } from './layout';
import { C } from './palette';
import { player } from './player';
import { bakePainted, canvasTex, mesh, painted, type Part, rr, scene } from './render';
import { bubble } from './speech';
import { FY, type XZ } from './util';

// ---------- layout ----------
/** The booth, in the south-east corner of her yard, off the circle and the presents' side, its curtains facing the
 *  camera: `w` wide (x), `d` deep and `h` tall to its roof. */
export const BOOTH = { x: 22.95, z: 4.35, w: 0.95, d: 0.8, h: 1.95 };
/** The table with the ballot box, west of the booth, in front of the street lamp. */
export const BALLOT = { x: 21.95, z: 4.3, w: 0.5, d: 0.42 };
/** How close to the booth's sides the player has to be for its bubble. */
const NEAR = 0.5;
/** What the bubble says. */
export const LINE = 'Every vote counts!';
/** The flag's own blue. */
const BLUE = 0x0038B8;

// ---------- the booth ----------
/** A block, `w` by `h` by `d`, painted `c`, its middle at (x, y, z), turned `ry` about the vertical and `rz` across. */
type Block = { w: number; h: number; d: number; c: number; x: number; y: number; z: number; ry: number; rz: number };

/** What both settings draw, about the booth's foot: the booth, the table and its ballot box, and the flags. */
function shapes() {
  const { w: W, d: D, h: H } = BOOTH, out: Block[] = [];
  const s = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, ry = 0, rz = 0) => out.push({ w, h, d, c, x, y, z, ry, rz });
  // the booth: a low step, a white post at each corner, white walls round three sides with two blue stripes, like the
  // flag's, a shelf inside to fill in the slip, a blue roof, and a white pelmet across the front with a blue stripe
  s(W + 0.04, 0.05, D + 0.04, C.enamel, 0, 0.025, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s(0.05, H - 0.05, 0.05, C.snow, sx * (W / 2 - 0.025), 0.05 + (H - 0.05) / 2, sz * (D / 2 - 0.025));
  s(W - 0.05, 1.45, 0.025, C.snow, 0, 1.025, -D / 2 + 0.02);
  for (const sx of [-1, 1]) s(0.025, 1.45, D - 0.05, C.snow, sx * (W / 2 - 0.02), 1.025, 0);
  for (const y of [0.55, 1.5]) {
    s(W - 0.05, 0.09, 0.035, BLUE, 0, y, -D / 2 + 0.02);
    for (const sx of [-1, 1]) s(0.035, 0.09, D - 0.05, BLUE, sx * (W / 2 - 0.02), y, 0);
  }
  s(W - 0.1, 0.03, 0.25, C.snow, 0, 1.0, -D / 2 + 0.16);
  s(W + 0.12, 0.06, D + 0.12, BLUE, 0, H + 0.03, 0);
  s(W - 0.05, 0.2, 0.03, C.snow, 0, H - 0.1, D / 2 - 0.015);
  s(W - 0.05, 0.04, 0.036, BLUE, 0, H - 0.1, D / 2 - 0.015);
  // the table beside it (along x from the booth), and the ballot box on it: white, a blue lid with its slot
  const tx = BALLOT.x - BOOTH.x, tz = BALLOT.z - BOOTH.z;
  s(BALLOT.w, 0.04, BALLOT.d, C.snow, tx, 0.72, tz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) s(0.035, 0.7, 0.035, C.slate, tx + sx * (BALLOT.w / 2 - 0.04), 0.35, tz + sz * (BALLOT.d / 2 - 0.04));
  s(0.38, 0.32, 0.3, C.enamel, tx, 0.9, tz);
  s(0.42, 0.04, 0.34, BLUE, tx, 1.08, tz);
  s(0.2, 0.012, 0.03, C.ink, tx, 1.1, tz);
  // a flag on a stick at each front corner of the roof, flying outward: white, its two blue stripes, and the Star of
  // David between them, two triangles of thin bars
  for (const sx of [-1, 1]) {
    const px = sx * (W / 2 + 0.03), pz = D / 2 + 0.03;
    s(0.018, 0.5, 0.018, C.steel, px, H + 0.3, pz);
    const fx = px + sx * 0.16, fy = H + 0.41;
    s(0.3, 0.22, 0.01, C.snow, fx, fy, pz);
    for (const k of [-1, 1]) s(0.3, 0.033, 0.014, BLUE, fx, fy + k * 0.0735, pz);
    const R = 0.042;
    for (const turn of [0, Math.PI]) {
      for (let i = 0; i < 3; i++) {
        const a = turn + Math.PI / 2 + Math.PI + i * Math.PI * 2 / 3; // each side's middle, opposite a corner
        s(R * Math.sqrt(3) + 0.008, 0.008, 0.014, BLUE, fx + Math.cos(a) * R / 2, fy + Math.sin(a) * R / 2, pz, 0, a + Math.PI / 2);
      }
    }
  }
  return out;
}

/** The bunting's cord, from the street lamp to the booth's west side and from its east side to her front wall (all
 *  about the booth's foot): each run's ends, sagging between. */
const RUNS: [number, number, number][][] = [
  [[-1.29, 2.2, -0.87], [-BOOTH.w / 2 - 0.06, BOOTH.h + 0.02, 0]],
  [[BOOTH.w / 2 + 0.06, BOOTH.h + 0.02, 0], [1.42, 2.25, 0.3]],
];
/** A pennant: a three-sided slab, one corner down, its top edge level, 0.07 to its corners. */
const PENNANT_R = 0.07;
/** The bunting: the cord in short straight lengths (a box each, along x: length, then where, then its turn) and the
 *  pennants hanging from it (where, then its turn), blue and white in turn. */
function bunting() {
  const cord: [len: number, x: number, y: number, z: number, ry: number, rz: number][] = [];
  const flags: [x: number, y: number, z: number, ry: number, c: number][] = [];
  let n = 0;
  for (const [a, b] of RUNS) {
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]), ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    const pt = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.16 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    const STEPS = 6;
    for (let i = 0; i < STEPS; i++) {
      const p = pt(i / STEPS), q = pt((i + 1) / STEPS), h = span / STEPS, dy = q[1] - p[1];
      cord.push([Math.hypot(h, dy), (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, ry, Math.atan2(dy, h)]);
    }
    const k = Math.max(2, Math.round(span / 0.17));
    for (let i = 1; i < k; i++) {
      const [x, y, z] = pt(i / k);
      flags.push([x, y - PENNANT_R / 2 - 0.006, z, ry, n++ % 2 ? C.snow : BLUE]);
    }
  }
  return { cord, flags };
}

function build() {
  const g = new Group();
  g.position.set(BOOTH.x, FY, BOOTH.z);
  scene.add(g);
  const box = new BoxGeometry(1, 1, 1), pennant = new CylinderGeometry(PENNANT_R, PENNANT_R, 0.006, 3).rotateX(Math.PI / 2);
  const { cord, flags } = bunting();
  // Low: plain boxes in flat colours, the curtains a flat blue panel each side, drawn back
  const lowParts: (Part & { c: number })[] = shapes().map(p => ({ geo: box, c: p.c, at: [p.x, p.y, p.z], rot: [0, p.ry, p.rz], scale: [p.w, p.h, p.d] }));
  const { w: W, d: D, h: H } = BOOTH, cy = 0.22 + (H - 0.42) / 2, ch = H - 0.42;
  for (const sx of [-1, 1]) lowParts.push({ geo: box, c: BLUE, at: [sx * 0.3, cy, D / 2 - 0.04], scale: [0.26, ch, 0.025] });
  for (const [len, x, y, z, ry, rz] of cord) lowParts.push({ geo: box, c: C.snow, at: [x, y, z], rot: [0, ry, rz], scale: [len, 0.012, 0.012] });
  for (const [x, y, z, ry, c] of flags) lowParts.push({ geo: pennant, c, at: [x, y, z], rot: [0, ry, 0] });
  const lo = new Group();
  lo.add(mesh(bakePainted(lowParts), painted, 0, 0, 0, true));
  // High: the same, bevelled, with the curtains in folds on a rod, tied back, a slip going into the ballot box, gold
  // finials on the flags' sticks, and snow on the roof in winter
  const hi = new Build(), thin = new Build(), snow = new Build();
  for (const p of shapes()) {
    const small = Math.min(p.w, p.h, p.d) < 0.02;
    (small ? thin : hi).add(small ? box : rbox(p.w, p.h, p.d, Math.min(0.012, Math.min(p.w, p.h, p.d) / 3)), p.c, p.x, p.y, p.z,
      [0, p.ry, p.rz], small ? [p.w, p.h, p.d] : undefined);
  }
  hi.add(rbox(W - 0.08, 0.02, 0.02, 0.006), C.steel, 0, H - 0.21, D / 2 - 0.045);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      // four folds a side, zigzagging, gathered in at the tie
      const x = sx * (0.2 + i * 0.065);
      hi.add(rbox(0.075, ch, 0.02, 0.008), BLUE, x, cy, D / 2 - 0.04 + (i % 2 ? 0.012 : -0.012), [0, (i % 2 ? 1 : -1) * 0.35, 0]);
    }
    hi.add(rbox(0.3, 0.035, 0.05, 0.012), C.snow, sx * 0.3, 1.0, D / 2 - 0.035);
    hi.add(K.dot, C.gold, sx * (W / 2 + 0.03), H + 0.56, D / 2 + 0.03, null, 0.02);
  }
  const tx = BALLOT.x - BOOTH.x, tz = BALLOT.z - BOOTH.z;
  thin.add(box, C.paper, tx + 0.02, 1.13, tz, [0, 0, 0.15], [0.11, 0.07, 0.004]);
  for (const [len, x, y, z, ry, rz] of cord) thin.add(box, C.snow, x, y, z, [0, ry, rz], [len, 0.012, 0.012]);
  for (const [x, y, z, ry, c] of flags) thin.add(pennant, c, x, y, z, [0, ry, 0]);
  snow.add(rbox(W + 0.1, 0.04, D + 0.1, 0.015), C.snow, 0, H + 0.075, 0);
  const high = new Group();
  high.add(hi.mesh(), thin.mesh(false), seasonLayer(snow.mesh(false), [1, 0, 0, 0]));
  g.add(lo, high);
  detail(lo, high);
  // 🗳️ on the ballot box's front, on both
  const label = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff'; rr(c, 4, 4, w - 8, h - 8, 18); c.fill();
    drawIcon(c, '🗳️', w / 2, h / 2, 100);
  });
  g.add(mesh(new PlaneGeometry(0.2, 0.2), new MeshLambertMaterial({ map: label.tex, transparent: true }), tx, 0.9, tz + 0.152));
  // its bubble, over the booth
  const says = bubble(scene, 2.2);
  return { g, says, near: false };
}
/** The booth, up on Israel's election day (null on any other): built off the game's luck, on dice of its own for the
 *  scenery's too, so neither moves on for it. */
export const booth = votingBoothOn() ? apart(build, dice(0x7E1EC7)) : null;

// ---------- walking up to it ----------
/** How far `p` is from the booth's sides (0 inside it). */
const fromBooth = (p: XZ) => Math.hypot(
  Math.max(0, Math.abs(p.x - BOOTH.x) - BOOTH.w / 2), Math.max(0, Math.abs(p.z - BOOTH.z) - BOOTH.d / 2));

/** The booth's bubble, each frame up in the world: said once each time the player walks up to it. */
export function updBooth(dt: number) {
  if (!booth) return;
  const near = !level.down && fromBooth(player.g.position) < NEAR;
  if (near && !booth.near) booth.says.say(LINE);
  booth.near = near;
  if (booth.says.text) booth.says.place(BOOTH.x, FY + BOOTH.h + 1.05, BOOTH.z);
  booth.says.upd(dt);
}

/** Keeps the player out of the booth and the table. */
export function collideBooth(p: XZ) {
  if (!booth) return;
  pushOutOfBox(p, BOOTH.x, BOOTH.z, BOOTH.w / 2 + 0.3, BOOTH.d / 2 + 0.3);
  pushOutOfBox(p, BALLOT.x, BALLOT.z, BALLOT.w / 2 + 0.3, BALLOT.d / 2 + 0.3);
}
