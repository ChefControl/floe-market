// The Firebase side of cloud saves (firebase.ts), against stand-ins for the Firebase SDK.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  user: { uid: 'u1', displayName: null as string | null, email: 'pat@example.com' } as object | null,
  doc: null as { data: string; savedAt: number } | null,
  set: [] as unknown[],
  score: undefined as Record<string, unknown> | undefined,
  scores: [] as { id: string; data: Record<string, unknown> }[],
  batch: [] as unknown[],
}));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 'app' })) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  GoogleAuthProvider: class {},
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => cb(sdk.user)),
  signInWithPopup: vi.fn(async () => ({})),
  signOut: vi.fn(async () => {}),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'db' })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  getDoc: vi.fn(async () => ({ exists: () => sdk.doc !== null, data: () => sdk.doc })),
  setDoc: vi.fn(async (ref: unknown, data: unknown) => { sdk.set.push([ref, data]); }),
  serverTimestamp: vi.fn(() => 'server-time'),
  collection: vi.fn((_db: unknown, col: string) => ({ col })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: [field, dir] })),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((...parts: unknown[]) => ({ query: parts })),
  getDocs: vi.fn(async () => ({ docs: sdk.scores.map(s => ({ id: s.id, data: () => s.data })) })),
  writeBatch: vi.fn(() => {
    const sets: unknown[] = [];
    return { set: (ref: unknown, data: unknown) => { sets.push([ref, data]); }, commit: async () => { sdk.batch.push(sets); } };
  }),
  runTransaction: vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => fn({
    get: async () => ({ data: () => sdk.score }),
    set: (ref: unknown, data: unknown) => { sdk.set.push([ref, data]); },
  })),
}));

beforeEach(() => { sdk.doc = null; sdk.set = []; sdk.score = undefined; sdk.scores = []; sdk.batch = []; });

describe('the Firebase backend', () => {
  it('signs in with Google and reports who is signed in', async () => {
    const auth = await import('firebase/auth');
    const { createBackend } = await import('../src/firebase');
    const b = createBackend();
    const seen: unknown[] = [];
    b.onUser(u => seen.push(u));
    expect(seen).toEqual([{ uid: 'u1', name: 'pat@example.com' }]);
    sdk.user = null;
    b.onUser(u => seen.push(u));
    expect(seen[1]).toBeNull();
    await b.signIn();
    expect(auth.signInWithPopup).toHaveBeenCalledWith({ name: 'auth' }, expect.any(auth.GoogleAuthProvider));
    await b.signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("keeps each player's save in saves/{uid}", async () => {
    const { createBackend } = await import('../src/firebase');
    const b = createBackend();
    expect(await b.read('u1')).toBeNull();
    sdk.doc = { data: '{"v":4}', savedAt: 42 };
    expect(await b.read('u1')).toEqual({ data: '{"v":4}', savedAt: 42 });
    await b.write('u1', { data: '{"v":4}', savedAt: 43 });
    expect(sdk.set).toEqual([[{ path: 'saves/u1' }, { data: '{"v":4}', savedAt: 43, updated: 'server-time' }]]);
  });

  it('keeps the scoreboard in scores/{uid}, never lowering a best a player already had', async () => {
    const { createBackend } = await import('../src/firebase');
    const b = createBackend();
    await b.postScore({ uid: 'u1', name: 'Pat Smith', best: 500, stage: 1 });
    sdk.score = { name: 'Pat Smith', best: 9000, stage: 2 }; // before a Restart
    await b.postScore({ uid: 'u1', name: 'Pat Smith', best: 700, stage: 1 });
    expect(sdk.set).toEqual([
      [{ path: 'scores/u1' }, { name: 'Pat Smith', best: 500, stage: 1, updated: 'server-time' }],
      [{ path: 'scores/u1' }, { name: 'Pat Smith', best: 9000, stage: 2, updated: 'server-time' }],
    ]);
  });

  it('reads the top of the scoreboard, best first', async () => {
    const fs = await import('firebase/firestore');
    const { createBackend } = await import('../src/firebase');
    sdk.scores = [{ id: 'u2', data: { name: 'Sam', best: 800, stage: 2 } }, { id: 'u1', data: { name: 'Pat Smith', best: 90, stage: 1 } }];
    expect(await createBackend().topScores(20)).toEqual([
      { uid: 'u2', name: 'Sam', best: 800, stage: 2 }, { uid: 'u1', name: 'Pat Smith', best: 90, stage: 1 },
    ]);
    expect(fs.query).toHaveBeenCalledWith({ col: 'scores' }, { orderBy: ['best', 'desc'] }, { limit: 20 });
  });

  it("files a report in reports/ together with the player's count in limits/{uid}", async () => {
    const { createBackend } = await import('../src/firebase');
    const b = createBackend();
    const r = { id: 'r1', kind: 'bug' as const, text: 'Stuck', build: 'abc', device: '{}', errors: '[]', save: undefined };
    const fields = { kind: 'bug', text: 'Stuck', build: 'abc', device: '{}', errors: '[]', uid: 'u1', at: 'server-time', status: 'new' };
    // the first report: a new count
    await b.sendReport('u1', r);
    // within the hour: the count goes on from where it was
    const since = { toMillis: () => Date.now() - 1_800_000 };
    sdk.doc = { since, n: 3 } as never;
    await b.sendReport('u1', r);
    // an hour on: the count starts again
    sdk.doc = { since: { toMillis: () => Date.now() - 4_000_000 }, n: 5 } as never;
    await b.sendReport('u1', { ...r, shot: 'data:image/jpeg;base64,AA' });
    const fresh = { last: 'server-time', since: 'server-time', n: 1 };
    expect(sdk.batch).toEqual([
      [[{ path: 'reports/r1' }, fields], [{ path: 'limits/u1' }, fresh]],
      [[{ path: 'reports/r1' }, fields], [{ path: 'limits/u1' }, { last: 'server-time', since, n: 4 }]],
      [[{ path: 'reports/r1' }, { ...fields, shot: 'data:image/jpeg;base64,AA' }], [{ path: 'limits/u1' }, fresh]],
    ]);
  });
});
