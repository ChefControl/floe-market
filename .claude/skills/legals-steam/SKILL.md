---
name: legals-steam
description: Use to check whether a Floe Market feature (the current branch against main, or a named PR or branch) changes any answer in Steam's content survey or the store page's texts. Covers violence, blood, alcohol, tobacco, drugs, crime, crude humour, language, nudity, fear, gambling and casino games, in-game purchases, players talking to each other or making content, online play, personal data, and the AI-generated content disclosure, plus the store's mature content note and gambling text. Triggers on "Steam check", "content survey check", "does this change the store page", "legals-steam", and is one of the three checks /legals-update runs.
---

# Steam content survey check

Compares what a feature puts in the game with the agreed survey answers and store texts, and lists the answers or texts
to change, or says "no change".

**It reports and proposes. It doesn't edit the prep page, issue #151 or anything in Steamworks unless the owner asks.**
Only public facts go in the report: nothing from inside the Steamworks partner account and no NDA or SDA terms, in the
repo, the issues or the report.

## 1. The feature

Work out what to read, in this order:
- A PR number: `gh pr view <n> --json state,files,mergeCommit` and `gh pr diff <n>`. For a merged PR, `git show <mergeCommit>`.
- A branch: `git diff main...<branch>`.
- Nothing named: the current branch, `git diff main...HEAD` plus `git diff HEAD` for what isn't committed.

Only what ships in the **Steam build** counts. Dev and demo only code, and things behind a flag that's off on Steam
(`src/flags.ts`), don't change an answer, but say so if the feature puts them in reach.

## 2. The answers to compare with

- **The agreed texts**, on issue #151:
  https://github.com/ChefControl/floe-market/issues/151#issuecomment-6457345824
  (`gh issue view 151 --comments`). Four texts: the **mature content description** (four lines, shown on the store
  page), **gambling in full**, the **AI disclosure: pre-generated** and **AI disclosure: live-generated** ("None").
- **The prep page**, with every topic's answer, why and where it is in the code, the Mature Content boxes, every gambling
  activity and "things that would change the answers later": https://claude.ai/artifact/KJw9irr5qHtrmr5kRCKFkZ. Read it
  with the Artifact tool's `read` action, never WebFetch or curl.
- **Is it submitted yet?** `gh issue view 151 --json state`. While #151 is open, a change means new texts on #151 and
  the page before the owner submits. Once it's closed (submitted and approved), answers only change through a ticket to
  Steam Support, so the report also drafts that ticket: what changed and how a tester reaches it.

The page's topics: gambling, violence, blood and gore, alcohol, tobacco, drugs, crime themes, crude humour, language,
nudity and sexual content, fear, discrimination, players talk to each other, online play, in-game purchases, shares
location or personal data, and the two AI answers. Australia is left out at launch (simulated gambling is R18+ there).

## 3. What to look for

- **Gambling.** A new game of chance, bet, loan, fix or payout, or a change to how in-game money is earned. It must stay
  true that money can't be bought, cashed out or traded. Add it to the page's gambling table, and to "gambling in full"
  if it's a new kind.
- **Violence, blood, fear.** New fighting, weapons, shooting, deaths, blood, gore, horror or jump scares (the ring:
  `src/fight.ts`, `src/dohyo.ts`, `src/finishers/`; Cooking Hazard: `src/hazard.ts`, `src/hazardPlay.ts`,
  `docs/cooking-hazard.md`). Realistic guns or blood would change the store note and maybe the Frequent Violence box.
- **Alcohol, tobacco, drugs.** A new drink, drunk effect, smoking on screen, cigarettes, pills, a drug reference.
- **Crime, crude humour, language, discrimination, nudity.** Grep new lines of text for swearing and slurs; look at new
  outfits, jokes and scenes.
- **Players and online.** Any text one player writes that another sees, chat, voice, trading, co-op, shared levels, a
  new online board (names and numbers only stay "no").
- **Purchases.** Real-money anything: DLC sold inside the game, microtransactions, loot boxes, ads, a link to pay.
- **Personal data.** Anything the privacy check would flag on the Steam side (sign-in beyond Steam, location).
- **AI.** Content made a new way: AI images, voices or models shipped as files (a Gemini mockup in the build), or any AI
  call while the game runs, which turns "live-generated: None" into a yes. Code-drawn art, music and dialogue written
  with Claude are already disclosed.
- **Real-world politics, people or brands** aren't survey topics, but note them for the owner (the page's "things that
  would change the answers later" has the election-day example).

## 4. Report

```
## Steam: no change | N updates
Target: <PR #n / branch / current branch at <sha>>
#151: open (not submitted) | closed (needs a Support ticket)
- <file:line>: what the feature adds
  Answer: <topic>: <was> → <now>
  Text: <which of the four texts> → "<proposed new text>"
  Page: <section of the prep page to update>
Checked: <topics looked at, one line>
```

Keep the proposed texts in the agreed style: the store note is one short line per item, no bullet marks, rating-board
words ("Use of alcohol", "Cartoon violence", "Simulated gambling"). Plain words, short sentences.
