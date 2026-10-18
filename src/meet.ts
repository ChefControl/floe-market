// Meeting the Family (stage 3, the Undertow). The first time the player steps up to each of them, Slick Eddie at his
// booth, Hammerhead Harry at his desk or Three-Card Tommy at his card table, he introduces himself, staged as Mr. Fugu
// is at his desk (southDoor.ts): the cellar holds still, the camera eases in on him over the table and creeps closer
// as he talks, and his lines come one at a time in a speech bubble with his name on it, a tap (or Space) for the next,
// in blips of his own voice. Then his panel opens as it always does. Once a game (F.den.met, saved): never again. A
// save from before this counts a vendor met when it shows he's been used (fight.ts's fightFrom).
import { between, tone } from './audio';
import { CY } from './cellar';
import { type Booth, BOOTH_PADS, BOOTHS } from './cellarPlan';
import { F } from './fight';
import { family } from './family';
import { cardUp } from './gong';
import { found, level } from './layout';
import { player } from './player';
import { camera, camK } from './render';
import { save } from './save';
import { staging } from './stage';
import { wayPlaying } from './southDoor';
import { d2xz, V } from './util';

/** What each says, a line at a time (a few words each: his panel has the numbers). */
export const INTRO: Record<Booth, string[]> = {
  eddie: [
    "Well, well. Fugu's new chef.",
    'Slick Eddie. I fix boss fights.',
    'Pay me, and his fans stay home.',
    'Bigger fix, bigger chance we get caught.',
    "Sit. Let's talk business.",
  ],
  harry: [
    'Close the door, kid. Sit.',
    "Hammerhead Harry. Samehada's my nephew.",
    'Short on chips? I lend.',
    'You pay back a fifth more.',
    "I take 30% of sales till it's paid.",
  ],
  tommy: [
    'Hey, new face! Step right up.',
    'Three-Card Tommy. Find the queen.',
    'I shuffle. You point. Simple.',
    'Find her, I pay double.',
    'Three rounds a fight. Ready?',
  ],
};
const NAME: Record<Booth, string> = { eddie: 'Slick Eddie', harry: 'Hammerhead Harry', tommy: 'Three-Card Tommy' };
/** How high his face is (each sits: Eddie in his booth, Harry behind his desk, Tommy on his stool), how far over it
 *  his bubble goes, and how high the camera's held (low enough to see under Tommy's cap). */
const FACE: Record<Booth, number> = { eddie: 1.35, harry: 1.15, tommy: 1.3 };
const CAM_Y: Record<Booth, number> = { eddie: 2.15, harry: 2.1, tommy: 1.6 };
const OVER = 0.45;

// ---------- their voices ----------
/** A syllable and the end of a sentence, in each one's own voice: Eddie's smooth and quick, a little higher than Mr.
 *  Fugu's mumble; Harry's low and gravelly, slower; Tommy's bright and fast. On the scene's bus, heard while the world's
 *  hushed. */
const VOICE: Record<Booth, { syl: () => void; stop: () => void; letter: number }> = {
  eddie: {
    syl: () => tone({ f: between(150, 185), d: 0.07, type: 'triangle', a: 0.008, v: 0.32, bus: 'cue' }),
    stop: () => tone({ f: between(122, 132), f2: 110, d: 0.16, type: 'triangle', a: 0.008, v: 0.32, bus: 'cue' }),
    letter: 0.04,
  },
  harry: {
    syl: () => tone({ f: between(74, 92), d: 0.1, type: 'sawtooth', lp: 520, a: 0.01, v: 0.3, bus: 'cue' }),
    stop: () => tone({ f: between(62, 67), f2: 56, d: 0.22, type: 'sawtooth', lp: 480, a: 0.01, v: 0.3, bus: 'cue' }),
    letter: 0.052,
  },
  tommy: {
    syl: () => tone({ f: between(200, 245), d: 0.05, type: 'square', lp: 1500, a: 0.006, v: 0.2, bus: 'cue' }),
    stop: () => tone({ f: between(168, 178), f2: 150, d: 0.12, type: 'square', lp: 1400, a: 0.006, v: 0.2, bus: 'cue' }),
    letter: 0.036,
  },
};

// ---------- the state ----------
/** Whether he's been met (and so his table's open). */
export const met = (k: Booth) => F.den.met[k];
/** The meeting under way: whose, seconds into it, and the line being said (a letter at a time) and which. */
let scene: { k: Booth; t: number; line: number; text: string; n: number; wait: number } | null = null;
/** True while one's on: the cellar holds still (ring.ts), and the world's sounds go quiet (game.ts). */
export const meetPlaying = () => !!scene;
/** Whose he is talking, for his head bobbing (undertow.ts). */
export const meetTalking = (k: Booth) => !!scene && scene.k === k && scene.line >= 0 && scene.n < scene.text.length;
/** What's going on, for tests. */
export const meetState = () => ({ who: scene?.k ?? null, says: scene && scene.line >= 0 ? scene.text : '', line: scene?.line ?? -1 });
/** The camera's view of the meeting, blended in by `k` (main.ts), and how far it's crept in. */
export const meetCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };
/** Whose shot the camera's on, kept as it eases back to the player after. */
let shotOf: Booth = 'eddie', creep = 0;

// ---------- the page ----------
const $ = (id: string) => document.getElementById(id)!;
const root = $('meet'), sayEl = $('meetSay'), whoEl = $('meetWho'), lineEl = $('meetLine'), liveEl = $('meetLive');

function begin(k: Booth) {
  scene = { k, t: 0, line: -1, text: '', n: 0, wait: 0 };
  shotOf = k; creep = 0;
  player.held = true; player.moving = false;
  // (facing him)
  const b = BOOTHS[k], p = player.g.position;
  player.h = Math.atan2(b.x - p.x, b.z - p.z); player.g.rotation.y = player.h;
  whoEl.textContent = NAME[k];
  root.hidden = false;
  document.body.classList.add('meet');
}
function sayLine(i: number) {
  const s = scene!;
  s.line = i; s.text = INTRO[s.k][i]; s.n = 0; s.wait = 0.15;
  lineEl.textContent = ''; lineEl.dataset.rest = s.text;
  sayEl.classList.add('on'); sayEl.classList.remove('done');
  liveEl.textContent = `${NAME[s.k]}: ${s.text}`;
}
function end() {
  const k = scene!.k;
  scene = null;
  F.den.met[k] = true;
  player.held = false;
  sayEl.classList.remove('on', 'done');
  root.hidden = true;
  document.body.classList.remove('meet');
  family[k].talking = false;
  save();
}
/** A tap or a key: the rest of the line at once, or on to the next (or, after the last, back to the game). */
export function advanceMeet() {
  const s = scene;
  if (!s || s.line < 0) return;
  if (s.n < s.text.length) { s.n = s.text.length; lineEl.textContent = s.text; lineEl.dataset.rest = ''; sayEl.classList.add('done'); return; }
  if (s.line + 1 < INTRO[s.k].length) sayLine(s.line + 1);
  else end();
}

/** On his pad and free to talk: the player down here, not held by anything else, and no fight's card up. */
const free = () => level.down && found.den && !player.held && !staging() && !wayPlaying() && !cardUp();

// ---------- every frame ----------
/** The meetings, every frame (from undertow.ts, while the club's found): starting one on a pad whose host's not been
 *  met, and the one under way. */
export function updMeet(dt: number) {
  if (!scene) {
    meetCam.k = Math.max(0, meetCam.k - dt / 0.8);
    if (!free()) return;
    const p = player.g.position;
    for (const k of Object.keys(BOOTHS) as Booth[]) {
      const pad = BOOTH_PADS[k];
      if (!met(k) && d2xz(p, pad) < pad.r * pad.r) { begin(k); break; }
    }
    if (!scene) return;
  }
  const s = scene;
  s.t += dt;
  meetCam.k = Math.min(1, meetCam.k + dt / 0.7);
  creep = Math.min(1, creep + dt / 14);
  if (s.line < 0 && s.t >= 0.8) sayLine(0);
  // the line, a letter at a time, his head bobbing with it
  if (s.line >= 0 && s.n < s.text.length) {
    const v = VOICE[s.k], host = family[s.k];
    s.wait -= dt;
    while (s.wait <= 0 && s.n < s.text.length) {
      const ch = s.text[s.n++], next = s.text[s.n];
      // (the end of a sentence, the last of a "?!": a lower note, and a beat before the next)
      const stop = '.?!'.includes(ch) && !'.?!'.includes(next ?? 'x');
      s.wait += stop ? (next === undefined ? 0 : 0.45) : ch === ',' ? 0.12 : v.letter;
      if (stop) v.stop();
      else if (/[a-z0-9]/i.test(ch) && s.n % 2) { v.syl(); host.syllable(); }
    }
    lineEl.textContent = s.text.slice(0, s.n);
    lineEl.dataset.rest = s.text.slice(s.n);
    if (s.n >= s.text.length) sayEl.classList.add('done');
  }
}

const near = V(0, 0, 0);
/** Puts the camera's view and the speech bubble in place for this frame (main.ts, before the camera's drawn). The shot
 *  is across his table from the player's side, a little to his left and up, him in the middle; creeping in as he
 *  talks; further back on a phone held upright. */
export function drawMeet() {
  if (meetCam.k <= 0) return;
  const b = BOOTHS[shotOf], back = camK > 1 ? 1.35 : 1, face = CY + FACE[shotOf];
  // (out along the way he faces, and a little to the side)
  const fx = Math.sin(b.face), fz = Math.cos(b.face);
  meetCam.pos.set(b.x + fx * 2.7 * back - fz * 0.9 * back, CY + CAM_Y[shotOf] * back, b.z + fz * 2.7 * back + fx * 0.9 * back);
  meetCam.look.set(b.x + fx * 0.15, face - 0.1, b.z + fz * 0.15);
  meetCam.pos.lerp(near.copy(meetCam.look), 0.18 * creep);
  if (!scene || scene.line < 0) return;
  // over his head, its tail pointing down at him (kept on the screen)
  const toScreen = (y: number) => { const v = V(b.x, y, b.z).project(camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; };
  const { x: hx, y: hy } = toScreen(face + OVER), f = toScreen(face);
  const w = sayEl.offsetWidth, x = Math.max(12, Math.min(hx - w / 2, window.innerWidth - w - 12));
  sayEl.style.left = x + 'px'; sayEl.style.top = Math.max(sayEl.offsetHeight + 16, hy) + 'px';
  sayEl.style.setProperty('--tail', Math.max(22, Math.min(w - 22, hx - x)) + 'px');
  // (the dark round the edges, clear round his face)
  root.style.setProperty('--fx', f.x + 'px'); root.style.setProperty('--fy', f.y + 'px');
}

window.addEventListener('keydown', e => {
  if (!scene || scene.line < 0) return;
  if ([' ', 'Enter', 'z', 'Z', 'e', 'E'].includes(e.key)) { e.preventDefault(); advanceMeet(); }
});
window.addEventListener('pointerdown', () => { if (scene) advanceMeet(); });
