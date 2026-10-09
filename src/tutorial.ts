// The tutorial for stage 1: the market's ideas one at a time, each the first time it matters. A gold arrow bobs over
// where to go, with a ring on the ground under it and a bubble saying what to do there; while that's off-screen, the
// bubble waits at the edge of the screen and points the way. First the market's loop, in order: fish on the 🎣 pad,
// pick up the slices, drop them on the counter, collect the cash, and buy an upgrade once there's cash for one. Then,
// as they come up, the 📈 Upgrade square and the star rating some tiles need.
// Each idea is learnt by doing it (the rating by reading about it), and isn't shown to the same player again: what's
// learnt is kept on the device, so Restart doesn't bring it back, and in the save, so it follows a signed-in player to
// their other devices. A game from before the tutorial counts what it has done already. Learning the last one brings up
// a banner saying the tutorial's complete, and that the rest is up to the player.
import { Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { C1 } from './counters';
import { modCost, MODS, mods } from './economy';
import { steaksInProgress } from './fishing';
import { isTouch } from './hint';
import { stage } from './layout';
import { player } from './player';
import { onScreen } from './pointers';
import { bakePainted, G, painted, scene } from './render';
import { unlock } from './sfx';
import { atSquare, SHOPS } from './shop';
import { staging } from './stage';
import { PAD, pile, PILE } from './stations';
import { banner, confetti } from './ui';
import { locked, onOffer, tiles } from './unlocks';
import { d2xz, FY, type XZ } from './util';
import { wallet } from './wallet';

export type Lesson = 'fish' | 'pick' | 'sell' | 'cash' | 'buy' | 'shop' | 'stars';
const LESSONS: Lesson[] = ['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'stars'];
/** Device storage for what's been learnt (the save keeps a copy too). */
const KEY = 'floe-market-tutorial';
/** Seconds a lesson that's learnt by reading stays in view first. */
const READ = 6;
/** Seconds the banner saying it's all done stays up. */
const CHEER = 4;

/** Where a lesson points: a spot on the ground, and how near counts as being there. */
interface Spot extends XZ { y: number; r: number }
interface Step {
  id: Lesson;
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
  /** Stays up while the player stands there (buying needs holding there); the others step aside for the player. */
  stay?: boolean;
  /** A game from before the tutorial has done it already. */
  known: () => boolean;
}

/** A game that's been played: it's bought something, or got to stage 2. Its player knows the loop. */
const played = () => stage.n > 1 || tiles.some(t => t.paid > 0) || MODS.some(m => mods[m.id] > 0);
const at = (p: XZ, r: number): Spot => ({ x: p.x, y: FY, z: p.z, r });
/** The cheapest upgrade on offer that's open and paid for by the cash at hand (not Korki's statue, always there). */
function affordable() {
  const ok = onOffer().filter(t => !t.always && !t.done && !locked(t) && t.cost - t.paid <= wallet.money);
  return ok.sort((a, b) => a.cost - b.cost)[0] ?? null;
}
const firstLocked = () => onOffer().find(locked) ?? null;
/** Cash at the start of the cash lesson, to see it go up. */
let cash0 = 0;

const STEPS: Step[] = [
  {
    id: 'fish', at: () => at(PAD, PAD.r), say: () => ['Stand here to fish', 'They get chopped into slices'],
    done: () => steaksInProgress() > 0 || pile.n > 0, known: played,
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
    id: 'buy', after: 'cash', stay: true,
    at: () => { const t = affordable(); return t ? { x: t.x, y: t.y ?? FY, z: t.z, r: t.half } : null; },
    say: () => [`Buy ${affordable()?.name ?? 'an upgrade'} here`, isTouch() ? 'Stand on it and hold Buy' : 'Stand on it and hold E'],
    done: () => tiles.some(t => t.paid > 0), known: played,
  },
  {
    id: 'shop', after: 'buy',
    at: () => (MODS.some(m => m.stage === 1 && (modCost(m.id) ?? Infinity) <= wallet.money) ? at(SHOPS[0], 0.95) : null),
    say: () => ['Upgrade square', 'Better fish, more customers, a faster crew'],
    done: () => atSquare(), known: () => stage.n > 1 || MODS.some(m => mods[m.id] > 0),
  },
  {
    id: 'stars', after: 'buy', read: READ,
    at: () => { const t = firstLocked(); return t ? { x: t.x, y: t.y ?? FY, z: t.z, r: 0 } : null; },
    say: () => [`Opens at ★${firstLocked()?.stars?.toFixed(1) ?? ''}`, 'Serve customers quickly for better reviews'],
    known: () => stage.n > 1 || tiles.some(t => !!t.stars && (t.open || t.done)),
  },
];

const learnt = new Set<Lesson>();
/** The lesson showing, and how long it's been in view. */
export const lesson = { now: null as Step | null, viewed: 0 };
/** What the device knows has been read in; and older games' lessons counted (on the first tick, after loading). */
let fromDevice = false, started = false;

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

/** The first lesson still to learn whose turn it is and whose spot is there. */
function next() {
  if (stage.n !== 1 || staging()) return null;
  return STEPS.find(s => !learnt.has(s.id) && (!s.after || learnt.has(s.after)) && s.at()) ?? null;
}

/** Seconds left of the banner saying the tutorial's complete. */
let cheer = 0;
/** The banner for the last lesson learnt: only ever by playing, never for a game that knew them all already. */
function complete() {
  banner('Well done', 'Tutorial complete', 'The rest is up to you. Go make it big!');
  confetti();
  unlock();
  cheer = CHEER;
}

/** Each tick: learns what's been done, and picks the lesson to show. */
export function updTutorial(dt: number) {
  if (!started) {
    // what an older game shows its player knows already
    started = true;
    learn(STEPS.filter(s => s.known()).map(s => s.id));
  }
  // (the stage-up has the banner to itself)
  if (cheer > 0 && (cheer -= dt) <= 0 && !staging()) banner(null);
  const s = lesson.now;
  if (s && (s.done?.() || (s.read && lesson.viewed >= s.read))) {
    learn([s.id]);
    if (learnt.size === LESSONS.length) complete();
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
const arrow = new Mesh(bakePainted([
  { geo: G.cone, at: [0, 0.25, 0], rot: [Math.PI, 0, 0], scale: [0.42, 0.5, 0.42], c: GOLD },
  { geo: G.cyl, at: [0, 0.75, 0], scale: [0.16, 0.5, 0.16], c: GOLD },
]), painted);
const ringMat = new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7, depthWrite: false });
// just outside the spot's edge, a little over the deck's markings
const ring = new Mesh(new RingGeometry(1, 1.14, 40), ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.03;
/** The arrow and its ring. */
export const guide = new Group();
guide.add(arrow, ring);
guide.visible = false;
scene.add(guide);
/** How high the arrow's tip floats over the spot: low, or over the player's head where they stand on it. */
const TIP = 1.2, OVER = 2.1;

const bubble = document.getElementById('coach')!, head = bubble.querySelector('b')!, more = bubble.querySelector('small')!;
const dir = bubble.querySelector<HTMLElement>('.dir')!, stars = document.getElementById('stars')!;
/** The bubble's size (grows in), how long it's been up, and which lesson it was drawn for. */
let k = 0, t = 0, drawn: Step | null = null, said = '';
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Each frame: places the arrow, ring and bubble for the lesson showing (main.ts; it needs the camera). */
export function drawTutorial(dt: number) {
  const s = lesson.now, spot = s?.at();
  if (s !== drawn) { drawn = s; k = 0; }
  // standing there doing it, the arrow and the bubble step aside, unless what to do there needs saying
  const there = !!s && !!spot && !s.stay && d2xz(player.g.position, spot) < spot.r * spot.r;
  const on = !!s && !!spot && !there;
  k = on ? Math.min(1, k + dt * 4) : 0;
  t += dt;
  guide.visible = on;
  bubble.hidden = !on;
  stars.classList.toggle('teach', on && s.id === 'stars');
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
  ringMat.opacity = calm ? 0.7 : 0.55 + Math.sin(t * 4) * 0.2;

  const [title, line = ''] = s.say();
  if (title + line !== said) { said = title + line; head.textContent = title; more.textContent = line; more.hidden = !line; }
  const o = onScreen({ x: spot.x, y: spot.y + tip + 1.1, z: spot.z });
  if (o.inView) lesson.viewed += dt;
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
