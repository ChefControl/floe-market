// firestore.rules for bug reports, against the Firestore emulator: `npm run test:rules` (needs Java). Players signed in
// with Google can add a report, a couple of minutes and at most 10 a day apart, and nobody can read one back.
import { readFileSync } from 'node:fs';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-floe-market', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await admin(db => setDoc(doc(db, 'config', 'reports'), { open: true }));
});

const admin = (f: (db: Firestore) => Promise<unknown>) =>
  env.withSecurityRulesDisabled(c => f(c.firestore() as unknown as Firestore).then(() => {}));
const google = (uid = 'u1') => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore() as unknown as Firestore;
const ago = (min: number) => Timestamp.fromMillis(Date.now() - min * 60_000);

const report = (over: Record<string, unknown> = {}) => ({
  uid: 'u1', at: serverTimestamp(), status: 'new', kind: 'bug', text: 'The fish fell through the ice', build: 'abc123',
  device: '{"fps":60}', errors: '[]', live: '{"x":1}', save: '{"v":4}', shot: 'data:image/jpeg;base64,/9j/4AAQ', ...over,
});
/** A report and the player's count, as firebase.ts sends them. */
let next = 0;
/** A report's name, the way the game makes them: 20 letters and digits. */
const newId = () => ('r' + String(++next)).padEnd(20, 'x');
function send(db: Firestore, r: Record<string, unknown> = report(), lim: Record<string, unknown> | null = { last: serverTimestamp(), since: serverTimestamp(), n: 1 }, uid = 'u1', id = newId()) {
  const b = writeBatch(db);
  b.set(doc(db, 'reports', id), r);
  if (lim) b.set(doc(db, 'limits', uid), lim);
  return b.commit();
}
const counted = (since: Timestamp, n: number) => ({ last: serverTimestamp(), since, n });

describe('bug reports', () => {
  it('a player signed in with Google can send one, with or without the picture and game state', async () => {
    await assertSucceeds(send(google()));
    await admin(db => setDoc(doc(db, 'limits', 'u2'), { last: ago(3), since: ago(60), n: 1 }));
    const bare = Object.fromEntries(Object.entries(report({ uid: 'u2' })).filter(([k]) => !['live', 'save', 'shot'].includes(k)));
    await assertSucceeds(send(google('u2'), bare, counted(ago(60), 2), 'u2'));
  });

  it("can't be read, changed or deleted by any player, even the one who sent it", async () => {
    await admin(db => setDoc(doc(db, 'reports', 'mine'), { uid: 'u1', text: 'hi' }));
    const db = google();
    await assertFails(getDoc(doc(db, 'reports', 'mine')));
    await assertFails(updateDoc(doc(db, 'reports', 'mine'), { text: 'changed' }));
    await assertFails(deleteDoc(doc(db, 'reports', 'mine')));
  });

  it('needs a Google sign-in, as the player it says it is from', async () => {
    await assertFails(send(env.unauthenticatedContext().firestore() as unknown as Firestore));
    await assertFails(send(env.authenticatedContext('u1', { firebase: { sign_in_provider: 'anonymous' } }).firestore() as unknown as Firestore));
    await assertFails(send(google('u2'), report(), undefined, 'u2'));
  });

  it("must go with the player's count, under a name like the game's", async () => {
    await assertFails(send(google(), report(), null));
    await assertFails(send(google(), report(), undefined, 'u1', 'short'));
    await assertFails(send(google(), report(), undefined, 'u1', 'has-a-dash-in-its-nm'));
  });

  it('is turned away when reports are switched off, or missing the switch', async () => {
    await admin(db => setDoc(doc(db, 'config', 'reports'), { open: false }));
    await assertFails(send(google()));
    await admin(db => deleteDoc(doc(db, 'config', 'reports')));
    await assertFails(send(google()));
  });

  it('holds only the fields a report has, each the right kind and size', async () => {
    const db = google();
    await assertFails(send(db, report({ extra: 1 })));
    await assertFails(send(db, report({ kind: 'rant' })));
    await assertFails(send(db, report({ text: '' })));
    await assertFails(send(db, report({ text: 'x'.repeat(1001) })));
    await assertFails(send(db, report({ status: 'filed' })));
    await assertFails(send(db, report({ at: ago(1) })));
    await assertFails(send(db, report({ save: 'x'.repeat(100_000) })));
    await assertFails(send(db, report({ shot: 'https://example.com/x.jpg' })));
    await assertFails(send(db, report({ shot: 'data:image/jpeg;base64,' + 'A'.repeat(200_000) })));
    await assertFails(send(db, report({ errors: 5 })));
    await assertSucceeds(send(db, report({ text: 'x'.repeat(1000) })));
  });
});

describe('the count that spaces reports out', () => {
  it('turns away a report within 2 minutes of the last', async () => {
    await admin(db => setDoc(doc(db, 'limits', 'u1'), { last: ago(1), since: ago(60), n: 1 }));
    await assertFails(send(google(), report(), counted(ago(60), 2)));
    await admin(db => setDoc(doc(db, 'limits', 'u1'), { last: ago(3), since: ago(60), n: 1 }));
    await assertSucceeds(send(google(), report(), counted(ago(60), 2)));
  });

  it('allows 10 a day, then starts again a day after the count began', async () => {
    const since = ago(600);
    await admin(db => setDoc(doc(db, 'limits', 'u1'), { last: ago(3), since, n: 10 }));
    await assertFails(send(google(), report(), counted(since, 11)));
    // the count can't be started over before the day is out, or skipped back
    await assertFails(send(google(), report()));
    await assertFails(send(google(), report(), counted(since, 10)));
    await admin(db => setDoc(doc(db, 'limits', 'u1'), { last: ago(3), since: ago(25 * 60), n: 10 }));
    await assertSucceeds(send(google(), report()));
  });

  it("can be read by its own player only, and holds only the count's fields", async () => {
    await admin(db => setDoc(doc(db, 'limits', 'u1'), { last: ago(3), since: ago(60), n: 1 }));
    await assertSucceeds(getDoc(doc(google(), 'limits', 'u1')));
    await assertFails(getDoc(doc(google('u2'), 'limits', 'u1')));
    await assertFails(send(google(), report(), { ...counted(ago(60), 2), extra: true }));
  });
});
