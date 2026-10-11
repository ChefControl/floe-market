// Reporting a bug or an idea from the settings: the form, what it tells the player, what it sends, and the reports
// that wait on the device when the cloud can't be reached. Firebase is a fake that keeps reports in memory.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const h = vi.hoisted(() => {
  type User = { uid: string; name: string } | null;
  const fake = {
    signedIn: true,
    user: { uid: 'u1', name: 'Pat Smith' },
    reports: [] as { uid: string; r: Record<string, unknown> }[],
    fail: null as unknown,
    hang: false,
    cb: null as ((u: User) => void) | null,
  };
  const backend = {
    onUser(cb: (u: User) => void) { fake.cb = cb; queueMicrotask(() => cb(fake.signedIn ? fake.user : null)); },
    async signIn() { fake.signedIn = true; fake.cb!(fake.user); },
    async signOut() { fake.signedIn = false; fake.cb!(null); },
    async read() { return null; },
    async write() {},
    async postScore() {},
    async topScores() { return []; },
    async sendReport(uid: string, r: Record<string, unknown>) {
      if (fake.hang) return new Promise<void>(() => {});
      if (fake.fail) throw fake.fail;
      fake.reports.push({ uid, r });
    },
  };
  const config = { apiKey: 'test-key', authDomain: 'test', projectId: 'test', appId: 'test' };
  return { fake, backend, config };
});
vi.mock('../src/cloud.config', () => ({ firebaseConfig: h.config }));
vi.mock('../src/firebase', () => ({ createBackend: () => h.backend }));

const { fake } = h;
const $ = (id: string) => document.getElementById(id)!;
const SHOT = 'data:image/jpeg;base64,/9j/AAAA';
const box = (id: string) => $(id) as HTMLInputElement;
const tick = (id: string, on: boolean) => { box(id).checked = on; box(id).dispatchEvent(new Event('change')); };
const write = (t: string) => {
  const ta = $('reportText') as HTMLTextAreaElement;
  ta.value = t;
  ta.dispatchEvent(new Event('input'));
};

/** The game, with cloud saves and reports started, signed in unless `out`. */
async function start(out = false) {
  fake.signedIn = false;
  const g = await loadGame({ money: 50, tiles: bought('pack') });
  const c = await import('../src/cloud'), r = await import('../src/report');
  c.initCloud();
  r.initReports();
  $('gear').click(); // the settings, where the row is
  if (!out) {
    $('cloud').click();
    await vi.waitFor(() => expect(c.cloud.state).toBe('saved'));
  }
  return { g, c, r };
}

beforeEach(() => {
  Object.assign(fake, { signedIn: false, fail: null, hang: false, cb: null });
  fake.reports = [];
  h.config.apiKey = 'test-key';
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(SHOT);
});

describe('reporting a bug or an idea', () => {
  it("stays out of sight until there's a Firebase project to send to", async () => {
    h.config.apiKey = '';
    await start(true);
    expect($('reportCat').hidden).toBe(true);
    expect($('errReport').hidden).toBe(true);
  });

  it('asks a player who is signed out to sign in first', async () => {
    const { c } = await start(true);
    expect($('reportCat').hidden).toBe(false);
    expect($('reportName').textContent).toBe('Sign in to send a report');
    expect($('reportCat').hasAttribute('aria-expanded')).toBe(false);
    $('reportCat').click();
    await vi.waitFor(() => expect(c.cloud.user?.uid).toBe('u1'));
    expect($('reportName').textContent).toBe('Report a bug or idea');
    expect($('reportPanel').hidden).toBe(true);
  });

  it('opens with a picture of the game, both boxes ticked, and a notice of everything that goes', async () => {
    await start();
    $('reportCat').click();
    expect($('reportPanel').hidden).toBe(false);
    expect($('reportCat').getAttribute('aria-expanded')).toBe('true');
    expect(($('reportShot') as HTMLImageElement).src).toBe(SHOT);
    expect($('reportShot').hidden).toBe(false);
    expect(box('reportShotOn').checked && box('reportStateOn').checked).toBe(true);
    expect($('reportNotice').textContent).toBe('Sending shares your note, this picture and your game state with the '
      + 'developer, to find and fix the problem. The game version, your device type and recent errors go too. Your '
      + 'name and email are not sent. The picture and game state are deleted after 7 days.');
    expect($('reportWarn').hidden).toBe(true);
    expect($('reportCount').textContent).toBe('0 / 1000');
    $('reportCat').click();
    expect($('reportPanel').hidden).toBe(true);
  });

  it('says what leaving the picture or the game state out costs, and leaves it out of the notice', async () => {
    await start();
    $('reportCat').click();
    tick('reportShotOn', false);
    expect($('reportShot').classList.contains('off')).toBe(true);
    expect($('reportWarn').textContent).toBe('Without the picture, it may be hard to see what went wrong.');
    expect($('reportNotice').textContent).toMatch(/^Sending shares your note and your game state with/);
    expect($('reportNotice').textContent).toMatch(/The game state is deleted after 7 days\.$/);
    tick('reportStateOn', false);
    expect($('reportWarn').textContent).toBe('Without the picture, it may be hard to see what went wrong. Without your '
      + 'game state, the developer may not be able to make it happen again to fix it.');
    expect($('reportNotice').textContent).toMatch(/^Sending shares your note with/);
    expect($('reportNotice').textContent).toMatch(/are not sent\.$/);
    tick('reportShotOn', true);
    expect($('reportNotice').textContent).toMatch(/The picture is deleted after 7 days\.$/);
    expect($('reportWarn').textContent).not.toContain('picture');
    // both start ticked again the next time it opens
    $('reportCat').click(); $('reportCat').click();
    expect(box('reportStateOn').checked).toBe(true);
    expect($('reportWarn').hidden).toBe(true);
  });

  it('sends the note, the picture and the game state, and thanks the player', async () => {
    const { g } = await start();
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));
    $('reportCat').click();
    ($('reportKind').querySelector('[data-kind="idea"]') as HTMLElement).click();
    expect(($('reportText') as HTMLTextAreaElement).placeholder).toBe('What would you like in the game?');
    write('  More fish, please  ');
    expect($('reportCount').textContent).toBe('21 / 1000');
    g.wallet.money = 77;
    $('reportSend').click();
    await vi.waitFor(() => expect(fake.reports).toHaveLength(1));
    const { uid, r } = fake.reports[0];
    expect(uid).toBe('u1');
    expect(r).toMatchObject({ kind: 'idea', text: 'More fish, please', build: 'dev', shot: SHOT });
    expect(String(r.id)).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(JSON.parse(String(r.save))).toMatchObject({ money: 77 }); // saved the moment it was sent
    expect(JSON.parse(String(r.live))).toMatchObject({ stage: 1, season: 'winter', open: [], cloud: 'saved' });
    expect(JSON.parse(String(r.device))).toMatchObject({ graphics: 'auto high', touch: false });
    expect(JSON.parse(String(r.errors))).toEqual(['Something broke: boom']);
    await vi.waitFor(() => expect($('toast').textContent).toBe('Thanks! Your report is on its way'));
    expect($('reportPanel').hidden).toBe(true);
    expect(($('reportText') as HTMLTextAreaElement).value).toBe('');
  });

  it('leaves out what the player unticked', async () => {
    await start();
    $('reportCat').click();
    tick('reportShotOn', false);
    tick('reportStateOn', false);
    write('The sled got stuck');
    $('reportSend').click();
    await vi.waitFor(() => expect(fake.reports).toHaveLength(1));
    expect(Object.keys(fake.reports[0].r).sort()).toEqual(['build', 'device', 'errors', 'id', 'kind', 'text']);
  });

  it("goes without a picture when one can't be taken, and says so", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValue('data:,');
    await start();
    $('reportCat').click();
    expect($('reportShot').hidden).toBe(true);
    expect(box('reportShotOn').disabled).toBe(true);
    expect($('reportNotice').textContent).toMatch(/^Sending shares your note and your game state with/);
  });

  it("asks for a few words before sending, and won't send twice in a couple of minutes", async () => {
    await start();
    $('reportCat').click();
    $('reportSend').click();
    expect($('reportWarn').textContent).toBe('Write a few words first.');
    expect(document.activeElement).toBe($('reportText'));
    write('First');
    expect($('reportWarn').hidden).toBe(true);
    $('reportSend').click();
    await vi.waitFor(() => expect($('toast').textContent).toBe('Thanks! Your report is on its way'));
    $('reportCat').click();
    write('Second');
    $('reportSend').click();
    expect($('toast').textContent).toBe('You just sent one. Try again in a couple of minutes');
    expect(fake.reports).toHaveLength(1);
  });

  it('says so when the cloud turns it away, and keeps nothing to send again', async () => {
    const { r } = await start();
    fake.fail = { code: 'permission-denied' };
    $('reportCat').click();
    write('Too soon');
    $('reportSend').click();
    await vi.waitFor(() => expect($('toast').textContent).toBe("Couldn't send it just now. Try again in a few minutes"));
    expect(localStorage.getItem(r.QUEUE_KEY)).toBeNull();
  });

  it("keeps a report on the device while the cloud can't be reached, and sends it later", async () => {
    const { r } = await start();
    fake.fail = new Error('offline');
    $('reportCat').click();
    write('Offline one');
    $('reportSend').click();
    await vi.waitFor(() => expect($('toast').textContent).toBe("Thanks! It'll send when you're back online"));
    expect(JSON.parse(localStorage.getItem(r.QUEUE_KEY)!)).toHaveLength(1);
    fake.fail = null;
    await r.flush();
    expect(fake.reports.map(x => x.r.text)).toEqual(['Offline one']);
    expect(localStorage.getItem(r.QUEUE_KEY)).toBeNull();
  });

  it('keeps only the newest two waiting, and drops one the cloud turns away when sent again', async () => {
    const { r } = await start();
    const waiting = (text: string) => ({ id: text, kind: 'bug', text, build: 'dev', device: '{}', errors: '[]' });
    localStorage.setItem(r.QUEUE_KEY, JSON.stringify([waiting('a'), waiting('b')]));
    fake.fail = new Error('offline');
    $('reportCat').click();
    write('c');
    $('reportSend').click();
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(r.QUEUE_KEY)!).map((w: { text: string }) => w.text)).toEqual(['b', 'c']));
    await r.flush(); // still offline: nothing goes
    expect(JSON.parse(localStorage.getItem(r.QUEUE_KEY)!)).toHaveLength(2);
    fake.fail = { code: 'permission-denied' }; // it got through last time after all
    await r.flush();
    expect(localStorage.getItem(r.QUEUE_KEY)).toBeNull();
  });

  it("gives up waiting for a cloud that doesn't answer, and keeps the report", async () => {
    const { c, r } = await start();
    fake.hang = true;
    vi.useFakeTimers();
    const sent = c.sendReport({ id: 'x', kind: 'bug', text: 'hang', build: 'dev', device: '{}', errors: '[]' });
    await vi.advanceTimersByTimeAsync(c.SEND_WAIT * 1000);
    expect(await sent).toBe('offline');
    expect(r.QUEUE_KEY).toBe('floe-reports');
  });

  it("opens from the error box's Report this, with the error written in", async () => {
    await start();
    window.dispatchEvent(new ErrorEvent('error', { message: 'kaboom', filename: 'https://x/assets/game.js', lineno: 12 }));
    expect($('errMsg').textContent).toBe('Something broke: kaboom');
    expect($('errReport').hidden).toBe(false);
    $('errReport').click();
    expect($('settings').hidden).toBe(false);
    expect($('reportPanel').hidden).toBe(false);
    expect(($('reportText') as HTMLTextAreaElement).value).toBe('Something broke: kaboom (game.js:12)');
  });

  it('notes promises that fail with nothing to catch them, for the next report', async () => {
    await start();
    const errors = await import('../src/errors');
    const e = new Event('unhandledrejection') as Event & { reason: unknown };
    e.reason = new Error('lost');
    window.dispatchEvent(e);
    expect(errors.recentErrors.slice(-1)).toEqual(['Unhandled: lost']);
    for (let i = 0; i < 12; i++) window.dispatchEvent(new ErrorEvent('error', { message: 'e' + i }));
    expect(errors.recentErrors).toHaveLength(10);
  });
});
