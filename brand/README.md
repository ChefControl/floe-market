# ChefControl

The studio's logo: its mascot, the Nigiri Inspector (a salmon nigiri in a hachimaki, with a magnifier, on its plate).

- `chefcontrol.svg`: the drawing, redrawn as a vector from the 1024px profile picture. Its parts are named layers
  (`cc-plate`, `cc-ball`, `cc-top`, `cc-mag`, `cc-tails`, `cc-eyeR`, `cc-wink`…), so the studio intro can move them
  (`src/intro.ts`, index.html's `#intro` styles). The open right eye is hidden in the still logo, which winks.
- `chefcontrol-2048.png`: the same, at 2048px. For any other size, render the SVG (headless Chrome:
  `--headless=new --window-size=1024,1024 --force-device-scale-factor=N --screenshot=out.png file://…/chefcontrol.svg`).

Its colours are its own, not the game's design system.
