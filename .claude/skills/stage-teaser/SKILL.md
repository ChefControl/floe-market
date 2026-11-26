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
end card, `bed.js` a music bed), `takes.sh` to render them all, `edl.json` the edit (version 1; `edl-v5.json` is the current cut: the owner's
script, the 25 s opening, no night scene, ending on the hatch (`h.js`); `edl-v4.json` is the same with the night scene
`k2.js`; `edl-v3.json` goes with the older 15 s opening in git history), `cut.py` to assemble the Steam
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
- **Moves the game doesn't have** (the chef lying down, a lasso, riding a tuna: `examples/trailer/o.js`) are posed in
  the take's script from the game's own models, in `K.pose` (after the game's tick, so its walk cycle doesn't undo
  them; `K.after` runs once the camera's set, to pin page things over the world). The chef has no elbows or knees:
  whole-body tips, hops and arm swings read best. Keep his own automation off while he's in a scene
  (`player.held`, and `tPick`/`tDrop`/`tCatch` kept high), or he fishes and picks fillets up wherever the shot puts him.
- **Acting, or it reads as robots**: the owner's note on the first pass. Give every beat a face and a reason. The
  chef's face for a clip is the game's own face parts (characters.ts `face`: round eyes with pupils that look, brows,
  the "o", the grin, shut and happy eyes) laid over his dot eyes: o.js `face()`. Eyes move before the body; a hop
  lands with a squash; a startle stretches; cut to a close-up for the look. A fish the camera stays on needs its own
  model (`hero-tuna.js`: a smooth bending body, fins, eyes, brows, a mouth), a waterline (the game's `foamRing`) and
  to ride high: the game's pale-bellied fish, half sunk with no foam, read as see-through. A lathe's faces look
  outward only when its profile climbs: built the other way the body is inside-out and the far eye shows through.
- **What the owner rejected in the acting** (so don't try them again): round eyes with whites and pupils on the
  chef ("creepy": grow his own dots instead, `eyes: 'big'`); a glossy fish (matt, as the game is); a jump onto the
  fish in under a second ("too fast and jerky": drag, haul, climb, about two seconds); a life vest ("looks bad"), then the parka itself stained and torn ("replace the parka"): what stuck is the
  game's own summer clothes gone to rags, a rope belt and a straw hat (`Acting().castaway`, picked from three options); open boot soles when he lies down (`soles`).
- **Real play in a trailer** is its own take on the game's camera with the HUD kept (`--keep hud,toast,prompts`,
  `K.cam = null`), the chef walked with the game's joystick (pointer events on the canvas: `g.js` `walkTo`).
  `window.cineType.marks` records when each part starts, for the cut.
- **Motion blur** for a camera that really moves (`K.blur = { n, at(k) }`, kit.js): the frame is drawn `n` times
  with the camera at as many moments across it and the draws averaged on a canvas over the game's. A draw every half
  degree of turn (up to 56: fewer shows as stepped ghost copies on hard edges) smears a whip round the dock cleanly (`t.js`).
- **A time-lapse** is the game's own `applyUnlock(id)` on the beats (not silent: the upgrade pops in, the yacht
  sails in, its sound plays) and `setSeason`; the jump to stage 2 goes in the smear, silently. Leave the game's music
  on for it: the market tune gains its parts as the market grows and the café band takes over, in step with the picture.
- **Leave one upgrade unbought** and the play clip that follows can buy it for real: the Hold ring, "… unlocked",
  and, after the last of stage 2, the game's own "Something is knocking under the dock" (`u.js`, the demo's `?upto=`).
- **A different starting state**: `--init file.js` runs a script before the game loads. `examples/trailer/newgame.js`
  rewrites the demo's `?stage=1` save into a brand new game (a bare dock, no yacht, no auto harpoon).
- **Polish: slice it and look.** Tile every take into a contact sheet (`ffmpeg -vf "select='not(mod(n,10))',scale=640:-1,tile=6x8"`)
  and read the sheets one by one; then hand the same sheets to a fresh subagent with no opinion of yours in the brief
  ("what still looks less than professional, ranked, with the cell") and fix what it finds. It caught what the maker's
  eye had stopped seeing: a customer's mouth hidden behind the counter, a face bleached by the fire, the stand off
  in a corner of the play shot, a same-angle jump cut. What the passes on the store trailer settled:
  - **A sky** (`K.sky`, kit.js): the game's flat sky colour is fine from its own camera and dead in a low wide shot.
    A dome round the camera, the fog colour at the horizon, a pale sun, thin cloud as a flat layer seen from below
    (never `atan` round the dome: its seam shows as a hard edge).
  - **The sea from high up** is cut for its own distance: facets a pixel or two across shimmer like cloth, so the look
    down gets a second sheet with 3.5 m facets (`farSea` in o.js). And a lone floe among thirty needs something to
    find it by (slow rings going out from it).
  - **Light the faces.** A night scene needs a motivated key on whoever the shot is about: the fire's light dimmed
    for close-ups (`fire.set(t, 1, 0.72)`), a lantern under the stand's roof for the customers, a warm light from
    the hatch under Mr. Fugu. A silhouette is a choice for a second, not a state.
  - **Show what he looks at.** "He looks at the fish, then at the customer" is two inserts (the tray in firelight;
    the stand on a long lens), not his head turning with the thing off screen.
  - **The play shots frame the action**, not the chef: near the stand the camera's target slides to between him and
    the queue (`g.js`), from 0.58 of the game's distance. Two pieces of one play take on the same angle are a jump
    cut: run them as one piece, or change the angle for the second (`u.js` goes closer for the game's next toast).
  - **Eyelids, not bars**, for a look through someone's eyes (`K.lids`): black bars read as a film format.
    And bars for a film ending go on at a cut and stay (`k2.js`), never slide in mid-shot.
  - **A smear hides what it passes.** Five seconds of spin blur and nobody saw the market grow: the dock builds in a
    slow, sharp turn (a half-open shutter), then the wind-up and under two seconds of smear (`t.js`).
  - **The game's night is for play.** For a film it needs moonlight (a cool directional and a little ambient, gone at
    the blast) so people and props separate from the deck, and the game's small grey "That night…" becomes the
    clip's own caption (`K.caption`), held long enough to read. Where the game brings a character out of the dark
    slowly, light him as the camera reaches his face (`fugu.shade` in `K.pose`).
  - **Parts of one play take** joined with a 6-frame dissolve read as time passing; a straight cut reads as a
    jump (`Gx` in takes.sh; keep the dissolved frames in the takes' own pixel format, or the cut stalls).
  - **A foreground prop from the game seen close** (a flame cone, a hat brim, a chopping blade hung in the air)
    reads as an error: frame it out or hide it for the shot.
- **Weight, and not looking machine-made** (the owner on the stranded scene: "pace is off, too fast... it looks AI
  generated... missing weight of each action"; `examples/trailer/o.js` is the answer, four review rounds deep). A move
  written as one eased formula reads as a machine however good the easing. What fixed it:
  - **Key it pose to pose** (`Acting().track(keys)`, acting.js): each key is the pose he's in AT a time and how long
    the move into it took, so between keys he HOLDS. A wind-up, the move, a settle and a hold are four keys, never
    left to an easing curve. Heavy things use a slow ease with a little overshoot (`settle`), light things snap (`over`).
  - **Nothing arrives together**: sample his arms a few frames behind his body and each other; never both arms out
    level (a T reads as a default pose); legs stride by distance covered, so feet don't slide.
  - **Nothing happens in one frame.** A turn, a stand, a prop appearing, a fish breaking the surface: each gets 4 to 8
    frames and a reason (his hand goes to the knot before the belt comes off; the water domes before the tuna comes
    through it; the fish starts under the surface, not on it). Reviewers found every one-frame pop.
  - **The world answers him**: the floe dips when he lands, tips toward where he stands, is kicked up by the burst and
    rocks when he's pulled off; the tuna sinks under him; splashes are timed to the contact, not to a round number.
  - **Put him ON the ground.** Measure the surface (rays down onto the mesh, once) and stand him on that; he had been
    14 cm inside the snow for three versions. Lay a soft shade under him that thins as he leaves the ground: the game's
    own shadow doesn't show on snow at full white.
  - **Noise, not sines**, for anything held: breath, shiver in bursts, bobbing ice. A fixed rhythm is the tell.
  - **A held camera** (`operate`, `jolt`, `lag` in o.js): it drifts a little and never the same way, follows where he
    WAS a moment ago, is knocked by a thud and takes half a second to steady. And it must not ride up with a hop.
  - **One screen direction** from the moment two things face each other till the scene ends: after the burst the tuna
    stays on the right in the throw, the close-up, the pull and the ride.
  - **Keep bodies apart.** Check every frame where two bodies meet (he came up the rope through the tuna's tail):
    bring him up the camera's side of it, a body's width clear.
  - **Pace**: open on the place before the person; give the first actions real time (he wakes over four seconds);
    hold each cut-out a full second; pay for added beats by trimming holds elsewhere, and tell the owner the length.
  - **Review on consecutive frames**, not just every tenth: ask the outside reviewer to tile 30 frames in a row for
    each action and read the spacing. Give them the rig's limits (a rigid toy: no knees, elbows or neck) and the
    length budget, or half the notes will ask for a different rig and more time.
- **Sound a laptop and a phone can play** (found by a sound review done from measurements, `examples/trailer/sound-report.py`
  and `bands.py`; nobody in the loop can listen, so measure):
  - **A thud made of a low sine is silence on small speakers** (nothing under 180 Hz on a laptop, 350 on a phone).
    Keep the sine for weight but turn it down, and make the knock itself from a triangle an octave or two up
    (240→150 Hz, 440→230 Hz) and a short band of noise (700→300 Hz). Measure every hit through `highpass=f=180`
    and `f=350` over its first 300 ms: about -18 to -20 dBFS above 180 Hz for the big ones.
  - **Air is brown noise that moves, and it is quiet. Never a held band of white noise.** The owner's first listen
    to a mix that six measured reviews had signed off: "a heavy constant static on the opening... like white
    noise... very harsh on the ear". The wind and sea were two held bands of white noise, raised to about -26 dBFS
    because a review said the bed must "hold". The game's own ambience (`src/ambience.ts`) says why that is wrong:
    steady hiss, even quiet, wears on the ear. Make air as the game does: `K.soft(A, { kind, f, q, smooth })` (brown
    noise, a low filter, a second low-pass on top), its level set EVERY frame from `K.swell(t)` (waves with calm
    between) or a slow noise (gusts, a fire's flicker), about 12 dB under the effects. Splashes: a band round
    1-3 kHz, not high-passed white noise. Check with `examples/trailer/hiss.py <film> [older film]` (2-9 kHz per second): a bed
    should leave that band near silence. And nothing here replaces a listen: ask for one before trusting any bed.
    (`K.bed`, the held white band, stays in kit.js for a short whoosh only. Nothing sounds on a take's first frames:
    start air at 0.12 s. A take with a big gain in the EDL plays the game's OWN wind that much louder: lower the
    gain and raise the take's cues instead.)
  - **The game's own sounds keep going under your quiet.** A busy state of the game (the restaurant) ticks along;
    with the music cut that is all there is in a "silence", and under a logo card. For a take that should be
    quiet call `A.dimWorld(0, 0.03)` on its first frames (not `hushWorld`: game.ts sets that afresh every tick)
    and send the take's own cues out with `bus: 'cue'`, which it leaves alone.
  - **Hits a frame early.** A low tone takes 40-50 ms to reach a quarter of its peak: started on the frame it is
    heard late. Start impacts one frame (34 ms) before their picture.
  - **Don't feed the limiter.** With +17 to +20 dB on a take, a thud at full level takes 7-15 dB of limiting and
    every hit comes out the same size. Step the hits in the script (-6 / -3 / 0 dB), keep only the biggest near the
    ceiling, and check them after the cut. AAC adds about 0.5-1 dB of true peak over the limiter's ceiling:
    `cut.py` limits at 0.74 and adds 1 dB after it, to deliver about -16.4 LUFS at -1 dBTP.
    `examples/trailer/prelimit.py <takes> <edl>` prints each section's peaks BEFORE the limiter against its
    ceiling: get every hit within a decibel of it. When a take is over, lower its gain in the EDL and raise its
    beds in the script by as much; short blips are all peak (2-4 dB down costs nothing); and the game's own
    `SFX.splash` is the peakiest thing there is (for a big hit use filtered noise, `water()` in o.js).
  - **A whoosh lasts as long as its blur.** An attack-then-fade riser is gone a second before the smear is: keep a
    rush under the whole of it (brown noise that flutters, `K.soft`), and leave a third of a second of air before
    the landing.
  - **Quiet is not a dead track.** Digital silence in a "stillness" or under a logo card reads as the sound
    failing: keep a breath of the air (brown, about -40 dBFS) under one, a short tail of room under the other.
  - **A quiet before a hit has to be made**: stop the bed half a second early with a short release, move any small
    cue out of the gap, and start the swell after it. Then measure the gap, full band and above 350 Hz.
  - **Buried cues**: anything under about +8 dB over the bed at its moment (cloth, a sigh, a look) isn't heard.
  - **Splashes need a top** (a band of noise falling 2.6→1.1 kHz over the game's own low splash, `spl()` in o.js):
    not a high-passed hiss.
  - **A rung bell isn't a clock**: jitter each stroke's time and strength.
- **An ending without a reveal** (the owner cut the night scene, the blast and "Hello, Chef."): end on not knowing.
  `h.js`: three thuds that get harder and are NOT evenly spaced, the lid rattling down, about a second of real
  stillness, then the lid lifts onto dark and two glints appear, blink (12 frames on, 3 off, 12 on: any less and
  the blink is a glitch), a held look, and it cuts to black. From this state on the game has a hatch of its own lying
  shut on the same spot: under a lifted lid it shows as a second lid, ring and all. Find it (`instanceof FG.Hatch`)
  and hide it every frame; a black leaf hinged with the lid and lifting half as far keeps the crack dark.
  A card that fades in after black needs a black layer behind it, or it fades in over the live game (l.js).
- **Every frame once.** `cut.py` used to hand ffmpeg a list of single JPEGs: each was read at the image reader's
  25 fps, and the 30 fps film showed one frame twice and skipped the next, every sixth frame, through four
  versions. No still shows it and no contact sheet either. `cut.py` now links the frames into one numbered
  sequence, counts the frames in the master, and `examples/trailer/repeats.py <film> [still ranges]` measures
  frame-to-frame change: run it on every master. (Found by two outside reviewers who measured rather than looked.)
- **The mix, by numbers** (`check-audio.mjs` on the master, per second): the three thuds and the blast are the
  loudest things (about -11 dB mean for their second), music sections sit at -14 to -18, a suspense hold at -25 to
  -28, and the whole at about -16 LUFS. A music entrance 10 dB under the hit before it reads as "the music is
  disconnected": bring the bed up, not the hit down. The click counter fires on any loud transient once a take has
  +20 dB on it: check the take's own `game.wav` at unity (0 clicks) before chasing one.
- **"Nothing but sea"**: the bay's rolling water stops 60 m out and a flat sheet carries on; from high up the edge
  shows, and islands sit in the bay. o.js lays its own sea (the game's `seaGeometry` and sea material) and hides the
  islands for those shots. From high up the game's sea also lines up in rows (a square grid under three regular
  swells): o.js pushes every point about and turns the sheet off the swells' axes. Keep the push small (a few
  centimetres up and down) or the water turns to crumpled foil.
- **One take per place, several shots per take.** A take is one address and one clock; hard cuts inside it are just
  a new `K.cam` path from a given time. Cut takes together in assembly.
- **One beat grid across a music join.** A bed laid to the picture's cut and a take whose own tune enters a moment
  later can be a fraction of a beat apart (0.17 s here: a stumble). Find both tunes' onsets (an energy envelope's
  rises), then move the bed's start so its beats run into the next tune's first beat, and lengthen it to meet it.
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
