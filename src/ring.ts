// Fight night in the game (stage 3): runs fight.ts's cellar every frame, draws it (the kitchen, the bouts, the swarm,
// the gong), and answers what happens down there: chips into the wallet, the gong's crash and the crowd flooding in,
// the card after a rush, the grow room coming to light, Mr. Fugu's word about the way south to the Undertow, his
// office lighting up for the buyout.
import { CY, parts, showDen, showGrowRoom, showVenue, updBarFlap } from './cellar';
import { pileUp, updPiles } from './chipPiles';
import { BAR, GONG } from './cellarPlan';
import { openRing, updDohyo } from './dohyo';
import { CHIP, F, fightFrom, idleRate, on, resetFight, step } from './fight';
import { front } from './front';
import { cardUp, showCard, updGong, walkIn } from './gong';
import { DOORS, HATCH_AT, level, PREP, stage } from './layout';
import { cellarAway } from './levelCull';
import { collect } from './loan';
import { updOffice } from './office';
import { updUndertow } from './undertow';
import { player } from './player';
import { pointAt } from './pointers';
import { popIn } from './pop';
import { built, slideParts, updRingKitchen } from './ringKitchen';
import { headless } from './headless';
import { updResto } from './resto';
import { crowd, react } from './ringSound';
import { save } from './save';
import { meetPlaying } from './meet';
import { callFugu, dressDoor, updSouthDoor, wayPlaying } from './southDoor';
import { chime, fanfare, gong, levelUp } from './sfx';
import { spotlight } from './spotlight';
import { staging } from './stage';
import { inHall, updSwarm } from './swarm';
import { popText } from './ui';
import { showProgress, visibleTiles } from './unlocks';
import { FY } from './util';
import { addMoney } from './wallet';

/** Chips taken at the soup bar since the last "+🐡" over it (one a second, not one a bowl). */
let takings = 0, takingsT = 0;

on.earn = (chips, why) => {
  // (while there's a loan of Harry's to pay off, he takes his share of the stall's sales: loan.ts)
  if (why === 'bowls') chips -= collect(chips);
  // the fans' chips pile up on the hearth room's floor and Mama Moray's cut on her hall's, to be scooped up
  // (chipPiles.ts; hers pops up over her till: resto.ts); a prize goes straight to the wallet
  if (why === 'bowls') { pileUp('bar', chips); takings += chips; return; }
  if (why === 'resto') { pileUp('mama', chips); return; }
  addMoney(Math.round(chips * CHIP));
  if (level.down) popText(`+🐡 ${Math.round(chips).toLocaleString('en-US')}`, { x: GONG.x, y: CY + 2.6, z: GONG.z });
};
/** Seconds till the crowd roars for a boss walking in: after the gong's second of silence (sfx.ts). And when the gong
 *  was last struck (the cellar's clock). */
let roarT = 0, rangAt = -Infinity;
on.gong = () => {
  gong({ x: GONG.x, y: CY, z: GONG.z });
  rangAt = F.t;
};
on.rush = r => {
  // (the crowd roars once it's in: the gong's banner says who, gong.ts, after Eddie's coin if he's in on it; walking
  // in after a local fight, the gong's long since rung out)
  roarT = Math.max(0.05, 1.1 - (F.t - rangAt));
  walkIn(r);
};
on.rushEnd = r => {
  // (its fanfare comes with the card, once the loser's down)
  showCard(r, () => { if (r.win) { fanfare(3); chime(); } else levelUp(); });
  // a boss beaten: one more on the stage chip, and what he opened on offer (quietly: the card says what's new)
  if (r.win) { showProgress(); visibleTiles(true); }
  save();
};
on.grow = () => {
  showGrowRoom(true);
  popIn(parts.grow);
  const door = DOORS.find(d => d.b === 'grow')!;
  // (no toast: Hakkaku's card says it, "🔓 New: grow room, mushroom bowls…")
  pointAt({ x: (door.x0 + door.x1) / 2, y: CY, z: PREP.z0 - 0.3 }, '🍄', () => level.down);
};
// The second boss beaten: the way south. Not with his card still up, though, nor while his crowd's still going home:
// once the next bout's begun and the player's down here and free, Mr. Fugu wants a word, a "!" over him at his desk: he
// has his matchbook for the doorman behind the out-of-order stall in Mama Moray's restroom (southDoor.ts).
let denDue = false;
on.den = () => { denDue = true; };
// An upgrade bought at the shop counter gets its moment on camera, as upstairs: what it built pops in, and the camera
// goes over to it and comes in close for a couple of seconds (spotlight.ts), in the middle of the space the bench's menu
// leaves; several bought in a row get the one close-up, once the player's done. Never while a boss is in (his rush
// waits for nobody) or a scene has the player, up or down the ladder or in Mr. Fugu's office: then it just pops in.
on.built = what => {
  const os = 'tier' in what ? [what.tier === 1 ? parts.bleachers : what.tier === 2 ? parts.tier : parts.vip] : 'slide' in what ? [slideParts] : built(what);
  os.forEach(popIn);
  // (asked again as the close-up starts: it waits till the player's stopped buying, spotlight.ts)
  const free = () => !F.rush && !player.held && !staging();
  if (free()) spotlight(os, { when: free });
};

/** Puts the cellar's look in line with its state: the venue's tier, the grow room, Mr. Fugu bought out or not. */
function dress() {
  showVenue(F.tier);
  showGrowRoom(F.beaten >= 1);
  showDen(F.beaten >= 2 && F.den.way);
  dressDoor();
  denDue = false;
  front.boughtOut = F.boughtOut;
}
/** The 'dohyo' stage-up: a fresh cellar, the ring open. */
export function openCellar() {
  resetFight();
  // (just come down: the doors shut till the first soup's out, and a practice fight before the first boss)
  F.quiet = true;
  F.practice = true;
  dress();
  openRing();
}
/** A stage 3 save: the cellar as it was. */
export function loadCellar(raw: unknown) {
  resetFight(fightFrom(raw));
  dress();
  openRing();
}

/** The cellar, every frame (stage 3 only). */
// ---------- upstairs ----------
// Upstairs, with no boss in or called, the cellar holds still and isn't drawn (levelCull.ts): what it would make on its
// own, its hands, its fans and Mama Moray's, comes in at a steady rate instead, worked out as the player climbs up
// (fight.ts, idleRate), a chip at a time, Harry taking his share as at the stall; and near the hatch, a "+🐡" over it
// every few seconds. Back down, it's all as it was left.
/** Chips a second the cellar makes on its own (-1 till it's worked out), what's come in since it was last paid, what's
 *  been paid since the last "+🐡", and when that's next. */
let idle = -1, owed = 0, paid = 0, popT = 0;
const POP_EVERY = 3, POP_NEAR = 10;
// (and isn't drawn, a boss in or not, unless the stage-up's show is taking the player down)
cellarAway.now = () => stage.n === 3 && !level.down && !staging();
/** Whether the cellar's holding still for the player being upstairs. */
export const restingUp = () => !level.down && !staging() && !F.rush && !F.called;
function upstairs(dt: number) {
  if (idle < 0) { idle = idleRate(); popT = POP_EVERY; }
  owed += idle * dt;
  if (owed >= 1) {
    const got = owed - collect(owed);
    addMoney(Math.round(got * CHIP));
    paid += got; owed = 0;
  }
  if ((popT -= dt) > 0) return;
  popT = POP_EVERY;
  const p = player.g.position;
  if (paid >= 1 && Math.hypot(p.x - HATCH_AT.x, p.z - HATCH_AT.z) < POP_NEAR) popText(`+🐡 ${Math.round(paid).toLocaleString('en-US')}`, { x: HATCH_AT.x, y: FY + 1.4, z: HATCH_AT.z });
  paid = 0;
}

export function updRing(dt: number) {
  // (the gong's side of the HUD goes on up top: the 💪 chip giving way to the season's, a card or banner timing out)
  if (restingUp()) { upstairs(dt); updGong(dt); return; }
  idle = -1; owed = 0;
  // While a scene on the way south has the player (southDoor.ts), the cellar winds down and holds still: nothing goes on
  // in the fight, and so nobody new comes or goes and nobody's turn comes; but whoever's walking somewhere gets there,
  // the soup square's flap settles, and the wrestlers ease into where they were going.
  // (and while one of the Family introduces himself in the Undertow, meet.ts, the club carries on round him)
  const meeting = meetPlaying();
  if (wayPlaying() || meeting) {
    updRingKitchen(dt);
    updBarFlap(dt, null);
    updDohyo(dt);
    updSwarm(dt);
    if (meeting) updUndertow(dt, true);
    updSouthDoor(dt);
    updResto(dt);
    return;
  }
  step(dt);
  // the crowd's as loud as there are fans in the hall to make it: 60 or more is all of it, none is silence
  crowd.size = Math.min(1, inHall() / 60);
  takingsT -= dt;
  if (takingsT <= 0) {
    takingsT = 1;
    if (takings > 0 && level.down) popText(`+🐡 ${takings < 10 ? takings.toFixed(1).replace(/\.0$/, '') : Math.round(takings)}`, { x: BAR.x, y: CY + 2.9, z: BAR.z });
    takings = 0;
  }
  if (roarT > 0 && (roarT -= dt) <= 0) react('charge');
  // (the balance sims leave out the kitchen, the wrestlers and the crowd as drawn: headless.ts)
  if (!headless.on) updRingKitchen(dt);
  updBarFlap(dt, level.down ? player.g.position : null);
  if (!headless.on) updDohyo(dt);
  updOffice(dt);
  if (denDue && !F.rush && !cardUp() && level.down && !player.held && !staging()) { denDue = false; callFugu(); }
  updUndertow(dt);
  updSouthDoor(dt);
  updResto(dt);
  if (!headless.on) { updSwarm(dt); updPiles(); }
  updGong(dt);
}
