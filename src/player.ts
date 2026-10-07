import { Person, type Walker } from './characters';
import { Holder, carrySlot } from './holder';
import { scene } from './render';
import type { Tile } from './unlocks';
import { FY } from './util';

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
  tileStand: number;
}

export const player: Player = {
  g: new Person(0xFF6B4A), h: 0, speed: 4.2, moving: false,
  tPick: 0, tDrop: 0, tCash: 0, tCatch: 0, tPay: 0,
  onTile: null, tileStand: 0,
  back: new Holder(i => carrySlot(player, i), 6),
};
player.g.position.set(-1.5, FY, -2.0);
scene.add(player.g);
