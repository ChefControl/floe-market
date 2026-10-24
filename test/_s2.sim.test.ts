// Scratch: stage 2's pacing, minute by minute, with what limits the restaurant. Not committed.
//   SIM=1 S2_OUT=x.txt npx vitest run test/_s2.sim.test.ts
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { mmss, play } from './bot';
import { loadGame } from './helpers';

it.runIf(process.env.SIM)('stage 2 pacing', async () => {
  const g = await loadGame();
  // tweaks: S2_SET='{"farmer":{"cost":1500,"stars":0}}', S2_ORDER=paddy,farmer,... (stage 2's queue order), S2_PLATE=60
  const E = process.env;
  if (E.S2_SET) for (const [id, v] of Object.entries(JSON.parse(E.S2_SET) as Record<string, Record<string, unknown>>)) {
    const t = g.unlocks.tiles.find(x => x.id === id)!;
    Object.assign(t, v);
    if (v.stars === 0) delete (t as { stars?: number }).stars;
    if (v.drop) t.stage = 9 as never;
  }
  if (E.S2_ORDER) {
    const T = g.unlocks.tiles, ids = E.S2_ORDER.split(','), picked = ids.map(id => T.find(x => x.id === id)!);
    for (const x of picked) T.splice(T.indexOf(x), 1);
    T.splice(T.findIndex(x => x.id === 'sushi') + 1, 0, ...picked);
  }
  if (E.S2_K) {
    // all of stage 2's money times K: what sushi sells for, its tiles and its repeatable upgrades (not the buy-in)
    const K = Number(E.S2_K), ec = await import('../src/economy');
    ec.SUSHI_PRICE.plate *= K; ec.SUSHI_PRICE.box *= K;
    for (const t of g.unlocks.tiles) if (t.stage === 2 && t.id !== 'dohyo' && !t.always) t.cost = Math.round(t.cost * K);
    for (const m of ec.MODS) if (m.stage === 2) m.cost *= K;
  }
  if (E.S2_PLATE) { const ec = await import('../src/economy'); ec.SUSHI_PRICE.plate = Number(E.S2_PLATE); ec.SUSHI_PRICE.box = Math.round(Number(E.S2_PLATE) * 35 / 30); }
  const minutes = Number(process.env.SIM_MINUTES || 70);
  const r = g.restaurant, runner = await import('../src/runner');
  // per-minute counters: ticks, rice short (a chef idle and the pot empty with diners waiting), seats full, a chef idle,
  // runners standing at a full tray, the player carrying rice or in the farm
  type M = { n: number; riceShort: number; seatsFull: number; chefIdle: number; runIdle: number; runN: number; handsRice: number; waiting: number };
  const per = new Map<number, M>();
  const pl = g.player.g.position;
  const rc = g.rice;
  let dumped = 0;
  const onTick = (t: number) => {
    if (!r.sushi.built) return;
    if (E.S2_DUMP && t >= Number(E.S2_DUMP) + dumped * 20 && dumped < 3) {
      dumped++;
      console.log(`${mmss(t)} pot ${r.ricePot.n}/${r.ricePot.cap} portions ${r.sushi.portions} tray ${r.fishTray.n} stack ${rc.fieldStack.n} ripe ${rc.field.cells.filter(c => c.grow >= 1).length} taken ${rc.field.cells.filter(c => c.taken).length}` +
        ` farmer ${rc.farmer?.state} chefs ${r.sushi.chefs.map(c => c.state).join('/')} runners ${runner.runners.map(k => `${k.state}:${k.back.n}:${k.bags}`).join(' ')}` +
        ` player ${pl.x.toFixed(1)},${pl.z.toFixed(1)} arms fish ${g.player.back.count('fish')} rice ${g.player.back.count('rice')} money ${g.wallet.money}`);
    }
    const m = Math.floor(t / 60);
    const x = per.get(m) ?? { n: 0, riceShort: 0, seatsFull: 0, chefIdle: 0, runIdle: 0, runN: 0, handsRice: 0, waiting: 0 };
    per.set(m, x);
    x.n++;
    const waiting = r.sushi.diners.filter(d => d.state === 'wait').length;
    x.waiting += waiting;
    const idle = r.sushi.chefs.filter(c => c.state === 'idle').length;
    if (idle && waiting && r.ricePot.n === 0 && r.sushi.portions <= 0) x.riceShort++;
    if (idle) x.chefIdle++;
    if (r.sushi.seats.every(s => s.diner)) x.seatsFull++;
    for (const k of runner.runners) { x.runN++; if ((k.state === 'unload' && !r.fishTray.hasRoom()) || (k.state === 'load' && k.wait > 0.5)) x.runIdle++; }
    if (g.player.back.count('rice') > 0 || pl.x < -10.2) x.handsRice++;
  };
  const { bought, samples } = play(g, minutes * 60, 0.05, undefined, undefined, onTick);
  const out: string[] = [];
  const sushiT = bought.find(b => b.id === 'sushi')?.t ?? 0;
  out.push('TILES (stage 2 and the stage-up)');
  let prev = 0;
  for (const b of bought) {
    if (/\d$/.test(b.id) && !['plot2', 'plot3', 'chef3', 'tables2', 'runner2', 'runner3'].includes(b.id)) continue;
    out.push(`${mmss(b.t).padStart(6)}  +${mmss(b.t - prev).padStart(5)}  ${b.id.padEnd(9)} $${String(b.cost).padStart(7)}  ★${b.rating.toFixed(1)}`);
    prev = b.t;
  }
  out.push('\nEVERY MINUTE: earned, rating, rice short %, seats full %, a chef idle %, runners idle %, player on rice %, avg diners waiting, buys');
  let last = 0;
  for (const s of samples.filter((_, i) => i % 6 === 5)) {
    const m = Math.floor(s.t / 60), x = per.get(m), pc = (v: number, n = x?.n ?? 1) => String(Math.round(100 * v / Math.max(1, n))).padStart(3);
    const buys = bought.filter(b => Math.floor(b.t / 60) === m).map(b => b.id).join(' ');
    out.push(`${mmss(s.t).padStart(6)}  +$${String(Math.round(s.earned - last)).padStart(7)}  ★${s.rating.toFixed(1)}  s${s.stage}` +
      (x ? `  rice ${pc(x.riceShort)}  seats ${pc(x.seatsFull)}  chef ${pc(x.chefIdle)}  run ${pc(x.runIdle, x.runN)}  hands ${pc(x.handsRice)}  wait ${(x.waiting / x.n).toFixed(1)}` : '') + `  ${buys}`);
    last = s.earned;
  }
  out.push(`\nsushi at ${mmss(sushiT)}; dohyo at ${mmss(bought.find(b => b.id === 'dohyo')?.t ?? NaN)}`);
  writeFileSync(process.env.S2_OUT || '/tmp/s2.txt', out.join('\n') + '\n');
}, 3_600_000);
