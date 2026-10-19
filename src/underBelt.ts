// A belt under the cellar's floor (stage 3): the bowl line's, from the pot to the soup square and on to Mama Moray's
// (bowlLine.ts). Like a mine's (or a factory game's) underground belt, all that shows of it is where it's on the floor:
// a stretch of belt, worn rubber over steel rollers in a dark steel frame, coming up out of a steel hood like a chute's
// mouth (a brass edge on its lip) that slopes away into the floor, or going down into one; under the floor between,
// out of sight. The bowls on it show on its stretches, rising out of a hood and dipping into the next. It's all low,
// nothing anyone bumps into.
import { ExtrudeGeometry, Group, Mesh, MeshLambertMaterial, RepeatWrapping, Shape, type Texture } from 'three';
import { newBowl } from './items';
import { canvasTex, G, mesh } from './render';
import type { XZ } from './util';

const STEEL = 0x5E676E, STEEL_DARK = 0x33393D, HOLE = 0x0B0C0D, ROLLER = 0x6C7378, BRASS = 0xB8923A;
/** The belt's width and how high its top stands, and a hood's: how wide, how tall at its mouth, and how far back it
 *  slopes into the floor. */
const BELT = { w: 0.48, top: 0.075 }, HOOD = { w: 0.7, h: 0.38, d: 0.62 };
/** A hood's cheek: a wedge, its mouth's height at the front, down to the floor at the back (made once). */
let cheekGeo: ExtrudeGeometry | null = null;
const cheek = () => cheekGeo ??= (() => {
  const sh = new Shape(); sh.moveTo(0, 0); sh.lineTo(HOOD.d, 0); sh.lineTo(0, HOOD.h); sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false });
  g.translate(0, 0, -0.025); g.rotateY(-Math.PI / 2);
  return g;
})();
/** How far from a hood a bowl's dipped right into it. */
const DIP = 0.18;

/** A stretch of it on the floor, `from` and `to` metres along it (on one straight leg of its path): `up` out of a hood
 *  at its start, `down` into one at its end (or else a roller there); and, with `rise`, climbing that high by its end,
 *  cleated, railed and on legs (up onto a counter). */
export interface Stretch { from: number; to: number; up?: boolean; down?: boolean; rise?: number }

export interface UnderBelt {
  /** Its stretches on the floor, and the bowls on them. */
  group: Group;
  /** Each stretch's own: its belt, and its hoods (to show or not as the caller has it). */
  parts: { g: Group; up: Group | null; down: Group | null }[];
  /** A bowl set down on it at its start (the caller has it land there), taken off `leave` metres along (or at its end),
   *  `off` then called. */
  send(mush: boolean, leave: number | undefined, off: (mush: boolean) => void): void;
  update(dt: number): void;
  /** Where `d` metres along it is. */
  at(d: number): { x: number; z: number; ry: number };
  /** How long it is, and how high a bowl rides on it (over the floor). */
  length: number;
  ride: number;
  /** How many bowls are on it (on show or under the floor): of those taken off `past` metres along or further, or all. */
  riding(past?: number): number;
}

/** The belt's rubber: dark, with a slat across every so often and, now and then, a faint arrow the way it runs. */
let rubber: Texture | null = null;
function rubberTex() {
  if (rubber) return rubber;
  rubber = canvasTex(64, 256, (c, w, h) => {
    c.fillStyle = '#26282A'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1A1B1C';
    for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 5);
    c.strokeStyle = 'rgba(200, 190, 160, 0.22)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(w * 0.25, 150); c.lineTo(w * 0.5, 120); c.lineTo(w * 0.75, 150); c.stroke();
  }).tex;
  rubber.wrapS = rubber.wrapT = RepeatWrapping;
  return rubber;
}

/**
 * A belt along `path`, at `y` (the floor's height), on the floor at its `stretches` and under it everywhere else:
 * `speed` metres a second, at least `gap` between bowls (the ones sent closer than that wait at the start).
 */
export function underBelt(path: XZ[], y: number, { speed = 1.6, gap = 0.3, stretches }: {
  speed?: number; gap?: number; stretches: Stretch[];
}): UnderBelt {
  const group = new Group();
  const legs = path.slice(1).map((q, i) => ({ a: path[i], b: q, len: Math.hypot(q.x - path[i].x, q.z - path[i].z) }));
  const length = legs.reduce((s, l) => s + l.len, 0);
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
  const tex = rubberTex().clone();
  tex.needsUpdate = true;
  const rubberMat = new MeshLambertMaterial({ map: tex }), steelMat = new MeshLambertMaterial({ color: STEEL });
  /** A hood at `hz` along a stretch's group, its mouth to the belt, the belt under the floor behind it: further on
   *  (`back` 1, going down) or before (-1, coming up). */
  const hood = (p: Group, hz: number, back: 1 | -1) => {
    const g = new Group(); p.add(g);
    const box = (c: number, x: number, h: number, z: number, sx: number, sy: number, sz: number, shadow = true) => {
      const o = mesh(G.box, c, x, h, z, shadow); o.scale.set(sx, sy, sz); g.add(o); return o;
    };
    // (each cheek a wedge, as built facing +z from its mouth: turned about for one behind)
    for (const s of [-1, 1]) {
      const c = new Mesh(cheek(), steelMat); c.castShadow = true;
      c.position.set(s * (HOOD.w / 2 - 0.025), 0, hz); c.rotation.y = back > 0 ? 0 : Math.PI; g.add(c);
    }
    const top = box(STEEL, 0, HOOD.h / 2 + 0.012, hz + back * HOOD.d / 2, HOOD.w, 0.03, Math.hypot(HOOD.d, HOOD.h) + 0.02);
    top.rotation.x = back * Math.atan2(HOOD.h, HOOD.d);
    box(STEEL_DARK, 0, HOOD.h, hz + back * 0.015, HOOD.w + 0.03, 0.05, 0.07);
    box(BRASS, 0, HOOD.h + 0.027, hz + back * 0.015, HOOD.w + 0.035, 0.012, 0.075, false);
    box(HOLE, 0, (HOOD.h - 0.04) / 2, hz + back * 0.04, HOOD.w - 0.1, HOOD.h - 0.05, 0.03, false);
    box(STEEL_DARK, 0, 0.015, hz + back * (HOOD.d + 0.02), HOOD.w + 0.03, 0.03, 0.06);
    return g;
  };
  const parts = stretches.map(s => {
    const p = at(s.from), run = s.to - s.from, rise = s.rise ?? 0, g = new Group();
    g.position.set(p.x, y, p.z); g.rotation.y = p.ry;
    group.add(g);
    // (a climbing stretch's belt tilted up along it, its hoods and legs standing level)
    const tilt = new Group(), len = Math.hypot(run, rise);
    tilt.rotation.x = -Math.atan2(rise, run); g.add(tilt);
    const box = (q: Group, c: number, x: number, h: number, z: number, sx: number, sy: number, sz: number) => {
      const o = mesh(G.box, c, x, h, z, true); o.scale.set(sx, sy, sz); q.add(o); return o;
    };
    // the frame either side, the rubber between, and a roller at each end (under a hood, where there's one)
    for (const k of [-1, 1]) box(tilt, STEEL_DARK, k * (BELT.w / 2 + 0.03), BELT.top / 2 + 0.005, len / 2, 0.06, BELT.top + 0.01, len);
    const belt = new Mesh(G.box, rubberMat);
    belt.position.set(0, BELT.top - 0.01, len / 2); belt.scale.set(BELT.w, 0.02, len);
    tilt.add(belt);
    for (const z of [0.02, len - 0.02]) {
      const r = mesh(G.cyl, ROLLER, 0, BELT.top - 0.03, z, false); r.scale.set(0.05, BELT.w + 0.04, 0.05); r.rotation.z = Math.PI / 2; tilt.add(r);
    }
    if (rise) {
      // cleats across it to hold the bowls, rails along its sides, and legs down to the floor
      for (let z = 0.25; z < len - 0.1; z += 0.22) box(tilt, STEEL_DARK, 0, BELT.top + 0.012, z, BELT.w - 0.04, 0.025, 0.025);
      for (const k of [-1, 1]) box(tilt, STEEL, k * (BELT.w / 2 + 0.05), BELT.top + 0.07, len / 2 + 0.05, 0.025, 0.05, len - 0.1);
      for (const f of [0.4, 0.75]) for (const k of [-1, 1]) {
        const h = rise * f;
        box(g, STEEL_DARK, k * (BELT.w / 2 + 0.03), h / 2, run * f, 0.04, h, 0.04);
      }
    }
    return { g, up: s.up ? hood(g, 0, -1) : null, down: s.down ? hood(g, run, 1) : null };
  });
  // the bowls on show, a few of each kind, given each frame to whichever riders are on a stretch
  const ride = BELT.top + 0.035;
  const room = Math.ceil(stretches.reduce((n, s) => n + s.to - s.from, 0) / gap) + 1;
  const shown = [false, true].flatMap(mush => Array.from({ length: room }, () => {
    const o = newBowl(mush); o.scale.setScalar(0.78); o.visible = false; group.add(o); return { o, mush };
  }));
  type Rider = { d: number; mush: boolean; leave: number; off: (mush: boolean) => void };
  const riders: Rider[] = [], waiting: Rider[] = [];
  /** How far a bowl `d` along has dipped under the floor: 0 out on a stretch, 1 out of sight. */
  const dip = (d: number) => {
    const s = stretches.find(q => d >= q.from && d <= q.to);
    if (!s) return 1;
    const down = s.down && parts[stretches.indexOf(s)].down?.visible ? Math.max(0, 1 - (s.to - d) / DIP) : 0;
    const up = s.up ? Math.max(0, 1 - (d - s.from) / DIP) : 0;
    return Math.max(down, up);
  };
  return {
    group, parts, at, length, ride,
    send(mush, leave, off) { waiting.push({ d: 0, mush, leave: Math.min(leave ?? length, length), off }); if (waiting.length > 40) waiting.shift()!.off(false); },
    riding: past => [...riders, ...waiting].filter(r => past === undefined || r.leave >= past).length,
    update(dt) {
      tex.offset.y -= speed * dt / 0.5;
      const last = Math.min(...riders.map(r => r.d), Infinity);
      if (waiting.length && last >= gap) riders.push(waiting.shift()!);
      for (let i = riders.length - 1; i >= 0; i--) {
        const r = riders[i];
        r.d += speed * dt;
        if (r.d >= r.leave) { riders.splice(i, 1); r.off(r.mush); }
      }
      for (const s of shown) s.o.visible = false;
      for (const r of riders) {
        const k = dip(r.d);
        if (k >= 1) continue;
        const s = shown.find(o => o.mush === r.mush && !o.o.visible);
        if (!s) continue;
        const p = at(r.d), on = stretches.find(q => r.d >= q.from && r.d <= q.to);
        const up = on?.rise ? on.rise * (r.d - on.from) / (on.to - on.from) : 0;
        s.o.position.set(p.x, y + ride + up - k * 0.25, p.z); s.o.rotation.y = p.ry; s.o.visible = true;
      }
    },
  };
}
