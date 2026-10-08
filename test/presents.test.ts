// Presents for her: the $100 tile in her yard that's never done, and the pile by her door that never goes away.
import { Box3, type Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const saved = () => JSON.parse(localStorage.getItem('floe-market-v1')!);

async function atHerDoor(save: Parameters<typeof loadGame>[0] = {}) {
  const g = await loadGame(save);
  const presents = await import('../src/presents');
  g.placePlayer(presents.PRESENT.x, presents.PRESENT.z);
  return { g, presents };
}

describe('presents for her', () => {
  it('costs $100, says what it does, and leaves a present at her door just for standing there', async () => {
    const { g, presents } = await atHerDoor({ money: 150 });
    g.run(0.05);
    expect($('tip').textContent).toBe("A present for herMaybe she will take me back (she won't)");
    g.runUntil(() => presents.presents.n === 1, 5); // no E to hold
    expect($('toast').textContent).toBe('You left a present at her door');
    expect(saved()).toMatchObject({ presents: 1 });
    // the tile stays: there's always room for another
    g.run(3);
    expect(presents.PRESENT.paid).toBe(50);
    expect(g.wallet.money).toBe(0);
    expect(presents.presents.n).toBe(1);
    // nothing to hold, so no Buy button and no reminder to hold it
    expect($('buy').hidden).toBe(true);
    expect($('buyHint').hidden).toBe(true);
  });

  it('keeps taking presents while the player stands there, stops when they step off, and she never takes one in', async () => {
    const { g, presents } = await atHerDoor({ money: 300 });
    g.runUntil(() => presents.presents.n === 2, 10);
    expect($('toast').textContent).toBe("She didn't come to the door");
    g.run(0.3);
    g.placePlayer(0, 0);
    const paid = presents.PRESENT.paid, money = g.wallet.money;
    expect(paid).toBeGreaterThan(0);
    g.run(10);
    expect([presents.presents.n, presents.PRESENT.paid, g.wallet.money]).toEqual([2, paid, money]);
  });

  it('piles up by her door, and the player can\'t stand in the pile', async () => {
    const inPile = async (n: number) => {
      const { g } = await atHerDoor({ presents: n });
      g.placePlayer(23.5, 7.5);
      g.run(0.05);
      return g.player.g.position;
    };
    expect(await inPile(0)).toMatchObject({ x: 23.5, z: 7.5 }); // nothing there yet
    const p = await inPile(40);
    expect(Math.hypot(p.x - 23.5, p.z - 7.5)).toBeGreaterThan(0.3);
  });

  it('stops drawing more once the pile reaches the eaves, but keeps counting', async () => {
    const height = async (n: number) => {
      const { g, presents } = await atHerDoor({ presents: n });
      expect(presents.presents.n).toBe(n);
      // the pile: the group of baked meshes out by her front wall
      const box = (o: Object3D) => new Box3().setFromObject(o);
      const pile = g.render.scene.children.find(o => o.type === 'Group' && o.children.length > 0
        && o.children.every(m => (m as Mesh).isMesh && m.position.x === 0)
        && box(o).min.x > 22 && box(o).max.x < 24.5 && box(o).min.z > 6.5);
      return box(pile!).max.y;
    };
    expect(await height(10)).toBeLessThan(1);
    const top = await height(2000);
    expect(top).toBeGreaterThan(2);
    expect(top).toBeLessThan(2.7); // the eaves
    expect(await height(5000)).toBe(top);
  });

  it('remembers the pile and what was paid toward the next one, in either stage', async () => {
    const { g, presents } = await atHerDoor({ presents: 7, presentPaid: 30, tiles: bought(...MARKET, 'sushi') });
    expect(g.layout.stage.n).toBe(2);
    expect(presents.presents.n).toBe(7);
    expect(presents.PRESENT.paid).toBe(30);
    g.saveMod.save();
    expect(saved()).toMatchObject({ presents: 7, presentPaid: 30 });
  });

  it('reads old saves as having left her nothing', async () => {
    const { saveMod } = await loadGame();
    expect(saveMod.migrate({ v: 4, money: 5 })).toMatchObject({ presents: 0, presentPaid: 0 });
    expect(saveMod.migrate({ v: 4, presents: '3', presentPaid: 500 })).toMatchObject({ presents: 3, presentPaid: 99 });
  });
});
