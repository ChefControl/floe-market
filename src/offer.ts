// Mr. Fugu's offer. Once Floe Sushi is fully built and the cash passes $1,000,000, a hatch turns up in the dock with a
// "!" over it, knocking, and an arrow at the edge of the screen points the way. Walking up to it, the screen blinks,
// the lid lifts a crack, and a pair of shades in the dark under it asks the chef to come back at night. Waiting for
// nightfall, night falls over the dock, and then the encounter, staged as the stage 3 teaser is: shoves at the lid
// from below, the hatch bursting open in smoke and a blaze of light, and him rising out of it, a shape against the
// light until the light from above finds him. He makes a short pitch for the sumo ring under the dock (stage 3), and
// makes it clear it's not legal. The player answers with a tap. Saying yes puts his price on a gold tile by the hatch
// (unlocks.ts): buying into the ring, and the way down to it. Turning him down leaves the hatch on the dock: stand on
// it to hear him out again (that night). Either way, the night lifts after.
import { Vector3 } from 'three';
import { ac, between, hushWorld, noise, tone } from './audio';
import { Fugu, Hatch } from './fugu';
import { HatchFx } from './hatchFx';
import { HATCH_AT, stage } from './layout';
import { player } from './player';
import { pointAt } from './pointers';
import { rainK } from './rain';
import { camera, camK, scene } from './render';
import { save } from './save';
import { nightK, setNight, staging } from './stage';
import { toast } from './ui';
import { stageBuilt } from './unlocks';
import { d2xz, FY, V, type XZ } from './util';
import { wallet } from './wallet';

export const MILLION = 1_000_000;
/** The hatch in the dock planks, and where the player stands to hear him out, facing it: on the restaurant's side. */
export const HATCH = V(HATCH_AT.x, FY, HATCH_AT.z);
const STAND = V(HATCH_AT.x - 0.5, FY, HATCH_AT.z + 2.1);

/** The player's answer so far: 0 hasn't met him, 1 not now, 2 in. Saved. */
export const offer = { answer: 0 as 0 | 1 | 2 };
/** The camera's view of the meeting, blended in by `k` (main.ts), a shake for the big moments, and how far it's moved
 *  in: on the crack under the lid (`close`, for the peek), round over the chef's shoulder on him (`near`, for the
 *  reveal), and creeping in on him from there as he talks (`creep`). */
export const offerCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0), shake: 0, close: 0, near: 0, creep: 0 };
/** Where `close` is going. */
let closeTo = 0;

let hatch: Hatch | null = null;
let fugu: Fugu | null = null;
let fx: HatchFx | null = null;

// ---------- the page ----------
const $ = (id: string) => document.getElementById(id)!;
const root = $('offer'), alertEl = $('offerAlert'), blinkEl = $('offerBlink'), sayEl = $('offerSay');
/** The name on his speech bubble: nobody knows who's under the lid till he's out. */
const nameEl = sayEl.querySelector('b')!;
const named = (who: string) => { nameEl.textContent = who; };
const lineEl = $('offerLine'), pickEl = $('offerPick'), liveEl = $('offerLive'), captionEl = $('offerCaption');

// ---------- sound ----------
// Through the game's sound engine (audio.ts). The knocking comes from the hatch, out in the world; once he's on, the
// world goes quiet (its effects, its ambience and its music) and only his sounds play: his effects at the effects'
// volume, and his bass at the music's.
/** A note at the old mix's volume (`vol`), his (`cue`) unless it's out in the world (`at`), sliding to `to`. */
const note = (f: number, d: number, vol: number, o: { t?: number; to?: number; type?: OscillatorType; at?: XZ } = {}) =>
  tone({ f, f2: o.to, d, t: o.t, at: o.at, bus: o.at ? 'sfx' : 'cue', type: o.type ?? 'triangle', a: 0.008, v: Math.min(1, vol * 2) });
const hiss = (d: number, vol: number, kind: BiquadFilterType, f: number, t = 0) =>
  noise({ f, kind, d, t, a: 0.01, v: Math.min(1, vol * 2), bus: 'cue' });
const sfx = {
  alert: () => { note(880, 0.08, 0.08); note(1175, 0.16, 0.08, { t: 0.08 }); },
  blink: () => note(660, 0.06, 0.05),
  bang: () => { note(140, 0.3, 0.45, { to: 50, type: 'sine' }); hiss(0.25, 0.25, 'lowpass', 900); },
  roar: () => { hiss(1.4, 0.12, 'bandpass', 500); hiss(1.1, 0.06, 'bandpass', 1200, 0.15); },
  climb: () => [0, 0.12, 0.24, 0.36].forEach(t => note(220, 0.05, 0.08, { t })),
  // a low mumble rather than a beep
  voice: () => note(between(105, 140), 0.08, 0.17),
  /** The end of a sentence: a lower "hm", a little longer. */
  stop: () => note(between(88, 98), 0.16, 0.17),
  puff: () => note(180, 0.28, 0.1, { to: 760 }),
  calm: () => { note(620, 0.35, 0.06, { to: 140 }); hiss(0.3, 0.03, 'bandpass', 900); },
  pick: () => { note(523, 0.07, 0.07); note(784, 0.12, 0.07, { t: 0.06 }); },
  taiko: () => { note(120, 0.55, 0.6, { to: 42, type: 'sine' }); hiss(0.14, 0.3, 'lowpass', 420); },
  /** The lid lifted a crack: a creak of old hinges. */
  creak: () => { note(310, 0.5, 0.05, { to: 240, type: 'sawtooth' }); hiss(0.45, 0.03, 'bandpass', 1400); },
  /** A shove at the lid from below, or the lid dropping back: a heavy thud, `v` loud. */
  thud: (v: number) => { note(110, 0.22, 0.4 * v, { to: 48, type: 'sine' }); hiss(0.16, 0.18 * v, 'lowpass', 700); },
  /** Two thuds from under the hatch, heard from where the player stands. */
  knock: () => { for (const t of [0, 0.16]) note(150, 0.12, 0.3, { t, to: 90, type: 'sine', at: HATCH }); },
};

/** A sleazy little walking bass from under the dock while he talks, scheduled a moment ahead on the audio clock. */
const BASS = [55, 0, 55, 65.41, 0, 73.42, 77.78, 82.41, 98, 0, 82.41, 73.42, 0, 65.41, 55, 0];
const BASS_STEP = 60 / 92 / 2;
let bass: { next: number; i: number } | null = null;
const startMusic = () => { bass = { next: -1, i: 0 }; };
const stopMusic = () => { bass = null; };
function updBass() {
  if (!bass || !ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  if (bass.next < now - 0.3) bass.next = now + 0.05;
  while (bass.next < now + 0.25) {
    const f = BASS[bass.i];
    if (f) tone({ f: f * 2, t: bass.next - now, d: BASS_STEP * 0.95, type: 'triangle', a: 0.008, v: 0.33, bus: 'scene' });
    bass.next += BASS_STEP * (bass.i % 2 ? 0.7 : 1.3);
    bass.i = (bass.i + 1) % BASS.length;
  }
}
/** True while he's on: the game's music makes room (music.ts). */
export const offerPlaying = () => !!show;

// ---------- what he says ----------
type Fx = 'puff' | 'calm' | 'shake' | 'glint';
interface Line { f: string; fx?: Fx[] }
interface Choice { icon: string; label: string; main?: boolean; go: () => void }

const pitch = (again: boolean): Line[] => again
  ? [
    { f: 'Back so soon? Honest money getting boring?', fx: ['glint'] },
    { f: "Offer stands. Ring's downstairs. You in?" },
  ]
  : [
    { f: 'Hello, Chef.' },
    { f: 'A million bucks off raw fish and rice. Honest money. Slow money.' },
    { f: 'Downstairs, the big boys wrestle. Sumo. No refs, no rules, no refunds.', fx: ['glint'] },
    { f: 'Legal? Not even close.', fx: ['puff', 'shake'] },
    { f: "But the crowd's starving. Cook 'em chanko, take on my boys, I keep thirty percent. You in?", fx: ['calm'] },
  ];

function answers(asked: boolean): Choice[] {
  return [
    {
      icon: '🤝', label: 'Deal me in', main: true,
      go: () => say([{ f: 'Smart chef. Bring cash. Tell nobody.', fx: ['glint'] }, { f: 'See you downstairs.' }], () => finish(2)),
    },
    ...(asked ? [] : [{
      icon: '🚔', label: 'Is this legal?',
      go: () => say([{ f: "Kid. I'm a pufferfish in a trench coat.", fx: ['puff', 'shake'] }, { f: 'Next question.', fx: ['calm'] }],
        () => ask(answers(true))),
    }]),
    {
      icon: '🚶', label: 'Not today',
      go: () => say([{ f: "Your loss. I'll be under the dock when honest gets old." }], () => finish(1)),
    },
  ];
}

// ---------- the scene ----------
interface Cue { t: number; run: () => void }
/** The meeting in progress: its clock, what's coming up, and when the hatch burst open (the smoke and light go by it). */
let show: { t: number; cues: Cue[]; blast: number | null } | null = null;
/** What the player is doing: watching, reading a line, or picking an answer. */
let mode: 'watch' | 'line' | 'pick' = 'watch';
/** He climbs out of the hatch and drops back in: his height over time. */
let climb: { from: number; to: number; t: number; dur: number } | null = null;
/** Night falling, or lifting again after the meeting: from and to, over `dur` seconds (stage.ts setNight). */
let dusk: { from: number; to: number; t: number; dur: number } | null = null;
/** A shove from under the lid: how hard, and how long ago. */
let shoveAt: { amp: number; t: number } | null = null;
let standT = 0;
/** The hatch is out with its "!", waiting for the player to come over; and whether coming to it now brings him out:
 *  once a visit (after any answer, the player has to walk off and come back: before he's met, out of `CLEAR`; after
 *  "Not today", off the hatch, which is where he's called up from then). */
let waiting = false, armed = true;
let knockT = 0;
/** How close the player has to come to the hatch for him to come out, and how far off to walk before he'll come out
 *  again (past where the scene leaves the player standing); after "Not today", standing on the hatch (`ON`) calls him. */
const RANGE = 1.7, CLEAR = 2.6, ON = 0.6;
/** Where he waits under the lid to peek out: his shades just under the lid's edge, in the middle of the ladder as the camera sees it. */
const PEEK = V(HATCH_AT.x - 0.095, FY - 1.085, HATCH_AT.z + 0.12);
/** The scene's beats, from the first shove (the encounter): the shoves, the blast, him rising, the reveal, his line. */
const SHOVES = [0.6, 2.0], BLAST = 3.4, RISE = BLAST + 0.7, REVEAL = BLAST + 2.6, TALK = BLAST + 5.0;

const at = (dt: number, run: () => void) => { show?.cues.push({ t: show.t + dt, run }); };

/** Can he turn up now? Not in the middle of something else on screen. */
const free = () => stage.n === 2 && !staging() && rainK === 0 && ['shop', 'roulette', 'blackjack', 'slots', 'look', 'korki'].every(id => $(id).hidden);

function blink(on: boolean, slow = false) {
  blinkEl.classList.toggle('slow', slow);
  blinkEl.classList.toggle('on', on);
  if (on) sfx.blink();
}
/** A warm flash from the hole as it bursts open, fading. */
function flash() {
  blinkEl.classList.remove('slow');
  blinkEl.classList.add('flash', 'on');
  at(0.05, () => { blinkEl.classList.add('slow'); blinkEl.classList.remove('on'); });
  at(0.6, () => blinkEl.classList.remove('flash'));
}
/** A caption over the scene, as in a film. */
function caption(text: string | null) {
  captionEl.classList.toggle('on', !!text);
  if (text) { captionEl.textContent = text; liveEl.textContent = text; }
}

function placeHatch() {
  if (hatch) return hatch;
  hatch = new Hatch();
  hatch.position.copy(HATCH);
  // turned round, so its lid swings up on the sea's side, away from the player
  hatch.rotation.y = Math.PI;
  scene.add(hatch);
  fx = new HatchFx(HATCH);
  return hatch;
}

/** Someone's knocking under the hatch, with a "!" over it and an arrow pointing the way. */
function summon() {
  waiting = true;
  placeHatch();
  root.hidden = false;
  alertEl.classList.add('on');
  pointAt({ x: HATCH.x, y: HATCH.y + 1, z: HATCH.z }, '❗', () => waiting);
  toast('Something is knocking under the dock');
}

/** Knocks from under the lid every couple of seconds, heard from nearby. */
function knock(dt: number) {
  knockT -= dt;
  if (knockT > 0) return;
  knockT = 2.2;
  hatch!.knock();
  sfx.knock();
}

/** Starts a scene: the blinks, and behind the last of them the player before the hatch, the camera on it, its lights
 *  on, and him, out of sight under it. */
function begin(then: () => void) {
  show = { t: 0, cues: [], blast: null };
  waiting = false;
  mode = 'watch';
  player.held = true; player.moving = false;
  root.hidden = false;
  alertEl.classList.add('on');
  sfx.alert();
  at(0.3, () => blink(true));
  at(0.38, () => blink(false));
  at(0.45, () => blink(true));
  at(0.53, () => blink(false));
  at(0.6, () => blink(true));
  at(0.75, () => {
    alertEl.classList.remove('on');
    const h = placeHatch();
    h.open = h.openTo = 0;
    h.lit(true);
    fugu ??= new Fugu();
    h.through(fugu);
    scene.add(fugu);
    fugu.visible = false;
    fugu.rotation.y = Math.atan2(STAND.x - HATCH.x, STAND.z - HATCH.z);
    fugu.puff = fugu.puffTo = 0;
    player.g.position.copy(STAND);
    player.h = Math.atan2(HATCH.x - STAND.x, HATCH.z - STAND.z);
    player.g.rotation.y = player.h;
    offerCam.k = 1; offerCam.near = offerCam.creep = 0;
    document.body.classList.add('offer');
  });
  at(1.0, () => blink(false, true));
  at(1.2, then);
}

/**
 * The first time, by day: the lid lifts a crack, and in the dark under it a pair of shades catches the light. He
 * wants the chef back tonight. Waiting for nightfall brings him out (the encounter); "Not now" leaves him knocking.
 */
function peek() {
  begin(() => {
    fugu!.visible = true;
    fugu!.position.copy(PEEK);
    // in the dark under the lid: just his shades, looking out at the chef (that's the camera, edging in)
    fugu!.stare(true);
    closeTo = 1;
    named('???');
    fugu!.rotation.y = Math.atan2(1.7, 2.8) - 0.25;
    hatch!.peekTo = 1; sfx.creak();
    // (the one glint, as he says it)
    at(1.0, () => say([{ f: 'Psst. Chef.', fx: ['glint'] }, { f: 'Want real money? Come back tonight.' }], () => ask([
      { icon: '🌙', label: 'Wait for nightfall', main: true, go: () => nightfall(false) },
      {
        icon: '🚶', label: 'Not now',
        go: () => say([{ f: "Suit yourself. I ain't going anywhere." }], () => {
          mode = 'watch';
          duck(0.5);
          at(1.0, () => {
            leave("He'll be under the dock. Walk back over when you're ready");
            // still knocking, with its "!"
            waiting = true;
            root.hidden = false; alertEl.classList.add('on');
          });
        }),
      },
    ])));
  });
}

/** He ducks back down out of the crack, and only then the lid drops shut after him (thud, `v` loud). */
function duck(v: number) {
  climb = { from: fugu!.position.y, to: -1.9, t: 0, dur: 0.3 };
  closeTo = 0;
  at(0.25, () => { hatch!.peekTo = 0; });
  at(0.35, () => { fugu!.visible = false; fugu!.stare(false); });
  at(0.7, () => sfx.thud(v));
}

/** He ducks back under, the lid drops, and night falls over the dock; then the encounter. */
function nightfall(again: boolean) {
  mode = 'watch';
  pickEl.hidden = true;
  if (fugu!.visible) duck(0.6);
  at(0.6, () => { dusk = { from: nightK(), to: 1, t: 0, dur: 3.2 }; caption('That night…'); });
  at(3.4, () => caption(null));
  at(4.2, () => encounter(again));
}

/**
 * The encounter, at night: two shoves at the lid from below, dust squeezed out round it and the glow through the
 * cracks; the third bursts it open in a flash, with a wall of smoke; he rises out of it on his lift, a black shape
 * against the light from the hole, and as the smoke clears and the light from above finds him, he's himself.
 */
function encounter(again: boolean) {
  const f = fugu!;
  f.position.set(HATCH.x, -1.9, HATCH.z + 0.05);
  f.rotation.y = Math.atan2(STAND.x - HATCH.x, STAND.z - HATCH.z);
  f.shade(0.03);
  named('Mr. Fugu');
  // eye to eye with the chef: his head tipped down to theirs (he's the taller, up on his lift), and held still
  f.gaze = 0.1; f.steady = true;
  f.visible = false;
  for (const [i, t] of SHOVES.entries()) at(t, () => {
    shoveAt = { amp: [0.17, 0.36][i], t: 0 };
    fx!.dust(i > 0);
    sfx.thud(i ? 0.8 : 0.55);
    offerCam.shake = i ? 0.12 : 0.06;
  });
  at(BLAST, () => {
    show!.blast = show!.t;
    hatch!.openTo = 1;
    fx!.blast();
    flash();
    f.visible = true;
    offerCam.shake = 0.5;
    sfx.bang(); sfx.roar();
  });
  at(RISE, () => { climb = { from: -1.9, to: FY + 0.08, t: 0, dur: 2.4 }; sfx.climb(); });
  at(TALK, () => { startMusic(); say(pitch(again), () => ask(answers(false))); });
}

/** Standing on his hatch again, after "Not today": night falls, and he comes back up. */
export function meet(again = false) {
  begin(() => nightfall(again));
}

/** The light out of the hole, the shaft of light over it, his colour and the light from above, through the scene. */
function light(dt: number) {
  const h = hatch!, t = show!.t, b = show!.blast === null ? -1 : t - show!.blast;
  if (shoveAt) shoveAt.t += dt;
  const s = shoveAt ? shoveCurve(shoveAt.t, shoveAt.amp) : 0;
  h.jolt = b < 0 ? s : 0;
  const flick = 1 + 0.12 * Math.sin(t * 23) + 0.08 * Math.sin(t * 61);
  // before the blast, a glow through the cracks as the lid's thrown up; after, a blaze dying back to a glow
  const glow = b < 0 ? 0.06 * nightK() + (s / 0.36) * 1.1 : (b < 0.25 ? 4 - 9.6 * b : Math.max(0.75, 1.6 - 0.28 * (b - 0.25))) * flick;
  const reveal = b < 0 ? 0 : ease((b - (REVEAL - BLAST)) / 2.2);
  const dim = 1 - 0.55 * reveal;
  h.light.intensity = glow * 7 * dim;
  h.spot.intensity = 7 * ease((b - (REVEAL - BLAST) - 0.6) / 2.0);
  fx!.glow = glow;
  fx!.shine = b < 0 ? 0 : 0.7 * ease((b - 0.15) / 0.7) * (1 - 0.85 * reveal) * Math.min(1, glow);
  if (b >= 0) fugu!.shade(0.03 + 0.97 * reveal);
  offerCam.near = b < 0 ? 0 : ease((b - (REVEAL - BLAST)) / 4);
  offerCam.creep = b < 0 ? 0 : ease((b - (REVEAL - BLAST) - 4) / 14);
}
/** How far the lid's thrown up by a shove: up fast, slammed back down, a bounce or two. */
function shoveCurve(a: number, amp: number) {
  if (a < 0.07) return amp * Math.sin(a / 0.07 * Math.PI / 2);
  const b = a - 0.07;
  return amp * Math.exp(-b * 9) * Math.abs(Math.cos(b * 15));
}
const ease = (k: number) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };

// ---------- talking ----------
let lines: Line[] = [];
let then: (() => void) | null = null;
/** The line being typed out: how many letters are showing, and how long until the next. */
let typing: { text: string; n: number; wait: number } | null = null;

function say(ls: Line[], next: () => void) {
  lines = ls.slice(); then = next;
  pickEl.hidden = true;
  nextLine();
}

function nextLine() {
  const l = lines.shift();
  if (!l) {
    typing = null; sayEl.classList.remove('on', 'done'); fugu!.talking = false;
    const n = then; then = null; n?.();
    return;
  }
  for (const f of l.fx ?? []) {
    if (f === 'puff') { fugu!.puffTo = 1; sfx.puff(); }
    if (f === 'calm') { fugu!.puffTo = 0; sfx.calm(); }
    if (f === 'shake') { fugu!.shake(); offerCam.shake = 0.3; }
    if (f === 'glint') fugu!.glint();
  }
  mode = 'line';
  typing = { text: l.f, n: 0, wait: 0 };
  shown('', l.f);
  sayEl.classList.add('on'); sayEl.classList.remove('done');
  liveEl.textContent = nameEl.textContent + ': ' + l.f;
  fugu!.talking = true;
}

/** Seconds per letter, and the pauses: only a breath at a comma (a list rattles off), and a beat at a full stop. */
const LETTER = 0.042, COMMA = 0.09, STOP = 0.75;
/** Types the line out a letter at a time, with a blip of his voice, pausing at commas and coming down on full stops. */
function typeOn(dt: number) {
  if (!typing || typing.n >= typing.text.length) return;
  typing.wait -= dt;
  while (typing.wait <= 0 && typing.n < typing.text.length) {
    const ch = typing.text[typing.n++], next = typing.text[typing.n];
    // the end of a sentence (the last of a "?!"), with more to say after it
    const stop = '.!?'.includes(ch) && !'.!?'.includes(next ?? 'x');
    if (stop) {
      fugu!.point(); sfx.stop();
      typing.wait += next === undefined ? 0 : STOP;
    } else {
      typing.wait += ch === ',' || ch === ':' ? COMMA : LETTER;
      if (ch.trim()) fugu!.syllable();
      else fugu!.word();
      if (ch.trim() && typing.n % 2) sfx.voice();
    }
  }
  shown(typing.text.slice(0, typing.n), typing.text.slice(typing.n));
  if (typing.n >= typing.text.length) { sayEl.classList.add('done'); fugu!.talking = false; }
}

/** The line so far, and the rest of it held in place unseen (so the centred line doesn't shift as it types). */
function shown(said: string, rest: string) {
  lineEl.textContent = said;
  lineEl.dataset.rest = rest;
}

/** A tap or a key: shows the whole line, or moves on to the next. */
function advance() {
  if (mode !== 'line' || !typing) return;
  if (typing.n < typing.text.length) {
    typing.n = typing.text.length; shown(typing.text, '');
    sayEl.classList.add('done'); fugu!.talking = false;
  } else nextLine();
}

function ask(cs: Choice[]) {
  mode = 'pick';
  pickEl.replaceChildren(...cs.map(c => {
    const b = document.createElement('button');
    b.type = 'button';
    if (c.main) b.className = 'main';
    b.innerHTML = '<span class="ic" aria-hidden="true"></span><span></span>';
    b.firstChild!.textContent = c.icon;
    b.lastChild!.textContent = c.label;
    b.addEventListener('click', () => { if (mode !== 'pick') return; sfx.pick(); c.go(); });
    return b;
  }));
  pickEl.hidden = false;
  (pickEl.firstChild as HTMLElement).focus({ preventScroll: true });
}

/** His answer to the player's: into the ring with a bang, or back down the hatch. */
function finish(answer: 1 | 2) {
  mode = 'watch';
  offer.answer = Math.max(offer.answer, answer) as 1 | 2;
  save();
  stopMusic();
  climb = { from: fugu!.position.y, to: -1.8, t: 0, dur: 0.5 };
  if (answer === 2) {
    // the deal's struck: the ring's drums under the dock, and his price, at the hatch
    for (const t of [0.5, 0.95, 1.4]) at(t, () => { sfx.taiko(); offerCam.shake = 0.35; });
    at(2.2, () => leave('Deal. Buy into the ring at the hatch: $1,000,000'));
  } else {
    at(0.55, () => { hatch!.openTo = 0; sfx.bang(); });
    at(1.2, () => leave("Mr. Fugu's hatch stays on the dock. Stand on it to hear him out again"));
  }
}

/** Back to the game. */
function leave(news: string) {
  closeTo = 0;
  show = null; mode = 'watch'; climb = null; shoveAt = null;
  if (fugu) { scene.remove(fugu); fugu.shade(1); fugu.stare(false); fugu.gaze = 0; fugu.steady = false; }
  if (hatch) {
    hatch.lift.visible = false; hatch.peekTo = 0; hatch.jolt = 0;
    hatch.light.visible = hatch.openTo > 0; hatch.spot.visible = false;
  }
  if (fx) fx.glow = fx.shine = 0;
  caption(null);
  // and the night lifts
  if (nightK() > 0) dusk = { from: nightK(), to: 0, t: 0, dur: 5 };
  player.held = false;
  document.body.classList.remove('offer');
  pickEl.hidden = true;
  root.hidden = true;
  standT = 0;
  // (once a visit: walk off and come back for more)
  armed = false;
  toast(news);
}

// ---------- every frame ----------
export function updOffer(dt: number) {
  hatch?.update(dt);
  fx?.update(dt);
  hushWorld(!!show);
  offerCam.shake = Math.max(0, offerCam.shake - dt);
  offerCam.close += (closeTo - offerCam.close) * Math.min(1, dt * 0.9);
  if (dusk) {
    dusk.t += dt;
    const k = Math.min(1, dusk.t / dusk.dur);
    setNight(dusk.from + (dusk.to - dusk.from) * ease(k));
    if (k >= 1) dusk = null;
  }
  if (!show) {
    offerCam.k = Math.max(0, offerCam.k - dt);
    const d = d2xz(player.g.position, HATCH);
    const clear = offer.answer === 0 ? CLEAR : ON + 0.4;
    if (d > clear * clear) armed = true;
    if (offer.answer === 0) {
      if (!waiting && wallet.money >= MILLION && stage.n === 2 && !staging() && stageBuilt(2)) summon();
      if (waiting) {
        knock(dt);
        if (armed && free() && d < RANGE * RANGE) peek();
      }
    } else if (offer.answer === 1 && armed && free() && d < ON * ON) {
      // standing on the hatch for a moment brings him back up (once he's in, it's the way down to the ring: stage.ts)
      standT += dt;
      if (standT > 0.8) meet(true);
    } else standT = 0;
    return;
  }
  show.t += dt;
  updBass();
  for (const c of show.cues.filter(c => c.t <= show!.t)) { show.cues.splice(show.cues.indexOf(c), 1); c.run(); }
  // (a cue may have ended the scene: "Not now")
  if (!show || !fugu) return;
  if (climb) {
    climb.t += dt;
    const k = Math.min(1, climb.t / climb.dur);
    // smoothly, on the lift: easing off, rising, and slowing to a stop
    const e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
    fugu.position.y = climb.from + (climb.to - climb.from) * e;
    if (k >= 1) climb = null;
  }
  // the lift under his feet, all the way
  if (hatch) { hatch.lift.visible = fugu.visible; hatch.lift.position.y = fugu.position.y - HATCH.y; }
  if (hatch && fx) light(dt);
  fugu.update(dt);
  typeOn(dt);
}

// The camera looks out across the dock from the restaurant's side, past the player's shoulder at him, north-west
// over the water, with the sea behind him; it pulls back a little on a phone held upright.
const toScreen = (p: Vector3) => {
  const v = p.clone().project(camera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
};
const near = V(0, 0, 0), ots = V(0, 0, 0);
/** Puts the camera's view and the "!", speech bubble and spotlight in place for this frame (main.ts). */
export function drawOffer() {
  const back = camK > 1 ? 1.35 : 1;
  // (pulling back up and aside more than back, which would put it in the restaurant's front beam)
  offerCam.pos.set(HATCH.x + 1.6 * back, HATCH.y + 2.4 * back, HATCH.z + 4.8 + 0.6 * (back - 1));
  offerCam.look.set(HATCH.x - 0.6, HATCH.y + (camK > 1 ? 0.2 : 0.6), HATCH.z);
  // the peek: a slow move in on the crack, from the same angle (so it still looks into it)
  const c = offerCam.close;
  if (c > 0) {
    offerCam.pos.lerp(near.set(HATCH.x + 1.45 * back, HATCH.y + 1.3 * back, HATCH.z + 0.1 + 2.45 * back), c);
    offerCam.look.lerp(near.set(HATCH.x - 0.1, HATCH.y + 0.1, HATCH.z - 0.1), c);
  }
  // the reveal: a slow move round behind the chef, low over their right shoulder and looking up at him: him on the
  // right third, eye to eye with the chef, the sea and the moon behind him (on a phone, further back and nearer the
  // middle); then creeping in on him as he talks
  const n = offerCam.near;
  if (n > 0) {
    const phone = camK > 1;
    ots.set(HATCH.x + (phone ? 0.0 : 0.15), HATCH.y + (phone ? 1.5 : 1.4), HATCH.z + (phone ? 4.5 : 4.47));
    near.set(HATCH.x - (phone ? 0.12 : 0.49), HATCH.y + (phone ? 1.12 : 1.23), HATCH.z - 0.07);
    ots.lerp(near, 0.09 * offerCam.creep);
    offerCam.pos.lerp(ots, n);
    offerCam.look.lerp(near, n);
  }
  if (root.hidden) return;
  // the "!" floats over the hatch
  const a = toScreen(V(HATCH.x, HATCH.y + 1.4, HATCH.z));
  alertEl.style.left = a.x + 'px'; alertEl.style.top = a.y + 'px';
  if (!fugu) return;
  const head = toScreen(fugu.head.getWorldPosition(near).add(V(0, 0.07, 0)));
  root.style.setProperty('--fx', head.x + 'px');
  root.style.setProperty('--fy', head.y + 'px');
  // over his head, like everyone's speech bubbles, with its tail pointing down at him (kept on the screen)
  const w = sayEl.offsetWidth, x = Math.max(12, Math.min(head.x - w / 2, window.innerWidth - w - 12));
  sayEl.style.left = x + 'px'; sayEl.style.top = Math.max(sayEl.offsetHeight + 16, head.y - 70) + 'px';
  sayEl.style.setProperty('--tail', Math.max(22, Math.min(w - 22, head.x - x)) + 'px');
}

/** Restores a saved answer: the hatch is shut till the player's in, then open. */
export function loadOffer(answer: number) {
  offer.answer = (Math.min(2, Math.max(0, answer)) | 0) as 0 | 1 | 2;
  const h = placeHatch();
  h.open = h.openTo = offer.answer === 2 ? 1 : 0;
  h.light.visible = h.openTo > 0;
  h.update(0);
}
// The hatch is always in the dock, shut, from the very start: nobody knocks on it till there's a million to be made
// (stage 2, with the restaurant all built).
placeHatch();

window.addEventListener('keydown', e => {
  if (!show) return;
  if (mode === 'line' && [' ', 'Enter', 'z', 'Z'].includes(e.key)) { e.preventDefault(); advance(); }
  if (mode === 'pick' && e.key.startsWith('Arrow')) {
    const bs = [...pickEl.children] as HTMLElement[];
    const i = bs.indexOf(document.activeElement as HTMLElement), d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    bs[(i + d + bs.length) % bs.length]?.focus();
  }
});
window.addEventListener('pointerdown', e => {
  if (show && mode === 'line' && !(e.target as Element).closest?.('button')) advance();
});
