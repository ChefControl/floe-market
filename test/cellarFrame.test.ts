// A frame in the cellar's rush, for what it costs (profile fix 5): it never asks the page how big the window is (the
// browser lays the page out again to answer), the strip's names are measured only when they change, and the level cull
// judges what's up top and down below just as three.js' Box3 would, stopping as soon as it knows.
import { Box3, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, overHall } from './helpers';
import { $, ring, SUSHI } from './stage3Ring';

/** Counts reads of `name` on `on` (an own getter over whatever it had), until `undo()`. */
function countReads(on: object, name: string, value?: () => number) {
  let n = 0, proto: object | null = on;
  while (proto && !Object.getOwnPropertyDescriptor(proto, name)) proto = Object.getPrototypeOf(proto);
  const had = proto && Object.getOwnPropertyDescriptor(proto, name), own = Object.getOwnPropertyDescriptor(on, name);
  const read = had?.get ? () => had.get!.call(on) : () => had?.value;
  Object.defineProperty(on, name, { configurable: true, get: () => { n++; return value ? value() : read(); } });
  return {
    reads: () => n,
    undo: () => { if (own) Object.defineProperty(on, name, own); else delete (on as Record<string, unknown>)[name]; },
  };
}

describe('a frame in the cellar', () => {
  it("never reads the window's size: viewSize.ts keeps it, from the window's resize", async () => {
    const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5) }, { main: true });
    const [plan, fight, swarm, { viewSize }] = await Promise.all([import('../src/cellarPlan'), import('../src/fight'), import('../src/swarm'), import('../src/viewSize')]);
    const frame = g.frame()!;
    let now = 0;
    const frames = (s: number) => { for (let t = 0; t < s; t += 1 / 60) frame(now += 1000 / 60); };
    frames(0.5);
    expect(g.layout.level.down).toBe(true);
    // a boss's crowd on the floor, the strip up, and fans talking over their heads
    g.player.g.position.set(plan.GONG_PAD.x, g.player.g.position.y, plan.GONG_PAD.z);
    frames(0.2);
    expect(fight.ringGong()).toBe(true);
    const w = countReads(window, 'innerWidth'), h = countReads(window, 'innerHeight');
    try {
      g.runUntil(() => fight.F.bout.t > 10, 60);
      await overHall();
      let talked = false;
      for (let i = 0; i < 40 && !talked; i++) { g.run(0.25); await overHall(); talked = swarm.said().length > 0; }
      expect(talked).toBe(true);
      frames(2);
      // and into the fight, the rope's knot pulled about
      g.runUntil(() => fight.F.bout.phase === 'fight', 120);
      frames(2);
      expect($('rush').hidden).toBe(false);
      expect(w.reads()).toBe(0);
      expect(h.reads()).toBe(0);
    } finally { w.undo(); h.undo(); }
    // a window resized: the game has the new size
    const was = { w: innerWidth, h: innerHeight };
    const set = (k: 'innerWidth' | 'innerHeight', v: number) => Object.defineProperty(window, k, { configurable: true, value: v });
    try {
      set('innerWidth', 390); set('innerHeight', 844);
      window.dispatchEvent(new Event('resize'));
      expect(viewSize).toEqual({ w: 390, h: 844 });
      expect(g.render.camera.aspect).toBeCloseTo(390 / 844);
    } finally { set('innerWidth', was.w); set('innerHeight', was.h); window.dispatchEvent(new Event('resize')); }
  }, 60_000);

  it("measures the strip's names only when what it says changes, not every frame the knot moves", async () => {
    const { g, plan, fight, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 60 && fight.toStall(false)); return F().bout.phase === 'fight'; }, 60 + fight.WALK_IN);
    // (fit() measures a name's box first: jsdom's is 0 wide, so that's all it does, once a fit)
    const you = countReads($('rushYou'), 'clientWidth', () => 0), them = countReads($('rushThem'), 'clientWidth', () => 0);
    try {
      const said = () => ['rushYou', 'rushBell', 'rushThem'].map(id => $(id).textContent).join('|');
      let changes = 0, was = said(), knots = new Set<string>();
      for (let i = 0; i < 90 && F().bout.phase === 'fight'; i++) {
        g.run(1 / 60);
        if (said() !== was) { changes++; was = said(); }
        knots.add($('rushKnot').style.left);
      }
      expect(knots.size).toBeGreaterThan(10);
      expect(changes).toBeLessThan(5);
      expect(you.reads()).toBe(changes);
      expect(them.reads()).toBe(changes);
      // hidden and shown again, it's fitted afresh
      g.layout.level.down = false;
      g.run(1 / 60);
      expect($('rush').hidden).toBe(true);
      g.layout.level.down = true;
      g.run(1 / 60);
      expect($('rush').hidden).toBe(false);
      expect(you.reads()).toBe(changes + 1);
    } finally { you.undo(); them.undo(); }
  });

  it("judges what's wholly up top and wholly down below as Box3 does, round everything in the scene", async () => {
    const { g, cellar } = await ring();
    g.run(0.5);
    const { scene } = g.render, { judged } = await import('../src/levelCull'), ABOVE = g.layout.CELLAR_Y + 15;
    // (judged first, before Box3 places everything and works out the shapes' boxes for it)
    const got = new Map(scene.children.map(o => [o, judged(o)]));
    const seen = { up: 0, below: 0, measuredBelow: 0, neither: 0 };
    for (const o of scene.children) {
      const box = new Box3().setFromObject(o), inst = !!(o as InstancedMesh).isInstancedMesh;
      const up = !inst && !box.isEmpty() && box.min.y > ABOVE, below = !!o.userData.below || (!inst && !box.isEmpty() && box.max.y < ABOVE);
      expect(got.get(o), o.name || o.type).toEqual({ up, below });
      if (up) seen.up++;
      if (below) seen.below++;
      if (below && !o.userData.below) seen.measuredBelow++;
      if (!up && !below) seen.neither++;
    }
    // (the scene has some of each: the world up top, the cellar's own, things measured to be down there, and the
    // instanced meshes and anything reaching both ways, judged neither)
    expect(seen.up).toBeGreaterThan(5);
    expect(seen.below).toBeGreaterThan(5);
    expect(seen.measuredBelow).toBeGreaterThan(0);
    expect(seen.neither).toBeGreaterThan(0);
    // and the cellar's group, thousands of pieces, is given up on a few pieces in: it isn't wholly up top
    let pieces = 0, looked = 0;
    cellar.cellar.traverse(() => { pieces++; });
    const { Object3D } = await import('three'), place = Object3D.prototype.updateWorldMatrix;
    Object3D.prototype.updateWorldMatrix = function (...a) { looked++; return place.apply(this, a); };
    try { expect(judged(cellar.cellar).up).toBe(false); } finally { Object3D.prototype.updateWorldMatrix = place; }
    expect(pieces).toBeGreaterThan(1000);
    expect(looked).toBeLessThan(pieces / 20);
  });
});
