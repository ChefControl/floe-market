// Playing together on screen (src/together.ts): the settings' Play together card for the host, and the card a friend
// sees opening an invite. Firebase is replaced: signing in by a stand-in, and the rooms by rooms in memory.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryRooms, type Rooms } from '../src/link';
import { loadGame } from './helpers';

const h = vi.hoisted(() => ({
  user: null as { uid: string; name: string } | null,
  fail: null as unknown,
  rooms: null as unknown as Rooms,
}));
vi.mock('../src/rooms', () => ({ createRooms: () => h.rooms }));
vi.mock('../src/cloud', async importOriginal => {
  const real = await importOriginal<typeof import('../src/cloud')>();
  return {
    ...real,
    get userKnown() { return Promise.resolve(h.user); },
    signInNow: async () => { if (h.fail) throw h.fail; return h.user ?? { uid: 'u1', name: 'Pat Smith' }; },
  };
});

const $ = (id: string) => document.getElementById(id)!;
const click = (id: string) => $(id).click();
/** Lets promises (signing in, joining) settle. */
const settle = () => new Promise(r => setTimeout(r, 10));

/** The game, opened at `url`, as main.ts starts it. */
async function open(url: string) {
  history.replaceState(null, '', url);
  const g = await loadGame(undefined, { main: true });
  const [together, coop] = await Promise.all([import('../src/together'), import('../src/coop')]);
  await settle();
  return { ...g, together, coop };
}

beforeEach(() => {
  h.user = null; h.fail = null; h.rooms = memoryRooms();
  history.replaceState(null, '', '/');
});

describe('playing together: the host', () => {
  it("isn't offered until ?coop has been in the address", async () => {
    await open('/');
    expect($('together').hidden).toBe(true);
    await open('/?coop');
    expect($('together').hidden).toBe(false);
    // and from then on, on this device
    expect(localStorage.getItem('floe-coop')).toBe('1');
  });

  it('invites a friend with a link, shows who has joined, and stops', async () => {
    const g = await open('/?coop');
    click('gear');
    click('together');
    expect($('coop').hidden).toBe(false);
    expect($('settings').hidden).toBe(true);
    click('coopInvite');
    await settle();
    const link = ($('coopLink') as HTMLInputElement).value;
    expect(link).toMatch(/\?join=[A-Z2-9]{6}$/);
    expect($('coopShare').hidden).toBe(false);
    expect($('coopMsg').textContent).toContain('Send your friend this link');
    // a friend opens it
    const code = link.slice(-6), friend = await h.rooms.join(code);
    friend.send({ k: 'hi', v: 1, print: g.coop.bootPrint(), name: 'Sam' });
    click('coopClose');
    expect($('coop').hidden).toBe(true);
    click('together');
    expect($('coopMsg').textContent).toBe('Sam is playing with you.');
    // sharing: the phone's share sheet, or else the clipboard
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    click('coopShare');
    await settle();
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: link }));
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    click('coopShare');
    await settle();
    expect(writeText).toHaveBeenCalledWith(link);
    expect($('toast').textContent).toBe('Link copied');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    click('coopShare');
    await settle();
    click('coopStop');
    expect(g.coop.isHosting()).toBe(false);
    expect($('coopInvite').hidden).toBe(false);
    $('coop').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('coop').hidden).toBe(true);
  });

  it("says why it couldn't open the game to a friend", async () => {
    await open('/?coop');
    click('together');
    h.fail = { code: 'auth/popup-blocked' };
    click('coopInvite');
    await settle();
    expect($('coopMsg').textContent).toBe('Allow pop-ups to sign in');
    h.fail = null;
    h.rooms = { open: () => Promise.reject(new Error('offline')), join: () => Promise.reject(new Error('offline')) };
    click('coopInvite');
    await settle();
    expect($('coopMsg').textContent).toContain("Couldn't connect");
  });
});

describe('playing together: a friend opening the invite', () => {
  /** The host's end of a room, answering hello and sending a first keyframe. */
  async function hostEnd() {
    const end = await h.rooms.open();
    end.onMsg = (uid, m) => {
      if (m.k !== 'hi') return;
      end.send({ k: 'welcome', to: uid, me: -5 });
      end.send({ k: 'd', s: 1, kf: 1, d: null, st: { w: [42, 42, 0] }, e: [] });
    };
    return end;
  }

  it('signs in with Google to join, plays, waits for a quiet host, and goes back to their own game', async () => {
    const end = await hostEnd();
    const g = await open('/?join=' + end.code);
    expect($('restart').hidden).toBe(true);
    expect($('coopJoin').hidden).toBe(false);
    expect($('coopGo').hidden).toBe(false);
    click('coopGo');
    await settle();
    expect($('coopJoin').hidden).toBe(true);
    expect(g.wallet.money).toBe(42);
    expect(g.coop.guestState()).toBe('playing');
    // the host's phone goes quiet
    g.frame()!(performance.now() + 5000);
    expect($('coopWait').hidden).toBe(false);
    end.close();
    expect($('coopJoin').hidden).toBe(false);
    expect($('coopJoinMsg').textContent).toContain('stopped playing');
    const own = vi.spyOn(g.together.nav, 'own').mockImplementation(() => {});
    click('coopOwn');
    expect(own).toHaveBeenCalled();
  });

  it('goes straight in when already signed in on the device', async () => {
    h.user = { uid: 'u2', name: 'Sam Guest' };
    const end = await hostEnd();
    const names: unknown[] = [];
    const answer = end.onMsg;
    end.onMsg = (uid, m) => { names.push(m.name); answer(uid, m); };
    const g = await open('/?join=' + end.code);
    await settle();
    expect(g.coop.guestState()).toBe('playing');
    expect(names[0]).toBe('Sam');
  });

  it("says when the game's gone, or signing in didn't work", async () => {
    await open('/?join=ZZZZZZ');
    click('coopGo');
    await settle();
    expect($('coopJoinMsg').textContent).toContain("isn't open any more");
    h.fail = { code: 'auth/popup-closed-by-user' };
    click('coopOwn');
    await open('/?join=ZZZZZZ');
    click('coopGo');
    await settle();
    expect($('coopJoinMsg').textContent).toBe('Sign-in cancelled');
    expect($('coopGo').hidden).toBe(false);
  });

  it('joins between two tabs without signing in, with ?coop=tabs', async () => {
    await open('/?join=ZZZZZZ&coop=tabs');
    await new Promise(r => setTimeout(r, 3100));
    expect($('coopJoinMsg').textContent).toContain("isn't open any more");
  }, 10_000);
});
