// The wall of shame behind the casino boat's bar (report 12): a 💔 pad by the bar opens a card, and the card the wall:
// the ten worst bets ever made at the boat's games, everyone's, the player's own among them if it's bad enough.
import { describe, expect, it, vi } from 'vitest';
import { WHEEL } from '../src/roulette';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
/** The next spin lands on `n`. */
const rig = (n: number) => vi.spyOn(Math, 'random').mockReturnValue((WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / 37);
const rows = () => [...$('shameList').querySelectorAll('li')].map(li => li.textContent);

/** The boat bought, `money` to play with, and the wall's module (with the game's own copy of the cloud). */
async function aboard(money: number) {
  const g = await loadGame({ money, tiles: bought('roulette') });
  const wall = await import('../src/wallOfShame'), { cloud } = await import('../src/cloud');
  const { SHIP } = g.layout;
  const toPad = () => { g.placePlayer(SHIP.x + wall.SHAME_PAD.x, SHIP.z + wall.SHAME_PAD.z); g.run(0.1); };
  const toRoulette = () => { g.placePlayer(g.layout.GAMES.roulette.x, g.layout.GAMES.roulette.z); g.run(0.05); };
  return { g, wall, cloud, toPad, toRoulette };
}
/** Ten other players' worst bets, $10k to $100k. */
const others = Array.from({ length: 10 }, (_, i) => ({
  uid: `p${i}`, name: `Player ${i + 1}`, lost: (10 - i) * 10_000, game: 'slots' as const, broke: false, at: Date.UTC(2026, 9, 20),
}));

describe('the wall of shame', () => {
  it('opens a card on the 💔 pad by the bar, saying how much the player has lost at worst', async () => {
    const { g, toPad, toRoulette } = await aboard(100);
    toPad();
    expect($('shameCard').hidden).toBe(false);
    expect($('shameCardMsg').textContent).toBe('The worst bets ever made here');
    toRoulette();
    expect($('shameCard').hidden).toBe(true);
    rig(0);
    document.querySelector<HTMLButtonElement>('#spin')!.click(); g.run(7);
    expect(g.wallet.money).toBe(75);
    toPad();
    expect($('shameCardMsg').textContent).toBe('Your worst: $25');
    g.placePlayer(-15.7, -4.4); g.run(0.05);
    expect($('shameCard').hidden).toBe(true);
  });

  it("lists the ten worst bets, the player's own among them when it's bad enough, and theirs under the list when not", async () => {
    const { wall, toPad } = await aboard(100_000);
    wall.fakeWall(others);
    toPad();
    $('shameOpen').click();
    await vi.waitFor(() => expect(rows()).toHaveLength(10));
    expect(rows()[0]).toMatch(/^1Player 1\$100k/);
    expect($('shameMe').textContent).toBe('Nothing lost yet. Give it time.');
    expect($('shameJoin').hidden).toBe(true); // (a made-up wall, as the demo's)
    $('shameClose').click();
    expect($('shame').hidden).toBe(true);
    // $5k lost on red: not bad enough
    const { scoreBet } = await import('../src/worstBet');
    scoreBet('roulette', 5_000, 0, 'red');
    toPad();
    $('shameOpen').click();
    await vi.waitFor(() => expect($('shameMe').textContent).toBe('Your worst: $5,000 on Red'));
    expect(rows().some(r => r!.startsWith('10You'))).toBe(false);
    $('shameClose').click();
    // $55k at the slots: sixth
    scoreBet('slots', 55_000, 0);
    $('shameOpen').click();
    await vi.waitFor(() => expect(rows()[5]).toMatch(/^6You\$55k\s*at the slots/));
    expect(rows()).toHaveLength(10);
    expect($('shameMe').textContent).toBe('');
    // the board on the wall has the worst of all
    expect(wall.entries()[0]).toMatchObject({ name: 'Player 1', lost: 100_000 });
  });

  it("shows a signed-in player's own bet under their name, ahead of the wall's older copy of it", async () => {
    const { wall, cloud, toPad } = await aboard(100);
    cloud.user = { uid: 'p4', name: 'Pat Smith' };
    wall.fakeWall(others);
    const { scoreBet } = await import('../src/worstBet');
    scoreBet('blackjack', 95_000, 0);
    const e = wall.entries();
    expect(e.filter(x => x.mine)).toEqual([expect.objectContaining({ name: 'Pat S.', lost: 95_000, game: 'blackjack' })]);
    expect(e.map(x => x.lost)).toEqual([100_000, 95_000, 90_000, 80_000, 70_000, 50_000, 40_000, 30_000, 20_000, 10_000]);
    toPad();
    $('shameOpen').click();
    await vi.waitFor(() => expect(rows()[1]).toMatch(/^2Pat S\. \(you\)\$95k/));
  });
});
