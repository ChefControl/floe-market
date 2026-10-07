// The Firebase side of cloud saves (firebase.ts), against stand-ins for the Firebase SDK.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  user: { uid: 'u1', displayName: null as string | null, email: 'pat@example.com' } as object | null,
  doc: null as { data: string; savedAt: number } | null,
  set: [] as unknown[],
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
}));

beforeEach(() => { sdk.doc = null; sdk.set = []; });

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
});
