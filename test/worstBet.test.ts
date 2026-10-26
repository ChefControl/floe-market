// The worst bet today, for the sign by the corner of tears (report 12): the most one round at the boat's games lost.
import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  const [W, { wallet }] = await Promise.all([import('../src/worstBet'), import('../src/wallet')]);
  return { ...W, wallet };
};

describe('the worst bet today', () => {
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

  it('keeps the round that lost the most today, and nothing for a win, a push or a smaller loss', async () => {
    const { scoreBet, worstToday, wallet } = await load();
    wallet.money = 500;
    expect(worstToday()).toBeNull();
    expect(scoreBet('blackjack', 100, 200)).toBe(false); // a win
    expect(scoreBet('blackjack', 100, 100)).toBe(false); // a push
    expect(worstToday()).toBeNull();
    expect(scoreBet('roulette', 300, 0, 'red')).toBe(true);
    expect(scoreBet('slots', 50, 0)).toBe(false); // less than that
    expect(scoreBet('blackjack', 400, 50)).toBe(true); // lost 350
    expect(worstToday()).toMatchObject({ lost: 350, game: 'blackjack', broke: false });
    expect(worstToday()!.on).toBeUndefined();
  });

  it('says so when it left the player with nothing', async () => {
    const { scoreBet, worstToday, wallet } = await load();
    wallet.money = 0;
    scoreBet('roulette', 9_900_000, 0, 'black');
    expect(worstToday()).toMatchObject({ lost: 9_900_000, on: 'black', broke: true });
  });

  it('is kept on the device through a reload, and starts over the next day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 26, 23, 50));
    const first = await load();
    first.wallet.money = 10;
    first.scoreBet('slots', 1_000, 0);
    const again = await load(); // a reload
    expect(again.worstToday()).toMatchObject({ lost: 1_000, game: 'slots' });
    vi.setSystemTime(new Date(2026, 9, 27, 0, 5)); // past midnight
    expect(again.worstToday()).toBeNull();
    expect(again.scoreBet('slots', 10, 0)).toBe(true); // today's first loss, however small
  });
});
