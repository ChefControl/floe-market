# Cooking Hazard

The design of the arcade cabinet's game: a top-down roguelite in a zombie apocalypse, where the zombies are allergic to tastes and the chef cooks them. It was grilled with the owner on 24 October 2026, from a whiteboard sketch, and this is what was decided. The fight (`src/hazard.ts`, `src/hazardPlay.ts`, `src/hazardSet.ts`, on the cabinet behind the arcade flag, or `?arcade=play` in dev and demo builds) follows it; what's built and what isn't is at the end.

## Where it lives

- An arcade cabinet on the casino yacht, against the bow wall beside the door, next to the guests' slot machine, in every stage. It's played for fun: a best score and trophies, no money in or out, so it can't touch the game's balance.
- Playing opens it on the UI kit's full screen, which pauses the game, like the cooking game at the pot. Esc leaves.
- Solo in v1. Rooms and zombies are made so a second player fits later; co-op came out of the game in PR #34 and would come back from there.

## The loop

**A run (3 to 5 minutes)**, in the spirit of Risk of Rain 2:

1. The van drops the chef at the edge of a destination.
2. Scavenge: crates, fridges and shops hold **ingredients** (spent) and sometimes **cookware** (kept: the jackpot).
3. The clock climbs, shown by the difficulty strip: **Fresh → Stale → Expired → BIOHAZARD**. The words slide right to left past a fixed marker, and the gap to the next word is the time left. It stays on BIOHAZARD from then on. Zombies get tougher and come faster; crates get better.
4. Find the safe zone, radio the van, and hold out about 30 seconds against the rush.
5. The van pulls in and the chef hops on. Everything carried comes home. Dying loses the ingredients carried and the unused servings, never what's already at the safe house.

The greed is always the same question: leave now, or stay one more minute for the cookware crate in sight.

**The safe house (no timer)**, between runs:

- Unload the van: ingredients to the pantry, new cookware to the cook room.
- **Cook** at three counters, the three kitchens chefs know: the **Stove** (hot kitchen), the **Oven** (pastry) and the **Pantry** (cold kitchen: pickling, curing, fermenting). Only the Stove is open at first. A timing tap per batch (about 20 to 30 seconds of play) sets the stars, and the stars are the **servings**: ⭐ 1, ⭐⭐ 2, ⭐⭐⭐ 3.
- **Armory:** pick the loadout and upgrade the guns.
- **Van:** upgrade cargo and armour, and pick the next destination. Its map shows the special zombies there ahead of time, so the chef can cook for them.

**Across runs:** cookware opens methods, methods open recipes, and the recipe book fills in (unknown recipes and techniques show as ???). Harder destinations drop better ingredients (wilted, fresh, premium), so the same recipe hits harder.

## The loadout (Helldivers-shaped, in our own words)

- **A main weapon**, always in hand, with magazines, ammo crates on the map and a Pantry Drop dish as an emergency refill. Some carry a taste: the **Spud Rifle** (plain, the food launcher), the **Rock Salt Shotgun** (⚡) and the **Chili Sprayer** (🔥) in v1, more from the armory. No swapping mid-run.
- **A melee** (F): a cleaver to shove off grabbers.
- **Dish slots**: 2 at first, 3 and 4 from the armory. Dishes are cooked only at the safe house, have a few servings each, and never refill mid-run. The balance lives in the cooking: rarer ingredients and cookware for stronger dishes, and longer codes to serve them.
- **Serving a dish:** hold its key, type its **recipe code** on the arrows (the chef stands still meanwhile; a slip smudges the ticket and starts it over), let go, then throw. Bomb dishes are the grenades; others lay zones, set down turrets (a simmering stockpot), or support: a **Snack Box** heals (nothing else does).
- **The code is shown as a recipe ticket** of cooking moves: ← chop 🔪, → stir 🥄, ↑ flip 🍳, ↓ press ✋.

Legal check (24 October 2026, not legal advice): no patent turned up on the arrow-code mechanic, and mechanics themselves are free to use; looks, sounds and words are not. So: our own codes, ticket look, kitchen words and sounds; never "stratagem", "Hellpod", "Eagle", "Orbital" or "Reinforce", nor Helldivers' codes, HUD, beacon or beeps; and Helldivers is never named on store pages, tags, trailers or posters.

## Tastes are elements

| Taste | Element | What a hit does | Lands |
|---|---|---|---|
| 🌶️ Spicy | 🔥 Fire | A hit and a short burn that catches on zombies it touches | On the first hit |
| ☕ Bitter | ☠️ Poison | Slow stacking poison that ignores armour | On the first hit |
| 🍋 Sour | 🧪 Acid | Melts armour: every later hit does more | On the first hit |
| 🧂 Salty | ⚡ Electric | A twitch that stops its attack and jumps to two more | Fills a ring |
| 🍬 Sweet | ❄️ Freeze | Syrup slows it; a full ring candies it solid; a big hit shatters it | Fills a ring |
| 🍄 Umami | 🧲 Lure | The zombies around crave it, swarm it and bite it | Fills a ring |

Each is grounded in real cooking (salt fires nerves, sugar sets hard, umami is the "meat here" signal). The colours are the design system's: world-tomato, stake-purple, verdict-likelywin, season-winter-bar, season-spring-bar, world-log. The rings show at the zombie's feet and glow when full, never only in the HUD.

## The zombie is the dish

- A hit leaves its taste on the zombie as a **coat**: one at a time, shown as a tint and the element's emoji over its head, fading after about 4 seconds unless topped up.
- A **different** taste on a coated zombie cooks it: a **technique** pops, named after a real one and stamped over it ("BRÛLÉED!"). The gun seasons, the dish cooks.
- A technique jumps once to the zombies around wearing the same coat, and no further. That zombie can't be cooked again for a second.
- It drops a **garnish** (🌿) that boosts the gun's next few shots. It never refills dishes.
- Order doesn't matter: Spicy then Sweet is Sweet then Spicy.

| | 🔥 | ☠️ | 🧪 | ⚡ | ❄️ | 🧲 |
|---|---|---|---|---|---|---|
| 🔥 | | Smoked | Flambéed | Crackled | Brûléed | Barbecued |
| ☠️ | | | Fermented | Cured | Tempered | Stewed |
| 🧪 | | | | Pickled | Crystallized | Marinated |
| ⚡ | | | | | Churned | Brined |
| ❄️ | | | | | | Glazed |

What each does is in `TECHNIQUES` (`src/hazard.ts`): a smoke cloud of poison, a burning splash, popcorn shrapnel, a shatter and a burning caramel puddle, a lured crowd set alight, faster poison, poison passed on, a poison burst out of a candy shell, a crowd stewed in poison, a pickle battery that zaps, acid shards, lured bites three times as hard, a freeze that jumps, a group twitch, a crowd glued together.

## Zombies

- **The horde:** HP only, growing with the clock. No weaknesses or strengths; the tastes are tools against them, not locks.
- **Special zombies:** much more HP, and an **order ticket** of two tastes (three at Expired and BIOHAZARD) shown over the head like a kitchen ticket. Shots wear them down like any zombie, but the ticket, hit in order, cooks them on the spot with its technique, and the first time fills that technique into the recipe book. A taste that isn't next makes them hurry.
- **Bosses:** each freeze takes longer to land than the last, and that wears off over time: never immune, never frozen in a loop. Electric only interrupts the attacks they wind up visibly. Techniques do extra damage to them.

The rules learnt from Path of Exile 2's elements: rings that show their "nearly full" point on the zombie, set up then cash in, combos that spread once and never chain on, bosses that resist more and more but are never immune, and swapping that never stops the shooting.

## Look and sound

- Poly 3D like Floe Market, angled top-down, with vibrant food colours against a grey apocalypse. No blood: zombies swell up like an allergic reaction and pop into confetti.
- The chef is the Floe Market chef in a hazmat apron and goggles.
- Every screen follows the design system (https://claude.ai/artifact/JqnFttxGKAxxnd86gnFtgC): HUD pills top-left, the casino skin on the cabinet's card, the cooking skin at the counters, dish slots drawn like the round action buttons, keys shown only while Shift is held, eight words or fewer on screen.
- The screens mocked up: https://claude.ai/artifact/WCKvQ5XaK1L91XBdbMigeS

### The fight in 3D (grilled 26 October 2026)

- Play opens a 3D set and camera of its own, drawn by the game's renderer, which take over the screen; the yacht waits behind, paused. It replaces the 2D greybox screen and plays by the same rules (`src/hazard.ts`).
- The camera is angled top-down at the main game's tilt and follows the chef.
- The arena, until step 4's maps: the greybox's open street, dressed as a wrecked one (cracked road, burnt-out cars, crates and bins along the edges). Nothing blocks anyone yet; step 4 makes the props cover.
- Zombies are the game's own blocky people, grey-green, arms out, tinted by their coat; they swell up and pop into confetti. Specials are bigger, with a stained chef's bib. The chef is the player's own, in a hazmat apron and goggles.
- Taste emojis, order tickets and technique stamps float over the zombies as labels, like the speech bubbles; build-up rings are painted on the ground at their feet. A special off the screen shows as an arrow at its edge, with its ticket. Shots are food: potatoes, salt crystals, a chili stream, splatting in their taste's colour.
- It follows the game's graphics: High adds shadows, confetti and the techniques' smoke; Low leaves them out. Zombies and chef look the same on both.
- Phones play it sideways: Play goes full screen and locks the screen sideways where the phone allows, and shows a "turn your phone" screen where it doesn't (iPhones), carrying on once it's turned.
- Touch: twin sticks where the thumbs land, the left half to walk and the right half to aim and fire. The dish buttons are on the left: hold one (the chef stops), swipe its code with the right thumb, one swipe a move, then tap where it lands. Shove is a button on the right. The gun reloads by itself when empty, and tapping the ammo reloads early.
- Leaving: ✕ (or Esc) pauses and asks "Leave the run?", Keep going or Leave.

### A whole run (grilled 26 October 2026)

- **The map:** one food quarter made by hand (`src/hazardMap.ts`), 64 × 40 m. Market Street and Baker Lane cross in its middle; a grocery, café, butcher's and bakery face Market Street, with a lane behind them; to the south are the corner supermarket and its car park, a square with a dry fountain, and houses. Brick walls close it in, with barricades across the streets' ends. More maps (destinations) come with the content.
- **Each run picks** its crates (14 food, 3 ammo, 1 gold), the safe zone (of 3) and the drop-off (of 4, a good way from the zone) from fixed spots.
- **What blocks what:** buildings, walls and cars block walking and shots. Barricades, the fountain and bins block walking but are shot over. Closed crates block walking. Dishes fly over everything.
- **The horde** finds the shortest way round buildings to the chef, and turns up just off the screen around them (14 to 24 m away), specials too. The clock spends 90 seconds on each word.
- **The drop-off:** the van pulls up outside a barricade and the chef hops over it into the street (two seconds; a key or tap skips it).
- **Crates** open as the chef walks up and show a card over them: one button for each thing inside (1 to 3), taken with a click or tap, or the best with E (cookware first, then the highest grade). What isn't taken stays there.
- **Food crates** hold one real ingredient per taste for now (chili, coffee beans, lemon, sea salt, sugar, mushroom), graded wilted, fresh or premium, better the later the crate's opened; a crate's shop hints at what's in it. Ammo crates add 2 spare magazines (the gun starts with 4 and holds 8 at most; an empty gun leaves shoving and dishes). The gold crate holds a piece of cookware (stand-ins: a cast-iron pan, a wok, a stockpot).
- **The bag** holds 8 ingredients. Full, a crate's card shows each swap ("Swap 🍄 Wilted → 🍋 Premium"): taking one gives up the bag's lowest grade (the oldest of those) back into the crate, and anything no better shows "Bag full".
- **The safe zone:** a ring with a tall radio mast, and an arrow at the screen's edge from Stale on. Hold E (or Radio on touch) for a second to call the van. Then hold the ring for 30 seconds, counted only inside it, with a rush coming. The van screeches in and waits 10 seconds with its doors open: walk in to get out. Missed, it backs out, and has to be called again.
- **Coming home:** everything carried comes home, kept on this device (the pantry) until the safe house keeps it in the save. Dying loses it all, cookware too.
- **Bests:** the most loot brought home (wilted 1, fresh 2, premium 3, cookware 10), shown on the cabinet, and the longest survived. No minimap.

## Not decided yet

- What each piece of cookware unlocks (the cooking methods), and the dish roster.
- Flex ingredients: a few that change taste with the method (raw onion is Spicy, caramelized it's Sweet).
- Whether repeating one taste should lose power ("palate fatigue").

Later, not in v1: survivors who move into the safe house, an online scoreboard (the Firestore rules only allow the main game's scores today), co-op.

## Building it, step by step

1. ✅ The fight's greybox (PR #137), and this doc.
2. ✅ The cabinet on the casino yacht, behind the arcade flag (`src/flags.ts`): against the bow wall beside the door, where the guests' second slot machine stood (the only spot in the salon a player can reach that's off the way from the door to the games), its attract screen, the camera coming onto its face from its pad (it faces away from the game's camera), and its card with the best run and Play. Trophies come with step 7.
3. ✅ The fight in 3D on the main renderer (`src/hazardSet.ts`, a set of its own and a camera), poly zombies and chef, and touch controls, as grilled under "The fight in 3D" above.
4. ✅ A whole run: the van, crates and loot, the safe zone hold-out and extraction, dying, as grilled under "A whole run" above.
5. The safe house: the three counters and their timing tap, the recipe book, the armory and the van, all kept in the save.
6. Content: cookware and dishes (after grilling the open questions above), special zombies and their tickets, destinations, bosses.
7. Sound and music (through audition pages, checked for pops), the balance numbers (a headless run like the stage sims), trophies.
