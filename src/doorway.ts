// The way into the Undertow (stage 3): Mama Moray's restroom, out front, and the out-of-order stall in it, whose back
// is the doorman's door (southDoor.ts). In the restroom the view comes in closer, and stepping into the stall the dark
// closes in round the edges of the screen, as it did down the old tunnel; the club's band comes through the stall's
// back, muffled, louder the nearer you get, and full once it swings open. In the club the view comes in closer still.
// The doorman's slot, his eyes behind it and his speech bubble are made here and hung on his door.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { parts } from './cellar';
import { CLUB_DOOR, CLUB_WAY, STALL } from './cellarPlan';
import { updFog } from './clubFog';
import { CARDS, DEN, found, level, LOANS, LOO, VIP } from './layout';
import { club } from './noir';
import { player } from './player';
import { G, mesh } from './render';
import { bubble } from './speech';
import { staging, view } from './stage';
import type { Vector3 } from 'three';

/** The doorman's door's middle, on the restroom's west wall. */
const MID = { x: CLUB_DOOR.x, z: (CLUB_DOOR.z0 + CLUB_DOOR.z1) / 2 };

/** The doorman's slot, at his eye height: its cover, which slides aside (along its length, `z`), and the eyes behind
 *  it, looking out along `x` (southDoor.ts hangs it on his door). */
const slot = new Group();
const slotBack = new Mesh(new BoxGeometry(0.015, 0.13, 0.4), new MeshBasicMaterial({ color: 0x050405 }));
slot.add(slotBack);
const cover = new Mesh(new BoxGeometry(0.02, 0.16, 0.42), new MeshBasicMaterial({ color: 0x23282C }));
cover.position.x = 0.012; slot.add(cover);
const eyes = new Group(); eyes.position.x = 0.01; slot.add(eyes);
for (const s of [-1, 1]) {
  const e = mesh(G.sphere, new MeshBasicMaterial({ color: 0xF2D27A }), 0, 0, s * 0.085); e.scale.set(0.012, 0.03, 0.042); eyes.add(e);
  const pupil = mesh(G.sphere, new MeshBasicMaterial({ color: 0x0A0A0A }), 0.008, 0, s * 0.085); pupil.scale.set(0.008, 0.022, 0.016); eyes.add(pupil);
  const brow = mesh(G.box, 0x1A1416, 0.006, 0.042, s * 0.085); brow.scale.set(0.01, 0.014, 0.08); brow.rotation.x = s * 0.35; eyes.add(brow);
}
eyes.visible = false;
/** What the doorman says, over his door. */
const says = bubble(parts.den, 2.1);
// (the matchbook held up to him was once a sprite made here, as the game loads: its texture, the texture's source, its
// material and itself, four ids of four draws of the luck each. They're still drawn, so the luck upstairs goes as it did.)
for (let i = 0; i < 16; i++) Math.random();
/** The doorman's things, for his door (southDoor.ts). */
export const doorman = { slot, cover, eyes, says };

// ---------- the screen: the dark closing in, in the stall ----------
const shade = document.getElementById('tunnelShade')!;

/** Whether the restroom or the club has the camera in closer. */
let closer = false;
/** How close the camera comes in (of the cellar's own view): in the restroom, and in the club and its side rooms. */
export const CLOSE = { loo: 0.78, club: 0.55 };
const inside = (p: { x: number; z: number }, r: { x0: number; x1: number; z0: number; z1: number }, m = 0.3) => p.x > r.x0 - m && p.x < r.x1 + m && p.z > r.z0 - m && p.z < r.z1 + m;
/** Whether `p` is in the club, its side rooms or the way in from the stall. */
const inClub = (p: Vector3) => [DEN, LOANS, CARDS, VIP, CLUB_WAY].some(r => inside(p, r));
/** The out-of-order stall (southDoor.ts sets it, resto.ts dresses it): how open its back, the doorman's door, is, 0 to
 *  1; whether its caution tape's been torn away (in the scene at it: after that, `F.den.way`); and seconds left of its
 *  bulb's flicker. */
export const stallDoor = { open: 0, torn: false, flicker: 0 };

/** The way in, every frame (stage 3): the dark in the stall, the camera in the restroom and the club, and the band. */
export function updDoorway(dt: number) {
  const p = player.g.position, down = level.down;
  updFog(dt);
  // the dark closing in in the out-of-order stall, once there's something behind it (not while it's open on the club)
  const inStall = down && found.den && inside(p, STALL, 0);
  shade.style.opacity = String(inStall ? 0.55 * (1 - stallDoor.open * 0.6) : 0);
  // the view coming in closer in the restroom, closer still in the club (not while an upgrade has the camera)
  const close = down && inside(p, LOO, 0) ? CLOSE.loo : down && found.den && inClub(p) ? CLOSE.club : 0;
  // (only ever pulling it back out from where it pulled it in: an upgrade's spotlight has it otherwise)
  if (close && !staging()) { closer = true; view.close += (close - view.close) * Math.min(1, dt * 2.5); }
  else if (closer) { view.close += (1 - view.close) * Math.min(1, dt * 2.5); if (view.close > 0.995) { view.close = 1; closer = false; } }
  // the player's stride shortened as the view comes in (eased alongside it), so a room's as big on foot as it looks
  const stride = close || 1;
  player.stride += (stride - player.stride) * Math.min(1, dt * 2.5);
  if (Math.abs(player.stride - stride) < 0.005) player.stride = stride;
  const heard = clubHeard(p);
  club.k = heard.k; club.muffle = heard.muffle; club.vol = heard.vol;
}

/** How far the club's band is heard, 0 to 1 (the stage's music fading out under it), how muffled (0: clear, 1: through
 *  the shut door), and how loud besides: full in the club; in Harry's office, Tommy's card room and Eddie's room, through
 *  their doorways, a little quieter and duller (and the stage's music still all gone, so it never comes back in by a side
 *  room's wall); through the stall's back in Mama Moray's restroom, louder the nearer you get (music.ts). */
export function clubHeard(p: { x: number; z: number }) {
  if (!level.down || !found.den) return { k: 0, muffle: 1, vol: 1 };
  // (the club reaches right up to the stall's back: no step between them where neither hears it)
  if (p.x > DEN.x0 - 0.5 && p.x < LOO.x0 && p.z > DEN.z0 - 0.5 && p.z < DEN.z1 + 0.5) return { k: 1, muffle: 0, vol: 1 };
  if (p.x > LOANS.x0 - 0.5 && p.x <= DEN.x0 - 0.5 && p.z > LOANS.z0 - 0.5 && p.z < CARDS.z1 + 0.5) return { k: 1, muffle: 0.45, vol: 0.8 };
  if (p.x > VIP.x0 - 0.5 && p.x < VIP.x1 + 0.5 && p.z >= DEN.z1 + 0.5 && p.z < VIP.z1 + 0.5) return { k: 1, muffle: 0.45, vol: 0.8 };
  if (!inside(p, LOO, 0.3)) return { k: 0, muffle: 1, vol: 1 };
  // (in the restroom: from its far side to right at the stall's back)
  const a = Math.max(0, Math.min(1, 1 - (Math.hypot(p.x - MID.x, p.z - MID.z) - 0.6) / 3.4));
  return { k: 0.25 + 0.65 * a * a, muffle: 1 - stallDoor.open, vol: 1 };
}
