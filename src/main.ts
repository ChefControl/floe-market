import './errors'; // must stay first: catches errors thrown while the other modules build the scene
import './noMenus';
import { batchStill } from './batch';
import { tableView, tipsy, tipsyK } from './casinoKit';
import { initCloud } from './cloud';
import { CLOSE, CLOSE_AIM, closeUp } from './customize';
import { DEMO, startDemo } from './fuguDemo';
import { tick } from './game';
import { frameDrawn } from './graphics';
import { initHint, updHint } from './hint';
import { inputVec } from './input';
import { hideAbove } from './levelCull';
import { showCam, showShake } from './chanko';
import { drawOffer, offerCam } from './offer';
import { finishCam } from './dohyo';
import { updKofi } from './kofi';
import { player } from './player';
import { updPointers } from './pointers';
import { initReports, updReports } from './report';
import { camera, camK, fog, OFF, renderer, scene, sun, sunOff } from './render';
import { isStale, load, startAutosave, wipeSave } from './save';
import { initScores } from './scores';
import { drawMeet, meetCam } from './meet';
import { drawWay, wayCam } from './southDoor';
import './settings';
import { view } from './stage';
import { newBubbleFrame } from './speech';
import { drawTutorial } from './tutorial';
import { hud, keepInSight } from './ui';
import { jitter } from './kit';
import { V } from './util';

// ---------- save / restart ----------
// The Mr. Fugu demo build (VITE_FUGU_DEMO=1) starts from a game that's one bill short of meeting him, and keeps nothing.
if (DEMO) startDemo();
else {
  load();
  startAutosave();
  initCloud();
  initReports();
  initHint();
  initScores();
}
batchStill(scene);
// the demo build's tool panel (demo.ts); the game itself never loads it
if (import.meta.env.MODE === 'demo') void import('./demo');
// the UI kit's showcase, ?ui=kit (uiShowcase.ts): in dev and demo builds only
if ((import.meta.env.DEV || import.meta.env.MODE === 'demo') && new URLSearchParams(location.search).get('ui') === 'kit') void import('./uiShowcase');

const restartBtn = document.getElementById('restart')!, restartText = document.getElementById('restartText')!;
let armT: ReturnType<typeof setTimeout> | undefined;
let armedAt = 0;
restartBtn.addEventListener('click', () => {
  // First tap arms the button; a second, deliberate tap within 2.5s erases the save.
  if (!restartBtn.classList.contains('armed')) {
    restartBtn.classList.add('armed');
    restartText.textContent = 'Tap again to erase progress';
    armedAt = performance.now();
    clearTimeout(armT);
    armT = setTimeout(() => { restartBtn.classList.remove('armed'); restartText.textContent = 'Restart'; }, 2500);
    return;
  }
  // Both taps of a double-tap land within a few hundred ms; that shouldn't erase everything.
  if (performance.now() - armedAt < 600) return;
  wipeSave();
  location.reload();
});

// ---------- loop ----------
const camTarget = player.g.position.clone(), look = camTarget.clone(), camOff = OFF.clone(), aim = look.clone();
const smooth = (k: number) => k * k * (3 - 2 * k);
let last = performance.now();
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false };

function frame(now: number) {
  frameDrawn((now - last) / 1000);
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // a first frame can be stamped before boot
  last = now;
  newBubbleFrame();
  if (!isStale()) { tick(dt); updKofi(dt); updReports(dt); }

  // Follow the player; the stage-up pulls back to look over the whole map for a moment, a new upgrade has the camera
  // come in close on it for a couple of seconds, picking a look comes in close, and so does playing a game on the
  // casino boat, over its table. Up or down the ladder, the camera goes straight there (behind the fade) rather than
  // gliding through the floor.
  if (view.snap) { camTarget.copy(player.g.position); view.snap = false; }
  camTarget.lerp(player.g.position, Math.min(1, dt * 6));
  look.copy(camTarget).lerp(view.focus, view.k);
  const k = camK * view.zoom * view.close, near = closeUp(dt);
  camOff.copy(OFF).multiplyScalar(k).lerp(CLOSE, near);
  camera.position.copy(look).add(camOff);
  // a little over the player's feet; something else in view, at its middle
  aim.set(look.x, look.y + 0.4 * (1 - view.k) + (CLOSE_AIM - 0.4) * near, look.z);
  const table = tableView(dt);
  if (table.k > 0) { camera.position.lerp(table.eye, table.k); aim.lerp(table.at, table.k); }
  // Mr. Fugu's offer cuts to its own view of the hatch, and eases back to the player afterwards.
  drawOffer();
  if (offerCam.k > 0) {
    const b = smooth(offerCam.k), s = offerCam.shake * 0.25;
    camera.position.lerp(offerCam.pos, b);
    aim.lerp(offerCam.look, b);
    if (s) camera.position.add(V((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
  }
  // a win's finish, close and low on the pair at the straw (dohyo.ts)
  if (finishCam.k > 0) { const b = smooth(finishCam.k); camera.position.lerp(finishCam.pos, b); aim.lerp(finishCam.look, b); }
  // the way south: Mr. Fugu with his matchbook, and the doorman looking you over at his door (southDoor.ts)
  if (wayCam.k > 0) { const b = smooth(wayCam.k); camera.position.lerp(wayCam.pos, b); aim.lerp(wayCam.look, b); }
  // one of the Family introducing himself in the Undertow (meet.ts)
  drawMeet();
  if (meetCam.k > 0) { const b = smooth(meetCam.k); camera.position.lerp(meetCam.pos, b); aim.lerp(meetCam.look, b); }
  // the cooking show at the pot: its own camera on the stew (chanko.ts), jolting a little on a chop
  if (showCam.k > 0) {
    const b = smooth(showCam.k), s = reduceMotion.matches ? 0 : showShake();
    camera.position.lerp(showCam.pos, b); aim.lerp(showCam.look, b);
    if (s) camera.position.add(V(jitter(-s, s), jitter(-s, s), jitter(-s, s)));
  }
  // tipsy: the view sways and rolls (not for players who'd rather less motion)
  const sway = tipsy.t > 0 && !reduceMotion.matches ? tipsyK() : 0;
  if (sway) { aim.x += Math.sin(now / 760) * 0.45 * sway; aim.z += Math.cos(now / 910) * 0.3 * sway; }
  // a big hit in the ring, seen from the watch spot (not for players who'd rather less motion)
  if (view.shake && !reduceMotion.matches) { const s = view.shake * 0.35; camera.position.add(V(jitter(-s, s), jitter(-s, s), jitter(-s, s))); }
  camera.lookAt(aim);
  if (sway) camera.rotateZ(Math.sin(now / 580) * 0.09 * sway);
  fog.near = 34 * view.zoom; fog.far = 70 * view.zoom;
  sun.position.copy(look).add(sunOff);
  sun.target.position.copy(look);

  keepInSight(dt, view.k);
  updHint(dt, !!inputVec());
  updPointers(dt);
  drawTutorial(dt);
  hud(dt);
  // (down in the cellar, the world up top isn't drawn: levelCull.ts)
  const showAbove = hideAbove();
  renderer.render(scene, camera);
  showAbove();
  drawWay();
  if (loading) {
    const el = loading;
    el.classList.add('done');
    setTimeout(() => el.remove(), 400); // once it has faded out
    loading = null;
  }
  requestAnimationFrame(frame);
}
/** The loading screen (index.html), until the first frame is drawn. */
let loading = document.getElementById('loading');
requestAnimationFrame(frame);
