// A bot that plays the game the way a reasonable player would, for balance simulations (test/balance.sim.test.ts):
// it fishes, carries, sells, collects cash and buys the next upgrade as soon as it can afford it. It walks at the
// player's speed and goes round obstacles by fixed waypoints, so its timings are close to a human's. Down in the
// cellar (stage 3) it runs whichever lines have no hire yet (rice and fish from the bins into the racks and barrels,
// ready ones to the pot), cooks, carries bowls to the bar, and rings the gong once it says the boss is beaten (playing
// the cooking show at the pot first when only its bonus would do it, and countering a grand win's slaps and landing its slam, well); it needs
// the cellar's modules for that (`ring`, see ringModules). Or, as a try-hard (Style.tryhard), it plays the cellar to
// win as fast as it can: it buys by the numbers and rings as soon as the gong says it wins with the show aced.
import type { loadGame } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;
/** What each boss needs bought before his strength (💪) can be reached, by how many are beaten: what beating the boss
 *  before him opened (test/capacity.sim.test.ts, SIM_STEPS=window). A player sees it at the gong: "Lose" with the
 *  kitchen full, and that boss's card said what's new. */
const KEY: Record<number, string[]> = { 1: ['attendant'], 2: ['slide', 'mama'], 3: ['cook', 'smoke'], 4: ['fastslide'], 5: ['hall'] };
/** Seconds the try-hard's walk to Harry's desk and back takes (through the doorman's door and the club). */
const LOAN_WALK = 40;
/** What each of the cellar's upgrades does to the fight, for the try-hard's sums (a line's machines aside: addMachine). */
const BOSS_UP: Record<string, (f: Ring['fight']) => void> = {
  washer: f => f.hire('washer'), salter: f => f.hire('salter'), picker: f => f.hire('picker'), attendant: f => f.hire('attendant'), cook: f => f.hire('cook'),
  steam: f => f.upgradeLine('rice'), smoke: f => f.upgradeLine('fish'), shelves: f => f.upgradeLine('mush'), slide: f => f.buySlide(), fastslide: f => f.buyFastSlide(),
};
/** The modules the bot plays the ring with. */
export async function ringModules() {
  const [cellar, plan, fight, loan, loanDesk, piles] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/loan'), import('../src/loanDesk'), import('../src/chipPiles'),
  ]);
  return { cellar, plan, fight, loan, loanDesk, piles };
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
 *  plays a grand win's counters (COUNTER), and lends the hired lines a hand when there's nothing else to do; `skip`, what it
 *  never buys (an upgrade's id, or a level's with how many it stops at: `street5`), to see what they're worth. */
export interface Style { show: number; showSecs: number; slam: boolean; help: boolean; skip?: string[]
  /** Plays to win as fast as it can (SIM_TRY=1): the cooking show aced (+50%) before every boss, the gong rung as soon as
   *  its forecast with that says Win, perfect counters and slam, and down in the cellar it buys by the numbers, not the gong's
   *  word: the cheapest way to a Win (each upgrade tried in a copy of the cellar, its kitchen stocked, with the gong's
   *  own forecast), and an upgrade that brings in more chips only when it pays for itself before that way's afforded
   *  (or, with nothing in the way of the next boss, inside five minutes). */
  tryhard?: boolean }
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
  /** Where to walk to scoop each pile of chips (chipPiles.ts): onto it, on the hearth room's floor or by Mama Moray's
   *  counter. */
  const PILE_STAND = ring ? { bar: ring.plan.CHIP_SPOT, mama: ring.plan.MAMA_CHIPS } : { bar: { x: 0, z: 0 }, mama: { x: 0, z: 0 } };
  /** The try-hard's takings, a second apart over the last two minutes: chips from the stall and from Mama Moray's. */
  const takings: { t: number; stall: number; resto: number }[] = [];
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
    // a grand win's counters, good ones: each slap countered half way through his wind-up, and the final blow's slam a
    // little after the mark's flash (the try-hard's, perfect: late in the wind-up, and on the flash)
    const Q = ring && style.slam ? ring.fight.qte() : null;
    if (Q && ring) {
      const C = ring.fight.COUNTER, i = ring.fight.tellOf(Q), bt = ring.fight.F.bout.t;
      if (Q.final >= 0) { if (Q.hit < 0 && Q.final >= C.grow + (style.tryhard ? 0 : 0.15)) ring.fight.press(); }
      else if (i >= 0 && Q.at[i] - bt <= (style.tryhard ? 0.2 : C.tell - 0.4)) ring.fight.press();
    }
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
    if (style.tryhard && t >= (takings[takings.length - 1]?.t ?? -1) + 1) {
      takings.push({ t, stall: books.bowls, resto: books.resto });
      while (takings.length > 2 && takings[1].t < t - 120) takings.shift();
    }
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
    // (down in the cellar, the piles of chips: where to walk to scoop each, on the hearth room's floor or by Mama
    // Moray's counter; never in a boss's rush, when the kitchen wants every hand)
    if (g.layout.level.down) {
      if (!ring || ring.fight.F.rush || ring.fight.F.called) return [];
      const F = ring.fight.F;
      return (['bar', 'mama'] as const).filter(k => F.piles[k] > 0).map(k => ({ pos: PILE_STAND[k], v: F.piles[k] * 1000 })).sort((a, b) => b.v - a.v);
    }
    if (g.restaurant.sushi.built) add(g.restaurant.REGISTER, g.restaurant.register.items);
    return out.sort((a, b) => b.v - a.v);
  };
  // it doesn't gamble: the casino boat's other games are fun extras, out of the balance (docs/balance.md)
  const nextTile = () => g.unlocks.visibleTiles().filter(x => !g.unlocks.locked(x) && !CASINO_GAMES.includes(x.id) && Math.abs((x.y ?? 0.15) - p.y) < 2)
    .sort((a, b) => (a.cost - a.paid) - (b.cost - b.paid))[0];
  // ---------- the try-hard's sums (style.tryhard) ----------
  /** Something to buy in the cellar: a menu's upgrade, or a level of the ring's (its price in chips). */
  interface Up { id: string; cost: number; tile?: (typeof g.unlocks.tiles)[number]; mod?: (typeof g.economy.MODS)[number]['id']; apply?: () => void; gain?: number }
  /** Chips a minute from the stall and from Mama Moray's, over the last two minutes. */
  const rates = () => {
    const a = takings[0], b = takings[takings.length - 1], m = a && b && b.t > a.t ? (b.t - a.t) / 60 : 0;
    return m > 0.25 ? { stall: (b.stall - a.stall) / m, resto: (b.resto - a.resto) / m } : { stall: 0, resto: 0 };
  };
  /** `read` with `ups` bought, in the cellar as it is but its kitchen stocked (as the kitchen holds the rush, once it's
   *  restocked); then everything put back as it was. */
  function whatIf<T>(f: Ring['fight'], ups: Up[], read: () => T): T {
    const F = f.F, mods = { ...g.economy.mods };
    const keep = {
      hires: { ...F.hires }, crew: F.crew.slice(), slide: F.slide, fast: F.fast, pantry: { ...F.pantry }, pot: F.pot.slice(), counter: F.counter.slice(), stall: F.stall.slice(),
      lines: (['rice', 'fish', 'mush'] as const).map(k => ({ k, n: F.lines[k].n, up: F.lines[k].up, m: F.lines[k].m.slice(), items: F.lines[k].m.map(m => m.items) })),
    };
    try {
      for (const k of f.ING) F.pantry[k] = f.LEDGE_CAP;
      while (F.pot.length < f.POT_CAP) F.pot.push(f.growOpen());
      while (F.counter.length < f.COUNTER_CAP) F.counter.push(f.growOpen());
      while (F.stall.length < f.STALL_CAP) F.stall.push(f.growOpen());
      for (const u of ups) u.apply!();
      return read();
    } finally {
      Object.assign(F, { hires: keep.hires, crew: keep.crew, slide: keep.slide, fast: keep.fast, pantry: keep.pantry, pot: keep.pot, counter: keep.counter, stall: keep.stall });
      for (const l of keep.lines) { const L = F.lines[l.k]; L.n = l.n; L.up = l.up; L.m = l.m; l.m.forEach((m, i) => { m.items = l.items[i]; }); }
      Object.assign(g.economy.mods, mods);
    }
  }
  /** (each forecast asked a little differently, so the gong's never hands back one it worked out for another cellar) */
  let asked = 0;
  /** How many of the next boss's crowd the gong says turn, with the cooking show aced, given `ups`. */
  const turnedWith = (f: Ring['fight'], ups: Up[]) => whatIf(f, ups, () => f.forecast(0, { bonus: 50, need: f.toBeat(f.nextBoss()!) + ++asked * 1e-9 })?.turned ?? 0);
  /** What there is to buy that could help in a boss's rush: the menus' upgrades, every machine still to come on each
   *  line (the next first, as they'd be bought), and the Cellar crew levels open now. */
  function forBoss(f: Ring['fight']): Up[] {
    const F = f.F, out: Up[] = [];
    for (const x of g.unlocks.menuOffer()) {
      if (style.skip?.includes(x.id)) continue;
      if (x.line) {
        const k = x.line;
        for (let n = F.lines[k].n; n < ring!.plan.MAX_MACHINES; n++) out.push({ id: `${x.id}#${n + 1}`, cost: Math.round(f.MACH_COST[k] * f.MACH_STEP ** Math.max(0, n - 1)), tile: x, apply: () => f.addMachine(k) });
      } else if (BOSS_UP[x.id]) out.push({ id: x.id, cost: x.cost / 1000, tile: x, apply: () => BOSS_UP[x.id](f) });
    }
    // (a level's price and whether it's open go by the levels before it)
    const E = g.economy, lv = E.mods.cellarcrew;
    try {
      for (let i = 0; i < 2 && !style.skip?.includes('cellarcrew'); i++) {
        const c = E.modCost('cellarcrew');
        if (c === null || !g.shop.modOffered('cellarcrew') || !g.shop.modOpen('cellarcrew')) break;
        out.push({ id: `cellarcrew${E.mods.cellarcrew + 1}`, cost: c / 1000, mod: 'cellarcrew', apply: () => { E.mods.cellarcrew++; } });
        E.mods.cellarcrew++;
      }
    } finally { E.mods.cellarcrew = lv; }
    return out;
  }
  /** The cheapest way to a Win over the next boss: everything there is to buy for it, then (dearest first) whatever
   *  can be left out with the gong still saying Win; and what it all costs. If even everything won't do, all of it,
   *  cheapest first. */
  function wayToWin(f: Ring['fight']) {
    const need = f.toBeat(f.nextBoss()!);
    if (turnedWith(f, []) >= need) return { ups: [] as Up[], cost: 0, wins: true };
    let ups = forBoss(f);
    const wins = turnedWith(f, ups) >= need;
    if (wins) for (const u of [...ups].sort((a, b) => b.cost - a.cost)) {
      const without = ups.filter(o => o !== u);
      if (turnedWith(f, without) >= need) ups = without;
    }
    // (a line's machines in the order they come, the rest cheapest first)
    ups.sort((a, b) => a.cost - b.cost);
    if (process.env.SIM_DEBUG) console.log(`${mmss(t)} way to ${need}: ${wins ? 'wins' : "won't"} with ${ups.map(u => u.id).join(', ')}`);
    return { ups, cost: ups.reduce((a, u) => a + u.cost, 0), wins };
  }
  /** What brings in more chips, and how many more a minute: Pricier bowls, Fix up the arena (while every fan's fed),
   *  the venue's next tier, Mama Moray's and her dining hall. */
  function forChips(f: Ring['fight']): Up[] {
    const F = f.F, r = rates(), out: Up[] = [], E = g.economy, fedAll = lastLocal.fed >= lastLocal.crowd - 1;
    const crowd = (seats: number, street: number) => Math.round(seats * Math.min(1, 0.45 * E.MOD.street.per ** street));
    const c0 = f.crowdNow(), levelOk = (id: 'bowls' | 'street') => E.modCost(id) !== null && g.shop.modOffered(id) && g.shop.modOpen(id) && !style.skip?.some(k => k === id || (k.startsWith(id) && Number(k.slice(id.length)) <= E.mods[id]));
    if (levelOk('bowls')) out.push({ id: 'bowls', cost: E.modCost('bowls')! / 1000, mod: 'bowls', gain: (r.stall + r.resto) * (E.MOD.bowls.per - 1) / (1 + (E.MOD.bowls.per - 1) * E.mods.bowls) });
    if (levelOk('street') && fedAll && c0 > 0) out.push({ id: 'street', cost: E.modCost('street')! / 1000, mod: 'street', gain: r.stall * (crowd(f.TIERS[F.tier].seats, E.mods.street + 1) - c0) / c0 });
    for (const x of g.unlocks.menuOffer()) {
      if (x.id.startsWith('tier') && fedAll && c0 > 0) out.push({ id: x.id, cost: x.cost / 1000, tile: x, gain: r.stall * (crowd(f.TIERS[Number(x.id.slice(4))].seats, E.mods.street) - c0) / c0 });
      if (x.id === 'hall') out.push({ id: x.id, cost: x.cost / 1000, tile: x, gain: r.resto * (f.HALL_SHARE / f.RESTO_SHARE - 1) });
      // (Mama Moray's, before she's taken any: about half what the stall takes, as she has in the runs so far)
      if (x.id === 'mama') out.push({ id: x.id, cost: x.cost / 1000, tile: x, gain: r.stall * 0.5 });
    }
    return out.filter(u => u.gain! > 0 && !style.skip?.includes(u.id));
  }
  /** The try-hard's next buy, or null to save (for the buyout, with every boss beaten): the next step of the way to a
   *  Win, unless something that brings in more chips pays for itself before that's afforded. Worked out again every ten
   *  seconds, or once anything's bought or a boss beaten. */
  let dbgAt = 0;
  let way: { at: number; key: string; ups: Up[]; cost: number } | null = null;
  function tryWant(f: Ring['fight']): Up | null {
    const F = f.F, key = `${bought.length}|${F.beaten}`;
    if (F.rush || F.called) return null;
    if (!way || way.key !== key || t >= way.at + 10) way = { at: t, key, ...(f.nextBoss() ? wayToWin(f) : { ups: [], cost: 0 }) };
    // (what's piled up to be scooped counts: it's a walk away)
    const m = (wallet.money + cashSpots().reduce((s, c) => s + c.v, 0)) / 1000, r = rates(), rate = r.stall + r.resto;
    if (way.ups.length && m >= way.ups[0].cost) return way.ups[0];
    // (Harry's bridge, once the Undertow's open: a loan, when it buys the rest of the way at once; a walk to his desk
    // and back)
    // (his limit's worked out as you walk in: freezeLimit)
    const L = ring!.loan, short = way.cost - m, max = way.ups.length && F.beaten >= 2 && L.owed() <= 0 && short > 0 ? L.freezeLimit() : 0;
    if (short <= max) {
      const n = Math.min(max, Math.max(L.LOAN_FLOOR, Math.ceil(short / L.LOAN_STEP) * L.LOAN_STEP));
      if (ring!.loanDesk.takeLoan(n)) {
        t += LOAN_WALK;
        bought.push({ t, id: `loan ${n}`, cost: 0, money: wallet.money, rating: g.rating.rating() });
        books.lines.push(`${mmss(t)}  borrowed 🐡 ${n} from Harry (back 🐡 ${L.owed()}) for ${way.ups.map(u => u.id).join(', ')}`);
        return way.ups[0];
      }
    }
    // (an upgrade that brings in more chips, if it gets everything still to buy afforded sooner: the way and the
    // buyout, a minute's takings at a time; of those, the one that pays for itself soonest)
    const left = way.cost + f.BUYOUT, soon = (c: number, more: number) => (c > m ? (c - m) / rate : 0) + (left - Math.max(0, m - c)) / (rate + more);
    const chips = rate > 0 ? forChips(f).map(u => ({ u, at: soon(u.cost, u.gain!) })).filter(x => x.at < (left - m) / rate).sort((a, b) => a.u.cost / a.u.gain! - b.u.cost / b.u.gain!)[0] : undefined;
    if (process.env.SIM_DEBUG && t >= dbgAt) { dbgAt = t + 30; console.log(`${mmss(t)} m ${m.toFixed(0)} rate ${rate.toFixed(0)} left ${left.toFixed(0)} A ${((left - m) / rate).toFixed(1)} | ${forChips(f).map(u => `${u.id} ${u.cost.toFixed(0)}/${u.gain!.toFixed(0)} → ${soon(u.cost, u.gain!).toFixed(1)}`).join(' ')} | way ${way.ups.map(u => u.id).join(',')} → ${(chips?.u ?? way.ups[0])?.id}`); }
    return chips?.u ?? way.ups[0] ?? null;
  }
  /** Down in the cellar, the upgrade to save for at the crafting bench's menus (none while a boss is in): what the next
   *  boss needs first, as a player reads it off the gong (KEY), then the cheapest on sale. */
  const nextMenu = () => {
    if (!ring || !g.layout.level.down || ring.fight.F.rush) return undefined;
    const on = g.unlocks.menuOffer().filter(x => !style.skip?.includes(x.id)), keys = KEY[ring.fight.F.beaten] ?? [];
    const key = keys.map(k => on.find(x => x.id === k)).find(Boolean);
    // (with all the bosses beaten, the buyout's what's next: it saves for that, not what's left in the shop, past
    // Mama's dining hall, which pays its way towards it)
    return ring.fight.F.beaten >= ring.fight.BOSSES.length ? key : key ?? on.sort((a, b) => a.cost - b.cost)[0];
  };
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
    // (the try-hard, down in the cellar, buys by its sums: tryWant)
    if (ring && style.tryhard && g.layout.level.down) {
      const want = tryWant(ring.fight), tile = nextTile(), cash = cashSpots(), held = cash.reduce((s, c) => s + c.v, 0);
      // (its chips in a pile, when they'd buy what it wants, or there are a lot of them: scooped first)
      const short = want ? want.cost * 1000 - wallet.money : tile ? tile.cost - tile.paid - wallet.money : Infinity;
      if (cash.length && ((short > 0 && held >= short) || held > 150_000)) {
        const c = cash[0];
        go(c.pos, () => near(c.pos, 1.2) && cashSpots().every(x => x.pos !== c.pos), 30);
        return;
      }
      if (want && wallet.money >= want.cost * 1000) {
        const x = want.tile;
        if (x) {
          const at = ring.plan.ROOM_MENUS[x.menu!];
          go(at, () => x.done || (near(at, 0.6) && (g.unlocks.buyFromMenu(x) || true)), 25);
        } else {
          const id = want.mod!, at = g.shop.SHOPS[g.layout.stage.n - 1], lv = g.economy.mods[id];
          go(at, () => (near(at, 0.6) && (g.shop.buyMod(id) || true)) || g.economy.mods[id] > lv, 25);
        }
        return;
      }
      if (!want && tile && wallet.money >= tile.cost - tile.paid) {
        const was = tile.paid;
        go(tile, () => tile.done || tile.paid < was, 25, true);
        return;
      }
      return decide3(ring);
    }
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
    // (down in the cellar, a pile's worth the walk at 20 chips, or at 150 whatever's wanted)
    const [low, high] = g.layout.level.down ? [20_000, 150_000] : [40, 150];
    if (cash.length && (uncollected >= Math.min(target, low) || uncollected > high)) {
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
    // the try-hard: as soon as the gong says he's beaten with the cooking show aced, the show (with none running) and
    // the gong; with one running, the gong as it is (what's left of the bonus, and of a local fight he'd wait out), and
    // if that's short now, the show again once it's run out
    if (style.tryhard && !F.rush && !F.called && f.nextBoss()) {
      const need = f.toBeat(f.nextBoss()!), running = F.bonus.t > 0, fc = f.forecast(0, running ? { need } : { bonus: 50, need });
      if (fc) { best.set(fc.boss.name, Math.max(best.get(fc.boss.name) ?? 0, fc.turned)); lastFc = `${fc.boss.face} ${fc.turned}/${need}`; }
      if (fc && fc.turned >= need) {
        if (running) {
          rangFc = fc.turned;
          if (near(P.GONG_PAD, 0.3)) go(P.GONG_PAD, () => !!F.rush || F.called, 2, true);
          else go(P.GONG_PAD, () => near(P.GONG_PAD, 0.3), 20);
          return;
        }
        if (f.canShow()) {
          if (near(P.POT_PAD, 0.3)) {
            f.showResult(12);
            t += style.showSecs; books.shows++; books.showSecs += style.showSecs;
            books.lines.push(`${mmss(t)}  cooking show before ${fc.boss.name}: +50% (forecast ${fc.turned}, need ${need})`);
          } else go(P.POT_PAD, () => near(P.POT_PAD, 0.3), 20);
          return;
        }
      }
    }
    // a boss, once the gong says his whole crowd will turn
    if (!style.tryhard && !F.rush && f.nextBoss()) {
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
