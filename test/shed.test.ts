// The fertilizer shed (stage 2): it opens with the takeout kiosk, on a deck by the water wheel, and its square sells
// rice fertilizer, which makes the terraces ripen faster.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const rowsText = () => [...$('shopRows').children].map(r => r.textContent);
type Game = Awaited<ReturnType<typeof loadGame>>;
const stand = (g: Game, at: { x: number; z: number }) => { g.placePlayer(at.x, at.z); g.run(0.3); };

describe('the fertilizer shed', () => {
  it("isn't there before the takeout kiosk: nothing to stand on, and no fertilizer for sale", async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'plot2', 'plot3'), money: 1e9 });
    const { SHED_AT, shed } = g.shed;
    stand(g, SHED_AT);
    expect(shed.visible).toBe(false);
    expect(g.player.g.position.z).toBeLessThan(SHED_AT.z - 1); // kept on the path
    expect($('shop').hidden).toBe(true);
    expect(g.shop.buyMod('fertilizer')).toBe(false);
    stand(g, g.shop.SHOPS[1]);
    expect(rowsText().some(r => r!.includes('fertilizer'))).toBe(false); // not on the upgrade square either
  });

  it('opens with the kiosk, says so, and sells fertilizer on a deck off the end of the path', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy'), money: 1e9 });
    vi.useFakeTimers();
    const { SHED_AT, shed } = g.shed;
    g.unlocks.applyUnlock('kiosk');
    expect(shed.visible).toBe(true);
    expect($('toast').textContent).toBe('Takeout kiosk unlocked');
    vi.advanceTimersByTime(2000);
    expect($('toast').textContent).toBe('New: the Fertilizer shed, by the water wheel');
    expect([...document.querySelectorAll('.ptr')].map(p => p.textContent)).toContain('🌿');

    stand(g, SHED_AT);
    expect(g.player.g.position.x).toBeCloseTo(SHED_AT.x);
    expect(g.player.g.position.z).toBeCloseTo(SHED_AT.z);
    expect(g.player.g.position.y).toBeCloseTo(g.layout.SHED_YARD.y, 2); // up on the deck
    expect($('shop').hidden).toBe(false);
    expect($('shopTitle').textContent).toBe('Fertilizer shed');
    expect(rowsText()).toEqual(['🌿Rice fertilizer · next: CompostRice growth +0% → +50%$20,000']);
    ($('shopRows').children[0] as HTMLButtonElement).click();
    expect(g.economy.mods.fertilizer).toBe(1);
    expect(rowsText()).toEqual(['🌿Rice fertilizer · next: Fish mealRice growth +50% → +125%$40,000']);
    stand(g, g.shop.SHOPS[1]);
    expect($('shopTitle').textContent).toBe('Restaurant upgrades');
    expect(rowsText()).toHaveLength(3); // prices, marketing and the crew, as before
  });

  it('makes the terraces ripen faster, with a sack of each kind in the shed', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'paddy', 'kiosk'), money: 1e9 });
    const c = g.rice.field.cells[0];
    for (let i = 0; i < 3; i++) expect(g.shop.buyMod('fertilizer')).toBe(true);
    expect(g.shop.buyMod('fertilizer')).toBe(false); // three kinds, then it's fully upgraded
    expect($('toast').textContent).toBe('Rice fertilizer: Spring minerals');
    c.grow = 0;
    g.run(1);
    expect(c.grow).toBeCloseTo(1.5 ** 3 / 30, 2);
    expect(g.shed.sacks.map(s => s.visible)).toEqual([true, true, true]);
  });

  it('is still open after a reload, with its fertilizer and sacks, and in the modifier overview', async () => {
    const g1 = await loadGame({ tiles: bought('sushi', 'paddy', 'kiosk'), money: 1e9 });
    g1.shop.buyMod('fertilizer'); g1.shop.buyMod('fertilizer');
    const g = await loadGame(localStorage.getItem('floe-market-v1')!);
    g.run(0.05);
    expect(g.shed.shed.visible).toBe(true);
    expect(g.economy.mods.fertilizer).toBe(2);
    expect(g.shed.sacks.map(s => s.visible)).toEqual([true, true, false]);
    expect([...$('mods').children].map(r => r.textContent)).toContain('🌿Rice growth+125%');
  });
});
