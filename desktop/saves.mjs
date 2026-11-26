// @ts-check
// The desktop app's save files (#161), in a folder of their own (userData/saves, which Steam Cloud can sync later):
//
// - save.json: the game. Each save writes save.json.tmp, flushes it to the disk, then renames it over save.json, so
//   a crash or a power cut mid-save leaves the old save or the new one, never half of one.
// - save.1.json to save.3.json: rolling backups, newest first. The save rolls into them when the game starts and every
//   ten minutes of play, so there's always one from before this session.
// - save.unreadable.json: a save the game couldn't read, kept before it starts over (save.ts's BACKUP_KEY).
//
// If save.json is there but can't be read, the newest backup that can stands in. Restart rolls the game into the
// backups and takes save.json away: the old game can still be got back by hand, but the backups don't stand in for it.
// Kept apart from Electron so the tests can load it (test/desktopSaves.test.ts).
import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync } from 'node:fs';
import { join } from 'node:path';

/** The game's storage keys (save.ts) that live in files, and their files. */
export const FILES = /** @type {const} */ ({ 'floe-market-v1': 'save.json', 'floe-market-backup': 'save.unreadable.json' });
/** How many backups roll. */
export const BACKUPS = 3;

/** Windows can refuse a rename for a moment while something else (an antivirus, the search indexer) has the file open:
 *  it's tried again a few times, a little apart. */
function rename(/** @type {string} */ from, /** @type {string} */ to) {
  for (let i = 0; ; i++) {
    try { renameSync(from, to); return; } catch (e) {
      const code = /** @type {NodeJS.ErrnoException} */ (e).code;
      if (i >= 5 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (i + 1));
    }
  }
}

/** @param {string} text */
const readable = text => {
  try { const v = JSON.parse(text); return typeof v === 'object' && v !== null && !Array.isArray(v); } catch { return false; }
};

/** @param {string} dir */
export function saveFiles(dir) {
  const main = join(dir, FILES['floe-market-v1']);
  const backups = Array.from({ length: BACKUPS }, (_, i) => join(dir, `save.${i + 1}.json`));
  /** @param {string} key */
  const fileOf = key => {
    const f = FILES[/** @type {keyof typeof FILES} */ (key)];
    if (!f) throw new Error(`not a save key: ${key}`);
    return join(dir, f);
  };
  /** @param {string} file */
  const read = file => {
    try { return readFileSync(file, 'utf8'); } catch { return null; }
  };

  /** Writes `data` to `file` whole or not at all: a temporary file, flushed, renamed over it. */
  function writeWhole(/** @type {string} */ file, /** @type {string} */ data) {
    mkdirSync(dir, { recursive: true });
    const tmp = file + '.tmp', fd = openSync(tmp, 'w');
    try {
      writeSync(fd, data);
      fsyncSync(fd);
    } finally { closeSync(fd); }
    rename(tmp, file);
  }

  return {
    dir,
    /** What's kept under a key: for the game, save.json, or if that's unreadable, the newest backup that isn't. */
    read(/** @type {string} */ key) {
      const file = fileOf(key), text = read(file);
      if (file !== main || text === null || readable(text)) return text;
      for (const b of backups) {
        const t = read(b);
        if (t !== null && readable(t)) return t;
      }
      return text;
    },
    write(/** @type {string} */ key, /** @type {string} */ data) { writeWhole(fileOf(key), data); },
    /** Rolls the game into the backups: save.json becomes save.1.json, which becomes save.2.json, and so on. */
    roll() {
      const text = read(main);
      if (text === null || !readable(text)) return false;
      for (let i = BACKUPS - 1; i > 0; i--) if (existsSync(backups[i - 1])) rename(backups[i - 1], backups[i]);
      // (a copy, written whole, so a crash here leaves save.json as it was)
      const tmp = backups[0] + '.tmp';
      copyFileSync(main, tmp);
      rename(tmp, backups[0]);
      return true;
    },
    /** Takes a key's file away (Restart); the game rolls into the backups first. */
    remove(/** @type {string} */ key) {
      const file = fileOf(key);
      if (file === main) this.roll();
      rmSync(file, { force: true });
    },
  };
}
