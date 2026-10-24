// The intake (intake/, run from the private reports repo): turning reports into issues, with stand-ins for Firestore,
// GitHub and the files branch. A player's words must never become markup, a mention or a link.
import { describe, expect, it } from 'vitest';
import { body, DAY, defang, expired, fenced, jpeg, keepDays, marker, reporter, title, type StoredReport } from '../intake/src/issue.ts';
import { run, type Files, type Issues, type Store } from '../intake/src/run.ts';

const JPEG = 'data:image/jpeg;base64,' + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0));
const UI = 'data:image/jpeg;base64,' + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe1, 0));
const NOW = Date.UTC(2026, 9, 11, 12);
const report = (over: Partial<StoredReport> = {}): StoredReport => ({
  id: 'A'.repeat(20), uid: 'u1', kind: 'bug', text: 'The sled got stuck', build: '6ff81ebcafe1234', device: '{"fps":58}',
  errors: '["Something broke: boom"]', live: '{"x":1.5,"stage":2}', save: '{"v":4}', shot: JPEG, ui: UI, at: NOW - 60_000,
  status: 'new', ...over,
});

/** Stand-ins that keep everything in memory. */
function services(reports: StoredReport[], old: { id: string; issue?: number; keep?: number }[] = []) {
  const db = new Map(reports.map(r => [r.id, { ...r }]));
  const filed = new Map<string, { issue: number; at: number; until: number }>(), removed: string[] = [];
  const store: Store = {
    async pending() { return [...db.values()].filter(r => r.status !== 'filed'); },
    async filing(id) { db.get(id)!.status = 'filing'; },
    async filed(id, issue, at, until) { Object.assign(db.get(id)!, { status: 'filed', issue, save: undefined, shot: undefined, ui: undefined }); filed.set(id, { issue, at, until }); },
    async expired() { return old; },
    async remove(id) { db.delete(id); removed.push(id); },
  };
  const made: { title: string; body: string; labels: string[] }[] = [], edits = new Map<number, string>();
  const existing = new Map<number, string>([[3, 'old issue ' + '![x](u) <!-- shot -->']]);
  const issues: Issues = {
    async find(text) { return [...existing].find(([, b]) => b.includes(text))?.[0] ?? null; },
    async create(t, b, labels) { made.push({ title: t, body: b, labels }); existing.set(100 + made.length, b); return 100 + made.length; },
    async read(n) { return existing.get(n) ?? null; },
    async edit(n, b) { edits.set(n, b); },
  };
  const put: string[] = [], log: string[] = [];
  const files: Files = {
    put(id, name, data, until) { put.push(`${id}/${name}:${typeof data === 'string' ? data : data.length + ' bytes'}`); log.push('put ' + until); },
    prune(now) { log.push('prune ' + now); },
    url: (id, name) => `https://github.com/o/r/blob/files/${id}/${name}?raw=true`,
    async save() { log.push('save'); },
  };
  return { store, issues, files, db, filed, removed, made, edits, existing, put, log };
}

describe('the intake', () => {
  it('turns a new report into an issue, with its pictures and save on the files branch first', async () => {
    const s = services([report()]);
    const done = await run(s.store, s.issues, s.files, NOW);
    expect(done).toEqual({ filed: [101], skipped: [], expired: 0 });
    expect(s.put).toEqual([`${'A'.repeat(20)}/shot.jpg:4 bytes`, `${'A'.repeat(20)}/ui.jpg:5 bytes`, `${'A'.repeat(20)}/save.json:{"v":4}`]);
    // a report from before the game said how long: the 7 days its player was told
    expect(s.log).toEqual([...Array(3).fill('put ' + (NOW + 7 * DAY)), 'prune ' + NOW, 'save']);
    const [issue] = s.made;
    expect(issue.title).toBe('Bug: The sled got stuck');
    expect(issue.labels).toEqual(['bug', 'new']);
    expect(issue.body).toContain(marker('A'.repeat(20)));
    // as the player saw it, then just the game, side by side (one paragraph)
    expect(issue.body).toContain(`![The screen when the report was opened](https://github.com/o/r/blob/files/${'A'.repeat(20)}/ui.jpg?raw=true) <!-- ui -->\n`
      + `![The game when the report was opened](https://github.com/o/r/blob/files/${'A'.repeat(20)}/shot.jpg?raw=true)`);
    expect(issue.body).toContain('[save.json](https://github.com/o/r/blob/files/');
    expect(issue.body).toContain('(kept 7 days)');
    expect(issue.body).toContain('build `6ff81ebcafe1`');
    expect(issue.body).toContain('2026-10-11 11:59 UTC');
    expect(issue.body).toContain('```json\n{\n  "x": 1.5,\n  "stage": 2\n}\n```');
    expect(issue.body).toContain('```text\nSomething broke: boom\n```');
    expect(issue.body).not.toContain('u1'); // the account stays out of it
    expect(s.filed.get('A'.repeat(20))).toEqual({ issue: 101, at: NOW, until: NOW + 7 * DAY });
  });

  it('keeps a report as many days as its player was told, never more than 30', async () => {
    const s = services([report({ keep: 30 })]);
    await run(s.store, s.issues, s.files, NOW);
    expect(s.log[0]).toBe('put ' + (NOW + 30 * DAY));
    expect(s.filed.get('A'.repeat(20))!.until).toBe(NOW + 30 * DAY);
    expect(s.made[0].body).toContain('(kept 30 days)');
    // the rules let through only whole days up to 30; anything else gets the old 7
    expect([30, 14, 1, 31, 0, 7.5, '30', undefined].map(keepDays)).toEqual([30, 14, 1, 7, 7, 7, 7, 7]);
  });

  it("says what the player left out, and files ideas as ideas", async () => {
    const s = services([report({ kind: 'idea', text: '\n  More fish\nplease', shot: undefined, ui: undefined, save: undefined, live: undefined, errors: '[]' })]);
    await run(s.store, s.issues, s.files, NOW);
    const [issue] = s.made;
    expect(issue.title).toBe('Idea: More fish');
    expect(issue.labels).toEqual(['idea', 'new']);
    expect(issue.body).toContain('_No picture: the player left it out._');
    expect(issue.body).toContain('_Left out by the player._');
    expect(issue.body).toContain('### Recent errors\nNone.');
    expect(s.put).toEqual([]);
  });

  it("doesn't open a second issue for a report a stopped run already filed", async () => {
    const s = services([report({ status: 'filing' })]);
    s.existing.set(42, 'body ' + marker('A'.repeat(20)));
    expect((await run(s.store, s.issues, s.files, NOW)).filed).toEqual([42]);
    expect(s.made).toEqual([]);
    // one that stopped before its issue was opened gets one now
    const t = services([report({ status: 'filing' })]);
    expect((await run(t.store, t.issues, t.files, NOW)).filed).toEqual([101]);
  });

  it('deletes a report whose name could reach outside its folder, unread', async () => {
    const s = services([report({ id: '../../.github' })]);
    expect(await run(s.store, s.issues, s.files, NOW)).toEqual({ filed: [], skipped: ['../../.github'], expired: 0 });
    expect(s.removed).toEqual(['../../.github']);
    expect(s.put).toEqual([]);
  });

  it('once its time is up, takes the picture and save out of the issue and deletes the report', async () => {
    const s = services([], [{ id: 'old', issue: 3, keep: 30 }, { id: 'lost' }]);
    expect((await run(s.store, s.issues, s.files, NOW)).expired).toBe(2);
    expect(s.edits.get(3)).toBe('_Picture deleted after 30 days._');
    expect(s.removed).toEqual(['old', 'lost']);
  });

  it('once its time is up, still deletes the report when its issue was deleted by hand', async () => {
    const s = services([], [{ id: 'gone', issue: 2 }, { id: 'old', issue: 3 }]);
    expect((await run(s.store, s.issues, s.files, NOW)).expired).toBe(2);
    expect([...s.edits.keys()]).toEqual([3]);
    expect(s.removed).toEqual(['gone', 'old']);
  });
});

describe("a player's words in an issue", () => {
  it('stay inside a fence nothing in them can close', () => {
    expect(fenced('plain')).toBe('```text\nplain\n```');
    expect(fenced('a ```` b')).toBe('`````text\na ```` b\n`````');
    const r = report({ text: '```\n</details><img src=x onerror=alert(1)>\n# Heading' });
    const b = body(r, {}, 'abcd1234');
    expect(b).toContain('````text\n```\n</details><img src=x onerror=alert(1)>\n# Heading\n````');
  });

  it("can't mention anyone or link an issue", () => {
    expect(defang('cc @octocat about #12, see #x')).toBe('cc @​octocat about #​12, see #x');
    expect(title(report({ text: '@team broke #1' }))).toBe('Bug: @​team broke #​1');
    expect(title(report({ text: 'x'.repeat(100) }))).toBe('Bug: ' + 'x'.repeat(69) + '…');
    expect(title(report({ text: '   ' }))).toBe('Bug: (no note)');
  });

  it("shows what isn't JSON as it came, and a build that isn't a commit as unknown", () => {
    const b = body(report({ device: 'not json', build: '<b>x</b>', errors: 'oops' }), {}, 'abcd1234');
    expect(b).toContain('### Device\n```text\nnot json\n```');
    expect(b).toContain('build `unknown`');
    expect(b).toContain('### Recent errors\n```text\noops\n```');
    expect(body(report({ build: 'dev' }), {}, 'x')).toContain('build `dev`');
  });

  it('names the player by a short hash that stays the same, not their account', async () => {
    const a = await reporter('u1');
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(await reporter('u1')).toBe(a);
    expect(await reporter('u2')).not.toBe(a);
  });

  it('takes only a real JPEG as the picture', () => {
    expect(jpeg(JPEG)).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
    expect(jpeg('data:image/jpeg;base64,' + btoa('<svg>'))).toBeNull();
    expect(jpeg('data:image/png;base64,AAAA')).toBeNull();
    expect(jpeg(undefined)).toBeNull();
  });

  it('loses only the picture and save lines when they expire', () => {
    const b = body(report(), { shot: 'https://s', ui: 'https://u', save: 'https://v' }, 'x');
    const e = expired(b, 7);
    expect(e).toContain('_Picture of the screen deleted after 7 days._');
    expect(e).not.toContain('https://u');
    expect(e).toContain('_Picture deleted after 7 days._');
    expect(e).toContain('_save.json deleted after 7 days._');
    expect(e).not.toContain('https://s');
    expect(e.split('\n').length).toBe(b.split('\n').length);
  });
});
