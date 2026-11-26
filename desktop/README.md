# Floe Market for Steam: the desktop app

The game in Electron 45 (Chromium 156), for Windows and Linux (the Steam Deck runs the Linux build). It starts
straight into the game, fullscreen at the screen's own size. About 100 MB to download.

- `main.mjs`: the program. It serves the game from `app://floe/` (`links.mjs`), keeps the window on the game, opens web
  links in the player's browser, `steam://` links in Steam, and the licence notices in a window of their own. One copy
  runs at a time.
- `preload.cjs`: the only things the game's page can ask of the program, as `window.floeDesktop`. The page stays
  sandboxed, with no Node.
- `build.mjs`: builds the game into `app/`, then packages the program into `out/`.

## Build and run

```bash
npm ci                        # in the repo root, once
cd desktop
npm ci
node node_modules/electron/install.js   # Electron's own binary, for `npm start` (npm may skip its install script)
node build.mjs --game-only    # the game into app/
npm start                     # play it in a window
node build.mjs                # the app for this computer, in out/
node build.mjs --platform=win32   # for Windows; --platform=linux for Linux and the Deck
```

A test run (`npm start`, or a packaged app started with `--devtools`) takes:

- `--profile=<folder>`: keeps its settings and save in that folder, apart from the owner's;
- `--query=stage=1&sound=off`: opens the game with that address query, as the web build's address would;
- F12 for the developer tools.

A Mac build is only for the owner's own testing; Steam gets Windows and Linux.
