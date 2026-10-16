// Three-Card Tommy's monte, played without his table: the swaps, where the queen ends up, and the money a round moves.
import { describe, expect, it } from 'vitest';
import { LIMIT_FLOOR, limitFor, placesAfter, ROUNDS, START, startRound, SWAPS, swapsFor, WIN } from '../src/monte';

/** Random numbers that pick these swaps in turn (0 left and middle, 1 middle and right, 2 the ends). */
const swapsOf = (...pairs: number[]) => { let i = 0; return () => (pairs[i++ % pairs.length] + 0.5) / 3; };

describe("Tommy's monte", () => {
  it('swaps 4 times for a little, 10 at the limit, and more the more is staked', () => {
    expect(swapsFor(1, 100)).toBe(SWAPS.min);
    expect(swapsFor(100, 100)).toBe(SWAPS.max);
    expect(swapsFor(50, 100)).toBe(7);
    for (let s = 1; s < 100; s++) expect(swapsFor(s + 1, 100)).toBeGreaterThanOrEqual(swapsFor(s, 100));
    expect(startRound(1, 1000, 100, swapsOf(0))!.round.swaps).toHaveLength(4);
    expect(startRound(100, 1000, 100, swapsOf(0))!.round.swaps).toHaveLength(10);
  });

  it("follows the queen through his swaps: she starts in the middle and is always on the table", () => {
    // middle and right, then left and middle (she's not in it), then the ends: right to left
    const r = startRound(1, 10, 100, swapsOf(1, 0, 2, 2))!.round;
    expect(START).toBe(1);
    expect(r.swaps.slice(0, 3)).toEqual([[1, 2], [0, 1], [0, 2]]);
    // four swaps at this stake: the fourth is the ends again, so she's back on the right
    expect(r.queen).toBe(2);
    expect(placesAfter(r.swaps, r.swaps.length)[START]).toBe(r.queen);
    for (let i = 0; i < 200; i++) {
      const q = startRound(1 + (i % 100), 1000, 100)!.round;
      expect([0, 1, 2]).toContain(q.queen);
      const at = placesAfter(q.swaps, q.swaps.length);
      expect([...at].sort()).toEqual([0, 1, 2]);
      expect(at[START]).toBe(q.queen);
    }
  });

  it('takes the stake as he deals, pays double for finding her, and nothing for a wrong card', () => {
    const s = startRound(10, 50, 100, swapsOf(1))!;
    expect(s.moves).toEqual({ take: 10 });
    expect(s.round.pick(s.round.queen)).toEqual({ pay: 10 * WIN });
    expect(s.round.won).toBe(true);
    // a second pick pays nothing more
    expect(s.round.pick(s.round.queen)).toEqual({});
    const l = startRound(10, 50, 100, swapsOf(1))!;
    expect(l.round.pick((l.round.queen + 1) % 3)).toEqual({ pay: 0 });
    expect(l.round.won).toBe(false);
  });

  it("won't deal for nothing, more than the player has, or over his limit", () => {
    expect(startRound(0, 50, 100)).toBeNull();
    expect(startRound(60, 50, 100)).toBeNull();
    expect(startRound(101, 500, 100)).toBeNull();
    expect(startRound(100, 500, 100)).not.toBeNull();
  });

  it('has a limit of about two minutes of takings, never below the floor, and plays 3 rounds a fight', () => {
    expect(limitFor(0)).toBe(LIMIT_FLOOR);
    expect(limitFor(300)).toBe(600);
    expect(ROUNDS).toBe(3);
  });
});
