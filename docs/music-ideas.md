# Music saved for later

Music that was tried for the game, liked, and kept for a stage that doesn't exist yet. The game's music itself is in `src/music.ts` and described in the README.

## 8-bit market: for a future, futuristic stage

A simple chiptune that sounds like an old handheld game. It was tried for stage 1, and saved instead for a futuristic stage.

| | |
| --- | --- |
| Key | A minor; the game's sounds would play in C major, which has the same notes as A minor's pentatonic |
| Tempo | 104 BPM, straight sixteenths, 16 steps to a bar |
| Chords | A bar each, round twice a verse: Am, F, C, G (i, ♭VI, ♭III, ♭VII), plain triads |
| Tune | A walk on the A minor pentatonic (A C D E G), from A4 up to about D6, landing on the chord's notes on the beat and never holding a note a half step off one of them (as the market's tune does in `src/music.ts`) |
| Lead | A 25% pulse wave through a low-pass filter at 2.4 kHz (filtered, so it never gets shrill) |
| Bass | A triangle wave on the chord's root, an octave under the tune's register |

How it grows with the stage (1 to 4, as the other music does):

1. The tune, and the bass on each beat.
2. The bass on every eighth note. A kick on beats 1 and 3, a noise snare on 2 and 4, and soft hi-hats on the eighths.
3. The bass jumps up an octave on the off-beats. A quiet arpeggio channel cycles through the chord's notes on every sixteenth.
4. A second pulse voice plays a third under the tune in the second half of each verse.

### Porting notes

- **Pulse wave:** the engine's voices (`src/audio.ts`) need a `PeriodicWave` option. A 25% pulse is the sine series `im[k] = 2 / (kπ) · sin(kπ / 4)` for k = 1 to 31.
- **Kick:** its kick starts at 110 Hz and drops to 55 Hz fast. That is the kind of kick that pops, so port it with the soft kick from `src/music.ts` (72 to 52 Hz, eased in).
- **Highest sounds:** keep everything under 4 kHz, as the music test in `test/sound.test.ts` checks for the other music.

### The listening page's code

This is from the listening page, where `tone()` and `noise()` match the game's voices. The additions are `wave` (a `PeriodicWave`), `midiHz()` and the page's `layer` (1 to 4).

```js
const PENTA_MINOR = [0, 3, 5, 7, 10];
// A bar each: Am, F, C, G, as [root, intervals] up from A
const chords = [[0, [0, 3, 7]], [8, [0, 4, 7]], [3, [0, 4, 7]], [10, [0, 4, 7]]];
const key = 57, bpm = 104; // sixteenths: a step is 60 / bpm / 4 seconds
const tune = minorTune(rng(101), key + 12, [...chords, ...chords],
  ['x...x...x.x.x...', 'x.x.x...x...x.x.', 'x...x.x.x.......', 'x.x...x.x.x.x...'], 0, 7, PENTA_MINOR);

function play(i, t) {
  const bar = Math.floor(i / 16), b = bar % 4, s = i % 16, [root, iv] = chords[b], st = 60 / bpm / 4;
  // the bass: on the beat, then every eighth, then jumping an octave on the off-beats
  if (s % 4 === 0 || (layer >= 2 && s % 2 === 0)) {
    tone({ t, f: midiHz(key - 12 + root + (layer >= 3 && s % 4 === 2 ? 12 : 0)), type: 'triangle', a: 0.006, d: st * 1.6, v: 0.16 });
  }
  // the tune
  for (const n of tune[bar % 8]) if (n.s === s) tone({ t, f: midiHz(n.m), wave: pulse25, lp: 2400, a: 0.006, hold: st * 1.2, d: 0.06, v: 0.04 });
  // drums (use the soft kick when porting: see above)
  if (layer >= 2) {
    if (s === 0 || s === 8) tone({ t, f: 110, f2: 55, a: 0.008, d: 0.12, v: 0.12 });
    if (s === 4 || s === 12) noise({ t, f: 1800, q: 0.8, a: 0.004, d: 0.08, v: 0.045 });
    if (s % 2 === 0) noise({ t, f: 5000, kind: 'highpass', a: 0.004, d: 0.02, v: 0.012 });
  }
  // the arpeggio channel
  if (layer >= 3) tone({ t, f: midiHz(key + 12 + root + iv[s % 3]), wave: pulse25, lp: 2000, a: 0.004, d: st * 0.8, v: 0.012 });
  // a harmony a third under the tune, in the verse's second half
  if (layer >= 4 && bar % 8 >= 4) {
    for (const n of tune[bar % 8]) if (n.s === s) tone({ t, f: midiHz(thirdUnder(n.m, key)), wave: pulse25, lp: 2000, a: 0.006, hold: st, d: 0.06, v: 0.02 });
  }
}
```


## Gloop ring: for a future underground sumo ring

Heavy, gloopy and slow, made after a reference track picked for it ("Gloopin"): the same tempo, a bass down around C2 that sags and slides like mud, and a half-time beat. It was liked as it is (a heavier, more resonant bass was tried and turned down), and saved for a sumo stage.

| | |
| --- | --- |
| Key | C minor; the game's sounds would play in E♭ major, which has the same notes as C minor's pentatonic |
| Tempo | 96 BPM, half time (the backbeat on beat 3), sixteenths with a slight swing (0.54), 16 steps to a bar |
| Chords | A bar each, round twice a verse: Cm, Cm, A♭, B♭ (i, i, ♭VI, ♭VII), plain triads. The bass slides C down to G going into A♭, and B♭ up to C to get home |
| Tune | A shamisen, low (C4 to about E♭5), on the C minor pentatonic, landing on the chord's notes on the beat and never holding a note a half step off one of them (as the market's tune does in `src/music.ts`) |
| Bass | The gloop: a soft sawtooth (only its first 24 harmonics) through a resonant low-pass (Q 6) closing from 1100 to 170 Hz, over a sine. It sags 0.7 of a semitone as it dies. C2, A♭1 and B♭1 |
| Drums | A taiko (the game's soft kick, a little lower and longer), a wet slap on 3 (noise falling from 1500 to 450 Hz over a thud), grit (a shaker at 2.6 kHz), and the ring's wooden clappers (hyoshigi) calling each round |
| Extras | Mud bubbles: sines rising by 1.7 times as they fade, on the chord's notes |

How it grows with the stage (1 to 4, as the other music does):

1. The bass, and a few bubbles.
2. The taiko, the slap, grit, and the clappers at the end of each verse.
3. The shamisen's tune (every other pair of bars), a busier bass, more bubbles and grit.
4. The tune in every bar, a low drone on the chord's root and fifth, and bubbles following the tune in the verse's second half.

### Porting notes

- **Soft sawtooth:** the engine's voices (`src/audio.ts`) need a `PeriodicWave` option, as for the 8-bit market: the series `im[k] = 1 / k` for k = 1 to 24 (the bass) or 1 to 6 (the shamisen). A plain sawtooth clicks at each note's peak; this doesn't.
- **Resonance:** `tone()`'s low-pass needs a `q` (the bass is at 6, the shamisen at 3). The page closes the filter over 60% of the decay; the game's `tone()` does it over 50%, which is close enough.
- **Reverb, echo and pan:** the listening page sends some parts to a reverb (`rev`), a dotted-eighth echo (`dly`) and pans the bubbles (`pan`). The game's music has none of these, so leave them out or add them to the music bus.
- **Highest sounds:** everything is under 4 kHz, as the music test in `test/sound.test.ts` checks: the clappers' overtone is at about 2 kHz, and the highest bubbles rise to about 2.1 kHz.
- **Pops:** an offline render of every layer had no more clicks than the music in the game (0 at layer 1, up to 7 at layer 4, against up to 14 for the market's kalimba), and less above 4 kHz than either stage's music.

### The listening page's code

This is from the listening page, where `tone()` and `noise()` match the game's voices. The additions are `wave` (a `PeriodicWave`), `q`, `midiHz()`, `minorTune()` and `rng()` (the listening page's own, also used in the 8-bit market's code above), `softSaw24` and `softSaw6` (made with `softSaw(n)`, below), and the page's `layer` (1 to 4).

```js
function softSaw(n) {
  const re = new Float32Array(n + 1), im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = 1 / k;
  return ctx.createPeriodicWave(re, im);
}
/**
 * A gloopy bass: a soft sawtooth through a resonant low-pass that snaps shut (the "bloop"), over a sine for weight. It sags
 * a little as it dies, or slides `slide` semitones on the way (down to the next chord's note: the gloop).
 */
const gloop = (m, t, d, v = 0.18, slide = -0.7) => {
  const f = midiHz(m), f2 = f * 2 ** (slide / 12);
  tone({ f, f2, t, wave: softSaw24, a: 0.012, d, v: v * 0.45, lp: 1100, lp2: 170, q: 6 });
  tone({ f, f2, t, a: 0.012, d, v });
};
/** A mud bubble: a sine rising quickly as it fades. */
const blub = (m, t, v = 0.03, x = {}) => tone({ ...x, f: midiHz(m), f2: midiHz(m) * 1.7, t, a: 0.01, d: 0.09, v });
/** A taiko: the game's soft kick, a little lower and longer (barely bending, eased in), with a dull skin. */
const taiko = (t, v = 0.2) => { tone({ f: 66, f2: 50, t, a: 0.015, d: 0.45, v, rev: 0.15 }); noise({ t, f: 320, kind: 'lowpass', a: 0.012, d: 0.08, v: v * 0.3, rev: 0.15 }); };
/** A wet slap, the half-time backbeat: a splat of noise falling in pitch over a dull thud, in a damp room. */
const splat = (t, v = 0.06) => { noise({ t, f: 1500, f2: 450, q: 1.4, a: 0.016, d: 0.13, v, rev: 0.3 }); tone({ f: 170, f2: 130, t, a: 0.012, d: 0.09, v: v * 0.8 }); };
/** The ring's wooden clappers (hyoshigi): a sine and a quick, soft overtone, well under 4 kHz. */
const clapper = (t, v = 0.03) => { tone({ f: 784, t, a: 0.008, d: 0.07, v, rev: 0.4 }); tone({ f: 784 * 2.6, t, a: 0.008, d: 0.035, v: v * 0.15, rev: 0.4 }); };
/** A low, twangy plucked string: a shamisen's bark, filtered dark. */
const shami = (m, t, v = 0.06, x = {}) => tone({ ...x, f: midiHz(m), t, wave: softSaw6, a: 0.01, d: 0.4, v, lp: midiHz(m) * 4, lp2: midiHz(m) * 1.2, q: 3 });
/** Grit underfoot: a soft shaker, kept well under 4 kHz. */
const grit = (t, v = 0.016) => noise({ t, f: 2600, q: 1.2, a: 0.01, d: 0.04, v });

const PENTA_MINOR = [0, 3, 5, 7, 10];
// A bar each, round twice a verse: Cm, Cm, A♭, B♭, as [root, intervals] up from C
const chords = [[0, [0, 3, 7]], [0, [0, 3, 7]], [8, [0, 4, 7]], [10, [0, 4, 7]]];
const bpm = 96; // sixteenths, swung a little (0.54): a step is 60 / bpm / 4 seconds
// the shamisen, low: from C4 to about E♭5
const tune = minorTune(rng(131), 60, [...chords, ...chords],
  ['x.....x...x.....', 'x..x..x.....x...', '....x..x..x.x...', 'x.......x.x.x...'], 0, 6, PENTA_MINOR, 2);
const r = rng(137);

function play(i, t) {
  const bar = Math.floor(i / 16), b = bar % 4, s = i % 16, [root, iv] = chords[b];
  // the bass, down around C2: C2, A♭1, B♭1
  const low = 36 + ((root + 4) % 12) - 4;
  if (s === 0) gloop(low, t, 0.55);
  if (s === 6) gloop(low, t, 0.22, 0.15);
  if (s === 10) gloop(low + 12, t, 0.18, 0.11);
  if (b === 1 && s === 13) gloop(low, t, 0.45, 0.15, -5);  // C sliding down to G, into A♭
  if (b === 3 && s === 14) gloop(low, t, 0.3, 0.13, 2);    // B♭ sliding up to C, home
  if (layer >= 3 && s === 3) gloop(low + 7, t, 0.12, 0.09);
  // bubbles rising out of the mud, on the chord's notes
  if ((layer >= 3 || s % 2 === 0) && r() < [0, 0.12, 0.14, 0.16, 0.18][layer]) {
    blub(48 + 24 + root % 12 + iv[Math.floor(r() * 3)] - (root >= 8 ? 12 : 0), t, 0.03, { pan: r() * 1.2 - 0.6, dly: 0.3 });
  }
  if (layer >= 2) {
    if (s === 0 || s === 10) taiko(t, s ? 0.14 : 0.2);
    if (s === 8) splat(t);
    if (s % 4 === 2 || (layer >= 3 && s % 2 === 1)) grit(t, s % 4 === 2 ? 0.016 : 0.01);
    // the clappers call the next round
    if (bar % 8 === 7 && (s === 12 || s === 14)) clapper(t);
  }
  if (layer >= 3 && (Math.floor(bar / 2) % 2 === 1 || layer >= 4)) for (const n of tune[bar % 8]) if (n.s === s) shami(n.m, t, 0.06, { rev: 0.2, dly: 0.12 });
  if (layer >= 4) {
    if (s === 0 && bar % 2 === 0) for (const x of [0, 7]) tone({ f: midiHz(43 + (root + x + 5) % 12), t, type: 'triangle', a: 0.5, hold: 0.8, d: 2.2, v: 0.03, lp: 700, vib: [0.3, 1.2], rev: 0.4 });
    if (bar % 8 >= 4) for (const n of tune[bar % 8]) if (n.s === s) blub(n.m + 12, t + 60 / bpm / 4, 0.025, { dly: 0.2 });
  }
}
```
