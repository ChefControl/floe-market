// The cooking show at the pot (chanko.ts): the Cook button at the pot, the game holding still while it's on, its four
// steps (cut, throw, season, stir) and their stars, and the bonus the stars buy the pot (fight.ts): bigger batches for
// a while, the cook's 70% of them too, and no new show until it's run out.
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

/** A game down in the cellar (the first three bosses beaten, so the grow room's open), the player at the pot. */
async function atPot() {
  const g = await loadGame({ tiles: bought(...MARKET, 'sushi', ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), ring: { beaten: 3 } });
  const [plan, cellar, fight, show, render] = await Promise.all([
    import('../src/cellarPlan'), import('../src/cellar'), import('../src/fight'), import('../src/chanko'), import('../src/render'),
  ]);
  g.player.g.position.set(plan.POT_PAD.x, cellar.CY, plan.POT_PAD.z);
  // (eight of each on the ledge: the show's batch takes four; and the player's own turn at the pot put off, or a game
  // left running would cook from it too)
  fight.F.pantry = { rice: 8, fish: 8, mush: 8 }; fight.F.cookT = 1e9;
  g.run(0.1);
  /** The camera where the show has it (main.ts does this every frame). */
  const film = () => {
    if (show.showCam.k <= 0) return;
    render.camera.position.copy(show.showCam.pos); render.camera.lookAt(show.showCam.look); render.camera.updateMatrixWorld();
  };
  const run = (s: number) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) { g.game.tick(1 / 60); film(); } };
  const key = (type: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(type, { code: 'Space', cancelable: true }));
  const ptr = (type: string, x: number, y: number, on = 'showPlay') => $(on).dispatchEvent(new PointerEvent(type, { pointerId: 5, clientX: x, clientY: y, bubbles: true }));
  /** Where a point in the world is on the screen. */
  const onScreen = (x: number, y: number, z: number) => {
    const v = new Vector3(x, y, z).project(render.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  };
  /** Runs on until the show is playing `step`. */
  const until = (step: string) => { for (let i = 0; i < 1200 && !(show.showState()?.step === step && show.showState()?.phase === 'play'); i++) run(1 / 60); };
  return { g, plan, cellar, fight, show, run, key, ptr, onScreen, until, F: () => fight.F };
}

describe('the cooking show at the pot', () => {
  it('a bonus makes the pot\'s batches bigger for a while, the cook\'s too, and counts down', async () => {
    const { fight, F } = await atPot();
    expect(fight.batchBowls()).toBe(20);
    expect(fight.cookBowls()).toBe(14);
    expect(fight.canShow()).toBe(true);
    expect(fight.showResult(5).pct).toBe(0);
    expect(F().bonus.t).toBe(0);
    expect(fight.showResult(9)).toMatchObject({ pct: 35, name: 'Hearty' });
    expect(fight.batchBowls()).toBe(27);
    expect(fight.cookBowls()).toBe(19);
    expect(fight.canShow()).toBe(false);
    expect(fight.showResult(12).pct).toBe(50);
    expect(fight.batchBowls()).toBe(30);
    // it's saved (a made-up one isn't), and it runs out
    expect(fight.fightFrom(fight.saveFight()).bonus).toEqual({ pct: 50, t: fight.BONUS_S });
    expect(fight.fightFrom({ bonus: { pct: 999, t: 40 } }).bonus).toEqual({ pct: 0, t: 0 });
    for (let t = 0; t < fight.BONUS_S + 0.5; t += 0.5) fight.step(0.5);
    expect(F().bonus).toEqual({ pct: 0, t: 0 });
    expect(fight.batchBowls()).toBe(20);
  });

  it('the gong can forecast as if a bonus started now (gong.ts\'s verdict)', async () => {
    const { fight, F } = await atPot();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) fight.addMachine(k);
    for (const r of ['washer', 'salter', 'picker', 'cook', 'attendant'] as const) fight.hire(r);
    for (let t = 0; t < 60; t += 0.05) fight.step(0.05);
    const base = fight.forecast()!, boosted = fight.forecast(0, { bonus: 50 })!;
    expect(boosted.turned).toBeGreaterThanOrEqual(base.turned);
    // (the real cellar's left as it was)
    expect(F().bonus).toEqual({ pct: 0, t: 0 });
    expect(fight.forecast()).toEqual(base);
  });

  it('the gong\'s verdict goes by what a cooking bonus could do: maybe if +35% wins, likely lost if only +50% does', async () => {
    await atPot();
    const [fight, gong] = await Promise.all([import('../src/fight'), import('../src/gong')]);
    // a crowd of 220: 111 beat him
    const boss = fight.BOSSES[2], f = (turned: number) => ({ boss, turned, worst: null, at: 0 });
    const v = (base: number, at35: number, at50: number) => gong.verdict(boss, f(base), 220, { at35: f(at35), at50: f(at50) });
    expect(v(134, 140, 150)).toBe('win');
    expect(v(111, 130, 140)).toBe('likelywin');
    expect(v(100, 111, 125)).toBe('maybe');
    expect(v(100, 110, 111)).toBe('likelylose');
    expect(v(100, 105, 110)).toBe('lose');
  });

  it('the player standing at the pot cooks the bigger batch while the bonus lasts', async () => {
    const { g, fight, F } = await atPot();
    fight.showResult(12);
    F().pantry = { rice: 4, fish: 4, mush: 4 }; F().cookT = 0;
    g.runUntil(() => F().cooked.length > 0, 3);
    expect(F().pot.length + F().counter.length).toBe(30);
  });

  it('the show takes four of each, as a batch does: no Cook without them', async () => {
    const { show, run, F } = await atPot();
    F().pantry = { rice: 4, fish: 3, mush: 4 };
    run(0.1);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(true);
    expect($('cook').textContent).toContain('4 each');
    expect(show.startShow()).toBe(false);
    F().pantry.fish = 4;
    run(0.1);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(false);
  });

  it('no mushrooms before the grow room\'s open: the show needs none and doesn\'t show any', async () => {
    const { show, run, F } = await atPot();
    F().beaten = 0; F().pantry = { rice: 4, fish: 4, mush: 0 };
    run(0.1);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(false);
    $('cook').click();
    expect(show.showing()).toBe(true);
    expect($('showIntro').textContent).not.toContain('🍄');
    expect($('showIntro').textContent).toContain('🍚 🐟 ×4');
  });

  it('Cook at the pot starts the show: the game holds still, and ✕ ends it with nothing', async () => {
    const { g, show, run, F } = await atPot();
    expect($('cook').hidden).toBe(false);
    $('cook').click();
    expect(show.showing()).toBe(true);
    expect(document.body.classList.contains('show')).toBe(true);
    expect($('show').hidden).toBe(false);
    const t = F().t;
    run(2);
    expect(F().t).toBe(t);
    expect(show.showState()?.phase).toBe('intro');
    expect(show.showCam.k).toBe(1);
    $('showShut').click();
    expect(F().pantry).toEqual({ rice: 8, fish: 8, mush: 8 });
    run(0.6);
    expect(show.showing()).toBe(false);
    expect(show.showCam.k).toBe(0);
    expect(F().bonus.t).toBe(0);
    expect(g.player.g.visible).toBe(true);
    run(0.1);
    expect(F().t).toBeGreaterThan(t);
  });

  it('plays the four steps for stars, and the stars buy the bonus', async () => {
    const { plan, cellar, fight, show, run, key, ptr, onScreen, until, F } = await atPot();
    $('cook').click();
    run(0.6);
    $('showGo').click();
    // cut: tap as each line meets the knife (they come along every 0.15 m at 0.72 m in 4.2 s)
    until('Cut');
    let at = 0;
    for (const when of [0.27, 0.42, 0.57].map(d => d * 4.2 / 0.72)) { run(when - at); at = when; key('keydown'); key('keyup'); }
    until('Throw');
    expect(show.showState()!.stars[0]).toBe(3);
    // throw: drag each one up from the board and let go, aimed at the pot's middle
    const P = plan.POT, CY = cellar.CY;
    for (let i = 0; i < 3; i++) {
      run(0.1);
      const from = onScreen(P.x, CY + 0.99, P.z + 1.38), to = onScreen(P.x, CY + 1.37, P.z);
      ptr('pointerdown', from.x, from.y);
      ptr('pointermove', from.x + (to.x - from.x) / 2.7, from.y + (to.y - from.y) / 2.7);
      ptr('pointerup', from.x + (to.x - from.x) / 2.7, from.y + (to.y - from.y) / 2.7);
      run(1.2);
    }
    until('Season');
    expect(show.showState()!.stars[1]).toBeGreaterThanOrEqual(2);
    // season: three pours, held a while
    for (let i = 0; i < 3; i++) { run(0.1); key('keydown'); run(0.7); key('keyup'); run(0.8); }
    until('Stir');
    // stir: circles round the pot at a steady pace (the mouse up over the step bar above after the first second)
    const c = onScreen(P.x, CY + 1.37, P.z);
    ptr('pointerdown', c.x + 120, c.y); ptr('pointerup', c.x + 120, c.y);
    let a = 0;
    for (let i = 0; i < 60 * 6; i++) { a += Math.PI * 2 * 0.8 / 60; ptr('pointermove', c.x + Math.cos(a) * 120, c.y + Math.sin(a) * 120, i >= 60 ? 'showSteps' : 'showPlay'); run(1 / 60); }
    ptr('pointerup', c.x, c.y);
    run(1.2);
    const st = show.showState()!;
    expect(st.phase).toBe('result');
    expect(st.stars[3]).toBeGreaterThanOrEqual(2);
    const total = st.stars.reduce((a, b) => a + b, 0), tier = fight.BONUS_TIERS.find(x => total >= x.min)!;
    expect(F().bonus.pct).toBe(tier.pct);
    // the batch it cooked: four of each off the ledge, its bowls in the pot (at the size the stars bought)
    expect(F().pantry).toEqual({ rice: 4, fish: 4, mush: 4 });
    expect(F().pot.length).toBe(fight.batchBowls());
    expect($('showCard').hidden).toBe(false);
    expect($('showCard').textContent).toContain(`★ ${total} / 12`);
    $('showBack').click();
    run(0.6);
    expect(show.showing()).toBe(false);
    // no new show while the bonus lasts
    if (tier.pct) {
      run(0.1);
      expect(($('cook') as HTMLButtonElement).disabled).toBe(true);
      expect($('potBonus').hidden).toBe(false);
      $('cook').click();
      expect(show.showing()).toBe(false);
    }
  }, 60_000);
});
