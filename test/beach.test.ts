// The matkot beach, from stage 2: sand between the sea and the road, through the old drive-up window's gap in the
// dock's fence, and in spring and summer a rally of matkot with the regular there, the best of it saved.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
/** A key pressed (the kit goes by where it is on the keyboard). */
const key = (code: string, k: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: k }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key: k }));
};
const E = () => key('KeyE', 'e');
/** Election day, local noon; and the day after. */
const ELECTION = new Date(2026, 9, 27, 12), AFTER = new Date(2026, 9, 28, 12);
const STAGE2 = bought(...MARKET, 'sushi', ...FLOE_SUSHI);
/** The seasons, as saved. */
const WINTER = 0, SUMMER = 2, AUTUMN = 3;

/** Loads a game on `date` (in stage 2 in summer unless the save says otherwise), and runs it a moment. */
async function loadOn(date: Date, save: Parameters<typeof loadGame>[0] = { tiles: STAGE2, season: SUMMER }) {
  vi.useFakeTimers({ toFake: ['Date'], now: date });
  const g = await loadGame(save);
  const beach = await import('../src/beach');
  g.run(0.1);
  return { g, beach, layout: g.layout };
}

afterEach(() => { vi.useRealTimers(); });

describe('the matkot beach', () => {
  it('is there on election day from stage 2, and walked onto through the gap in the dock\'s east fence', async () => {
    const { g, beach, layout } = await loadOn(ELECTION);
    expect(beach.sands!.g.visible).toBe(true);
    const { world } = g;
    expect(world.gapLogs.every(l => !l.visible)).toBe(true);
    // off the dock through the gap, onto the sand and up along the water to the pad
    const walk = (x: number, z: number) => { const q = { x, z }; layout.keepOnFloor(q, layout.walkable()); return q; };
    expect(walk(7.9, -1.2)).toEqual({ x: 7.9, z: -1.2 });
    expect(walk(10, -3)).toEqual({ x: 10, z: -3 });
    expect(walk(beach.PAD.x, beach.PAD.z)).toEqual(beach.PAD);
    expect(layout.onBeach(beach.PAD)).toBe(true);
    // but not through the fence beside the gap, nor into the sea or onto the road
    expect(walk(7.9, -4)).not.toEqual({ x: 7.9, z: -4 });
    expect(walk(7.0, -10).x).toBeGreaterThan(7.45);
    expect(walk(13.5, -10).x).toBeLessThan(12.6);
  });

  it('is not there in stage 1 (the road runs by the water)', async () => {
    const one = await loadOn(ELECTION, { tiles: bought(...MARKET), season: SUMMER });
    expect(one.beach.sands).toBeNull(); // not even built
    expect(document.getElementById('matkot')).toBeNull();
    expect(one.layout.onBeach({ x: 10, z: -10 })).toBe(false);
  });

  it('is there on any other day too, its flags only on election day', async () => {
    const vote = await loadOn(ELECTION);
    expect(vote.beach.sands!.flags).toBe(true);
    const { g, beach, layout } = await loadOn(AFTER);
    expect([beach.sands!.g.visible, beach.sands!.fair.visible, beach.sands!.flags]).toEqual([true, true, false]);
    expect(layout.onBeach(beach.PAD)).toBe(true);
    g.placePlayer(beach.PAD.x, beach.PAD.z);
    g.run(0.1);
    expect($('matkot').hidden).toBe(false);
  });

  it('has the regular and his game in spring and summer only; the sand stays, under snow in winter', async () => {
    for (const season of [WINTER, AUTUMN]) {
      const { g, beach, layout } = await loadOn(AFTER, { tiles: STAGE2, season });
      expect([beach.sands!.g.visible, beach.sands!.fair.visible, beach.sands!.ball.visible]).toEqual([true, false, false]);
      // still there to walk on, through the gap in the fence, but no game on the pad
      expect(layout.onBeach(beach.PAD)).toBe(true);
      g.placePlayer(beach.PAD.x, beach.PAD.z);
      g.run(0.1);
      expect($('matkot').hidden).toBe(true);
      E();
      g.run(0.1);
      expect([beach.rally.state, g.player.held]).toEqual(['idle', false]);
      // the snow on the sand: in winter only
      expect(beach.sands!.snow.visible).toBe(season === WINTER);
    }
  });

  it('lets a rally under way play out when autumn comes, then the regular goes', async () => {
    const { g, beach } = await loadOn(AFTER);
    const { setSeason } = await import('../src/season');
    const { rally, PAD } = beach;
    g.placePlayer(PAD.x, PAD.z);
    g.run(0.1);
    E();
    g.run(1.0);
    expect(rally.state).toBe('toYou');
    setSeason(AUTUMN);
    g.run(0.1);
    expect([beach.sands!.fair.visible, $('matkot').hidden]).toEqual([true, false]);
    // let it go by: the rally's over, he has his word on it, and then he's gone and the player's free
    g.runUntil(() => rally.state === 'idle' && beach.sands!.says.text === '', 10);
    g.run(0.1);
    expect([beach.sands!.fair.visible, $('matkot').hidden, g.player.held]).toEqual([false, true, false]);
  }, 30_000);

  it('plays a rally with the regular: Hit as the ball comes counts, too soon misses, and the best is saved', async () => {
    const { g, beach } = await loadOn(ELECTION);
    const { rally, PAD } = beach;
    g.placePlayer(PAD.x, PAD.z + 0.4);
    g.run(0.1);
    // on the pad, the card asks; E plays
    expect($('matkot').hidden).toBe(false);
    expect($('matkot').textContent).toContain('Play');
    E();
    expect(rally.state).toBe('serve');
    expect(g.player.held).toBe(true);
    // the camera comes in from the side, and he serves
    g.run(1.0);
    expect(beach.beachCam.k).toBe(1);
    expect(rally.state).toBe('toYou');
    // as it reaches the player, Hit sends it back, a little faster; it comes back again
    for (let i = 1; i <= 3; i++) {
      g.runUntil(() => rally.state === 'toYou' && rally.T - rally.t < beach.early() / 2, 5);
      const T = rally.T;
      E();
      expect([rally.n, rally.state]).toEqual([i, 'toHim']);
      expect(rally.T).toBeLessThan(T);
    }
    g.run(0.02);
    expect($('matkot').textContent).toContain('Rally 3');
    // too soon misses: the rally's over, his word on it, the best kept and saved
    g.runUntil(() => rally.state === 'toYou', 5);
    E();
    expect(rally.state).toBe('missed');
    expect(g.layout.beach.best).toBe(3);
    expect(beach.sands!.says.text).not.toBe('');
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).matkot).toBe(3);
    // the ball lies in the sand a moment, then the player's free and it's Play again, with the best on the card
    g.run(1.6);
    expect([rally.state, g.player.held]).toEqual(['idle', false]);
    expect($('matkot').textContent).toContain('Best rally 3');
    g.run(1);
    expect(beach.beachCam.k).toBe(0);
  }, 30_000);

  it('misses a ball let go by, ends the rally on Esc, and loads the best from the save', async () => {
    const { g, beach } = await loadOn(ELECTION, { tiles: STAGE2, season: SUMMER, matkot: 12 } as Parameters<typeof loadGame>[0]);
    const { rally, PAD } = beach;
    expect(g.layout.beach.best).toBe(12);
    g.placePlayer(PAD.x, PAD.z);
    g.run(0.1);
    expect($('matkot').textContent).toContain('Best rally 12');
    E();
    g.runUntil(() => rally.state === 'missed', 5);
    expect(rally.n).toBe(0);
    expect(g.layout.beach.best).toBe(12);
    g.run(2);
    // Esc mid-rally: over, and the player's let go
    E();
    g.run(1);
    expect(rally.state).toBe('toYou');
    key('Escape', 'Escape');
    g.run(2);
    expect([rally.state, g.player.held, $('matkot').hidden]).toEqual(['idle', false, true]);
  }, 30_000);
});
