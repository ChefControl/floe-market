// The voting boat at the dock: in only on Israel's election day and a day either side (or with ?vote=on), its polling
// room aboard, and voting in it: the greeting, a slip behind the screen, the envelope into the box and the thanks. Off
// the game's luck, and nothing saved.
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

const $ = (id: string) => document.getElementById(id)!;
/** Election day, local noon; and the day after the boat's gone. */
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
  return { g, vote: await import('../src/votingBoat'), layout: g.layout };
}

afterEach(() => { history.replaceState(null, '', '/'); });

describe('the voting boat', () => {
  it('is in from the 26th to the 28th of October 2026, by the local date', async () => {
    const { votingBoatOn, ELECTION_DAYS } = await import('../src/flags');
    expect(ELECTION_DAYS).toEqual({ from: '2026-10-26', to: '2026-10-28' });
    expect(votingBoatOn(new Date(2026, 9, 25, 23, 59))).toBe(false);
    expect(votingBoatOn(new Date(2026, 9, 26, 0, 0))).toBe(true);
    expect(votingBoatOn(ELECTION)).toBe(true);
    expect(votingBoatOn(new Date(2026, 9, 28, 23, 59))).toBe(true);
    expect(votingBoatOn(new Date(2026, 9, 29, 0, 0))).toBe(false);
    expect(votingBoatOn(new Date(2027, 9, 27, 12))).toBe(false);
  });

  it('moors at the dock on election day, drawn on Low and High, clear of the fishing and the casino', async () => {
    const { vote, layout } = await loadOn(ELECTION);
    expect(vote.boat).toBeTruthy();
    expect(layout.voteBoat.open).toBe(true);
    // out in the water off the dock's edge, east of the fishing pad, the ice net and the casino's quay
    const { hull } = layout.VOTE_BOAT, { PAD } = await import('../src/stations');
    expect(hull.z1).toBeLessThan(-6.65);
    expect(hull.x0).toBeGreaterThan(Math.max(PAD.x + PAD.r, -1.2 + 1.75, layout.QUAY.x1));
    expect(hull.x1).toBeLessThan(7.45); // the bay's east shore
    // High draws it baked the new way; Low in plain shapes, nothing of the new kind
    const { choose } = await import('../src/graphics'), { Person } = await import('../src/characters');
    const inPerson = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (p instanceof Person) return true; return false; };
    const drawn = () => {
      const found: Mesh[] = [];
      vote.boat!.g.traverse(o => { if (o instanceof Mesh && shown(o) && !inPerson(o)) found.push(o); });
      return found;
    };
    expect(drawn().some(m => packed(m.geometry))).toBe(true);
    choose('low');
    expect(drawn().length).toBeGreaterThan(3);
    expect(drawn().filter(m => packed(m.geometry))).toEqual([]);
    choose('high');
    // three of the committee at their table
    let people = 0;
    vote.boat!.g.traverse(o => { if (o instanceof Person) people++; });
    expect(people).toBe(3);
  });

  it('takes the player up the gangway onto its deck and into the polling room, whose roof lifts and near walls fade', async () => {
    const { g, vote, layout } = await loadOn(ELECTION);
    const { VOTE_BOAT } = layout;
    g.placePlayer(3.75, -7.3);
    g.run(1);
    expect(g.player.g.position.z).toBeCloseTo(-7.3);
    expect(g.player.g.position.y).toBeCloseTo(VOTE_BOAT.y, 2);
    expect(vote.boat!.roofK).toBe(1);
    g.placePlayer(3, -8.6);
    g.run(1);
    expect(g.player.g.position).toMatchObject({ x: 3, z: -8.6 });
    expect(layout.inPollingRoom(g.player.g.position)).toBe(true);
    expect(vote.boat!.roofK).toBeLessThan(0.05);
    expect(vote.boat!.roof.visible).toBe(false);
    // but not off the side of the gangway into the water, nor through the committee's table
    g.placePlayer(2.5, -6.9);
    g.run(0.1);
    expect(Math.abs(g.player.g.position.x - 3.75) < 0.3 || g.player.g.position.z > -6.3).toBe(true);
    g.placePlayer(5.35, -8.6);
    g.run(0.1);
    expect(g.player.g.position.z).toBeGreaterThan(vote.TABLE.z1);
  });

  it('greets the voter, has them pick a slip behind the screen and cast it, thanks them, and saves nothing', async () => {
    const { g, vote } = await loadOn(ELECTION);
    const money = g.wallet.money, saved = localStorage.getItem('floe-market-v1');
    // walking in, the chair greets them
    g.placePlayer(3.75, -8.3);
    g.run(0.1);
    expect(vote.boat!.says.text).toBe(vote.GREETING);
    // nothing to cast yet: the box's card stays shut
    g.placePlayer(vote.BOX_SPOT.x, vote.BOX_SPOT.z);
    g.run(0.1);
    expect($('voteCast').hidden).toBe(true);
    // behind the screen, the slips: the game's own dishes and fish
    g.placePlayer(vote.SCREEN_SPOT.x, vote.SCREEN_SPOT.z);
    g.run(0.1);
    expect($('voteSlips').hidden).toBe(false);
    expect($('voteSlips').textContent).toContain('🍣 Sushi');
    for (const b of $('voteSlips').querySelectorAll('button')) expect(b.textContent!.split(' ').length).toBeLessThanOrEqual(8);
    ($('voteSlips').querySelectorAll('button')[3] as HTMLButtonElement).click();
    g.run(0.1);
    expect(vote.voting.slip).toBe('Chanko');
    expect(vote.boat!.inHand.visible).toBe(true);
    expect($('voteSlips').hidden).toBe(true);
    // at the box, E (its main button) drops the envelope in, and they thank the voter
    g.placePlayer(vote.BOX_SPOT.x, vote.BOX_SPOT.z);
    g.run(0.1);
    expect($('voteCast').hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
    g.run(0.2);
    expect(vote.boat!.inHand.visible).toBe(false);
    expect(vote.boat!.flying.visible).toBe(true);
    g.run(1);
    expect(vote.boat!.flying.visible).toBe(false);
    expect(vote.boat!.says.text).toBe(vote.THANKS);
    expect(vote.boat!.sticker.visible).toBe(true);
    expect($('voteCast').hidden).toBe(true);
    // once a visit: no more slips behind the screen
    g.placePlayer(vote.SCREEN_SPOT.x, vote.SCREEN_SPOT.z);
    g.run(0.1);
    expect($('voteSlips').hidden).toBe(true);
    // stepping off and coming back, they can vote again; the sticker stays on
    g.placePlayer(0, 0);
    g.run(0.1);
    expect(vote.voting.voted).toBe(false);
    expect(vote.boat!.sticker.visible).toBe(true);
    g.placePlayer(vote.SCREEN_SPOT.x, vote.SCREEN_SPOT.z);
    g.run(0.1);
    expect($('voteSlips').hidden).toBe(false);
    // and nothing paid or saved
    expect(g.wallet.money).toBe(money);
    expect(localStorage.getItem('floe-market-v1')).toBe(saved);
  });

  it("isn't there before or after, and the dock's edge is the water's again", async () => {
    for (const date of [new Date(2026, 9, 25, 12), AFTER]) {
      const { g, vote, layout } = await loadOn(date);
      expect(vote.boat).toBeNull();
      expect(layout.voteBoat.open).toBe(false);
      expect($('voteSlips')).toBeNull();
      g.placePlayer(3.75, -8.6);
      g.run(0.1);
      expect(g.player.g.position.z).toBeGreaterThanOrEqual(-6.25);
    }
  });

  it('comes in on any date with ?vote=on in the address, for that visit only', async () => {
    history.replaceState(null, '', '/?vote=on');
    expect((await loadOn(AFTER)).vote.boat).toBeTruthy();
    history.replaceState(null, '', '/');
    expect((await loadOn(AFTER)).vote.boat).toBeNull();
  });

  it("is built off the game's luck: the same luck and scenery are left whether it's in or not", async () => {
    await loadOn(ELECTION);
    const up = [Math.random(), Math.random(), (await import('../src/kit')).jitter(0, 1)];
    expect((await import('../src/votingBoat')).boat).toBeTruthy();
    // same seed again (setup.ts), the day after
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    const { vote } = await loadOn(AFTER);
    expect(vote.boat).toBeNull();
    expect([Math.random(), Math.random(), (await import('../src/kit')).jitter(0, 1)]).toEqual(up);
  });
});
