// The Steam build (VITE_STEAM=on, flags.ts): it stands alone, with no Firebase, no reports and none of the web page's
// own tags.
import { afterEach, describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { withoutWeb } from '../vite.config';

afterEach(() => { vi.unstubAllEnvs(); });

describe('the Steam build', () => {
  it("leaves out the page's web-only parts: the shared link's card, the home-screen icons, the reload-after-deploy script", () => {
    const page = withoutWeb(indexHtml);
    for (const web of ['og:', 'twitter:', 'manifest', 'apple-touch-icon', 'apple-mobile-web-app', 'theme-color', 'floe-market-reload', 'web only']) {
      expect(indexHtml).toContain(web);
      expect(page).not.toContain(web);
    }
    // the rest of the head stays: the title, the fonts, and the loading screen's own script
    expect(page).toContain('<title>Floe Market</title>');
    expect(page).toContain('fonts/baloo2-800.woff2');
    expect(page).toContain('window.PRELOAD');
    expect(indexHtml.length - page.length).toBeLessThan(3000);
    // the markup moved: the build stops, rather than ship the web's tags
    expect(() => withoutWeb(page)).toThrow(/no web-only parts/);
  });

  it('has no cloud: no sign-in, scoreboard or reports, and never fetches Firebase', async () => {
    vi.stubEnv('VITE_STEAM', 'on');
    const { steamOn } = await import('../src/flags');
    const { cloudEnabled, connect } = await import('../src/cloud');
    expect(steamOn()).toBe(true);
    expect(cloudEnabled()).toBe(false);
    await expect(connect()).rejects.toThrow(/no cloud in the Steam build/);
    vi.unstubAllEnvs();
    expect(cloudEnabled()).toBe(true);
  });
});
