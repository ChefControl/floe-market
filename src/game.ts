// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updCasino } from './casino';
import { COUNTERS, postCustomers, updCounter, updLeaving } from './counters';
import { updFarm } from './farm';
import { updRoof } from './hall';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updKorki } from './korki';
import { updPlayer } from './playerUpdate';
import { updRestaurant } from './restaurant';
import { updRice } from './rice';
import { updRunner } from './runner';
import { updShop } from './shop';
import { player } from './player';
import { staging, updStage } from './stage';
import { updAuto, updPops, updStars } from './unlocks';
import { updFloes } from './world';

let time = 0;

export function tick(dt: number) {
  time += dt;
  updPlayer(dt);
  updCasino(dt);
  updKorki(dt);
  updAuto(dt);
  updFish(dt, time);
  updHooks(dt);
  updChopper(dt);
  updRunner(dt);
  updRice(dt);
  updRestaurant(dt);
  COUNTERS.forEach(C => updCounter(C, dt));
  updLeaving(dt);
  postCustomers(dt);
  updStars();
  updFlights(dt);
  updPops(dt);
  updFloes(time);
  updFarm(dt);
  updStage(dt);
  updShop();
  updRoof(dt, player.g.position, staging());
}
