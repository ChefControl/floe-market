// DOM overlay and controls.
import { describe, expect, it, vi } from 'vitest';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

describe('HUD', () => {
  it('shows cash with a bump, and flags full arms', async () => {
    const g = await loadGame({ back: 6 });
    g.wallet.money = 1234;
    g.wallet.bumpT = 0.1;
    g.ui.hud(0.016);
    expect($('cashN').textContent).toBe('1,234');
    expect($('cash').classList.contains('bump')).toBe(true);
    expect($('carryN').textContent).toBe('6/6');
    expect($('carry').classList.contains('full')).toBe(true);
    g.ui.hud(0.2);
    g.ui.hud(0.016);
    expect($('cash').classList.contains('bump')).toBe(false);
  });

  it('shows toasts briefly', async () => {
    const g = await loadGame();
    vi.useFakeTimers();
    g.ui.toast('hello');
    expect($('toast').classList.contains('on')).toBe(true);
    vi.advanceTimersByTime(1700);
    expect($('toast').classList.contains('on')).toBe(false);
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

  it('dismisses the intro on first input', async () => {
    await loadGame();
    vi.useFakeTimers();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect($('intro').classList.contains('gone')).toBe(true);
    vi.advanceTimersByTime(400);
    expect(document.getElementById('intro')).toBeNull();
  });
});
