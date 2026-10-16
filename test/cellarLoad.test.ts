// The cellar (stage 3) is built the first time it's needed, not as the game loads. Loading still draws from the luck and
// the scenery's dice just what building it then did, so every seeded game plays as it did, and everything up in the
// world looks as it did; and building it later draws on neither.
import { type Mesh, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { loadGame } from './helpers';
import { seeded } from './setup';

/** How many throws of the scenery's dice (kit.ts) there were between seeing `a` and seeing `b`. */
async function throwsBetween(a: number, b: number) {
  const { dice } = await import('../src/kit');
  const d = dice(0x5CE4E);
  let at = -1;
  for (let i = 0; i < 1e6; i++) {
    const v = d();
    if (at < 0 && v === a) at = i;
    else if (at >= 0 && v === b) return i - at - 1;
  }
  throw new Error('not thrown by the scenery dice');
}
/** The next numbers from the luck, and from the scenery's dice. */
async function next() {
  const { jitter } = await import('../src/kit');
  return { luck: [Math.random(), Math.random()], scenery: [jitter(0, 1), jitter(0, 1)] };
}
/** Everything drawn in `root`: each mesh's shape, where it is, and its colour, in a set. */
function drawn(root: Object3D) {
  const out: string[] = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    let sum = 0;
    for (let i = 0; i < p.array.length; i++) sum += p.array[i] * ((i % 7) + 1);
    const colour = [m.material].flat().map(x => (x as { color?: { getHex(): number } }).color?.getHex()).join('/');
    out.push(`${p.count} ${sum.toFixed(2)} ${m.matrixWorld.elements.map(v => v.toFixed(3)).join()} ${colour} ${m.visible}`);
  });
  return out.sort();
}

describe('the cellar, built when stage 3 is reached', () => {
  it("isn't built as the game loads, and is once stage 3 opens", async () => {
    const g = await loadGame();
    const cellar = await import('../src/cellar');
    expect(cellar.ground.open).toBeUndefined();
    const seats = cellar.places.length;
    expect(seats).toBeGreaterThan(50); // (the fans' seats are there from the start: swarm.ts)
    g.stage.enterStage3(true);
    expect(cellar.cellar.visible).toBe(true);
    expect(cellar.ground.open).toBeDefined();
    expect(cellar.places).toHaveLength(seats);
  });

  it('loading it draws what building it did as it loaded: 16616 numbers of the luck, and 376 throws of the scenery', async () => {
    // (the modules it needs loaded first, so only its own draws are counted)
    vi.resetModules();
    await Promise.all([import('../src/kit'), import('../src/render'), import('../src/layout'), import('../src/cellarPlan'), import('../src/fugu')]);
    const { jitter } = await import('../src/kit');
    const luck = Math.random;
    let drawn = 0;
    Math.random = () => { drawn++; return luck(); };
    const before = jitter(0, 1);
    try { await import('../src/cellar'); } finally { Math.random = luck; }
    expect(drawn).toBe(16616);
    expect(await throwsBetween(before, jitter(0, 1))).toBe(376);
  });

  it("looks the same whenever it's built", async () => {
    /** What building it puts in the cellar (not what the kitchen's lines and the rest put in it as they loaded). */
    const build = async () => {
      const { cellar, parts, buildCellar } = await import('../src/cellar');
      const theirs = new Set([cellar, ...Object.values(parts)].flatMap(p => p.children));
      buildCellar();
      return [cellar, ...Object.values(parts)].flatMap(p => p.children.filter(c => !theirs.has(c))).flatMap(drawn).sort();
    };
    await loadGame();
    const atOnce = await build();
    expect(atOnce.length).toBeGreaterThan(100);
    // another game, other luck, played a while first
    vi.spyOn(Math, 'random').mockImplementation(seeded(7));
    const g = await loadGame();
    g.run(3);
    await next();
    expect(await build()).toEqual(atOnce);
  }, 30_000);

  it("builds it off the game's luck and the scenery's dice", async () => {
    await loadGame();
    const [cellar, { jitter }] = await Promise.all([import('../src/cellar'), import('../src/kit')]);
    const luck = Math.random;
    let drawn = 0;
    Math.random = () => { drawn++; return luck(); };
    const before = jitter(0, 1);
    try { cellar.buildCellar(); } finally { Math.random = luck; }
    expect(drawn).toBe(0);
    expect(await throwsBetween(before, jitter(0, 1))).toBe(0);
    // (and only the once)
    const n = cellar.cellar.children.length;
    cellar.showCellar();
    expect(cellar.cellar.children).toHaveLength(n);
  });
});
