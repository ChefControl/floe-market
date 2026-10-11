// Mr. Fugu's offer: once Floe Sushi is fully built and the cash passes a million, he climbs out of a hatch in the dock
// with a short pitch, and the player answers.
import type { PointLight } from 'three';
import { describe, expect, it } from 'vitest';
import { fake, installFakeAudio, nameBuses } from './fakeAudio';
import { bought, loadGame, MARKET } from './helpers';

const FLOE_SUSHI = ['sushi', 'paddy', 'seats', 'chef', 'farmer', 'porter', 'plot2', 'tables', 'chef3', 'tables2', 'plot3', 'kiosk', 'premium'];

async function setup(save: Parameters<typeof loadGame>[0] = {}) {
  const g = await loadGame({ tiles: bought(...MARKET, ...FLOE_SUSHI), money: 999_950, ...(save as object) });
  const offer = await import('../src/offer');
  // he's waiting under the hatch once there's a million: walk up to it
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
  return { g, offer, $, hearHimOut, answer, answers };
}

describe("Mr. Fugu's offer", () => {
  it('waits for the restaurant to be fully built and the cash to pass a million', async () => {
    const early = await loadGame({ tiles: bought(...MARKET, 'sushi'), money: 5_000_000 });
    early.run(3);
    expect(early.player.frozen).toBe(false);

    const { g, offer, $ } = await setup();
    g.placePlayer(0, -2);
    g.run(3);
    expect($('offerAlert').classList.contains('on')).toBe(false);
    const { scene } = await import('../src/render');
    const lit = () => { let n = 0; scene.traverseVisible(o => { if ((o as PointLight).isPointLight) n++; }); return n; };
    const lights = lit();
    g.wallet.money += 100;
    g.run(0.1);
    // the hatch turns up with a "!" over it, and an arrow points the way; nothing happens until the player gets there
    expect($('offerAlert').classList.contains('on')).toBe(true);
    expect($('pointers').children).toHaveLength(1);
    // its glow stays off while it knocks (a new light would recompile every material: a freeze as the million comes in)
    expect(lit()).toBe(lights);
    g.run(3);
    expect(g.player.frozen).toBe(false);
    g.placePlayer(offer.HATCH.x - 1, offer.HATCH.z + 1);
    g.run(0.1);
    expect(g.player.frozen).toBe(true);
    // the HUD steps aside behind the blinks, and the player ends up in front of the hatch
    g.run(1);
    expect(document.body.classList.contains('offer')).toBe(true);
    expect(g.player.g.position.z).toBeLessThan(-5);
    // ...and comes on behind the blinks, for the lid opening
    expect(lit()).toBe(lights + 1);
  });

  it('a pitch, the answers, and "Not today" leaves his hatch on the dock', async () => {
    const { g, offer, $, hearHimOut, answer, answers } = await setup({ money: 1_000_000 });
    hearHimOut();
    expect(answers()).toEqual(['Deal me in', 'Is this legal?', 'Not today']);
    // keys run through the answers
    g.press('ArrowRight'); g.press('ArrowRight', 'keyup');
    expect(document.activeElement).toBe($('offerPick').children[1]);
    answer('Is this legal?');
    expect($('offerLine').textContent).toBe('');
    hearHimOut();
    expect(answers()).toEqual(['Deal me in', 'Not today']); // he's answered that one
    answer('Not today');
    g.runUntil(() => { g.press('z'); return !g.player.frozen; }, 15, 0.1);
    expect(offer.offer.answer).toBe(1);
    expect($('offer').hidden).toBe(true);
    expect(document.body.classList.contains('offer')).toBe(false);
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).fugu).toBe(1);
    // standing on the hatch brings him back up
    g.run(2);
    expect(g.player.frozen).toBe(false);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(1);
    expect(g.player.frozen).toBe(true);
  });

  it('"Deal me in" puts his price on a gold tile by the hatch, and the hatch stays open', async () => {
    const { g, offer, $, hearHimOut, answer } = await setup({ money: 1_000_000 });
    hearHimOut();
    // a tap shows the rest of a line at once
    g.press('z');
    answer('Deal me in');
    g.run(0.05); g.press('z');
    expect($('offerLine').textContent).toBe('Smart chef. Bring cash. Tell nobody.');
    g.runUntil(() => { g.press('z'); return !g.player.frozen; }, 10, 0.1);
    expect(offer.offer.answer).toBe(2);
    // the buy-in is on offer, gold, beside the hatch
    const buyIn = g.unlocks.tiles.find(t => t.id === 'dohyo')!;
    expect(g.unlocks.visibleTiles()).toContain(buyIn);
    expect(buyIn).toMatchObject({ gold: true, cost: 1_000_000 });
    expect(Math.hypot(buyIn.x - offer.HATCH.x, buyIn.z - offer.HATCH.z)).toBeLessThan(3.5);
    // standing on the open hatch no longer brings him back up
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    g.run(2);
    expect(g.player.frozen).toBe(false);

    // a reload keeps his hatch, open, and the buy-in
    g.saveMod.save();
    const again = await loadGame(localStorage.getItem('floe-market-v1')!);
    const o2 = await import('../src/offer');
    expect(o2.offer.answer).toBe(2);
    again.run(3);
    expect(again.player.frozen).toBe(false);
    expect(again.unlocks.visibleTiles().some(t => t.id === 'dohyo')).toBe(true);
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
    heard = since(() => { play(3); hearHimOut(); play(3); });
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
    for (let t = 0; t < 30 && g.player.frozen; t += 0.1) { g.press('z'); play(0.1); }
    play(5);
    expect(audio.buses.music.gain.value).toBe(1);
    expect(audio.buses.sfx.gain.value).toBeCloseTo(0.24);
    expect(audio.buses.amb.gain.value).toBeCloseTo(0.063);
    expect(since(sfx.coin).length).toBeGreaterThan(0);
    expect(since(() => play(4)).some(p => p.bus === 'scene')).toBe(false);

    // the settings' mutes reach him: no bass with the music muted, no mumble with the effects muted
    audio.setMute('music', true); audio.setMute('sfx', true);
    g.placePlayer(offer.HATCH.x, offer.HATCH.z);
    heard = since(() => { play(5); hearHimOut(); });
    expect(g.player.frozen).toBe(true);
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
    // the rest of it, "hef. Over here.", holds at "Chef." too
    expect(g.runUntil(() => line() === 'Psst. Chef. Over here.', 10)).toBeGreaterThan(1.2);
  });
});
