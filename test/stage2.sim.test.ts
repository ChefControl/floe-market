// Stage 2's pacing: the balance bot plays a fresh game, and every minute of Floe Sushi says what it earned and what held
// the restaurant up (docs/balance.md, "Reading the bottleneck"). Slow, so it only runs on demand:
//   SIM=1 SIM_OUT=s2.txt npx vitest run test/stage2.sim.test.ts
// SIM_MINUTES (default 50) to play longer; SIM_RICE=0 leaves the rice to the farmer and the runners once there's a farmer;
// to try a price list without editing it, S2_SET='{"farmer":{"cost":6000}}' changes tiles (`stars: 0` drops a rating
// requirement) and S2_ORDER=paddy,farmer,... puts stage 2's tiles in that order.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'vitest';
import { mmss, play, STYLE } from './bot';
import { loadGame } from './helpers';

/** Each minute's ticks, and how many of them saw: chefs idle and diners waiting with no rice in the kitchen, every seat
 *  taken, a chef idle, the player carrying rice or out on the farm; runner-ticks, and of those, a runner with nothing
 *  to do (at a full tray, or at the pile with nothing to fetch); and diners waiting, summed. */
interface Minute { n: number; rice: number; seats: number; chef: number; hands: number; runN: number; runIdle: number; waiting: number }

describe.runIf(process.env.SIM)('stage 2 pacing', () => {
  it('plays a fresh game', async () => {
    const g = await loadGame(), E = process.env;
    if (E.S2_SET) for (const [id, v] of Object.entries(JSON.parse(E.S2_SET) as Record<string, Record<string, unknown>>)) {
      const t = g.unlocks.tiles.find(x => x.id === id)!;
      Object.assign(t, v);
      if (v.stars === 0) delete (t as { stars?: number }).stars;
    }
    if (E.S2_ORDER) {
      const T = g.unlocks.tiles, picked = E.S2_ORDER.split(',').map(id => T.find(x => x.id === id)!);
      for (const x of picked) T.splice(T.indexOf(x), 1);
      T.splice(T.findIndex(x => x.id === 'sushi') + 1, 0, ...picked);
    }
    const r = g.restaurant, { runners } = g.runner, p = g.player.g.position, per = new Map<number, Minute>();
    const onTick = (t: number) => {
      if (!r.sushi.built) return;
      const m = Math.floor(t / 60), x = per.get(m) ?? { n: 0, rice: 0, seats: 0, chef: 0, hands: 0, runN: 0, runIdle: 0, waiting: 0 };
      per.set(m, x);
      x.n++;
      const waiting = r.sushi.diners.filter(d => d.state === 'wait').length, idle = r.sushi.chefs.some(c => c.state === 'idle');
      x.waiting += waiting;
      if (idle && waiting && r.ricePot.n === 0 && r.sushi.portions <= 0) x.rice++;
      if (idle) x.chef++;
      if (r.sushi.seats.every(s => s.diner)) x.seats++;
      if (g.player.back.count('rice') > 0 || p.x < -10.2) x.hands++;
      for (const k of runners) { x.runN++; if ((k.state === 'unload' && !r.fishTray.hasRoom()) || (k.state === 'load' && k.wait > 0.5)) x.runIdle++; }
    };
    const minutes = Number(E.SIM_MINUTES || 50);
    const { bought, samples } = play(g, minutes * 60, 0.05, undefined, { ...STYLE, riceHands: E.SIM_RICE !== '0' }, onTick);
    const out: string[] = [], open = bought.find(b => b.id === 'sushi')?.t ?? 0;
    out.push(`TILES: when, since the one before, what, price, rating (Floe Sushi opened at ${mmss(open)})`);
    let prev = 0;
    for (const b of bought.filter(b => g.unlocks.tiles.some(x => x.id === b.id) && b.id !== 'korki')) {
      out.push(`${mmss(b.t).padStart(6)}  +${mmss(b.t - prev).padStart(5)}  ${b.id.padEnd(9)} $${String(b.cost).padStart(8)}  ★${b.rating.toFixed(1)}`);
      prev = b.t;
    }
    out.push('\nEVERY MINUTE: earned, rating; share of it the chefs had no rice, every seat was taken, a chef stood idle, the player carried rice; runners idle; diners waiting; bought');
    let last = 0;
    for (const s of samples.filter((_, i) => i % 6 === 5)) {
      const m = Math.floor(s.t / 60), x = per.get(m), pc = (v: number, n = x?.n ?? 1) => `${String(Math.round(100 * v / Math.max(1, n))).padStart(3)}%`;
      const buys = bought.filter(b => Math.floor(b.t / 60) === m).map(b => b.id).join(' ');
      out.push(`${mmss(s.t).padStart(6)}  +$${String(Math.round(s.earned - last)).padStart(8)}  ★${s.rating.toFixed(1)}` +
        (x ? `  no rice ${pc(x.rice)}  seats full ${pc(x.seats)}  chef idle ${pc(x.chef)}  hands on rice ${pc(x.hands)}  runners idle ${pc(x.runIdle, x.runN)}  waiting ${(x.waiting / x.n).toFixed(1)}` : '') +
        `  ${buys}`);
      last = s.earned;
    }
    writeFileSync(E.SIM_OUT || `${tmpdir()}/floe-sim2.txt`, out.join('\n') + '\n');
  }, 3_600_000);
});
