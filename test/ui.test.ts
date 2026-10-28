// DOM overlay and controls.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { withoutKofi } from '../vite.config';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('HUD', () => {
  it('shows cash with a bump', async () => {
    const g = await loadGame();
    g.wallet.money = 1234;
    g.wallet.bumpT = 0.1;
    g.ui.hud(0.016);
    expect($('cashN').textContent).toBe('1,234');
    g.wallet.money = 1_550_000;
    g.ui.hud(0.016);
    expect($('cashN').textContent).toBe('1.5M'); // short once it's big
    expect($('cash').classList.contains('bump')).toBe(true);
    g.ui.hud(0.2);
    g.ui.hud(0.016);
    expect($('cash').classList.contains('bump')).toBe(false);
  });

  it('folds the modifiers away under the stage chip, and starts them folded on phones', async () => {
    await loadGame(); // jsdom has no matchMedia: a big screen
    const open = () => [$('mods').hidden, $('stage').getAttribute('aria-expanded')];
    expect(open()).toEqual([false, 'true']);
    $('stage').click();
    expect(open()).toEqual([true, 'false']);
    $('stage').click();
    expect(open()).toEqual([false, 'true']);

    const phone = Object.assign(new EventTarget(), { matches: true });
    vi.stubGlobal('matchMedia', () => phone);
    await loadGame();
    expect(open()).toEqual([true, 'false']);
    phone.matches = false; // turned into a bigger screen: the modifiers follow it
    phone.dispatchEvent(new Event('change'));
    expect(open()).toEqual([false, 'true']);
    $('stage').click(); // once the player has picked, they stay as picked
    phone.matches = true;
    phone.dispatchEvent(new Event('change'));
    phone.matches = false;
    phone.dispatchEvent(new Event('change'));
    expect(open()).toEqual([true, 'false']);
  });

  it('slides the view so an open panel never covers the player', async () => {
    const g = await loadGame(); // a 1024x768 window
    const cam = g.render.camera, shop = $('shop');
    const settle = () => { for (let i = 0; i < 60; i++) g.ui.keepInSight(0.05); };
    settle();
    expect(cam.view?.enabled ?? false).toBe(false); // nothing open: the view stays put
    shop.hidden = false;
    const at = vi.spyOn(shop, 'getBoundingClientRect').mockReturnValue({ left: 480, right: 1014, top: 300 } as DOMRect);
    settle(); // down the right-hand side: slides left until the player's clear of it
    expect([cam.view!.offsetX, cam.view!.offsetY]).toEqual([expect.closeTo(1024 / 2 + 50 - 480), 0]);
    at.mockReturnValue({ left: 200, right: 824, top: 400 } as DOMRect);
    settle(); // along the bottom: slides up
    expect([cam.view!.offsetX, cam.view!.offsetY]).toEqual([expect.closeTo(0), expect.closeTo(768 / 2 + 70 - 400)]);
    at.mockReturnValue({ left: 302, right: 722, top: 600 } as DOMRect);
    settle(); // low enough already, and centred along the bottom of a wide screen rather than down the side
    expect(cam.view?.enabled).toBe(false);
    for (let i = 0; i < 60; i++) g.ui.keepInSight(0.05, 1);
    // a new upgrade in the spotlight goes in the middle of what the panel leaves, under the HUD
    const hud = g.ui.topOfView(768);
    expect([cam.view!.offsetX, cam.view!.offsetY]).toEqual([expect.closeTo(0), expect.closeTo(768 / 2 - (hud + 600) / 2)]);
    at.mockReturnValue({ left: 480, right: 1014, top: 300 } as DOMRect);
    settle();
    shop.hidden = true;
    settle(); // closed: back to the middle
    expect(cam.view?.enabled).toBe(false);
  });

  it("leaves the player be beside a still panel (the crafting bench's menu), but puts a spotlight in the middle of what it leaves", async () => {
    const g = await loadGame(); // a 1024x768 window
    const cam = g.render.camera, shop = $('shop');
    const settle = (away = 0) => { for (let i = 0; i < 60; i++) g.ui.keepInSight(0.05, away); };
    shop.hidden = false;
    shop.dataset.still = '1';
    // docked down the right-hand side on a computer: the view stays put for the player
    const at = vi.spyOn(shop, 'getBoundingClientRect').mockReturnValue({ left: 600, right: 1008, top: 76 } as DOMRect);
    settle();
    expect(cam.view?.enabled ?? false).toBe(false);
    // something new in the spotlight: in the middle of the space to the panel's left
    settle(1);
    expect([cam.view!.offsetX, cam.view!.offsetY]).toEqual([expect.closeTo(1024 / 2 - 600 / 2), 0]);
    // along the bottom, on a phone: in the middle of the space over it, under the HUD
    at.mockReturnValue({ left: 0, right: 1024, top: 500 } as DOMRect);
    settle(1);
    const hud = g.ui.topOfView(768);
    expect([cam.view!.offsetX, cam.view!.offsetY]).toEqual([expect.closeTo(0), expect.closeTo(768 / 2 - (hud + 500) / 2)]);
    settle(); // back on the player: put again
    expect(cam.view?.enabled).toBe(false);
    shop.hidden = true;
    delete shop.dataset.still;
  });

  it('shows toasts briefly', async () => {
    const g = await loadGame();
    vi.useFakeTimers();
    g.ui.toast('hello');
    expect($('toast').classList.contains('on')).toBe(true);
    vi.advanceTimersByTime(1700);
    expect($('toast').classList.contains('on')).toBe(false);
  });

  it('takes turns showing messages, and lets one replace the last of its kind', async () => {
    const g = await loadGame();
    vi.useFakeTimers();
    const el = $('toast');
    g.ui.toast('one');
    g.ui.toast('two');
    g.ui.toast('two'); // already waiting
    expect(el.textContent).toBe('one');
    vi.advanceTimersByTime(1950);
    expect(el.textContent).toBe('two');
    g.ui.toast('Fine fillets: level 1', 'shop');
    g.ui.toast('Fine fillets: level 2', 'shop'); // waiting: replaced
    vi.advanceTimersByTime(1950);
    expect(el.textContent).toBe('Fine fillets: level 2');
    g.ui.toast('Fine fillets: level 3', 'shop'); // showing: replaced at once
    expect(el.textContent).toBe('Fine fillets: level 3');
    vi.advanceTimersByTime(1950);
    expect(el.classList.contains('on')).toBe(false);
  });

  it('floats text over points in front of the camera only', async () => {
    const g = await loadGame();
    vi.useFakeTimers();
    g.ui.popText('+$4', { x: 0, z: -5 });
    g.ui.popText('+$9', { x: 0, z: 5 });
    const pops = document.querySelectorAll('.pop');
    expect([...pops].map(p => p.textContent)).toEqual(['+$4']);
    vi.advanceTimersByTime(950);
    expect(document.querySelectorAll('.pop')).toHaveLength(0);
  });
});

describe('controls', () => {
  it('turns a drag into a capped joystick direction', async () => {
    const g = await loadGame();
    const canvas = $('game');
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
    expect($('stick').style.display).toBe('block');
    canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 0, clientY: 0 })); // other finger: ignored
    expect(g.input.inputVec()).toBeNull();
    canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 0 }));
    expect($('knob').style.transform).toBe('translate(0px,-48px)');
    const v = g.input.inputVec()!;
    expect(v.length()).toBeCloseTo(1);
    expect(v.x).toBeLessThan(0);
    expect(v.z).toBeLessThan(0);
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(g.input.inputVec()).toBeNull();
    expect($('stick').style.display).toBe('none');
  });

  it('maps keys to directions and keeps arrows from scrolling', async () => {
    const g = await loadGame();
    expect(g.press('ArrowRight').defaultPrevented).toBe(true);
    g.press('s');
    const v = g.input.inputVec()!;
    expect(v.length()).toBeCloseTo(1); // diagonal is normalised
    g.press('ArrowRight', 'keyup');
    g.press('s', 'keyup');
    g.press('a'); g.press('d');
    expect(g.input.inputVec()).toBeNull(); // opposite keys cancel
  });

});

describe('how to walk', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';

  it('tells touch screens from computers by the user agent', async () => {
    await loadGame();
    const { isTouch } = await import('../src/hint');
    expect(isTouch(IPHONE, 5)).toBe(true);
    expect(isTouch('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari', 5)).toBe(true);
    expect(isTouch(MAC, 5)).toBe(true); // an iPad, which says it's a Mac
    expect(isTouch(MAC, 0)).toBe(false);
    expect(isTouch('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false);
    expect(isTouch()).toBe(false); // jsdom
    expect(isTouch('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 10, true)).toBe(true); // a Windows tablet, finger first
  });

  it('shows once on a first game, then shrinks away into the settings gear once the player has walked a little', async () => {
    await loadGame();
    const hint = await import('../src/hint');
    vi.useFakeTimers();
    hint.initHint();
    expect($('hint').hidden).toBe(false);
    expect($('hint').textContent).toContain('WASD');
    expect($('hint').textContent).toContain('To throw away what you carry, stand at a bin and press E');
    hint.updHint(5, false);
    expect($('hint').hidden).toBe(false); // waits for the player to walk
    hint.updHint(0.7, true); hint.updHint(0.7, true);
    expect($('hint').style.opacity).toBe('0');
    expect($('hint').style.transform).toContain('scale(0.1)');
    hint.updHint(1, true); // already going
    vi.advanceTimersByTime(650);
    expect($('hint').hidden).toBe(true);
    expect($('gear').classList.contains('ping')).toBe(true);
    vi.advanceTimersByTime(1300);
    expect($('gear').classList.contains('ping')).toBe(false);
    expect(localStorage.getItem('floe-market-hint')).toBe('1');
    // not again on this device
    $('hint').hidden = true;
    hint.initHint();
    expect($('hint').hidden).toBe(true);
  });

  it('shows the joystick on a phone', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    await loadGame();
    (await import('../src/hint')).initHint();
    expect($('hint').textContent).toBe('Drag anywhere to walkTo buy, stand on a tile and hold BuyTo throw away what you carry, stand at a bin and tap Toss');
    expect($('hint').querySelector('.stick')).not.toBeNull();
  });

  it('comes back from the settings, out of the gear, and goes again after a while', async () => {
    await loadGame();
    await import('../src/settings');
    const hint = await import('../src/hint');
    localStorage.setItem('floe-market-hint', '1');
    vi.useFakeTimers();
    $('gear').click();
    $('controls').click();
    expect($('settings').hidden).toBe(true);
    expect($('hint').hidden).toBe(false);
    hint.updHint(8.5, false);
    vi.advanceTimersByTime(650);
    expect($('hint').hidden).toBe(true);
  });

  it('just fades, without flying about, for players who prefer less motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {} }));
    await loadGame();
    const hint = await import('../src/hint');
    vi.useFakeTimers();
    hint.showHint(true);
    expect($('hint').style.transform).toBe('');
    hint.updHint(6, true);
    expect($('hint').style.transform).toBe('');
    expect($('hint').style.opacity).toBe('0');
  });

  it('copes with storage being unavailable', async () => {
    await loadGame();
    const hint = await import('../src/hint');
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    hint.initHint();
    expect($('hint').hidden).toBe(false);
    hint.updHint(6, true);
    vi.advanceTimersByTime(650);
    expect($('hint').hidden).toBe(true);
  });
});

describe('settings', () => {
  it("leaves the arrow keys to a slider that has the focus, instead of walking", async () => {
    const g = await loadGame();
    await import('../src/settings');
    const slider = $('volMusic');
    const e = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    slider.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(g.input.inputVec()).toBeNull();
  });

  it('opens behind the gear, and closes again with the gear, a tap elsewhere or Escape', async () => {
    await loadGame();
    await import('../src/settings');
    const open = () => [$('settings').hidden, $('gear').getAttribute('aria-expanded')];
    expect(open()).toEqual([true, 'false']);
    $('gear').click();
    expect(open()).toEqual([false, 'true']);
    $('gear').click();
    expect(open()).toEqual([true, 'false']);
    $('gear').click();
    $('soundCat').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(open()).toEqual([false, 'true']); // a tap inside leaves it open
    $('game').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(open()).toEqual([true, 'false']);
    $('gear').click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(open()).toEqual([true, 'false']);
    expect(document.activeElement).toBe($('gear'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // closed already: nothing
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(open()).toEqual([true, 'false']);
  });

  it('opens the Sound row into the effects, the ambience and the music', async () => {
    await loadGame();
    await import('../src/settings');
    expect($('soundPanel').hidden).toBe(true);
    $('soundCat').click();
    expect($('soundPanel').hidden).toBe(false);
    expect($('soundCat').getAttribute('aria-expanded')).toBe('true');
    expect([...$('soundPanel').querySelectorAll('label')].map(l => l.textContent)).toEqual(['Effects', 'Ambience', 'Music']);
    expect([...$('soundPanel').querySelectorAll('input')].map(i => [(i as HTMLInputElement).min, (i as HTMLInputElement).max])).toEqual([['0', '10'], ['0', '10'], ['0', '10']]);
    $('soundCat').click();
    expect($('soundPanel').hidden).toBe(true);
  });
  it('opens Controls into How to play and the Buy button switch, which a touch screen keeps on', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148');
    await loadGame();
    await import('../src/settings');
    $('gear').click();
    expect($('controlsPanel').hidden).toBe(true);
    $('controlsCat').click();
    expect($('controlsPanel').hidden).toBe(false);
    expect($('controls').textContent).toContain('How to play');
    const sw = $('buyBtnToggle') as HTMLButtonElement;
    expect([sw.disabled, sw.getAttribute('aria-checked'), $('buyBtnNote').textContent]).toEqual([true, 'true', 'Always on with a touch screen']);
  });

  it("ends with Credits & Copyrights, which opens with a click like Sound into the music's and the sounds' notices", async () => {
    await loadGame();
    await import('../src/settings');
    const card = $('creditsCard'), row = $('creditsBtn');
    $('gear').click();
    expect($('settings').lastElementChild).toBe(card);
    expect([card.hidden, row.getAttribute('aria-expanded')]).toEqual([true, 'false']);
    row.click();
    expect([card.hidden, row.getAttribute('aria-expanded')]).toEqual([false, 'true']);
    // the slot machines' recording, which asks for a credit
    expect(card.textContent).toContain('“WOF_slots6” by fugacious');
    expect(card.querySelector('a[href="https://freesound.org/s/145539/"]')).not.toBeNull();
    // the songs at her house and Korki's statue are the game's own now: nothing from YouTube
    expect(card.textContent).toContain("the songs at her house and at Korki's statue too");
    expect(card.querySelector('a[href*="youtube"]')).toBeNull();
    // and the game's own copyright, last
    expect(card.lastElementChild!.textContent).toBe('Floe Market © 2026 ChefControl. All rights reserved.');
    row.click();
    expect([card.hidden, row.getAttribute('aria-expanded')]).toEqual([true, 'false']);
    expect($('soundPanel').textContent).not.toContain('fugacious');
  });

  it("opens Privacy into the notice's short version, and the whole notice over the game: in every build", async () => {
    await loadGame();
    await import('../src/settings');
    const { paused } = await import('../src/uiKit');
    const row = $('privacyBtn'), card = $('privacyCard'), dialog = $('privacyDialog'), frame = $('privacyFrame') as HTMLIFrameElement;
    // in About, before Credits & Copyrights, which opens at the menu's foot; nothing in the menu leaves the game
    expect(row.compareDocumentPosition($('reportCat')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(row.compareDocumentPosition($('creditsBtn')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect($('settings').querySelector('a[href="privacy.html"]')).toBeNull();
    expect(withoutKofi(indexHtml)).toContain('id="privacyBtn"');
    // the short version, word for word as the notice has it
    const page = readFileSync('public/privacy.html', 'utf8');
    const notice = new DOMParser().parseFromString(page, 'text/html');
    const short = (root: ParentNode) => [...root.querySelectorAll('li')].map(li => li.innerHTML.trim());
    expect(short(card)).toEqual(short(notice.querySelector('.short')!));
    expect(card.hidden).toBe(true);
    $('gear').click();
    row.click();
    expect([card.hidden, row.getAttribute('aria-expanded')]).toEqual([false, 'true']);
    // the whole notice, fetched only once it's asked for; the game waits behind it
    expect(frame.getAttribute('src')).toBeNull();
    $('privacyFull').click();
    expect([dialog.hidden, frame.getAttribute('src'), paused()]).toEqual([false, 'privacy.html', true]);
    expect(document.activeElement).toBe($('privacyClose'));
    // a tap on it leaves the menu open behind; Escape closes just the notice, and the ✕ too
    dialog.querySelector('.k-sheet')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect([dialog.hidden, $('settings').hidden, paused()]).toEqual([true, false, false]);
    expect(document.activeElement).toBe($('privacyFull'));
    $('privacyFull').click();
    $('privacyClose').click();
    expect(dialog.hidden).toBe(true);
    // the page itself, published with the site from public/: who to ask, and both versions
    expect(page).toContain('oran.dan@outlook.com');
    expect(page).toContain('<h2>The web game</h2>');
    expect(page).toContain('<h2>The Steam version</h2>');
  });
});

describe('Ko-fi', () => {
  // on only where the game's built with it on, as the live web game is (flags.ts)
  beforeEach(() => { vi.stubEnv('VITE_KOFI', 'on'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is off unless the build says on (the Steam build): no row or link in the page, and no nudge', async () => {
    const page = withoutKofi(indexHtml);
    expect(page).not.toMatch(/ko-?fi|coffee/i);
    expect(indexHtml.length - page.length).toBeLessThan(600); // only the row and its CSS
    expect(page).toContain('<button id="creditsBtn"');
    expect(() => withoutKofi(page)).toThrow(/no Ko-fi row/); // the markup moved: the build stops, not ships the link
    for (const env of [undefined, 'off']) {
      vi.unstubAllEnvs();
      if (env) vi.stubEnv('VITE_KOFI', env);
      await loadGame();
      $('kofi').remove(); // as the page is built
      const kofi = await import('../src/kofi');
      expect((await import('../src/flags')).kofiOn()).toBe(false);
      vi.useFakeTimers();
      kofi.updKofi(kofi.NUDGE_AFTER + 1);
      expect($('toast').classList.contains('on')).toBe(false);
      expect($('gear').classList.contains('ping')).toBe(false);
      expect(localStorage.getItem('floe-market-kofi')).toBeNull();
      vi.useRealTimers();
    }
  });

  it('opens Ko-fi from the settings in a pop-up window of its own, leaving the game where it is', async () => {
    await loadGame();
    await import('../src/kofi');
    expect((await import('../src/flags')).kofiOn()).toBe(true);
    const win = { opener: {} as unknown };
    const open = vi.spyOn(window, 'open').mockReturnValue(win as Window);
    $('gear').click();
    const e = new MouseEvent('click', { bubbles: true, cancelable: true });
    $('kofi').dispatchEvent(e);
    expect(open).toHaveBeenCalledWith('https://ko-fi.com/chefcontrol', 'kofi', expect.stringContaining('popup=yes,width=520,height=760'));
    expect(e.defaultPrevented).toBe(true); // the game's page stays put
    expect(win.opener).toBeNull();
    expect($('settings').hidden).toBe(true);
  });

  it('falls back to a new tab where pop-ups are blocked', async () => {
    await loadGame();
    await import('../src/kofi');
    vi.spyOn(window, 'open').mockReturnValue(null);
    const a = $('kofi') as HTMLAnchorElement;
    expect([a.target, a.rel]).toEqual(['_blank', 'noopener']);
    a.addEventListener('click', ev => { expect(ev.defaultPrevented).toBe(false); ev.preventDefault(); }); // jsdom can't open tabs
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  it('nudges once after 10 minutes of play, kept across visits, and not over a banner or the open menu', async () => {
    await loadGame();
    localStorage.setItem('floe-market-kofi', String(9 * 60)); // played 9 minutes on an earlier visit
    const kofi = await import('../src/kofi');
    vi.useFakeTimers();
    for (let i = 0; i < 59 * 20; i++) kofi.updKofi(0.05);
    expect($('toast').classList.contains('on')).toBe(false);
    expect(Number(localStorage.getItem('floe-market-kofi'))).toBeGreaterThan(9 * 60 + 45); // saved as it goes
    $('settings').hidden = false; // waits while the menu is open
    kofi.updKofi(2);
    expect($('toast').classList.contains('on')).toBe(false);
    $('settings').hidden = true;
    $('banner').classList.add('on'); // and over a stage-up
    kofi.updKofi(0.05);
    expect($('toast').classList.contains('on')).toBe(false);
    $('banner').classList.remove('on');
    kofi.updKofi(0.05);
    expect($('toast').textContent).toContain('Buy me a coffee');
    expect($('gear').classList.contains('ping')).toBe(true);
    vi.advanceTimersByTime(4900);
    expect($('toast').classList.contains('on')).toBe(true); // up long enough to read
    vi.advanceTimersByTime(200);
    expect($('toast').classList.contains('on')).toBe(false);
    expect(localStorage.getItem('floe-market-kofi')).toBe('-1');
    kofi.updKofi(kofi.NUDGE_AFTER);
    vi.advanceTimersByTime(300);
    expect($('toast').classList.contains('on')).toBe(false); // only once
  });

  it("doesn't nudge players who found the link themselves, and copes with storage being unavailable", async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    await loadGame();
    const kofi = await import('../src/kofi');
    vi.spyOn(window, 'open').mockReturnValue({} as Window);
    $('kofi').click();
    kofi.updKofi(kofi.NUDGE_AFTER + 1);
    expect($('toast').classList.contains('on')).toBe(false);
  });
});
