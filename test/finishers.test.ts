// The finishers (stage 3, finishers/ on finishRig.ts), each played through on two wrestlers, frame by frame, as
// dohyo.ts plays them, without the game: from where the fight leaves them, through the move and the aftermath to the
// end of the result. Each must be believable on the clay: no jumps, nobody through the ground, a hand that grips a
// belt is on it, the loser down from when he lands, inside the arena, and done in time for the getting up and the bow.
// (One boss's: npx vitest run test/finishers.test.ts -t octopus)
import { Vector3 } from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import type { Kind } from '../src/creatures';
import { LOOKS } from '../src/creatures';
import {
  AFTER_MIN, aftermath, at, beltPoints, type Ctx, drive, EPIC_PAY, FINISHER_PAY, type FinishMove, type Frame, type Fx, hipsAt,
  makeRing, PAY, SIZE,
} from '../src/finishRig';
import { GRIP } from '../src/poses';
import { RikishiModel } from '../src/rikishi';

/** The ring's numbers (cellar.ts's: stage3Gong.test.ts checks they're the same). */
export const DOHYO = { top: 0.6, half: 3.3, r: 2.6, steps: [{ out: 0.28, top: 0.42 }, { out: 0.74, top: 0.22 }] };
const rig = makeRing(DOHYO.top, DOHYO.half, DOHYO.r, DOHYO.steps);
const ORIGIN = new Vector3();
const DT = 1 / 60;
/** How far the fight drives them from the middle (dohyo.ts's PUSH). */
const PUSHED = DOHYO.r - 0.6;
/** How far two bodies may press into each other (soft bellies give), metres. */
const INTO = 0.6;
const OVERLAP: string[] = [];
const BOSS: Record<Kind, number> = { octopus: 0, crab: 1, catfish: 2, shark: 3, puffer: 4 };

type Who = Kind | 'partner' | 'local';
type Case = { move: string; w: 0 | 1; tight: boolean; len: number; slam?: number };
const CASES: Case[] = [
  { move: 'tight', w: 1, tight: true, len: FINISHER_PAY },
  { move: 'champTight', w: 0, tight: true, len: FINISHER_PAY },
  { move: 'heavy', w: 1, tight: false, len: FINISHER_PAY },
  { move: 'champGrand', w: 0, tight: false, len: FINISHER_PAY },
  { move: 'epic', w: 0, tight: false, len: EPIC_PAY, slam: 2 },
];

/** The champion and his opponent, dressed as they are in the ring. */
function pair(who: Who, puffed: number) {
  const champ = new RikishiModel(0xE0552F), rival = new RikishiModel(0x2C3A6B);
  champ.setWeight(170);
  if (who === 'partner') { rival.dress(0x6B4A2C); rival.setWeight(140); }
  else if (who === 'local') rival.setWeight(145);
  else rival.dressAs(LOOKS[who], who === 'puffer' ? 200 : 160 + BOSS[who] * 8);
  for (const r of [champ, rival]) r.scale.setScalar(SIZE);
  rival.puff = rival.puffTo = who === 'puffer' ? puffed : 0;
  return { champ, rival };
}

/** Plays a move through; returns what was wrong with it (empty: nothing). */
function play(who: Who, mv: FinishMove, cs: Case) {
  const { champ, rival } = pair(who, cs.w === 1 ? 1 : 0.3);
  const w = cs.w, l: 0 | 1 = w ? 0 : 1, D = 0.5 * (champ.girth + rival.girth) * 1.08 * SIZE;
  // where the fight leaves them: a tight one with the winner back at his own straw, otherwise the loser at his
  const tug = (w ? -1 : 1) * (cs.tight ? -0.85 : 1), cx = -tug * PUSHED;
  const C0 = at(0, cx + D / 2, GRIP), O0 = at(1, cx - D / 2, GRIP);
  const W = w ? rival : champ, L = w ? champ : rival;
  const c: Ctx = { t: 0, w, l, lSide: l ? -1 : 1, W0: w ? O0 : C0, L0: w ? C0 : O0, D, kind: who === 'partner' || who === 'local' ? undefined : who, slam: cs.slam ?? 0, ring: rig, W, L, keep: new Map() };
  const bad: string[] = [], into = { o: 0, t: 0 };
  const say = (t: number, s: string) => { if (bad.length < 10) bad.push(`${t.toFixed(2)}s: ${s}`); };
  const words = (s: string) => s.trim().split(/\s+/).length;
  const fx: Fx = {
    word: text => { if (words(text) > 8) say(c.t, `"${text}" is over 8 words`); },
    dust() {}, burst() {}, hit() {}, ink() {}, slime() {}, react() {}, kick() {},
    at: (m, part) => {
      const r = m === 'W' ? W : L, o = { hips: r.hips, belly: r.bellyAt, chest: r.chestAt, head: r.neck, hand0: r.arms[0].hand, hand1: r.arms[1].hand, foot0: r.legs[0].foot, foot1: r.legs[1].foot }[part];
      const v = o.getWorldPosition(new Vector3()); return [v.x, v.y, v.z];
    },
    screen: o => { if (o.text && words(o.text) > 8) say(c.t, `"${o.text}" is over 8 words`); },
  };
  // its timings
  if (!(mv.lands > 0 && mv.lands <= mv.done)) say(0, `lands ${mv.lands} must be after 0 and by done ${mv.done}`);
  if (mv.done > cs.len - AFTER_MIN + 1e-9) say(0, `done ${mv.done} is too late: by ${(cs.len - AFTER_MIN).toFixed(2)} at most, for the getting up and the bow`);
  if (mv.nameAt !== undefined && !(mv.nameAt >= 0 && mv.nameAt <= mv.lands)) say(0, `nameAt ${mv.nameAt} must be by lands`);
  const epic = cs.slam === 2, far = epic ? 6.5 : 5.5, high = epic ? 9 : 4;
  let last: [At2, At2] | null = null, got: ReturnType<typeof drive> = [c.W0, c.L0], left: ReturnType<typeof drive> | null = null, t0 = 0;
  type At2 = { root: Vector3; hips: Vector3 };
  const world = (o: { getWorldPosition(v: Vector3): Vector3 }) => o.getWorldPosition(new Vector3());
  const above = (v: Vector3) => v.y - rig.ground(v.x, v.z);
  for (let t = 0; t <= cs.len + 1e-9; t += DT) {
    c.t = t;
    let f: Frame;
    if (t < mv.done) {
      f = mv.frame({ ...c, t });
      mv.beats?.({ ...c, t }, fx, t0, t);
    } else {
      left ??= got;
      const [We, Le] = aftermath(c, t - mv.done, cs.len - mv.done, left[0], left[1], mv.front);
      f = { W: We, L: Le };
    }
    t0 = t;
    if (who === 'puffer' && f.puff !== undefined) rival.puff = rival.puffTo = f.puff;
    const d = drive(f, W, L, ORIGIN, rig, DT);
    if (t < mv.done) got = d;
    const now = ([W, L] as const).map(r => ({ root: r.position.clone(), hips: world(r.hips) })) as [At2, At2];
    now.forEach((s, i) => {
      const name = i ? 'the loser' : 'the winner', r = i ? L : W;
      if (![s.root.x, s.root.y, s.root.z, s.hips.x, s.hips.y, s.hips.z].every(Number.isFinite)) { say(t, `${name} is nowhere (NaN)`); return; }
      // (from where the fight left him)
      if (t === 0) {
        const want = hipsAt(i ? c.L0 : c.W0, rig), d = Math.hypot(s.hips.x - want[0], s.hips.y - want[1], s.hips.z - want[2]);
        if (d > 0.35) say(t, `${name} starts ${d.toFixed(2)} m from where the fight left him`);
      }
      // (no jumps)
      if (last) {
        const d = Math.max(s.hips.distanceTo(last[i].hips), s.root.distanceTo(last[i].root));
        if (d > 0.5) say(t, `${name} jumps ${d.toFixed(2)} m in a frame`);
      }
      // (never through the clay, unless the move says so; a foot a little, walking flat-footed up the pallets after)
      if (!f.sink || t >= mv.done) {
        const pts: [string, number][] = [['middle', above(s.hips) + 0.02], ['head', above(world(r.neck)) + 0.05], ...r.legs.map((g, j) => [`foot ${j}`, above(world(g.foot)) + (t >= mv.done ? 0.2 : 0.1)] as [string, number])];
        const [part, low] = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
        if (low < 0) say(t, `${name}'s ${part} is ${(-low).toFixed(2)} m into the ground${t >= mv.done ? ' (in the aftermath)' : ''}`);
      }
      // (in the arena)
      if (Math.hypot(s.hips.x, s.hips.z) > far || s.hips.y > high) say(t, `${name} is out of the arena at (${s.hips.x.toFixed(1)}, ${s.hips.y.toFixed(1)}, ${s.hips.z.toFixed(1)})`);
    });
    // a hand that grips a belt is on it
    if (t < mv.done) {
      for (const [by, of, k, what] of [[W, L, f.grip, "the winner's hand on the loser's belt"], [L, W, f.hold, "the loser's hand on the winner's belt"]] as const) {
        if (!k) continue;
        const belt = beltPoints(of);
        by.arms.forEach((A, i) => {
          const ki = typeof k === 'number' ? k : k[i];
          if (ki < 0.95) return;
          const h = world(A.hand), d = Math.min(...belt.map(p => p.distanceTo(h)));
          if (d > 0.12) say(t, `${what} (arm ${i}) is ${d.toFixed(2)} m off it: bring them closer, or let go`);
        });
      }
      for (const [m, i, p, k] of f.reach ?? []) {
        if (k < 0.95) continue;
        const h = world((m === 'W' ? W : L).arms[i].hand), d = Math.hypot(h.x - p[0], h.y - p[1], h.z - p[2]);
        if (d > 0.12) say(t, `${m}'s hand ${i} is ${d.toFixed(2)} m off where it reaches`);
      }
    }
    // the loser's down from when he lands to when the move's done
    if (t >= mv.lands + 1e-6 && t < mv.done) {
      const h = above(world(L.hips));
      if (h > 0.45) say(t, `the loser's middle is ${h.toFixed(2)} m up after he's landed (he should be down)`);
    }
    // how far the two bodies are into each other (the bellies, the chests, the heads, as balls)
    if (t < mv.done) {
      const balls = (r: RikishiModel) => [[r.bellyAt, 0.36 * r.girth], [r.chestAt, 0.36 * r.f], [r.neck, 0.2]].map(([o, rad]) => ({ p: world(o as RikishiModel['neck']), r: (rad as number) * SIZE }));
      const a = balls(W), b2 = balls(L);
      for (const x of a) for (const y of b2) { const o = x.r + y.r - x.p.distanceTo(y.p); if (o > into.o) { into.o = o; into.t = t; } }
    }
    last = now;
  }
  if (into.o > INTO) say(into.t, `the two bodies are ${into.o.toFixed(2)} m into each other (at most ${INTO}): keep them further apart`);
  OVERLAP.push(`${who} ${cs.move}: ${into.o.toFixed(2)} at ${into.t.toFixed(2)}`);
  return bad;
}

const MOVES = await import('../src/finishers');
// (PROBE_OUT=<file>: how far into each other the bodies go, every move, written there)
afterAll(async () => { if (process.env.PROBE_OUT) ((await import('node:fs')) as unknown as { writeFileSync(p: string, s: string): void }).writeFileSync(process.env.PROBE_OUT, OVERLAP.join('\n')); });
describe('the push-out (finishers/push.ts)', () => {
  it('lands at fight.LANDS, and is done in time', async () => {
    const fight = await import('../src/fight');
    expect(MOVES.PUSH.lands).toBe(fight.LANDS);
    expect(PAY).toBe(fight.BOUT.pay);
    expect(FINISHER_PAY).toBe(fight.FINISHER_PAY);
    expect(EPIC_PAY).toBe(fight.EPIC_PAY);
  });
  for (const w of [0, 1] as const) it(`local push: the ${w ? 'local' : 'champion'} wins`, () => {
    expect(play('local', MOVES.PUSH, { move: 'push', w, tight: false, len: PAY })).toEqual([]);
  });
});
for (const who of ['octopus', 'crab', 'catfish', 'shark', 'puffer', 'partner'] as const) {
  describe(`${who}'s finishers`, () => {
    for (const cs of CASES) it(`${who} ${cs.move}`, () => {
      const mv = cs.move === 'epic' ? MOVES.EPIC[who] : MOVES.MOVES[who][cs.move as keyof import('../src/finishers').Moves].anim;
      expect(play(who, mv, cs)).toEqual([]);
    });
    // and a plain win and loss with this opponent: the push-out
    it(`${who} push`, () => {
      expect(play(who, MOVES.PUSH, { move: 'push', w: 0, tight: false, len: PAY })).toEqual([]);
      expect(play(who, MOVES.PUSH, { move: 'push', w: 1, tight: false, len: PAY })).toEqual([]);
    });
  });
}
