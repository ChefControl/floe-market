// Co-op: two players in one game, each on their own phone. The host's phone runs the game as ever, with a second
// player in it, moved from the guest's phone. Ten times a second it sends the guest's phone what changed: the 3D scene
// (mirror.ts), the numbers behind the HUD and the panels (money, ratings, upgrades, the season), and what to show or
// play there too (toasts, sounds, money rising off a counter). The guest's phone draws that, walks its own player
// round it (so walking never waits on the internet), and sends back where its player is and whether they're buying.
// Buying an upgrade level or betting at the roulette table is asked of the host's phone, where the money is.
//
// Both phones build the same scene while loading (boot.ts), and the guest's phone never loads its own save: only the
// host's game is played and saved. The rooms the phones meet in are link.ts's.
import { Mesh } from 'three';
import { updAmbience } from './ambience';
import { updAudio } from './audio';
import { endBoot, BASE } from './boot';
import { updBuy } from './buy';
import { animPerson, Person } from './characters';
import { casinoOpen, casinoTable, moveCasino, spinFor, spun, updCasino } from './casino';
import { repriceFish } from './counters';
import { MODS, mods, type ModId } from './economy';
import { updFarm } from './farm';
import { wiggle } from './fishing';
import { setTableRows, tableRows } from './garden';
import { updRoof } from './hall';
import { buyHeld, inputVec } from './input';
import { kindOf } from './items';
import { korkiStands, korkiStatue, moveKorki, updKorki } from './korki';
import { kioskBooth, shedYard, stage } from './layout';
import type { GuestEnd, HostEnd, Msg, Rooms } from './link';
import { captureBoundary, Decoder, Encoder, nid, type Boundary, type Delta, type People } from './mirror';
import { updMusic } from './music';
import { boop, newPlayer, player, players, SHIRTS, type Player } from './player';
import { footsteps, movePlayer, tileUnder, tipFor } from './playerUpdate';
import { pointAt } from './pointers';
import { pileCover, PRESENT, presents, redrawPresentTile } from './presents';
import { reviews } from './rating';
import { coop } from './remote';
import { rainK, updHouse } from './rain';
import { scene } from './render';
import { repriceSushi, sushi } from './restaurant';
import { field, fieldStack } from './rice';
import type { Bet } from './roulette';
import { season, setSeason, updSeason } from './season';
import { SHARED } from './sfx';
import { updShop, buyMod } from './shop';
import { moodNow, setMood, setStaging, staging, view, widenShadows } from './stage';
import { pile } from './stations';
import { banner, confetti, popStars, popText, setTip, toast } from './ui';
import { locked, moveKorkiTile, redrawTile, showProgress, tiles, updStars, type Tile } from './unlocks';
import { FY } from './util';
import { wallet } from './wallet';
import { updAds } from './ads';
import { updFloes } from './world';

/** Bumped whenever what the phones say to each other changes, so different versions don't try to play together. */
const PROTOCOL = 1;
/** Milliseconds between the host's messages, and between the guest's reports of where they are. */
export const SEND_EVERY = 100, INPUT_EVERY = 66;
/** A guest waits this long without hearing from the host before saying so, and gives up after this. */
export const QUIET = 3000, GIVE_UP = 5 * 60_000;

// ---------- both ----------
/** The scene as this phone built it while loading, before any save: what the mirror names things by. */
let boundary: Boundary | null = null;
/** Notes the scene as built. Call once the modules have loaded, before loading a save. */
export function noteBoot() {
  const end = endBoot();
  const counts = [end.o - BASE.o, end.g - BASE.g, end.m - BASE.m, end.t - BASE.t].join(',');
  boundary = captureBoundary(scene, player.g, counts);
  return boundary;
}
/** This phone's fingerprint of the scene as built, if it's been noted. */
export const bootPrint = () => boundary?.print ?? null;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * What the guest's phone shows besides the scene, in sections: each is sent when it changes. Money, reviews,
 * upgrade levels and tiles, the presents, the season, which stage and what's built (where the guest can walk), the
 * light and the camera through the stage-up, and the guest's own player (how much they carry and what, how fast).
 */
function world(p: Player): Record<string, unknown> {
  const pileUp = pileCover.z1 >= pileCover.z0;
  return {
    w: [wallet.money, wallet.best, wallet.inFlight],
    rv: reviews,
    md: mods,
    t: tiles.map(t => [t.paid, +t.done, +t.open]),
    pr: [presents.n, PRESENT.paid, pileUp ? [pileCover.x0, pileCover.z0, pileCover.z1] : 0],
    sn: [season.i, Math.floor(season.t)],
    fl: [stage.n, +staging(), +shedYard.open, +kioskBooth.open, +sushi.built, +!!korkiStatue(), +!!casinoTable(), ...tableRows().map(Number)],
    mo: Math.round(moodNow() * 1000),
    v: [view.zoom, view.k, view.focus.x, view.focus.z].map(r3),
    me: [p.back.cap, p.speed, ...p.back.items.map(nid)],
  };
}

// ---------- the host ----------
interface Guest {
  uid: string;
  name: string;
  p: Player;
  /** What to tell their phone with the next message. */
  told: [string, unknown[]][];
  /** Their phone needs everything, not just what's changed (it's just joined, or missed something). */
  key: boolean;
}
interface Hosting {
  end: HostEnd;
  enc: Encoder;
  guest: Guest | null;
  /** Message number; when the last was due, and when one last went; each world section as last sent. */
  seq: number;
  last: number;
  sentAt: number;
  sent: Record<string, string>;
  /** Players who've left, whose arms still have things landing in them, to put back. */
  gone: Player[];
}
let hosting: Hosting | null = null;
export const isHosting = () => !!hosting;
/** Who's playing along, if anyone. */
export const guestName = () => hosting?.guest?.name ?? null;

/** Opens a room for a friend to join. Resolves with its code. */
export async function host(rooms: Rooms) {
  if (!boundary) throw new Error('co-op needs noteBoot() before the save loads');
  if (hosting) return hosting.end.code;
  const end = await rooms.open();
  const h: Hosting = hosting = { end, enc: new Encoder(scene, boundary), guest: null, seq: 0, last: -Infinity, sentAt: -Infinity, sent: {}, gone: [] };
  coop.role = 'host';
  coop.relay = (what, args) => { h.guest?.told.push([what, args]); };
  end.onJoin = () => {}; // they say hello once their phone's ready (below)
  end.onLeave = uid => { if (h.guest?.uid === uid) leave(h, `${h.guest.name} left`); };
  end.onMsg = (uid, m) => heard(h, uid, m);
  return end.code;
}

/** Closes the room; a friend playing along goes back to their own game. */
export function stopHosting() {
  const h = hosting;
  if (!h) return;
  if (h.guest) leave(h, null);
  h.end.close();
  hosting = null;
  coop.role = 'solo';
  coop.relay = null;
}

/** A friend's player, built to look as their phone builds them, and moved from it. */
function guestPlayer(told: Guest['told']): Player {
  const p = newPlayer(SHIRTS.guest);
  p.back.cap = player.back.cap;
  p.speed = player.speed;
  const at = p.g.position;
  p.remote = { buy: false, at: { x: at.x, y: at.y, z: at.z }, h: 0, moving: false, tell: (what, args = []) => { told.push([what, args]); } };
  players.push(p);
  scene.add(p.g);
  return p;
}

function heard(h: Hosting, uid: string, m: Msg) {
  const g = h.guest;
  if (m.k === 'hi') {
    if (m.v !== PROTOCOL || m.print !== boundary!.print) { h.end.send({ k: 'no', to: uid, why: 'version' }); return; }
    if (g && g.uid !== uid) { h.end.send({ k: 'no', to: uid, why: 'full' }); return; }
    const name = String(m.name || 'A friend').slice(0, 40);
    if (!g) {
      const told: Guest['told'] = [];
      h.guest = { uid, name, p: guestPlayer(told), told, key: true };
      toast(`${name} joined your game`, 'coop');
    } else g.key = true; // back after dropping out
    h.end.send({ k: 'welcome', to: uid, me: nid(h.guest!.p.g) });
    return;
  }
  if (!g || g.uid !== uid) return;
  const r = g.p.remote!;
  if (m.k === 'in') {
    r.at = { x: Number(m.x) || 0, y: Number(m.y) || 0, z: Number(m.z) || 0 };
    r.h = Number(m.h) || 0;
    r.moving = m.mv === 1;
    r.buy = m.b === 1;
  } else if (m.k === 'sync') g.key = true;
  else if (m.k === 'bye') leave(h, `${g.name} left`);
  else if (m.k === 'mod' && MODS.some(x => x.id === m.id)) buyMod(m.id as ModId);
  else if (m.k === 'spin') {
    const b = m.bet as Bet | null;
    r.tell('spun', [typeof b?.kind === 'string' ? spinFor(b, Number(m.stake)) : null]);
  }
}

/** A friend's gone: their player goes, and what they were carrying goes back where it came from. */
function leave(h: Hosting, news: string | null) {
  const p = h.guest!.p;
  h.guest = null;
  players.splice(players.indexOf(p), 1);
  scene.remove(p.g);
  h.gone.push(p);
  putBack(h);
  if (news) toast(news, 'coop');
}
function putBack(h: Hosting) {
  for (const p of h.gone) {
    for (let m = p.back.take(); m; m = p.back.take()) {
      const to = kindOf(m) === 'rice' ? (field.built ? fieldStack : null) : pile;
      if (to?.hasRoom()) to.receive(m, 0.5, 2); else scene.remove(m);
    }
  }
  h.gone = h.gone.filter(p => p.back.inbound.length);
}

/** Sends the guest's phone what's changed, ten times a second. Call every frame, after the game's tick. */
export function hostStep(now: number) {
  const h = hosting;
  if (!h) return;
  if (h.gone.length) putBack(h);
  const g = h.guest;
  if (!g || now - h.last < SEND_EVERY) return;
  h.last = now;
  const key = g.key;
  if (key) { h.enc.reset(); h.sent = {}; g.key = false; }
  const d = h.enc.encode(now), st: Record<string, unknown> = {};
  let changed = false;
  for (const [k, v] of Object.entries(world(g.p))) {
    const s = JSON.stringify(v);
    if (h.sent[k] !== s) { h.sent[k] = s; st[k] = v; changed = true; }
  }
  const told = g.told.splice(0);
  // something every second at least, so their phone knows this one's still here
  if (!key && !d && !changed && !told.length && now - h.sentAt < 1000) return;
  h.end.send({ k: 'd', s: ++h.seq, ...(key ? { kf: 1 } : {}), d, st, e: told });
  h.sentAt = now;
}

// ---------- the guest ----------
/** What a guest's phone sees: joining, playing, the host gone quiet, or out of the game (and why). */
export type GuestState = 'joining' | 'playing' | 'waiting' | 'version' | 'full' | 'gone' | 'quiet';
interface Joined {
  end: GuestEnd;
  dec: Decoder;
  state: GuestState;
  /** The last message's number; whether a keyframe's come since joining or missing something. */
  seq: number;
  synced: boolean;
  /** The time of this phone's latest frame; when the host was last heard from, and this phone last said where its
   *  player is. */
  clock: number;
  heard: number;
  said: number;
  saidWhat: string;
  /** The ids of what the guest's player carries, in the host's game. */
  carried: number[];
  /** The tiles on offer last frame, to point the way to new ones. */
  offer: Set<Tile> | null;
  onState: (s: GuestState) => void;
}
let joined: Joined | null = null;
export const guestState = () => joined?.state ?? null;

/** How the guest's phone builds people the host's game has (characters.ts), and dresses one as the singer. */
const people: People = {
  make: (c, look, style) => new Person(c, look as Person['look'], style as Person['style']),
  disguise: (p, on) => { p.disguised = on; p.wear(); },
};

/** Joins the game in room `code` as `name`. `onState` hears how it's going. */
export async function join(rooms: Rooms, code: string, name: string, onState: (s: GuestState) => void = () => {}) {
  if (!boundary) throw new Error('co-op needs noteBoot() first');
  const end = await rooms.join(code);
  const j: Joined = joined = {
    end, dec: new Decoder(scene, boundary, people, player.g), state: 'joining', seq: 0, synced: false,
    clock: performance.now(), heard: performance.now(), said: -Infinity, saidWhat: '', carried: [], offer: null, onState,
  };
  coop.role = 'guest';
  coop.ask = (what, args) => {
    if (what === 'mod') end.send({ k: 'mod', id: args[0] });
    else if (what === 'spin') end.send({ k: 'spin', bet: args[0], stake: args[1] });
  };
  const hello = () => end.send({ k: 'hi', v: PROTOCOL, print: boundary!.print, name });
  end.onMsg = m => got(j, m);
  end.onGone = () => to(j, 'gone');
  end.onBack = () => { j.synced = false; hello(); };
  hello();
  return j;
}

/** Leaves the game (the page is closing, or the player chose their own game). */
export function leaveGame() {
  if (!joined) return;
  joined.end.send({ k: 'bye' });
  joined.end.close();
}

function to(j: Joined, s: GuestState) {
  if (j.state === s) return;
  j.state = s;
  j.onState(s);
}

function got(j: Joined, m: Msg) {
  if (m.to && m.to !== j.end.uid) return;
  const now = j.clock;
  j.heard = now;
  if (m.k === 'no') { to(j, m.why === 'full' ? 'full' : 'version'); j.end.close(); return; }
  if (m.k === 'welcome') { j.dec.me = Number(m.me); return; }
  if (m.k !== 'd') return;
  const d = m.d as Delta | null, st = (m.st ?? {}) as Record<string, unknown>;
  if (m.kf) {
    j.synced = true;
    j.seq = Number(m.s);
    see(j, st, true);
    j.dec.key(d ?? { a: [], r: [], u: [], g: {}, m: {}, x: {}, mu: [], xu: [] }, now);
  } else {
    if (!j.synced) return;
    if (m.s !== j.seq + 1) {
      // missed something: ask for everything again, and wait for it
      j.synced = false;
      j.end.send({ k: 'sync' });
      return;
    }
    j.seq = Number(m.s);
    see(j, st, false);
    if (d) j.dec.apply(d, now);
  }
  hold(j);
  for (const [what, args] of (m.e ?? []) as [string, unknown[]][]) hear(what, args);
  if (j.state !== 'playing') to(j, 'playing');
}

/** The host's game as the HUD, the panels and walking need it (see world()). `first`: just joined, no fuss. */
function see(j: Joined, st: Record<string, unknown>, first: boolean) {
  const n = (k: string) => st[k] as number[];
  if (st.w) {
    const [money, best, inFlight] = n('w');
    if (money > wallet.money && !first) wallet.bumpT = 0.12;
    Object.assign(wallet, { money, best, inFlight });
  }
  if (st.rv) { reviews.length = 0; reviews.push(...n('rv')); updStars(true); }
  if (st.md) { Object.assign(mods, st.md); repriceFish(); repriceSushi(); }
  if (st.fl) {
    const [s, sg, sy, kb, su, ko, ca, ...rows] = n('fl');
    if (s === 2 && stage.n === 1) {
      // what the stage-up moves, where this phone needs to know (tiles to stand on, a statue to walk round)
      stage.n = 2;
      moveCasino(-2.2); moveKorki(); moveKorkiTile(); widenShadows();
    }
    setStaging(sg === 1);
    shedYard.open = sy === 1; kioskBooth.open = kb === 1; sushi.built = su === 1;
    if (ko) korkiStands();
    if (ca) casinoOpen();
    setTableRows(rows.map(Boolean));
  }
  if (st.t) {
    (st.t as number[][]).forEach(([paid, done, open], i) => {
      const t = tiles[i];
      if (t.paid === paid && t.done === (done === 1) && t.open === (open === 1)) return;
      Object.assign(t, { paid, done: done === 1, open: open === 1 });
      redrawTile(t);
    });
    updStars(true);
  }
  if (st.t || st.fl) showProgress();
  if (st.pr) {
    const [count, paid, cover] = st.pr as [number, number, number[] | 0];
    presents.n = count;
    if (PRESENT.paid !== paid) { PRESENT.paid = paid; redrawPresentTile(); }
    if (cover) [pileCover.x0, pileCover.z0, pileCover.z1] = cover;
  }
  if (st.sn) {
    const [i, t] = n('sn');
    if (i !== season.i) setSeason(i, t, first); else season.t = t;
  }
  if (st.mo !== undefined) setMood(Number(st.mo) / 1000);
  if (st.v) { const [zoom, k, x, z] = n('v'); Object.assign(view, { zoom, k }); view.focus.set(x, 0, z); }
  if (st.me) {
    const [cap, speed, ...carried] = n('me');
    player.back.cap = cap;
    player.speed = speed;
    j.carried = carried;
  }
}

/** This phone moves its own player and what they carry; the rest comes from the host's. */
function hold(j: Joined) {
  player.back.items = j.carried.map(i => j.dec.nodes.get(i)).filter((o): o is Mesh => o instanceof Mesh);
  j.dec.held = new Set([...player.g.own, ...player.back.items]);
}

/** Something to show or play on this phone too (see the coop.relay calls). */
function hear(what: string, a: unknown[]) {
  const xyz = a[1] as { x: number; y?: number; z: number };
  if (what === 'sfx') (SHARED[a[0] as string] as ((...x: unknown[]) => void) | undefined)?.(...a.slice(1));
  else if (what === 'toast') toast(a[0] as string, a[1] as string | undefined, a[2] as number | undefined);
  else if (what === 'pop') popText(a[0] as string, xyz, a[2] as string | undefined);
  else if (what === 'stars') popStars(a[0] as number, xyz);
  else if (what === 'banner') banner(a[0] as string | null, a[1] as string);
  else if (what === 'confetti') confetti();
  else if (what === 'hop') boop(player, { x: a[0] as number, z: a[1] as number });
  else if (what === 'spun') spun(a[0] as { result: number; win: number } | null);
  else (SHARED[what] as ((...x: unknown[]) => void) | undefined)?.(...a);
}

let time = 0;
/**
 * A guest's phone's frame, in place of the game's tick: the host's scene eases along, this phone's player walks, and
 * everything that's this phone's own (the panels, the tip and Buy button, the weather, the sounds) keeps up.
 */
export function guestTick(dt: number, now: number) {
  const j = joined;
  if (!j) return;
  j.clock = now;
  time += dt;
  if (j.state === 'playing' || j.state === 'waiting') {
    const quiet = now - j.heard;
    if (quiet > GIVE_UP) { to(j, 'quiet'); j.end.close(); } else to(j, quiet > QUIET ? 'waiting' : 'playing');
  }
  j.dec.frame(now);
  const p = player.g.position;
  movePlayer(player, inputVec(), dt);
  player.g.rotation.y = player.h;
  animPerson(player.g, player.moving, dt, player.back.n > 0);
  player.back.layout(player.h);
  footsteps();
  // the tip and the Buy button, for the tiles the host's game has out
  const offer = tiles.filter(t => t.d.mesh.visible && !t.done);
  const on = tileUnder(p, offer);
  setTip(tipFor(p, on));
  updBuy(!!on && !locked(on), dt);
  if (j.offer) for (const t of offer) if (!j.offer.has(t)) pointAt({ x: t.x, y: t.y ?? FY, z: t.z }, t.icon, () => t.d.mesh.visible);
  if (j.synced) j.offer = new Set(offer);
  updCasino(dt); updKorki(dt); updHouse(dt); updShop();
  // the seasons turn with the host's game: not on their own while it's away
  updSeason(j.state === 'playing' ? dt : 0, p, rainK);
  updFloes(time); wiggle(time); updFarm(dt); updAds(dt);
  updRoof(dt, p, staging());
  updAudio(dt, p); updAmbience(); updMusic(dt);
  // where this phone's player is, often enough for the host's to keep up, and at least every second
  if (now - j.said >= INPUT_EVERY && j.synced) {
    const m = { k: 'in', x: r2(p.x), y: r2(p.y), z: r2(p.z), h: r2(player.h), mv: +player.moving, b: +buyHeld() };
    const what = JSON.stringify(m);
    if (what !== j.saidWhat || now - j.said > 1000) { j.end.send(m); j.saidWhat = what; j.said = now; }
  }
}
