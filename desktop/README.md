# Floe Market for Steam: the desktop app

The game in Electron 45 (Chromium 156), for Windows and Linux (the Steam Deck runs the Linux build). It starts
straight into the game, fullscreen at the screen's own size. About 100 MB to download.

- `main.mjs`: the program. It serves the game from `app://floe/` (`links.mjs`), keeps the window on the game, opens web
  links in the player's browser, `steam://` links in Steam, and the licence notices in a window of their own. One copy
  runs at a time.
- `preload.cjs`: the only things the game's page can ask of the program, as `window.floeDesktop`. The page stays
  sandboxed, with no Node.
- `saves.mjs`: the game's save, as files in `<userData>/saves/` (on Windows `%APPDATA%\Floe Market\saves`, on Linux
  `~/.config/Floe Market/saves`), the folder Steam Cloud will sync. Each save is written to a temporary file, flushed to
  the disk and renamed over `save.json`, so a crash mid-save leaves the old save or the new one, never half. It rolls
  into three backups (`save.1.json`, newest, to `save.3.json`) when the game starts and every ten minutes; if
  `save.json` is ever unreadable, the newest good backup stands in. The page reads the save once as it starts, writes
  it in the background, and there and then as the window closes (Alt+F4 too). Settings stay in the page's own storage,
  per device.
- `build.mjs`: builds the game into `app/`, then packages the program into `out/`. On Linux it adds `floe-market.sh`,
  Steam's launch option there: it starts the game with Chromium's sandbox, and if the game stops with an error before it
  has ever started with it (inside Steam's Linux runtime the sandbox's user namespaces may not be allowed), it notes that
  in the player's settings folder and starts without it from then on. The page only ever shows the game's own files.
- `notices.mjs`: what the app adds to the open-source licences in the credits: Electron, Chromium (its notices for
  everything it includes open from the list) and FFmpeg (LGPL, a separate library a player can swap). A test build only
  warns that FFmpeg waits for Valve's OK; `--release` stops on it.
- `steam/upload.mjs`: the build script for Steam's uploader. CI builds both apps on every pull request and merge, and
  uploads them to Steam's beta branch once it's set up: [docs/steam-upload.md](../docs/steam-upload.md).

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
