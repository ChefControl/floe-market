// The way into the Undertow (stage 3): a long dark tunnel and a pair of heavy doors with a doorman behind them. Walking
// down the tunnel, the view closes in and darkens round the edges, its caged bulbs flicker, water drips from the beams
// and a pipe leaks steam, and the club's band comes through the doors, muffled, louder as you go. The first time, the
// doors are shut: you knock, a slot slides open on a pair of eyes, "Password?", and you hold up Mr. Fugu's matchbook (the
// club on it is theirs). He lets you in: the bolts go, the doors swing open on a burst of light and smoke, and the music
// comes up full. After that, the doors open as you come up to them, from either side, and shut behind you; and now and
// then he says good evening through the slot.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { noise, tone } from './audio';
import { CY, denDoor, parts } from './cellar';
import { CLUB_DOOR, CLUB_WAY } from './cellarPlan';
import { liftFog, updFog } from './clubFog';
import { F } from './fight';
import { club } from './noir';
import { dustFx, steamer } from './fx';
import { CARDS, DEN, found, level, LOANS, PASSAGE, VIP } from './layout';
import { player } from './player';
import { canvasTex, G, mesh } from './render';
import { bubble } from './speech';
import { staging, view } from './stage';
import { d2xz, V } from './util';

const D = CLUB_DOOR, MID = { x: D.x, z: (D.z0 + D.z1) / 2 }, LEAF = (D.z1 - D.z0) / 2, H = 2.1;
/** The camera's own view of the doors while the doorman looks you over (main.ts eases to it and back). */
export const doorCam = { k: 0, pos: V(D.x + 1.9, CY + 4.3, MID.z + 2.4), look: V(D.x - 0.2, CY + 1.05, MID.z - 0.1) };

// ---------- the doors ----------
const WOOD = new MeshLambertMaterial({ color: 0x3A2418 }), IRON = new MeshLambertMaterial({ color: 0x23282C });
/** Each leaf, hung at its outer edge, swinging in towards the club: its pivot, turned to open it. */
const leaves = [-1, 1].map(s => {
  const pivot = new Group(); pivot.position.set(D.x, CY, s < 0 ? D.z0 : D.z1);
  const at = -s * LEAF / 2;
  const slab = new Mesh(new BoxGeometry(0.09, H, LEAF - 0.02), WOOD); slab.position.set(0, H / 2, at); pivot.add(slab);
  for (const y of [0.35, 1.05, 1.75]) { const band = new Mesh(new BoxGeometry(0.1, 0.07, LEAF - 0.04), IRON); band.position.set(0, y, at); pivot.add(band); }
  for (const y of [0.35, 1.05, 1.75]) for (const z of [-0.25, 0, 0.25]) { const stud = mesh(G.sphere, 0x6A6F74, 0.05, y, at + z); stud.scale.setScalar(0.022); pivot.add(stud); }
  const ring = mesh(new CylinderGeometry(0.06, 0.06, 0.015, 14), 0x8A7A4A, 0.06, 1.0, -s * (LEAF - 0.12)); ring.rotation.z = Math.PI / 2; pivot.add(ring);
  parts.den.add(pivot);
  return { pivot, s };
});
// the frame round them: iron posts and a lintel, a caged lamp over it, and a pink glow under the doors from inside
for (const z of [D.z0 - 0.07, D.z1 + 0.07]) { const post = new Mesh(new BoxGeometry(0.2, H + 0.15, 0.14), IRON); post.position.set(D.x, CY + (H + 0.15) / 2, z); parts.den.add(post); }
{
  const lintel = new Mesh(new BoxGeometry(0.24, 0.2, D.z1 - D.z0 + 0.34), IRON); lintel.position.set(D.x, CY + H + 0.12, MID.z); parts.den.add(lintel);
  const under = new Mesh(new PlaneGeometry(0.06, D.z1 - D.z0 - 0.1), new MeshBasicMaterial({ color: 0xFF5FA8, transparent: true, opacity: 0.85 }));
  under.position.set(D.x + 0.06, CY + 0.012, MID.z); under.rotation.x = -Math.PI / 2; parts.den.add(under);
}
/** The slot in the north leaf, at a doorman's eye height: its cover, which slides aside, and the eyes behind it. */
const slot = new Group();
slot.position.set(0.05, 1.62, LEAF * 0.58);
leaves[0].pivot.add(slot);
const slotBack = new Mesh(new BoxGeometry(0.015, 0.13, 0.4), new MeshBasicMaterial({ color: 0x050405 }));
slot.add(slotBack);
const cover = new Mesh(new BoxGeometry(0.02, 0.16, 0.42), IRON); cover.position.x = 0.012; slot.add(cover);
const eyes = new Group(); eyes.position.x = 0.01; slot.add(eyes);
for (const s of [-1, 1]) {
  const e = mesh(G.sphere, new MeshBasicMaterial({ color: 0xF2D27A }), 0, 0, s * 0.085); e.scale.set(0.012, 0.03, 0.042); eyes.add(e);
  const pupil = mesh(G.sphere, new MeshBasicMaterial({ color: 0x0A0A0A }), 0.008, 0, s * 0.085); pupil.scale.set(0.008, 0.022, 0.016); eyes.add(pupil);
  const brow = mesh(G.box, 0x1A1416, 0.006, 0.042, s * 0.085); brow.scale.set(0.01, 0.014, 0.08); brow.rotation.x = s * 0.35; eyes.add(brow);
}
eyes.visible = false;
/** What the doorman says, over the doors; and the matchbook you hold up. */
const says = bubble(parts.den, 2.1);
const matchbook = new Sprite(new SpriteMaterial({ map: canvasTex(96, 128, (c, w, h) => {
  c.fillStyle = '#7A1622'; c.fillRect(6, 4, w - 12, h - 8);
  c.fillStyle = '#E8C46A'; c.fillRect(6, 4, w - 12, 22); c.fillRect(6, h - 30, w - 12, 4);
  c.font = '44px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🐡', w / 2, h / 2 + 6);
}).tex, depthTest: false }));
matchbook.scale.set(0.32, 0.42, 1); matchbook.visible = false; matchbook.renderOrder = 6;
parts.den.add(matchbook);

// ---------- the tunnel ----------
/** Its caged bulbs, hung from the beams: each flickers now and then. */
const bulbs = [PASSAGE.z0 + 1.8, (PASSAGE.z0 + PASSAGE.z1) / 2 + 0.2, D.z0 - 0.6].map((z, i) => {
  const x = (PASSAGE.x0 + PASSAGE.x1) / 2, g = new Group(); g.position.set(x, CY + 2.05, z);
  const cord = mesh(G.rope, 0x1B1A1E, 0, 0.25, 0); cord.scale.y = 0.5; g.add(cord);
  const m = new MeshLambertMaterial({ color: 0xFFE2A8, emissive: 0xFFA43A, emissiveIntensity: 1 });
  const bulb = mesh(G.sphere, m, 0, 0, 0); bulb.scale.setScalar(0.07); g.add(bulb);
  for (let k = 0; k < 4; k++) { const wire = mesh(G.box, 0x23282C, Math.cos(k * Math.PI / 2) * 0.08, 0, Math.sin(k * Math.PI / 2) * 0.08); wire.scale.set(0.01, 0.18, 0.01); g.add(wire); }
  parts.den.add(g);
  return { m, seed: i * 7.3 };
});
/** Where water drips from the beams, and each drop's place in its fall. */
const drips = [PASSAGE.z0 + 1.2, PASSAGE.z0 + 3.4, D.z0 - 1.6].map((z, i) => {
  const drop = mesh(G.sphere, new MeshLambertMaterial({ color: 0x9EC8D8, transparent: true, opacity: 0.8 }), PASSAGE.x0 + 0.35 + i * 0.25, CY + 2, z);
  drop.scale.set(0.018, 0.03, 0.018);
  parts.den.add(drop);
  return { drop, t: i * 0.9, every: 2.1 + i * 0.6 };
});
/** The pipe that leaks steam, at one of its joints. */
const leak = new Vector3(PASSAGE.x1 - 0.16, CY + 1.42, PASSAGE.z0 + 3.5);
steamer(leak, () => level.down && found.den);

// ---------- the screen: the dark closing in, and the light when the doors open ----------
const $ = (id: string) => document.getElementById(id)!;
const shade = $('tunnelShade'), flash = $('doorFlash');

// ---------- the doors' state ----------
/** How far open the doors are, 0 to 1, and where they're going. */
let open = 0, want = 0;
/** The first time's scene, while it plays: seconds into it. */
let scene: { t: number } | null = null;
/** Seconds the slot's open for a good evening, and whether he's said it this visit. */
let evening = 0, greeted = false;
/** Whether the tunnel or the club has the camera in closer. */
let closer = false;
/** How close the camera comes in (of the cellar's own view): down the tunnel, and in the club and its side rooms. */
export const CLOSE = { tunnel: 0.78, club: 0.55 };
/** Whether `p` is in the club, its side rooms or the way in from its doors. */
const inClub = (p: Vector3) => [DEN, LOANS, CARDS, VIP, CLUB_WAY].some(r => p.x > r.x0 - 0.3 && p.x < r.x1 + 0.3 && p.z > r.z0 - 0.3 && p.z < r.z1 + 0.3);
const SCENE = { knock: 0.5, slot: 1.2, ask: 1.45, book: 2.5, ok: 3.3, shut: 4.4, swing: 4.7, done: 5.6 };

/** How far down the tunnel the player is, 0 at its mouth to 1 at the doors; -1 out of it. */
function along(p: Vector3) {
  if (p.x < PASSAGE.x0 - 0.2 || p.x > PASSAGE.x1 + 0.2 || p.z < PASSAGE.z0 - 0.4 || p.z > PASSAGE.z1 + 0.2) return -1;
  return Math.max(0, Math.min(1, (p.z - PASSAGE.z0) / (MID.z - PASSAGE.z0)));
}
/** Whether the doors are open, the scene's over, and so on: for tests. */
export const doorState = () => ({ open, scene: scene?.t ?? null, says: says.text, let: F.den.door });

const sfx = {
  knock: (t: number) => { noise({ t, f: 220, q: 1.2, a: 0.008, d: 0.1, v: 0.22, at: MID }); tone({ t, f: 95, f2: 80, a: 0.008, d: 0.12, v: 0.14, at: MID }); },
  slide: () => noise({ f: 700, f2: 500, q: 2, a: 0.03, d: 0.22, v: 0.05, at: MID }),
  bolt: () => { noise({ f: 900, q: 3, a: 0.008, d: 0.08, v: 0.08, at: MID }); tone({ f: 160, f2: 120, a: 0.008, d: 0.1, v: 0.08, at: MID }); },
  creak: () => tone({ f: 130, f2: 92, type: 'triangle', lp: 700, a: 0.12, d: 0.6, v: 0.05, at: MID }),
  drip: (at: { x: number; z: number }) => tone({ f: 720, f2: 950, a: 0.01, d: 0.09, v: 0.02, at }),
};

/** The doors swing open: their light and smoke spill out into the tunnel (a big burst the first time). */
function burst(big: boolean) {
  want = 1;
  sfx.bolt(); sfx.creak();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) { flash.style.transition = 'none'; flash.style.opacity = big ? '0.75' : '0.3'; void flash.offsetWidth; flash.style.transition = `opacity ${big ? 1.1 : 0.6}s ease-out`; flash.style.opacity = '0'; }
  dustFx(V(D.x + 0.4, CY + 0.9, MID.z), big ? 14 : 5, big ? 1.6 : 1, [0x8A7A90, 0xC8A0B8]);
  if (big) liftFog();
}

/** The way in, every frame (stage 3, once the Undertow's found): the tunnel's lights, drips and dark, the doors, and
 *  the first time's scene. */
export function updDoorway(dt: number) {
  const p = player.g.position, down = level.down && found.den;
  updFog(dt);
  const k = down ? along(p) : -1;
  // the dark closing in down the tunnel, and the view coming in closer, closer still in the club (not while an upgrade
  // has the camera)
  shade.style.opacity = String(Math.max(0, k) * 0.7 * (1 - open * 0.6));
  const close = k >= 0 ? CLOSE.tunnel : down && inClub(p) ? CLOSE.club : 0;
  // (only ever pulling it back out from where it pulled it in: an upgrade's spotlight has it otherwise)
  if (close && !scene && !staging()) { closer = true; view.close += (close - view.close) * Math.min(1, dt * 2.5); }
  else if (closer) { view.close += (1 - view.close) * Math.min(1, dt * 2.5); if (view.close > 0.995) { view.close = 1; closer = false; } }
  // the player's stride shortened as the view comes in (eased alongside it), so the club's as big on foot as it looks
  const stride = close && !scene ? close : 1;
  player.stride += (stride - player.stride) * Math.min(1, dt * 2.5);
  if (Math.abs(player.stride - stride) < 0.005) player.stride = stride;
  const heard = clubHeard(p);
  club.k = heard.k; club.muffle = heard.muffle; club.vol = heard.vol;
  if (!down) { want = 0; open = 0; denDoor.shut = true; return; }
  const t = performance.now() / 1000;
  for (const b of bulbs) {
    const f = Math.sin(t * 13 + b.seed) * Math.sin(t * 3.1 + b.seed * 2);
    b.m.emissiveIntensity = f > 0.93 ? 0.15 : 0.85 + 0.15 * Math.sin(t * 40 + b.seed);
  }
  for (const d of drips) {
    d.t += dt;
    const fall = (d.t % d.every) / 0.55;
    d.drop.visible = fall < 1;
    d.drop.position.y = CY + 2 - 2 * Math.min(1, fall) ** 2;
    if (fall >= 1 && (d.t - dt) % d.every / 0.55 < 1 && k >= 0) sfx.drip(d.drop.position);
  }
  // the first time: the doorman's scene
  const near = (r: number) => d2xz(p, MID) < r * r;
  if (!F.den.door && !scene && k >= 0 && near(1.6)) { scene = { t: 0 }; player.held = true; player.moving = false; }
  if (scene) {
    const s = scene, was = s.t;
    s.t += dt;
    const at = (x: number) => was < x && s.t >= x;
    doorCam.k = Math.min(1, s.t / 0.6) * (s.t > SCENE.done ? Math.max(0, 1 - (s.t - SCENE.done) / 0.8) : 1);
    if (at(SCENE.knock)) { sfx.knock(0); sfx.knock(0.22); }
    if (at(SCENE.slot)) { eyes.visible = true; sfx.slide(); }
    if (at(SCENE.ask)) says.say('Password?');
    if (at(SCENE.book)) { matchbook.visible = true; }
    if (at(SCENE.ok)) says.say("...Fugu's book. Go on in.");
    if (at(SCENE.shut)) { matchbook.visible = false; sfx.slide(); }
    if (at(SCENE.swing)) { F.den.door = true; burst(true); player.held = false; }
    if (s.t >= SCENE.done + 0.8) scene = null;
    const slotK = s.t < SCENE.slot ? 0 : s.t < SCENE.shut ? Math.min(1, (s.t - SCENE.slot) / 0.25) : Math.max(0, 1 - (s.t - SCENE.shut) / 0.25);
    cover.position.z = -slotK * 0.42; eyes.visible = slotK > 0.3;
    // (held up towards the slot, at about head height)
    matchbook.position.set(p.x - 0.35, p.y + 1.5 + Math.min(0.12, Math.max(0, s.t - SCENE.book) * 0.4), p.z - 0.15);
  } else {
    doorCam.k = 0;
    // after that: the doors open as you come up to them, from either side, and shut behind you; from the tunnel, now
    // and then, a good evening through the slot first
    const close = near(1.7);
    if (close && want === 0) {
      if (k >= 0 && !greeted) { greeted = true; evening = 0.9; says.say('Evening.'); sfx.slide(); }
      else if (evening <= 0) burst(false);
    }
    if (evening > 0 && (evening -= dt) <= 0 && want === 0) burst(false);
    if (!near(2.4)) { if (want === 1) sfx.creak(); want = 0; }
    if (!down || !(p.x > DEN.x0 - 1 && p.x < PASSAGE.x1 + 1 && p.z > PASSAGE.z0 - 1)) greeted = false;
    const ek = evening > 0 ? Math.min(1, (0.9 - evening) / 0.2) : 0;
    cover.position.z = -ek * 0.42; eyes.visible = ek > 0.3;
  }
  open += (want - open) * Math.min(1, dt * (want ? 4 : 2.5));
  denDoor.shut = open < 0.6;
  for (const l of leaves) l.pivot.rotation.y = l.s * open * Math.PI * 0.55;
  // (kept in sight, and smaller close up as the doorman looks you over: speech.ts)
  if (says.upd(dt)) says.place(D.x + 0.25, CY + H + 0.45, MID.z);
}

/** How far the club's band is heard, 0 to 1 (the stage's music fading out under it), how muffled (0: clear, 1: through
 *  the shut doors), and how loud besides: full in the club; in Harry's office, Tommy's card room and Eddie's room, through
 *  their doorways, a little quieter and duller (and the stage's music still all gone, so it never comes back in by a side
 *  room's wall); through the doors down the tunnel, louder the nearer you get (music.ts). */
export function clubHeard(p: { x: number; z: number }) {
  if (!level.down || !found.den) return { k: 0, muffle: 1, vol: 1 };
  if (p.x > DEN.x0 - 0.5 && p.x < D.x - 0.1 && p.z > DEN.z0 - 0.5 && p.z < DEN.z1 + 0.5) return { k: 1, muffle: 0, vol: 1 };
  if (p.x > LOANS.x0 - 0.5 && p.x <= DEN.x0 - 0.5 && p.z > LOANS.z0 - 0.5 && p.z < CARDS.z1 + 0.5) return { k: 1, muffle: 0.45, vol: 0.8 };
  if (p.x > VIP.x0 - 0.5 && p.x < VIP.x1 + 0.5 && p.z >= DEN.z1 + 0.5 && p.z < VIP.z1 + 0.5) return { k: 1, muffle: 0.45, vol: 0.8 };
  const a = along(V(p.x, 0, p.z));
  if (a < 0) return { k: 0, muffle: 1, vol: 1 };
  return { k: 0.25 + 0.65 * a * a, muffle: 1 - open, vol: 1 };
}
