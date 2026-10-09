import { Person, type Walker } from './characters';
import { Holder, carrySlot } from './holder';
import { joinCode } from './remote';
import { scene } from './render';
import type { Tile } from './unlocks';
import type { Style } from './wardrobe';
import { FY, type XZ } from './util';

/** A friend playing along from their own phone (co-op, coop.ts): where they are and what they're pressing. */
export interface Remote {
  /** Holding buy. */
  buy: boolean;
  /** Where their phone has them, and which way they face, walking or not. */
  at: { x: number; y: number; z: number };
  h: number;
  moving: boolean;
  /** Something for their phone alone: a sound of their own (picking up, putting down, paying), or a boop's hop. */
  tell(what: string, args?: unknown[]): void;
}

export interface Player extends Walker {
  g: Person;
  back: Holder;
  // cooldowns (seconds)
  tPick: number;
  tDrop: number;
  tCash: number;
  tCatch: number;
  tPay: number;
  tHarvest: number;
  /** Unlock tile being stood on, and for how long. */
  onTile: Tile | null;
  /** Booped off the road by a driver: hopping from (x0, z0) to (x1, z1), `t` 0 to 1 of the way. */
  booped: { x0: number; z0: number; x1: number; z1: number; t: number } | null;
  /** A co-op guest's player, moved from their phone; this phone's own has none. */
  remote?: Remote;
}

/** Shirt colours: the host's (and anyone playing alone), and a co-op guest's. */
export const SHIRTS = { host: 0xFF6B4A, guest: 0x3D7DF2 };

/** A player, at the start of the dock. */
export function newPlayer(color: number, style?: Style): Player {
  const p: Player = {
    g: new Person(color, 'parka', style), h: 0, speed: 4.2, moving: false,
    tPick: 0, tDrop: 0, tCash: 0, tCatch: 0, tPay: 0, tHarvest: 0,
    onTile: null, booped: null,
    back: new Holder(i => carrySlot(p, i), 6),
  };
  p.g.position.set(-1.5, FY, -2.0);
  return p;
}

/** This phone's player. */
export const player = newPlayer(joinCode() ? SHIRTS.guest : SHIRTS.host); // a guest when joining a friend's game
scene.add(player.g);
/** Everyone playing: this phone's player first, then a co-op guest's, if one has joined. */
export const players: Player[] = [player];

/** Seconds a boop's hop takes, out of your hands. */
export const BOOP_SECS = 0.5;
/** A driver's boop: a hop backwards onto the pavement at `to`. A guest's phone does the hop itself. */
export function boop(p: Player, to: XZ) {
  const at = p.g.position;
  p.booped = { x0: at.x, z0: at.z, x1: to.x, z1: to.z, t: 0 };
  p.remote?.tell('hop', [to.x, to.z]);
}
