// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updCasino } from './casino';
import { C1, C2, postCustomers, updCounter, updLeaving } from './counters';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updPlayer } from './playerUpdate';
import { updRunner } from './runner';
import { updAuto, updPops } from './unlocks';
import { updFloes } from './world';

let time = 0;

export function tick(dt: number) {
  time += dt;
  updPlayer(dt);
  updCasino(dt);
  updAuto(dt);
  updFish(dt, time);
  updHooks(dt);
  updChopper(dt);
  updRunner(dt);
  updCounter(C1, dt); updCounter(C2, dt);
  updLeaving(dt);
  postCustomers(dt);
  updFlights(dt);
  updPops(dt);
  updFloes(time);
}
