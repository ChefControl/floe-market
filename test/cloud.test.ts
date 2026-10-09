// Cloud saves: signing in with Google, and keeping this device's game and the account's in line. Firebase is
// replaced by a fake account service that keeps saves in memory.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET, type SaveFixture } from './helpers';

const h = vi.hoisted(() => {
  type User = { uid: string; name: string } | null;
  type Score = { uid: string; name: string; best: number; stage: 1 | 2 };
  const fake = {
    signedIn: false,
    user: { uid: 'u1', name: 'Pat Smith' },
    store: new Map<string, { data: string; savedAt: number }>(),
    scores: new Map<string, Score>(),
    scoreWrites: 0,
    boardDown: false,
    reads: 0,
    writes: 0,
    offline: false,
    brokenStart: false,
    signInError: null as { code: string } | null,
    cb: null as ((u: User) => void) | null,
  };
  const backend = {
    onUser(cb: (u: User) => void) { fake.cb = cb; queueMicrotask(() => cb(fake.signedIn ? fake.user : null)); },
    async signIn() { if (fake.signInError) throw fake.signInError; fake.signedIn = true; fake.cb!(fake.user); },
    async signOut() { fake.signedIn = false; fake.cb!(null); },
    async read(uid: string) { fake.reads++; if (fake.offline) throw new Error('offline'); return fake.store.get(uid) ?? null; },
    async write(uid: string, s: { data: string; savedAt: number }) {
      if (fake.offline) throw new Error('offline');
      fake.writes++; fake.store.set(uid, { ...s });
    },
    async postScore(s: Score) {
      if (fake.offline) throw new Error('offline');
      fake.scoreWrites++;
      const was = fake.scores.get(s.uid);
      fake.scores.set(s.uid, { ...s, best: Math.max(s.best, was?.best ?? 0), stage: Math.max(s.stage, was?.stage ?? 1) as 1 | 2 });
    },
    async topScores(n: number) {
      if (fake.offline || fake.boardDown) throw new Error('offline');
      return [...fake.scores.values()].sort((a, b) => b.best - a.best).slice(0, n);
    },
  };
  const config = { apiKey: 'test-key', authDomain: 'test', projectId: 'test', appId: 'test' };
  return { fake, backend, config };
});
vi.mock('../src/cloud.config', () => ({ firebaseConfig: h.config }));
vi.mock('../src/firebase', () => ({
  createBackend: () => { if (h.fake.brokenStart) throw new Error('no network'); return h.backend; },
}));

const { fake } = h;
const $ = (id: string) => document.getElementById(id)!;
const SAVE_KEY = 'floe-market-v1', LINK_KEY = 'floe-cloud', NOTE_KEY = 'floe-cloud-note';
const local = () => localStorage.getItem(SAVE_KEY)!;
const link = () => JSON.parse(localStorage.getItem(LINK_KEY)!) as { uid: string; on: boolean; base: number };

/**
 * Loads a game (saved once, as the autosave would), and the cloud module with page reloads caught. `again` is a
 * reload: the game from storage, and the cloud's own notes kept (loadGame clears storage otherwise).
 */
async function start(save?: SaveFixture, again = false) {
  const kept = again ? [LINK_KEY, NOTE_KEY].map(k => [k, localStorage.getItem(k)] as const) : [];
  const g = await loadGame(again ? local() : save);
  for (const [k, v] of kept) if (v !== null) localStorage.setItem(k, v);
  g.saveMod.save();
  const c = await import('../src/cloud');
  const reload = vi.fn();
  c.cloud.reload = reload;
  return { g, c, reload };
}
/** A save with real progress, as another device would have made it. */
async function otherGame(money: number) {
  const o = await loadGame({ money, tiles: bought(...MARKET, 'sushi') });
  o.saveMod.save();
  return local();
}
const signIn = async (c: Awaited<ReturnType<typeof start>>['c']) => {
  c.initCloud();
  $('cloud').click();
};

beforeEach(() => {
  Object.assign(fake, {
    signedIn: false, reads: 0, writes: 0, scoreWrites: 0, offline: false, boardDown: false, brokenStart: false, signInError: null, cb: null,
  });
  fake.store.clear();
  fake.scores.clear();
  h.config.apiKey = 'test-key';
});

describe('cloud saves', () => {
  it("stay out of sight until there's a Firebase project to save to", async () => {
    h.config.apiKey = '';
    const { c } = await start();
    c.initCloud();
    expect($('cloud').hidden).toBe(true);
  });

  it("signing in puts this device's game in the cloud when the account has none", async () => {
    const { c } = await start({ money: 120, tiles: bought('pack') });
    await signIn(c);
    await vi.waitFor(() => expect(fake.store.get('u1')?.data).toBe(local()));
    await vi.waitFor(() => expect($('cloud').dataset.state).toBe('saved'));
    expect($('cloudName').textContent).toBe('Pat');
    expect(link()).toMatchObject({ uid: 'u1', on: true });
    $('cloud').click();
    expect($('cloudMenu').hidden).toBe(false);
    expect($('cloudWho').textContent).toBe('Signed in as Pat Smith');
    expect($('cloudStatus').textContent).toBe('Saved to the cloud just now');
  });

  it("a new device picks up the account's game, and says so after the reload", async () => {
    const theirs = await otherGame(9000);
    fake.store.set('u1', { data: theirs, savedAt: 1000 });
    const { c, reload } = await start();
    await signIn(c);
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(local()).toBe(theirs);
    expect($('cloudPick').hidden).toBe(true); // nothing here worth asking about
    // after the reload: the cloud's game, and a note about it
    const next = await start(undefined, true);
    expect(next.g.wallet.money).toBe(9000);
    next.c.initCloud();
    expect($('toast').textContent).toBe('Loaded your game from the cloud');
  });

  it('asks which game to keep when both have progress, and keeps the one picked', async () => {
    const theirs = await otherGame(9000);
    fake.store.set('u1', { data: theirs, savedAt: 1000 });
    const { c, reload } = await start({ money: 250, tiles: bought('pack') });
    await signIn(c);
    await vi.waitFor(() => expect($('cloudPick').hidden).toBe(false));
    expect(document.activeElement).toBe($('cloudPick').querySelector('button')); // a dialog: focus goes there
    expect($('cloudHere').textContent).toBe('Stage 1 · $250 · 1 upgrades · played just now');
    expect($('cloudThere').textContent).toBe('Stage 2 · $9,000 · 10 upgrades · played just now');
    ($('cloudPick').querySelector('[data-keep="device"]') as HTMLElement).click();
    await vi.waitFor(() => expect(fake.store.get('u1')?.data).toBe(local()));
    expect($('cloudPick').hidden).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it("can keep the cloud's game instead", async () => {
    const theirs = await otherGame(9000);
    fake.store.set('u1', { data: theirs, savedAt: 1000 });
    const { c, reload } = await start({ money: 250, tiles: bought('pack') });
    await signIn(c);
    await vi.waitFor(() => expect($('cloudPick').hidden).toBe(false));
    $('cloudPick').click(); // not on a button: still asking
    expect($('cloudPick').hidden).toBe(false);
    ($('cloudPick').querySelector('[data-keep="cloud"] span') as HTMLElement).click();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(local()).toBe(theirs);
  });

  it('once linked, whichever side moved on wins without asking', async () => {
    const theirs = await otherGame(9000);
    const { g, c, reload } = await start({ money: 120, tiles: bought('pack') });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    // played on here: the cloud catches up
    g.wallet.money += 50; g.saveMod.save();
    await c.sync();
    expect(fake.writes).toBe(2);
    expect(fake.store.get('u1')!.data).toBe(local());
    // nothing new on either side: nothing to do
    await c.sync();
    expect(fake.writes).toBe(2);
    // played on another device since: this one catches up
    fake.store.set('u1', { data: theirs, savedAt: Date.now() + 5000 });
    await c.sync();
    expect(reload).toHaveBeenCalled();
    expect(local()).toBe(theirs);
  });

  it('a device signed in before picks up where it was: signed in, and syncing every half minute', async () => {
    const { c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    // a reload later: Firebase remembers the sign-in
    vi.useFakeTimers();
    const next = await start(undefined, true);
    next.c.initCloud();
    await vi.waitFor(() => expect(next.c.cloud.user?.uid).toBe('u1'));
    await vi.waitFor(() => expect(next.c.cloud.state).toBe('saved'));
    const writes = fake.writes;
    next.g.wallet.money += 10; next.g.saveMod.save();
    await vi.advanceTimersByTimeAsync(next.c.SYNC_EVERY * 1000);
    expect(fake.writes).toBe(writes + 1);
  });

  it('Restart, signed in, starts the cloud save over too', async () => {
    const { g, c } = await start({ money: 5000, tiles: bought('pack', 'turret') });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    g.saveMod.wipeSave();
    const next = await start(undefined, true); // the reload: a new game, still signed in
    next.c.initCloud();
    await vi.waitFor(() => expect(fake.writes).toBe(2));
    expect(JSON.parse(fake.store.get('u1')!.data)).toMatchObject({ money: 0 });
    expect($('cloudPick').hidden).toBe(true);
  });

  it("can't reach the cloud: says so, and the game carries on saving here", async () => {
    fake.offline = true;
    const { c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect($('cloud').dataset.state).toBe('offline'));
    expect($('cloudStatus').textContent).toBe("Can't reach the cloud right now. Your game is still saved on this device.");
    expect(JSON.parse(local()).money).toBe(120);
  });

  it('signing out keeps the game here; signing back in carries on without asking', async () => {
    const { g, c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    $('cloud').click();
    $('cloudOut').click();
    await vi.waitFor(() => expect(c.cloud.user).toBeNull());
    expect($('cloudName').textContent).toBe('Sign in');
    expect($('cloudMenu').hidden).toBe(true);
    expect(link()).toMatchObject({ uid: 'u1', on: false });
    g.wallet.money += 500; g.saveMod.save();
    $('cloud').click();
    await vi.waitFor(() => expect(fake.writes).toBe(2));
    expect($('cloudPick').hidden).toBe(true);
    expect(JSON.parse(fake.store.get('u1')!.data).money).toBe(620);
  });

  it("someone else signing in on this device is asked, since it's not their game", async () => {
    const theirs = await otherGame(9000);
    fake.store.set('u2', { data: theirs, savedAt: 1000 });
    const { c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    $('cloud').click(); $('cloudOut').click();
    await vi.waitFor(() => expect(c.cloud.user).toBeNull());
    fake.user = { uid: 'u2', name: 'Sam' };
    $('cloud').click();
    await vi.waitFor(() => expect($('cloudPick').hidden).toBe(false));
    fake.user = { uid: 'u1', name: 'Pat Smith' };
  });

  it('shows why signing in failed', async () => {
    const { c } = await start();
    c.initCloud();
    for (const [code, msg] of [
      ['auth/popup-closed-by-user', 'Sign-in cancelled'], ['auth/popup-blocked', 'Allow pop-ups to sign in'],
      ['auth/unauthorized-domain', "Sign-in isn't set up for this site yet"], ['auth/network-request-failed', "Couldn't sign in. Try again"],
    ]) {
      fake.signInError = { code };
      $('cloud').click();
      await vi.waitFor(() => expect($('toast').textContent).toBe(msg));
    }
  });

  it('when the page is hidden, syncs without stopping to ask', async () => {
    const theirs = await otherGame(9000);
    const { g, c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    // both sides have moved on since
    g.wallet.money += 50; g.saveMod.save();
    fake.store.set('u1', { data: theirs, savedAt: Date.now() + 5000 });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(c.cloud.state).toBe('idle'));
    expect($('cloudPick').hidden).toBe(true);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('leaves the cloud alone while the page stays hidden, and syncs again once it is back', async () => {
    vi.useFakeTimers();
    const { c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    const reads = fake.reads;
    await vi.advanceTimersByTimeAsync(c.SYNC_EVERY * 1000 * 3);
    expect(fake.reads).toBe(reads);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    await vi.advanceTimersByTimeAsync(c.SYNC_EVERY * 1000);
    expect(fake.reads).toBeGreaterThan(reads);
  });

  it("a tab that's handed the game to another tab leaves the cloud alone", async () => {
    const { g, c } = await start({ money: 120 });
    await signIn(c);
    await vi.waitFor(() => expect(fake.writes).toBe(1));
    g.saveMod.replaceSave(local());
    const reads = fake.reads;
    await c.sync();
    expect(fake.reads).toBe(reads);
  });

  it("a signed-in device that couldn't reach Firebase at the start connects later", async () => {
    vi.useFakeTimers();
    fake.signedIn = true; fake.brokenStart = true;
    const { c } = await start({ money: 120 });
    localStorage.setItem(LINK_KEY, JSON.stringify({ uid: 'u1', on: true, base: 0, sum: '' }));
    c.initCloud();
    await vi.waitFor(() => expect($('cloud').dataset.state).toBe('offline'));
    fake.brokenStart = false;
    await vi.advanceTimersByTimeAsync(c.SYNC_EVERY * 1000);
    await vi.waitFor(() => expect(fake.store.get('u1')?.data).toBe(local()));
  });

  it('shows a signed-in device as offline until it reaches Firebase, and a tap tries again', async () => {
    fake.signedIn = true; fake.brokenStart = true;
    const { c } = await start({ money: 120 });
    localStorage.setItem(LINK_KEY, JSON.stringify({ uid: 'u1', on: true, base: 0, sum: '' }));
    c.initCloud();
    await vi.waitFor(() => expect($('cloudName').textContent).toBe('Offline'));
    fake.brokenStart = false;
    $('cloud').click();
    await vi.waitFor(() => expect($('cloudName').textContent).toBe('Pat'));
    expect(fake.signedIn).toBe(true); // picked back up, without a second sign-in
  });

  it('signs in for co-op when asked, and leaves a co-op guest’s own game alone', async () => {
    const { c } = await start({ money: 120 });
    c.initCloud();
    expect(await c.signInNow()).toEqual(fake.user);
    expect(await c.userKnown).toBeNull(); // nobody, when Firebase first said
    await vi.waitFor(() => expect(fake.store.get('u1')).toBeDefined());
    // already signed in: no second sign-in
    expect(await c.signInNow()).toEqual(fake.user);
    // playing a friend's game, this device's own isn't synced
    const { coop } = await import('../src/remote');
    coop.role = 'guest';
    const writes = fake.writes;
    localStorage.setItem(SAVE_KEY, local().replace('"money":120', '"money":121'));
    await c.sync();
    expect(fake.writes).toBe(writes);
    coop.role = 'solo';
  });

  it('keeps a host’s game while a friend plays in it, and takes the cloud’s once they’ve finished', async () => {
    const theirs = await otherGame(9000);
    const { c, reload } = await start();
    const { coop } = await import('../src/remote');
    coop.role = 'host';
    await signIn(c);
    await vi.waitFor(() => expect($('cloud').dataset.state).toBe('saved'));
    fake.store.set('u1', { data: theirs, savedAt: 1000 });
    await c.sync();
    expect(c.cloud.state).toBe('idle');
    expect(reload).not.toHaveBeenCalled();
    coop.role = 'solo';
    await c.sync();
    expect(reload).toHaveBeenCalled();
  });

  it("says so when signing in for co-op didn't work", async () => {
    const { c } = await start();
    fake.signInError = { code: 'auth/popup-blocked' };
    await expect(c.signInNow()).rejects.toEqual({ code: 'auth/popup-blocked' });
    fake.signInError = null;
    vi.useFakeTimers();
    const signIn = vi.spyOn(h.backend, 'signIn').mockResolvedValue();
    const tried = c.signInNow().catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await tried).toBe('signed-out');
    signIn.mockRestore();
  });

  it("fetches Firebase a few seconds into the game, so signing in doesn't wait for it", async () => {
    vi.useFakeTimers();
    const { c } = await start();
    c.initCloud();
    expect(fake.cb).toBeNull();
    await vi.advanceTimersByTimeAsync(4000);
    await vi.waitFor(() => expect(fake.cb).not.toBeNull());
  });
});

describe('the scoreboard', () => {
  const rows = () => [...$('scoresList').children].map(li => li.textContent);
  /** The game and the cloud module, with the scoreboard button wired up. */
  async function board(save?: SaveFixture) {
    const started = await start(save);
    const s = await import('../src/scores');
    started.c.initCloud();
    s.initScores();
    return { ...started, s };
  }
  const others = () => {
    fake.scores.set('u7', { uid: 'u7', name: 'Mia Kowalski', best: 52_000, stage: 2 });
    fake.scores.set('u8', { uid: 'u8', name: 'Ola', best: 900, stage: 1 });
  };

  it("stays out of sight until there's a Firebase project to keep it in", async () => {
    h.config.apiKey = '';
    await board();
    expect($('board').hidden).toBe(true);
  });

  it('a signed-in player goes on it as the game syncs: full name, best cash and stage', async () => {
    const { g, c } = await board({ money: 300, tiles: bought(...MARKET, 'sushi') });
    $('cloud').click();
    await vi.waitFor(() => expect(fake.scores.get('u1')).toEqual({ uid: 'u1', name: 'Pat Smith', best: 300, stage: 2 }));
    // spending doesn't lower it; nothing new, nothing written
    g.wallet.money = 40; g.saveMod.save();
    await c.sync();
    expect(fake.scoreWrites).toBe(1);
    expect(fake.scores.get('u1')!.best).toBe(300);
    // a new best is
    const { addMoney } = await import('../src/wallet');
    addMoney(1000); g.saveMod.save();
    await c.sync();
    expect(fake.scores.get('u1')!.best).toBe(1040);
  });

  it('lists the top players, best first, with the player picked out', async () => {
    others();
    const { c } = await board({ money: 5000 });
    $('cloud').click();
    await vi.waitFor(() => expect(c.cloud.state).toBe('saved'));
    $('board').click();
    expect($('scores').hidden).toBe(false);
    expect($('board').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe($('scoresClose'));
    await vi.waitFor(() => expect(rows()).toEqual([
      '1Mia KowalskiStage 2$52k', '2Pat Smith (you)Stage 1$5,000', '3OlaStage 1$900',
    ]));
    expect($('scoresList').children[1].classList.contains('me')).toBe(true);
    expect($('scoresMe').textContent).toBe('');
    expect($('scoresJoin').hidden).toBe(true);
    $('scoresClose').click();
    expect($('scores').hidden).toBe(true);
    expect(document.activeElement).toBe($('board'));
  });

  it("closes with Escape, a tap beside it, or the 🏆 button again", async () => {
    const { s } = await board();
    s.openScores();
    $('scoresClose').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect($('scores').hidden).toBe(true);
    s.openScores();
    $('scores').querySelector('.card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect($('scores').hidden).toBe(false); // on the card: stays open
    $('scores').click();
    expect($('scores').hidden).toBe(true);
    $('board').click(); $('board').click();
    expect($('scores').hidden).toBe(true);
  });

  it("shows a player who isn't signed in their own best, and a way to join", async () => {
    others();
    const { g } = await board({ money: 2500 });
    g.wallet.money = 100; // spent since
    $('board').click();
    await vi.waitFor(() => expect(rows()).toEqual(['1Mia KowalskiStage 2$52k', '2OlaStage 1$900']));
    expect($('scoresMe').textContent).toBe('Your best: $2,500 · Stage 1');
    expect($('scoresJoin').hidden).toBe(false);
    $('scoresJoin').click();
    expect($('scores').hidden).toBe(true);
    await vi.waitFor(() => expect(fake.scores.get('u1')?.best).toBe(2500));
  });

  it("shows a signed-in player who isn't in the top their own line", async () => {
    others();
    const { c } = await board({ money: 10 });
    $('cloud').click();
    await vi.waitFor(() => expect(c.cloud.state).toBe('saved'));
    const sc = await import('../src/scores');
    for (let i = 0; i < sc.TOP; i++) fake.scores.set(`x${i}`, { uid: `x${i}`, name: `P${i}`, best: 1000 + i, stage: 1 });
    $('board').click();
    await vi.waitFor(() => expect(rows()).toHaveLength(sc.TOP));
    expect($('scoresMe').textContent).toBe('You: $10 · Stage 1');
  });

  it("says so when it's empty, or can't be reached", async () => {
    const { s } = await board();
    s.openScores();
    await vi.waitFor(() => expect($('scoresMe').textContent).toBe('Nobody on the scoreboard yet.'));
    s.closeScores();
    fake.boardDown = true;
    s.openScores();
    await vi.waitFor(() => expect($('scoresMe').textContent).toBe("Can't load the scoreboard right now."));
    expect($('scoresList').hasAttribute('aria-busy')).toBe(false);
  });

  it('shows full names, never an email', async () => {
    const { c } = await start();
    expect(c.publicName('Pat Smith')).toBe('Pat Smith');
    expect(c.publicName('  Ana  de la cruz ')).toBe('Ana de la cruz');
    expect(c.publicName('Sam')).toBe('Sam');
    expect(c.publicName('pat@example.com')).toBe('A player');
    expect(c.publicName(' ')).toBe('A player');
    const long = c.publicName('Bartholomew ' + 'Q'.repeat(60));
    expect(long).toHaveLength(c.NAME_MAX);
    expect(long.endsWith('…')).toBe(true);
  });
});
