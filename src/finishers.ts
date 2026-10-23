// The finishers (stage 3): how a boss's fight ends, by how the vote went. A push-out to the straw most nights; but a
// tight one (within a tenth of the fans needed, either way) ends at the straw, the man about to go out turning it, and
// a heavy one with a big move: each boss has his own for a tight win and for a heavy one, and the champion has his own
// against each, for a tight win and a grand one; and a grand one whose finish was pushed all the way (fight.ts's FINISH) is the epic, the
// champion's grand move gone wild. Who wins never changes: the bigger side does. Each boss's moves are in his own file
// (finishers/), made with finishRig.ts; dohyo.ts plays them, and the strip (gong.ts) names them.
import type { Kind } from './creatures';
import { bossOf, type Finish, finishers, type Rush } from './fight';
import type { FinishMove } from './finishRig';
import * as catfish from './finishers/catfish';
import * as crab from './finishers/crab';
import * as octopus from './finishers/octopus';
import * as partner from './finishers/partner';
import * as puffer from './finishers/puffer';
import { push } from './finishers/push';
import * as shark from './finishers/shark';

export interface Move {
  /** What it's called, over the ring and on the strip (three words at most). */
  name: string;
  anim: FinishMove;
}
/** A boss's finishers (his tight win, his heavy one) and the champion's against him (a tight win, a grand one). */
export interface Moves { tight: Move; heavy: Move; champTight: Move; champGrand: Move }
type Anims = Record<keyof Moves | 'epic', FinishMove>;
const named = (a: Anims, tight: string, heavy: string, champTight: string, champGrand: string): Moves => ({
  tight: { name: tight, anim: a.tight }, heavy: { name: heavy, anim: a.heavy },
  champTight: { name: champTight, anim: a.champTight }, champGrand: { name: champGrand, anim: a.champGrand },
});
export const MOVES: Record<Kind | 'partner', Moves> = {
  octopus: named(octopus, 'INK ESCAPE', 'EIGHT-ARM WRAP', 'TENTACLE TWIST', 'BELT THROW'),
  crab: named(crab, 'SIDE STEP', 'CRAB SHUFFLE', 'SHELL FLIP', 'LIFT-OUT'),
  catfish: named(catfish, 'SLIPPERY ESCAPE', 'EARTHQUAKE', 'MUD ROLL', 'BELLY BOMB'),
  shark: named(shark, 'DEATH ROLL', 'SHARK RUSH', 'FIN GRAB', 'SPIN THROW'),
  puffer: named(puffer, 'LAST PUFF', 'PUFF BOUNCE', 'POP!', 'BIG SQUEEZE'),
  // (the practice fight: the champion's own sparring partner, a wrestler like him)
  partner: named(partner, 'UTCHARI', 'OSHIDASHI', 'UTCHARI', 'BELT THROW'),
};
/** The epic: the champion's grand move against each, after a perfect slam (it goes by the grand move's name). */
export const EPIC: Record<Kind | 'partner', FinishMove> = { octopus: octopus.epic, crab: crab.epic, catfish: catfish.epic, shark: shark.epic, puffer: puffer.epic, partner: partner.epic };
export { push as PUSH };

/** The finisher a boss's fight ends with (none for a push-out, or a local's). */
export function moveOf(R: Rush | null, finish: Finish): Move | null {
  if (!R || finish === 'push') return null;
  const k = bossOf(R.boss).kind ?? 'partner', m = MOVES[k];
  // (the epic for a grand win's finish pushed all the way, fight.ts's FINISH; or, from before it, a perfect slam)
  if (finish === 'grand') return (R.fin ? R.fin.pushed === 2 : R.slam === 2) ? { name: m.champGrand.name, anim: EPIC[k] } : m.champGrand;
  if (finish === 'heavy') return m.heavy;
  return R.win ? m.champTight : m.tight;
}
/** How the fight's result plays: its finisher, or the push-out. */
export const animOf = (R: Rush | null, finish: Finish) => moveOf(R, finish)?.anim ?? push;
/** Seconds into the result that the loser's down (the card waits for it). */
export const landsOf = (R: Rush | null, finish: Finish) => animOf(R, finish).lands;
finishers.landsOf = landsOf;
