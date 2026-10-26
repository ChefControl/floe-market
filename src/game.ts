// One simulation step for everything in the world. main.ts adds the camera and rendering on top;
// tests call tick() directly to drive the game without a render loop.
import { updAmbience } from './ambience';
import { hushWorld, updAudio } from './audio';
import { updCasino } from './casino';
import { showing, updCookButton, updShow } from './chanko';
import { updBakes } from './characters';
import { calm, COUNTERS, postCustomers, updCounter, updLeaving } from './counters';
import { updFarm } from './farm';
import { updTills } from './front';
import { updFx } from './fx';
import { updGarden } from './garden';
import { headless } from './headless';
import { updRoof } from './hall';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { updHorizon } from './horizon';
import { updKorki } from './korki';
import { level, stage } from './layout';
import { updLooks } from './looks';
import { updMusic } from './music';
import { coinUp, updCoin } from './gong';
import { meetPlaying } from './meet';
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
import { wayPlaying } from './southDoor';
import { player } from './player';
import { updPops } from './pop';
import { updSpotlight } from './spotlight';
import { staging, updLadder, updStage } from './stage';
import { updTutorial } from './tutorial';
import { toast } from './ui';
import { paused } from './uiKit';
import { updAuto, updStars } from './unlocks';
import { updBooth } from './votingBooth';
import { updFloes } from './world';

let time = 0;

export function tick(dt: number) {
  // the cooking show at the pot (chanko.ts): everything holds still but the show
  if (showing()) { updShow(dt); return; }
  // a dialog of the UI kit over the game, dimming it (uiKit.ts): everything waits for the player
  if (paused()) return;
  time += dt;
  // Through Mr. Fugu's scenes (offer.ts) the world holds still around him: nobody hauls, fishes, drives, eats or
  // grows, and the seasons wait. Only the light, the sea and its fish (and any catch already in the air, which lands),
  // the sound and the scene itself go on.
  // (as they do while Slick Eddie's coin is up at the gong, gong.ts: the boss's crowd waits at the door, and his bell)
  const coin = coinUp(), held = offerPlaying() || coin;
  // (the balance sims leave out what only draws, moves or sounds: headless.ts)
  const live = !headless.on;
  // Down in the cellar in stage 3, the world up top holds still: nobody sees it (levelCull.ts), so its fishing, boats,
  // customers, crew, counters and farm wait where they are, and what its tills would take comes in at a steady rate
  // instead (front.ts). As the cellar does while the player's up there (ring.ts).
  const away = stage.n === 3 && level.down && !staging(), world = live && !away;
  updTills(dt, away);
  if (coin) updCoin(dt);
  updPlayer(dt);
  if (world) updFish(dt, time);
  if (world) updHooks(dt);
  if (!held) {
    if (world) updCasino(dt);
    if (world) updKorki(dt);
    if (world) updHouse(dt);
    if (world) updBooth(dt);
    if (!away) updAuto(dt);
    if (world) updChopper(dt);
    if (world) updRunners(dt);
    if (world) updRice(dt);
    if (world) updRestaurant(dt);
    if (world) updNeeds(dt);
    if (world) updGarden(dt);
    // stage 3: the ring under the dock, and the ladder down to it
    if (stage.n === 3) {
      updRing(dt);
      if (live) updRingSound(dt);
      updLadder(dt);
      updCookButton();
    }
  }
  // While he's on, the world winds down rather than stopping dead: what's in the air lands, and the cars finish their
  // drive (nobody new pulls in, or passes by, and nobody waiting loses patience); everyone else holds still.
  calm.on = held;
  if (world) COUNTERS.forEach(C => updCounter(C, dt));
  if (world) updLeaving(dt);
  if (world) postCustomers(dt);
  updStars();
  updFlights(dt);
  if (live) updPops(dt);
  if (live) updFx(dt);
  if (world) updHorizon(dt);
  if (world) updFloes(time, player.g.position);
  if (!held) {
    // (nothing falls in the cellar)
    // the seasons turn up in the world; down in the cellar, nobody hears about it
    if (updSeason(dt, player.g.position, level.down ? 1 : rainK) && !level.down) { toast(SEASON_INFO[current()].news, 'season'); seasonSting(current()); }
    if (world) updFarm(dt);
  }
  updStage(dt);
  if (live) updSpotlight(dt);
  updShop();
  if (!held) updTutorial(dt);
  // (both levels' upgrades: the cellar's too)
  if (live) updLooks(dt);
  if (live) updBakes(dt);
  if (world) updRoof(dt, player.g.position, staging());
  updOffer(dt);
  // (and through his scenes, the scenes on the way south in the cellar (southDoor.ts), and the Family introducing
  // themselves (meet.ts), the world's own sounds go quiet)
  hushWorld(offerPlaying() || wayPlaying() || meetPlaying());
  if (live) updAudio(dt, player.g.position);
  if (live) updAmbience();
  if (live) updMusic(dt);
  if (live) updRoomTone();
}
