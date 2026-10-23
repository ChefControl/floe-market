// A grand win's last moment, the player's (fight.ts's FINISH, gong.ts, dohyo.ts): a scene at the straw, the ring held,
// where presses shove the boss back over it and a flick up as the lift peaks throws him.
import { describe, expect, it, vi } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A rush on Hakkaku won with `n` of his 100 turned, up to the fight, the player at the bar. */
async function wonBy(n: number) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5) });
  const [cellar, plan, fight, gong, dohyo] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/gong'), import('../src/dohyo'),
  ]);
  g.player.g.position.set(plan.BAR_PAD.x, cellar.CY, plan.BAR_PAD.z);
  const F = () => fight.F;
  expect(fight.ringGong()).toBe(true);
  g.runUntil(() => { while (F().rush!.turned + F().stall.length < n && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
  expect(F().rush).toMatchObject({ turned: n, win: true });
  g.runUntil(() => F().bout.phase === 'fight', 10);
  const key = (k: string) => { g.press(k); g.run(1 / 60); g.press(k, 'keyup'); };
  /** Presses `n` times, `rate` a second. */
  const mash = (n: number, rate: number) => { for (let i = 0; i < n; i++) { key(' '); g.run(1 / rate - 1 / 60); } };
  return { g, fight, gong, dohyo, F, key, mash };
}

describe('the finish', () => {
  it('a grand win ends in a scene: mash to drive him over, flick up as the lift peaks: a fifth more of his prize, and the epic', async () => {
    const { g, fight, gong, dohyo, F, key, mash } = await wonBy(90);
    const C = fight.FINISH;
    // (not before its moment, near the fight's end)
    expect(fight.finish()).toBe(null);
    g.runUntil(() => !!fight.finish(), C.at + 1);
    const f = fight.finish()!;
    // the ring holds while it's on; the scene's bars close in and its camera cuts in
    const t0 = F().bout.t;
    g.run(0.3);
    expect(F().bout.t).toBe(t0);
    expect($('finish').classList.contains('on')).toBe(true);
    expect(dohyo.finishCam.k).toBeGreaterThan(0.9);
    expect(gong.finishSaid()).toBe('Mash Space to push!');
    expect($('finMeter').hidden).toBe(false);
    // the push: ten a second drives him over before it runs out
    mash(16, 10);
    expect(f.step).toBe('lift');
    expect(f.pushed).toBe(2);
    expect(gong.finishSaid()).toBe('↑ to throw!');
    // (too early: nothing)
    key('ArrowUp');
    expect(f.throw).toBe(-1);
    g.runUntil(() => f.lift >= C.lift - 0.02, 2);
    const money = g.wallet.money;
    key('ArrowUp');
    expect([f.throw, F().rush!.slam]).toEqual([2, 2]);
    expect(gong.finishSaid()).toBe('PERFECT THROW!');
    // once it's been seen, the fight's result: the epic, and the bars open again
    g.runUntil(() => F().bout.phase === 'pay', 2);
    expect(fight.epic()).toBe(true);
    expect(g.wallet.money - money).toBe(Math.round(100 * 1.2 * fight.CHIP));
    g.run(0.5);
    expect($('finish').classList.contains('on')).toBe(false);
    g.run(4);
    expect($('fightCard').textContent).toContain('💥 Slam +🐡 20');
  }, 30_000);

  it('a slow push only gets him half way; then a good throw is a tenth more, and none at all is a slip', async () => {
    const { g, fight, F, mash, key } = await wonBy(90);
    const C = fight.FINISH;
    g.runUntil(() => !!fight.finish(), C.at + 1);
    const f = fight.finish()!;
    // (five a second: he pushes back, and the push runs out half way)
    mash(13, 5);
    g.runUntil(() => f.step === 'lift', 2);
    expect(f.pushed).toBe(1);
    g.runUntil(() => f.lift >= C.lift + 0.25, 2);
    const money = g.wallet.money;
    key('w');
    expect([f.throw, F().rush!.slam]).toEqual([1, 1]);
    g.runUntil(() => F().bout.phase === 'pay', 2);
    expect(g.wallet.money - money).toBe(Math.round(100 * 1.1 * fight.CHIP));
    // the next: no push and no throw
    const r = await wonBy(90);
    r.g.runUntil(() => !!r.fight.finish(), C.at + 1);
    const f2 = r.fight.finish()!;
    r.g.runUntil(() => f2.step === 'thrown', C.push + C.lift + 1);
    expect([f2.pushed, f2.throw, r.F().rush!.slam]).toEqual([0, 0, 0]);
    // and 83 of 100 is a win, but not a grand one: no finish
    const r3 = await wonBy(83);
    r3.g.runUntil(() => r3.F().bout.phase === 'pay', 20);
    expect(r3.F().rush!.fin).toBe(null);
  }, 60_000);

  it('on a phone: taps push and a swipe up throws, and the words say so; a tap on a button is the button\'s', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148');
    const { g, fight, gong } = await wonBy(90);
    g.runUntil(() => !!fight.finish(), fight.FINISH.at + 1);
    const f = fight.finish()!;
    const ev = (type: string, y: number, on: EventTarget = window) =>
      on.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerType: 'touch', button: 0, clientX: 200, clientY: y }));
    expect(gong.finishSaid()).toBe('Tap fast to push!');
    ev('pointerdown', 500, $('watchGo'));
    expect(f.n).toBe(0);
    ev('pointerdown', 500); ev('pointerup', 500);
    expect(f.n).toBeGreaterThan(0.9);
    g.runUntil(() => f.step === 'lift', 3);
    expect(gong.finishSaid()).toBe('Swipe up to throw!');
    g.runUntil(() => f.lift >= fight.FINISH.lift - 0.05, 2);
    ev('pointerdown', 500); ev('pointermove', 420);
    expect(f.throw).toBe(2);
  }, 30_000);
});
