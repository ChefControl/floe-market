// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updAmbience } from './ambience';
import { updAudio } from './audio';
import { updCasino } from './casino';
import { updBakes } from './characters';
import { calm, COUNTERS, postCustomers, updCounter, updLeaving } from './counters';
import { updFarm } from './farm';
import { updFx } from './fx';
import { updGarden } from './garden';
import { updRoof } from './hall';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updHorizon } from './horizon';
import { updKorki } from './korki';
import { level, stage } from './layout';
import { updLooks } from './looks';
import { updMusic } from './music';
import { offerPlaying, updOffer } from './offer';
import { updRoomTone } from './roomTone';
import { updNeeds } from './needs';
import { updPlayer } from './playerUpdate';
import { rainK, updHouse } from './rain';
import { updRestaurant } from './restaurant';
import { updRice } from './rice';
import { updRing } from './ring';
import { updRingSound } from './ringSound';
import { updRunners } from './runner';
import { current, SEASON_INFO, updSeason } from './season';
import { seasonSting } from './sfx';
import { updShop } from './shop';
import { player } from './player';
import { updPops } from './pop';
import { updSpotlight } from './spotlight';
import { staging, updLadder, updStage } from './stage';
import { updTutorial } from './tutorial';
import { toast } from './ui';
import { updAuto, updStars } from './unlocks';
import { updFloes } from './world';

let time = 0;

export function tick(dt: number) {
  time += dt;
  // Through Mr. Fugu's scenes (offer.ts) the world holds still around him: nobody hauls, fishes, drives, eats or
  // grows, and the seasons wait. Only the light, the sea and its fish (and any catch already in the air, which lands),
  // the sound and the scene itself go on.
  const held = offerPlaying();
  updPlayer(dt);
  updFish(dt, time);
  updHooks(dt);
  if (!held) {
    updCasino(dt);
    updKorki(dt);
    updHouse(dt);
    updAuto(dt);
    updChopper(dt);
    updRunners(dt);
    updRice(dt);
    updRestaurant(dt);
    updNeeds(dt);
    updGarden(dt);
    // stage 3: the ring under the dock, and the ladder down to it
    if (stage.n === 3) {
      updRing(dt);
      updRingSound(dt);
      updLadder(dt);
    }
  }
  // While he's on, the world winds down rather than stopping dead: what's in the air lands, and the cars finish their
  // drive (nobody new pulls in, or passes by, and nobody waiting loses patience); everyone else holds still.
  calm.on = held;
  COUNTERS.forEach(C => updCounter(C, dt));
  updLeaving(dt);
  postCustomers(dt);
  updStars();
  updFlights(dt);
  updPops(dt);
  updFx(dt);
  updHorizon(dt);
  updFloes(time, player.g.position);
  if (!held) {
    // (nothing falls in the cellar)
    // the seasons turn up in the world; down in the cellar, nobody hears about it
    if (updSeason(dt, player.g.position, level.down ? 1 : rainK) && !level.down) { toast(SEASON_INFO[current()].news, 'season'); seasonSting(current()); }
    updFarm(dt);
  }
  updStage(dt);
  updSpotlight(dt);
  updShop();
  if (!held) updTutorial(dt);
  updLooks(dt);
  updBakes(dt);
  updRoof(dt, player.g.position, staging());
  updOffer(dt);
  updAudio(dt, player.g.position);
  updAmbience();
  updMusic(dt);
  updRoomTone();
}
