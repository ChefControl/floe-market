// Mr. Fugu's model: rounded arms like everyone else's, with a fist on the end of each sleeve, joined to it, that goes
// wherever the arm goes.
import { Box3, BoxGeometry, Color, type Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { loadGame } from './helpers';

/** The colours an arm's mesh is painted in, as hex. */
const colours = (m: Mesh) => {
  const a = m.geometry.attributes.color, c = new Color(), out = new Set<number>();
  for (let i = 0; i < a.count; i++) out.add(c.setRGB(a.getX(i), a.getY(i), a.getZ(i)).getHex());
  return out;
};

describe('Mr. Fugu', () => {
  it('has rounded arms, each one mesh with a fist in his own fish colour tucked into a cuff', async () => {
    await loadGame();
    const { Fugu } = await import('../src/fugu');
    const f = new Fugu();
    for (const arm of f.arms) {
      // one mesh an arm, as the box was, and no blocks in it
      expect(arm.children).toHaveLength(1);
      const m = arm.children[0] as Mesh;
      expect(m.geometry).not.toBeInstanceOf(BoxGeometry);
      // the coat, the cuff in its darker shade (like his lapels) and the fist in the pufferfish's colour
      expect([...colours(m)].sort()).toEqual([0x9C7840, 0xC49A5A, 0xEBD38E]);
      // the fist hangs below the sleeve's end, a little wider than the sleeve, so it reads at a distance
      const box = new Box3().setFromBufferAttribute(m.geometry.attributes.position as never);
      expect(box.min.y).toBeLessThan(-0.4);
      expect(box.max.x - box.min.x).toBeGreaterThan(0.12);
    }
  });

  it('brings the fist out with the arm when he talks', async () => {
    await loadGame();
    const { Fugu } = await import('../src/fugu');
    const f = new Fugu();
    const fist = () => { f.updateMatrixWorld(true); return f.arms[1].localToWorld(new Vector3(0, -0.345, 0.005)); };
    const down = fist();
    f.talking = true;
    for (let i = 0; i < 30; i++) f.update(1 / 30);
    const out = fist();
    // out of his pocket: up off his hip and forward, in front of the coat
    expect(out.y).toBeGreaterThan(down.y + 0.05);
    expect(out.z).toBeGreaterThan(down.z + 0.2);
  });
});
