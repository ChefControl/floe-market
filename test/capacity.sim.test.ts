// The gong's ceilings (stage 3): for each step along the cellar's upgrade path, how many of a boss's crowd the
// kitchen turns at best in his bell, ready for him (the pot, the counter and the stall full, the ledge stocked, the
// player at the gong), with the cooking show's bonus or without. What each boss's crowd is set against. On demand:
//   SIM=1 SIM_OUT=caps.txt npx vitest run test/capacity.sim.test.ts
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

type Lines = [number, number, number, 0 | 1, 0 | 1, 0 | 1];
interface Step {
  name: string; beaten: number; lines: Lines; hires: string[]; crew: number; slide?: boolean; fast?: boolean;
  /** Not ready for him: the pot, counter and stall empty (`front`), or the ledge and the machines (`ledge`). */
  empty?: 'front' | 'ledge';
  /** The first of a boss's rows (factors): print his heading over it. */
  head?: boolean;
  /** A bell of this many seconds instead of his own. */
  bell?: number;
}
const STEPS: Step[] = [
  { name: 'hands, 1 rack, 1 barrel', beaten: 0, lines: [1, 1, 0, 0, 0, 0], hires: [], crew: 0 },
  { name: 'hands, 3 racks, 3 barrels', beaten: 0, lines: [3, 3, 0, 0, 0, 0], hires: [], crew: 0 },
  { name: '+ washer, salter', beaten: 0, lines: [3, 3, 0, 0, 0, 0], hires: ['washer', 'salter'], crew: 0 },
  { name: '+ 6 racks, 6 barrels', beaten: 0, lines: [6, 6, 0, 0, 0, 0], hires: ['washer', 'salter'], crew: 0 },
  { name: '+ crew 2', beaten: 0, lines: [6, 6, 0, 0, 0, 0], hires: ['washer', 'salter'], crew: 2 },
  { name: 'mushrooms: 3 beds', beaten: 1, lines: [6, 6, 3, 0, 0, 0], hires: ['washer', 'salter'], crew: 2 },
  { name: '+ 6 beds, picker', beaten: 1, lines: [6, 6, 6, 0, 0, 0], hires: ['washer', 'salter', 'picker'], crew: 2 },
  { name: '+ crew 4', beaten: 1, lines: [6, 6, 6, 0, 0, 0], hires: ['washer', 'salter', 'picker'], crew: 4 },
  { name: '+ attendant', beaten: 2, lines: [6, 6, 6, 0, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant'], crew: 4 },
  { name: '+ steam baskets', beaten: 2, lines: [6, 6, 6, 1, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant'], crew: 4 },
  { name: '+ crew 6', beaten: 2, lines: [6, 6, 6, 1, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant'], crew: 6 },
  { name: '+ cook', beaten: 3, lines: [6, 6, 6, 1, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], crew: 6 },
  { name: '+ smokehouse', beaten: 3, lines: [6, 6, 6, 1, 1, 0], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], crew: 6 },
  { name: '+ glowing shelves', beaten: 4, lines: [6, 6, 6, 1, 1, 1], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], crew: 6 },
  { name: '+ crew 8', beaten: 4, lines: [6, 6, 6, 1, 1, 1], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], crew: 8 },
];

/** SIM_STEPS=crew: the attendant's ceiling at each level of Cellar crew instead (all three lines hired, six of each). */
const ALL = ['washer', 'salter', 'picker', 'attendant'];
const CREW: Step[] = [0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap(c => [
  { name: `attendant, crew ${c}`, beaten: 2, lines: [6, 6, 6, 0, 0, 0] as Lines, hires: ALL, crew: c },
  { name: `  + shelves, cook`, beaten: 4, lines: [6, 6, 6, 1, 1, 1] as Lines, hires: [...ALL, 'cook'], crew: c },
]);

/** SIM_STEPS=bosses: each boss against everything beating the one before him has opened (every machine, line upgrade,
 *  hire and the bowl slide), at every level of Cellar crew, in his own bell: what turns with no cooking show and with a
 *  perfect one (SIM_BONUS, 0 and 50 by default), beside his crowd and the half of it that wins. */
const OPEN: Omit<Step, 'name' | 'crew'>[] = [
  { beaten: 0, lines: [6, 6, 0, 0, 0, 0], hires: ['washer', 'salter'] },
  { beaten: 1, lines: [6, 6, 6, 0, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant'] },
  { beaten: 2, lines: [6, 6, 6, 1, 0, 0], hires: ['washer', 'salter', 'picker', 'attendant'], slide: true },
  { beaten: 3, lines: [6, 6, 6, 1, 1, 0], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], slide: true },
  { beaten: 4, lines: [6, 6, 6, 1, 1, 1], hires: ['washer', 'salter', 'picker', 'attendant', 'cook'], slide: true, fast: true },
];
const BOSS_STEPS: Step[] = OPEN.flatMap(o => [0, 1, 2, 3, 4, 5, 6, 7, 8].map(c => ({ ...o, name: `crew ${c}`, crew: c })));

/** SIM_STEPS=factors: what decides each boss's fight. From everything open at him (the Cellar crew levels his gate
 *  allows: two a boss beaten), one thing at a time taken away or added, so each row says what that thing is worth. */
function factors(): Step[] {
  return OPEN.flatMap((o, k) => {
    const base: Step = { ...o, name: 'everything open', crew: 2 * k, head: true }, out: Step[] = [base];
    const v = (name: string, s: Partial<Step>) => out.push({ ...base, head: false, name, ...s });
    if (base.crew > 0) v('crew -2', { crew: base.crew - 2 });
    if (base.crew < 8) v('crew +2', { crew: base.crew + 2 });
    v('crew 8', { crew: 8 });
    v('3 of each machine', { lines: o.lines.map((n, i) => (i < 3 ? Math.min(n, 3) : n)) as Lines });
    v('1 of each machine', { lines: o.lines.map((n, i) => (i < 3 ? Math.min(n, 1) : n)) as Lines });
    if (o.lines.slice(3).some(Boolean)) v('no line upgrades', { lines: [...o.lines.slice(0, 3), 0, 0, 0] as Lines });
    v('no line hands', { hires: o.hires.filter(h => !['washer', 'salter', 'picker'].includes(h)) });
    if (o.hires.includes('cook')) v('no cook', { hires: o.hires.filter(h => h !== 'cook') });
    if (o.fast) v('no faster belt', { fast: false });
    if (o.slide) v('no slide', { slide: false, fast: false });
    if (o.hires.includes('attendant')) v(o.slide ? 'no slide, no attendant' : 'no attendant', { slide: false, hires: o.hires.filter(h => h !== 'attendant') });
    if (!o.slide && k < 4) v('+ the slide', { slide: true, hires: [...new Set([...o.hires, 'attendant'])] });
    v('pot, counter, stall empty', { empty: 'front' });
    v('ledge and machines empty', { empty: 'ledge' });
    return out;
  });
}

/** SIM_STEPS=window: where each boss's win line can go. Everything open at him (his gate's crew) against the kitchen
 *  the boss before him left (that boss's open things and crew): the line wants to be above the second's best, so what
 *  beating the last boss opened has to be bought, and under the first with no show, so it's won without the cooking
 *  show. SIM_BELLS2=4:60,75,90 tries other bells for a boss (his index). */
function windows(): Step[] {
  const extra = new Map((process.env.SIM_BELLS2 ?? '').split(';').filter(Boolean).map(s => { const [k, b] = s.split(':'); return [Number(k), b.split(',').map(Number)] as const; }));
  return OPEN.slice(1).flatMap((o, i) => {
    const k = i + 1;
    return (extra.get(k) ?? [0]).flatMap(bell => [
      { ...o, name: `everything open${bell ? ` @${bell}s` : ''}`, crew: 2 * k, head: true, bell: bell || undefined },
      { ...OPEN[k - 1], beaten: k, name: `last boss's kitchen${bell ? ` @${bell}s` : ''}`, crew: 2 * (k - 1), bell: bell || undefined },
    ]);
  });
}

describe.runIf(process.env.SIM)('capacity', () => {
  it('measures what the kitchen turns at best', async () => {
    const win = process.env.SIM_STEPS === 'window', fac = process.env.SIM_STEPS === 'factors' || win, bosses = process.env.SIM_STEPS === 'bosses' || fac;
    const BELLS = (process.env.SIM_BELLS ?? '30,45,60,90').split(',').map(Number), BONUS = (process.env.SIM_BONUS ?? (bosses ? '0,50' : '0,35')).split(',').map(Number);
    const out = bosses
      ? [fac ? `WHAT DECIDES EACH BOSS: fans turned in his bell, from everything open at him, a thing at a time; the cooking show's bonus at ${BONUS.join(' / ')}%`
        : `EACH BOSS, everything before him bought: fans turned at best in his bell, with the cooking show's bonus at ${BONUS.join(' / ')}%`, '']
      : [`THE GONG'S CEILINGS: fans turned at best in a bell of ${BELLS.join(' / ')} s, with the cooking show's bonus at ${BONUS.join(' / ')}%`, ''];
    if (!bosses) out.push('step'.padEnd(28) + BONUS.map(b => `+${b}%`.padStart(4 + 6 * BELLS.length)).join(''));
    for (const s of win ? windows() : fac ? factors() : bosses ? BOSS_STEPS : process.env.SIM_STEPS === 'crew' ? CREW : STEPS) {
      const [r, f, m, ru, fu, mu] = s.lines;
      const g = await loadGame({
        tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, mods: { cellarcrew: s.crew },
        ring: {
          beaten: s.beaten, quiet: false, slide: !!s.slide, fast: !!s.fast,
          lines: { rice: { n: r, up: ru, m: [] }, fish: { n: f, up: fu, m: [] }, mush: { n: m, up: mu, m: [] } },
          hires: Object.fromEntries(s.hires.map(h => [h, true])),
          pantry: s.empty === 'ledge' ? { rice: 0, fish: 0, mush: 0 } : { rice: 40, fish: 40, mush: s.beaten ? 40 : 0 },
        },
      });
      const fight = await import('../src/fight');
      const plan = await import('../src/cellarPlan');
      g.game.tick(0.05);
      const F = fight.F, mush = s.beaten > 0;
      // (ready for him: everything full, every machine's ready ones waiting)
      if (s.empty !== 'front') { F.pot = Array(fight.POT_CAP).fill(mush); F.counter = Array(fight.COUNTER_CAP).fill(mush); F.stall = Array(fight.STALL_CAP).fill(mush); }
      if (s.empty !== 'ledge') for (const k of fight.ING) for (const mc of F.lines[k].m) { if (k === 'mush') mc.ready = fight.mach(k).cap; else mc.items = Array(fight.mach(k).cap).fill(1); }
      g.player.g.position.x = plan.GONG_PAD.x; g.player.g.position.z = plan.GONG_PAD.z;
      const boss = fight.BOSSES[s.beaten], was = { crowd: boss.crowd, bell: boss.bell };
      const cells: string[] = [];
      if (bosses && (fac ? s.head : s.crew === 0)) {
        out.push('', `${boss.face} ${boss.name}: ${boss.crowd} fans, ${Math.floor(boss.crowd / 2) + 1} to win, ${boss.bell} s bell${fac ? `; open: crew ${s.crew}` : ''}`);
        out.push('  ' + (fac ? '' : 'crew').padEnd(fac ? 28 : 10) + BONUS.map(b => `+${b}%`.padStart(8)).join(''));
      }
      for (const bonus of BONUS) {
        const got: number[] = [];
        for (const bell of bosses ? [s.bell ?? was.bell] : BELLS) {
          // (a second on each time: the gong keeps its forecasts for half a second)
          boss.crowd = 5000; boss.bell = bell; F.t += 1;
          got.push(fight.forecast(0, { bonus })!.turned);
        }
        cells.push(bosses ? String(got[0]).padStart(8) : got.map(n => String(n).padStart(6)).join('').padStart(4 + 6 * BELLS.length));
      }
      Object.assign(boss, was);
      out.push(bosses ? '  ' + s.name.padEnd(fac ? 28 : 10) + cells.join('') : s.name.padEnd(28) + cells.join(''));
    }
    writeFileSync(process.env.SIM_OUT || `${tmpdir()}/floe-caps.txt`, out.join('\n') + '\n');
  }, 600_000);
});
