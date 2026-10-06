import './errors'; // must stay first: catches errors thrown while the other modules build the scene
import { C1, C2, postCustomers, updCounter, updLeaving } from './counters';
import { updChopper, updFish, updHooks } from './fishing';
import { updFlights } from './holder';
import { dismissIntro } from './input';
import { player } from './player';
import { updPlayer } from './playerUpdate';
import { camera, camK, OFF, renderer, scene, sun } from './render';
import { updRunner } from './runner';
import { load, save, SAVE_KEY } from './save';
import { hud } from './ui';
import { updAuto, updPops } from './unlocks';
import { updFloes } from './world';

// ---------- save / restart ----------
if (load()) dismissIntro();
setInterval(save, 2500);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

const restartBtn = document.getElementById('restart')!;
let armT: ReturnType<typeof setTimeout> | undefined;
restartBtn.addEventListener('click', () => {
  // First tap arms the button; a second tap within 2.5s wipes the save.
  if (!restartBtn.classList.contains('armed')) {
    restartBtn.classList.add('armed');
    restartBtn.textContent = 'Tap again to restart';
    clearTimeout(armT);
    armT = setTimeout(() => { restartBtn.classList.remove('armed'); restartBtn.textContent = 'Restart'; }, 2500);
    return;
  }
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
  window.removeEventListener('beforeunload', save);
  location.reload();
});

// ---------- loop ----------
const camTarget = player.g.position.clone();
let last = performance.now(), time = 0;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  updPlayer(dt);
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

  camTarget.lerp(player.g.position, Math.min(1, dt * 6));
  camera.position.set(camTarget.x + OFF.x * camK, camTarget.y + OFF.y * camK, camTarget.z + OFF.z * camK);
  camera.lookAt(camTarget.x, camTarget.y + 0.4, camTarget.z);
  sun.position.set(camTarget.x - 5, camTarget.y + 14, camTarget.z + 7);
  sun.target.position.copy(camTarget);

  hud(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
