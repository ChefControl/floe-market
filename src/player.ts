import { Person, type Walker } from './characters';
import { Holder, carrySlot } from './holder';
import { scene } from './render';
import type { Tile } from './unlocks';
import { FY, type XZ } from './util';

export interface Player extends Walker {
  g: Person;
  back: Holder;
  // cooldowns (seconds)
  tPick: number;
  tDrop: number;
  tCash: number;
  tCatch: number;
  tPay: number;
  /** Unlock tile being stood on, and for how long. */
  onTile: Tile | null;
  /** Booped off the road by a driver: hopping from (x0, z0) to (x1, z1), `t` 0 to 1 of the way. */
  booped: { x0: number; z0: number; x1: number; z1: number; t: number } | null;
}

export const player: Player = {
  g: new Person(0xFF6B4A), h: 0, speed: 4.2, moving: false,
  tPick: 0, tDrop: 0, tCash: 0, tCatch: 0, tPay: 0,
  onTile: null, booped: null,
  back: new Holder(i => carrySlot(player, i), 6),
};
player.g.position.set(-1.5, FY, -2.0);
scene.add(player.g);

/** Seconds a boop's hop takes, out of your hands. */
export const BOOP_SECS = 0.5;
/** A driver's boop: a hop backwards onto the pavement at `to`. */
export function boop(to: XZ) {
  const p = player.g.position;
  player.booped = { x0: p.x, z0: p.z, x1: to.x, z1: to.z, t: 0 };
}
