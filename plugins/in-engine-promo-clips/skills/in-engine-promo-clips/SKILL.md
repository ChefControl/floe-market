---
name: in-engine-promo-clips
description: Make short promo clips, trailers, teasers and comedy sketches out of a game's own engine (scripted camera and acting, a frame-by-frame render with the game's own sound, voice recordings, synthesised sound effects, crash-in captions and an end card) and get them through review fast. Use whenever someone wants a trailer, teaser, promo, reel, story or short-form clip, a funny sketch or a social video of their game, or wants to fix one ("his face doesn't match the line", "the caption is too soft", "the ending is weak", "the background is distracting"), in any engine (ready-made tools for browser/WebGL games), even if they never say "in-engine".
---

# In-engine promo clips

A clip built from the game itself (its models, its world, its sound), staged like a short film: a camera you script,
characters you make act, sound you lay out on one timeline, captions and an end card. It's believable because it *is*
the game, and cheap to change because every frame is code. You may cheat freely (extra lights, props, a wall behind
someone, a face that emotes) as long as it reads as the game.

Default output: a portrait 720×1280, 30 fps MP4 under ~10 MB (stories, reels, shorts), plus a page or message where
the person can watch it and say what to change. Landscape 1920×1080 for trailers and store pages.

## Setup and a two-minute try

Needs Node 18+, ffmpeg, and Playwright's Chromium (`npx -y playwright@latest install chromium` once). To see the
whole pipeline work before touching a real game, run it on the stand-in game in `assets/` (from a scratch folder):

```
node <skill>/scripts/mix_example.mjs clips out          # no clips yet: effects only, plus out/timeline.js
node <skill>/scripts/render_frames.mjs file://<skill>/assets/demo-game.html out/timeline.js <skill>/assets/cartoon-kit.js <skill>/assets/cine-template.js r --hide "#hud"
bash <skill>/scripts/assemble.sh demo.mp4 17.4 out/fx.wav r/frames:0:521:r/game.wav:6
```

## The loop

1. **Agree the beats in one message.** Ask every open question at once, numbered, each with your recommendation:
   the story in beats with rough times, whose voices (see "Voices and rights"), where it happens in the game, format
   and length, sound (effects, music), the captions word for word, the end card, and where their files are. Plain
   words, no jargon. People answer fastest when they can just say "all as recommended".
2. **Write the timeline once.** One object of named times (`ring1`, `hello1`, `freeze`, `punch`, `endCard`, `end`)
   that both the picture script and the sound script read. When a voice take is longer than planned, the timeline
   changes in one place and the picture follows. Lay voices first, then build the picture around them.
3. **Choose how to capture.** Browser/WebGL game: `scripts/render_frames.mjs` (see `references/capture.md`). Other
   engines: the same idea with the engine's fixed-timestep frame capture (also in `capture.md`).
4. **Test key frames before rendering everything.** Render 6–12 frames at the beats that matter, tile them into one
   contact sheet (`ffmpeg ... tile=6x2`), look at it, fix, repeat. A full render costs minutes; a contact sheet costs
   seconds. Most of the work happens here.
5. **Render, mix, assemble, check** (see "Before you show anyone").
6. **Show it and iterate.** Put the video, a beat-by-beat list and credits where they can watch it, and send the MP4
   itself. When they say they like a version, copy it aside before changing anything and keep showing it under the
   new one ("the version you liked"). Expect 5–8 rounds; each round should change only what they asked for.

## Story and comedy timing

Short clips live or die on timing. Read `references/comedy-timing.md` for the patterns; the short version:

- **Escalate by repetition with a twist.** The same event three to six times, each faster and bigger than the last,
  then a break (the scream, the freeze). The first one plays out in full so the viewer gets the joke; the later ones
  get cut off.
- **Freeze on the peak**, with a record scratch and silence. The silence is what makes the next hit land.
- **Captions crash in, they don't fade.** A fade reads as a mood; a slam reads as a punchline. Big, bold, on a dark
  band across the screen, a hit in the sound, a flash and a few frames of shake. The punchline goes in the middle of
  the screen, bigger than everything before it.
- **End on the payoff, not a logo card.** Cut from the punchline to the game's nicest place with the character
  finally calm doing the thing the punchline promised; the logo comes in over it. Give it 4–6 s: people want to sit
  in the payoff for a moment.
- Mock 3–4 end cards as stills and let them pick before animating one (`scripts/shoot_cards.mjs`).

## Making characters act

Game characters are usually built to walk, not to emote. Add a thin acting layer on top, in the clip's script only,
never in the shipped game. `assets/cartoon-kit.js` has these ready for three.js; `references/character-acting.md`
explains each and how to port it:

- **A face that matches every line:** brows (their angle carries most of the emotion), a mouth that opens with the
  voice's loudness frame by frame (lip flap from the audio, no lip-sync tool needed), and a "mood" curve over the
  timeline that every feature reads. If the caption says angry, the face must say angry, at that moment.
- **The cartoon anger kit:** red rising from the chin to the top of the head, steam puffs from the ears, a lean in
  when yelling, a kettle whistle climbing in the sound and stopping dead on the freeze.
- **Props in hand:** place a held prop where it's used (a phone at the ear, a ladle in the pot), not at the hand plus
  an offset; turn it a little toward the camera so it reads. Size a tool to the reach so it never pokes through
  something.
- **One performer, many characters:** if a single person voices several parts, shift each part's pitch and filter it
  differently (a phone speaker, a radio) so they sound like different people.

## The set

- **A plain backdrop beats hiding things one at a time.** Put a simple wall (wood, tiles, a curtain) close behind the
  subject, then hide floor markings, signs, HUD-in-world sprites and anyone walking past. Viewers' eyes go to
  anything that moves or has text.
- **Turn off the game's own automation** that would interrupt the shot (auto-fishers, spawners, weather, ambient
  crowds). Look for one state lever (a capacity, a timer, a flag) rather than editing game code.
- **Food and props must look believable at close range.** An open pot shows its contents (closed cylinders have lids);
  ingredients are recognisable shapes, partly submerged, moving with the stir; a surface texture (broth, oil glints)
  does more than more geometry.
- **Light the face.** World lights usually sit behind and above; add one soft key light from the camera side.

## Voices and rights

- **Real people's voices, names and words need permission.** Recorded calls, interviews or clips of real public
  figures in a game ad read as endorsement or as political, and some countries restrict this (around elections
  especially). Recommend invented parody characters instead: the person records made-up lines, or a voice tool
  speaks them with a stock voice under a plan that allows commercial use. Say why plainly; let them decide.
- **Get a transcript of every take.** You can't hear the recordings. Ask what is said in each file, in order, and use
  those exact words in any speech bubble or subtitle. Guessing the words is the most embarrassing mistake possible.
- Phone recordings on macOS (Voice Memos) live in a protected folder; ask the person to drag them to a folder you
  can read.
- Details (trimming, de-clipping, the phone filter, pitch shifting, levels): `references/sound.md`.

## Sound

Build the whole soundtrack offline on the clip's timeline (`scripts/sfx.mjs`, `scripts/mix_example.mjs`): voices,
synthesised effects (rings, beeps, slams, steam, kettle, record scratch, drone, heartbeat, hits, splash), the game's
own sound captured with the frames, and music under the ending. Judge it by numbers since you can't listen:
`scripts/check_audio.mjs` for clicks, peak and loudness per second. Say plainly that you judged by numbers and offer a
quick change if it misses.

## Before you show anyone

- Contact sheet of the beats, and of the seams where separately rendered parts meet.
- `check_audio.mjs` on the final MP4: no clicks (or only inside screams and noise, which trip it legitimately), peak
  under −1 dB, the last second silent, the loudness doing what the beats say (silence on the freeze, a jump on each hit).
- The last frame is black (or the end card), not a stray frame of something else.
- Length and size: ~15–25 s and under ~10 MB for social; tell them the actual length when it differs from the plan.
- Every word on screen spelled right, in the right language and direction (right-to-left scripts need a font that
  has them and `direction = 'rtl'`).

## Pitfalls that each cost a round trip

- **The camera inside something.** A camera placed by offsets can end up inside a building or a big prop. Test one
  frame before writing more.
- **The game ticks in real time** while frames render slowly, so things jump between frames. Stop the game's own loop
  and step it yourself, `dt` per frame.
- **Shader compile freezes**: anything appearing for the first time stutters. Warm it up before frame 0.
- **Small props vanish:** a phone at true scale is a few pixels in a medium shot. Scale props up 1.5–2× and give
  them a colour that stands out.
- **Captions over faces:** keep floating icons away from the face even when the camera zooms (push them out to a
  multiple of the head's size on screen).
- **Clipped source audio:** shouted takes are often clipped in the recording. De-clip before anything else.
- **Synth noise trips the click check:** soften generated noise (a low-pass) and start every envelope from zero.
- **Background music under dialogue fights it.** Keep music for the ending, or very low.
- **Temporary folders get cleaned.** Keep the clip's scripts somewhere permanent (or commit them) once a version is
  liked.

## Files

| File | What it does |
| --- | --- |
| `scripts/render_frames.mjs` | Renders a browser game a frame at a time on the clip's own clock with your scripts injected; the game's Web Audio comes out in sync as a WAV. |
| `scripts/check_audio.mjs` | Clicks, peak, brightness and loudness per second of any audio or video file. |
| `scripts/takes.mjs` | Finds the takes in a recording (start, end, loudness) and prints an envelope you can read. |
| `scripts/voice.sh` | ffmpeg recipes: clean a take (trim, de-clip, fades), phone voice (pitch, speed, band-pass). |
| `scripts/sfx.mjs` | Synthesised effects that start and end without clicks. |
| `scripts/mix_example.mjs` | A worked timeline: voices + effects into one WAV, plus per-frame voice levels for the mouth. |
| `scripts/assemble.sh` | Joins frame folders from separate renders and the sound into the MP4. |
| `scripts/shoot_cards.mjs` | Screenshots each variant of an HTML end-card page as a still. |
| `assets/cartoon-kit.js` | three.js acting layer: brows, voice-driven mouth, red rise, ear steam, held props, crash captions. |
| `assets/cine-template.js` | A clip script skeleton: clock, camera, overlay canvas, freeze, captions, fades. |
| `assets/demo-game.html` | A stand-in game (three.js) to try the pipeline on, exposing `window.GAME` as the template expects. |
| `references/capture.md` | Rendering details for browser games, and how to do the same in Unity, Godot or Unreal. |
| `references/character-acting.md` | The acting layer explained, with numbers that worked. |
| `references/comedy-timing.md` | Beat patterns, caption styles, freeze frames and endings, with a worked example. |
| `references/sound.md` | Voices, effects, mixing and checking, step by step. |
