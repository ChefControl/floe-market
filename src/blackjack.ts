// Blackjack rules, as casinos commonly play them: a six-deck shoe, the dealer stands on every 17 and checks for
// blackjack before you play, blackjack pays 3 to 2, and you can double on your first two cards. A pair can be split
// once (aces get one card each, and 21 after a split isn't blackjack), and when the dealer shows an ace you can take
// insurance: half your stake, paying 2 to 1 if they have blackjack. Kept free of game state so they're easy to test.

export type Suit = '♠' | '♥' | '♦' | '♣';
/** A card: rank 1 (ace) to 13 (king). */
export interface Card { rank: number; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const FACES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankName = (c: Card) => FACES[c.rank] ?? String(c.rank);
export const isRed = (c: Card) => c.suit === '♥' || c.suit === '♦';

/** How many decks the shoe holds, and how low it runs before it's shuffled fresh (at the next deal). */
export const DECKS = 6;
export const CUT = 52;

/** A fresh shoe, shuffled. Cards are drawn off its end. */
export function newShoe(rng: () => number = Math.random): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < DECKS; d++) for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) shoe.push({ rank, suit });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
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
export const canSplit = (cards: Card[]) => cards.length === 2 && count(cards[0]) === count(cards[1]);
/** What insurance costs for a stake: half, in whole dollars. */
export const insuranceCost = (stake: number) => Math.floor(stake / 2);
export const isBlackjack = (cards: Card[]) => cards.length === 2 && total(cards) === 21;
export const isBust = (cards: Card[]) => total(cards) > 21;

/**
 * The dealer's turn: draws from `shoe` until on 17 or more (soft 17 included). Returns the cards drawn. Given `burns`,
 * the dealer burns a card into it before each card they draw.
 */
export function dealerDraws(dealer: Card[], shoe: Card[], burns?: Card[]): Card[] {
  const drawn: Card[] = [];
  while (total([...dealer, ...drawn]) < 17) {
    if (burns) burns.push(shoe.pop()!);
    drawn.push(shoe.pop()!);
  }
  return drawn;
}

/** 'even' is a blackjack paid at even money, taken instead of the 3 to 2 when the dealer shows an ace. */
export type Outcome = 'blackjack' | 'even' | 'win' | 'push' | 'lose' | 'bust';
export interface Result { outcome: Outcome; payout: number }

/**
 * How a finished hand came out against the dealer's, and what it returns for `stake` (stake included). A hand from a
 * split (`split`) can make 21 but never blackjack.
 */
export function settle(player: Card[], dealer: Card[], stake: number, split = false): Result {
  const p = total(player), d = total(dealer), natural = isBlackjack(player) && !split;
  if (natural && !isBlackjack(dealer)) return { outcome: 'blackjack', payout: stake + Math.floor(stake * 1.5) };
  if (p > 21) return { outcome: 'bust', payout: 0 };
  if (isBlackjack(dealer) && !natural) return { outcome: 'lose', payout: 0 };
  if (d > 21 || p > d) return { outcome: 'win', payout: stake * 2 };
  if (p === d) return { outcome: 'push', payout: stake };
  return { outcome: 'lose', payout: 0 };
}
