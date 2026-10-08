// Cloud saves on Firebase: Google sign-in, and each player's save as one Firestore document, saves/{uid}. The
// scoreboard is one more document per player, scores/{uid}, which anyone can read.
// cloud.ts loads this only once cloud saves are in use, so players who never sign in don't download it.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, runTransaction, serverTimestamp, setDoc,
} from 'firebase/firestore';
import type { CloudBackend } from './cloud';
import { firebaseConfig } from './cloud.config';

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
          name: s.name, best: Math.max(s.best, Number(was?.best) || 0), stage: Math.max(s.stage, Number(was?.stage) || 1),
          updated: serverTimestamp(),
        });
      });
    },
    async topScores(n) {
      const q = await getDocs(query(collection(db, 'scores'), orderBy('best', 'desc'), limit(n)));
      return q.docs.map(d => {
        const v = d.data();
        return { uid: d.id, name: String(v.name), best: Number(v.best) || 0, stage: v.stage === 2 ? 2 : 1 };
      });
    },
  };
}
