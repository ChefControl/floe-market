// Sound: silent until a tap or a key press, then the effects, the ambient beds and the music, all synthesised. The
// tests listen through a stand-in for Web Audio (fakeAudio.ts) that logs what's played, on which bus, panned where.
import { describe, expect, it, vi } from 'vitest';
import { fake, installFakeAudio, level, nameBuses, type Played } from './fakeAudio';
import { bought, loadGame, MARKET, type SaveFixture } from './helpers';
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
  const bed = (f: number) => level(fake.played.find(p => p.loop && p.f === f)!);
  return { g, audio, sfx, ambience, season, rain, play, since, bed };
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
    expect(fake.played.filter(p => p.loop)).toHaveLength(6); // the sea, its wash, wind, rain, diners, cicadas
    window.dispatchEvent(new Event('pointerdown'));
    expect(fake.made).toBe(1); // one for good
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

  it("can't pile up more than 40 voices at once", async () => {
    const { sfx, since } = await withSound();
    fake.hold = true;
    expect(since(() => { for (let i = 0; i < 60; i++) sfx.tick(); })).toHaveLength(40);
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
  });

  it('plays each tune twice, and rests the tune every fifth verse', async () => {
    const s = await withSound({ tiles: bought('sushi') });
    const verse = 8 * 8 * 60 / 84 / 2;
    const verses = [0, 1, 2, 3, 4].map(() => lead(s.since(() => s.play(verse))).length);
    expect(verses.slice(0, 4).every(n => n > 10)).toBe(true);
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
    const winter = s.bed(450);
    expect(winter).toBeGreaterThan(0.27 * 0.3 - 1e-9); // a winter wind, between gusts at least
    s.season.setSeason(2, 0, true);
    at(0, 0);
    const summer = s.bed(450);
    expect(summer).toBeLessThan(winter);
    expect(summer).toBeLessThanOrEqual(0.04);
    expect(s.bed(4200)).toBeCloseTo(0.03); // cicadas
    s.audio.setMute('amb', true);
    s.season.setSeason(0, 0, true);
    at(0, 0);
    expect(s.bed(450)).toBe(summer); // left alone while sound's off
  });

  it('brings the sea in as waves, with calm between, and the wind in gusts, on soft brown noise', async () => {
    const s = await withSound();
    const sea: number[] = [], wind: number[] = [];
    for (let i = 0; i < 240; i++) {
      s.audio.updAudio(0.25, { x: 0, z: -6 });
      s.ambience.updAmbience();
      sea.push(s.bed(420)); wind.push(s.bed(450));
    }
    expect(Math.min(...sea)).toBeLessThan(0.35 * Math.max(...sea));
    expect(Math.min(...wind)).toBeLessThan(0.5 * Math.max(...wind));
    const soft = fake.played.filter(p => p.loop && [420, 800, 450, 500].includes(p.f));
    expect(soft).toHaveLength(4); // sea, wash, wind and diners: the brown-noise beds
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
