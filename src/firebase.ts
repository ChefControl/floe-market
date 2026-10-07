// Cloud saves on Firebase: Google sign-in, and each player's save as one Firestore document, saves/{uid}.
// cloud.ts loads this only once cloud saves are in use, so players who never sign in don't download it.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CloudBackend } from './cloud';
import { firebaseConfig } from './cloud.config';

export function createBackend(): CloudBackend {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app), db = getFirestore(app);
  const ref = (uid: string) => doc(db, 'saves', uid);
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
  };
}
