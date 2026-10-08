// Boot sequence, render loop, autosave triggers and restart. One test: main.ts registers window-level
// listeners that would otherwise pile up across tests.
import { expect, it, vi } from 'vitest';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const stored = () => localStorage.getItem('floe-market-v1') ?? '';

it('boots from a save, renders, autosaves and restarts', async () => {
  const g = await loadGame({ money: 7 }, { main: true });
  expect($('hint').hidden).toBe(false); // how to walk, the first time on this device
  expect(stored()).toContain('"v":4'); // claims the save at once, so older tabs step aside

  // render loop
  const render = vi.spyOn(g.render.renderer, 'render');
  g.frame()!(16);
  g.frame()!(32);
  expect(render).toHaveBeenCalledTimes(2);
  expect($('cashN').textContent).toBe('7');
  expect(g.render.camera.position.y).toBeGreaterThan(10);

  // errors surface on screen
  window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));
  expect($('err').textContent).toBe('Something broke: boom');

  // saves whenever the page may be going away
  g.wallet.money = 8;
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(stored()).toContain('"money":8');
  g.wallet.money = 9;
  window.dispatchEvent(new Event('pagehide'));
  expect(stored()).toContain('"money":9');
  g.wallet.money = 11;
  window.dispatchEvent(new Event('beforeunload'));
  expect(stored()).toContain('"money":11');

  // another tab saving takes over: this one stops saving and says so
  window.dispatchEvent(new StorageEvent('storage', { key: 'floe-market-v1', newValue: 'other tab' }));
  expect($('stale').hidden).toBe(false);
  expect(document.activeElement).toBe(document.querySelector('#stale button')); // it's a dialog: focus goes there

  // restart: first tap arms, it disarms after 2.5s; a double-tap is ignored, a deliberate second tap erases
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  const btn = $('restart');
  btn.click();
  expect($('restartText').textContent).toBe('Tap again to erase progress');
  vi.advanceTimersByTime(2500);
  expect($('restartText').textContent).toBe('Restart');
  btn.click();
  btn.click();
  expect(stored()).not.toBe('');
  vi.advanceTimersByTime(700);
  vi.spyOn(console, 'error').mockImplementation(() => {}); // jsdom can't reload; it logs instead
  btn.click();
  expect(stored()).toBe('');
});
