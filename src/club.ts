// The Undertow's club (stage 3), round the Family's booths: its barman and regulars (regulars.ts) talking, and the two
// things to do with them. Walk up to the trench coat, Velvet or Inky (Harry's bookkeeper, in his office) and they have a
// word for you, a new one each time; Doc Murk and Gus keep to themselves till you speak to them (E, or Talk). Velvet
// sings a line of her song now and then while you're in the room. Step up to the bar and Angler Al pours
// you a drink for a few Fugu Chips: a kelp tonic clears your head, the house special leaves you tipsy for a while (as
// the yacht's champagne does). Speak to Gus, the blobfish on the stool in the bar's far corner, and buy him a drink, and he tells you what
// he's heard about the next boss.
import { offerTalk } from './buy';
import { gamePad, leaveSeat, takeSeat, tipsy } from './casinoKit';
import { chatter } from './chatter';
import { CY, parts } from './cellar';
import { BAR_STOOLS, BARMAN, DEN_BAR, DRINK_PAD } from './cellarPlan';
import { BOSSES, CHIP, F } from './fight';
import { buyHeld } from './input';
import { found, inUndertow, level } from './layout';
import { player } from './player';
import { BUBBLE_Y, glass, type Regular, regularParts, regulars, updRegulars, velvetAt, where } from './regulars';
import { bubble, onlyVendor } from './speech';
import { d2xz, V } from './util';
import { wallet } from './wallet';

for (const o of regularParts) parts.den.add(o);

/** What each says, one line each time you come up to them (Al at his pad, Doc and Gus when you speak to them), going round. */
export const CLUB_LINES: Record<Regular, string[]> = {
  al: ['Angler Al. I keep the light on.', "Don't mind Gus. He's been sinking lately.", 'What can I get you?'],
  gus: ['*sigh*', "It's always last call somewhere, kid.", 'Buy a fish a drink? I hear things.'],
  coat: ['Evening. We are one tall gentleman.', 'Nothing fishy here, pal.', 'Keep walking. We... I mean I... am busy.'],
  doc: ["Don't touch the green one.", "It's for science. Mostly.", 'Ink? Fresh out. Ask me tomorrow.'],
  velvet: ['Request? Honey, I only know the one song.', 'Stay a while. The tide never hurries.'],
  inky: ["Inky. I keep Harry's books, all eight.", 'Interest compounds, friend. So do I.', 'Shh. Counting what everybody owes.'],
};
/** Velvet's song, a line at a time. */
export const SONG = ["♪ Down where the light don't reach... ♪", '♪ Every chip runs out, baby... ♪', '♪ The undertow keeps what it takes... ♪', '♪ ...and it never gives it back ♪'];
/** What Gus has heard about each boss in turn, for the price of a drink: just the hint. */
export const RUMOURS = [
  "Hakkaku's lot are impatient. Have bowls out before you ring.",
  "The crab's crowd comes starving. Fill the stall first.",
  'His lot eat fast. Keep that pot going.',
  "Samehada's Harry's nephew. Borrow from the uncle, beat the nephew.",
  "Mr. Fugu's own: a thousand mouths. Bring everything.",
];
const ALL_BEATEN = 'You beat the lot. They whisper about you.';
/** Al's drinks: what each is called, its price in chips, and what he says pouring it. */
export const DRINKS = {
  tonic: { name: 'Kelp tonic', cost: 2, says: 'Kelp tonic. Clears the head.' },
  house: { name: 'The Undertow', cost: 10, says: "The house special. Don't stand up too fast." },
} as const;
export type Drink = keyof typeof DRINKS;
/** Gus's drink, and how long the house special leaves you tipsy. */
export const GUS_DRINK = 5, TIPSY = 12;
/** How near you have to be for one of them to talk to you, and to watch you; and how far you can step before Gus's
 *  panel closes (barely at all: it closes the moment you move off). */
const NEAR = 1.9, WATCH = 4.5, SING_EVERY = 7, GUS_OFF = 0.05;
/** How near Doc or Gus you have to be to speak to them (closer than the others come up to you: they keep to themselves). */
const QUIET_NEAR = 1.1;
/** The bar's marking, small (its size against a game's pad), and how near it you have to be to order. */
const BAR_MARK = 0.42, BAR_REACH = 0.6;

// ---------- who's talking ----------
const ALL: Regular[] = ['al', 'gus', 'coat', 'doc', 'velvet', 'inky'];
const talk = Object.fromEntries(ALL.map(k => [k, { b: bubble(parts.den, k === 'velvet' ? 2.4 : 2.3), next: 0, near: false }])) as
  Record<Regular, { b: ReturnType<typeof bubble>; next: number; near: boolean }>;
/** Each one going through what they say, their head bobbing to it (chatter.ts). */
const voices = Object.fromEntries(ALL.map(k => [k, chatter()])) as Record<Regular, ReturnType<typeof chatter>>;
/** Has `k` say `text` in their bubble. */
const say = (k: Regular, text: string) => { talk[k].b.say(text); voices[k].say(text); };
/** `k`'s next line. */
const nextLine = (k: Regular) => CLUB_LINES[k][talk[k].next++ % CLUB_LINES[k].length];
/** What each is saying now ('' while they're quiet), for tests. */
export const clubSays = (k: Regular) => talk[k].b.text;

// ---------- the bar ----------
const $ = (id: string) => document.getElementById(id)!;
const barPanel = $('denBar'), barMsg = $('denBarMsg'), gusPanel = $('denGus'), gusMsg = $('denGusMsg'), gusBtn = $('buyGus') as HTMLButtonElement;
const drinkBtns = [...barPanel.querySelectorAll<HTMLButtonElement>('[data-drink]')];
/** A drink on its way: which, and how long since Al poured it. */
let pour: { kind: Drink; t: number } | null = null;
const POUR = { slide: 0.6, drink: 1.6 };
const afford = (cost: number) => wallet.money >= cost * CHIP;

function refreshBar() {
  for (const b of drinkBtns) {
    const d = DRINKS[b.dataset.drink as Drink];
    b.textContent = `${d.name} · 🐡 ${d.cost}`;
    b.disabled = !!pour || !afford(d.cost);
  }
  gusBtn.textContent = `Buy Gus a drink · 🐡 ${GUS_DRINK}`;
  gusBtn.disabled = !afford(GUS_DRINK);
}

/** Orders `kind` at the bar: paid at once, and Al slides it over. */
export function buyDrink(kind: Drink) {
  const d = DRINKS[kind];
  if (pour || !afford(d.cost)) return false;
  wallet.money -= d.cost * CHIP;
  pour = { kind, t: 0 };
  glass.visible = true;
  say('al', d.says);
  barMsg.textContent = d.says;
  refreshBar();
  return true;
}
drinkBtns.forEach(b => b.addEventListener('click', () => buyDrink(b.dataset.drink as Drink)));
/** The drink's drunk: its glass goes, and it does what it does. */
function drunk() {
  const kind = pour!.kind;
  pour = null;
  glass.visible = false;
  if (kind === 'house') { tipsy.t = TIPSY; barMsg.textContent = 'Whoa. The floor\'s moving. Or is it you?'; }
  else { tipsy.t = 0; barMsg.textContent = 'Clear as the deep.'; }
  refreshBar();
}

/** What Gus has heard about the next boss. */
export const rumour = () => (F.beaten < BOSSES.length ? `${BOSSES[F.beaten].face} ${RUMOURS[F.beaten]}` : ALL_BEATEN);
/** Buys Gus a drink: paid at once, and he tells you what he's heard. */
export function buyGus() {
  if (!afford(GUS_DRINK)) return false;
  wallet.money -= GUS_DRINK * CHIP;
  const r = rumour();
  say('gus', r);
  gusMsg.textContent = `Gus leans in: "${r}"`;
  refreshBar();
  return true;
}
gusBtn.addEventListener('click', () => buyGus());

const here = () => level.down && found.den;
const barPad = gamePad(DRINK_PAD, '🍸', barPanel, {
  opened() { barMsg.textContent = 'Angler Al wipes the counter. "What\'ll it be?"'; refreshBar(); say('al', nextLine('al')); },
  closed() { if (pour) drunk(); },
  greet() {},
  live: () => !!pour,
  say: text => say('al', text),
  away: 'Hey, your drink!',
}, { at: V(BARMAN.x, CY + 1.55, DEN_BAR.front - 0.35), from: V(0, 0.5, 1).normalize(), wide: 2.4, tall: 1.9 }, here, BAR_REACH);
// Gus has no pad: speak to him (E, or Talk) and his panel opens, the camera coming in on him from the side, till you
// move (from `gusFrom`, where you stood to speak to him)
const gus = BAR_STOOLS[3], gusView = { at: V(gus.x, CY + 1.2, gus.z + 0.1), from: V(0.7, 0.55, 0.75).normalize(), wide: 1.8, tall: 1.6 };
let gusOpen = false;
const gusFrom = V(0, 0, 0);
function openGus(open: boolean) {
  if (open === gusOpen) return;
  gusOpen = open;
  gusPanel.hidden = !open;
  if (open) { gusFrom.copy(player.g.position); gusMsg.textContent = 'Gus stares into his mug.'; refreshBar(); takeSeat(gusView, gusPanel); }
  else leaveSeat(gusPanel);
}
// (the bar's marking is the club's own: club.ts's)
barPad.enable();
barPad.mark.scale.setScalar(BAR_MARK); barPad.mark.position.set(DRINK_PAD.x, CY + 0.035, DRINK_PAD.z);
parts.den.add(barPad.mark);

const inDen = inUndertow;
/** The regulars who wait to be spoken to; and whether E (or Talk) was down last frame. */
const QUIET = ['doc', 'gus'] as const;
let pressed = false;
let singT = SING_EVERY, verse = 0;
const tmp = V(0, 0, 0);

/** The club, every frame (once the Undertow's found): the bar's and Gus's pads, a drink on its way, the regulars
 *  talking to whoever comes near and watching them, and Velvet's song. */
export function updClub(dt: number) {
  const atBar = barPad.upd(dt);
  // (at Al's pad, or talking to Gus, theirs is the only bubble up: speech.ts)
  onlyVendor('club', atBar ? talk.al.b : gusOpen ? talk.gus.b : null);
  if (!found.den) return;
  const p = player.g.position, inRoom = level.down && inDen(p);
  if (pour) {
    pour.t += dt;
    const k = Math.min(1, pour.t / POUR.slide), e = 1 - (1 - k) ** 3;
    glass.position.set(BARMAN.x + (DRINK_PAD.x - BARMAN.x) * e, CY + DEN_BAR.h + 0.06, DEN_BAR.front - 0.2 + 0.08 * e);
    if (pour.t >= POUR.drink) drunk();
  }
  // the trench coat, Velvet and Inky, as you come up to them; Doc and Gus only when spoken to (E, or Talk)
  for (const k of ['coat', 'velvet', 'inky'] as const) {
    const at = where(k), near = inRoom && d2xz(p, at) < NEAR * NEAR;
    if (near && !talk[k].near) say(k, nextLine(k));
    talk[k].near = near;
  }
  // (whichever's nearest, if either's near enough)
  const by = inRoom ? QUIET.map(k => [k, d2xz(p, where(k))] as const).filter(([, d]) => d < QUIET_NEAR * QUIET_NEAR).sort((a, b) => a[1] - b[1]) : [];
  const quiet = by[0]?.[0] ?? null, press = buyHeld() && !pressed;
  pressed = buyHeld();
  const free = !!quiet && !talk[quiet].b.text && !(quiet === 'gus' && gusOpen);
  offerTalk(free);
  if (free && press) { say(quiet!, nextLine(quiet!)); if (quiet === 'gus') openGus(true); }
  if (gusOpen && !(inRoom && d2xz(p, gusFrom) < GUS_OFF * GUS_OFF)) openGus(false);
  // Velvet's song, a line now and then, while you're in the room
  if (inRoom && !talk.velvet.b.text && (singT -= dt) <= 0) { singT = SING_EVERY; say('velvet', SONG[verse++ % SONG.length]); }
  // (each over its speaker, kept in sight: speech.ts)
  for (const k of ALL) {
    const t = talk[k];
    if (!t.b.upd(dt)) continue;
    const at = k === 'velvet' ? velvetAt.getWorldPosition(tmp) : where(k), y = BUBBLE_Y[k];
    t.b.place(at.x, at.y + y, at.z);
  }
  for (const [k, h] of Object.entries(regulars) as [Exclude<Regular, 'velvet'>, (typeof regulars)['al']][]) {
    if (voices[k].upd(dt)) h.syllable();
    h.talking = voices[k].talking;
    h.watch = inRoom && d2xz(p, h.position) < WATCH * WATCH ? p : null;
  }
  updRegulars(dt);
}
