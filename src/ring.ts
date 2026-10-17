// Fight night in the game (stage 3): runs fight.ts's cellar every frame, draws it (the kitchen, the bouts, the swarm,
// the gong), and answers what happens down there: chips into the wallet, the gong's crash and the crowd flooding in,
// the card after a rush, the grow room coming to light, Mr. Fugu's word about the way south to the Undertow, his
// office lighting up for the buyout.
import { CY, parts, showDen, showGrowRoom, showVenue, updBarFlap } from './cellar';
import { BAR, GONG } from './cellarPlan';
import { openRing, updDohyo } from './dohyo';
import { CHIP, F, fightFrom, on, resetFight, step } from './fight';
import { front } from './front';
import { cardUp, showCard, updGong, walkIn } from './gong';
import { DOORS, level, PREP } from './layout';
import { collect } from './loan';
import { updOffice } from './office';
import { updUndertow } from './undertow';
import { player } from './player';
import { pointAt } from './pointers';
import { popIn } from './pop';
import { built, updRingKitchen } from './ringKitchen';
import { crowd, react } from './ringSound';
import { save } from './save';
import { callFugu, dressDoor, updSouthDoor, wayPlaying } from './southDoor';
import { chime, fanfare, gong, levelUp } from './sfx';
import { spotlight } from './spotlight';
import { staging } from './stage';
import { inHall, updSwarm } from './swarm';
import { popText } from './ui';
import { showProgress, visibleTiles } from './unlocks';
import { addMoney } from './wallet';

/** Chips taken at the soup bar since the last "+🐡" over it (one a second, not one a bowl). */
let takings = 0, takingsT = 0;

on.earn = (chips, why) => {
  // (while there's a loan of Harry's to pay off, he takes his share of the stall's sales: loan.ts)
  if (why === 'bowls') chips -= collect(chips);
  addMoney(Math.round(chips * CHIP));
  if (why === 'bowls') { takings += chips; return; }
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
// has his matchbook for the doorman at the door at the tunnel's mouth (southDoor.ts).
let denDue = false;
on.den = () => { denDue = true; };
// An upgrade bought at the shop counter gets its moment on camera, as upstairs: what it built pops in, and the camera
// goes over to it and comes in close for a couple of seconds (spotlight.ts), in the middle of the space the bench's menu
// leaves. Never while a boss is in (his rush waits for nobody) or a scene has the player, up or down the ladder or in
// Mr. Fugu's office: then it just pops in.
on.built = what => {
  const os = 'tier' in what ? [what.tier === 1 ? parts.bleachers : what.tier === 2 ? parts.tier : parts.vip] : built(what);
  os.forEach(popIn);
  if (!F.rush && !player.held && !staging()) spotlight(os);
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
export function updRing(dt: number) {
  // While a scene on the way south has the player (southDoor.ts), the cellar winds down and holds still: nothing goes on
  // in the fight, and so nobody new comes or goes and nobody's turn comes; but whoever's walking somewhere gets there,
  // the soup square's flap settles, and the wrestlers ease into where they were going.
  if (wayPlaying()) {
    updRingKitchen(dt);
    updBarFlap(dt, null);
    updDohyo(dt);
    updSwarm(dt);
    updSouthDoor(dt);
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
  updRingKitchen(dt);
  updBarFlap(dt, level.down ? player.g.position : null);
  updDohyo(dt);
  updOffice(dt);
  if (denDue && !F.rush && !cardUp() && level.down && !player.held && !staging()) { denDue = false; callFugu(); }
  updUndertow(dt);
  updSouthDoor(dt);
  updSwarm(dt);
  updGong(dt);
}
