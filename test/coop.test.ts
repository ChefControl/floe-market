// Co-op (src/coop.ts): a host's game and a guest's, each a copy of the whole game, meeting in a room in memory
// (src/link.ts). The host plays as ever; the guest's phone shows the host's game, walks its own player round it, and
// asks the host's for what costs money.
import { describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { memoryRooms } from '../src/link';
import { bought, loadGame, MARKET, type SaveFixture } from './helpers';
import { seeded } from './setup';

/** A copy of the game: the host's (from `save`), or a guest's (opened from an invite link: no save of its own). */
async function copy(save?: SaveFixture, guest = false, before = (_g: Awaited<ReturnType<typeof loadGame>>) => {}) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(1));
  history.replaceState(null, '', guest ? '/?join=ABCDEF' : '/');
  const g = await loadGame(save, { noLoad: true });
  const [coop, remote, presents, season, characters, playerMod, sfx] = await Promise.all([
    import('../src/coop'), import('../src/remote'), import('../src/presents'), import('../src/season'),
    import('../src/characters'), import('../src/player'), import('../src/sfx'),
  ]);
  before(g);
  coop.noteBoot();
  if (!guest) g.saveMod.load();
  history.replaceState(null, '', '/');
  return { ...g, coop, remote, presents, season, characters, playerMod, sfx };
}
type Copy = Awaited<ReturnType<typeof copy>>;

/** A host's game from `save`, and a guest who's joined it. */
async function pair(save?: SaveFixture, tweak?: Parameters<typeof copy>[2], drop = 0) {
  await copy(); // the first copy warms up three.js' own lazy bits (see mirror.test.ts)
  const host = await copy(save);
  const saved = localStorage.getItem('floe-market-v1');
  const guest = await copy(undefined, true, tweak);
  // one browser for both copies here: put the host's save back where its phone keeps it
  if (saved !== null) localStorage.setItem('floe-market-v1', saved);
  const rooms = memoryRooms();
  const code = await host.coop.host(rooms);
  const states: string[] = [];
  let now = performance.now();
  rooms.drop = drop;
  const joined = await guest.coop.join(rooms, code, 'Sam', s => states.push(s));
  /** Both phones play `secs` at 60 frames a second: the host's game ticks and sends; the guest's catches up. */
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += 1 / 60) {
      now += 1000 / 60;
      host.game.tick(1 / 60);
      host.coop.hostStep(now);
      guest.coop.guestTick(1 / 60, now);
    }
  };
  const until = (cond: () => boolean, secs = 20) => {
    for (let t = 0; t < secs; t += 0.1) { if (cond()) return true; play(0.1); }
    return cond();
  };
  play(0.5);
  /** The guest's phone plays on, without a word from the host's. */
  const alone = (secs: number, dt = 1 / 60) => {
    for (let t = 0; t < secs; t += dt) { now += dt * 1000; guest.coop.guestTick(dt, now); }
  };
  return { host, guest, rooms, code, states, joined, play, until, alone, now: () => now };
}

/** The host's player for the guest. */
const friend = (host: Copy) => host.playerMod.players[1];
/** Where the guest's phone has its player stand (as walking there would). */
function stand(guest: Copy, at: { x: number; z: number }) {
  guest.player.g.position.set(at.x, guest.player.g.position.y, at.z);
}
const toastText = () => document.getElementById('toast')!.textContent;
/** Seconds without a word from the host before a guest's phone says it's waiting. */
const QUIET_SECS = 3;
const last = <T>(a: T[]) => a[a.length - 1];

describe('co-op', () => {
  it('a friend joins: a second player in the host’s game, and the host’s game on their phone', async () => {
    const p = await pair({ money: 120, tiles: bought('pack') });
    const { host, guest } = p;
    expect(p.states).toEqual(['playing']);
    expect(host.playerMod.players).toHaveLength(2);
    expect(host.remote.coop.role).toBe('host');
    expect(guest.remote.coop.role).toBe('guest');
    expect(host.coop.guestName()).toBe('Sam');
    // the HUD's numbers, and the guest's own player as the host's game has them (a bigger pack)
    expect(guest.wallet.money).toBe(120);
    expect(guest.player.back.cap).toBe(14);
    // the host's player shows on the guest's phone where the host has them
    host.player.g.position.set(1, host.player.g.position.y, 1);
    p.play(0.5);
    const replicas = guest.render.scene.children.filter(o => o instanceof guest.characters.Person && o !== guest.player.g);
    expect(replicas.some(o => Math.abs(o.position.x - 1) < 0.01 && Math.abs(o.position.z - 1) < 0.01)).toBe(true);
  });

  it('a friend carries fish from the pile to the counter, walking on their own phone', async () => {
    const p = await pair({ pile: 9 });
    const { host, guest } = p;
    stand(guest, host.stations.PILE);
    expect(p.until(() => guest.player.back.n >= 6)).toBe(true);
    // their arms, as the host's game has them, laid out on their phone round their own player
    expect(friend(host).back.n).toBe(6);
    expect(host.stations.pile.n).toBe(3);
    const slot = guest.player.back.items[0].position;
    expect(Math.hypot(slot.x - guest.player.g.position.x, slot.z - guest.player.g.position.z)).toBeLessThan(0.6);
    // the host's phone saves what they're carrying as still on the pile
    host.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).pile).toBe(9);
    stand(guest, host.counters.C1.dropPos!);
    expect(p.until(() => host.counters.C1.stock.n === 6 && guest.player.back.n === 0)).toBe(true);
  });

  it('a friend buys an upgrade by holding Buy on its tile, with the host’s money', async () => {
    const p = await pair({ money: 500 });
    const { host, guest } = p;
    const tile = guest.unlocks.tiles.find(t => t.id === 'pack')!;
    stand(guest, tile);
    p.play(0.2);
    expect(document.getElementById('tip')!.textContent).toContain(tile.name);
    guest.input.holdBuyButton(true);
    expect(p.until(() => host.unlocks.tiles.find(t => t.id === 'pack')!.done)).toBe(true);
    p.play(0.3);
    guest.input.holdBuyButton(false);
    expect(host.wallet.money).toBe(500 - tile.cost);
    expect(guest.wallet.money).toBe(host.wallet.money);
    expect(tile.done).toBe(true);
    // a bigger pack for both players
    expect(guest.player.back.cap).toBe(14);
    expect(host.player.back.cap).toBe(14);
  });

  it('a friend buys upgrade levels and spins the roulette wheel through the host’s phone', async () => {
    const p = await pair({ money: 5000, tiles: bought('pack', 'turret', 'roulette') });
    const { host, guest } = p;
    expect(guest.shop.buyMod('fillets')).toBe(true);
    p.play(0.3);
    expect(host.economy.mods.fillets).toBe(1);
    expect(guest.economy.mods.fillets).toBe(1);
    const afterMod = host.wallet.money;
    expect(afterMod).toBeLessThan(5000);
    expect(guest.wallet.money).toBe(afterMod);
    // at the table, the guest's own panel opens; the host's phone takes the bet and picks the pocket
    stand(guest, guest.casino.CASINO);
    p.play(0.3);
    expect(document.getElementById('casino')!.hidden).toBe(false);
    (document.getElementById('spin') as HTMLButtonElement).click();
    p.play(0.3);
    expect(host.wallet.money).toBe(afterMod - 25);
    p.play(4);
    expect(document.getElementById('history')!.children).toHaveLength(1);
    expect(guest.wallet.money).toBe(host.wallet.money);
    expect(host.wallet.inFlight).toBe(0);
  });

  it('shows and plays on the friend’s phone what the host’s game says and does', async () => {
    const p = await pair({ money: 50 });
    const { host, guest } = p;
    host.ui.toast('Hello from the host');
    // a sound given the thing it comes from (a rice plant, with its 3D model), sent as just where it is
    host.sfx.swish({ x: 1, z: 2, g: new Group() } as never);
    p.play(0.2);
    expect(toastText()).toBe('Hello from the host');
    host.ui.banner('Stage 1 complete', 'Fish Market');
    host.ui.popText('+$5', { x: 0, z: 0 });
    host.ui.popStars(5, { x: 0, z: 0 });
    host.ui.confetti();
    p.play(0.2);
    expect(document.querySelector('#banner .t')!.textContent).toBe('Fish Market');
    expect([...document.querySelectorAll('.pop')].map(e => e.textContent)).toEqual(expect.arrayContaining(['+$5', '★★★★★']));
    host.ui.banner(null);
    p.play(0.2);
    expect(document.getElementById('banner')!.classList.contains('on')).toBe(false);
    // a driver's boop is a hop on the friend's own phone
    host.playerMod.boop(friend(host), { x: 1, z: 2 });
    p.play(0.15); // with the next message: the hop takes longer than that
    expect(guest.player.booped).not.toBeNull();
  });

  it('the friend leaves: their player goes, and what they carried goes back on the pile', async () => {
    const p = await pair({ pile: 9 });
    const { host, guest } = p;
    stand(guest, host.stations.PILE);
    p.until(() => guest.player.back.n >= 6);
    stand(guest, { x: 0, z: 2 });
    p.play(0.2);
    guest.coop.leaveGame();
    p.play(1);
    expect(host.playerMod.players).toHaveLength(1);
    expect(host.coop.guestName()).toBeNull();
    expect(host.stations.pile.n).toBe(9);
  });

  it('turns away a phone with a different version of the game, and a third player', async () => {
    const odd = await pair(undefined, g => g.render.scene.add(new Group()));
    expect(odd.states).toEqual(['version']);
    expect(odd.host.playerMod.players).toHaveLength(1);

    const p = await pair();
    const third = await copy(undefined, true);
    p.rooms.as = 'someone-else';
    const states: string[] = [];
    await third.coop.join(p.rooms, p.code, 'Pat', s => states.push(s));
    expect(states).toEqual(['full']);
  });

  it('catches up after missing messages, and when its connection comes back', async () => {
    const p = await pair({ money: 900, tiles: bought('pack', 'turret', 'roulette', 'runner') });
    const { host, guest } = p;
    p.rooms.drop = 3;
    p.play(3);
    host.wallet.money = 777;
    p.play(0.5);
    expect(guest.wallet.money).toBe(777);
    // back from a dropped connection: the host's phone sends everything again
    p.joined.end.onBack();
    p.play(0.5);
    host.wallet.money = 778;
    p.play(0.5);
    expect(guest.wallet.money).toBe(778);
    expect(host.playerMod.players).toHaveLength(2);
  });

  it('says when the host has gone quiet, and gives up after a while', async () => {
    const p = await pair();
    p.alone(QUIET_SECS + 1, 0.1);
    expect(last(p.states)).toBe('waiting');
    p.play(0.3);
    expect(last(p.states)).toBe('playing');
    p.alone(5 * 60 + 1, 1);
    expect(last(p.states)).toBe('quiet');
  });

  it('the friend’s game ends when the host stops playing together', async () => {
    const p = await pair();
    p.host.coop.stopHosting();
    expect(last(p.states)).toBe('gone');
    expect(p.host.playerMod.players).toHaveLength(1);
    expect(p.host.remote.coop.role).toBe('solo');
  });

  it('follows the host’s game into stage 2, the seasons and the presents at her door', async () => {
    const p = await pair({ money: 20000, tiles: bought(...MARKET) });
    const { host, guest } = p;
    host.unlocks.applyUnlock('sushi');
    p.play(1);
    expect(guest.stage.staging()).toBe(true);
    p.play(7);
    expect(guest.stage.staging()).toBe(false);
    expect(guest.layout.stage.n).toBe(2);
    expect(guest.restaurant.sushi.built).toBe(true);
    expect(guest.stage.moodNow()).toBe(1);
    expect(guest.stage.view.zoom).toBeCloseTo(host.stage.view.zoom, 2);
    expect(guest.casino.CASINO.z).toBe(host.casino.CASINO.z);
    host.season.setSeason(2, 10);
    p.play(0.3);
    expect(guest.season.season.i).toBe(2);
    stand(guest, host.presents.PRESENT);
    expect(p.until(() => host.presents.presents.n > 0)).toBe(true);
    p.play(0.3);
    expect(guest.presents.presents.n).toBe(host.presents.presents.n);
    expect(guest.presents.pileCover).toEqual(host.presents.pileCover);
  });

  it('says hello again until it’s in, when the host’s first answers go missing', async () => {
    const p = await pair({ money: 64 }, undefined, 3);
    expect(p.states).toEqual([]);
    expect(p.until(() => last(p.states) === 'playing', 5)).toBe(true);
    expect(p.guest.wallet.money).toBe(64);
    // the keyframe says which player is this phone's, though the welcome never came: it shows once, not twice
    const blue = p.guest.render.scene.children.filter(o => o instanceof p.guest.characters.Person && o.color === p.guest.playerMod.SHIRTS.guest);
    expect(blue).toEqual([p.guest.player.g]);
    expect(p.host.playerMod.players).toHaveLength(2);
  });
});
