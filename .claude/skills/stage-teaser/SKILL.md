---
name: stage-teaser
description: Make a cinematic clip of Floe Market out of the game's own engine — a portrait teaser for a stage, or a landscape 16:9 trailer for the Steam store page — with a scripted camera, the game playing its own scenes on a virtual clock, its own sound and music, captions and an end card, and publish it as a phone-friendly review page. Use when asked for a teaser, trailer, store trailer, sneak peek or clip of the game, or to change one.
---

# Making a stage teaser (or a trailer)

Two shapes, both built from the game itself at 30 fps:

- **A teaser**: a 15–25 s portrait clip (720×1280) plus an end banner over the stage's music, about 23–25 s in all,
  for phones and social posts.
- **A trailer** (landscape, `--landscape`): 1920×1080 H.264 for the Steam store page and festivals, 60–90 s. See
  "Landscape: the store trailer" below.

The user watches on their phone: publish it as an Artifact page (the video, a beat-by-beat list, credits) and also
send the MP4 with SendUserFile.

Render on the **demo build at localhost:5177** (launch config `floe-market-demo`: `VITE_FUGU_DEMO=1`, `--mode demo`),
never on 5175 (signed in to the owner's cloud save). It starts muted under automation: the scripts add `?sound=on`.
Its address picks the state: nothing for Floe Sushi built with Mr. Fugu knocking, `?stage=1` for the ice market,
`?cellar&full&beaten=4` for the cellar with everything bought and Fukure next (fuguDemo.ts lists the rest).

The worked example is "Hello, Chef" (stage 3; `examples/`): at night, a trapdoor is shoved three times and blasts
open into smoke, Mr. Fugu rises up a lit shaft as a silhouette, the light comes up on him, an anime crash zoom onto
his shades with a glint, "Hello, Chef." as a subtitle in the game's toast, a smash cut to black, then the banner over
8 s of the cellar theme.

## The pieces (scripts/)

| Script | What it does |
| --- | --- |
| `pw.mjs` | Finds Playwright (project, global, or npx cache). |
| `render-play.mjs` | **The game playing itself**, frame by frame: its own main loop, cameras and cutscenes on a virtual clock (`clock.js`), its sound rendered in step. `--landscape`, `--ui 1.5`, `--skip`, `--mute`, `--sound-only`, `--keep`. Start here. |
| `clock.js` | The virtual clock (performance.now, Date.now, rAF, timers), injected before the game loads. |
| `game.mjs` | `open({save, keep})`: the game in a given state, HUD hidden, sound tapped, `window.__mod`/`__mods`. `film(page, dir)`: real-time screen + sound capture (overlays included). |
| `render-frames.mjs` | Renders a cinematic script (`window.cine.frame(i)`) a frame at a time on its own clock. `--frames a,b,c` for test shots. |
| `render-game.mjs` | Like `render-frames.mjs`, but the game's AudioContext is an OfflineAudioContext stepped one frame per frame: the game's own sound (ambience, sfx) comes out in sync as `game.wav`. Writes `#teaser`, `#sub` and anything the cine shows. |
| `soundtrack.mjs` | Renders a sound script (`window.soundtrack(cue)`) offline to WAV. |
| `music-record.mjs` | Records a style from the music listening page at a variant and layer. |
| `music-cut.py` | Cuts music near asked-for times at clean points (bar grid, zero crossings, fades); draws the waveform with the cut marked. |
| `analyse-track.mjs`, `groove.mjs` | Measure a reference track: tempo, key/mode, sections, bass roots; groove profile, swing, bass slides. |
| `check-audio.mjs` | Clicks, peak, brightness (centroid), loudness per second or per bar. |
| `banner.html`, `banner.mjs` | The end banner, rendered to an MP4 of any length. |

Examples: `examples/trailer/` (the 16:9 store trailer for #156, 72 s: `kit.js` — the camera override, captions in the
game's banner lettering, letterbox, fades, the flag string taken down — then one script per take (`s1.js` the ice
market, `s2.js` Floe Sushi and the knocking hatch, `k.js` the knock, `fa.js`/`fb.js`/`fc.js` fight night, `e.js` the
end card, `bed.js` a music bed), `takes.sh` to render them all, `edl.json` the edit, `cut.py` to assemble the Steam
master and a phone copy, `camprobe*.js` to try cameras).
`examples/hello-chef-cine.js` (the whole cinematic: night lighting, a real hole, smoke, silhouette, crash
zoom, movie bars, subtitle), `examples/hello-chef-sound.js` (its score), `examples/fight-night-director.js` (a
real-time camera director keyed to a bout's phases, for gameplay shots), `examples/teaser-page.html` (the page).
`examples/fish-market-cine.js` + `stage1-save.mjs` (stage 1, for `render-game.mjs`): gameplay driven on its own clock,
the chef walked with the game's joystick (synthetic pointer events), buying held with `holdBuyButton`, upgrades popped
with `applyUnlock`, a dawn sky dome, the game's toast and tip pill shown as overlays, shot changes on the music's beats.

## Landscape: the store trailer

- **Render with `render-play.mjs --landscape`.** The game stages most of its big moments itself: Mr. Fugu's knock
  (`offer.ts` `meet()`: blinks, "That night…", shoves, the blast, him rising, "Hello, Chef." in his bubble, typed with
  his blips), the gong and the boss's 入場 banner (`gong.ts` `ring()`), the watch camera (a V keydown), the finish (Space
  presses for the push, ↓ on the slow motion for the slam: "BIG SQUEEZE", "SLAM!"). On the virtual clock all of that
  plays exactly as in the game, one frame per step, with its own sound. A take's script only nudges: starts the scene,
  presses keys, and sets `K.cam` for the shots the game doesn't frame (kit.js wraps `camera.lookAt`, so the game's
  bubbles still sit on the people).
- **`--ui 1.5`** (the landscape default): the page is laid out at 1280×720 and drawn at 1.5×, so the game's own
  bubbles, toasts and banners read as they would on a laptop. At 1:1 on 1920×1080 they're tiny.
- **Pin High graphics** (render-play does: `--gfx high`): on Auto the game times the stepped frames, finds them slow,
  and drops to Low part-way through a take.
- **`--skip s`** to get through a wait (a fight's prep is 45–60 s) on the same clock, without saving those frames;
  their sound is cut from `game.wav`. Stepping without screenshots runs at ~100 frames a second.
- **One take per place, several shots per take.** A take is one address and one clock; hard cuts inside it are just
  a new `K.cam` path from a given time. Cut takes together in assembly.
- **Music as beds**: render the game's own music for a place with `--mute sfx,amb --sound-only` and a do-nothing script
  (`examples/trailer/bed.js`), and the takes with `--mute music`; lay the beds under the cut with crossfades at the act
  changes. A scene with its own score (the knock's bass) keeps its music in the take.
- **Words on screen** follow the design system: one caption of 8 words or fewer, plain words, "fight" never "bout",
  in the Banner's lettering (Baloo 2 800, gold `#FFC34A`, 3px ink `#173042` outline and the solid drop). The game's own
  words (toasts, bubbles, the 入場 banner, the finish's) are welcome: they're the game.
- **Steam's specs** (partner.steamgames.com/doc/store/trailer): up to 1920×1080, 30 or 60 fps, a high bit rate
  (5,000+ kbps; their encoder preset is H.264 20 Mb/s with AAC stereo 192 kb/s), .mp4, 16:9. Encode H.264 high
  profile, yuv420p, a constant 30 fps, ~12–20 Mb/s, AAC 48 kHz stereo, `-movflags +faststart`. A custom thumbnail is
  a 1920×1080 .jpg/.png taken from a frame of the video. Keep a small "phone" copy (1280×720, crf 26) for the review
  page. No prices, discounts or release dates that can go out of date; the end card
  says what to do ("Wishlist on Steam").
- **Marketing rules**: no elections, voting, Israel or hot topics; never a straight arm raised forward; never flip the
  chef (no mirrored shots of the player). Floe Sushi's "World famous" campaign strings world flags across the dining
  room with Israel's in the middle: kit.js hides that string in every shot (the demo build has it bought).
- **Edit on the frames, mix on the numbers.** Contact-sheet every take (`select='not(mod(n\,30))',tile=5x6`) to pick
  in and out points; the fight take's `cue.json` marks the phases (sit, fight, push, slow, slam). The game's own
  output is quiet (about −42 dB RMS): lift beds and takes ~+20 dB into a limiter, aim near −16 LUFS integrated, peak
  under −1 dB. The knock hushes the world: lay a low drone under its quiet stretch, or it reads as dead air.
- **Encode from JPEG frames as TV range**: frames come in full range (`yuvj420p`); convert with
  `scale=in_range=pc:out_range=tv,format=yuv420p` and tag bt709, or players and Steam show it washed out or crushed.

## Workflow

1. **Agree the beats** in a few lines (what happens, roughly when). Ask only what changes the plan.
2. **Start the demo build** with preview_start `floe-market-demo` (5177). `.claude/launch.json` is git-ignored, so
   add the config if it's missing: `{ "name": "floe-market-demo", "runtimeExecutable": "env", "runtimeArgs":
   ["VITE_FUGU_DEMO=1", "npx", "vite", "--mode", "demo", "--port", "5177", "--strictPort"], "port": 5177 }` (a fresh
   worktree needs `npm ci` first). Never start servers from Bash, and never render on 5175.
3. **Choose how to capture each part:**
   - *Gameplay with page overlays* (the offer's speech bubble, toasts, choice buttons): `film()` — the screencast keeps
     the DOM, the tap keeps the game's sound, both on one clock (`sync.json`'s `lead`). Warm up anything that appears
     for the first time (a new model or view) before filming, or its shader compile shows as a 1–2 s freeze.
   - *Cinematic shots*: a cine script + `render-frames.mjs`. It draws on its own canvas (#teaser) and can show page
     elements over it (it screenshots the page each frame). Test with `--frames` on a handful of key frames first,
     look at them (tile them with ffmpeg into one picture), fix, then render all.
   - *Stills*: set a camera with a `renderer.render` override and screenshot.
4. **Sound**: compose it offline (`soundtrack.mjs`), keyed to the cine's `window.cineType` timings. Check it
   (`check-audio.mjs`): no clicks, peak under −1 dB, loudness doing what the beats say.
5. **Music**: see "Music" below.
6. **Assemble** with ffmpeg (template below), check the joins and the last second, publish the page, send the MP4.
7. **Keep what the user liked**: when they say they like a version, copy it aside before changing anything, and show
   it on the page under the new one ("The version you liked").

## What the user wants (from review — follow these)

- **Suspense, never released.** No zoom-out after the big close-up (a slow pull-back, even a reverse crash zoom,
  "kills the suspense"). Anime does it like this: opaque white glare on the glasses that stays, a close shot that holds
  or creeps in, darkness round the face, silence, then a smash cut to black at the peak.
- **Stay on the eyes** for the line, with movie bars top and bottom; the background sinks into black (fog to black
  just past the head) for the close-up.
- **No voices.** A voice sets the expectation that characters talk in the game. Lines are text: the game's own toast
  as a subtitle in the bottom bar worked. Cinematic serif subtitles were "too much"; a speech bubble far from the
  mouth looked wrong.
- **Make the villain look big**: light from above on the face and shoulders, legs in shadow (light on the legs "makes
  him look small / weak"); a low camera.
- **Believable, close to the game**: the game's models and look, but it may cheat (lighting, smoke, a real hole the
  game only paints) as long as it reads right. Things must not phase through floors.
- **Steady camera**: lock a close-up's target when the zoom lands; freeze the head while the character "talks" (only
  the mouth moves), or the shot jiggles.
- **Clean background**: nothing flickering, jumping or flying behind the subject (see Gotchas).
- **Music at the end**: the stage's own theme, the cut the user picks by timestamp, starting on a whole hit and never
  cut mid-note; let it play out (they asked for longer, then for the peak at the end, then 1 s shorter — ask, cut,
  show the waveform).
- **No snapshot montages** at the end (removed in favour of just the banner).

## Music

- The user picks music on the "Floe Market Music Styles" artifact (https://claude.ai/artifact/7kqfAuni2AHig4ZTX7jGeh).
  Every style there has a seek slider and plays from a fixed seed, so a timestamp + Layers setting is exact. Ask which
  version and layer if it isn't clear; layer 4 is the full arrangement.
- Record it from the page (`music-record.mjs`), not from the game (the game rolls its random choices differently).
- Cut with `music-cut.py <rec> <bpm> <start> <end> <out>`; look at `-context.png` (green start, red end): a line after
  a spike or inside a sustained band is a bad cut. Picked times usually land mid-bar or in a fill; move to the nearest
  downbeat (start) and the quiet gap before an onset (end), and tell the user how far and why.
- Make the banner as long as the music (`banner.mjs`), mix the music in at the banner's start, and check the last
  frames are silent.
- To change the music itself (more energy, gloopier, after a reference track), add a variant to the style on the
  music page and let the user compare; record a full cycle and run `check-audio.mjs` (clicks, loudness matched to the
  base version, brightness). Reference tracks: the user can share a file (YouTube can't be heard); analyse it with
  `analyse-track.mjs` and `groove.mjs` and take its feel (tempo, mode, root motion, groove shape, bass behaviour,
  brightness, dynamics), never its melody. Keep the gloop bass light (the user preferred the lighter bass).

## Gotchas (each cost a round trip)

- **Module copies**: import game modules with `window.__mod('x.ts')` (the URL the page loaded); a plain
  `import('/src/x.ts')` can be a second copy (Vite's `?t=` stamps), and writes to it change nothing.
- **The world ticks in real time** while frames render slowly, so people and items jump between frames. Stop the
  game's clock (`replaceSave(...)` marks the tab stale, so `tick` stops) and call `GAME.tick(dt)` yourself each frame.
- **Hide what isn't in the story**: `player.g.visible = false`; season weather (`season.ts` `weather` Points — spring
  petals read as pink specks); the game's sprites (order badges); floor decals (upgrade tiles, shop squares).
- **No stencil buffer** in the game's renderer. For a real hole: a plane at the opening with
  `gl_FragDepth = 1.0`, `depthFunc: AlwaysDepth`, `colorWrite: false`, `renderOrder 1`, then the shaft and everything
  that belongs to the hole at `renderOrder 2`; hide the painted hole.
- **Shared materials**: clone a model's materials before darkening it (silhouettes), except the ones its own code
  animates (Mr. Fugu's lens glint).
- **Lighting a night scene**: hemi/sun low and blue; key lights per beat; a light inside the hole lights the smoke;
  a narrow spot from above for the face. Smoke as sprites with soft round-masked textures, coloured by whether they're
  inside the light column, and thinned between the camera and the subject; an additive back-faced cone for light rays.
- **Screencast frames** only come when the screen changes: hold the last one (concat lists need the last file twice).
- **canvas.captureStream / toDataURL** miss the page's overlays; screenshot the page instead when overlays matter.
- **ffmpeg here has no drawtext**: draw text in the page (canvas or DOM). `showwavespic` + `drawbox` (colour `@1`)
  for waveform pictures.
- **Game sound in a frame render**: the game's AudioContext must start when the cine starts (dispatch a Shift keydown
  then), not at page load, or everything scheduled before is piled up at t=0. Mute the game's music (`prefs.mute.music`)
  and mix the music page's recording in afterwards. Its sfx come out quiet (about -20 dB peak): lift them ~14 dB.
- **`scene.background = null`** breaks the game (it lerps that colour); draw a sky dome over it instead.
- **Portrait frames are narrow** (about ±11° across at fov 40): aim straight at the subject, or it's out of shot.
  Landscape is the opposite: 16:9 at fov 40 is ±35° across, so a close shot shows a lot of the set either side.
- **Lanterns and posts in front**: the cellar is full of hanging lanterns, ropes and gong frames; probe a camera with
  a handful of `--frames` before writing a move (examples/trailer `camprobe.js` takes a list of cameras in the
  address's #hash, one per 10 frames).
- **The sun follows the chef**, so its shadows are only drawn round them: kit.js moves it over what the camera's on.
- **Fog** is set from the game's zoom each frame (34–70 m): a wide shot needs `fogNear`/`fogFar` in its `K.cam`.
- **Customers' exit paths** cross the street side of the counter: keep the camera off them.
- **zsh**: `$VAR:c…` is a modifier and `$VAR[x]` a subscript inside filter strings — write `${VAR}`.
- **An LFO on a gain param** keeps sounding after the gain ramps to 0 — ramp the LFO's depth down too.
- **Clicks** check: explosions and noise bursts trip it legitimately; look at where the hits are before "fixing".
- **Can't listen**: judge sound by numbers (levels per bar, centroid, clicks, groove profile) and say so; offer the
  user a quick next step if it misses.

## Assembly (template, portrait teaser; the landscape trailer's is examples/trailer/cut.py)

```bash
ffmpeg -y -framerate 30 -i out/frames/%04d.jpg -f lavfi -t 0.8 -i "color=c=black:s=720x1280:r=30" \
  -i out/banner.mp4 -i out/sound.wav -i out/music.wav -filter_complex "
[0:v]format=yuv420p,setsar=1[vc];[1:v]format=yuv420p,setsar=1[vb];[2:v]format=yuv420p,setsar=1[vn];
[vc][vb][vn]concat=n=3:v=1:a=0[v];
[4:a]aresample=48000,volume=6dB,aformat=channel_layouts=stereo,adelay=${BANNER_MS}|${BANNER_MS}[mus];
[3:a]volume=1.5dB[s];[s][mus]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.92:level=false[a]" \
  -map "[v]" -map "[a]" -t ${TOTAL} -c:v libx264 -preset slow -crf 21 -r 30 -c:a aac -b:a 192k -movflags +faststart teaser.mp4
```

`BANNER_MS` = (cinematic length + 0.8 s of black) × 1000; `TOTAL` = that + the music's length + a few frames.
Keep the MP4 under ~10 MB (crf 21–22) so the page loads quickly on a phone.
