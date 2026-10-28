---
name: legals-licenses
description: Use to check that everything a Floe Market feature (the current branch against main, or a named PR or branch) brings in may ship in a paid, closed Steam game, and is credited. Covers npm packages (GPL, LGPL, AGPL and other copyleft), fonts, emoji and icons, sounds, music and recordings (copyrighted songs hiding in them), images, textures and 3D models, real people's likenesses, brands and logos, and Settings → Credits & Copyrights. Triggers on "licence check", "license check", "can we use this", "is this credited", "legals-licenses", and is one of the three checks /legals-update runs.
---

# Licence check

Goes through every new or changed asset and dependency in a feature and says, for each, whether its licence allows
commercial use and redistribution and whether the game credits it.

**It reports and proposes. It doesn't edit the credits, remove assets or change packages unless the owner asks.**
Never commit Valve's Steamworks SDK; if the feature adds any of its files, that's a "can't use".

## 1. The feature

Work out what to read, in this order:
- A PR number: `gh pr view <n> --json state,files,mergeCommit` and `gh pr diff <n>`. For a merged PR, `git show <mergeCommit>`.
- A branch: `git diff main...<branch>`.
- Nothing named: the current branch, `git diff main...HEAD` plus `git diff HEAD` for what isn't committed.

List what it brings in: `package.json` and `package-lock.json` changes, and any added or replaced file under
`public/`, `src/sounds/`, `src/` (imported media), `scripts/fonts/` and `scripts/icons/`. Code the game draws or
synthesises itself (three.js scenes, `src/icons/*.ts`, the music in `src/audio.ts`) is the game's own: check only that
it doesn't copy someone else's (a real tune's melody, a real logo).

## 2. The sources of truth

- **npm packages**: `scripts/licences.ts` and the `licences()` plugin in `vite.config.ts`, from PR #209 (#149). The
  build lists the packages it actually bundles (dev tools never ship; the Steam build leaves Firebase out), writes
  `dist/licences.txt` and fills the `<!-- licences: listed by the build (scripts/licences.ts) -->` list under
  **Open-source licences** in `#creditsCard`. It stops on GPL, LGPL, AGPL or a licence it can't read, unless the package
  is in `APPROVED`; `PERMISSIVE` lists what passes. Tests: `test/licences.test.ts`.
- **Fonts**: `public/fonts/*.woff2`, each with its licence beside it (`OFL-*.txt`), built from pinned upstream files by
  `scripts/fonts/build.py`; credited under **Fonts** in `#creditsCard`. From PR #210 (#148).
- **Emoji and icons**: every emoji is the game's own drawing (`src/icons.ts`, `src/icons/*.ts`, built into Floe Emoji,
  `public/fonts/emoji.woff2`). `test/fonts.test.ts` fails on an emoji with no drawing. An emoji or icon from another set
  (Noto, Twemoji, Apple, Font Awesome) is a finding. From PR #210.
- **Recordings**: `src/sounds/*.mp3` (the casino yacht), credited in `#creditsCard` under **The casino yacht's room
  sound** and in docs/game.md's **Sound credits**; `public/sounds/*.mp3` (the ring's crowd), credited in
  `public/sounds/CREDITS.md` and under **The ring's crowd**.
- **Credits & Copyrights**: `#creditsCard` in `index.html` (Settings → ©). `test/ui.test.ts` ("ends with Credits &
  Copyrights…") checks its contents, so a credit change changes the test too.

## 3. The rules

- **Packages.** Find each new package's licence (`node -p "require('./node_modules/<pkg>/package.json').license"`, or
  `npm view <pkg>@<version> license`), and its new dependencies' too (`package-lock.json`). Permissive (MIT, ISC, BSD,
  Apache-2.0, Zlib, CC0, Unlicense…) is OK and the build credits it. GPL, LGPL, AGPL, MPL, EUPL, SSPL, "non-commercial"
  or none is "can't use": Steam needs Valve's agreement for GPL and LGPL, and the game is closed. A dev-only tool is fine
  unless what it makes ships under its licence.
- **Fonts.** OFL 1.1 or Apache-2.0, its licence text shipped beside it in `public/fonts`, and a line under **Fonts**.
  Not "free for personal use".
- **Sounds and music.** CC0 is OK. CC BY is OK with a credit (title, author, licence link, what was changed). CC BY-NC,
  CC BY-ND (the game cuts and loops), "personal use", unknown, YouTube or a ripped track: can't use. Freesound,
  BigSoundBank and OpenGameArt pages show the licence; quote the URL.
- **Copyrighted music hiding in a recording** is the known risk: it happened twice, in the ring crowd's murmur and swell
  (replaced October 2026, `public/sounds/CREDITS.md`) and in the casino's `slots.mp3`, which had "Blijf Bij Mij" by
  Volumia! (replaced in PR #212, #147). Every new or changed recording of people, a room, a crowd, a bar or a casino
  gets flagged for the owner's listen and a music-recognition scan (10 s windows, as on #147), unless that's already been
  done and posted. Say which file and how long.
- **Images, textures, models.** Anything not drawn by the game's code needs its source and licence. Gemini or other AI
  mockups never ship. Store art and screenshots come from the game's own engine.
- **People, brands, songs.** No real person's name or likeness, no real logo or brand, no real song's melody or lyrics
  (the rain crooner stays unnamed for this reason).

## 4. Report

One line per thing brought in, each with one of three verdicts:

```
## Licences: no change | N updates
Target: <PR #n / branch / current branch at <sha>>
- OK: <thing> (<licence>, <source URL>), credited under <section> | credited by the build
- Missing credit: <thing> (<licence>, <source URL>). Add to index.html #creditsCard, <section>:
  "<li>…</li>"  (and docs/game.md / public/sounds/CREDITS.md where the others are)
- Can't use: <thing>: <why>. Replace with: <a named alternative, or what to look for>
- Needs a listen: <file> (<seconds>): a recording of <what>, not yet checked for music
Checked: <what you looked at, one line>
```

A feature that brings in nothing new (code only, drawn or synthesised by the game) is "no change". Match the existing
credit lines' wording: title in quotes, author, linked licence, then what was changed ("trimmed, levelled and made mono").
