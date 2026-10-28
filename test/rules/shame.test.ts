// firestore.rules for the wall of shame, against the Firestore emulator: `npm run test:rules` (needs Java). Anyone can
// read it; a signed-in player can only put up their own worst bet, only ever swap it for a worse one, and take it down.
import { readFileSync } from 'node:fs';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-floe-market', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const player = (uid = 'u1') => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const nobody = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
/** A worst bet, the way firebase.ts puts it up. */
const bet = (over: Record<string, unknown> = {}) => ({
  name: 'Pat Smith', lost: 9_900_000, game: 'roulette', on: 'black', broke: true, at: 1_790_000_000_000,
  updated: serverTimestamp(), ...over,
});
const shame = (db: Firestore, uid = 'u1') => doc(db, 'shame', uid);

describe('the wall of shame', () => {
  it("a signed-in player can put up their own worst bet, with or without what it was on, but nobody else's", async () => {
    await assertSucceeds(setDoc(shame(player()), bet()));
    const { on: _, ...bare } = bet({ game: 'slots' });
    await assertSucceeds(setDoc(shame(player('u2'), 'u2'), bare));
    await assertFails(setDoc(shame(player('u2'), 'u1'), bet({ lost: 1e12 })));
    await assertFails(setDoc(shame(nobody(), 'u3'), bet()));
  });

  it('only ever swaps it for a worse one', async () => {
    const db = player();
    await assertSucceeds(setDoc(shame(db), bet({ lost: 500 })));
    await assertFails(setDoc(shame(db), bet({ lost: 499 })));
    await assertSucceeds(setDoc(shame(db), bet({ lost: 500, name: 'Pat' })));
    await assertSucceeds(setDoc(shame(db), bet({ lost: 2_000 })));
  });

  it("a signed-in player can take their own down, but nobody else's", async () => {
    await assertSucceeds(setDoc(shame(player()), bet()));
    await assertFails(deleteDoc(shame(player('u2'), 'u1')));
    await assertFails(deleteDoc(shame(nobody(), 'u1')));
    await assertSucceeds(deleteDoc(shame(player())));
    expect((await getDoc(shame(nobody()))).exists()).toBe(false);
  });

  it('turns away a bet that is missing something, has something extra, or is wrong', async () => {
    const db = player(), { broke: _, ...noBroke } = bet();
    for (const b of [
      noBroke, bet({ cheat: true }), bet({ lost: 0 }), bet({ lost: '9' }), bet({ game: 'poker' }), bet({ on: 'a'.repeat(13) }),
      bet({ name: 'x'.repeat(41) }), bet({ broke: 'yes' }), bet({ at: 'today' }),
    ]) await assertFails(setDoc(shame(db), b));
  });

  it('anyone can read it, the top 50 at most at a time', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore() as unknown as Firestore, 'shame', 'u1'), bet()));
    const db = nobody();
    await assertSucceeds(getDoc(shame(db)));
    await assertSucceeds(getDocs(query(collection(db, 'shame'), orderBy('lost', 'desc'), limit(10))));
    await assertFails(getDocs(query(collection(db, 'shame'), orderBy('lost', 'desc'), limit(51))));
  });
});
