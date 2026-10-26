// The player's worst bet, for the wall of shame (report 12): the most one round at the boat's games ever lost.
import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  const [W, { wallet }] = await Promise.all([import('../src/worstBet'), import('../src/wallet')]);
  return { ...W, wallet };
};

describe('the worst bet', () => {
  afterEach(() => { localStorage.clear(); });

  it('keeps the round that lost the most, and nothing for a win, a push or a smaller loss', async () => {
    const { scoreBet, worstBet, onWorse, wallet } = await load();
    const seen: number[] = [];
    onWorse(w => seen.push(w.lost));
    wallet.money = 500;
    expect(worstBet()).toBeNull();
    expect(scoreBet('blackjack', 100, 200)).toBe(false); // a win
    expect(scoreBet('blackjack', 100, 100)).toBe(false); // a push
    expect(worstBet()).toBeNull();
    expect(scoreBet('roulette', 300, 0, 'red')).toBe(true);
    expect(scoreBet('slots', 50, 0)).toBe(false); // less than that
    expect(scoreBet('blackjack', 400, 50)).toBe(true); // lost 350
    expect(worstBet()).toMatchObject({ lost: 350, game: 'blackjack', broke: false });
    expect(worstBet()!.on).toBeUndefined();
    expect(seen).toEqual([300, 350]);
  });

  it('says so when it left the player with nothing, and what it was on', async () => {
    const { scoreBet, worstBet, betOn, wallet } = await load();
    wallet.money = 0;
    scoreBet('roulette', 9_900_000, 0, 'black');
    expect(worstBet()).toMatchObject({ lost: 9_900_000, on: 'black', broke: true });
    expect(betOn(worstBet()!)).toBe('on Black');
    expect(betOn({ game: 'slots' })).toBe('at the slots');
    expect(betOn({ game: 'blackjack' })).toBe('at blackjack');
  });

  it('is kept on the device through a reload', async () => {
    const first = await load();
    first.wallet.money = 10;
    first.scoreBet('slots', 1_000, 0);
    const again = await load(); // a reload
    expect(again.worstBet()).toMatchObject({ lost: 1_000, game: 'slots' });
    expect(again.scoreBet('slots', 900, 0)).toBe(false);
  });
});
