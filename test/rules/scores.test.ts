// firestore.rules for the scoreboard and the choice to keep off it, against the Firestore emulator: `npm run test:rules`
// (needs Java). Anyone can read the scoreboard; a signed-in player can only put up their own line and take it down. Their
// save says whether they keep off the scoreboards, and only they can change that.
import { readFileSync } from 'node:fs';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-floe-market', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const player = (uid = 'u1') => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const nobody = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
/** A line on the scoreboard, the way firebase.ts puts it up. */
const line = { name: 'Pat S.', best: 52_000, stage: 2, updated: serverTimestamp() };
const save = { data: '{"v":7}', savedAt: 1_790_000_000_000, updated: serverTimestamp() };

describe('the scoreboard', () => {
  it("a signed-in player can put up their own line, but nobody else's", async () => {
    await assertSucceeds(setDoc(doc(player(), 'scores', 'u1'), line));
    await assertFails(setDoc(doc(player('u2'), 'scores', 'u1'), line));
    await assertFails(setDoc(doc(nobody(), 'scores', 'u3'), line));
  });

  it("a signed-in player can take their own line down, but nobody else's", async () => {
    await assertSucceeds(setDoc(doc(player(), 'scores', 'u1'), line));
    await assertFails(deleteDoc(doc(player('u2'), 'scores', 'u1')));
    await assertFails(deleteDoc(doc(nobody(), 'scores', 'u1')));
    await assertSucceeds(deleteDoc(doc(player(), 'scores', 'u1')));
    expect((await getDoc(doc(nobody(), 'scores', 'u1'))).exists()).toBe(false);
  });
});

describe('keeping off the scoreboards', () => {
  it('the save keeps the choice, kept through later saves, and only the player can set it', async () => {
    const db = player();
    await assertSucceeds(setDoc(doc(db, 'saves', 'u1'), save));
    await assertSucceeds(setDoc(doc(db, 'saves', 'u1'), { hidden: true, updated: serverTimestamp() }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, 'saves', 'u1'), save, { merge: true }));
    expect((await getDoc(doc(db, 'saves', 'u1'))).data()?.hidden).toBe(true);
    await assertFails(setDoc(doc(db, 'saves', 'u1'), { hidden: 'yes' }, { merge: true }));
    await assertFails(setDoc(doc(player('u2'), 'saves', 'u1'), { hidden: false }, { merge: true }));
    await assertFails(deleteDoc(doc(db, 'saves', 'u1')));
  });

  it('taking both entries down goes with the choice, as firebase.ts sends it', async () => {
    const db = player();
    await setDoc(doc(db, 'saves', 'u1'), save);
    await setDoc(doc(db, 'scores', 'u1'), line);
    const b = writeBatch(db);
    b.set(doc(db, 'saves', 'u1'), { hidden: true, updated: serverTimestamp() }, { merge: true });
    b.delete(doc(db, 'scores', 'u1'));
    b.delete(doc(db, 'shame', 'u1'));
    await assertSucceeds(b.commit());
    expect((await getDoc(doc(db, 'scores', 'u1'))).exists()).toBe(false);
  });
});
