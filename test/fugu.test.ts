// Mr. Fugu's model: rounded arms like everyone else's, with a fist on the end of each sleeve, joined to it, that goes
// wherever the arm goes.
import { Box3, BoxGeometry, type Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { loadGame } from './helpers';

describe('Mr. Fugu', () => {
  it('has rounded arms, each with a fist in his own fish colour tucked into a cuff', async () => {
    await loadGame();
    const { Fugu } = await import('../src/fugu');
    const f = new Fugu();
    f.updateMatrixWorld(true);
    for (const arm of f.arms) {
      const [, sleeve, cuff, hand] = arm.children as Mesh[];
      // no blocks: a ball of a shoulder, an eight-sided sleeve and a ball of a fist
      expect(arm.children.some(c => (c as Mesh).geometry instanceof BoxGeometry)).toBe(false);
      const box = (m: Mesh) => new Box3().setFromObject(m);
      // the fist is his skin (the pufferfish's), the cuff the coat's darker shade, like his lapels
      expect((hand.material as MeshLambertMaterial).color.getHex()).toBe(0xEBD38E);
      expect((cuff.material as MeshLambertMaterial).color.getHex()).toBe(0x9C7840);
      // joined: the cuff wraps the sleeve's end, and the fist's top is inside the cuff, its bulk below it
      expect(box(cuff).intersectsBox(box(sleeve))).toBe(true);
      expect(box(hand).intersectsBox(box(cuff))).toBe(true);
      expect(box(hand).min.y).toBeLessThan(box(cuff).min.y - 0.05);
      // a fist a little wider than the sleeve's end, so it reads at a distance
      expect(box(hand).max.x - box(hand).min.x).toBeGreaterThan(0.1);
    }
  });

  it('brings the fist out with the arm when he talks', async () => {
    await loadGame();
    const { Fugu } = await import('../src/fugu');
    const f = new Fugu();
    const hand = () => { f.updateMatrixWorld(true); return f.arms[1].children[3].getWorldPosition(new Vector3()); };
    const down = hand();
    f.talking = true;
    for (let i = 0; i < 30; i++) f.update(1 / 30);
    const out = hand();
    // out of his pocket: up off his hip and forward, in front of the coat
    expect(out.y).toBeGreaterThan(down.y + 0.05);
    expect(out.z).toBeGreaterThan(down.z + 0.2);
  });
});
