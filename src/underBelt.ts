// A belt under the cellar's floor (stage 3): the bowl slide's, from the bowl counter to the soup square (ringKitchen.ts),
// and Mama Moray's, from the hearth to her counter (resto.ts). Its way in is a hatch in the floor, a steel frame round
// a dark hole the bowls drop into; on the way, flush steel grates over it where nothing stands and nobody's coming
// through a door, and under each, the bowls going by, glimpsed between its bars. Where it comes up is the caller's.
// Nothing of it stands in anyone's way: all of it's flat in the floor.
import { Group, type Mesh, type Object3D } from 'three';
import { cellarBoxes } from './cellar';
import { BAR_PAD, BIN_PADS, COUNTER_PAD, GONG_PAD, type Pad, POT_PAD, WATCH } from './cellarPlan';
import { DOORS, ROOMS } from './layout';
import { G, mesh } from './render';
import type { XZ } from './util';

const STEEL = 0x9AA4AC, STEEL_DARK = 0x4B5257, HOLE = 0x0B0C0D, GLIMPSE = 0x3A2C24;
/** How high over the floor its hatch and grates lie (clear of the floor's own looks, under a foot), and a grate's
 *  size: along the belt, and across it. */
const FLUSH = 0.035, GRATE = { along: 0.62, across: 0.46 };

/** A hatch in the floor at (x, z), the floor at `y`, turned `ry`: a steel frame round a dark hole. */
export function hatch(x: number, z: number, y: number, ry = 0) {
  const g = new Group();
  const plate = (c: number, ox: number, oz: number, h: number, sx: number, sy: number, sz: number) => {
    const o = mesh(G.box, c, ox, y + h, oz, false); o.scale.set(sx, sy, sz); g.add(o);
  };
  g.position.set(x, 0, z); g.rotation.y = ry;
  plate(HOLE, 0, 0, FLUSH - 0.01, 0.42, 0.01, 0.42);
  for (const s of [-1, 1]) { plate(STEEL, s * 0.23, 0, FLUSH, 0.05, 0.02, 0.5); plate(STEEL, 0, s * 0.23, FLUSH, 0.5, 0.02, 0.05); }
  return g;
}

/** Whether a grate can lie at `p`: on a room's floor (not under a wall), under nothing that stands, a metre clear of
 *  every doorway, and off the circles where the player stands to work. */
export function floorClear(p: XZ) {
  const M = 0.45;
  if (!Object.values(ROOMS).some(r => p.x > r.x0 + M && p.x < r.x1 - M && p.z > r.z0 + M && p.z < r.z1 - M)) return false;
  if (cellarBoxes().some(([cx, cz, hx, hz]) => Math.abs(p.x - cx) < hx + 0.1 && Math.abs(p.z - cz) < hz + 0.1)) return false;
  if (DOORS.some(d => p.x > d.x0 - 1 && p.x < d.x1 + 1 && p.z > d.z0 - 1 && p.z < d.z1 + 1)) return false;
  const pads: Pad[] = [POT_PAD, COUNTER_PAD, BAR_PAD, GONG_PAD, WATCH, BIN_PADS.rice, BIN_PADS.fish];
  return !pads.some(q => Math.hypot(p.x - q.x, p.z - q.z) < q.r + 0.45);
}

export interface UnderBelt {
  /** Its hatch, grates and glimpsed bowls. */
  group: Group;
  /** A bowl sent down the hatch (the caller has it drop in): along under the floor, then `arrive`d. */
  send(mush: boolean): void;
  update(dt: number): void;
  /** Where its grates are, along it (metres from the hatch), for tests. */
  grates: number[];
  /** How many bowls are on their way under the floor. */
  riding(): number;
}

/**
 * A belt under the floor along `path` (its first point the hatch), at `y` (the floor's height): `speed` metres a
 * second, at least `gap` between bowls (the ones sent closer than that wait at the hatch). A grate every `every`
 * metres or so where `clear` says the floor's free there; `arrive` once a bowl's at the far end.
 */
export function underBelt(path: XZ[], y: number, { speed = 1.6, gap = 0.3, every = 1.8, clear, arrive }: {
  speed?: number; gap?: number; every?: number; clear: (p: XZ) => boolean; arrive: (mush: boolean) => void;
}): UnderBelt {
  const group = new Group();
  const add = <T extends Object3D>(o: T) => { group.add(o); return o; };
  const plate = (c: number, x: number, h: number, z: number, sx: number, sy: number, sz: number, ry: number) => {
    const o = add(mesh(G.box, c, x, y + h, z, false)); o.scale.set(sx, sy, sz); o.rotation.y = ry; return o;
  };
  const legs = path.slice(1).map((q, i) => ({ a: path[i], b: q, len: Math.hypot(q.x - path[i].x, q.z - path[i].z) }));
  const length = legs.reduce((s, l) => s + l.len, 0);
  /** Where along it `d` metres from the hatch is, and which way it's heading there. */
  const at = (d: number) => {
    for (const l of legs) {
      if (d <= l.len || l === legs[legs.length - 1]) {
        const k = Math.min(1, Math.max(0, d / l.len));
        return { x: l.a.x + (l.b.x - l.a.x) * k, z: l.a.z + (l.b.z - l.a.z) * k, ry: Math.atan2(l.b.x - l.a.x, l.b.z - l.a.z) };
      }
      d -= l.len;
    }
    return { x: path[0].x, z: path[0].z, ry: 0 };
  };
  // the hatch
  const h0 = at(0);
  group.add(hatch(h0.x, h0.z, y, h0.ry));
  // the grates: where the floor's clear, each a dark slot under steel bars across the belt
  const grates: number[] = [];
  for (let d = 1.0; d < length - 0.8; d += 0.1) {
    const p = at(d);
    if ((grates.length && d - grates[grates.length - 1] < every) || !clear(p)) continue;
    grates.push(d);
    plate(HOLE, p.x, FLUSH - 0.01, p.z, GRATE.across, 0.01, GRATE.along, p.ry);
    for (let i = 0; i < 6; i++) {
      const o = (i - 2.5) * (GRATE.along / 6);
      plate(STEEL_DARK, p.x + Math.sin(p.ry) * o, FLUSH + 0.008, p.z + Math.cos(p.ry) * o, GRATE.across + 0.04, 0.012, 0.028, p.ry);
    }
    for (const s of [-1, 1]) plate(STEEL, p.x + Math.cos(p.ry) * s * (GRATE.across / 2 + 0.02), FLUSH + 0.008, p.z - Math.sin(p.ry) * s * (GRATE.across / 2 + 0.02), 0.04, 0.014, GRATE.along + 0.04, p.ry);
  }
  // the bowls on it: glimpsed only under a grate
  const bowls = Array.from({ length: Math.ceil(length / gap) + 2 }, () => {
    const o = add(mesh(G.cyl, GLIMPSE, 0, y + FLUSH - 0.004, 0, false)) as Mesh;
    o.scale.set(0.085, 0.004, 0.085); o.visible = false;
    return { o, d: -1, mush: false };
  });
  const waiting: boolean[] = [];
  const seen = (d: number) => grates.some(g => Math.abs(d - g) < GRATE.along / 2 - 0.06);
  return {
    group, grates,
    send(mush) { waiting.push(mush); if (waiting.length > 40) waiting.shift(); },
    riding: () => bowls.filter(b => b.d >= 0).length + waiting.length,
    update(dt) {
      const last = Math.min(...bowls.filter(b => b.d >= 0).map(b => b.d), Infinity);
      if (waiting.length && last >= gap) {
        const b = bowls.find(o => o.d < 0);
        if (b) { b.d = 0; b.mush = waiting.shift()!; }
      }
      for (const b of bowls) {
        if (b.d < 0) continue;
        b.d += speed * dt;
        if (b.d >= length) { b.d = -1; b.o.visible = false; arrive(b.mush); continue; }
        const p = at(b.d);
        b.o.position.x = p.x; b.o.position.z = p.z;
        b.o.visible = seen(b.d);
      }
    },
  };
}
