// Stage 3's sound: the gloop ring band down in the cellar (and the café band still up on the dock), and the crowd
// following every moment of a bout, loud below and muffled through the floor above. Heard through the Web Audio
// stand-in (fakeAudio.ts), as in sound.test.ts.
import { describe, expect, it } from 'vitest';
import { fake, type FakeNode, type FakeParam, installFakeAudio, level, nameBuses, type Played } from './fakeAudio';
import { bought, FLOE_SUSHI, loadGame, MARKET, RING_DONE } from './helpers';

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const near = (f: number, want: number) => Math.abs(f - want) < 1;

/** A stage 3 game with sound on: down in the cellar (`down`), the cellar as `ring` has it. */
async function ringWithSound(down = true, ring: Record<string, unknown> = {}) {
  installFakeAudio();
  const g = await loadGame({ tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: down ? 1 : 0, reviews: Array(20).fill(5), ring });
  const [audio, dohyo, music, ringSound] = await Promise.all([import('../src/audio'), import('../src/dohyo'), import('../src/music'), import('../src/ringSound')]);
  g.press('x'); g.press('x', 'keyup'); nameBuses(audio.buses);
  const play = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) { fake.now += 1 / 60; g.game.tick(1 / 60); } };
  const since = (fn: () => void) => { const n = fake.played.length; fn(); return fake.played.slice(n); };
  return { g, audio, dohyo, music, ringSound, play, since };
}
const tunes = (ps: Played[]) => ps.filter(p => p.bus === 'music');

describe('the gloop ring', () => {
  it('plays down in the cellar as it was made: the soft, sagging bass round C2 to start, then more as the bosses fall', async () => {
    const early = await ringWithSound();
    const start = tunes(early.since(() => early.play(24)));
    expect(early.audio.key.root).toBe(63); // the game's sounds in E-flat major: C minor's pentatonic
    expect(start.some(p => p.type === 'custom' && near(p.f, hz(36)))).toBe(true); // the gloop on C2
    expect(start.some(p => p.type === 'sine' && near(p.f, hz(36)))).toBe(true); // and the sine under it
    expect(start.some(p => p.f === 66)).toBe(false); // the drums come with the bosses
    expect(start.some(p => p.type === 'custom' && p.f > hz(57) && p.f < hz(76))).toBe(false); // and so does the tune

    const half = await ringWithSound(true, { beaten: 2 });
    const mid = tunes(half.since(() => half.play(24)));
    expect(mid.some(p => p.f === 66)).toBe(true); // taiko
    expect(mid.some(p => p.kind === 'noise' && p.f === 1500)).toBe(true); // the wet slap
    expect(mid.some(p => p.type === 'custom' && p.f > hz(57) && p.f < hz(76))).toBe(false); // not the tune yet

    const built = await ringWithSound(true, RING_DONE);
    const full = tunes(built.since(() => built.play(24)));
    expect(full.some(p => p.f === 66)).toBe(true); // taiko
    expect(full.some(p => p.f === 784)).toBe(true); // the clappers
    expect(full.some(p => p.type === 'custom' && p.f > hz(57) && p.f < hz(76))).toBe(true); // the shamisen
    expect(full.some(p => p.type === 'triangle' && p.f < 110)).toBe(true); // the low drone
  }, 30_000);

  it("plays in the cellar's damp room: a reverb and an echo on the drums, the tune and the bubbles, but not on the bass", async () => {
    const s = await ringWithSound(true, RING_DONE);
    // (the voices kept wired up after they end, to follow where each one goes)
    fake.hold = true;
    const m = tunes(s.since(() => s.play(12)));
    /** Whether a voice reaches the room's reverb (a convolver) on its way out. */
    const wet = (p: Played) => {
      const seen = new Set<FakeNode>();
      const go = (n: FakeNode): boolean => {
        if (seen.has(n)) return false;
        seen.add(n);
        return ('buffer' in n && !('loop' in n)) || n.outs.some(go);
      };
      return go(p.src);
    };
    const taiko = m.filter(p => p.f === 66), shami = m.filter(p => p.type === 'custom' && p.f > hz(57) && p.f < hz(76));
    const bass = m.filter(p => p.type === 'custom' && near(p.f, hz(36)));
    expect(taiko.length && shami.length && bass.length).toBeTruthy();
    expect(taiko.every(wet)).toBe(true);
    expect(shami.every(wet)).toBe(true);
    expect(bass.some(wet)).toBe(false);
  }, 30_000);

  it('gives way to the café band up on the dock, and comes back down the ladder', async () => {
    const s = await ringWithSound(false);
    const up = tunes(s.since(() => s.play(8)));
    expect(up.some(p => p.type === 'custom')).toBe(false);
    expect(up.some(p => p.type === 'sine' && p.f > 180 && p.f < 380)).toBe(true); // the electric piano
    s.g.stage.setLevel(true);
    const down = tunes(s.since(() => s.play(6)));
    expect(down.some(p => p.type === 'custom')).toBe(true);
  });

  it('has no pops: every note starts from silence, and nothing is high-pitched', async () => {
    const s = await ringWithSound(true, RING_DONE);
    const m = tunes(s.since(() => s.play(30))).filter(p => !p.loop && p.f >= 20);
    expect(m.length).toBeGreaterThan(100);
    expect(m.filter(p => p.from !== 0)).toEqual([]);
    expect(m.filter(p => p.kind === 'tone' && p.f >= 4000)).toEqual([]);
  }, 30_000);

  it("keeps the shamisen low and on the chords: B-flat 3 to E-flat 5, never a half step off the chord's notes", async () => {
    const { music } = await ringWithSound();
    const chords = [[0, 3, 7], [0, 3, 7], [8, 0, 3], [10, 2, 5]];
    music.GLOOP_TUNE.forEach((bar, b) => {
      const pcs = chords[b % 4];
      for (const n of bar) {
        expect(n.m).toBeGreaterThanOrEqual(58);
        expect(n.m).toBeLessThanOrEqual(75);
        if (n.s % 4 === 0) expect(pcs).toContain(n.m % 12);
        expect(pcs.some(p => [1, 11].includes(((n.m - p) % 12 + 12) % 12))).toBe(false);
      }
    });
  });
});

describe('the crowd', () => {
  it('reacts to every moment of a bout, in voices: men and women shouting, babbling between, and clapping', async () => {
    const s = await ringWithSound();
    const heard = s.since(() => s.play(30)).filter(p => p.bus === 'sfx');
    // a voice: the vocal folds' buzz (a custom wave) at a speaking or shouting pitch, through its vowel's formants
    const voices = heard.filter(p => p.kind === 'tone' && p.type === 'custom' && p.f >= 90 && p.f <= 300);
    expect(voices.length).toBeGreaterThan(60);
    expect(voices.some(p => p.f < 170)).toBe(true); // men
    expect(voices.some(p => p.f > 185)).toBe(true); // and women
    expect(heard.some(p => p.kind === 'tone' && p.f === 82)).toBe(true); // the charge's thud
    expect(heard.filter(p => p.kind === 'noise' && p.f >= 1100 && p.f <= 2300).length).toBeGreaterThan(50); // applause
    // and no more of the old shouts, noise through a formant, that sounded like wind
    expect(heard.some(p => p.kind === 'noise' && [480, 420, 700, 1000].includes(p.f))).toBe(false);
  }, 30_000);

  it('cheers a moment with a dozen people at once, each their own pitch', async () => {
    const s = await ringWithSound();
    s.play(0.5);
    const cheer = s.since(() => s.ringSound.react('win')).filter(p => p.type === 'custom');
    expect(cheer.length).toBeGreaterThanOrEqual(12);
    expect(new Set(cheer.map(p => Math.round(p.f))).size).toBeGreaterThanOrEqual(10);
  });

  it('roars down in the cellar, and is only a murmur through the floor from the dock', async () => {
    const s = await ringWithSound();
    const cellar = await import('../src/cellar');
    s.g.player.g.position.set(cellar.RING.x + 1, cellar.CY, cellar.RING.z + 5); // at the ringside
    s.play(27); // (into the first fight: the fans buy soup for 20 s, sit down for 5, then the charge)
    const ring = fake.played.find(p => p.loop && p.f === 520)!;
    const below = level(ring);
    expect(below).toBeGreaterThan(0.2);
    s.g.stage.setLevel(false);
    s.play(2);
    expect(level(ring)).toBeLessThan(below * 0.3);
    // and down there, nothing from outside: no sea
    s.g.stage.setLevel(true);
    s.play(3);
    expect(level(fake.played.find(p => p.loop && p.f === 420)!)).toBe(0);
  }, 30_000);

  it("hears nothing from the world above down in the cellar, and nothing from the cellar but the crowd up there", async () => {
    const s = await ringWithSound();
    const [sfx, cellar] = await Promise.all([import('../src/sfx'), import('../src/cellar')]);
    s.play(0.1);
    // (a moment apart, as the register only rings so often)
    const till = (y: number) => { s.play(0.15); return s.since(() => sfx.till({ x: 0, y, z: 3 } as never)).filter(p => p.bus === 'sfx'); };
    expect(till(1)).toEqual([]); // the restaurant's register, overhead
    expect(till(cellar.CY).length).toBeGreaterThan(0); // a till down here
    s.g.stage.setLevel(false);
    s.play(0.1);
    expect(till(1).length).toBeGreaterThan(0);
    expect(till(cellar.CY)).toEqual([]);
  });

  it('plays the recorded crowd once its recordings are in: one continuous crowd, its layers following the bout', async () => {
    const s = await ringWithSound();
    const LEN = { murmur: 20, chant: 11, roar: 10, applause: 10, cheer1: 8, cheer2: 11.5, swell: 7 } as const;
    for (const [k, duration] of Object.entries(LEN)) s.audio.setClip(k as keyof typeof LEN, { duration, name: k } as unknown as AudioBuffer);
    s.g.player.g.position.set(-3.4, -30, 3.6); // by the ring
    s.play(0.5);
    const named = (p: Played) => (p.src as unknown as { buffer?: { name?: string } }).buffer?.name;
    const loop = (k: string) => fake.played.find(p => p.loop && named(p) === k)!;
    // the murmur, the chant and the roar loop the whole time: no stopping and starting between moments
    for (const k of ['murmur', 'chant', 'roar']) expect(loop(k)).toBeTruthy();
    const chant = () => level(loop('chant')), roar = () => level(loop('roar'));
    // from here, only the crowd's own clock runs (the game's own bouts would cheer over this one)
    const run = (secs: number) => { for (let t = 0; t < secs; t += 1 / 60) { fake.now += 1 / 60; s.ringSound.updRingSound(1 / 60); } };
    // the wrestlers step up: the chant builds, a beat louder on each stamp
    s.ringSound.react('billing'); run(0.3);
    const stepping = chant();
    expect(stepping).toBeGreaterThan(0);
    s.ringSound.react('stomp'); run(0.1);
    expect(chant()).toBeGreaterThan(stepping);
    // the hush: the chant and the roar fall away
    s.ringSound.react('crouch'); run(1);
    expect(chant()).toBeLessThan(0.01);
    expect(roar()).toBeLessThan(0.01);
    // the charge: the roar surges, and stays up through the push
    s.ringSound.react('charge'); run(0.1);
    const surge = roar();
    expect(surge).toBeGreaterThan(0.05);
    run(2);
    expect(roar()).toBeGreaterThan(surge * 0.3);
    // the win: a cheer over it, then the roar drains away gradually, back to the murmur
    const win = s.since(() => s.ringSound.react('win'));
    expect(win.map(named).some(n => n === 'cheer1' || n === 'cheer2')).toBe(true);
    expect(win.some(p => p.type === 'custom')).toBe(false); // no synthesised voices
    run(1); const after1 = roar();
    run(1.5); const after2 = roar();
    run(4); const after6 = roar();
    expect(after1).toBeGreaterThan(after2);
    expect(after2).toBeGreaterThan(after6);
    expect(after6).toBeLessThan(0.01);
    // no synthesised babble with the recorded murmur in
    expect(s.since(() => s.play(3)).filter(p => p.type === 'custom' && p.bus === 'sfx')).toEqual([]);
  });

  it('carries the crowd by room: all of it at the ringside, half across the arena, low in the kitchen, lower in the prep hall, very low in the office', async () => {
    const s = await ringWithSound();
    const [cellar, layout, plan] = await Promise.all([import('../src/cellar'), import('../src/layout'), import('../src/cellarPlan')]);
    const hears = (x: number, z: number, down = true) => s.ringSound.hearsAt({ x, z }, down);
    const ringside = hears(cellar.RING.x + 1, cellar.RING.z + 5);
    const stands = hears(cellar.RING.x, layout.ARENA.z0 + 1.5); // the back stands
    const farArena = hears(layout.ARENA.x0 + 0.5, layout.ARENA.z1 - 0.5); // the back door's corner
    const landing = hears(cellar.LADDER_FOOT.x, cellar.LADDER_FOOT.z);
    const kitchen = hears(plan.POT_PAD.x, plan.POT_PAD.z);
    const prep = hears(plan.BIN_PADS.rice.x, plan.BIN_PADS.rice.z);
    const office = hears(cellar.OFFICE.x, cellar.OFFICE.z + 1.5);
    const dock = hears(cellar.RING.x, cellar.RING.z, false);
    const L = layout, undertow = [L.DEN, L.LOANS, L.VIP, L.CARDS].map(r => hears((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2));
    expect(ringside).toBe(1);
    expect(undertow).toEqual([0, 0, 0, 0]); // none of it behind the Undertow's doors
    expect(stands).toBeGreaterThan(0.95); // among the crowd
    expect(farArena).toBeGreaterThan(0.4); expect(farArena).toBeLessThan(0.7);
    expect(landing).toBeLessThan(farArena);
    expect(kitchen).toBeLessThan(landing);
    expect(prep).toBeLessThan(kitchen);
    expect(office).toBeLessThan(prep);
    expect(office).toBeLessThan(0.1);
    expect(dock).toBeLessThan(0.2);
  });

  it("plays the recorded crowd's layers at that, easing as the player goes through a doorway", async () => {
    const s = await ringWithSound();
    const [cellar, plan] = await Promise.all([import('../src/cellar'), import('../src/cellarPlan')]);
    for (const k of ['murmur', 'chant', 'roar', 'applause', 'cheer1', 'cheer2', 'swell'] as const) s.audio.setClip(k, { duration: 10, name: k } as unknown as AudioBuffer);
    const roar = () => level(fake.played.find(p => p.loop && (p.src as unknown as { buffer?: { name?: string } }).buffer?.name === 'roar')!);
    const run = (secs: number) => { for (let t = 0; t < secs; t += 1 / 60) { fake.now += 1 / 60; s.ringSound.updRingSound(1 / 60); } };
    s.g.player.g.position.set(cellar.RING.x + 1, cellar.CY, cellar.RING.z + 5);
    s.play(0.2); s.ringSound.react('charge'); run(1);
    const ringside = roar();
    // into the kitchen: it eases down, rather than dropping at once
    s.g.player.g.position.set(plan.POT_PAD.x, cellar.CY, plan.POT_PAD.z);
    s.play(1 / 60); s.ringSound.react('charge'); run(0.05);
    expect(roar()).toBeGreaterThan(ringside * 0.4);
    run(2); s.ringSound.react('charge'); run(0.2);
    expect(roar()).toBeLessThan(ringside * 0.3); // (the hearth room hears about a quarter)
    // the office: next to nothing
    s.g.player.g.position.set(cellar.OFFICE.x, cellar.CY, cellar.OFFICE.z + 1.5);
    s.play(2); s.ringSound.react('charge'); run(0.2);
    expect(roar()).toBeLessThan(ringside * 0.1);
  });

  it('moves no filter as it works up (one moved every frame can blow up): its voices fade from a hubbub over to shouts', async () => {
    const s = await ringWithSound();
    const cellar = await import('../src/cellar');
    s.g.player.g.position.set(cellar.RING.x + 1, cellar.CY, cellar.RING.z + 5); // at the ringside
    s.play(0.1);
    // every filter an endless sound goes through, watched from here on
    const moved: string[] = [];
    for (const p of fake.played.filter(q => q.loop)) {
      for (let n: FakeNode | undefined = p.src; n && !fake.buses.has(n); n = n.outs[0]) {
        const f = (n as FakeNode & { frequency?: FakeParam; Q?: FakeParam }).Q && (n as FakeNode & { frequency: FakeParam }).frequency;
        if (!f) continue;
        for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime'] as const) {
          const was = f[k].bind(f);
          f[k] = (v: number) => { moved.push(`${p.f} Hz: ${k}(${v})`); return was(v); };
        }
      }
    }
    // into the first fight (the fans buy soup for 20 s, sit down for 5, then the charge), the synthesised crowd on
    const bed = (f: number) => level(fake.played.find(p => p.loop && p.f === f)!);
    let hubbub = 0, shouts = 0, excite = 0;
    for (let t = 0; t < 30; t += 0.5) {
      s.play(0.5);
      hubbub = Math.max(hubbub, bed(850)); shouts = Math.max(shouts, bed(1300)); excite = Math.max(excite, s.ringSound.crowd.excite);
    }
    expect(excite).toBeGreaterThan(0.8);
    expect(hubbub).toBeGreaterThan(0);
    expect(shouts).toBeGreaterThan(0);
    expect(moved).toEqual([]);
  }, 30_000);

  it("loops the recorded crowd short of each recording's end, where Chrome 152 can stick on a loop", async () => {
    // (left to loop the whole recording, Chrome 152 works out the end as its length ÷ the rate × the rate, which can land
    // a hair past the last frame: it sticks there, and the filter after it rings up into a horn, roomTone.ts's loopable)
    const s = await ringWithSound();
    const LEN = { murmur: 20, chant: 11, roar: 10, applause: 10, cheer1: 8, cheer2: 11.5, swell: 7 } as const;
    for (const [k, duration] of Object.entries(LEN)) s.audio.setClip(k as keyof typeof LEN, { duration, name: k } as unknown as AudioBuffer);
    s.g.player.g.position.set(-3.4, -30, 3.6); // by the ring
    s.play(0.5);
    const named = (p: Played) => (p.src as unknown as { buffer?: { name?: string } }).buffer?.name;
    for (const k of ['murmur', 'chant', 'roar'] as const) {
      const src = fake.played.find(p => p.loop && named(p) === k)!.src as unknown as { loopStart: number; loopEnd: number };
      expect(src.loopStart, k).toBeGreaterThan(0);
      expect(src.loopEnd, k).toBeGreaterThan(src.loopStart);
      expect(LEN[k] - src.loopEnd, k).toBeGreaterThan(0.05); // thousands of frames short of the end
    }
  });
});
