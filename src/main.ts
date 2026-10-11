import './errors'; // must stay first: catches errors thrown while the other modules build the scene
import { initCloud } from './cloud';
import { DEMO, startDemo } from './demo';
import { tick } from './game';
import { initHint, updHint } from './hint';
import { inputVec } from './input';
import { drawOffer, offerCam } from './offer';
import { updKofi } from './kofi';
import { player } from './player';
import { updPointers } from './pointers';
import { camera, camK, fog, OFF, renderer, scene, sun, sunOff } from './render';
import { isStale, load, startAutosave, wipeSave } from './save';
import { initScores } from './scores';
import './settings';
import { view } from './stage';
import { hud, keepInSight } from './ui';
import { V } from './util';

// ---------- save / restart ----------
// The demo build (VITE_FUGU_DEMO=1) starts from a game that's one bill short of meeting Mr. Fugu, and keeps nothing.
if (DEMO) startDemo();
else {
  load();
  startAutosave();
  initCloud();
  initHint();
  initScores();
}

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
const camTarget = player.g.position.clone(), look = camTarget.clone(), aim = look.clone();
const smooth = (k: number) => k * k * (3 - 2 * k);
let last = performance.now();

function frame(now: number) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // a first frame can be stamped before boot
  last = now;
  if (!isStale()) { tick(dt); updKofi(dt); }

  // Follow the player; the stage-up pulls back to look over the whole map for a moment. Up or down the ladder, the
  // camera goes straight there (behind the fade) rather than gliding through the floor.
  if (view.snap) { camTarget.copy(player.g.position); view.snap = false; }
  camTarget.lerp(player.g.position, Math.min(1, dt * 6));
  look.copy(camTarget).lerp(view.focus, view.k);
  const k = camK * view.zoom;
  camera.position.set(look.x + OFF.x * k, look.y + OFF.y * k, look.z + OFF.z * k);
  aim.set(look.x, look.y + 0.4, look.z);
  // Mr. Fugu's offer cuts to its own view of the hatch, and eases back to the player afterwards.
  drawOffer();
  if (offerCam.k > 0) {
    const b = smooth(offerCam.k), s = offerCam.shake * 0.25;
    camera.position.lerp(offerCam.pos, b);
    aim.lerp(offerCam.look, b);
    if (s) camera.position.add(V((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0));
  }
  camera.lookAt(aim);
  fog.near = 34 * view.zoom; fog.far = 70 * view.zoom;
  sun.position.copy(look).add(sunOff);
  sun.target.position.copy(look);

  keepInSight(dt);
  updHint(dt, !!inputVec());
  updPointers(dt);
  hud(dt);
  renderer.render(scene, camera);
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
