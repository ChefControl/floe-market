// The casino boat: the games' rules, the boat and the way out to it, and each game as the player plays it.
import { describe, expect, it, vi } from 'vitest';
import { canSplit, dealerDraws, handValue, insuranceCost, isBlackjack, newShoe, settle, type Card, type Suit } from '../src/blackjack';
import { colorOf, payout, spinWheel, WHEEL, wins } from '../src/roulette';
import { lineMultiplier, pull, REEL, type Sym } from '../src/slots';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const click = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click();
const button = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!;
/** A card: 1 is an ace, 11 to 13 the faces. */
const c = (rank: number, suit: Suit = '♠'): Card => ({ rank, suit });
const saved = () => JSON.parse(localStorage.getItem('floe-market-v1')!).money;

describe('roulette rules', () => {
  it('has 37 distinct pockets: 18 red, 18 black, one green zero', () => {
    expect(new Set(WHEEL).size).toBe(37);
    expect([...WHEEL].sort((a, b) => a - b)).toEqual([...Array(37).keys()]);
    const colors = WHEEL.map(colorOf);
    expect(colors.filter(c => c === 'red')).toHaveLength(18);
    expect(colors.filter(c => c === 'green')).toEqual(['green']);
    expect(colorOf(0)).toBe('green');
  });

  it('pays red and black at even money and green at 35 to 1; zero loses red and black', () => {
    expect(wins('red', 32)).toBe(true);
    expect(wins('black', 15)).toBe(true);
    expect(wins('red', 0) || wins('black', 0)).toBe(false);
    expect(payout('red', 10, 32)).toBe(20);
    expect(payout('red', 10, 15)).toBe(0);
    expect(payout('green', 10, 0)).toBe(360);
    expect(payout('green', 10, 32)).toBe(0);
  });

  it('spins to the pocket the random number picks', () => {
    expect(spinWheel(() => 0)).toBe(0);
    expect(spinWheel(() => 0.999)).toBe(26);
  });
});

describe('blackjack rules', () => {
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

  it('the dealer draws to 17 and stands on any 17, soft or not', () => {
    expect(dealerDraws([c(1), c(6)], [c(5)])).toEqual([]);
    const shoe = [c(9), c(4), c(2)];
    expect(dealerDraws([c(10), c(3)], shoe)).toEqual([c(2), c(4)]);
    expect(shoe).toEqual([c(9)]);
  });

  it('pays 3 to 2 for blackjack, double for a win, and the stake back for a push', () => {
    expect(settle([c(1), c(13)], [c(10), c(9)], 10)).toEqual({ outcome: 'blackjack', payout: 25 });
    expect(settle([c(1), c(13)], [c(10), c(9)], 25).payout).toBe(62); // rounded down to whole dollars
    expect(settle([c(1), c(13)], [c(1), c(12)], 10)).toEqual({ outcome: 'push', payout: 10 });
    expect(settle([c(10), c(9)], [c(10), c(7)], 10)).toEqual({ outcome: 'win', payout: 20 });
    expect(settle([c(10), c(7)], [c(10), c(9)], 10)).toEqual({ outcome: 'lose', payout: 0 });
    expect(settle([c(10), c(8)], [c(9), c(9)], 10)).toEqual({ outcome: 'push', payout: 10 });
    expect(settle([c(10), c(5), c(9)], [c(10), c(6), c(9)], 10)).toEqual({ outcome: 'bust', payout: 0 }); // you bust first
    expect(settle([c(10), c(8)], [c(10), c(6), c(9)], 10)).toEqual({ outcome: 'win', payout: 20 });
    expect(settle([c(7), c(7), c(7)], [c(1), c(10)], 10)).toEqual({ outcome: 'lose', payout: 0 }); // 21 isn't blackjack
  });

  it('splits pairs (any two tens too), and a 21 from a split is no blackjack', () => {
    expect(canSplit([c(8), c(8, '♥')])).toBe(true);
    expect(canSplit([c(13), c(10)])).toBe(true);
    expect(canSplit([c(8), c(9)])).toBe(false);
    expect(canSplit([c(8), c(8), c(8)])).toBe(false);
    expect(settle([c(1), c(13)], [c(10), c(9)], 10, true)).toEqual({ outcome: 'win', payout: 20 });
    expect(settle([c(1), c(13)], [c(1), c(12)], 10, true)).toEqual({ outcome: 'lose', payout: 0 });
  });

  it('insurance costs half the stake, in whole dollars', () => {
    expect(insuranceCost(25)).toBe(12);
    expect(insuranceCost(1)).toBe(0);
  });

  it('shuffles six decks into the shoe', () => {
    const shoe = newShoe();
    expect(shoe).toHaveLength(312);
    expect(shoe.filter(x => x.rank === 1 && x.suit === '♥')).toHaveLength(6);
    expect(newShoe()).not.toEqual(shoe);
  });
});

describe('slot machine rules', () => {
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

  it('stops each reel where the random numbers say', () => {
    expect(pull(() => 0)).toEqual([0, 0, 0]);
    expect(pull(() => 0.999)).toEqual([19, 19, 19]);
  });
});

type Game = Awaited<ReturnType<typeof loadGame>>;
/** Stands the player on a game's pad, on a save with the boat (and `more` games) bought. */
async function at(game: 'roulette' | 'blackjack' | 'slots', money: number, ...more: string[]) {
  const g = await loadGame({ money, tiles: bought('roulette', ...more) });
  const p = g.layout.GAMES[game];
  g.placePlayer(p.x, p.z);
  g.run(0.05);
  return g;
}
const walkAway = (g: Game) => { g.placePlayer(-15.7, -4.4); g.run(0.05); };

describe('the casino boat', () => {
  it('comes with the roulette tile: a quay through a gap in the fence, a gangway aboard and stairs up', async () => {
    const g = await loadGame();
    const p = g.player.g.position, { SHIP, DECKS, UPPER } = g.layout, { FY } = g.util;
    g.placePlayer(-12, -5.5);
    g.run(0.05);
    expect(p.x).toBeCloseTo(-7.4); // the fence
    expect(g.world.quayLogs.every(l => l.visible)).toBe(true);
    g.unlocks.applyUnlock('roulette');
    expect(g.world.quayLogs.some(l => l.visible)).toBe(false);
    const stairs = DECKS.stairs, mid = SHIP.x + (stairs.x0 + stairs.x1) / 2;
    // the quay, the gangway, the foredeck at the foot of the stairs, halfway up them, and the upper deck
    for (const [x, z, y] of [
      [-12, -6.3, FY], [SHIP.x + DECKS.gangway, -7.6, FY], [SHIP.x + 4.7, SHIP.z, FY],
      [mid, SHIP.z, (FY + UPPER) / 2], [SHIP.x - 1, SHIP.z, UPPER],
    ]) {
      g.placePlayer(x, z);
      g.run(0.5);
      expect([p.x, p.z]).toEqual([x, z]);
      expect(p.y).toBeCloseTo(y, 2);
    }
    // the main deck under the upper deck is the cabin: nobody walks in there
    g.placePlayer(SHIP.x - 1, SHIP.z + SHIP.beam - 0.3);
    p.y = FY;
    g.run(0.05);
    expect(p.z).toBeLessThan(SHIP.z + SHIP.beam - 0.4);
  });

  it('has a ticket booth and crates on the quay that the player walks round', async () => {
    const g = await loadGame({ tiles: bought('roulette') });
    const p = g.player.g.position;
    g.placePlayer(-12.6, -4.85);
    g.run(0.05);
    expect(Math.abs(p.x + 12.6) > 0.9 || Math.abs(p.z + 4.85) > 0.7).toBe(true);
  });

  it('puts its other games up for sale on its deck', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret') });
    const extras = () => g.unlocks.visibleTiles().map(t => t.id).filter(id => id === 'slots' || id === 'blackjack');
    expect(extras()).toEqual([]);
    g.unlocks.applyUnlock('roulette');
    expect(extras()).toEqual(['slots', 'blackjack']);
    const tile = g.unlocks.tiles.find(t => t.id === 'blackjack')!;
    expect([tile.x, tile.z]).toEqual([g.layout.GAMES.blackjack.x, g.layout.GAMES.blackjack.z]);
    g.unlocks.applyUnlock('blackjack');
    g.unlocks.applyUnlock('slots');
    expect(extras()).toEqual([]);
  });

  it("doesn't let the player walk through the tables and machines", async () => {
    const g = await at('roulette', 0, 'blackjack', 'slots');
    const p = g.player.g.position;
    // walking straight at each from its pad, the player stops at its front instead of reaching the back of the deck
    for (const k of ['roulette', 'blackjack', 'slots'] as const) {
      g.placePlayer(g.layout.GAMES[k].x, g.layout.GAMES[k].z);
      for (let i = 0; i < 60; i++) { p.z -= 0.05; g.run(1 / 60); }
      expect(p.z).toBeGreaterThan(-11.6);
    }
  });

  it('comes in with the camera looking over at it, from a tile by the fence', async () => {
    const g = await loadGame({ tiles: bought('pack', 'turret') });
    const tile = g.unlocks.tiles.find(t => t.id === 'roulette')!;
    expect(tile.x).toBeLessThan(-6);
    const { view } = g.stage, focus = view.focus.clone();
    g.unlocks.applyUnlock('roulette');
    const [quay, , boat] = g.casino.casinoPieces();
    expect(quay.visible).toBe(true);
    expect(boat.visible).toBe(false);
    g.run(0.3);
    expect(view.k).toBeGreaterThan(0);
    expect(boat.visible).toBe(false);
    g.run(0.4);
    expect(boat.visible).toBe(true);
    expect(view.focus.x).toBeLessThan(-15);
    g.run(2);
    expect(view.k).toBe(0);
    expect(view.focus.equals(focus)).toBe(true);
  });

  it('comes in at once for players who prefer less motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const g = await loadGame();
    g.unlocks.applyUnlock('roulette');
    expect(g.casino.casinoPieces().every(o => o.visible)).toBe(true);
    expect(g.stage.view.k).toBe(0);
  });

  it('turns its paddle wheel', async () => {
    const g = await loadGame({ tiles: bought('roulette') });
    const [, , ship] = g.casino.casinoPieces();
    const wheel = ship.children.filter(o => o.type === 'Group').pop()!;
    const was = wheel.rotation.z;
    g.run(1);
    expect(wheel.rotation.z).toBeGreaterThan(was);
  });
});

/** Makes the next spin land on pocket `n`. */
const rig = (n: number) => vi.spyOn(Math, 'random').mockReturnValue((WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / 37);

describe('the roulette table', () => {
  it('opens when the player steps on its pad', async () => {
    const g = await at('roulette', 100);
    expect($('roulette').hidden).toBe(false);
    expect($('rouletteMsg').textContent).toBe('Pick a colour and spin');
    expect($('spin').textContent).toBe('Spin: $25 on Red (pays ×2)');
    walkAway(g);
    expect($('roulette').hidden).toBe(true);
  });

  it('takes the stake, reveals the result after the spin, and pays winners', async () => {
    const g = await at('roulette', 100);
    rig(32); // red
    click('#spin');
    expect(g.wallet.money).toBe(75);
    expect($('spin').textContent).toBe('Spinning…');
    g.run(1);
    expect(g.wallet.money).toBe(75); // not revealed yet
    g.run(3);
    expect(g.wallet.money).toBe(125);
    expect(g.wallet.inFlight).toBe(0);
    expect($('rouletteMsg').textContent).toBe('32 Red: you win $50!');
    expect($('history').textContent).toBe('32');
  });

  it('keeps the stake on a loss', async () => {
    const g = await at('roulette', 100);
    click('[data-bet="black"]');
    rig(0);
    click('#spin');
    g.run(4);
    expect(g.wallet.money).toBe(75);
    expect($('rouletteMsg').textContent).toBe('0 Green: the house wins.');
  });

  it('pays 35 to 1 on green', async () => {
    const g = await at('roulette', 100);
    click('[data-bet="green"]');
    click('#roulette [data-stake="0"]');
    expect($('spin').textContent).toBe('Spin: $5 on Green (pays ×36)');
    rig(0);
    click('#spin');
    click('[data-bet="red"]'); // no changing the bet mid-spin
    g.run(4);
    expect(g.wallet.money).toBe(95 + 180);
  });

  it("won't take bets the player can't cover", async () => {
    const g = await at('roulette', 60);
    expect(button('#roulette [data-stake="2"]').disabled).toBe(true);
    click('#roulette [data-stake="all"]');
    expect($('spin').textContent).toContain('$60');
    rig(15); // black: lose it all
    click('#spin');
    g.run(4);
    expect(g.wallet.money).toBe(0);
    expect(button('#spin').disabled).toBe(true);
  });

  it('settles at once if the player walks away mid-spin', async () => {
    const g = await at('roulette', 100);
    rig(32);
    click('#spin');
    g.run(0.5);
    walkAway(g);
    expect($('roulette').hidden).toBe(true);
    expect(g.wallet.money).toBe(125);
  });

  it('saves a win that is still spinning', async () => {
    const g = await at('roulette', 100);
    rig(32);
    click('#spin');
    g.saveMod.save();
    expect(saved()).toBe(125);
  });

  it('the croupier welcomes the player aboard and calls a win on green', async () => {
    const g = await at('roulette', 100);
    const { croupierSays } = await import('../src/rouletteTable');
    expect(croupierSays()).toBe('Welcome aboard!');
    click('[data-bet="green"]');
    rig(0);
    click('#spin');
    g.run(4);
    expect(croupierSays()).toBe('Green!');
  });

  it('has bigger chips in stage 2, and keeps the chosen one through the stage-up', async () => {
    const g = await at('roulette', 100_000);
    click('#roulette [data-stake="0"]');
    expect($('spin').textContent).toBe('Spin: $5 on Red (pays ×2)');
    walkAway(g);
    g.unlocks.applyUnlock('sushi', true);
    g.placePlayer(g.layout.GAMES.roulette.x, g.layout.GAMES.roulette.z); g.run(0.05);
    expect([...document.querySelectorAll('#roulette [data-stake]')].map(b => b.textContent)).toEqual(['$50', '$250', '$1k', '$5k', 'All in']);
    expect($('spin').textContent).toBe('Spin: $50 on Red (pays ×2)');
  });

  it('greets a broke player', async () => {
    await at('roulette', 0);
    expect($('rouletteMsg').textContent).toBe('Come back with some cash to play');
  });
});

describe('the blackjack table', () => {
  /** At the table with the next cards stacked: the player's two, then the dealer's two, then any to draw. */
  async function table(money: number, player: Card[], dealer: Card[], ...rest: Card[]) {
    const g = await at('blackjack', money, 'blackjack');
    const { stackShoe } = await import('../src/blackjackTable');
    stackShoe([player[0], dealer[0], player[1], dealer[1], ...rest]);
    return g;
  }
  const names = (el: Element) => [...el.querySelectorAll('.card')].map(x => x.classList.contains('back') ? '?' : x.textContent);
  const cards = (id: string) => names($(id));
  const hands = () => [...$('playerHands').children].map(names);
  const says = async () => (await import('../src/blackjackTable')).dealerSays();

  it('deals a card at a time, the dealer\'s second face down', async () => {
    const g = await table(100, [c(10), c(7, '♥')], [c(9), c(8)]);
    expect($('blackjack').hidden).toBe(false);
    expect($('bjMsg').textContent).toBe('Put a stake down and deal');
    expect($('deal').textContent).toBe('Deal: $25');
    click('#deal');
    expect(g.wallet.money).toBe(75);
    expect(cards('playerHands')).toEqual([]);
    g.run(0.4);
    expect(cards('playerHands')).toEqual(['10♠']);
    g.run(1.2);
    expect(cards('playerHands')).toEqual(['10♠', '7♥']);
    expect($('playerHands').querySelector('.card:last-child')!.classList.contains('red')).toBe(true);
    expect(cards('dealerHand')).toEqual(['9♠', '?']);
    expect($('dealerTotal').textContent).toBe('9');
    expect($('bjMsg').textContent).toBe('You have 17. Hit or stand?');
    expect($('bjActs').hidden).toBe(false);
    expect($('deal').hidden).toBe(true);
  });

  it('pays a win when the player stands on the better hand', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    g.run(1.6);
    click('#stand');
    g.run(0.7);
    expect(cards('dealerHand')).toEqual(['10♠', '7♠']);
    g.run(1);
    expect(g.wallet.money).toBe(125);
    expect(g.wallet.inFlight).toBe(0);
    expect($('bjMsg').textContent).toBe('19 beats 17: you win $50!');
    expect($('deal').hidden).toBe(false);
  });

  it('the dealer draws a card at a time, and can bust', async () => {
    const g = await table(100, [c(10), c(8)], [c(10), c(6)], c(9));
    click('#deal');
    g.run(1.6);
    click('#stand');
    g.run(0.7);
    expect(cards('dealerHand')).toEqual(['10♠', '6♠']);
    g.run(0.6);
    expect(cards('dealerHand')).toEqual(['10♠', '6♠', '9♠']);
    g.run(1);
    expect($('bjMsg').textContent).toBe('Dealer busts with 25: you win $50!');
    expect(g.wallet.money).toBe(125);
  });

  it('a bust loses at once, without the dealer drawing', async () => {
    const g = await table(100, [c(10), c(6)], [c(10), c(5)], c(13), c(2));
    click('#deal');
    g.run(1.6);
    click('#hit');
    expect($('playerTotal').textContent).toBe('26');
    g.run(2);
    expect(cards('dealerHand')).toEqual(['10♠', '5♠']);
    expect($('bjMsg').textContent).toBe('Bust with 26: the house wins.');
    expect(g.wallet.money).toBe(75);
  });

  it('pays 3 to 2 for a blackjack, straight after the deal', async () => {
    const g = await table(100, [c(1), c(13)], [c(9), c(7)]);
    click('#deal');
    g.run(3);
    expect($('bjMsg').textContent).toBe('Blackjack! You win $62!');
    expect(g.wallet.money).toBe(137);
  });

  it("ends the hand when the dealer has blackjack under a ten", async () => {
    const g = await table(100, [c(10), c(9)], [c(12), c(1)]);
    click('#deal');
    g.run(3);
    expect($('bjMsg').textContent).toBe('Dealer has blackjack: the house wins.');
    expect(g.wallet.money).toBe(75);
  });

  it('gives the stake back on a push', async () => {
    const g = await table(100, [c(10), c(8)], [c(9), c(9)]);
    click('#deal');
    g.run(1.6);
    click('#stand');
    g.run(2);
    expect($('bjMsg').textContent).toBe('18 each: a push, your $25 back.');
    expect(g.wallet.money).toBe(100);
  });

  it('doubles the stake for one more card', async () => {
    const g = await table(100, [c(5), c(6)], [c(10), c(6)], c(10), c(10));
    click('#deal');
    g.run(1.6);
    click('#double');
    expect(g.wallet.money).toBe(50);
    expect(cards('playerHands')).toEqual(['5♠', '6♠', '10♠']);
    g.run(3);
    expect(g.wallet.money).toBe(150);
  });

  it('hits, stands by itself on 21, and shows soft totals', async () => {
    const g = await table(100, [c(1), c(6)], [c(10), c(8)], c(4));
    click('#deal');
    g.run(1.6);
    expect($('bjMsg').textContent).toBe('You have soft 17. Hit or stand?');
    click('#hit');
    expect($('bjActs').hidden).toBe(true);
    g.run(2);
    expect($('bjMsg').textContent).toBe('21 beats 18: you win $50!');
  });

  it("won't double what the player can't cover, and loses a hand that's beaten", async () => {
    const g = await table(30, [c(5), c(6)], [c(10), c(9)], c(7));
    click('#deal');
    g.run(1.6);
    expect(button('#double').disabled).toBe(true);
    click('#double');
    expect(g.wallet.money).toBe(5);
    click('#hit');
    click('#stand');
    g.run(2);
    expect($('bjMsg').textContent).toBe('Dealer has 19: the house wins.');
  });

  it('stands and settles at once if the player walks away mid-hand', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    g.run(0.5);
    walkAway(g);
    expect($('blackjack').hidden).toBe(true);
    expect(g.wallet.money).toBe(125);
  });

  it('saves what standing would win, mid-hand', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    g.saveMod.save();
    expect(saved()).toBe(125);
    g.run(1.6);
    click('#stand');
    g.saveMod.save();
    expect(saved()).toBe(125);
  });

  it('splits a pair into two hands, played in turn, with doubling after the split', async () => {
    const g = await table(100, [c(8), c(8, '♥')], [c(10), c(7)], c(3), c(10), c(10));
    click('#deal');
    g.run(1.6);
    expect(button('#split').hidden).toBe(false);
    click('#split');
    expect(g.wallet.money).toBe(50);
    g.run(1);
    expect(hands()).toEqual([['8♠', '3♠'], ['8♥', '10♠']]);
    expect($('playerTotal').textContent).toBe('11 · 18');
    expect($('playerHands').children[0].classList.contains('on')).toBe(true);
    expect($('bjMsg').textContent).toBe('Hand 1: 11. Hit or stand?');
    expect(button('#split').hidden).toBe(true);
    click('#double'); // 21 on the first hand
    expect(g.wallet.money).toBe(25);
    expect($('playerHands').children[1].classList.contains('on')).toBe(true);
    click('#stand');
    g.run(2);
    expect($('bjMsg').textContent).toBe('Dealer has 17: hand 1 wins, hand 2 wins. $150 back.');
    expect(g.wallet.money).toBe(175);
  });

  it('gives split aces one card each, and their 21 pays even money', async () => {
    const g = await table(100, [c(1), c(1, '♦')], [c(10), c(8)], c(13), c(5));
    click('#deal');
    g.run(1.6);
    click('#split');
    g.run(3);
    expect(hands()).toEqual([['A♠', 'K♠'], ['A♦', '5♠']]);
    expect($('bjMsg').textContent).toBe('Dealer has 18: hand 1 wins, hand 2 loses. $50 back.');
    expect(g.wallet.money).toBe(100);
  });

  it("won't split what the player can't cover", async () => {
    const g = await table(40, [c(8), c(8)], [c(10), c(7)]);
    click('#deal');
    g.run(1.6);
    expect(button('#split').hidden).toBe(true);
  });

  it('offers insurance on an ace, which pays 2 to 1 when the dealer has blackjack', async () => {
    const g = await table(100, [c(10), c(9)], [c(1), c(13)]);
    click('#deal');
    g.run(1.6);
    expect($('bjMsg').textContent).toBe('Dealer shows an ace. Insurance for $12?');
    expect(await says()).toBe('Insurance?');
    expect($('bjAsk').hidden).toBe(false);
    expect($('bjActs').hidden).toBe(true);
    click('#insureYes');
    expect(g.wallet.money).toBe(63);
    g.run(2);
    expect($('bjMsg').textContent).toBe('Dealer has blackjack: insurance pays $36.');
    expect(g.wallet.money).toBe(99);
  });

  it('loses the insurance when the dealer has no blackjack, and plays on', async () => {
    const g = await table(100, [c(10), c(9)], [c(1), c(7)]);
    click('#deal');
    g.run(1.6);
    click('#insureYes');
    expect($('bjMsg').textContent).toBe('You have 19. Hit or stand?');
    click('#stand');
    g.run(2);
    expect(g.wallet.money).toBe(63 + 50);
  });

  it('offers even money on a blackjack against an ace', async () => {
    const g = await table(100, [c(1), c(13)], [c(1), c(9)]);
    click('#deal');
    g.run(1.6);
    expect($('bjMsg').textContent).toBe('Blackjack! Take even money?');
    expect(await says()).toBe('Even money?');
    click('#insureYes');
    g.run(2);
    expect($('bjMsg').textContent).toBe('Even money: you win $50!');
    expect(g.wallet.money).toBe(125);
  });

  it('turning down even money risks the 3 to 2', async () => {
    const g = await table(100, [c(1), c(13)], [c(1), c(9)]);
    click('#deal');
    g.run(1.6);
    click('#insureNo');
    g.run(2);
    expect(g.wallet.money).toBe(137);
    expect(await says()).toBe('Blackjack!');
  });

  it("doesn't offer insurance the player can't cover; walking off turns it down", async () => {
    let g = await table(25, [c(10), c(9)], [c(1), c(7)]);
    click('#deal');
    g.run(1.6);
    expect($('bjMsg').textContent).toBe('You have 19. Hit or stand?');
    g = await table(100, [c(10), c(9)], [c(1), c(7)]);
    click('#deal');
    g.run(1.6);
    walkAway(g);
    expect(g.wallet.money).toBe(125);
  });

  it('the dealer greets the player once a visit, and calls a bust', async () => {
    const g = await table(100, [c(10), c(6)], [c(10), c(5)], c(13));
    expect(await says()).toBe('Good luck!');
    g.run(3);
    expect(await says()).toBe('');
    const { GAMES } = g.layout;
    g.placePlayer(GAMES.slots.x, GAMES.slots.z); g.run(0.05); // still aboard
    g.placePlayer(GAMES.blackjack.x, GAMES.blackjack.z); g.run(0.05);
    expect(await says()).toBe('');
    click('#deal');
    g.run(1.6);
    click('#hit');
    expect(await says()).toBe('Bust!');
    walkAway(g); g.run(3); // off the boat: a new visit
    g.placePlayer(GAMES.blackjack.x, GAMES.blackjack.z); g.run(0.05);
    expect(await says()).toBe('Good luck!');
  });

  it('greets a broke player', async () => {
    await at('blackjack', 0, 'blackjack');
    expect($('bjMsg').textContent).toBe('Come back with some cash to play');
    expect(button('#deal').disabled).toBe(true);
  });
});

describe('the slot machine', () => {
  /** Makes the next pull stop the reels at these places on the strip. */
  const rigReels = (...stops: number[]) => {
    const m = vi.spyOn(Math, 'random');
    stops.forEach(s => m.mockReturnValueOnce((s + 0.5) / 20));
  };

  it('lists what pays, and opens when the player steps on its pad', async () => {
    const g = await at('slots', 100, 'slots');
    expect($('slots').hidden).toBe(false);
    expect($('slotsMsg').textContent).toBe('Pick a stake and pull');
    expect($('pull').textContent).toBe('Pull: $25');
    expect($('pays').textContent).toContain('777 ×100');
    expect($('pays').textContent).toContain('🍒🍒 ×2');
    walkAway(g);
    expect($('slots').hidden).toBe(true);
  });

  it('spins the reels, stops them left to right, and pays the jackpot', async () => {
    const g = await at('slots', 100, 'slots');
    rigReels(8, 8, 8);
    click('#pull');
    expect(g.wallet.money).toBe(75);
    expect($('pull').textContent).toBe('Spinning…');
    g.run(1.5);
    expect(g.wallet.money).toBe(75);
    g.run(0.5);
    expect(g.wallet.money).toBe(75 + 2500);
    expect($('slotsMsg').textContent).toBe('Jackpot! You win $2,500!');
    expect((await import('../src/slotMachine')).signSays()).toBe('JACKPOT!');
  });

  it('pays two cherries, and nothing for no match', async () => {
    const g = await at('slots', 100, 'slots');
    rigReels(0, 1, 3);
    click('#pull');
    g.run(2);
    expect($('slotsMsg').textContent).toBe('🍒 🍋 🍒: you win $50!');
    expect(g.wallet.money).toBe(125);
    rigReels(0, 1, 2);
    click('#pull');
    g.run(2);
    expect($('slotsMsg').textContent).toBe('🍒 🍋 🔔: no luck this time.');
    expect(g.wallet.money).toBe(100);
  });

  it('pays at once if the player walks away mid-spin, and saves a win still spinning', async () => {
    const g = await at('slots', 100, 'slots');
    rigReels(4, 11, 17); // three fish
    click('#pull');
    g.run(2);
    expect((await import('../src/slotMachine')).signSays()).toBe('🐟🐟🐟!');
    rigReels(4, 11, 17);
    click('#pull');
    g.saveMod.save();
    expect(saved()).toBe(700 - 25 + 625);
    walkAway(g);
    expect(g.wallet.money).toBe(1300);
  });

  it('greets a broke player', async () => {
    await at('slots', 0, 'slots');
    expect($('slotsMsg').textContent).toBe('Come back with some cash to play');
    expect(button('#pull').disabled).toBe(true);
  });
});
