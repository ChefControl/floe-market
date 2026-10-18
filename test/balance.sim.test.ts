// Balance simulation: a bot plays a fresh game and reports when it could afford each upgrade, how money and
// earnings grow. Slow, so it only runs on demand, writing its report to SIM_OUT (or a temp file):
//   SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts
// SIM_STAGE=3 plays the ring instead, from just after buying in (broke, with stage 2's rating, the doors shut and the
// practice fight to come, as openCellar leaves it).
//   SIM=1 SIM_STAGE=3 SIM_MINUTES=40 SIM_OUT=sim3.txt npx vitest run test/balance.sim.test.ts
// How the bot plays the cellar (bot.ts's STYLE): SIM_SHOW=0..12 the cooking show's stars it earns (0: never
// plays it), SIM_SHOW_SECS its real seconds, SIM_SLAM=0 never slams, SIM_HELP=0 never helps a hired line,
// SIM_SKIP=cellarcrew,street5,tier3 never buys those (a level's id with the level it stops at). The cellar's played
// headless (src/headless.ts) unless SIM_FULL=1, and stops ten seconds after the buyout.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'vitest';
import { mmss, play, ringModules, STYLE } from './bot';
import { bought as tiles, FLOE_SUSHI, loadGame, MARKET } from './helpers';

describe.runIf(process.env.SIM)('balance', () => {
  it('plays a fresh game', async () => {
    const ring = process.env.SIM_STAGE === '3';
    const g = await loadGame(ring ? {
      tiles: tiles(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(4.6),
      ring: { sparred: false, practice: true, quiet: true },
    } : undefined);
    const minutes = Number(process.env.SIM_MINUTES || 60), E = process.env;
    // (the cellar's played without its looks, the same game many times faster: headless.ts; SIM_FULL=1 draws it all)
    if (ring && E.SIM_FULL !== '1') (await import('../src/headless')).headless.on = true;
    const style = { show: Number(E.SIM_SHOW ?? STYLE.show), showSecs: Number(E.SIM_SHOW_SECS ?? STYLE.showSecs), slam: E.SIM_SLAM !== '0', help: E.SIM_HELP !== '0', skip: E.SIM_SKIP?.split(',') };
    const { bought, samples, trace, fights, best, books } = play(g, minutes * 60, 0.05, ring ? await ringModules() : undefined, style);
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
      for (const f of fights) log(`${mmss(f.t).padStart(6)}  ${f.boss.padEnd(16)} ${f.win ? 'WIN ' : 'LOSE'} ${String(f.turned).padStart(4)}/${f.n} (need ${f.need}; forecast ${f.forecast})  ${f.bell.toFixed(1)} s  dry ${f.dry.toFixed(1)} s${f.waited ? '  (rung in a local fight)' : ''}${f.bonus ? `  bonus +${f.bonus}%` : ''}${f.slam > 0 ? `  slam ${f.slam === 2 ? 'perfect' : 'good'}` : ''}`);
    }
    if (ring) {
      log(`\nBOOKS (chips): style ${JSON.stringify(style)}`);
      log(`  earned: bowls ${Math.round(books.bowls)}, prizes ${Math.round(books.prize)}, Mama Moray's ${Math.round(books.resto)}`);
      log(`  spent: ${Object.entries(books.spent).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}`);
      log(`  cooking shows: ${books.shows} (${books.showSecs} s of real time); till the buyout, stood by the pot ${Math.round(books.wait)} s, ${Math.round(books.idle)} s of it with the pot unable to cook`);
      for (const l of books.lines) log('  ' + l);
      // each stretch, from one boss beaten (or the buy-in) to the next (or the buyout): how long, chips a minute from
      // bowls, spent a minute, what was held at its end, and the share of it stood by the pot with the pot unable to cook
      const ends = bought.filter(b => b.id.startsWith('beat ') || b.id === 'buyout');
      const at = (t: number) => samples.reduce((a, s) => (s.t <= t + 1e-6 ? s : a), samples[0]);
      log('\nSTRETCHES: to, minutes, bowls 🐡/min, spent 🐡/min, held at the end 🐡, stood idle; its local fights: how many, fans each, share fed, bowls left over');
      let from = samples[0];
      for (const e of ends) {
        const to = at(e.t), m = Math.max(1e-6, (to.t - from.t) / 60);
        const ls = books.locals.filter(l => l.t > from.t && l.t <= to.t), avg = (f: (l: typeof ls[0]) => number) => (ls.length ? ls.reduce((a, l) => a + f(l), 0) / ls.length : 0);
        log(`  ${e.id.replace('beat ', '').padEnd(12)} ${mmss(to.t - from.t).padStart(5)}  ${String(Math.round((to.bowls - from.bowls) / m)).padStart(5)}  ${String(Math.round((to.spent - from.spent) / m)).padStart(5)}  ${String(Math.round(to.money / 1000)).padStart(6)}  ${String(Math.round((to.idle - from.idle) / (m * 60) * 100)).padStart(3)}%` +
          `   ${String(ls.length).padStart(2)} × ${String(Math.round(avg(l => l.crowd))).padStart(3)} fans, ${Math.round(avg(l => l.fed / l.crowd) * 100)}% fed, ${Math.round(avg(l => l.left))} left`);
        from = to;
      }
    }
    if (best.size) log(`best forecasts: ${[...best].map(([b, n]) => `${b} ${n}`).join(', ')}`);
    log(`\nEVERY MINUTE: money, earned in that minute, rating, stage${ring ? '; seconds of it stood by the pot, and of those with the pot unable to cook' : ''}`);
    let last = 0, lastS = samples[0];
    for (const s of samples.filter((_, i) => i % 6 === 5)) {
      log(`${mmss(s.t).padStart(6)}  $${String(Math.round(s.money)).padStart(8)}  +$${String(Math.round(s.earned - last)).padStart(7)}/min  ★${s.rating.toFixed(1)}  stage ${s.stage}` +
        (ring ? `  by pot ${String(Math.round(s.wait - lastS.wait)).padStart(2)} s, idle ${String(Math.round(s.idle - lastS.idle)).padStart(2)} s  gong ${s.fc}` : ''));
      last = s.earned; lastS = s;
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
