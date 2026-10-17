// The finishers (stage 3): how a boss's fight ends, by how the vote went. A push-out to the straw most nights; but a
// tight one (within a tenth of the fans needed, either way) ends at the straw with a reversal, the man about to go out
// turning it, and a heavy one with a big move: each boss has his own for a tight win and for a heavy one, and the
// champion has his own against each, for a tight win and a grand one (where the slam, gong.ts, makes it bigger still).
// Who wins never changes: the bigger side does. Plain data, for dohyo.ts to play and the strip (gong.ts) to name.
import type { Kind } from './creatures';
import { bossOf, type Finish, type Rush } from './fight';

/** How a finisher goes. `throw`: driven to the straw, lifted by the belt and thrown off the mound, flipped flat in the
 *  air; `carry`: hoisted overhead and carried along the straw (the crab scuttling sideways), then flung off it; `bump`: a belly blow sends him flying; `quake`: a stamp
 *  shakes him off his feet and he staggers out; `reversal`: at his own straw, the man about to go out lifts the
 *  other and twists, throwing him out over his hip (utchari); `sidestep`: at his own straw, the man about to go out
 *  slips aside, and the other, charging, stumbles on past him and off the mound, face first. */
export type Shape = 'throw' | 'carry' | 'bump' | 'quake' | 'reversal' | 'sidestep';
/** Something of the creature's in it: an ink cloud, a smear of slime, the puffer blowing up or the air squeezed out of
 *  him, a claw snapping, a bite. */
export type Fx = 'ink' | 'slime' | 'puff' | 'pop' | 'claw' | 'bite';
export interface Move {
  /** What it's called, over the ring and on the strip (three words at most). */
  name: string;
  shape: Shape;
  /** How high the loser goes, metres. */
  lift: number;
  /** He's swung round a full turn in the air. */
  spin?: boolean;
  fx?: Fx;
}
/** A boss's finishers (his tight win, his heavy one) and the champion's against him (a tight win, a grand one). */
export interface Moves { tight: Move; heavy: Move; champTight: Move; champGrand: Move }
export const MOVES: Record<Kind | 'partner', Moves> = {
  octopus: {
    tight: { name: 'INK ESCAPE', shape: 'reversal', lift: 0.3, fx: 'ink' },
    heavy: { name: 'EIGHT-ARM WRAP', shape: 'throw', lift: 0.65, spin: true, fx: 'ink' },
    champTight: { name: 'TENTACLE TWIST', shape: 'reversal', lift: 0.35, spin: true },
    champGrand: { name: 'BELT THROW', shape: 'throw', lift: 0.5 },
  },
  crab: {
    tight: { name: 'SIDE STEP', shape: 'sidestep', lift: 0, fx: 'claw' },
    heavy: { name: 'CRAB SHUFFLE', shape: 'carry', lift: 1.15, fx: 'claw' },
    champTight: { name: 'SHELL FLIP', shape: 'reversal', lift: 0.6, spin: true },
    champGrand: { name: 'LIFT-OUT', shape: 'carry', lift: 1.05 },
  },
  catfish: {
    tight: { name: 'SLIPPERY ESCAPE', shape: 'reversal', lift: 0.2, fx: 'slime' },
    heavy: { name: 'EARTHQUAKE', shape: 'quake', lift: 0.25 },
    champTight: { name: 'MUD ROLL', shape: 'reversal', lift: 0.3, spin: true, fx: 'slime' },
    champGrand: { name: 'BELLY BOMB', shape: 'bump', lift: 0.7 },
  },
  shark: {
    tight: { name: 'DEATH ROLL', shape: 'reversal', lift: 0.3, spin: true, fx: 'bite' },
    heavy: { name: 'SHARK RUSH', shape: 'bump', lift: 0.6, fx: 'bite' },
    champTight: { name: 'FIN GRAB', shape: 'reversal', lift: 0.35 },
    champGrand: { name: 'SPIN THROW', shape: 'throw', lift: 0.5, spin: true },
  },
  puffer: {
    tight: { name: 'LAST PUFF', shape: 'reversal', lift: 0.3, fx: 'puff' },
    heavy: { name: 'PUFF BOUNCE', shape: 'bump', lift: 0.8, fx: 'puff' },
    champTight: { name: 'POP!', shape: 'reversal', lift: 0.3, fx: 'pop' },
    champGrand: { name: 'BIG SQUEEZE', shape: 'throw', lift: 0.45, fx: 'pop' },
  },
  // (the practice fight: the champion's own sparring partner, a wrestler like him)
  partner: {
    tight: { name: 'UTCHARI', shape: 'reversal', lift: 0.25 },
    heavy: { name: 'OSHIDASHI', shape: 'throw', lift: 0.2 },
    champTight: { name: 'UTCHARI', shape: 'reversal', lift: 0.25 },
    champGrand: { name: 'BELT THROW', shape: 'throw', lift: 0.5 },
  },
};

/** The finisher a boss's fight ends with (none for a push-out, or a local's). */
export function moveOf(R: Rush | null, finish: Finish): Move | null {
  if (!R || finish === 'push') return null;
  const m = MOVES[bossOf(R.boss).kind ?? 'partner'];
  if (finish === 'grand') return m.champGrand;
  if (finish === 'heavy') return m.heavy;
  return R.win ? m.champTight : m.tight;
}
