// The Undertow (stage 3): the Family's back room, through a tunnel out of the arena's south wall, found when the second
// boss is beaten (cellar.ts builds it, ring.ts opens it). Each of the three stands at his booth with a pad in front of
// his table: step up to it and he has a word for you, in a bubble over his head, his head bobbing as he says it (chatter.ts); step away
// and come back for the next one. (The first time, he introduces himself instead: meet.ts.) While you're in the room,
// each of them follows you with his eyes.
import { updBand } from './band';
import { CY, parts } from './cellar';
import { updCrowd } from './crowd';
import { updClub } from './club';
import { updDoorway } from './doorway';
import { type Booth, BOOTH_PADS, BOOTHS, GUARDS } from './cellarPlan';
import { chatter } from './chatter';
import { decal, drawPad } from './decals';
import { eddieSays, updEddie } from './eddie';
import { family, settle } from './family';
import { guards } from './guards';
import { found, inUndertow, level, VIP } from './layout';
import { harrySays, updLoans } from './loanDesk';
import { meetTalking, met, updMeet } from './meet';
import { tommySays, updMonte } from './monteTable';
import { player } from './player';
import { bubble, onlyVendor } from './speech';
import { d2xz } from './util';

/** What Eddie's bodyguard with the earpiece says as you walk into Eddie's room, one line each time. */
export const GUARD_LINES = ["Mr. Eddie'll see you now.", "Hands where I can see 'em.", "Easy, pal. Nobody's in a hurry in here."];
/** What each says, one line each time you step up to him: who he is first, then his business (a few words each:
 *  his panel has the numbers). */
export const LINES: Record<Booth, string[]> = {
  eddie: [
    'Slick Eddie. I fix things. Boss fights, mostly.',
    'Small fix, small risk. Big fix… well.',
    'Everybody owes Eddie. You will too.',
  ],
  harry: [
    "Hammerhead Harry. Samehada's uncle, God help me.",
    'Short of chips? I lend. Friendly terms.',
    'No hurry. I just take my cut.',
  ],
  tommy: [
    'Three-Card Tommy. Nobody ever follows the lady.',
    'Find the queen, I pay double.',
    "Honest game. The trick's in my hands.",
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
  settle(host);
  parts.den.add(host);
  const voice = chatter();
  return { k, pad, host, talk, voice, near: false, next: 0, say(text: string) { talk.say(text); voice.say(text); } };
});

// Eddie's two bodyguards, either side of him in his room (popped in when the club's found), the one with the earpiece
// with a word for you as you come in
guards.forEach((g, i) => { g.position.set(GUARDS[i].x, CY, GUARDS[i].z); g.rotation.y = GUARDS[i].face; settle(g); parts.den.add(g); });
const guardTalk = bubble(parts.den, 2.3), guardVoice = chatter();
let inVip = false, guardNext = 0;

/** What each is saying now ('' while he's quiet), for tests. */
export const undertowSays = (k: Booth) => booths.find(b => b.k === k)!.talk.text;
/** What the bodyguard's saying now, for tests. */
export const guardSays = () => guardTalk.text;
tommySays(text => booths.find(b => b.k === 'tommy')!.say(text));
eddieSays(text => booths.find(b => b.k === 'eddie')!.say(text));
harrySays(text => booths.find(b => b.k === 'harry')!.say(text));

const inDen = inUndertow;
/** How high over each host his bubble goes: over his head; but Eddie's and Harry's on their chests, clear of their
 *  faces (the camera's in close across their tables), with the tail up to the face (`FACE`, that high). */
const TALK_Y: Record<Booth, number> = { eddie: 0.95, harry: 0.72, tommy: 2.15 };
const FACE: Partial<Record<Booth, number>> = { eddie: 1.35, harry: 1.15 };
/** Each host's controls, open while the player's sat at his table. */
const PANELS: Record<Booth, HTMLElement> = { eddie: document.getElementById('eddie')!, harry: document.getElementById('loans')!, tommy: document.getElementById('monte')! };

/** The Undertow, every frame (stage 3): the Family talking to whoever steps up, and watching them. While one of them
 *  introduces himself (`held`: the cellar holds still, ring.ts), the room carries on round him, but nobody's table opens
 *  and nobody else has a word. */
export function updUndertow(dt: number, held = false) {
  updDoorway(dt);
  if (!held) {
    updMonte(dt);
    updEddie(dt);
    updLoans(dt);
  }
  updClub(dt);
  if (!found.den) return;
  updMeet(dt);
  updBand(dt);
  updCrowd(dt);
  const p = player.g.position, here = level.down && inDen(p);
  // (sat at a host's table, his controls open, his bubble's the only one up: speech.ts)
  onlyVendor('family', booths.find(b => !PANELS[b.k].hidden)?.talk ?? null);
  for (const b of booths) {
    const on = level.down && d2xz(p, b.pad) < b.pad.r * b.pad.r;
    if (on && !b.near && !held && met(b.k)) b.say(LINES[b.k][b.next++ % LINES[b.k].length]);
    b.near = on;
    if (b.talk.upd(dt)) {
      const { x, y, z } = b.host.position;
      const face = FACE[b.k];
      b.talk.place(x, y + TALK_Y[b.k], z, face === undefined ? undefined : y + face);
    }
    if (b.voice.upd(dt)) b.host.syllable();
    b.host.talking = b.voice.talking || meetTalking(b.k);
    b.host.watch = here && d2xz(p, b.host.position) < WATCH * WATCH ? p : null;
    b.host.update(dt);
  }
  const vip = level.down && p.x > VIP.x0 && p.x < VIP.x1 && p.z > VIP.z0 && p.z < VIP.z1;
  if (vip && !inVip) { const line = GUARD_LINES[guardNext++ % GUARD_LINES.length]; guardTalk.say(line); guardVoice.say(line); }
  inVip = vip;
  if (guardTalk.upd(dt)) guardTalk.place(guards[0].position.x, guards[0].position.y + 2.2, guards[0].position.z);
  if (guardVoice.upd(dt)) guards[0].syllable();
  guards[0].talking = guardVoice.talking;
  for (const g of guards) {
    g.watch = vip ? p : null;
    g.update(dt);
  }
}
