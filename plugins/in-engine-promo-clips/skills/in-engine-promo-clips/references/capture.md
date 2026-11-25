# Capturing frames from the game

The principle in every engine: **the clip owns the clock.** Stop the game's own loop, then for each frame: advance the
game by exactly 1/fps, pose and place everything for this moment, draw, save the image. The render may take a second
per frame; the result still plays at a steady 30 fps, and nothing jumps.

## Browser / WebGL games (`scripts/render_frames.mjs`)

```
node scripts/render_frames.mjs <game url> <script.js> [more.js …] <out dir> [--frames 0,30,90] [--fps 30] [--size 720x1280] [--hide "#hud,.menu"]
```

- Opens the game in headless Chromium (Playwright; `scripts/pw.mjs` finds it, or run
  `npx -y playwright@latest install chromium` once).
- Replaces the page's `AudioContext` with an `OfflineAudioContext` before the game loads, and renders exactly one
  frame's worth of sound per frame, so the game's own sounds land on their frames. Writes `game.wav`.
- Injects your scripts in order (data first, then `assets/cartoon-kit.js`, then your clip script). The clip script
  must define `window.cine = { len, frame(i, fps) }`; `frame` draws everything for frame `i`.
- `--frames` renders only those frames into `<out>/test/` (no sound): use it for contact sheets.
- `--hide` hides HUD elements by CSS selector; your own overlay canvas (`#cine`) stays on top.

What the clip script has to do (see `assets/cine-template.js`):

1. **Reach the game's objects.** Through globals the game exposes, or by importing its modules. Under a Vite dev
   server, import a module by the exact URL the page loaded (look it up in `performance.getEntriesByType('resource')`),
   or you get a second, separate copy and your changes do nothing.
2. **Stop the game's loop** and **take over drawing.** Usually: a pause/stale flag the loop checks, and replacing the
   renderer's draw call with a no-op while keeping your own reference to it.
3. **Step the world** with the game's own update function each frame (`tick(1/fps)`), so its people, particles and
   machines move smoothly.
4. **Wake the game's sound** at frame 0 (dispatch the key or click it waits for), not at page load, or every sound
   scheduled before is piled up at time 0.
5. **Draw** with your own camera, then copy the canvas onto an overlay canvas and draw bubbles, captions and fades on
   it in 2D. The renderer screenshots the page, so DOM overlays work too, but canvas drawing is easier to time.

Gotchas:
- Don't set the scene background to null if the game animates it; draw a sky dome instead.
- Portrait frames are narrow (±11° across at a 40° vertical field of view): aim straight at the subject.
- Hide the game's sprites (badges, markers) and seasonal particles (snow, petals) that read as specks.
- Clone a model's materials before recolouring it, or every copy of that model changes.
- Rendering a second scene in a different game state (another level, a different save): render it as its own run
  and join the frame folders with `scripts/assemble.sh`, cutting the first part on a frame boundary (time × fps an
  integer).
- If the game writes saves, render against a dev server or origin that isn't signed in to anyone's real account.

## Unity

Set `Time.captureFramerate = 30` (or use the Recorder package with "Constant" frame rate). Unity then advances game
time exactly 1/30 s per rendered frame however slow rendering is. Drive the clip from one MonoBehaviour that reads the
timeline; save frames with the Recorder (image sequence) and the audio with the Recorder's audio output, or render
sound offline as here and mix it in.

## Godot

Run with Movie Maker mode (`--write-movie out.png --fixed-fps 30`): fixed time step, frames and audio to disk. Put
the timeline in an autoload script that poses everything in `_process`.

## Unreal

Use Sequencer for the camera and acting, and the Movie Render Queue for a fixed-frame-rate image sequence; export the
audio mix separately and join with ffmpeg.

## Assembly (any engine)

```
ffmpeg -framerate 30 -i frames/%04d.jpg -i sound.wav -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart clip.mp4
```

crf 21–23 keeps a 20 s portrait clip at 4–6 MB. `-movflags +faststart` lets it start playing on a phone before it's
all downloaded.
