# Floe Market

A cozy 3D idle/tycoon game for the browser, in two stages. Stage 1 is a fish market: catch fish from the ice, sell it at a walk-up counter and upgrade the market. Stage 2 rebuilds it as Floe Sushi, a conveyor-belt sushi restaurant with rice terraces on the hillside, which you grow until the whole chain runs itself.

## Play

Play it at https://chefcontrol.github.io/floe-market/, or run it locally:

```bash
npm install
npm run dev
```

- **Loading:** a loading screen shows the game's scripts coming in, megabytes so far out of the total (about 1.3 MB, or 380 kB over the wire compressed: there are no image or sound files to fetch), then stays up while the world is built, until the first frame is drawn
- **Move:** drag anywhere (touch or mouse) for a virtual joystick, or use WASD / arrow keys. The first time on a device, a small card below the player shows how, and how to buy (a finger on the joystick on phones and tablets, the keys on a computer, going by the browser's user agent); once you've walked a little it shrinks away into the ⚙️ settings gear, where **Controls** brings it back
- **Tutorial (stage 1):** a new player is shown the market one idea at a time, each when it first matters. A gold arrow bobs over where to go, with a gold ring on the ground under it and a bubble saying what to do there; while that spot is off-screen, the bubble waits at the edge of the screen with a gold tail pointing the way. First the loop, in order: stand on the 🎣 pad to fish, pick up the slices from the pile, drop them on the counter's 🐟 pad, and collect the cash. Then buying, cheapest first: Bigger arms ($30), a level at the 📈 Upgrade square ($40), and the auto harpoon ($90). Each is a goal: a message says what's next ("Next goal: Bigger arms, $30"), and a chip under the HUD shows it with the cash so far and a bar filling up, turning gold once there's enough. Then the arrow leads to it: on a tile, "stand on it and hold E" (or Buy on a touch screen, going by whether the Buy button is in use); on the Upgrade square, which is learnt by buying a level there, "tap" or "click one in the list". Anything bought ahead of its turn counts. When a tile that needs a better rating comes on offer, a tip says what it needs, with the ★ in the HUD pulsing, until it's been in view for 6 seconds. Each idea is learnt by doing it, and the arrow steps aside while you stand where it points (except where you buy, where what to do needs saying). The last of the basics (usually the harpoon) brings up a banner with confetti for 4 seconds: Well done, Tutorial complete, and under it "The rest is up to you. Go make it big!" The rating tip is for later and doesn't bring it back. A player never sees an idea twice: what they've learnt is kept on the device, so Restart doesn't bring it back, and in the save, so it follows a signed-in player to their other devices. Saves from before the tutorial count what they've already done: anything bought means the loop, buying and the harpoon are known (a save since keeps its own lessons, so reloading mid-tutorial skips nothing)
- **Settings (⚙️, top right):** sign in for cloud saves; **Your look** (below); **Sound**, which opens into the effects, the ambience and the music, each with a mute button and a volume from 1 to 10 (7 is the game's mix; each step is about 2 dB), remembered on the device; **Graphics** (below); Controls; **Buy me a coffee**, which opens the game's [Ko-fi page](https://ko-fi.com/chefcontrol) in a pop-up window of its own (a new tab where pop-ups are blocked), so the game stays put; and Restart. While the menu is closed, a dot on the gear shows the cloud's state. After 10 minutes of play on a device, a toast says once where Buy me a coffee is and the gear pulses, unless the player has already found it
- **Your look (👕 in the settings):** dress the player from the crowd's wardrobe, free: a man's or a woman's build, six skin tones, eight hair colours and cuts (short, a quiff, curls, bald on top, long, a ponytail, a bun or a bob), a cartoon face the way PEAK does them (eyes: dots, round, sparkly, happy ^^, sleepy, lashes, angry brows or a wink; a mouth: none, a smile, a grin, the tongue out, an "o", flat, a smirk or a frown), a moustache, beard, goatee or earrings, glasses, rosy or freckled cheeks, and the colours of your top, trousers, skirt (worn in spring and summer) and shoes (snow boots in winter). Anyone can wear anything; 🎲 mixes up a whole look the way the crowd's are. While the panel is open the camera comes down in close for a head-to-toe look (rising higher if a wall or a counter is in the way), the player turns to face it and tries the look on in spring clothes with nothing on their head, so the hood or a hat doesn't hide it; walking off or Done puts the season's clothes back on over it. The look goes with the save (and to the cloud, for players who sign in), and stays on the device through a Restart
- **Fish:** stand on the 🎣 pad to hook fish; they get chopped into fish slices automatically
- **Sell fish (stage 1):** pick slices up from the pile, drop them on the counter's 🐟 pad, and walk over the cash to collect it. Walk-in customers pay $4 a slice; once the drive-up window is built, drivers on the road buy 4–8 at a time at $6
- **Upgrade:** stand on a price tile (the squares) and hold **E** to pay into it; on a touch screen, a **Buy** button comes up to hold instead. Stand on one for 2 seconds without buying and a reminder says how. Squares are for buying (the tiles, and the Upgrade squares' menus) and circles for doing something (fishing, dropping things off, the casino's games). The tiles lie square with the world, with their icon and price turned to face the camera. Some tiles also need a star rating (see below). The chip under the rating shows the stage and how many of its upgrades are built
- **Graphics (✨ in the settings): Auto, Low or High.** High draws people in full detail (the rounded, dressed-up people under Seasons, below); Low draws them as they were before it, with block arms and legs and no hands, shoes, ears, nose, eye glints, cheeks or clothing details, about a third fewer triangles each. Everything else looks the same on both. Auto, the default, lets the game pick, and shows under the row's name which one it's using: it starts each visit on High and watches the frame rate, and if that stays under 45 a second for six seconds (not counting the first few seconds, or a pause while the tab is hidden), it drops to Low for the rest of the visit. Choosing Low or High stops that; choosing Auto again starts over on High. The choice is kept on the device. On Low, the look panel leaves out cheeks and shoes, which Low doesn't draw
- **Upgrade square:** each stage has a 📈 Upgrade square (by the counter in stage 1, by the kitchen line in stage 2). Stand on it to open the stage's repeatable upgrades and tap one to buy its next level: a better product (prices), marketing (customers) or the crew (speed). The list in the top left shows every modifier in play as a percentage, with your rating counted into Customers (it brings them in ×0.6 at ★1 to ×1.4 at ★5); tap the stage chip to fold it away or back (on phones it starts folded, so the HUD leaves the game in view). Every level shows in the world too (see [Economy](#economy))
- **Fertilizer shed (stage 2):** once the takeout kiosk opens, a little thatched storehouse like the farmhouse goes up on a plank deck off the south end of the farm path, by the water wheel, with a green noren over its door and a lantern that glows at dusk. Stand on its 🌿 square to buy rice fertilizer: compost, then fish meal, then spring minerals, each making the terraces ripen half as fast again ($20,000, $40,000 and $80,000; all three make rice grow 3.4 times as fast). A labelled sack of each one bought lies on a pallet beside the shed, and the HUD's list shows it as Rice growth
- **Stage up:** with all nine market upgrades built, a gold 🏯 tile appears in the middle of the dock: Open Floe Sushi, $12,000. Paying it off plays the stage-up: the counters and the south fence come down, the restaurant, its garden and the terraces go up, and day turns to dusk. Cash, rating and upgrades carry over; the counters' leftover fish and cash move to the restaurant, and Korki's statue moves to the garden (the casino boat stays where it is)
- **Rice (stage 2):** it grows on the terraces west of the restaurant, out through the farm door. The restaurant opens with a small patch of six clumps by the door, which ripens (green to gold) in 15 seconds: just enough for the first customers at a five-star rating, and no faster with upgrades, so more customers need the rest of the terrace. Each planted terrace grows a set amount, ripening in 30 seconds, a little less than the next step of the restaurant (more seats, another chef) eats; upgrades don't speed it up, so planting more terraces is how the restaurant grows, until all three are planted and the fertilizer shed opens. Wade through ripe rice to harvest it, or take bags off the farmer's stack on the path. Fish the kitchen has no room for go back to the pile as you harvest, to make room in your arms
- **Make sushi:** drop fish slices on the 🐟 pad and rice on the 🍚 pad at the kitchen line facing the dock. Your arms carry both at once. The cooks there toss them to a chef inside the bar, who makes a plate (a bag of rice makes two) and puts it on the belt circling them. Once the takeout kiosk is open, the chefs also pack boxes for it, keeping a few ready When the chefs stand idle for want of fish or rice, the cook at that pad holds up a bubble asking for it (🐟? or 🍚?)
- **Sell sushi:** diners in their evening best come up the garden path and through the red gate, sit at the bar, take plates as they pass, and pay $30 a plate at the register by the gate when they leave. Once there are garden tables, some sit out under the red parasols instead: the chefs put their plates on a serving counter by the gate, and a waiter carries them over on a tray, up to four at a time. Waiters never take plates off the belt, and they're only for show: a garden diner stops waiting once their plate is made. Drivers buy 3–6 boxes at a time at the kiosk on the road ($35 a box); their cash lands just inside the east wall
- **Rating:** customers only wait so long. Each one leaves a 1–5★ review when they go, based on how long they waited; someone who gives up leaves 1★ and pays only for what they got. The rating in the HUD is the average of the last 20 reviews (a new game starts at ★3.0). A better rating also brings customers in faster: ×0.6 at ★1, ×1.4 at ★5
- **Seasons:** winter, spring, summer and autumn come round every five minutes of play, and the season chip by your cash shows which it is and how long is left. A new season changes the scenery over a few seconds and everyone's clothes at once:

  | | Scenery | What falls | Clothes |
  | --- | --- | --- | --- |
  | ❄️ Winter | Snow on the ground, the pines and the roofs; ice floes in the bay | Snow | Parkas with fur-trimmed hoods, or the hood down under a bobble hat, earmuffs or a trapper hat and a scarf; diners and farmers add a scarf |
  | 🌸 Spring | Fresh grass, blossom on the pines, green bushes, earth paths; the floes start to melt | Petals | Light jackets, baseball caps or hairbands, and skirts |
  | ☀️ Summer | Deep green grass and a bright sky; no ice left | Nothing | Short sleeves, shorts or skirts, and sunglasses or straw hats |
  | 🍂 Autumn | Dry grass, pines turned red and orange with gold tips; the floes come back | Leaves | Woolly hats with a bobble, berets or flat caps, and scarves |

  The sky changes with them, by day in stage 1 and at dusk in stage 2. The drivers come by snowmobile in winter and by car the rest of the year (the same vehicle, on wheels instead of skis). Chefs keep their whites all year, and waiters their indigo jackets and white headbands.

  Everyone is low poly, but rounded (on High graphics; Low keeps the plainer people from before): tapering arms and legs with hands and shoes, round shoulders, ears, a nose and a glint in their eyes. Clothes have their details: the parka has a zip, a darker hem and pockets, and the spring and autumn jacket a zip and a hem; summer brings short sleeves over bare arms, and shorts; winter, knitted mittens and snow boots with a fur cuff. Suits have lapels, two buttons and a pocket square, evening dresses a satin sash, chefs' whites two rows of buttons, and farmers denim overalls and green wellies. People walk with a bounce, dipping as their legs spread so both feet stay on the ground, leaning into the stride and rocking from foot to foot, and breathe while they stand, each in their own time. Dressing people never touches the game's luck, however many there are. Each person's clothes are baked into a few small meshes (a byte for each colour and normal), the whole crowd changes for a new season in a few milliseconds, and the clothes of people who've gone home are let go every few seconds, so a long game doesn't fill a phone's memory.

  No two customers look quite alike. Each walk-up customer, driver and diner is a man or a woman, mixed from a wardrobe of their own: skin tone, hair colour and cut (short, a quiff, curls or bald on top for men; long, a ponytail, a bun, a bob or curls for women), cartoon eyes and a mouth (lashes for women only, and nobody frowns), rosy or freckled cheeks, a moustache, beard or goatee or earrings, glasses, trousers or a skirt, shoes, height, and which of the season's hats they wear. At the sushi bar the men wear suits with a bow tie or a tie under a top hat or a bowler, and the women evening dresses and pearls under a wide-brimmed hat or a pillbox, or no hat at all. The mix doesn't touch the game's luck: it comes from its own sequence, not the one that decides orders and fish. Nothing falls inside buildings, and the rain at her house clears whatever is falling. A new game starts in winter, the way the market always looked
- **Gamble:** once the casino boat is in, walk through the gap in the dock's west fence onto the harbor quay, up the gangway onto the casino yacht's foredeck and up the stairs into the salon on its upper deck, where the games are. Inside, the roof lifts away and the walls on the camera's side fade, as in the restaurant, and the salon is busy: guests playing a row of slot machines (now and then one wins), a bartender and two guests at the bar, a waiter with a tray, and a guest behind the tables who cheers your wins. None of them stand in your way, and none of them touch your luck. Each game has a pad in front of it; stand on it to play, and the camera comes in close over the table (fitting it into the screen above the controls, or beside them on a phone held sideways) while a slim burgundy-and-gold bar of round chips and big buttons opens along the bottom. Pick a stake, and walk off to stop (a spin or hand in progress settles at once, turning down insurance and standing on what you have). Everything plays out on the table itself, and takes its time. The chips are $5, $25, $100 and $500 in stage 1 and ten times that in stage 2 ($50 to $5k), or all in; the chip you picked moves up with the stage. The games play by the rules casinos commonly use, house edge and all:
  - 🎡 **Roulette:** a European wheel with one zero. Bet on red or black (pays ×2; the zero loses them) or green, the zero (pays ×36). Your chips go down on the box printed on the felt; the wheel spins one way and the ball runs round the rim the other, slows, drops in with a few hops and settles in its pocket as the wheel stops. Winnings come out beside your chips and both slide back to you; a loss goes to the croupier. A lit board on a post by the wheel shows the last numbers
  - 🃏 **Blackjack:** a six-deck shoe. Hit, stand or double on your first two cards, and split a pair once (any two tens count as a pair) into two hands played in turn, with doubling after the split; split aces get one card each, and 21 after a split isn't blackjack. The dealer stands on every 17 and checks for blackjack first. Blackjack pays 3 to 2. When the dealer shows an ace they offer insurance, half your stake, paying 2 to 1 if they have blackjack, or even money if you have blackjack yourself. The cards are dealt as in a casino: each slides out of the shoe face down and turns over, the dealer's second stays face down, and the totals float over each hand. When the dealer plays they turn that card over slowly, then burn a card into the discard tray before each card they open (and one off the top of every fresh shoe). A double goes down sideways, a split moves the pair apart and matches the chips, and at the next deal the last hand is swept into the tray
  - 🎰 **Slot machine:** three reels, one line. Three of a kind pays 7 ×100, 💎 ×50, 🐟 ×25, 🔔 ×15, 🍋 ×10, 🍒 ×8, and two cherries pay ×2: about 97% back. The camera comes in face on: the lever goes down and the reels on the machine's own screen spin and stop left to right, with what pays printed on the glass under them

  The croupier and the dealer welcome you the first time you step up to them each visit, and call out the big moments in a speech bubble (a green, a blackjack, a bust, insurance); the slot machine's sign lights up a bubble for three of a kind and the jackpot
- **Mind the road:** drivers stop for you on the road ahead of them, at the zebra crossing to her house or anywhere else, and the ones behind wait in line. Keep them waiting and they beep, then lean on the horn with an angry face until you're out of the way

### Sound

Everything you hear is made in the browser as it plays (Web Audio), so the game downloads no sound files; it starts with your first tap or key press, as browsers require, and sleeps while the page is hidden.

- **Effects:** soft, rounded, toy-like sounds for the low-poly world. Your footsteps on boards, snow, grass or leaves; the line whipping out, the splash and the cleaver's three cuts; blips that climb the scale as you pick things up and step down as you put them down; coins; money draining into a tile and a run up the marimba when it's bought; a bell for news; reviews from a happy little tune (five stars) to a sad bonk (one); roulette clicks, cards dealt and slot reels clacking to a stop; car horns. Sounds out in the world come from their side of the screen and fade with distance. Every pitched effect is on the major pentatonic of the music's key, so they ring along with the music
- **Ambience:** the sea and its gulls (loudest on the dock), wind (strongest in winter), birdsong in spring and summer, cicadas in summer, crickets at stage 2's dusk, the rain at her house, and the murmur of diners in the restaurant
- **Music,** made up as it plays, and different for each stage. Hearing the step up between them is part of the reward:
  - **Stage 1, the market:** a kalimba (thumb piano) and a hand drum, small and handmade, in D minor at 92 BPM. To start, the kalimba picks out half a pattern. The rest of the pattern, a frame drum, a shaker, a tune and a bass line join as the market grows.
  - **Stage 2, the restaurant:** a jazz café band, with electric piano in sevenths and ninths, a bass, drums and a lead. Each season has its own key, feel and lead:

  | | Key | Feel | Lead | Drums |
  | --- | --- | --- | --- | --- |
  | ❄️ Winter | D major | 84 BPM ballad swing | Celesta | Brushes, sleigh bells |
  | 🌸 Spring | F major | 92 BPM bossa nova | Flute | Cross-stick clave, shaker, soft kick |
  | ☀️ Summer | G major | 96 BPM swing | Vibraphone | Ride cymbal |
  | 🍂 Autumn | C minor | 82 BPM slow swing | Reed | Brushes, soft kick |

  Parts come in as the restaurant is built: chords, bass and the tune to start, then drums and a walking bass, then busier piano and the tune answering itself, then a second voice.
  - **Both stages:** each tune plays twice, and every fifth verse rests the tune. The music fades away under the songs at her house and Korki's statue, in the rain, and through the stage-up's fanfare. A chiptune set and a gloopy sumo-ring set are saved for future stages ([docs/music-ideas.md](docs/music-ideas.md))
- **Easy on the ear**, following what's known about which sounds people find pleasant:
  - Consonant notes: effects on the major pentatonic, and two-note effects a fifth or a fourth apart (simple frequency ratios).
  - No half steps in the piano's chords, where they'd sound rough and muddy that low.
  - No held clashing notes in the tune (the jazz "avoid note"); they're only allowed as quick passing notes.
  - Harmonic overtones for anything heard a lot. Bells, with their out-of-tune overtones, are kept for one-off news.
  - Every sound turned down by up to half around 3 kHz, where the ear is most sensitive. Coin and pick-up runs go round within their octave instead of climbing into the shrill.
  - Sounds that repeat a lot (footsteps in snow, roulette clicks) kept out of the sharpest band.
  - Only slow wobbles (gentle detune and tremolo), never fast buzzy ones.
  - Unhurried tempos of 82 to 96 BPM.

## Economy

The money curve follows idle games ([the math of idle games](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)): prices grow exponentially, and so does income, a little more slowly, so each purchase takes a bit longer than the last.

- **Repeatable upgrades**, three a stage, at the stage's upgrade square, and rice fertilizer at the fertilizer shed in stage 2:

  | | Stage 1 | Stage 2 | Each level | Price |
  | --- | --- | --- | --- | --- |
  | Better product | 🐟 Fine fillets | 🍣 Chef's specials | Prices +25% | ×1.6 a level, no limit |
  | Marketing | 📣 Posters, flyers, radio, social media, ... TV ad | 📣 Menu boards, lantern signs, ... world famous | Customers +20%, longer queues | ×1.75 a level, 8 levels |
  | Crew | 💪 Crew training, once the first runner is hired: fishing, chopping and the runners (up to twice as fast) | 🧑‍🍳 Kitchen crew: chefs, the runners, farm workers, waiters (not how fast rice grows) | Speed +15% | ×1.75 a level, 8 levels |
  | Fertilizer | | 🌿 Rice fertilizer: compost, fish meal, spring minerals (from the takeout kiosk on) | Rice growth +50% | ×2 a level, 3 levels |

  They start at $40, $60 and $80 in stage 1 and $500, $800 and $1,000 in stage 2, and fertilizer at $20,000. Each level shows in the world:

  | | Stage 1 | Stage 2 |
  | --- | --- | --- |
  | Better product | The price board over the walk-up counter shows the new price, and a star a level | A wooden menu tag over the kitchen line, a new dish on each |
  | Marketing | Each campaign for real, spread round the market: posters on the fence, a promoter handing out flyers down the customers' path, a radio playing the jingle and a giant phone with the market's post collecting likes (at either end of the dock), a billboard and a newspaper box across the road, a food blogger taking photos and a TV playing the market's commercial out in the snow | Spread round the restaurant: a chalk menu board in the front garden, big paper lanterns on the front eaves, a phone on a ring light filming the bar, a food critic at a table holding up five stars, a magazine rack by the entrance, a TV camera filming the chefs, the gourmet guide's stars over a pedestal by the register, and flags from all over the world across the room |
  | Crew | The player's headband, coloured like a judo belt: white, yellow, orange, green, blue, purple, brown, black (it comes off when the restaurant opens) | The chefs' and cooks' toques grow taller |
  | Fertilizer | | A labelled sack of each kind on a pallet beside the fertilizer shed |

  Fishing speed (crew training) still counts in stage 2, but it isn't in the list there: the dock catches more fish than the kitchen gets through, so carrying fish in (the runners) is what can hold the kitchen back, and the kitchen crew speeds that up.
- **One-off upgrades** roughly double in price each time and add capacity: machines, workers, chefs, seats, terraces.
- **Tiers.** Each stage ends on an expensive capstone. The gold tile costs about five minutes of a well-run market's income, so you start stage 2 almost broke, and stage 2's prices and sale values are about ten times stage 1's.
- **No dead ends.** Fishing and rice are always free, and fish the kitchen can't take go back to the pile as you harvest rice, so arms full of fish never stop you making sushi and money again. The runners (bought in stage 1) keep the fish tray stocked, the farmer's stack can be carried in by hand before there's a rice porter, and the chefs only pack a few takeout boxes ahead, so plates keep coming for diners. Fish and rice keep up with a fast kitchen: a bag of rice makes two plates, the kitchen crew speeds up the runners, the farmer and the rice porter too, and once the terraces are full, fertilizer makes them grow faster (the farmer sweeps the ripe clumps either side of the one they came for, so they keep up).

On a simulated run by a bot that plays like a reasonable player (see [Development](#development)), stage 1 takes about 13 minutes, with income growing from about $200 to $10,000 a minute; stage 2's upgrades, fertilizer included, are all bought about 41 minutes later, with income growing from about $1,000 to over $250,000 a minute, and to about $700,000 an hour into the game. Better products then carry on for as long as you like.

## Unlocks

Two upgrades of the current stage are on offer at a time, in this order, plus the chefs, which are out all through stage 2. A tile with a star requirement shows the rating it needs (🔒 ★3.5) instead of its price until your rating reaches it. Once reached, it stays open even if the rating drops later. A tile only takes money once you stop on it, not while you walk across.

Whenever a new upgrade comes on offer, a message says what it is, and while its tile is off-screen an arrow at the edge of the screen points the way to it, until you've had it in view for a moment.

**Stage 1: Fish Market**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🎒 Bigger arms | $30 | | Carry 14 things at once |
| 🎯 Auto harpoon | $90 | | Catches fish while you're away |
| 🛳️ Casino boat | $150 | | A harbor quay off the dock's west end (stone-walled and plank-topped like the dock, with bollards, lamp posts, a ticket booth and crates), and a casino yacht, Lady Luck, moored along it: a navy hull with a raked bow and gold name, bulwarks sweeping up to the bow, a lower deck banded in dark glass, and a glass-walled salon on top under a white hardtop, which carries a sky lounge with the CASINO sign and a radar mast, a hot tub, sun loungers and strings of lights down to the bow. The roulette table is in the salon. The tile is by the west fence: the quay builds out from it, and the camera looks over at the boat as it comes in. Its slot machine and blackjack table are for sale on the upper deck (below) |
| 🏃 Hire a runner | $300 | ★3.5 | Carries fish from the pile to whichever counter is lowest (in stage 2, to the kitchen line) |
| 🥾 Snow boots | $500 | | Walk faster |
| 🚗 Drive-up window | $900 | ★3.8 | Opens a window in the east fence where drivers buy fish in bulk, for half as much again |
| 🏃 Second runner | $1,200 | ★3.9, a runner | Another runner, at the first one's tile |
| 🥅 Ice net | $1,600 | ★4.0 | Hauls in fish nonstop |
| 🏃 Third runner | $3,500 | ★4.2, a second runner | A third runner. All three work side by side at the market; the restaurant needs only two to keep its kitchen line in fish, so at the stage-up the third hands its fish back to the pile and goes |
| 🏯 Open Floe Sushi | $12,000 | all of the above | Stage 2: the restaurant with ten seats, a chef and two cooks, and a small patch of rice on the bottom terrace |

**Stage 2: Floe Sushi**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🌾 Rice terrace | $800 | | Plants the rest of the bottom terrace round the starting patch (18 clumps of rice in all) |
| 🪑 More seats | $2,500 | ★3.6 | Eight more seats at the bar (18 in all) |
| 🔪 Second chef | $3,000 | ★3.6 | Another chef at the bar. Out from the start of stage 2, by the bar's east end |
| 🧑‍🌾 Hire a farmer | $6,000 | ★3.9, 🌾 | Harvests the terraces onto a stack on the path, sweeping the ripe clumps either side in the same cut |
| 🧺 Rice porter | $12,000 | ★4.1, 🧑‍🌾 | Carries rice from that stack, 18 bags at a time, in through the farm door to the kitchen line |
| 🌱 Second terrace | $15,000 | ★4.1, 🌾 | Plants the middle terrace: rice for more diners |
| ⛱️ Garden tables | $20,000 | ★4.2 | Four tables under red parasols east of the garden path (8 seats), a serving counter by the gate for their plates, and a waiter who carries them over |
| 🔪 Third chef | $25,000 | ★4.3, a second chef | A third chef at the bar. Out once there's a second chef |
| ⛱️ More garden tables | $32,000 | ★4.3, garden tables | Four more tables west of the path, and a second waiter at the serving counter |
| 🌱 Third terrace | $40,000 | ★4.4, second terrace | Plants the top terrace, by the hot spring: rice for a full garden |
| 🥡 Takeout kiosk | $50,000 | ★4.4 | Drivers on the road buy boxes of sushi with the rice to spare; the chefs pack them. The fertilizer shed opens with it |
| 🏮 Premium menu | $60,000 | ★4.5 | Everything sells for 60% more |

### Her house

Far out past the road, a path leaves the market (through the east fence in stage 1, and through a door in the restaurant's east wall in stage 2), crosses the road at a zebra crossing and ends at a little rose-coloured house with its windows lit. Stand in the 💔 circle in front of it and it starts to rain: the sky goes grey, you turn into the singer, Ofer Levy (navy cap, short grey beard, olive field jacket over a white T-shirt, gold chain and watch), face her window and cry, and his "מאוהב בגשם" (live at Caesarea, via YouTube) plays from the line "מול ביתך עומד בגשם נרטב". Walk away and the rain clears and the song fades out; come back and it starts again from the same line. The 🔊 button on the song's banner mutes it (it starts muted on iPhone and iPad, where web pages can't fade sound). It's there from the start, free.

🛴 **Korki's golden statue** ($10) is on offer from the start, outside the queue: a gold NAMI Klima One on a pedestal, in memory of Korki. Stand on its pad to read his story; stay a few seconds and his song ("Car Alarm (extended reprise)" by pat's soundhouse, via YouTube) fades in quietly, and fades out when you leave. The story's ✕ closes it while you stay on the pad, song and all; it's back the next time you step on. On phones the story is smaller, to leave the game in view.

🎰 **Slot machine** ($250) and 🃏 **Blackjack table** ($400) are in the casino yacht's salon once it's in, outside the queue, in either stage.

Market customers and diners order 1–3 and give up after 40 seconds of waiting (for diners, 40 seconds in total between plates). Drivers wait 55 seconds.

### Saving

Progress saves automatically on the device, including your reviews, the season, what the tutorial has shown you and everything along the supply chain (the pile, the counters, the kitchen line, plates on the belt, workers' loads, the terraces' stack): every few seconds, whenever the page is hidden or closed, and after each upgrade. Cash, fish and rice that are mid-air are counted, as are diners' unpaid bills, so closing the tab at any moment loses nothing.

- **One tab at a time.** If the game is opened in a second tab, the older tab stops saving and says so, so it can't overwrite newer progress.
- **Updates don't reset progress.** Saves carry a format version and older saves are migrated on load, keeping cash, rating and upgrades. Saves from before the two stages stay in stage 1, except those that had both the old restaurant west of the dock and every market upgrade: they go straight to stage 2, keeping the restaurant's upgrades, with the old kitchen's fish and the counters' leftovers on the kitchen line and the cash at the register. Everyone else gets back what they spent on the old restaurant, its cash and its unsold plates. A save that can't be read is kept under `floe-market-backup` instead of being overwritten.
- **Storage that sticks.** The game asks the browser to keep its storage (`navigator.storage.persist()`). On iPhone, Safari clears website data after 7 days without a visit; adding the game to the Home Screen avoids that (note that the Home Screen app keeps its own separate save).
- **Restart** (in the ⚙️ settings) erases progress after a second, deliberate tap; a quick double-tap is ignored. Signed in, it starts the cloud save over too.

### Cloud saves

**Sign in with Google** (in the ⚙️ settings) and your game follows you to any device or browser, including the iPhone Home Screen app. Playing without signing in works exactly as before.

- **Syncing:** signed in, the game syncs with your account every 30 seconds and whenever the page is hidden. Open it on another device and you carry on where you left off. The page reloads once to load the newer game, and says "Loaded your game from the cloud".
- **Each sync** compares this device and the account with how they were at the last sync. If only one has moved on, it wins.
  - Both have progress the other hasn't seen? This happens the first time you sign in on a device that already has its own game, or after playing on two devices offline. The game asks which one to keep, showing each one's stage, cash, upgrades and when it was last played.
- **Offline:** the button says so, and the game keeps saving on the device until it can reach the cloud again.
- **Signing out** keeps the game on the device.
- **Saves are private:** each one is one Firestore document, `saves/{your account id}`, which only you can read or write (`firestore.rules`).
- **Download:** Firebase is a separate script (about 160 kB compressed). The loading screen fetches it with the game's own; it starts a few seconds after the game does, or straight away on a device that's signed in, so the sign-in window opens the moment you tap.

**Setting it up** (free Spark plan, no billing needed; the sign-in button stays hidden until this is done). Menu names are as of October 2026:

1. In the [Firebase console](https://console.firebase.google.com/), create a project. Google Analytics isn't needed.
2. **Security, Authentication, Sign-in method:** enable Google. It asks for a support email.
3. **Security, Authentication, Settings, Authorized domains:** add `chefcontrol.github.io` (GitHub Pages), and `localhost` to test with `npm run dev`. Projects created since April 2025 don't include `localhost` by default.
4. **Databases & Storage, Firestore:** create a database in the **Standard** edition (the one with the free quota), in production mode, in a location near your players. Then paste `firestore.rules` into its Rules tab and publish.
5. **Project Overview:** add a Web app (the `</>` icon), and copy its `apiKey`, `authDomain`, `projectId` and `appId` into `src/cloud.config.ts`. Firebase's docs say these can go in public code. Keep the API key limited to Firebase's APIs, which is how Firebase creates it; the security rules are what protect the saves.

The free quota (50,000 reads and 20,000 writes a day) covers about 150 hours of play a day. Each player online reads once and writes at most once every 30 seconds.

### Scoreboard

The 🏆 button (top right) lists the 20 players who have held the most cash at once, and the furthest stage each has reached. It shows once cloud saves are set up.

- **Getting on it:** sign in. Your best goes up as your game syncs, and only ever goes up: spending doesn't lower it, and neither does a Restart.
- **Names:** players show by the full name on their Google account, never an email. Your row is picked out; if you're not in the top 20 your own best shows under the list. Not signed in, it shows this game's best and a button to sign in.
- **Data:** one Firestore document per player, `scores/{your account id}`, with that name, the best and the stage. Anyone can read the scoreboard; only you can write your own entry (`firestore.rules`). A project set up before the scoreboard needs `firestore.rules` pasted and published again, or the scoreboard says it can't load.
- **Quota:** opening the scoreboard reads up to 20 documents. A signed-in player writes their entry at most once per sync, and only when their best or stage changed.

## Development

TypeScript + [three.js r186](https://threejs.org/), bundled with [Vite](https://vite.dev/). All textures are drawn at runtime on canvas; the Baloo 2 font comes from Google Fonts.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests with coverage (fails below the thresholds in `vite.config.ts`) |
| `npm run test:watch` | Unit tests in watch mode |

`SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts` has a bot (`test/bot.ts`) play a fresh game for an hour of game time, in a few seconds, and writes when it bought each upgrade and how its money and earnings grew minute by minute. Use it to check the balance after changing prices; `test/softlock.test.ts` also uses the bot to check a whole game never stalls.

[docs/balance.md](docs/balance.md) sets out the principles the game is balanced by, stage by stage, the numbers that show when something is off, and where each upgrade stands.

`.github/workflows/deploy.yml` runs the tests on every pull request and push. On `main`, it builds and deploys to GitHub Pages only if they pass.

Each deploy removes the last one's files, and GitHub Pages lets browsers keep the page for 10 minutes. A page kept from before a deploy, or a tab left open across one, would ask for files that are gone: the game wouldn't start, or Firebase wouldn't load. So the page reloads once to fetch the new version (an inline script in `index.html` for the game's script, which the loading screen adds even when its own fetch fails, so it's still seen to fail; `src/errors.ts` for Firebase), at most once a minute in case the site is actually down.

`overrides` in `package.json` lifts Firestore's `@grpc/grpc-js` (pinned to 1.9.x, which has known vulnerabilities) to a patched release. Only Firestore's Node.js build uses it, so the game in the browser is the same either way. Drop the override once `@firebase/firestore` depends on 1.13.6 or later.

### Tests

[Vitest](https://vitest.dev/) in jsdom. `test/setup.ts` stubs the two things jsdom lacks (the WebGL renderer and 2D canvas drawing) and seeds `Math.random`; everything else, three.js included, runs for real. `loadGame()` in `test/helpers.ts` loads a fresh copy of the whole game, optionally from a save, and steps it with `tick()`, so most tests read as "set up a situation, run a few seconds, check the outcome".

### Source layout

| File | Contents |
| --- | --- |
| `src/main.ts` | Entry point: boot, restart button, camera and render loop; takes the loading screen away on the first frame |
| `src/game.ts` | `tick()`: one simulation step for the whole world |
| `src/render.ts` | Renderer, scene, camera, lights, shared materials/geometry, canvas helpers |
| `src/world.ts` | Static scenery: water, the dock (both stages'), fences, roads, trees |
| `src/layout.ts` | The current stage, where people can walk in each, and the ground height (terraces, bridge, garden) |
| `src/stage.ts` | The stage-up show (banner, camera pull-back, pieces in and out), and the light: each season's sky, by day and at stage 2's dusk |
| `src/hall.ts` | The Floe Sushi building: floor, roof ring (fading when it would hide the player), walls, lanterns, gate, garden, kiosk booth |
| `src/farm.ts` | The terraces, hillside and hot spring, farmhouse and water wheel, drying racks, channel, path and bridge |
| `src/stations.ts` | Fishing pad, chopping block and cleaver, fish pile |
| `src/fishing.ts` | Fish swimming, hooking, chopping into slices (three cuts, the fish clipped at each) |
| `src/fishModel.ts` | The whole fish's model, shared by the water and the kitchen |
| `src/machines.ts` | The auto harpoon's and the ice net's models |
| `src/counters.ts` | The walk-up fish counter, drive-up window and takeout kiosk, and their customers (patience, reviews) |
| `src/economy.ts` | Sale prices, and the repeatable upgrades (price, marketing, crew) and what they multiply |
| `src/shop.ts` | The upgrade squares (and the fertilizer shed's) and their panel, and the modifier list in the HUD |
| `src/looks.ts` | What each upgrade level looks like: price board, menu tags, headband, toques, fertilizer sacks, and putting up the campaigns |
| `src/ads.ts` | The marketing campaigns, built for real (TV commercial, radio, lanterns, food critic, ...) and animated |
| `src/rating.ts` | Reviews and the market rating |
| `src/bubble.ts` | Order bubbles with patience rings, and mood faces |
| `src/restaurant.ts` | The sushi bar: kitchen line and cooks, chefs, the plate belt, diners, register |
| `src/garden.ts` | The garden tables, the serving counter by the gate, and the waiters who carry plates from it |
| `src/rice.ts` | The starting rice patch, planting the terraces, the farmer and the rice porter |
| `src/shed.ts` | The fertilizer shed by the water wheel: its deck, the storehouse, its props and its sacks |
| `src/player.ts` / `src/playerUpdate.ts` | Player entity / per-frame player logic |
| `src/runner.ts` | Runner AI, for all three runners |
| `src/pointers.ts` | Arrows at the edge of the screen pointing the way to new upgrade tiles, and where on screen something is (the tutorial uses it too) |
| `src/tutorial.ts` | Stage 1's tutorial: one idea at a time, a gold arrow and ring where to go and a bubble saying what to do, goals to save up for in the HUD, each shown once a player |
| `src/unlocks.ts` | Upgrade tiles for both stages and the machines they build |
| `src/casino.ts` / `src/casinoSalon.ts` / `src/casinoKit.ts` | The harbor quay and the yacht's hull / its salon, roof and guests / what its games share: the pads that open their controls, the camera at the table, the stake chips (buttons and stacks on the felt), moves for cards, chips and the ball, total badges and speech bubbles |
| `src/roulette.ts` / `src/rouletteTable.ts` | Roulette rules / the table, its wheel and ball, the board of last numbers, and the controls |
| `src/blackjack.ts` / `src/blackjackTable.ts` | Blackjack rules / the table, its dealer, shoe and tray, and the hand as it's dealt and played on the felt |
| `src/slots.ts` / `src/slotMachine.ts` | Slot machine rules / the bank of machines, the reels on the middle one's screen and the paytable on its glass |
| `src/korki.ts` | Korki's golden statue (a NAMI Klima One) and its memoir panel |
| `src/rain.ts` | Her house, the path to it, and the rain, tears and song in the circle out front |
| `src/singer.ts` | The singer's look, swapped onto the player in the rain |
| `src/youtube.ts` | Songs played through YouTube's embedded player: one API load, fades, mute buttons |
| `src/holder.ts` | Item stacks and arcing item flights |
| `src/pop.ts` | The pop-in animation for new things |
| `src/characters.ts` | People and sleds: their bodies, faces and clothes for each season, baked into a few meshes each; how they walk and breathe |
| `src/wardrobe.ts` | The men's and women's wardrobes the crowd is mixed from (hair, faces, clothes, colours), with dice of their own |
| `src/customize.ts` | Your look: the 👕 panel, the close-up camera, and keeping the player's look in the save and on the device |
| `src/season.ts` | The seasons: their clock, the scenery's colours for each, what falls from the sky, and the season chip |
| `src/decals.ts` | Deck markings (pads, drop zones, price tiles) |
| `src/items.ts` | Fish slice, rice, plate, box and bill meshes |
| `src/input.ts` | Virtual joystick and keyboard |
| `src/hint.ts` | How to walk: shown once a device, by its user agent, then off into the settings gear |
| `src/settings.ts` | The settings menu behind the gear: sign-in, sound and music switches, graphics, how to walk, Restart |
| `src/graphics.ts` | Graphics, Auto, Low or High: the player's choice kept on the device, and Auto's pick by the frame rate |
| `src/audio.ts` | The sound engine: Web Audio voices (tones and filtered noise), buses, placing sounds in the world, the scale |
| `src/sfx.ts` | Every sound effect, one function each |
| `src/ambience.ts` | The sea, wind, birds, insects, rain and diners, following the player and the season |
| `src/music.ts` | The music: a jazz café band a season, making tunes up as it plays, with parts that grow with the stage |
| `src/ui.ts` | HUD and stage chip (which folds the modifier list), toasts, tips, floating text, the stage-up banner and confetti, and sliding the view so an open panel never covers the player |
| `src/save.ts` | Per-device save/load, migration, autosave, one-tab-at-a-time guard |
| `src/cloud.ts` | Cloud saves: the sign-in button, syncing with the account, asking which game to keep |
| `src/firebase.ts` / `src/cloud.config.ts` | Cloud saves on Firebase (Google sign-in, Firestore), downloaded on the loading screen and started a few seconds in / the Firebase project's config |
| `src/wallet.ts` | Money |
| `src/errors.ts` | On-screen error reporting, and reloading once when a deploy removed a file the page needs |
| `src/util.ts` | Math/random helpers |
