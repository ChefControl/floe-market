// Cloud saves: signing in with Google, and keeping this device's game and the account's in line. Firebase is
// replaced by a fake account service that keeps saves in memory.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET, type SaveFixture } from './helpers';

const h = vi.hoisted(() => {
  type User = { uid: string; name: string } | null;
  const fake = {
    signedIn: false,
    user: { uid: 'u1', name: 'Pat Smith' },
    store: new Map<string, { data: string; savedAt: number }>(),
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
  Object.assign(fake, { signedIn: false, reads: 0, writes: 0, offline: false, brokenStart: false, signInError: null, cb: null });
  fake.store.clear();
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
    expect($('cloudThere').textContent).toBe('Stage 2 · $9,000 · 8 upgrades · played just now');
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

  it("fetches Firebase a few seconds into the game, so signing in doesn't wait for it", async () => {
    vi.useFakeTimers();
    const { c } = await start();
    c.initCloud();
    expect(fake.cb).toBeNull();
    await vi.advanceTimersByTimeAsync(4000);
    await vi.waitFor(() => expect(fake.cb).not.toBeNull());
  });
});
