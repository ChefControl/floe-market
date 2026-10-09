// How two phones playing together talk (coop.ts): a room the host opens, named by a short code, that a guest joins
// with it. Over the internet that's Firebase's Realtime Database (rooms.ts); here are two more for trying co-op out:
// two tabs of one browser (`?coop=tabs`), and two copies of the game in one test.

/** A message between the phones: anything JSON can carry. */
export type Msg = { k: string } & Record<string, unknown>;

/** The host's end of a room. */
export interface HostEnd {
  /** The room's code, for the invite link. */
  code: string;
  /** To every guest in the room (`to` in a message picks one out). */
  send(m: Msg): void;
  /** A guest came into the room, or went (closed the game, lost their connection). */
  onJoin: (uid: string) => void;
  onLeave: (uid: string) => void;
  onMsg: (uid: string, m: Msg) => void;
  /** Closes the room. */
  close(): void;
}

/** A guest's end of a room. */
export interface GuestEnd {
  /** Who this phone is signed in as. */
  uid: string;
  send(m: Msg): void;
  onMsg: (m: Msg) => void;
  /** The host closed the room. */
  onGone: () => void;
  /** This phone's connection came back after dropping (the host saw it go). */
  onBack: () => void;
  close(): void;
}

/** Somewhere rooms are: opening one, or joining one by its code (which fails if there's no such room). */
export interface Rooms {
  open(): Promise<HostEnd>;
  join(code: string): Promise<GuestEnd>;
}

/** Room codes: six letters and digits, leaving out the ones easily mixed up (0 and O, 1 and I). */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode(rnd: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) {
  let s = '';
  for (let i = 0; i < 6; i++) s += CHARS[Math.floor(rnd() * CHARS.length)];
  return s;
}
/** A code as typed or pasted, tidied; null if it can't be one. */
export function cleanCode(s: string | null) {
  const c = (s ?? '').trim().toUpperCase();
  return /^[A-Z2-9]{6}$/.test(c) ? c : null;
}

const noop = () => {};
/** Through JSON and back, as over the wire, so neither side shares an object with the other; and nothing that
 *  couldn't go between tabs (a function, say, in a three.js object sent by mistake). */
const wire = (m: Msg) => JSON.parse(JSON.stringify(structuredClone(m))) as Msg;

/** Rooms in memory, for two copies of the game in one test. Messages arrive at once. */
export function memoryRooms() {
  const rooms = new Map<string, { host: HostEnd; guests: Map<string, GuestEnd> }>();
  let n = 0;
  const api = {
    /** Who the next guest to join is. */
    as: 'guest',
    /** How many of the host's next messages to lose on the way, as a dropped connection might. */
    drop: 0,
    async open(): Promise<HostEnd> {
      const code = newCode(() => (n++ * 0.37) % 1);
      const guests = new Map<string, GuestEnd>();
      const host: HostEnd = {
        code, onJoin: noop, onLeave: noop, onMsg: noop,
        send: m => {
          if (api.drop > 0) { api.drop--; return; }
          for (const [uid, g] of guests) if (!m.to || m.to === uid) g.onMsg(wire(m));
        },
        close: () => { rooms.delete(code); for (const g of guests.values()) g.onGone(); guests.clear(); },
      };
      rooms.set(code, { host, guests });
      return host;
    },
    async join(code: string): Promise<GuestEnd> {
      const r = rooms.get(code);
      if (!r) throw new Error('no-room');
      const uid = api.as;
      const g: GuestEnd = {
        uid, onMsg: noop, onGone: noop, onBack: noop,
        send: m => { if (r.guests.get(uid) === g) r.host.onMsg(uid, wire(m)); },
        close: () => { if (r.guests.get(uid) !== g) return; r.guests.delete(uid); r.host.onLeave(uid); },
      };
      r.guests.set(uid, g);
      r.host.onJoin(uid);
      return g;
    },
  };
  return api;
}

/** Rooms between tabs of one browser, for trying co-op out without signing in: open the game twice. */
export function tabRooms(): Rooms {
  const chan = (code: string) => new BroadcastChannel('floe-coop-' + code);
  return {
    async open() {
      const code = newCode(), c = chan(code);
      const host: HostEnd = {
        code, onJoin: noop, onLeave: noop, onMsg: noop,
        send: m => c.postMessage({ from: 'host', m }),
        close: () => { c.postMessage({ from: 'host', gone: true }); c.close(); },
      };
      c.onmessage = e => {
        const { from, m, join, leave } = e.data as { from: string; m?: Msg; join?: boolean; leave?: boolean };
        if (from === 'host') return;
        if (join) { host.onJoin(from); c.postMessage({ from: 'host', here: from }); }
        else if (leave) host.onLeave(from);
        else if (m) host.onMsg(from, m);
      };
      return host;
    },
    join(code: string) {
      const c = chan(code), uid = 'tab-' + newCode();
      return new Promise<GuestEnd>((resolve, reject) => {
        const g: GuestEnd = {
          uid, onMsg: noop, onGone: noop, onBack: noop,
          send: m => c.postMessage({ from: uid, m }),
          close: () => { c.postMessage({ from: uid, leave: true }); c.close(); },
        };
        const wait = setTimeout(() => { c.close(); reject(new Error('no-room')); }, 3000);
        c.onmessage = e => {
          const { from, m, here, gone } = e.data as { from: string; m?: Msg; here?: string; gone?: boolean };
          if (from !== 'host') return;
          if (here === uid) { clearTimeout(wait); resolve(g); } else if (gone) g.onGone(); else if (m) g.onMsg(m);
        };
        addEventListener('pagehide', () => g.close());
        c.postMessage({ from: uid, join: true });
      });
    },
  };
}
