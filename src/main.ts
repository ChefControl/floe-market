import './errors'; // must stay first: catches errors thrown while the other modules build the scene
import { initCloud } from './cloud';
import { CLOSE, CLOSE_AIM, closeUp } from './customize';
import { tick } from './game';
import { frameDrawn } from './graphics';
import { initHint, updHint } from './hint';
import { inputVec } from './input';
import { updKofi } from './kofi';
import { player } from './player';
import { updPointers } from './pointers';
import { camera, camK, fog, OFF, renderer, scene, sun, sunOff } from './render';
import { isStale, load, startAutosave, wipeSave } from './save';
import { initScores } from './scores';
import './settings';
import { view } from './stage';
import { drawTutorial } from './tutorial';
import { hud, keepInSight } from './ui';

// ---------- save / restart ----------
load();
startAutosave();
initCloud();
initHint();
initScores();

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
const camTarget = player.g.position.clone(), look = camTarget.clone(), camOff = OFF.clone();
let last = performance.now();

function frame(now: number) {
  frameDrawn((now - last) / 1000);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!isStale()) { tick(dt); updKofi(dt); }

  // Follow the player; the stage-up pulls back to look over the whole map for a moment, and picking a look comes in close.
  camTarget.lerp(player.g.position, Math.min(1, dt * 6));
  look.copy(camTarget).lerp(view.focus, view.k);
  const k = camK * view.zoom, near = closeUp(dt);
  camOff.copy(OFF).multiplyScalar(k).lerp(CLOSE, near);
  camera.position.copy(look).add(camOff);
  camera.lookAt(look.x, look.y + 0.4 + (CLOSE_AIM - 0.4) * near, look.z);
  fog.near = 34 * view.zoom; fog.far = 70 * view.zoom;
  sun.position.copy(look).add(sunOff);
  sun.target.position.copy(look);

  keepInSight(dt);
  updHint(dt, !!inputVec());
  updPointers(dt);
  drawTutorial(dt);
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
