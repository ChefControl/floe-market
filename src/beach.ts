// The matkot beach, from stage 2 (layout.ts BEACH: in stage 1 the road runs a step from the water): a strip of sand
// between the sea and the road, along the water north of the dock and east of its fence, through the old drive-up
// window's gap in it, with a lifeguard's tower at the north end; snow lies on it in winter. In spring and summer
// there are umbrellas by the water with towels under them and two beachgoers sitting it out, and a cool box. On
// Israel's election day (with the voting boat, votingBoat.ts) the umbrellas and the tower's roof are blue and white
// and flags fly on poles and on the tower; on any other day they're canvas and straw and there are no flags. By the
// water a beach regular, tanned, in a sun hat, bounces a ball on his paddle: step on the pad in front of him and Play,
// and the two of you knock it back and forth, matkot as on every Israeli beach, the camera in from the side. Press
// Hit (E) as the ball reaches you: each one counts and the ball comes back faster, and a miss (too soon or too late)
// ends the rally. In autumn and winter he's gone, and the umbrellas and everyone with him (a rally under way plays out
// first). The best rally is saved (layout.ts beach.best); nothing else of it is.
import {
  ConeGeometry, CylinderGeometry, Group, type Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, Vector3,
} from 'three';
import { crowdModel, type Person } from './characters';
import { decal, drawPad } from './decals';
import { apart, Build, detail, dice, jitter, K, seasonLayer } from './kit';
import { BEACH, beach, level, pushOutOfBox, stage } from './layout';
import { C } from './palette';
import { player } from './player';
import { camK, canvasTex, mesh, scene } from './render';
import { save } from './save';
import { current, type Swatch } from './season';
import { thud, tock } from './sfx';
import { bubble } from './speech';
import { panel as kitPanel, state } from './uiKit';
import { d2xz, V, type XZ } from './util';
import { type Add, BLUE, blocks, boat, flag, twin } from './votingBoat';
import { crowdStyle } from './wardrobe';
import { gapLogs, treeSpots } from './world';

// ---------- the plan ----------
/** The court: the regular stands at `HIM`, facing south down the beach to the pad (`PAD`), where the player stands. */
const COURT_X = 10.6;
export const HIM = { x: COURT_X, z: -15.3 }, PAD = { x: COURT_X, z: -11.3 };
/** How far from the pad's middle the player can stand and still be at it. */
const REACH = 0.95;
/** The umbrellas, by the water (their towels before them, to the east), and who's sitting under them. */
const UMBRELLAS: XZ[] = [{ x: 8.75, z: -9.3 }, { x: 8.65, z: -16.7 }];
/** The lifeguard's tower at the north end, the cool box by the court, and the flags' poles. */
const TOWER = { x: 11.0, z: -18.1 }, COOL = { x: 9.35, z: -15.9 };
const POLES: XZ[] = [{ x: 8.6, z: -5.7 }, { x: 12.1, z: -18.4 }];
/** The paddle's angle in the arm at its ready pose, so it stands upright there (a paddle held up in front). */
const READY = -0.9;
/** How much snow lies on the sand in each season. */
const SNOWY: Swatch = [1, 0, 0, 0];
/** Whether it's the season for the beach: the regular's out, and you can play. */
export const beachSeason = () => current() === 'spring' || current() === 'summer';

// ---------- the rally ----------
/** Seconds the ball takes from paddle to paddle at the first serve, at its fastest, and how much quicker each hit of
 *  the player's sends it back. */
const T0 = 1.15, T_MIN = 0.5, FASTER = 0.94;
/** How early before the ball reaches the player a hit counts (from slow to fast), and how late after. */
const EARLY = [0.28, 0.12], LATE = 0.07;
/** Seconds: his serve after Play, a swing, the ball dropping in the sand after a miss and lying there. */
const SERVE = 0.8, SWING = 0.25, DROP = 0.6, OVER = 1.4;

type Rally = 'idle' | 'serve' | 'toYou' | 'toHim' | 'missed';
/** The rally, for tests too: what's happening, the hits so far, how long the ball's flight is and how far into it. */
export const rally = { state: 'idle' as Rally, n: 0, T: T0, t: 0, over: 0 };
/** How early a hit counts, at the ball's speed now. */
export const early = (T = rally.T) => EARLY[1] + (EARLY[0] - EARLY[1]) * (T - T_MIN) / (T0 - T_MIN);

// ---------- the beach ----------
interface Built {
  /** All year: the sand and the tower (and its flags on election day). */
  g: Group;
  /** In spring and summer: the umbrellas, the towels, the cool box, the beachgoers, the regular and his pad. */
  fair: Group;
  /** Whether the flags are up (on election day). */
  flags: boolean;
  /** The snow on the sand, in winter. */
  snow: Mesh;
  him: Person;
  /** His paddle and the player's (in their right hands), the ball and its shadow on the sand. */
  his: Group; yours: Group; ball: Mesh; shadow: Mesh; shadowMat: MeshBasicMaterial;
  pad: Mesh;
  says: ReturnType<typeof bubble>;
}

/** A matkot paddle for a right hand: a wooden blade on a taped handle, at the hand, standing upright at `READY`, its
 *  face turned `turn` from straight ahead (towards the road, where the camera watches from). */
function paddle(blade: number, turn: number) {
  const g = new Group();
  g.position.set(0, -0.315, 0.004);
  g.rotation.set(-READY, turn, 0);
  const b = new Build()
    .add(new CylinderGeometry(0.018, 0.02, 0.12, 6), C.ink, 0, 0.05, 0)
    .add(new CylinderGeometry(0.115, 0.115, 0.018, 14), blade, 0, 0.2, 0, [Math.PI / 2, 0, 0])
    .add(new CylinderGeometry(0.118, 0.118, 0.008, 14), C.snow, 0, 0.2, 0, [Math.PI / 2, 0, 0]);
  g.add(b.mesh());
  return g;
}

/** A beach umbrella at (x, z): eight panels, `a` and `b` in turn, on a pole leaning a little. */
function umbrella(s: Build, x: number, z: number, a: number, b: number) {
  s.add(K.post, C.snow, x, 1.0, z, [0, 0, 0.06], [0.025, 2.0, 0.025]);
  for (let i = 0; i < 8; i++) {
    const panel = new ConeGeometry(1.05, 0.42, 1, 1, true, i * Math.PI / 4, Math.PI / 4);
    s.add(panel, i % 2 ? b : a, x + 0.12, 2.02, z, [0, 0, 0.06]);
  }
  s.add(K.ball, b, x + 0.13, 2.24, z, null, 0.04);
}

/** The sand: plain on Low; on High, grains and soft ripples, its far edges ragged into the ground. */
function sand(w: number, d: number) {
  const lo = mesh(new PlaneGeometry(w, d), C.sand);
  const css = (c: number, a = 1) => `rgba(${c >> 16},${c >> 8 & 255},${c & 255},${a})`;
  const tex = canvasTex(128, 512, (c, cw, ch) => {
    c.fillStyle = css(C.sand); c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = jitter(0, 1) < 0.5 ? css(C.wetSand, 0.35) : css(C.snow, 0.35);
      c.fillRect(jitter(0, cw), jitter(0, ch), 1.2, 1.2);
    }
    c.strokeStyle = css(C.wetSand, 0.28); c.lineWidth = 2;
    for (let y = 8; y < ch; y += 14) {
      c.beginPath();
      for (let x = 0; x <= cw; x += 8) c.lineTo(x, y + Math.sin(x * 0.09 + y) * 3);
      c.stroke();
    }
  });
  const hi = mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ map: tex.tex }));
  for (const m of [lo, hi]) { m.rotation.x = -Math.PI / 2; m.receiveShadow = true; }
  detail(lo, hi);
  return [lo, hi];
}

function build(): Built {
  const g = new Group(), fair = new Group(), flags = boat !== null;
  g.visible = false;
  g.add(fair);
  scene.add(g);
  // ---- the sand, the wet strip along the water, and the snow on them in winter ----
  const w = BEACH.x1 - BEACH.x0, d = BEACH.z1 - BEACH.z0;
  for (const m of sand(w, d)) { m.position.set(BEACH.x0 + w / 2, 0.004, BEACH.z0 + d / 2); g.add(m); }
  const wet = mesh(new PlaneGeometry(0.6, BEACH.shore - BEACH.z0), C.wetSand);
  wet.rotation.x = -Math.PI / 2; wet.position.set(BEACH.x0 + 0.3, 0.006, (BEACH.z0 + BEACH.shore) / 2);
  g.add(wet);
  const snow = seasonLayer(mesh(new PlaneGeometry(w, d), C.snow), SNOWY);
  snow.rotation.x = -Math.PI / 2; snow.position.set(BEACH.x0 + w / 2, 0.008, BEACH.z0 + d / 2);
  g.add(snow);

  // ---- what stands on it: umbrellas and towels and the cool box, in season; the tower, and the flags ----
  const props = new Build();
  for (const u of UMBRELLAS) umbrella(props, u.x, u.z, flags ? BLUE : C.paper, flags ? C.snow : C.rope);
  fair.add(props.mesh());
  twin(fair, blocks((s: Add) => {
    for (const [i, u] of UMBRELLAS.entries()) {
      // a towel before each, striped across
      const tx = u.x + 0.75, c = i ? C.tomato : C.amber;
      s(0.8, 0.012, 1.6, c, tx, 0.012, u.z);
      for (const k of [-1, 1]) s(0.8, 0.014, 0.12, C.snow, tx, 0.013, u.z + k * 0.55);
    }
    // the cool box
    s(0.55, 0.36, 0.38, BLUE, COOL.x, 0.18, COOL.z);
    s(0.57, 0.08, 0.4, C.snow, COOL.x, 0.39, COOL.z);
  }));
  twin(g, blocks((s: Add) => {
    // the lifeguard's tower: four legs, a deck, a hut with its window to the sea and a roof (blue on election day, straw
    // like the umbrellas any other), a ladder up its south side
    const { x, z } = TOWER, top = 1.5, roof = flags ? BLUE : C.rope;
    for (const [dx, dz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) s(0.1, top, 0.1, C.post, x + dx, top / 2, z + dz);
    s(1.4, 0.08, 1.4, C.plank, x, top, z);
    s(1.2, 0.95, 0.06, C.snow, x, top + 0.5, z - 0.6);
    s(1.2, 0.95, 0.06, C.snow, x, top + 0.5, z + 0.6);
    s(0.06, 0.95, 1.2, C.snow, x + 0.6, top + 0.5, z);
    s(0.06, 0.3, 1.2, C.snow, x - 0.6, top + 0.18, z);
    s(1.55, 0.08, 1.55, roof, x, top + 1.0, z);
    s(0.9, 0.12, 0.1, roof, x + 0.05, top + 0.85, z + 0.64);
    for (let r = 0; r < 5; r++) s(0.5, 0.04, 0.06, C.post, x, 0.25 + r * 0.3, z + 0.95 - r * 0.03);
    for (const k of [-1, 1]) s(0.05, top + 0.1, 0.05, C.post, x + k * 0.26, (top + 0.1) / 2, z + 0.92, 0, 0);
    // on election day, the flags, on their poles, and one on the tower's roof
    if (!flags) return;
    for (const p of POLES) {
      s(0.05, 2.6, 0.05, C.snow, p.x, 1.3, p.z);
      flag(s, 0.6, p.x + 0.33, 2.32, p.z);
    }
    s(0.04, 0.7, 0.04, C.snow, x - 0.6, top + 1.4, z - 0.6);
    flag(s, 0.4, x - 0.38, top + 1.6, z - 0.6);
  }));

  // ---- the beachgoers, sitting it out under the umbrellas ----
  UMBRELLAS.forEach((u, i) => {
    const st = crowdStyle(271_200 + i * 13);
    Object.assign(st, { summer: i ? 'shades' : 'straw', skirt: null });
    const p = crowdModel(st, 'parka');
    p.restyle(i ? C.lacquer : C.shallows, st);
    p.season = 'summer'; p.wear();
    p.position.set(u.x + 0.65, -0.2, u.z + (i ? 0.2 : -0.2));
    p.rotation.y = Math.PI / 2 + (i ? 0.3 : -0.3);
    for (const l of p.legs) l.rotation.x = -1.5;
    for (const a of p.arms) a.rotation.x = 0.3;
    fair.add(p);
  });

  // ---- the regular, tanned, in a sun hat and his beach clothes, his paddle and the ball ----
  const st = crowdStyle(271_301);
  Object.assign(st, { woman: false, skirt: null, skin: 0xC68B5E, summer: 'sunhat', summerC: BLUE, hat: 'bare', glasses: null, legs: C.navy, height: 1.02 });
  const him = crowdModel(st, 'parka');
  him.restyle(C.snow, st);
  him.season = 'summer'; him.wear();
  him.position.set(HIM.x, 0, HIM.z);
  fair.add(him);
  const his = paddle(C.endGrain, 0.7);
  him.arms[0].add(his);
  const yours = paddle(C.endGrain, -0.7);
  yours.visible = false;
  player.g.arms[0].add(yours);
  const ball = mesh(K.ball, C.tomato, HIM.x, 1.4, HIM.z + 0.5, true);
  ball.scale.setScalar(0.07); ball.userData.noBatch = true;
  scene.add(ball);
  const shadowMat = new MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.25, depthWrite: false });
  const shadow = mesh(K.dot, shadowMat);
  shadow.scale.set(0.06, 0.002, 0.06); shadow.userData.noBatch = true;
  scene.add(shadow);
  const pad = decal(1.9, (c, cw, ch) => drawPad(c, cw, ch, '🏓')).mesh;
  pad.position.set(PAD.x, 0.012, PAD.z);
  fair.add(pad);
  const says = bubble(scene, 2.0);
  return { g, fair, flags, snow, him, his, yours, ball, shadow, shadowMat, pad, says };
}

/** The beach, built the first time it's up (from stage 2, up top: a game that never gets there never pays for it),
 *  off the game's luck, on dice of its own for the scenery's too, so neither moves on for it. */
export let sands: Built | null = null;

// ---------- the card ----------
/** The card at the pad: what's up (the best, the rally so far), and Play, or Hit while the ball's in play. */
function card() {
  const el = document.createElement('div');
  el.id = 'matkot'; el.hidden = true;
  // matkot on election day, with the voting boat; plain paddle ball any other
  const title = document.createElement('p'); title.className = 'k-title'; title.textContent = boat ? '🏓 Matkot' : '🏓 Paddle';
  const msg = document.createElement('p'); msg.className = 'k-msg';
  const row = document.createElement('div'); row.className = 'k-row';
  const button = (label: string) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'k-btn k-main'; b.textContent = label;
    row.append(b);
    return b;
  };
  const play = button('🏓 Play'), hit = button('🏓 Hit');
  el.append(title, msg, row);
  document.body.append(el);
  return { el, msg, play, hit, kit: kitPanel(el, { place: 'card', close: () => { stop(); court!.kit.shut = true; } }) };
}
let court: ReturnType<typeof card> | null = null;
/** Builds the beach and its card, once. */
function lay() {
  if (sands) return;
  sands = apart(build, dice(0xBEAC4));
  court = card();
  court.play.addEventListener('click', () => start());
  court.hit.addEventListener('click', () => swing());
}

// ---------- playing ----------
/** The ball's flight: from where it was hit, to the other paddle; and after a miss, which way it was going. */
const from = new Vector3(), to = new Vector3(), on = new Vector3();
/** Seconds since each of them last swung. */
let mine = SWING, theirs = SWING, idle = 0;

/** Sends the ball from where it is to the other paddle. */
function send(toYou: boolean) {
  const b = sands!, at = toYou ? b.yours : b.his;
  from.copy(b.ball.position);
  at.updateWorldMatrix(true, false);
  at.localToWorld(to.set(0, 0.2, 0));
  rally.state = toYou ? 'toYou' : 'toHim';
  rally.t = 0;
}

function start() {
  if (!sands || rally.state !== 'idle' || !beachSeason()) return;
  Object.assign(rally, { state: 'serve', n: 0, T: T0, t: 0, over: 0 });
  player.held = true; player.moving = false;
  player.g.position.set(PAD.x, player.g.position.y, PAD.z);
  player.h = Math.atan2(HIM.x - PAD.x, HIM.z - PAD.z); player.g.rotation.y = player.h;
  sands.yours.visible = true;
  sands.says.say('Here it comes!');
}

/** The player swings: a hit if the ball's reaching them, a miss if it's still on its way. */
function swing() {
  if (!sands || rally.state === 'idle' || rally.state === 'missed') return;
  mine = 0;
  if (rally.state !== 'toYou') return;
  const left = rally.T - rally.t;
  if (left > early()) { miss(); return; }
  rally.n++;
  tock(PAD, true);
  rally.T = Math.max(T_MIN, rally.T * FASTER);
  send(false);
}

function miss() {
  rally.state = 'missed'; rally.t = 0;
  // (on the way it was going, a little further, from where it is)
  on.subVectors(to, from).setY(0).setLength(0.7);
  from.copy(sands!.ball.position);
  const best = beach.best;
  if (rally.n > best) { beach.best = rally.n; save(); }
  sands!.says.say(rally.n > best && best > 0 ? 'New best!' : rally.n >= 15 ? 'What a rally!' : rally.n >= 5 ? 'Nice rally!' : 'Again! Watch the ball.');
}

/** Ends the rally there and then (Esc), as a miss. */
function stop() {
  if (rally.state === 'serve' || rally.state === 'toYou' || rally.state === 'toHim') miss();
  if (rally.state === 'missed') rally.over = OVER;
}

// ---------- every frame ----------
/** The camera on the court from the side while they play, in from the road. */
export const beachCam = { k: 0, pos: V(0, 0, 0), look: V(0, 0, 0) };

export function updBeach(dt: number) {
  const up = stage.n >= 2 && !level.down;
  beach.open = stage.n >= 2;
  // the old drive-up window's gap in the dock's fence, open onto the sand
  if (stage.n >= 2) for (const l of gapLogs) if (l.visible) l.visible = false;
  if (up) lay();
  if (!sands || !court) return;
  const b = sands;
  b.g.visible = up;
  // the regular's out in spring and summer: a rally under way, and his word on it, play out before he goes
  const fair = up && (beachSeason() || rally.state !== 'idle' || b.says.text !== '');
  b.fair.visible = fair; b.ball.visible = fair; b.shadow.visible = fair;
  if (!fair) { court.el.hidden = !court.kit.near(false); return; }
  b.says.upd(dt);
  b.says.sprite.position.set(HIM.x, 2.45, HIM.z);
  const p = player.g.position, near = d2xz(p, PAD) < REACH * REACH;
  // the card: Play, or Hit while the ball's in play
  const open = court.kit.near(near || rally.state !== 'idle');
  court.el.hidden = !open;
  const playing = rally.state !== 'idle';
  court.play.hidden = playing; court.hit.hidden = !playing;
  state(court.hit, rally.state === 'missed' ? 'busy' : 'ok');
  court.msg.textContent = playing ? `Rally ${rally.n}${rally.state === 'missed' ? ` · Best ${beach.best}` : ''}`
    : beach.best ? `Best rally ${beach.best}` : 'Keep the ball in the air';
  // their arms: his up with the paddle flat while he bounces it, upright in play; a swing on each hit
  const swingOf = (t: number) => t < SWING ? -0.6 * Math.sin(Math.PI * t / SWING) : 0;
  const bouncing = rally.state === 'idle';
  rally.t += dt; mine += dt; theirs += dt;
  b.him.arms[0].rotation.set(bouncing ? -1.25 + 0.05 * Math.sin(idle * 7.2) : READY + swingOf(theirs), 0, 0.1);
  b.his.rotation.x = -READY + (bouncing ? Math.PI / 2 - 0.35 : 0);
  b.him.rotation.y = bouncing ? 0.25 : 0;
  if (b.yours.visible) player.g.arms[0].rotation.set(READY + swingOf(mine), 0, -0.1);
  // the ball
  const ball = b.ball.position;
  if (rally.state === 'idle') {
    // he bounces it on his paddle, held flat
    idle += dt;
    b.his.updateWorldMatrix(true, false);
    b.his.localToWorld(ball.set(0, 0.2, 0.06));
    ball.y += 0.08 + 0.3 * Math.abs(Math.sin(idle * 3.6));
  } else if (rally.state === 'serve') {
    b.his.updateWorldMatrix(true, false);
    b.his.localToWorld(ball.set(0, 0.2, 0.08));
    if (rally.t >= SERVE) { theirs = 0; tock(HIM, false); send(true); }
  } else if (rally.state === 'toYou' || rally.state === 'toHim') {
    const k = Math.min(1.25, rally.t / rally.T), arc = 0.3 + 0.35 * (rally.T - T_MIN) / (T0 - T_MIN);
    ball.lerpVectors(from, to, k);
    ball.y += Math.sin(Math.PI * Math.min(1, k)) * arc - (k > 1 ? (k - 1) * 3 : 0);
    if (rally.state === 'toHim' && rally.t >= rally.T) { theirs = 0; tock(HIM, false); send(true); }
    else if (rally.state === 'toYou' && rally.T - rally.t < -LATE) miss();
  } else {
    // missed: it drops in the sand past whoever missed it, and lies there; then back to his bouncing
    const k = Math.min(1, rally.t / DROP);
    ball.set(from.x + on.x * k, from.y + (0.07 - from.y) * k * k, from.z + on.z * k);
    if (k >= 1 && rally.t - dt < DROP) thud(ball);
    rally.over += dt;
    if (rally.over >= OVER) {
      rally.state = 'idle'; idle = 0;
      player.held = false;
      b.yours.visible = false;
    }
  }
  // its shadow on the sand, gold while it's there to be hit
  b.shadow.position.set(ball.x, 0.014, ball.z);
  const ready = rally.state === 'toYou' && rally.T - rally.t <= early() && rally.T - rally.t >= -LATE;
  b.shadowMat.color.setHex(ready ? C.gold : C.ink);
  b.shadowMat.opacity = ready ? 0.8 : 0.25;
  b.shadow.scale.set(0.06 + 0.04 * Math.max(0, 1.4 - ball.y), 0.002, 0.06 + 0.04 * Math.max(0, 1.4 - ball.y));
  // the camera in on the court while they play
  beachCam.k = Math.max(0, Math.min(1, beachCam.k + (playing ? dt : -dt) / 0.6));
}

export function drawBeach() {
  if (!sands || beachCam.k <= 0) return;
  const back = camK > 1 ? 1.6 : 1, mx = (HIM.x + PAD.x) / 2, mz = (HIM.z + PAD.z) / 2;
  beachCam.pos.set(mx + 4.8 * back, 2.1 * back, mz + 0.5 * back);
  beachCam.look.set(mx - 0.3, 1.2, mz - 0.1);
}

/** Keeps the player out of the tower, the flags' poles and any trees standing on the sand, and in season the
 *  regular, the umbrellas' poles, the cool box and the beachgoers. */
export function collideBeach(p: XZ) {
  if (!sands || stage.n < 2 || level.down || p.x < BEACH.x0) return;
  if (sands.fair.visible) {
    pushOutOfBox(p, HIM.x, HIM.z, 0.45, 0.45);
    for (const u of UMBRELLAS) { pushOutOfBox(p, u.x, u.z, 0.3, 0.3); pushOutOfBox(p, u.x + 0.75, u.z, 0.6, 0.85); }
    pushOutOfBox(p, COOL.x, COOL.z, 0.5, 0.42);
  }
  pushOutOfBox(p, TOWER.x, TOWER.z, 0.95, 1.2);
  if (sands.flags) for (const q of POLES) pushOutOfBox(p, q.x, q.z, 0.25, 0.25);
  for (const t of treeSpots) if (t.two && t.x > BEACH.x0 && t.z < BEACH.z1) pushOutOfBox(p, t.x, t.z, 0.45, 0.45);
}
