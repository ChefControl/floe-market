// The cookware shop's tree (shop.ts draws it): where each of the cellar's upgrades sits. Bands run from the start
// through the practice fight and the five bosses, each opening once it's won; the rooms' lines run across them (on a
// computer, a wide board of columns, one a gate; on a touch screen, a ladder of bands, a column a room). What a node
// needs first is drawn as a line to it (unlocks.ts's `needs`, and the line's first machine before its hand).
import { BOSSES, F, practiceDue } from './fight';
import type { Tile, UnlockId } from './unlocks';

export interface Gate { face: string; name: string }
/** The bands' gates: the start (always open), the practice fight, and the five bosses. */
export const GATES: Gate[] = [{ face: '🏁', name: 'Start' }, { face: '🤼', name: 'Practice' }, ...BOSSES.map(b => ({ face: b.face, name: b.name }))];
/** Whether a band is open: the start always, the practice band once that fight's won (a game that's beaten a boss
 *  has), and a boss's once he's beaten. */
export const gateOpen = (g: number) => g === 0 || (g === 1 ? !practiceDue() : F.beaten >= g - 1);
/** The gate a node waits behind. */
export const gateOf = (t: Tile) => (t.spar ? 1 : t.beat ? t.beat + 1 : 0);
/** The ring's levels (Pricier bowls, Fix up the arena, Cellar crew) open two at a time: each boss beaten opens the
 *  next two of each, Hakkaku the first two and Samehada the last, so all eight are on sale before Fukure. */
export const LEVELS_A_BOSS = 2;
/** The gate a ring level (`n`, from 1) waits behind. */
export const levelGate = (n: number) => Math.ceil(n / LEVELS_A_BOSS) + 1;
/** The gate still to win next (one past the last band, once every boss is beaten). */
export const nextGate = () => { const g = GATES.findIndex((_, i) => !gateOpen(i)); return g < 0 ? GATES.length : g; };

export type Lane = 'rice' | 'fish' | 'mush' | 'hearth' | 'venue';
export const LANES: { id: Lane; icon: string; name: string }[] = [
  { id: 'rice', icon: '🍚', name: 'Rice' }, { id: 'fish', icon: '🐟', name: 'Fish' }, { id: 'mush', icon: '🍄', name: 'Grow' },
  { id: 'hearth', icon: '🍲', name: 'Hearth' }, { id: 'venue', icon: '🏮', name: 'Venue' },
];
export interface Place {
  /** Its room's lane, or none for the buyout, which sits across the last band on its own. */
  lane?: Lane;
  /** A second node in its lane and band, under the first (the picker, under the beds). */
  sub?: number;
  /** What it's drawn from (the node it needs first). */
  from?: UnlockId;
  /** Its name on the node, if shorter than the upgrade's. */
  label?: string;
}
export const PLACES: Partial<Record<UnlockId, Place>> = {
  rack: { lane: 'rice', label: 'Drying rack' }, washer: { lane: 'rice', from: 'rack' }, steam: { lane: 'rice', from: 'washer' },
  barrel: { lane: 'fish', label: 'Salt barrel' }, salter: { lane: 'fish', from: 'barrel' }, smoke: { lane: 'fish', from: 'salter' },
  bed: { lane: 'mush', label: 'Mushroom bed' }, picker: { lane: 'mush', sub: 1, from: 'bed' }, shelves: { lane: 'mush', from: 'picker', label: 'Glowing shelves' },
  attendant: { lane: 'hearth' }, slide: { lane: 'hearth', sub: 1, from: 'attendant' }, cook: { lane: 'hearth', from: 'attendant' }, fastslide: { lane: 'hearth', sub: 1, from: 'slide', label: 'Faster belt' },
  // (Mama Moray's and her hall a row of their own, so no link crosses a node on its way)
  mama: { lane: 'hearth', sub: 2, from: 'slide', label: "Mama Moray's" }, hall: { lane: 'hearth', sub: 2, from: 'mama', label: "Mama's hall" },
  tier1: { lane: 'venue', label: 'Back-Alley Ring' }, tier2: { lane: 'venue', from: 'tier1', label: 'Underground Arena' }, tier3: { lane: 'venue', from: 'tier2', label: 'Grand Hall Below' },
  buyout: { label: 'Buy him out' },
};
