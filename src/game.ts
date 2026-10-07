// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updCasino } from './casino';
import { updConveyor } from './conveyor';
import { C1, C2, postCustomers, updCounter, updLeaving } from './counters';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updKorki } from './korki';
import { updPlayer } from './playerUpdate';
import { updRestaurant } from './restaurant';
import { updRunner } from './runner';
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
  updConveyor(dt);
  updRunner(dt);
  updCounter(C1, dt); updCounter(C2, dt);
  updLeaving(dt);
  postCustomers(dt);
  updRestaurant(dt);
  updStars();
  updFlights(dt);
  updPops(dt);
  updFloes(time);
}
