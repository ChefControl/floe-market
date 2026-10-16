// The Undertow's club (stage 3), round the Family's booths: its barman and regulars (regulars.ts) talking, and the two
// things to do with them. Walk up to the trench coat, Doc Murk, Velvet or Inky (Harry's bookkeeper, in his office) and
// they have a word for you, a new one each time; Velvet sings a line of her song now and then while you're in the room. Step up to the bar and Angler Al pours
// you a drink for a few Fugu Chips: a kelp tonic clears your head, the house special leaves you tipsy for a while (as
// the yacht's champagne does). Buy Gus, the blobfish on the end stool, a drink and he tells you what he's heard about
// the next boss.
import { gamePad, tipsy } from './casinoKit';
import { CY, parts } from './cellar';
import { BAR_STOOLS, BARMAN, BLOB_PAD, DEN_BAR, DRINK_PAD } from './cellarPlan';
import { BOSSES, CHIP, F } from './fight';
import { DEN, found, level, LOANS } from './layout';
import { player } from './player';
import { BUBBLE_Y, glass, type Regular, regularParts, regulars, updRegulars, velvetAt, where } from './regulars';
import { camera } from './render';
import { bubble } from './speech';
import { d2xz, V } from './util';
import { wallet } from './wallet';

for (const o of regularParts) parts.den.add(o);

/** What each says, one line each time you come up to them (Al and Gus at their pads), going round. */
export const CLUB_LINES: Record<Regular, string[]> = {
  al: ['Angler Al. I keep the lights on round here. Well, the one.', "Don't mind Gus. He's been sinking since the tide went out.", 'What can I get you?'],
  gus: ['*sigh*', "It's always last call somewhere, kid.", 'Buy a fish a drink? I hear things.'],
  coat: ['Evening. We are one tall gentleman.', 'Nothing fishy here, pal.', 'Keep walking. We... I mean I... am busy.'],
  doc: ["Don't touch the green one.", "It's for science. Mostly.", 'Ink? Fresh out. Ask me tomorrow.'],
  velvet: ['Request? Honey, I only know the one song.', 'Stay a while. The tide never hurries down here.'],
  inky: ["Inky. I keep Harry's books. All eight of them.", 'Interest compounds, friend. So do I.', 'Shh. Counting what everybody owes.'],
};
/** Velvet's song, a line at a time. */
export const SONG = ["♪ Down where the light don't reach... ♪", '♪ Every chip runs out, baby... ♪', '♪ The undertow keeps what it takes... ♪', '♪ ...and it never gives it back ♪'];
/** What Gus has heard about each boss in turn, for the price of a drink. */
export const RUMOURS = [
  "Hakkaku's lot are all arms and no patience. Have your bowls out before you ring.",
  "The crab's crowd comes in sideways and starving. Fill the stall before you ring.",
  'His lot come up out of the gutters, and they eat fast. Keep that pot going.',
  "Samehada's Harry's nephew. Borrow from the uncle, beat the nephew. Family's funny like that.",
  "The big one's Mr. Fugu's own. A minute on his bell and a thousand mouths. Bring everything.",
];
const ALL_BEATEN = 'You beat the lot, kid. Now they whisper about you.';
/** Al's drinks: what each is called, its price in chips, and what he says pouring it. */
export const DRINKS = {
  tonic: { name: 'Kelp tonic', cost: 2, says: 'Kelp tonic. Clears the head.' },
  house: { name: 'The Undertow', cost: 10, says: "The house special. Don't stand up too fast." },
} as const;
export type Drink = keyof typeof DRINKS;
/** Gus's drink, and how long the house special leaves you tipsy. */
export const GUS_DRINK = 5, TIPSY = 12;
/** How near you have to be for one of them to talk to you, and to watch you. */
const NEAR = 1.9, WATCH = 4.5, SING_EVERY = 7;

// ---------- who's talking ----------
const ALL: Regular[] = ['al', 'gus', 'coat', 'doc', 'velvet', 'inky'];
const talk = Object.fromEntries(ALL.map(k => [k, { b: bubble(parts.den, k === 'velvet' ? 2.4 : 2.3), next: 0, near: false }])) as
  Record<Regular, { b: ReturnType<typeof bubble>; next: number; near: boolean; base?: number }>;
/** Has `k` say `text` in their bubble. */
const say = (k: Regular, text: string) => talk[k].b.say(text);
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
}, { at: V(BARMAN.x, CY + 1.55, DEN_BAR.front - 0.35), from: V(0, 0.5, 1).normalize(), wide: 2.4, tall: 1.9 }, here);
// (the camera comes in on Gus from the side, past whoever's on his pad)
const gus = BAR_STOOLS[3];
const gusPad = gamePad(BLOB_PAD, '🍺', gusPanel, {
  opened() { gusMsg.textContent = 'Gus stares into his mug.'; refreshBar(); say('gus', nextLine('gus')); },
  closed() {},
  greet() {},
  live: () => false,
  say: text => say('gus', text),
  away: '',
}, { at: V(gus.x, CY + 1.2, gus.z + 0.1), from: V(0.7, 0.55, 0.75).normalize(), wide: 1.8, tall: 1.6 }, here);
// (their markings are the club's own: club.ts's, below)
barPad.enable(); gusPad.enable();
for (const [p, mark] of [[DRINK_PAD, barPad.mark], [BLOB_PAD, gusPad.mark]] as const) {
  mark.scale.setScalar(0.65); mark.position.set(p.x, CY + 0.035, p.z);
  parts.den.add(mark);
}

/** Whether `p` is in the club, or in Harry's office through its west wall. */
const inDen = (p: { x: number; z: number }) => [DEN, LOANS].some(r => p.x > r.x0 - 0.5 && p.x < r.x1 + 0.5 && p.z > r.z0 - 0.5 && p.z < r.z1 + 0.5);
let singT = SING_EVERY, verse = 0;
const tmp = V(0, 0, 0);

/** The club, every frame (once the Undertow's found): the bar's and Gus's pads, a drink on its way, the regulars
 *  talking to whoever comes near and watching them, and Velvet's song. */
export function updClub(dt: number) {
  barPad.upd(dt); gusPad.upd(dt);
  if (!found.den) return;
  const p = player.g.position, inRoom = level.down && inDen(p);
  if (pour) {
    pour.t += dt;
    const k = Math.min(1, pour.t / POUR.slide), e = 1 - (1 - k) ** 3;
    glass.position.set(BARMAN.x + (DRINK_PAD.x - BARMAN.x) * e, CY + DEN_BAR.h + 0.06, DEN_BAR.front - 0.2 + 0.08 * e);
    if (pour.t >= POUR.drink) drunk();
  }
  // the trench coat, Doc, Velvet and Inky, as you come up to them
  for (const k of ['coat', 'doc', 'velvet', 'inky'] as const) {
    const at = where(k), near = inRoom && d2xz(p, at) < NEAR * NEAR;
    if (near && !talk[k].near) say(k, nextLine(k));
    talk[k].near = near;
  }
  // Velvet's song, a line now and then, while you're in the room
  if (inRoom && !talk.velvet.b.text && (singT -= dt) <= 0) { singT = SING_EVERY; say('velvet', SONG[verse++ % SONG.length]); }
  for (const k of ALL) {
    const t = talk[k], s = t.b.sprite;
    if (t.b.upd(dt)) {
      if (k === 'velvet') s.position.copy(velvetAt.getWorldPosition(tmp)).add(V(0, BUBBLE_Y.velvet, 0));
      else { const at = where(k); s.position.set(at.x, at.y + BUBBLE_Y[k], at.z); }
      // (smaller close up, at the bar or Gus, so it doesn't fill the view)
      t.base ??= s.scale.x;
      const k2 = Math.min(1, Math.max(0.35, s.position.distanceTo(camera.position) / 12));
      s.scale.set(t.base * k2, t.base * k2 * 200 / 512, 1);
    }
  }
  for (const [k, h] of Object.entries(regulars) as [Exclude<Regular, 'velvet'>, (typeof regulars)['al']][]) {
    h.talking = !!talk[k].b.text;
    h.watch = inRoom && d2xz(p, h.position) < WATCH * WATCH ? p : null;
  }
  updRegulars(dt);
}
