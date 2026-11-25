# Sound for in-engine clips

You can't listen. Everything here is judged by numbers, so measure at each step and say so.

## Voices

1. **Get the files.** Ask for a folder you can read. macOS Voice Memos keep recordings in a protected folder: ask the
   person to drag them out of the app into the folder (each lands as an `.m4a`). QuickTime saves `.mov`.
2. **Convert** to mono 48 kHz WAV: `ffmpeg -i in.m4a -ac 1 -ar 48000 out.wav`.
3. **Find the takes:** `node scripts/takes.mjs out.wav` prints each stretch of speech (start, end, loudness) and an
   envelope line (one character per 50 ms: ` . : | #` from quiet to loud). Several takes in one file show as
   separate bursts.
4. **Ask what each take says**, in order. Never guess: the words go on screen.
5. **Clean each take** (`scripts/voice.sh clean`): trim with ~30 ms margin, de-clip if the peak is at 0 dB (shouting
   into a phone mic clips; `adeclip` repairs it), high-pass at 90 Hz, 15 ms fade in, 40 ms fade out, and a soft
   limiter. Check: `check_audio.mjs` shows 0 clicks.
6. **Other characters from the same voice** (`scripts/voice.sh phone`): pitch ×0.86–1.15 (and speed ×1.1, robocalls
   are brisk) via `asetrate`+`atempo`, band-pass 330–3300 Hz twice for a phone speaker, a mid boost at 1.7 kHz, light
   compression. Each character gets a different pitch.
7. **Level them on the timeline**, not in the files: the main character's calm lines quieter than the shouted ones,
   but the first calm line lifted so it's clearly heard.

## Effects (all in `scripts/sfx.mjs`)

| Effect | Recipe |
| --- | --- |
| Old phone ring | Partials at 1420, 1790, 2860 Hz, a 24 Hz clapper tremolo, bursts of ~0.38 s with 0.08 s gaps. |
| Hang-up beep | 880 Hz, 0.13 s. |
| Phone slammed down | A sine falling from ~130 to 40 Hz, 0.22 s, fast decay. |
| Steam hiss | High-passed noise, then softened (low-pass), swell and decay. |
| Kettle whistle | A sine rising from 1600 to 2250 Hz with 6 Hz vibrato and breath noise, rising with anger; cut dead at the freeze. |
| Record scratch | A sawtooth whose pitch wobbles 260–1560 Hz twice in 0.32 s, plus noise, low-passed. |
| Drone | 55 + 82.5 Hz, slow tremolo, swelling under a silence. |
| Heartbeat | Two low thumps (a 50 Hz sine with a short pitch drop), 0.16 s apart. |
| Kick | A sine falling from ~140 to 45 Hz, 0.5 s, exponential decay. |
| Crash | Low-passed noise, 0.6–0.9 s decay. |
| Rush | Noise whose low-pass opens over 0.3 s, ending on the hit. |
| Pop | A fast upward sweep, 0.09 s. |
| Plop (into water) | A sine falling from ~1200 to 240 Hz in 0.12 s, plus a little noise. |

Rules that keep them clean: every envelope starts and ends at zero (a few ms of attack and release); a tremolo or LFO
on a gain must fade with it; generated noise gets softened (white noise trips click checks and sounds harsh).

## The game's own sound

Record it with the frames (`render_frames.mjs` gives `game.wav`): ambience, splashes, machines. It usually comes out
quiet; lift it ~14–18 dB. Mute the game's music while rendering and add music yourself, unless the game's music is
exactly what you want under a scene (an ending in the game's home area, say). Cut the game's sound dead on a freeze.

## Mixing

- One timeline object drives everything (`mix_example.mjs`). Put voices in their own buffer so you can compute the
  per-frame level for the mouth; put the phone voices in another for talk bars.
- Assemble with ffmpeg `amix` (normalize off), then a limiter at −0.9 dBFS, then a fade over the last 0.3–0.4 s.
- Check the final MP4 with `check_audio.mjs`: clicks (look at where any are: inside a scream or a scratch is fine),
  peak under −1 dB, loudness per second (silence on the freeze, jumps on the hits, a quiet last second).
