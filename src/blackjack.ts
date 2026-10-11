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

/** How many decks the shoe holds. */
export const DECKS = 6;
/** The dealer puts the yellow cut card this many cards from the back: once it's come out, the shoe is shuffled fresh
 *  before the next deal. */
export const CUT_CARD = 52;
/** Where the player may cut the shuffled cards, counted from the top: at least a deck in from either end. */
export const PLAYER_CUT = { min: 52, max: DECKS * 52 - 52 };

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

/** Cuts `shoe` `k` cards from the top (its end): those go to the bottom, so the card under them is the next one out. */
export function cutShoe(shoe: Card[], k: number): Card[] {
  const at = shoe.length - k;
  return [...shoe.slice(at), ...shoe.slice(0, at)];
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

/** The dealer's turn: draws from `shoe` until on 17 or more (soft 17 included). Returns the cards drawn. */
export function dealerDraws(dealer: Card[], shoe: Card[]): Card[] {
  const drawn: Card[] = [];
  while (total([...dealer, ...drawn]) < 17) drawn.push(shoe.pop()!);
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

// ---------- the regulars ----------
/**
 * How a regular at the table plays. 'cautious' stands on 12 or more so as never to bust; 'dealer' plays the dealer's
 * rule, drawing to 17; 'book' plays basic strategy for a six-deck shoe where the dealer stands on soft 17; 'bold'
 * doubles any 9, 10 or 11 and draws to 17; 'hunch' doubles 11, and on a stiff 12 to 16 hits or stands as their gut
 * (`roll`, drawn once a hand) says.
 */
export type PlayStyle = 'cautious' | 'dealer' | 'book' | 'bold' | 'hunch';
export type Move = 'hit' | 'stand' | 'double';

/** The dealer's up card as basic strategy counts it: 2 to 10, or 11 for an ace. */
const upValue = (up: Card) => up.rank === 1 ? 11 : Math.min(10, up.rank);

/** Basic strategy (no splits or surrender): hard and soft totals against the dealer's up card `u`. */
function basic(t: number, soft: boolean, first: boolean, u: number): Move {
  if (soft) {
    if (t >= 19) return 'stand';
    if (t === 18) return first && u >= 3 && u <= 6 ? 'double' : u >= 9 ? 'hit' : 'stand';
    const dbl = t === 17 ? u >= 3 && u <= 6 : t >= 15 ? u >= 4 && u <= 6 : u >= 5 && u <= 6;
    return first && dbl ? 'double' : 'hit';
  }
  if (t >= 17) return 'stand';
  if (t >= 13) return u <= 6 ? 'stand' : 'hit';
  if (t === 12) return u >= 4 && u <= 6 ? 'stand' : 'hit';
  if (t === 11) return first && u <= 10 ? 'double' : 'hit';
  if (t === 10) return first && u <= 9 ? 'double' : 'hit';
  if (t === 9) return first && u >= 3 && u <= 6 ? 'double' : 'hit';
  return 'hit';
}

/** What a regular playing `style` does with `cards` against the dealer's `up` card. Doubling is only on two cards. */
export function regularMove(style: PlayStyle, cards: Card[], up: Card, roll: number): Move {
  const { total: t, soft } = handValue(cards), first = cards.length === 2;
  if (t >= 21) return 'stand';
  switch (style) {
    case 'cautious': return t >= 12 ? 'stand' : 'hit';
    case 'dealer': return t >= 17 ? 'stand' : 'hit';
    case 'bold': return first && t >= 9 && t <= 11 ? 'double' : t >= 17 ? 'stand' : 'hit';
    case 'hunch': return first && t === 11 ? 'double' : t <= 11 ? 'hit' : t >= 17 ? 'stand' : roll < 0.5 ? 'hit' : 'stand';
    case 'book': return basic(t, soft, first, upValue(up));
  }
}

/** A regular's whole turn from `cards`, drawing off the end of `shoe`: the cards they take, and whether they doubled. */
export function regularPlays(style: PlayStyle, cards: Card[], up: Card, roll: number, shoe: Card[]) {
  const hand = [...cards], drawn: Card[] = [];
  let doubled = false;
  for (;;) {
    const m = regularMove(style, hand, up, roll);
    if (m === 'stand') break;
    const c = shoe.pop()!;
    hand.push(c); drawn.push(c);
    if (m === 'double') { doubled = true; break; }
  }
  return { drawn, doubled };
}
