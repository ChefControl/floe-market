// Sound: silent until a tap or a key press, then the effects, the ambient beds and the music, all synthesised. The
// tests listen through a stand-in for Web Audio (fakeAudio.ts) that logs what's played, on which bus, panned where.
import { describe, expect, it, vi } from 'vitest';
import { fake, FakeAudioContext, FakeNode, installFakeAudio, level, nameBuses, type Played } from './fakeAudio';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';
import { seeded } from './setup';

const $ = (id: string) => document.getElementById(id)!;
const near = (f: number, want: number) => Math.abs(f - want) < 1;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A game with the Web Audio stand-in, started by a key press unless `start` is false. */
async function withSound(save?: SaveFixture, start = true) {
  installFakeAudio();
  const g = await loadGame(save);
  const [audio, sfx, ambience, season, rain] = await Promise.all([
    import('../src/audio'), import('../src/sfx'), import('../src/ambience'), import('../src/season'), import('../src/rain'),
  ]);
  if (start) { g.press('x'); g.press('x', 'keyup'); nameBuses(audio.buses); }
  /** Plays `seconds` of the game, the audio clock keeping time with it. */
  const play = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) { fake.now += 1 / 60; g.game.tick(1 / 60); }
  };
  /** What `fn` played. */
  const since = (fn: () => void) => {
    const n = fake.played.length;
    fn();
    return fake.played.slice(n);
  };
  /** How loud the endless bed filtered at `f` is now (the latest, if it's been laid again). */
  const bed = (f: number) => level(fake.played.filter(p => p.loop && p.f === f).pop()!);
  /** The wind: the low bed and the high one, together. */
  const wind = () => Math.hypot(bed(330), bed(650));
  return { g, audio, sfx, ambience, season, rain, play, since, bed, wind };
}
const tones = (ps: Played[]) => ps.filter(p => p.kind === 'tone' && p.bus === 'sfx');

describe('sound', () => {
  it('is silent until a tap or a key press, then starts the world sounding under the game', async () => {
    const s = await withSound(undefined, false);
    s.play(2);
    expect(fake.made).toBe(0);
    expect(s.audio.ac).toBeNull();
    window.dispatchEvent(new Event('pointerdown'));
    expect(fake.made).toBe(1);
    expect(s.audio.ac!.state).toBe('running');
    // the sea, its wash, wind (low and high), rain, diners, cicadas, and the ring's crowd (its rumble, and its voices low
    // and high)
    expect(fake.played.filter(p => p.loop)).toHaveLength(10);
    window.dispatchEvent(new Event('pointerdown'));
    expect(fake.made).toBe(1); // one for good
  });

  it('guards each bus: only real samples get through to the mix, and it says when something has gone wrong', async () => {
    const { GUARD } = await import('../src/audio');
    // the guard's worklet, run here: its clock, its messages, and the class it registers
    let now = 0;
    const said: unknown[] = [];
    class AudioWorkletProcessor { port = { postMessage: (m: unknown) => said.push(m) }; }
    let Guard: new () => { process(i: Float32Array[][], o: Float32Array[][]): boolean } = null!;
    vi.stubGlobal('currentTime', 0);
    Object.defineProperty(globalThis, 'currentTime', { get: () => now, configurable: true });
    new Function('registerProcessor', 'AudioWorkletProcessor', GUARD)((_: string, c: typeof Guard) => { Guard = c; }, AudioWorkletProcessor);
    const g = new Guard(), run = (input: number[] | null) => {
      const out = [new Float32Array(5), new Float32Array(5)];
      expect(g.process([input ? [Float32Array.from(input)] : []], [out])).toBe(true);
      return out.map(o => [...o]);
    };
    // a filter blowing up: a runaway level, then Infinity, then NaN, all silenced; the rest let through, in both ears
    expect(run([0.25, 5, Infinity, NaN, -0.5])).toEqual([[0.25, 0, 0, 0, -0.5], [0.25, 0, 0, 0, -0.5]]);
    expect(said).toEqual(['bad']);
    now = 0.5; run([NaN, 0, 0, 0, 0]);
    expect(said).toHaveLength(1); // at most once a second
    now = 1.6; run([NaN, 0, 0, 0, 0]);
    expect(said).toHaveLength(2);
    now = 5; run([0.1, -0.1, 0.2, -0.2, 0]);
    expect(said).toHaveLength(2); // all's well
    expect(run(null)).toEqual([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]); // nothing playing into it
    vi.unstubAllGlobals();
  });

  it("puts a scene's own sound through guards too: each output goes on to the mix through one of its own", async () => {
    // a browser with audio worklets: the guard's module loads, and each guard is a node of its own
    type Guard = FakeNode & { port: { onmessage: (() => void) | null } };
    const made: Guard[] = [];
    vi.stubGlobal('AudioWorkletNode', class extends FakeNode {
      port = { onmessage: null as (() => void) | null };
      constructor() { super(); made.push(this as Guard); }
    });
    const url = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:guard';
    Object.defineProperty(FakeAudioContext.prototype, 'audioWorklet', { value: { addModule: () => Promise.resolve() }, configurable: true });
    try {
      const s = await withSound();
      await new Promise(r => setTimeout(r, 0)); // (the module's loaded)
      const outs = ['sfx', 'amb', 'music', 'cue', 'scene'] as const;
      const guardOf = (b: (typeof outs)[number]) => (s.audio.buses[b] as unknown as FakeNode).outs;
      // the three buses, and Mr. Fugu's scene's effects and music: each into a guard of its own, and only that
      for (const b of outs) {
        expect(guardOf(b), b).toHaveLength(1);
        expect(made, b).toContain(guardOf(b)[0]);
      }
      expect(new Set(outs.map(b => guardOf(b)[0])).size).toBe(5);
      // and on into the mix: a scene's effects where the effects go, its music where the music goes (the music's volume)
      const into = (b: (typeof outs)[number]) => guardOf(b)[0].outs[0];
      expect(into('cue')).toBe(into('sfx'));
      expect(into('scene')).toBe(into('music'));
      expect(into('music')).not.toBe(into('sfx'));
      // a guard that finds something gone wrong says which output it's on
      const said: string[] = [];
      s.audio.onBroken(b => said.push(b));
      (guardOf('scene')[0] as Guard).port.onmessage!();
      expect(said).toEqual(['scene']);
    } finally {
      URL.createObjectURL = url;
      delete (FakeAudioContext.prototype as { audioWorklet?: unknown }).audioWorklet;
      vi.unstubAllGlobals();
    }
  });

  it('sleeps while the page is hidden, and wakes with it, or with the next tap', async () => {
    const s = await withSound();
    const ac = s.audio.ac!;
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ac.state).toBe('suspended');
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ac.state).toBe('running');
    void ac.suspend();
    s.g.press('x');
    expect(ac.state).toBe('running');
  });

  it("sounds the player's work: catching, chopping, picking up, putting down, cash, and footsteps on the boards", async () => {
    const { g, since } = await withSound();
    const { PAD, PILE } = g.stations;
    // catching a fish, and chopping it in three
    g.placePlayer(PAD.x, PAD.z);
    const fishing = since(() => g.runUntil(() => g.stations.pile.n >= 3));
    expect(fishing.some(p => p.kind === 'noise' && p.f === 700)).toBe(true); // the line whipping out
    expect(fishing.some(p => p.kind === 'noise' && p.f === 2400)).toBe(true); // the splash
    expect(fishing.some(p => p.type === 'sine' && p.f === 240)).toBe(true); // onto the board
    expect(tones(fishing).filter(p => p.type === 'triangle' && [190, 215, 240].includes(p.f)).map(p => p.f).slice(0, 3)).toEqual([190, 215, 240]);
    // picking slices up climbs the scale
    g.placePlayer(PILE.x, PILE.z);
    const picks = since(() => g.runUntil(() => g.player.back.n >= 3));
    const up = tones(picks).filter(p => p.f > 500 && p.f < 900).map(p => Math.round(p.f));
    expect(up.slice(0, 3)).toEqual([698, 784, 880]); // F, G, A: up the major pentatonic of the market's music
    // putting them down steps back down it
    const { C1 } = g.counters;
    g.placePlayer(C1.dropPos!.x, C1.dropPos!.z);
    const puts = since(() => g.runUntil(() => g.player.back.n === 0));
    expect(tones(puts).filter(p => p.f > 600 && p.f < 900).map(p => Math.round(p.f)).slice(0, 2)).toEqual([880, 784]);
    // cash: a coin and its fifth
    for (let i = 0; i < 3; i++) C1.cash.put(g.items.newBill(4));
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    const cash = since(() => g.run(0.5));
    expect(cash.some(p => p.type === 'triangle' && near(p.f, hz(84)))).toBe(true); // C6
    expect(cash.some(p => p.type === 'sine' && near(p.f, hz(84) * 1.5))).toBe(true);
    // walking the deck: a knock on the boards each step
    g.placePlayer(0, -3);
    g.press('d');
    const steps = since(() => g.run(1.2));
    g.press('d', 'keyup');
    expect(steps.filter(p => p.type === 'triangle' && p.f >= 125 && p.f <= 155).length).toBeGreaterThanOrEqual(3);
  });

  it('sounds money draining into an upgrade, then a run up the marimba when it is bought', async () => {
    const { g, since } = await withSound({ money: 1000 });
    const t = g.unlocks.tiles.find(x => x.id === 'pack')!;
    g.placePlayer(t.x, t.z);
    g.press('e');
    const buying = since(() => g.runUntil(() => t.done));
    expect(buying.filter(p => p.type === 'triangle').length).toBeGreaterThan(3); // the ticks
    const run = since(() => g.run(0.1));
    expect(run.length + buying.length).toBeGreaterThan(0);
    expect([...buying, ...run].some(p => near(p.f, hz(101)))).toBe(true); // the bell at the top of the run
  });

  it('places sounds out in the world: quieter further off, from their side, and not at all far away', async () => {
    const { g, sfx, since } = await withSound();
    g.placePlayer(0, -2);
    g.run(1 / 60);
    // the screen's right is east and a little north
    expect(since(() => sfx.flop({ x: 6, z: -4.5 })).every(p => p.pan > 0)).toBe(true);
    expect(since(() => sfx.flop({ x: -6, z: 0.5 })).every(p => p.pan < 0)).toBe(true);
    expect(since(() => sfx.flop({ x: 0, z: -2 })).every(p => p.pan === 0)).toBe(true);
    expect(since(() => sfx.flop({ x: 40, z: -2 }))).toHaveLength(0);
  });

  it('plays every sound the game has (the net catches quietly), and paces the ones that come by the dozen', async () => {
    const { sfx, since, play } = await withSound();
    const at = { x: 0, z: 0 };
    const all: [string, () => void][] = [
      ['wood', () => sfx.step('wood')], ['snow', () => sfx.step('winter')], ['grass', () => sfx.step('spring')],
      ['leaves', () => sfx.step('fall')], ['cast', () => sfx.cast(at, 'player')], ['harpoon', () => sfx.cast(at, 'turret')],
      ['splash', () => sfx.splash(at)], ['flop', () => sfx.flop(at)], ['chop', () => sfx.chop(at, 2)], ['pick', sfx.pick],
      ['put', sfx.put], ['coin', sfx.coin], ['till', () => sfx.till(at)], ['1 star', () => sfx.review(1, at)],
      ['2 stars', () => sfx.review(2, at)], ['5 stars', () => sfx.review(5, at)], ['pay', () => sfx.pay(0.5)],
      ['unlock', sfx.unlock], ['pop', sfx.pop], ['chime', sfx.chime], ['level', sfx.levelUp], ['fanfare 1', () => sfx.fanfare(1)],
      ['fanfare 2', () => sfx.fanfare(2)], ['winter', () => sfx.seasonSting('winter')], ['spring', () => sfx.seasonSting('spring')],
      ['summer', () => sfx.seasonSting('summer')], ['autumn', () => sfx.seasonSting('fall')], ['tick', sfx.tick], ['win', sfx.win],
      ['lose', sfx.lose], ['clink', () => sfx.clink(at)], ['swish', () => sfx.swish(at)], ['honk', () => sfx.honk(at)],
      ['cross honk', () => sfx.honk(at, true)], ['boop', () => sfx.boop(at)], ['click', sfx.click],
    ];
    for (const [name, fn] of all) {
      play(0.6);
      expect(since(fn).length, name).toBeGreaterThan(0);
    }
    expect(since(() => sfx.cast(at, 'net'))).toHaveLength(0);
    play(0.6);
    sfx.coin();
    expect(since(sfx.coin)).toHaveLength(0); // too soon after the last
    // a button pressed anywhere clicks
    expect(since(() => $('gear').click()).length).toBeGreaterThan(0);
  });

  it('keeps runs of coins and pick-ups out of the shrill, and turns high notes down for the ear', async () => {
    const { sfx, since, audio } = await withSound();
    const wait = () => audio.updAudio(0.05, { x: 0, z: 0 }); // the sound clock only: nothing else in the game plays
    const coins = since(() => { for (let i = 0; i < 30; i++) { wait(); sfx.coin(); } });
    expect(Math.max(...coins.filter(p => p.type === 'triangle').map(p => p.f))).toBeLessThan(1600);
    const picks = since(() => { for (let i = 0; i < 30; i++) { wait(); sfx.pick(); } });
    // each pick-up is a note and a soft octave over it
    expect(Math.max(...picks.filter((_, i) => i % 2 === 0).map(p => p.f))).toBeLessThan(1600);
    expect(audio.forEar(3200)).toBeCloseTo(0.5);
    expect(audio.forEar(1600)).toBeGreaterThan(0.6);
    expect(audio.forEar(200)).toBeCloseTo(1, 2);
  });

  it('starts every sound from silence, so none clicks on its first sample', async () => {
    const s = await withSound({ tiles: bought(...MARKET), season: 1 }); // spring: a hi-hat on every eighth
    const all = s.since(() => {
      s.play(10);
      s.sfx.step('winter'); s.sfx.splash({ x: 0, z: -3 }); s.sfx.tick(); s.sfx.unlock();
    }).filter(p => !p.loop && p.f >= 20); // not the vibrato and tremolo, which shape sounds rather than play
    expect(all.length).toBeGreaterThan(50);
    expect(all.filter(p => p.from !== 0).map(p => p.kind + ' ' + Math.round(p.f))).toEqual([]);
  });

  it("can't pile up more than 64 voices at once (a crowd's shout's worth, over everything else)", async () => {
    const { sfx, since } = await withSound();
    fake.hold = true;
    expect(since(() => { for (let i = 0; i < 90; i++) sfx.tick(); })).toHaveLength(64);
  });

  it('mutes the effects, the ambience or the music from the settings, and remembers levels and mutes on this device', async () => {
    const { sfx, since, play, audio } = await withSound();
    await import('../src/settings');
    expect($('muteSfx').textContent).toBe('🔊');
    $('muteSfx').click();
    expect($('muteSfx').textContent).toBe('🔇');
    expect($('muteSfx').getAttribute('aria-pressed')).toBe('true');
    expect($('muteSfx').closest('.vol')!.classList.contains('muted')).toBe(true);
    expect(audio.buses.sfx.gain.value).toBe(0);
    expect(since(sfx.unlock)).toHaveLength(0); // muted: not even played
    $('muteMusic').click();
    expect(since(() => play(4)).some(p => p.bus === 'music')).toBe(false);
    $('muteMusic').click();
    expect(since(() => play(4)).some(p => p.bus === 'music')).toBe(true);
    $('muteAmb').click();
    expect(audio.buses.amb.gain.value).toBe(0);
    expect(JSON.parse(localStorage.getItem('floe-market-sound')!)).toEqual({
      level: { sfx: 7, amb: 7, music: 7 }, mute: { sfx: true, amb: true, music: false },
    });

    // read back on the next visit; older settings carried over; unreadable, the defaults
    const reload = async (stored: string) => {
      localStorage.setItem('floe-market-sound', stored);
      vi.resetModules();
      return (await import('../src/audio')).prefs;
    };
    expect(await reload('{"level":{"sfx":3,"amb":12,"music":"x"},"mute":{"music":true}}')).toEqual({
      level: { sfx: 3, amb: 7, music: 7 }, mute: { sfx: false, amb: false, music: true },
    });
    expect(await reload('{"sound":true,"music":false,"vol":{"sfx":0.3,"amb":0.9,"music":7}}')).toEqual({
      level: { sfx: 2, amb: 7, music: 7 }, mute: { sfx: false, amb: false, music: true },
    });
    expect((await reload('{"sound":false}')).mute).toEqual({ sfx: true, amb: true, music: true });
    expect(await reload('not json')).toEqual({ level: { sfx: 7, amb: 7, music: 7 }, mute: { sfx: false, amb: false, music: false } });
  });

  it('sets each kind of sound from 0 to 10, 7 being the mix, and plays a coin to judge the effects by', async () => {
    const { audio, since } = await withSound();
    await import('../src/settings');
    const slide = (id: string, v: number) => {
      const input = $(id) as HTMLInputElement;
      input.value = String(v);
      return since(() => input.dispatchEvent(new Event('input')));
    };
    expect($('volSfxN').textContent).toBe('7');
    expect(audio.buses.sfx.gain.value).toBeCloseTo(0.24); // the mix
    expect(slide('volSfx', 4).length).toBeGreaterThan(0); // a coin to hear the new level by
    expect($('volSfxN').textContent).toBe('4');
    expect(audio.buses.sfx.gain.value).toBeCloseTo(0.24 / 2); // three steps down: half
    expect(($('volSfx') as HTMLInputElement).style.getPropertyValue('--fill')).toBe('40%');
    expect(slide('volSfx', 3)).toHaveLength(0); // not a coin for every step
    slide('volAmb', 10);
    expect(audio.buses.amb.gain.value).toBeCloseTo(0.063 * 2); // the top: twice the mix
    // moving a muted slider unmutes it
    $('muteMusic').click();
    slide('volMusic', 5);
    expect(audio.prefs.mute.music).toBe(false);
    expect(audio.prefs.level).toEqual({ sfx: 3, amb: 10, music: 5 });
    // muting puts the slider at 0, and unmuting brings back the level from before
    const vol = (id: string) => [($(id) as HTMLInputElement).value, $(id + 'N').textContent];
    $('muteMusic').click();
    expect(vol('volMusic')).toEqual(['0', '0']);
    expect(($('volMusic') as HTMLInputElement).style.getPropertyValue('--fill')).toBe('0%');
    $('muteMusic').click();
    expect(vol('volMusic')).toEqual(['5', '5']);
    // sliding to 0 mutes, keeping the level to come back to; no coin at 0
    expect(slide('volSfx', 0)).toHaveLength(0);
    expect(audio.prefs.mute.sfx).toBe(true);
    expect($('muteSfx').textContent).toBe('🔇');
    expect(audio.buses.sfx.gain.value).toBe(0);
    expect(audio.prefs.level.sfx).toBe(3);
    $('muteSfx').click();
    expect(vol('volSfx')).toEqual(['3', '3']);
    expect(audio.prefs.mute.sfx).toBe(false);
    audio.setLevel('sfx', 25);
    expect(audio.prefs.level.sfx).toBe(10);
    expect(audio.gainOf(1)).toBeCloseTo(0.25);
  });

  it('changes the settings before sound has started without trouble', async () => {
    const s = await withSound(undefined, false);
    s.audio.setMute('music', true);
    s.audio.setLevel('sfx', 3);
    s.audio.duck(0, 1);
    s.g.press('x');
    expect(s.audio.ac).not.toBeNull();
  });
});

describe('music', () => {
  const music = (ps: Played[]) => ps.filter(p => p.bus === 'music');
  const bass = (p: Played) => p.type === 'triangle' && p.f >= hz(36) - 1 && p.f <= hz(47) + 1;
  /** The café's tune: in winter the celesta's overtone is the only thing in the music above 1.5 kHz. */
  const lead = (ps: Played[]) => music(ps).filter(p => p.kind === 'tone' && p.f > 1500);
  /** Stage 2's upgrades. */
  const CAFE = ['paddy', 'seats', 'chef', 'farmer', 'porter', 'plot2', 'tables', 'chef3', 'tables2', 'plot3', 'kiosk', 'premium'];

  it('plays a kalimba at the market, and brings in the drum, a shaker, the tune and a bass line as it grows', async () => {
    const early = await withSound();
    const start = music(early.since(() => early.play(8)));
    expect(early.audio.key.root).toBe(65); // the game's sounds in F major: the notes of D minor's pentatonic
    expect(start.some(p => p.type === 'sine' && near(p.f, hz(62)))).toBe(true); // the kalimba, on D
    expect(start.some(p => p.kind === 'noise' || p.f === 95)).toBe(false); // no drum or shaker yet
    expect(start.some(p => p.type === 'sawtooth' || bass(p))).toBe(false); // nothing of the café

    const built = await withSound({ tiles: bought(...MARKET) });
    const full = music(built.since(() => built.play(8)));
    expect(full.some(p => p.f === 95)).toBe(true); // the frame drum
    expect(full.some(p => p.kind === 'noise' && p.f === 7000)).toBe(true); // the shaker
    expect(full.some(p => p.type === 'sine' && near(p.f, hz(50)))).toBe(true); // the bass line, an octave under
    expect(full.filter(p => p.type === 'sine').length).toBeGreaterThan(start.filter(p => p.type === 'sine').length * 2);
  });

  it('plays the café band in the restaurant: piano, bass and the tune, then drums and a walking bass as it is built', async () => {
    const early = await withSound({ tiles: bought('sushi') });
    const start = music(early.since(() => early.play(8)));
    expect(early.audio.key.root).toBe(62); // winter's D major
    expect(start.filter(bass).length).toBeGreaterThan(3);
    expect(start.some(p => p.type === 'sine' && p.f > 180 && p.f < 380)).toBe(true); // the electric piano
    expect(lead(start).length).toBeGreaterThan(3);
    expect(start.some(p => p.kind === 'noise')).toBe(false); // no drums yet

    const built = await withSound({ tiles: bought('sushi', ...CAFE) });
    const full = music(built.since(() => built.play(8)));
    expect(full.some(p => p.kind === 'noise' && p.f === 3200)).toBe(true); // brushes
    expect(full.filter(bass).length).toBeGreaterThan(start.filter(bass).length * 1.5); // walking
  });

  it("takes each season's key, feel and band in the restaurant", async () => {
    const want: [number, (ps: Played[]) => boolean][] = [
      [62, ps => ps.some(p => p.kind === 'noise' && p.f === 5200)], // sleigh bells
      [65, ps => ps.some(p => p.f === 880 && p.type === 'triangle')], // the bossa's cross-stick
      [67, ps => ps.some(p => p.kind === 'noise' && p.f === 6500)], // the ride cymbal
      [63, ps => ps.some(p => p.type === 'square')], // the reed
    ];
    for (const [i, [root, heard]] of want.entries()) {
      const s = await withSound({ tiles: bought('sushi', ...CAFE), season: i });
      const m = music(s.since(() => s.play(8)));
      expect(s.audio.key.root).toBe(root);
      expect(heard(m)).toBe(true);
    }
  }, 30_000);

  it('plays each tune twice, and rests the tune every fifth verse', async () => {
    const s = await withSound({ tiles: bought('sushi') });
    const verse = 8 * 8 * 60 / 84 / 2;
    const verses = [0, 1, 2, 3, 4].map(() => lead(s.since(() => s.play(verse))).length);
    // (high notes of the tune: a lower tune has fewer of them over 1500 Hz)
    expect(verses.slice(0, 4).every(n => n > 5)).toBe(true);
    expect(verses[4]).toBeLessThan(6); // (a note either side, scheduled a moment ahead)
  });

  it('has no pops: no thump that starts high and drops fast, and nothing high-pitched', async () => {
    const saves = [{ tiles: bought(...MARKET) }, ...[0, 1, 2, 3].map(season => ({ tiles: bought('sushi', ...CAFE), season }))];
    for (const save of saves) {
      const s = await withSound(save);
      const m = music(s.since(() => s.play(20)));
      expect(m.filter(p => p.kind === 'tone' && p.type !== 'triangle').every(p => p.f < 4000)).toBe(true);
      expect(m.some(p => p.kind === 'tone' && p.f > 100 && p.f < 130 && p.type === 'sine')).toBe(false); // the old kick's 110 Hz start
    }
  }, 30_000);

  it('voices its chords without half-step clashes, and never holds a note that clashes with the chord', async () => {
    await withSound();
    const m = await import('../src/music');
    const held = (bar: { s: number; m: number }[], pcs: Set<number>) => bar.filter((n, j) => {
      const pc = n.m % 12, passing = n.s % 2 === 1 && bar[j + 1]?.s === n.s + 1;
      return !passing && !pcs.has(pc) && (pcs.has((pc + 11) % 12) || pcs.has((pc + 1) % 12));
    });
    for (const band of Object.values(m.BANDS)) {
      for (const c of band.chords) {
        const v = m.voicing(band.key, c);
        expect(v.every((x, i) => !i || x - v[i - 1] !== 1)).toBe(true);
      }
      for (let k = 0; k < 6; k++) {
        m.compose(band).forEach((bar, b) => {
          const pcs = m.classes(band.key, band.chords[b]);
          // over the café's chords, only a note a half step above one clashes (one below is a seventh or a ninth)
          expect(bar.filter((n, j) => {
            const pc = n.m % 12, passing = n.s % 2 === 1 && bar[j + 1]?.s === n.s + 1;
            return !passing && !pcs.has(pc) && pcs.has((pc + 11) % 12);
          })).toEqual([]);
        });
      }
    }
    for (let k = 0; k < 6; k++) {
      const tune = m.marketTune();
      // the market's lead sits from A4 up to C6 (and a step either side, where it settles onto the chord)
      expect(tune.flat().every(n => n.m >= 67 && n.m <= 86)).toBe(true);
      tune.forEach((bar, b) => {
        const [root, iv] = m.MARKET_CHORDS[b % 4];
        expect(held(bar, new Set(iv.map(x => (62 + root + x) % 12)))).toEqual([]);
      });
    }
  });

  it('keeps its beat when the game is held up (a window in the background gets few frames): no notes late, none off the beat', async () => {
    const s = await withSound({ tiles: bought('sushi', ...CAFE) });
    const eighth = 60 / 84 / 2;
    /** Where in its eighth a note falls: on it, or late by the swing. */
    const phase = (p: Played) => (((p.at % eighth) + eighth) % eighth).toFixed(4);
    const beat = new Set(music(s.since(() => s.play(4))).map(phase));
    expect(beat.size).toBe(2); // the beats and the swung off-beats
    for (const stall of [0.25, 1, 3]) {
      fake.now += stall; // no frames for a while
      const after = music(s.since(() => s.play(2)));
      expect(after.length).toBeGreaterThan(10);
      expect(after.filter(p => !beat.has(phase(p)))).toEqual([]);
    }
    // nothing scheduled in the past, crammed in late
    fake.now += 0.5;
    const n = fake.played.length, at = fake.now;
    s.g.game.tick(1 / 60);
    expect(music(fake.played.slice(n)).filter(p => p.at < at)).toEqual([]);
  });

  it('makes way for the rain at her house, and comes back after', async () => {
    const s = await withSound();
    s.play(2);
    s.g.placePlayer(s.rain.RAIN_PAD.x, s.rain.RAIN_PAD.z);
    s.play(1);
    expect(s.audio.buses.music.gain.value).toBe(0);
    s.play(3);
    expect(music(s.since(() => s.play(2)))).toHaveLength(0);
    s.g.placePlayer(15, s.rain.RAIN_PAD.z);
    s.play(4);
    expect(s.audio.buses.music.gain.value).toBe(1);
    expect(music(s.since(() => s.play(2))).length).toBeGreaterThan(0);
  });

  it('brings the lounge band in up the quay to the casino yacht, in a key of its own, and gives it the music aboard', async () => {
    const s = await withSound({ tiles: bought(...MARKET) });
    const m = await import('../src/music'), { GAMES, SHIP } = s.g.layout;
    s.g.placePlayer(0, -3);
    s.play(2);
    expect(m.musicMix()).toEqual({ stage: 1, lounge: 0, noir: 0 });
    expect(s.audio.key.root).toBe(65);
    // on the quay, alongside: mostly the band already, the market's music still under it
    s.g.placePlayer(-12, -4.5);
    s.play(1);
    expect(m.harborK()).toBeGreaterThan(0.3);
    expect(m.harborK()).toBeLessThan(1);
    expect(m.musicMix().stage).toBeGreaterThan(0.01);
    // aboard: the band alone, its upright bass walking down at D2 and A2, under the market's lowest note
    s.g.placePlayer(GAMES.roulette.x, GAMES.roulette.z);
    s.play(1);
    expect(m.musicMix().stage).toBeLessThan(0.001);
    expect(m.musicMix().lounge).toBeCloseTo(1, 3);
    expect(s.audio.key.root).toBe(65); // F major pentatonic: D Dorian's notes, whatever the season
    const heard = music(s.since(() => s.play(32)));
    expect(heard.some(p => near(p.f, hz(38))) && heard.some(p => near(p.f, hz(45)))).toBe(true);
    expect(heard.some(p => p.type === 'custom')).toBe(true); // the alto sax, in the last A once the stage is built
    expect(heard.filter(p => p.kind === 'tone' && p.type !== 'triangle').every(p => p.f < 4000)).toBe(true);
    // back to the market: the band fades away and the market's music comes back
    s.g.placePlayer(0, -3);
    s.play(2);
    expect(m.musicMix()).toEqual({ stage: 1, lounge: 0, noir: 0 });
    expect(m.harborK({ x: SHIP.x, z: SHIP.z })).toBe(1);
  }, 30_000);

  it("the Undertow's band, down in the stage 3 cellar: through its doors down the tunnel, and the music in the club", async () => {
    const s = await withSound({
      tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5),
      ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { door: true } },
    });
    const m = await import('../src/music'), { CY } = await import('../src/cellar'), plan = await import('../src/cellarPlan');
    const { club } = await import('../src/noir'), { DEN, PASSAGE } = s.g.layout;
    const at = (x: number, z: number) => s.g.player.g.position.set(x, CY, z), x = (PASSAGE.x0 + PASSAGE.x1) / 2;
    at(plan.GONG_PAD.x, plan.GONG_PAD.z);
    s.play(2);
    expect(m.musicMix().noir).toBe(0);
    // down the tunnel: the band through the doors, under the stage's music, louder nearer them
    at(x, PASSAGE.z0 + 1);
    s.play(1);
    const far = m.musicMix().noir;
    expect(far).toBeGreaterThan(0.1);
    expect(club.muffle).toBe(1);
    at(x, plan.CLUB_DOOR.z0 - 1.5);
    s.play(1);
    expect(m.musicMix().noir).toBeGreaterThan(far);
    expect(m.musicMix().stage).toBeGreaterThan(0.01);
    // in the club: the band alone, in its own key, its upright bass on D2 and A2, the harmon mute's trumpet, nothing shrill
    at((DEN.x0 + DEN.x1) / 2, DEN.z1 - 0.3);
    s.play(1);
    expect(m.musicMix().noir).toBeCloseTo(1, 3);
    expect(m.musicMix().stage).toBeLessThan(0.001);
    expect(s.audio.key.root).toBe(65);
    const heard = music(s.since(() => s.play(24)));
    expect(heard.some(p => near(p.f, hz(38))) && heard.some(p => near(p.f, hz(45)))).toBe(true);
    expect(heard.some(p => p.type === 'custom')).toBe(true);
    expect(heard.filter(p => p.kind === 'tone' && p.type !== 'triangle').every(p => p.f < 4000)).toBe(true);
    // back up the tunnel and out: gone
    at(plan.GONG_PAD.x, plan.GONG_PAD.z);
    s.play(2);
    expect(m.musicMix().noir).toBeLessThan(0.001);
  }, 30_000);

  it("the Undertow's band plays on as you walk in through its doors and out again: one tune going on, never started over", async () => {
    const s = await withSound({
      tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5),
      ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { door: true } },
    });
    const m = await import('../src/music'), { CY } = await import('../src/cellar'), plan = await import('../src/cellarPlan');
    const { club, eighth, NOIR_STEPS } = await import('../src/noir'), { DEN, PASSAGE } = s.g.layout;
    const at = (x: number, z: number) => s.g.player.g.position.set(x, CY, z), mid = (plan.CLUB_DOOR.z0 + plan.CLUB_DOOR.z1) / 2;
    /** How far the band's got from `from`, against how far it should have by the clock since `t` (in eighths, round its
     *  sixteen bars): 0 when it's played on without a break. */
    const drift = (from: number, t: number) => {
      const d = (m.noirHeard()! - from - (fake.now - t) / eighth()) % NOIR_STEPS;
      return Math.min(Math.abs(d), NOIR_STEPS - Math.abs(d));
    };
    // down the tunnel, at the doors: the band through them
    at((PASSAGE.x0 + PASSAGE.x1) / 2, mid);
    s.play(2);
    const h0 = m.noirHeard()!, t0 = fake.now;
    expect(club.k).toBeGreaterThan(0.5);
    // through the doors a step a frame: heard all the way, and on into the club without starting again
    for (let x = PASSAGE.x0 + 0.3; x > DEN.x1 - 1.5; x -= 0.02) {
      at(x, mid);
      s.play(1 / 60);
      expect(club.k, `x ${x.toFixed(2)}`).toBeGreaterThan(0.5);
    }
    s.play(1);
    expect(club.k).toBe(1);
    expect(drift(h0, t0)).toBeLessThan(0.5);
    // out to the ring, where it isn't heard, and back down the tunnel: still the same tune, where it would be by now
    at(plan.GONG_PAD.x, plan.GONG_PAD.z);
    s.play(4);
    expect(m.musicMix().noir).toBeLessThan(0.001);
    at((PASSAGE.x0 + PASSAGE.x1) / 2, PASSAGE.z0 + 1);
    s.play(1);
    expect(m.musicMix().noir).toBeGreaterThan(0.1);
    expect(drift(h0, t0)).toBeLessThan(0.5);
  }, 30_000);

  it('the casino yacht\'s room: the dining room faint below anywhere aboard, the bar and the slot machines up close', async () => {
    const fetch = vi.fn(() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    vi.stubGlobal('fetch', fetch);
    const s = await withSound({ tiles: bought('roulette') });
    const { roomTones } = await import('../src/roomTone'), { BAR } = await import('../src/casinoSalon');
    const { GAMES, SHIP } = s.g.layout, settle = () => new Promise(r => setTimeout(r, 0));
    s.g.placePlayer(0, -3);
    s.play(1);
    expect(fetch).not.toHaveBeenCalled(); // nothing downloaded until the player heads out to the yacht
    s.g.placePlayer(-12, -4.5);
    s.play(0.2);
    expect(fetch).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 4; i++) await settle();
    s.play(0.2);
    const lv = () => Object.fromEntries((['dining', 'bar', 'slots'] as const).map(k => [k, +roomTones[k]!.g.gain.value.toFixed(3)]));
    expect(lv()).toEqual({ dining: 0, bar: 0, slots: 0 }); // on the quay
    s.g.placePlayer(SHIP.x + 6, SHIP.z + 0.3); // aboard, on the foredeck at the foot of the stairs
    s.play(0.5);
    expect(lv()).toEqual({ dining: 0.08, bar: 0, slots: 0 });
    s.g.placePlayer(SHIP.x + BAR.x + 1.2, SHIP.z); // up at the bar
    s.play(0.5);
    expect(lv().bar).toBeGreaterThan(0.24);
    expect(lv().slots).toBe(0);
    expect(lv().dining).toBe(0.08);
    s.g.placePlayer(GAMES.slots.x, GAMES.slots.z); // at the slot machines
    s.play(0.5);
    expect(lv().bar).toBe(0);
    expect(lv().slots).toBeGreaterThan(0.15);
    s.g.placePlayer(GAMES.roulette.x + 1.2, GAMES.roulette.z + 1.5); // the middle of the floor: a little of each
    s.play(0.5);
    expect(lv().bar + lv().slots).toBeLessThan(0.3);
    // if the ambience's guard finds something wrong, each recording plays again from a new source, as loud as before
    const was = lv(), old = roomTones.bar!.src as unknown as { stopped: boolean };
    s.audio.broken('amb');
    expect(old.stopped).toBe(true);
    expect(roomTones.bar!.src).not.toBe(old);
    s.play(2);
    expect(lv()).toEqual(was);
    vi.unstubAllGlobals();
  });

  it("cuts a recording to a length Chrome can loop: the dining room's loses a frame at 48 kHz", async () => {
    await withSound();
    const { loopable } = await import('../src/roomTone');
    const recording = (length: number, sampleRate: number) => {
      const d = new Float32Array(length);
      for (let i = 0; i < length; i++) d[i] = (i % 997) / 997;
      return { length, sampleRate, numberOfChannels: 1, duration: length / sampleRate, getChannelData: () => d } as unknown as AudioBuffer;
    };
    // Chrome 152 puts the end of this one's loop a hair past its last frame, and sticks there
    expect((4_111_488 / 48_000) * 48_000).toBeGreaterThan(4_111_488);
    const dining = recording(4_111_488, 48_000), cut = loopable(dining).getChannelData(0);
    expect(cut).toHaveLength(4_111_487);
    expect([cut[0], cut[1234], cut[4_111_486]]).toEqual([0, 1234 % 997 / 997, 4_111_486 % 997 / 997].map(Math.fround));
    // the bar's and the slot machines' loop as they are, so they're kept as they are
    for (const n of [4_371_213, 5_805_440]) {
      const r = recording(n, 48_000);
      expect(loopable(r)).toBe(r);
    }
  });

  it('picks up again after the page has been asleep', async () => {
    const s = await withSound();
    s.play(2);
    fake.now += 30; // asleep: the audio clock ran on without the game
    expect(music(s.since(() => s.play(1))).length).toBeGreaterThan(0);
    void s.audio.ac!.suspend();
    expect(music(s.since(() => s.play(1)))).toHaveLength(0);
  });
});

describe('ambience', () => {
  it('follows the player and the season: the sea on the dock, wind in winter, cicadas in summer', async () => {
    const s = await withSound();
    const at = (x: number, z: number) => { s.audio.updAudio(0, { x, z }); s.ambience.updAmbience(); };
    at(0, -6);
    expect(s.bed(420)).toBeGreaterThan(0.03);
    at(0, 30);
    expect(s.bed(420)).toBe(0);
    const winter = s.wind();
    expect(winter).toBeGreaterThan(0.27 * 0.3 - 1e-9); // a winter wind, between gusts at least
    s.season.setSeason(2, 0, true);
    at(0, 0);
    const summer = s.wind();
    expect(summer).toBeLessThan(winter);
    expect(summer).toBeLessThanOrEqual(0.04);
    expect(s.bed(4200)).toBeCloseTo(0.03); // cicadas
    s.audio.setMute('amb', true);
    s.season.setSeason(0, 0, true);
    at(0, 0);
    expect(s.wind()).toBe(summer); // left alone while sound's off
  });

  it('brings the sea in as waves, with calm between, and the wind in gusts, on soft brown noise', async () => {
    const s = await withSound();
    const sea: number[] = [], wind: number[] = [], high: number[] = [];
    for (let i = 0; i < 240; i++) {
      s.audio.updAudio(0.25, { x: 0, z: -6 });
      s.ambience.updAmbience();
      sea.push(s.bed(420)); wind.push(s.wind()); high.push(s.bed(650) / s.wind());
    }
    expect(Math.min(...sea)).toBeLessThan(0.35 * Math.max(...sea));
    expect(Math.min(...wind)).toBeLessThan(0.5 * Math.max(...wind));
    // the harder it blows, the more of it is the high wind: its pitch rises with the gusts
    expect(high[wind.indexOf(Math.max(...wind))]).toBeGreaterThan(high[wind.indexOf(Math.min(...wind))] + 0.3);
    const soft = fake.played.filter(p => p.loop && [420, 800, 330, 650, 500].includes(p.f));
    expect(soft).toHaveLength(5); // sea, wash, the two winds and diners: the brown-noise beds
  });

  it("lays its beds again if the ambience's guard finds something gone wrong, and carries on as before", async () => {
    const s = await withSound();
    const at = (x: number, z: number) => { s.audio.updAudio(0.25, { x, z }); s.ambience.updAmbience(); };
    at(0, -6);
    const old = fake.played.filter(p => p.loop);
    const sea = s.bed(420);
    s.audio.broken('music'); // not the ambience's
    expect(fake.played.filter(p => p.loop)).toHaveLength(10);
    s.audio.broken('amb');
    expect(old.every(p => (p.src as unknown as { stopped: boolean }).stopped)).toBe(true);
    expect(fake.played.filter(p => p.loop)).toHaveLength(20); // ten new ones in their place
    expect(s.bed(420)).toBe(0); // starting silent
    at(0, -6);
    expect(s.bed(420)).toBeCloseTo(sea, 1);
  });

  it('rains at her house', async () => {
    const s = await withSound();
    s.g.placePlayer(s.rain.RAIN_PAD.x, s.rain.RAIN_PAD.z);
    s.play(3);
    expect(s.bed(2200)).toBeCloseTo(0.5);
  });

  it('murmurs with diners in the restaurant, under crickets at dusk', async () => {
    const s = await withSound({ tiles: bought('sushi'), plates: 12, season: 2 });
    s.g.placePlayer(0, 12);
    const evening = s.since(() => s.play(25));
    expect(s.g.restaurant.sushi.diners.length).toBeGreaterThan(0);
    expect(s.bed(500)).toBeGreaterThan(0);
    expect(evening.some(p => p.bus === 'amb' && p.f === 4400)).toBe(true);
  });

  it('calls now and then: gulls over the sea, birds by day in spring', async () => {
    const s = await withSound({ season: 1 });
    s.g.placePlayer(0, -4);
    const day = s.since(() => s.play(40));
    expect(day.some(p => p.bus === 'amb' && p.type === 'triangle' && p.f >= 1500 && p.f <= 1800)).toBe(true);
    expect(day.some(p => p.bus === 'amb' && p.type === 'sine' && p.f >= 2600 && p.f <= 3400)).toBe(true);
  });
});

it("leaves the game's own random numbers alone", async () => {
  const run = async (sound: boolean) => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(9));
    const s = await withSound(undefined, sound);
    s.g.placePlayer(s.g.stations.PAD.x, s.g.stations.PAD.z);
    s.play(20);
    return [s.g.stations.pile.n, s.g.counters.C1.queue.length, Math.random()];
  };
  expect(await run(true)).toEqual(await run(false));
});
