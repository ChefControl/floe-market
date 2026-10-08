// Mr. Fugu's offer. Once Floe Sushi is fully built and the cash passes $1,000,000, a hatch turns up in the dock with a
// "!" over it, knocking, and an arrow at the edge of the screen points the way. Walking up to it starts the scene: the
// screen blinks, the hatch bangs open, and Mr. Fugu climbs out, makes a short pitch for the sumo ring under the dock
// (stage 3, still to come), and makes it clear it's not legal. The player answers with a tap. Turning him down leaves
// the hatch on the dock: stand on it to hear him out again.
import { Vector3 } from 'three';
import { Fugu, Hatch } from './fugu';
import { stage } from './layout';
import { player } from './player';
import { pointAt } from './pointers';
import { rainK } from './rain';
import { camera, camK, scene } from './render';
import { save } from './save';
import { staging } from './stage';
import { banner, toast } from './ui';
import { stageBuilt } from './unlocks';
import { d2xz, FY, V } from './util';
import { wallet } from './wallet';

export const MILLION = 1_000_000;
/** The hatch in the dock planks, and where the player stands to hear him out, facing it. */
export const HATCH = V(6.0, FY, -3.3);
const STAND = V(5.5, FY, -5.4);

/** The player's answer so far: 0 hasn't met him, 1 not now, 2 in. Saved. */
export const offer = { answer: 0 as 0 | 1 | 2 };
/** The camera's view of the meeting, blended in by `k` (main.ts), and a shake for the big moments. */
export const offerCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0), shake: 0 };

let hatch: Hatch | null = null;
let fugu: Fugu | null = null;

// ---------- the page ----------
const $ = (id: string) => document.getElementById(id)!;
const root = $('offer'), alertEl = $('offerAlert'), blinkEl = $('offerBlink'), sayEl = $('offerSay');
const lineEl = $('offerLine'), pickEl = $('offerPick'), liveEl = $('offerLive');

// ---------- sound ----------
// A few synthesized blips and bumps: no files to load.
let ac: AudioContext | null = null, out: GainNode | null = null, noise: AudioBuffer | null = null;
function audio() {
  try {
    if (!ac) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ac = new C(); out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { return null; }
  return ac;
}
interface Note { f: number; at?: number; dur?: number; type?: OscillatorType; vol?: number; to?: number; dest?: AudioNode }
function tone({ f, at = 0, dur = 0.1, type = 'triangle', vol = 0.05, to = 0, dest }: Note) {
  const a = audio(); if (!a) return;
  const s = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, s);
  if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur);
  // a few milliseconds' fade in and out, so notes don't click
  g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  o.connect(g).connect(dest ?? out!); o.start(s); o.stop(s + dur + 0.05);
}
function hiss(dur: number, vol: number, type: BiquadFilterType, freq: number, at = 0, dest?: AudioNode) {
  const a = audio(); if (!a) return;
  const s = a.currentTime + at, src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noise; fl.type = type; fl.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  src.connect(fl).connect(g).connect(dest ?? out!); src.start(s, Math.random() * 0.5); src.stop(s + dur + 0.05);
}
const sfx = {
  alert: () => { tone({ f: 880, dur: 0.08, type: 'triangle', vol: 0.08 }); tone({ f: 1175, at: 0.08, dur: 0.16, type: 'triangle', vol: 0.08 }); },
  blink: () => tone({ f: 660, dur: 0.06, type: 'triangle', vol: 0.05 }),
  bang: () => { tone({ f: 140, to: 50, dur: 0.3, type: 'sine', vol: 0.45 }); hiss(0.25, 0.25, 'lowpass', 900); },
  roar: () => { hiss(1.4, 0.12, 'bandpass', 500); hiss(1.1, 0.06, 'bandpass', 1200, 0.15); },
  climb: () => [0, 0.12, 0.24, 0.36].forEach(at => tone({ f: 220, at, dur: 0.05, type: 'triangle', vol: 0.08 })),
  // a low mumble rather than a beep
  voice: () => tone({ f: 105 + Math.random() * 35, dur: 0.08, type: 'triangle', vol: 0.12 }),
  puff: () => tone({ f: 180, to: 760, dur: 0.28, type: 'triangle', vol: 0.1 }),
  calm: () => { tone({ f: 620, to: 140, dur: 0.35, type: 'triangle', vol: 0.06 }); hiss(0.3, 0.03, 'bandpass', 900); },
  pick: () => { tone({ f: 523, dur: 0.07, type: 'triangle', vol: 0.07 }); tone({ f: 784, at: 0.06, dur: 0.12, type: 'triangle', vol: 0.07 }); },
  taiko: () => { tone({ f: 120, to: 42, dur: 0.55, type: 'sine', vol: 0.6 }); hiss(0.14, 0.3, 'lowpass', 420); },
};

/** A sleazy little walking bass from under the dock while he talks. */
let music: { bus: GainNode; timer: ReturnType<typeof setInterval> } | null = null;
const BASS = [55, 0, 55, 65.41, 0, 73.42, 77.78, 82.41, 98, 0, 82.41, 73.42, 0, 65.41, 55, 0];
function startMusic() {
  const a = audio(); if (!a || music) return;
  const bus = a.createGain(); bus.gain.value = 0.8; bus.connect(out!);
  const step = 60 / 92 / 2;
  let next = a.currentTime + 0.05, i = 0;
  const timer = setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const at = next - a.currentTime;
      if (BASS[i]) tone({ f: BASS[i] * 2, at, dur: step * 0.95, type: 'triangle', vol: 0.14, dest: bus });
      next += step * (i % 2 ? 0.7 : 1.3);
      i = (i + 1) % BASS.length;
    }
  }, 50);
  music = { bus, timer };
}
function stopMusic() {
  if (!music || !ac) return;
  const m = music; music = null;
  clearInterval(m.timer);
  m.bus.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  setTimeout(() => m.bus.disconnect(), 800);
}

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
    { f: 'Psst. Chef. Over here.' },
    { f: 'A million bucks off raw fish and rice. Honest money. Slow money.' },
    { f: 'Downstairs, the big boys wrestle. Sumo. No refs, no rules, no refunds.', fx: ['glint'] },
    { f: 'Legal? Not even close.', fx: ['puff', 'shake'] },
    { f: "But the crowd's starving and the bets are fat. Feed 'em, run the book, keep a cut. You in?", fx: ['calm'] },
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
/** The meeting in progress: its clock and what's coming up. */
let show: { t: number; cues: Cue[] } | null = null;
/** What the player is doing: watching, reading a line, or picking an answer. */
let mode: 'watch' | 'line' | 'pick' = 'watch';
/** He climbs out of the hatch and drops back in: his height over time. */
let climb: { from: number; to: number; t: number; dur: number } | null = null;
let standT = 0;
/** The hatch is out with its "!", waiting for the player to come over. */
let waiting = false;
let knockT = 0;
/** How close the player has to come to the hatch for him to come out. */
const RANGE = 1.7;

const at = (dt: number, run: () => void) => { show?.cues.push({ t: show.t + dt, run }); };

/** Can he turn up now? Not in the middle of something else on screen. */
const free = () => stage.n === 2 && !staging() && rainK === 0 && ['shop', 'casino', 'korki'].every(id => $(id).hidden);

function blink(on: boolean, slow = false) {
  blinkEl.classList.toggle('slow', slow);
  blinkEl.classList.toggle('on', on);
  if (on) sfx.blink();
}

function placeHatch() {
  if (hatch) return hatch;
  hatch = new Hatch();
  hatch.position.copy(HATCH);
  scene.add(hatch);
  return hatch;
}

/** The hatch turns up in the dock, knocking, with a "!" over it and an arrow pointing the way. */
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
  const d = Math.sqrt(d2xz(player.g.position, HATCH));
  if (d < 12) for (const at of [0, 0.16]) tone({ f: 150, to: 90, at, dur: 0.12, type: 'sine', vol: 0.3 * (1 - d / 12) });
}

/** Starts the meeting: the blinks, the hatch, and him. */
export function meet(again = false) {
  show = { t: 0, cues: [] };
  waiting = false;
  mode = 'watch';
  player.frozen = true; player.moving = false;
  root.hidden = false;
  alertEl.classList.add('on');
  sfx.alert();
  at(0.3, () => blink(true));
  at(0.38, () => blink(false));
  at(0.45, () => blink(true));
  at(0.53, () => blink(false));
  at(0.6, () => blink(true));
  // behind the last blink: the player in front of the hatch, the camera on it, the rest of the screen dimmed
  at(0.75, () => {
    alertEl.classList.remove('on');
    const h = placeHatch();
    h.open = h.openTo = 0;
    fugu ??= new Fugu();
    scene.add(fugu);
    fugu.position.set(HATCH.x, -1.8, HATCH.z - 0.05);
    fugu.rotation.y = Math.atan2(STAND.x - HATCH.x, STAND.z - HATCH.z);
    fugu.puff = fugu.puffTo = 0;
    player.g.position.copy(STAND);
    player.h = Math.atan2(HATCH.x - STAND.x, HATCH.z - STAND.z);
    player.g.rotation.y = player.h;
    offerCam.k = 1;
    document.body.classList.add('offer');
  });
  at(1.0, () => blink(false, true));
  at(1.45, () => { hatch!.openTo = 1; offerCam.shake = 0.25; sfx.bang(); sfx.roar(); });
  at(1.95, () => { climb = { from: -1.8, to: FY, t: 0, dur: 0.8 }; sfx.climb(); });
  at(2.95, () => { startMusic(); say(pitch(again), () => ask(answers(false))); });
}

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
  lineEl.textContent = '';
  sayEl.classList.add('on'); sayEl.classList.remove('done');
  liveEl.textContent = 'Mr. Fugu: ' + l.f;
  fugu!.talking = true;
}

/** Types the line out a letter at a time, pausing at commas and full stops, with a blip of his voice. */
function typeOn(dt: number) {
  if (!typing || typing.n >= typing.text.length) return;
  typing.wait -= dt;
  while (typing.wait <= 0 && typing.n < typing.text.length) {
    const ch = typing.text[typing.n++];
    typing.wait += '.!?'.includes(ch) ? 0.28 : ch === ',' || ch === ':' ? 0.14 : 0.035;
    if (ch.trim()) fugu!.syllable();
    else fugu!.word();
    if (ch.trim() && typing.n % 2) sfx.voice();
  }
  lineEl.textContent = typing.text.slice(0, typing.n);
  if (typing.n >= typing.text.length) { sayEl.classList.add('done'); fugu!.talking = false; }
}

/** A tap or a key: shows the whole line, or moves on to the next. */
function advance() {
  if (mode !== 'line' || !typing) return;
  if (typing.n < typing.text.length) {
    typing.n = typing.text.length; lineEl.textContent = typing.text;
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
    for (const t of [0.5, 0.95, 1.4]) at(t, () => { sfx.taiko(); offerCam.shake = 0.35; });
    at(1.5, () => banner('Stage 3', 'The Dohyo Below'));
    at(4.3, () => banner(null));
    at(4.5, () => leave('The sumo ring opens in stage 3, coming soon'));
  } else {
    at(0.55, () => { hatch!.openTo = 0; sfx.bang(); });
    at(1.2, () => leave("Mr. Fugu's hatch stays on the dock. Stand on it to hear him out again"));
  }
}

/** Back to the game. */
function leave(news: string) {
  show = null; mode = 'watch'; climb = null;
  if (fugu) scene.remove(fugu);
  player.frozen = false;
  document.body.classList.remove('offer');
  pickEl.hidden = true;
  root.hidden = true;
  standT = 0;
  toast(news);
}

// ---------- every frame ----------
export function updOffer(dt: number) {
  hatch?.update(dt);
  offerCam.shake = Math.max(0, offerCam.shake - dt);
  if (!show) {
    offerCam.k = Math.max(0, offerCam.k - dt);
    if (offer.answer === 0) {
      if (!waiting && wallet.money >= MILLION && stage.n === 2 && !staging() && stageBuilt(2)) summon();
      if (waiting) {
        knock(dt);
        if (free() && d2xz(player.g.position, HATCH) < RANGE * RANGE) meet();
      }
    } else if (hatch && free() && d2xz(player.g.position, HATCH) < 0.6 * 0.6) {
      // standing on the hatch for a moment brings him back up
      standT += dt;
      if (standT > 0.8) meet(true);
    } else standT = 0;
    return;
  }
  show.t += dt;
  for (const c of show.cues.filter(c => c.t <= show!.t)) { show.cues.splice(show.cues.indexOf(c), 1); c.run(); }
  if (!fugu) return;
  if (climb) {
    climb.t += dt;
    const k = Math.min(1, climb.t / climb.dur);
    // up with a little hop over the edge; down in a drop
    const e = climb.to > climb.from ? 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) : k * k;
    fugu.position.y = climb.from + (climb.to - climb.from) * e;
    if (k >= 1) climb = null;
  }
  fugu.update(dt);
  typeOn(dt);
}

// The camera looks across the dock from over the water, past the player's shoulder at him, with the restaurant's
// lanterns behind; it pulls back a little on a phone held upright.
const toScreen = (p: Vector3) => {
  const v = p.clone().project(camera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
};
/** Puts the camera's view and the "!", speech bubble and spotlight in place for this frame (main.ts). */
export function drawOffer() {
  const back = camK > 1 ? 1.35 : 1;
  offerCam.pos.set(HATCH.x + 1.4 * back, HATCH.y + 2.4 * back, HATCH.z - 6.0 * back);
  offerCam.look.set(HATCH.x - 0.4, HATCH.y + (camK > 1 ? 0.2 : 0.6), HATCH.z);
  if (root.hidden) return;
  // the "!" floats over the hatch
  const a = toScreen(V(HATCH.x, HATCH.y + 1.4, HATCH.z));
  alertEl.style.left = a.x + 'px'; alertEl.style.top = a.y + 'px';
  if (!fugu) return;
  const head = toScreen(V(fugu.position.x, fugu.position.y + 1.2, fugu.position.z));
  root.style.setProperty('--fx', head.x + 'px');
  root.style.setProperty('--fy', head.y + 'px');
  // beside his head if there's room, otherwise over it
  const w = sayEl.offsetWidth, above = head.x + 58 + w + 12 > window.innerWidth;
  sayEl.classList.toggle('above', above);
  const x = above ? Math.max(12, Math.min(head.x - w / 2, window.innerWidth - w - 12)) : head.x + 58;
  const y = above ? head.y - 70 : head.y - 10;
  sayEl.style.left = x + 'px'; sayEl.style.top = Math.max(sayEl.offsetHeight + 16, y) + 'px';
}

/** Restores a saved answer: the hatch stays on the dock once he's been met (open, once the player's in). */
export function loadOffer(answer: number) {
  offer.answer = (Math.min(2, Math.max(0, answer)) | 0) as 0 | 1 | 2;
  if (offer.answer && stage.n === 2) {
    const h = placeHatch();
    h.open = h.openTo = offer.answer === 2 ? 1 : 0;
    h.update(0);
  }
}

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
