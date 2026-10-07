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
