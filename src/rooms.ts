// Co-op's rooms over the internet (link.ts): Firebase's Realtime Database, one record a room, rooms/{code}. The
// host's phone writes who's hosting, and its messages one after another under fromHost, keeping only the last few.
// A guest adds themselves to guests, and writes to fromPlayer/{their uid}: what they're pressing (one record,
// written over and over) and anything else, one after another. database.rules.json says who may write where. Both
// players are signed in with Google (cloud.ts). Like firebase.ts, this is fetched only once co-op is in use.
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  child, get, getDatabase, onChildAdded, onChildRemoved, onDisconnect, onValue, orderByKey, push, query, ref, remove,
  serverTimestamp, set, startAfter, type DatabaseReference, type Unsubscribe,
} from 'firebase/database';
import { firebaseConfig } from './cloud.config';
import { newCode, type GuestEnd, type HostEnd, type Msg, type Rooms } from './link';

/** How many of its messages the host keeps in the room: a couple of seconds' worth, for a guest who drops out. */
export const KEEP = 20;
const noop = () => {};
const read = (v: unknown) => JSON.parse(String(v)) as Msg;
/** Messages added after about now (push keys go up with the server's clock), not the ones already there. */
const fromNow = (r: DatabaseReference) => query(r, orderByKey(), startAfter(push(r).key));

export function createRooms(): Rooms {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app), db = getDatabase(app);
  const uid = () => {
    const u = auth.currentUser;
    if (!u) throw new Error('signed-out');
    return u.uid;
  };
  return {
    async open() {
      const me = uid();
      let code = newCode(), room = ref(db, 'rooms/' + code);
      while ((await get(child(room, 'host'))).exists()) { code = newCode(); room = ref(db, 'rooms/' + code); }
      await set(child(room, 'host'), me);
      await set(child(room, 'created'), serverTimestamp());
      const out = child(room, 'fromHost'), kept: string[] = [];
      /** What's being listened to, for each guest in the room. */
      const ears = new Map<string, Unsubscribe[]>();
      const deaf = (g: string) => { ears.get(g)?.forEach(f => f()); ears.delete(g); };
      const host: HostEnd = {
        code, onJoin: noop, onLeave: noop, onMsg: noop,
        send: m => {
          kept.push(push(out, JSON.stringify(m)).key!);
          if (kept.length > KEEP) remove(child(out, kept.shift()!)).catch(noop);
        },
        close: () => {
          offs.forEach(f => f());
          [...ears.keys()].forEach(deaf);
          remove(room).catch(noop);
        },
      };
      const guests = child(room, 'guests');
      /** The last of each guest's messages handled: one who comes back finds their earlier ones still there. */
      const done = new Map<string, string>();
      const offs = [
        onChildAdded(guests, s => {
          const g = s.key!, from = child(room, 'fromPlayer/' + g);
          deaf(g);
          ears.set(g, [
            onValue(child(from, 'in'), v => { if (v.exists()) host.onMsg(g, read(v.val())); }),
            // all of them, in order: a filter by time would lose the first, sent as the guest's phone joined
            onChildAdded(child(from, 'q'), v => {
              if (v.key! <= (done.get(g) ?? '')) return;
              done.set(g, v.key!);
              host.onMsg(g, read(v.val()));
            }),
          ]);
          host.onJoin(g);
        }),
        onChildRemoved(guests, s => { deaf(s.key!); host.onLeave(s.key!); }),
      ];
      return host;
    },

    async join(code) {
      const me = uid(), room = ref(db, 'rooms/' + code);
      if (!(await get(child(room, 'host'))).exists()) throw new Error('no-room');
      const here = child(room, 'guests/' + me), mine = child(room, 'fromPlayer/' + me);
      let was = false;
      const g: GuestEnd = {
        uid: me, onMsg: noop, onGone: noop, onBack: noop,
        send: m => {
          // what they're pressing is only ever needed as it is now
          const w = m.k === 'in' ? set(child(mine, 'in'), JSON.stringify(m)) : push(child(mine, 'q'), JSON.stringify(m));
          w.catch(noop);
        },
        close: () => { offs.forEach(f => f()); remove(here).catch(noop); },
      };
      const offs = [
        onChildAdded(fromNow(child(room, 'fromHost')), v => g.onMsg(read(v.val()))),
        onValue(child(room, 'host'), s => { if (!s.exists()) g.onGone(); }),
      ];
      // In the room for as long as this phone's connected: back in when it reconnects, telling the host again.
      await new Promise<void>((resolve, reject) => {
        offs.push(onValue(ref(db, '.info/connected'), s => {
          if (s.val() !== true) return;
          onDisconnect(here).remove().catch(noop);
          set(here, true).then(() => {
            if (was) g.onBack(); else resolve();
            was = true;
          }, (e: unknown) => { if (!was) { offs.forEach(f => f()); reject(e); } });
        }));
      });
      return g;
    },
  };
}
