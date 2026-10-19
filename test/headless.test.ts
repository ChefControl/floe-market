// The balance sims play the cellar headless (src/headless.ts: what only draws, moves or sounds left out of the tick).
// That's only worth it while it's the same game: the bot's first minutes down there, played both ways, buy the same
// things at the same moments and fight the same fights.
import { describe, expect, it } from 'vitest';
import { play, ringModules, STYLE } from './bot';
import { bought as tiles, FLOE_SUSHI, loadGame, MARKET } from './helpers';

async function run(headless: boolean) {
  const g = await loadGame({
    tiles: tiles(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(4.6),
    ring: { sparred: false, practice: true, quiet: true },
  });
  (await import('../src/headless')).headless.on = headless;
  try {
    const { bought, fights } = play(g, 6 * 60, 0.05, await ringModules(), STYLE);
    return { bought: bought.map(b => `${b.t.toFixed(2)} ${b.id}`), fights: fights.map(f => `${f.t.toFixed(2)} ${f.boss} ${f.turned}/${f.n} ${f.win}`) };
  } finally {
    (await import('../src/headless')).headless.on = false;
  }
}

describe('the headless sims', () => {
  it('play the cellar just as the whole game does', async () => {
    const full = await run(false), headless = await run(true);
    expect(full.fights.length).toBeGreaterThan(0);
    expect(headless).toEqual(full);
  }, 120_000);
});
