// Blackjack without the table: the cards, the shoe (shuffle, cut, burn, the cut card), and a round, from the deal to
// the payout, with the money it moves.
import { describe, expect, it } from 'vitest';
import {
  BlackjackRound, CUT_CARD, handValue, insuranceCost, isBlackjack, PLAYER_CUT, resultLine, Shoe, type Card, type Suit,
} from '../src/blackjack';

/** A card: 1 is an ace, 11 to 13 the faces. */
const c = (rank: number, suit: Suit = '♠'): Card => ({ rank, suit });
/** A random number generator that always gives the same sequence. */
const seeded = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/** Fives to fill the shoe out under the cards a test deals, so the cut card stays in. */
const FILL = Array.from({ length: 60 }, () => c(5, '♣'));

/**
 * Deals a round of `stake` for a player holding `cash`: their two cards, the dealer's two, then `rest` to draw. Returns
 * the round, the shoe, and the money dealing moved.
 */
function deal(player: Card[], dealer: Card[], rest: Card[] = [], stake = 10, cash = 100) {
  const shoe = Shoe.of([player[0], dealer[0], player[1], dealer[1], ...rest, ...FILL]);
  const { round, moves } = BlackjackRound.deal(shoe, stake, cash)!;
  return { round, shoe, moves };
}
/** Deals, checks the deal (no insurance asked), and stands on the hand. */
function stood(player: Card[], dealer: Card[], rest: Card[] = [], stake = 10) {
  const { round } = deal(player, dealer, rest, stake);
  round.afterDeal(100);
  round.stand();
  return round;
}

describe('the cards', () => {
  it('counts an ace as 11 until that would bust the hand', () => {
    expect(handValue([c(1), c(6)])).toEqual({ total: 17, soft: true });
    expect(handValue([c(1), c(6), c(10)])).toEqual({ total: 17, soft: false });
    expect(handValue([c(1), c(1), c(9)])).toEqual({ total: 21, soft: true });
    expect(handValue([c(13), c(12), c(2)]).total).toBe(22);
  });

  it('a blackjack is 21 in two cards', () => {
    expect(isBlackjack([c(1), c(13)])).toBe(true);
    expect(isBlackjack([c(1), c(5), c(5)])).toBe(false);
  });

  it('insurance costs half the stake, in whole dollars', () => {
    expect(insuranceCost(25)).toBe(12);
    expect(insuranceCost(1)).toBe(0);
  });
});

describe('the shoe', () => {
  it('holds six decks, shuffled, and is due its first shuffle at the table', () => {
    const shoe = new Shoe(seeded());
    expect(shoe.left).toHaveLength(312);
    expect(shoe.left.filter(x => x.rank === 1 && x.suit === '♥')).toHaveLength(6);
    expect(new Shoe(seeded(2)).left).not.toEqual(shoe.left);
    expect(shoe.due).toBe('fresh');
    shoe.shuffle();
    expect(shoe.due).toBeNull();
    expect(shoe.left).toHaveLength(312);
  });

  it('cuts: the cards above the cut go to the bottom, and the one under them comes out next', () => {
    const shoe = new Shoe(seeded());
    const before = shoe.left; // the next one out last
    expect(shoe.cut(100)).toBe(100);
    expect(shoe.left).toEqual([...before.slice(212), ...before.slice(0, 212)]);
    expect(shoe.draw()).toEqual(before[before.length - 1 - 100]);
  });

  it('keeps the cut at least a deck in from either end', () => {
    expect(new Shoe(seeded()).cut(5)).toBe(PLAYER_CUT.min);
    expect(new Shoe(seeded()).cut(300)).toBe(PLAYER_CUT.max);
    expect([PLAYER_CUT.min, PLAYER_CUT.max]).toEqual([52, 260]);
  });

  it('lets the dealer cut anywhere the player could', () => {
    expect(new Shoe(() => 0).dealerCut()).toBe(52);
    expect(new Shoe(() => 0.9999).dealerCut()).toBe(260);
  });

  it('is due a shuffle once the cut card comes out with a round', () => {
    const cards = [c(10), c(10), c(9), c(7)];
    const out = Shoe.of([...cards, ...FILL.slice(0, CUT_CARD - 1)]);
    const r = BlackjackRound.deal(out, 10, 100)!.round;
    r.afterDeal(100); r.stand(); r.settle();
    expect(out.due).toBe('out');
    expect(BlackjackRound.deal(out, 10, 100)).toBeNull(); // no dealing till it's shuffled
    const plenty = Shoe.of([...cards, ...FILL]);
    const s = BlackjackRound.deal(plenty, 10, 100)!.round;
    s.afterDeal(100); s.stand(); s.settle();
    expect(plenty.due).toBeNull();
  });
});

describe('a blackjack round', () => {
  it('deals straight off the shoe, player, dealer, player, dealer, and takes the stake', () => {
    const { round, moves, shoe } = deal([c(10), c(7, '♥')], [c(9), c(8)], [c(4)]);
    expect(round.hands[0].cards).toEqual([c(10), c(7, '♥')]);
    expect(round.dealer).toEqual([c(9), c(8)]);
    expect(moves.take).toBe(10);
    expect(shoe.draw()).toEqual(c(4));
  });

  it("won't deal for nothing, or for more than the player has; all in is fine", () => {
    const shoe = () => Shoe.of([c(10), c(9), c(8), c(7), ...FILL]);
    expect(BlackjackRound.deal(shoe(), 0, 100)).toBeNull();
    expect(BlackjackRound.deal(shoe(), 101, 100)).toBeNull();
    expect(BlackjackRound.deal(shoe(), 100, 100)!.moves.take).toBe(100);
  });

  it('owes what standing would win from the deal on, and pays it once the dealer has played', () => {
    const { round, moves } = deal([c(10), c(9)], [c(10), c(7)], [], 25);
    expect(moves.owed).toBe(50);
    expect(round.afterDeal(100)).toEqual({ owed: 50 });
    expect(round.phase).toBe('player');
    expect(round.stand()).toEqual({ owed: 50 });
    expect(round.phase).toBe('dealer');
    expect(round.settle()).toEqual({ owed: 0, pay: 50 });
    expect(round.settle()).toEqual({}); // only once
    expect(round.phase).toBe('done');
  });

  it('the dealer draws to 17 and stands on any 17, soft or not', () => {
    expect(stood([c(10), c(9)], [c(1), c(6)], [c(5)]).draws).toEqual([]);
    const r = stood([c(10), c(8)], [c(10), c(3)], [c(2), c(4), c(9)]);
    expect(r.draws).toEqual([c(2), c(4)]);
    expect(r.dealer).toEqual([c(10), c(3), c(2), c(4)]);
  });

  it('pays double for a win, the stake back for a push, and nothing for a loss', () => {
    expect(stood([c(10), c(9)], [c(10), c(7)]).results).toEqual([{ outcome: 'win', payout: 20 }]);
    expect(stood([c(10), c(8)], [c(9), c(9)]).results).toEqual([{ outcome: 'push', payout: 10 }]);
    expect(stood([c(10), c(7)], [c(10), c(9)]).results).toEqual([{ outcome: 'lose', payout: 0 }]);
    expect(stood([c(10), c(8)], [c(10), c(6)], [c(9)]).results).toEqual([{ outcome: 'win', payout: 20 }]); // dealer busts
  });

  it('pays 3 to 2 for a blackjack straight after the deal, in whole dollars', () => {
    const { round } = deal([c(1), c(13)], [c(10), c(9)], [], 25);
    expect(round.afterDeal(100)).toEqual({ owed: 62 });
    expect(round.phase).toBe('dealer');
    expect(round.results).toEqual([{ outcome: 'blackjack', payout: 62 }]);
    expect(round.draws).toEqual([]);
  });

  it('ends the round when the dealer has blackjack under a ten, and pushes blackjack against blackjack', () => {
    const { round } = deal([c(10), c(9)], [c(12), c(1)]);
    round.afterDeal(100);
    expect(round.phase).toBe('dealer');
    expect(round.results).toEqual([{ outcome: 'lose', payout: 0 }]);
    const both = deal([c(1), c(13)], [c(13), c(1)]).round;
    both.afterDeal(100);
    expect(both.results).toEqual([{ outcome: 'push', payout: 10 }]);
  });

  it('a bust loses at once, without the dealer drawing', () => {
    const { round } = deal([c(10), c(6)], [c(10), c(5)], [c(13), c(2)]);
    round.afterDeal(100);
    expect(round.hit()).toEqual({ owed: 0 });
    expect(round.phase).toBe('dealer');
    expect(round.draws).toEqual([]);
    expect(round.results).toEqual([{ outcome: 'bust', payout: 0 }]);
  });

  it('hits, and stands by itself on 21', () => {
    const { round } = deal([c(1), c(6)], [c(10), c(8)], [c(2), c(2)]);
    round.afterDeal(100);
    round.hit();
    expect(round.phase).toBe('player');
    round.hit();
    expect(round.hands[0].cards).toHaveLength(4);
    expect(round.phase).toBe('dealer'); // 21
    expect(round.results).toEqual([{ outcome: 'win', payout: 20 }]);
  });

  it('checks for blackjack under an ace before the player plays', () => {
    const { round } = deal([c(7), c(7)], [c(1), c(10)], [c(7)]);
    round.afterDeal(0); // nothing to insure with
    expect(round.phase).toBe('dealer'); // the dealer checks for blackjack before the player plays
    expect(round.results[0].outcome).toBe('lose');
  });

  it('doubles for one card and the stake again, face down on 10 or 11', () => {
    const { round } = deal([c(5), c(6)], [c(10), c(6)], [c(10), c(2)]);
    round.afterDeal(100);
    expect(round.double(100)).toEqual({ take: 10, owed: 40 });
    expect(round.hands[0]).toMatchObject({ stake: 20, down: true, cards: [c(5), c(6), c(10)] });
    expect(round.draws).toEqual([c(2)]);
    expect(round.results).toEqual([{ outcome: 'win', payout: 40 }]);
    const up = deal([c(5), c(4)], [c(10), c(7)], [c(10)]).round;
    up.afterDeal(100);
    up.double(100);
    expect(up.hands[0].down).toBe(false);
    expect(up.results).toEqual([{ outcome: 'win', payout: 40 }]);
  });

  it("won't double what the player can't cover, or after the first two cards", () => {
    const { round } = deal([c(5), c(6)], [c(10), c(9)], [c(2), c(2)]);
    round.afterDeal(100);
    expect(round.canDouble(9)).toBe(false);
    expect(round.double(9)).toEqual({});
    expect(round.canDouble(10)).toBe(true);
    round.hit();
    expect(round.canDouble(100)).toBe(false);
  });

  it('splits a pair (any two tens too) into two hands, played in turn, with doubling after the split', () => {
    const tens = deal([c(13), c(10)], [c(10), c(7)]).round;
    tens.afterDeal(100);
    expect(tens.canSplit(100)).toBe(true);
    const nine = deal([c(8), c(9)], [c(10), c(7)]).round;
    nine.afterDeal(100);
    expect(nine.canSplit(100)).toBe(false);
    const { round } = deal([c(8), c(8, '♥')], [c(10), c(7)], [c(3), c(10), c(10)]);
    round.afterDeal(100);
    expect(round.split(100)).toEqual({ take: 10, owed: 20 }); // standing now: 11 loses, 18 wins
    expect(round.hands.map(h => h.cards)).toEqual([[c(8), c(3)], [c(8, '♥'), c(10)]]);
    expect(round.active).toBe(0);
    expect(round.canSplit(100)).toBe(false); // once
    expect(round.double(100)).toMatchObject({ take: 10 });
    expect(round.active).toBe(1);
    round.stand();
    expect(round.results).toEqual([{ outcome: 'win', payout: 40 }, { outcome: 'win', payout: 20 }]);
    expect(round.paid).toBe(60);
    expect(round.staked).toBe(30);
  });

  it('gives split aces one card each, and their 21 is no blackjack', () => {
    const { round } = deal([c(1), c(1, '♦')], [c(10), c(8)], [c(13), c(5)]);
    round.afterDeal(0);
    round.split(100);
    expect(round.hands.map(h => h.cards)).toEqual([[c(1), c(13)], [c(1, '♦'), c(5)]]);
    expect(round.phase).toBe('dealer');
    expect(round.results).toEqual([{ outcome: 'win', payout: 20 }, { outcome: 'lose', payout: 0 }]);
  });

  it("won't split what the player can't cover", () => {
    const { round } = deal([c(8), c(8)], [c(10), c(7)]);
    round.afterDeal(100);
    expect(round.canSplit(9)).toBe(false);
    expect(round.split(9)).toEqual({});
  });

  it('offers insurance on an ace, which pays 2 to 1 when the dealer has blackjack', () => {
    const { round } = deal([c(10), c(9)], [c(1), c(13)], [], 25);
    expect(round.afterDeal(100)).toEqual({});
    expect(round.phase).toBe('ask');
    expect(round.natural).toBe(false);
    expect(round.insuranceCost).toBe(12);
    expect(round.answer(true)).toEqual({ take: 12, owed: 36 });
    expect(round.insured).toBe(36);
    expect(round.staked).toBe(37);
  });

  it('loses the insurance when the dealer has no blackjack, and plays on', () => {
    const { round } = deal([c(10), c(9)], [c(1), c(7)], [], 25);
    round.afterDeal(100);
    expect(round.answer(true)).toEqual({ take: 12, owed: 50 });
    expect(round.phase).toBe('player');
    round.stand();
    expect(round.paid).toBe(50);
  });

  it("doesn't offer insurance the player can't cover", () => {
    const { round } = deal([c(10), c(9)], [c(1), c(7)], [], 25);
    round.afterDeal(11);
    expect(round.phase).toBe('player');
  });

  it('offers even money on a blackjack against an ace; turning it down risks the 3 to 2', () => {
    const taken = deal([c(1), c(13)], [c(1), c(9)], [], 25).round;
    taken.afterDeal(0); // even money costs nothing
    expect(taken.phase).toBe('ask');
    expect(taken.natural).toBe(true);
    expect(taken.answer(true)).toEqual({ owed: 50 });
    expect(taken.results).toEqual([{ outcome: 'even', payout: 50 }]);
    const declined = deal([c(1), c(13)], [c(1), c(9)], [], 25).round;
    declined.afterDeal(0);
    declined.answer(false);
    expect(declined.results).toEqual([{ outcome: 'blackjack', payout: 62 }]);
  });

  it('walking away turns down insurance, stands on every hand, and has the dealer play', () => {
    const asked = deal([c(10), c(9)], [c(1), c(7)]).round;
    asked.afterDeal(100);
    expect(asked.walkAway()).toEqual({ owed: 20 });
    expect(asked.insurance).toBe(0);
    expect(asked.phase).toBe('dealer');
    const split = deal([c(8), c(8, '♥')], [c(10), c(7)], [c(3), c(10)]).round;
    split.afterDeal(100);
    split.split(100);
    split.walkAway();
    expect(split.results.map(x => x.outcome)).toEqual(['lose', 'win']);
    const dealing = deal([c(10), c(9)], [c(10), c(7)]).round;
    expect(dealing.walkAway()).toEqual({ owed: 20 });
    expect(dealing.settle()).toEqual({ owed: 0, pay: 20 });
  });
});

describe('what the table says once a round is settled', () => {
  /** A round of $25, dealt, played with `play`, and settled; what the table says about it. */
  const said = (player: Card[], dealer: Card[], rest: Card[], play: (r: BlackjackRound) => void) => {
    const { round } = deal(player, dealer, rest, 25);
    play(round);
    round.settle();
    return resultLine(round);
  };
  const stand = (r: BlackjackRound) => { r.afterDeal(100); r.stand(); };

  it('says how a single hand came out', () => {
    expect(said([c(10), c(9)], [c(10), c(7)], [], stand)).toBe('19 beats 17: you win $50!');
    expect(said([c(10), c(8)], [c(10), c(6)], [c(9)], stand)).toBe('Dealer busts with 25: you win $50!');
    expect(said([c(10), c(7)], [c(10), c(9)], [], stand)).toBe('Dealer has 19: the house wins.');
    expect(said([c(10), c(8)], [c(9), c(9)], [], stand)).toBe('18 each: a push, your $25 back.');
    expect(said([c(10), c(6)], [c(10), c(5)], [c(13)], r => { r.afterDeal(100); r.hit(); })).toBe('Bust with 26: the house wins.');
  });

  it("calls blackjacks, the dealer's too, even money and insurance", () => {
    expect(said([c(1), c(13)], [c(9), c(7)], [], r => r.afterDeal(100))).toBe('Blackjack! You win $62!');
    expect(said([c(10), c(9)], [c(12), c(1)], [], r => r.afterDeal(100))).toBe('Dealer has blackjack: the house wins.');
    expect(said([c(1), c(13)], [c(1), c(9)], [], r => { r.afterDeal(100); r.answer(true); })).toBe('Even money: you win $50!');
    expect(said([c(10), c(9)], [c(1), c(13)], [], r => { r.afterDeal(100); r.answer(true); })).toBe('Dealer has blackjack: insurance pays $36.');
  });

  it('gives each hand after a split, and what came back', () => {
    expect(said([c(8), c(8, '♥')], [c(10), c(7)], [c(3), c(10), c(10)], r => { r.afterDeal(100); r.split(100); r.double(100); r.stand(); }))
      .toBe('Dealer has 17: hand 1 wins, hand 2 wins. $150 back.');
    expect(said([c(1), c(1, '♦')], [c(10), c(8)], [c(13), c(5)], r => { r.afterDeal(100); r.split(100); }))
      .toBe('Dealer has 18: hand 1 wins, hand 2 loses. $50 back.');
    expect(said([c(8), c(8, '♥')], [c(10), c(9)], [c(2), c(2)], r => { r.afterDeal(100); r.split(100); r.stand(); r.stand(); }))
      .toBe('Dealer has 19: hand 1 loses, hand 2 loses. The house wins.');
  });
});
