// A bot that plays the game the way a reasonable player would, for balance simulations (test/balance.sim.test.ts):
// it fishes, carries, sells, collects cash and buys the next upgrade as soon as it can afford it. It walks at the
// player's speed and goes round obstacles by fixed waypoints, so its timings are close to a human's. Down in the
// cellar (stage 3) it runs whichever lines have no hire yet (rice and fish from the bins into the racks and barrels,
// ready ones to the pot), cooks, carries bowls to the bar, and rings the gong once it says the boss is beaten (playing
// the cooking show at the pot first when only its bonus would do it, and landing a good slam on a grand win); it needs
// the cellar's modules for that (`ring`, see ringModules).
import type { loadGame } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;
/** The modules the bot plays the ring with. */
export async function ringModules() {
  const [cellar, plan, fight] = await Promise.all([import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight')]);
  return { cellar, plan, fight };
}
type Ring = Awaited<ReturnType<typeof ringModules>>;
interface P { x: number; z: number }
const CASINO_GAMES = ['blackjack', 'slots'];

export interface Purchase { t: number; id: string; cost: number; money: number; rating: number }
export interface Sample { t: number; money: number; earned: number; rating: number; stage: number; idle: number; wait: number; bowls: number; prize: number; spent: number; fc: string }
/** A boss's rush (stage 3): when his bell ended, who, his crowd and the more-than-half to turn, how many were turned
 *  (and what the gong forecast as it was rung), the bell's seconds used, and how long the soup bar stood empty. */
export interface Fought { t: number; boss: string; n: number; need: number; turned: number; forecast: number; win: boolean; bell: number; dry: number; waited: boolean; bonus: number; slam: number }
/** How the bot plays the cellar: the cooking show's stars it earns, of 12 (0: it never plays it) and the
 *  seconds of real time a show takes (the game holds still meanwhile, so they're added to the clock), and whether it
 *  goes for the slam on a grand win, and lends the hired lines a hand when there's nothing else to do; `skip`, what it
 *  never buys (an upgrade's id, or a level's with how many it stops at: `street5`), to see what they're worth. */
export interface Style { show: number; showSecs: number; slam: boolean; help: boolean; skip?: string[] }
export const STYLE: Style = { show: 9, showSecs: 40, slam: true, help: true };
/** Stage 3's books: chips earned from bowls and prizes, spent by kind, the cooking shows played (and their seconds),
 *  and the seconds the bot stood about by the pot: cooking there as it does (`wait`), or with nothing at all to do
 *  (`idle`: the pot can't cook). */
export interface Books { bowls: number; prize: number; resto: number; spent: Record<string, number>; shows: number; showSecs: number; idle: number; wait: number; lines: string[]
  /** Each local fight as its fans sat down: when, how many came, how many ate, and the bowls left over in the pot, on the counter and on the stall. */
  locals: { t: number; crowd: number; fed: number; left: number }[] }

/** Plays `g` for `seconds` of game time. Returns what it bought when, and samples of money and earnings. */
export function play(g: Game, seconds: number, dt = 0.05, ring?: Ring, style: Style = STYLE) {
  const { player, wallet } = g;
  const p = player.g.position;
  const bought: Purchase[] = [], samples: Sample[] = [], fights: Fought[] = [];
  const logged = new WeakSet<object>();
  let rangFc = -1, wasCalled = false, waited = false;
  const books: Books = { bowls: 0, prize: 0, resto: 0, spent: {}, shows: 0, showSecs: 0, idle: 0, wait: 0, lines: [], locals: [] };
  const spend = (kind: string, v: number) => { if (kind === 'buyout' || !ring?.fight.F.boughtOut) books.spent[kind] = (books.spent[kind] ?? 0) + v; };
  if (ring) {
    const was = ring.fight.on.earn;
    ring.fight.on.earn = (c, why) => { if (!ring.fight.F.boughtOut) books[why] += c; was(c, why); };
  }
  /** Machines on each line so far (stage 3: a line's tile is bought again and again). */
  const machines = ring ? { rice: ring.fight.F.lines.rice.n, fish: ring.fight.F.lines.fish.n, mush: ring.fight.F.lines.mush.n } : null;
  /** The best the gong's forecast has said, for each boss (by name), whether rung or not. */
  const best = new Map<string, number>();
  let rushBonus = 0;
  /** What the gong said last, for the samples: the boss, turned of needed. */
  let lastFc = '';
  let t = 0, earned = 0, lastMoney = wallet.money, nextSample = 0, beaten = ring ? ring.fight.F.beaten : 0;
  let plan: { path: P[]; until: () => boolean; maxT: number; buy?: boolean } | null = null;
  /** Holding E, to buy the tile it's standing on. */
  let holding = false;
  const hold = (on: boolean) => { if (on !== holding) { holding = on; g.press('e', on ? 'keydown' : 'keyup'); } };

  /** Adds money earned (not spent) to the running total. */
  const track = () => {
    if (wallet.money > lastMoney) earned += wallet.money - lastMoney;
    lastMoney = wallet.money;
  };
  /** Upgrades bought so far (by id, with how many times, for upgrades that can be bought again). */
  const seen = new Map<string, number>([...g.unlocks.tiles.map(x => [x.id, x.done ? 1 : 0] as [string, number]),
    ...g.economy.MODS.map(m => [m.id, g.economy.mods[m.id]] as [string, number])]);
  const step = () => {
    track();
    g.game.tick(dt);
    track();
    t += dt;
    for (const x of g.unlocks.tiles) {
      if (x.done && !seen.get(x.id) && !(ring && x.line)) {
        seen.set(x.id, 1); bought.push({ t, id: x.id, cost: x.cost, money: wallet.money, rating: g.rating.rating() });
        if (ring && x.stage === 3) spend(x.id === 'buyout' ? 'buyout' : x.id.startsWith('tier') ? 'venue' : ['steam', 'smoke', 'shelves'].includes(x.id) ? 'line upgrades' : 'hires', x.cost / 1000);
      }
    }
    if (ring && machines) for (const k of ['rice', 'fish', 'mush'] as const) {
      const n = ring.fight.F.lines[k].n;
      // (the grow room's first bed is Hakkaku's prize)
      while (machines[k] < n) {
        machines[k]++;
        if (k === 'mush' && machines[k] === 1) continue;
        const cost = Math.round(ring.fight.MACH_COST[k] * ring.fight.MACH_STEP ** (machines[k] - 2)) * 1000;
        bought.push({ t, id: `${k}#${machines[k]}`, cost, money: wallet.money, rating: g.rating.rating() });
        spend('machines', cost / 1000);
      }
    }
    for (const m of g.economy.MODS) {
      const n = g.economy.mods[m.id];
      if (n > seen.get(m.id)!) {
        seen.set(m.id, n);
        bought.push({ t, id: `${m.id}${n}`, cost: Math.round(m.cost * m.step ** (n - 1)), money: wallet.money, rating: g.rating.rating() });
        if (ring) spend(`level: ${m.id}`, Math.round(m.cost * m.step ** (n - 1)) / 1000);
      }
    }
    // (and every boss's rush, once his bell's done)
    const R = ring?.fight.F.rush;
    // (whether he was called in during a local fight, and walked in after it)
    if (ring && R && !R.done && R.walk === ring.fight.WALK_IN) waited = wasCalled;
    wasCalled = !!ring?.fight.F.called;
    if (ring && R?.done && !logged.has(R)) {
      logged.add(R);
      const b = ring.fight.bossOf(R.boss);
      fights.push({ t, boss: b.name, n: R.n, need: ring.fight.toBeat(b, R.n), turned: R.turned, forecast: rangFc, win: R.win, bell: R.t, dry: R.dryT, waited, bonus: rushBonus, slam: R.slam });
    }
    // (the bonus the pot had as a boss walked in)
    if (ring && R && !R.done && R.walk === ring.fight.WALK_IN) rushBonus = ring.fight.F.bonus.t > 0 ? ring.fight.F.bonus.pct : 0;
    // a grand win's slam, a good one: a little after the rings meet
    if (ring && style.slam && ring.fight.slamDue() && ring.fight.F.bout.t >= ring.fight.SLAM.at + 0.15) ring.fight.slam();
    // (down in the cellar, the bosses beaten, as if bought)
    if (ring && ring.fight.F.beaten > beaten) {
      beaten = ring.fight.F.beaten;
      bought.push({ t, id: `beat ${ring.fight.BOSSES[beaten - 1].name}`, cost: 0, money: wallet.money, rating: g.rating.rating() });
    }
    if (ring && !ring.fight.F.rush && ring.fight.F.bout.phase === 'sit' && ring.fight.F.bout.crowd > 0 && ring.fight.F.bout.t <= dt + 1e-9 && !ring.fight.F.boughtOut) {
      const F = ring.fight.F;
      lastLocal = { crowd: F.bout.crowd, fed: F.bout.fed };
      books.locals.push({ t, crowd: F.bout.crowd, fed: F.bout.fed, left: F.pot.length + F.counter.length + F.stall.length });
    }
    else if (ring && !ring.fight.F.rush && ring.fight.F.bout.phase === 'sit' && ring.fight.F.bout.crowd > 0) lastLocal = { crowd: ring.fight.F.bout.crowd, fed: ring.fight.F.bout.fed };
    if (t >= nextSample) {
      samples.push({ t, money: wallet.money, earned, rating: g.rating.rating(), stage: g.layout.stage.n, idle: books.idle, wait: books.wait, bowls: books.bowls, prize: books.prize, spent: Object.values(books.spent).reduce((a, b) => a + b, 0), fc: lastFc });
      nextSample += 10;
    }
  };

  // ---------- navigation ----------
  const inS = (q: P) => g.layout.stage.n === 2 && q.z > 3.3 && q.x > -10.2 && q.z < 15.5;
  const inFarm = (q: P) => g.layout.stage.n === 2 && q.x < -10.2;
  /** Waypoints from where the player is to `to`, round the kitchen line, the bar and through the farm door. */
  function route(to: P): P[] {
    if (g.layout.level.down && ring) {
      // through the doorways, room by room, and round the furniture (and the ladder's foot) in each
      const c = ring.cellar, L = c.LADDER_PAD, n = (k: 'rice' | 'fish' | 'mush') => ring.fight.F.lines[k].n;
      const boxes = [...c.cellarBoxes({ rice: n('rice'), fish: n('fish'), mush: n('mush') }), [L.x, L.z, L.r, L.r] as [number, number, number, number]];
      const out: P[] = [];
      let here: P = { x: p.x, z: p.z };
      for (const w of c.cellarWay(here, to)) {
        out.push(...cellarRoute(boxes, here, w, g.layout.ROOMS[c.roomAt(w)]));
        here = w;
      }
      return out;
    }
    if (g.layout.stage.n === 1) return [to];
    const DOOR_IN = { x: -9.2, z: 3.2 }, DOOR_OUT = { x: -11.7, z: 3.2 };
    const out: P[] = [];
    let here: P = { x: p.x, z: p.z };
    const side = (q: P) => (q.x < 0 ? -1 : 1);
    const farmFrom = inFarm(here), farmTo = inFarm(to);
    // the fertilizer shed's deck is reached from the south end of the path
    const PATH_END = { x: -11.7, z: 6.0 }, yard = (q: P) => inFarm(q) && q.z > 5.5;
    if (yard(here) && !yard(to)) { out.push(PATH_END); here = PATH_END; }
    if (farmFrom && !farmTo) { out.push(DOOR_OUT, DOOR_IN); here = DOOR_IN; }
    if (!farmFrom && farmTo) {
      if (inS(here)) out.push({ x: -6.9, z: 4.2 }); else out.push({ x: -6.9, z: 1.6 }, { x: -6.9, z: 3.2 });
      out.push(DOOR_IN, DOOR_OUT);
    }
    if (yard(to) && !yard(here)) out.push(PATH_END);
    const garden = (q: P) => q.z > 15.5;
    if (garden(to) && !garden(here)) {
      if (!inS(here)) out.push({ x: 6.9, z: 1.6 }, { x: 6.9, z: 4.2 });
      out.push({ x: 7.6, z: 12.5 }, { x: 0, z: 14.4 }, { x: 0, z: 16.6 });
      out.push(to);
      return out;
    }
    if (garden(here) && !garden(to)) { out.push({ x: 0, z: 16.6 }, { x: 0, z: 14.4 }); here = { x: 0, z: 14.4 }; }
    if (!farmTo) {
      if (inS(here) !== inS(to)) {
        const s = inS(to) ? side(to) : side(here);
        if (inS(here)) out.push({ x: s * 6.9, z: 4.2 }, { x: s * 6.9, z: 1.6 });
        else out.push({ x: s * 6.9, z: 1.6 }, { x: s * 6.9, z: 4.2 });
      }
      if (inS(to) && to.z > 7) out.push({ x: side(to) * 7.6, z: Math.min(to.z, 12.5) });
      // across the bar, from one side of it to the other: round its end
      else if (inS(here) && inS(to) && (here.z - 9) * (to.z - 9) < 0 && Math.abs(to.x) < 6.6) {
        const s = side(here);
        out.push({ x: s * 7.6, z: here.z }, { x: s * 7.6, z: to.z });
      }
    }
    out.push(to);
    return out;
  }
  /** The latest plans, for debugging. */
  const trace: string[] = [];
  function go(to: P, until: () => boolean, maxT = 30, buy = false) {
    plan = { path: route(to), until, maxT: t + maxT, buy };
    trace.push(`${mmss(t)} → ${to.x.toFixed(1)},${to.z.toFixed(1)} via ${plan.path.length - 1}`);
    if (trace.length > 12) trace.shift();
  }
  function walk() {
    const pl = plan!;
    const w = pl.path[0];
    if (w) {
      const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz), s = player.speed * dt;
      if (d < Math.max(0.05, s)) { if (pl.path.length > 1 || d < 0.05) pl.path.shift(); p.x = w.x; p.z = w.z; }
      else { p.x += dx / d * s; p.z += dz / d * s; player.h = Math.atan2(dx, dz); }
    }
    hold(!!pl.buy && !pl.path.length);
    if (pl.until() || t > pl.maxT) { plan = null; hold(false); }
  }

  // ---------- what to do next ----------
  const near = (a: P, r: number) => (p.x - a.x) ** 2 + (p.z - a.z) ** 2 < r * r;
  const cashSpots = () => {
    const out: { pos: P; v: number }[] = [];
    const add = (pos: P, items: { userData: Record<string, number> }[]) => {
      const v = items.reduce((s, b) => s + b.userData.value, 0);
      if (v > 0) out.push({ pos, v });
    };
    for (const C of g.counters.COUNTERS) if (C.enabled || C.cash.n) add(C.cashPos, C.cash.items);
    // (down in the cellar, chips go straight into the wallet)
    if (g.layout.level.down) return [];
    if (g.restaurant.sushi.built) add(g.restaurant.REGISTER, g.restaurant.register.items);
    return out.sort((a, b) => b.v - a.v);
  };
  // it doesn't gamble: the casino boat's other games are fun extras, out of the balance (docs/balance.md)
  const nextTile = () => g.unlocks.visibleTiles().filter(x => !g.unlocks.locked(x) && !CASINO_GAMES.includes(x.id) && Math.abs((x.y ?? 0.15) - p.y) < 2)
    .sort((a, b) => (a.cost - a.paid) - (b.cost - b.paid))[0];
  /** Down in the cellar, the cheapest upgrade on sale in the crafting bench's menus (none while a boss is in). */
  const nextMenu = () => (ring && g.layout.level.down && !ring.fight.F.rush ? g.unlocks.menuOffer().filter(x => !style.skip?.includes(x.id)).sort((a, b) => a.cost - b.cost)[0] : undefined);
  /** The cheapest repeatable upgrade of this stage that isn't fully upgraded. */
  const nextMod = () => g.economy.MODS.filter(m => m.stage === g.layout.stage.n && g.economy.modCost(m.id) !== null && g.shop.modOffered(m.id) && g.shop.modOpen(m.id) && useful(m.id))
    .sort((a, b) => g.economy.modCost(a.id)! - g.economy.modCost(b.id)!)[0];

  /** Down in the cellar, a reasonable player doesn't speed up hires they haven't got, or bring in more fans while the
   *  last local fight's already sent some home hungry. */
  let lastLocal = { crowd: 0, fed: 0 };
  const useful = (id: string) => {
    if (!ring || !g.layout.level.down) return true;
    if (style.skip?.some(k => k === id || (k.startsWith(id) && Number(k.slice(id.length)) <= g.economy.mods[id as 'street']))) return false;
    if (id === 'cellarcrew') return ring.fight.F.crew.length > 0;
    if (id === 'street') return lastLocal.fed >= lastLocal.crowd - 1;
    return true;
  };
  function decide() {
    // (nor a ring level while a boss is in: the shop's across the cellar, and the rush wants the player's hands)
    const tile = nextTile(), mod = g.stage.staging() || ring?.fight.F.rush ? undefined : nextMod();
    const cash = cashSpots(), uncollected = cash.reduce((s, c) => s + c.v, 0);
    // (with a gold tile in sight, it saves up for that rather than buying more levels)
    let modCost = mod && !(tile?.gold) ? g.economy.modCost(mod.id)! : Infinity;
    const menu = nextMenu();
    // (down in the cellar, the shop's tree comes first: it saves up for its next node, and only buys a level of the
    // ring's on the way if it's a small one next to it)
    if (ring && menu && g.layout.level.down && modCost > menu.cost * 0.3) modCost = Infinity;
    if (ring && menu && wallet.money >= menu.cost && menu.cost <= modCost) {
      const at = ring.plan.ROOM_MENUS[menu.menu!];
      go(at, () => menu.done || (near(at, 0.6) && (g.unlocks.buyFromMenu(menu) || true)), 25);
      return;
    }
    if (mod && wallet.money >= modCost && (!tile || modCost < tile.cost - tile.paid)) {
      const at = mod.shed ? g.shed.SHED_AT : g.shop.SHOPS[g.layout.stage.n - 1], lv = g.economy.mods[mod.id];
      go(at, () => near(at, 0.6) && (g.shop.buyMod(mod.id) || true) || g.economy.mods[mod.id] > lv, 25);
      return;
    }
    if (tile && wallet.money >= tile.cost - tile.paid) {
      const was = tile.paid;
      go(tile, () => tile.done || tile.paid < was, 25, true);
      return;
    }
    const target = Math.min(tile ? tile.cost - tile.paid : Infinity, modCost) - wallet.money;
    if (cash.length && (uncollected >= Math.min(target, 40) || uncollected > 150)) {
      const c = cash[0];
      go(c.pos, () => near(c.pos, 1.2) && cashSpots().every(x => x.pos !== c.pos), 20);
      return;
    }
    if (g.layout.stage.n === 1) return decide1();
    if (g.layout.level.down && ring) return decide3(ring);
    decide2();
  }

  /** The cellar: the gong when it says the boss is beaten, bowls to the soup bar, ready ones to the pot, the lines that
   *  have no hire, and otherwise waiting by the pot. */
  function decide3({ cellar, plan: P, fight: f }: Ring) {
    const F = f.F, back = player.back, room = () => back.cap - back.n;
    const READY = { rice: 'rrice', fish: 'cfish', mush: 'mush' } as const, HIRE = { rice: 'washer', fish: 'salter', mush: 'picker' } as const;
    // a boss, once the gong says his whole crowd will turn
    if (!F.rush && f.nextBoss()) {
      const fc = f.forecast(0, { need: f.toBeat(f.nextBoss()!) });
      if (fc) best.set(fc.boss.name, Math.max(best.get(fc.boss.name) ?? 0, fc.turned));
      if (fc) lastFc = `${fc.boss.face} ${fc.turned}/${f.toBeat(fc.boss)}`;
      // (the gong's panel says it from the gong: walk over, and ring it only if it still says so there)
      if (fc && fc.turned >= f.toBeat(fc.boss)) {
        rangFc = fc.turned;
        if (near(P.GONG_PAD, 0.3)) go(P.GONG_PAD, () => !!F.rush || F.called, 2, true);
        else go(P.GONG_PAD, () => near(P.GONG_PAD, 0.3), 20);
        return;
      }
      // not yet, but the cooking show's bonus would do it: play it at the pot first (the game holds still meanwhile)
      const tier = f.BONUS_TIERS.find(x => style.show >= x.min)!;
      const fb = tier.pct && f.canShow() && !F.called ? f.forecast(0, { bonus: tier.pct, need: f.toBeat(f.nextBoss()!) }) : null;
      if (fb && fb.turned >= f.toBeat(fb.boss)) {
        if (near(P.POT_PAD, 0.3)) {
          f.showResult(style.show);
          t += style.showSecs; books.shows++; books.showSecs += style.showSecs;
          books.lines.push(`${mmss(t)}  cooking show before ${fb.boss.name}: +${tier.pct}% (forecast ${fc?.turned ?? 0} → ${fb.turned}, need ${f.toBeat(fb.boss)})`);
        } else go(P.POT_PAD, () => near(P.POT_PAD, 0.3), 20);
        return;
      }
    }
    if (back.count('bowl') && F.stall.length < f.STALL_CAP) { go(P.BAR_PAD, () => !back.count('bowl') || F.stall.length >= f.STALL_CAP, 25); return; }
    // (ready ones with room for them on the ledge: with it full, they're no use at the pot)
    const carrying = () => f.inPot().some(k => back.count(READY[k]) && F.pantry[k] < f.LEDGE_CAP);
    if (carrying()) { go(P.POT_PAD, () => !carrying() && (!!F.hires.cook || !f.canCookNow()), 25); return; }
    // raw ones for a line that's been hired out from under them: into the bin, so their arms are free for bowls
    const toss = () => { const bin = cellar.KITCHEN_BINS[0]; go({ x: bin.x + 0.95, z: bin.z }, () => back.n === 0, 10, true); };
    if ((['rice', 'fish'] as const).some(k => F.hires[HIRE[k]] && back.count(k)) && !back.count('bowl') && !carrying()) { toss(); return; }
    if (!F.hires.attendant && F.counter.length && F.stall.length < f.STALL_CAP && room() && (F.counter.length >= Math.min(10, room()) || F.stall.length < 6)) {
      go(P.COUNTER_PAD, () => !back.hasRoom() || !F.counter.length, 15);
      return;
    }
    // (with the pot full and the ledge too, a batch goes up the belt to Mama Moray's)
    if (!F.hires.cook && f.canCookNow()) { go(P.POT_PAD, () => !f.canCookNow(), 15); return; }
    // the lines with no hire, the one the pot's shortest of first: ready ones out, raw ones in; and with nothing else
    // to do, a hand on the lines that have one (a player wouldn't stand about)
    // (not in a boss's rush, though: then the pot's theirs)
    const help = style.help && !back.count('bowl') && !F.rush;
    for (const k of [...f.inPot()].sort((a, b) => F.pantry[a] - F.pantry[b]).flatMap(k => (help ? [[k, 0], [k, 1]] : [[k, 0]]) as [typeof k, number][])
      .sort((a, b) => a[1] - b[1]).map(([k, pass]) => (pass && F.hires[HIRE[k]] && F.pantry[k] < f.LEDGE_CAP - 8 ? k : !pass && !F.hires[HIRE[k]] ? k : null))) {
      if (!k) continue;
      const ms = F.lines[k].m;
      const ready = ms.map((m, i) => [i, f.doneCount(k, m)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
      const raw = k === 'mush' ? 0 : back.count(k);
      if (ready.length && (room() || raw)) { const i = ready[0][0]; go(P.machinePad(k, i, ms.length), () => f.doneCount(k, ms[i]) === 0 || (!back.hasRoom() && !back.count(k)), 15); return; }
      if (k === 'mush') continue;
      const free = ms.map((m, i) => [i, f.freeCount(k, m)]).filter(([, n]) => n > 0);
      if (raw && free.length) { const i = free[0][0]; go(P.machinePad(k, i, ms.length), () => !back.count(k) || f.freeCount(k, ms[i]) === 0, 15); return; }
      const open = free.reduce((sum, [, n]) => sum + n, 0);
      if (open > raw && room()) { go(P.BIN_PADS[k], () => back.count(k) >= open || !back.hasRoom(), 10); return; }
    }
    // arms full of raw ones there's nowhere for: into the bin too (not ready ones: they wait at the pot for room on
    // the ledge; unless bowls on the counter want carrying to the stall, with the ledge full and nobody else to)
    const ready = () => f.inPot().some(k => back.count(READY[k]));
    const bowlsWait = !F.hires.attendant && F.counter.length > 0 && F.stall.length < 6;
    if (!room() && !back.count('bowl') && !carrying() && (!ready() || bowlsWait)) { toss(); return; }
    // (nothing to do: waiting by the pot)
    const t0 = t;
    go(P.POT_PAD, () => {
      if (near(P.POT_PAD, 0.3) && !F.boughtOut) { books.wait += dt; if (!f.canCookNow()) books.idle += dt; }
      return t - t0 >= 1;
    }, 1);
  }

  const { pile, PILE, PAD } = g.stations;
  const fishFrom = () => {
    if (pile.items.length >= Math.min(6, player.back.cap - player.back.n) && player.back.hasRoom()) {
      go({ x: PILE.x, z: PILE.z + 1.1 }, () => !player.back.hasRoom() || !pile.items.length, 15);
    } else go(PAD, () => pile.items.length >= Math.min(9, pile.cap - pile.n + pile.items.length), 12);
  };

  function decide1() {
    const fish = player.back.count('fish');
    const open = g.counters.COUNTERS.filter(C => C.enabled && C.dropPos && C.stock.hasRoom());
    if (fish && open.length) {
      const C = open.sort((a, b) => a.stock.n - b.stock.n)[0];
      go(C.dropPos!, () => !player.back.count('fish') || !C.stock.hasRoom(), 20);
      return;
    }
    fishFrom();
  }

  function decide2() {
    const r = g.restaurant, rice = g.rice;
    const fish = player.back.count('fish'), bags = player.back.count('rice'), room = player.back.cap - player.back.n;
    // out in the field with room for more: harvest the rest of what's ripe before carrying it in
    const ripeHere = rice.field.cells.filter(c => c.grow >= 1 && !c.taken)
      .sort((a, b) => (a.x - p.x) ** 2 + (a.z - p.z) ** 2 - ((b.x - p.x) ** 2 + (b.z - p.z) ** 2));
    if (inFarm(p) && room && ripeHere.length && r.ricePot.hasRoom()) {
      const c = ripeHere[0];
      go({ x: c.x, z: c.z }, () => !player.back.hasRoom() || c.grow < 1, 10);
      return;
    }
    if (fish && r.fishTray.hasRoom()) { go(r.FISH_DROP, () => !player.back.count('fish') || !r.fishTray.hasRoom(), 25); return; }
    if (bags && r.ricePot.hasRoom()) { go(r.RICE_DROP, () => !player.back.count('rice') || !r.ricePot.hasRoom(), 25); return; }
    const needFish = r.fishTray.n / r.fishTray.cap, needRice = r.ricePot.n / r.ricePot.cap;
    if (needRice <= needFish && r.ricePot.hasRoom()) {
      const ripe = rice.field.cells.filter(c => c.grow >= 1 && !c.taken);
      const enough = Math.min(room, 6);
      if (room && rice.fieldStack.items.length >= enough) {
        go(rice.STACK_AT, () => !player.back.hasRoom() || !rice.fieldStack.items.length, 25);
        return;
      }
      // fish the kitchen can't take go back to the pile at the rice, making room for it
      const stuck = fish > 0 && !r.fishTray.hasRoom();
      if ((room || stuck) && ripe.length && (ripe.length >= enough || !r.ricePot.n)) {
        const c = ripe[0];
        go({ x: c.x, z: c.z }, () => !player.back.hasRoom() || c.grow < 1, 20);
        return;
      }
    }
    // the runner keeps the fish tray stocked; only help out when it's running low
    if (r.fishTray.cap - r.fishTray.n >= Math.min(8, room) && room) fishFrom();
    else go(r.FISH_DROP, () => true, 1);
  }

  const end = t + seconds;
  while (t < end) {
    // (in the cellar, done ten seconds after the buyout: nothing after it is reported)
    if (ring?.fight.F.boughtOut) { const out = bought.find(b => b.id === 'buyout'); if (out && t - out.t > 10) break; }
    if (!plan) decide();
    if (plan) walk();
    step();
  }
  return { bought, samples, earned, trace, fights, best, books };
}

/**
 * The shortest way across the cellar from `a` to `b` round its boxes: a path along the boxes' corners (a little out from
 * them) that never cuts through one, and (given the room's `walls`) never leaves the room.
 */
export function cellarRoute(boxes: [number, number, number, number][], a: P, b: P, walls?: { x0: number; x1: number; z0: number; z1: number }): P[] {
  const PAD = 0.12, out = boxes.map(([cx, cz, hx, hz]) => [cx - hx - PAD, cx + hx + PAD, cz - hz - PAD, cz + hz + PAD]);
  const inside = (q: P) => out.some(([x0, x1, z0, z1]) => q.x > x0 + 0.01 && q.x < x1 - 0.01 && q.z > z0 + 0.01 && q.z < z1 - 0.01);
  /** Whether the segment from p to q passes through a box (Liang–Barsky clipping against each). */
  const blocked = (p: P, q: P) => out.some(([x0, x1, z0, z1]) => {
    let t0 = 0.001, t1 = 0.999;
    const dx = q.x - p.x, dz = q.z - p.z;
    for (const [pp, qq] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dz, p.z - z0], [dz, z1 - p.z]]) {
      if (pp === 0) { if (qq <= 0) return false; continue; }
      const r = qq / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 < t1;
  });
  if (!blocked(a, b)) return [b];
  const inRoom = (q: P) => !walls || (q.x >= walls.x0 && q.x <= walls.x1 && q.z >= walls.z0 && q.z <= walls.z1);
  const nodes: P[] = [a, b, ...out.flatMap(([x0, x1, z0, z1]) => [{ x: x0, z: z0 }, { x: x1, z: z0 }, { x: x0, z: z1 }, { x: x1, z: z1 }]).filter(q => !inside(q) && inRoom(q))];
  const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === 1) break;
    done[u] = true;
    for (let v = 0; v < nodes.length; v++) {
      if (done[v] || blocked(nodes[u], nodes[v])) continue;
      const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  if (prev[1] < 0) return [b];
  const path: P[] = [];
  for (let v = 1; v > 0; v = prev[v]) path.unshift(nodes[v]);
  return path;
}

/** Formats seconds as m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
