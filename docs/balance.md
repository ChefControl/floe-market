# Balance principles

What "balanced" means for Floe Market, stage by stage: the principles we tune by, the numbers that show when something is off, and where the game stands today. Balanced here doesn't mean even numbers. It means the pacing feels right and every purchase is worth something.

The measurements below are from 7 October 2026, with the price list on `feat/gameplay-quirks` (three runners, the chefs always out in stage 2, the starting rice patch and the $800 rice terrace). Re-measure after any price change and update them.

## The principles (every stage)

1. **Always a next goal in reach.** Something to buy every minute or so (the repeatable upgrades), and a new tile every 1 to 4 minutes. Each wait for a tile can be a little longer than the last, but never a wall.
2. **Every purchase changes something you feel.** It earns more, frees your hands (a worker takes over a job), or visibly changes the world. A purchase that does none of these feels like being cheated.
3. **Each purchase fixes the bottleneck you're feeling now, and reveals the next one.** Customers, then stock, then speed, then capacity, then customers again. Buying capacity where it isn't the limit does nothing.
4. **From hands to management.** Each stage starts with the player carrying everything and ends with workers running it. Automation is worth the freedom it gives, not only the money.
5. **Costs outrun income a little.** Prices grow a little faster than income, so each wait is a bit longer than the last, until the stage-up starts the climb again.
6. **No dead ends, no trap purchases.** There's always a way to earn again, and the price-list order is the best order or close to it, so following the obvious path is never a mistake.

The fun extras (the roulette table, Korki's statue) are exempt from 2 and 3.

## How we know something is off

| Check | Measured with | A problem when |
|---|---|---|
| Time between tiles | The balance sim (`SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts`) | A gap is more than twice the one before it and over 4 minutes (a wall), or nothing new is bought for 6 minutes (`test/softlock.test.ts` fails) |
| Payback | Income just before and just after the tile, with the same repeatable upgrades | It never pays back (adds under 10% income, within the noise of a 5-minute measurement), or pays back far slower than its neighbours |
| Best route | Every order the tiles can be bought in, weighted by minutes to save up for each | Some other order is much faster than the price-list order, so the prices are out of line with what tiles earn |
| Bottleneck | What limits income at each point (not measured yet, see Open work) | A tile adds capacity somewhere that isn't the limit |
| Feel | Playing it | Anything the numbers can't see: a bot never gets tired of carrying, so it undervalues automation |

The route and payback numbers come from one-off scripts kept outside the repo; the results are on the [upgrade paths page](https://claude.ai/artifact/TnAT7h44gu5QcTVfU7CQwQ) (private to the owner). Payback is measured with the repeatable upgrades a typical player has at that point: the levels the balance bot had in a full game when it had spent as much on tiles.

## Stage 1: Fish Market

**What it's about:** learning the loop by hand (catch, carry, sell, collect) and then handing it over: machines catch, runners carry, drivers buy in bulk. About 12 minutes to the gold tile.

**The bottleneck it should rotate through:** your hands (catching and carrying) → customers (marketing) → carrying (runners) → how much each customer buys (the drive-up window) → and round again at higher prices.

**Principles for this stage**
- The first purchases come fast: the first tile within a minute, a tile every 1 to 2 minutes after that.
- Supply only pays once there's demand. Without marketing, customers are the limit and the market tops out at about $700 a minute, so runners and boots add nothing. Keep marketing affordable alongside them.
- The rating requirements are soft gates: a well-run market passes them without noticing. The gold tile shouldn't need a higher rating than the hardest market tile did before (★4.0).

**Where it stands**

| Tile | Price | Needs | Its job | Pays back | Bought at (bot) | Status |
|---|---|---|---|---|---|---|
| 🎒 Bigger arms | $30 | | Carry more per trip | 18 s | 0:31 | Good |
| 🎯 Auto harpoon | $90 | | Catch while you're away | 30 s | 1:59 | Good |
| 🎰 Roulette table | $150 | | A side game | no gain | 2:50 | Exempt |
| 🏃 Hire a runner | $300 | ★3.5 | Free your hands from carrying | no gain | 4:07 | Automation: judge by playing |
| 🥾 Snow boots | $500 | | Walk faster | no gain | 5:24 | Convenience: judge by playing |
| 🚗 Drive-up window | $900 | ★3.8 | Bigger customers | 18 s | 7:10 | Good |
| 🏃 Second runner | $1,200 | ★3.9 | More carrying | 1.3 min | 7:49 | Good |
| 🥅 Ice net | $1,600 | ★4.0 | Fish nonstop | 1.4 min | 8:14 | Good |
| 🏃 Third runner | $3,500 | ★4.2 | More carrying | no gain | 9:44 | **Off:** expensive, adds nothing, and raises the gate to open the restaurant to ★4.2 |

Pacing is healthy: the bot buys a tile every 25 seconds to 2¼ minutes, and opens Floe Sushi at about 12 minutes.

## The stage-up: Open Floe Sushi ($12,000)

**What it's about:** a reset and a reward. Every game passes through exactly one state here (all nine market upgrades, then the gold tile), so this is the one place to tune how stage 2 begins.

**Principles**
- The gold tile costs about five minutes of a well-run market's income, so you arrive in stage 2 almost broke.
- A first stage 2 purchase is in reach within a minute, and the next goal is obvious.
- The restaurant opens with enough to start the loop by hand: one chef, ten seats, a small rice patch that keeps up with the first customers.

**Where it stands:** the $800 rice terrace is bought within seconds (from the market's leftover cash), which works. The trouble is what comes after (see the wall below).

## Stage 2: Floe Sushi

**What it's about:** running a restaurant with two supply chains (fish from the dock, rice from the terraces) feeding the chefs, and handing them over: the runners already carry fish, then a farmer and a porter take over the rice. About 33 minutes to the Premium menu.

**The bottleneck it should rotate through:** rice (the patch, then the terrace) → chefs → seats → diners (marketing) → carrying rice (farmer, porter) → a second kind of customer (the kiosk) → prices (the Premium menu).

**Principles for this stage**
- Rice keeps up with the customers you have, and no more: the starting patch is sized for the first customers at a five-star rating and doesn't speed up with upgrades, so more customers need more terrace.
- Each big tile ($5,000 and up) should feel like a milestone: income visibly jumps, or a new part of the restaurant comes alive.
- A shortage should cost a little rating, not most of it: rating requirements sit on the same tiles a struggling restaurant needs.

**Where it stands**

| Tile | Price | Needs | Its job | Pays back | Bought at (bot) | Status |
|---|---|---|---|---|---|---|
| 🌾 Rice terrace | $800 | | Rice for more diners | 1.8 min | 12:11 | Good |
| 🔪 Second chef | $3,000 | ★3.6 | Faster plates | 5.4 min | 20:17 | **Off:** comes 8 minutes after the terrace (earlier gaps are 1 to 2 minutes): a wall |
| 🪑 More seats | $5,000 | ★3.8 | More diners at once | 8.2 min | 25:16 | Slow, but a gap of 5 minutes |
| 🧑‍🌾 Hire a farmer | $6,000 | ★3.9, 🌾 | Free your hands from harvesting | 1.5 min | 29:47 | Good |
| 🥡 Takeout kiosk | $8,000 | ★4.0 | A second kind of customer | no gain | 32:09 | **Off:** probably takes plates from diners instead of adding income |
| 🧺 Rice porter | $12,000 | ★4.1, 🌾 | Free your hands from carrying rice | 1.2 min | 35:12 | Good |
| 🌱 Second terrace | $18,000 | ★4.2, 🌾 | More rice | no gain | 37:57 | **Off:** rice probably isn't the limit by then |
| 🔪 Third chef | $25,000 | ★4.3, 🔪 | Faster plates | 1.9 min | 39:59 | Good |
| 🌱 Third terrace | $35,000 | ★4.4, 🌱 | More rice | no gain | 42:00 | **Off:** rice probably isn't the limit by then |
| 🏮 Premium menu | $60,000 | ★4.5 | Everything sells for more | 1.3 min | 45:09 | Good |

## Open work, in order

1. **Measure the bottleneck at every point:** idle chefs, empty seats, diners waiting, rice or fish running out. It tells us why a tile adds nothing before we change it.
2. **Fix the stage 2 wall** before the Second chef: a cheaper chef, or a cheap tile in between.
3. **Make the tiles that add nothing do their job,** rather than only cutting their prices: the kiosk could have its own cook so it adds income instead of taking plates, the terraces could be needed by tying rice to more diners, and the Third runner could come with a lower rating requirement (★4.0) and a reason to exist.
4. **Re-run** the balance sim, the routes and the payback, and update the tables here.
