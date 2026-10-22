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
// which you win, every time, once you've turned as many as his strength (💪: more than half, for the first, more for each stronger one). Nothing in here is left to chance, so the gong can copy the whole cellar and run the
// rush ahead in the copy to say exactly how it would go (forecast). That's why it's
// all plain data: the hires' jobs are lists of steps, never closures. The player isn't in it: what they carry is
// theirs, and they hand things in through the functions at the bottom (cellarHands.ts). Only the forecast puts them in,
// as one more worker doing what a good player would (the mockup's "You"), from where they stand with what they carry.
//
// Money is Fugu Chips 🐡 down here: 1 chip is $1,000 of the same wallet.
import { boost, mods } from './economy';
import { BAR_PAD, BIN_PADS, cellarWay, COOK_AT, COUNTER_PAD, homeOf, type Ing, LEDGE, machinePad, MAX_MACHINES, POT_PAD } from './cellarPlan';
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
  // (a bed grows one mushroom at a time, each `time` seconds, up to `cap` ready: no faster, the grow room would be the
  // weakest line the moment it opens)
  mush: [{ name: 'Mushroom bed', cap: 6, time: 1.5 }, { name: 'Glowing shelf', cap: 9, time: 0.75 }],
};
export interface Boss {
  face: string; name: string; crowd: number; bell: number; prize: number;
  /** The sea creature he is (creatures.ts), from his name; none for the sparring partner, who's a wrestler like ours. */
  kind?: Kind;
  /** What beating him opens, as his result card says it: "🔓 New: …". */
  opens: string;
  /** The share of his crowd to turn to beat him (half, if not given): above all the kitchen the boss before him left
   *  could turn, so what beating that boss opened has to be bought first, and under what the kitchen with it all turns
   *  with no cooking show (test/capacity.sim.test.ts, SIM_STEPS=window). */
  share?: number;
}
/** A rush is won by carrying bowls to the stall, and since the kitchen holds the rush (the pot, the counter, the slide
 *  down to the soup bar and the ledges all full when the gong goes), a boss's crowd is all a kitchen turns in his bell
 *  with everything beating the boss before him opens bought (every machine and line upgrade, the hires, the slide and
 *  its faster belt once they're open, the Cellar crew levels open by then: two a boss beaten) and the cooking show
 *  aced (test/capacity.sim.test.ts, SIM_STEPS=bosses): Hakkaku 100, Yokobashiri 210, Dobu 498 (a 45 s bell), Samehada
 *  571 (45 s too), Fukure 1100 (60 s). His `share` is what beats him: above all the kitchen the boss before him left
 *  turns, so what that boss opened has to be bought (the attendant, the slide, the cook, the faster belt), and under
 *  what it all turns with no show (SIM_STEPS=window). Their prices set the time between bosses (tuned 2026-10-22 with
 *  the stage 3 bot: seven to nine minutes each, about 45 to the buyout). */
export const BOSSES: Boss[] = [
  { face: '🐙', name: 'Hakkaku', crowd: 100, bell: 30, prize: 100, kind: 'octopus', opens: 'grow room, the attendant' },
  { face: '🦀', name: 'Yokobashiri', crowd: 210, bell: 30, prize: 250, share: 0.495, kind: 'crab', opens: 'Back-Alley Ring, bowl slide, steam baskets, a way south' },
  { face: '🐟', name: 'Dobu', crowd: 498, bell: 45, prize: 300, share: 0.8, kind: 'catfish', opens: 'Underground Arena, smokehouse, the cook' },
  { face: '🦈', name: 'Samehada', crowd: 571, bell: 45, prize: 800, share: 0.935, kind: 'shark', opens: 'Grand Hall Below, glowing shelves, faster belt' },
  { face: '🐡', name: 'Fukure', crowd: 1100, bell: 60, prize: 1500, share: 0.74, kind: 'puffer', opens: 'buy back all his chips' },
];
/** The practice fight before the first boss (once, for a player who's just come down): the champion's own sparring
 *  partner and a small crowd, so the gong's learnt on a fight that's won. His prize hires the two lines' hands, which is
 *  what it takes to beat Hakkaku. It isn't a boss: nothing's counted beaten. */
export const PRACTICE: Boss = { face: '🤼', name: 'Sparring partner', crowd: 40, bell: 30, prize: 35, opens: '' };
/** A rush's boss: one of the five, or (-1) the sparring partner. */
export const bossOf = (i: number) => (i < 0 ? PRACTICE : BOSSES[i]);
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
 *  machines held four more). The pot holds two batches, ladled out onto the counter a bowl every LADLE seconds (twice
 *  as fast with a cook ladling too); the counter holds two batches too, and the ledge six batches of each. */
export const PER_BATCH = 4, BATCH = 20, POT_CAP = 40, COUNTER_CAP = 40, STALL_CAP = 30, LEDGE_CAP = 24, LADLE = 0.1;
/** The bowl slide (a hearth room upgrade): bowls a second it sends from the counter down to the soup bar by itself. */
export const SLIDE = 12, SLIDE_COST = 145, SLIDE_BEAT = 2;
/** Its faster belt (a hearth room upgrade beating Samehada opens): bowls a second the slide sends once it's bought. By
 *  Fukure the slide's what limits a rush (the stall's 30 and SLIDE a second of his bell), so this is what beats him. */
export const FAST_SLIDE = 18, FAST_COST = 1700, FAST_BEAT = 4;
/** Mama Moray's (resto.ts), the chanko restaurant out front: what the pot can't hold goes to her. A batch cooked with
 *  the pot full and a batch to spare on the ledge of everything goes up the belt to her counter instead, and pays this share of what
 *  its bowls would at the stall (the Family keeps the rest). Never in a boss's rush, or before the doors open. */
export const RESTO_SHARE = 0.12;
/** The cooking show at the pot (chanko.ts), a bonus game: it takes nothing and cooks nothing, and its stars buy the pot
 *  bigger batches for a while (a cook's too): long enough to see a boss's rush through, Fukure's walk-in and his
 *  60 s bell too. */
export const BONUS_S = 70;
export const BONUS_TIERS = [{ min: 12, pct: 50, name: 'Perfect pot' }, { min: 9, pct: 35, name: 'Hearty' }, { min: 6, pct: 20, name: 'Tasty' }, { min: 0, pct: 0, name: 'Bland' }];
/** Chips a bowl sells for (mushroom bowls pay double), and what Mr. Fugu leaves of it until he's bought out. */
export const PRICE = 0.9, CUT = 0.7;
export type Role = 'washer' | 'salter' | 'picker' | 'cook' | 'attendant';
/** The player, in a forecast. */
export type WorkerRole = Role | 'you';
export const HIRES: Record<Role, { line?: Ing; name: string; cost: number; beat: number }> = {
  washer: { line: 'rice', name: 'Rice washer', cost: 15, beat: 0 },
  salter: { line: 'fish', name: 'Fish salter', cost: 20, beat: 0 },
  picker: { line: 'mush', name: 'Mushroom picker', cost: 100, beat: 1 },
  // (serving's taken off the player's hands before the pot is: the pot's theirs)
  attendant: { name: 'Attendant', cost: 190, beat: 1 },
  cook: { name: 'Cook', cost: 340, beat: 3 },
};
/** The machine upgrades: chips, and bosses to beat first. */
export const UPS: Record<Ing, { cost: number; beat: number }> = { rice: { cost: 350, beat: 2 }, fish: { cost: 800, beat: 3 }, mush: { cost: 4000, beat: 4 } };
/** Another machine: the first extra's chips, each next one 45% more. */
export const MACH_COST: Record<Ing, number> = { rice: 10, fish: 12, mush: 15 }, MACH_STEP = 1.45;
export const TIER_COST = [0, 120, 900, 2500], TIER_BEAT = [0, 2, 3, 4];
export const BUYOUT = 7000;
/** A bout's phases: preparation (the fans buy soup; on a boss night, as long as his bell), taking their seats, the
 *  fight, and the result. */
export const BOUT = { prep: 20, sit: 5, fight: 15, pay: 7 };
/** Seconds into a push-out's result that the loser lands off the mound (finishers/push.ts); a finisher's are its own
 *  (finishers.ts's landsOf). Nothing that says who won is shown before it. */
export const LANDS = 2.3;
/** How much faster a local fight's result plays out after the fall, while a boss called in by the gong waits on it. */
export const HURRY = 1.6;
/** A result's length: a push-out's (a local's, or a plain boss fight's) BOUT.pay; a finisher's (finishers.ts) longer,
 *  for the move and the getting up after it; and the epic, a perfect slam's (gong.ts), longer still. */
export const FINISHER_PAY = 8.5, EPIC_PAY = 11;
/** Whether this fight's result is the epic: a grand win with a perfect slam. */
export const epic = (B: Bout = F.bout, R: Rush | null = F.rush) => !!R && B.finish === 'grand' && R.slam === 2;
export const payLen = (B: Bout = F.bout, R: Rush | null = F.rush) => (epic(B, R) ? EPIC_PAY : R && B.finish !== 'push' ? FINISHER_PAY : BOUT.pay);
/** The slam, a grand win's showy finish, the player's to land (gong.ts): offered on a grand win (`grand`)
 *  turned; in the fight a ring closes on the champion's face over `lead` seconds to meet its mark `at` seconds in (the
 *  belly bump), and a press within `perfect` of it is perfect, within `good` good: his prize, that much more. */
export const SLAM = { at: 9.6, lead: 1.6, perfect: 0.12, good: 0.3, bonus: [0, 0.1, 0.2] };
/** How much of a local bout's preparation its fans take to walk in, and seconds each takes from their tunnel to the
 *  stall: nobody's served before they're at it (swarm.ts hurries anyone who'd be late). */
const ARRIVE = 0.6;
export const REACH = 6;
/** What a hire carries at a time (more once their line is upgraded; the picker, a basket four times that), and the
 *  attendant's armful of bowls. A line's hire sets off for the ledge once it's below SET_OFF of full. */
const HIRE_LOAD = 12, HIRE_LOAD_UP = 36, PICKER_BASKET = 4, ATTENDANT_BOWLS = 30, SET_OFF = 0.95;
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
  /** The player's own walking speed and arms, in a forecast; and whether they're there to stay at the pot. */
  speed?: number; cap?: number; stay?: boolean;
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
  /** Slick Eddie's fix on it, if one was paid for (eddie.ts): how big (tenths of his crowd), and whether he was caught
   *  (then the boss brought them all); and how many of his fans it kept home. */
  fix: { cut: number; caught: boolean } | null; kept: number;
  /** The slam, on a grand win: not tried (-1), missed (0), good (1) or perfect (2). */
  slam: number;
}
export type Phase = 'prep' | 'sit' | 'fight' | 'pay';
/** A bout: its phase and how long it's been in it, who wins (known once the fans sit down), the ring's tug (-1 his,
 *  +1 the champion's), its wobble, how many bouts so far; and a local bout's fans: how many are coming, how many have,
 *  and how many ate (the ones who stay to watch). */
export interface Bout {
  phase: Phase; t: number; win: boolean; tug: number; noise: number; n: number; crowd: number; came: number; fed: number;
  /** How it ends (finishers.ts): a push-out, or by how a boss's vote went, a tight one, a heavy loss, a grand win. */
  finish: Finish;
}
/** How a fight ends: see finishOf. */
export type Finish = 'push' | 'tight' | 'heavy' | 'grand';
export const FINISHES: Finish[] = ['push', 'tight', 'heavy', 'grand'];
export interface Fight {
  t: number;
  beaten: number; tier: number; boughtOut: boolean;
  /** The practice fight's still to come (a player who's just come down: ring.ts; or a game from before it, which hasn't
   *  beaten a boss: owedPractice). */
  practice: boolean;
  /** The practice fight's been won (so it's never owed again). */
  sparred: boolean;
  /** The doors are shut: a player who's just come down, before their first soup's out on the stall (ring.ts). No fans
   *  come, and there's no local fight, until it is (or the gong's rung). */
  quiet: boolean;
  /** The gong's been rung while a local fight was on: the champion finishes it, and the boss walks in once it's over
   *  (not saved: a reload calls it off, and the gong can be rung again). */
  called: boolean;
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
  /** The cooking show's bonus: how much bigger the pot's batches are (percent), and for how many more seconds. */
  bonus: { pct: number; t: number };
  /** The bowl slide's bought, and how many bowls it's due to send down (it sends SLIDE a second), and its faster belt
   *  (FAST_SLIDE a second). */
  slide: boolean; slideAcc: number; fast: boolean;
  /** Bowls sent up the belt to Mama Moray's, all told. */
  resto: number;
  /** A cooking show left half way (chanko.ts), to carry on from, never to start over: null when there's none. */
  show: ShowRun | null;
  /** The Undertow (undertow.ts): whether Mr. Fugu's given you his matchbook yet, whether the doorman's let you in through
   *  the out-of-order stall yet (southDoor.ts), whether its back has first opened on the club (the same, now), and
   *  the bout Tommy last played monte in and how many rounds he played in it; Slick Eddie's fix on the next boss, and the
   *  scandal if he's caught; and what's owed to Harry (loan.ts). */
  den: Den;
}
export interface Den {
  book: boolean; way: boolean; door: boolean; monte: { bout: number; played: number };
  /** The fix paid for: on which boss (-1, none), how big (1 to 5 tenths of his crowd kept home), and whether Eddie got
   *  caught. That's rolled as it's paid for (eddie.ts), outside the cellar's sim, and comes out at the gong, on his coin
   *  (gong.ts). */
  eddie: { boss: number; cut: number; caught: boolean };
  /** A fix that got out: tenths of the player's own fans who stay away, and for how many more local bouts. */
  scandal: { cut: number; bouts: number };
  loan: Loan;
  /** Which of the Family have introduced themselves (meet.ts): once each, the first time the player steps up to him. */
  met: { eddie: boolean; harry: boolean; tommy: boolean };
}
/** A cooking show under way: the step it's on (0 to 4: cut, throw, season, stir, all done), what each step's scored so
 *  far (its cuts', throws' and pours' scores, 0 to 1, a cut not yet made -1; the stir's seconds stirred and seconds in
 *  the band), and where the seasonings' lines are (rolled once a show). */
export interface ShowRun { step: number; got: number[][]; lines: number[] }
/** Hammerhead Harry's loan (loan.ts): chips still owed (0: none), and what was owed when it was made. */
export interface Loan { owed: number; total: number }

const line = (n: number): Line => ({ n, up: 0, m: [] });
/** A bout's preparation, from the start (how many fans come is worked out as it starts: -1). */
const freshBout = (n: number): Bout => ({ phase: 'prep', t: 0, win: false, tug: 0, noise: 0, n, crowd: -1, came: 0, fed: 0, finish: 'push' });
export function blank(): Fight {
  return {
    t: 0, beaten: 0, tier: 0, boughtOut: false, practice: false, sparred: false, quiet: false, called: false,
    lines: { rice: line(1), fish: line(1), mush: line(0) }, hires: {}, crew: [],
    pantry: { rice: 0, fish: 0, mush: 0 }, pot: [], potT: 0, counter: [], stall: [],
    queue: [], fed: [], cooked: [], full: [], fullAcc: 0, earned: [],
    rush: null, bout: freshBout(0),
    seed: 3, cookT: 0, bonus: { pct: 0, t: 0 }, show: null, slide: false, slideAcc: 0, fast: false, resto: 0,
    den: {
      book: false, way: false, door: false, monte: { bout: -1, played: 0 }, eddie: { boss: -1, cut: 0, caught: false }, scandal: { cut: 0, bouts: 0 },
      loan: { owed: 0, total: 0 }, met: { eddie: false, harry: false, tommy: false },
    },
  };
}
/** The cellar now (a forecast swaps a copy in for a moment). */
export let F: Fight = blank();
/** False while a forecast runs its copy: nothing it does is real, so nothing's paid or shown. */
let real = true;

/** What the game does when something happens down here (set by the cellar's modules; quiet in a forecast). */
export const on = {
  /** Chips earned, from bowls sold at the stall, a boss's prize, or bowls sent up to Mama Moray's. */
  earn: (_chips: number, _why: 'bowls' | 'prize' | 'resto') => {},
  /** A batch of bowls has come out of the pot. */
  cooked: () => {},
  /** A batch of `bowls` has gone up the belt to Mama Moray's, for `chips`. */
  resto: (_bowls: number, _chips: number) => {},
  /** The gong's been rung (its boss walks in at once, or once the local fight that's on is over). */
  gong: () => {},
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
export type Built = { line: Ing; all?: boolean } | { role: Role } | { tier: number } | { slide: true };

/** Starts the cellar over: a fresh one, or a saved one. */
export function resetFight(f: Fight = blank()) {
  F = f;
  syncMachines();
  fc.clear();
}

// ---------- reading it ----------
export const mach = (k: Ing) => MACH[k][F.lines[k].up];
export const growOpen = () => F.beaten >= 1;
/** What goes in the pot: four of each ingredient there is. */
export const inPot = () => ING.filter(k => k !== 'mush' || growOpen());
export const nextBoss = (): Boss | undefined => (practiceDue() ? PRACTICE : BOSSES[F.beaten]);
/** A loaded game (save.ts) that's beaten no boss and never won the practice fight has it to come, a game from before
 *  it too. `won`: it was won before this was kept (the save's tutorial learnt the gong on it). */
export function owedPractice(won: boolean) {
  if (won) F.sparred = true;
  if (!F.sparred && F.beaten === 0) F.practice = true;
}
/** The gong calls in the sparring partner next, not a boss. */
export const practiceDue = () => F.practice && F.beaten === 0;
export const canCook = () => inPot().every(k => F.pantry[k] >= PER_BATCH);
/** Bowls in the player's batch now: more while the cooking show's bonus lasts. */
export const batchBowls = () => Math.round(BATCH * (1 + (F.bonus.t > 0 ? F.bonus.pct : 0) / 100));
/** Whether the cooking show can start (or carry on from where it was left): not while its bonus lasts. */
export const canShow = () => F.bonus.t <= 0;
/** Cooking shows played to the end since the game started (the tutorial's lesson at the pot is learnt by one). */
export const showsDone = { n: 0 };
/** The cooking show's result: `stars` of 12 buy the pot its bonus (none for a bland pot). Returns the tier. */
export function showResult(stars: number) {
  const tier = BONUS_TIERS.find(x => stars >= x.min)!;
  showsDone.n++;
  F.bonus = tier.pct ? { pct: tier.pct, t: BONUS_S } : { pct: 0, t: 0 };
  F.show = null;
  return tier;
}
/** No room in the pot for another batch. */
export const potFull = () => F.pot.length + batchBowls() > POT_CAP;
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
export const crowdNow = () => {
  const n = Math.round(seats() * Math.min(1, 0.45 * boost('street'))), s = F.den.scandal;
  // (fewer while the papers have Eddie's fix: eddie.ts)
  return s.bouts > 0 ? Math.round(n * (1 - s.cut / 10)) : n;
};
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
function cookBatch(bowls: number) {
  for (const k of inPot()) F.pantry[k] -= PER_BATCH;
  const m = growOpen();
  for (let i = 0; i < bowls; i++) F.pot.push(m);
  F.cooked.push(F.t);
  if (real) on.cooked();
}
/** The level of Word on the street that opens Mama Moray's (about when the second boss falls): before it, her place
 *  out front is a ruin, being cleared. */
export const RESTO_OPENS = 5;
/** Whether Mama Moray's is open. */
export const restoOpen = () => mods.street >= RESTO_OPENS;
/** Mama Moray's takes a batch: she's open, the pot's full, and the ledge has a batch to spare of everything that goes
 *  in, over all but a batch of its room (and the doors are open, and no boss is in or called). */
export const restoWants = () => restoOpen() && F.slide && !F.rush && !F.called && !F.quiet && potFull() && inPot().every(k => F.pantry[k] >= LEDGE_CAP - PER_BATCH);
/** Whether the pot can take a batch now: into the pot, or, with the pot full, up the belt to Mama Moray's. */
export const canCookNow = () => canCook() && (!potFull() || restoWants());
/** A batch of `bowls` cooked up the belt to Mama Moray's: the Family's price for them. */
function toResto(bowls: number) {
  for (const k of inPot()) F.pantry[k] -= PER_BATCH;
  const got = bowlPrice(growOpen()) * RESTO_SHARE * bowls;
  F.resto += bowls;
  F.cooked.push(F.t); F.earned.push([F.t, got]);
  if (real) { on.cooked(); on.resto(bowls, got); on.earn(got, 'resto'); }
}
/** Cooks a batch every half second while someone's at the pot, if there's four of each and room for the bowls (or
 *  Mama Moray's wants them): a full one, the player's (or the forecast's "You"), or a cook's. */
function tendPot(timer: { cookT: number }, dt: number, bowls = batchBowls()) {
  timer.cookT -= dt;
  if (timer.cookT > 0) return true;
  timer.cookT = 0.5;
  if (canCook() && !potFull()) { cookBatch(bowls); return true; }
  if (canCook() && restoWants()) { toResto(bowls); return true; }
  return false;
}

/** The pot ladles its bowls out onto the counter, one at a time, while the counter has room. */
function ladle(dt: number) {
  F.potT -= dt;
  while (F.potT <= 0 && F.pot.length && F.counter.length < COUNTER_CAP) {
    F.counter.push(F.pot.shift()!);
    F.potT += F.hires.cook ? LADLE / 2 : LADLE;
    if (real) poured.n++;
  }
  if (F.potT < 0) F.potT = 0;
}
/** The bowl slide sends bowls down from the counter to the soup bar, SLIDE a second (FAST_SLIDE with its faster belt),
 *  while there's room. */
function slideBowls(dt: number) {
  if (!F.slide) return;
  F.slideAcc = Math.min(F.slideAcc + dt * (F.fast ? FAST_SLIDE : SLIDE), 2);
  while (F.slideAcc >= 1 && F.counter.length && F.stall.length < STALL_CAP) { F.stall.push(F.counter.shift()!); F.slideAcc -= 1; openDoors(); if (real) slid.n++; }
  if (!F.counter.length || F.stall.length >= STALL_CAP) F.slideAcc = Math.min(F.slideAcc, 1);
}
/** Bowls sent down the slide so far (in the real cellar), for drawing them going down it. */
export const slid = { n: 0 };

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
  if (F.rush || F.quiet || B.phase !== 'prep') return;
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

// ---------- Slick Eddie's fix ----------
/** For each size of fix (1 to 5 tenths of the boss's crowd kept home): the chance Eddie's caught, and how many local
 *  bouts the scandal then lasts (the player's own fans down by the same share). */
export const FIX = { caught: [0.05, 0.15, 0.3, 0.5, 0.7], scandal: [1, 1, 2, 2, 3] };
/** Chips Eddie charges for each fan he keeps home (a fan less to turn saves Cellar crew levels and shelves worth far
 *  more than a boss's prize, so the fee goes by the fans, not the prize). */
export const FIX_PER_FAN = 8;
/** How many of `boss`'s fans a fix of `cut` tenths keeps home, and what it costs, in chips. */
export const keptHome = (boss: Boss, cut: number) => Math.round(boss.crowd * cut / 10);
export const fixFee = (boss: Boss, cut: number) => keptHome(boss, cut) * FIX_PER_FAN;
/** The fix paid for on the next boss, if there is one. */
export const fixOn = () => {
  const e = F.den.eddie;
  return nextBoss() && !practiceDue() && e.boss === F.beaten && e.cut > 0 ? e : null;
};
/** Pays for a fix on the next boss, `cut` tenths of his crowd, Eddie caught or not (rolled by the caller, eddie.ts). */
export function setFix(cut: number, caught: boolean) {
  if (!nextBoss() || practiceDue() || F.rush || F.called || fixOn()) return false;
  F.den.eddie = { boss: F.beaten, cut: clamp(Math.round(cut), 1, 5), caught };
  return true;
}

// ---------- the rush ----------
/** His crowd walks in: all of it, or less the `kept` home by a `fix` that held. */
function startRush(kept = 0, fix: Rush['fix'] = null) {
  // (his crowd comes in, doors shut or not)
  F.quiet = false;
  F.rush = {
    boss: practiceDue() ? -1 : F.beaten, n: nextBoss()!.crowd - kept, turned: 0, walk: WALK_IN, t: 0, lastTurn: 0, short: { rice: 0, fish: 0, mush: 0 },
    dryT: 0, done: false, win: false, fix, kept, slam: -1,
  };
  // his crowd takes the floor (a local bout's called off)
  F.queue = [];
  F.bout = { ...freshBout(F.bout.n), crowd: 0 };
  if (real) on.rush(F.rush);
}
/** Whether the gong can be rung now: there's a boss to call in, and none's in or on his way. */
export const canRing = () => !!nextBoss() && !F.rush && !F.called;
/** Rings the gong: the next boss's rush begins. False if there's no boss left, or one's in already. A local fight
 *  that's on is seen out first: the champion finishes it there and then (its result, the fall and the bow, a little
 *  hurried after the fall), and the boss walks in as its fans go home. */
export function ringGong() {
  if (!canRing()) return false;
  if (real) on.gong();
  if (!seeOut()) callIn();
  return true;
}
/** With a local fight on, the boss is called in for after it, and it's finished at once (the champion wins it). True
 *  if there was one. */
function seeOut() {
  const B = F.bout;
  if (F.quiet || (B.phase !== 'fight' && B.phase !== 'pay')) return false;
  F.called = true;
  if (B.phase === 'fight') { B.tug = 1; fightOver(); }
  return true;
}
/** The next boss's rush begins. */
function callIn() {
  const boss = nextBoss()!;
  // Eddie's fix comes out now, on his coin (gong.ts): his boys kept the fans home, or the papers got it first (and the
  // player's own fans stay away for a bout or more after this one)
  const e = fixOn(), fix = e ? { cut: e.cut, caught: e.caught } : null;
  F.den.eddie = { boss: -1, cut: 0, caught: false };
  if (fix?.caught) F.den.scandal = { cut: fix.cut, bouts: FIX.scandal[fix.cut - 1] };
  startRush(fix && !fix.caught ? keptHome(boss, fix.cut) : 0, fix);
  fc.clear();
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
  if (R.turned >= R.n || R.t >= bossOf(R.boss).bell) {
    // the stall shuts and his crowd sits down: as many turned as his strength (💪), and the champion wins
    R.done = true; R.win = R.turned >= toBeat(bossOf(R.boss), R.n);
    toSeats(R.win, finishOf(R));
  }
}
/** The fans take their seats: the bout's result is settled now (whichever side is bigger), and shown in the fight,
 *  and how it ends. */
function toSeats(win: boolean, finish: Finish = 'push') {
  const B = F.bout;
  B.phase = 'sit'; B.t = 0; B.win = win; B.tug = 0; B.finish = finish;
  if (real) on.bout('sit');
}
/** The result of a boss's bout, once the fight's over. */
function bossResult(R: Rush) {
  if (!real) return;
  if (R.win && R.boss < 0) {
    // practice: his prize, and the first boss is next
    F.practice = false;
    F.sparred = true;
    on.earn(PRACTICE.prize * (1 + SLAM.bonus[Math.max(0, R.slam)]), 'prize');
  } else if (R.win) {
    const boss = BOSSES[R.boss];
    F.beaten++;
    on.earn(boss.prize * (1 + SLAM.bonus[Math.max(0, R.slam)]), 'prize');
    if (F.beaten === 1) revealGrowRoom();
    if (F.beaten === 2) on.den();
  }
  on.rushEnd(R);
}
/** How close a vote is tight: within this share of the fans needed, either way. */
export const TIGHT = 0.1;
/** How a boss's fight ends (finishers.ts), from how his vote went. A win, by where it lands between his strength (💪,
 *  the fans that beat him) and his whole crowd, in thirds: a tight one (a reversal at the straw), a push-out, or a
 *  grand win (the champion's big finisher, and the slam). A loss: a heavy one (under half his 💪: the boss's big one),
 *  a tight one (within TIGHT of it), or a push-out. */
export function finishOf(R: Rush): Finish {
  const need = toBeat(bossOf(R.boss), R.n);
  if (R.win) return grand(R) ? 'grand' : R.turned >= need + Math.ceil((R.n - need + 1) / 3) ? 'push' : 'tight';
  if (R.turned * 2 < need) return 'heavy';
  if (need - R.turned <= Math.round(need * TIGHT)) return 'tight';
  return 'push';
}
/** A grand win: in the top third of the room between his 💪 and his whole crowd (the slam's on offer in the fight). */
export const grand = (R: Rush) => { const need = toBeat(bossOf(R.boss), R.n); return R.win && R.turned >= R.n - Math.floor((R.n - need + 1) / 3); };
/** The slam can be landed now: a grand win's fight, from when the ring starts closing till just after it's met its
 *  mark, and not tried yet. */
export function slamDue() {
  const R = F.rush, B = F.bout;
  return !!R && R.done && grand(R) && R.slam < 0 && B.phase === 'fight' && B.t >= SLAM.at - SLAM.lead && B.t <= SLAM.at + SLAM.good;
}
/** The player goes for the slam: how it went (0 missed, 1 good, 2 perfect), or -1 if it isn't on. */
export function slam() {
  if (!slamDue()) return -1;
  const R = F.rush!, d = Math.abs(F.bout.t - SLAM.at);
  R.slam = d <= SLAM.perfect ? 2 : d <= SLAM.good ? 1 : 0;
  return R.slam;
}
/** The worst-jammed ingredient of a rush, if one held the pot up. */
export const worstShort = (R: Rush) => ING.filter(k => R.short[k] > 0.5).sort((a, b) => R.short[b] - R.short[a])[0] ?? null;
/** His strength (💪): how many of `boss`'s fans have to be turned to beat him, more than his share of them (half, for
 *  the first) (`n` of them, if a fix kept some home). */
export const toBeat = (boss: Boss, n = boss.crowd) => Math.min(n, Math.floor(n * (boss.share ?? 0.5)) + 1);
/** Batches a minute a kitchen needs, with a full stall, to turn enough of `boss`'s crowd before the bell. */
export const needRate = (boss: Boss, n = boss.crowd) => Math.ceil(Math.max(0, toBeat(boss, n) - STALL_CAP) * 60 / boss.bell / BATCH);

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
/** Where the player is now, for the forecast (the game sets it; without it, the forecast is the crew alone). */
export const you = { now: (): You | null => null };
/** The forecasts made lately, by how many of his fans are kept home (none, or a fix's) and the cooking show's bonus
 *  assumed. */
const fc = new Map<string, { t: number; i: number; v: Forecast }>();
/**
 * What would happen if the gong were rung now: the whole cellar is copied, and the rush run ahead in the copy, to the
 * bell, with the player in it doing what a good player would: cooking until there's a cook, carrying bowls until
 * there's an attendant, and running the lines that have no hire. Exact, because nothing in the cellar is left to
 * chance. Kept for half a second of game time. `bonus`: as if the cooking show (chanko.ts) had just bought the pot a
 * bonus of that many percent (a BONUS_TIERS pct: 20, 35, 50), for its BONUS_S seconds from the gong.
 */
export function forecast(kept = 0, { bonus = 0, need }: { bonus?: number; need?: number } = {}): Forecast | null {
  const boss = nextBoss();
  if (!boss || F.rush || F.called) return null;
  const key = `${kept}|${bonus}|${need ?? ''}`, was0 = fc.get(key);
  if (was0 && was0.i === F.beaten && was0.v.boss === boss && F.t - was0.t < 0.5 && F.t >= was0.t) return was0.v;
  // (and once the crew has every job, twice: the player at whatever needs them, and the player gone to the pot and
  // staying there, as for the cooking show; the kitchen goes a little differently each way, and the gong promises the
  // worse; asked whether it turns `need`, it doesn't go again once the first is short of it)
  const me = you.now();
  const runs = [rehearse(boss, kept, bonus, me, false)];
  if (me && handsFree() && !(need !== undefined && runs[0].turned < need)) runs.push(rehearse(boss, kept, bonus, me, true));
  const v = runs.reduce((a, b) => (b.turned < a.turned ? b : a));
  fc.set(key, { t: F.t, i: F.beaten, v });
  return v;
}
/** Whether the crew does everything without the player: both lines hired, the mushrooms too once they grow, and the
 *  bowls carried out (or slid) to the soup square. */
const handsFree = () => !!(F.hires.washer && F.hires.salter && (F.hires.attendant || F.slide) && (!growOpen() || F.hires.picker));
/** One go at the rush in a copy of the cellar: `me`, the player (or nobody), working where they're needed, or (`atPot`)
 *  gone to the pot to stay. */
function rehearse(boss: Boss, kept: number, bonus: number, me: You | null, atPot: boolean): Forecast {
  const was = F;
  F = structuredClone(was);
  real = false;
  try {
    if (bonus) F.bonus = { pct: bonus, t: BONUS_S };
    if (me) {
      // (a little slower than they walk: nobody plays a rush perfectly, and "Ready" has to be a promise the gong keeps)
      const w: Worker = { ...worker('washer'), role: 'you', x: me.x, z: me.z, speed: me.speed, cap: me.cap, carry: me.carry ? structuredClone(me.carry) : null, stay: atPot };
      // first, whatever's in their arms where it goes
      const c = w.carry;
      if (c?.k === 'bowl') w.steps = [{ to: BAR_PAD, act: 'stall' }];
      else if (c?.ready) w.steps = [{ to: ledgeSpot(c.k), act: 'ledge', k: c.k }];
      else w.carry = null;
      if (atPot) w.steps.push({ to: POT_PAD, act: 'cook' });
      F.crew.push(w);
    }
    // (rung during a local fight, he walks in once it's over, the kitchen working on meanwhile: ringGong; with no
    // fix of Eddie's in the copy, `kept` says how many stay home)
    if (seeOut()) {
      F.den.eddie = { boss: -1, cut: 0, caught: false };
      for (let n = 0; n < 400 && F.called; n++) step(0.05);
      F.rush!.n -= kept; F.rush!.kept = kept;
    } else startRush(kept);
    for (let n = 0; n < 4000 && !F.rush!.done; n++) step(0.05);
    const R = F.rush!;
    return { boss, turned: R.turned, worst: worstShort(R), at: R.t };
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
  const at = role === 'you' ? { x: 0, z: 0 } : homeOf(role, F.slide);
  return { role, x: at.x, z: at.z, h: 0, moving: false, path: [], steps: [], carry: null, dwell: 0, cooking: 0, cookT: 0, idle: 0 };
}
const lineOf = (w: Worker) => (w.role === 'you' ? undefined : HIRES[w.role].line);
/** How much a hire carries at a time (the player, their arms' worth). */
export const carryCap = (w: Worker) => w.cap ?? (HIRE_LOAD + HIRE_LOAD_UP * (lineOf(w) ? F.lines[lineOf(w)!].up : 1)) * (w.role === 'picker' ? PICKER_BASKET : 1);
function ledgeSpot(k: Ing): XZ { return { x: LEDGE[k].x, z: POT_PAD.z - 0.3 }; }

/** A line's hire's next job: ready ones to the ledge, or raw ones from the bins into the machines. */
function planLine(w: Worker, k: Ing): Step[] | null {
  const ms = F.lines[k].m, cap = carryCap(w);
  if (!ms.length || (k === 'mush' && !growOpen())) return null;
  // take ready ones to the ledge, from as many machines as one armful takes: set off as soon as it's short of full, so
  // the pot never waits on the walk (and a full ledge sends Mama Moray's what the pot can't hold)
  if (F.pantry[k] < LEDGE_CAP * SET_OFF) {
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
/** The player's next job, in a forecast: whatever's most pressing that nothing and nobody else does (the mockup's
 *  "You"): carrying bowls till the attendant's hired or the slide's bought, cooking till there's a cook, and running the
 *  lines that have no hire. Only what's theirs alone, so the gong's forecast is the least they'll do, and anything more
 *  (cooking beside the cook, carrying beside the slide) only turns more. */
function thinkYou(w: Worker): Step[] | null {
  const opts: [number, () => Step[] | null][] = [];
  const stallLow = F.stall.length < 6, rush = !!F.rush && !F.rush.done;
  if (!F.hires.attendant && !F.slide && F.counter.length && F.stall.length < STALL_CAP) opts.push([3 + (stallLow ? 4 : 0) + (rush ? 4 : 0) + F.counter.length * 0.2, planBowls]);
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
  // (the attendant carries bowls till the bowl line's in, then works its motor)
  return !F.slide && F.counter.length && F.stall.length < STALL_CAP ? planBowls() : null;
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
    // (the cook stays at the pot; the player cooks a few batches, then sees what else needs doing, unless they're there
    // to stay)
    case 'cook': w.cooking = w.role === 'cook' || w.stay ? Infinity : 3.5; return true;
    case 'take': {
      const n = Math.min(w.cap ?? ATTENDANT_BOWLS, F.counter.length, STALL_CAP - F.stall.length);
      if (!n) return false;
      w.carry = { k: 'bowl', bowls: F.counter.splice(0, n) };
      return true;
    }
    case 'stall':
      if (w.carry?.k === 'bowl') {
        const room = STALL_CAP - F.stall.length;
        F.stall.push(...w.carry.bowls.slice(0, room)); F.counter.unshift(...w.carry.bowls.slice(room));
        if (room > 0 && w.carry.bowls.length) openDoors();
      }
      w.carry = null;
      return true;
  }
}
/** How much a worker's carrying. */
const load = (w: Worker) => (!w.carry ? 0 : w.carry.k === 'bowl' ? w.carry.bowls.length : w.carry.n);
/** A hire's moment: cooking, busy at a station, walking to the next one, or thinking what to do. */
function updWorker(w: Worker, dt: number) {
  w.moving = false;
  if (w.cooking > 0) {
    w.cooking -= dt;
    if (w.role === 'cook' || w.stay) tendPot(w, dt);
    else if (!tendPot(w, dt)) w.cooking = 0;
    return;
  }
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
      if (w.idle > 2.5 && w.role !== 'you') { w.idle = 0; const home = homeOf(w.role, F.slide); if (Math.hypot(w.x - home.x, w.z - home.z) > 0.3) w.path = cellarWay(w, home); }
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
  // (the doors still shut: no local fight yet, its preparation waiting at its start)
  if (F.quiet && !R) { B.t = 0; return; }
  B.t += dt;
  // (a boss called in by the gong waits on this local's result: after the fall it hurries)
  if (F.called && B.phase === 'pay' && B.t > LANDS) B.t += dt * (HURRY - 1);
  // (a boss's preparation lasts until his bell: updRush)
  if (B.phase === 'prep' && !R && B.t >= BOUT.prep) {
    // the stall shuts: the hungry go home, and the champion wins the free show
    F.queue = [];
    toSeats(true);
  } else if (B.phase === 'sit' && B.t >= BOUT.sit) {
    B.phase = 'fight'; B.t = 0; B.noise = rnd() * 6;
    if (real) on.bout('fight');
  } else if (B.phase === 'fight') {
    // the pair lean the way the crowd does (against the boss's line: past it, the champion's way), and wrestle it out
    // to the winner's side
    const { yours, theirs } = sides(), all = Math.max(1, yours + theirs), line = all * ((R && bossOf(R.boss).share) || 0.5);
    const lean = (yours - line) / all * 0.7;
    // (a tight one goes the other way first: the winner's driven back to his own straw, and turns it there at the end)
    const k = B.t / BOUT.fight, target = (B.win ? 1 : -1) * (B.finish === 'tight' ? -0.85 : 1), wobble = Math.sin(B.t * 1.7 + B.noise) * 0.4 * (1 - k);
    B.tug = clamp(lean + wobble + (target - lean) * ease(clamp((k - 0.35) / 0.6, 0, 1)), -1, 1);
    if (B.t >= BOUT.fight) fightOver();
  } else if (B.phase === 'pay' && B.t >= payLen()) {
    // the fans go home, and the next ones come in (or the boss the gong called, his crowd)
    F.rush = null; F.queue = [];
    F.bout = freshBout(B.n);
    if (F.called) { F.called = false; callIn(); }
    else if (real) on.bout('prep');
  }
}
/** The fight's over: its result. */
function fightOver() {
  const B = F.bout, R = F.rush;
  B.phase = 'pay'; B.t = 0; B.n++;
  if (R) bossResult(R);
  // (a local bout over: one fewer for a scandal to last)
  else if (F.den.scandal.bouts > 0) F.den.scandal.bouts--;
  if (real) on.bout('pay');
}

// ---------- every frame ----------
/** Moves the cellar on by `dt` seconds. */
export function step(dt: number) {
  F.t += dt;
  if (F.bonus.t > 0 && (F.bonus.t -= dt) <= 0) F.bonus = { pct: 0, t: 0 };
  syncMachines();
  updMachines(dt);
  ladle(dt);
  slideBowls(dt);
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
/** The player standing at the pot keeps it cooking, full batches (a cook beside them cooks his too). */
export function playerAtPot(dt: number) {
  tendPot(F, dt);
}
/** The player at the counter: takes a bowl (true for a mushroom bowl), if there is one. */
export const takeBowl = (): boolean | undefined => F.counter.shift();
/** The player at the stall: sets a bowl out, if there's room. */
export function toStall(m: boolean) {
  if (F.stall.length >= STALL_CAP) return false;
  F.stall.push(m);
  openDoors();
  return true;
}
/** The first soup's out (or the gong's rung): the doors open, and the first local fight's fans come straight in. */
function openDoors() {
  if (!F.quiet) return;
  F.quiet = false;
  if (F.rush) return;
  F.bout = freshBout(F.bout.n);
  if (real) on.bout('prep');
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
export function buySlide() { F.slide = true; }
export function buyFastSlide() { F.fast = true; }

// ---------- saving ----------
/** The cellar, for saving: a rush cut short by closing the page is called off (no win, no loss). */
export function saveFight(): Fight {
  const f = structuredClone(F);
  // (and a fix that held on it holds again next time: the player's paid for it)
  if (f.rush?.fix && !f.rush.fix.caught) f.den.eddie = { boss: f.rush.boss, cut: f.rush.fix.cut, caught: false };
  if (f.rush) { f.rush = null; f.queue = []; f.bout = freshBout(f.bout.n); }
  f.called = false;
  return f;
}
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** A saved cooking show left half way, if it reads back (chanko.ts makes sense of its numbers). */
function showFrom(v: unknown): ShowRun | null {
  const r = v as Partial<ShowRun> | null;
  if (!r || typeof r !== 'object' || !isNum(r.step) || !Array.isArray(r.got) || !Array.isArray(r.lines)) return null;
  const nums = (a: unknown, n: number, lo: number, hi: number) => (Array.isArray(a) ? a.filter(isNum).slice(0, n).map(x => clamp(x, lo, hi)) : []);
  return {
    step: clamp(Math.floor(r.step), 0, 4),
    got: [0, 1, 2, 3].map(j => nums(r.got![j], 16, -1, 60)),
    lines: nums(r.lines, 3, 0, 1),
  };
}
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
      boughtOut: !!r.boughtOut, practice: r.practice === true, sparred: r.sparred === true, quiet: r.quiet === true,
      hires: Object.fromEntries((Object.keys(HIRES) as Role[]).filter(k => r.hires?.[k]).map(k => [k, true])),
      pantry: Object.fromEntries(ING.map(k => [k, clamp(Math.floor(num(r.pantry?.[k])), 0, LEDGE_CAP)])) as Record<Ing, number>,
      pot: list<boolean>(r.pot, x => typeof x === 'boolean').slice(0, POT_CAP),
      counter: list<boolean>(r.counter, x => typeof x === 'boolean').slice(0, COUNTER_CAP),
      stall: list<boolean>(r.stall, x => typeof x === 'boolean').slice(0, STALL_CAP),
      queue: list<number>(r.queue, isNum),
      fed: list<number>(r.fed, isNum), cooked: list<number>(r.cooked, isNum), full: list<number>(r.full, isNum),
      fullAcc: num(r.fullAcc), earned: list<[number, number]>(r.earned, x => Array.isArray(x) && x.every(isNum)),
      seed: clamp(Math.floor(num(r.seed, 3)), 1, 2147483646), cookT: 0,
      bonus: BONUS_TIERS.some(x => x.pct && x.pct === r.bonus?.pct) && num(r.bonus?.t) > 0 ? { pct: r.bonus!.pct, t: clamp(num(r.bonus?.t), 0, BONUS_S) } : b.bonus,
      show: showFrom(r.show),
      slide: r.slide === true, slideAcc: 0, fast: r.slide === true && r.fast === true, resto: Math.max(0, Math.floor(num(r.resto))),
      den: {
        // (a game saved before the doorman's door: the way's open already, if the second boss was beaten)
        book: typeof r.den?.book === 'boolean' ? r.den.book : num(r.beaten) >= 2,
        way: typeof r.den?.way === 'boolean' ? r.den.way : num(r.beaten) >= 2,
        door: r.den?.door === true, monte: { bout: Math.floor(num(r.den?.monte?.bout, -1)), played: clamp(Math.floor(num(r.den?.monte?.played)), 0, 99) },
        eddie: num(r.den?.eddie?.cut) >= 1
          ? { boss: clamp(Math.floor(num(r.den?.eddie?.boss, -1)), -1, BOSSES.length - 1), cut: clamp(Math.round(num(r.den?.eddie?.cut)), 1, 5), caught: r.den?.eddie?.caught === true }
          : b.den.eddie,
        scandal: { cut: clamp(Math.round(num(r.den?.scandal?.cut)), 0, 5), bouts: clamp(Math.floor(num(r.den?.scandal?.bouts)), 0, 3) },
        loan: { owed: Math.max(0, num(r.den?.loan?.owed)), total: Math.max(0, num(r.den?.loan?.total), num(r.den?.loan?.owed)) },
        // (a game saved before the Family introduced themselves: met, if it shows he's been used — a fix still to come
        // or a scandal running, a loan owed, a game of monte played)
        met: r.den?.met && typeof r.den.met === 'object'
          ? { eddie: r.den.met.eddie === true, harry: r.den.met.harry === true, tommy: r.den.met.tommy === true }
          : {
            eddie: num(r.den?.eddie?.cut) >= 1 || num(r.den?.scandal?.bouts) > 0,
            harry: num(r.den?.loan?.owed) > 0,
            tommy: num(r.den?.monte?.bout, -1) >= 0,
          },
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
        crowd: Math.floor(num(o.crowd, -1)), came: Math.floor(num(o.came)), fed: Math.floor(num(o.fed)), finish: FINISHES.includes(o.finish) ? o.finish : 'push' };
    }
    // the crew start their jobs over, from where they stand
    for (const role of Object.keys(f.hires) as Role[]) {
      const w = list<Partial<Worker>>(r.crew, x => !!x && typeof x === 'object').find(x => x.role === role), at = worker(role);
      f.crew.push(w && isNum(w.x) && isNum(w.z) ? { ...at, x: w.x, z: w.z } : at);
    }
    return f;
  } catch { return b; }
}
