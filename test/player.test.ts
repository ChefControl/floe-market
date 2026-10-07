// Player movement and every station interaction.
import { describe, expect, it } from 'vitest';
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

  it('buys rice at the stall while there is money and room', async () => {
    const g = await loadGame({ tiles: bought('sushi'), money: 16 });
    const { STALL, RICE_PRICE } = g.rice;
    g.placePlayer(STALL.x, STALL.z);
    g.run(1);
    expect(g.player.back.items.map(g.items.kindOf)).toEqual(['rice', 'rice', 'rice']);
    expect(g.wallet.money).toBe(16 - 3 * RICE_PRICE);
    expect(document.getElementById('tip')!.textContent).toContain('Rice stall');
  });

  it('is kept out of the bar, the kitchen line, the register desk and the stall', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const p = g.player.g.position;
    const at = (x: number, z: number) => { g.placePlayer(x, z); g.run(0.02); return [p.x, p.z]; };
    expect(at(0, 9.0)[1]).toBeCloseTo(11.25); // dead centre of the bar: out the front
    expect(at(-5.0, 9.0)[0]).toBeCloseTo(-6.45); // round its end
    expect(at(0, 2.4)[1]).toBeCloseTo(1.8); // kitchen line: out the shallow side
    expect(at(-6.1, 2.6)[0]).toBeCloseTo(-6.3);
    expect(at(7.6, 14.0)[1]).toBeCloseTo(13.7); // the register desk
    expect(at(6.7, -5.0)[1]).toBeCloseTo(-4.6); // the rice stall
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

  it('shows the upgrade tip and pays into the tile after a short stand', async () => {
    const g = await loadGame({ money: 35 });
    const tip = document.getElementById('tip')!;
    g.placePlayer(-1.5, 6.4);
    g.run(0.2);
    expect(tip.classList.contains('on')).toBe(true);
    expect(tip.textContent).toContain('Bigger arms');
    expect(g.wallet.money).toBe(35);
    g.run(1.5);
    expect(g.wallet.money).toBe(5);
    expect(g.player.back.cap).toBe(14);
    expect(tip.classList.contains('on')).toBe(false);
    expect(localStorage.getItem('floe-market-v1')).toContain('"done":true');
  });
});
