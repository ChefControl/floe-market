// A stand-in for the desktop app's program (desktop/preload.cjs), as the game's page sees it, for the tests.
import { vi } from 'vitest';
import type { Answer, DesktopApi } from '../src/desktop';

/** The desktop app's program, as the page sees it, keeping the files in a Map; `fail` makes each kind of call fail. */
export function fakeDesktop(files: Record<string, string> = {}, fail: Partial<Record<'read' | 'write' | 'remove', string>> = {}) {
  const kept = new Map(Object.entries(files)), calls: string[] = [];
  const screen = { fullscreen: true, changed: [] as ((d: { fullscreen: boolean }) => void)[] };
  const answer = <T>(what: 'read' | 'write' | 'remove', value: T): Answer<T> => fail[what] ? { ok: false, error: fail[what]! } : { ok: true, value };
  const api: DesktopApi = {
    platform: 'win32',
    saves: {
      read: key => { calls.push(`read ${key}`); return answer('read', kept.get(key) ?? null); },
      write: async (key, data) => { calls.push(`write ${key}`); if (!fail.write) kept.set(key, data); return answer('write', null); },
      writeNow: (key, data) => { calls.push(`writeNow ${key}`); if (!fail.write) kept.set(key, data); return answer('write', null); },
      remove: key => { calls.push(`remove ${key}`); kept.delete(key); return answer('remove', null); },
    },
    display: {
      get: () => ({ fullscreen: screen.fullscreen }),
      // (the program switches the window, then tells the page, as F11 does)
      fullscreen: on => { calls.push(`fullscreen ${on}`); screen.fullscreen = on; for (const f of screen.changed) f({ fullscreen: on }); },
      onChange: f => { screen.changed.push(f); },
    },
    quit: () => { calls.push('quit'); },
  };
  vi.stubGlobal('floeDesktop', api);
  return { kept, calls, screen };
}
