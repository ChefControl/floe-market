# In-engine promo clips

A Claude Code plugin for making short promo clips, trailers, teasers and comedy sketches out of a game's own engine:
a scripted camera, characters that act (brows, a mouth that follows the voice, red rising up the face, ear steam),
a frame-by-frame render with the game's own sound in sync, voice takes, synthesised sound effects, captions that crash
onto the screen, and an end card. Ready-made tools for browser/WebGL games (three.js); the workflow and the lessons
apply to any engine (notes for Unity, Godot and Unreal included).

## Install

In Claude Code:

```
/plugin marketplace add ChefControl/floe-market
/plugin install in-engine-promo-clips@chefcontrol
```

Or from a terminal:

```
claude plugin marketplace add ChefControl/floe-market
claude plugin install in-engine-promo-clips@chefcontrol
```

Then ask for what you want ("make a 20 s funny teaser of my game where…"); the skill loads by itself.

## Needs

Node 18+, ffmpeg, and Playwright's Chromium (`npx -y playwright@latest install chromium`, once).

## Try it in two minutes

The skill's `assets/demo-game.html` is a stand-in game. Ask Claude to "run the in-engine-promo-clips demo", or follow
"Setup and a two-minute try" in `skills/in-engine-promo-clips/SKILL.md`.

## Licence

MIT (see `LICENSE` in this folder). The rest of the Floe Market repository stays all rights reserved.
