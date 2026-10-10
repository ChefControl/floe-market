// The casino yacht's room tone: three real recordings, looped, under the lounge band. Everything else the game plays
// is synthesised, but a room full of people is the one thing synthesis never makes convincing, so these are real:
//
// - the dining room below: a restaurant's murmur, very faint and muffled, as if through the deck, anywhere aboard;
// - the bar: chatter and laughter, coming up as you walk over to the bar across the stern;
// - the slot machines: their jingles and bells, coming up as you near a machine (the games' bank or the guests' row).
//
// They're fetched the first time the player walks out towards the yacht, and play on the ambience bus. Credits (the
// slot machines' recording asks for one) are under Credits & Copyrights in the settings, and in the README.
import { ac, buses, panOf, prefs, rnd } from './audio';
import { BAR, ROW } from './casinoSalon';
import { harborK } from './music';
import { player } from './player';
import { aboard, casinoBoat, SHIP } from './layout';
import { BANK } from './slotMachine';
import { FY, type XZ } from './util';
import diningUrl from './sounds/dining.mp3';
import barUrl from './sounds/bar.mp3';
import slotsUrl from './sounds/slots.mp3';

type Room = 'dining' | 'bar' | 'slots';
/** Each recording, and how loud it is at its loudest: next to the bar or a machine about as loud as the restaurant's
 *  diners, and the dining room below well under that. */
const ROOMS: Record<Room, { url: string; v: number; lp: number }> = {
  dining: { url: diningUrl, v: 0.08, lp: 420 },
  bar: { url: barUrl, v: 0.25, lp: 6000 },
  slots: { url: slotsUrl, v: 0.22, lp: 6000 },
};
/** Each recording's level and pan, once it's loaded (and for the tests). */
export const roomTones: Partial<Record<Room, { g: GainNode; pan: StereoPannerNode }>> = {};
let loading = false;

function load() {
  loading = true;
  for (const [name, r] of Object.entries(ROOMS) as [Room, typeof ROOMS[Room]][]) {
    fetch(r.url).then(res => res.arrayBuffer()).then(b => ac!.decodeAudioData(b)).then(buf => {
      const c = ac!, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), pan = c.createStereoPanner();
      src.buffer = buf; src.loop = true;
      lp.type = 'lowpass'; lp.frequency.value = r.lp;
      g.gain.value = 0;
      src.connect(lp); lp.connect(g); g.connect(pan); pan.connect(buses.amb);
      // each starts somewhere in its loop, so a visit doesn't always open on the same laugh
      src.start(0, rnd() * buf.duration);
      roomTones[name] = { g, pan };
    }).catch(() => { /* offline, or no such file: the yacht without its room tone */ });
  }
}

/** 1 within a metre of `d` metres away, fading to nothing 5 metres off. */
const closeness = (d: number) => {
  const k = Math.max(0, Math.min(1, (5 - d) / 4));
  return k * k * (3 - 2 * k);
};
/** The nearest point to `p` on the line from `a` to `b`. */
function nearest(p: XZ, a: XZ, b: XZ): XZ {
  const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return { x: a.x + t * dx, z: a.z + t * dz };
}
const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
/** The bar's counter, and the two banks of slot machines, along the floor. */
const COUNTER = [{ x: SHIP.x + BAR.x, z: SHIP.z + BAR.z0 }, { x: SHIP.x + BAR.x, z: SHIP.z + BAR.z1 }] as const;
const BANKS = [
  [{ x: BANK.x - BANK.gap, z: BANK.z }, { x: BANK.x + BANK.gap, z: BANK.z }],
  [{ x: SHIP.x + ROW.x, z: SHIP.z + ROW.zs[0] }, { x: SHIP.x + ROW.x, z: SHIP.z + ROW.zs[ROW.zs.length - 1] }],
] as const;

function set(name: Room, k: number, from?: XZ) {
  const r = roomTones[name];
  if (!r) return;
  r.g.gain.setTargetAtTime(ROOMS[name].v * k, ac!.currentTime, 0.4);
  if (from) r.pan.pan.setTargetAtTime(panOf(from), ac!.currentTime, 0.2);
}

/** Follows the player round the yacht: call every frame. */
export function updRoomTone() {
  if (!ac || !casinoBoat.open || prefs.mute.amb) return;
  if (!loading && harborK() > 0) load();
  const p = player.g.position, on = aboard(p), upstairs = on && p.y > FY + 1.0;
  set('dining', on ? 1 : 0);
  const bar = nearest(p, ...COUNTER);
  set('bar', upstairs ? closeness(dist(p, bar)) : 0, bar);
  const slots = BANKS.map(([a, b]) => nearest(p, a, b)).sort((a, b) => dist(p, a) - dist(p, b))[0];
  set('slots', upstairs ? closeness(dist(p, slots)) : 0, slots);
}
