// Fight night in the game (stage 3): runs fight.ts's cellar every frame, draws it (the kitchen, the bouts, the swarm,
// the gong), and answers what happens down there: chips into the wallet, the gong's crash and the crowd flooding in,
// the card after a rush, the grow room coming to light, Mr. Fugu's office lighting up for the buyout.
import { CY, parts, showGrowRoom, showVenue } from './cellar';
import { GONG, STALL } from './cellarPlan';
import { openRing, updDohyo } from './dohyo';
import { BOSSES, CHIP, F, fightFrom, on, resetFight, step, strength } from './fight';
import { front } from './front';
import { showCard, updGong } from './gong';
import { DOORS, level, PREP } from './layout';
import { pointAt } from './pointers';
import { popIn } from './pop';
import { updRingKitchen } from './ringKitchen';
import { crowd, react } from './ringSound';
import { save } from './save';
import { chime, fanfare, gong, levelUp } from './sfx';
import { updSwarm } from './swarm';
import { popText, toast } from './ui';
import { showProgress, visibleTiles } from './unlocks';
import { addMoney } from './wallet';

/** Chips taken at the stall since the last "+🐡" over it (one a second, not one a bowl). */
let takings = 0, takingsT = 0;

on.earn = (chips, why) => {
  addMoney(Math.round(chips * CHIP));
  if (why === 'bowls') { takings += chips; return; }
  if (level.down) popText(`+🐡 ${Math.round(chips).toLocaleString('en-US')}`, { x: GONG.x, y: CY + 2.6, z: GONG.z });
};
on.rush = r => {
  const b = BOSSES[r.boss];
  gong({ x: GONG.x, z: GONG.z });
  react('charge');
  toast(`${b.face} ${b.name} walks in with ${b.crowd} fans: turn more than half before the bell!`, 'rush', 3000);
};
on.rushEnd = r => {
  showCard(r);
  // a boss beaten: one more on the stage chip, and what he opened on offer
  if (r.win) { showProgress(); visibleTiles(); }
  if (r.win) { fanfare(3); chime(); } else levelUp();
  save();
};
on.grow = () => {
  showGrowRoom(true);
  popIn(parts.grow);
  const door = DOORS.find(d => d.b === 'grow')!;
  pointAt({ x: (door.x0 + door.x1) / 2, y: CY, z: PREP.z0 - 0.3 }, '🍄', () => level.down);
  toast("Behind the prep hall's back wall: a grow room, already planted. Mushroom bowls pay double", 'grow', 4500);
};

/** Puts the cellar's look in line with its state: the venue's tier, the grow room, Mr. Fugu bought out or not. */
function dress() {
  showVenue(F.tier);
  showGrowRoom(F.beaten >= 1);
  front.boughtOut = F.boughtOut;
}
/** The 'dohyo' stage-up: a fresh cellar, the ring open. */
export function openCellar() {
  resetFight();
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
  step(dt);
  // the crowd's as loud as it's worked up and as big as the roar: a boss's crowd is all of it
  crowd.size = F.rush && !F.rush.done ? 1 : Math.min(1, 0.35 + strength() / 60);
  takingsT -= dt;
  if (takingsT <= 0) {
    takingsT = 1;
    if (takings > 0 && level.down) popText(`+🐡 ${takings < 10 ? takings.toFixed(1).replace(/\.0$/, '') : Math.round(takings)}`, { x: STALL.x, y: CY + 2.2, z: STALL.z });
    takings = 0;
  }
  updRingKitchen(dt);
  updDohyo(dt);
  updSwarm(dt);
  updGong(dt);
}
