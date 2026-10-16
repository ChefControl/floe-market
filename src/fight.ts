// Fight night (stage 3): the stew kitchen under the dock and the fans who eat from it, as a simulation of plain data.
// Rice and fish come down the dumbwaiter without end; the racks dry rice and the barrels salt fish, a few at a time,
// and (once the first boss is beaten) the grow room's beds grow mushrooms. The pot takes four of each ingredient there
// is and makes a batch of 20 bowls, which go out to the stall in the arena. 💪 is how many fans were fed in this bout's
// preparation.
//
// Every bout goes the same way: the fans come in and buy soup at the stall (preparation), take their seats round the
// ring, watch the fight, and go home. Between boss nights it's a local, the free show: as many fans come as the seats
// and word on the street bring, the ones who ate sit down to watch (the hungry give up and go home), and the champion
// wins. Ring the gong and the next boss walks in with his crowd instead, a horde that floods the floor in his colour:
// each one who eats a bowl before his bell switches sides, and the fight is a tug of war between his fans and yours,
// which the bigger side wins, every time: turning more than half of them beats him. Nothing in here is left to chance, so the gong can copy the whole cellar and run the
// rush ahead in the copy to say exactly how it would go (forecast). That's why it's
// all plain data: the hires' jobs are lists of steps, never closures. The player isn't in it: what they carry is
// theirs, and they hand things in through the functions at the bottom (cellarHands.ts). Only the forecast puts them in,
// as one more worker doing what a good player would (the mockup's "You"), from where they stand with what they carry.
//
// Money is Fugu Chips 🐡 down here: 1 chip is $1,000 of the same wallet.
import { boost } from './economy';
import { BAR_PAD, BIN_PADS, cellarWay, COOK_AT, COUNTER_PAD, HOME, type Ing, LEDGE, machinePad, MAX_MACHINES, POT_PAD } from './cellarPlan';
import type { Kind } from './creatures';
import type { XZ } from './util';

export type { Ing };
export const ING: Ing[] = ['rice', 'fish', 'mush'];
export const ICON: Record<Ing, string> = { rice: '🍚', fish: '🐟', mush: '🍄' };
/** What a stuck line's bubble asks for. */
export const WANT: Record<Ing, string> = { rice: '🌾', fish: '🐟', mush: '🍄' };
export const NAME: Record<Ing, string> = { rice: 'rice', fish: 'fish', mush: 'mushrooms' };

// ---------- the tables (tuned with the stage 3 bot: SIM_STAGE=3 in test/balance.sim.test.ts) ----------
/** Dollars to a chip. */
export const CHIP = 1000;
export interface MachineKind { name: string; cap: number; time: number }
/** Each line's machine, and the big upgrade that swaps them all: how many it holds, and seconds to make them ready. */
export const MACH: Record<Ing, [MachineKind, MachineKind]> = {
  rice: [{ name: 'Drying rack', cap: 6, time: 8 }, { name: 'Steam baskets', cap: 10, time: 5 }],
  fish: [{ name: 'Salt barrel', cap: 6, time: 8 }, { name: 'Smokehouse', cap: 10, time: 5 }],
  mush: [{ name: 'Mushroom bed', cap: 6, time: 8 }, { name: 'Glowing shelf', cap: 9, time: 4 }],
};
export interface Boss {
  face: string; name: string; crowd: number; bell: number; prize: number;
  /** The sea creature he is (creatures.ts), from his name. */
  kind: Kind;
  opens: string;
}
export const BOSSES: Boss[] = [
  { face: '🐙', name: 'Hakkaku', crowd: 120, bell: 30, prize: 120, kind: 'octopus', opens: 'the grow room and its first mushroom bed. Mushroom bowls pay double. The Back-Alley Ring' },
  { face: '🦀', name: 'Yokobashiri', crowd: 180, bell: 30, prize: 300, kind: 'crab', opens: 'the cook, steam baskets for rice, and a way out through the south wall' },
  { face: '🐟', name: 'Dobu', crowd: 220, bell: 30, prize: 800, kind: 'catfish', opens: 'the Underground Arena, the smokehouse for fish, and the attendant' },
  { face: '🦈', name: 'Samehada', crowd: 420, bell: 30, prize: 2000, kind: 'shark', opens: 'the Grand Hall Below, and glowing grow shelves' },
  { face: '🐡', name: 'Fukure', crowd: 1000, bell: 60, prize: 10000, kind: 'puffer', opens: 'the gold tile: buy back all his chips' },
];
export const TIERS = [
  { name: 'The Dock Cellar', seats: 24 },
  { name: 'The Back-Alley Ring', seats: 48 },
  { name: 'The Underground Arena', seats: 90 },
  { name: 'The Grand Hall Below', seats: 150 },
];
/** A batch of the pot, the bowls the stall and the counter hold, and how many of each ingredient the ledge holds. */
/** Seconds a boss's crowd takes to walk in from the back door to the stall, before his bell starts. */
export const WALK_IN = 6;
/** A batch: four of each ingredient in the pot makes twenty bowls (five a set, as when it took one of each, before the
 *  machines held four more). The pot holds two batches, ladled out onto the counter a bowl every LADLE seconds; the
 *  counter holds two batches too. */
export const PER_BATCH = 4, BATCH = 20, POT_CAP = 40, COUNTER_CAP = 40, STALL_CAP = 30, LEDGE_CAP = 40, LADLE = 0.1;
/** Chips a bowl sells for (mushroom bowls pay double), and what Mr. Fugu leaves of it until he's bought out. */
export const PRICE = 1.6, CUT = 0.7;
export type Role = 'washer' | 'salter' | 'picker' | 'cook' | 'attendant';
/** The player, in a forecast. */
export type WorkerRole = Role | 'you';
export const HIRES: Record<Role, { line?: Ing; name: string; cost: number; beat: number }> = {
  washer: { line: 'rice', name: 'Rice washer', cost: 15, beat: 0 },
  salter: { line: 'fish', name: 'Fish salter', cost: 20, beat: 0 },
  picker: { line: 'mush', name: 'Mushroom picker', cost: 120, beat: 1 },
  cook: { name: 'Cook', cost: 250, beat: 2 },
  attendant: { name: 'Attendant', cost: 500, beat: 3 },
};
/** The machine upgrades: chips, and bosses to beat first. */
export const UPS: Record<Ing, { cost: number; beat: number }> = { rice: { cost: 350, beat: 2 }, fish: { cost: 800, beat: 3 }, mush: { cost: 1500, beat: 4 } };
/** Another machine: the first extra's chips, each next one 45% more. */
export const MACH_COST: Record<Ing, number> = { rice: 10, fish: 12, mush: 25 }, MACH_STEP = 1.45;
export const TIER_COST = [0, 200, 900, 2500], TIER_BEAT = [0, 1, 3, 4];
export const BUYOUT = 12000;
/** A bout's phases: preparation (the fans buy soup; on a boss night, as long as his bell), taking their seats, the
 *  fight, and the result. */
export const BOUT = { prep: 20, sit: 5, fight: 15, pay: 7 };
/** How much of a local bout's preparation its fans take to walk in, and seconds each takes from their tunnel to the
 *  stall: nobody's served before they're at it (swarm.ts hurries anyone who'd be late). */
const ARRIVE = 0.6;
export const REACH = 6;
/** What a hire carries at a time (more once their line is upgraded), and the attendant's armful of bowls. */
const HIRE_LOAD = 12, HIRE_LOAD_UP = 36, ATTENDANT_BOWLS = 30;
/** A hire's walking speed before the Cellar crew upgrade, and seconds of each job at a station. */
const WALK = 3.0, DWELL = 0.35;
/** Seconds the player takes over each thing picked up or put down (cellarHands.ts's step). */
const HAND_STEP = 0.07;

// ---------- the state ----------
/** A machine: what's in it (each item's progress, 0 to 1; for a bed, how many are ready and the next one's progress),
 *  and what's on its way to it in a hire's arms. */
export interface Machine { items: number[]; coming: number; ready: number; p: number }
export interface Line { n: number; up: 0 | 1; m: Machine[] }
export type Carry = { k: Ing; ready: boolean; n: number } | { k: 'bowl'; bowls: boolean[] };
type Act = 'pick' | 'ledge' | 'bin' | 'fill' | 'drop' | 'cook' | 'take' | 'stall';
interface Step { to: XZ; act: Act; k?: Ing; i?: number; n?: number; done?: boolean }
export interface Worker {
  role: WorkerRole; x: number; z: number; h: number; moving: boolean;
  /** The player's own walking speed and arms, in a forecast. */
  speed?: number; cap?: number;
  path: XZ[]; steps: Step[]; carry: Carry | null;
  dwell: number; cooking: number; cookT: number; idle: number;
}
export interface Rush {
  /** Which boss, his crowd, how many are turned; seconds left of his crowd walking in to the stall, and seconds of his
   *  bell since (it starts once they're all there). */
  boss: number; n: number; turned: number; walk: number; t: number; lastTurn: number;
  /** Seconds the pot sat waiting on each ingredient, and the stall stood empty. */
  short: Record<Ing, number>; dryT: number;
  done: boolean; win: boolean;
}
export type Phase = 'prep' | 'sit' | 'fight' | 'pay';
/** A bout: its phase and how long it's been in it, who wins (known once the fans sit down), the ring's tug (-1 his,
 *  +1 the champion's), its wobble, how many bouts so far; and a local bout's fans: how many are coming, how many have,
 *  and how many ate (the ones who stay to watch). */
export interface Bout { phase: Phase; t: number; win: boolean; tug: number; noise: number; n: number; crowd: number; came: number; fed: number }
export interface Fight {
  t: number;
  beaten: number; tier: number; boughtOut: boolean;
  lines: Record<Ing, Line>;
  hires: Partial<Record<Role, boolean>>;
  crew: Worker[];
  /** Ingredients on the ledge; bowls in the pot, on the counter and on the stall (true for a mushroom bowl), each its
   *  own: cooked into the pot, ladled out onto the counter (the next one in `potT` seconds), carried to the stall. */
  pantry: Record<Ing, number>;
  pot: boolean[]; potT: number;
  counter: boolean[]; stall: boolean[];
  /** When each fan waiting at the stall walked in; and when fans were fed, batches were cooked, and the pot sat full
   *  (each kept a minute). */
  queue: number[];
  fed: number[]; cooked: number[]; full: number[]; fullAcc: number;
  earned: [number, number][];
  rush: Rush | null;
  bout: Bout;
  /** The locals' bouts' dice, and the player's turn at the pot. */
  seed: number; cookT: number;
  /** The Undertow (undertow.ts): whether the doorman's let you in yet (doorway.ts), the bout Tommy last played monte
   *  in and how many rounds he played in it, and what's owed to Harry (loan.ts). */
  den: Den;
}
export interface Den { door: boolean; monte: { bout: number; played: number }; loan: Loan }
/** Hammerhead Harry's loan (loan.ts): chips still owed (0: none), and what was owed when it was made. */
export interface Loan { owed: number; total: number }

const line = (n: number): Line => ({ n, up: 0, m: [] });
/** A bout's preparation, from the start (how many fans come is worked out as it starts: -1). */
const freshBout = (n: number): Bout => ({ phase: 'prep', t: 0, win: false, tug: 0, noise: 0, n, crowd: -1, came: 0, fed: 0 });
export function blank(): Fight {
  return {
    t: 0, beaten: 0, tier: 0, boughtOut: false,
    lines: { rice: line(1), fish: line(1), mush: line(0) }, hires: {}, crew: [],
    pantry: { rice: 0, fish: 0, mush: 0 }, pot: [], potT: 0, counter: [], stall: [],
    queue: [], fed: [], cooked: [], full: [], fullAcc: 0, earned: [],
    rush: null, bout: freshBout(0),
    seed: 3, cookT: 0,
    den: { door: false, monte: { bout: -1, played: 0 }, loan: { owed: 0, total: 0 } },
  };
}
/** The cellar now (a forecast swaps a copy in for a moment). */
export let F: Fight = blank();
/** False while a forecast runs its copy: nothing it does is real, so nothing's paid or shown. */
let real = true;

/** What the game does when something happens down here (set by the cellar's modules; quiet in a forecast). */
export const on = {
  /** Chips earned, from bowls sold at the stall or a boss's prize. */
  earn: (_chips: number, _why: 'bowls' | 'prize') => {},
  /** A batch of bowls has come out of the pot. */
  cooked: () => {},
  /** A boss's rush has begun or ended. */
  rush: (_r: Rush) => {},
  rushEnd: (_r: Rush) => {},
  /** A bout's moved on to `phase`. */
  bout: (_phase: Phase) => {},
  /** The grow room has been found. */
  grow: () => {},
  /** The Undertow has been found (the second boss beaten). */
  den: () => {},
  /** Something bought at the shop counter has been built (unlocks.ts). */
  built: (_what: Built) => {},
};
/** Something just bought for the cellar: a line's new machine (or, `all`, every one it has: an upgrade swaps them all),
 *  a hire, or the venue's next tier. */
export type Built = { line: Ing; all?: boolean } | { role: Role } | { tier: number };

/** Starts the cellar over: a fresh one, or a saved one. */
export function resetFight(f: Fight = blank()) {
  F = f;
  syncMachines();
  fc = null;
}

// ---------- reading it ----------
export const mach = (k: Ing) => MACH[k][F.lines[k].up];
export const growOpen = () => F.beaten >= 1;
/** What goes in the pot: four of each ingredient there is. */
export const inPot = () => ING.filter(k => k !== 'mush' || growOpen());
export const nextBoss = (): Boss | undefined => BOSSES[F.beaten];
export const canCook = () => inPot().every(k => F.pantry[k] >= PER_BATCH);
/** No room in the pot for another batch. */
export const potFull = () => F.pot.length + BATCH > POT_CAP;
/** Bowls ladled out of the pot onto the counter so far (in the real cellar, not a forecast's), for drawing them flying. */
export const poured = { n: 0 };
/** Bowls sold at the stall so far (in the real cellar), for drawing each one hopping to the fan who bought it. */
export const sold = { n: 0 };
/** Batches a minute the kitchen makes: last minute's, allowing for time the pot sat idle with nowhere to put bowls. */
export const kitchenRate = () => F.cooked.length / Math.max(0.25, 1 - F.full.length / 60);
/** 💪: fans fed in this bout's preparation, a local's or a boss's (the ones who sit on the champion's side). */
export const strength = () => sides().yours;
/** Seats in the venue, and how many fans are in on a normal night: the seats, filled by word on the street. */
export const seats = () => TIERS[F.tier].seats;
export const crowdNow = () => Math.round(seats() * Math.min(1, 0.45 * boost('street')));
/** What a bowl sells for (a mushroom bowl, `m`), before and after Mr. Fugu's cut. */
export const listPrice = (m: boolean) => PRICE * (m ? 2 : 1) * boost('bowls');
export const bowlPrice = (m: boolean) => listPrice(m) * (F.boughtOut ? 1 : CUT);
/** Chips earned in the last minute. */
export const perMinute = () => F.earned.reduce((s, [, v]) => s + v, 0);
/** What a line's machines can make in a minute, kept fed. */
export const lineCap = (k: Ing) => { const M = mach(k); return F.lines[k].n * M.cap / M.time * 60; };
/** The ingredient the pot is waiting on, if it's waiting (for the bubble over it). */
export const potWaits = (): Ing | null => (canCook() ? null : inPot().find(k => F.pantry[k] < PER_BATCH) ?? null);

// ---------- machines ----------
const fresh = (): Machine => ({ items: [], coming: 0, ready: 0, p: 0 });
function syncMachines() {
  for (const k of ING) {
    const L = F.lines[k];
    while (L.m.length < L.n) L.m.push(fresh());
    L.m.length = L.n;
  }
}
/** How many are ready to take out of a machine, and how many more raw ones it has room for. */
export const doneCount = (k: Ing, m: Machine) => (k === 'mush' ? m.ready : m.items.filter(p => p >= 1).length);
export const freeCount = (k: Ing, m: Machine) => (k === 'mush' ? 0 : mach(k).cap - m.items.length);
/** How many more raw ones a line (rice or fish) can take: each machine's empty spots, and the ones holding ready
 *  items (they come out as raw ones go in), less what's already on its way. What the dumbwaiter hands the player. */
export function lineRoom(k: Ing) {
  if (k === 'mush') return 0;
  const L = F.lines[k];
  let n = 0;
  for (let i = 0; i < L.n; i++) { const m = L.m[i]; n += mach(k).cap - (m.items.length - doneCount(k, m)) - m.coming; }
  return Math.max(0, n);
}
function updMachines(dt: number) {
  for (const k of ING) {
    const M = mach(k);
    for (const m of F.lines[k].m) {
      if (k === 'mush') {
        if (m.ready < M.cap) { m.p += dt / M.time; if (m.p >= 1) { m.p = 0; m.ready++; } }
      } else for (let i = 0; i < m.items.length; i++) m.items[i] = Math.min(1, m.items[i] + dt / M.time);
    }
  }
}

// ---------- the pot ----------
function cookBatch() {
  for (const k of inPot()) F.pantry[k] -= PER_BATCH;
  const m = growOpen();
  for (let i = 0; i < BATCH; i++) F.pot.push(m);
  F.cooked.push(F.t);
  if (real) on.cooked();
}
/** Cooks a batch every half second while someone's at the pot, if there's four of each and room for the bowls. */
function tendPot(timer: { cookT: number }, dt: number) {
  timer.cookT -= dt;
  if (timer.cookT > 0) return true;
  timer.cookT = 0.5;
  if (canCook() && !potFull()) { cookBatch(); return true; }
  return false;
}

/** The pot ladles its bowls out onto the counter, one at a time, while the counter has room. */
function ladle(dt: number) {
  F.potT -= dt;
  while (F.potT <= 0 && F.pot.length && F.counter.length < COUNTER_CAP) {
    F.counter.push(F.pot.shift()!);
    F.potT += LADLE;
    if (real) poured.n++;
  }
  if (F.potT < 0) F.potT = 0;
}

// ---------- the fans ----------
function sell(n: number) {
  let got = 0;
  for (let i = 0; i < n && F.stall.length; i++) { got += bowlPrice(F.stall.shift()!); F.fed.push(F.t); if (real) sold.n++; }
  F.earned.push([F.t, got]);
  if (real && got) on.earn(got, 'bowls');
  return got;
}
/** A local bout's preparation: its fans walk in over the first part of it and queue at the stall, and each one who
 *  gets a bowl, once they're there, stays to watch. (Whoever hasn't eaten when it's over goes home: updBout.) */
function updFans() {
  const B = F.bout;
  if (F.rush || B.phase !== 'prep') return;
  if (B.crowd < 0) B.crowd = crowdNow();
  const due = Math.min(B.crowd, Math.floor(B.crowd * Math.min(1, B.t / (BOUT.prep * ARRIVE)) + 1e-9));
  while (B.came < due) { B.came++; F.queue.push(F.t); }
  let n = 0;
  while (n < F.queue.length && n < F.stall.length && F.t - F.queue[n] >= REACH - 1e-9) n++;
  if (n) { F.queue.splice(0, n); sell(n); B.fed += n; }
}
/** Both sides of the bout now: the fans who ate (the champion's), and the rest (a boss's; a local has none). */
export function sides() {
  const R = F.rush;
  return R ? { yours: R.turned, theirs: R.n - R.turned } : { yours: F.bout.fed, theirs: 0 };
}

// ---------- the rush ----------
function startRush() {
  F.rush = { boss: F.beaten, n: BOSSES[F.beaten].crowd, turned: 0, walk: WALK_IN, t: 0, lastTurn: 0, short: { rice: 0, fish: 0, mush: 0 }, dryT: 0, done: false, win: false };
  // his crowd takes the floor (a local bout's called off)
  F.queue = [];
  F.bout = { ...freshBout(F.bout.n), crowd: 0 };
  if (real) on.rush(F.rush);
}
/** Rings the gong: the next boss's rush begins. False if there's no boss left, or one's in already. */
export function ringGong() {
  if (!nextBoss() || F.rush) return false;
  startRush();
  fc = null;
  return true;
}
/** A boss's preparation: his crowd walks in to the stall (the kitchen keeps cooking), and then until his bell (or his
 *  whole crowd's turned), each bowl at the stall turns one of his fans. */
function updRush(dt: number) {
  const R = F.rush;
  if (!R || R.done) return;
  if (R.walk > 0) { R.walk = Math.max(0, R.walk - dt); return; }
  R.t += dt;
  const n = Math.min(F.stall.length, R.n - R.turned);
  if (n) { sell(n); R.turned += n; R.lastTurn = R.t; }
  if (!F.stall.length) {
    R.dryT += dt;
    if (!canCook()) for (const k of inPot()) if (F.pantry[k] < PER_BATCH) R.short[k] += dt;
  }
  if (R.turned >= R.n || R.t >= BOSSES[R.boss].bell) {
    // the stall shuts and his crowd sits down: more than half of them turned, and the champion wins
    R.done = true; R.win = R.turned * 2 > R.n;
    toSeats(R.win);
  }
}
/** The fans take their seats: the bout's result is settled now (whichever side is bigger), and shown in the fight. */
function toSeats(win: boolean) {
  const B = F.bout;
  B.phase = 'sit'; B.t = 0; B.win = win; B.tug = 0;
  if (real) on.bout('sit');
}
/** The result of a boss's bout, once the fight's over. */
function bossResult(R: Rush) {
  if (!real) return;
  if (R.win) {
    const boss = BOSSES[R.boss];
    F.beaten++;
    on.earn(boss.prize, 'prize');
    if (F.beaten === 1) revealGrowRoom();
    if (F.beaten === 2) on.den();
  }
  on.rushEnd(R);
}
/** The worst-jammed ingredient of a rush, if one held the pot up. */
export const worstShort = (R: Rush) => ING.filter(k => R.short[k] > 0.5).sort((a, b) => R.short[b] - R.short[a])[0] ?? null;
/** More than half: how many of `boss`'s fans have to be turned to beat him. */
export const toBeat = (boss: Boss) => Math.floor(boss.crowd / 2) + 1;
/** Batches a minute a kitchen needs, with a full stall, to turn enough of `boss`'s crowd before the bell. */
export const needRate = (boss: Boss) => Math.ceil(Math.max(0, toBeat(boss) - STALL_CAP) * 60 / boss.bell / BATCH);

/** Hakkaku's prize: the grow room, opened as the other lines start, one bed (its first crop ready to pick) and enough
 *  mushrooms on the ledge for a batch, so the pot doesn't stop the moment it wants them. Its picker and more beds are
 *  bought on its square, as the prep hall's are. */
function revealGrowRoom() {
  F.lines.mush.n = Math.max(F.lines.mush.n, 1);
  syncMachines();
  for (const m of F.lines.mush.m) m.ready = mach('mush').cap;
  F.pantry.mush = Math.max(F.pantry.mush, PER_BATCH);
  on.grow();
}

// ---------- the forecast ----------
export interface Forecast { boss: Boss; turned: number; worst: Ing | null; at: number }
/** The player as the forecast sees them: where they are, how fast they walk, how much they carry, and what's in their
 *  arms (what's most of it). */
export interface You { x: number; z: number; speed: number; cap: number; carry: Carry | null }
/** How fast the forecast has the player work, of their walking speed. */
const YOU_PACE = 1;
/** Where the player is now, for the forecast (the game sets it; without it, the forecast is the crew alone). */
export const you = { now: (): You | null => null };
let fc: { t: number; i: number; v: Forecast } | null = null;
/**
 * What would happen if the gong were rung now: the whole cellar is copied, and the rush run ahead in the copy, to the
 * bell, with the player in it doing what a good player would: cooking until there's a cook, carrying bowls until
 * there's an attendant, and running the lines that have no hire. Exact, because nothing in the cellar is left to
 * chance. Kept for half a second of game time.
 */
export function forecast(): Forecast | null {
  const boss = nextBoss();
  if (!boss || F.rush) return null;
  if (fc && fc.i === F.beaten && F.t - fc.t < 0.5 && F.t >= fc.t) return fc.v;
  const was = F, me = you.now();
  F = structuredClone(was);
  real = false;
  try {
    if (me) {
      // (a little slower than they walk: nobody plays a rush perfectly, and "Ready" has to be a promise the gong keeps)
      const w: Worker = { ...worker('washer'), role: 'you', x: me.x, z: me.z, speed: me.speed * YOU_PACE, cap: me.cap, carry: me.carry ? structuredClone(me.carry) : null };
      // first, whatever's in their arms where it goes
      const c = w.carry;
      if (c?.k === 'bowl') w.steps = [{ to: BAR_PAD, act: 'stall' }];
      else if (c?.ready) w.steps = [{ to: ledgeSpot(c.k), act: 'ledge', k: c.k }];
      else w.carry = null;
      F.crew.push(w);
    }
    startRush();
    for (let n = 0; n < 4000 && !F.rush!.done; n++) step(0.05);
    const R = F.rush!;
    const v: Forecast = { boss, turned: R.turned, worst: worstShort(R), at: R.t };
    fc = { t: was.t, i: was.beaten, v };
    return v;
  } finally {
    F = was;
    real = true;
  }
}

// ---------- the crew ----------
/** Takes someone on: they start at their station. */
export function hire(role: Role) {
  if (F.hires[role]) return;
  F.hires[role] = true;
  F.crew.push(worker(role));
}
function worker(role: WorkerRole): Worker {
  const at = role === 'you' ? { x: 0, z: 0 } : HOME[role];
  return { role, x: at.x, z: at.z, h: 0, moving: false, path: [], steps: [], carry: null, dwell: 0, cooking: 0, cookT: 0, idle: 0 };
}
const lineOf = (w: Worker) => (w.role === 'you' ? undefined : HIRES[w.role].line);
/** How much a hire carries at a time (the player, their arms' worth). */
export const carryCap = (w: Worker) => w.cap ?? HIRE_LOAD + HIRE_LOAD_UP * (lineOf(w) ? F.lines[lineOf(w)!].up : 1);
function ledgeSpot(k: Ing): XZ { return { x: LEDGE[k].x, z: POT_PAD.z - 0.3 }; }

/** A line's hire's next job: ready ones to the ledge, or raw ones from the bins into the machines. */
function planLine(w: Worker, k: Ing): Step[] | null {
  const ms = F.lines[k].m, cap = carryCap(w);
  if (!ms.length || (k === 'mush' && !growOpen())) return null;
  // take ready ones to the ledge, from as many machines as one armful takes: set off while the ledge still has an
  // armful's worth, so the pot never waits on the walk
  if (F.pantry[k] < Math.min(LEDGE_CAP / 2, Math.max(8, cap))) {
    const order = ms.map((m, i) => [i, doneCount(k, m)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
    const total = order.reduce((t, [, d]) => t + d, 0);
    if (total && (total >= Math.min(cap, k === 'mush' ? 2 : 3) || F.pantry[k] < PER_BATCH)) {
      const steps: Step[] = [];
      let want = cap;
      for (const [i] of order) {
        if (want <= 0) break;
        steps.push({ to: machinePad(k, i, ms.length), act: 'pick', k, i });
        want -= doneCount(k, ms[i]);
      }
      steps.push({ to: ledgeSpot(k), act: 'ledge', k });
      return steps;
    }
  }
  if (k === 'mush') return null;
  // fetch raw ones from the bin, and fill as many machines as one armful covers
  const order = ms.map((m, i) => [i, freeCount(k, m) - m.coming]).filter(([, f]) => f > 0).sort((a, b) => b[1] - a[1]);
  if (!order.length) return null;
  const plan: [number, number][] = [];
  let left = cap;
  for (const [i, f] of order) {
    if (left <= 0) break;
    const n = Math.min(left, f);
    plan.push([i, n]); ms[i].coming += n; left -= n;
  }
  const steps: Step[] = [{ to: BIN_PADS[k as 'rice' | 'fish'], act: 'bin', k, n: cap - left }];
  for (const [i, n] of plan) steps.push({ to: machinePad(k, i, ms.length), act: 'fill', k, i, n });
  steps.push({ to: machinePad(k, plan[plan.length - 1][0], ms.length), act: 'drop' });
  return steps;
}
const planBowls = (): Step[] => [{ to: COUNTER_PAD, act: 'take' }, { to: BAR_PAD, act: 'stall' }];
/** The player's next job, in a forecast: whatever's most pressing that no hire does (the mockup's "You"). */
function thinkYou(w: Worker): Step[] | null {
  const opts: [number, () => Step[] | null][] = [];
  const stallLow = F.stall.length < 6, rush = !!F.rush && !F.rush.done;
  if (!F.hires.attendant && F.counter.length && F.stall.length < STALL_CAP) opts.push([3 + (stallLow ? 4 : 0) + (rush ? 4 : 0) + F.counter.length * 0.2, planBowls]);
  if (!F.hires.cook && canCook() && !potFull()) opts.push([3 + (F.counter.length < BATCH ? 3 : 0), () => [{ to: POT_PAD, act: 'cook' }]]);
  for (const k of inPot()) {
    if (F.hires[k === 'rice' ? 'washer' : k === 'fish' ? 'salter' : 'picker']) continue;
    opts.push([2 + (F.pantry[k] < 2 ? 3 : 0) + (k === 'rice' ? 0.2 : k === 'fish' ? 0.1 : 0), () => planLine(w, k)]);
  }
  opts.sort((a, b) => b[0] - a[0]);
  for (const [, f] of opts) { const p = f(); if (p) return p; }
  return null;
}
function think(w: Worker): Step[] | null {
  // ready ones still in their arms go to the ledge first, when there's room for them
  const c = w.carry;
  if (c && c.k !== 'bowl' && c.ready) return F.pantry[c.k] < LEDGE_CAP ? [{ to: ledgeSpot(c.k), act: 'ledge', k: c.k }] : null;
  if (w.role === 'you') return thinkYou(w);
  const k = lineOf(w);
  if (k) return planLine(w, k);
  if (w.role === 'cook') return [{ to: COOK_AT, act: 'cook' }];
  return F.counter.length && F.stall.length < STALL_CAP ? planBowls() : null;
}
/** Does a step's job; false means the rest of the job's off (nothing there to take). */
function doAct(w: Worker, st: Step): boolean {
  const k = st.k!, ms = st.k ? F.lines[k].m : [];
  switch (st.act) {
    case 'pick': {
      const m = ms[st.i!], have = w.carry && w.carry.k !== 'bowl' ? w.carry.n : 0;
      const n = Math.min(carryCap(w) - have, doneCount(k, m));
      if (n <= 0) return true;
      if (k === 'mush') m.ready -= n;
      else { let left = n; m.items = m.items.filter(p => !(p >= 1 && left-- > 0)); }
      w.carry = { k, ready: true, n: have + n };
      return true;
    }
    case 'ledge': {
      // (what doesn't fit on the ledge stays in their arms, for when there's room)
      if (!w.carry || w.carry.k === 'bowl') return true;
      const put = Math.min(w.carry.n, LEDGE_CAP - F.pantry[k]);
      F.pantry[k] += put; w.carry.n -= put;
      if (w.carry.n <= 0) w.carry = null;
      return true;
    }
    case 'bin': w.carry = { k, ready: false, n: st.n! }; return true;
    case 'fill': {
      const m = ms[st.i!];
      m.coming = Math.max(0, m.coming - st.n!);
      if (!w.carry || w.carry.k === 'bowl') return true;
      const put = Math.min(freeCount(k, m), st.n!, w.carry.n);
      for (let j = 0; j < put; j++) m.items.push(0);
      w.carry.n -= put;
      if (w.carry.n <= 0) w.carry = null;
      return true;
    }
    case 'drop': w.carry = null; return true;
    // (the cook stays at the pot; the player cooks a few batches, then sees what else needs doing)
    case 'cook': w.cooking = w.role === 'cook' ? Infinity : 3.5; return true;
    case 'take': {
      const n = Math.min(w.cap ?? ATTENDANT_BOWLS, F.counter.length, STALL_CAP - F.stall.length);
      if (!n) return false;
      w.carry = { k: 'bowl', bowls: F.counter.splice(0, n) };
      return true;
    }
    case 'stall':
      if (w.carry?.k === 'bowl') { const room = STALL_CAP - F.stall.length; F.stall.push(...w.carry.bowls.slice(0, room)); F.counter.unshift(...w.carry.bowls.slice(room)); }
      w.carry = null;
      return true;
  }
}
/** How much a worker's carrying. */
const load = (w: Worker) => (!w.carry ? 0 : w.carry.k === 'bowl' ? w.carry.bowls.length : w.carry.n);
/** A hire's moment: cooking, busy at a station, walking to the next one, or thinking what to do. */
function updWorker(w: Worker, dt: number) {
  w.moving = false;
  if (w.cooking > 0) { w.cooking -= dt; if (!tendPot(w, dt) && w.role !== 'cook') w.cooking = 0; return; }
  if (w.dwell > 0) { w.dwell -= dt; return; }
  if (!w.path.length) {
    if (w.steps.length) {
      const s = w.steps.shift()!;
      if (s.done) {
        // (a job called off still sends back what was promised to the machines)
        const before = load(w), ledge = ING.reduce((t, k) => t + F.pantry[k], 0), machines = F.lines.rice.m.concat(F.lines.fish.m).reduce((t, m) => t + m.items.length, 0);
        if (!doAct(w, s)) { for (const r of w.steps) if (r.act === 'fill') F.lines[r.k!].m[r.i!].coming = Math.max(0, F.lines[r.k!].m[r.i!].coming - r.n!); w.steps = []; }
        // (the player picks things up and puts them down one at a time, as cellarHands.ts has them do)
        const moved = w.role !== 'you' ? 0 : Math.max(Math.abs(load(w) - before), Math.abs(ING.reduce((t, k) => t + F.pantry[k], 0) - ledge),
          Math.abs(F.lines.rice.m.concat(F.lines.fish.m).reduce((t, m) => t + m.items.length, 0) - machines));
        w.dwell = DWELL + moved * HAND_STEP;
        return;
      }
      s.done = true; w.steps.unshift(s); w.path = cellarWay(w, s.to);
      return;
    }
    const plan = think(w);
    if (plan) { w.steps = plan; w.idle = 0; }
    else {
      w.idle += dt;
      if (w.idle > 2.5 && w.role !== 'you') { w.idle = 0; const home = HOME[w.role]; if (Math.hypot(w.x - home.x, w.z - home.z) > 0.3) w.path = cellarWay(w, home); }
    }
    return;
  }
  const p = w.path[0], dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz), v = (w.speed ?? WALK * boost('cellarcrew')) * dt;
  w.moving = true;
  if (d <= v) { w.x = p.x; w.z = p.z; w.path.shift(); }
  else { w.x += dx / d * v; w.z += dz / d * v; w.h = Math.atan2(dx, dz); }
}

// ---------- the bouts: locals as the free show between boss nights ----------
const rnd = () => (F.seed = (F.seed * 16807) % 2147483647) / 2147483647;
const ease = (k: number) => k * k * (3 - 2 * k);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function updBout(dt: number) {
  const B = F.bout, R = F.rush;
  B.t += dt;
  // (a boss's preparation lasts until his bell: updRush)
  if (B.phase === 'prep' && !R && B.t >= BOUT.prep) {
    // the stall shuts: the hungry go home, and the champion wins the free show
    F.queue = [];
    toSeats(true);
  } else if (B.phase === 'sit' && B.t >= BOUT.sit) {
    B.phase = 'fight'; B.t = 0; B.noise = rnd() * 6;
    if (real) on.bout('fight');
  } else if (B.phase === 'fight') {
    // the pair lean the way the crowd does, and wrestle it out to the side with more fans
    const { yours, theirs } = sides(), lean = (yours - theirs) / Math.max(1, yours + theirs) * 0.35;
    const k = B.t / BOUT.fight, target = B.win ? 1 : -1, wobble = Math.sin(B.t * 1.7 + B.noise) * 0.4 * (1 - k);
    B.tug = clamp(lean + wobble + (target - lean) * ease(clamp((k - 0.35) / 0.6, 0, 1)), -1, 1);
    if (B.t >= BOUT.fight) {
      B.phase = 'pay'; B.t = 0; B.n++;
      if (R) bossResult(R);
      if (real) on.bout('pay');
    }
  } else if (B.phase === 'pay' && B.t >= BOUT.pay) {
    // the fans go home, and the next ones come in
    F.rush = null; F.queue = [];
    F.bout = freshBout(B.n);
    if (real) on.bout('prep');
  }
}

// ---------- every frame ----------
/** Moves the cellar on by `dt` seconds. */
export function step(dt: number) {
  F.t += dt;
  syncMachines();
  updMachines(dt);
  ladle(dt);
  for (const w of F.crew) updWorker(w, dt);
  updFans();
  updRush(dt);
  // once a second, note whether the pot sat idle with nowhere to put its bowls
  F.fullAcc += dt;
  if (F.fullAcc >= 1) { F.fullAcc -= 1; if (potFull() && canCook()) F.full.push(F.t); }
  const old = F.t - 60;
  for (const a of [F.fed, F.cooked, F.full]) while (a.length && a[0] < old) a.shift();
  while (F.earned.length && F.earned[0][0] < old) F.earned.shift();
  updBout(dt);
}

// ---------- the player's hands ----------
/** The player at a line's machine: puts a raw one in, if there's room. */
export function fillMachine(k: Ing, i: number) {
  const m = F.lines[k].m[i];
  if (!m || k === 'mush' || freeCount(k, m) - m.coming <= 0) return false;
  m.items.push(0);
  return true;
}
/** The player at a line's machine: takes a ready one out, if there is one. */
export function takeReady(k: Ing, i: number) {
  const m = F.lines[k].m[i];
  if (!m || doneCount(k, m) <= 0) return false;
  if (k === 'mush') m.ready--;
  else m.items.splice(m.items.findIndex(p => p >= 1), 1);
  return true;
}
/** The player at the ledge: puts a ready one down, if there's room. */
export function toLedge(k: Ing) {
  if (F.pantry[k] >= LEDGE_CAP) return false;
  F.pantry[k]++;
  return true;
}
/** The player standing at the pot keeps it cooking (until there's a cook, who does it for them). */
export function playerAtPot(dt: number) {
  if (!F.hires.cook) tendPot(F, dt);
}
/** The player at the counter: takes a bowl (true for a mushroom bowl), if there is one. */
export const takeBowl = (): boolean | undefined => F.counter.shift();
/** The player at the stall: sets a bowl out, if there's room. */
export function toStall(m: boolean) {
  if (F.stall.length >= STALL_CAP) return false;
  F.stall.push(m);
  return true;
}

// ---------- buying ----------
/** What the next machine on a line costs, in chips. */
export const machineCost = (k: Ing) => Math.round(MACH_COST[k] * MACH_STEP ** Math.max(0, F.lines[k].n - 1));
export function addMachine(k: Ing) {
  const L = F.lines[k];
  if (L.n >= MAX_MACHINES) return;
  L.n++;
  syncMachines();
}
/** Swaps all of a line's machines for the better one (keeping what they hold, up to what the new ones take). */
export function upgradeLine(k: Ing) {
  const L = F.lines[k];
  L.up = 1;
  for (const m of L.m) if (k !== 'mush') m.items = m.items.slice(0, MACH[k][1].cap);
}
export function setTier(t: number) { F.tier = Math.max(F.tier, t); }
export function buyOut() { F.boughtOut = true; }

// ---------- saving ----------
/** The cellar, for saving: a rush cut short by closing the page is called off (no win, no loss). */
export function saveFight(): Fight {
  const f = structuredClone(F);
  if (f.rush) { f.rush = null; f.queue = []; f.bout = freshBout(f.bout.n); }
  return f;
}
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** A saved cellar, whatever came out of storage: what reads back is kept, anything else starts fresh. */
export function fightFrom(raw: unknown): Fight {
  const b = blank();
  if (!raw || typeof raw !== 'object') return b;
  try {
    const r = structuredClone(raw) as Partial<Fight>;
    const num = (v: unknown, d = 0) => (isNum(v) ? v : d);
    const list = <T>(v: unknown, ok: (x: unknown) => boolean): T[] => (Array.isArray(v) ? v.filter(ok) as T[] : []);
    const f: Fight = {
      ...b,
      t: Math.max(0, num(r.t)),
      beaten: clamp(Math.floor(num(r.beaten)), 0, BOSSES.length), tier: clamp(Math.floor(num(r.tier)), 0, TIERS.length - 1),
      boughtOut: !!r.boughtOut,
      hires: Object.fromEntries((Object.keys(HIRES) as Role[]).filter(k => r.hires?.[k]).map(k => [k, true])),
      pantry: Object.fromEntries(ING.map(k => [k, clamp(Math.floor(num(r.pantry?.[k])), 0, LEDGE_CAP)])) as Record<Ing, number>,
      pot: list<boolean>(r.pot, x => typeof x === 'boolean').slice(0, POT_CAP),
      counter: list<boolean>(r.counter, x => typeof x === 'boolean').slice(0, COUNTER_CAP),
      stall: list<boolean>(r.stall, x => typeof x === 'boolean').slice(0, STALL_CAP),
      queue: list<number>(r.queue, isNum),
      fed: list<number>(r.fed, isNum), cooked: list<number>(r.cooked, isNum), full: list<number>(r.full, isNum),
      fullAcc: num(r.fullAcc), earned: list<[number, number]>(r.earned, x => Array.isArray(x) && x.every(isNum)),
      seed: clamp(Math.floor(num(r.seed, 3)), 1, 2147483646), cookT: 0,
      den: {
        door: r.den?.door === true, monte: { bout: Math.floor(num(r.den?.monte?.bout, -1)), played: clamp(Math.floor(num(r.den?.monte?.played)), 0, 99) },
        loan: { owed: Math.max(0, num(r.den?.loan?.owed)), total: Math.max(0, num(r.den?.loan?.total), num(r.den?.loan?.owed)) },
      },
    };
    for (const k of ING) {
      const L = (r.lines?.[k] ?? {}) as Partial<Line>;
      f.lines[k] = {
        n: clamp(Math.floor(num(L.n, b.lines[k].n)), 0, MAX_MACHINES), up: L.up ? 1 : 0,
        m: list<Partial<Machine>>(L.m, x => !!x && typeof x === 'object').map(m => ({
          items: list<number>(m.items, isNum).map(p => clamp(p, 0, 1)), coming: 0, ready: Math.max(0, Math.floor(num(m.ready))), p: clamp(num(m.p), 0, 1),
        })),
      };
    }
    // a bout carries on where it was; a rush cut short by closing the page is called off (no win, no loss)
    if (r.bout && ['prep', 'sit', 'fight', 'pay'].includes(r.bout.phase)) {
      const o = r.bout;
      f.bout = { ...b.bout, phase: o.phase, t: num(o.t), win: !!o.win, tug: clamp(num(o.tug), -1, 1), noise: num(o.noise), n: num(o.n),
        crowd: Math.floor(num(o.crowd, -1)), came: Math.floor(num(o.came)), fed: Math.floor(num(o.fed)) };
    }
    // the crew start their jobs over, from where they stand
    for (const role of Object.keys(f.hires) as Role[]) {
      const w = list<Partial<Worker>>(r.crew, x => !!x && typeof x === 'object').find(x => x.role === role), at = worker(role);
      f.crew.push(w && isNum(w.x) && isNum(w.z) ? { ...at, x: w.x, z: w.z } : at);
    }
    return f;
  } catch { return b; }
}
