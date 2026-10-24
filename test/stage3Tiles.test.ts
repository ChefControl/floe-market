// Stage 3: what the cellar buys with Fugu Chips: its tiles (machines again and again, hires, tiers), the cookware
// shop's tree, and the workshop's crafting bench.
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { $, offered, ring } from './stage3Ring';

describe("the cellar's tiles", () => {
  it('another machine again and again, each dearer, up to six, in chips', async () => {
    const { g, fight, buy, F } = await ring({ money: 10_000_000 });
    const t = g.unlocks.tiles.find(x => x.id === 'rack')!;
    expect(t.cost).toBe(fight.MACH_COST.rice * fight.CHIP);
    expect(t.tip.desc).toContain('(1 of 6) · 🐡 10');
    buy('rack');
    expect(F().lines.rice.n).toBe(2);
    expect(t.done).toBe(false);
    expect(g.unlocks.menuOffer()).toContain(t);
    expect(t.cost).toBe(Math.round(fight.MACH_COST.rice * fight.MACH_STEP) * fight.CHIP);
    for (let n = 3; n <= 6; n++) { buy('rack'); expect(F().lines.rice.n).toBe(n); }
    expect(t.done).toBe(true);
    expect(offered(g)).not.toContain('rack');
  });

  it("the cookware shop sells it all on one board, a column a fight won, with a price that buys it on a click", async () => {
    const { g, plan, at, F } = await ring({ money: 10_000_000 });
    // no tiles of their own on the rooms' floors, or the arena's
    expect(g.unlocks.visibleTiles().filter(t => t.menu)).toEqual([]);
    expect(g.unlocks.tiles.filter(t => t.id.startsWith('tier')).every(t => t.menu === 'venue')).toBe(true);
    at(plan.BENCH_PAD);
    g.run(0.1);
    // (with a mouse and keys, it opens whole, the wide board, with a red ✕ that folds it to the Shop button, as Esc does)
    expect($('shop').hidden).toBe(false);
    expect($('shop').classList.contains('board')).toBe(true);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(false);
    $('shopShut').click();
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    $('craft').click();
    expect($('shop').hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('shop').hidden).toBe(true);
    $('craft').click();
    g.run(0.1);
    expect($('shopTabs').hidden).toBe(true);
    expect($('shopTitle').textContent).toBe('Cookware shop');
    expect($('shopPurse').hidden).toBe(false);
    expect($('shopPurse').textContent).toBe('🐡 10k');
    expect($('shopKeys').hidden).toBe(false);
    // the ring's three levels along the top, then every room's upgrade and the venue's tiers, and the buyout at the end
    expect([...$('shopRows').querySelectorAll('[data-mod]')].map(b => (b as HTMLElement).dataset.mod)).toEqual(['bowls', 'street', 'cellarcrew']);
    expect([...$('shopRows').querySelectorAll<HTMLElement>('[data-tile]')].map(b => b.dataset.tile)).toEqual(
      ['rack', 'washer', 'steam', 'barrel', 'salter', 'smoke', 'bed', 'picker', 'shelves', 'attendant', 'slide', 'cook', 'fastslide', 'mama', 'hall', 'tier1', 'tier2', 'tier3', 'buyout']);
    // a gate a column: the start, the practice fight (won: the fixture's sparred), then the bosses, Hakkaku next
    const gates = () => [...$('shopRows').querySelectorAll<HTMLElement>('.gate')].map(h => h.className.replace('gate ', ''));
    expect(gates()).toEqual(['start', 'won', 'next', 'later', 'later', 'later', 'later']);
    expect($('shopRows').querySelector('.gate.next')!.textContent).toBe('🐙Next: Hakkaku');
    const node = (id: string) => $('shopRows').querySelector<HTMLElement>(`[data-tile="${id}"]`)!;
    const price = (id: string) => node(id).querySelector<HTMLButtonElement>('button.cost')!;
    // (a line's machines as dots)
    expect(node('rack').querySelector('b')!.textContent).toBe('Drying rack');
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('1 of 6');
    expect(price('rack').textContent).toBe('🐡 10');
    expect(price('rack').disabled).toBe(false);
    expect(node('rack').classList.contains('can')).toBe(true);
    // the steam baskets wait on the second boss, dark, and the line under the board says so for the one under the mouse
    expect(node('steam').classList.contains('boss')).toBe(true);
    expect(price('steam').textContent).toBe('🔒 🦀');
    expect(price('steam').disabled).toBe(true);
    node('steam').dispatchEvent(new Event('pointerover', { bubbles: true }));
    g.run(0.1);
    expect($('shopPick').textContent).toContain('Beat Yokobashiri 🦀 first');
    // one click on its price buys it, or on the node
    price('rack').click();
    g.run(0.1);
    expect(F().lines.rice.n).toBe(2);
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('2 of 6');
    node('washer').click();
    g.run(0.1);
    expect(F().hires.washer).toBe(true);
    // what's done stays in its place, gold, ticked, and the line to it gold too
    expect(node('washer').classList.contains('done')).toBe(true);
    expect(price('washer').textContent).toBe('✓');
    expect($('shopRows').querySelectorAll('.edge.gold').length).toBe(1);
    // the venue's tiers are here now: Yokobashiri opens the first
    expect(node('tier1').classList.contains('boss')).toBe(true);
    F().beaten = 1;
    g.run(0.1);
    expect(gates()).toEqual(['start', 'won', 'won', 'next', 'later', 'later', 'later']);
    expect(price('tier1').textContent).toBe('🔒 🦀');
    F().beaten = 2;
    g.run(0.1);
    price('tier1').click();
    g.run(0.1);
    expect(F().tier).toBe(1);
    // E buys the one under the mouse
    const barrels = F().lines.fish.n;
    node('barrel').querySelector('b')!.dispatchEvent(new Event('pointerover', { bubbles: true }));
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect(F().lines.fish.n).toBe(barrels + 1);
    // and walking off the bench puts it away, off the screen as well as hidden
    const css = document.head.appendChild(document.createElement('style'));
    css.textContent = [...indexHtml.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    expect(getComputedStyle($('shop')).display).not.toBe('none');
    at({ x: plan.BENCH_PAD.x + 2, z: plan.BENCH_PAD.z });
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect(getComputedStyle($('shop')).display).toBe('none');
    css.remove();
  });

  it('the tree: the practice fight opens the two hands, and a line\'s big upgrade needs its hand first', async () => {
    // a game that's just come down: the practice fight to come
    const { g, F } = await ring({ money: 10_000_000, ring: { sparred: false, practice: true } });
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['rack', 'barrel']));
    expect(offered(g)).not.toContain('washer');
    expect(offered(g)).not.toContain('salter');
    // (the tutorial's shop lesson points at the cheapest thing there: the drying rack, still at the start)
    expect([...g.unlocks.menuOffer()].sort((a, b) => a.cost - b.cost)[0].id).toBe('rack');
    F().practice = false; F().sparred = true;
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['washer', 'salter']));
    // two bosses on: the steam baskets wait for the washer, the cook for the attendant
    F().beaten = 3;
    g.run(0.1);
    expect(offered(g)).not.toContain('steam');
    expect(offered(g)).not.toContain('smoke');
    expect(offered(g)).not.toContain('cook');
    expect(offered(g)).toContain('attendant');
    expect(g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'washer')!)).toBe(true);
    expect(g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'attendant')!)).toBe(true);
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['steam', 'cook']));
    expect(offered(g)).not.toContain('smoke');
  });

  it("an older game keeps all it bought on the tree, even what it couldn't buy that way now", async () => {
    // from before the practice fight and the tree's lines: steam baskets and a smokehouse with no hands, a cook with
    // no attendant, the second tier, a ring level or two, and more racks
    const { g, plan, at } = await ring({
      money: 1_000_000, mods: { street: 3, bowls: 1 },
      ring: { sparred: false, beaten: 3, tier: 2, hires: { cook: true }, lines: { rice: { n: 4, up: 1 }, fish: { n: 2, up: 1 } } },
    });
    at(plan.BENCH_PAD);
    g.run(0.1);
    const node = (id: string) => $('shopRows').querySelector<HTMLElement>(`[data-tile="${id}"]`)!;
    for (const id of ['steam', 'smoke', 'cook', 'tier1', 'tier2']) expect(node(id).classList.contains('done')).toBe(true);
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('4 of 6');
    expect(node('barrel').querySelector('.pips')!.getAttribute('aria-label')).toBe('2 of 6');
    // (its levels too)
    expect($('shopRows').querySelector('[data-mod="street"] small')!.textContent).toBe('Level 3');
    expect($('shopRows').querySelector('[data-mod="bowls"] small')!.textContent).toBe('Level 1');
    // what it hasn't bought is where the tree says: the hands on sale (a boss beaten counts the practice won)
    expect(node('washer').classList.contains('can')).toBe(true);
    expect(node('attendant').classList.contains('can')).toBe(true);
    expect(node('tier3').classList.contains('boss')).toBe(true);
  });

  it('hires the crew, who run their lines and the pot by themselves', async () => {
    const { g, buy, F } = await ring({ money: 10_000_000, ring: { beaten: 3, hires: { picker: true }, lines: { mush: { n: 3 } } } });
    for (const id of ['washer', 'salter', 'attendant', 'cook']) buy(id);
    expect(F().crew.map(w => w.role).sort()).toEqual(['attendant', 'cook', 'picker', 'salter', 'washer']);
    g.placePlayer(0, 0);
    g.player.g.position.y = (await import('../src/cellar')).CY;
    const money = g.wallet.money;
    g.run(120, 1 / 30);
    expect(F().stall.length + F().fed.length).toBeGreaterThan(0);
    expect(F().cooked.length).toBeGreaterThan(0);
    // (their chips piled up in the hearth room, for the player to scoop)
    expect(F().piles.bar).toBeGreaterThan(0);
    expect(g.wallet.money).toBe(money);
  }, 30_000);

  it('serving is taken off the player\'s hands before the pot: the attendant after the first boss, the cook after the third', async () => {
    const { g, F } = await ring({ money: 10_000_000 });
    g.run(0.1);
    expect(offered(g)).not.toContain('attendant');
    F().beaten = 1;
    g.run(0.1);
    expect(offered(g)).toContain('attendant');
    expect(offered(g)).not.toContain('cook');
    F().beaten = 3;
    g.run(0.1);
    // (the cook needs the attendant first, in the shop's tree, and so does the bowl slide: it takes over his carrying)
    expect(offered(g)).not.toContain('cook');
    expect(offered(g)).not.toContain('slide');
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'attendant')!);
    g.run(0.1);
    expect(offered(g)).toContain('cook');
    expect(offered(g)).toContain('slide');
  });

  it('the bowl slide waits for Yokobashiri, attendant or not (his crowd is beaten with the attendant carrying), and a save that has it keeps it', async () => {
    const { g, F } = await ring({ money: 10_000_000, ring: { beaten: 1, hires: { attendant: true } } });
    g.run(0.1);
    expect(offered(g)).not.toContain('slide');
    F().beaten = 2;
    g.run(0.1);
    expect(offered(g)).toContain('slide');
    // (a game saved from when Hakkaku opened them keeps the slide and the Back-Alley Ring, done in the tree)
    const old = await ring({ ring: { beaten: 1, tier: 1, slide: true, hires: { attendant: true } } });
    old.g.run(0.1);
    expect(old.F().slide).toBe(true);
    expect(old.F().tier).toBe(1);
    expect(old.g.unlocks.tiles.filter(t => t.id === 'slide' || t.id === 'tier1').every(t => t.done)).toBe(true);
  });

  it("the slide's faster belt waits for Samehada and the slide, and sends half as many bowls again", async () => {
    const { g, fight, F } = await ring({ money: 10_000_000, ring: { beaten: 3, hires: { attendant: true } } });
    g.run(0.1);
    expect(offered(g)).not.toContain('fastslide');
    F().beaten = 4;
    g.run(0.1);
    // (the slide first)
    expect(offered(g)).not.toContain('fastslide');
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'slide')!);
    g.run(0.1);
    expect(offered(g)).toContain('fastslide');
    // a second of it, with the counter full and room at the bar: SLIDE bowls down, then FAST_SLIDE once it's bought
    const sent = () => { F().counter = Array(fight.COUNTER_CAP).fill(true); F().stall = []; F().slideAcc = 0; for (let i = 0; i < 20; i++) fight.step(0.05); return F().stall.length; };
    F().quiet = true;
    const slow = sent();
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'fastslide')!);
    expect(F().fast).toBe(true);
    const fast = sent();
    // (give or take the one still on its way)
    expect(Math.abs(slow - fight.SLIDE)).toBeLessThanOrEqual(1);
    expect(Math.abs(fast - fight.FAST_SLIDE)).toBeLessThanOrEqual(1);
    // (saved and loaded with the slide)
    expect(fight.fightFrom(fight.saveFight()).fast).toBe(true);
  });

  it("Mama Moray's waits for Yokobashiri and the slide, and buying her opens her place; a game saved before had her open", async () => {
    const { g, fight, F } = await ring({ money: 10_000_000, ring: { beaten: 1, hires: { attendant: true } } });
    g.run(0.1);
    expect(offered(g)).not.toContain('mama');
    F().beaten = 2;
    g.run(0.1);
    // (the slide first: her bowls ride its line)
    expect(offered(g)).not.toContain('mama');
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'slide')!);
    g.run(0.1);
    expect(offered(g)).toContain('mama');
    expect(fight.restoOpen()).toBe(false);
    const money = g.wallet.money;
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'mama')!);
    expect(g.wallet.money).toBe(money - fight.MAMA_COST * 1000);
    expect(F().mama).toBe(true);
    expect(fight.restoOpen()).toBe(true);
    expect(fight.fightFrom(fight.saveFight()).mama).toBe(true);
    // (a save from before she was for sale: open with the slide, as she was then)
    const { mama: _, ...before } = fight.saveFight();
    expect(fight.fightFrom(before).mama).toBe(true);
    expect(fight.fightFrom({ ...before, slide: false }).mama).toBe(false);
  });

  it("chips pile up to be scooped: the fans' in the hearth room, Mama Moray's cut in her hall; a prize goes straight to the wallet", async () => {
    const { g, fight, F, at } = await ring({ money: 0, ring: { beaten: 2 } });
    const { PILE_AT, pilesNow } = await import('../src/chipPiles');
    fight.on.earn(12, 'bowls');
    fight.on.earn(5, 'resto');
    fight.on.earn(100, 'prize');
    expect(F().piles).toEqual({ bar: 12, mama: 5 });
    expect(g.wallet.money).toBe(100_000);
    expect(pilesNow().tokens).toEqual({ bar: 6, mama: 3 });
    // (kept with the save)
    expect(fight.fightFrom(fight.saveFight()).piles).toEqual({ bar: 12, mama: 5 });
    // walking over Mama's (a step off it) scoops hers, not the hearth room's
    at({ x: PILE_AT.mama.x + 1.2, z: PILE_AT.mama.z });
    g.run(1);
    expect(F().piles).toEqual({ bar: 12, mama: 0 });
    expect(g.wallet.money).toBe(105_000);
  });

  it("Mama's dining hall waits for Fukure and Mama Moray's, and she pays half a bowl, not an eighth", async () => {
    const { g, fight, F } = await ring({ money: 10_000_000, ring: { beaten: 4, slide: true, fast: true, mama: true, hires: { attendant: true } } });
    g.run(0.1);
    expect(offered(g)).not.toContain('hall');
    F().beaten = 5;
    g.run(0.1);
    expect(offered(g)).toContain('hall');
    expect(fight.restoShare()).toBe(fight.RESTO_SHARE);
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'hall')!);
    expect(F().hall).toBe(true);
    expect(fight.restoShare()).toBe(fight.HALL_SHARE);
    // (saved and loaded)
    expect(fight.fightFrom(fight.saveFight()).hall).toBe(true);
  });

  it('a cook cooks full batches out of the pot, and ladles them out twice as fast', async () => {
    const { g, plan, fight, at, F } = await ring({ ring: { beaten: 3 } });
    at(plan.WATCH);
    // the pot ladled out onto the counter, a bowl every LADLE seconds, with nobody else there
    const ladled = () => { F().pot = Array(fight.BATCH).fill(true); F().counter = []; F().pantry = { rice: 0, fish: 0, mush: 0 }; g.run(fight.LADLE * 8 + 0.01); return F().counter.length; };
    const alone = ladled();
    expect(alone).toBeGreaterThan(4);
    // (the cook walks over to the pot, and cooks a batch: as many bowls as the player's)
    fight.hire('cook');
    F().pot = []; F().counter = []; F().cooked = [];
    F().pantry = { rice: 4, fish: 4, mush: 4 };
    g.runUntil(() => F().cooked.length > 0, 20);
    expect(F().pot.length + F().counter.length).toBe(fight.BATCH);
    // and with him at it, the pot's ladled out twice as fast
    expect(ladled()).toBeGreaterThanOrEqual(2 * alone - 1);
  }, 30_000);

  it("once Mama Moray's is open and the bowl line's in, what the pot can't hold, with the ledge stocked, goes there for her cut; never while a boss is in", async () => {
    const { g, fight, F } = await ring({ ring: { beaten: 1 } });
    F().quiet = false; F().resto = 0;
    const stock = () => { F().pot = Array(fight.POT_CAP).fill(true); F().pantry = { rice: fight.LEDGE_CAP, fish: fight.LEDGE_CAP, mush: fight.LEDGE_CAP }; };
    stock();
    // (shut out front till she's bought, however fixed up the arena; then open, however little)
    F().slide = true; F().mama = false;
    g.economy.mods.street = fight.RESTO_OPENS;
    expect(fight.restoWants()).toBe(false);
    F().mama = true;
    g.economy.mods.street = 0;
    expect(fight.restoWants()).toBe(true);
    const was = F().earned.length;
    fight.playerAtPot(0.6);
    // (a whole batch up the belt, out of the ledge, and her cut of each bowl in the takings)
    expect(F().resto).toBe(fight.BATCH);
    expect(F().pantry.rice).toBe(fight.LEDGE_CAP - fight.PER_BATCH);
    expect(F().earned.length).toBe(was + 1);
    expect(F().earned[F().earned.length - 1][1]).toBeCloseTo(fight.bowlPrice(true) * fight.RESTO_SHARE * fight.BATCH);
    // a boss in: the pot keeps it all for his crowd
    stock();
    expect(fight.ringGong()).toBe(true);
    while (F().called) fight.step(0.05);
    stock();
    expect(fight.restoWants()).toBe(false);
  }, 30_000);

  it("Mama Moray's starts a wreck, is cleared up as the arena's fixed up, and opens once she's bought, with a word from her", async () => {
    const { g, fight, F } = await ring({ ring: { beaten: 1 } });
    const rs = await import('../src/resto');
    for (const n of [0, 1]) {
      g.economy.mods.street = n; g.run(0.2);
      expect(rs.restoShows()).toMatchObject({ stage: 0, mama: false, diners: 0, wreck: true, belt: false });
    }
    for (let n = 2; n < fight.RESTO_OPENS; n++) {
      g.economy.mods.street = n; g.run(0.2);
      expect(rs.restoShows()).toMatchObject({ stage: 1, mama: false, diners: 0, wreck: false, belt: false });
    }
    // (and no further till she's bought, however fixed up the arena, the slide in or not)
    F().slide = true;
    g.economy.mods.street = fight.RESTO_OPENS + 1; g.run(0.2);
    expect(rs.restoShows()).toMatchObject({ stage: 1, mama: false, diners: 0, wreck: false });
    // bought, she's open for business, however little the arena's fixed up, and the line runs on past the stall to her
    g.economy.mods.street = 0;
    F().mama = true; g.run(0.2);
    expect(rs.restoShows()).toMatchObject({ stage: 2, mama: true, says: rs.OPENING, belt: true });
    expect(rs.restoShows()!.diners).toBeGreaterThan(0);
    // and a batch for her goes along the line, from the hopper by the pot
    F().quiet = false;
    fight.on.resto(fight.BATCH, 1);
    g.run(1.5);
    expect(rs.restoShows()!.under).toBeGreaterThan(0);
  }, 30_000);

  it('the bowl slide is a bowl line in place of the counter, the pot to the soup square by itself, under the floor', async () => {
    const { g, plan, fight, at, F, cellar } = await ring({ ring: { beaten: 1 } });
    const rk = await import('../src/ringKitchen');
    const table = () => { let up = false; cellar.bowlTable.g!.traverse(o => { if ((o as import('three').Mesh).isMesh && o.visible) up = true; }); return up; };
    at(plan.WATCH);
    F().counter = Array(10).fill(false); F().stall = [];
    g.run(1);
    expect(F().stall.length).toBe(0);
    expect(rk.slideParts.visible).toBe(false);
    expect(table()).toBe(true);
    fight.buySlide();
    g.run(0.5);
    expect(F().stall.length).toBeGreaterThan(3);
    // (the line laid, the counter gone; bowls on their way, from the hopper by the pot to the soup square)
    expect(rk.slideParts.visible).toBe(true);
    expect(table()).toBe(false);
    expect(rk.slideShows()).toBeGreaterThan(0);
    g.run(1);
    expect(F().counter.length).toBe(0);
    expect(F().stall.length).toBe(10);
    // (the attendant, who carried them, goes over to work the line's motor, and carries no more)
    fight.hire('attendant');
    F().counter = Array(10).fill(false); F().stall = [];
    g.run(8);
    const p = rk.crewPerson('attendant')!.position;
    expect(Math.hypot(p.x - plan.MOTOR_AT.x, p.z - plan.MOTOR_AT.z)).toBeLessThan(0.3);
    expect(F().crew.find(w => w.role === 'attendant')!.carry).toBe(null);
  }, 30_000);

  it("with the player at the pot all through the rush, it turns at least what the gong promised", async () => {
    const { fight: f, plan, at } = await ring({ level: 0 });
    f.resetFight();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) f.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) f.hire(r);
    for (let t = 0; t < 90; t += 0.05) f.step(0.05);
    at(plan.POT_PAD);
    const fc = f.forecast()!;
    expect(f.ringGong()).toBe(true);
    const tick = () => { f.step(0.05); f.playerAtPot(0.05); };
    while (f.F.called) tick();
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) tick();
    expect(f.F.rush!.turned).toBeGreaterThanOrEqual(fc.turned);
  });

  it('opens with the bosses: the tiers build the venue up and bring more fans', async () => {
    const { g, buy, F, fight, cellar } = await ring({ money: 10_000_000 });
    expect(offered(g)).not.toContain('tier1');
    expect(offered(g)).not.toContain('cook');
    F().beaten = 1;
    g.run(0.1);
    expect(offered(g)).not.toContain('tier1');
    F().beaten = 2;
    g.run(0.1);
    expect(offered(g)).toContain('tier1');
    const before = fight.crowdNow();
    buy('tier1');
    expect(F().tier).toBe(1);
    expect(cellar.parts.bleachers.visible).toBe(true);
    expect(fight.crowdNow()).toBeGreaterThan(before);
    expect(offered(g)).not.toContain('tier2');
  });
});

describe("the workshop's crafting bench", () => {
  it('is through the hearth room, and sells bowl price, fans and crew too, priced in chips', async () => {
    const { g, cellar, plan, at } = await ring({ money: 100_000_000 });
    expect(cellar.roomAt(plan.BENCH_PAD)).toBe('craft');
    expect(cellar.cellarWay(cellar.LADDER_FOOT, plan.BENCH_PAD).map(w => cellar.roomAt(w))).toContain('kitchen');
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(false);
    expect([...$('shopRows').querySelectorAll('[data-mod]')].map(b => (b as HTMLElement).dataset.mod)).toEqual(['bowls', 'street', 'cellarcrew']);
    expect($('shopRows').textContent).toContain('🐡');
    // (and it leaves the camera where it is)
    expect($('shop').dataset.still).toBe('1');
    // the same spot upstairs is just the dock
    g.stage.setLevel(false);
    g.placePlayer(plan.BENCH_PAD.x, plan.BENCH_PAD.z);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(true);
  });

  it("is through a doorway by the bench, at the west end of the hearth room's south wall, that opens onto its square", async () => {
    const { g, cellar, plan, at } = await ring({ money: 10_000_000 });
    const L = g.layout, d = L.DOORS.find(t => t.b === 'craft')!, B = plan.BENCH_PAD, HALF = 0.95;
    // the doorway's in the west half of the wall, with the bench's square straight ahead through it
    expect(d.x1).toBeLessThan((L.CRAFT.x0 + L.CRAFT.x1) / 2);
    expect(B.x + HALF).toBeGreaterThan(d.x0 + 0.3);
    expect(B.x - HALF).toBeLessThan(d.x1 - 0.3);
    // nothing in the doorway, or within a metre of it either side, or on the square
    const boxes = cellar.cellarBoxes({ rice: 6, fish: 6, mush: 6 });
    const hits = (x0: number, x1: number, z0: number, z1: number) => boxes.filter(([cx, cz, hx, hz]) => cx + hx > x0 && cx - hx < x1 && cz + hz > z0 && cz - hz < z1);
    expect(hits(d.x0, d.x1, d.z0 - 1, d.z1 + 1)).toEqual([]);
    expect(hits(B.x - HALF, B.x + HALF, B.z - HALF, B.z + HALF)).toEqual([]);
    // walking straight in from the hearth room: through the doorway and onto the square, which opens the bench's menu
    const x = (d.x0 + d.x1) / 2;
    at({ x, z: d.z0 - 1 });
    for (let i = 0; i < 60; i++) { g.player.g.position.z += 0.05; g.run(1 / 60); }
    expect(g.player.g.position.z).toBeCloseTo(d.z0 + 2, 5);
    expect(g.player.g.position.x).toBeCloseTo(x, 5);
    expect($('shop').hidden).toBe(false);
  });

  it('on a touch screen it opens folded, a Shop button out of the thumb\'s way, then a ladder: tap to pick, then Buy', async () => {
    const { g, plan, at, F } = await ring({ money: 10_000_000 });
    // (a first touch: the game's a touch screen's from then on)
    window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    expect(Number($('craftN').textContent)).toBeGreaterThan(0);
    $('craft').click();
    g.run(0.1);
    expect($('shop').hidden).toBe(false);
    expect($('shop').classList.contains('ladder')).toBe(true);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(false);
    // a column a room along the top, a bar a gate: the practice fight's won, Hakkaku's next
    expect([...$('shopRows').querySelectorAll('.treeHead .laneName')].map(l => l.textContent)).toEqual(['🍚Rice', '🐟Fish', '🍄Grow', '🍲Hearth', '🏮Venue']);
    expect([...$('shopRows').querySelectorAll<HTMLElement>('.bar')].map(b => b.className.replace('bar ', ''))).toEqual(['won', 'next', 'later', 'later', 'later', 'later']);
    expect($('shopRows').querySelector('.bar.next')!.textContent).toBe('🔒 Beat Hakkaku 🐙');
    const node = (id: string) => $('shopRows').querySelector<HTMLButtonElement>(`[data-tile="${id}"]`)!;
    const buy = () => $('shopPick').querySelector<HTMLButtonElement>('.buy')!;
    // (it starts on the first thing there are the chips for: a drying rack, since the ring's levels wait for Hakkaku)
    expect($('shopRows').querySelector('[data-mod="bowls"]')!.classList.contains('locked')).toBe(true);
    expect(node('rack').getAttribute('aria-pressed')).toBe('true');
    node('steam').click();
    g.run(0.1);
    expect(node('steam').getAttribute('aria-pressed')).toBe('true');
    expect($('shopPick').textContent).toContain('Beat Yokobashiri 🦀 first');
    expect(buy().disabled).toBe(true);
    // pick, then buy
    node('rack').click();
    g.run(0.1);
    expect($('shopPick').textContent).toContain('More room on the rice line');
    buy().click();
    g.run(0.1);
    expect(F().lines.rice.n).toBe(2);
    expect(node('rack').textContent).toContain('🐡 15');
    $('shopShut').click();
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    // walking off puts it away, and back on it's folded again
    at({ x: plan.BENCH_PAD.x + 3, z: plan.BENCH_PAD.z });
    g.run(0.1);
    expect($('craft').hidden).toBe(true);
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
  });

  it("opens the ring's levels two at a time, a boss beaten each, all eight before Fukure; a save past that keeps its levels", async () => {
    const { g, F } = await ring({ money: 100_000_000 });
    const shop = g.shop, eco = g.economy;
    for (const id of ['bowls', 'street', 'cellarcrew'] as const) {
      // (nothing before Hakkaku)
      expect(shop.buyMod(id)).toBe(false);
      for (let b = 1; b <= 4; b++) {
        F().beaten = b;
        expect(shop.buyMod(id)).toBe(true);
        expect(shop.buyMod(id)).toBe(true);
        expect(shop.buyMod(id)).toBe(false);
        expect(eco.mods[id]).toBe(2 * b);
      }
      // (eight's the most, Pricier bowls too)
      F().beaten = 5;
      expect(shop.buyMod(id)).toBe(false);
      F().beaten = 0;
    }
    const old = await ring({ money: 100_000_000, mods: { street: 5 }, ring: { beaten: 1 } });
    expect(old.g.economy.mods.street).toBe(5);
    expect(old.g.shop.buyMod('street')).toBe(false);
    expect(old.g.shop.modOpen('bowls')).toBe(true);
  });

  it('has nothing to buy on the landing or in the rooms any more', async () => {
    const { g, at } = await ring({ money: 100_000_000, ring: { beaten: 1 } });
    const { LANDING, PREP, KITCHEN, GROW } = g.layout;
    for (const r of [LANDING, PREP, KITCHEN, GROW]) {
      at({ x: (r.x0 + r.x1) / 2 - 1.0, z: (r.z0 + r.z1) / 2 });
      g.run(0.1);
      expect($('shop').hidden).toBe(true);
      expect($('craft').hidden).toBe(true);
    }
  });

  it("a close-up looks at what was built even as it pops in from nothing, and never at somewhere nowhere near the player", async () => {
    const { g, cellar } = await ring({ ring: { beaten: 1 } });
    const { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } = await import('three');
    const sp = await import('../src/spotlight');
    const { view } = g.stage;
    g.run(0.5);
    const near = g.player.g.position.clone();
    // laid out from the world's middle (its foot's 30 m over the cellar), and only just starting to pop in
    const group = new Group(), m = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshBasicMaterial());
    m.position.set(near.x + 1.5, near.y, near.z); group.add(m); group.scale.setScalar(0.001);
    cellar.cellar.add(group);
    expect(sp.spotlight([group])).toBe(true);
    g.run(sp.SPOT_WAIT + sp.SPOT.over + 0.3);
    group.scale.setScalar(1);
    expect(view.close).toBeLessThan(1);
    expect(view.focus.distanceTo(m.getWorldPosition(new Vector3()))).toBeLessThan(0.3);
    g.run(sp.SPOT.hold + sp.SPOT.back + 0.3);
    // something far off from the player: no close-up at all
    const far = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshBasicMaterial());
    far.position.set(near.x, near.y + 60, near.z); cellar.cellar.add(far);
    sp.spotlight([far]);
    g.run(sp.SPOT_WAIT + sp.SPOT.over + 0.3);
    expect(view.close).toBe(1);
    expect(sp.spotOn()).toBe(false);
  }, 30_000);

  it('puts what it builds in the spotlight, as upstairs: the new rack, a hire, the racks swapped for steam baskets', async () => {
    const { g, plan, at, buy } = await ring({ money: 10_000_000, ring: { beaten: 2 } });
    const { Box3, Vector3 } = await import('three');
    const kitchen = await import('../src/ringKitchen');
    const { view } = g.stage, focus = view.focus.clone();
    const { SPOT_WAIT: W } = await import('../src/spotlight');
    type O = import('three').Object3D;
    /** How far the camera's spotlight is from the middle of `os`. */
    const off = (os: O[]) => {
      const mid = os.reduce((m, o) => m.add(new Box3().setFromObject(o).getCenter(new Vector3())), new Vector3()).divideScalar(os.length);
      return view.focus.distanceTo(mid);
    };
    at(plan.BENCH_PAD);
    g.run(0.1);
    // a drying rack: the camera goes over to the new one (the second) and in close, then back to the player
    buy('rack');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    const rack = kitchen.built({ line: 'rice' });
    expect(rack).toHaveLength(1);
    expect(off(rack)).toBeLessThan(0.1);
    // the menu steps out of the camera's way meanwhile
    expect($('shop').classList.contains('away')).toBe(true);
    g.run(3);
    expect(view.close).toBe(1);
    expect(view.focus.equals(focus)).toBe(true);
    // and comes back once it's over, the player still at the counter
    expect($('shop').classList.contains('away')).toBe(false);
    expect($('shop').hidden).toBe(false);
    // a hire: on him, from where he starts by the racks, followed (a step behind) as he sets off to work
    buy('washer');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    expect(off([kitchen.crewPerson('washer')!])).toBeLessThan(1);
    g.run(3);
    // the steam baskets: on both the racks they're swapped for
    buy('steam');
    g.run(W + 0.8);
    // (a little off their boxes' middles: the washer's filling them as it plays)
    expect(off(kitchen.built({ line: 'rice', all: true }))).toBeLessThan(0.25);
    expect(kitchen.built({ line: 'rice', all: true })).toHaveLength(2);
    g.run(3);
    // (and it goes in the middle of the space the bench's menu leaves: ui.test.ts)
    expect($('shop').dataset.still).toBe('1');
  });

  it("leaves the camera on the player while a boss is in, and ends a spotlight up or down the ladder", async () => {
    const { g, plan, at, buy, fight, stage, F } = await ring({ money: 10_000_000 });
    const { view } = g.stage;
    const { SPOT_WAIT: W } = await import('../src/spotlight');
    at(plan.BENCH_PAD);
    g.run(0.1);
    // a boss's crowd coming in: what's bought pops in, but the camera stays on the player
    expect(fight.ringGong()).toBe(true);
    g.run(0.1);
    const kitchen = await import('../src/ringKitchen');
    buy('rack');
    expect(kitchen.built({ line: 'rice' })[0].scale.x).toBeLessThan(1); // popping in
    g.run(W + 0.8);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
    g.runUntil(() => !F().rush, 60 + fight.WALK_IN);
    // with him gone, a moment on camera again; and up the ladder, it ends at once, the camera with the player
    at(plan.BENCH_PAD);
    g.run(0.1);
    buy('rack');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    stage.setLevel(false);
    g.run(0.05);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
  }, 60_000);

  it('waits till the player has stopped buying: three salt barrels in a row get the one close-up, on all three', async () => {
    const { g, plan, at, buy } = await ring({ money: 10_000_000, ring: { beaten: 2 } });
    const { Box3, Vector3 } = await import('three');
    const kitchen = await import('../src/ringKitchen');
    const { SPOT, SPOT_WAIT } = await import('../src/spotlight');
    const { view } = g.stage;
    type O = import('three').Object3D;
    const off = (os: O[]) => {
      const mid = os.reduce((m, o) => m.add(new Box3().setFromObject(o).getCenter(new Vector3())), new Vector3()).divideScalar(os.length);
      return view.focus.distanceTo(mid);
    };
    at(plan.BENCH_PAD);
    g.run(0.1);
    // bought one after another (each a click and a moment apart): the camera stays put, the menu with it, for the next
    const shop = document.getElementById('shop')!;
    for (let i = 0; i < 3; i++) {
      buy('barrel');
      expect(view.close).toBe(1);
      expect(view.k).toBe(0);
      expect(shop.classList.contains('away')).toBe(false);
    }
    // then, once the player's stopped for a moment, one close-up, framing the three new barrels
    g.run(SPOT_WAIT + SPOT.over + 0.2);
    expect(view.close).toBeCloseTo(0.6);
    const barrels = kitchen.built({ line: 'fish', all: true }).slice(1);
    expect(barrels).toHaveLength(3);
    expect(off(barrels)).toBeLessThan(0.1);
    expect(shop.classList.contains('away')).toBe(true);
    // and only the one: it ends, and the camera stays on the player after
    g.run(SPOT.hold + SPOT.back);
    expect(view.close).toBe(1);
    for (let i = 0; i < 20; i++) { g.run(0.2); expect(view.k).toBe(0); }
    // things bought in a row that are far apart (a rack in the prep hall, the attendant by the pot): on the last
    buy('rack');
    buy('attendant');
    g.run(SPOT_WAIT + SPOT.over + 0.2);
    expect(view.close).toBeCloseTo(0.6);
    expect(off([kitchen.crewPerson('attendant')!])).toBeLessThan(1);
    // and up the ladder while it waits: no close-up at all
    g.run(4);
    const stage = await import('../src/stage');
    buy('barrel');
    stage.setLevel(false);
    g.run(SPOT_WAIT + SPOT.over);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
  }, 60_000);
});
