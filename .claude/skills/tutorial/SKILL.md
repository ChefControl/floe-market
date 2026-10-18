---
name: tutorial
description: Use before adding to, rewriting or fixing Floe Market's in-game tutorial (the gold arrow, ring and coach bubble in src/tutorial.ts), teaching a new mechanic, staging a character's one-time introduction scene (Mr. Fugu style, src/meet.ts), or changing how long bubbles stay up. Covers what makes a tutorial clear to a new player, the creation flow (review, a lines page for the owner's OK, build, playtest page), and the code: STEPS fields and ordering, older saves, panels, intros and tests.
---

# Floe Market tutorials

The tutorial is one system for every stage: a gold arrow and ring where to go, and a coach bubble saying what to do
there (src/tutorial.ts). A new mechanic gets a step in `STEPS`, never a new system. Characters meeting the player for
the first time get a short scene instead (src/meet.ts, built like Mr. Fugu's in src/southDoor.ts and src/offer.ts).

## What makes it clear (learnt the hard way on stage 3)

The owner's first stage 3 version was "extremely unclear": four theory cards up front, a walk ring → stall → gong →
stall → bins, and the gong offered before any soup existed. The rewrite that worked follows these rules.

1. **Do first, explain when it happens.** Each idea comes the moment it matters: fans and 💪 when the first fan eats,
   the rival's crowd at the gong, the target and the bell during the fight. No up-front overview beyond one card.
2. **Only point where the player can act now.** Never at something not yet usable, and never let a spot's ring
   overlap a pad that opens a panel (the gong pad sat inside a card's ring and let a new player start, and lose, the
   practice fight with no bowls).
3. **Never leave a gap.** Something should always say what to do next (the bubble vanished while the pot ladled
   bowls; now it points at the counter: "Bowls come out here").
4. **Follow the state.** When the situation changes, so does the line: "Feed his fans to win them" while they eat,
   "Go watch the fight" once his bell has rung, "Fill the stall, then try again" after a loss.
5. **Plain words, 8 or fewer a line.** Instructions, not descriptions ("Put the rice on the rack", not "Rice dries on
   the rack"). No jargon ("turn them", "champion", "chanko"; say "fight", never "bout"). Exact numbers ("Win 21",
   not "half"). Title = what to do; sub-line = why or how.
6. **Order by place and need.** Keep walking short and one-way. Teach an optional thing (the cooking game) right
   before it helps (the gong), not right after the basics. Don't make the player save up when a prize is about to pay
   (the shop comes after the practice fight's prize).
7. **Timing for slow readers.** The first card waits until the player first moves, then 7 s. Read-only tips 9 s,
   other read cards 7 s. In-world speech bubbles `2.5 s + 0.1 s a letter` (src/speech.ts `readFor`). The owner
   tuned these by hand; ask before changing them.
8. **Once only.** A lesson or intro never repeats. Older saves skip what they've already done, judged from evidence
   in the save.
9. **Intros are scenes, not tips.** First meeting only: the world holds still, the camera eases in, he says a few
   short lines in a name-tagged bubble with his own blip voice, a tap each; then he works exactly as before. No
   arrows or tips added.

## The flow

1. **Read first.** The memory index (stage3-tutorial, stage3-ui-pass, grilling-style, test-saves-demo-only,
   full-suite-on-ci, fugu-peek, scene-wind-down), any shared notes folder, and src/tutorial.ts.
2. **Trace what a new player sees.** For a rewrite or a review, spawn a review agent (read-only). It lists every
   bubble in order, with where the arrow points (and where that is on the map), what makes it advance, and the
   branches. Then the problems, worst first, and a proposed script.
3. **Lines page for the owner's OK, before any code.** An Artifact page (desktop; the owner plays on a Mac) with:
   - what's wrong today (for a rewrite);
   - the script in the order the player meets it, each line drawn as the game's coach bubble with "arrow at" and
     "advances when" beside it;
   - character lines as name-tagged bubbles, with a note on each voice;
   - numbered questions, each with a recommendation, in plain words, all asked at once (grilling-style).
   Wait for the OK. Apply the owner's edits on the page (republish the same file path) and mark it OK'd.
4. **Build.** Steps in `STEPS`, then tests (below), `npx tsc --noEmit -p .`, and only the relevant test files, one at
   a time (cellarTutorial, tutorial, undertow, stage3, chanko). Never the full suite locally; CI runs it on the PR.
5. **Check it in the demo build** on a port of your own: `VITE_FUGU_DEMO=1 npx vite --port 5187 --strictPort`
   (never 5175, which is signed in to the owner's cloud save). See "Demo build" below.
6. **Playtest page.** Build the demo (`VITE_FUGU_DEMO=1 npx vite build --outDir <scratchpad>/play-dist`), rename
   `index.html` to `play.html`, and publish a small start page with links such as `play.html?cellar`, together with
   all the build's files. After each change, rebuild and republish to the same path: send the new `play.html` and
   hashed `assets/index-*.js` and `assets/firebase-*.js`, and null the old hashes.
7. **Iterate.** The owner plays and sends notes; each round gets a commit, a push and a republish. Open a PR only
   when asked; for stacked branches see the stacked-pr-merges memory. Pull with `--ff-only` before pushing when
   another session manages the stack.

## The code

### A step (`Step` in src/tutorial.ts)

| Field | Meaning |
| --- | --- |
| `id` | A `Lesson` id. Add it to the `Lesson` type and `LESSONS`. Keep a retired id in `LESSONS` if it ever shipped in a save (like `power`). An id that only existed on an unmerged branch can go. |
| `stage` | `3` for the cellar (stage 1 when absent). |
| `after` | It's only due once that lesson is learnt. |
| `at()` | Where it points `{x, y, z, r}`, or `null` for nothing to point at right now (the step is skipped for now). `r` is the ring's radius; `0` means no ring. |
| `say()` | `[title, sub?]`, worked out each frame, so it can follow the state. |
| `done()` | Learnt by doing. |
| `read` | Learnt by reading: seconds with the bubble up and its spot in view. |
| `moved` | With `read`: time only counts once the player has moved from where they stood when it came up. |
| `plain` | No arrow: the bubble sits over the player (`at` follows them). |
| `stay` | The bubble stays while the player stands on the spot. Without it, the bubble steps aside there. |
| `later` | A tip: it doesn't count toward "Tutorial complete" and never brings the banner back. |
| `known()` | Evidence in an older save that the player has done it already. |
| `goal()` | Something to save up for: the HUD goal chip and the "Next goal" toast. |

**How the showing step is picked.** `next()` takes the first step in `STEPS` order that is due, live and has a non-null
`at()`, so the list order is the priority. Pointing elsewhere for a while (`at()` returning `null`) lets the next due
step show.
- `live`: its stage is being played, not mid stage-change, and in the cellar for stage 3.
- `updTutorial` learns a step when `done()` turns true or its read time is up. A goal or stage-3 step that's done before
  its turn counts once its turn comes.
- Read time is counted in `drawTutorial`, so tests must call `draw()`.
- `complete(n)` raises the banner when the last non-`later` step of a stage is learnt.

**Shared helpers for the cellar.**
- `prepping()`: the prep hall's next job.
- `bowling()`: the bowls' next move.
- `loop()`: the next job that fills the stall.
- `gongReady()`: the forecast says it's won. It runs at most once a second, because a forecast is heavy.
- `wonFight()`, and `lost` (set as the tutorial's fight ends still to win).

**The bubble hides** while any id in `PANELS` is shown (the gong, Eddie, monte, loans, the coin, the fight card, the
cooking game `#show`, and the scenes `#way` and `#meet`). Add any new panel or scene there.

**The 💪 pill** pulses (`.teach` on `#power`) while the `fed` step is up, as `#stars` does for the rating tip.

### Older saves (`loadLessons`)
- **No lessons in the save at all** (from before any tutorial): `olderGame()` learns every step whose `known()` is true.
- **No stage 3 ids:** each stage 3 step is learnt on its own `known()`.
- **Stage 3 ids, but none of a group added later** (`NEWER`): that group is learnt on `known()`. Add a new group like it
  whenever lessons are added after the tutorial has shipped.

### The cooking game and frozen time

While the cooking game is on (chanko.ts `showing()`), `tick()` runs only the show, so `updTutorial` is frozen and
nothing can be learnt. A lesson learnt by playing it uses `showsDone.n` (fight.ts, counted in `showResult`).

### Character intros (src/meet.ts)
- **Saved flag:** `F.den.met[k]`, saved with the cellar. `fightFrom` reads it, and for a save without it, takes it from
  evidence (a fix waiting or a scandal running, a loan owed, monte played).
- **The vendor's pad:** his `gamePad` only opens once he's met (`here: () => … && met(k)`). `updMeet` starts the scene
  when the player stands on the pad.
- **Holding the world:** `meetPlaying()` holds the cellar in ring.ts's scene branch, which still calls
  `updUndertow(dt, true)` so the club carries on (no pads, no greetings). game.ts hushes the world's sounds.
- **The scene:** the camera `meetCam` is blended in main.ts. The bubble is the `#meet` DOM, which shares `#way`'s CSS.
  Space, E, Enter or a tap advances it.
- **A new character:** add his `INTRO` lines, `NAME`, `FACE` height, `CAM_Y` and `VOICE`, then gate his pad.
- **Voices:** `tone()` blips on the `cue` bus, with an attack of 0.006 s or more. A low-pass on square or saw waves
  keeps them soft. The owner hears clicks; see the audio-no-pops memory.

### Demo build (src/fuguDemo.ts)
- **Options:** `?cellar` (fresh, tutorial due), `&pot`, `&beaten=N`, `&south` (the Undertow open), `&chips=N`.
- **Lessons:** it forgets them on every start.
- **Driving it from page JS:** import a module by the exact URL in `performance.getEntriesByType('resource')`. A
  source edit gives it a new `?t=` URL, so reload after editing.
- **Hidden browser pane:** it gets no animation frames, so the game doesn't run. Temporarily add, as the first thing
  in `<head>`: `<script>if(location.search.includes('tick'))window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16)</script>`.
  Load with `&tick`, and remove the script before committing.

### Tests (test/cellarTutorial.test.ts, test/undertow.test.ts)
- **Helpers:** `cellar(save)` gives `at`, `draw`, `now`, `said`, plus a local `wait(s)` that draws and runs.
- **Fixtures** (test/helpers.ts) default to `ring.sparred: true` and all vendors met. Pass `sparred: false`, or
  `den: { met: undefined }`, to test a fresh or older game.
- **Long runs:** don't draw every step inside a long `runUntil`. Read `tut.lesson.now?.say()` instead, and give the
  test `30_000` to `45_000` ms. A two-minute run that drew every frame timed out at 15 s on CI.
- **What to test:** each new step's lines, where it points, and what makes it advance; its older-save rule; and an
  intro's once-only rule, its save and its evidence.

## Before you call it done

- [ ] Every line is 8 words or fewer and was on the lines page the owner OK'd (or the change is called out to them).
- [ ] A fresh `?cellar` run in the demo build reads in order with no gaps, and points only where you can act.
- [ ] Older saves were checked: none skipped, none repeated.
- [ ] The bubble hides over every panel and scene it could overlap.
- [ ] `tsc` and the relevant test files pass, and new behaviour has tests. CI's full suite is green on the PR.
- [ ] The playtest page is republished with the latest build.
