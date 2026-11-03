---
name: licence-check
description: Check that everything a change brings into a project (a branch against main, a PR, or uncommitted work) may legally ship the way the project ships (a paid closed app or game, a store release, an open-source repo) and is credited. Covers packages and their licences (GPL, LGPL, AGPL, MPL and other copyleft, non-commercial and source-available), fonts, emoji and icon sets, sounds, music and recordings (with copyrighted songs hiding in them), images, textures, 3D models, AI-generated assets, real people's names and likenesses, brands and logos, platform SDKs, and the credits or third-party notices screen. Use whenever someone asks for a licence or license check, "can we use this", "is this credited", "what do we need to credit", "is this font/sound/model OK for commercial use", before a release or store submission, or when reviewing a PR that adds dependencies or assets.
---

# Licence check

Goes through every new or changed dependency and asset in a change and says, for each, whether its licence allows the
way the project ships, and whether the project credits it.

**It reports and proposes; it doesn't remove assets, change packages or edit the credits unless asked.** It's not legal
advice: say so once, and say when something needs a lawyer or the rights holder's written OK.

## 1. How the project ships

The verdicts depend on it, so settle it first. Look for it (README, LICENSE, store pages, build scripts, CLAUDE.md or
memory) and ask only what you can't find, in one question. When you can't ask (running as a subagent or in CI),
say what you assumed in the report's "Ships as" line instead.

- **Closed and commercial** (a paid or free-with-purchases app or game, source not shared): copyleft that would force
  the source open is out; anything "non-commercial" is out.
- **On a store with its own rules** (Steam, the App Store, Google Play, console stores): as closed, plus the store's
  rules. Steam, for example, needs Valve's agreement for GPL/LGPL code in a game; Apple's terms clash with GPL.
- **Open source under licence X**: each dependency's licence must be compatible with X (GPL code can't go into an
  MIT project's distributed build without the whole becoming GPL; Apache-2.0 into GPL-2.0-only is a known clash).
- **Internal only** (never distributed): most licences allow it; non-commercial terms may still bite in a company.

A project that ships more than one way (a free web build now, a store release next) is judged by the strictest. Judge
by how it ships now or next, not how it shipped when an older change landed: an old asset still ships today.

Also find **where credits live**: a credits or "about" screen, a `CREDITS`, `NOTICE`, `THIRD_PARTY_NOTICES` or
`licenses.txt`, a build step that writes one, tests that check it. Note each so the report can say exactly where a
credit goes. Read the project's own `LICENSE` and README licence section too: when they claim "all rights reserved"
over the whole repo, every third-party file needs a carve-out there ("the fonts in `fonts/` are under the OFL").

## 2. The change

Work out what to read:
- A PR number: `gh pr view <n> --json state,files,mergeCommit` and `gh pr diff <n>`. For a merged PR, read it as of
  its merge commit `M`: `git diff "${M}^1" "${M}"` (right for squash and true merge commits alike; `git show` on a true
  merge prints a combined diff that hides most of it), and files as they were with `git show "${M}:<path>"`. Brace the
  variable: in zsh `$M:s…` or `$M:h…` is a history modifier and silently breaks the path.
- A branch: `git diff main...<branch>` (use the repo's default branch).
- Nothing named: the current branch, `git diff main...HEAD` plus `git diff HEAD` for what isn't committed.

List what it brings in:
- **Dependencies:** lockfile and manifest changes. For npm, `node <skill>/scripts/new_packages.mjs <base>` lists added
  and upgraded packages with licence, kind and whether they ship (`<base>..<head>`, e.g. `M^1..M`, compares two
  commits without touching the working tree). Others: `pip-licenses` (Python), `cargo license`
  (Rust), `go-licenses` (Go), `license_finder` (many), the Asset Store / Fab / addon page for Unity, Unreal and Godot
  assets. Include new *transitive* dependencies: they ship too.
- **Tools no manifest lists:** read new or changed build scripts, CI files and Dockerfiles for `pip install`, `npx`,
  `curl`/`wget` downloads and pinned upstream files. A font or icon pipeline that fetches its sources and installs its
  own tools brings in both, and what it outputs ships.
- **Files:** every added or replaced font, image, texture, model, sound, music file, video, icon or emoji set, and
  anything vendored (copied-in code, `vendor/`, `third_party/`, minified libraries).
- What the project generates itself (code that draws, synthesises or procedurally builds things) is its own: check only
  that it doesn't copy someone else's work (a real tune's melody, a real logo traced in code).

## 3. The rules

**Code and packages**
- Permissive (MIT, ISC, BSD, Apache-2.0, Zlib, 0BSD, CC0, Unlicense): fine almost everywhere; keep the copyright and
  licence text in the credits or notices. Apache-2.0 also wants its NOTICE file passed on.
- Weak copyleft (LGPL, MPL, EPL): usable in closed software only under conditions (dynamic linking or a replaceable
  library for LGPL, file-level source for MPL). In a bundled web or mobile build those are hard to meet: treat as
  "needs a decision", say why.
- Strong copyleft (GPL, AGPL) in anything that ships closed: can't use. AGPL also reaches software used over a network.
- Non-commercial or source-available (CC BY-NC, SSPL, BUSL, Commons Clause, "free for personal use"): can't use
  commercially.
- No licence at all means all rights reserved: can't use until the author grants one.
- A dual licence ("MIT OR GPL") lets you pick the friendlier one; say which.
- Dev-only tools (test runners, bundlers, linters) don't ship, so they don't count, unless what they generate ships
  under their licence (some code generators, some font tools).
- Platform SDKs (console SDKs, Steamworks, proprietary engine sources) are licensed to you, not to the public: never
  commit them to a public repository.

**Fonts**: OFL 1.1, Apache-2.0 or a commercial licence that covers embedding in apps/games. Ship the licence text
beside the font and credit it. "Free for personal use" and "demo" fonts can't ship. Web fonts served from a CDN still
need the right licence for an app bundle.

**Emoji and icon sets**: each set has its own terms. Twemoji (CC BY 4.0: credit needed), Noto Emoji (OFL/Apache: fine
with notice), OpenMoji (CC BY-SA: share-alike applies to the images), Font Awesome Free (icons CC BY 4.0, fonts OFL,
code MIT), Apple's and Microsoft's system emoji (can't be bundled; rendering them through the user's own system font is
fine). Note which a change uses.

**Sounds and music**
- CC0: fine. CC BY: fine with a credit (title, author, licence and link, what was changed). CC BY-SA: share-alike; ask.
- CC BY-NC, CC BY-ND (a game that cuts and loops sounds is making a derivative), "personal use", unknown, ripped from
  YouTube or a streaming service: can't use.
- Quote the source page (Freesound, OpenGameArt, BigSoundBank and the like show the licence per file).
- **Copyrighted music hiding in a recording** is the classic trap: a room tone, crowd, bar, casino, party or street
  recording with a song playing in the background. Flag every new recording of people or places for a human listen and
  a music-recognition scan: cut it into 10 s windows (`ffmpeg -ss <t> -t 10`) and run each through a recognizer (a
  Shazam-style CLI such as `songrec`, or a library such as `shazamio`). Count a song only when several windows agree;
  single hits are often false positives. Say which file and how long it is.
  - A recognizer sends the audio to its service (Shazam's servers). Fine for recordings that are public anyway; for
    unreleased material, ask first.
  - macOS has a `/usr/bin/shazam` command: it only makes signatures for custom catalogs and can't name songs.
  - With no recognizer installed, don't install one unasked: leave the verdict at "Needs a listen" and say which tool
    would do it. A person listening through on headphones is the fallback, and catches faint music a scan misses.
- AI-generated music and voices: check the tool's terms for commercial use and whether the plan used allows it.

**Images, textures, 3D models**: anything not made in-house needs its source and licence (CC0, CC BY with credit, a
store licence that covers redistribution in a product). Marketplace "editorial use only" assets can't ship. AI-generated
art: check the tool's terms, and note it for any store that asks about AI-generated content (Steam does).

**People, brands, songs**: no real person's name, voice or likeness without permission (parody of public figures is a
legal minefield, and around elections some countries restrict it); no real logos, trademarks or product names used as
the project's own; no real song's melody or lyrics, even hummed or re-recorded.

## 4. Report

One line per thing brought in, each with one verdict, most serious first. "N to look at" counts every line that isn't
OK.

```
## Licences: no change | N to look at
Ships as: <closed commercial / Steam / open source under X / internal>   Credits live in: <where>
Target: <PR #n / branch / current branch at <sha>>
- Can't use: <thing> (<licence>): <why>. Replace with: <a named alternative, or what to look for>
- Needs a decision: <thing> (<licence>): <the condition that has to hold, and what it would cost>
- Missing credit: <thing> (<licence>, <source URL>). Add to <where>:
  "<the credit line, matching the existing ones' wording>"
- Needs a listen: <file> (<seconds>): a recording of <what>, not yet checked for music
- OK: <thing> (<licence>, <source>), credited in <where> | credited by the build
Also seen: <problems outside this change that it shows up, e.g. old entries in a credits screen it adds>
Checked: <what you looked at, one line>. Not legal advice.
```

When reviewing an older, merged change, give each line the verdict it had at the time, then add "(fixed since in
<PR or commit>)" when later history settles it, so the report shows whether the check would have caught it. Leave out
"Also seen" when there's nothing.

A change that brings in nothing new (code only, or assets the project generates itself) is "no change". Match the
existing credits' wording: title in quotes, author, linked licence, then what was changed ("trimmed, levelled and made
mono").
