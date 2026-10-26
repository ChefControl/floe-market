// The corner of tears: a restroom stall in the salon's corner by the door, for a player who's lost money at the games
// to go and have a good cry in. Its partitions come up to a little over head height, so the camera sees in over them;
// inside, on a tiled floor, there's a toilet facing the door, a little potted palm beside it (casinoSalon.ts), a sink
// under a round mirror and a roll of paper on the wall. A 😭 pad in front of its door opens a panel saying what the player's
// down since their last cry, with a button to cry it out: they go in, the door shuts, they sit on the lid and sob, hands
// over their face, then wailing with tears squirting from their eyes, and a puddle spreads across the floor and seeps
// out under the door. Then they come out feeling better, and the puddle dries. Moving cuts it short. None of it
// touches the game's luck: it's built on its own dice and runs on none.
import {
  CanvasTexture, CircleGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  PlaneGeometry, RepeatWrapping, SphereGeometry, Vector3,
} from 'three';
import { atTable, easeInOut, easeOut, leaveSeat, losses, speaker, takeSeat } from './casinoKit';
import { decal, drawPad } from './decals';
import { drawIcon } from './icons';
import { inputVec } from './input';
import { dice, quietly } from './kit';
import { inSalon, pushOutOfBox, SALON, SHIP, UPPER } from './layout';
import { player } from './player';
import { bake, canvasTex, G, mesh, scene, type Part } from './render';
import { lose } from './sfx';
import { panel as kitPanel } from './uiKit';
import { d2xz, money, V, type XZ } from './util';

const GOLD = 0xE3B23C, PANEL = 0xF4EFE6, PORCELAIN = 0xFBFBF8;
/** The stall, in the ship's own space: from its west partition to the salon's east wall, and from its north partition
 *  to the windows (both walls' inner faces), and how tall its partitions are. */
export const STALL = { x0: 2.0, x1: SALON.x1 - 0.06, z0: 1.45, z1: SALON.side - 0.06, h: 1.7 };
/** The door in the west partition, hung at its south end and opening inwards; and the 😭 pad in front of it. */
const DOOR = { z0: 1.98, z1: 2.7, h: 1.55 };
const DOOR_Z = (DOOR.z0 + DOOR.z1) / 2;
/** How far the door swings open: square, flat against the windows' end, out of the way in. */
const OPEN = 1.5;
const PAD = { x: STALL.x0 - 0.62, z: DOOR_Z };
/** The toilet against the east wall, facing the door, and where the player sits on it (how high their feet are); the
 *  sink against the north partition. */
const TOILET = { z: DOOR_Z, seat: 0.42 };
const SIT = { x: STALL.x1 - 0.52, y: TOILET.seat - 0.335 };
const SINK = { x: 2.6 };
/** How close to the pad's middle the panel opens. */
const REACH = 0.6;

/**
 * The cry, in seconds from the button: the door's open, the player's in, sat down, the door's shut, the sobbing's
 * over (moving jumps here), they're up with the door open, out on the pad, and the door's shut behind them.
 */
const T = { open: 0.35, inside: 1.5, sat: 1.9, shut: 2.1, sobbed: 8.7, up: 9.1, out: 10.3, done: 10.7 };
/** One sob: hands over the face for the first part, then a wail with the head back and tears squirting. */
const SOB = { secs: 1.6, hide: 0.65 };
/** What they say, every so often while they sob (`$` is what they lost). */
const SOBS = ['*sniff*', 'Waaah!', 'My $…', '*sob*', 'Why, Lady Luck?', 'Waaah!'];
const SAY_EVERY = 1.1;
/** How big the puddle gets inside, and the bit that seeps out under the door; how long it takes to dry after. */
const PUDDLE = { r: 0.62, seepAt: 2.5, dry: 25 };
/** Tears in flight at most, and how often they come while wailing and while the hands are over the face. */
const DROPS = 32, GRAVITY = 9.8, WAIL_EVERY = 0.035, DRIP_EVERY = 0.22;

/** The stall's walls, door and fittings, the pad, the puddle and the tears. */
function build(g: Group) {
  const { x0, x1, z0, z1, h } = STALL;
  // the partitions: cream panels capped in gold, the west one with a gap for the door and a header over it
  const panels: Part[] = [], trim: Part[] = [];
  const along = (xa: number, xb: number, z: number, y0: number, y1: number) =>
    panels.push({ geo: G.box, at: [(xa + xb) / 2, UPPER + (y0 + y1) / 2, z], scale: [xb - xa, y1 - y0, 0.06] });
  const across = (za: number, zb: number, x: number, y0: number, y1: number) =>
    panels.push({ geo: G.box, at: [x, UPPER + (y0 + y1) / 2, (za + zb) / 2], scale: [0.06, y1 - y0, zb - za] });
  along(x0 - 0.03, x1, z0, 0, h);
  across(z0, DOOR.z0, x0, 0, h); across(DOOR.z1, z1, x0, 0, h); across(DOOR.z0, DOOR.z1, x0, DOOR.h + 0.03, h);
  trim.push({ geo: G.box, at: [(x0 + x1) / 2 - 0.02, UPPER + h + 0.02, z0], scale: [x1 - x0 + 0.05, 0.04, 0.09] });
  trim.push({ geo: G.box, at: [x0, UPPER + h + 0.02, (z0 + z1) / 2], scale: [0.09, 0.04, z1 - z0 + 0.05] });
  g.add(mesh(bake(panels), PANEL, 0, 0, 0, true), mesh(bake(trim), GOLD));
  // the tiled floor inside
  const { tex: t } = canvasTex(64, 64, (c, s) => {
    c.fillStyle = '#F4F7F8'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#C9D9DF'; c.fillRect(0, 0, s / 2, s / 2); c.fillRect(s / 2, s / 2, s / 2, s / 2);
  });
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set((x1 - x0) / 0.5, (z1 - z0) / 0.5);
  const floor = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), new MeshLambertMaterial({ map: t }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, UPPER + 0.004, (z0 + z1) / 2); floor.receiveShadow = true;
  g.add(floor);
  // the toilet: a tank against the wall, a gold flush, the bowl and its lid; the sink on its stand under a round
  // mirror; and a roll of paper on the wall by the toilet
  const white: Part[] = [
    { geo: G.box, at: [x1 - 0.14, UPPER + 0.66, TOILET.z], scale: [0.2, 0.46, 0.44] },
    { geo: G.box, at: [x1 - 0.14, UPPER + 0.9, TOILET.z], scale: [0.24, 0.04, 0.48] },
    { geo: G.cyl, at: [x1 - 0.45, UPPER + 0.19, TOILET.z], scale: [0.17, 0.38, 0.15] },
    { geo: G.cyl, at: [x1 - 0.46, UPPER + TOILET.seat - 0.02, TOILET.z], scale: [0.23, 0.04, 0.2] },
    { geo: G.cyl, at: [SINK.x, UPPER + 0.36, z0 + 0.2], scale: [0.06, 0.72, 0.06] },
    { geo: G.cyl, at: [SINK.x, UPPER + 0.76, z0 + 0.22], scale: [0.2, 0.1, 0.17] },
    { geo: G.cyl, at: [x1 - 0.07, UPPER + 0.62, TOILET.z - 0.5], rot: [Math.PI / 2, 0, 0], scale: [0.06, 0.11, 0.06] },
  ];
  const gold: Part[] = [
    { geo: G.box, at: [x1 - 0.25, UPPER + 0.82, TOILET.z - 0.14], scale: [0.03, 0.03, 0.08] },
    { geo: G.cyl, at: [SINK.x, UPPER + 0.88, z0 + 0.1], scale: [0.018, 0.14, 0.018] },
    { geo: G.box, at: [SINK.x, UPPER + 0.94, z0 + 0.16], scale: [0.03, 0.03, 0.12] },
    { geo: G.cyl, at: [SINK.x, UPPER + 1.3, z0 + 0.035], rot: [Math.PI / 2, 0, 0], scale: [0.21, 0.01, 0.21] },
    { geo: G.box, at: [x1 - 0.03, UPPER + 0.7, TOILET.z - 0.5], scale: [0.04, 0.03, 0.16] },
  ];
  g.add(mesh(bake(white), PORCELAIN, 0, 0, 0, true), mesh(bake(gold), GOLD));
  g.add(mesh(bake([{ geo: G.cyl, at: [SINK.x, UPPER + 1.3, z0 + 0.042], rot: [Math.PI / 2, 0, 0], scale: [0.18, 0.01, 0.18] }]), 0xBFD4DC));
  // the door, on its hinge, with a gold knob each side and the 😭 on the outside
  const door = new Group(); door.position.set(x0, UPPER, DOOR.z1); g.add(door);
  const w = DOOR.z1 - DOOR.z0 - 0.02;
  door.add(mesh(bake([{ geo: G.box, at: [0, 0.04 + DOOR.h / 2, -w / 2 - 0.01], scale: [0.04, DOOR.h - 0.04, w] }]), PANEL, 0, 0, 0, true));
  door.add(mesh(bake([-1, 1].map(s => ({ geo: G.sphere, at: [s * 0.04, 0.85, -w + 0.08] as Part['at'], scale: [0.03, 0.03, 0.03] as Part['scale'] }))), GOLD));
  const sign = new Mesh(new PlaneGeometry(0.22, 0.22), new MeshBasicMaterial({ map: badge(), transparent: true }));
  sign.position.set(-0.025, 1.25, -w / 2 - 0.01); sign.rotation.y = -Math.PI / 2; door.add(sign);
  // the pad in front of the door
  const pad = decal(1.15, (c, cw, ch) => drawPad(c, cw, ch, '😭'));
  pad.mesh.position.set(PAD.x, UPPER + 0.01, PAD.z); g.add(pad.mesh);
  // the puddle: on the floor in front of the toilet, and the bit that seeps out under the door
  const wet = new MeshLambertMaterial({ color: 0x8FD6F5, transparent: true, opacity: 0, depthWrite: false });
  const disc = new CircleGeometry(1, 20);
  const pool = mesh(disc, wet, SIT.x - 0.35, UPPER + 0.012, TOILET.z), seep = mesh(disc, wet, x0 - 0.12, UPPER + 0.012, DOOR_Z);
  for (const m of [pool, seep]) { m.rotation.x = -Math.PI / 2; m.visible = false; m.receiveShadow = false; g.add(m); }
  // the tears: one mesh for them all, drawn where each is
  const tears = new InstancedMesh(new SphereGeometry(0.038, 6, 4), new MeshBasicMaterial({ color: 0x6FD0FF }), DROPS);
  tears.count = 0; tears.frustumCulled = false; tears.userData.noBatch = true;
  scene.add(tears);
  return { door, pad, wet, pool, seep, tears, sobs: speaker(player.g, 1.75) };
}

/** The 😭 on the door, as a little round sign. */
function badge(): CanvasTexture {
  const { tex } = canvasTex(64, 64, (c, w) => {
    c.fillStyle = '#E3B23C'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2); c.fill();
    drawIcon(c, '😭', w / 2, w / 2, 50);
  });
  return tex;
}

interface Drop { at: Vector3; v: Vector3 }
let room: ReturnType<typeof build> | null = null;
/** The cry under way: seconds in, where the player was when it started, what they lost, the lines said, the next
 *  tear, which eye and how many, and the tears in flight. `dry` counts the puddle drying after. */
const cry = { on: false, t: 0, from: V(0, 0, 0), lost: 0, said: 0, tear: 0, eye: 0, n: 0, drops: [] as Drop[], dry: 0 };

const panel = document.getElementById('tears')!, msg = document.getElementById('tearsMsg')!;
const cryBtn = document.getElementById('cry') as HTMLButtonElement;

/** Builds the stall into the ship's group `g` (in the ship's own space), off the game's luck. */
export function buildRestroom(g: Group) {
  room = quietly(() => build(g), dice(0x7EA75));
}

/** Where something in the ship's own space is, in the world. */
const world = (x: number, y: number, z: number) => V(SHIP.x + x, y, SHIP.z + z);

/** Whether the player's on the pad in front of the door. */
export function byTheStall() {
  const p = player.g.position;
  return !!room && inSalon(p) && d2xz(p, { x: SHIP.x + PAD.x, z: SHIP.z + PAD.z }) < REACH * REACH;
}

/** Starts a cry, if the player's on the pad and has lost something to cry about. */
function startCry() {
  if (!room || cry.on || panel.hidden || losses.down <= 0) return;
  Object.assign(cry, { on: true, t: 0, lost: losses.down, said: 0, tear: 0, dry: 0 });
  Object.assign(pose, { lift: 0, tuck: 0, lean: 0, drop: 0, rock: 0 });
  cry.from.copy(player.g.position);
  losses.down = 0;
  player.held = true;
  lose();
  // the camera comes in from the windows' side, over the near wall (which fades), to see them side on as they sit
  // facing the door
  takeSeat({ at: world(STALL.x0 + 0.85, UPPER + 0.75, (STALL.z0 + STALL.z1) / 2), from: V(-0.08, 0.62, 0.78).normalize(), wide: 2.6, tall: 2.2 }, panel);
  refresh();
}
cryBtn.addEventListener('click', startCry);
// (E cries too: it's the panel's main button. Esc leaves the stall be till the player steps away.)
const card = kitPanel(panel, { place: 'card', skin: 'casino', busy: () => cry.on });

let shown = '';
/** The panel's message and button, set only when they change. */
function refresh() {
  const down = losses.down;
  const say = cry.on ? 'Let it all out… 😭' : down > 0 ? `Down ${money(down)} 😢` : 'Nothing to cry about… yet';
  const text = cry.on ? 'Sniff…' : 'Cry it out 😭';
  cryBtn.disabled = cry.on || down <= 0;
  if (shown === say + text + cryBtn.disabled) return;
  shown = say + text + cryBtn.disabled;
  msg.textContent = say; cryBtn.textContent = text;
}

/** `a` to `b` by `k`. */
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** How far through `[a, b]` `t` is, 0 to 1. */
const within = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
/** Turns the player's heading towards `h`. */
function turn(h: number, dt: number, rate = 10) {
  let d = h - player.h;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  player.h += d * Math.min(1, dt * rate);
}
/** Walks the player along `path` (ship's own space), `k` of the way. */
function walk(path: XZ[], k: number, dt: number) {
  const legs = path.slice(1).map((q, i) => Math.hypot(q.x - path[i].x, q.z - path[i].z));
  let d = k * legs.reduce((a, b) => a + b, 0), i = 0;
  while (i < legs.length - 1 && d > legs[i]) d -= legs[i++];
  const a = path[i], b = path[i + 1], f = Math.min(1, d / (legs[i] || 1));
  player.g.position.set(SHIP.x + lerp(a.x, b.x, f), UPPER, SHIP.z + lerp(a.z, b.z, f));
  if (legs[i] > 0.01) turn(Math.atan2(b.x - a.x, b.z - a.z), dt, 14);
}

const tmpM = new Matrix4(), tmpS = new Vector3(), tmpF = new Vector3(), tmpE = new Vector3();
/** Lets a tear go from one eye or the other: a squirt out sideways while wailing, a drip while the hands are over it. */
function tear(wailing: boolean) {
  const r = room!, p = player.g;
  cry.eye = 1 - cry.eye; cry.n++;
  const s = cry.eye ? 1 : -1;
  p.updateMatrixWorld(true);
  const from = p.body.localToWorld(tmpE.set(s * 0.085, 1.05, wailing ? 0.19 : 0.25));
  tmpS.set(Math.cos(player.h), 0, -Math.sin(player.h)).multiplyScalar(s);
  tmpF.set(Math.sin(player.h), 0, Math.cos(player.h));
  const v = wailing ? tmpS.clone().multiplyScalar(1.1 + (cry.n * 0.618 % 1) * 0.4).addScaledVector(tmpF, 0.35).setY(1.2)
    : tmpS.clone().multiplyScalar(0.15).addScaledVector(tmpF, 0.3);
  if (cry.drops.length >= DROPS) cry.drops.shift();
  cry.drops.push({ at: from.clone(), v });
  r.tears.count = cry.drops.length;
}

/** The tears in flight fall, and go into the puddle when they reach the floor. */
function updTears(dt: number) {
  const r = room!;
  cry.drops = cry.drops.filter(d => {
    d.v.y -= GRAVITY * dt;
    d.at.addScaledVector(d.v, dt);
    return d.at.y > UPPER + 0.02;
  });
  cry.drops.forEach((d, i) => r.tears.setMatrixAt(i, tmpM.makeTranslation(d.at.x, d.at.y, d.at.z)));
  r.tears.count = cry.drops.length;
  r.tears.instanceMatrix.needsUpdate = true;
}

/** The puddle `k` of the way grown (the seep under the door coming later), at `opacity`. */
function puddle(k: number, seep: number, opacity: number) {
  const r = room!;
  r.wet.opacity = opacity;
  r.pool.visible = k > 0 && opacity > 0.01;
  r.seep.visible = seep > 0 && opacity > 0.01;
  r.pool.scale.set(PUDDLE.r * k, PUDDLE.r * k * 0.8, 1);
  r.seep.scale.set(0.3 * seep, 0.42 * seep, 1);
}

/** A smooth step from 0 at `a` to 1 at `b`. */
const smooth = (a: number, b: number, x: number) => { const k = within(x, a, b); return k * k * (3 - 2 * k); };
/** How the sobbing player holds themself: each arm raised (`lift`) and turned in (`tuck`), the body leant forward
 *  (`lean`), dropped (`drop`) and rocked (`rock`). Eased towards where the sob wants it each frame, so nothing snaps. */
const pose = { lift: 0, tuck: 0, lean: 0, drop: 0, rock: 0 };
/** Where `pose` is going: hands over the face, the wail, and sitting still with the arms down. */
const HIDE = { lift: 2.2, tuck: 0.62, lean: 0.22 }, WAIL = { lift: 0.75, tuck: -0.55, lean: -0.18 }, REST = { lift: 0, tuck: 0, lean: 0 };
/** How quickly the pose follows: higher is snappier. */
const EASE = 7;

/** Eases the pose towards `to` (with the body's drop and rock), and puts the player in it. */
function hold(to: { lift: number; tuck: number; lean: number }, drop: number, rock: number, dt: number) {
  const k = 1 - Math.exp(-EASE * dt), p = player.g, b = p.body;
  pose.lift += (to.lift - pose.lift) * k; pose.tuck += (to.tuck - pose.tuck) * k; pose.lean += (to.lean - pose.lean) * k;
  pose.drop += (drop - pose.drop) * k; pose.rock += (rock - pose.rock) * k;
  p.arms[0].rotation.set(-pose.lift, 0, pose.tuck); p.arms[1].rotation.set(-pose.lift, 0, -pose.tuck);
  b.rotation.x = pose.lean; b.position.y = pose.drop; b.rotation.z = pose.rock;
}

/**
 * Sobbing on the lid, `s` seconds in: hunched with the hands over the face, heaving with each sob, then rising into a
 * wail with the head back and the arms out, tears squirting, and sinking back into the hands. One flows into the next.
 */
function sob(s: number, dt: number) {
  const k = (s % SOB.secs) / SOB.secs;
  // how far into the wail: rising after the hidden part, and sinking back before the next sob
  const w = smooth(SOB.hide - 0.05, SOB.hide + 0.12, k) * (1 - smooth(0.88, 1, k));
  const to = { lift: HIDE.lift + (WAIL.lift - HIDE.lift) * w, tuck: HIDE.tuck + (WAIL.tuck - HIDE.tuck) * w, lean: HIDE.lean + (WAIL.lean - HIDE.lean) * w };
  // three heaves while the hands are over the face, the shoulders shaking a little; lifted up in the wail
  const heave = Math.sin(Math.PI * 3 * k / SOB.hide) ** 2 * (1 - w);
  hold(to, -0.02 + 0.03 * heave + 0.03 * w, Math.sin(s * 11) * 0.02 * (1 - w), dt);
  cry.tear -= dt;
  while (cry.tear <= 0) { const wailing = w > 0.5; cry.tear += wailing ? WAIL_EVERY : DRIP_EVERY; tear(wailing); }
  if (s >= cry.said * SAY_EVERY + 0.2) {
    const line = SOBS[cry.said % SOBS.length];
    room!.sobs.say(line.replace('$', money(cry.lost)));
    cry.said++;
  }
}

/** Sitting `k` of the way down onto the lid (0 standing): lowers them, and their legs come up. */
function sit(k: number) {
  const p = player.g;
  p.position.y = UPPER + SIT.y * easeInOut(k);
  for (const l of p.legs) l.rotation.x = -1.45 * easeInOut(k);
}

/** The cry, `cry.t` seconds in: the player's moved through it here, after their own update (which leaves them be). */
function updCry(dt: number) {
  const r = room!, t = (cry.t += dt), p = player.g;
  // moving gets them up and out
  if (t > T.shut && t < T.sobbed && inputVec()) cry.t = T.sobbed;
  const pad: XZ = { x: cry.from.x - SHIP.x, z: cry.from.z - SHIP.z }, out: XZ = { x: PAD.x, z: PAD.z };
  const doorway: XZ = { x: STALL.x0 + 0.3, z: DOOR_Z }, front: XZ = { x: SIT.x - 0.3, z: TOILET.z };
  const seat: XZ = { x: SIT.x, z: TOILET.z };
  player.moving = false;
  if (t < T.inside) {
    // the door opens, and in they go
    if (t < 0.25) turn(Math.PI / 2, dt);
    else { walk([pad, { x: STALL.x0 - 0.3, z: DOOR_Z }, doorway, front], easeInOut(within(t, 0.25, T.inside)), dt); player.moving = true; }
  } else if (t < T.sobbed) {
    // turned round to face the door, sitting down on the lid, and sobbing once it's shut
    const k = within(t, T.inside, T.sat);
    p.position.set(SHIP.x + lerp(front.x, seat.x, easeOut(k)), UPPER, SHIP.z + seat.z);
    turn(-Math.PI / 2, dt, 12);
    sit(k);
    if (t > T.shut) sob(t - T.shut, dt);
    else hold(REST, 0, 0, dt);
  } else if (t < T.up) {
    // up off the lid, the door opening
    const k = within(t, T.sobbed, T.up);
    p.position.set(SHIP.x + lerp(seat.x, front.x, easeOut(k)), UPPER, SHIP.z + seat.z);
    sit(1 - k);
    hold(REST, 0, 0, dt * 1.3);
  } else if (t < T.out) {
    walk([front, doorway, { x: STALL.x0 - 0.3, z: DOOR_Z }, out], easeInOut(within(t, T.up, T.out)), dt);
    player.moving = true;
  } else p.position.set(SHIP.x + out.x, UPPER, SHIP.z + out.z);
  p.rotation.y = player.h;
  // the door: open to let them in, shut while they cry, open to let them out, shut behind them
  const open = t < T.shut ? within(t, 0, T.open) * (1 - within(t, T.sat - 0.2, T.shut))
    : within(t, T.sobbed, T.up) * (1 - within(t, T.out, T.done));
  r.door.rotation.y = -OPEN * easeInOut(open);
  // the puddle grows while they sob
  const s = Math.max(0, Math.min(t, T.sobbed) - T.shut);
  puddle(easeOut(Math.min(1, s / 5)), easeOut(Math.max(0, Math.min(1, (s - PUDDLE.seepAt) / 3))), 0.6);
  if (t >= T.done) {
    Object.assign(cry, { on: false, dry: PUDDLE.dry });
    player.held = false;
    leaveSeat(panel);
    r.sobs.say('Much better.');
    refresh();
  }
}

/** Runs the stall: its panel by the door, a cry under way, and a puddle drying. */
export function updRestroom(dt: number) {
  if (!room) return;
  const near = cry.on || card.near(byTheStall() && !atTable());
  if (near !== !panel.hidden) { panel.hidden = !near; if (near) shown = ''; }
  if (near) refresh();
  room.sobs.upd(dt);
  if (cry.on) updCry(dt);
  else if (cry.dry > 0) {
    cry.dry = Math.max(0, cry.dry - dt);
    const k = cry.dry / PUDDLE.dry;
    puddle(0.75 + 0.25 * k, 0.6 + 0.4 * k, 0.6 * Math.min(1, k * 3));
  }
  if (cry.drops.length) updTears(dt);
}

/** Keeps the player out of the stall (its door's shut, but for a cry). */
export function collideRestroom(p: XZ) {
  if (!room || cry.on) return;
  const { x0, x1, z0, z1 } = STALL;
  pushOutOfBox(p, SHIP.x + (x0 + x1) / 2, SHIP.z + (z0 + z1) / 2, (x1 - x0) / 2 + 0.3, (z1 - z0) / 2 + 0.3);
}

/** For tests: whether a cry's under way and how far in, what the player's saying, how big the puddle is, how far the
 *  door's open, and how many tears are in the air. */
export const restroomView = () => ({
  crying: cry.on, t: cry.t, says: room?.sobs.text ?? '', puddle: room?.pool.visible ? room.pool.scale.x : 0,
  door: room ? -room.door.rotation.y : 0, tears: cry.drops.length, pad: PAD,
});
