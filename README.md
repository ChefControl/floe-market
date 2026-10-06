# Floe Market

A cozy 3D idle/tycoon game in a single HTML file. Catch fish from the ice, chop them into steaks, stock your counters, and collect cash from hungry customers — then spend it to grow your market.

## Play

Open `index.html` in any modern browser. No build step, no install.

- **Move:** drag anywhere (touch or mouse) for a virtual joystick, or use WASD / arrow keys
- **Fish:** stand on the 🎣 pad to hook fish; they get chopped into steaks automatically
- **Sell:** pick up steaks from the pile, drop them on a counter's 🥩 pad, and walk over the cash to collect it
- **Upgrade:** stand on a price tile to pay into it

## Unlocks

| Upgrade | Cost | Effect |
| --- | --- | --- |
| 🎒 Bigger arms | $25 | Carry 14 steaks at once |
| 🎯 Auto harpoon | $60 | Catches fish while you're away |
| 🏃 Hire a runner | $120 | Carries steaks to your counters |
| 🥾 Snow boots | $150 | Walk faster |
| 🛷 Sled window | $220 | Snowmobiles buy in bulk at $6 a steak |
| 🕸️ Ice net | $320 | Hauls in fish nonstop |

Progress saves automatically to `localStorage`. Use the **Restart** button (tap twice) to wipe it.

## Tech

Plain HTML/CSS/JS with [three.js r128](https://threejs.org/) loaded from cdnjs and the Baloo 2 font from Google Fonts. All textures are drawn at runtime on canvas.
