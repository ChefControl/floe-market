// A page cached from before a deploy asks for files the deploy removed: it reloads once to catch up, and no more
// often than once a minute. index.html handles the game's own script; errors.ts handles Firebase, fetched later.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';

const $ = (id: string) => document.getElementById(id)!;

beforeEach(() => { sessionStorage.clear(); vi.resetModules(); });
afterEach(() => { $('err').style.display = ''; $('err').textContent = ''; });

describe("index.html, when the game's script is missing", () => {
  const src = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)![1];
  /** Runs the inline script with its listener and the reload caught, and returns a way to fail a file. */
  function boot() {
    let onError: (e: Event) => void = () => {};
    const reload = vi.fn();
    new Function('addEventListener', 'location', src)(
      (type: string, cb: (e: Event) => void, capture: boolean) => { expect([type, capture]).toEqual(['error', true]); onError = cb; },
      { reload },
    );
    const fail = (target: unknown) => onError({ target } as unknown as Event);
    return { reload, fail };
  }

  it('reloads once, then says so instead of reloading again', () => {
    const { reload, fail } = boot();
    fail(document.createElement('script'));
    expect(reload).toHaveBeenCalledTimes(1);
    fail(document.createElement('script')); // the reloaded page still can't get it: the site is down
    expect(reload).toHaveBeenCalledTimes(1);
    expect($('err').textContent).toContain("didn't load");
  });

  it('reloads again a minute later, for the next deploy', () => {
    const { reload, fail } = boot();
    sessionStorage.setItem('floe-market-reload', String(Date.now() - 61_000));
    fail(document.createElement('script'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("leaves other errors (a broken image, the game's own) alone", () => {
    const { reload, fail } = boot();
    fail(document.createElement('img'));
    fail(window);
    fail(null);
    expect(reload).not.toHaveBeenCalled();
    expect($('err').textContent).toBe('');
  });
});

describe("errors.ts, when Firebase's file is missing", () => {
  async function boot() {
    const errors = await import('../src/errors');
    const reload = vi.spyOn(errors.page, 'reload').mockImplementation(() => {});
    const fail = () => {
      const e = new Event('vite:preloadError', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented; // Vite throws the import's error unless the page handles it
    };
    return { reload, fail };
  }

  it('reloads once a minute at most, and lets the import fail otherwise', async () => {
    const { reload, fail } = await boot();
    expect(fail()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(fail()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("doesn't reload when it can't remember having done so", async () => {
    const { reload, fail } = await boot();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(fail()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
