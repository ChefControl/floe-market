// Player movement and every station interaction.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

describe('movement', () => {
  it('walks away from the camera on W and stops on release', async () => {
    const g = await loadGame();
    const p = g.player.g.position;
    const start = p.clone();
    g.press('w');
    g.run(0.5);
    // camera sits at +x,+z, so "up" is toward -x,-z
    expect(p.x).toBeLessThan(start.x);
    expect(p.z).toBeLessThan(start.z);
    expect(p.distanceTo(start)).toBeCloseTo(g.player.speed * 0.5, 0);
    g.press('w', 'keyup');
    g.run(0.1);
    expect(g.player.moving).toBe(false);
  });

  it('stays on the deck', async () => {
    const g = await loadGame();
    g.press('w');
    g.run(5);
    expect(g.player.g.position.x).toBeCloseTo(-7.4);
    expect(g.player.g.position.z).toBeCloseTo(-6.25);
  });

  it('is pushed out of the chopping block', async () => {
    const g = await loadGame();
    g.placePlayer(0.5, -5.5);
    g.run(0.02);
    expect(g.player.g.position.z).toBeCloseTo(-4.8);
    g.placePlayer(-0.3, -5.5);
    g.run(0.02);
    expect(g.player.g.position.x).toBeCloseTo(-0.5);
  });
});

describe('stations', () => {
  it('fishes while standing on the pad', async () => {
    const g = await loadGame();
    g.placePlayer(-4.5, -5.2);
    g.run(2.5);
    expect(g.stations.pile.items.length).toBeGreaterThanOrEqual(3);
  });

  it('picks fish slices up from the pile until its arms are full', async () => {
    const g = await loadGame({ pile: 10 });
    g.placePlayer(2.7, -4.0);
    g.run(1);
    expect(g.player.back.items).toHaveLength(6);
    expect(g.stations.pile.items).toHaveLength(4);
  });

  it('stocks the steak counter and collects its cash', async () => {
    const g = await loadGame({ back: 5, c1c: 20 });
    const { C1 } = g.counters;
    C1.maxQ = 0;
    g.placePlayer(C1.dropPos!.x, C1.dropPos!.z);
    g.run(1);
    expect(C1.stock.items).toHaveLength(5);
    expect(g.player.back.items).toHaveLength(0);
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    g.run(1);
    expect(g.wallet.money).toBe(20);
    expect(C1.cash.items).toHaveLength(0);
  });

  it('drops fish and rice off at their own trays, and collects the register', async () => {
    const g = await loadGame({ tiles: bought('sushi'), back: 3, backRice: 2, cash: 20 });
    const { fishTray, ricePot, FISH_DROP, RICE_DROP, REGISTER, register, sushi } = g.restaurant;
    sushi.chefs[0].state = 'fetch'; // keep the chef from using them
    g.placePlayer(RICE_DROP.x, RICE_DROP.z);
    g.run(1);
    expect(ricePot.items).toHaveLength(2);
    expect(g.player.back.items).toHaveLength(3); // the fish stays in the arms
    g.placePlayer(FISH_DROP.x, FISH_DROP.z);
    g.run(1);
    expect(fishTray.items).toHaveLength(3);
    expect(g.player.back.items).toHaveLength(0);
    g.placePlayer(REGISTER.x, REGISTER.z);
    g.run(1);
    expect(g.wallet.money).toBe(20);
    expect(register.items).toHaveLength(0);
  });

  it('harvests the rice patch the restaurant opens with, for free', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { PATCH_AT } = g.rice;
    g.run(15.1); // ripe
    g.placePlayer(PATCH_AT.x, PATCH_AT.z);
    g.run(1);
    expect(g.player.back.count('rice')).toBeGreaterThan(1);
    expect(g.wallet.money).toBe(0);
    expect(document.getElementById('tip')!.textContent).toContain('Wade through');
  });

  it('is kept out of the bar, the kitchen line and the register desk', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const p = g.player.g.position;
    const at = (x: number, z: number) => { g.placePlayer(x, z); g.run(0.02); return [p.x, p.z]; };
    expect(at(0, 9.0)[1]).toBeCloseTo(11.25); // dead centre of the bar: out the front
    expect(at(-5.0, 9.0)[0]).toBeCloseTo(-6.45); // round its end
    expect(at(0, 2.4)[1]).toBeCloseTo(1.8); // kitchen line: out the shallow side
    expect(at(-6.1, 2.6)[0]).toBeCloseTo(-6.3);
    expect(at(6.5, 14.0)[1]).toBeCloseTo(13.7); // the register desk
  });

  it('walks out through the gate to the garden, but not through the walls', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const p = g.player.g.position;
    g.placePlayer(0, 14.5);
    g.press('s');
    g.run(2);
    expect(p.z).toBeGreaterThan(16.2);
    expect(p.y).toBeCloseTo(0.02, 1);
    g.press('s', 'keyup');
    g.placePlayer(5, 14.5);
    g.press('s');
    g.run(1);
    expect(p.z).toBeCloseTo(15.1); // the front wall
  });

  it('steps up the terraces, and over the bridge through the farm door', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const p = g.player.g.position;
    const { TERRACES } = g.layout;
    g.placePlayer(-9.0, 3.2);
    g.press('a');
    g.runUntil(() => p.x < -16.6, 10);
    expect(p.z).toBeGreaterThan(2.6); // went straight out of the door
    g.press('a', 'keyup');
    g.run(1);
    expect(p.y).toBeCloseTo(TERRACES[1].top);
    g.placePlayer(-23, 1);
    g.run(1);
    expect(p.y).toBeCloseTo(TERRACES[2].top);
  });

  it("is kept out of Korki's statue in the garden", async () => {
    const g = await loadGame({ tiles: bought('korki', 'sushi') });
    const { STATUE } = g.korki;
    g.placePlayer(STATUE.x, STATUE.z + 0.2);
    g.run(0.02);
    expect(g.player.g.position.z).toBeCloseTo(STATUE.z + 0.8);
  });

  it('shows the upgrade tip, and pays into the tile while E is held on it', async () => {
    const g = await loadGame({ money: 35 });
    const tip = document.getElementById('tip')!;
    g.placePlayer(-1.5, 6.4);
    g.run(2);
    expect(tip.classList.contains('on')).toBe(true);
    expect(tip.textContent).toContain('Bigger arms');
    expect(g.wallet.money).toBe(35); // standing alone buys nothing
    g.press('e');
    g.run(0.3);
    g.press('e', 'keyup');
    const part = g.wallet.money;
    expect(part).toBeLessThan(35); // part paid
    g.run(1);
    expect(g.wallet.money).toBe(part); // let go: it stops
    g.press('e');
    g.run(1.5);
    expect(g.wallet.money).toBe(5);
    expect(g.player.back.cap).toBe(14);
    expect(tip.classList.contains('on')).toBe(false);
    expect(localStorage.getItem('floe-market-v1')).toContain('"done":true');
  });

  it("doesn't take money from someone just walking across a tile", async () => {
    const g = await loadGame({ money: 35 });
    const p = g.player.g.position;
    g.placePlayer(-2.4, 6.0);
    g.press('d');
    g.runUntil(() => p.x > -0.2, 2); // across the 2m tile at walking speed
    g.press('d', 'keyup');
    expect(g.wallet.money).toBe(35);
  });
});

describe('buying', () => {
  const $ = (id: string) => document.getElementById(id)!;
  const PACK = { x: -1.5, z: 6.4 };

  it('lays the tiles square with the world, not turned to the camera', async () => {
    const g = await loadGame();
    expect(g.unlocks.tiles.every(t => t.d.mesh.rotation.z === 0 && t.d.mesh.rotation.x === -Math.PI / 2)).toBe(true);
  });

  it('reminds the player how to buy after two seconds on a tile, until they do', async () => {
    const g = await loadGame({ money: 35 });
    g.placePlayer(PACK.x, PACK.z);
    g.run(1.9);
    expect($('buyHint').hidden).toBe(true);
    g.run(0.2);
    expect($('buyHint').hidden).toBe(false);
    expect($('buyHint').textContent).toBe('Hold E to buy this');
    g.press('e');
    g.run(0.05);
    expect($('buyHint').hidden).toBe(true);
    g.press('e', 'keyup');
    g.placePlayer(0, -3);
    g.run(5);
    expect($('buyHint').hidden).toBe(true);
    expect($('buy').hidden).toBe(true); // a computer has E: no button
  });

  it('gives a touch screen a Buy button to hold while on a tile', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148');
    const g = await loadGame({ money: 35 });
    const buy = $('buy');
    expect(buy.hidden).toBe(true);
    g.placePlayer(PACK.x, PACK.z);
    g.run(0.1);
    expect(buy.hidden).toBe(false);
    expect($('buyHint').textContent).toBe('Hold Buy to buy this');
    buy.dispatchEvent(new Event('pointerdown'));
    expect(buy.classList.contains('down')).toBe(true);
    g.run(0.3);
    const part = g.wallet.money;
    expect(part).toBeLessThan(35);
    buy.dispatchEvent(new Event('pointerup'));
    g.run(0.5);
    expect(g.wallet.money).toBe(part); // let go: it stops
    // walking off with it held lets go too
    buy.dispatchEvent(new Event('pointerdown'));
    g.placePlayer(0, -3);
    g.run(0.1);
    expect(buy.hidden).toBe(true);
    expect(buy.classList.contains('down')).toBe(false);
    g.placePlayer(PACK.x, PACK.z);
    g.run(0.5);
    expect(g.wallet.money).toBe(part);
    const menu = new Event('contextmenu', { cancelable: true });
    buy.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true); // a long press doesn't bring up the browser's menu
  });
});
