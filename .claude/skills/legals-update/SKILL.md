---
name: legals-update
description: Use on each new Floe Market feature, before its PR merges, to check whether the privacy notice, the Steam content survey and store texts, or the licences and credits need updating. Runs the three checks (legals-privacy, legals-steam, legals-licenses) at once in subagents on the same feature and puts their results in one short report. Triggers on "legals-update", "legal check", "legals check", "check the legals", "does this need any legal updates", "privacy, Steam and licence check".
---

# Legal update check

Runs the three legal checks on one feature, side by side, and collects them. Each check is its own skill and also works
on its own:

- **Privacy**: `.claude/skills/legals-privacy/SKILL.md`: what the game collects, keeps, shares or shows, against the
  privacy notice and its short version in Settings.
- **Steam**: `.claude/skills/legals-steam/SKILL.md`: the content survey's answers, the store's mature content note,
  the gambling text and the AI disclosure.
- **Licences**: `.claude/skills/legals-licenses/SKILL.md`: every new package and asset, its licence and its credit.

**It reports and proposes. Nothing is edited (the notice, the survey texts, the credits, issues or pages) unless the
owner asks after reading the report.**

## 1. Pin the feature

Settle the target once, so all three check the same thing:
- A PR number the owner names: `PR #<n>` (check it exists with `gh pr view <n> --json number,state,headRefName`).
- A branch they name: `branch <name>`.
- Nothing named: `current branch <name> at <short sha>, against main, with uncommitted changes` (or without, per
  `git status`).

If the target is empty (no diff against main), say so and stop.

## 2. Fan out

In **one message**, start three subagents with the Agent tool (`subagent_type: "general-purpose"`, which has the
Artifact tool the Steam check needs), so they run at the same time. Give each the same brief with its own skill:

```
Follow the skill at <repo>/.claude/skills/legals-<privacy|steam|licenses>/SKILL.md on this feature: <target>.
The repo is <absolute path of this checkout>. Report only: don't edit any file, issue, PR or artifact, and don't
commit. Don't run the whole vitest suite. Your final message is the report, in the skill's "Report" format, and
nothing else.
```

Don't do the checks yourself while they run; wait for all three.

## 3. Collect

Put the three reports into one, in this order, keeping each check's findings as it gave them (file paths, proposed
wording) but cutting repeats:

```
# Legal check: <target>

**Privacy:** no change | <n> updates
<findings>

**Steam:** no change | <n> updates
<findings>

**Licences:** no change | <n> updates
<findings>

**For the owner:** <only what needs them: OK the notice's new wording, a listen, a Support ticket, publish rules>
```

If a check failed or came back without its report, say which and rerun just that one. If two checks found the same
thing (a new online board is both privacy and Steam's "players talk to each other"), keep it in both, one line each.

Finish by asking the owner whether to make the proposed edits. Keep confidential Steamworks terms and anything from
inside the partner account out of the report.
