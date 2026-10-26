// The voting boat at the dock: in only on Israel's election day (or with ?vote=on), sailing in once the game opens and
// away once the day's over; its polling room aboard, and voting in it: the greeting, a slip behind the screen, the
// envelope into the box and the thanks. Off the game's luck, and nothing saved.
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
/** Election day, local noon; and the day after, when the boat's gone. */
const ELECTION = new Date(2026, 9, 27, 12), AFTER = new Date(2026, 9, 28, 12);
/** Whether `o` and everything it's in are showing. */
const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
/** Baked the new way (kit.ts pack): a byte per normal. */
const packed = (g: BufferGeometry) => g.attributes.normal?.array instanceof Int8Array;

/** Loads the game on `date`, and runs it a moment; with the boat already moored, unless it's to `sail` in. */
async function loadOn(date: Date, sail = false) {
  vi.useFakeTimers({ toFake: ['Date'], now: date });
  const g = await loadGame({});
  const vote = await import('../src/votingBoat');
  if (vote.boat && !sail) Object.assign(vote.boat, { sail: 'in', t: 1e3 });
  g.run(0.1);
  return { g, vote, layout: g.layout };
}

afterEach(() => { history.replaceState(null, '', '/'); });

describe('the voting boat', () => {
  it('is in on the 27th of October 2026 only, by the local date', async () => {
    const { votingBoatOn, ELECTION_DAYS } = await import('../src/flags');
    expect(ELECTION_DAYS).toEqual({ from: '2026-10-27', to: '2026-10-27' });
    expect(votingBoatOn(new Date(2026, 9, 26, 23, 59))).toBe(false);
    expect(votingBoatOn(new Date(2026, 9, 27, 0, 0))).toBe(true);
    expect(votingBoatOn(ELECTION)).toBe(true);
    expect(votingBoatOn(new Date(2026, 9, 27, 23, 59))).toBe(true);
    expect(votingBoatOn(new Date(2026, 9, 28, 0, 0))).toBe(false);
    expect(votingBoatOn(new Date(2027, 9, 27, 12))).toBe(false);
  });

  it('sails in from the sea once the game opens, and only lets the player aboard once it has moored', async () => {
    const { g, vote, layout } = await loadOn(ELECTION, true);
    const b = vote.boat!;
    // out at sea a moment, then coming in, nobody aboard yet
    expect([b.sail, b.ship.visible, layout.voteBoat.open]).toEqual(['out', false, false]);
    g.run(3, 0.05);
    expect([b.sail, b.ship.visible, layout.voteBoat.open, b.plank.visible]).toEqual(['in', true, false, false]);
    expect(b.ship.position.z).toBeLessThan(layout.VOTE_BOAT.hull.z0);
    const { dz } = layout.VOTE_BOAT, X = layout.voteX;
    g.placePlayer(X(3.75), -7.3 + dz);
    g.run(0.1);
    expect(g.player.g.position.z).toBeGreaterThan(layout.PIER.arm.z0); // no further than the pier
    // lined up off the pier, bow west, then edged onto it, the gangway out
    g.run(13, 0.05);
    expect(b.sail).toBe('in');
    expect(Math.abs(b.ship.rotation.y)).toBeLessThan(0.05);
    expect(b.ship.position.z).toBeLessThan((layout.VOTE_BOAT.hull.z0 + layout.VOTE_BOAT.hull.z1) / 2 - 0.5);
    g.run(4, 0.05);
    expect([b.sail, layout.voteBoat.open, b.plank.visible]).toEqual(['moored', true, true]);
    expect(b.ship.position.x).toBeCloseTo((layout.VOTE_BOAT.hull.x0 + layout.VOTE_BOAT.hull.x1) / 2);
    expect(b.ship.rotation.y).toBeCloseTo(0);
    g.placePlayer(X(3.75), -7.3 + dz);
    g.run(0.5);
    expect(g.player.g.position.z).toBeCloseTo(-7.3 + dz);
  });

  it("sails away once election day's over, once the player's off it, and is gone", async () => {
    const { g, vote, layout } = await loadOn(ELECTION);
    const b = vote.boat!, { dz } = layout.VOTE_BOAT, X = layout.voteX;
    g.placePlayer(X(3), -8.6 + dz);
    g.run(0.1);
    vi.setSystemTime(new Date(2026, 9, 28, 0, 0, 5));
    g.run(1, 0.05);
    expect(b.sail).toBe('moored'); // not with the player aboard
    g.placePlayer(0, -3);
    g.run(0.1);
    expect([b.sail, layout.voteBoat.open, b.plank.visible]).toEqual(['going', false, false]);
    g.run(4, 0.05);
    expect(b.ship.position.z).toBeLessThan((layout.VOTE_BOAT.hull.z0 + layout.VOTE_BOAT.hull.z1) / 2 - 1); // edged off the pier
    g.run(6, 0.05);
    expect(b.ship.position.x).toBeLessThan(0); // and away west, bow first
    g.run(7, 0.05);
    expect([b.sail, b.ship.visible]).toEqual(['gone', false]);
    g.placePlayer(X(3.75), -8.6 + dz);
    g.run(0.1);
    expect(g.player.g.position.z).toBeGreaterThan(layout.PIER.arm.z0);
  });

  it('moors at the dock on election day, drawn on Low and High, clear of the fishing and the casino', async () => {
    const { vote, layout } = await loadOn(ELECTION);
    expect(vote.boat).toBeTruthy();
    expect(layout.voteBoat.open).toBe(true);
    // out in the water off the dock's edge, east of the fishing pad, the ice net and the casino's quay
    const { hull } = layout.VOTE_BOAT;
    expect(hull.z1).toBeLessThan(-10.8 - 2); // well out past the ice net and the fishing pad's water
    expect(hull.x0).toBeGreaterThan(layout.QUAY.x1);
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
    // three of the committee at their table, and the two old-timers out on the foredeck
    let people = 0;
    vote.boat!.g.traverse(o => { if (o instanceof Person) people++; });
    expect(vote.boat!.members).toHaveLength(3);
    expect(people).toBe(5);
  });

  it('takes the player up the gangway onto its deck and into the polling room, whose roof lifts and near walls fade', async () => {
    const { g, vote, layout } = await loadOn(ELECTION);
    const { VOTE_BOAT } = layout, { dz } = VOTE_BOAT, X = layout.voteX;
    g.placePlayer(X(3.75), -7.3 + dz);
    g.run(1);
    expect(g.player.g.position.z).toBeCloseTo(-7.3 + dz);
    expect(g.player.g.position.y).toBeCloseTo(VOTE_BOAT.y, 2);
    expect(vote.boat!.roofK).toBe(1);
    g.placePlayer(X(3), -8.6 + dz);
    g.run(1);
    expect(g.player.g.position).toMatchObject({ x: X(3), z: -8.6 + dz });
    expect(layout.inPollingRoom(g.player.g.position)).toBe(true);
    expect(vote.boat!.roofK).toBeLessThan(0.05);
    expect(vote.boat!.roof.visible).toBe(false);
    // but not off the side of the gangway into the water (onto the side deck, or back on the pier), nor through the
    // committee's table
    g.placePlayer(X(2.5), -6.9 + dz);
    g.run(1);
    expect(g.player.g.position.y).toBeCloseTo(layout.PIER.y, 2);
    expect(layout.onVoteBoat(g.player.g.position) || g.player.g.position.z > layout.PIER.arm.z0).toBe(true);
    g.placePlayer(X(5.35), -8.6 + dz);
    g.run(0.1);
    expect(g.player.g.position.z).toBeGreaterThan(vote.TABLE.z1);
    // out again, along the side deck and round onto the foredeck, where the roof stays on
    const { hull, cabin } = VOTE_BOAT;
    for (const [x, z] of [[X(5.5), -7.35 + dz], [cabin.x0 - 0.4, hull.z1 - 0.6], [hull.x0 + 1.5, (hull.z0 + hull.z1) / 2 + 0.4]]) {
      g.placePlayer(x, z);
      g.run(1);
      expect(g.player.g.position.x).toBeCloseTo(x, 1);
      expect(g.player.g.position.z).toBeCloseTo(z, 1);
      expect(layout.onVoteBoat(g.player.g.position)).toBe(true);
      expect(vote.boat!.roofK).toBe(1);
    }
    // but not over the bow's rail, nor through the backgammon table
    g.placePlayer(hull.x0 + 0.3, (hull.z0 + hull.z1) / 2);
    g.run(0.1);
    expect(g.player.g.position.x).toBeGreaterThan(hull.x0 + 0.9);
  });

  it('greets the voter, has them pick a slip behind the screen and cast it, thanks them, and saves nothing', async () => {
    const { g, vote, layout } = await loadOn(ELECTION);
    const money = g.wallet.money, saved = localStorage.getItem('floe-market-v1');
    // walking in, the chair greets them
    g.placePlayer(layout.voteX(3.75), -8.3 + layout.VOTE_BOAT.dz);
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

  it("isn't there before or after, and the pier's edge is the water's again", async () => {
    for (const date of [new Date(2026, 9, 26, 12), AFTER]) {
      const { g, vote, layout } = await loadOn(date);
      expect(vote.boat).toBeNull();
      expect(layout.voteBoat.open).toBe(false);
      expect($('voteSlips')).toBeNull();
      g.placePlayer(layout.voteX(3.75), -8.6 + layout.VOTE_BOAT.dz);
      g.run(0.1);
      expect(g.player.g.position.z).toBeGreaterThan(layout.PIER.arm.z0);
    }
  });

  it('comes in on any date with ?vote=on in the address, for that visit only', async () => {
    history.replaceState(null, '', '/?vote=on');
    expect((await loadOn(AFTER)).vote.boat).toBeTruthy();
    history.replaceState(null, '', '/');
    expect((await loadOn(AFTER)).vote.boat).toBeNull();
  });

  it('has two old-timers on its foredeck who say their piece when spoken to, the camera in on them, one of them on his head now and then', async () => {
    const { g, vote, layout } = await loadOn(ELECTION);
    const b = vote.boat!, { hull, cabin } = layout.VOTE_BOAT, mid = (hull.z0 + hull.z1) / 2;
    // over onto his head and down again, in his round
    let upside = 0;
    for (let i = 0; i < 100; i++) { g.run(0.1); if (Math.abs(b.tip.rotation.x - Math.PI) < 0.01) upside++; }
    expect(upside).toBeGreaterThan(20);
    expect(upside).toBeLessThan(80);
    for (const line of [vote.MIRACLES, vote.LEGEND]) expect(line.split(' ').length).toBeLessThanOrEqual(8);
    // walking by, nothing; beside the short one (on his head), Talk comes up, and E starts him
    g.placePlayer(cabin.x0 - 0.4, mid);
    g.run(1);
    expect(vote.elderState().who).toBe(-1);
    g.placePlayer(vote.HEADSTAND.x + 0.9, vote.HEADSTAND.z);
    g.runUntil(() => Math.abs(b.tip.rotation.x - Math.PI) < 0.01, 10);
    g.run(0.1);
    expect(document.getElementById('buy')!.textContent).toContain('Talk');
    g.press('e'); g.run(0.05); g.press('e', 'keyup');
    expect(vote.elderState().who).toBe(0);
    expect(g.player.held).toBe(true);
    g.run(1);
    expect(vote.elderCam.k).toBe(1);
    // (down off his head and onto his feet first, then he speaks)
    g.runUntil(() => vote.elderState().says.length > 0, 3);
    expect(b.tip.rotation.x).toBe(0);
    expect(vote.MIRACLES.startsWith(vote.elderState().says)).toBe(true);
    // he comes down onto his feet to say it, and stays there till he's done
    g.runUntil(() => vote.elderState().says === vote.MIRACLES, 6);
    expect(b.tip.rotation.x).toBe(0);
    g.run(10);
    expect(b.tip.rotation.x).toBe(0);
    expect(document.getElementById('meetLine')!.textContent).toBe(vote.MIRACLES);
    // a key, and back to the game, the camera easing back
    g.press(' ');
    expect(vote.elderState().who).toBe(-1);
    expect(g.player.held).toBe(false);
    g.run(1);
    expect(vote.elderCam.k).toBe(0);
    // the tall one at the rail, his line typed out and skipped to the end with a tap
    g.placePlayer(hull.x0 + 1.1, vote.DREAMER.z);
    g.run(0.1);
    g.press('e'); g.run(0.05); g.press('e', 'keyup');
    expect(vote.elderState().who).toBe(1);
    g.run(1);
    window.dispatchEvent(new Event('pointerdown'));
    expect(vote.elderState().says).toBe(vote.LEGEND);
    window.dispatchEvent(new Event('pointerdown'));
    expect(vote.elderState().who).toBe(-1);
  });

  it('moors along the far side of the pier, which is there every day, in both stages, a step up from the dock', async () => {
    const { g, layout } = await loadOn(AFTER);
    const { PIER, VOTE_BOAT } = layout;
    expect(VOTE_BOAT.hull.z1).toBeLessThan(PIER.arm.z0 - 0.3);
    expect(VOTE_BOAT.hull.z1).toBeGreaterThan(PIER.arm.z0 - 0.6);
    // walked up in stage 1: out along the stem, up its ramp, along the arm west to its end
    g.placePlayer(3.75, -6.95);
    g.run(0.05);
    expect(g.player.g.position.y).toBeGreaterThan(0.15);
    expect(g.player.g.position.y).toBeLessThan(PIER.y);
    for (const [x, z] of [[3.75, -9], [3.75, -12.6], [1.0, -12.6]]) {
      g.placePlayer(x, z);
      g.run(1);
      expect(g.player.g.position).toMatchObject({ x, z });
      expect(g.player.g.position.y).toBeCloseTo(PIER.y, 2);
    }
    // and in both stages, it's there and only it: not off its sides, nor out past it
    for (const n of [1, 2] as const) {
      layout.stage.n = n;
      for (const [x, z] of [[3.75, -9], [1.0, -12.6]]) {
        const q = { x, z };
        layout.keepOnFloor(q, layout.walkable());
        expect(q).toEqual({ x, z });
        expect(layout.groundY(q)).toBeCloseTo(PIER.y, 2);
      }
      for (const [x, z] of [[2.0, -9], [5.5, -9], [6.0, -12.6], [-0.5, -12.6], [2.0, -14.5]]) {
        const q = { x, z };
        layout.keepOnFloor(q, layout.walkable());
        expect(Math.hypot(q.x - x, q.z - z)).toBeGreaterThan(0.3);
      }
    }
    layout.stage.n = 1;
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
