import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { build, type Rolldown } from 'vite';
import { describe, expect, it } from 'vitest';
import { licences, verdict } from '../scripts/licences';

describe('which licences can ship', () => {
  it('takes permissive ones, stops copyleft and unknown ones', () => {
    expect(verdict('MIT')).toBe('ok');
    expect(verdict('Apache-2.0')).toBe('ok');
    expect(verdict('(MIT OR GPL-3.0-only)')).toBe('ok'); // the game takes the MIT
    expect(verdict('MIT AND LGPL-2.1-or-later')).toBe('copyleft');
    expect(verdict('GPL-2.0-only WITH Classpath-exception-2.0')).toBe('copyleft');
    expect(verdict('AGPL-3.0-only')).toBe('copyleft');
    expect(verdict('LGPL-3.0-or-later OR SomethingOdd')).toBe('unknown');
    expect(verdict('')).toBe('unknown');
    expect(verdict('SEE LICENSE IN LICENSE.txt')).toBe('unknown');
    expect(verdict('(MIT')).toBe('unknown');
  });
});

describe('the build', () => {
  /** A little game that imports these packages, built for real: what reaches the bundle is what gets credited. */
  async function buildWith(packages: Record<string, string>, opts?: Parameters<typeof licences>[0]) {
    const root = realpathSync(mkdtempSync(`${tmpdir()}/floe-licences-`));
    writeFileSync(`${root}/index.html`, '<ul>\n<!-- licences: listed by the build (scripts/licences.ts) -->\n</ul>\n<script type="module" src="./main.js"></script>\n');
    writeFileSync(`${root}/main.js`, Object.keys(packages).map((name, i) => `import f${i} from '${name}'; f${i}();`).join('\n'));
    for (const [name, licence] of Object.entries(packages)) {
      mkdirSync(`${root}/node_modules/${name}`, { recursive: true });
      writeFileSync(`${root}/node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', license: licence, main: 'index.js' }));
      writeFileSync(`${root}/node_modules/${name}/index.js`, `export default () => console.log('${name}');`);
      writeFileSync(`${root}/node_modules/${name}/LICENSE`, `${licence} licence text of ${name}`);
    }
    const out = await build({ root, configFile: false, logLevel: 'silent', build: { write: false, modulePreload: false }, plugins: [licences(opts)] });
    const files = (out as Rolldown.RolldownOutput).output;
    const text = (name: string) => { const f = files.find(f => f.fileName === name); return f?.type === 'asset' ? String(f.source) : ''; };
    return { page: text('index.html'), licences: text('licences.txt') };
  }

  it('credits each bundled package in the credits and in licences.txt', async () => {
    const { page, licences } = await buildWith({ 'mit-thing': 'MIT', 'isc-thing': 'ISC' });
    expect(page).toContain('<li>isc-thing 1.0.0, ISC.</li>');
    expect(page).toContain('<li>mit-thing 1.0.0, MIT.</li>');
    expect(page).toContain('<a href="licences.txt" target="_blank" rel="noopener">The full licence texts</a>');
    expect(licences).toContain('mit-thing 1.0.0 (MIT)\n\nMIT licence text of mit-thing');
  });

  it('fails on a GPL package', async () => {
    await expect(buildWith({ 'mit-thing': 'MIT', 'gpl-thing': 'GPL-3.0-only' })).rejects.toThrow(/gpl-thing 1\.0\.0: GPL-3\.0-only is copyleft/);
    await expect(buildWith({ 'lgpl-thing': 'LGPL-2.1-or-later' })).rejects.toThrow(/lgpl-thing 1\.0\.0: LGPL-2\.1-or-later is copyleft/);
    await expect(buildWith({ 'odd-thing': 'Odd-1.0' })).rejects.toThrow(/odd-thing 1\.0\.0: can't read its licence "Odd-1\.0"/);
  });

  it('ships one the owner approved, under the licence they approved', async () => {
    const approved = { 'lgpl-thing': { licence: 'LGPL-2.1-or-later', why: 'a test' } };
    expect((await buildWith({ 'lgpl-thing': 'LGPL-2.1-or-later' }, { approved })).page).toContain('<li>lgpl-thing 1.0.0, LGPL-2.1-or-later.</li>');
    await expect(buildWith({ 'lgpl-thing': 'GPL-3.0-only' }, { approved })).rejects.toThrow(/copyleft/);
  });

  it('adds the notices handed in as extra (the Electron build: Chromium, ffmpeg), checked the same way', async () => {
    const ffmpeg = { name: 'ffmpeg', version: '7.1', licence: 'LGPL-2.1-or-later', text: 'GNU LESSER GENERAL PUBLIC LICENSE…' };
    await expect(buildWith({}, { extra: [ffmpeg] })).rejects.toThrow(/ffmpeg 7\.1: LGPL-2\.1-or-later is copyleft/);
    const { licences } = await buildWith({}, { extra: [ffmpeg], approved: { ffmpeg: { licence: 'LGPL-2.1-or-later', why: 'a test' } } });
    expect(licences).toContain('ffmpeg 7.1 (LGPL-2.1-or-later)\n\nGNU LESSER');
  });

  it("has the game's credits ready for the list, and the Apache licence's text for Firebase, which ships none", () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<!-- licences: listed by the build (scripts/licences.ts) -->');
    expect(readFileSync('scripts/licences/Apache-2.0.txt', 'utf8')).toContain('Apache License');
  });
});
