// A slots round, played without the machine: the reel, what pays, and the money a round moves.
import { describe, expect, it } from 'vitest';
import { lineMultiplier, REEL, resultLine, startRound, type Sym } from '../src/slots';

/** Random numbers that stop the reels, left to right, at these places on the strip. */
const stopAt = (...stops: number[]) => { let i = 0; return () => (stops[i++] + 0.5) / REEL.length; };
/** Plays a round of `stake` that stops the reels at `stops`, for a player with plenty of cash. */
const play = (stake: number, ...stops: number[]) => startRound(stake, 10_000, stopAt(...stops))!;

describe('the reel and what pays', () => {
  it('has 20 symbols a reel, the rarer ones worth more', () => {
    const count = (s: Sym) => REEL.filter(x => x === s).length;
    expect(REEL).toHaveLength(20);
    expect(['🍒', '🍋', '🔔', '🐟', '💎', '7'].map(s => count(s as Sym))).toEqual([6, 5, 4, 3, 1, 1]);
  });

  it('pays for three of a kind, and for two cherries', () => {
    expect(lineMultiplier(['7', '7', '7'])).toBe(100);
    expect(lineMultiplier(['🍒', '🍒', '🍒'])).toBe(8);
    expect(lineMultiplier(['🍒', '🍋', '🍒'])).toBe(2);
    expect(lineMultiplier(['🍒', '🍋', '🔔'])).toBe(0);
    expect(lineMultiplier(['7', '7', '💎'])).toBe(0);
  });

  it('returns about 97% of what goes in, like the roulette wheel', () => {
    let back = 0;
    for (let a = 0; a < 20; a++) for (let b = 0; b < 20; b++) for (let d = 0; d < 20; d++) back += lineMultiplier([REEL[a], REEL[b], REEL[d]]);
    expect(back / 8000).toBeCloseTo(0.973, 3);
  });
});

describe('a slots round', () => {
  it('stops each reel where the random numbers say, left to right', () => {
    expect(startRound(25, 100, () => 0)!.round.stops).toEqual([0, 0, 0]);
    expect(startRound(25, 100, () => 0.999)!.round.stops).toEqual([19, 19, 19]);
    expect(play(25, 4, 11, 17).round.stops).toEqual([4, 11, 17]);
  });

  it('reads the pay line off where the reels stop, and pays by it, stake included', () => {
    const fish = play(25, 4, 11, 17).round;
    expect(fish.line).toEqual(['🐟', '🐟', '🐟']);
    expect(fish.win).toBe(625);
    expect(play(25, 8, 8, 8).round.win).toBe(2500); // the jackpot
    expect(play(25, 0, 1, 3).round.win).toBe(50); // two cherries
    expect(play(25, 0, 1, 2).round.win).toBe(0);
  });

  it('takes the stake and owes the win from the start, then pays it when it settles', () => {
    const { round, moves } = play(25, 4, 11, 17);
    expect(moves).toEqual({ take: 25, owed: 625 });
    expect(round.settle()).toEqual({ owed: 0, pay: 625 });
  });

  it('pays only once, however often it settles (the player walking off as the last reel stops)', () => {
    const { round } = play(25, 4, 11, 17);
    round.settle();
    expect(round.settle()).toEqual({ owed: 0, pay: 0 });
  });

  it('owes and pays nothing for no match: the stake is gone', () => {
    const { round, moves } = play(25, 0, 1, 2);
    expect(moves).toEqual({ take: 25, owed: 0 });
    expect(round.settle()).toEqual({ owed: 0, pay: 0 });
  });

  it("won't start for nothing, or for more than the player has; all in is fine, and nothing spins for a refused stake", () => {
    let spun = 0;
    const rng = () => { spun++; return 0; };
    expect(startRound(0, 100, rng)).toBeNull();
    expect(startRound(101, 100, rng)).toBeNull();
    expect(spun).toBe(0);
    expect(startRound(100, 100, rng)!.moves.take).toBe(100);
  });
});

describe('what the machine says once a round is settled', () => {
  it('reads out the pay line and the win, calls the jackpot, and says when nothing pays', () => {
    expect(resultLine(play(25, 8, 8, 8).round)).toBe('Jackpot! You win $2,500!');
    expect(resultLine(play(25, 4, 11, 17).round)).toBe('🐟 🐟 🐟: you win $625!');
    expect(resultLine(play(25, 0, 1, 3).round)).toBe('🍒 🍋 🍒: you win $50!');
    expect(resultLine(play(25, 0, 1, 2).round)).toBe('🍒 🍋 🔔: no luck this time.');
  });
});
