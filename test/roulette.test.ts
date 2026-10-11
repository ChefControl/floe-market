// A roulette round, played without the table: the wheel, the colours and what each pays, and the money a round moves.
import { describe, expect, it } from 'vitest';
import { colorOf, startRound, WHEEL, type Bet } from '../src/roulette';

/** A random number that spins the wheel to pocket `n`. */
const landOn = (n: number) => () => (WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / WHEEL.length;
/** Plays a round of `stake` on `bet` that lands on pocket `n`, for a player with plenty of cash. */
const play = (bet: Bet, stake: number, n: number) => startRound(bet, stake, 1000, landOn(n))!;

describe('the wheel', () => {
  it('has 37 distinct pockets: 18 red, 18 black, one green zero', () => {
    expect(new Set(WHEEL).size).toBe(37);
    expect([...WHEEL].sort((a, b) => a - b)).toEqual([...Array(37).keys()]);
    const colors = WHEEL.map(colorOf);
    expect(colors.filter(c => c === 'red')).toHaveLength(18);
    expect(colors.filter(c => c === 'green')).toEqual(['green']);
    expect(colorOf(0)).toBe('green');
  });

  it('lands on the pocket the random number picks', () => {
    expect(startRound('red', 10, 100, () => 0)!.round.pocket).toBe(0);
    expect(startRound('red', 10, 100, () => 0.999)!.round.pocket).toBe(26);
  });
});

describe('a roulette round', () => {
  it('pays red and black at even money and green at 35 to 1, stake included', () => {
    expect(play('red', 10, 32).round.win).toBe(20);
    expect(play('black', 10, 15).round.win).toBe(20);
    expect(play('green', 10, 0).round.win).toBe(360);
  });

  it('loses on the other colour, and zero loses red and black', () => {
    expect(play('red', 10, 15).round.win).toBe(0);
    expect(play('green', 10, 32).round.win).toBe(0);
    expect(play('red', 10, 0).round.win).toBe(0);
    expect(play('black', 10, 0).round.win).toBe(0);
  });

  it('takes the stake and owes the win from the start, then pays it when it settles', () => {
    const { round, moves } = play('red', 25, 32);
    expect(moves).toEqual({ take: 25, owed: 50 });
    expect(round.settle()).toEqual({ owed: 0, pay: 50 });
  });

  it('pays only once, however often it settles (the player walking off as the ball lands)', () => {
    const { round } = play('red', 25, 32);
    round.settle();
    expect(round.settle()).toEqual({ owed: 0, pay: 0 });
  });

  it('owes and pays nothing on a loss: the stake is gone', () => {
    const { round, moves } = play('black', 25, 0);
    expect(moves).toEqual({ take: 25, owed: 0 });
    expect(round.settle()).toEqual({ owed: 0, pay: 0 });
  });

  it("won't start for nothing, or for more than the player has; all in is fine", () => {
    expect(startRound('red', 0, 100, landOn(32))).toBeNull();
    expect(startRound('red', 101, 100, landOn(32))).toBeNull();
    expect(startRound('red', 100, 100, landOn(32))!.moves.take).toBe(100);
  });

  it("doesn't spin the wheel for a stake it won't take", () => {
    let spun = 0;
    startRound('red', 101, 100, () => { spun++; return 0; });
    expect(spun).toBe(0);
  });
});
