// The Undertow (stage 3): the Family's back room, through a tunnel out of the arena's south wall, found when the second
// boss is beaten (cellar.ts builds it, ring.ts opens it). Each of the three stands at his booth with a pad in front of
// his table: step up to it and he has a word for you, in a bubble over his head, nodding along as he says it; step away
// and come back for the next one. While you're in the room, each of them follows you with his eyes.
import { CY, parts } from './cellar';
import { updClub } from './club';
import { updDoorway } from './doorway';
import { type Booth, BOOTH_PADS, BOOTHS } from './cellarPlan';
import { decal, drawPad } from './decals';
import { family } from './family';
import { DEN, found, level, LOANS } from './layout';
import { tommySays, updMonte } from './monteTable';
import { player } from './player';
import { bubble } from './speech';
import { d2xz } from './util';

/** What each says, one line each time you step up to him: who he is first, then his business. */
export const LINES: Record<Booth, string[]> = {
  eddie: [
    'Slick Eddie. I fix things. Boss fights, mostly.',
    "Name the boss, tell me how many of his fans stay home. Small favour, small risk. Big favour… well.",
    'Everybody owes Eddie. You will too, sooner or later.',
  ],
  harry: [
    "Hammerhead Harry. Samehada's my nephew. Don't hold it against me.",
    'Short of chips? I lend. You pay me back with a little extra, before the fourth bout.',
    "Pay on time and we're friends. Miss it, and you'll be on crutches.",
  ],
  tommy: [
    'Three-Card Tommy. Follow the lady, kid. Nobody ever does.',
    'Three cards, one queen. Find her and I pay double.',
    "It's an honest game, this one. The trick's all in my hands.",
  ],
};
/** Each pad's icon: Eddie's handshake, Harry's money bag, Tommy's cards. */
const ICONS: Record<Booth, string> = { eddie: '🤝', harry: '💰', tommy: '🃏' };
/** How far from a host someone has to be for him to watch them. */
const WATCH = 4.5;

const booths = (Object.keys(BOOTHS) as Booth[]).map(k => {
  const pad = BOOTH_PADS[k], mark = decal(1.2, (c, w, h) => drawPad(c, w, h, ICONS[k]));
  mark.mesh.position.set(pad.x, CY + 0.035, pad.z);
  parts.den.add(mark.mesh);
  // (each at his place, popped in when the club's found: Eddie sat in his booth, Tommy at his card table, Harry behind
  // his desk)
  const b = BOOTHS[k], host = family[k], talk = bubble(parts.den, 2.3);
  host.position.set(b.x, CY, b.z); host.rotation.y = b.face;
  if (k === 'eddie') host.sit(0.51);
  if (k === 'tommy') host.sit(0.5);
  parts.den.add(host);
  return { k, pad, host, talk, near: false, next: 0 };
});

/** What each is saying now ('' while he's quiet), for tests. */
export const undertowSays = (k: Booth) => booths.find(b => b.k === k)!.talk.text;
tommySays(text => booths.find(b => b.k === 'tommy')!.talk.say(text));

/** Whether `p` is in the club, or in Harry's office through its west wall. */
const inDen = (p: { x: number; z: number }) => [DEN, LOANS].some(r => p.x > r.x0 - 0.5 && p.x < r.x1 + 0.5 && p.z > r.z0 - 0.5 && p.z < r.z1 + 0.5);

/** The Undertow, every frame (stage 3): the Family talking to whoever steps up, and watching them. */
export function updUndertow(dt: number) {
  updDoorway(dt);
  updMonte(dt);
  updClub(dt);
  if (!found.den) return;
  const p = player.g.position, here = level.down && inDen(p);
  for (const b of booths) {
    const on = level.down && d2xz(p, b.pad) < b.pad.r * b.pad.r;
    if (on && !b.near) b.talk.say(LINES[b.k][b.next++ % LINES[b.k].length]);
    b.near = on;
    if (b.talk.upd(dt)) b.talk.sprite.position.set(b.host.position.x, b.host.position.y + 2.15, b.host.position.z);
    b.host.talking = !!b.talk.text;
    b.host.watch = here && d2xz(p, b.host.position) < WATCH * WATCH ? p : null;
    b.host.update(dt);
  }
}
