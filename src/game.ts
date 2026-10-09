// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updAmbience } from './ambience';
import { updAudio } from './audio';
import { updCasino } from './casino';
import { COUNTERS, postCustomers, updCounter, updLeaving } from './counters';
import { updFarm } from './farm';
import { updGarden } from './garden';
import { updRoof } from './hall';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updKorki } from './korki';
import { updLooks } from './looks';
import { updMusic } from './music';
import { updNeeds } from './needs';
import { updPlayer } from './playerUpdate';
import { rainK, updHouse } from './rain';
import { updRestaurant } from './restaurant';
import { updRice } from './rice';
import { updRunners } from './runner';
import { current, SEASON_INFO, updSeason } from './season';
import { seasonSting } from './sfx';
import { updShop } from './shop';
import { player } from './player';
import { updPops } from './pop';
import { staging, updStage } from './stage';
import { updTutorial } from './tutorial';
import { toast } from './ui';
import { updAuto, updStars } from './unlocks';
import { updFloes } from './world';

let time = 0;

export function tick(dt: number) {
  time += dt;
  updPlayer(dt);
  updCasino(dt);
  updKorki(dt);
  updHouse(dt);
  updAuto(dt);
  updFish(dt, time);
  updHooks(dt);
  updChopper(dt);
  updRunners(dt);
  updRice(dt);
  updRestaurant(dt);
  updNeeds(dt);
  updGarden(dt);
  COUNTERS.forEach(C => updCounter(C, dt));
  updLeaving(dt);
  postCustomers(dt);
  updStars();
  updFlights(dt);
  updPops(dt);
  updFloes(time);
  if (updSeason(dt, player.g.position, rainK)) { toast(SEASON_INFO[current()].news, 'season'); seasonSting(current()); }
  updFarm(dt);
  updStage(dt);
  updShop();
  updTutorial(dt);
  updLooks(dt);
  updRoof(dt, player.g.position, staging());
  updAudio(dt, player.g.position);
  updAmbience();
  updMusic(dt);
}
