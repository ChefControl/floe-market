// The bouts (stage 3), drawn from fight.ts's clock. Between boss nights, the champion takes on a nameless local about
// every 45 seconds, the free show that keeps the arena alive; ring the gong and the boss steps up instead. While the
// fans buy their soup, the pair step up into the ring and stamp (shiko); while the fans take their seats, they crouch
// behind the white lines; then they charge, and push back and forth, leaning the way the crowd does, until the side
// with fewer fans goes out over the straw. The referee points his fan at the winner, they bow, and back to their
// corners. The fans watch from the stands (swarm.ts), and the crowd's sound follows the bout (ringSound.ts). The
// sparring partner slaps the teppo post in the corner all the while.
import { Mesh } from 'three';
import { boss, CY, DRUMS, parts, RING, RING_HALF, RING_R, RING_TOP } from './cellar';
import { TEPPO } from './cellarPlan';
import { belowGround, Person } from './characters';
import { BOSSES, BOUT, F, strength } from './fight';
import { level } from './layout';
import { G, mat, mesh, scene } from './render';
import { crowd, react } from './ringSound';
import { CHAMP, CHAMP_BELT, LOCAL_BELTS, RikishiModel } from './rikishi';

/** Their marks either side of the white lines, along the ring's x axis: the champion east, facing west. */
const MARK = 1.5;
/** How far the bout drives the pair from the middle (to the straw), and how far on over it the loser goes. */
const PUSH = RING_R - 0.6, OVER = RING_HALF - PUSH + 0.3;
/** The preparation's moments: stepping up, then stamping until the fans sit down (and they crouch). */
const STEP_UP = 2, STAMP = 7;

const champ = new RikishiModel(CHAMP_BELT);
champ.setWeight(170);
const rival = new RikishiModel(LOCAL_BELTS[0]);
const partner = new RikishiModel(0x6B4A2C);
partner.setWeight(140);
for (const r of [champ, rival, partner]) { r.visible = false; scene.add(r); }

/** Where each waits off the ring: the champion in his corner by the east steps, the opponent by the west steps. */
const EAST = { x: RING.x + RING_HALF + 0.9, z: RING.z }, WEST = { x: RING.x - RING_HALF - 0.9, z: RING.z };
const onRing = (x: number) => Math.abs(x - RING.x) < RING_HALF + 0.3;

// ---------- the referee ----------
const gyoji = belowGround(new Person(0x7A4FB0, 'farmer'));
// his farmer's straw hat, in black lacquer: a referee's cap
gyoji.traverse(o => { if (o instanceof Mesh && o.material === mat(0xE3C26B)) o.material = mat(0x1B1A1E); });
const fan = gyoji.arms[1];
{
  const f = mesh(G.cyl, 0xD9A63A, 0, -0.66, 0.05, true); f.scale.set(0.16, 0.02, 0.2); f.rotation.x = Math.PI / 2;
  fan.add(mesh(G.rope, 0x3A2A20, 0, -0.44, 0.05)); fan.children[fan.children.length - 1].scale.y = 0.22;
  fan.add(f);
}
gyoji.visible = false;
scene.add(gyoji);

// ---------- the drummers (the Underground Arena's) ----------
const drummers: Person[] = [];
function drums(dt: number) {
  if (!parts.drums.visible) return;
  if (!drummers.length) {
    for (const d of DRUMS) {
      const p = belowGround(new Person(0xF4F1EA)); p.headband(0xC0392B);
      p.position.set(d.x + 0.8, CY, d.z); p.rotation.y = -Math.PI / 2;
      scene.add(p); drummers.push(p);
    }
  }
  const loud = crowd.excite > 0.5;
  drummers.forEach((d, i) => { d.arms.forEach((a, j) => { a.rotation.x = loud ? -1.4 + Math.sin(F.t * 11 + i + j * Math.PI) * 0.6 : -0.4; }); });
  void dt;
}

// ---------- the bout ----------
/** Who the champion's up against: the boss whose rush it is, or tonight's local. */
const bossOn = () => (F.rush ? BOSSES[F.rush.boss] : null);
let dressedAs = '';
function dressRival() {
  const b = bossOn(), key = b ? b.name : 'local' + (F.bout.n % LOCAL_BELTS.length);
  if (key === dressedAs) return;
  dressedAs = key;
  if (b) { rival.dress(b.belt, b.skin); rival.setWeight(b.crowd >= 500 ? 200 : 160 + F.rush!.boss * 8); }
  else { rival.dress(LOCAL_BELTS[F.bout.n % LOCAL_BELTS.length]); rival.setWeight(130 + (F.bout.n * 13) % 30); }
}
const lineEl = document.getElementById('boutLine')!;
/** What the bout line over the ring says. */
export function boutLine() {
  const b = bossOn();
  if (b) return `${CHAMP} against ${b.name} ${b.face}`;
  if (F.bout.phase === 'pay') return `${CHAMP} wins`;
  return `${CHAMP} against a local · 💪 ${strength()}`;
}

const ease = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
/** Stands a wrestler at `x` along the ring (on its top if he's on it), facing his opponent, leaning `lean`. */
function stand(r: RikishiModel, x: number, z: number, east: boolean, lean = 0, armX = 0) {
  r.position.set(x, onRing(x) && Math.abs(z - RING.z) < RING_HALF ? CY + RING_TOP : CY, z);
  r.rotation.set(0, east ? -Math.PI / 2 : Math.PI / 2, 0);
  r.upper.rotation.x = lean;
  r.arms.forEach(a => { a.rotation.set(armX, 0, 0); });
  r.legs.forEach(l => l.rotation.set(0, 0, 0));
}
/** Walks from his corner to his mark (k from 0 to 1), up the steps. */
function walkIn(r: RikishiModel, east: boolean, k: number) {
  const from = east ? EAST : WEST, to = RING.x + (east ? MARK : -MARK);
  stand(r, from.x + (to - from.x) * ease(k), RING.z, east);
  const s = k > 0 && k < 1 ? Math.sin(k * 30) : 0;
  r.legs[0].rotation.x = s * 0.5; r.legs[1].rotation.x = -s * 0.5;
}
/** Stamps: each leg raised high to the side and brought down, in turn. Returns whether a foot just came down. */
const footUp = new Set<RikishiModel>();
function shiko(r: RikishiModel, east: boolean, t: number, off: number) {
  stand(r, RING.x + (east ? MARK : -MARK), RING.z, east, 0.25, -0.2);
  const s = Math.max(0, Math.sin((t * 0.5 + off) * Math.PI * 2)), leg = Math.floor(t + off * 2) % 2;
  r.legs[leg].rotation.z = (leg ? -1 : 1) * s * 1.1;
  r.position.y -= 0.12 * s;
  if (s > 0.5) footUp.add(r);
  else if (s < 0.05 && footUp.delete(r)) return true;
  return false;
}
/** The pair locked together at `c` along the ring (0 the middle; + towards the west, the champion winning). */
function grapple(c: number, t: number) {
  const x = RING.x - c;
  stand(champ, x + 0.45, RING.z, true, 0.55, -1.45);
  stand(rival, x - 0.45, RING.z, false, 0.55, -1.45);
  champ.legs[0].rotation.x = Math.sin(t * 9) * 0.4; rival.legs[1].rotation.x = Math.sin(t * 9 + 1) * 0.4;
}
/** The loser going over the straw, `k` from 0 to 1 of the way out, and down. */
function over(champWon: boolean, k: number) {
  const dir = champWon ? 1 : -1, c = dir * (PUSH + OVER * k), x = RING.x - c;
  const win = champWon ? champ : rival, lose = champWon ? rival : champ;
  stand(win, x + (champWon ? 0.32 : -0.32), RING.z, champWon, 0.4, -1.4);
  stand(lose, x + (champWon ? -0.32 : 0.32), RING.z, !champWon, -0.4 * k, -0.6);
  lose.position.y -= Math.max(0, Math.abs(lose.position.x - RING.x) - RING_HALF) * 0.6;
  lose.rotation.z = 0.5 * k * (champWon ? -1 : 1);
}

/** What was happening last frame, to catch the moments to react to. */
let was = { phase: '', t: 0 }, edged = false;
/** The bout's moments, as the crowd hears them. */
function moments(ph: string, t: number) {
  const crossed = (at: number) => ph === was.phase && was.t < at && t >= at;
  if (ph !== was.phase) {
    if (ph === 'prep') dressRival();
    if (ph === 'sit') react('crouch');
    if (ph === 'fight') { react('charge'); edged = false; dressRival(); }
    if (ph === 'pay') react(F.rush ? (F.bout.win ? 'upset' : 'win') : 'win');
  }
  if (crossed(STEP_UP) && ph === 'prep') react('billing');
  if (crossed(2.2) && ph === 'pay') react('bow');
}

function pose(dt: number) {
  const B = F.bout, t = B.t;
  dressRival();
  champ.rotation.z = rival.rotation.z = 0;
  if (B.phase === 'prep') {
    if (t < STEP_UP) { walkIn(champ, true, 0); walkIn(rival, false, 0); }
    else if (t < STAMP) { const k = clamp01((t - STEP_UP) / (STAMP - STEP_UP - 1)); walkIn(champ, true, k); walkIn(rival, false, k); }
    else {
      const a = shiko(champ, true, t - STAMP, 0), b = shiko(rival, false, t - STAMP, 0.5);
      if (a || b) react('stomp');
    }
  } else if (B.phase === 'sit') {
    // the crouch behind the white lines, while the fans sit down
    const k = ease(clamp01(t / 1.5));
    stand(champ, RING.x + MARK - 0.88 * k, RING.z, true, 0.85 * k, -0.5 * k);
    stand(rival, RING.x - MARK + 0.88 * k, RING.z, false, 0.85 * k, -0.5 * k);
    champ.position.y -= 0.18 * k; rival.position.y -= 0.18 * k;
  } else if (B.phase === 'fight') {
    // the charge, then the push, following the tug
    const k = clamp01(t / 0.5);
    if (k < 1) {
      stand(champ, RING.x + 0.62 - 0.3 * k, RING.z, true, 0.85 - 0.35 * k, -1.4 * k);
      stand(rival, RING.x - 0.62 + 0.3 * k, RING.z, false, 0.85 - 0.35 * k, -1.4 * k);
    } else grapple(B.tug * PUSH + 0.08 * Math.sin(F.t * 6), F.t);
    if (!edged && Math.abs(B.tug) > 0.82) { edged = true; react('edge'); }
    if (Math.abs(B.tug) < 0.5) edged = false;
  } else {
    // the result: over the straw, the bow, and back to their corners
    const won = B.win;
    if (t < 1.4) over(won, ease(t / 1.4));
    else if (t < 4) {
      const b = t < 2.2 ? 0 : 0.6 * Math.sin(((t - 2.2) / 1.8) * Math.PI);
      stand(champ, RING.x + MARK, RING.z, true, b); stand(rival, RING.x - MARK, RING.z, false, b);
    } else { const k = clamp01((t - 4) / (BOUT.pay - 4.5)); walkIn(champ, true, 1 - k); walkIn(rival, false, 1 - k); }
  }
  // the referee follows the pair, and points his fan at the winner
  const ph = B.phase, mid = ph === 'fight' ? -B.tug * PUSH : 0;
  gyoji.position.x += (RING.x + mid * 0.6 - gyoji.position.x) * Math.min(1, dt * 3);
  fan.rotation.x = ph === 'pay' ? -2.2 : ph === 'fight' ? -1.6 : -0.9;
  fan.rotation.z = ph === 'pay' ? (B.win ? -0.6 : 0.6) : 0;
  gyoji.rotation.y = ph === 'pay' ? (B.win ? Math.PI * 0.75 : -Math.PI * 0.75) : Math.PI;
}

/** The sparring partner, slapping the teppo post with one hand and the other. */
function spar() {
  partner.position.set(TEPPO.x - 0.75, CY, TEPPO.z);
  partner.rotation.y = Math.PI / 2;
  const s = Math.sin(F.t * 5);
  partner.arms[0].rotation.x = -1.5 + Math.max(0, s) * 0.6;
  partner.arms[1].rotation.x = -1.5 + Math.max(0, -s) * 0.6;
  partner.upper.rotation.x = 0.2;
}

// ---------- every frame ----------
/** The 'dohyo' stage-up, or a stage 3 save: the referee in the ring, and the wrestlers. */
export function openRing() {
  gyoji.visible = champ.visible = rival.visible = partner.visible = true;
  gyoji.position.set(RING.x, CY + RING_TOP, RING.z - 1.9);
}

export function updDohyo(dt: number) {
  if (!gyoji.visible) return;
  const ph = F.bout.phase, t = F.bout.t;
  moments(ph, t);
  pose(dt);
  was = { phase: ph, t };
  spar();
  drums(dt);
  // Mr. Fugu puffs up when the house roars
  boss.puffTo = crowd.excite > 1 ? 1 : 0;
  boss.update(dt);
  lineEl.hidden = !level.down || !showLine;
  if (!lineEl.hidden) { const l = boutLine(); if (lineEl.textContent !== l) lineEl.textContent = l; }
}
/** Whether the bout line's up: on the watch spot, or while a boss is in (gong.ts says). */
let showLine = false;
export function showBoutLine(on: boolean) { showLine = on; }
/** The champion and his opponent, for tests. */
export const ring = { champ, rival, partner, gyoji };
