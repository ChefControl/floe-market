// The scene built the same on every device (src/boot.ts): while the game's modules load, its luck is a seeded
// sequence, and the running ids are noted before and after.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); });

describe('loading the game', () => {
  it('draws the same luck on every device while loading, then goes back to the browser’s', async () => {
    vi.stubEnv('MODE', 'production');
    const native = Math.random;
    const load = async () => {
      vi.resetModules();
      const boot = await import('../src/boot');
      const drawn = [Math.random(), Math.random(), Math.random()];
      const end = boot.endBoot();
      expect(Math.random).toBe(native);
      expect(end.o).toBeGreaterThan(boot.BASE.o);
      return drawn;
    };
    const first = await load(), second = await load();
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(3);
  });
});
