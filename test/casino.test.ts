// Roulette: the rules, and the table as the player uses it.
import { describe, expect, it, vi } from 'vitest';
import { colorOf, payout, spinWheel, WHEEL, wins } from '../src/roulette';
import { bought, loadGame } from './helpers';

describe('roulette rules', () => {
  it('has 37 distinct pockets: 18 red, 18 black, one green zero', () => {
    expect(new Set(WHEEL).size).toBe(37);
    expect([...WHEEL].sort((a, b) => a - b)).toEqual([...Array(37).keys()]);
    const colors = WHEEL.map(colorOf);
    expect(colors.filter(c => c === 'red')).toHaveLength(18);
    expect(colors.filter(c => c === 'green')).toEqual(['green']);
    expect(colorOf(0)).toBe('green');
  });

  it('settles every bet type, with zero losing all even-money bets', () => {
    expect(wins({ kind: 'red' }, 32)).toBe(true);
    expect(wins({ kind: 'black' }, 15)).toBe(true);
    expect(wins({ kind: 'odd' }, 7)).toBe(true);
    expect(wins({ kind: 'even' }, 8)).toBe(true);
    expect(wins({ kind: 'low' }, 18)).toBe(true);
    expect(wins({ kind: 'high' }, 19)).toBe(true);
    for (const kind of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) expect(wins({ kind }, 0)).toBe(false);
    expect(payout({ kind: 'red' }, 10, 32)).toBe(20);
    expect(payout({ kind: 'red' }, 10, 15)).toBe(0);
    expect(payout({ kind: 'number', n: 17 }, 10, 17)).toBe(360);
    expect(payout({ kind: 'number', n: 17 }, 10, 18)).toBe(0);
  });

  it('spins to the pocket the random number picks', () => {
    expect(spinWheel(() => 0)).toBe(0);
    expect(spinWheel(() => 0.999)).toBe(26);
  });
});

/** Makes the next spin land on pocket `n`. */
const rig = (n: number) => vi.spyOn(Math, 'random').mockReturnValue((WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / 37);

describe('roulette table', () => {
  const $ = (id: string) => document.getElementById(id)!;
  const click = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click();

  async function atTable(money: number) {
    const g = await loadGame({ money, tiles: bought('roulette') });
    g.placePlayer(-4.3, 0.6);
    g.run(0.05);
    return g;
  }

  it('opens when the player steps on its pad', async () => {
    const g = await atTable(100);
    expect($('casino').hidden).toBe(false);
    expect($('casinoMsg').textContent).toBe('Pick a bet and spin');
    expect($('spin').textContent).toBe('Spin: $25 on Red (pays ×2)');
    g.placePlayer(0, 0);
    g.run(0.05);
    expect($('casino').hidden).toBe(true);
  });

  it('takes the stake, reveals the result after the spin, and pays winners', async () => {
    const g = await atTable(100);
    rig(32); // red
    click('#spin');
    expect(g.wallet.money).toBe(75);
    expect($('spin').textContent).toBe('Spinning…');
    g.run(1);
    expect(g.wallet.money).toBe(75); // not revealed yet
    g.run(3);
    expect(g.wallet.money).toBe(125);
    expect(g.wallet.inFlight).toBe(0);
    expect($('casinoMsg').textContent).toBe('32 Red: you win $50!');
    expect($('history').textContent).toBe('32');
  });

  it('keeps the stake on a loss', async () => {
    const g = await atTable(100);
    rig(0);
    click('#spin');
    g.run(4);
    expect(g.wallet.money).toBe(75);
    expect($('casinoMsg').textContent).toBe('0 Green: the house wins.');
  });

  it('bets on a single number at 35 to 1', async () => {
    const g = await atTable(100);
    click('[data-bet="number"]');
    expect($('numPick').hidden).toBe(false);
    click('[data-step="1"]');
    click('[data-step="-1"]');
    click('[data-step="-1"]');
    click('[data-stake="5"]');
    expect($('spin').textContent).toBe('Spin: $5 on number 16 (pays ×36)');
    rig(16);
    click('#spin');
    g.run(4);
    expect(g.wallet.money).toBe(95 + 180);
  });

  it("won't take bets the player can't cover", async () => {
    const g = await atTable(60);
    expect(document.querySelector<HTMLButtonElement>('[data-stake="100"]')!.disabled).toBe(true);
    click('[data-stake="all"]');
    expect($('spin').textContent).toContain('$60');
    rig(15); // black: lose it all
    click('#spin');
    g.run(4);
    expect(g.wallet.money).toBe(0);
    expect((($('spin')) as HTMLButtonElement).disabled).toBe(true);
  });

  it('settles at once if the player walks away mid-spin', async () => {
    const g = await atTable(100);
    rig(32);
    click('#spin');
    g.run(0.5);
    g.placePlayer(0, 0);
    g.run(0.05);
    expect($('casino').hidden).toBe(true);
    expect(g.wallet.money).toBe(125);
  });

  it('saves a win that is still spinning', async () => {
    const g = await atTable(100);
    rig(32);
    click('#spin');
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).money).toBe(125);
  });

  it('greets a broke player', async () => {
    await atTable(0);
    expect($('casinoMsg').textContent).toBe('Come back with some cash to play');
  });
});
