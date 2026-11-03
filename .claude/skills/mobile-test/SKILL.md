---
name: mobile-test
description: Use to try Floe Market on a phone on this Mac, to reproduce a bug a player reported from a phone (iPhone Safari or Brave, Android Chrome), or to check a change on mobile before it ships. Opens the game in Chrome on the Android emulator or in Safari on the iPhone simulator in one step, then screenshots it, taps it and reads its console errors. Triggers on "mobile test", "test on Android", "test on iPhone", "on my phone it…", "reproduce on mobile", "Android Chrome crash", "Safari bug".
---

# Mobile test

Most players are on phones: iPhones (Safari and Brave, both WebKit) and Android Chrome. This opens the game on a
phone-sized device on the Mac and gives Claude Code its screen and its console. The how-to for people is
`docs/mobile-testing.md`; this file is the short version for Claude.

## Which page

- **Your change, or any test that saves**: the demo build at `http://localhost:5177/`. It never signs in to the cloud.
  Start it with `preview_start` on a launch config running `VITE_FUGU_DEMO=1 npm run dev -- --port 5177 --strictPort`
  (`floe-market-demo`; `.claude/launch.json` isn't in git, so add it if it's missing). Never test on 5175: it's signed
  in to the owner's real cloud save.
- **What players get**: the live game, `https://chefcontrol.github.io/floe-market/`. Look, don't play far: the
  devices aren't signed in, so it's a fresh local game, but don't press sign-in or sync buttons.

## Android (Chrome on a Pixel 9 emulator)

```bash
.claude/skills/mobile-test/android.sh [url]
```

It starts the `floe-pixel9` emulator (Pixel 9, Android 17, 4 GB) if it isn't running, opens the url in Chrome, and
connects Chrome's DevTools to `http://127.0.0.1:9333`. A localhost url reaches the Mac through `adb reverse`, so the
emulator uses `localhost:5177` like the Mac does (not `10.0.2.2`, which isn't a secure context and isn't reached by a
dev server that only listens on `[::1]`).

- **Console, network, JS, screenshots**: the `chrome-devtools` MCP server in `.mcp.json` (Google's
  chrome-devtools-mcp). Run `android.sh` first: the server connects to Chrome's DevTools on 9333 when a tool is first
  used. `list_console_messages` for errors, `take_screenshot` for the page, `evaluate_script` to read game state.
  It only hears messages logged after it connects: to catch errors while the game loads, `navigate_page` with
  `type: "reload"` first. If it says it can't connect, run `android.sh` again.
- **Whole screen** (Chrome's own UI, Android dialogs): `adb exec-out screencap -p > shot.png`, then read the png.
- **Tap / type**: `adb shell input tap X Y` (pixels of the screencap), `adb shell input text '...'`, or the MCP's
  `click` / `fill` on the page.
- **Chrome's own log** (GPU process, WebGL context lost, crashes): `adb logcat -d -s chromium cr_*`.

## iPhone (Safari on the iPhone 17 simulator)

```bash
.claude/skills/mobile-test/ios.sh [url]
```

It boots the simulator, turns on Safari's "page messages to system log" settings, opens the url and streams every
console message to `$TMPDIR/floe-mobile/ios-console.log`. Lines read
`… http://localhost:5177/src/x.ts:12:3: CONSOLE ERROR message` (also `LOG`, `WARN`, `DEBUG`, `JS ERROR`).
`ios.sh stop` ends the stream.

- **Screen and taps**: the desktop app's iOS Simulator panel (`mcp__Claude_Code_iOS_Simulator__control`): `attach`
  to show it, then `screenshot`, `tap`, `swipe`, `text`, `open_url`.
- **Errors**: `grep -E 'CONSOLE (ERROR|JS ERROR|WARN)' "$TMPDIR/floe-mobile/ios-console.log"`.
- Each `openurl` opens a new tab; if two tabs run the game it shows "open in another tab". Press "Play here instead".
- Brave on iPhone is WebKit too, so Safari stands in for it.

## Graphics on the emulator

The emulator draws with a software GPU (`swiftshader_indirect`), the only mode where Chrome's WebGL works on Android 17
on this Mac (checked 2026-10-28). With the Mac's GPU it goes wrong in ways that look like player bugs but aren't:

- `ANDROID_GPU=host`: the HUD shows over a blank world, with no console error; Chrome's GPU process dies every second
  (`adb logcat -d | grep "Child process died"`).
- `-gpu host -feature GuestAngle`: the game's red "Something broke: THREE.WebGLRenderer: Error creating WebGL context."
  That's handy for checking the game's own error screen, nothing more.

A software GPU also never runs out of GPU memory the way a phone does. To check a low-memory WebGL bug, look for the
game's own causes (context count, texture sizes, `webglcontextlost`) rather than waiting for the emulator to crash.
Switching modes needs the emulator restarted: `adb emu kill`, then `android.sh`.

## Good to know

- One emulator and one simulator at a time is plenty; leave them running between tests, the scripts reuse them.
- The emulator's Chrome comes with the image and can't update (Google APIs image, no Play Store), so it's older than
  most players'. Check `chrome://version` when a bug depends on the version.
- Screenshots of either device are for you to read; save the ones that prove something to the scratchpad and send
  them to the owner with `SendUserFile`.
