// Balance simulation: a bot plays a fresh game and reports when it could afford each upgrade, how money and
// earnings grow. Slow, so it only runs on demand, writing its report to SIM_OUT (or a temp file):
//   SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts
// SIM_STAGE=3 plays the ring instead, from just after buying in (broke, with stage 2's rating).
//   SIM=1 SIM_STAGE=3 SIM_MINUTES=40 SIM_OUT=sim3.txt npx vitest run test/balance.sim.test.ts
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'vitest';
import { mmss, play, ringModules } from './bot';
import { bought as tiles, FLOE_SUSHI, loadGame, MARKET } from './helpers';

describe.runIf(process.env.SIM)('balance', () => {
  it('plays a fresh game', async () => {
    const ring = process.env.SIM_STAGE === '3';
    const g = await loadGame(ring ? { tiles: tiles(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(4.6) } : undefined);
    const minutes = Number(process.env.SIM_MINUTES || 60);
    const { bought, samples, trace, fights } = play(g, minutes * 60, 0.05, ring ? await ringModules() : undefined);
    const out: string[] = [];
    const log = (l: string) => out.push(l);
    let prev = 0;
    log('PURCHASES');
    for (const b of bought) {
      log(`${mmss(b.t).padStart(6)}  +${mmss(b.t - prev).padStart(5)}  ${b.id.padEnd(9)} $${String(b.cost).padStart(7)}  left $${b.money}  ★${b.rating.toFixed(1)}`);
      prev = b.t;
    }
    if (fights.length) {
      log('\nBOSS FIGHTS: bell over at, who, turned of his crowd (needed; the gong forecast as rung), bell used, bar empty');
      for (const f of fights) log(`${mmss(f.t).padStart(6)}  ${f.boss.padEnd(16)} ${f.win ? 'WIN ' : 'LOSE'} ${String(f.turned).padStart(4)}/${f.n} (need ${f.need}; forecast ${f.forecast})  ${f.bell.toFixed(1)} s  dry ${f.dry.toFixed(1)} s`);
    }
    log('\nEVERY MINUTE: money, earned in that minute, rating, stage');
    let last = 0;
    for (const s of samples.filter((_, i) => i % 6 === 5)) {
      log(`${mmss(s.t).padStart(6)}  $${String(Math.round(s.money)).padStart(8)}  +$${String(Math.round(s.earned - last)).padStart(7)}/min  ★${s.rating.toFixed(1)}  stage ${s.stage}`);
      last = s.earned;
    }
    const r = g.restaurant, rc = g.rice, pl = g.player;
    log(`\nEND STATE: arms fish ${pl.back.count('fish')} rice ${pl.back.count('rice')} (cap ${pl.back.cap}), pile ${g.stations.pile.n}, ` +
      `tray ${r.fishTray.n}, pot ${r.ricePot.n}, stack ${rc.fieldStack.n}, ripe ${rc.field.cells.filter(c => c.grow >= 1 && !c.taken).length}, ` +
      `register ${r.register.n}, chefs ${r.sushi.chefs.map(c => c.state).join('/')}, belt ${r.sushi.slots.filter(Boolean).length}, ` +
      `diners ${r.sushi.diners.length}, takeout stock ${g.counters.TAKEOUT.stock.n}, player at ${pl.g.position.x.toFixed(1)},${pl.g.position.z.toFixed(1)}`);
    log('LAST PLANS\n' + trace.join('\n'));
    writeFileSync(process.env.SIM_OUT || `${tmpdir()}/floe-sim.txt`, out.join('\n') + '\n');
  }, 3_600_000);
});
