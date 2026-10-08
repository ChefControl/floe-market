// A bot that plays the game the way a reasonable player would, for balance simulations (test/balance.sim.test.ts):
// it fishes, carries, sells, collects cash and buys the next upgrade as soon as it can afford it. It walks at the
// player's speed and goes round obstacles by fixed waypoints, so its timings are close to a human's.
import type { loadGame } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;
interface P { x: number; z: number }

export interface Purchase { t: number; id: string; cost: number; money: number; rating: number }
export interface Sample { t: number; money: number; earned: number; rating: number; stage: number }

/** Plays `g` for `seconds` of game time. Returns what it bought when, and samples of money and earnings. */
export function play(g: Game, seconds: number, dt = 0.05) {
  const { player, wallet } = g;
  const p = player.g.position;
  const bought: Purchase[] = [], samples: Sample[] = [];
  let t = 0, earned = 0, lastMoney = wallet.money, nextSample = 0;
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
      if (x.done && !seen.get(x.id)) { seen.set(x.id, 1); bought.push({ t, id: x.id, cost: x.cost, money: wallet.money, rating: g.rating.rating() }); }
    }
    for (const m of g.economy.MODS) {
      const n = g.economy.mods[m.id];
      if (n > seen.get(m.id)!) {
        seen.set(m.id, n);
        bought.push({ t, id: `${m.id}${n}`, cost: Math.round(m.cost * m.step ** (n - 1)), money: wallet.money, rating: g.rating.rating() });
      }
    }
    if (t >= nextSample) {
      samples.push({ t, money: wallet.money, earned, rating: g.rating.rating(), stage: g.layout.stage.n });
      nextSample += 10;
    }
  };

  // ---------- navigation ----------
  const inS = (q: P) => g.layout.stage.n === 2 && q.z > 3.3 && q.x > -10.2 && q.z < 15.5;
  const inFarm = (q: P) => g.layout.stage.n === 2 && q.x < -10.2;
  /** Waypoints from where the player is to `to`, round the kitchen line, the bar and through the farm door. */
  function route(to: P): P[] {
    if (g.layout.stage.n === 1) return [to];
    const DOOR_IN = { x: -9.2, z: 3.2 }, DOOR_OUT = { x: -11.7, z: 3.2 };
    const out: P[] = [];
    let here: P = { x: p.x, z: p.z };
    const side = (q: P) => (q.x < 0 ? -1 : 1);
    const farmFrom = inFarm(here), farmTo = inFarm(to);
    if (farmFrom && !farmTo) { out.push(DOOR_OUT, DOOR_IN); here = DOOR_IN; }
    if (!farmFrom && farmTo) {
      if (inS(here)) out.push({ x: -6.9, z: 4.2 }); else out.push({ x: -6.9, z: 1.6 }, { x: -6.9, z: 3.2 });
      out.push(DOOR_IN, DOOR_OUT);
    }
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
    if (g.restaurant.sushi.built) add(g.restaurant.REGISTER, g.restaurant.register.items);
    return out.sort((a, b) => b.v - a.v);
  };
  const nextTile = () => g.unlocks.visibleTiles().filter(x => !g.unlocks.locked(x)).sort((a, b) => (a.cost - a.paid) - (b.cost - b.paid))[0];
  /** The cheapest repeatable upgrade of this stage that isn't fully upgraded. */
  const nextMod = () => g.economy.MODS.filter(m => m.stage === g.layout.stage.n && g.economy.modCost(m.id) !== null)
    .sort((a, b) => g.economy.modCost(a.id)! - g.economy.modCost(b.id)!)[0];

  function decide() {
    const tile = nextTile(), mod = g.stage.staging() ? undefined : nextMod();
    const cash = cashSpots(), uncollected = cash.reduce((s, c) => s + c.v, 0);
    const modCost = mod ? g.economy.modCost(mod.id)! : Infinity;
    if (mod && wallet.money >= modCost && (!tile || modCost < tile.cost - tile.paid)) {
      const at = g.shop.SHOPS[g.layout.stage.n - 1], lv = g.economy.mods[mod.id];
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
    decide2();
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
    if (!plan) decide();
    if (plan) walk();
    step();
  }
  return { bought, samples, earned, trace };
}

/** Formats seconds as m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
