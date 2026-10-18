// What stage 3's upgrades look like in the cellar: every level shows, from a slum to a hall, nothing in anyone's way,
// and each level's close-up is on what it changed.
import { Box3, Mesh, type Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, RING_DONE, type SaveFixture } from './helpers';

const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A game in stage 3, down in the cellar, with every hire in, and the money for any upgrade. */
async function cellar(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), money: 1e9, ring: RING_DONE, ...save });
  const looks = await import('../src/cellarLooks');
  const cellarMod = await import('../src/cellar');
  const plan = await import('../src/cellarPlan');
  const kitchen = await import('../src/ringKitchen');
  const { SPOT, SPOT_WAIT } = await import('../src/spotlight');
  g.run(0.1);
  /** The levels the looks shown now start at. */
  const shown = (id: 'street' | 'bowls' | 'cellarcrew') => looks.looksOf(id).filter(l => l.o.visible).map(l => l.from).sort((a, b) => a - b);
  const buy = (id: 'street' | 'bowls' | 'cellarcrew', n = 1) => { for (let i = 0; i < n; i++) expect(g.shop.buyMod(id)).toBe(true); g.run(0.05); };
  return { g, looks, cellar: cellarMod, plan, kitchen, shown, buy, SPOT, SPOT_WAIT };
}
const mid = (os: Object3D[]) => os.reduce((m, o) => m.add(new Box3().setFromObject(o).getCenter(new Vector3())), new Vector3()).divideScalar(os.length);
/** Every corner of every shape shown in `os`, where it is (shapes are baked together, so their boxes would be the
 *  whole lot's). */
const corners = (os: Object3D[]) => {
  const out: Vector3[] = [];
  for (const o of os) {
    o.updateMatrixWorld(true);
    o.traverseVisible(m => {
      if (!(m instanceof Mesh)) return;
      const p = m.geometry.attributes.position, n = m.geometry.drawRange.count === Infinity ? p.count : Math.min(p.count, m.geometry.drawRange.count);
      for (let i = 0; i < n; i++) out.push(new Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
    });
  }
  return out;
};

describe('the cellar upgrades\' looks', () => {
  it('dresses the arena a level at a time, scrap tin to a tournament dohyo, popping each in', async () => {
    const { g, shown, buy } = await cellar();
    expect(shown('street')).toEqual([]);
    buy('street');
    expect(shown('street')).toEqual([1, 1]);
    buy('street', 2);
    // (the tin's down at 3, the sawdust swept up, for plank walls, a walkway, cushions and a salt box; the bulbs stay)
    expect(shown('street')).toEqual([1, 2, 3, 3, 3, 3]);
    buy('street', 5);
    expect(shown('street')).toEqual([1, 4, 5, 5, 6, 6, 7, 8]);
    expect(g.shop.buyMod('street')).toBe(false); // (that's the last)
  }, 60_000);

  it('swaps the soup square\'s bamboo for its own look, and stops at the fourth level', async () => {
    const { g, cellar: c, shown, buy } = await cellar();
    expect(c.barFrame.visible).toBe(true);
    buy('bowls');
    expect(c.barFrame.visible).toBe(false);
    expect(shown('bowls')).toEqual([1, 1]);
    buy('bowls', 3);
    expect(shown('bowls')).toEqual([3, 4]);
    // a fifth level's no new look, and no close-up
    g.run(3);
    buy('bowls');
    expect(shown('bowls')).toEqual([3, 4]);
    g.run(1.5);
    expect(g.stage.view.close).toBe(1);
  }, 60_000);

  it('dresses the hires: rags, work clothes, chef whites', async () => {
    const { g, kitchen, buy } = await cellar();
    g.run(1);
    const washer = () => kitchen.crewPerson('washer')!;
    expect(washer().color).toBe(0xD8B65A);
    buy('cellarcrew');
    expect(washer().color).toBe(0x7A6650);
    buy('cellarcrew');
    expect(washer().color).toBe(0x6A7A8C);
    const was = washer();
    buy('cellarcrew', 3);
    expect(washer()).toBe(was); // (walls, hangings and lamps: their clothes stay)
    buy('cellarcrew');
    expect(washer().color).toBe(0xF4F6F8);
    // (and their old clothes are gone)
    expect(was.parent).toBeNull();
    expect(washer().parent).toBeTruthy();
  }, 60_000);

  it('puts each level in the spotlight: the new dohyo, the noren stall, the crest hangings', async () => {
    const { g, looks, buy, SPOT, SPOT_WAIT } = await cellar();
    const { view } = g.stage;
    const level = (id: 'street' | 'bowls' | 'cellarcrew', n: number) => looks.looksOf(id).filter(l => l.from === n).map(l => l.o);
    for (const [id, n] of [['street', 8], ['bowls', 3], ['cellarcrew', 4]] as const) {
      // (the levels before it bought first, and their close-up let play out)
      buy(id, n - 1);
      g.run(SPOT_WAIT + SPOT.over + SPOT.hold + SPOT.back + 0.4);
      buy(id);
      g.run(SPOT_WAIT + SPOT.over + 0.2);
      expect(view.close).toBeLessThan(1);
      expect(view.focus.distanceTo(mid(level(id, n)))).toBeLessThan(0.3);
      g.run(SPOT.hold + SPOT.back + 0.2);
    }
  }, 60_000);

  it('shows what a save had bought as it loads, without popping it in or a close-up', async () => {
    const { g, shown, cellar: c, kitchen } = await cellar({ mods: { street: 8, bowls: 6, cellarcrew: 8 } });
    expect(shown('street')).toEqual([1, 4, 5, 5, 6, 6, 7, 8]);
    expect(shown('bowls')).toEqual([3, 4]);
    expect(c.barFrame.visible).toBe(false);
    g.run(2);
    expect(g.stage.view.close).toBe(1);
    expect(kitchen.crewPerson('washer')!.color).toBe(0xF4F6F8);
  }, 60_000);

  it('keeps clear of the soup square\'s flap and its counters\' bowls, the rice racks\' row and the doorways', async () => {
    const { g, looks, plan, buy } = await cellar();
    buy('bowls', 4); buy('cellarcrew', 8); buy('street', 8);
    g.run(1); // (popped in)
    const { BAR, FLAP, BAR_PLACES, machineAt, MAX_MACHINES } = plan;
    const { CY } = await import('../src/cellar');
    const { DOORS, PREP } = await import('../src/layout');
    const all = (id: 'street' | 'bowls' | 'cellarcrew') => looks.looksOf(id).filter(l => l.o.visible).map(l => l.o);
    // the flap: its lid swings up a metre over the counter's end, and the player walks through under it (short of the
    // corner post by the wall, which has always stood there)
    const flap = new Box3(new Vector3(BAR.x0 - 0.05, CY + 0.05, FLAP.z0), new Vector3(BAR.x0 + BAR.d + 0.05, CY + BAR.top + 1.1, FLAP.z1 - 0.2));
    // where the bowls are set out on the counters
    const places = BAR_PLACES.map(p => new Box3(new Vector3(p.x - 0.04, CY + BAR.top, p.z - 0.04), new Vector3(p.x + 0.04, CY + BAR.top + 0.2, p.z + 0.04)));
    // the row the rice racks are built along, as tall as they stand
    const a = machineAt('rice', 0), b = machineAt('rice', MAX_MACHINES - 1);
    const racks = new Box3(new Vector3(a.x - 0.5, CY + 0.02, a.z - 0.35), new Vector3(b.x + 0.5, CY + 1.4, a.z + 0.35));
    // every doorway, to a doorframe's height (the floors lie under them)
    const doors = DOORS.map(d => new Box3(new Vector3(d.x0, CY + 0.05, d.z0), new Vector3(d.x1, CY + 2.0, d.z1)));
    const pts = corners([...all('bowls'), ...all('cellarcrew'), ...all('street')]);
    expect(pts.length).toBeGreaterThan(1000);
    for (const box of [flap, ...places, racks, ...doors]) expect(pts.filter(p => box.containsPoint(p))).toEqual([]);
    expect(PREP.x0).toBeLessThan(a.x);
  }, 60_000);
});
