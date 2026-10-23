// A grand win's fight, the player's to counter (fight.ts's COUNTER, gong.ts, dohyo.ts): four times the boss winds up to
// slap and a press counters him; then the final blow, in slow motion, and a press on its flash is the slam.
import { describe, expect, it, vi } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A rush on Hakkaku won with `n` of his 100 turned, up to the fight, the player at the bar. */
async function wonBy(n: number) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5) });
  const [cellar, plan, fight, gong] = await Promise.all([import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/gong')]);
  g.player.g.position.set(plan.BAR_PAD.x, cellar.CY, plan.BAR_PAD.z);
  const F = () => fight.F;
  expect(fight.ringGong()).toBe(true);
  g.runUntil(() => { while (F().rush!.turned + F().stall.length < n && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
  expect(F().rush).toMatchObject({ turned: n, win: true });
  g.runUntil(() => F().bout.phase === 'fight', 10);
  const space = () => { g.press(' '); g.run(1 / 30); g.press(' ', 'keyup'); g.run(1 / 30); };
  return { g, fight, gong, F, space };
}

describe('the counter', () => {
  it("a grand win: Space counters each of his four slaps, then the slow-motion slam: a fifth more of his prize, and the epic", async () => {
    const { g, fight, gong, F, space } = await wonBy(90);
    const Q = fight.qte()!, C = fight.COUNTER;
    expect(Q.at).toHaveLength(4);
    Q.at.forEach((t, i) => expect(Math.abs(t - C.at[i])).toBeLessThanOrEqual(C.jitter));
    // (the camera's on the ring for it, wherever the player is)
    g.run(1);
    expect(gong.watching()).toBe(true);
    // a press with nothing coming: the champion flinches, and can't counter for a moment
    expect(gong.counterSaid()).toBe('');
    space();
    expect(Q.flinch).toBeGreaterThan(F().bout.t);
    for (let i = 0; i < 4; i++) {
      g.runUntil(() => F().bout.t >= Q.at[i] - 0.2, 4);
      // (words on his first wind-up only)
      expect(gong.counterSaid()).toBe(i === 0 ? 'Space or click to counter' : '');
      space();
      expect(Q.got[i]).toBe(2);
    }
    expect($('qteStreak').textContent).toBe('×4');
    // the final blow: the ring slows to a quarter, and the words say when
    g.runUntil(() => Q.final >= 0, 4);
    expect(fight.ringSpeed()).toBe(C.slow);
    const t0 = F().bout.t;
    g.run(0.4);
    expect(F().bout.t - t0).toBeCloseTo(0.4 * C.slow, 1);
    expect(gong.counterSaid()).toBe('Final blow! Space on the flash');
    expect($('slowFx').style.opacity).toBe('1');
    g.runUntil(() => Q.final >= C.grow - 0.03, 2);
    const money = g.wallet.money;
    space();
    expect([Q.hit, F().rush!.slam]).toEqual([2, 2]);
    // one try
    expect(fight.press()).toBe(null);
    g.runUntil(() => F().bout.phase === 'pay', 15);
    expect(fight.epic()).toBe(true);
    expect(g.wallet.money - money).toBe(Math.round(100 * 1.2 * fight.CHIP));
    g.run(4);
    expect($('fightCard').textContent).toContain('💥 Slam +🐡 20');
  }, 30_000);

  it('two good counters and a good slam are a tenth more; a slap not countered lands; a plain win has none', async () => {
    const { g, fight, F, space } = await wonBy(90);
    const Q = fight.qte()!, C = fight.COUNTER;
    for (const i of [0, 1]) { g.runUntil(() => F().bout.t >= Q.at[i] - 0.6, 4); space(); expect(Q.got[i]).toBe(1); }
    g.runUntil(() => F().bout.t >= Q.at[3] + 0.05, 6);
    expect(Q.got).toEqual([1, 1, 0, 0]);
    expect($('qteStreak').hidden).toBe(true);
    g.runUntil(() => Q.final >= C.grow + 0.2, 6);
    const money = g.wallet.money;
    space();
    expect([Q.hit, F().rush!.slam]).toEqual([1, 1]);
    g.runUntil(() => F().bout.phase === 'pay', 15);
    expect(fight.epic()).toBe(false);
    expect(g.wallet.money - money).toBe(Math.round(100 * 1.1 * fight.CHIP));
    // 83 of 100 is a win, but not a grand one
    const r = await wonBy(83);
    expect(r.F().rush!.qte).toBe(null);
    expect(r.fight.qte()).toBe(null);
    r.g.run(12);
    expect(r.gong.counterSaid()).toBe('');
  }, 60_000);

  it('the slam left untried is a miss: no bonus, however the counters went', async () => {
    const { g, fight, F, space } = await wonBy(90);
    const Q = fight.qte()!;
    for (let i = 0; i < 4; i++) { g.runUntil(() => F().bout.t >= Q.at[i] - 0.2, 4); space(); }
    const money = g.wallet.money;
    g.runUntil(() => F().bout.phase === 'pay', 20);
    expect([Q.got, Q.hit, F().rush!.slam]).toEqual([[2, 2, 2, 2], 0, 0]);
    expect(g.wallet.money - money).toBe(100 * fight.CHIP);
  }, 30_000);

  it('on a phone a tap anywhere counters, and the words say tap; a tap on a button is the button\'s', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148');
    const { g, fight, gong, F } = await wonBy(90);
    const Q = fight.qte()!;
    const tap = (on: EventTarget = window) => on.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'touch' }));
    g.runUntil(() => F().bout.t >= Q.at[0] - 0.2, 4);
    expect(gong.counterSaid()).toBe('Tap to counter');
    tap($('watchGo'));
    expect(Q.got[0]).toBe(-1);
    tap();
    expect(Q.got[0]).toBe(2);
  }, 30_000);
});
