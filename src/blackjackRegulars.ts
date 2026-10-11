// The blackjack room's regulars: six characters who come in from the casino floor to play at the table, stay a shoe or
// two and go, each in their own look, with their own way of playing and their own things to say. Two to four of them
// sit at the table at a time; while the dealer shuffles, some get up and go back out through the doorway and others
// come in and take a free seat. They run on their own dice, so neither their looks nor their play touch the game's luck.
import type { Group, Vector3 } from 'three';
import type { PlayStyle } from './blackjack';
import { speaker } from './casinoKit';
import { animPerson, Person } from './characters';
import { dice, quietly } from './kit';
import { FRAMES, GREY, plain, rng, SKINS, type Style } from './wardrobe';

/** What a regular says when: sitting down, at each move, and when the hand's settled. */
export type Line = 'sit' | 'hit' | 'stand' | 'double' | 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'insure';

export interface Regular {
  id: string;
  name: string;
  play: PlayStyle;
  /** Which of the stage's chips they bet: 0, the smallest, to 3. */
  chip: number;
  /** Whether they take insurance when the dealer shows an ace. */
  insures: boolean;
  lines: Record<Line, string>;
  /** Their suit or dress, and the rest of their look. */
  color: number;
  look: Partial<Style>;
}

const lady = (look: Partial<Style>): Partial<Style> => ({ woman: true, face: 'earrings', neck: 'pearls', neckC: 0xF4F1EA, ...look });

export const CAST: Regular[] = [
  {
    id: 'pearl', name: 'Nana Pearl', play: 'cautious', chip: 0, insures: false, color: 0x5A2E6B,
    look: lady({ skin: SKINS[1], hair: GREY, cut: 'bun', eyes: 'happy', mouth: 'smile', cheeks: 'rosy', glasses: 0xC9A24A, skirt: 0x5A2E6B, height: 0.9, hat: 'pillbox', hatC: 0x5A2E6B }),
    lines: {
      sit: 'Evening, dears!', hit: 'Just one more, dear.', stand: "I'll stay, thank you.", double: 'Oh, why not!', blackjack: 'Oh my, blackjack!',
      win: 'How lovely!', push: 'Even-stevens.', lose: 'Oh, fiddlesticks.', bust: 'Oh dear!', insure: 'No thank you, dear.',
    },
  },
  {
    id: 'tony', name: 'Big Tony', play: 'bold', chip: 3, insures: true, color: 0x3B3F6B,
    look: { skin: SKINS[2], hair: 0x2A1F19, cut: 'quiff', face: 'mustache', eyes: 'angry', mouth: 'grin', height: 1.1, hat: 'bowler', hatC: 0x1B2430, neck: 'bow', neckC: 0xC0392B },
    lines: {
      sit: 'Deal me in!', hit: 'Hit me!', stand: "I'm good.", double: 'Double it!', blackjack: 'Ha! Blackjack!',
      win: 'Pay the man!', push: 'Again!', lose: "Next one's mine.", bust: 'Ugh!', insure: 'Insure it!',
    },
  },
  {
    id: 'lin', name: 'Professor Lin', play: 'book', chip: 1, insures: false, color: 0x2F4A44,
    look: lady({ skin: SKINS[0], hair: 0x1E1B1A, cut: 'bob', eyes: 'dot', mouth: 'flat', glasses: FRAMES[3], skirt: 0x2F4A44, height: 0.97, hat: 'bare' }),
    lines: {
      sit: 'Good evening.', hit: 'Hit, by the chart.', stand: 'Stand.', double: 'Double, by the book.', blackjack: 'Blackjack. As expected.',
      win: 'As predicted.', push: 'A push. Fine.', lose: 'Variance.', bust: 'Statistically fair.', insure: 'Insurance is a sucker bet.',
    },
  },
  {
    id: 'olsen', name: 'Captain Olsen', play: 'dealer', chip: 1, insures: false, color: 0xEDEDED,
    look: { skin: SKINS[1], hair: GREY, cut: 'short', face: 'beard', eyes: 'round', mouth: 'smile', cheeks: 'rosy', height: 1.04, hat: 'bare', neck: 'bow', neckC: 0x1B2430 },
    lines: {
      sit: 'Ahoy!', hit: 'Another, sailor.', stand: 'Steady as she goes.', double: 'Full steam!', blackjack: 'Blackjack, by thunder!',
      win: 'Fair winds!', push: 'Becalmed.', lose: 'Rough seas.', bust: 'Man overboard!', insure: 'No need, matey.',
    },
  },
  {
    id: 'lucy', name: 'Lucky Lucy', play: 'hunch', chip: 1, insures: true, color: 0xB0283A,
    look: lady({ skin: SKINS[3], hair: 0xA8432A, cut: 'curly', eyes: 'wink', mouth: 'grin', cheeks: 'freckles', skirt: 0xB0283A, height: 0.95, hat: 'brim', hatC: 0x1B2430 }),
    lines: {
      sit: 'Feeling lucky!', hit: "Hit me, I've got a hunch!", stand: 'My gut says stay.', double: 'Double, why not?', blackjack: 'Told you! Blackjack!',
      win: 'Lucky me!', push: 'So close!', lose: 'Next time!', bust: 'Oops!', insure: 'I feel an ace coming!',
    },
  },
  {
    id: 'fox', name: 'Mr. Fox', play: 'book', chip: 2, insures: true, color: 0x4A4F57,
    look: { skin: SKINS[4], hair: 0x1E1B1A, cut: 'short', face: 'goatee', eyes: 'sleepy', mouth: 'smirk', glasses: 0x1F1F1F, height: 1.02, hat: 'top', hatC: 0x1B2430, neck: 'tie', neckC: 0x8E1F2F },
    lines: {
      sit: 'Evening.', hit: 'Card.', stand: "That'll do.", double: 'Double.', blackjack: 'Naturally.',
      win: 'Mm.', push: 'Hm.', lose: 'Pity.', bust: 'So it goes.', insure: 'Insurance, please.',
    },
  },
];

/** Their own dice: who comes and goes, and their hunches. */
export const regularDice = rng(0xB1AC7);

/** One of the cast in the blackjack room: their person, their speech bubble, their seat (or none), and where they're walking. */
interface Sitter {
  r: Regular;
  p: Person;
  bubble: ReturnType<typeof speaker>;
  seat: number | null;
  /** Points still to walk to, in the table's space; when they're leaving, they go when they reach the last. */
  path: Vector3[];
  leaving: boolean;
  /** Seconds left of a cheer, arms up. */
  joy: number;
  /** The hand signal they're making for their move, as players do at the table, and how far into it they are. */
  sign: { move: 'hit' | 'stand' | 'double'; t: number } | null;
}
let sitters: Sitter[] = [];
/** The seats round the table, in its space, and the way each faces; and where people come in at the doorway. */
let place: { seats: Vector3[]; faces: number[]; front: Vector3[]; entry: Vector3 } | null = null;
/** How high a seated regular is: on a stool. */
const SIT = 0.42, WALK = 1.15;

/** Builds the cast into the table's group `g`, all out of sight, with where they sit and come in. */
export function buildRegulars(g: Group, seats: Vector3[], faces: number[], front: Vector3[], entry: Vector3) {
  place = { seats, faces, front, entry };
  sitters = quietly(() => CAST.map(r => {
    const p = new Person(r.color, 'fancy', { ...plain(0), ...r.look, skirt: r.look.woman ? r.color : null });
    p.visible = false;
    g.add(p);
    return { r, p, bubble: speaker(p, 2.15, 1.8), seat: null, path: [], leaving: false, joy: 0, sign: null };
  }), dice(0xB1AC7));
}

/** Sits a regular down at once. */
function sitDown(s: Sitter, seat: number) {
  const pl = place!;
  s.seat = seat; s.path = []; s.leaving = false;
  s.p.visible = true;
  s.p.position.copy(pl.seats[seat]).setY(SIT);
  s.p.rotation.y = pl.faces[seat];
}

/** Who's sitting at the table, ready to play: seat by seat. */
export const seated = () => sitters.filter(s => s.seat !== null && !s.path.length).map(s => ({ seat: s.seat!, r: s.r }));

/** For tests and the first visit: the table with just these regulars (by id) at these seats, at once. */
export function seatExactly(at: Record<number, string>) {
  for (const s of sitters) { s.seat = null; s.path = []; s.leaving = false; s.p.visible = false; }
  for (const [seat, id] of Object.entries(at)) sitDown(sitters.find(s => s.r.id === id)!, Number(seat));
}

/** Between shoes: some of those sitting get up and go out, and others come in for the free seats, to
 *  leave two to four at the table. The seats to fill are `free`'s (the player's isn't). */
export function comeAndGo(free: number[]) {
  const d = regularDice, pl = place!;
  for (const s of sitters) {
    if (s.seat === null || s.leaving || d() > 0.4) continue;
    s.leaving = true;
    s.p.position.y = 0;
    s.path = [pl.front[s.seat].clone(), pl.entry.clone()];
    s.seat = null;
  }
  const taken = new Set(sitters.filter(s => s.seat !== null).map(s => s.seat)), open = free.filter(f => !taken.has(f));
  const want = 2 + Math.floor(d() * 3) - taken.size;
  const away = sitters.filter(s => s.seat === null && !s.leaving);
  for (let i = 0; i < want && open.length && away.length; i++) {
    const s = away.splice(Math.floor(d() * away.length), 1)[0], seat = open.splice(Math.floor(d() * open.length), 1)[0];
    s.seat = seat; s.leaving = false;
    s.p.visible = true;
    s.p.position.copy(pl.entry);
    s.path = [pl.front[seat].clone(), pl.seats[seat].clone()];
  }
}

/** Ends every walk at once: those leaving are gone, those coming are in their seats (the player walked off). */
export function settleWalks() {
  for (const s of sitters) {
    if (!s.path.length) continue;
    if (s.leaving) { s.leaving = false; s.path = []; s.p.visible = false; } else sitDown(s, s.seat!);
  }
}

/** Whether anyone's still walking to or from the table. */
export const walking = () => sitters.some(s => s.path.length > 0);

const at = (seat: number) => sitters.find(s => s.seat === seat && !s.path.length);
/** The regular in `seat` says their line, and the others stop talking: one at a time. */
export function say(seat: number, line: Line) {
  const s = at(seat);
  if (!s) return;
  for (const o of sitters) if (o !== s) o.bubble.hush();
  s.bubble.say(s.r.lines[line]);
}
/** The regular in `seat` signals their move with a hand, the way players do at a table: a tap on the felt for a
 *  card, a wave over it to stand, and both hands forward with more chips to double. */
export function signal(seat: number, move: 'hit' | 'stand' | 'double') {
  const s = at(seat);
  if (s) s.sign = { move, t: 0 };
}
/** Everyone stops talking. */
export function hushAll() { for (const s of sitters) s.bubble.hush(); }
/** The regular in `seat` throws their arms up. */
export function cheerAt(seat: number) {
  const s = at(seat);
  if (s) s.joy = 1.3;
}

/** Walks the regulars to and from the table, and keeps those sitting there sitting. */
export function updRegulars(dt: number) {
  for (const s of sitters) {
    s.bubble.upd(dt);
    if (!s.p.visible) continue;
    const p = s.p, to = s.path[0];
    if (to) {
      const dx = to.x - p.position.x, dz = to.z - p.position.z, d = Math.hypot(dx, dz), step = WALK * dt;
      p.rotation.y = Math.atan2(dx, dz);
      if (d <= step) {
        p.position.set(to.x, 0, to.z);
        s.path.shift();
        if (!s.path.length) {
          if (s.leaving) { s.leaving = false; p.visible = false; } else { sitDown(s, s.seat!); s.bubble.say(s.r.lines.sit); }
        }
      } else p.position.set(p.position.x + dx / d * step, 0, p.position.z + dz / d * step);
      animPerson(p, true, dt, false);
      continue;
    }
    animPerson(p, false, dt, false);
    for (const l of p.legs) l.rotation.x = -1.45;
    s.joy = Math.max(0, s.joy - dt);
    const sign = s.sign;
    if (sign) sign.t += dt;
    if (sign && sign.t < 1.0) {
      const k = Math.sin(Math.min(1, sign.t / 0.25) * Math.PI / 2);
      p.arms[0].rotation.x = -0.75; p.arms[0].rotation.z = 0;
      if (sign.move === 'hit') {
        // two taps on the felt in front of them
        p.arms[1].rotation.x = -0.75 - 0.6 * k + Math.max(0, Math.sin(sign.t * 18)) * 0.25;
        p.arms[1].rotation.z = 0;
      } else if (sign.move === 'stand') {
        // a flat hand waved side to side over the cards
        p.arms[1].rotation.x = -0.75 - 0.75 * k;
        p.arms[1].rotation.z = Math.sin(sign.t * 13) * 0.45 * k;
      } else {
        p.arms[0].rotation.x = p.arms[1].rotation.x = -0.75 - 0.6 * k;
        p.arms[1].rotation.z = 0;
      }
    } else if (s.joy > 0) {
      const k = Math.sin(s.joy * 14) * 0.25;
      p.arms[0].rotation.x = p.arms[1].rotation.x = -2.6;
      p.arms[0].rotation.z = -0.3 - k; p.arms[1].rotation.z = 0.3 + k;
    } else {
      s.sign = null;
      p.arms[0].rotation.x = p.arms[1].rotation.x = -0.75;
      p.arms[0].rotation.z = p.arms[1].rotation.z = 0;
    }
  }
}

/** For tests: who's where, by seat, and what each is saying. */
export const regularsView = () => sitters.filter(s => s.p.visible).map(s => ({
  id: s.r.id, seat: s.seat, walking: s.path.length > 0, says: s.bubble.text,
}));
