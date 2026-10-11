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

  it('tells a player who played before, once, that they can report from the menu', async () => {
    const { r } = await start(true);
    $('gear').click(); // closes the menu start() opened
    r.updReports(1);
    expect(localStorage.getItem(r.NEWS_KEY)).toBe('new'); // not straight away
    $('gear').click();
    r.updReports(r.NEWS_AFTER);
    expect(localStorage.getItem(r.NEWS_KEY)).toBe('new'); // nor while the menu is open
    $('gear').click();
    r.updReports(0.02);
    await vi.waitFor(() => expect($('toast').textContent).toBe('🐞 You can now report bugs and ideas from the ⚙️ menu'));
    expect(localStorage.getItem(r.NEWS_KEY)).toBe('seen');
  });

  it("tells a new player nothing, nor one who's found it already", async () => {
    await loadGame();
    localStorage.removeItem('floe-market-v1');
    const r = await import('../src/report');
    r.initReports();
    expect(localStorage.getItem(r.NEWS_KEY)).toBe('seen');
    const { r: again } = await start();
    $('reportCat').click();
    expect(localStorage.getItem(again.NEWS_KEY)).toBe('seen');
  });

  it('asks a player who is signed out to sign in first', async () => {
    const { c } = await start(true);
    expect($('reportCat').hidden).toBe(false);
    expect($('reportName').textContent).toBe('Sign in to send a report');
    expect($('reportCat').hasAttribute('aria-haspopup')).toBe(false);
    $('reportCat').click();
    await vi.waitFor(() => expect(c.cloud.user?.uid).toBe('u1'));
    expect($('reportName').textContent).toBe('Report a bug or idea');
    expect($('reportCat').getAttribute('aria-haspopup')).toBe('dialog');
    expect($('report').hidden).toBe(true);
  });

  it('opens a window of its own over the game, with a picture of it, both boxes ticked, and a notice of everything that goes', async () => {
    await start();
    $('reportCat').click();
    expect($('report').hidden).toBe(false);
    expect($('settings').hidden).toBe(true); // the window takes the menu's place
    expect(document.activeElement).toBe($('reportKind').querySelector('[data-kind="bug"]'));
    expect(($('reportShot') as HTMLImageElement).src).toBe(SHOT);
    expect($('reportShot').hidden).toBe(false);
    expect(box('reportShotOn').checked && box('reportStateOn').checked).toBe(true);
    expect($('reportWhat').querySelector('summary')!.textContent).toBe("What's sent: your note, this picture and your game state");
    const what = () => [...$('reportWhat').querySelectorAll('li')].filter(l => !l.hidden).map(l => l.textContent);
    expect(what()).toEqual([
      "Your note, and whether it's a bug or an idea.",
      'This picture: the game as it was when you opened this, and anything you drew on it.',
      "Your game state: your saved game (progress, look and settings), and where you're standing, what's open on screen, the season and how long you've played this visit.",
      "Always: the game's version, your device type (graphics setting, frame rate, screen size, touch or not, browser) and the last few errors the game hit.",
      'Never: your name or email. Your account is only used to stop too many reports at once.',
      'Kept 7 days: the picture and game state are deleted after that. Everything goes to the developer, only to find and fix the problem.',
    ]);
    expect($('reportWarn').hidden).toBe(true);
    expect($('reportCount').textContent).toBe('0 / 1000');
    // ✕, Cancel, a click on the dimmed game around it, and Escape each close it, keeping the note for next time
    write('Half a thought');
    $('reportClose').click();
    expect($('report').hidden).toBe(true);
    expect(document.activeElement).toBe($('gear')); // back where it was opened from
    for (const close of [() => $('reportCancel').click(), () => $('report').click(),
      () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))]) {
      $('reportCat').click();
      expect($('report').hidden).toBe(false);
      close();
      expect($('report').hidden).toBe(true);
    }
    $('reportCat').click();
    $('reportText').click(); // a click inside the window doesn't close it
    expect($('report').hidden).toBe(false);
    expect(($('reportText') as HTMLTextAreaElement).value).toBe('Half a thought');
  });

  it('says what leaving the picture or the game state out costs, and leaves it out of the notice', async () => {
    await start();
    $('reportCat').click();
    tick('reportShotOn', false);
    expect($('reportShot').classList.contains('off')).toBe(true);
    expect($('reportWarn').textContent).toBe('Without the picture, it may be hard to see what went wrong.');
    expect($('reportNotice').textContent).toBe('your note and your game state');
    expect($('whatShot').hidden).toBe(true);
    expect($('whatKept').textContent).toMatch(/^Kept 7 days: the game state is deleted/);
    tick('reportStateOn', false);
    expect($('reportWarn').textContent).toBe('Without the picture, it may be hard to see what went wrong. Without your '
      + 'game state, the developer may not be able to make it happen again to fix it.');
    expect($('reportNotice').textContent).toBe('your note');
    expect($('whatKept').hidden && $('whatState').hidden).toBe(true);
    tick('reportShotOn', true);
    expect($('whatKept').textContent).toMatch(/^Kept 7 days: the picture is deleted/);
    expect($('reportWarn').textContent).not.toContain('picture');
    // both start ticked again the next time it opens
    $('reportClose').click(); $('reportCat').click();
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
    expect(r).toMatchObject({ kind: 'idea', text: 'More fish, please', build: __BUILD__, shot: SHOT });
    expect(String(r.id)).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(JSON.parse(String(r.save))).toMatchObject({ money: 77 }); // saved the moment it was sent
    expect(JSON.parse(String(r.live))).toMatchObject({ stage: 1, season: 'winter', open: [], cloud: 'saved' });
    expect(JSON.parse(String(r.device))).toMatchObject({ graphics: 'auto high', touch: false });
    expect(JSON.parse(String(r.errors))).toEqual(['Something broke: boom']);
    // the moment says it went, with no toast as well
    await vi.waitFor(() => expect(localStorage.getItem('floe-report-count')).not.toBeNull());
    expect($('toast').textContent).not.toMatch(/thanks|report|send/i);
    expect($('report').hidden).toBe(true);
    expect(($('reportText') as HTMLTextAreaElement).value).toBe('');
    // an idea lights a bulb as it goes
    expect($('sendFx').hidden).toBe(false);
    expect($('sendFx').className).toBe('idea');
    expect($('sendFx').querySelector('.glass')).not.toBeNull();
    expect($('sendFx').querySelector('b')!.textContent).toBe('Bright idea!');
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
    // a bug gets squashed as it goes
    expect($('sendFx').className).toBe('bug');
    expect($('sendFx').querySelector('.swatter')).not.toBeNull();
    expect($('sendFx').querySelector('b')!.textContent).toBe('Bug squashed!');
  });

  it("goes without a picture when one can't be taken, and says so", async () => {
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValue('data:,');
    await start();
    $('reportCat').click();
    expect($('reportShot').hidden).toBe(true);
    expect(box('reportShotOn').disabled).toBe(true);
    expect($('reportNotice').textContent).toBe('your note and your game state');
  });

  it('asks for a few words before sending, then sends 20 an hour, a second apart', async () => {
    const { r } = await start();
    $('reportCat').click();
    $('reportSend').click();
    expect($('reportWarn').textContent).toBe('Write a few words first.');
    expect(document.activeElement).toBe($('reportText'));
    write('First');
    expect($('reportWarn').hidden).toBe(true);
    $('reportSend').click();
    await vi.waitFor(() => expect(localStorage.getItem(r.COUNT_KEY)).not.toBeNull());
    // straight after: it waits out the second, then goes
    const first = JSON.parse(localStorage.getItem(r.COUNT_KEY)!);
    expect(first.n).toBe(1);
    $('reportCat').click();
    write('Second');
    $('reportSend').click();
    await new Promise(res => setTimeout(res, 300));
    expect(fake.reports).toHaveLength(1);
    await vi.waitFor(() => expect(fake.reports).toHaveLength(2), { timeout: 3000 });
    expect(Date.now() - first.last).toBeGreaterThanOrEqual(r.GAP);
    // the 21st in the hour waits for the hour, and the window stays open with the note in it
    localStorage.setItem(r.COUNT_KEY, JSON.stringify({ since: Date.now(), n: r.QUOTA, last: 0 }));
    $('reportCat').click();
    write('Too many');
    $('reportSend').click();
    expect($('toast').textContent).toBe("That's 20 reports this hour. You can send more in 60 minutes");
    expect(fake.reports).toHaveLength(2);
    expect($('report').hidden).toBe(false);
    expect(($('reportText') as HTMLTextAreaElement).value).toBe('Too many');
    // an hour after the first, it goes
    localStorage.setItem(r.COUNT_KEY, JSON.stringify({ since: Date.now() - r.WINDOW - 1000, n: r.QUOTA }));
    $('reportSend').click();
    await vi.waitFor(() => expect(fake.reports).toHaveLength(3));
  });

  it('says so when the cloud turns it away, and keeps nothing to send again', async () => {
    const { r } = await start();
    fake.fail = { code: 'permission-denied' };
    $('reportCat').click();
    write('Too soon');
    $('reportSend').click();
    await vi.waitFor(() => expect($('toast').textContent).toBe("Couldn't send it just now. Try again later"));
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
    expect($('report').hidden).toBe(false);
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

describe('Draw-a-Bug', () => {
  const at = (type: string, x: number, y: number) =>
    $('drawCanvas').dispatchEvent(Object.assign(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }), { pointerId: 1 }));
  const btn = (id: string) => $(id) as HTMLButtonElement;

  it('opens the picture big to circle what is wrong in red, and sends it with the lines on', async () => {
    await start();
    $('reportCat').click();
    expect(btn('reportDraw').hidden).toBe(false);
    expect($('reportDrawName').textContent).toBe('Draw-a-Bug');
    btn('reportDraw').click();
    expect($('draw').hidden).toBe(false);
    expect($('drawTitle').textContent).toBe("Draw-a-Bug: circle what's wrong");
    expect(document.activeElement).toBe($('drawDone'));
    expect(btn('drawUndo').disabled && btn('drawClear').disabled).toBe(true);
    // drawing doesn't close the report window underneath
    at('pointerdown', 10, 10);
    expect($('report').hidden).toBe(false);
    at('pointermove', 30, 12);
    at('pointerup', 30, 12);
    at('pointermove', 90, 90); // not drawing any more
    expect(btn('drawUndo').disabled).toBe(false);
    const encodes = vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls.length;
    btn('drawDone').click();
    await vi.waitFor(() => expect(btn('reportDraw').classList.contains('drawn')).toBe(true));
    expect($('draw').hidden).toBe(true);
    expect(vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls.length).toBeGreaterThan(encodes);
    expect(document.activeElement).toBe(btn('reportDraw'));
    write('Look here');
    $('reportSend').click();
    await vi.waitFor(() => expect(fake.reports).toHaveLength(1));
    expect(fake.reports[0].r.shot).toBe(SHOT);
  });

  it('keeps the lines to change later; Escape puts it away without the new ones, and Clear takes them all', async () => {
    await start();
    $('reportCat').click();
    ($('reportShot') as HTMLElement).click(); // the picture opens it too
    at('pointerdown', 5, 5); at('pointerup', 5, 5);
    btn('drawDone').click();
    await vi.waitFor(() => expect($('draw').hidden).toBe(true));
    btn('reportDraw').click();
    expect(btn('drawUndo').disabled).toBe(false); // the line from before
    at('pointerdown', 50, 50); at('pointerup', 50, 50);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('draw').hidden).toBe(true);
    expect($('report').hidden).toBe(false); // Escape closed the drawing, not the report window
    btn('reportDraw').click();
    btn('drawUndo').click();
    expect(btn('drawUndo').disabled).toBe(true); // only the one kept line was there
    at('pointerdown', 9, 9); at('pointerup', 9, 9);
    btn('drawClear').click();
    expect(btn('drawClear').disabled).toBe(true);
    btn('drawDone').click();
    await vi.waitFor(() => expect(btn('reportDraw').classList.contains('drawn')).toBe(false));
  });

  it('is Doodle It for an idea, in yellow, and off while the picture is left out', async () => {
    await start();
    $('reportCat').click();
    expect($('report').dataset.kind).toBe('bug');
    ($('reportKind').querySelector('[data-kind="idea"]') as HTMLElement).click();
    expect($('reportDrawName').textContent).toBe('Doodle It');
    expect($('report').dataset.kind).toBe('idea'); // the button turns yellow (index.html)
    btn('reportDraw').click();
    expect($('drawTitle').textContent).toBe('Doodle It: sketch your idea on the game');
    btn('drawDone').click();
    tick('reportShotOn', false);
    expect(btn('reportDraw').disabled).toBe(true);
    ($('reportShot') as HTMLElement).click();
    expect($('draw').hidden).toBe(true);
  });

  it('paints each line over the picture in red, and a tap as a dot', async () => {
    await start();
    const { paint } = await import('../src/sketch');
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<PropertyKey, unknown>, {
      get: (t, k) => (k in t ? t[k] : (...a: unknown[]) => { calls.push(`${String(k)}(${a.join(',')})`); }),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    const out = document.createElement('canvas');
    out.getContext = (() => ctx) as unknown as typeof out.getContext;
    const base = Object.assign(document.createElement('canvas'), { width: 640, height: 360 });
    paint(out, base, [[{ x: 1, y: 2 }]], '#FFD23F');
    expect(ctx.strokeStyle).toBe('#FFD23F'); // an idea's ink
    calls.length = 0;
    paint(out, base, [[{ x: 1, y: 2 }], [{ x: 10, y: 10 }, { x: 20, y: 30 }]]);
    expect([out.width, out.height]).toEqual([640, 360]);
    expect(ctx.strokeStyle).toBe('#FF2D2D');
    expect(ctx.lineWidth).toBeCloseTo(640 / 110);
    expect(calls.filter(c => !c.startsWith('beginPath'))).toEqual([
      `drawImage(${base},0,0)`, `arc(1,2,${640 / 110 / 2},0,${Math.PI * 2})`, 'fill()', 'moveTo(10,10)', 'lineTo(20,30)', 'stroke()',
    ]);
  });

  it('repaints the lines in the new ink when a bug becomes an idea', async () => {
    await start();
    $('reportCat').click();
    btn('reportDraw').click();
    at('pointerdown', 5, 5); at('pointerup', 5, 5);
    btn('drawDone').click();
    await vi.waitFor(() => expect(btn('reportDraw').classList.contains('drawn')).toBe(true));
    const encodes = vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls.length;
    ($('reportKind').querySelector('[data-kind="idea"]') as HTMLElement).click();
    expect(vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls.length).toBeGreaterThan(encodes);
  });
});

describe('the moment a report is sent', () => {
  it('plays for a moment, starting over if sent again, then goes', async () => {
    await start();
    const fx = await import('../src/sendFx');
    vi.useFakeTimers();
    fx.celebrate('bug');
    fx.celebrate('idea');
    expect($('sendFx').className).toBe('idea');
    vi.advanceTimersByTime(fx.FX_MS - 1);
    expect($('sendFx').hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect($('sendFx').hidden).toBe(true);
    expect($('sendFx').innerHTML).toBe('');
  });

  it("starts folded: What's sent opens only when asked", async () => {
    await start();
    $('reportCat').click();
    expect(($('reportWhat') as HTMLDetailsElement).open).toBe(false);
    ($('reportWhat') as HTMLDetailsElement).open = true;
    $('reportClose').click();
    $('reportCat').click();
    expect(($('reportWhat') as HTMLDetailsElement).open).toBe(false);
  });
});
