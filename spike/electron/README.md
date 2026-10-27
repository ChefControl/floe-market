# Electron spike (#158)

A throwaway test, not the real wrapper (#159): the game's demo build inside Electron 45 (Chromium 156), to measure
Low and High and try Steamworks. Nothing in the game changes. It lives on its own branch, `claude/steam-electron-spike`.

## Run it on a Mac

```bash
npm ci                    # in the repo root, once
cd spike/electron
npm install
npm run build-game        # the demo build into app/
npm start                 # play in a 1280x800 window (the Steam Deck's screen)
npm start -- --bench --scene=all
```

Scenes: `stage1`, `stage2`, `cellar` (stage 3, nothing beaten), `cellar-full` (stage 3, every boss beaten, all bought).
A bench waits 10 seconds on each of Low and High, then reads the demo panel's frame rate for 30 seconds.

## Windows and the Steam Deck

`npm run package-win` makes `out/FloeMarketSpike-win32-x64/` (zip it to copy). On the Windows PC:

- `FloeMarketSpike.exe` plays the game.
- `run-bench.bat` measures every scene (about 6 minutes), then shows the results and saves
  `floe-electron-bench.txt` on the Desktop.
- `run-steam.bat` starts Steamworks as Valve's test app, Spacewar (480). Shift+Tab tries the overlay. It needs Steam
  running and logged in, plus Valve's SDK: download it from partner.steamgames.com, and put its
  `steamworks_sdk` folder next to the .exe. The SDK is never committed.

On the Deck, in Desktop Mode: copy the folder over, add `FloeMarketSpike.exe` to Steam as a non-Steam game, set
Compatibility to Proton, and add `--bench --scene=all` as its launch options for a bench run.

## Results so far

MacBook Air M4, 1280x800, Electron 45.0.0 / Chromium 156 (2026-10-27):

| Scene | Low | High |
| --- | --- | --- |
| stage1 | 60 fps (162 draw calls, 79k triangles) | 60 fps (166, 91k) |
| stage2 | 60 fps, lowest 51 (1295, 273k) | 60 fps, one dip to 21 when switching (645, 376k) |
| cellar-full | 60 fps (882, 388k) | 60 fps (1319, 563k) |

The M4 is far faster than the targets, so these only prove the wrapper works. The numbers that matter come from a
weak Windows laptop and the Deck.

Steam Deck (AMD Van Gogh, Direct3D 11 through ANGLE), the Windows build run through Proton, 1280x800 (2026-10-27).
Median fps, with the lowest second in brackets:

| Scene | Low | High |
| --- | --- | --- |
| stage1 | 60 (55) | 60 (59) |
| stage2 | 60 (53) | 60 (60) |
| cellar | 60 (60) | 60 (60) |
| cellar-full | 60 (55) | **50 (42)** |

Everything holds 60 fps except stage 3 with every boss beaten and everything bought on High (1413 draw calls, 585k
triangles), which drops to about 50. Low holds 60 there, so the Deck should default to Low or get a lighter High for
the late cellar.
