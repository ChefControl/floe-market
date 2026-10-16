// Mr. Fugu at his desk (stage 3): step up in front of it and he has a word for you, in a bubble over his head, by how
// the ring's doing, his mouth going as he says it; step away and come back for the next one. And his fish tank's fish, swimming.
import { boss, CY, OFFICE, swimTank } from './cellar';
import { decal, drawPad } from './decals';
import { BOSSES, F } from './fight';
import { level } from './layout';
import { player } from './player';
import { bubble } from './speech';
import { d2xz } from './util';

/** Where to stand to talk to him: on the rug in front of the visitors' chairs, inside the door. */
export const DESK_PAD = { x: OFFICE.x, z: OFFICE.z + 2.35, r: 0.8 };
const mark = decal(1.3, (c, w, h) => drawPad(c, w, h, '💬'));
mark.mesh.position.set(DESK_PAD.x, CY + 0.035, DESK_PAD.z);
boss.parent!.add(mark.mesh);

/** What he says, by how things stand: a few for now, one each time you step up. */
export function fuguLines(): string[] {
  if (F.boughtOut) return [
    "It's your house now, Chef. I only keep the chair warm.",
    "The fans still ask for me. Tell them I'm on holiday.",
    'No cut, no boss. Just you and the stew.',
  ];
  const next = BOSSES[F.beaten];
  const out = ['Thirty percent of every bowl, Chef. The house always eats first.'];
  // (once the Undertow's found: he answers to the Family too)
  if (F.beaten >= 2) out.unshift('So you met the Family. Who do you think I pay?');
  if (F.beaten === 0) out.push('Keep the soup bar full. Hungry fans cheer for the other guy.');
  else out.push("You found my mushrooms. Mushroom bowls pay double. Don't spread it around.");
  out.push(next ? `${next.name} ${next.face} is next. His fans come hungry.` : "Every champion beaten. Maybe you can afford my chair now.");
  out.push(F.tier > 0 ? 'Bigger stands, bigger crowds. I like the sound of that.' : 'Build some stands, Chef. Fans pay better sitting down.');
  return out;
}

// ---------- his bubble ----------
const talk = bubble(boss.parent!);

let near = false, next = 0, shown = '';
/** His mouth going through the line as on the dock (offer.ts): a letter at a time, a breath at a comma, a beat at a
 *  full stop. How far he's got, and how long until the next. */
let upTo = 0, beat = 0;
const LETTER = 0.042, COMMA = 0.09, STOP = 0.75;
function mouth(dt: number) {
  beat -= dt;
  while (beat <= 0 && upTo < shown.length) {
    const ch = shown[upTo++], after = shown[upTo];
    if ('.!?'.includes(ch) && !'.!?'.includes(after ?? 'x')) { boss.point(); beat += STOP; }
    else { beat += ch === ',' || ch === ':' ? COMMA : LETTER; if (ch.trim()) boss.syllable(); else boss.word(); }
  }
}
/** What he's saying now ('' while he's quiet), for tests. */
export const fuguSays = () => shown;

export function updOffice(dt: number) {
  swimTank(dt);
  const here = level.down && d2xz(player.g.position, DESK_PAD) < DESK_PAD.r * DESK_PAD.r;
  if (here && !near) {
    const all = fuguLines();
    shown = all[next % all.length]; next++;
    upTo = 0; beat = 0;
    talk.say(shown);
  }
  near = here;
  if (talk.upd(dt)) {
    talk.sprite.position.set(boss.position.x, boss.position.y + 2.75, boss.position.z);
    mouth(dt);
  } else shown = '';
  boss.talking = talk.sprite.visible && upTo < shown.length;
}
