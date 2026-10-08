// Mr. Fugu's offer: once Floe Sushi is fully built and the cash passes a million, he climbs out of a hatch in the dock
// with a short pitch, and the player answers.
import { describe, expect, it } from 'vitest';
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
    g.wallet.money += 100;
    g.run(0.1);
    // the hatch turns up with a "!" over it, and an arrow points the way; nothing happens until the player gets there
    expect($('offerAlert').classList.contains('on')).toBe(true);
    expect($('pointers').children).toHaveLength(1);
    g.run(3);
    expect(g.player.frozen).toBe(false);
    g.placePlayer(offer.HATCH.x - 1, offer.HATCH.z + 1);
    g.run(0.1);
    expect(g.player.frozen).toBe(true);
    // the HUD steps aside behind the blinks, and the player ends up in front of the hatch
    g.run(1);
    expect(document.body.classList.contains('offer')).toBe(true);
    expect(g.player.g.position.z).toBeLessThan(-5);
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

  it('"Deal me in" opens the ring: the stage 3 banner, and the hatch stays open', async () => {
    const { g, offer, $, hearHimOut, answer } = await setup({ money: 1_000_000 });
    hearHimOut();
    // a tap shows the rest of a line at once
    g.press('z');
    answer('Deal me in');
    g.run(0.05); g.press('z');
    expect($('offerLine').textContent).toBe('Smart chef. Bring cash. Tell nobody.');
    g.runUntil(() => { g.press('z'); return $('banner').querySelector('.t')!.textContent === 'The Dohyo Below'; }, 10, 0.1);
    g.runUntil(() => !g.player.frozen, 10, 0.1);
    expect(offer.offer.answer).toBe(2);

    // a reload keeps his hatch, open
    g.saveMod.save();
    const again = await loadGame(localStorage.getItem('floe-market-v1')!);
    const o2 = await import('../src/offer');
    expect(o2.offer.answer).toBe(2);
    again.run(3);
    expect(again.player.frozen).toBe(false);
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
});
