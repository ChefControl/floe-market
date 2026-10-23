// Mr. Fugu's offer: once Floe Sushi is fully built (every stage 2 upgrade), a hatch turns up in the dock. Walk up
// to it and he peeks out from under the lid ("come back tonight"); wait for nightfall, and he climbs out with a short
// pitch, and the player answers.
import type { PointLight } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { fake, installFakeAudio, nameBuses } from './fakeAudio';
import { bought, loadGame, MARKET } from './helpers';

const FLOE_SUSHI = ['sushi', 'paddy', 'seats', 'chef', 'farmer', 'porter', 'plot2', 'tables', 'chef3', 'tables2', 'plot3', 'kiosk', 'premium'];

async function setup(save: Parameters<typeof loadGame>[0] = {}) {
  const g = await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI), money: 999_950, ...(save as object) });
  const offer = await import('../src/offer');
  // he's waiting under the hatch once the restaurant's built: walk up to it
  g.run(0.1);
  g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
  const $ = (id: string) => document.getElementById(id)!;
  /** Taps through his lines until the answers are up. */
  const hearHimOut = () => g.runUntil(() => { g.press('z'); return !$('offerPick').hidden; }, 30, 0.1);
  const answer = (label: string) => {
    const b = [...$('offerPick').querySelectorAll('button')].find(x => x.textContent!.includes(label));
    if (!b) throw new Error('no answer ' + label);
    b.click();
  };
  const answers = () => [...$('offerPick').querySelectorAll('button')].map(b => b.textContent!.slice(2));
  /** Through his peek from under the lid, and the night, to his pitch and its answers. */
  const pitch = () => { hearHimOut(); answer('Wait for nightfall'); hearHimOut(); };
  return { g, offer, $, hearHimOut, answer, answers, pitch };
}

describe("Mr. Fugu's offer", () => {
  it('waits for the restaurant to be fully built, whatever the cash', async () => {
    // his hatch is in the dock from the start, shut, and quiet: in stage 1...
    const first = await loadGame({ money: 5_000_000 });
    const { Hatch } = await import('../src/fugu');
    const { scene: world } = await import('../src/render');
    const hatches = () => { const hs: InstanceType<typeof Hatch>[] = []; world.traverseVisible(o => { if (o instanceof Hatch) hs.push(o); }); return hs; };
    expect(hatches()).toHaveLength(1);
    expect(hatches()[0].openTo).toBe(0);
    first.run(3);
    expect(document.getElementById('offerAlert')!.classList.contains('on')).toBe(false);
    // ...and in stage 2 before the restaurant's built, even with millions: nothing knocks, nobody peeks
    const early = await loadGame({ tiles: bought(...MARKET, 'sushi'), money: 5_000_000 });
    early.run(3);
    expect(document.getElementById('offerAlert')!.classList.contains('on')).toBe(false);
    early.placePlayer((await import('../src/offer')).HATCH.x, (await import('../src/offer')).HATCH.z + 1.2);
    early.run(2);
    expect(early.player.held).toBe(false);

    // one upgrade short, and broke
    const { g, offer, $ } = await setup({ tiles: bought(...MARKET, ...FLOE_SUSHI.filter(t => t !== 'premium')), money: 0 });
    g.placePlayer(0, -2);
    g.run(3);
    expect($('offerAlert').classList.contains('on')).toBe(false);
    const { scene } = await import('../src/render');
    const lit = () => { let n = 0; scene.traverseVisible(o => { if ((o as PointLight).isPointLight) n++; }); return n; };
    const lights = lit();
    g.unlocks.applyUnlock('premium');
    g.run(0.1);
    // the hatch turns up with a "!" over it, and an arrow points the way; nothing happens until the player gets there
    expect($('offerAlert').classList.contains('on')).toBe(true);
    expect($('pointers').children).toHaveLength(1);
    // its glow stays off while it knocks (a new light would recompile every material: a freeze as the last upgrade goes in)
    expect(lit()).toBe(lights);
    g.run(3);
    expect(g.player.held).toBe(false);
    g.placePlayer(offer.HATCH.x - 1, offer.HATCH.z + 1);
    g.run(0.1);
    expect(g.player.held).toBe(true);
    // the HUD steps aside behind the blinks, and the player ends up in front of the hatch, on the restaurant's side
    g.run(1);
    expect(document.body.classList.contains('offer')).toBe(true);
    expect(g.player.g.position.z).toBeGreaterThan(offer.HATCH.z + 1.5);
    // ...and comes on behind the blinks, for the lid opening
    expect(lit()).toBe(lights + 1);
  }, 30_000); // 14.7 s of 15 on CI under coverage

  it('first he peeks out from under the lid: "Not now" leaves him there till the player walks off and comes back', async () => {
    const { g, offer, $, hearHimOut, answer, answers } = await setup({ money: 1_000_000 });
    hearHimOut();
    expect(answers()).toEqual(['Wait for nightfall', 'Not now']);
    const { nightK } = await import('../src/stage');
    expect(nightK()).toBe(0); // (by day)
    answer('Not now');
    g.runUntil(() => { g.press('z'); return !g.player.held; }, 15, 0.1);
    expect(offer.offer.answer).toBe(0);
    expect($('offerAlert').classList.contains('on')).toBe(true);
    // standing about doesn't bring him straight back up, even right by the hatch (once a visit)...
    g.run(2);
    expect(g.player.held).toBe(false);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
    g.run(3);
    expect(g.player.held).toBe(false);
    // ...walking off and coming back does
    g.placePlayer(offer.HATCH.x - 5, offer.HATCH.z + 3);
    g.run(0.5);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
    g.run(1);
    expect(g.player.held).toBe(true);
    hearHimOut();
    expect(answers()).toEqual(['Wait for nightfall', 'Not now']);
  });

  it('waiting for nightfall: night falls, he climbs out, and when he\'s done it\'s day again', async () => {
    const { g, offer, hearHimOut, answer, pitch } = await setup({ money: 1_000_000 });
    const { nightK } = await import('../src/stage');
    pitch();
    expect(nightK()).toBe(1);
    expect(offer.offer.answer).toBe(0);
    answer('Not today');
    g.runUntil(() => { g.press('z'); return !g.player.held; }, 15, 0.1);
    g.run(6);
    expect(nightK()).toBe(0);
    // walking off and back onto his hatch brings him back up, at night again, without the peek
    g.placePlayer(offer.HATCH.x - 4, offer.HATCH.z + 2); g.run(0.3);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(1);
    expect(g.player.held).toBe(true);
    hearHimOut();
    expect(nightK()).toBe(1);
  });

  it('a pitch, the answers, and "Not today" leaves his hatch on the dock', async () => {
    const { g, offer, $, hearHimOut, answer, answers, pitch } = await setup({ money: 1_000_000 });
    pitch();
    expect(answers()).toEqual(['Deal me in', 'Is this legal?', 'Not today']);
    // keys run through the answers
    g.press('ArrowRight'); g.press('ArrowRight', 'keyup');
    expect(document.activeElement).toBe($('offerPick').children[1]);
    answer('Is this legal?');
    expect($('offerLine').textContent).toBe('');
    hearHimOut();
    expect(answers()).toEqual(['Deal me in', 'Not today']); // he's answered that one
    answer('Not today');
    g.runUntil(() => { g.press('z'); return !g.player.held; }, 15, 0.1);
    expect(offer.offer.answer).toBe(1);
    expect($('offer').hidden).toBe(true);
    expect(document.body.classList.contains('offer')).toBe(false);
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).fugu).toBe(1);
    // standing about where he left the player doesn't bring him back up...
    g.run(3);
    expect(g.player.held).toBe(false);
    // ...stepping onto the hatch does
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(1);
    expect(g.player.held).toBe(true);
    // and once a visit: answered again, staying on it doesn't bring him straight back up; stepping off and on does
    hearHimOut(); answer('Not today');
    g.runUntil(() => { g.press('z'); return !g.player.held; }, 15, 0.1);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    expect(() => g.runUntil(() => g.player.held, 3)).toThrow();
    g.placePlayer(offer.HATCH.x + 1.2, offer.HATCH.z + 0.5); g.run(0.3);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(1);
    expect(g.player.held).toBe(true);
  });

  it('"Deal me in" puts his price on a gold tile by the hatch, and the hatch stays open', async () => {
    const { g, offer, $, answer, pitch } = await setup({ money: 1_000_000 });
    pitch();
    // a tap shows the rest of a line at once
    g.press('z');
    answer('Deal me in');
    g.run(0.05); g.press('z');
    expect($('offerLine').textContent).toBe('Smart chef. Bring cash. Tell nobody.');
    g.runUntil(() => { g.press('z'); return !g.player.held; }, 10, 0.1);
    expect(offer.offer.answer).toBe(2);
    // the buy-in is on offer, gold, beside the hatch
    const buyIn = g.unlocks.tiles.find(t => t.id === 'dohyo')!;
    expect(g.unlocks.visibleTiles()).toContain(buyIn);
    expect(buyIn).toMatchObject({ gold: true, cost: 100_000 });
    expect(Math.hypot(buyIn.x - offer.HATCH.x, buyIn.z - offer.HATCH.z)).toBeLessThan(3.5);
    // standing on the open hatch no longer brings him back up
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(2);
    expect(g.player.held).toBe(false);

    // a reload keeps his hatch, open, and the buy-in
    g.saveMod.save();
    const again = await loadGame(localStorage.getItem('floe-market-v1')!);
    const o2 = await import('../src/offer');
    expect(o2.offer.answer).toBe(2);
    again.run(3);
    expect(again.player.held).toBe(false);
    expect(again.unlocks.visibleTiles().some(t => t.id === 'dohyo')).toBe(true);
  });

  it('while he is on, the world winds down: what is in the air lands, the cars finish their drive, nobody new comes', async () => {
    const { g, offer } = await setup();
    const [counters, { fly }, items, { scene }] = await Promise.all([import('../src/counters'), import('../src/holder'), import('../src/items'), import('../src/render')]);
    const T = counters.TAKEOUT;
    // a few cars at the takeout window first, away from the hatch, then up to it
    g.placePlayer(0, -2);
    g.runUntil(() => T.queue.length > 0, 60);
    g.run(0.1);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
    g.runUntil(() => offer.offerPlaying(), 10);
    g.run(0.05);
    expect(counters.calm.on).toBe(true);
    // a fillet thrown just as he came up lands instead of hanging in the air
    const m = items.newFillet(); scene.add(m); m.position.set(0, 3, 0);
    fly(m, () => m.position.clone().set(2, 1, 0), 0.5, 1);
    g.run(0.6);
    expect(m.position.distanceTo(m.position.clone().set(2, 1, 0))).toBeLessThan(1e-6);
    // the cars already there drive on to where they were going; nobody new pulls in or passes, and nobody waiting sulks
    const cars = [...T.queue], waits = cars.map(c => c.wait), spawn = T.spawnT;
    const at = cars.map(c => c.g.position.clone());
    g.run(20);
    expect(T.queue.every(c => cars.includes(c))).toBe(true);
    expect(T.spawnT).toBe(spawn);
    T.queue.forEach(c => expect(c.wait).toBe(waits[cars.indexOf(c)]));
    expect(cars.some((c, i) => c.g.position.distanceTo(at[i]) > 0.01 || c.arrived)).toBe(true);
    expect(offer.offerPlaying()).toBe(true);
  });

  it('tapping the screen reads on, but not while the answers are up', async () => {
    const { g, $, hearHimOut } = await setup({ money: 1_000_000 });
    g.runUntil(() => $('offerSay').classList.contains('on'), 10);
    const first = $('offerLine').textContent;
    for (let i = 0; i < 2; i++) { window.dispatchEvent(new Event('pointerdown')); g.run(0.05); }
    expect($('offerLine').textContent).not.toBe(first);
    hearHimOut();
    window.dispatchEvent(new Event('pointerdown'));
    expect($('offerPick').hidden).toBe(false);
  });
  it('sounds through the game: knocks from the hatch, then only him, the rest of the world going quiet', async () => {
    installFakeAudio();
    const { g, offer, hearHimOut, answer } = await setup({ money: 1_000_000 });
    const [audio, sfx] = await Promise.all([import('../src/audio'), import('../src/sfx')]);
    g.press('x'); g.press('x', 'keyup');
    nameBuses(audio.buses);
    const play = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) { fake.now += 1 / 60; g.game.tick(1 / 60); } };
    const since = (fn: () => void) => { const n = fake.played.length; fn(); return fake.played.slice(n); };

    // knocking, off to the side of a player along the dock; the café band plays on
    g.placePlayer(offer.HATCH.x - 4, offer.HATCH.z);
    let heard = since(() => play(5));
    const knocks = heard.filter(p => p.bus === 'sfx' && p.type === 'sine' && Math.round(p.f) === 150);
    expect(knocks.length).toBeGreaterThanOrEqual(4);
    expect(knocks.every(p => p.pan > 0)).toBe(true);
    expect(heard.some(p => p.bus === 'music')).toBe(true);

    // he's on: his mumble and his bass, and nothing else: the effects, the ambience and the band fall silent
    g.placePlayer(offer.HATCH.x, offer.HATCH.z + 1.2);
    play(1);
    expect(audio.buses.sfx.gain.value).toBe(0);
    expect(audio.buses.amb.gain.value).toBe(0);
    expect(since(() => { sfx.coin(); sfx.splash(offer.HATCH); })).toEqual([]);
    // (past his peek: choosing "Wait for nightfall" clicks, like any button)
    play(3); hearHimOut(); answer('Wait for nightfall');
    heard = since(() => { hearHimOut(); play(3); });
    // (the band's last notes play into its fade, which is down to nothing: see the music's bus below)
    expect(heard.filter(p => p.f >= 20 && !['cue', 'scene', 'music'].includes(p.bus)).map(p => [p.kind, p.bus, Math.round(p.f)])).toEqual([]);
    expect(heard.some(p => p.type === 'triangle' && p.f >= 105 && p.f <= 140)).toBe(true);
    expect(audio.buses.cue.gain.value).toBeCloseTo(0.24); // at the effects' volume
    expect(heard.filter(p => p.bus === 'scene').length).toBeGreaterThan(5);
    // at the music's volume, set once: through the music's volume, like the band, and not turned down again on the way
    expect(audio.buses.scene.gain.value).toBe(1);
    expect((audio.buses.scene as unknown as { outs: unknown[] }).outs).toEqual((audio.buses.music as unknown as { outs: unknown[] }).outs);
    expect(audio.buses.music.gain.value).toBe(0);
    expect(heard.filter(p => p.f >= 20 && !(p.from === 0 && (p.kind === 'noise' || p.f < 4000))).map(p => [p.kind, p.bus, p.type, Math.round(p.f), p.from])).toEqual([]);

    // turned down, the band comes back
    answer('Not today');
    for (let t = 0; t < 30 && g.player.held; t += 0.1) { g.press('z'); play(0.1); }
    play(5);
    expect(audio.buses.music.gain.value).toBe(1);
    expect(audio.buses.sfx.gain.value).toBeCloseTo(0.24);
    expect(audio.buses.amb.gain.value).toBeCloseTo(0.063);
    expect(since(sfx.coin).length).toBeGreaterThan(0);
    expect(since(() => play(4)).some(p => p.bus === 'scene')).toBe(false);

    // the settings' mutes reach him: no bass with the music muted, no mumble with the effects muted
    audio.setMute('music', true); audio.setMute('sfx', true);
    g.placePlayer(offer.HATCH.x - 4, offer.HATCH.z + 2); play(0.3);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    heard = since(() => { play(5); hearHimOut(); });
    expect(g.player.held).toBe(true);
    expect(heard.filter(p => p.bus === 'scene' || p.bus === 'cue')).toEqual([]);
  });
  it('types slowly enough to read, holding at each full stop', async () => {
    const { g, $ } = await setup({ money: 1_000_000 });
    const line = () => $('offerLine').textContent!;
    g.runUntil(() => line() === 'Psst.', 10);
    g.run(0.6);
    expect(line()).toBe('Psst.'); // a beat to read it
    g.run(0.3);
    expect(line()).toMatch(/^Psst\. C/);
    g.runUntil(() => line() === 'Psst. Chef.', 10);
    expect(line()).toBe('Psst. Chef.');
  });
});

describe('stage 3 behind its flag (flags.ts)', () => {
  it("is shut in the live game: no hatch, nobody knocks, till a device is switched on or its save has met him", async () => {
    vi.stubEnv('DEV', false);
    try {
      const hatchesIn = async () => {
        const { Hatch } = await import('../src/fugu');
        const { scene } = await import('../src/render');
        let n = 0;
        scene.traverse(o => { if (o instanceof Hatch) n++; });
        return n;
      };
      // the restaurant built and millions in the till: on main's own terms, all quiet
      const g = await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI), money: 5_000_000 });
      const flags = await import('../src/flags');
      expect(flags.stage3On()).toBe(false);
      expect(await hatchesIn()).toBe(0);
      g.run(3);
      expect(document.getElementById('offerAlert')!.classList.contains('on')).toBe(false);
      expect(g.unlocks.visibleTiles().some(t => t.id === 'dohyo')).toBe(false);
      // ?stage3=on switches this device on, for good, and ?stage3=off back off
      history.replaceState(null, '', '/?stage3=on');
      const on = await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI), money: 5_000_000 });
      expect((await import('../src/flags')).stage3On()).toBe(true);
      expect(await hatchesIn()).toBe(1);
      on.run(0.5);
      expect(document.getElementById('offerAlert')!.classList.contains('on')).toBe(true);
      history.replaceState(null, '', '/');
      expect(localStorage.getItem('floe-market-stage3')).toBe('1');
      history.replaceState(null, '', '/?stage3=off');
      await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI) });
      expect((await import('../src/flags')).stage3On()).toBe(false);
      history.replaceState(null, '', '/');
      // a save that's met him (down in the ring, here) opens it wherever it's loaded
      const down = await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI, 'dohyo'), fugu: 2, level: 1 });
      expect((await import('../src/flags')).stage3On()).toBe(true);
      expect(await hatchesIn()).toBe(1);
      expect(down.layout.stage.n).toBe(3);
      expect(localStorage.getItem('floe-market-stage3')).toBe('1');
    } finally {
      vi.unstubAllEnvs();
      history.replaceState(null, '', '/');
    }
  }, 45_000); // loads the game four times: right at the 15s default on CI
});
