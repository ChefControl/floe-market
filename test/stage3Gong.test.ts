// Stage 3: the gong and its forecast, a boss's rush and the card after it, how his fight ends (the finishers), and the
// gong rung while a local bout is on.
import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { FACE } from '../src/icons/bosses';
import { makeRing } from '../src/finishRig';
import { $, offered, ring } from './stage3Ring';

describe('the gong', () => {
  it('its panel names the next boss and your chances; ringing it walks him in, and brings his crowd onto the floor', async () => {
    const { g, plan, swarm, fight, gong, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.3);
    expect($('gong').hidden).toBe(false);
    // Chunkos against him, what he brings (his crowd, his bell, his prize), and your chances in a word
    expect($('gongBoss').textContent).toBe('Hakkaku');
    expect([...$('gongCrowd').children].map(c => c.textContent)).toEqual(['👥 100', '💪 51', '🔔 30 s', '🐡 100']);
    const said = gong.VERDICT[gong.verdict(fight.BOSSES[0], fight.forecast()!)];
    expect($('gongCast').textContent).toBe(`Your chances${said}`);
    expect($('gongCast').querySelector('.seal')!.className).toMatch(/^seal v-/);
    expect($('gongGo').textContent).toBe('Ring the gong');
    // (their faces: here, with no WebGL to render them, their emoji)
    expect($('gongYouP').textContent).toBe('🍙');
    expect($('gongThemP').textContent).toBe(FACE.octopus);
    // ring it anyway: no fee
    const money = g.wallet.money;
    g.press('e');
    g.run(0.1);
    g.press('e', 'keyup');
    expect(F().rush).toMatchObject({ boss: 0, n: 100, turned: 0 });
    expect(g.wallet.money).toBe(money);
    // 入場: his name, his crowd, and how many to turn
    expect($('fightBanner').hidden).toBe(false);
    expect($('fightBanner').textContent).toBe(`入場Hakkaku ${FACE.octopus} · 100 fans💪 51 TO WIN`);
    expect($('rush').hidden).toBe(false);
    g.ui.hud(0);
    expect($('rushYou').textContent).toBe('Chunkos 0');
    expect($('rushBell').textContent).toBe('🔔 30');
    expect($('rushThem').textContent).toBe('100 Hakkaku');
    // (his goal marked on the rope: 51 of 100)
    expect($('rushGoal').hidden).toBe(false);
    expect($('rushGoal').style.left).toBe('51%');
    expect($('rushKnot').hidden).toBe(true);
    expect($('gongGo').hidden).toBe(true);
    // his bell waits for them all to walk in to the bar, and nobody buys on the way
    fight.toStall(false);
    g.run(fight.WALK_IN - 0.2);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('🔔 30');
    expect(F().rush!.turned).toBe(0);
    g.run(0.4);
    g.ui.hud(0);
    expect(F().rush!.turned).toBe(1);
    expect($('rushYou').textContent).toBe('Chunkos 1');
    expect($('rushThem').textContent).toBe('99 Hakkaku');
    // (and the banner's gone by then)
    expect($('fightBanner').hidden).toBe(true);
    // (all of them round the bar by then, on the floor, but the one just turned, off to a spot at the bar for
    // their bowl, and only yours once they've got it; and a few waiting fans stepping along the bar to make room)
    expect(swarm.ways().length).toBe(100);
    expect(swarm.ways().filter(w => w.length === 1).length).toBeGreaterThanOrEqual(96);
    expect(swarm.swarm()).toMatchObject({ n: 100, ours: 0 });
    g.runUntil(() => swarm.swarm().ours > 0, 3);
    expect(swarm.swarm().ours).toBeGreaterThan(0);
  });

  it('the forecast is what the rush does, with the crew working', async () => {
    const { fight } = await ring({ level: 0 });
    const f = fight;
    f.resetFight();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) f.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) f.hire(r);
    for (let t = 0; t < 90; t += 0.05) f.step(0.05);
    const fc = f.forecast()!;
    expect(fc.boss.name).toBe('Hakkaku');
    expect(f.ringGong()).toBe(true);
    // (a local fight on: he walks in once it's over, and the forecast knew)
    expect(f.F.called).toBe(true);
    while (f.F.called) f.step(0.05);
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) f.step(0.05);
    expect(f.F.rush!.turned).toBe(fc.turned);
    expect(f.F.rush!.win).toBe(fc.turned >= f.toBeat(fc.boss));
  });

  it("the faces are rendered once from each wrestler's own model, close up, and never touch the luck", async () => {
    await ring({ level: 0 });
    const { renderer } = await import('../src/render'), P = await import('../src/portraits');
    // (a renderer that can draw off the screen and read it back, as a real one can)
    const shots: number[] = [];
    Object.assign(renderer, {
      getRenderTarget: () => null, getClearAlpha: () => 1, setRenderTarget() {}, setClearAlpha() {}, clear() {},
      readRenderTargetPixels: (_t: unknown, _x: number, _y: number, w: number, _h: number, px: Uint8Array) => { shots.push(w); px.fill(200); },
    });
    const ctx = document.createElement('canvas').getContext('2d') as unknown as Record<string, unknown>;
    ctx.createImageData = (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) });
    const url = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FACE');
    const luck = Math.random;
    let drawn = 0;
    Math.random = () => { drawn++; return luck(); };
    try {
      const who = ['champ', 'local', 'octopus', 'crab', 'catfish', 'shark', 'puffer'] as const;
      expect(who.map(w => P.portrait(w))).toEqual(who.map(() => 'data:image/png;base64,FACE'));
      // once each, sharp (192 pixels across), and kept
      expect(shots).toEqual(who.map(() => 192));
      P.portrait('crab');
      expect(shots).toHaveLength(who.length);
    } finally { Math.random = luck; url.mockRestore(); }
    expect(drawn).toBe(0);
    // on the page: the picture, and no emoji
    const el = document.createElement('i');
    P.showFace(el, 'shark', '🦈');
    expect(el.style.backgroundImage).toBe('url("data:image/png;base64,FACE")');
    expect(el.textContent).toBe('');
  });

  it("your chances are a word, by how many the forecast turns of the more than half that beats him", async () => {
    const { fight, gong } = await ring({ level: 0 });
    const boss = fight.BOSSES[0], at = (turned: number, n?: number) => gong.verdict(boss, { boss, turned, worst: null, at: 0 }, n);
    // a crowd of 220: 111 beat him
    expect([134, 133, 111, 110, 95, 94, 67, 66, 0].map(t => at(t, 220))).toEqual(
      ['win', 'likelywin', 'likelywin', 'maybe', 'maybe', 'likelylose', 'likelylose', 'lose', 'lose']);
    // (with a fix holding, 66 of them kept home: 78 of 154 beat him)
    expect(at(78, 154)).toBe('likelywin');
    expect(Object.values(gong.VERDICT)).toEqual(['Win', 'Likely win', 'Maybe', 'Likely lose', 'Lose']);
  });

  it('turning more than half his crowd beats him, after the fight: the prize, the card, and the grow room found', async () => {
    const { g, plan, fight, swarm, cellar, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    const money = g.wallet.money;
    // just enough: 51 of his 100, by the bell
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 51 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 51, win: true });
    // his crowd sits down and the fight's on, but nothing's settled until it's over
    expect(F().bout.phase).toBe('sit');
    expect(F().beaten).toBe(0);
    expect($('fightCard').hidden).toBe(true);
    g.run(fight.BOUT.sit + 1);
    expect(F().bout.phase).toBe('fight');
    expect(swarm.swarm()).toMatchObject({ n: 100, ours: 51 });
    g.run(fight.BOUT.fight);
    expect(F().bout.phase).toBe('pay');
    expect(F().beaten).toBe(1);
    expect(g.wallet.money - money).toBeGreaterThanOrEqual(fight.BOSSES[0].prize * fight.CHIP);
    // the card waits, unseen, for him to land off the mound (and the strip says nothing till then either)
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').className).toBe('win wait');
    // (a tight win, 51 of 100: the strip names the champion's reversal, not who won)
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('TENTACLE TWIST');
    // (the card waits for his move's landing: finishers.ts)
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, F().bout.finish), 4);
    expect($('fightCard').className).toBe('win wait');
    g.run(0.5);
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').className).toBe('win');
    expect($('fightCard').textContent).toBe('勝YOU WIN🐡 100🔓 New: grow room, the attendantTap to close');
    // the grow room: lit, walkable, with its first bed (its picker's sold on its square)
    expect(g.layout.found.grow).toBe(true);
    expect(cellar.lights[7].intensity).toBeGreaterThan(0);
    expect(cellar.parts.grow.visible).toBe(true);
    const { x0, x1, z0, z1 } = g.layout.DOORS.find(d => d.b === 'grow')!;
    const q = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
    g.layout.keepOnFloor(q, g.layout.walkable());
    expect(q).toEqual({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 });
    expect(F().lines.mush.n).toBe(1);
    expect(F().hires.picker).toBeUndefined();
    expect(fight.inPot()).toEqual(['rice', 'fish', 'mush']);
    expect($('stageCount').textContent).toBe('1/5');
    // the next boss on the panel, and the tiles he opened
    g.run(1);
    expect($('gongBoss').textContent).toContain('Yokobashiri');
    expect(offered(g)).toEqual(expect.arrayContaining(['bed', 'picker', 'attendant']));
    // (the Back-Alley Ring and the bowl slide wait for Yokobashiri)
    expect(offered(g)).not.toContain('tier1');
    // the card goes on a tap
    $('fightCard').click();
    expect($('fightCard').hidden).toBe(true);
  }, 30_000);

  it('a lost rush says how short it was and why, and costs nothing: half his crowd is not enough', async () => {
    const { g, fight, F } = await ring();
    const money = g.wallet.money;
    expect(fight.ringGong()).toBe(true);
    g.run(fight.WALK_IN + fight.BOSSES[0].bell + fight.BOUT.sit + fight.BOUT.fight + 3.9);
    expect(F().rush!.win).toBe(false);
    expect(F().beaten).toBe(0);
    expect(g.wallet.money).toBe(money);
    const card = $('fightCard').textContent!;
    expect($('fightCard').className).toBe('lose');
    expect(card).toBe('負SHORT BY 51🍚 Pot waited on riceTap to close');
    // his crowd clears, and the gong's ready again; a tie (50 of 100) still loses
    g.runUntil(() => !F().rush, 20);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 50 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 50, win: false });
  }, 30_000);
});

describe('the finishers', () => {
  it('a stronger boss wants more than half: his own share of his crowd, and a grand win half way from it to all of them', async () => {
    const { fight } = await ring({ level: 0 });
    const [hakkaku, , dobu] = fight.BOSSES;
    expect(fight.toBeat(hakkaku)).toBe(51);
    expect(fight.toBeat(dobu)).toBe(399);
    // (a fix's fans kept home: the same share of the rest)
    expect(fight.toBeat(dobu, 349)).toBe(280);
    const R = (turned: number) => ({ boss: 2, n: 498, turned, win: turned >= 399, slam: -1 }) as import('../src/fight').Rush;
    expect([fight.grand(R(464)), fight.grand(R(465))]).toEqual([false, true]);
    // (a win's room, 399 to 498, in thirds: tight, push-out, grand)
    expect([R(432), R(433), R(464)].map(fight.finishOf)).toEqual(['tight', 'push', 'push']);
    expect(fight.finishOf(R(300))).toBe('push');
    expect(fight.finishOf(R(398))).toBe('tight');
  });

  it("how a boss's fight ends goes by his vote: a grand win, a heavy loss, a tight one, or a push-out", async () => {
    const { fight } = await ring({ level: 0 });
    const F2 = await import('../src/finishers');
    // Hakkaku: 💪 51 of his 100; a loss is tight within 5 of that
    const end = (turned: number, boss = 0) => {
      const R = { boss, n: fight.bossOf(boss).crowd, turned, win: turned >= fight.toBeat(fight.bossOf(boss)), slam: -1 } as import('../src/fight').Rush;
      const f = fight.finishOf(R);
      return [f, F2.moveOf(R, f)?.name ?? null];
    };
    // (a win by thirds of the way from his 💪 to all of them: 51 to 67 tight, 68 to 83 a push-out, 84 on grand)
    expect(end(84)).toEqual(['grand', 'BELT THROW']);
    expect(end(83)).toEqual(['push', null]);
    expect(end(68)).toEqual(['push', null]);
    expect(end(67)).toEqual(['tight', 'TENTACLE TWIST']);
    expect(end(51)).toEqual(['tight', 'TENTACLE TWIST']);
    expect(end(50)).toEqual(['tight', 'INK ESCAPE']);
    expect(end(46)).toEqual(['tight', 'INK ESCAPE']);
    expect(end(45)).toEqual(['push', null]);
    expect(end(26)).toEqual(['push', null]);
    expect(end(25)).toEqual(['heavy', 'EIGHT-ARM WRAP']);
    // every boss has his own, and the champion his own against each
    for (const k of ['octopus', 'crab', 'catfish', 'shark', 'puffer'] as const) {
      const m = F2.MOVES[k];
      expect(new Set([m.tight.name, m.heavy.name, m.champTight.name, m.champGrand.name]).size).toBe(4);
      for (const mv of Object.values(m)) expect(mv.name.split(' ').length).toBeLessThanOrEqual(3);
    }
    expect(end(0, 4)).toEqual(['heavy', 'PUFF BOUNCE']);
    expect(end(1050, 4)).toEqual(['grand', 'BIG SQUEEZE']);
    // (the practice fight: the sparring partner's)
    expect(end(35, -1)).toEqual(['grand', 'BELT THROW']);
  });

  /** Whether he's down: his middle low over the ground under him (lying, or sat). */
  const down = (r: import('../src/rikishi').RikishiModel, c: typeof import('../src/cellar')) => {
    const v = r.hips.getWorldPosition(new Vector3()), rg = makeRing(c.RING_TOP, c.RING_HALF, c.RING_R, c.PIT_STEPS);
    return v.y - c.CY - rg.ground(v.x - c.RING.x, v.z - c.RING.z) < 0.45;
  };
  it('a tight win goes the wrong way first, then the champion turns it at his own straw', async () => {
    const { g, fight, dohyo, cellar, F } = await ring();
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 52 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('tight');
    // (as the win's finish begins, finish.test.ts: the champion's the one at the straw, his own, east)
    g.runUntil(() => !!fight.finish(), 25);
    expect(F().bout.tug).toBeLessThan(-0.6);
    expect(dohyo.ring.champ.position.x - cellar.RING.x).toBeGreaterThan(1);
    // (not pushed: the finish the fans gave it)
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, fight.FINISH.settle + fight.FINISH.push + 3);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('TENTACLE TWIST');
    // (down by the time the card shows: finishRig's own test checks how each move gets him there)
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'tight') + 0.2, 6);
    expect(down(dohyo.ring.rival, cellar)).toBe(true);
    g.run(1.2);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('WIN!');
    expect(F().beaten).toBe(1);
  }, 30_000);

  it("the crab's own: under half needed, his heavy finisher; just short, his tight one", async () => {
    const { g, fight, dohyo, cellar, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    const { landsOf } = await import('../src/finishers');
    const lose = async (n: number) => {
      g.runUntil(() => !F().rush, 30);
      expect(fight.ringGong()).toBe(true);
      g.runUntil(() => { while (F().rush!.turned + F().stall.length < n && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
      g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, 25);
    };
    // under half of his 💪 104: Crab shuffle
    await lose(30);
    expect(F().bout.finish).toBe('heavy');
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('CRAB SHUFFLE');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'heavy') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
    // just short, 100 of 104: Side step
    await lose(100);
    expect(F().bout.finish).toBe('tight');
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('SIDE STEP');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'tight') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
  }, 60_000);

  it("a heavy loss ends with the boss's own move; a plain win with the push-out west", async () => {
    const { g, fight, dohyo, cellar, F } = await ring();
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 20 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('heavy');
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, 25);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('EIGHT-ARM WRAP');
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'heavy') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
    g.runUntil(() => !F().rush, 15);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 75 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('push');
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= fight.LANDS + 0.2, 25);
    expect(dohyo.ring.rival.position.x - cellar.RING.x).toBeLessThan(-cellar.RING_HALF);
  }, 60_000);
});

describe('the gong during a local fight', () => {
  it('waits for it: the champion finishes it there and then, and the boss walks in as its fans go home', async () => {
    const { g, plan, fight, at, F } = await ring();
    g.runUntil(() => F().bout.phase === 'fight' && F().bout.t > 4, 50);
    const n = F().bout.n, t0 = F().t;
    at(plan.GONG_PAD);
    g.press('e');
    g.run(0.05);
    g.press('e', 'keyup');
    // no boss yet: the local's result at once, the champion's, and the gong can't be rung twice
    expect(F().rush).toBeNull();
    expect(F().called).toBe(true);
    expect(F().bout).toMatchObject({ phase: 'pay', win: true, n: n + 1 });
    expect(fight.ringGong()).toBe(false);
    expect(fight.forecast()).toBeNull();
    expect($('gongCast').textContent).toBe('He walks in after this fight');
    expect($('gongGo').hidden).toBe(true);
    expect($('fightBanner').hidden).toBe(true);
    // he lands; the rest of it (the bow, the prize, back to the corners) a little hurried
    g.run(fight.LANDS - 0.2);
    expect(F().rush).toBeNull();
    g.runUntil(() => !!F().rush, 6);
    const took = F().t - t0, want = fight.LANDS + (fight.BOUT.pay - fight.LANDS) / fight.HURRY;
    expect(Math.abs(took - want)).toBeLessThan(0.3);
    expect(took).toBeLessThan(fight.BOUT.pay);
    // then he walks in, banner and all, and his rush starts from the top
    expect(F().called).toBe(false);
    expect(F().rush).toMatchObject({ boss: 0, n: 100, turned: 0, walk: fight.WALK_IN });
    expect(F().bout).toMatchObject({ phase: 'prep', n: n + 1 });
    expect($('fightBanner').hidden).toBe(false);
    expect($('fightBanner').textContent).toBe(`入場Hakkaku ${FACE.octopus} · 100 fans💪 51 TO WIN`);
  });

  it('before the fight, he walks in at once; and a reload while he waits calls him off', async () => {
    const { g, fight, F } = await ring();
    g.runUntil(() => F().bout.phase === 'sit', 30);
    expect(fight.ringGong()).toBe(true);
    expect(F().rush).toMatchObject({ boss: 0, n: 100 });
    g.runUntil(() => !F().rush, 120);
    g.runUntil(() => F().bout.phase === 'fight', 50);
    expect(fight.ringGong()).toBe(true);
    expect(fight.saveFight().called).toBe(false);
    expect(fight.fightFrom(fight.saveFight()).called).toBe(false);
  }, 30_000);

  it('a long name shrinks to fit its box on the gong and the strip, and takes two lines past that', async () => {
    const { gong } = await ring({ level: 0 });
    const el = document.createElement('span');
    document.body.append(el);
    el.textContent = 'Sparring partner';
    let box = 150;
    Object.defineProperty(el, 'clientWidth', { get: () => box });
    Object.defineProperty(el, 'scrollWidth', { get: () => el.textContent!.length * (parseFloat(el.style.fontSize) || 16) * 0.6 });
    gong.fit(el);
    expect(parseFloat(el.style.fontSize)).toBeLessThan(16);
    expect(el.scrollWidth).toBeLessThanOrEqual(150);
    expect(el.classList.contains('two')).toBe(false);
    box = 60;
    gong.fit(el);
    expect(el.classList.contains('two')).toBe(true);
    expect(el.style.fontSize).toBe('');
    box = 400;
    gong.fit(el);
    expect(el.style.fontSize).toBe('');
    expect(el.classList.contains('two')).toBe(false);
  });

  it("the push-out's fall lands when fight.ts says it does", async () => {
    const { fight } = await ring({ level: 0 });
    const { PUSH } = await import('../src/finishers');
    expect(PUSH.lands).toBe(fight.LANDS);
  });
});
