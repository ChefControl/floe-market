// The voting booth in her yard: up only on Israel's election day and a day either side (or with ?vote=on), a bubble
// when the player walks up to it, and off the game's luck.
import { type BufferGeometry, Mesh, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGame } from './helpers';

/** The same seeded luck as setup.ts. */
function seeded(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Election day, local noon; and the day after the booth comes down. */
const ELECTION = new Date(2026, 9, 27, 12), AFTER = new Date(2026, 9, 29, 12);
/** Whether `o` and everything it's in are showing. */
const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
/** Baked the new way (kit.ts pack): a byte per normal. */
const packed = (g: BufferGeometry) => g.attributes.normal?.array instanceof Int8Array;

/** Loads the game on `date`, and runs it a moment. */
async function loadOn(date: Date) {
  vi.useFakeTimers({ toFake: ['Date'], now: date });
  const g = await loadGame({});
  g.run(0.1);
  return { g, vote: await import('../src/votingBooth') };
}

afterEach(() => { history.replaceState(null, '', '/'); });

describe('the voting booth', () => {
  it('stands from the 26th to the 28th of October 2026, by the local date', async () => {
    const { votingBoothOn, ELECTION_DAYS } = await import('../src/flags');
    expect(ELECTION_DAYS).toEqual({ from: '2026-10-26', to: '2026-10-28' });
    expect(votingBoothOn(new Date(2026, 9, 25, 23, 59))).toBe(false);
    expect(votingBoothOn(new Date(2026, 9, 26, 0, 0))).toBe(true);
    expect(votingBoothOn(ELECTION)).toBe(true);
    expect(votingBoothOn(new Date(2026, 9, 28, 23, 59))).toBe(true);
    expect(votingBoothOn(new Date(2026, 9, 29, 0, 0))).toBe(false);
    expect(votingBoothOn(new Date(2027, 9, 27, 12))).toBe(false);
  });

  it('goes up in her yard on election day, on Low and High, and the player walks round it', async () => {
    const { g, vote } = await loadOn(ELECTION);
    expect(vote.booth).toBeTruthy();
    expect(vote.booth!.g.parent).toBe(g.render.scene);
    // in her yard, clear of the circle and the presents' tile
    const { YARD } = g.layout, { RAIN_PAD } = await import('../src/rain'), { PRESENT } = await import('../src/presents');
    const { BOOTH, BALLOT } = vote;
    for (const o of [BOOTH, BALLOT]) {
      expect(o.x - o.w / 2).toBeGreaterThan(YARD.x0);
      expect(o.x + o.w / 2).toBeLessThan(YARD.x1);
      expect(o.z - o.d / 2).toBeGreaterThan(YARD.z0);
      expect(o.z + o.d / 2 + 0.3).toBeLessThan(RAIN_PAD.z - RAIN_PAD.r);
      expect(o.z + o.d / 2 + 0.3).toBeLessThan(PRESENT.z - PRESENT.half);
    }
    // High draws it baked the new way; Low in plain shapes, nothing of the new kind
    const { choose } = await import('../src/graphics');
    const drawn = () => {
      const found: Mesh[] = [];
      vote.booth!.g.traverse(o => { if (o instanceof Mesh && shown(o)) found.push(o); });
      return found;
    };
    expect(drawn().some(m => packed(m.geometry))).toBe(true);
    choose('low');
    expect(drawn().length).toBeGreaterThan(1);
    expect(drawn().filter(m => packed(m.geometry))).toEqual([]);
    choose('high');
    // the player can't walk into it
    g.placePlayer(BOOTH.x, BOOTH.z + 0.1);
    g.run(0.05);
    expect(Math.abs(g.player.g.position.z - BOOTH.z)).toBeGreaterThan(BOOTH.d / 2);
  });

  it('says every vote counts when the player walks up to it, again each time, and nothing else', async () => {
    const { g, vote } = await loadOn(ELECTION);
    const says = vote.booth!.says, money = g.wallet.money, saved = localStorage.getItem('floe-market-v1');
    expect(says.text).toBe('');
    g.placePlayer(vote.BOOTH.x, vote.BOOTH.z + vote.BOOTH.d / 2 + 0.35);
    g.run(0.1);
    expect(says.text).toBe('Every vote counts!');
    expect(says.text.split(' ').length).toBeLessThanOrEqual(8);
    expect(says.sprite.visible).toBe(true);
    // said once while the player stays, then gone
    g.run(8);
    expect(says.text).toBe('');
    g.placePlayer(0, 0);
    g.run(0.1);
    g.placePlayer(vote.BOOTH.x, vote.BOOTH.z + vote.BOOTH.d / 2 + 0.35);
    g.run(0.1);
    expect(says.text).toBe('Every vote counts!');
    expect(g.wallet.money).toBe(money);
    expect(g.player.back.count('fish')).toBe(0);
    expect(localStorage.getItem('floe-market-v1')).toBe(saved);
  });

  it("isn't there before or after, and nothing stands in its place", async () => {
    for (const date of [new Date(2026, 9, 25, 12), AFTER]) {
      const { g, vote } = await loadOn(date);
      expect(vote.booth).toBeNull();
      g.placePlayer(vote.BOOTH.x, vote.BOOTH.z);
      g.run(0.1);
      expect(g.player.g.position).toMatchObject({ x: vote.BOOTH.x, z: vote.BOOTH.z });
    }
  });

  it('goes up on any date with ?vote=on in the address, for that visit only', async () => {
    history.replaceState(null, '', '/?vote=on');
    expect((await loadOn(AFTER)).vote.booth).toBeTruthy();
    history.replaceState(null, '', '/');
    expect((await loadOn(AFTER)).vote.booth).toBeNull();
  });

  it("is built off the game's luck: the same luck and scenery are left whether it's up or not", async () => {
    await loadOn(ELECTION);
    const up = [Math.random(), Math.random(), (await import('../src/kit')).jitter(0, 1)];
    expect((await import('../src/votingBooth')).booth).toBeTruthy();
    // same seed again (setup.ts), the day after
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    const { vote } = await loadOn(AFTER);
    expect(vote.booth).toBeNull();
    expect([Math.random(), Math.random(), (await import('../src/kit')).jitter(0, 1)]).toEqual(up);
  });
});
