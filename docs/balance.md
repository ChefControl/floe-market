# Balance principles

What "balanced" means for Floe Market, stage by stage: the principles we tune by, the numbers that show when something is off, and where the game stands today. Balanced here doesn't mean even numbers. It means the pacing feels right and every purchase is worth something.

The measurements below are from 7 October 2026 (the end-game rice and the bot's purchase times from 8 October): stage 1 with the price list merged in #11 (three runners), stage 2 with the garden tables, the slower terraces and the price list below. Re-measure after any price change and update them.

## The theme: each stage grows its raw ingredient

Each stage is about producing one raw ingredient, and growing that production is the main way the player grows:

- **Stage 1, the Fish Market:** fish. Catching more (the harpoon, the net) and getting it to customers.
- **Stage 2, Floe Sushi:** rice, plus the restaurant that turns it and the fish into sushi. Planting more terraces is what lets the restaurant serve more diners, and the restaurant grows alongside to use it.

The other upgrades exist to carry, sell or use the stage's ingredient. When the numbers and the theme disagree, change the numbers.

## The principles (every stage)

1. **Always a next goal in reach.** Something to buy every minute or so (the repeatable upgrades), and a new tile every 1 to 4 minutes. Each wait for a tile can be a little longer than the last, but never a wall.
2. **Every purchase changes something you feel.** It earns more, frees your hands (a worker takes over a job), or visibly changes the world. A purchase that does none of these feels like being cheated.
3. **Each purchase fixes the bottleneck you're feeling now, and reveals the next one.** Customers, then stock, then speed, then capacity, then customers again. Buying capacity where it isn't the limit does nothing.
4. **From hands to management.** Each stage starts with the player carrying everything and ends with workers running it. Automation is worth the freedom it gives, not only the money.
5. **Costs outrun income a little.** Prices grow a little faster than income, so each wait is a bit longer than the last, until the stage-up starts the climb again.
6. **No dead ends, no trap purchases.** There's always a way to earn again, and the price-list order is the best order or close to it, so following the obvious path is never a mistake.

The fun extras (the casino boat and its games, Korki's statue) are exempt from 2 and 3. The bot doesn't buy the boat's slot machine or blackjack table.

## How we know something is off

| Check | Measured with | A problem when |
|---|---|---|
| Time between tiles | The balance sim (`SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts`) | A gap is more than twice the one before it and over 4 minutes (a wall), or nothing new is bought for 6 minutes (`test/softlock.test.ts` fails) |
| Payback | Income just before and just after the tile, with the same repeatable upgrades | It never pays back (adds under 10% income, within the noise of a 5-minute measurement), or pays back far slower than its neighbours |
| Best route | Every order the tiles can be bought in, weighted by minutes to save up for each | Some other order is much faster than the price-list order, so the prices are out of line with what tiles earn |
| Bottleneck | What limits income at each point: the bot plays five minutes at each of the 154 points, noting every tick what's waiting on what (see below) | A tile adds capacity somewhere that isn't the limit |
| Feel | Playing it | Anything the numbers can't see: a bot never gets tired of carrying, so it undervalues automation |

The route, payback and bottleneck numbers come from one-off scripts kept outside the repo; the results are on the [upgrade paths page](https://claude.ai/artifact/TnAT7h44gu5QcTVfU7CQwQ) (private to the owner). Payback and bottlenecks are measured with the repeatable upgrades a typical player has at that point: the levels the balance bot had in a full game when it had spent as much on tiles.

### Reading the bottleneck

Every tick, each situation counts toward one of these:

- **Market:** customers waiting at an empty counter while there's fish on the pile (**carrying** is the limit), or with the pile empty too (**catching**); fish on the counter with nobody to buy it (**customers**). Serving itself is never the limit: a counter hands over a slice every 0.16 s.
- **Restaurant:** diners waiting and too few plates coming round, because the chefs are out of rice (**rice**), out of fish (**fish**), or all busy (**chefs**); every seat taken, so nobody else can come in (**seats**); or plates going round with nobody waiting for them (**customers**).

The bottleneck is the biggest share. A tile that doesn't touch it adds little, however good it sounds.

## Stage 1: Fish Market

**What it's about:** learning the loop by hand (catch, carry, sell, collect) and then handing it over: machines catch, runners carry, drivers buy in bulk. About 12 minutes to the gold tile.

**The bottleneck it should rotate through:** your hands (catching and carrying) → customers (marketing) → carrying (runners) → how much each customer buys (the drive-up window) → and round again at higher prices.

**Principles for this stage**
- The first purchases come fast: the first tile within a minute, a tile every 1 to 2 minutes after that.
- Supply only pays once there's demand. Without marketing, customers are the limit and the market tops out at about $700 a minute, so runners and boots add nothing. Keep marketing affordable alongside them.
- Crew training comes on sale with the first runner, the crew it trains, and speeds the runners up as well as fishing and chopping (up to twice as fast, like the kitchen crew in stage 2). The bot buys the runner about 45 seconds sooner with the cash that went on early training levels, and opens Floe Sushi at 11:33 rather than 12:06 (sim of 9 October 2026).
- The rating requirements are soft gates: a well-run market passes them without noticing. The gold tile shouldn't need a higher rating than the hardest market tile did before (★4.0).

**Where it stands**

| Tile | Price | Needs | Its job | Pays back | Bought at (bot) | Status |
|---|---|---|---|---|---|---|
| 🎒 Bigger arms | $30 | | Carry more per trip | 18 s | 0:31 | Good |
| 🎯 Auto harpoon | $90 | | Catch while you're away | 30 s | 1:59 | Good |
| 🛳️ Casino boat | $150 | | A side game | no gain | 2:50 | Exempt |
| 🏃 Hire a runner | $300 | ★3.5 | Free your hands from carrying | no gain | 4:07 | Automation: judge by playing. Carrying isn't the limit when it comes |
| 🥾 Snow boots | $500 | | Walk faster | no gain | 5:24 | Convenience: judge by playing |
| 🚗 Drive-up window | $900 | ★3.8 | Bigger customers | 18 s | 7:10 | Good |
| 🏃 Second runner | $1,200 | ★3.9 | More carrying | 1.3 min | 7:49 | Good |
| 🥅 Ice net | $1,600 | ★4.0 | Fish nonstop | 1.4 min | 8:14 | Good |
| 🏃 Third runner | $3,500 | ★4.2 | More carrying | no gain | 9:44 | **Off:** carrying is already 0% when it comes, and it raises the gate to open the restaurant to ★4.2 |

Pacing is healthy: the bot buys a tile every 25 seconds to 2¼ minutes, and opens Floe Sushi at about 12 minutes.

**What limits income after each tile** (typical repeatable upgrades; the share is of the time the counters are open)

| After buying | Main limit | Income |
|---|---|---|
| (the start) | Carrying: customers wait at an empty counter 62% of the time | $153/min |
| 🎒 Bigger arms | Carrying, 46% | $319/min |
| 🎯 Auto harpoon | Customers: fish waits on the counter 31% of the time | $734/min |
| 🛳️ Casino boat, 🏃 runner, 🥾 boots | Customers, 31% (unchanged) | $1,109 to $1,748/min |
| 🚗 Drive-up window | Carrying, 27%: the drivers buy 4 to 8 at a time | $5,489/min |
| 🏃 Second runner | Customers 24%, carrying down to 10% | $7,073/min |
| 🥅 Ice net | Customers 27%, carrying 0% | $12,402/min |
| 🏃 Third runner | Customers 27% (unchanged) | $24,556/min |

Income keeps rising mostly from the repeatable upgrades. The bottleneck turns over twice, as it should: carrying, then customers, then carrying again once the drive-up window opens, then customers. Three tiles land while customers are the limit and so add nothing to income: the first runner and the boots (both about freeing your hands, so judge them by playing), and the Third runner, which comes after the second runner and the net have already taken carrying to 0%. Catching is never the limit. Without repeatable upgrades, customers are the limit at every point from the harpoon on (65 to 81% of the time).

## The stage-up: Open Floe Sushi ($12,000)

**What it's about:** a reset and a reward. Every game passes through exactly one state here (all nine market upgrades, then the gold tile), so this is the one place to tune how stage 2 begins.

**Principles**
- The gold tile costs about five minutes of a well-run market's income, so you arrive in stage 2 almost broke.
- A first stage 2 purchase is in reach within a minute, and the next goal is obvious.
- The restaurant opens with enough to start the loop by hand: one chef, ten seats, a small rice patch that keeps up with the first customers.

**Where it stands:** the $800 rice terrace is bought within seconds (from the market's leftover cash), which works. What comes after is slow (see stage 2).

## Stage 2: Floe Sushi

**What it's about:** growing rice and a restaurant to serve it. Two supply chains (fish from the dock, rice from the terraces) feed the chefs; the runners already carry the fish, then a farmer and a porter take over the rice, while the restaurant grows from the bar out into the garden. About 40 minutes to the Premium menu.

**The bottleneck it should rotate through:** rice and room for diners, taking turns. Each terrace grows a set amount, a little less than the next step of the restaurant eats, so rice runs short until the next terrace is planted; each step of the restaurant (more seats, another chef, garden tables) eats more than the terraces grow. Rice (the patch, then the first terrace) → seats → rice (carrying it in: farmer, porter) → rice (the second terrace) → seats (garden tables, and a waiter to serve them) → rice (the third terrace) → a second kind of customer for the surplus (the kiosk) → rice (fertilizer, since there's no fourth terrace) → prices (the Premium menu) → the chefs.

**Principles for this stage**
- Rice keeps up with the customers you have, and no more: the starting patch is sized for the first customers at a five-star rating, and each terrace grows 0.6 bags a second (ripening in 30 seconds), a bit less than 18 seats with two chefs eat. Upgrades don't speed rice up until the fertilizer shed opens with the kiosk, so the next terrace is always worth planting.
- Once all three terraces are planted, fertilizer is the way to more rice: three levels of +50% (1.5, 2.25, then 3.4 times as fast). The first two already grow more than a fully crewed kitchen eats; the third is room to spare. The farmer (sweeping the clumps either side of the one they came for) and the rice porter (18 bags a trip, loading as fast as the crew works) carry all of it in.
- Each big tile ($5,000 and up) should feel like a milestone: income visibly jumps, or a new part of the restaurant comes alive.
- A shortage should cost a little rating, not most of it: rating requirements sit on the same tiles a struggling restaurant needs.

**The price list, in order** (two on offer at a time, plus the chefs, which are always out)

| Tile | Price | Needs | Its job | Bought at (bot) | Income after (typical) | Main limit after |
|---|---|---|---|---|---|---|
| 🏯 Open Floe Sushi | $12,000 | the market | The restaurant, a chef, ten seats, the rice patch | 11:53 | $942/min | Customers, rice 15% |
| 🌾 Rice terrace | $800 | | Rice for more diners | 12:05 | $1,971/min | Rice 29% |
| 🪑 More seats | $2,500 | ★3.6 | Room for more diners | 20:49 | $2,380/min | Chefs 47%, rice 26% |
| 🔪 Second chef | $3,000 | ★3.6 | Faster plates | 21:50 | $3,602/min | **Rice 50%**: chefs wait for rice 69% of the time |
| 🧑‍🌾 Hire a farmer | $6,000 | ★3.9, 🌾 | Free your hands from harvesting | 30:27 | $7,865/min | Rice 37% |
| 🧺 Rice porter | $12,000 | ★4.1, 🧑‍🌾 | Free your hands from carrying rice | 35:30 | $12,136/min | Seats 42%, rice 11% |
| 🌱 Second terrace | $15,000 | ★4.1, 🌾 | Rice for more diners | 38:53 | $17,184/min | Seats 44%, rice 0% |
| ⛱️ Garden tables | $20,000 | ★4.2 | Eight seats outside, and a waiter | 41:11 | $22,131/min | The waiter |
| 🔪 Third chef | $25,000 | ★4.3, 🔪 | Faster plates | 43:42 | $30,598/min | The waiter |
| ⛱️ More garden tables | $32,000 | ★4.3, ⛱️ | Eight more seats outside, and a second waiter | 45:26 | $37,888/min | Chefs 47%, **rice 16%** |
| 🌱 Third terrace | $40,000 | ★4.4, 🌱 | Rice for a full garden | 47:20 | $45,310/min | The waiters, rice 0% |
| 🥡 Takeout kiosk | $50,000 | ★4.4 | A second kind of customer for the rice to spare; opens the fertilizer shed | 49:20 | $69,703/min | Chefs 65%, rice 35% |
| 🌿 Fertilizer: compost, fish meal | $20,000, $40,000 | the kiosk | Rice ripens 1.5, then 2.25 times as fast | 49:43, 50:15 | | Rice, less each level |
| 🏮 Premium menu | $60,000 | ★4.5 | Everything sells for more | 52:07 | $278,455/min | Chefs, rice |
| 🌿 Fertilizer: spring minerals | $80,000 | | Rice ripens 3.4 times as fast | 52:44 | | **Chefs: rice 0%** |

"Bought at" is from the balance sim, re-run on 8 October 2026 after the fertilizer shed went in (with the farmer's sweep and the porter's bigger loads, the middle of stage 2 also comes about a minute and a half sooner). The "income after" and "main limit after" columns are still from 7 October, apart from the fertilizer's. "Income after" and "main limit after" are five minutes of play right after each purchase, with the repeatable upgrades the bot typically has by then, so income also rises from those. "The waiter" means garden diners waiting while plates go round the bar: the waiters, not the kitchen, are what they wait on.

What it shows:
- **Rice is the theme again.** It's the main limit through the early restaurant (up to half the time, with the chefs waiting for rice two thirds of it), and short again once the second row of garden tables comes in, which is what the third terrace fixes. The kiosk then takes the surplus, and rice runs short once more.
- **The garden works, and the waiters set its pace.** Garden diners are served several tables a trip, but from the first garden tables on, the waiters are what they wait on most.
- **Fish is never the limit** in stage 2: the market's runners bring more than the kitchen uses.
- **The end game had a rice shortage, which fertilizer fixes.** With every upgrade bought and the kitchen crew maxed, the kitchen eats about 2.35 bags a second, against 1.8 from three planted terraces. Before the fertilizer shed, the chefs stood idle with no rice 39% of the time from the kiosk on, with about 19 diners waiting and the rating sliding to ★3.6–4.0, at about $875,000 a minute 77 minutes in. Fertilizer alone wasn't enough: the farmer (about 1.8 bags a second) and then the porter (about 2) became the limit, which the farmer's sweep and the porter's 18-bag loads fix. With +20% a level, the chefs were still short 12–15% of the time until the third level was in, so each level is now +50%: the chefs are out of rice 0% of the time from the second level on (about a minute after the kiosk), with the rating at ★4.6–5.0 and about $1.6 million a minute 77 minutes in. Without the fertilizer, the same farmer and porter still leave the chefs short 33–36% of the time.
- **Stage 2 is long:** about 42 minutes, against 33 before the garden and the slower terraces. The bot buys the cheaper repeatable upgrades before each tile, which leaves two gaps of about 8 minutes between tiles (the terrace to More seats, the Second chef to the farmer), and the rating dips to ★2.6 to ★2.8 in the second, while rice is carried in by hand.

## Open work, in order

1. ~~Measure the bottleneck at every point.~~ Done.
2. ~~Make rice the thing each terrace fixes, grow the restaurant alongside, move the kiosk to the end, and put More seats before the Second chef.~~ Done: slower terraces, garden tables with waiters, the order above.
3. **Shorten stage 2's early stretch:** the farmer sooner (cheaper, or at a lower rating), so hand-carried rice doesn't sink the rating, and the gaps between tiles shrink.
4. **The waiters:** faster, or a third, if the garden should be limited by rice and chefs rather than by service.
5. **The Third runner:** left as is for now (stage 1 stays as it is). It adds nothing measurable and raises the gate to open the restaurant to ★4.2.
6. **Re-run** the routes and payback for the new price list (the upgrade paths page still shows the old one), and update the tables here.
