---
name: legals-privacy
description: Use to check whether a Floe Market feature (the current branch against main, or a named PR or branch) changes what the game collects, stores, shares or shows about players, and so needs the privacy notice updated. Covers Firestore writes and rules, Google sign-in, scoreboards and the wall of shame, names shown to others, reports and their screenshots, local saves and localStorage, requests to other sites, analytics, and the Steam build's Steam IDs, Cloud and leaderboards. Triggers on "privacy check", "does this need the privacy notice", "legals-privacy", and is one of the three checks /legals-update runs.
---

# Privacy check

Compares what a feature does with players' data against the privacy notice, and lists the exact edits the notice needs,
or says "no change".

**It reports and proposes. It doesn't edit the notice, the short version or any other file unless the owner asks.** The
notice is the owner's text: every change needs their OK (docs/game.md, "Privacy notice").

## 1. The feature

Work out what to read, in this order:
- A PR number: `gh pr view <n> --json state,files,mergeCommit` and `gh pr diff <n>`. For a merged PR, `git show <mergeCommit>`.
- A branch: `git diff main...<branch>`.
- Nothing named: the current branch, `git diff main...HEAD` plus `git diff HEAD` for what isn't committed.

Read the changed files whole where the diff touches data, not just the hunks.

## 2. Where the notice lives

- **`public/privacy.html`**, the full notice, on the site at `/privacy.html`. Its parts: *The short version* (the
  `.short` list), *Who I am*, *The web game* (*If you don't sign in*, *If you sign in with Google*, *Reports*, *Links to
  other sites*), *The Steam version*, *Why I'm allowed to use it*, *Who else handles it*, *Your rights*, *Children*,
  *Changes to this notice*. The `<p class="meta">` line carries **Last changed**. Added by PR #211 (#150).
- **The short version in Settings**: About → 🛡️ Privacy opens `#privacyCard` in `index.html`, with **Read the full notice**
  (`#privacyFull`) opening the page in `#privacyDialog` (wired in `src/settings.ts`). Its list must match the notice's
  `.short` list word for word; `test/ui.test.ts` ("opens Privacy into the notice's short version…") checks it. From
  PR #214 (#213).
- **The report dialog's "What's sent" list**: `#reportWhat` in `index.html`, its kept-for line filled in by
  `src/report.ts`. It's a privacy notice too, so it has to agree with the notice's *Reports* part.
- **docs/game.md**: *Privacy notice* (the rules above) and *Reports* (every Firestore collection and the intake's 30 days).

The web build keeps Firebase and Google sign-in. The Steam build stands alone: no Firebase, no Google, no Ko-fi
(`src/flags.ts`, `src/kofi.ts`; epic #142, issues #160, #170, #172). The notice covers both, in their own parts, so say
which version each finding is about.

## 3. What to look for

Search the feature's changed files (and anything new they call) for:

| Touches | Look in | Notice part |
| --- | --- | --- |
| Firestore: a new collection, a new field, a longer keep, a delete | `src/firebase.ts`, `src/cloud.ts`, `firestore.rules` (`saves/`, `scores/`, `shame/`, `reports/`, `limits/`, `config/`); `setDoc`, `updateDoc`, `addDoc`, `writeBatch`, `deleteDoc` | If you sign in with Google; Your rights |
| Sign-in, the account, what's read from Google | `src/firebase.ts`, `src/cloud.ts` | If you sign in with Google |
| A name or anything else other players see | `src/publicName.ts` ("Pat S."), the "Show me on the scoreboards" switch (`saves/{uid}.hidden`), scoreboards in `src/cloud.ts`, `src/wallOfShame.ts`, `src/worstBet.ts` | The short version; If you sign in |
| Reports: what goes, the picture, the save, how long | `src/report.ts`, `intake/` (private repo `ChefControl/floe-market-reports`) | Reports; `#reportWhat` |
| What stays on the device | `localStorage`, `sessionStorage`, IndexedDB, cookies (`src/save.ts`, `src/settings.ts`, `src/flags.ts` and others: `grep -rn localStorage src`) | If you don't sign in; The Steam version |
| A request to another site | `fetch(`, `XMLHttpRequest`, `new WebSocket`, `<script src=`, `<link href=`, `<iframe`, an image or font from another host, `window.open`, a new SDK in `package.json` | Links to other sites; Who else handles it |
| Analytics, crash reports, telemetry, ads | any new service or package doing this | Who else handles it; The short version |
| Steam: Steam ID or name, Steam Cloud, leaderboards, achievements, the report file | Steam build code (#160, #170, #172) | The Steam version |
| Who it's for | anything asking age or aimed at children | Children |

A feature that only changes gameplay, art or sound on the device, and sends or keeps nothing new, is "no change".
Don't flag code that only reads what the notice already covers.

## 4. Report

```
## Privacy: no change | N updates
Target: <PR #n / branch / current branch at <sha>>
- <file:line>: what the feature now keeps or sends (web | Steam | both)
  Notice: public/privacy.html, <part>: <is wrong / says nothing>
  Proposed: "<the new or changed sentence, in the notice's own voice>"
  Also: short version + #privacyCard | #reportWhat | docs/game.md | firestore.rules published by the owner
Checked: <what you searched, one line>
```

Write proposed wording like the notice: first person ("I keep…"), plain words, short sentences, what, why, where, how
long and who sees it. Any update also moves **Last changed** to today's date, and a change to the short version changes
`#privacyCard` the same way. Say when a rules change has to be published to the live project by the owner.
