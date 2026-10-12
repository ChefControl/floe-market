// Blackjack rules, as casinos commonly play them: a six-deck shoe, the dealer stands on every 17 and checks for
// blackjack before you play, blackjack pays 3 to 2, and you can double on your first two cards. A pair can be split
// once (aces get one card each, and 21 after a split isn't blackjack), and when the dealer shows an ace you can take
// insurance: half your stake, paying 2 to 1 if they have blackjack. The shoe and each round are played here, free of
// the table and the wallet, so they're easy to test: the table animates them and applies the money a round moves.
import type { Moves } from './round';

export type Suit = '♠' | '♥' | '♦' | '♣';
/** A card: rank 1 (ace) to 13 (king). */
export interface Card { rank: number; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const FACES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankName = (c: Card) => FACES[c.rank] ?? String(c.rank);
export const isRed = (c: Card) => c.suit === '♥' || c.suit === '♦';

/** How many decks the shoe holds. */
export const DECKS = 6;
/** The dealer puts the yellow cut card this many cards from the back: once it's come out, the shoe is shuffled fresh
 *  before the next deal. */
export const CUT_CARD = 52;
/** Where the player may cut the shuffled cards, counted from the top: at least a deck in from either end. */
export const PLAYER_CUT = { min: 52, max: DECKS * 52 - 52 };

/** A fresh shoe's cards, shuffled, the next one out last. */
function shuffled(rng: () => number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < DECKS; d++) for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** A hand's best total, and whether an ace in it is still counting 11 (soft). */
export function handValue(cards: Card[]) {
  let total = 0, aces = 0;
  for (const c of cards) { total += Math.min(10, c.rank); if (c.rank === 1) aces++; }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}
export const total = (cards: Card[]) => handValue(cards).total;
/** A card's count, aces as 1: two cards that count the same (a king and a ten too) are a pair you can split. */
const count = (c: Card) => Math.min(10, c.rank);
const isPair = (cards: Card[]) => cards.length === 2 && count(cards[0]) === count(cards[1]);
/** What insurance costs for a stake: half, in whole dollars. */
export const insuranceCost = (stake: number) => Math.floor(stake / 2);
export const isBlackjack = (cards: Card[]) => cards.length === 2 && total(cards) === 21;
export const isBust = (cards: Card[]) => total(cards) > 21;

/** 'even' is a blackjack paid at even money, taken instead of the 3 to 2 when the dealer shows an ace. */
export type Outcome = 'blackjack' | 'even' | 'win' | 'push' | 'lose' | 'bust';
export interface Result { outcome: Outcome; payout: number }

/**
 * How a finished hand came out against the dealer's, and what it returns for `stake` (stake included). A hand from a
 * split (`split`) can make 21 but never blackjack.
 */
function score(player: Card[], dealer: Card[], stake: number, split: boolean): Result {
  const p = total(player), d = total(dealer), natural = isBlackjack(player) && !split;
  if (natural && !isBlackjack(dealer)) return { outcome: 'blackjack', payout: stake + Math.floor(stake * 1.5) };
  if (p > 21) return { outcome: 'bust', payout: 0 };
  if (isBlackjack(dealer) && !natural) return { outcome: 'lose', payout: 0 };
  if (d > 21 || p > d) return { outcome: 'win', payout: stake * 2 };
  if (p === d) return { outcome: 'push', payout: stake };
  return { outcome: 'lose', payout: 0 };
}

/**
 * The shoe: six decks, shuffled, that last from round to round. A fresh one is cut by the player (or by the dealer,
 * for a player who's walked off), and its top card burned; when the cut card comes out with a round's cards, it's due
 * a shuffle before the next deal.
 */
export class Shoe {
  /** Why the shoe has to be shuffled before the next deal: it's never been, or the cut card has come out. */
  due: 'fresh' | 'out' | null = 'fresh';
  /** The cards, the next one out last. */
  private cards: Card[];

  /** A new shoe, shuffled with `rng`, waiting for its first shuffle at the table. */
  constructor(private readonly rng: () => number = Math.random, cards?: Card[]) {
    this.cards = cards ?? shuffled(rng);
  }

  /** A shoe that deals exactly `cards`, in that order, as if it had just been shuffled and cut. */
  static of(cards: Card[], rng: () => number = Math.random) {
    const s = new Shoe(rng, [...cards].reverse());
    s.due = null;
    return s;
  }

  /** The cards left, the next one out last. */
  get left(): Card[] { return [...this.cards]; }

  /** A fresh shoe, shuffled: what comes out of the dealer's riffles, waiting to be cut. */
  shuffle() {
    this.cards = shuffled(this.rng);
    this.due = null;
  }

  /**
   * Cuts `k` cards from the top, kept at least a deck in from either end: those go to the bottom, so the card under
   * them is the next one out. Returns where it was cut.
   */
  cut(k: number) {
    k = Math.min(PLAYER_CUT.max, Math.max(PLAYER_CUT.min, Math.round(k)));
    const at = this.cards.length - k;
    this.cards = [...this.cards.slice(at), ...this.cards.slice(0, at)];
    return k;
  }

  /** Where the dealer cuts when the player's walked off: anywhere they're allowed to. */
  dealerCut() { return PLAYER_CUT.min + Math.floor(this.rng() * (PLAYER_CUT.max - PLAYER_CUT.min + 1)); }

  /** The next card out. (The cut card comes out a deck before the end, so it never runs dry.) */
  draw() {
    if (!this.cards.length) this.cards = shuffled(this.rng);
    return this.cards.pop()!;
  }

  /** At the end of a round: once the cut card has come out, the shoe's due a shuffle. */
  roundOver() {
    if (this.cards.length < CUT_CARD) this.due = 'out';
  }
}

/** One of the player's hands: two after a split. `down` when its double card was dealt face down (on 10 or 11). */
export interface Hand { cards: Card[]; stake: number; split: boolean; down?: boolean }

/**
 * Where a round has got to: the cards are out (`deal`), the dealer's offering insurance or even money (`ask`), the
 * player's playing (`player`), the dealer's played and it's waiting to be paid (`dealer`), or it's paid (`done`).
 */
export type Phase = 'deal' | 'ask' | 'player' | 'dealer' | 'done';

/**
 * One round of blackjack, from the stake going down to the payout. Each of the player's choices is played out at once,
 * the dealer's turn included once the player's done, and returns the money it moves; what the round would return if
 * the player stood now is owed from the start, so a save keeps it. Choices that cost money take the player's cash as
 * it is at that moment.
 */
export class BlackjackRound {
  hands: Hand[];
  /** The hand being played. */
  active = 0;
  /** The dealer's cards: their two, then what they drew. */
  dealer: Card[];
  phase: Phase = 'deal';
  /** What the player put on insurance, and whether they took even money on a blackjack. */
  insurance = 0;
  even = false;
  /** Once the dealer's played: the cards they drew, each hand's result, and what insurance paid back. */
  draws: Card[] = [];
  results: Result[] = [];
  insured = 0;

  private constructor(private readonly shoe: Shoe, stake: number) {
    // straight off the top of the shoe: player, dealer, player, dealer
    const player = [shoe.draw()], dealer = [shoe.draw()];
    player.push(shoe.draw()); dealer.push(shoe.draw());
    this.hands = [{ cards: player, stake, split: false }];
    this.dealer = dealer;
  }

  /**
   * Deals a round of `stake` out of `shoe` for a player holding `cash`. Returns the round and the money dealing moves,
   * or null if the stake is nothing or more than the player has, or the shoe is due a shuffle.
   */
  static deal(shoe: Shoe, stake: number, cash: number): { round: BlackjackRound; moves: Moves } | null {
    if (!(stake > 0 && stake <= cash) || shoe.due) return null;
    const round = new BlackjackRound(shoe, stake);
    return { round, moves: { take: stake, owed: round.owed() } };
  }

  /** A blackjack in the player's first two cards: the dealer offers even money on it, not insurance. */
  get natural() { return this.hands.length === 1 && isBlackjack(this.hands[0].cards); }
  /** What insurance costs on this round. */
  get insuranceCost() { return insuranceCost(this.hands[0].stake); }
  /** Everything the player put down: each hand's stake, and insurance. */
  get staked() { return this.hands.reduce((s, h) => s + h.stake, 0) + this.insurance; }
  /** What the round returns once the dealer's played, stakes included. */
  get paid() { return this.results.reduce((s, x) => s + x.payout, 0) + this.insured; }

  /**
   * Once the cards are out: with an ace showing, the dealer offers insurance (even money on a blackjack) if the player
   * can cover it with `cash`; otherwise they check for blackjack, and a blackjack on either side ends the round.
   */
  afterDeal(cash: number): Moves {
    if (this.phase !== 'deal') return {};
    const offer = this.natural || (this.insuranceCost > 0 && this.insuranceCost <= cash);
    if (this.dealer[0].rank === 1 && offer) { this.phase = 'ask'; return {}; }
    return this.peek();
  }

  /** The player's answer to insurance, or to even money on a blackjack. */
  answer(yes: boolean): Moves {
    if (this.phase !== 'ask') return {};
    if (this.natural) { this.even = yes; return this.finish(); }
    if (!yes) return this.peek();
    this.insurance = this.insuranceCost;
    return { take: this.insurance, ...this.peek() };
  }

  /** Whether the hand being played can double with `cash`: on its first two cards, and not split aces. */
  canDouble(cash: number) {
    const h = this.hands[this.active];
    return this.phase === 'player' && h.cards.length === 2 && cash >= h.stake && !(h.split && h.cards[0].rank === 1);
  }

  /** Whether the player can split with `cash`: a pair, not split already. */
  canSplit(cash: number) {
    const h = this.hands[0];
    return this.phase === 'player' && this.hands.length === 1 && isPair(h.cards) && cash >= h.stake;
  }

  /** A card for the hand being played: on a bust or 21 it's done, and play moves on. */
  hit(): Moves {
    if (this.phase !== 'player') return {};
    const h = this.hands[this.active];
    h.cards.push(this.shoe.draw());
    return isBust(h.cards) || total(h.cards) === 21 ? this.next() : { owed: this.owed() };
  }

  /** Stands on the hand being played. */
  stand(): Moves {
    if (this.phase !== 'player') return {};
    return this.next();
  }

  /** Doubles the stake on the hand being played for one more card, face down on 10 or 11, and moves on. */
  double(cash: number): Moves {
    if (!this.canDouble(cash)) return {};
    const h = this.hands[this.active], take = h.stake, t = total(h.cards);
    h.stake *= 2;
    h.cards.push(this.shoe.draw());
    h.down = t === 10 || t === 11;
    return { take, ...this.next() };
  }

  /** The pair becomes two hands, each with the stake on it, and each gets a second card; split aces get only that. */
  split(cash: number): Moves {
    if (!this.canSplit(cash)) return {};
    const [a, b] = this.hands[0].cards, stake = this.hands[0].stake;
    this.hands = [a, b].map(c => ({ cards: [c, this.shoe.draw()], stake, split: true }));
    if (a.rank === 1) return { take: stake, ...this.finish() };
    this.active = -1;
    return { take: stake, ...this.next() };
  }

  /** The player walks off: insurance and even money are turned down, every hand stands, and the dealer plays. */
  walkAway(): Moves {
    if (this.phase === 'deal') this.peek();
    if (this.phase === 'ask') this.answer(false);
    while (this.phase === 'player') this.next();
    return { owed: this.owed() };
  }

  /** Pays out once the dealer's played. Settling again pays nothing more. */
  settle(): Moves {
    if (this.phase !== 'dealer') return {};
    this.phase = 'done';
    this.shoe.roundOver();
    return { owed: 0, pay: this.paid };
  }

  /** A blackjack on either side ends the round at once; otherwise it's the player's turn. */
  private peek(): Moves {
    if (this.natural || isBlackjack(this.dealer)) return this.finish();
    this.phase = 'player';
    return { owed: this.owed() };
  }

  /** On to the next hand still to play (a 21 plays itself), or the dealer's turn once they're all done. */
  private next(): Moves {
    this.active++;
    while (this.active < this.hands.length && total(this.hands[this.active].cards) === 21) this.active++;
    if (this.active >= this.hands.length) return this.finish();
    return { owed: this.owed() };
  }

  /** The player's done: the dealer draws to 17 (if a hand's still in it), straight off the shoe, and it's settled. */
  private finish(): Moves {
    const o = this.outcome(() => this.shoe.draw());
    this.phase = 'dealer';
    this.draws = o.draws;
    this.dealer.push(...o.draws);
    this.results = o.results;
    this.insured = o.insured;
    return { owed: this.owed() };
  }

  /** What the round returns now: all of it once the dealer's played, or what standing on every hand now would. */
  private owed() {
    if (this.phase === 'dealer') return this.paid;
    if (this.phase === 'done') return 0;
    const left = this.shoe.left, o = this.outcome(() => left.pop()!);
    return o.results.reduce((s, x) => s + x.payout, 0) + o.insured;
  }

  /**
   * How the round comes out if the player stands on every hand now, the dealer drawing with `draw`: the cards the
   * dealer draws (to 17, soft 17 included), each hand's result and what insurance pays. The dealer only draws if a
   * hand is still in it.
   */
  private outcome(draw: () => Card) {
    const dealerBJ = isBlackjack(this.dealer);
    const inIt = this.hands.some(h => !isBust(h.cards) && !(isBlackjack(h.cards) && !h.split));
    const draws: Card[] = [];
    if (!dealerBJ && !this.even && inIt) while (total([...this.dealer, ...draws]) < 17) draws.push(draw());
    const dealer = [...this.dealer, ...draws];
    const results: Result[] = this.even ? [{ outcome: 'even', payout: this.hands[0].stake * 2 }]
      : this.hands.map(h => score(h.cards, dealer, h.stake, h.split));
    return { draws, results, insured: dealerBJ ? this.insurance * 3 : 0 };
  }
}
