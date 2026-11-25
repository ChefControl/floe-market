// The desktop app's rules for addresses (desktop/links.mjs): what app://floe/ serves, and where links go.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileFor, linkKind } from '../desktop/links.mjs';

const GAME = join('/', 'games', 'floe', 'app'), NOTICES = join('/', 'games', 'floe');

describe('what app://floe/ serves', () => {
  it("reads the game's files from its build", () => {
    expect(fileFor('app://floe/index.html', GAME, NOTICES)).toBe(join(GAME, 'index.html'));
    expect(fileFor('app://floe/', GAME, NOTICES)).toBe(join(GAME, 'index.html'));
    expect(fileFor('app://floe/assets/main-abc.js?x=1', GAME, NOTICES)).toBe(join(GAME, 'assets', 'main-abc.js'));
    expect(fileFor('app://floe/fonts/baloo%202.woff2', GAME, NOTICES)).toBe(join(GAME, 'fonts', 'baloo 2.woff2'));
  });

  it("reads Chromium's notices from beside the program", () => {
    expect(fileFor('app://floe/LICENSES.chromium.html', GAME, NOTICES)).toBe(join(NOTICES, 'LICENSES.chromium.html'));
    expect(fileFor('app://floe/LICENSE', GAME, NOTICES)).toBe(join(GAME, 'LICENSE')); // (Electron's is in licences.txt)
  });

  it('never anything outside them', () => {
    expect(fileFor('app://floe/../secret.txt', GAME, NOTICES)).toBe(join(GAME, 'secret.txt')); // (URL parsing drops the climb)
    expect(fileFor('app://floe/%2e%2e/%2e%2e/secret.txt', GAME, NOTICES)).toBe(join(GAME, 'secret.txt')); // (so does this)
    expect(fileFor('app://floe/assets/..%2f..%2fsecret.txt', GAME, NOTICES)).toBeNull();
    expect(fileFor('app://floe/a%00b', GAME, NOTICES)).toBeNull();
    expect(fileFor('app://floe/%E0%A4%A', GAME, NOTICES)).toBeNull();
    expect(fileFor('app://other/index.html', GAME, NOTICES)).toBeNull();
    expect(fileFor('file:///etc/passwd', GAME, NOTICES)).toBeNull();
    expect(fileFor('not a url', GAME, NOTICES)).toBeNull();
  });
});

describe('where links go', () => {
  it('web pages to the browser, steam:// to Steam, the game\'s own files to a window of its own', () => {
    expect(linkKind('https://threejs.org/')).toBe('browser');
    expect(linkKind('http://example.com/')).toBe('browser');
    expect(linkKind('steam://store/480')).toBe('steam');
    expect(linkKind('mailto:someone@example.com')).toBe('mail');
    expect(linkKind('app://floe/licences.txt')).toBe('game');
    expect(linkKind('app://elsewhere/x')).toBe('none');
    expect(linkKind('file:///etc/passwd')).toBe('none');
    expect(linkKind('javascript:alert(1)')).toBe('none');
    expect(linkKind('nonsense')).toBe('none');
  });
});

describe('the Steam upload script (desktop/steam/upload.mjs)', async () => {
  const { appBuild, steamId } = await import('../desktop/steam/upload.mjs');

  it("takes the ids from the environment, and never Valve's test app", () => {
    expect(steamId({ STEAM_APP_ID: ' 1234567 ' }, 'STEAM_APP_ID')).toBe('1234567');
    expect(() => steamId({}, 'STEAM_APP_ID')).toThrow(/isn't set/);
    expect(() => steamId({ STEAM_APP_ID: 'abc' }, 'STEAM_APP_ID')).toThrow(/isn't a Steam id/);
    expect(() => steamId({ STEAM_APP_ID: '480' }, 'STEAM_APP_ID')).toThrow(/test app/);
  });

  it('builds both depots onto a branch of their own', () => {
    const vdf = appBuild({ appId: '100', depots: { '101': 'windows', '102': 'linux' }, content: 'C:\\ci\\steam', output: '/o', desc: 'Floe Market abc1234', branch: 'beta' });
    expect(vdf).toContain('"AppID" "100"');
    expect(vdf).toContain('"SetLive" "beta"');
    expect(vdf).toContain('"ContentRoot" "C:/ci/steam"');
    expect(vdf).toMatch(/"101"\s*\{\s*"FileMapping"\s*\{\s*"LocalPath" "windows\/\*"/);
    expect(vdf).toMatch(/"102"\s*\{\s*"FileMapping"\s*\{\s*"LocalPath" "linux\/\*"/);
    expect(() => appBuild({ appId: '100', depots: {}, content: '/c', output: '/o', desc: '', branch: 'default' })).toThrow(/never the default/);
  });
});
