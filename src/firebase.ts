// Cloud saves on Firebase: Google sign-in, and each player's save as one Firestore document, saves/{uid}. The
// scoreboard is one more document per player, scores/{uid}, which anyone can read. A bug report is a document in
// reports/, which no player can read back; limits/{uid} counts each player's reports, 20 an hour (firestore.rules).
// The loading screen downloads this with the game (index.html); cloud.ts starts it only once cloud saves are in use.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, runTransaction, serverTimestamp, setDoc,
  writeBatch, type Timestamp,
} from 'firebase/firestore';
import type { CloudBackend } from './cloud';
/** An hour: how long a player's count of reports runs before it starts again (firestore.rules allows 20 in it). */
const WINDOW = 3_600_000;
import { firebaseConfig } from './cloud.config';
import type { StageN } from './layout';

export function createBackend(): CloudBackend {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app), db = getFirestore(app);
  const ref = (uid: string) => doc(db, 'saves', uid);
  const scoreRef = (uid: string) => doc(db, 'scores', uid);
  return {
    onUser: cb => { onAuthStateChanged(auth, u => cb(u && { uid: u.uid, name: u.displayName || u.email || 'you' })); },
    signIn: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
    signOut: () => signOut(auth),
    async read(uid) {
      const s = await getDoc(ref(uid));
      if (!s.exists()) return null;
      const d = s.data();
      return { data: String(d.data), savedAt: Number(d.savedAt) };
    },
    write: (uid, s) => setDoc(ref(uid), { data: s.data, savedAt: s.savedAt, updated: serverTimestamp() }),
    async postScore(s) {
      // a Restart starts the game over, but not the player's place on the scoreboard
      await runTransaction(db, async tx => {
        const was = (await tx.get(scoreRef(s.uid))).data();
        tx.set(scoreRef(s.uid), {
          name: s.name, best: Math.max(s.best, Number(was?.best) || 0), stage: Math.max(s.stage, Number(was?.stage) || 1) as StageN,
          updated: serverTimestamp(),
        });
      });
    },
    async topScores(n) {
      const q = await getDocs(query(collection(db, 'scores'), orderBy('best', 'desc'), limit(n)));
      return q.docs.map(d => {
        const v = d.data();
        return { uid: d.id, name: String(v.name), best: Number(v.best) || 0, stage: v.stage === 3 ? 3 : v.stage === 2 ? 2 : 1 };
      });
    },
    async sendReport(uid, { id, ...r }) {
      // the report and the player's count go together, so the rules can turn away one over the hour's quota
      const lim = doc(db, 'limits', uid), was = (await getDoc(lim)).data();
      const since = was?.since as Timestamp | undefined, now = serverTimestamp();
      const fresh = !since || Date.now() - since.toMillis() > WINDOW;
      const fields = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));
      const b = writeBatch(db);
      b.set(doc(db, 'reports', id), { ...fields, uid, at: now, status: 'new' });
      b.set(lim, fresh ? { last: now, since: now, n: 1 } : { last: now, since, n: Number(was?.n) + 1 });
      await b.commit();
    },
  };
}
