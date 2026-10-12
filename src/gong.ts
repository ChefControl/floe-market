// The gong, and what's shown about the fight night (stage 3). Standing at the gong opens its panel: the next boss, the
// crowd he brings and how long the bell gives you, and exactly how ringing it now would go, worked out by running the
// rush ahead in a copy of the cellar, with the player in it working as a good player would (fight.ts's forecast):
// "Ready: you'll turn 70 of his 120", or "You'll turn 55 of his 120: 6 short of 61". No fee, no luck: ring it
// whenever. The bout bar over the screen follows every bout: the fans buying soup (and on a boss night, his bell
// running down), the fans taking their seats, and the fight, a tug of war between the champion's fans and his
// opponent's, in their colours. After a boss's bout a card says how it went, and on a loss which line held the kitchen
// up. The HUD's 💪 is the fans fed in this bout's preparation. And the watch spot 👁️ by the ring: stand on it and the camera
// closes in on the bout, with the names over it.
import { cellar, CY, gongDisc, RING } from './cellar';
import { GONG_PAD, WATCH } from './cellarPlan';
import { decal, drawPad } from './decals';
import { showBoutLine } from './dohyo';
import {
  BATCH, BOSSES, BUYOUT, type Carry, F, forecast, ICON, type Ing, NAME, needRate, nextBoss, ringGong, type Rush, sides, STALL_CAP,
  strength, toBeat, worstShort, you,
} from './fight';
import { kindOf } from './items';
import { buyHeld } from './input';
import { level, stage } from './layout';
import { player } from './player';
import { CHAMP } from './rikishi';
import { CELLAR_ZOOM, view } from './stage';
import { BOSS_COLOR, OURS } from './swarm';
import { d2xz } from './util';

const $ = (id: string) => document.getElementById(id)!;
const amount = (v: number) => Math.floor(v).toLocaleString('en-US');

// ---------- the pads ----------
const pads = [
  { at: GONG_PAD, d: decal(GONG_PAD.r * 2, (c, w, h) => drawPad(c, w, h, '🔔')) },
  { at: WATCH, d: decal(WATCH.r * 2, (c, w, h) => drawPad(c, w, h, '👁️')) },
];
for (const p of pads) { p.d.mesh.position.set(p.at.x, CY + 0.012, p.at.z); cellar.add(p.d.mesh); }
const on = (p: { x: number; z: number; r: number }) => level.down && d2xz(player.g.position, p) < p.r * p.r;

// ---------- the player, as the forecast sees them ----------
/** What's most of what the player's carrying: bowls first, then ready ingredients, then raw ones. */
function carried(): Carry | null {
  const all = player.back.all(), of = (k: string) => all.filter(m => kindOf(m) === k);
  const bowls = of('bowl');
  if (bowls.length) return { k: 'bowl', bowls: bowls.map(b => !!b.userData.mush) };
  const ready: [Ing, number][] = [['rice', of('rrice').length], ['fish', of('cfish').length], ['mush', of('mush').length]];
  const [k, n] = ready.sort((a, b) => b[1] - a[1])[0];
  return n ? { k, ready: true, n } : null;
}
/** How much the player's arms can take: what's in them that isn't their load (raw rice and fish, mostly) takes room. */
function room(c: Carry | null) {
  const n = player.back.all().length, load = !c ? 0 : c.k === 'bowl' ? c.bowls.length : c.n;
  return Math.max(1, player.back.cap - (n - load));
}
you.now = () => {
  if (!level.down) return null;
  const c = carried();
  return { x: player.g.position.x, z: player.g.position.z, speed: player.speed, cap: room(c), carry: c };
};

// ---------- the gong's panel ----------
const panel = $('gong'), bossEl = $('gongBoss'), crowdEl = $('gongCrowd'), castEl = $('gongCast'), go = $('gongGo') as HTMLButtonElement;
/** What the panel says, so it's only rewritten when something in it changes. */
let said = '';
function render() {
  const b = nextBoss(), R = F.rush;
  let head: string, crowd: string, cast: string, cls = '', button: string | null = 'Ring the gong 🔔';
  if (R && !R.done) {
    const boss = BOSSES[R.boss];
    head = `${boss.face} ${boss.name} is in`;
    crowd = `${R.turned} of his ${R.n} fans turned so far: ${toBeat(boss)} beats him`;
    cast = 'Keep the bowls coming!';
    button = null;
  } else if (!b) {
    head = 'No one left to fight';
    crowd = `All five beaten. Buy back all of Mr. Fugu's chips in his office: 🐡 ${amount(BUYOUT)}`;
    cast = '';
    button = null;
  } else {
    // (no forecast while the last boss's crowd is still on the floor: the gong can't be rung until it clears)
    const f = R ? null : forecast(), i = F.beaten;
    head = `${b.face} ${b.name} · boss ${i + 1} of ${BOSSES.length}`;
    crowd = `Brings ${b.crowd} fans: turn more than half (${toBeat(b)}) before the bell, ${b.bell} s · prize 🐡 ${amount(b.prize)}`;
    if (!f) cast = '';
    else if (f.turned >= toBeat(b)) { cast = `Ready: you'll turn ${f.turned} of his ${b.crowd}`; cls = 'ready'; }
    else {
      cast = `You'll turn ${f.turned} of his ${b.crowd}: ${toBeat(b) - f.turned} short of ${toBeat(b)}.`;
      if (f.worst) cast += ` The pot would wait on ${NAME[f.worst]} ${ICON[f.worst]}.`;
      cls = 'short';
    }
    if (R) button = 'Wait for the ring to clear';
  }
  const key = [head, crowd, cast, cls, button].join('|');
  if (key === said) return;
  said = key;
  bossEl.textContent = head; crowdEl.textContent = crowd; castEl.textContent = cast; castEl.className = cls;
  go.hidden = button === null;
  if (button) { go.textContent = button; go.disabled = !!R; }
}
/** Rings the gong, if a boss can be called in now: the bell starts. */
export function ring() {
  if (!ringGong()) return false;
  strike = 1;
  said = '';
  return true;
}
go.addEventListener('click', () => { if (!go.disabled) ring(); });

// ---------- the bout bar, and the card after a boss ----------
const rushEl = $('rush'), rushName = $('rushName'), rushBell = $('rushBell'), rushBar = $('rushBar'), rushKnot = $('rushKnot');
const rushYou = $('rushYou'), rushThem = $('rushThem'), barEl = rushBar.parentElement!;
const card = $('fightCard');
let cardT = 0;
card.addEventListener('click', () => { card.hidden = true; });
/** The card after a boss's rush: turned him, or how short, why, and what it takes. */
export function showCard(R: Rush) {
  const boss = BOSSES[R.boss], pct = Math.round(Math.min(1, R.turned / R.n) * 100), need = toBeat(boss);
  const h = document.createElement('h2'), p1 = document.createElement('p'), bar = document.createElement('div'), p2 = document.createElement('p');
  bar.className = 'bar'; bar.innerHTML = '<i></i>'; (bar.firstChild as HTMLElement).style.width = pct + '%';
  if (R.win) {
    h.className = 'win'; h.textContent = 'You won his crowd over';
    p1.textContent = `${R.turned} of his ${R.n} fans were yours, and ${boss.face} ${boss.name} went over the rope.`;
    p2.textContent = `Prize: 🐡 ${amount(boss.prize)}. Revealed: ${boss.opens}.`;
  } else {
    const worst = worstShort(R);
    h.className = 'lose'; h.textContent = `Pushed out by ${boss.name} ${boss.face}`;
    p1.textContent = `You turned ${R.turned} of his ${R.n} fans: ${need - R.turned} short of the ${need} that beat him.`;
    p2.textContent = (R.dryT > 1
      ? `Your stall stood empty for ${Math.round(R.dryT)} s${worst ? `, and the pot was waiting on ${NAME[worst]} ${ICON[worst]}` : ''}. `
      : 'The bowls came too slowly from the counter. ')
      + `Ready at about ${needRate(boss)} batches a minute with a full stall of ${STALL_CAP} (${BATCH} bowls a batch). No fee: grow and come back.`;
  }
  const small = document.createElement('small'); small.textContent = 'Tap to close';
  card.replaceChildren(h, p1, bar, p2, small);
  card.hidden = false;
  cardT = 10;
}
/** What the bout bar said last, so it's only rewritten when something in it changes. */
let barSaid = '';
/** The boss's bout bar: the phase and its clock, and the tug of war, the champion's fans (orange, on the left) against
 *  the boss's, the knot moving with the fight. (A local's the free show, told by the arena alone: no bar.) */
function renderBout() {
  const R = F.rush, show = level.down && stage.n === 3 && !!R;
  rushEl.hidden = !show;
  if (!show) { barSaid = ''; return; }
  const B = F.bout, boss = BOSSES[R.boss];
  const { yours, theirs } = sides(), share = yours + theirs ? yours / (yours + theirs) : 0.5;
  let name: string, clock = '', left = `${CHAMP} ${yours}`;
  const right = `${theirs} ${boss.name}`;
  if (B.phase === 'prep') {
    // (his bell waits for his whole crowd to reach the stall)
    name = R.walk > 0 ? `${boss.face} ${boss.name}'s crowd is coming in` : `${boss.face} ${boss.name}'s crowd is in`;
    clock = `🔔 ${Math.max(0, Math.ceil(boss.bell - R.t))} s`;
    left = `${yours} turned · ${toBeat(boss)} beats him`;
  } else if (B.phase === 'sit') name = 'Taking their seats';
  else if (B.phase === 'fight') { name = `${CHAMP} against ${boss.name} ${boss.face}`; clock = 'Fight!'; }
  else name = B.win ? `${CHAMP} wins!` : `${boss.name} wins`;
  // (the knot waits on the middle, more than half, until the fight pulls it one way or the other)
  const knot = B.phase === 'fight' || B.phase === 'pay' ? 50 - B.tug * 46 : 50;
  const key = [name, clock, left, right, Math.round(share * 200), Math.round(knot * 2)].join('|');
  if (key === barSaid) return;
  barSaid = key;
  rushName.textContent = name; rushBell.textContent = clock; rushYou.textContent = left; rushThem.textContent = right;
  barEl.style.background = '#' + BOSS_COLOR.getHexString();
  rushBar.style.width = Math.round(share * 1000) / 10 + '%';
  rushBar.style.background = '#' + OURS.getHexString();
  rushKnot.style.left = Math.round(knot * 10) / 10 + '%';
}

// ---------- 💪 ----------
const power = $('power'), powerN = $('powerN'), seasonChip = $('season');
let shownPower = -1, shownOn: boolean | null = null;
function renderPower() {
  const show = stage.n === 3 && level.down;
  if (show !== shownOn) { shownOn = show; power.hidden = !show; seasonChip.hidden = show; }
  const n = strength();
  if (show && n !== shownPower) { shownPower = n; powerN.textContent = String(n); }
}

// ---------- the watch spot ----------
/** How far the camera's closed in on the ring, 0 to 1. */
let watch = 0;
function updWatch(dt: number) {
  const want = on(WATCH) ? 1 : 0;
  if (want === 0 && watch === 0) return;
  watch += (want - watch) * Math.min(1, dt * 2.5);
  if (Math.abs(want - watch) < 0.002) watch = want;
  view.focus.set(RING.x, CY, RING.z);
  view.k = 0.85 * watch;
  view.zoom = CELLAR_ZOOM * (1 - 0.45 * watch);
}
/** Whether the camera's on the ring (for tests). */
export const watching = () => watch > 0.5;

// ---------- every frame ----------
/** The gong's swing after it's struck. */
let strike = 0, held = false;
export function updGong(dt: number) {
  const atGong = on(GONG_PAD) && stage.n === 3;
  if (atGong !== !panel.hidden) { panel.hidden = !atGong; said = ''; }
  if (atGong) render();
  // E rings it, once a press
  const press = buyHeld() && !held;
  held = buyHeld();
  if (atGong && press) ring();
  strike = Math.max(0, strike - dt * 0.4);
  gongDisc.rotation.x = Math.sin(strike * 30) * 0.25 * strike;
  renderBout();
  renderPower();
  updWatch(dt);
  // (during a rush, the rush's bar says who's in)
  showBoutLine(watch > 0.5 && !(F.rush && !F.rush.done));
  if (cardT > 0) { cardT -= dt; if (cardT <= 0) card.hidden = true; }
}
