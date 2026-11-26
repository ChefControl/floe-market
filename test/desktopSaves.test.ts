// The desktop app's save files (desktop/saves.mjs), and the game saving to them (save.ts).
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BACKUPS, saveFiles } from '../desktop/saves.mjs';
import { fakeDesktop } from './desktopFake';
import { loadGame } from './helpers';

const KEY = 'floe-market-v1', game = (money: number) => JSON.stringify({ v: 7, money });
const folder = () => join(mkdtempSync(join(tmpdir(), 'floe-saves-')), 'saves');

describe('the save files', () => {
  it('writes the game whole, and reads it back', () => {
    const s = saveFiles(folder());
    expect(s.read(KEY)).toBeNull();
    s.write(KEY, game(5));
    expect(s.read(KEY)).toBe(game(5));
    expect(readdirSync(s.dir)).toEqual(['save.json']); // (no temporary file left)
  });

  it('a save cut off part-way never reaches save.json: the last whole one is still there', () => {
    const s = saveFiles(folder());
    s.write(KEY, game(5));
    // what a crash or a power cut mid-save leaves: half a temporary file, never renamed
    writeFileSync(join(s.dir, 'save.json.tmp'), '{"v":7,"mon');
    expect(s.read(KEY)).toBe(game(5));
    s.write(KEY, game(6));
    expect(s.read(KEY)).toBe(game(6));
  });

  it(`rolls into ${BACKUPS} backups, newest first, and an unreadable save.json reads the newest good one`, () => {
    const s = saveFiles(folder());
    expect(s.roll()).toBe(false); // nothing to roll yet
    for (const m of [1, 2, 3, 4, 5]) { s.write(KEY, game(m)); s.roll(); }
    const backup = (n: number) => readFileSync(join(s.dir, `save.${n}.json`), 'utf8');
    expect([backup(1), backup(2), backup(3)]).toEqual([game(5), game(4), game(3)]);
    expect(existsSync(join(s.dir, 'save.4.json'))).toBe(false);
    writeFileSync(join(s.dir, 'save.json'), '{"v":7,"mon'); // the disk spoilt it
    expect(s.read(KEY)).toBe(game(5));
    writeFileSync(join(s.dir, 'save.1.json'), '');
    expect(s.read(KEY)).toBe(game(4));
    // an unreadable save isn't rolled over the good backups
    expect(s.roll()).toBe(false);
    expect(backup(2)).toBe(game(4));
  });

  it('Restart rolls the game into the backups and takes it away, and the backups don\'t stand in for it', () => {
    const s = saveFiles(folder());
    s.write(KEY, game(9));
    s.remove(KEY);
    expect(s.read(KEY)).toBeNull();
    expect(readFileSync(join(s.dir, 'save.1.json'), 'utf8')).toBe(game(9));
  });

  it('keeps an unreadable save apart, and nothing but the save keys', () => {
    const s = saveFiles(folder());
    s.write('floe-market-backup', 'not json');
    expect(s.read('floe-market-backup')).toBe('not json');
    expect(readdirSync(s.dir)).toEqual(['save.unreadable.json']);
    expect(() => s.write('floe-market-stage3', '1')).toThrow(/not a save key/);
    expect(() => s.read('../../etc/passwd')).toThrow(/not a save key/);
  });
});

describe('the game, saving in the desktop app', () => {
  it('loads from the file, saves to it in the background, and there and then as the window closes', async () => {
    const d = fakeDesktop({ [KEY]: JSON.stringify({ v: 7, money: 42, tiles: [], reviews: [] }) });
    const g = await loadGame();
    expect(g.wallet.money).toBe(42);
    expect(localStorage.getItem(KEY)).toBeNull(); // never the page's storage
    g.wallet.money = 50;
    g.saveMod.save();
    await Promise.resolve();
    expect(d.calls).toEqual([`read ${KEY}`, `write ${KEY}`]); // read once: the page keeps its own copy
    expect(JSON.parse(d.kept.get(KEY)!).money).toBe(50);
    g.wallet.money = 60;
    g.saveMod.startAutosave();
    window.dispatchEvent(new Event('beforeunload'));
    expect(d.calls[d.calls.length - 1]).toBe(`writeNow ${KEY}`);
    expect(JSON.parse(d.kept.get(KEY)!).money).toBe(60);
  });

  it("a save it can't read is never written over, and the player's told", async () => {
    const d = fakeDesktop({ [KEY]: game(42) }, { read: 'EIO: i/o error' });
    const g = await loadGame();
    expect(g.wallet.money).toBe(0);
    g.saveMod.save();
    expect(d.calls).toEqual([`read ${KEY}`]);
    expect(d.kept.get(KEY)).toBe(game(42));
    expect(document.getElementById('errMsg')!.textContent).toBe("Couldn't read your save, so this game won't be saved. EIO: i/o error");
  });

  it("says so once when it can't save", async () => {
    const d = fakeDesktop({}, { write: 'ENOSPC: no space left on device' });
    const g = await loadGame();
    g.saveMod.save();
    await vi.waitFor(() => expect(document.getElementById('errMsg')!.textContent).toBe("Couldn't save the game. ENOSPC: no space left on device"));
    expect(d.calls.filter(c => c.startsWith('write'))).toHaveLength(1);
  });

  it('Restart takes the file away', async () => {
    const d = fakeDesktop({ [KEY]: JSON.stringify({ v: 7, money: 42, tiles: [], reviews: [] }) });
    const g = await loadGame();
    g.saveMod.wipeSave();
    expect(d.calls[d.calls.length - 1]).toBe(`remove ${KEY}`);
    expect(d.kept.has(KEY)).toBe(false);
    g.saveMod.save(true);
    expect(d.kept.has(KEY)).toBe(false); // nothing on the way out writes it back
  });
});

describe("the full game, starting from the demo's save (#183)", () => {
  it("reads the demo's save while it has never had one of its own, and never writes there", () => {
    const demo = saveFiles(folder()), full = saveFiles(folder(), demo.dir);
    expect(full.read(KEY)).toBeNull(); // no demo played
    demo.write(KEY, game(7));
    expect(full.read(KEY)).toBe(game(7));
    full.write(KEY, game(8));
    expect([full.read(KEY), demo.read(KEY)]).toEqual([game(8), game(7)]);
    // after a Restart, it starts over: the demo's save doesn't come back
    full.remove(KEY);
    expect(full.read(KEY)).toBeNull();
  });
});
