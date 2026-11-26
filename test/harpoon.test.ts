// How a catch is seen: the rope that hangs (rope.ts), the auto harpoon's shot (machines.ts) and the fish's flight to
// the block (fishing.ts). What's caught and when is economy.test.ts'; none of this changes it.
import type { Group, Mesh, Object3D } from 'three';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

/** The middle of the rope's `i`th ring (of 15, five corners each). */
function ring(g: Mesh['geometry'], i: number) {
  const p = g.attributes.position, c = new Vector3();
  for (let j = 0; j < 5; j++) c.add(new Vector3(p.getX(i * 5 + j), p.getY(i * 5 + j), p.getZ(i * 5 + j)));
  return c.multiplyScalar(1 / 5);
}

describe('a rope', () => {
  it('runs from end to end, hanging in the middle by as much as it is given', async () => {
    await loadGame();
    const { lay, ropeGeometry, sagOf } = await import('../src/rope');
    const g = ropeGeometry(0.02);
    lay(g, new Vector3(0, 1, 0), new Vector3(4, 1, 2), { sag: 0.5 });
    expect(ring(g, 0).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
    expect(ring(g, 14).distanceTo(new Vector3(4, 1, 2))).toBeLessThan(1e-6);
    expect(ring(g, 7).y).toBeCloseTo(0.5, 5);
    // every ring is as thick as the rope
    const p = g.attributes.position, mid = ring(g, 7);
    expect(new Vector3(p.getX(35), p.getY(35), p.getZ(35)).distanceTo(mid)).toBeCloseTo(0.02, 5);
    // taut with no slack, and deeper the more of it there is
    expect(sagOf(4, 0)).toBe(0);
    expect(sagOf(4, 0.5)).toBeGreaterThan(sagOf(4, 0.1));
  });

  it('never hangs under its floor, and swings off its line with a wave', async () => {
    await loadGame();
    const { lay, ropeGeometry } = await import('../src/rope');
    const g = ropeGeometry(0.02, 0xE3C26B);
    lay(g, new Vector3(0, 1, 0), new Vector3(6, 1, 0), { sag: 3, floor: () => 0.3 });
    for (let i = 1; i < 14; i++) expect(ring(g, i).y).toBeGreaterThanOrEqual(0.3 - 1e-6);
    lay(g, new Vector3(0, 1, 0), new Vector3(6, 1, 0), { wave: 0.2, phase: -Math.PI / 2 });
    expect(Math.abs(ring(g, 7).z)).toBeCloseTo(0.2, 5);
    // painted in two shades for its strands
    expect(g.attributes.color.count).toBe(75);
  });
});

describe('the auto harpoon', () => {
  /** The gun on the dock, its head, and the harpoon that leaves it. */
  function gun(g: Awaited<ReturnType<typeof loadGame>>) {
    const root = g.render.scene.children.find(o => Math.abs(o.position.x + 6.9) < 1e-6 && Math.abs(o.position.z + 5.9) < 1e-6) as Group;
    const head = root.children.find(o => o.rotation.order === 'YXZ') as Group;
    const dart = root.children.find(o => o.userData.noBatch) as Group;
    /** How far the harpoon is from where it sits loaded, just inside the muzzle. */
    const away = () => { head.updateMatrix(); return dart.position.distanceTo(new Vector3(0, 0.04, 0.77).applyMatrix4(head.matrix)); };
    return { head, away };
  }
  const ropes = (g: Awaited<ReturnType<typeof loadGame>>) =>
    g.render.scene.children.filter((o: Object3D) => (o as Mesh).isMesh && (o as Mesh).geometry.userData.r);

  it('sends its harpoon out on a rope to the fish, and has it home before it fires again', async () => {
    for (const training of [0, 8]) {
      const g = await loadGame({ tiles: bought('pack', 'turret') });
      g.economy.mods.training = training;
      g.stations.pile.cap = 9999;
      const { away } = gun(g);
      let shots = 0, was = 0, far = 0, roped = 0;
      for (let i = 0; i < 60 * 12; i++) {
        g.game.tick(1 / 60);
        const now = g.fishing.filletsInProgress();
        if (now > was) {
          // a new shot: the harpoon's in the barrel to be fired
          expect(away()).toBeLessThan(1e-3);
          shots++;
        }
        was = now;
        far = Math.max(far, away());
        const out = ropes(g);
        expect(out.length).toBeLessThanOrEqual(1);
        if (out.length && out[0].visible) roped++;
      }
      expect(shots).toBeGreaterThan(3);
      expect(far).toBeGreaterThan(1); // it went out to the fish
      expect(roped).toBeGreaterThan(shots * 10); // on a rope that showed while it was out
    }
  });

  it('kicks back as it fires, and comes to rest again', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret') });
    const { head } = gun(g);
    g.runUntil(() => g.fishing.filletsInProgress() > 0, 5);
    // the head has slid back from its pivot along its aim
    expect(Math.hypot(head.position.x, head.position.z)).toBeGreaterThan(0.05);
    g.run(1.5);
    expect(Math.hypot(head.position.x, head.position.z)).toBeLessThan(0.01);
  });
});

describe('a caught fish', () => {
  it('turns once through the air, lands lying flat on the block, and settles', async () => {
    const g = await loadGame();
    const fish = g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'player')!;
    g.run(g.fishing.REACH + g.fishing.FLIGHT * 0.5);
    expect(Math.abs(fish.g.rotation.z)).toBeGreaterThan(1); // head over tail, halfway
    g.runUntil(() => fish.g.position.distanceTo(g.stations.chopTop) < 1e-6 && fish.g.rotation.z === 0, 1);
    expect(fish.g.rotation.x).toBe(0);
    expect(fish.g.rotation.y).toBe(0);
    expect(fish.g.scale.y).toBeLessThan(1); // flattened by the landing
    g.run(0.3);
    expect(fish.g.scale.toArray()).toEqual([1, 1, 1]);
  });

  it("is on the block as soon as it ever was, and the player's line is gone by then", async () => {
    const g = await loadGame();
    const fish = g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'player')!;
    const t = g.runUntil(() => fish.g.position.distanceTo(g.stations.chopTop) < 1e-6, 2);
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(0.86);
    expect(g.render.scene.children.filter((o: Object3D) => (o as Mesh).isMesh && (o as Mesh).geometry.userData.r)).toHaveLength(0);
  });
});
