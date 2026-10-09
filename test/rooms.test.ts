// Co-op's rooms over Firebase's Realtime Database (src/rooms.ts), against a little database in memory standing in
// for Firebase's SDK: paths and values, listeners that hear what changes under them, and keys that go up in order.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Msg } from '../src/link';

const fb = vi.hoisted(() => {
  type Snap = { key: string | null; exists: () => boolean; val: () => unknown };
  type Ref = { path: string; after?: string };
  const data = new Map<string, unknown>();
  const db = { connected: true };
  let n = 0;
  const under = (p: string) => [...data.keys()].filter(k => k === p || k.startsWith(p + '/'));
  const value = (p: string): unknown => {
    if (p === '.info/connected') return db.connected;
    if (data.has(p)) return data.get(p);
    const kids = children(p);
    return kids.length ? Object.fromEntries(kids.map(k => [k, value(p + '/' + k)])) : null;
  };
  const children = (p: string) => [...new Set(under(p).filter(k => k !== p).map(k => k.slice(p.length + 1).split('/')[0]))].sort();
  const snap = (p: string, key: string | null = p.split('/').pop()!): Snap => ({ key, exists: () => value(p) !== null, val: () => value(p) });
  /** Listeners re-check what they're listening to after every change, and hear what's new. */
  const listeners = new Set<() => void>();
  const changed = () => [...listeners].forEach(f => f());
  const listen = (check: () => void) => { check(); listeners.add(check); return () => { listeners.delete(check); }; };
  const disconnects: string[] = [];
  const api = {
    data, db, disconnects,
    auth: { currentUser: null as { uid: string } | null },
    ref: (_db: unknown, path = '') => ({ path }),
    child: (r: Ref, p: string) => ({ path: r.path ? `${r.path}/${p}` : p }),
    get: async (r: Ref) => snap(r.path),
    set: async (r: Ref, v: unknown) => { data.set(r.path, v); changed(); },
    remove: async (r: Ref) => { under(r.path).forEach(k => data.delete(k)); changed(); },
    push: (r: Ref, v?: unknown) => {
      const key = 'k' + String(++n).padStart(6, '0'), path = `${r.path}/${key}`;
      const done = v === undefined ? Promise.resolve() : api.set({ path }, v);
      return Object.assign(done, { key, path });
    },
    query: (r: Ref, ...parts: { after?: string }[]) => ({ path: r.path, after: parts.find(x => x.after)?.after }),
    orderByKey: () => ({}),
    startAfter: (after: string) => ({ after }),
    serverTimestamp: () => 'server-time',
    onValue: (r: Ref, cb: (s: Snap) => void) => {
      let was: string | undefined;
      return listen(() => { const now = JSON.stringify(value(r.path)); if (now !== was) { was = now; cb(snap(r.path)); } });
    },
    onChildAdded: (r: Ref, cb: (s: Snap) => void) => {
      const seen = new Set<string>();
      return listen(() => {
        const now = children(r.path);
        for (const k of seen) if (!now.includes(k)) seen.delete(k); // gone: new again if it comes back
        for (const k of now) {
          if (seen.has(k) || (r.after && k <= r.after)) continue;
          seen.add(k); cb(snap(`${r.path}/${k}`, k));
        }
      });
    },
    onChildRemoved: (r: Ref, cb: (s: Snap) => void) => {
      let was = new Set<string>();
      return listen(() => {
        const now = new Set(children(r.path));
        for (const k of was) if (!now.has(k)) cb({ key: k, exists: () => false, val: () => null });
        was = now;
      });
    },
    onDisconnect: (r: Ref) => ({ remove: async () => { disconnects.push(r.path); } }),
    /** The connection drops (onDisconnect's removals happen) and comes back. */
    blip() {
      db.connected = false; changed();
      for (const p of disconnects.splice(0)) under(p).forEach(k => data.delete(k));
      db.connected = true; changed();
    },
    reset() { data.clear(); listeners.clear(); disconnects.length = 0; n = 0; db.connected = true; },
  };
  return api;
});
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({ name: 'app' }) }));
vi.mock('firebase/auth', () => ({ getAuth: () => fb.auth }));
vi.mock('firebase/database', () => ({
  getDatabase: () => fb.db, ref: fb.ref, child: fb.child, get: fb.get, set: (r: { path: string }, v: unknown) => fb.set(r, v),
  remove: fb.remove, push: fb.push,
  query: fb.query, orderByKey: fb.orderByKey, startAfter: fb.startAfter, serverTimestamp: fb.serverTimestamp,
  onValue: fb.onValue, onChildAdded: fb.onChildAdded, onChildRemoved: fb.onChildRemoved, onDisconnect: fb.onDisconnect,
}));

const settle = () => new Promise(r => setTimeout(r, 0));
beforeEach(() => fb.reset());

/** A host's room, and what it hears. */
async function hostRoom() {
  const { createRooms } = await import('../src/rooms');
  fb.auth.currentUser = { uid: 'host' };
  const host = await createRooms().open();
  const heard: unknown[] = [];
  host.onJoin = uid => heard.push(['join', uid]);
  host.onLeave = uid => heard.push(['leave', uid]);
  host.onMsg = (uid, m) => heard.push([uid, m]);
  return { host, heard, createRooms };
}

describe('co-op rooms on Firebase', () => {
  it('opens a room under a code nobody has, with the host in it', async () => {
    fb.data.set('rooms/AAAAAA/host', 'someone');
    const { host } = await hostRoom();
    expect(host.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(fb.data.get(`rooms/${host.code}/host`)).toBe('host');
    expect(fb.data.get(`rooms/${host.code}/created`)).toBe('server-time');
  });

  it('needs the player signed in', async () => {
    const { createRooms } = await import('../src/rooms');
    fb.auth.currentUser = null;
    await expect(createRooms().open()).rejects.toThrow('signed-out');
  });

  it("won't join a room that isn't there", async () => {
    const { createRooms } = await import('../src/rooms');
    fb.auth.currentUser = { uid: 'guest' };
    await expect(createRooms().join('ZZZZZZ')).rejects.toThrow('no-room');
  });

  it("fails to join when the room won't let the player in", async () => {
    const { host, createRooms } = await hostRoom();
    fb.auth.currentUser = { uid: 'guest' };
    const set = vi.spyOn(fb, 'set').mockRejectedValueOnce(new Error('permission_denied'));
    await expect(createRooms().join(host.code)).rejects.toThrow('permission_denied');
    set.mockRestore();
  });

  it('carries messages both ways, keeping only the host’s last few', async () => {
    const { host, heard, createRooms } = await hostRoom();
    host.send({ k: 'old' }); // from before the guest joined: not for them
    fb.auth.currentUser = { uid: 'guest' };
    const g = await createRooms().join(host.code), got: Msg[] = [];
    g.onMsg = m => got.push(m);
    expect(heard).toEqual([['join', 'guest']]);
    g.send({ k: 'hi', name: 'Sam' });
    g.send({ k: 'in', x: 1 });
    g.send({ k: 'in', x: 2 });
    await settle();
    expect(heard.slice(1)).toEqual([['guest', { k: 'hi', name: 'Sam' }], ['guest', { k: 'in', x: 1 }], ['guest', { k: 'in', x: 2 }]]);
    // what they're pressing is one record, written over
    expect(fb.data.get(`rooms/${host.code}/fromPlayer/guest/in`)).toBe('{"k":"in","x":2}');
    const { KEEP } = await import('../src/rooms');
    for (let i = 0; i < KEEP + 5; i++) host.send({ k: 'd', s: i });
    await settle();
    expect(got).toHaveLength(KEEP + 5);
    expect(got[0]).toEqual({ k: 'd', s: 0 });
    const left = [...fb.data.keys()].filter(k => k.startsWith(`rooms/${host.code}/fromHost/`));
    expect(left).toHaveLength(KEEP);
  });

  it('hears a guest’s first hello, and nothing twice when they come back', async () => {
    const { host, heard, createRooms } = await hostRoom();
    fb.auth.currentUser = { uid: 'guest' };
    // the hello lands as the host's phone hears them arrive, before it starts listening
    fb.data.set(`rooms/${host.code}/fromPlayer/guest/q/k000000`, '{"k":"hi"}');
    const g = await createRooms().join(host.code);
    g.send({ k: 'mod', id: 'fillets' });
    await settle();
    fb.blip();
    await settle();
    g.send({ k: 'hi' });
    await settle();
    expect(heard.filter(h => Array.isArray(h) && h[0] === 'guest').map(h => (h as [string, Msg])[1].k)).toEqual(['hi', 'mod', 'hi']);
  });

  it('hears the guest leave, and come back after their connection drops', async () => {
    const { host, heard, createRooms } = await hostRoom();
    fb.auth.currentUser = { uid: 'guest' };
    const g = await createRooms().join(host.code);
    let back = 0;
    g.onBack = () => { back++; };
    fb.blip();
    await settle();
    expect(heard).toEqual([['join', 'guest'], ['leave', 'guest'], ['join', 'guest']]);
    expect(back).toBe(1);
    g.close();
    await settle();
    expect(heard[3]).toEqual(['leave', 'guest']);
  });

  it('tells the guest when the host closes the room', async () => {
    const { host, createRooms } = await hostRoom();
    fb.auth.currentUser = { uid: 'guest' };
    const g = await createRooms().join(host.code);
    let gone = false;
    g.onGone = () => { gone = true; };
    host.close();
    await settle();
    expect(gone).toBe(true);
    expect([...fb.data.keys()].some(k => k.startsWith(`rooms/${host.code}`))).toBe(false);
  });
});
