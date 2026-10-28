# Testing on phones

Most players are on phones, so a bug report from an iPhone or an Android phone should be tried on one. This Mac has an
Android emulator (a Pixel 9 with Chrome) and the iPhone simulator (Safari). Claude Code can drive both: ask it to
"test on Android" or "test on iPhone" and it follows `.claude/skills/mobile-test/SKILL.md`.

## One step

```bash
.claude/skills/mobile-test/android.sh            # the demo build in Chrome on the Pixel 9
.claude/skills/mobile-test/ios.sh                # the demo build in Safari on the iPhone 17
.claude/skills/mobile-test/ios.sh https://chefcontrol.github.io/floe-market/   # the live game
```

The default page is the demo build on `localhost:5177`: it never touches the cloud, so tests can save freely. Start it
first (or from the launch config `floe-market-demo`, if your `.claude/launch.json` has it). Never test on 5175, which
is signed in to the real cloud save.

```bash
VITE_FUGU_DEMO=1 npm run dev -- --port 5177 --strictPort
```

## Android

- **What's installed**: Android Studio (Homebrew cask `android-studio`), the SDK in `~/Library/Android/sdk`
  (platform-tools for `adb`, the emulator, `cmdline-tools`, and the Android 17 Google APIs image), and an emulator
  called `floe-pixel9`: a Pixel 9 with 4 GB of memory. Chrome's welcome screen is skipped with a test-only switch.
- **Opening the Mac's pages**: `android.sh` runs `adb reverse tcp:5177 tcp:5177`, so `localhost:5177` in the
  emulator is the Mac's. (The emulator can also reach the Mac at `10.0.2.2`, but that isn't a secure context, and a
  dev server that only listens on `[::1]` doesn't answer there.)
- **Console errors**: open `chrome://inspect` in Chrome on the Mac and press "inspect" under the emulator's tab, or let
  Claude Code use the `chrome-devtools` MCP server (in `.mcp.json`), which reads the console and network and takes
  screenshots through the same connection (`adb forward tcp:9333 localabstract:chrome_devtools_remote`).
- **Graphics**: the emulator draws with a software GPU. With the Mac's GPU, Chrome's WebGL breaks on Android 17
  (a blank world, or "Error creating WebGL context"), which looks like a game bug but isn't. A software GPU doesn't
  run out of memory like a phone's, so a WebGL bug that needs a small phone may not show here. Chrome's own log is
  `adb logcat -s chromium`.
- **Chrome's version**: it comes with the image and doesn't update. `chrome://version` shows it.
- **Android Studio**: not needed for the scripts. Its Device Manager shows the same `floe-pixel9` emulator, to start it
  by hand or make another phone.

## iPhone

- **What's installed**: Xcode's iOS Simulator with iPhone 17 (and other models: `xcrun simctl list devices`).
- **Opening the Mac's pages**: the simulator shares the Mac's network, so `localhost:5177` just works.
- **Console errors**: `ios.sh` turns on two Safari settings that copy the page's console into the simulator's system
  log and streams it to `$TMPDIR/floe-mobile/ios-console.log`. By hand: Safari on the Mac → Develop menu →
  Simulator → the page, for the full Web Inspector (turn on Settings → Advanced → "Show features for web developers").
- **Screen**: Claude Code uses the desktop app's iOS Simulator panel to watch, screenshot and tap.

## Shell

The scripts set their own PATH. To have `adb` and `emulator` in every terminal, add this to `~/.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```
