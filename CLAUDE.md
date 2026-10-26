# Floe Market

## Agent skills

### Issue tracker

Issues live in GitHub Issues for ChefControl/floe-market, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Design system

Every UI, UX and art decision follows the Floe Market design system: https://claude.ai/artifact/JqnFttxGKAxxnd86gnFtgC

That covers HUD pills, panels, buttons, menus, dialogs, toasts, bubbles, banners, the casino and fight-night screens, words on screen, colours, fonts, shadows, icons, key art, posters, teasers and pages about the game.

- **Read it first.** Before designing or changing anything the player sees, read `project/README.md` (the brand book) with the Artifact tool's `read` action on that link (`path`). Then read the component card you're touching (`project/components/<Name>/README.md`) and `project/tokens.json` for exact values. It's a link, not a web page: don't fetch it with WebFetch or curl.
- **Use its names and values.** Take colours, type sizes, radii, spacing and shadows from its tokens. Use the existing CSS variables where the code has them (`--pill`, `--go`, `--hot`, the `k-` skin variables), and `C` in `src/palette.ts` for 3D art. Never invent a new hex, size or font when a token covers it.
- **Use its components.** Reach for an existing component (Button, Panel, HudPill, Toast, Coach, Shop, Settings…) before making a new look. Panels the player presses things in also follow the `/game-ui` skill (`.claude/skills/game-ui/SKILL.md`): the kit, the skins, keys, closing and pausing.
- **Follow its words.** Buttons carry the action and its numbers. One caption of 8 words or fewer. Say "fight", never "bout". Plain words. Emoji lead a label, never decorate a sentence.
- **Keep it in step with the code.** The code is what ships. The book was extracted from `main` at 2f14f68. When the two disagree, say so and ask which is right. When a change adds or alters a token, a component or a rule, update the book in the same piece of work (revise only the changed files under `project/`, as its `SKILL.md` says) and mention it in the PR.
- **Contrast.** Some colours from the code miss the contrast floor and are flagged in their token notes (white on `coral` and the coral focus ring, white on `cash`, `verdict-likelywin`, `cost-off`, `score-stage-1` and `crayon-bug`). Don't copy those pairings into new work.
