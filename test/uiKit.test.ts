// The UI kit (src/uiKit.ts), as the player meets it at the casino's tables: Esc shuts a table's panel as stepping off
// does, E presses its main button, 1–9 the buttons along its rows, and a tap on what they can't afford only shakes the
// cash. A dialog of the kit holds the game still.
import { describe, expect, it, vi } from 'vitest';
import { GRACE } from '../src/casinoKit';
import { WHEEL } from '../src/roulette';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const button = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!;
const key = (code: string, k = code, repeat = false) => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: k, repeat, cancelable: true }));
const esc = () => key('Escape');
/** Makes the next spin land on pocket `n`. */
const rig = (n: number) => vi.spyOn(Math, 'random').mockReturnValue((WHEEL.indexOf(n as typeof WHEEL[number]) + 0.5) / 37);

/** Stands the player at the roulette table with `money`. */
async function atRoulette(money: number) {
  const g = await loadGame({ money, tiles: bought('roulette') });
  const p = g.layout.GAMES.roulette;
  g.placePlayer(p.x, p.z);
  g.run(0.05);
  g.play();
  return { g, p };
}

describe('the UI kit at a casino table', () => {
  it('shuts the panel on Esc till the player steps off and back on, or presses E', async () => {
    const { g, p } = await atRoulette(100);
    const kit = await import('../src/casinoKit');
    expect($('roulette').hidden).toBe(false);
    esc(); g.run(0.05);
    expect($('roulette').hidden).toBe(true);
    expect(kit.atTable()).toBe(false);
    g.run(1);
    expect($('roulette').hidden).toBe(true); // still on the pad, but it stays shut
    key('KeyE', 'e'); g.run(0.05);
    expect($('roulette').hidden).toBe(false);
    esc(); g.run(0.05);
    g.placePlayer(-15.7, -4.4); g.run(0.05);
    // back on the pad, it asks again before the player's sat down
    g.placePlayer(p.x, p.z); g.run(0.05);
    expect($('roulette').hidden).toBe(true);
    expect($('rouletteAsk').hidden).toBe(false);
    g.play();
    expect($('roulette').hidden).toBe(false);
  });

  it("asks on the pad before sitting the player down: Play or E sits them, Esc leaves them be till they step off", async () => {
    const g = await loadGame({ money: 100, tiles: bought('roulette') });
    const kit = await import('../src/casinoKit');
    const p = g.layout.GAMES.roulette;
    g.placePlayer(p.x, p.z); g.run(0.05);
    expect($('rouletteAsk').hidden).toBe(false);
    expect($('rouletteAsk').textContent).toContain('Roulette');
    expect($('roulette').hidden).toBe(true);
    expect(kit.atTable()).toBe(false);
    g.run(2);
    expect(kit.atTable()).toBe(false); // standing there doesn't sit them down
    esc(); g.run(0.05);
    expect($('rouletteAsk').hidden).toBe(true);
    g.run(1);
    expect($('rouletteAsk').hidden).toBe(true);
    key('KeyE', 'e'); g.run(0.05);
    expect($('rouletteAsk').hidden).toBe(false);
    key('KeyE', 'e'); g.run(0.05);
    expect($('rouletteAsk').hidden).toBe(true);
    expect($('roulette').hidden).toBe(false);
    expect(kit.atTable()).toBe(true);
  });

  it('plays a spin out after Esc, as after walking off, and pays', async () => {
    const { g } = await atRoulette(100);
    rig(32); // red
    button('#spin').click();
    g.run(0.5);
    esc(); g.run(0.05);
    expect($('roulette').hidden).toBe(true);
    expect((await import('../src/rouletteTable')).croupierSays()).toBe('Still rolling!');
    g.run(GRACE);
    expect(g.wallet.money).toBe(125);
  });

  it('numbers the buttons along the rows, 1 to 9, and E presses the main one', async () => {
    const { g } = await atRoulette(1000);
    const ui = await import('../src/uiKit');
    // red, black, green; the four chips, All in and Undo
    expect(ui.numbered($('roulette')).map(b => b.dataset.bet ?? b.dataset.stake)).toEqual(['red', 'black', 'green', '0', '1', '2', '3', 'all', 'undo']);
    expect(ui.mainOf($('roulette'))).toBe($('spin'));
    key('Digit2', '2'); // black
    key('Digit6', '6'); key('Digit6', '6', true); // a $100 chip, held: another
    expect($('spin').textContent).toBe('Spin · $225 on Black');
    key('Digit9', '9'); // Undo
    expect($('spin').textContent).toBe('Spin · $125 on Black');
    key('Digit9', '9', true); // (Undo held goes again, as a chip does)
    expect($('spin').textContent).toBe('Spin · $25 on Black');
    rig(15); // black
    key('KeyE', 'e');
    expect($('spin').textContent).toBe('Spinning…');
    key('Digit1', '1'); // no changing the bet mid-spin
    expect(button('[data-bet="black"]').getAttribute('aria-pressed')).toBe('true');
    g.run(6);
    expect(g.wallet.money).toBe(1025);
  });

  it('shows the keys on the buttons only while Shift is held', async () => {
    await atRoulette(100);
    const on = () => document.documentElement.classList.contains('k-keys-on');
    expect(on()).toBe(false);
    key('ShiftLeft', 'Shift');
    expect(on()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift' }));
    expect(on()).toBe(false);
    key('ShiftLeft', 'Shift');
    window.dispatchEvent(new Event('blur')); // let go in another window
    expect(on()).toBe(false);
  });

  it("greys out what the player can't afford: a tap on it only shakes the cash", async () => {
    const { g } = await atRoulette(60);
    const chip = button('#roulette [data-stake="2"]');
    expect([chip.dataset.state, chip.disabled, chip.getAttribute('aria-disabled')]).toEqual(['broke', false, 'true']);
    chip.click();
    expect($('spin').textContent).toBe('Spin · $25 on Red');
    expect($('cash').classList.contains('nope')).toBe(true);
    chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    expect($('spin').textContent).toBe('Spin · $25 on Red');
    // and mid-spin, everything's faded (busy), not greyed
    button('#spin').click();
    expect([chip.disabled, chip.dataset.state]).toEqual([true, undefined]);
    g.run(6);
  });

  it('lets E and Esc alone while the player types', async () => {
    await atRoulette(100);
    const box = document.createElement('textarea');
    document.body.append(box);
    box.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    expect($('roulette').hidden).toBe(false);
    box.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
    expect($('spin').textContent).toBe('Spin · $25 on Red');
  });

  it('holds the game still while one of its dialogs is open, and says so', async () => {
    const { g } = await atRoulette(100);
    const ui = await import('../src/uiKit');
    const el = document.createElement('div');
    el.innerHTML = '<div class="k-sheet"><button class="k-btn k-main" type="button">OK</button></div>';
    document.body.append(el);
    ui.panel(el, { place: 'dialog' });
    expect(el.querySelector('.k-paused')!.textContent).toBe('Game paused');
    expect(ui.paused()).toBe(true);
    rig(32);
    button('#spin').click();
    g.run(6);
    expect(g.wallet.money).toBe(75); // the wheel's waiting too
    esc();
    expect(el.hidden).toBe(true);
    expect(ui.paused()).toBe(false);
    g.run(6);
    expect(g.wallet.money).toBe(125);
  });
});
