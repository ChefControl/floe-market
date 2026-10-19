// The way in (stage 3). Mama Moray's restroom, out front, has two stalls; the far one's out of order, taped across, its
// toilet taped up, and its back is a door: the doorman's, tiled over on this side as the stall's own back. Try the stall
// and it's out of order. Really.
//
// Beat Yokobashiri (his card says there's a way in) and Mr. Fugu wants a word: a "!" over him at his desk. Step up
// to it and the camera comes in on him while the cellar holds still: "Nice work on the crab, Chef." "Some friends want
// to meet you." He slides his matchbook across the desk: "Out-of-order stall. Show 'em this." Then it's yours to look
// over, up close: turn it about with the mouse or a finger (the club's name on the front, his note on the back), and
// pocket it. (Try the stall before that, and a slot in its back slides open on a pair of eyes: "Password?" … "Beat it.")
// Both of them talk in blips, as Mr. Fugu does on the dock (offer.ts): his a low mumble, the doorman's lower still.
//
// With his matchbook, a "!" over the stall. Go up to it, and the scene: the tape torn away, a step into the stall, its
// bulb flickering, the camera in on the slot, the eyes, "Password?", the matchbook held up, "...Fugu's book. Go on in."
// The slot shuts, the bolts go, and the stall's back swings in on the club in a burst of its light, its band coming
// through, its smoke rolling back off the room. After that the door opens as you come up to it, from either side (the
// bulb giving a flicker first), and shuts behind you; now and then a good evening through the slot first. The doorman
// and his things, and the dark closing in in the stall, are doorway.ts's; the restroom and its stalls resto.ts's.
import {
  BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, Quaternion, Vector3,
} from 'three';
import { between, noise, tone } from './audio';
import { boss, cellar, CY, OFFICE, showDen, southDoor } from './cellar';
import { CLUB_DOOR, STALL } from './cellarPlan';
import { liftFog } from './clubFog';
import { doorman, stallDoor } from './doorway';
import { F } from './fight';
import { dustFx } from './fx';
import { cardUp } from './gong';
import { moveEnt } from './characters';
import { apart, dice } from './kit';
import { DEN, level } from './layout';
import { club } from './noir';
import { DESK_PAD } from './office';
import { player } from './player';
import { pointAt } from './pointers';
import { camera, camK, canvasTex, G, mesh } from './render';
import { save } from './save';
import { chime } from './sfx';
import { staging } from './stage';
import { shot } from './swarm';
import { d2xz, V } from './util';

/** The door: the out-of-order stall's back, in the restroom's west wall, from `Z0` (its hinge, north) `W` along it,
 *  a little higher than the stall's sides; its middle, `MID`. Built in a frame of its own (`root`), as if it stood along x facing -z:
 *  its `x` along it from the hinge, its front (the restroom's side) to -z; turned so it stands along the wall, its
 *  front to the east. */
const DX = CLUB_DOOR.x, Z0 = CLUB_DOOR.z0, W = CLUB_DOOR.z1 - CLUB_DOOR.z0, H = 1.8;
const MID = { x: DX, z: Z0 + W / 2 };
/** A place `along` the door from its middle (south), `out` in front of it (east, into the restroom), at height `y`. */
const by = (v: Vector3, along: number, y: number, out: number) => v.set(DX + out, y, MID.z + along);
/** Where the player comes to try the stall (just outside its front, while it's taped across), how near, and how far
 *  off to walk before trying it again; and where they step to inside it, in the scene. */
const FRONT = { x: STALL.x1 + 0.25, z: MID.z }, INSIDE = { x: DX + 0.95, z: MID.z };
const KNOCK = 0.7, AWAY = 2.0;
/** What's said: lines of a few words. */
export const LINES = {
  nobody: 'Out of order. Really.', ask: 'Password?', no: 'Beat it.', ok: "...Fugu's book. Go on in.", evening: 'Evening.',
  fugu: ['Nice work on the crab, Chef.', 'Some friends want to meet you.', "Out-of-order stall. Show 'em this."],
};

/** The camera's view of a scene here, blended in by `k` (main.ts). */
export const wayCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };

// ---------- the door ----------
const IRON = 0x23282C;
/** The stall's partitions' paint, which its back's painted to match on the restroom's side (resto.ts). */
export const STALL_PAINT = 0x2A7068;
interface Built { root: Group; leaf: Group; book: Group; dim: Mesh }
let built: Built | null = null;
/** Built the first time the cellar's dressed (on dice of its own, so the game's luck never moves for it). */
function build(): Built {
  return built ??= apart(() => {
    const root = new Group(); root.position.set(DX, 0, Z0); root.rotation.y = -Math.PI / 2; cellar.add(root);
    const box = (parent: Object3D, c: number | MeshLambertMaterial, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
      const m = mesh(G.box, c, x, y, z, cast); m.scale.set(sx, sy, sz); parent.add(m); return m;
    };
    // its frame, slim posts and a lintel just over it, painted as the stall's partitions, and deep enough to meet the
    // restroom's wall in front and the way through the rock behind
    const PAINT = new MeshLambertMaterial({ color: STALL_PAINT });
    for (const x of [-0.04, W + 0.04]) box(root, PAINT, x, CY + (H + 0.08) / 2, -0.06, 0.08, H + 0.08, 0.2);
    box(root, PAINT, W / 2, CY + H + 0.04, -0.06, W + 0.16, 0.08, 0.2);
    // the door, hung on its north side and swinging in, west, into the club: on the restroom's side, the stall's back,
    // painted, a hairline round where it opens and a slit at eye height (his slot); on the club's, planks, the planks'
    // seams, three ledges and two braces between them, the hinges' straps along the ledges, and a bolt shot into a keeper
    // on the far post
    const leaf = new Group(); leaf.position.set(0, CY, 0); root.add(leaf);
    const DOOR = new MeshLambertMaterial({ color: 0x3A2418 });
    box(leaf, DOOR, W / 2, H / 2, 0.01, W - 0.02, H, 0.07);
    box(leaf, PAINT, W / 2, H / 2, -0.03, W - 0.02, H, 0.012);
    // (the hairline, darker paint just inside its edge, so it reads as a panel that's not quite flush)
    for (const y of [0.03, H - 0.03]) box(leaf, 0x1F524C, W / 2, y, -0.037, W - 0.06, 0.012, 0.004, false);
    for (const x of [0.03, W - 0.03]) box(leaf, 0x1F524C, x, H / 2, -0.037, 0.012, H - 0.06, 0.004, false);
    const LEDGE = 0x6A4630;
    for (let k = 1; k < 6; k++) box(leaf, 0x2A1A12, (W * k) / 6, H / 2, 0.046, 0.012, H - 0.04, 0.004, false);
    const ledges = [0.3, 0.9, 1.5];
    // (shallow, and clear of the hinge side, so the door opens flat against the club's wall)
    for (const y of ledges) box(leaf, LEDGE, (0.24 + W - 0.08) / 2, y, 0.057, W - 0.32, 0.13, 0.025);
    for (let k = 0; k < 2; k++) {
      // (each brace from the hinge side low to the far side high, as a ledged door's are)
      const y0 = ledges[k] + 0.08, y1 = ledges[k + 1] - 0.08, x0 = 0.3, x1 = W - 0.14, len = Math.hypot(x1 - x0, y1 - y0);
      box(leaf, LEDGE, (x0 + x1) / 2, (y0 + y1) / 2, 0.055, len, 0.11, 0.022).rotation.z = Math.atan2(y1 - y0, x1 - x0);
    }
    for (const y of [ledges[0], ledges[2]]) {
      box(leaf, IRON, 0.55, y, 0.075, 0.5, 0.05, 0.012);
      const pin = mesh(G.cyl, IRON, -0.01, y, 0.06); pin.scale.set(0.025, 0.14, 0.025); leaf.add(pin);
    }
    box(leaf, IRON, W - 0.2, ledges[1] + 0.18, 0.06, 0.34, 0.035, 0.03);
    for (const x of [W - 0.3, W - 0.12]) box(leaf, IRON, x, ledges[1] + 0.18, 0.07, 0.03, 0.07, 0.04);
    box(root, IRON, W + 0.03, CY + ledges[1] + 0.18, 0.08, 0.05, 0.09, 0.05);
    // the doorman's slot, at his eye height, looking out east, into the stall
    const { slot, says } = doorman;
    slot.position.set(W * 0.6, 1.5, -0.05); slot.rotation.y = Math.PI / 2; leaf.add(slot);
    cellar.add(says.sprite);
    // Mr. Fugu's matchbook, on his desk to slide across it to the player, and then up close to look over; and the dark
    // the view goes behind it then
    const book = bookModel(); book.visible = false; cellar.add(book);
    const dim = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: 0x0B1620, transparent: true, opacity: 0, depthWrite: false }));
    dim.visible = false; cellar.add(dim);
    return { root, leaf, book, dim };
  }, dice(0xD00A));
}

/** Mr. Fugu's matchbook (the club on it is the Family's): a red card cover folded over a book of matches, the club's name
 *  and a gold puffer on its front; on its back the striker and his note in pen; the matches' pink heads along its top
 *  edge. Its front faces up its `y`; a little bigger than life, so it reads on the desk. */
function bookModel() {
  const Wd = 0.2, Ht = 0.27, T = 0.035;
  const face = (draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 346) =>
    new MeshBasicMaterial({ map: canvasTex(w, h, draw).tex });
  const red = (c: CanvasRenderingContext2D, w: number, h: number) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#8E1E2C'); g.addColorStop(1, '#5E1018');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
  const SCRIPT = '"Snell Roundhand","Brush Script MT","Segoe Script",cursive';
  const front = face((c, w, h) => {
    red(c, w, h);
    c.strokeStyle = '#E8C46A'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
    c.lineWidth = 2; c.strokeRect(24, 24, w - 48, h - 48);
    c.fillStyle = '#E8C46A'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 30px Georgia,"Times New Roman",serif'; c.fillText('THE', w / 2, 70); c.fillText('UNDERTOW', w / 2, 104);
    c.font = '96px serif'; c.fillText('🐡', w / 2, 196);
    c.font = '700 15px Georgia,serif'; c.fillText('MEMBERS ONLY', w / 2, 268);
    // (the flap's fold, low down, where the cover tucks in)
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(24, h - 52, w - 48, 4);
  });
  const back = face((c, w, h) => {
    // (turned round: a box's underside lies the other way up to its top, so it reads turned over side to side)
    c.translate(w, h); c.rotate(Math.PI);
    red(c, w, h);
    // the striker, along the bottom
    c.fillStyle = '#4A2E22'; c.fillRect(18, h - 70, w - 36, 44);
    for (let i = 0; i < 60; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.2)'; c.fillRect(18 + (i * 37) % (w - 40), h - 66 + (i * 13) % 36, 3, 3); }
    // his note, in pen
    c.fillStyle = '#F4E6C8'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `italic 600 30px ${SCRIPT}`; c.fillText('Knock twice.', w / 2, 92); c.fillText('Show this.', w / 2, 146);
    c.font = `italic 600 40px ${SCRIPT}`; c.fillText('— F.', w / 2 + 40, 214);
  });
  const edge = face(red, 32, 32);
  const heads = face((c, w, h) => {
    c.fillStyle = '#E9DCC0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) { c.fillStyle = '#C0304A'; c.beginPath(); c.ellipse(14 + i * 23.5, h / 2, 9, h * 0.38, 0, 0, Math.PI * 2); c.fill(); }
  }, 256, 32);
  const fold = face((c, w, h) => { c.fillStyle = '#5E1018'; c.fillRect(0, 0, w, h); c.fillStyle = '#C9A23A'; c.fillRect(w / 2 - 6, 0, 12, h); }, 256, 32);
  // (a box's faces go +x, -x, +y, -y, +z, -z: its front up, its back down, the matches' heads at its far end)
  const g = new Group();
  g.add(new Mesh(new BoxGeometry(Wd, T, Ht), [edge, edge, front, back, fold, heads]));
  return g;
}

// ---------- sound ----------
/** At the door, heard from where the player is; or (`cue`) on the scene's own bus, heard while the world's hushed. */
const AT = MID;
const on = (cue: boolean) => (cue ? { bus: 'cue' as const } : { at: AT });
const sfx = {
  knock: (cue: boolean, t = 0) => {
    for (const d of [0, 0.22]) {
      noise({ t: t + d, f: 220, q: 1.2, a: 0.008, d: 0.1, v: 0.22, ...on(cue) });
      tone({ t: t + d, f: 95, f2: 80, a: 0.008, d: 0.12, v: 0.14, ...on(cue) });
    }
  },
  slide: (cue: boolean) => noise({ f: 700, f2: 500, q: 2, a: 0.03, d: 0.22, v: 0.05, ...on(cue) }),
  /** The slot slammed shut. */
  slam: () => { noise({ f: 600, f2: 400, q: 1.5, a: 0.012, d: 0.14, v: 0.1, at: AT }); tone({ f: 120, f2: 90, a: 0.008, d: 0.12, v: 0.1, at: AT }); },
  bolt: (cue: boolean, t = 0) => { noise({ t, f: 900, q: 3, a: 0.008, d: 0.08, v: 0.08, ...on(cue) }); tone({ t, f: 160, f2: 120, a: 0.008, d: 0.1, v: 0.08, ...on(cue) }); },
  creak: (cue: boolean) => tone({ f: 130, f2: 92, type: 'triangle', lp: 700, a: 0.12, d: 0.6, v: 0.05, ...on(cue) }),
  /** The caution tape torn off the stall's front. */
  tear: () => noise({ f: 2600, f2: 1400, q: 0.9, a: 0.01, d: 0.28, v: 0.05, bus: 'cue' }),
  /** The stall's bulb buzzing as it flickers. */
  buzz: (cue: boolean, d = 0.5) => tone({ f: 100, type: 'sawtooth', lp: 600, a: 0.04, d, v: 0.018, ...on(cue) }),
  /** A syllable of a line, and the lower, longer "hm" at the end of a sentence: Mr. Fugu's mumble from the dock
   *  (offer.ts), and (`deep`) the doorman's, lower still, from behind his door. */
  voice: (deep: boolean, cue: boolean, t = 0) => tone({ t, f: deep ? between(78, 100) : between(105, 140), d: 0.08, type: 'triangle', a: 0.008, v: 0.34, ...on(cue) }),
  stop: (deep: boolean, cue: boolean, t = 0) => tone({ t, f: deep ? between(66, 72) : between(88, 98), d: 0.16, type: 'triangle', a: 0.008, v: 0.34, ...on(cue) }),
  /** The matchbook across the desk. */
  /** Into the pocket. */
  pocket: () => noise({ f: 500, f2: 260, kind: 'lowpass', q: 0.7, a: 0.03, d: 0.22, v: 0.06, bus: 'cue' }),
  slide2: () => noise({ f: 800, f2: 450, kind: 'lowpass', q: 0.7, a: 0.06, d: 0.3, v: 0.05, bus: 'cue' }),
};

// ---------- the state ----------
/** How far open the door is, 0 to 1, and where it's going; whether the player's walked off since the last knock; the
 *  short scene at it when nobody lets you in (seconds into it, and whether he's there to ask); a good evening through
 *  the slot (seconds left), and whether he's said it this visit. */
let open = 0, want = 0, armed = true, knock: { t: number; ask: boolean } | null = null, evening = 0, greeted = false;
/** Whether Mr. Fugu's "!" is up: once Yokobashiri's card is away (ring.ts). */
let calling = false;
/** A scene, while it plays: which, seconds into it, and what's to happen when. */
let scene: { kind: 'fugu' | 'door'; t: number; cues: { t: number; run: () => void }[] } | null = null;
/** Whose shot the camera's on, kept as it eases back to the player after the scene. */
let shotOf: 'fugu' | 'door' = 'door';
const at = (dt: number, run: () => void) => { scene?.cues.push({ t: scene.t + dt, run }); };
/** True while a scene plays: the cellar holds still (ring.ts), and the world's sounds go quiet (game.ts). */
export const wayPlaying = () => !!scene;
/** The door's state and what's being said, for tests. */
export const wayState = () => ({ open, scene: scene?.kind ?? null, says: doorman.says.text || sayLine?.text || '', calling });

/** Puts the door as things stand, for a game loading or the ring opening: Mr. Fugu calling if the matchbook's due. */
export function dressDoor() {
  build();
  calling = F.beaten >= 2 && !F.den.book;
  open = want = 0;
  southDoor.shut = true;
  if (calling) callFugu();
  else if (F.den.book && !F.den.way) pointDoor();
}
/** Yokobashiri's card is away and the player's down here: Mr. Fugu wants a word. */
export function callFugu() {
  calling = true;
  pointAt({ x: OFFICE.x, y: CY + 1, z: OFFICE.z }, '❗', () => calling && level.down);
}
const pointDoor = () => pointAt({ x: MID.x, y: CY + 1, z: MID.z }, '❗', () => F.den.book && !F.den.way && level.down);

// ---------- the page: the "!", the speech bubble, the dark round the edges ----------
const $ = (id: string) => document.getElementById(id)!;
const root = $('way'), alertEl = $('wayAlert'), sayEl = $('waySay'), whoEl = $('wayWho'), lineEl = $('wayLine'), liveEl = $('wayLive');
const flash = $('doorFlash');
/** Mr. Fugu's line being said, a letter at a time, and what comes after it's read (a tap); and the bubble's place. */
let sayLine: { text: string; n: number; wait: number; then: () => void } | null = null;
const sayAt = V(0, 0, 0);
function say(text: string, p: Vector3, then: () => void) {
  sayAt.copy(p);
  sayLine = { text, n: 0, wait: 0.15, then };
  lineEl.textContent = ''; lineEl.dataset.rest = text;
  sayEl.classList.add('on'); sayEl.classList.remove('done');
  liveEl.textContent = whoEl.textContent + ': ' + text;
}
function advance() {
  const l = sayLine;
  if (!l) return;
  // (still saying it: the rest of it at once)
  if (l.n < l.text.length) { l.n = l.text.length; lineEl.textContent = l.text; lineEl.dataset.rest = ''; sayEl.classList.add('done'); return; }
  sayLine = null;
  sayEl.classList.remove('on', 'done');
  l.then();
}
const reduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------- the scenes ----------
function begin(kind: 'fugu' | 'door') {
  scene = { kind, t: 0, cues: [] };
  shotOf = kind;
  player.held = true; player.moving = false;
  root.hidden = false;
  document.body.classList.add('way');
  closeIn = 0; openOut = 0; slotK = 0; walkTo = null;
}
function end(after: () => void) {
  scene = null;
  player.held = false;
  document.body.classList.remove('way');
  root.hidden = true;
  shot.hide = null; shot.quiet = false;
  save();
  after();
}

/** Mr. Fugu at his desk: the camera on him, his three lines, and his matchbook across the desk. */
function fuguScene() {
  const b = build();
  calling = false;
  begin('fugu');
  whoEl.textContent = 'Mr. Fugu';
  const head = V(boss.position.x, boss.position.y + 2.5, boss.position.z);
  at(0.8, () => say(LINES.fugu[0], head, () => say(LINES.fugu[1], head, () => {
    b.book.visible = true; bookT = 0; sfx.slide2(); boss.glint();
    say(LINES.fugu[2], head, inspect);
  })));
}
/** Whether the matchbook's held up to the doorman's slot. */
let showing = false;
/** Seconds the matchbook's been sliding across the desk, or held up to the slot. */
let bookT = 0;

// ---------- looking his matchbook over ----------
/** The matchbook up close: seconds since it came up; how it's turned (about the view's up and across, and how fast,
 *  after a flick); whether it's being dragged, and from where; and once pocketed, seconds since. */
let look: { t: number; yaw: number; pitch: number; vy: number; vp: number; drag: { x: number; y: number; at: number } | null; touched: boolean; out: number } | null = null;
/** Where it was on the desk when it came up (it flies from there). */
const fromAt = V(0, 0, 0), fromQ = new Quaternion();
const lookEl = $('wayLook'), pocketEl = $('wayPocket');
function inspect() {
  const b = build();
  b.book.updateMatrixWorld(); b.book.getWorldPosition(fromAt); b.book.getWorldQuaternion(fromQ);
  look = { t: 0, yaw: 0, pitch: 0, vy: 0, vp: 0, drag: null, touched: false, out: -1 };
  b.dim.visible = true;
  lookEl.hidden = false;
  sfx.slide2();
}
/** Into the pocket: it drops out of view, and the scene's over. */
function pocket() {
  if (!look || look.out >= 0) return;
  look.out = 0;
  lookEl.hidden = true;
  sfx.pocket();
}
lookEl.addEventListener('pointerdown', e => {
  if (!look || e.target === pocketEl || (e.target as Element).closest?.('button')) return;
  look.drag = { x: e.clientX, y: e.clientY, at: e.timeStamp }; look.touched = true; look.vy = look.vp = 0;
  lookEl.setPointerCapture?.(e.pointerId);
});
lookEl.addEventListener('pointermove', e => {
  if (!look?.drag) return;
  const dx = e.clientX - look.drag.x, dy = e.clientY - look.drag.y, secs = Math.max(1 / 120, (e.timeStamp - look.drag.at) / 1000);
  look.drag = { x: e.clientX, y: e.clientY, at: e.timeStamp };
  // (a full turn for a drag across about half a phone's width)
  const k = 6 / Math.max(320, Math.min(window.innerWidth, window.innerHeight));
  look.yaw += dx * k; look.pitch = Math.max(-1.3, Math.min(1.3, look.pitch + dy * k));
  // (how fast it's going as it's let go, for a flick: never more than a couple of turns a second)
  const most = 12;
  look.vy = Math.max(-most, Math.min(most, dx * k / secs)); look.vp = Math.max(-most, Math.min(most, dy * k / secs));
});
const letGo = (e: PointerEvent) => {
  if (!look?.drag) return;
  // (held still before letting go: no flick)
  if (e.timeStamp - look.drag.at > 100) look.vy = look.vp = 0;
  look.drag = null;
};
lookEl.addEventListener('pointerup', letGo);
lookEl.addEventListener('pointercancel', letGo);
pocketEl.addEventListener('click', pocket);
const view = { fwd: V(0, 0, 0), q: new Quaternion(), turn: new Quaternion(), tilt: new Quaternion(), up: new Quaternion() };
const AX = { x: V(1, 0, 0), y: V(0, 1, 0) };
/** The matchbook, up close, every frame: flying up from the desk, turned as the player turns it, into the pocket. */
function updLook(dt: number, b: Built) {
  const l = look!;
  l.t += dt;
  if (!l.drag) {
    // (after a flick it carries on, slowing; untouched, it sways a little, to show it turns)
    l.yaw += l.vy * dt; l.pitch = Math.max(-1.3, Math.min(1.3, l.pitch + l.vp * dt));
    l.vy *= Math.exp(-dt * 3); l.vp *= Math.exp(-dt * 3);
    if (!l.touched) l.yaw = Math.sin(l.t * 1.1) * 0.45;
  }
  // in front of the camera, as big as about half the view (or its width, on a phone held upright)
  const half = Math.tan(camera.fov * Math.PI / 360), d = Math.max(0.27 / (0.5 * 2 * half), 0.2 / (0.55 * 2 * half * camera.aspect));
  camera.getWorldDirection(view.fwd);
  const at = camera.position.clone().addScaledVector(view.fwd, d);
  // (its front to the camera, the matches' end up; turned about the view's up and across)
  view.turn.setFromAxisAngle(AX.y, l.yaw); view.tilt.setFromAxisAngle(AX.x, l.pitch); view.up.setFromAxisAngle(AX.x, Math.PI / 2);
  view.q.copy(camera.quaternion).multiply(view.turn).multiply(view.tilt).multiply(view.up);
  const k = ease(Math.min(1, l.t / 0.6));
  b.book.position.copy(fromAt).lerp(at, k);
  b.book.quaternion.copy(fromQ).slerp(view.q, k);
  if (l.out >= 0) {
    // into the pocket: down out of the view, quickly
    l.out += dt;
    const o = Math.min(1, l.out / 0.35);
    b.book.position.addScaledVector(V(0, 1, 0).applyQuaternion(camera.quaternion), -o * o * d);
    b.book.scale.setScalar(1 - 0.5 * o);
    if (o >= 1) {
      look = null;
      b.book.visible = false; b.book.scale.setScalar(1); b.dim.visible = false;
      F.den.book = true;
      end(() => { chime(); pointDoor(); });
      return;
    }
  }
  // the view dimmed behind it
  const back = d + 0.5;
  b.dim.position.copy(camera.position).addScaledVector(view.fwd, back);
  b.dim.quaternion.copy(camera.quaternion);
  b.dim.scale.set(back * half * 2 * camera.aspect * 1.2, back * half * 2 * 1.2, 1);
  (b.dim.material as MeshBasicMaterial).opacity = 0.7 * Math.min(1, l.t / 0.4) * (l.out >= 0 ? 1 - Math.min(1, l.out / 0.35) : 1);
}

/** The doorman says `text` over his door, in blips, his voice low behind it (on the scene's bus, `cue`, or heard from the
 *  door). */
function doormanSays(text: string, cue: boolean) {
  doorman.says.say(text);
  let t = 0.1, n = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], end = '.!?'.includes(ch) && !'.!?'.includes(text[i + 1] ?? 'x');
    if (end) { sfx.stop(true, cue, t); t += 0.3; continue; }
    t += ch === ',' ? 0.09 : 0.045;
    if (/[a-z]/i.test(ch) && ++n % 2) sfx.voice(true, cue, t);
  }
}

/** Where the player's walked to in the scene, if anywhere. */
let walkTo: { x: number; z: number } | null = null;
/** At the stall with Mr. Fugu's matchbook: the tape torn away, a step in, the bulb flickering, the knock, the slot, the
 *  password, and the stall's back swinging in on the club. */
function doorScene() {
  begin('door');
  // (the fans and diners standing where it's filmed kept out of the shot, and the crowd hushed)
  shot.hide = (x, z) => x > DX - 0.5 && x < DX + 4 && z > MID.z - 2.6 && z < MID.z + 2.8;
  shot.quiet = true;
  at(0.4, () => { stallDoor.torn = true; sfx.tear(); });
  at(0.8, () => { walkTo = INSIDE; });
  at(1.6, () => { stallDoor.flicker = 1.1; sfx.buzz(true, 1.1); });
  at(2.0, () => sfx.knock(true));
  at(2.7, () => { slotTo = 1; sfx.slide(true); closeIn = 1; });
  at(2.95, () => doormanSays(LINES.ask, true));
  at(4.0, () => { showing = true; built!.book.visible = true; bookT = 0; sfx.pocket(); });
  at(4.8, () => doormanSays(LINES.ok, true));
  at(5.9, () => { showing = false; built!.book.visible = false; built!.book.scale.setScalar(1); slotTo = 0; sfx.slide(true); closeIn = 0; });
  at(6.3, () => { sfx.bolt(true); sfx.bolt(true, 0.18); });
  at(6.7, () => {
    want = 1; sfx.creak(true);
    if (!reduce()) { flash.style.transition = 'none'; flash.style.opacity = '0.75'; void flash.offsetWidth; flash.style.transition = 'opacity 1.1s ease-out'; flash.style.opacity = '0'; }
    dustFx(V(DX - 0.4, CY + 0.9, MID.z), 14, 1.4, [0x8A7A90, 0xC8A0B8]);
    showDen(true);
    F.den.way = F.den.door = true;
    liftFog();
    openOut = 1;
  });
  at(9.3, () => end(() => pointAt({ x: DEN.x1 - 2.5, y: CY, z: MID.z }, '🃏', () => level.down)));
}

// ---------- every frame ----------
/** The camera: in close on the slot, and up over the stall once the door's open (0 to 1, eased). */
let closeIn = 0, openOut = 0, close = 0, out = 0;
/** How far the slot's open, and where it's going. */
let slotK = 0, slotTo = 0;
const ease = (k: number) => k * k * (3 - 2 * k);
const near = V(0, 0, 0), slotAt = V(0, 0, 0);

/** The door, every frame (stage 3, from ring.ts): knocking at it, the scenes, and the camera's view of them. */
export function updSouthDoor(dt: number) {
  if (!built) return;
  const b = built, p = player.g.position, down = level.down, { says, cover, eyes } = doorman;
  const d = Math.sqrt(d2xz(p, FRONT)), dDoor = Math.sqrt(d2xz(p, MID)), free = down && !player.held && !staging() && !F.rush && !cardUp();
  if (d > AWAY) armed = true;
  if (!scene && free) {
    // Mr. Fugu, with his matchbook to hand over
    if (F.beaten >= 2 && !F.den.book && d2xz(p, DESK_PAD) < DESK_PAD.r * DESK_PAD.r) fuguScene();
    // the stall: out of order (nobody there, or nobody who'll let you in), the scene, or (once you're in) its back opening
    else if (!F.den.way && armed && !knock && d < KNOCK) {
      armed = false;
      if (F.den.book) doorScene();
      else { knock = { t: 0, ask: F.beaten >= 2 }; sfx.knock(false); }
    }
  }
  if (knock) {
    const k = knock, was = k.t;
    k.t += dt;
    const past = (x: number) => was < x && k.t >= x;
    if (!k.ask && past(1.5)) says.say(LINES.nobody);
    if (k.ask && past(0.8)) { slotTo = 1; sfx.slide(false); }
    if (k.ask && past(1.05)) doormanSays(LINES.ask, false);
    if (k.ask && past(2.6)) doormanSays(LINES.no, false);
    if (k.ask && past(3.3)) { slotTo = 0; sfx.slam(); }
    if (k.t > 3.6) knock = null;
  }
  // once the doorman's let you in: the door opens as you come up to it, from either side, and shuts behind you; from the
  // restroom, the bulb flickering first, and the first time a visit, a good evening through the slot
  if (F.den.way && !scene && down) {
    if (dDoor < 1.5 && want === 0 && evening <= 0) {
      const front = p.x > DX;
      if (front) { stallDoor.flicker = 0.4; sfx.buzz(false, 0.4); }
      if (front && !greeted) { greeted = true; evening = 0.9; slotTo = 1; doormanSays(LINES.evening, false); sfx.slide(false); }
      else { want = 1; sfx.bolt(false); sfx.creak(false); }
    }
    if (evening > 0 && (evening -= dt) <= 0) { slotTo = 0; if (want === 0) { want = 1; sfx.bolt(false); sfx.creak(false); } }
    // (a game let in before the club's smoke rolled back off it the first time: it does now)
    if (want === 1 && !F.den.door) { F.den.door = true; liftFog(); }
    if (dDoor > 2.2) { if (want === 1) sfx.creak(false); want = 0; }
    if (dDoor > 6) greeted = false;
  }
  stallDoor.flicker = Math.max(0, stallDoor.flicker - dt);
  // with his matchbook, the club's band, just, through the stall's back, close to it
  if (down && F.den.book && !F.den.way && !scene && dDoor < 4) { club.k = Math.max(club.k, 0.2 * (1 - dDoor / 4)); club.muffle = 1; club.vol = 1; }
  // the door and its slot
  open += (want - open) * Math.min(1, dt * (want ? 4 : 2.5));
  southDoor.shut = open < 0.6; stallDoor.open = open;
  b.leaf.rotation.y = -open * Math.PI * 0.47;
  slotK += (slotTo - slotK) * Math.min(1, dt * 14);
  cover.position.z = -slotK * 0.42; eyes.visible = slotK > 0.3;
  // (just over the slot, his mouth behind it)
  if (says.upd(dt)) says.place(DX + 0.1, CY + 1.85, MID.z);
  // the matchbook: slid across the desk, in the office; held up to the slot, at the door, out of the pocket with its
  // front to you and then turned round to him (so it's his note on the back you see)
  bookT += dt;
  if (look) updLook(dt, b);
  else if (showing) {
    const up = ease(Math.min(1, bookT / 0.35)), turn = ease(Math.min(1, Math.max(0, (bookT - 0.45) / 0.5)));
    // (held up in front of them, toward the stall's back: west, and a little to their left)
    b.book.position.set(p.x - 0.32, p.y + 1.05 + 0.4 * up, p.z + 0.12);
    b.book.rotation.set(Math.PI / 2, Math.PI * (1 - turn) - Math.PI / 2, 0, 'YXZ');
    b.book.scale.setScalar(1.3);
  }
  else if (b.book.visible) {
    const k = ease(Math.min(1, bookT / 0.6));
    b.book.position.set(OFFICE.x + 0.2, boss.position.y + 0.85, OFFICE.z - 0.3 + 0.7 * k);
    b.book.rotation.y = 0.3 - 0.25 * k;
  }
  if (!scene) { wayCam.k = Math.max(0, wayCam.k - dt / 0.8); }
  else {
    const s = scene;
    s.t += dt;
    for (const c of s.cues.filter(c => c.t <= s.t)) { s.cues.splice(s.cues.indexOf(c), 1); c.run(); }
    wayCam.k = Math.min(1, wayCam.k + dt / 0.7);
    if (s.kind === 'fugu') boss.talking = !!sayLine && sayLine.n < sayLine.text.length;
    // (the club's band through the stall's back, louder and clearer as it swings open); and the step into the stall
    if (s.kind === 'door') {
      club.k = 0.2 + 0.7 * open; club.muffle = 1 - open; club.vol = 1;
      if (walkTo) { const sp = player.speed; player.speed = 1.6; if (moveEnt(player, walkTo, dt)) walkTo = null; player.speed = sp; }
    }
  }
  // the camera
  const back = camK > 1 ? 1.35 : 1, shooting = scene || wayCam.k > 0 ? shotOf : null;
  if (shooting === 'fugu') {
    wayCam.pos.set(OFFICE.x + 1.1 * back, CY + 2.4 * back, OFFICE.z + 4.2 * back);
    wayCam.look.set(OFFICE.x, CY + 1.45, OFFICE.z - 0.2);
  } else if (shooting === 'door') {
    close += (closeIn - close) * Math.min(1, dt * 1.6);
    out += (openOut - out) * Math.min(1, dt * 1.2);
    // (from the restroom, off to the south-east as the game's own camera is; in on the slot; then up over the stall,
    // looking through into the club)
    by(wayCam.pos, 1.6 * back, CY + 2.6 * back, 3.6 * back);
    by(wayCam.look, 0, CY + 1.1, 0);
    b.root.updateMatrixWorld(); doorman.slot.getWorldPosition(slotAt);
    wayCam.pos.lerp(near.set(DX + 2.9 * back, CY + 2.1, slotAt.z + 0.9), ease(close));
    wayCam.look.lerp(slotAt, ease(close));
    wayCam.pos.lerp(by(near, -0.4 * back, CY + 5.0 * back, 3.6 * back), ease(out));
    wayCam.look.lerp(by(near, 0.4, CY + 0.2, -1.8), ease(out));
  }
  // the line being said, a letter at a time, his mouth going with it
  if (sayLine && sayLine.n < sayLine.text.length) {
    sayLine.wait -= dt;
    while (sayLine.wait <= 0 && sayLine.n < sayLine.text.length) {
      const ch = sayLine.text[sayLine.n++], next = sayLine.text[sayLine.n];
      // (the end of a sentence, the last of a "?!": a lower "hm", and a beat before the next)
      const stop = '.?!'.includes(ch) && !'.?!'.includes(next ?? 'x');
      sayLine.wait += stop ? (next === undefined ? 0 : 0.5) : ch === ',' ? 0.12 : 0.045;
      if (stop) { boss.point(); sfx.stop(false, true); }
      else if (ch.trim()) { boss.syllable(); if (/[a-z]/i.test(ch) && sayLine.n % 2) sfx.voice(false, true); }
      else boss.word();
    }
    lineEl.textContent = sayLine.text.slice(0, sayLine.n);
    lineEl.dataset.rest = sayLine.text.slice(sayLine.n);
    if (sayLine.n >= sayLine.text.length) sayEl.classList.add('done');
  }
}

/** Puts the "!" (over Mr. Fugu, or over the door) and the speech bubble on the screen for this frame (main.ts, once
 *  it's drawn). */
export function drawWay() {
  const target = !level.down || scene ? null : calling ? V(boss.position.x, boss.position.y + 2.9, boss.position.z)
    : F.den.book && !F.den.way && built ? V(MID.x, CY + H + 0.75, MID.z) : null;
  if (alertEl.classList.contains('on') !== !!target) alertEl.classList.toggle('on', !!target);
  if (target) {
    const a = target.project(camera);
    alertEl.style.visibility = a.z > 1 ? 'hidden' : '';
    alertEl.style.left = (a.x + 1) / 2 * window.innerWidth + 'px'; alertEl.style.top = (1 - a.y) / 2 * window.innerHeight + 'px';
  }
  if (!scene || !sayLine) return;
  const v = sayAt.clone().project(camera), hx = (v.x + 1) / 2 * window.innerWidth, hy = (1 - v.y) / 2 * window.innerHeight;
  // over his head, its tail pointing down at him (kept on the screen)
  const w = sayEl.offsetWidth, x = Math.max(12, Math.min(hx - w / 2, window.innerWidth - w - 12));
  sayEl.style.left = x + 'px'; sayEl.style.top = Math.max(sayEl.offsetHeight + 16, hy) + 'px';
  sayEl.style.setProperty('--tail', Math.max(22, Math.min(w - 22, hx - x)) + 'px');
  root.style.setProperty('--fx', hx + 'px'); root.style.setProperty('--fy', hy + 'px');
}

window.addEventListener('keydown', e => {
  if (!scene) return;
  const go = [' ', 'Enter', 'z', 'Z', 'e', 'E'].includes(e.key);
  if (sayLine && go) { e.preventDefault(); advance(); }
  // (looking the matchbook over: the arrow keys turn it, and the same keys pocket it)
  else if (look && go) { e.preventDefault(); pocket(); }
  else if (look && e.key.startsWith('Arrow')) {
    look.touched = true;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') look.vy = e.key === 'ArrowLeft' ? -3 : 3;
    else look.vp = e.key === 'ArrowUp' ? -3 : 3;
  }
});
window.addEventListener('pointerdown', () => { if (scene && sayLine) advance(); });
