# Licence check

A Claude Code plugin that goes through everything a change brings into your project (new packages and their
dependencies, fonts, emoji and icon sets, sounds and music, images, textures, 3D models, AI-generated assets) and
says, for each, whether its licence allows the way you ship (a closed paid app or game, a store release, an open-source
repo, internal use) and whether you credit it. It flags songs hiding in background recordings, real people and brands,
and platform SDKs that must never be committed. It reports and proposes credit lines; it changes nothing on its own.
Not legal advice.

## Install

In Claude Code:

```
/plugin marketplace add ChefControl/floe-market
/plugin install licence-check@chefcontrol
```

Then ask "licence check this branch", "can we ship this font?" or "check PR 42's licences".

## Includes

`scripts/new_packages.mjs`: lists the npm packages a change adds or upgrades (transitive ones too) with each licence,
its kind (permissive, weak or strong copyleft, non-commercial, unknown) and whether it ships or is dev-only. Needs
Node 18+.

## Licence

MIT (see `LICENSE` in this folder). The rest of the Floe Market repository stays all rights reserved.
