// The cooking show at the pot (chanko.ts): the Cook button at the pot, the game holding still while it's on, its four
// steps (cut, throw, season, stir) and their stars, and the bonus the stars buy the pot (fight.ts): bigger batches for
// a while, the cook's 70% of them too, and no new show until it's run out. It's a bonus game alone (it takes nothing
// and cooks nothing), every piece that's cut is thrown in, the stir starts on the soup, a show left half way carries
// on where it was (saved with the game too), and nothing stands in the camera's way.
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
  const P = plan.POT, CY = cellar.CY;
  /** Opens the show from the Cook button, and starts (or carries on) from its card. */
  const open = () => { $('cook').click(); run(0.6); $('showGo').click(); };
  /** The cut, from its start: a tap as each line meets the knife (they come along every 0.15 m at 0.72 m in 4.2 s),
   *  or none for the lines `skip`ped. */
  const cut = (skip: number[] = []) => {
    until('Cut');
    let at = 0;
    [0.27, 0.42, 0.57].map(d => d * 4.2 / 0.72).forEach((when, j) => { run(when - at); at = when; if (!skip.includes(j)) { key('keydown'); key('keyup'); } });
  };
  /** One throw: dragged up from the board and let go, aimed at the pot's middle. */
  const throwOne = () => {
    run(0.1);
    const from = onScreen(P.x, CY + 0.99, P.z + 1.38), to = onScreen(P.x, CY + 1.37, P.z);
    ptr('pointerdown', from.x, from.y);
    ptr('pointermove', from.x + (to.x - from.x) / 2.7, from.y + (to.y - from.y) / 2.7);
    ptr('pointerup', from.x + (to.x - from.x) / 2.7, from.y + (to.y - from.y) / 2.7);
    run(1.1);
  };
  /** Throws until the throw's done; how many it took. */
  const throwAll = () => { until('Throw'); let n = 0; while (n < 10 && show.showState()?.step === 'Throw' && show.showState()?.phase === 'play') { throwOne(); n++; } return n; };
  /** Three pours, held a while. */
  const season = () => { until('Season'); for (let i = 0; i < 3; i++) { run(0.1); key('keydown'); run(0.7); key('keyup'); run(0.8); } };
  /** Circles round the pot at a steady pace for `s` seconds, from a first press at `x, y` (on the soup, if not given). */
  const stir = (s = 6, at?: { x: number; y: number }) => {
    until('Stir');
    const c = onScreen(P.x, CY + 1.37, P.z), p = at ?? { x: c.x + 120, y: c.y };
    ptr('pointerdown', p.x, p.y); ptr('pointerup', p.x, p.y);
    let a = 0;
    for (let i = 0; i < 60 * s; i++) { a += Math.PI * 2 * 0.8 / 60; ptr('pointermove', c.x + Math.cos(a) * 120, c.y + Math.sin(a) * 120, i >= 60 ? 'showSteps' : 'showPlay'); run(1 / 60); }
    ptr('pointerup', c.x, c.y);
  };
  return { g, plan, cellar, fight, show, run, key, ptr, onScreen, until, open, cut, throwOne, throwAll, season, stir, F: () => fight.F };
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
    // Dobu's 220: 111 beat him
    const boss = fight.BOSSES[2], f = (turned: number) => ({ boss, turned, worst: null, at: 0 });
    const v = (base: number, at35: number, at50: number) => gong.verdict(boss, f(base), boss.crowd, { at35: f(at35), at50: f(at50) });
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

  it('the show is a bonus game alone: it starts with nothing on the ledge, and takes nothing and cooks nothing', async () => {
    const { show, run, open, cut, throwAll, season, stir, F } = await atPot();
    F().pantry = { rice: 0, fish: 0, mush: 0 };
    run(0.1);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(false);
    expect($('cook').textContent).toContain('Cook');
    expect($('showIntro').textContent).not.toContain('×4');
    open(); cut(); throwAll(); season(); stir();
    run(1.2);
    expect(show.showState()!.phase).toBe('result');
    expect(F().pantry).toEqual({ rice: 0, fish: 0, mush: 0 });
    expect(F().pot.length).toBe(0);
    expect(F().cooked.length).toBe(0);
  }, 60_000);

  it('every piece the fish is cut into is thrown in, and the throws\' stars are their average', async () => {
    const { show, open, cut, throwAll, until } = await atPot();
    open(); cut();
    // three clean cuts: four slices, then the mushroom and the rice
    expect(throwAll()).toBe(6);
    until('Season');
    const got = show.showState()!.run.got;
    expect(got[0]).toEqual([1, 1, 1]);
    expect(got[1]).toHaveLength(6);
    expect(show.showState()!.stars[1]).toBe(Math.round(got[1].reduce((a, b) => a + b, 0) / 6 * 3));
  }, 60_000);

  it('a missed line leaves two slices joined, thrown as one; before the grow room\'s open, no mushroom', async () => {
    const { show, open, cut, throwAll, F } = await atPot();
    F().beaten = 0;
    open(); cut([1]);
    // three pieces (the middle two joined), and the rice
    expect(throwAll()).toBe(4);
    expect(show.showState()!.run.got[0]).toEqual([1, 0, 1]);
  }, 60_000);

  it('the stir starts with the first press on the soup, not anywhere on the screen', async () => {
    const { show, run, until, open, cut, throwAll, season, stir } = await atPot();
    open(); cut(); throwAll(); season();
    until('Stir');
    // a press down in the corner, and circling: the ladle's not taken up, and the clock doesn't start
    stir(7, { x: 4, y: innerHeight - 4 });
    expect(show.showState()).toMatchObject({ step: 'Stir', phase: 'play' });
    expect(show.showState()!.run.got[3]).toEqual([0, 0]);
    // then on the soup: it's on, and five seconds later it's done
    stir(6);
    run(1.2);
    expect(show.showState()!.phase).toBe('result');
    expect(show.showState()!.stars[3]).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('left half way, it carries on from the same step with its stars, nothing played again', async () => {
    const { show, run, key, open, cut, throwOne, throwAll, until, F } = await atPot();
    open(); cut([2]);
    until('Throw');
    const cutStars = show.showState()!.stars[0];
    throwOne();
    $('showShut').click();
    run(0.6);
    expect(show.showing()).toBe(false);
    const kept = structuredClone(F().show)!;
    expect(kept.step).toBe(1);
    expect(kept.got[0]).toEqual([1, 1, 0]);
    expect(kept.got[1]).toHaveLength(1);
    // no fresh show: Cook carries it on, at the throw, the cut's stars as they were
    run(0.1);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(false);
    $('cook').click(); run(0.6);
    expect($('showGo').textContent).toBe('Carry on');
    expect($('showIntro').textContent).toContain(`★ ${cutStars} so far · Throw next`);
    $('showGo').click();
    until('Throw');
    expect(show.showState()!.stars[0]).toBe(cutStars);
    expect(show.showState()!.run.got[1]).toEqual(kept.got[1]);
    // (three pieces, the mushroom and the rice in all, less the one that's in already)
    expect(throwAll()).toBe(4);
    // ✕ half way through a pour: the pour stops where it is, and counts
    until('Season');
    run(0.1); key('keydown'); run(0.3);
    $('showShut').click();
    key('keyup');
    run(0.6);
    expect(F().show!.step).toBe(2);
    expect(F().show!.got[2]).toHaveLength(1);
    const lines = [...F().show!.lines];
    expect(lines).toHaveLength(3);
    open();
    until('Season');
    // (the seasonings' lines are where they were)
    expect(show.showState()!.run.lines).toEqual(lines);
    expect(show.showState()!.run.got[2]).toHaveLength(1);
  }, 60_000);

  it('✕ with a throw in the air: it lands, and counts', async () => {
    const { show, run, ptr, onScreen, plan, cellar, open, cut, until, F } = await atPot();
    open(); cut();
    until('Throw');
    run(0.1);
    const from = onScreen(plan.POT.x, cellar.CY + 0.99, plan.POT.z + 1.38), to = onScreen(plan.POT.x, cellar.CY + 1.37, plan.POT.z);
    ptr('pointerdown', from.x, from.y);
    ptr('pointerup', from.x + (to.x - from.x) / 2.7, from.y + (to.y - from.y) / 2.7);
    run(0.1);
    expect(show.showState()!.run.got[1]).toHaveLength(0);
    $('showShut').click();
    expect(F().show!.got[1]).toHaveLength(1);
  }, 60_000);

  it('a show left half way is saved with the game, and carries on after loading', async () => {
    const { show, run, open, cut, throwAll, until, fight, F } = await atPot();
    open(); cut(); throwAll();
    until('Season');
    const throwStars = show.showState()!.stars[1];
    $('showShut').click(); run(0.6);
    const saved = fight.saveFight();
    expect(saved.show).toMatchObject({ step: 2 });
    expect(fight.fightFrom(saved).show).toEqual(saved.show);
    // (what doesn't read back starts it fresh; numbers out of range are kept in it)
    expect(fight.fightFrom({ ...saved, show: 'junk' }).show).toBeNull();
    expect(fight.fightFrom({ ...saved, show: { step: 9, got: [[5], 'x'], lines: [2] } }).show).toEqual({ step: 4, got: [[5], [], [], []], lines: [1] });
    // loaded back in: Cook carries on at the seasoning, the stars as they were
    fight.resetFight(fight.fightFrom(JSON.parse(JSON.stringify(saved))));
    F().cookT = 1e9;
    run(0.1);
    open();
    until('Season');
    expect(show.showState()!.stars.slice(0, 2)).toEqual([3, throwStars]);
  }, 60_000);

  it('a bland pot buys nothing, and a new show can start at once', async () => {
    const { show, run, open, until, F } = await atPot();
    // (a show with every step played, all misses)
    F().show = { step: 4, got: [[0, 0, 0], [0, 0], [0, 0, 0], [5.6, 0]], lines: [0.5, 0.5, 0.5] };
    open(); run(0.1);
    expect(show.showState()!.phase).toBe('result');
    expect($('showCard').textContent).toContain('Cook again any time');
    expect(F().show).toBeNull();
    expect(F().bonus.t).toBe(0);
    $('showBack').click(); run(0.7);
    expect(($('cook') as HTMLButtonElement).disabled).toBe(false);
    $('cook').click(); run(0.6);
    expect($('showGo').textContent).toBe('Start');
    $('showGo').click();
    until('Cut');
    expect(show.showState()!.run).toMatchObject({ step: 0, got: [[-1, -1, -1], [], [], [0, 0]] });
  }, 60_000);

  it('whoever stands between the camera and the set is put away while it\'s on, and comes back after', async () => {
    const { g, plan, fight, show, run, F } = await atPot();
    const [{ Person }, { cellar }] = await Promise.all([import('../src/characters'), import('../src/cellar')]);
    fight.hire('picker');
    run(0.1);
    // the picker, straw hat and all, right in front of the prep board
    const w = F().crew.find(c => c.role === 'picker')!;
    Object.assign(w, { x: plan.POT.x + 0.45, z: plan.POT.z + 2.05, path: [], steps: [], moving: false });
    g.game.tick(1 / 60);
    const him = cellar.children.find(o => o instanceof Person && o.visible && Math.hypot(o.position.x - w.x, o.position.z - w.z) < 0.3)!;
    expect(him).toBeTruthy();
    $('cook').click();
    run(0.6);
    expect(him.visible).toBe(false);
    // (and not the room: only a thing or two)
    expect(show.showState()!.hidden).toBeGreaterThanOrEqual(1);
    expect(show.showState()!.hidden).toBeLessThan(6);
    $('showShut').click();
    run(0.6);
    expect(show.showing()).toBe(false);
    expect(him.visible).toBe(true);
  }, 60_000);

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
    const { fight, show, run, until, open, cut, throwAll, season, stir, F } = await atPot();
    open();
    // cut: tap as each line meets the knife
    cut();
    until('Throw');
    expect(show.showState()!.stars[0]).toBe(3);
    // throw: drag each one up from the board and let go, aimed at the pot's middle
    throwAll();
    until('Season');
    expect(show.showState()!.stars[1]).toBeGreaterThanOrEqual(2);
    // season: three pours, held a while
    season();
    // stir: circles round the pot at a steady pace (the mouse up over the step bar above after the first second)
    stir();
    run(1.2);
    const st = show.showState()!;
    expect(st.phase).toBe('result');
    expect(st.stars[3]).toBeGreaterThanOrEqual(2);
    const total = st.stars.reduce((a, b) => a + b, 0), tier = fight.BONUS_TIERS.find(x => total >= x.min)!;
    expect(F().bonus.pct).toBe(tier.pct);
    // nothing off the ledge, nothing cooked: it's played for the bonus alone, and nothing's kept to carry on
    expect(F().pantry).toEqual({ rice: 8, fish: 8, mush: 8 });
    expect(F().pot.length).toBe(0);
    expect(F().show).toBeNull();
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
