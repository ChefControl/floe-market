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
- **The horde** finds the shortest way round buildings to the chef, and turns up just off the screen around them (14 to 24 m away), specials too. The clock spends 90 seconds on each word. One of the horde turns up every 3 seconds at Fresh, 1.8 at Stale, about 1.1 at Expired and 0.65 at BIOHAZARD (easing from one to the next, never more often than every half second), three times as often while the zone's held; a special every 40 seconds (stand-in numbers, for step 7).
- **The drop-off:** the van pulls up outside a barricade and the chef hops over it into the street (two seconds; a key or tap skips it).
- **Crates** open as the chef walks up and show a card over them: one button for each thing inside (1 to 3), taken with a click or tap, or the best with E (cookware first, then the highest grade). What isn't taken stays there.
- **Food crates** hold one real ingredient per taste for now (chili, coffee beans, lemon, sea salt, sugar, mushroom), graded wilted, fresh or premium, better the later the crate's opened; a crate's shop hints at what's in it. Ammo crates add 2 spare magazines (the gun starts with 4 and holds 8 at most; an empty gun leaves shoving and dishes). The gold crate holds a piece of cookware (stand-ins: a cast-iron pan, a stockpot).
- **The bag** holds 8 ingredients. Full, a crate's card shows each swap ("Swap 🍄 Wilted → 🍋 Premium"): taking one gives up the bag's lowest grade (the oldest of those) back into the crate, and anything no better shows "Bag full".
- **The safe zone:** a ring with a tall radio mast, and an arrow at the screen's edge from Stale on. Hold E (or Radio on touch) for a second to call the van. Then hold the ring for 30 seconds, counted only inside it, with a rush coming. The van screeches in and waits 10 seconds with its doors open: walk in to get out. Missed, it backs out, and has to be called again.
- **Coming home:** everything carried comes home, kept on this device (the pantry) until the safe house keeps it in the save. Dying loses it all, cookware too.
- **Bests:** the most loot brought home (wilted 1, fresh 2, premium 3, cookware 10), shown on the cabinet, and the longest survived. No minimap.

### The safe house (grilled 26 October 2026)

- **The room:** Play opens the safe house: a small 3D room you look into, with stations to choose (click, tap or 1–6): the Stove, the Oven, the Pantry, the armory rack, the recipe book on its table, and the van at the garage door. Choosing one brings the camera in on it and opens its panel; Esc goes back to the room. 🚗 Go (E) leaves in the van.
- **Cooking (the timing tap):** a counter cooks a dish by its own recipe code. The code's moves (🔪 chop, 🥄 stir, 🍳 flip, ✋ press) slide past a line, twice through, and each is pressed (an arrow, or a swipe on touch) as it crosses: perfect, good or missed. Stars by how well: ★ 1, ★★ 2, ★★★ 3 servings. It practises the code typed in runs.
- **A batch** costs two ingredients of the dish's taste (the best in the pantry). Their average grade sets its quality: wilted ×0.8, fresh ×1, premium ×1.25 to the dish's damage and size. Real recipes come with the content.
- **Counters:** the Stove (open from the start) cooks the Chili Pot and the Mushroom Bait; the Oven the Syrup Spill; the Pantry (the cold kitchen) the Lemon Splash. The Oven opens with a baking tray and the Pantry with a pickling crock, from gold crates (stand-ins, with the cast-iron pan, till the content: icons 🍱 and 🍶 until they're drawn).
- **Arcade tickets 🎟️** pay for upgrades, won every run: some for kills and techniques, a big bonus for getting out. They stay in the arcade; Floe Market's money is never touched.
- **The armory:** unlock the Rock Salt Shotgun and the Chili Sprayer, dish slots 3 and 4, and three levels of each gun's damage; pick the gun for the next run.
- **The van:** cargo (a bag of 8, 10, then 12) and armour (the hazmat suit: 100, 125, then 150 health); its map shows the food quarter with the next run's specials' tickets, rolled ahead, to cook for; and packing: cooked batches into the dish slots. Getting out brings back the servings not used; dying loses them.
- **The recipe book:** a page of dishes (code, counter, what it needs; ??? while its counter's shut) and a page of the 15 techniques (??? till first popped in a run).
- **A new player** starts with 4 fresh chili and 4 fresh mushroom, the Spud Rifle and a few tickets, and a first-time hint at the Stove: "Cook something before you go".
- **Kept in the save** (and its cloud copy), wiped by Restart with the rest: pantry, cookware, batches, tickets, upgrades, the book, bests. What step 4 kept on the device moves into the save the first time.
- **As built** (stand-in numbers, for step 7's balance pass): a run pays a ticket for every four zombies, one for each technique, and 15 for getting out. The Rock Salt Shotgun costs 🎟️ 40 and the Chili Sprayer 60, damage levels 30, 60 and 90 (×1.15, ×1.3, ×1.5), dish slots 50 and 100, cargo and armour 40 and 80. A new player has 🎟️ 20. A cook's score (perfect counts whole, good half) gives ★★★ from 85% and ★★ from 50%. A batch cooked goes in the van by itself while there's a free slot. Leaving mid-run counts as dying.

### Gun feel (grilled 3 November 2026)

From a study of shooters that feel good: animation on every shot, damage that shows on the body, pushes, a mess that stays, a slow-motion moment, and one clear thing to aim for. The centre rule is a mechanic only; nothing the player sees names or looks like another game. The numbers are tuned in step 7.

- **Aim for the middle:** a shot does more the closer it passes to a zombie's middle: half at the very edge of where it counts, rising evenly to full damage a third of the way in. The middle third of the body is a **crit**, ×2 for now. Each shotgun pellet is judged on its own, so a point-blank blast crits a lot. The Spud Rifle and the shotgun crit; the Chili Sprayer, dishes, the cleaver, burns, poison and techniques don't, and the Chili Sprayer does its full damage wherever it hits. Specials go by the same rule (a bigger body, so a bigger crit area), and a crit never changes a ticket's order.
- **The Chili Sprayer is a flamethrower** (grilled the same day): its flame goes through every zombie in its way, each drop hitting each once, widening from about 0.3 m at the nozzle to 1.5 m at its 5 m reach; walls stop it. A drop does little itself (0.5); the fire does the damage: each hit adds a stack of heat, up to five, each burning 3 a second, and it burns on 3 seconds after the flame's left it. A burning zombie still sets alight whoever it touches, with a small 1-second burn and no heat. One sweep cooks every coated zombie in a line. It keeps its slow, and has no crits and no push; the tank's 60 drops (about 4 seconds) and the reload stay. It's drawn as fire (white-gold at the nozzle, orange, then smoke; fewer blobs on Low, one on Potato), with whatever burns on fire (tongues of flame licking up its body and head, orange round a yellow core, bigger with the heat, blown out along the stream like a tail while the flame's on it and standing back up after, embers rising off it; fewer on Low, a few flames and no embers on Potato) and scorch marks on the street. Its sound is held while it fires: the gas hiss, the whoomp as it lights, the roar fluttering and surging; let go, the hiss cuts, the roar gutters out and puffs; burning zombies crackle.
- **Tastes are left out of it for now:** a ring fills by the shot's full damage, crit or graze, and every hit coats.
- **Aiming:** the Spud Rifle's spread is tighter (0.04 → 0.015). A small dot shows where the gun points and lights up over a crit area. On touch the aim pulls gently towards the middle of the nearest zombie, in a narrow cone.
- **Every shot:** the chef's arm jerks back and the muzzle puffs. The camera nudges lightly, more for the shotgun and blasts. Android phones buzz on big hits only. Shots fly about 1.6× faster, with a short streak. Casings: potato-peel flecks from the Spud Rifle and an empty salt shell from the shotgun, which clatters; the Chili Sprayer just hisses. They lie a few seconds.
- **Every hit:** a white flash, a little squash and a flinch away from the shot. A crit flashes white-gold, its splat is twice as big and bursts out like a star, and it flinches harder. A hit that moves a special's ticket on flashes the ticket's colour instead.
- **Push:** the Spud Rifle nudges. The shotgun knocks back and stops them about 0.3 s. The Chili Sprayer slows them a little more with each drop, down to 60% while the stream stays on (specials 80%), wearing off about half a second after; with Sweet's syrup on too, only the stronger slow counts. Dishes knock back from the blast. Push grows with damage (a crit pushes twice as far), and specials take half.
- **The mess:** food, never blood: mash and sauce in the taste colours. Food sticks on where they're hit, and they lose blocks as their HP drops (an arm at half, a chunk of head near the end). Splats stay painted on the street for the whole run.
- **The kill:** the body is flung along the shot, tumbling loose for about 0.4 s: about 1 m from the Spud Rifle, 3 m from the shotgun or a crit, 5 m out from a dish blast's middle; the Chili Sprayer crumples them where they stand. Then it swells and pops where it lands (about 0.25 s), the bits carrying on the way it flew, further with overkill. A flung body is a look only: it passes through other zombies.
- **The rush:** when a technique pops, a special's ticket is finished, or 4 die within a second, the world runs at 35% for about 0.8 s, with a whoosh and a slight push-in of the camera. The chef and the chef's shots stay at full speed. At most once every 10 seconds. No words on screen ("ORDER UP!" is the Chef's Special's).
- **Hit-stop:** a freeze of about 40 ms on a point-blank shotgun kill, a dish blast and a crit kill on a special; never on an ordinary crit.
- **Sound:** a shot for each gun, an impact for each taste, the shell clatter, the whoosh and a crit crunch, picked on an audition page and checked for clicks. Music stays in step 7.
- **Settings:** everything that changes the rules is the same on every setting. High has all of it; Low has half the casings, splats that fade slowly and no confetti; Potato has no casings, a quarter of the splats and no lost blocks. Reduced motion turns off the camera nudge and the rush's push-in.
- **The firing range:** `?arcade=range`, in dev and demo builds only: a row of zombies that don't attack, and a panel of switches for each layer, one of which paints each crit area on the ground and counts the crits. Nothing is saved.
- **The guns' looks** (picked the same day from the concept page, https://claude.ai/artifact/FGebC1oagGQKhUED4ybzCK): the Spud Rifle is the **Spud Cannon**, a backyard potato cannon with a spud peeking out of the pipe; the Rock Salt Shotgun is the **Grinder Double**, two wooden salt mills for barrels; the Chili Sprayer is the **Backpack Burner**, two chili-oil tanks and a pressure tank on the chef's back, a hose round the shoulder and down the arm, and the wand in the hand with a pilot light. Each shows the armory's damage level by adding parts, never changing the shape: taped bands and a sight at ×1.15, brass fittings and more at ×1.3 and up. Shots leave each gun's own muzzle. Built in `src/hazardGuns.ts`.
- **Not in this step:** a dodge or dash, crits on tastes, flung bodies knocking others over.
- **As built** (stand-in numbers, for step 7): pushes are speeds that die away (about a twelfth of a second's worth carries on): the Spud Rifle 96 units a second (a nudge of about 20 cm), each shotgun pellet 110, a bomb dish 360 times its quality; the Chili Sprayer takes 4% off a zombie's speed a drop. The hit-stop is 40 ms, a point-blank shotgun kill is within 2.5 m, and the touch aim pulls 60% of the way onto a zombie within about 9° of it. The mess is a canvas over the street (16 pixels a metre), sent to the graphics chip at most five times a second; on Low and Potato 4% of it fades each second. Each sound has two styles on the audition page (https://claude.ai/artifact/KyvhVbXmEkV1vmvXvHxhzL); `STYLE` in `src/hazardSound.ts` holds the owner's picks: the Spud Rifle, the blast and the flame (the deeper, darker one) in style b, the rest in a. The flame's sound follows combustion roar (a hump around 450 Hz, flickering at about 11 and 14 Hz, surging at 0.7 Hz) under a 2.6–3.2 kHz gas hiss, from Farnell's Designing Sound and flame- and jet-noise studies.

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
5. ✅ The safe house (`src/hazardHouse.ts`, its room `src/hazardRoom.ts`): the three counters and their timing tap, the recipe book, the armory and the van, all kept in the save, as grilled under "The safe house" above.
   - ✅ Gun feel: centre hits and crits, the shot and hit animations, pushes, the mess, the flung kill, the rush, hit-stop, the guns' sounds (`src/hazardSound.ts`) and the firing range, as grilled under "Gun feel" above.
6. Content: cookware and dishes (after grilling the open questions above), special zombies and their tickets, destinations, bosses.
7. Sound and music (through audition pages, checked for pops), the balance numbers (a headless run like the stage sims), trophies.
