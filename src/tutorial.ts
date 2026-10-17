// The tutorial for stage 1: the market's ideas one at a time, each the first time it matters. A gold arrow bobs over
// where to go, with a ring on the ground under it and a bubble saying what to do there; while that's off-screen, the
// bubble waits at the edge of the screen and points the way. First the market's loop, in order: fish on the 🎣 pad,
// pick up the slices, drop them on the counter, collect the cash. Then buying, cheapest first: Bigger arms, a level at
// the 📈 Upgrade square, and the auto harpoon. Each is a goal to save up for, shown by the cash in the HUD with how
// close it is, so there's always something to do; once there's the cash, the arrow leads to where it's bought. One
// bought ahead of its turn counts. The star rating some tiles need is a tip for when it comes up.
// Each idea is learnt by doing it (the rating by reading about it), and isn't shown to the same player again: what's
// learnt is kept on the device, so Restart doesn't bring it back, and in the save, so it follows a signed-in player to
// their other devices. A save from before the tutorial counts what it has done already. Learning the last of the basics
// (the harpoon, usually) brings up a banner saying the tutorial's complete, and that the rest is up to the player; the
// rating, which only comes up after a few more upgrades, is a tip for later, outside the tutorial proper.
// Stage 3 has a tutorial of its own, the same way, for what's new down in the cellar (nothing stage 1 already taught):
// first a look round at how a fight goes (the ring, the fans fed at the stall on your side, 💪 counting them, the gong
// calling a boss with a crowd of his own, and turning half of them before his bell), each read once the player's walked
// over to the thing it's about; then the
// dumbwaiter's bins, the racks and barrels, standing at the pot to cook, the bowls from the counter out to the stall,
// the cooking game at the pot, played once (a bonus game, so not one of the basics), the cheapest thing at the shop
// counter (saved up for in 🐡), and the gong: the practice fight against the champion's
// sparring partner (fight.ts), whose small crowd a full stall turns (so it's pointed at once the forecast says it's
// won, and the stall until then); winning it is the end of it. Any game that's beaten no boss and never won it has it
// to come, older ones too (fight.ts, owedPractice). (A game without one, a test's, has the first boss instead, pointed
// at only once its forecast says it's a win.) Then tips for later: the fans' chips and Fugu's cut, and the grow room's
// beds. A save from before the cellar's lessons counts what it has done down there already; one from before the look
// round skips it if it's had a fight.
import { Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { buyButtonShown, touchBuy } from './buy';
import { BAR_PAD, BENCH_PAD, BIN_PADS, COUNTER_PAD, GONG, GONG_PAD, machinePad, POT_PAD, type Pad } from './cellarPlan';
import { C1 } from './counters';
import { modCost, MODS, mods } from './economy';
import {
  BOSSES, canShow, doneCount, F, forecast, growOpen, lineRoom, mach, nextBoss, PER_BATCH, practiceDue, showsDone, sold, toBeat,
} from './fight';
import { filletsInProgress } from './fishing';
import { detail, quietly } from './kit';
import { CELLAR_Y, level, stage } from './layout';
import { player } from './player';
import { onScreen } from './pointers';
import { guideArrow, softRing } from './propsWorld';
import { bakePainted, G, painted, scene } from './render';
import { unlock } from './sfx';
import { atSquare, modOffered, SHOPS } from './shop';
import { staging } from './stage';
import { PAD, pile, PILE } from './stations';
import { banner, confetti, toast } from './ui';
import { locked, menuOffer, onOffer, tiles, type Tile } from './unlocks';
import { chips, d2xz, FY, price, type XZ } from './util';
import { wallet } from './wallet';

export type Lesson = 'fish' | 'pick' | 'sell' | 'cash' | 'buy' | 'shop' | 'harpoon' | 'stars'
  | 'ring' | 'fed' | 'boss' | 'bell' | 'bins' | 'prep' | 'pot' | 'bowls' | 'cook' | 'bench' | 'gong' | 'chips' | 'power' | 'grow';
// ('power' was a tip for later, before the look round said it up front: kept, so a save's copy of it isn't dropped)
const LESSONS: Lesson[] = [
  'fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'harpoon', 'stars',
  'ring', 'fed', 'boss', 'bell', 'bins', 'prep', 'pot', 'bowls', 'cook', 'bench', 'gong', 'chips', 'power', 'grow',
];
/** Device storage for what's been learnt (the save keeps a copy too). */
const KEY = 'floe-market-tutorial';
/** Forgets what this device has learnt (the demo build, which keeps nothing, so every visit starts over). */
export function forgetLessons() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable: there's nothing kept */ }
}
/** Seconds a lesson that's learnt by reading stays in view first. */
const READ = 6;
/** Seconds a card of the cellar's look round stays up once the player's walked over to what it's about. */
const VISIT = 2.5;
/** Seconds the banner saying it's all done stays up. */
const CHEER = 4;

/** Where a lesson points: a spot on the ground, and how near counts as being there. */
interface Spot extends XZ { y: number; r: number }
/** Something to save up for, and where it's bought: what it is, and what's left to pay. */
export interface Goal { icon: string; name: string; need: number; spot: Spot; inChips?: boolean }
interface Step {
  id: Lesson;
  /** The stage it's taught on (1 unless it says). */
  stage?: 3;
  /** Shown once this one's learnt: the loop goes in order. */
  after?: Lesson;
  /** Where to go, or null while there's nothing there yet (no cash to collect, nothing to afford). */
  at: () => Spot | null;
  /** The bubble: what to do, and a line more. */
  say: () => [string, string?];
  /** Done it: learnt. */
  done?: () => boolean;
  /** Learnt by having it in view this long instead. */
  read?: number;
  /** (with `read`) Read standing at its spot: the player walks over to it first, and the time counts only there. */
  visit?: boolean;
  /** A tip for later, when it comes up: not one of the basics the tutorial is complete without. */
  later?: boolean;
  /** Stays up while the player stands there (buying needs holding there); the others step aside for the player. */
  stay?: boolean;
  /** A game from before the tutorial has done it already. */
  known: () => boolean;
  /** Buying lessons: what's being saved up for. The arrow shows the way once there's the cash. */
  goal?: () => Goal | null;
}

/** A game that's been played: it's bought something, or got to stage 2. Its player knows the loop. */
const played = () => stage.n > 1 || tiles.some(t => t.paid > 0) || MODS.some(m => mods[m.id] > 0);
const at = (p: XZ, r: number): Spot => ({ x: p.x, y: FY, z: p.z, r });
/** A tile, as a goal. */
const tileGoal = (t: Tile | undefined): Goal | null =>
  t && !t.done ? { icon: t.icon, name: t.name, need: t.cost - t.paid, spot: { x: t.x, y: t.y ?? FY, z: t.z, r: t.half } } : null;
/** The cheapest upgrade on offer that's open (not Korki's statue, which is always there). */
const cheapest = () => onOffer().filter(t => !t.always && !t.done && !locked(t)).sort((a, b) => a.cost - b.cost)[0];
const harpoon = () => tiles.find(t => t.id === 'turret')!;
/** A goal's spot, once there's the cash for it. */
const reached = (g: Goal | null) => (g && wallet.money >= g.need ? g.spot : null);
const firstLocked = () => onOffer().find(locked) ?? null;
/** How to buy, on this device: the Buy button on a touch screen, or E. */
const hold = () => touchBuy() ? 'Stand on it and hold Buy' : buyButtonShown() ? 'Stand on it and hold E or Buy' : 'Stand on it and hold E';
/** Cash at the start of the cash lesson, to see it go up. */
let cash0 = 0;

// ---------- stage 3: the cellar ----------
const down = (p: Pad, r = p.r): Spot => ({ x: p.x, y: CELLAR_Y, z: p.z, r });
/** How many of a kind the player has in their arms, counting what's still flying into them. */
const carried = (kind: string) => player.back.all().filter(m => m.userData.kind === kind).length;
const holding = (...kinds: string[]) => kinds.some(k => carried(k) > 0);
/** Something bought down here: a level at the shop counter, a machine, a hire, a bigger venue. */
const boughtBelow = () => MODS.some(m => m.stage === 3 && mods[m.id] > 0) || F.lines.rice.n > 1 || F.lines.fish.n > 1
  || Object.values(F.hires).some(Boolean) || F.tier > 0;
/** A cellar that's sold soup: it's beaten a boss, or has chips coming in, bowls about, or a crew working it. */
const served = () => F.beaten > 0 || F.earned.length > 0 || F.pot.length + F.counter.length + F.stall.length > 0
  || F.lines.rice.n > 1 || F.lines.fish.n > 1 || Object.values(F.hires).some(Boolean);
/** The prep hall's two lines, and what each one's raw and ready in the player's arms. */
const PREP = ['rice', 'fish'] as const;
type PrepLine = typeof PREP[number];
const RAW = { rice: 'rice', fish: 'fish' }, READIED = { rice: 'rrice', fish: 'cfish' };
const LINE = {
  rice: { put: 'Rice dries on the rack', wait: 'Drying', take: 'Take the dried rice' },
  fish: { put: 'Fish goes in salt', wait: 'Salting', take: 'Take the salted fish' },
};
/** How many of a line's are ready, in the player's arms and on the pot's ledge. */
const readyOf = (k: PrepLine) => carried(READIED[k]) + F.pantry[k];
/** A line's machines: how many are in them still going and ready, and seconds until the next is ready. */
function inLine(k: PrepLine) {
  let going = 0, ready = 0, next = Infinity;
  const M = mach(k);
  for (const m of F.lines[k].m) {
    const d = doneCount(k, m);
    ready += d; going += m.items.length - d;
    for (const p of m.items) if (p < 1) next = Math.min(next, (1 - p) * M.time);
  }
  return { going, ready, next };
}
/**
 * Where the prep hall's lesson points, and what it says, until there's a batch's worth of rice and fish ready: raw
 * ones in the player's arms into their machines (and how long they take), then a line that's short to its bin, then the
 * ready ones out of the machines, and while they're still going, how long until they're ready.
 */
function prepping(): { at: Spot; say: [string, string?] } | null {
  const short = PREP.filter(k => readyOf(k) < PER_BATCH);
  if (!short.length) return null;
  const machine = (k: PrepLine) => down(machinePad(k, 0, F.lines[k].n));
  for (const k of PREP) {
    if (carried(RAW[k]) && lineRoom(k) > 0) return { at: machine(k), say: [LINE[k].put, `Ready in ${mach(k).time} s`] };
  }
  for (const k of short) {
    const l = inLine(k);
    if (readyOf(k) + l.going + l.ready + carried(RAW[k]) < PER_BATCH) {
      const has = (o: PrepLine) => readyOf(o) + inLine(o).going + inLine(o).ready + carried(RAW[o]) > 0;
      const say: [string, string?] = has(k) ? [`Grab more ${k}`, `The pot takes ${PER_BATCH}`]
        : has(PREP.find(o => o !== k)!) ? [`Now grab ${k} too`, 'The pot needs both'] : [`Grab ${k} here`];
      return { at: down(BIN_PADS[k]), say };
    }
  }
  for (const k of short) if (inLine(k).ready) return { at: machine(k), say: [LINE[k].take] };
  for (const k of short) {
    const l = inLine(k);
    if (l.going) return { at: machine(k), say: [`${LINE[k].wait}… ${Math.max(1, Math.ceil(l.next))} s`, 'Then take them out'] };
  }
  return null;
}
/** The cheapest thing on sale at the shop counter, a level or a room's upgrade (so the first's bought soonest). */
const cheapestBelow = () => [
  ...MODS.filter(m => m.stage === 3 && modOffered(m.id)).map(m => ({ icon: m.icon, name: m.name, c: modCost(m.id) ?? Infinity })),
  ...menuOffer().map(t => ({ icon: t.icon, name: t.name, c: t.cost })),
].sort((a, b) => a.c - b.c)[0];
/** The practice fight's been due in this game (so its being over means it was won). */
let practised = false;
/** Whether the gong's forecast says the next boss is beaten: worked out once a second, as it runs the whole rush. */
let readyAt = -Infinity, ready = false;
function gongReady() {
  const b = nextBoss();
  if (!b || F.rush) return false;
  if (F.t < readyAt || F.t - readyAt >= 1) {
    readyAt = F.t;
    const f = forecast();
    ready = !!f && f.turned >= toBeat(b);
  }
  return ready;
}
/** The card after a boss's fight is up (gong.ts). */
const cardUp = () => document.getElementById('fightCard')?.hidden === false;
/** The middle of the ring (cellar.ts's RING, kept apart from its 3D), and how near it counts as being at it: just
 *  outside its edge (the player can't step up on it). */
export const RING_AT = { x: -4.4, z: -1.4 }, RING_NEAR = 5.2;
/** The look round at how a fight goes: known to a game that's had a fight, a practice one or a boss's. */
const fought = () => F.beaten > 0 || F.sparred;
/** The lessons of the look round, which a save from before it counts on their own (loadLessons). */
const LOOK: Lesson[] = ['ring', 'fed', 'boss', 'bell'];
/** Standing at the pot. */
const atPot = () => d2xz(player.g.position, POT_PAD) < POT_PAD.r * POT_PAD.r;
/** How to start the cooking game, on this device. */
const cookKey = () => (touchBuy() ? 'Tap Cook' : 'Press E or Cook');

const STEPS: Step[] = [
  {
    id: 'fish', at: () => at(PAD, PAD.r), say: () => ['Stand here to fish', 'They get chopped into slices'],
    done: () => filletsInProgress() > 0 || pile.n > 0, known: played,
  },
  {
    id: 'pick', after: 'fish', at: () => at(PILE, 1.45), say: () => ['Pick up the fish slices'],
    done: () => player.back.n > 0, known: played,
  },
  {
    id: 'sell', after: 'pick', at: () => at(C1.dropPos!, 1), say: () => ['Drop them on the counter', 'Customers buy fish here'],
    done: () => C1.stock.n > 0 || C1.queue.some(c => c.hands.n > 0), known: played,
  },
  {
    id: 'cash', after: 'sell', at: () => (C1.cash.n ? at(C1.cashPos, 1.5) : null), say: () => ['Collect the cash', 'Walk over it'],
    done: () => wallet.money + wallet.inFlight > cash0, known: played,
  },
  {
    // the first upgrade: Bigger arms, the cheapest
    id: 'buy', after: 'cash', stay: true, goal: () => tileGoal(cheapest()), at: () => reached(tileGoal(cheapest())),
    say: () => [`Buy ${cheapest()?.name ?? 'an upgrade'} here`, hold()],
    done: () => tiles.some(t => t.paid > 0), known: played,
  },
  {
    // a level at the square: learnt by buying it, not just by looking; on the square, the bubble says how
    id: 'shop', after: 'buy', stay: true,
    goal: () => {
      const need = Math.min(...MODS.filter(m => m.stage === 1 && modOffered(m.id)).map(m => modCost(m.id) ?? Infinity));
      return { icon: '📈', name: 'Market upgrade', need, spot: at(SHOPS[0], 0.95) };
    },
    at: () => reached(STEPS.find(t => t.id === 'shop')!.goal!()),
    say: () => atSquare()
      ? ['Pick an upgrade', touchBuy() ? 'Tap one in the list to buy it' : 'Click one in the list to buy it']
      : ['Upgrade square', 'Better fish, more customers, a faster crew'],
    done: () => MODS.some(m => mods[m.id] > 0), known: () => stage.n > 1 || MODS.some(m => mods[m.id] > 0),
  },
  {
    // a machine that works for the player: the last of the basics
    id: 'harpoon', after: 'shop', stay: true, goal: () => tileGoal(harpoon()), at: () => reached(tileGoal(harpoon())),
    say: () => ['Buy the auto harpoon here', hold()],
    done: () => harpoon().done, known: () => played() || harpoon().done,
  },
  {
    id: 'stars', after: 'buy', read: READ, later: true,
    at: () => { const t = firstLocked(); return t ? { x: t.x, y: t.y ?? FY, z: t.z, r: 0 } : null; },
    say: () => [`Opens at ★${firstLocked()?.stars?.toFixed(1) ?? ''}`, 'Serve customers quickly for better reviews'],
    known: () => stage.n > 1 || tiles.some(t => !!t.stars && (t.open || t.done)),
  },
  // stage 3: what's new down in the cellar, in order: a look round at how a fight goes, the arrow leading to each thing
  // and its card read there; then from the dumbwaiter to the first fight
  {
    id: 'ring', stage: 3, read: VISIT, visit: true, stay: true, at: () => ({ ...RING_AT, y: CELLAR_Y, r: RING_NEAR }),
    say: () => ['Fight night happens in this ring', 'The side with more fans wins'], known: fought,
  },
  {
    // (and the 💪 by the cash glows)
    id: 'fed', stage: 3, after: 'ring', read: VISIT, visit: true, stay: true, at: () => down(BAR_PAD),
    say: () => ['Fed fans cheer for your champion', '💪 up top counts them'], known: fought,
  },
  {
    // (round the gong itself, so it's read before its pad's panel opens)
    id: 'boss', stage: 3, after: 'fed', read: VISIT, visit: true, stay: true, at: () => ({ ...GONG, y: CELLAR_Y, r: 2 }),
    say: () => ['Ring the gong to call a boss', 'He brings a crowd of his own'], known: fought,
  },
  {
    id: 'bell', stage: 3, after: 'boss', read: VISIT, visit: true, stay: true, at: () => down(BAR_PAD),
    say: () => ['Feed his fans to turn them', 'Turn half before his bell rings'], known: fought,
  },
  {
    id: 'bins', stage: 3, after: 'bell', at: () => down(BIN_PADS.rice), say: () => ['Grab rice or fish here', 'Sent down from upstairs'],
    done: () => holding('rice', 'fish'), known: served,
  },
  {
    // both lines, until there's a batch's worth of each ready: the pot takes rice and fish
    id: 'prep', stage: 3, after: 'bins', stay: true, at: () => prepping()?.at ?? null, say: () => prepping()?.say ?? [''],
    done: () => PREP.every(k => readyOf(k) >= PER_BATCH) || F.cooked.length > 0, known: served,
  },
  {
    id: 'pot', stage: 3, after: 'prep', stay: true, at: () => down(POT_PAD),
    say: () => ['Stand here to cook chanko', 'It only cooks while you stay'],
    done: () => F.cooked.length > 0 || F.pot.length + F.counter.length + F.stall.length > 0, known: served,
  },
  {
    // the bowls from the counter, then out on the stall (nothing to point at while the pot's still ladling)
    id: 'bowls', stage: 3, after: 'pot',
    at: () => (holding('bowl') ? down(BAR_PAD) : F.counter.length ? down(COUNTER_PAD) : null),
    say: () => (holding('bowl') ? ['Drop them in the stall', 'Fans come once it\'s out'] : ['Take the bowls']),
    done: () => F.stall.length > 0 || sold.n > 0, known: served,
  },
  {
    // the cooking game at the pot, played through once: a bonus game, so not one of the basics (nor its banner)
    // (nothing to point at while its bonus runs, and its own panel's up while it's on)
    id: 'cook', stage: 3, after: 'bowls', stay: true, later: true, at: () => (canShow() ? down(POT_PAD) : null),
    say: () => (!atPot() ? ['Play the cooking game here', 'Bigger batches for a while']
      : F.show ? ['Carry on your cooking game', cookKey()] : [cookKey(), 'Stars make bigger batches for 45 s']),
    done: () => showsDone.n > 0, known: () => F.bonus.t > 0 || !!F.show,
  },
  {
    // the cheapest thing at the shop counter, saved up for in chips; on the square, the bubble says how
    id: 'bench', stage: 3, after: 'bowls', stay: true,
    goal: () => {
      const l = cheapestBelow();
      return l ? { icon: l.icon, name: l.name, need: l.c, spot: down({ ...BENCH_PAD, r: 0.95 }), inChips: true } : null;
    },
    at: () => reached(STEPS.find(t => t.id === 'bench')!.goal!()),
    say: () => {
      const l = cheapestBelow();
      if (!atSquare()) return [`Buy ${l ? l.name[0].toLowerCase() + l.name.slice(1) : 'an upgrade'} here`, 'At the shop counter'];
      // (on a touch screen the menu opens folded, as its Shop button)
      if (document.getElementById('craft')?.hidden === false) return ['Tap Shop', 'Then pick an upgrade'];
      return ['Pick an upgrade', touchBuy() ? 'Tap one in the list to buy it' : 'Click one in the list to buy it'];
    },
    done: boughtBelow, known: boughtBelow,
  },
  {
    // the first fight: pointed at only once the forecast says it's won, and learnt by winning it (once its card's away)
    // the practice fight (or, for a game from before it, the first boss once he's a win), learnt by winning it, once
    // its card's away
    // (in practice, the stall first while the forecast says it'd be lost: a full stall always wins it)
    id: 'gong', stage: 3, after: 'bench',
    at: () => (gongReady() ? down(GONG_PAD) : practiceDue() && !F.rush ? down(BAR_PAD) : null),
    say: () => (!practiceDue() ? ['Ring the gong', 'Your crowd is ready']
      : gongReady() ? ['Ring the gong', 'A practice fight to start'] : ['Fill the stall first', 'Then ring the gong']),
    done: () => (F.beaten > 0 || (practised && !F.practice)) && !cardUp(), known: () => F.beaten > 0,
  },
  {
    id: 'chips', stage: 3, after: 'bowls', read: READ, later: true, at: () => (sold.n > 0 ? down(BAR_PAD, 0) : null),
    say: () => ['Fans pay in 🐡 chips', 'Fugu keeps 30%'], known: served,
  },
  {
    id: 'grow', stage: 3, after: 'gong', read: READ, later: true,
    at: () => (growOpen() && F.lines.mush.n > 0 ? down(machinePad('mush', 0, F.lines.mush.n), 0) : null),
    say: () => ['Mushrooms grow here', 'The pot wants 🍄 too'], known: () => F.beaten > 1 || !!F.hires.picker,
  },
];

const learnt = new Set<Lesson>();
/** The lesson showing and how long it's been in view, and what's being saved up for. */
export const lesson = { now: null as Step | null, viewed: 0, goal: null as Goal | null };
/** The buying lesson whose goal it is, to say so when a new one starts. */
let saving: Step | null = null;
/** What the device knows has been read in. */
let fromDevice = false;
/** A save from before the tutorial (one with no lessons in it) has just loaded: its player knows what it has done. A
 *  game since keeps its own lessons, so a reload mid-tutorial doesn't skip what's still to come. */
export function olderGame() { learn(STEPS.filter(s => s.known()).map(s => s.id)); }
/** A save's lessons (or, from before the tutorial, none: what it has done). A save from before the cellar's lessons
 *  (none of them in it) counts what it has done down there, lesson by lesson. */
export function loadLessons(ids: readonly unknown[] | null) {
  if (!ids) { olderGame(); return; }
  learn(ids);
  const below = STEPS.filter(s => s.stage === 3);
  if (!below.some(s => ids.includes(s.id))) learn(below.filter(s => s.known()).map(s => s.id));
  // (and one from before the look round at how a fight goes, which came later, skips it if it's had a fight)
  else if (!LOOK.some(id => ids.includes(id))) learn(STEPS.filter(s => LOOK.includes(s.id) && s.known()).map(s => s.id));
}

function store() {
  try { localStorage.setItem(KEY, JSON.stringify([...learnt])); } catch { /* storage unavailable: the save still has it */ }
}
/** Marks lessons learnt (from the device, a save, or doing them). */
export function learn(ids: readonly unknown[]) {
  if (!fromDevice) {
    // read on first use, so a save's lessons (loaded before the first tick) add to the device's rather than replace them
    fromDevice = true;
    let mine: unknown = [];
    try { mine = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { /* storage unavailable or garbled */ }
    if (Array.isArray(mine)) for (const id of mine) if (LESSONS.includes(id)) learnt.add(id as Lesson);
  }
  const n = learnt.size;
  for (const id of ids) if (LESSONS.includes(id as Lesson)) learnt.add(id as Lesson);
  if (learnt.size !== n) store();
}
/** What this player has learnt, for the save. */
export const learntLessons = () => LESSONS.filter(id => learnt.has(id));

/** A lesson still to learn whose turn has come. */
const due = (s: Step) => !learnt.has(s.id) && (!s.after || learnt.has(s.after));
/** A lesson's stage is being played, and not changing: the cellar's down in the cellar. */
const live = (s: Step) => (s.stage ?? 1) === stage.n && !staging() && (s.stage !== 3 || level.down);
/** The first lesson due whose spot is there. */
const next = () => STEPS.find(s => live(s) && due(s) && s.at()) ?? null;
/** The cellar's basics are known: its entry needs only a reminder where to start (stage.ts). */
export const cellarKnown = () => STEPS.every(s => s.stage !== 3 || s.later || learnt.has(s.id));

/** Seconds left of the banner saying the tutorial's complete. */
let cheer = 0;
/** The banner for the last of the basics learnt: only ever by playing, never for a game that knew them already. */
function complete(n: number) {
  if (n === 3 && F.beaten === 0) banner('Practice won', 'Tutorial complete', `Now take on ${BOSSES[0].name} ${BOSSES[0].face}`);
  else if (n === 3) banner('First fight won', 'Tutorial complete', 'Four more bosses to go');
  else banner('Well done', 'Tutorial complete', 'The rest is up to you. Go make it big!');
  confetti();
  unlock();
  cheer = CHEER;
}

/** Learns a lesson by playing: the last of a stage's basics completes its tutorial. */
function finish(s: Step) {
  learn([s.id]);
  const n = s.stage ?? 1;
  if (!s.later && STEPS.every(t => (t.stage ?? 1) !== n || t.later || learnt.has(t.id))) complete(n);
}
/** A price, in the goal's money (rounded up; what's saved so far, `held`, rounded down). */
const cost = (g: Goal, v: number, held = false) => (g.inChips ? chips(v, !held) : price(v));

/** Each tick: learns what's been done, and picks the lesson to show. */
export function updTutorial(dt: number) {
  if (!fromDevice) learn([]); // reads in what the device knows
  if (F.practice) practised = true;
  // (the stage-up has the banner to itself)
  if (cheer > 0 && (cheer -= dt) <= 0 && !staging()) banner(null);
  const s = lesson.now;
  if (s && (s.done?.() || (s.read && lesson.viewed >= s.read))) finish(s);
  // anything bought before its turn counts when its turn comes, in order (and anything done in the cellar, down there)
  for (const t of STEPS) if ((t.goal || (t.stage === 3 && live(t))) && t.done && due(t) && t.done()) finish(t);
  // what's to save up for next: said once as it starts, and shown by the cash
  const g = STEPS.find(t => t.goal && due(t) && live(t)) ?? null;
  lesson.goal = g?.goal!() ?? null;
  if (g !== saving) {
    saving = g;
    if (g && lesson.goal && wallet.money < lesson.goal.need) {
      toast(`Next goal: ${lesson.goal.name}, ${cost(lesson.goal, lesson.goal.need)}`, 'goal', 3000);
    }
  }
  const n = next();
  if (n !== lesson.now) {
    lesson.now = n; lesson.viewed = 0;
    if (n?.id === 'cash') cash0 = wallet.money + wallet.inFlight;
  }
}

// ---------- what it looks like ----------
const GOLD = 0xFFC34A;
/** The arrow: a gold point and shaft, baked as one mesh, pointing down at the spot. */
const arrowLo = new Mesh(bakePainted([
  { geo: G.cone, at: [0, 0.25, 0], rot: [Math.PI, 0, 0], scale: [0.42, 0.5, 0.42], c: GOLD },
  { geo: G.cyl, at: [0, 0.75, 0], scale: [0.16, 0.5, 0.16], c: GOLD },
]), painted);
const ringMat = new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7, depthWrite: false });
// just outside the spot's edge, a little over the deck's markings
const ringLo = new Mesh(new RingGeometry(1, 1.14, 40), ringMat);
/** The arrow and its ring. */
export const guide = new Group();
/**
 * On High, a rounded arrow with a rim and fins (so its spin shows), and a ring with soft edges (propsWorld.ts). The
 * arrow and the ring are each a group holding both versions, about the same point, so they bob, spin and pulse as one.
 */
const [arrow, ring, ringHiMat] = quietly(() => {
  const a = new Group(), r = new Group(), m = new MeshBasicMaterial({ color: GOLD, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false });
  const ah = guideArrow(GOLD).mesh(false), rh = new Mesh(softRing(), m);
  a.add(arrowLo, ah);
  r.add(ringLo, rh);
  detail(arrowLo, ah);
  detail(ringLo, rh);
  return [a, r, m] as const;
});
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.03;
guide.add(arrow, ring);
guide.visible = false;
scene.add(guide);
/** How high the arrow's tip floats over the spot: low, or over the player's head where they stand on it. */
const TIP = 1.2, OVER = 2.1;

const bubble = document.getElementById('coach')!, head = bubble.querySelector('b')!, more = bubble.querySelector('small')!;
const dir = bubble.querySelector<HTMLElement>('.dir')!, stars = document.getElementById('stars')!, power = document.getElementById('power')!;
/** The bubble's size (grows in), how long it's been up, and which lesson it was drawn for. */
let k = 0, t = 0, drawn: Step | null = null, said = '';
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const goalEl = document.getElementById('goal')!, goalIc = document.getElementById('goalIc')!;
const goalName = document.getElementById('goalName')!, goalN = document.getElementById('goalN')!;
const goalBar = document.getElementById('goalBar')!;
let goalShown = '';
/** The goal by the cash: what's being saved up for, how much so far, and a bar filling up; gold once it's there. */
function drawGoal() {
  const g = lesson.goal, have = Math.max(0, Math.floor(wallet.money));
  const key = g ? `${g.icon}${g.name}${g.need}|${Math.min(have, g.need)}` : '';
  if (key === goalShown) return;
  goalShown = key;
  goalEl.hidden = !g;
  if (!g) return;
  const ready = have >= g.need;
  goalIc.textContent = g.icon;
  goalName.textContent = g.name;
  goalN.textContent = ready ? `${cost(g, g.need)} ✓` : `${cost(g, have, true)} / ${cost(g, g.need)}`;
  goalBar.style.width = Math.round(Math.min(1, have / Math.max(1, g.need)) * 100) + '%';
  goalEl.classList.toggle('ready', ready);
  goalEl.setAttribute('aria-label', ready ? `${g.name}: you can buy it now` : `Saving up for ${g.name}: ${cost(g, have, true)} of ${cost(g, g.need)}`);
}

/** A stage 3 panel's open (the gong's, Eddie's, Tommy's, Harry's), Eddie's coin's up, a fight's card, the cooking game,
 *  or a scene (on the way south, or one of the Family introducing himself): the bubble keeps out of its way. */
const PANELS = ['gong', 'eddie', 'monte', 'loans', 'coin', 'fightCard', 'show', 'way', 'meet'].map(id => document.getElementById(id));
const panelUp = () => PANELS.some(p => p && !p.hidden);

/** Each frame: places the arrow, ring and bubble for the lesson showing (main.ts; it needs the camera). */
export function drawTutorial(dt: number) {
  drawGoal();
  const s = lesson.now, spot = s?.at();
  if (s !== drawn) { drawn = s; k = 0; }
  // standing there doing it, the arrow and the bubble step aside, unless what to do there needs saying
  const there = !!s && !!spot && !s.stay && d2xz(player.g.position, spot) < spot.r * spot.r;
  const on = !!s && !!spot && !there && !panelUp();
  k = on ? Math.min(1, k + dt * 4) : 0;
  t += dt;
  guide.visible = on;
  bubble.hidden = !on;
  stars.classList.toggle('teach', on && s.id === 'stars');
  power.classList.toggle('teach', on && s.id === 'fed');
  if (!on) return;
  const calm = still(), bob = calm ? 0 : Math.sin(t * 4) * 0.12;
  // easing out with a little overshoot, like the pop-in (pop.ts)
  const pop = 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;
  guide.position.set(spot.x, spot.y, spot.z);
  const tip = s.stay ? OVER : TIP;
  arrow.position.y = tip + bob;
  arrow.rotation.y = calm ? 0 : t * 1.5;
  arrow.scale.setScalar(Math.max(0.01, pop));
  ring.visible = spot.r > 0;
  ring.scale.setScalar(spot.r * (calm ? 1 : 1 + Math.sin(t * 4) * 0.06));
  ringMat.opacity = ringHiMat.opacity = calm ? 0.7 : 0.55 + Math.sin(t * 4) * 0.2;

  const [title, line = ''] = s.say();
  if (title + line !== said) { said = title + line; head.textContent = title; more.textContent = line; more.hidden = !line; }
  const o = onScreen({ x: spot.x, y: spot.y + tip + 1.1, z: spot.z });
  if (s.visit ? d2xz(player.g.position, spot) < spot.r * spot.r : o.inView) lesson.viewed += dt;
  bubble.classList.toggle('edge', !o.inView);
  // the whole bubble stays on the screen (at the edge, with room for its badge)
  const bw = bubble.offsetWidth / 2, bh = bubble.offsetHeight / 2, m = o.inView ? 8 : 22;
  const x = Math.min(Math.max(o.x, bw + m), innerWidth - bw - m);
  let y = o.y;
  if (o.inView) y = Math.max(y, bh * 2 + m); // over the arrow, it sits above the point
  else {
    y = Math.min(Math.max(y, bh + m), innerHeight - bh - m);
    // the badge goes where the way out of the bubble meets its rim
    const c = Math.cos(o.angle), sn = Math.sin(o.angle);
    const r = Math.min(bw / Math.max(Math.abs(c), 1e-6), bh / Math.max(Math.abs(sn), 1e-6));
    dir.style.transform = `translate(${Math.round(c * r)}px, ${Math.round(sn * r)}px) rotate(${o.angle}rad)`;
  }
  bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, ${o.inView ? '-100%' : '-50%'}) scale(${pop.toFixed(3)})`;
}
