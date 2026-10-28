// The 3D view gone (errors.ts, render.ts): the browser wouldn't make one, or took it back mid-game (a phone short of
// graphics memory, its graphics chip restarting). A dialog says so with a way to reload, not a blank world or the error
// box; one taken while playing puts Auto on Low for good.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDom } from './dom';

const dialog = () => document.getElementById('glLost')!;
const says = () => document.getElementById('glLostWhy')!.textContent;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

beforeEach(() => { vi.resetModules(); resetDom(); localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the dialog', () => {
  it("says the 3D view couldn't start, in place of the error box, and Reload reloads", async () => {
    const errors = await import('../src/errors');
    const reload = vi.spyOn(errors.page, 'reload').mockImplementation(() => {});
    errors.glGone('start', 'THREE.WebGLRenderer: Error creating WebGL context.');
    errors.showErr('Something broke: THREE.WebGLRenderer: Error creating WebGL context.'); // boot.ts's catch
    expect(dialog().hidden).toBe(false);
    expect(says()).toBe(errors.GL_SAYS.start);
    expect(document.getElementById('err')!.style.display).not.toBe('block');
    expect(document.activeElement).toBe(dialog().querySelector('button'));
    expect(errors.recentErrors[errors.recentErrors.length - 1]).toContain('Error creating WebGL context');
    dialog().querySelector('button')!.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('goes again when the 3D view comes back', async () => {
    const errors = await import('../src/errors');
    errors.glGone('lost');
    expect(says()).toBe(errors.GL_SAYS.lost);
    errors.glBack();
    expect(dialog().hidden).toBe(true);
    errors.showErr('Something broke: x');
    expect(document.getElementById('err')!.style.display).toBe('block');
  });

  it('keeps to one caption of 8 words or fewer', async () => {
    const { GL_SAYS } = await import('../src/errors');
    for (const s of Object.values(GL_SAYS)) expect(words(s)).toBeLessThanOrEqual(8);
  });
});

describe('the renderer', () => {
  it("shows the dialog when the browser won't make a 3D view", async () => {
    const three = await import('three');
    vi.spyOn(three, 'WebGLRenderer').mockImplementation(() => { throw new Error('Error creating WebGL context.'); });
    await expect(import('../src/render')).rejects.toThrow('Error creating WebGL context');
    expect(dialog().hidden).toBe(false);
    expect(says()).toBe((await import('../src/errors')).GL_SAYS.start);
  });

  it('waits a moment for a lost view to come back before the dialog, and Auto goes to Low', async () => {
    vi.useFakeTimers();
    const { canvas } = await import('../src/render');
    const { gfx } = await import('../src/graphics');
    expect(gfx.quality).toBe('high');
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(gfx.quality).toBe('low');
    expect(localStorage.getItem('floe-market-graphics-auto')).toBe('low');
    vi.advanceTimersByTime(2000);
    expect(dialog().hidden).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(dialog().hidden).toBe(false);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(dialog().hidden).toBe(true);
  });

  it('says nothing when the view comes straight back, and keeps a High the player picked', async () => {
    vi.useFakeTimers();
    localStorage.setItem('floe-market-graphics', 'high');
    const { canvas } = await import('../src/render');
    const { gfx } = await import('../src/graphics');
    canvas.dispatchEvent(new Event('webglcontextlost'));
    vi.advanceTimersByTime(1000);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    vi.advanceTimersByTime(5000);
    expect(dialog().hidden).toBe(true);
    expect(gfx.quality).toBe('high');
  });

  it("doesn't count a view taken while the game's put away", async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const { canvas } = await import('../src/render');
    const { gfx } = await import('../src/graphics');
    canvas.dispatchEvent(new Event('webglcontextlost'));
    vi.advanceTimersByTime(10_000);
    expect(gfx.quality).toBe('high');
    expect(dialog().hidden).toBe(true);
    hidden.mockReturnValue(false); // back on screen, and still no 3D view
    vi.advanceTimersByTime(3500);
    expect(dialog().hidden).toBe(false);
  });
});
