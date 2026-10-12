// The casino boat: the boat and the way out to it, and each game as the player plays it. A roulette
// round's rules, money and result messages are in roulette.test.ts, a slots round's in slots.test.ts, and blackjack's
// (the shoe too) in blackjack.test.ts; these tests are about what the player sees at the table.
import { describe, expect, it, vi } from 'vitest';
import { rankName, Shoe, type Card, type Suit } from '../src/blackjack';
import { GRACE } from '../src/casinoKit';
import { WHEEL } from '../src/roulette';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const click = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click();
const button = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!;
/** A card: 1 is an ace, 11 to 13 the faces. */
const c = (rank: number, suit: Suit = '♠'): Card => ({ rank, suit });
const saved = () => JSON.parse(localStorage.getItem('floe-market-v1')!).money;

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
      [-12, -5.8, FY], [SHIP.x + DECKS.gangway, -6.9, FY], [SHIP.x + stairs.x1 + 0.3, SHIP.z, FY],
      [mid, SHIP.z, (FY + UPPER) / 2], [SHIP.x - 2.1, SHIP.z + 1.9, UPPER],
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
    g.placePlayer(-12.6, -4.35);
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
    // walking straight at each from its pad, the player stops at its front instead of reaching the back wall
    const { SHIP } = g.layout;
    for (const k of ['roulette', 'blackjack', 'slots'] as const) {
      g.placePlayer(g.layout.GAMES[k].x, g.layout.GAMES[k].z);
      for (let i = 0; i < 60; i++) { p.z -= 0.05; g.run(1 / 60); }
      expect(p.z).toBeGreaterThan(SHIP.z - SHIP.beam + 1.2);
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

  it('walls its upper deck in as a salon, whose roof lifts and near walls fade while the player is inside', async () => {
    const g = await at('roulette', 100);
    const salon = await import('../src/casinoSalon');
    g.run(1);
    expect(salon.salonView().roof).toBeLessThan(0.05);
    walkAway(g); g.run(1);
    expect(salon.salonView().roof).toBe(1);
    // and everything stays up for the stage-up's show
    g.placePlayer(g.layout.GAMES.roulette.x, g.layout.GAMES.roulette.z); g.run(0.05);
    salon.updSalon(1, g.player.g.position, true);
    expect(salon.salonView().roof).toBe(1);
  });

  it('is full of guests playing the machines; one by the tables cheers when the player wins', async () => {
    const g = await at('roulette', 100);
    const salon = await import('../src/casinoSalon');
    expect(salon.salonView().guests).toBeGreaterThan(5);
    rig(32);
    click('#spin');
    g.run(6);
    expect(salon.salonView().fan).toMatch(/Nice!|Wow!|Lucky!/);
    g.run(20); // the guests at the machines play away
  });

  it('keeps the player out of the bar along the stern and the row of machines by the door', async () => {
    const g = await at('roulette', 100);
    const { SHIP, SALON } = g.layout, p = g.player.g.position;
    // walking aft from the roulette table's end, the player stops at the stools
    g.placePlayer(SHIP.x - 5.5, SHIP.z + 0.5); g.run(0.05);
    for (let i = 0; i < 60; i++) { p.x -= 0.05; g.run(1 / 60); }
    expect(p.x).toBeGreaterThan(SHIP.x + SALON.x0 + 1.4);
    // and walking from the door towards the back wall, at the guests playing the machines
    g.placePlayer(SHIP.x + SALON.x1 - 0.7, SHIP.z - 0.3); g.run(0.05);
    for (let i = 0; i < 60; i++) { p.z -= 0.05; g.run(1 / 60); }
    expect(p.z).toBeGreaterThan(SHIP.z - 1.2);
  });

  it('pours the player a glass of champagne from the waiter, close up', async () => {
    const g = await at('roulette', 1000);
    const salon = await import('../src/casinoSalon');
    const kit = await import('../src/casinoKit');
    const { SHIP } = g.layout, p = g.player.g.position, panel = document.getElementById('bubbly')!;
    const waiter = () => salon.salonView().staff[1];
    g.run(0.5);
    expect(panel.hidden).toBe(true);
    // walking up to the waiter (he doesn't block the way) stops him and offers a glass
    const w = waiter().clone(), on = [SHIP.x + w.x, SHIP.z + w.z];
    g.placePlayer(on[0], on[1]); g.run(0.05);
    expect([p.x, p.z]).toEqual(on);
    g.placePlayer(SHIP.x + w.x + 0.6, SHIP.z + w.z - 0.5); g.run(0.5);
    expect(panel.hidden).toBe(false);
    expect(document.getElementById('sip')!.textContent).toBe('Champagne · $25');
    const was = waiter().x;
    g.run(1);
    expect(waiter().x).toBe(was);
    // buying it takes the price and brings the camera in; the waiter takes a glass too and they clink: a toast
    click('#sip');
    expect(g.wallet.money).toBe(975);
    expect(kit.atTable()).toBe(true);
    g.run(1.5);
    expect(salon.salonView()).toMatchObject({ drinking: true, waiter: 'To Lady Luck!', says: 'Cheers!' });
    click('#sip');
    expect(g.wallet.money).toBe(975);
    // then the player drinks it, the glass tipped at their lips, and it goes back on the tray
    const arm = g.player.g.arms[0];
    g.run(1);
    expect(arm.rotation.x).toBeLessThan(-1.5);
    g.run(3);
    expect(salon.salonView().drinking).toBe(false);
    expect(kit.atTable()).toBe(false);
    g.run(1.5);
    expect(salon.salonView().says).toBe('Hic!');
    // with no money left for one, the button's greyed out; walking off closes it and the waiter carries on
    g.wallet.money = 10; g.run(0.1);
    expect((document.getElementById('sip') as HTMLButtonElement).disabled).toBe(true);
    walkAway(g); g.run(2);
    expect(panel.hidden).toBe(true);
    expect(waiter().x).not.toBe(was);
  });

  it('makes the player tipsy after one glass too many: they zigzag and the camera sways for a few seconds', async () => {
    const g = await at('roulette', 1000);
    const salon = await import('../src/casinoSalon');
    const { tipsy } = await import('../src/casinoKit');
    const { SHIP } = g.layout, p = g.player.g.position, w = salon.salonView().staff[1];
    g.placePlayer(SHIP.x + w.x + 0.6, SHIP.z + w.z - 0.5); g.run(0.2);
    for (let i = 0; i < 2; i++) { click('#sip'); g.run(5.5); }
    expect(tipsy.t).toBe(0);
    expect(document.getElementById('bubblyMsg')!.textContent).toBe('Steady now… 🥂');
    click('#sip'); g.run(5.3);
    expect(tipsy.t).toBeGreaterThan(3);
    expect(salon.salonView().says).toBe('Hic!');
    // holding one way, they weave from side to side: how far their heading swings
    const walk = () => {
      g.placePlayer(SHIP.x - 2, SHIP.z + 1.2); g.run(0.05);
      const heads: number[] = [];
      g.press('d');
      for (let i = 0; i < 30; i++) {
        const x = p.x, z = p.z;
        g.run(1 / 30);
        heads.push(Math.atan2(p.z - z, p.x - x));
      }
      g.press('d', 'keyup');
      return Math.max(...heads) - Math.min(...heads);
    };
    expect(walk()).toBeGreaterThan(0.8);
    g.run(5);
    expect(tipsy.t).toBe(0);
    expect(walk()).toBeLessThan(0.01);
  });

  it('leaves the glass with the waiter if the player walks off mid-drink', async () => {
    const g = await at('roulette', 1000);
    const salon = await import('../src/casinoSalon');
    const kit = await import('../src/casinoKit');
    const { SHIP } = g.layout, w = salon.salonView().staff[1];
    g.placePlayer(SHIP.x + w.x + 0.6, SHIP.z + w.z - 0.5); g.run(0.2);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
    expect(salon.salonView().drinking).toBe(true);
    g.placePlayer(SHIP.x, SHIP.z); g.run(0.1);
    expect(salon.salonView().drinking).toBe(false);
    expect(kit.atTable()).toBe(false);
  });

  it('turns its radar on the mast', async () => {
    const g = await loadGame({ tiles: bought('roulette') });
    const salon = await import('../src/casinoSalon');
    const was = salon.salonView().radar;
    g.run(1);
    expect(salon.salonView().radar).toBeGreaterThan(was);
  });

  it("keeps the guests and staff out of the player's way from the door to the games", async () => {
    const g = await at('roulette', 100, 'blackjack', 'slots');
    const salon = await import('../src/casinoSalon');
    const { SHIP, SALON, GAMES } = g.layout, p = g.player.g.position;
    // walk in at the door and along the aisle past every pad, with time for the waiter to come and go
    g.placePlayer(SHIP.x + SALON.x1 - 0.4, SHIP.z); g.run(0.05);
    const pads = [GAMES.slots, GAMES.blackjack, GAMES.roulette];
    for (let lap = 0; lap < 3; lap++) {
      for (const pad of pads) {
        for (let i = 0; i < 120 && Math.hypot(p.x - pad.x, p.z - pad.z) > 0.05; i++) {
          const dx = pad.x - p.x, dz = pad.z - p.z, d = Math.hypot(dx, dz), k = Math.min(1, 0.05 / d);
          p.x += dx * k; p.z += dz * k; g.run(1 / 60);
        }
        expect(Math.hypot(p.x - pad.x, p.z - pad.z)).toBeLessThan(0.1);
      }
      g.placePlayer(SHIP.x + SALON.x1 - 0.4, SHIP.z); g.run(1.5);
    }
    // the fan and the waiter keep clear of the way along the pads, from the door to the roulette table
    for (const o of salon.salonView().staff) {
      expect(Math.abs(o.z - (GAMES.roulette.z - SHIP.z)) > 1.2 || o.x < GAMES.roulette.x - SHIP.x - 1.2).toBe(true);
    }
  });
});

/** Makes the next spin land on pocket `n`. */
const rig = (n: number) => vi.spyOn(Math, 'random').mockReturnValue((WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / 37);

describe('the roulette table', () => {
  it('opens when the player steps on its pad', async () => {
    const g = await at('roulette', 100);
    expect($('roulette').hidden).toBe(false);
    expect($('rouletteMsg').textContent).toBe('Pick a colour and spin');
    expect($('spin').textContent).toBe('Spin · $25 on Red');
    walkAway(g);
    expect($('roulette').hidden).toBe(true);
  });

  it('takes the stake, reveals the result after the spin, and pays winners', async () => {
    const g = await at('roulette', 100);
    rig(32); // red
    click('#spin');
    expect(g.wallet.money).toBe(75);
    expect($('spin').textContent).toBe('Spinning…');
    click('[data-bet="black"]'); // no changing the bet mid-spin
    expect(button('[data-bet="red"]').getAttribute('aria-pressed')).toBe('true');
    const t = await import('../src/rouletteTable');
    expect(t.chipsOnFelt()).toBe(1);
    g.run(4);
    expect(g.wallet.money).toBe(75); // not revealed yet
    g.run(2);
    expect(g.wallet.money).toBe(125);
    expect(g.wallet.inFlight).toBe(0);
    expect($('rouletteMsg').textContent).toBe('32 Red: you win $50!');
    expect($('history').textContent).toBe('32');
    expect(Math.abs(t.ballOff())).toBeLessThan(1e-9); // the ball's in pocket 32
    g.run(2);
    expect(t.chipsOnFelt()).toBe(0); // back to the player
  });

  it("won't take bets the player can't cover", async () => {
    const g = await at('roulette', 60);
    expect(button('#roulette [data-stake="2"]').disabled).toBe(true);
    click('#roulette [data-stake="all"]');
    expect($('spin').textContent).toContain('$60');
    rig(15); // black: lose it all
    click('#spin');
    g.run(6);
    expect(g.wallet.money).toBe(0);
    expect($('rouletteMsg').textContent).toBe('15 Black: the house wins.');
    expect(button('#spin').disabled).toBe(true);
  });

  it('plays the spin out if the player walks away mid-spin, the croupier calling after them', async () => {
    const g = await at('roulette', 100);
    rig(32);
    click('#spin');
    g.run(0.5);
    walkAway(g);
    expect($('roulette').hidden).toBe(true);
    expect((await import('../src/rouletteTable')).croupierSays()).toBe('Still rolling!');
    expect(g.wallet.money).toBe(75);
    g.run(GRACE);
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
    g.run(6);
    expect(croupierSays()).toBe('Green!');
  });

  it('adds up the chips the player puts down, for any stake', async () => {
    const g = await at('roulette', 700);
    const chip = (v: string) => button(`#roulette [data-stake="${v}"]`);
    expect($('spin').textContent).toBe('Spin · $25 on Red'); // one $25 chip to start with
    expect(chip('1').dataset.n).toBe('×1');
    click('#roulette [data-stake="clear"]');
    expect(button('#spin').disabled).toBe(true);
    expect(chip('clear').disabled).toBe(true);
    for (let i = 0; i < 3; i++) click('#roulette [data-stake="2"]');
    click('#roulette [data-stake="1"]');
    expect($('spin').textContent).toBe('Spin · $325 on Red');
    expect([chip('1').dataset.n, chip('2').dataset.n, chip('3').dataset.n]).toEqual(['×1', '×3', undefined]);
    expect(chip('2').getAttribute('aria-pressed')).toBe('true');
    expect(chip('3').disabled).toBe(true); // another $500 would be more than the player has
    rig(32); // red
    click('#spin');
    expect(g.wallet.money).toBe(375);
    expect(chip('2').disabled).toBe(true); // no changing it mid-spin
    g.run(6);
    expect(g.wallet.money).toBe(1025);
    expect($('spin').textContent).toBe('Spin · $325 on Red'); // it stays down for the next spin
    // all in, then a chip starts again from that chip
    click('#roulette [data-stake="all"]');
    expect($('spin').textContent).toBe('Spin · $1,025 on Red');
    expect(chip('2').dataset.n).toBeUndefined();
    click('#roulette [data-stake="3"]');
    expect($('spin').textContent).toBe('Spin · $500 on Red');
    expect(chip('all').getAttribute('aria-pressed')).toBe('false');
  });

  it('has bigger chips in stage 2, and keeps the chips down through the stage-up', async () => {
    const g = await at('roulette', 100_000);
    click('#roulette [data-stake="clear"]');
    click('#roulette [data-stake="0"]'); click('#roulette [data-stake="3"]'); click('#roulette [data-stake="3"]');
    expect($('spin').textContent).toBe('Spin · $1,005 on Red');
    walkAway(g);
    g.unlocks.applyUnlock('sushi', true);
    g.placePlayer(g.layout.GAMES.roulette.x, g.layout.GAMES.roulette.z); g.run(0.05);
    expect([...document.querySelectorAll('#roulette [data-stake]')].map(b => b.textContent)).toEqual(['$50', '$250', '$1k', '$5k', 'All in', 'Clear']);
    expect($('spin').textContent).toBe('Spin · $10,050 on Red');
  });

  it('keeps its board of last numbers in view, between the HUD and the controls, on a computer or a phone', async () => {
    const g = await at('roulette', 100);
    const { Box3, Vector3 } = await import('three');
    const { camera, scene, slideView } = await import('../src/render'), { tableRoom, topOfView } = await import('../src/ui');
    const t = await import('../src/rouletteTable'), kit = await import('../src/casinoKit');
    for (const [w, h, panel] of [[1024, 768, 200], [390, 844, 250]]) {
      vi.stubGlobal('innerWidth', w); vi.stubGlobal('innerHeight', h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const controls = h - panel - 10, pw = Math.min(w * 0.94, 440);
      vi.spyOn($('roulette'), 'getBoundingClientRect').mockReturnValue({ left: (w - pw) / 2, top: controls, width: pw, height: panel } as DOMRect);
      g.run(0.05);
      // the camera where the game puts it, sat at the table
      let v = kit.tableView(0.1);
      for (let i = 0; i < 40; i++) v = kit.tableView(0.1);
      camera.position.copy(v.eye); camera.lookAt(v.at);
      slideView(tableRoom.x, tableRoom.y);
      scene.updateMatrixWorld(); camera.updateMatrixWorld();
      const box = new Box3().setFromObject(t.lastNumbers()!);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new Vector3(x, y, z).project(camera);
        const sx = (p.x + 1) / 2 * w, sy = (1 - p.y) / 2 * h;
        expect(sy).toBeGreaterThan(topOfView(h));
        expect(sy).toBeLessThan(controls);
        expect(sx).toBeGreaterThan(0);
        expect(sx).toBeLessThan(w);
      }
    }
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
  /** What's on the felt: the cards ('?' face down), the totals over them, the hand being played. */
  const felt = async () => (await import('../src/blackjackTable')).onFelt();
  const inShoe = async () => (await import('../src/blackjackTable')).inShoe();
  const name = (x: Card) => rankName(x) + x.suit;
  const says = async () => (await import('../src/blackjackTable')).dealerSays();
  /** Seconds for the four cards of the deal to come out and turn over. */
  const DEALT = 3.5;
  /** Plays the deal out, till the player's to act or the dealer's offering insurance. */
  const dealt = (g: Game) => g.runUntil(() => !$('bjActs').hidden || !$('bjAsk').hidden, DEALT + 1);
  /** Seconds for the dealer to turn over their card and settle up, with no cards to draw; and for each card they draw. */
  const STOOD = 2, DRAW = 1.4;
  /** Seconds from stepping up to a fresh shoe to the stack being down for the player's cut, and from the cut to the
   *  stack being in the shoe with its top card burned. */
  const SHUFFLE = 6, LOAD = 3.5;
  /** `cards` (the next one out last) cut `k` from the top, as the shoe cuts them. */
  const cutShoe = (cards: Card[], k: number) => { const s = Shoe.of([...cards].reverse()); s.cut(k); return s.left; };
  /** Moves the cut card in the stack, `k` cards from the top. */
  const slideCut = (k: number) => {
    const s = $('cutAt') as HTMLInputElement;
    s.value = String(k);
    s.dispatchEvent(new Event('input'));
  };

  it('brings the camera in over the table while the player plays, fitting it above the controls', async () => {
    const g = await at('blackjack', 100, 'blackjack');
    const kit = await import('../src/casinoKit'), ui = await import('../src/ui');
    const rect = (r: Partial<DOMRect>) => vi.spyOn($('blackjack'), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 0, height: 0, ...r } as DOMRect);
    expect(kit.atTable()).toBe(true);
    // along the bottom: the table goes in the middle of the screen above the controls
    rect({ left: 200, top: 568, width: 400, height: 200 });
    let v = kit.tableView(0.1);
    expect(v.k).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) v = kit.tableView(0.1);
    expect(v.k).toBeCloseTo(1, 3);
    expect(v.eye.y).toBeGreaterThan(v.at.y + 1);
    expect(v.eye.z).toBeGreaterThan(v.at.z); // from the player's side
    expect(ui.tableRoom).toMatchObject({ on: true, x: 0 });
    expect(ui.tableRoom.y).toBeGreaterThan(0);
    const near = v.eye.distanceTo(v.at);
    // down the side of a phone held sideways: the table goes to the left, with the camera refitted
    rect({ left: 600, top: 100, width: 400, height: 600 });
    window.dispatchEvent(new Event('resize'));
    vi.stubGlobal('innerWidth', 1000);
    v = kit.tableView(0.1);
    expect(ui.tableRoom.x).toBeGreaterThan(0);
    expect(v.eye.distanceTo(v.at)).not.toBeCloseTo(near, 3);
    walkAway(g);
    expect(kit.atTable()).toBe(false);
    for (let i = 0; i < 40; i++) v = kit.tableView(0.1);
    expect(v.k).toBe(0);
    expect(ui.tableRoom.on).toBe(false);
    // and straight there, for players who prefer less motion
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    g.placePlayer(g.layout.GAMES.blackjack.x, g.layout.GAMES.blackjack.z); g.run(0.05);
    expect(kit.tableView(0.01).k).toBe(1);
  });

  it('deals a card at a time out of the shoe, turning each over, the dealer\'s second face down', async () => {
    const g = await table(100, [c(10), c(7, '♥')], [c(9), c(8)]);
    expect($('blackjack').hidden).toBe(false);
    expect($('bjMsg').textContent).toBe('Put a stake down and deal');
    expect($('deal').textContent).toBe('Deal · $25');
    click('#deal');
    expect(g.wallet.money).toBe(75);
    expect((await felt()).chips).toBe(1);
    expect((await felt()).hands).toEqual([[]]);
    g.run(0.6);
    expect((await felt()).hands).toEqual([['?']]); // on its way, face down
    g.run(0.5);
    expect((await felt()).hands).toEqual([['10♠']]);
    expect((await felt()).totals).toEqual(['10']);
    expect($('bjActs').hidden).toBe(true);
    g.run(DEALT - 1.1);
    const f = await felt();
    expect(f.hands).toEqual([['10♠', '7♥']]);
    expect(f.dealer).toEqual(['9♠', '?']);
    expect(f.dealerTotal).toBe('9');
    expect(f.totals).toEqual(['17']);
    expect($('bjMsg').textContent).toBe('You have 17. Hit or stand?');
    expect($('bjActs').hidden).toBe(false);
    expect($('deal').hidden).toBe(true);
  });

  it('pays a win when the player stands on the better hand, turning the hidden card over slowly', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    dealt(g);
    click('#stand');
    g.run(0.9);
    expect((await felt()).dealer).toEqual(['10♠', '?']); // still turning
    g.run(0.5);
    expect((await felt()).dealer).toEqual(['10♠', '7♠']);
    expect(g.wallet.money).toBe(75);
    g.run(STOOD - 1.4);
    expect(g.wallet.money).toBe(125);
    expect(g.wallet.inFlight).toBe(0);
    expect($('bjMsg').textContent).toBe('19 beats 17: you win $50!');
    expect($('deal').hidden).toBe(false);
    g.run(1.5);
    expect((await felt()).chips).toBe(0); // paid back to the player
  });

  it('the dealer draws straight off the shoe, burning nothing, and can bust', async () => {
    const g = await table(100, [c(10), c(8)], [c(10), c(6)], c(9));
    click('#deal');
    dealt(g);
    click('#stand');
    g.run(1.4);
    expect((await felt()).dealer).toEqual(['10♠', '6♠']);
    g.run(0.5);
    expect($('bjMsg').textContent).toBe('Dealer draws…');
    expect((await felt()).dealer).toEqual(['10♠', '6♠', '?']);
    g.run(1);
    expect((await felt()).dealer).toEqual(['10♠', '6♠', '9♠']);
    expect((await felt()).discards).toBe(0);
    g.run(0.4);
    expect($('bjMsg').textContent).toBe('Dealer busts with 25: you win $50!');
    expect(g.wallet.money).toBe(125);
  });

  it('sweeps the last hand into the tray at the next deal', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)], c(5), c(6), c(5), c(6));
    click('#deal');
    dealt(g);
    click('#stand');
    g.run(STOOD);
    expect((await felt()).discards).toBe(0);
    click('#deal');
    expect($('bjMsg').textContent).toBe('Dealing…');
    g.run(1);
    expect((await felt()).discards).toBe(4);
  });

  it('shuffles a fresh shoe in front of the player, riffling it three times, then offers them the cut', async () => {
    const g = await at('blackjack', 100, 'blackjack');
    expect($('bjMsg').textContent).toBe('A fresh shoe: the dealer shuffles…');
    expect($('deal').hidden).toBe(true);
    expect((await felt()).shuffle).toBe('due');
    g.run(1.2);
    expect(await felt()).toMatchObject({ shuffle: 'shuffle', stack: 312 }); // the shoe, gathered on the felt
    g.run(0.5);
    expect($('bjMsg').textContent).toBe('The dealer riffles the cards… (1 of 3)');
    g.run(1.2);
    expect($('bjMsg').textContent).toBe('The dealer riffles the cards… (2 of 3)');
    expect($('bjCut').hidden).toBe(true);
    g.run(SHUFFLE - 2.9);
    expect(await felt()).toMatchObject({ shuffle: 'cut', stack: 312, cutCard: true });
    expect($('bjCut').hidden).toBe(false);
    expect([$('cutAt').getAttribute('min'), $('cutAt').getAttribute('max')]).toEqual(['52', '260']); // a deck in from either end
    expect($('bjMsg').textContent).toBe('Your cut: slide the yellow card into the stack, then cut.');
    expect(await says()).toBe('Your cut!');
    expect($('deal').hidden).toBe(true);
    click('#deal');
    expect(g.wallet.money).toBe(100); // no dealing till it's cut
  });

  it('cuts where the player puts the cut card, burns the top card, and deals from the one under it', async () => {
    const g = await at('blackjack', 100, 'blackjack');
    g.run(SHUFFLE);
    const before = await inShoe();
    slideCut(100);
    click('#cutBtn');
    expect(await inShoe()).toEqual(cutShoe(before, 100));
    expect($('bjCut').hidden).toBe(true);
    g.run(LOAD - 0.7);
    expect($('bjMsg').textContent).toBe('The dealer burns the top card…');
    g.run(0.7);
    expect(await felt()).toMatchObject({ shuffle: '', cutCard: false, discards: 1 });
    expect(await inShoe()).toEqual(cutShoe(before, 100).slice(0, -1));
    expect($('bjMsg').textContent).toBe('Put a stake down and deal');
    expect($('deal').hidden).toBe(false);
    // the card right under the cut card was burned; the deal starts with the one under that, and burns nothing more
    const next = (await inShoe()).slice(-4).reverse();
    expect(next[0]).toEqual(before[before.length - 1 - 101]);
    click('#deal');
    dealt(g);
    const f = await felt();
    expect(f.hands).toEqual([[name(next[0]), name(next[2])]]);
    expect(f.dealer[0]).toBe(name(next[1]));
    expect(f.discards).toBe(1);
  });
  it('lets the dealer cut if the player walks off mid-shuffle; one that has not started waits for them', async () => {
    let g = await at('blackjack', 100, 'blackjack');
    walkAway(g);
    expect((await felt()).shuffle).toBe('due');
    g.placePlayer(g.layout.GAMES.blackjack.x, g.layout.GAMES.blackjack.z); g.run(0.05);
    expect($('bjMsg').textContent).toBe('A fresh shoe: the dealer shuffles…');
    g.run(3);
    walkAway(g);
    g.run(GRACE);
    expect(await felt()).toMatchObject({ shuffle: '', stack: 0, cutCard: false, discards: 1 });
    expect(await inShoe()).toHaveLength(311);
    g.placePlayer(g.layout.GAMES.blackjack.x, g.layout.GAMES.blackjack.z); g.run(0.05);
    expect($('deal').hidden).toBe(false);
    g = await at('blackjack', 0, 'blackjack'); // a broke player isn't shuffled for
    g.run(SHUFFLE);
    expect((await felt()).shuffle).toBe('due');
  });

  it('finishes the round when the cut card comes out, then shuffles again', async () => {
    const g = await at('blackjack', 100, 'blackjack');
    (await import('../src/blackjackTable')).stackShoe([c(10), c(10), c(9), c(7)], 50);
    click('#deal');
    dealt(g);
    click('#stand');
    g.run(STOOD);
    expect($('bjMsg').textContent).toBe('19 beats 17: you win $50!');
    expect(await felt()).toMatchObject({ cutCard: true, shuffle: 'due' });
    expect($('deal').hidden).toBe(true);
    g.run(2.6);
    expect($('bjMsg').textContent).toBe("The cut card's out: the dealer shuffles…");
    g.run(1);
    expect(await felt()).toMatchObject({ hands: [[]], dealer: [], discards: 0, cutCard: false });
    g.run(SHUFFLE);
    expect((await felt()).shuffle).toBe('cut');
    click('#cutBtn');
    g.run(LOAD);
    expect(await inShoe()).toHaveLength(311);
    expect($('deal').hidden).toBe(false);
  });
  it('doubles on 10 or 11 with the card face down, turned over once the dealer is done', async () => {
    const g = await table(100, [c(5), c(6)], [c(10), c(6)], c(10), c(2));
    click('#deal');
    dealt(g);
    click('#double');
    expect(g.wallet.money).toBe(50);
    expect($('bjActs').hidden).toBe(true);
    g.run(0.8);
    expect(await felt()).toMatchObject({ hands: [['5♠', '6♠', '?']], totals: ['11 + ?'] });
    g.run(STOOD + DRAW - 0.1);
    expect((await felt()).dealer).toEqual(['10♠', '6♠', '2♠']); // the dealer plays first
    expect($('bjMsg').textContent).toBe('Your double card…');
    expect((await felt()).hands).toEqual([['5♠', '6♠', '?']]);
    g.run(0.6);
    expect(await felt()).toMatchObject({ hands: [['5♠', '6♠', '10♠']], totals: ['21'] });
    g.run(0.4);
    expect($('bjMsg').textContent).toBe('21 beats 18: you win $100!');
    expect(g.wallet.money).toBe(150);
  });
  it('hits, stands by itself on 21, and shows soft totals', async () => {
    const g = await table(100, [c(1), c(6)], [c(10), c(8)], c(4));
    click('#deal');
    dealt(g);
    expect($('bjMsg').textContent).toBe('You have soft 17. Hit or stand?');
    expect((await felt()).totals).toEqual(['soft 17']);
    click('#hit');
    expect($('bjActs').hidden).toBe(true);
    g.run(0.8 + STOOD);
    expect($('bjMsg').textContent).toBe('21 beats 18: you win $50!');
  });
  it('holds the hand for a player who walks away mid-hand, then stands and settles if they stay away', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    g.run(0.5);
    walkAway(g);
    expect($('blackjack').hidden).toBe(true);
    expect(await says()).toBe("I'll wait!");
    g.run(GRACE - 0.5);
    expect(g.wallet.money).toBe(75);
    expect((await felt()).dealer).toEqual(['10♠', '?']);
    g.run(0.5);
    expect(g.wallet.money).toBe(125);
    expect((await felt()).dealer).toEqual(['10♠', '7♠']);
  });

  it('lets a player who stepped off by mistake come back and play on', async () => {
    const g = await table(100, [c(10), c(6)], [c(10), c(7)], c(4));
    click('#deal');
    dealt(g);
    const pad = g.layout.GAMES.blackjack;
    g.placePlayer(pad.x, pad.z + 1.2); g.run(0.05); // a step back off the pad, still aboard
    expect($('blackjack').hidden).toBe(true);
    g.run(GRACE - 1);
    g.placePlayer(pad.x, pad.z); g.run(0.05);
    expect(await says()).toBe('Welcome back!');
    expect($('bjMsg').textContent).toBe('You have 16. Hit or stand?');
    g.run(GRACE); // nobody's waiting any more: the hand's still theirs
    click('#hit');
    g.run(0.8);
    click('#stand');
    g.run(STOOD);
    expect($('bjMsg').textContent).toBe('20 beats 17: you win $50!');
  });

  it('saves what standing would win, mid-hand', async () => {
    const g = await table(100, [c(10), c(9)], [c(10), c(7)]);
    click('#deal');
    g.saveMod.save();
    expect(saved()).toBe(125);
    dealt(g);
    click('#stand');
    g.saveMod.save();
    expect(saved()).toBe(125);
  });

  it('splits a pair into two hands, played in turn, with doubling after the split', async () => {
    const g = await table(100, [c(8), c(8, '♥')], [c(10), c(7)], c(3), c(10), c(10));
    click('#deal');
    dealt(g);
    expect(button('#split').hidden).toBe(false);
    click('#split');
    expect(g.wallet.money).toBe(50);
    expect((await felt()).chips).toBe(2);
    g.run(2);
    let f = await felt();
    expect(f.hands).toEqual([['8♠', '3♠'], ['8♥', '10♠']]);
    expect(f.totals).toEqual(['11', '18']);
    expect(f.active).toBe(0);
    expect($('bjMsg').textContent).toBe('Hand 1: 11. Hit or stand?');
    expect(button('#split').hidden).toBe(true);
    click('#double'); // 21 on the first hand, face down
    expect(g.wallet.money).toBe(25);
    g.run(0.8);
    f = await felt();
    expect(f.active).toBe(1);
    expect(f.hands[0]).toEqual(['8♠', '3♠', '?']);
    click('#stand');
    g.run(STOOD);
    expect($('bjMsg').textContent).toBe('Your double card…');
    g.run(1);
    expect((await felt()).hands[0]).toEqual(['8♠', '3♠', '10♠']);
    expect($('bjMsg').textContent).toBe('Dealer has 17: hand 1 wins, hand 2 wins. $150 back.');
    expect(g.wallet.money).toBe(175);
  });
  it("won't double or split what the player can't cover", async () => {
    const g = await table(40, [c(8), c(8)], [c(10), c(7)]);
    click('#deal');
    dealt(g);
    expect(button('#split').hidden).toBe(true);
    expect(button('#double').disabled).toBe(true);
    click('#double');
    expect(g.wallet.money).toBe(15);
  });

  it('offers insurance on an ace, which pays 2 to 1 when the dealer has blackjack', async () => {
    const g = await table(100, [c(10), c(9)], [c(1), c(13)]);
    click('#deal');
    dealt(g);
    expect($('bjMsg').textContent).toBe('Dealer shows an ace. Insurance for $12?');
    expect($('insureYes').textContent).toBe('Insure · $12');
    expect(await says()).toBe('Insurance?');
    expect($('bjAsk').hidden).toBe(false);
    expect($('bjActs').hidden).toBe(true);
    click('#insureYes');
    expect(g.wallet.money).toBe(63);
    expect((await felt()).insurance).toBe(true);
    g.run(STOOD);
    expect($('bjMsg').textContent).toBe('Dealer has blackjack: insurance pays $36.');
    expect(g.wallet.money).toBe(99);
  });
  it('offers even money on a blackjack against an ace', async () => {
    const g = await table(100, [c(1), c(13)], [c(1), c(9)]);
    click('#deal');
    dealt(g);
    expect($('bjMsg').textContent).toBe('Blackjack! Take even money?');
    expect($('insureYes').textContent).toBe('Even money');
    expect(await says()).toBe('Even money?');
    click('#insureYes');
    g.run(STOOD);
    expect($('bjMsg').textContent).toBe('Even money: you win $50!');
    expect(await says()).toBe('Blackjack!');
    expect(g.wallet.money).toBe(125);
  });
  it('walking off at the insurance offer turns it down and stands', async () => {
    const g = await table(100, [c(10), c(9)], [c(1), c(7)]);
    click('#deal');
    dealt(g);
    walkAway(g);
    g.run(GRACE);
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
    dealt(g);
    click('#hit');
    g.run(0.8);
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
    expect($('pull').textContent).toBe('Pull · $25');
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
  it('plays the spin out if the player walks away mid-spin, and saves a win still spinning', async () => {
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
    expect((await import('../src/slotMachine')).signSays()).toBe('Still spinning!');
    expect(g.wallet.money).toBe(675);
    g.run(2);
    expect(g.wallet.money).toBe(1300);
  });

  it('greets a broke player', async () => {
    await at('slots', 0, 'slots');
    expect($('slotsMsg').textContent).toBe('Come back with some cash to play');
    expect(button('#pull').disabled).toBe(true);
  });
});
