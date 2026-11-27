// Stage 1 teaser: a winter dawn over the bay, a catch and the cleaver, a counter restocked for the queue, the market
// growing (auto harpoon, runners, the drive-up window), and the busy market ending on the gold tile to Floe Sushi.
// Played by the game itself on the clip's clock (run.mjs steps the world and its sound a frame at a time).
(async () => {
  const R = await window.__mod('render.ts');
  const GAME = await window.__mod('game.ts'), SAVE = await window.__mod('save.ts');
  const { player } = await window.__mod('player.ts');
  const { prefs } = await window.__mod('audio.ts');
  const U = await window.__mod('unlocks.ts');
  const ST = await window.__mod('stations.ts');
  const CT = await window.__mod('counters.ts');
  const { holdBuyButton } = await window.__mod('input.ts');
  const { wallet } = await window.__mod('wallet.ts');
  const T3 = await import('/node_modules/.vite/deps/three.js');
  const { Color, Mesh, SphereGeometry, ShaderMaterial, BackSide, Vector3 } = T3;
  const { scene, renderer, hemi, sun, fog } = R;

  // the game's own clock stops (a stale tab doesn't tick); this script steps it a frame at a time
  SAVE.replaceSave(SAVE.deviceStore.read() ?? '');
  prefs.mute.music = true; // the theme is mixed in afterwards, from the music page
  const draw = renderer.render.bind(renderer);
  renderer.render = () => {};
  const W = R.canvas.width, H = R.canvas.height;
  const cam = new R.camera.constructor(40, W / H, 0.1, 260);
  // sound starts now (the game wakes its audio on a key press): its clock is the clip's
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));

  const V = (x, y, z) => new Vector3(x, y, z);
  const clamp = (k, a = 0, b = 1) => Math.min(b, Math.max(a, k));
  const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const easeIO = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const lv = (a, b, k) => a.clone().lerp(b, k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const FY = 0.15;

  // ---------- the player, driven by the game's own joystick ----------
  const gl = R.canvas;
  const ptr = (type, x, y) => gl.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
  let stickOn = false;
  const camF = V(-R.OFF.x, 0, -R.OFF.z).normalize(), camR = V(-camF.z, 0, camF.x);
  function stick(dx, dz, m = 1) {
    if (!stickOn) { ptr('pointerdown', 360, 640); stickOn = true; }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const x = dx * camR.x + dz * camR.z, y = -(dx * camF.x + dz * camF.z);
    ptr('pointermove', 360 + x * 48 * m, 640 + y * 48 * m);
  }
  function letGo() { if (stickOn) { ptr('pointerup', 0, 0); stickOn = false; } }
  /** Walks toward a spot at m of full speed; lets go once there. */
  function walkTo(x, z, m = 1) {
    const p = player.g.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.06) { letGo(); return true; }
    stick(dx, dz, Math.min(m, Math.max(0.2, d * 2.5)));
    return false;
  }
  function place(x, z, h) { letGo(); player.g.position.set(x, FY, z); if (h !== undefined) player.h = h; }

  // ---------- a dawn sky: a dome with a warm horizon and a low sun in the east ----------
  const SUN_DIR = V(0.86, 0.12, 0.3).normalize();
  const skyMat = new ShaderMaterial({
    uniforms: { uK: { value: 1 }, uSun: { value: SUN_DIR }, uDay: { value: new Color(0xCFEAF5) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK; uniform vec3 uSun; uniform vec3 uDay; varying vec3 vD;
      void main(){
        float h = clamp(vD.y, -0.1, 1.0);
        vec3 top = vec3(0.42, 0.52, 0.78), mid = vec3(0.93, 0.70, 0.66), low = vec3(1.0, 0.80, 0.58);
        vec3 c = mix(low, mid, smoothstep(0.0, 0.10, h));
        c = mix(c, top, smoothstep(0.10, 0.55, h));
        float s = max(0.0, dot(normalize(vD), uSun));
        c += vec3(1.0, 0.62, 0.30) * (pow(s, 6.0) * 0.45 + pow(s, 300.0) * 1.6);
        gl_FragColor = vec4(mix(uDay, c, uK), 1.0);
      }`,
    side: BackSide, depthWrite: false, fog: false,
  });
  const dome = new Mesh(new SphereGeometry(200, 32, 16), skyMat);
  dome.renderOrder = -10; dome.frustumCulled = false;
  scene.add(dome);
  const day = {
    bg: scene.background.clone(), fog: fog.color.clone(), hemi: hemi.intensity, hemiC: hemi.color.clone(), hemiG: hemi.groundColor.clone(),
    sun: sun.intensity, sunC: sun.color.clone(), near: fog.near, far: fog.far,
  };
  const DAWN = { fog: new Color(0xF2C8A8), hemiC: new Color(0xB9B6DA), hemiG: new Color(0x8C7C86), sunC: new Color(0xFFB27A) };
  /** How much of the dawn is in the light, 1 at first, gone by the end of the catch. */
  function light(k, look) {
    skyMat.uniforms.uK.value = k;
    skyMat.uniforms.uDay.value.copy(day.bg);
    fog.color.copy(day.fog).lerp(DAWN.fog, k);
    fog.near = lerp(day.near, 30, k); fog.far = lerp(day.far, 110, k);
    hemi.intensity = lerp(day.hemi, day.hemi * 0.62, k);
    hemi.color.copy(day.hemiC).lerp(DAWN.hemiC, k); hemi.groundColor.copy(day.hemiG).lerp(DAWN.hemiG, k);
    sun.intensity = lerp(day.sun, day.sun * 1.05, k);
    sun.color.copy(day.sunC).lerp(DAWN.sunC, k);
    // the sun low in the east at dawn, up where the game keeps it by day
    const off = R.sunOff.clone().lerp(SUN_DIR.clone().multiplyScalar(16), k);
    sun.position.copy(look).add(off); sun.target.position.copy(look);
    dome.visible = k > 0.001;
    dome.position.copy(cam.position);
  }

  // ---------- the overlay ----------
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  out.id = 'teaser'; Object.assign(out.style, { position: 'fixed', inset: '0', width: W + 'px', height: H + 'px', zIndex: 4 });
  document.body.append(out);
  const c = out.getContext('2d');
  // the game's own toast, a size up for a phone screen
  const sub = document.createElement('div'); sub.id = 'sub';
  Object.assign(sub.style, {
    position: 'fixed', left: '50%', top: '150px', transform: 'translate(-50%,0)', zIndex: 6, pointerEvents: 'none',
    font: '800 34px "Baloo 2","Trebuchet MS",system-ui,sans-serif', lineHeight: 1.15, padding: '10px 30px', borderRadius: '30px',
    background: '#C93F25', color: '#fff', boxShadow: '0 6px 0 rgba(120,35,20,.45)', width: 'max-content', opacity: 0,
  });
  document.body.append(sub);
  const TOASTS = () => [[CUT.harpoon + 0.35, CUT.runner, 'Auto harpoon unlocked'], [CUT.runner + 0.2, CUT.drive, 'Hire a runner unlocked'], [CUT.drive + 0.7, CUT.wide, 'Drive-up window unlocked']];
  function toastAt(t) {
    const cur = TOASTS().find(([a, b]) => t >= a && t < b);
    if (!cur) { sub.style.opacity = 0; return; }
    const [a, b, m] = cur;
    sub.textContent = m;
    const k = Math.min(easeOut((t - a) / 0.18), clamp((b - t) / 0.12));
    sub.style.opacity = k; sub.style.transform = `translate(-50%,${(1 - k) * -14}px)`;
  }
  // the game's tip for the tile the chef stands on ("Open Floe Sushi"), a size up, at the bottom
  const prompts = document.getElementById('prompts');
  const tipCss = document.createElement('style');
  tipCss.textContent = `#prompts{z-index:7!important; bottom:110px!important; transform:translateX(-50%) scale(1.75)!important; transform-origin:50% 100%;} #buyHint{display:none!important}`;
  prompts.style.setProperty('display', 'flex', 'important');
  document.head.append(tipCss);
  const grain = (() => {
    const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d'), d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return g;
  })();

  // ---------- the shots ----------
  // cuts on the music's beats (92 BPM from the first catch: a beat is 0.652 s)
  const BEAT = 60 / 92, M0 = 3.4, on = n => +(M0 + n * BEAT).toFixed(3);
  const LEN = on(23);
  const CUT = { catch: M0, whip: on(3), counter: on(6), harpoon: on(10), runner: on(12), drive: on(14), wide: on(17) };
  const gold = U.tiles.find(t => t.id === 'sushi'), sled = U.tiles.find(t => t.id === 'sled');
  const done = new Set();
  const once = (k, f) => { if (!done.has(k)) { done.add(k); f(); } };
  let sledCar = null;

  function world(t) {
    // the chef starts on the fishing pad, catching
    once('start', () => { place(ST.PAD.x, ST.PAD.z); wallet.money = 9400; });
    if (t >= CUT.counter) once('counter', () => {
      // an armful of slices from the pile, walked over to the counter
      place(-1.7, 6.3, Math.PI / 2);
      for (let i = 0; i < 14 && ST.pile.items.length; i++) player.back.receive(ST.pile.take(), 0, 0.02);
    });
    if (t >= CUT.counter && t < CUT.harpoon) {
      if (t < CUT.counter + 1.9) walkTo(CT.C1.dropPos.x, CT.C1.dropPos.z - 0.1, 0.72);
      else walkTo(CT.C1.cashPos.x, CT.C1.cashPos.z, 0.8);
    }
    if (t >= CUT.harpoon) once('harpoon', () => { place(-7.2, -2.2, 2.4); });
    if (t >= CUT.harpoon + 0.08) once('turret', () => U.applyUnlock('turret'));
    if (t >= CUT.runner) once('runnerAt', () => { place(6.4, -6.0, -1.2); });
    if (t >= CUT.runner + 0.1) once('runner', () => U.applyUnlock('runner'));
    if (t >= CUT.runner + 0.45) once('runner2', () => U.applyUnlock('runner2'));
    if (t >= CUT.drive) once('drive', () => { place(sled.x, sled.z, Math.PI / 2); sled.paid = Math.round(sled.cost * 0.62); U.redrawTile(sled); holdBuyButton(true); });
    if (t >= CUT.drive && sled.done) once('sledOpen', () => { holdBuyButton(false); CT.SLED.spawnT = 0; });
    if (done.has('sledOpen') && !sledCar && CT.SLED.queue.length) { sledCar = CT.SLED.queue[0]; sledCar.g.position.z = 5.2; }
    if (t >= CUT.wide) once('wide', () => {
      U.applyUnlock('net', true); U.applyUnlock('runner3', true);
      wallet.money = 60000;
      gold.paid = 0; U.redrawTile(gold);
      place(2.4, 5.2, -2.3);
    });
    if (t >= CUT.wide + 1.1 && t < LEN) {
      const there = walkTo(gold.x + 0.1, gold.z - 0.7, 0.62);
      if (there || t > CUT.wide + 2.2) holdBuyButton(gold.paid < gold.cost * 0.94);
    }
  }

  // camera paths: [time, pos, look, fov]
  function shot(t) {
    let pos, look, fov = 40;
    if (t < CUT.catch) {
      // dawn over the bay: low over the water, rising and drifting in toward the dock
      const k = easeIO(t / CUT.catch);
      pos = lv(V(-6.5, 1.1, -19.5), V(-6.0, 2.9, -14.8), k);
      look = lv(V(-2.5, 1.3, -3.0), V(-3.6, 0.9, -4.6), k);
      fov = 42;
    } else if (t < CUT.counter) {
      // the catch: over the chef's shoulder at the pad, then a whip pan to the cleaver
      const a = (t - CUT.catch) / (CUT.whip - CUT.catch);
      const p1 = lv(V(-2.5, 1.75, -2.4), V(-2.75, 1.6, -2.75), ease(a)), l1 = lv(V(-5.2, 0.85, -7.3), V(-5.3, 0.8, -7.6), ease(a));
      const p2 = lv(V(2.9, 2.2, -2.2), V(2.6, 2.0, -2.6), ease((t - CUT.whip) / 2)), l2 = V(1.4, 0.75, -5.4);
      const w = easeIO((t - CUT.whip) / 0.42);
      pos = lv(p1, p2, w); look = lv(l1, l2, w);
      fov = 40 - 4 * ease((t - CUT.whip - 0.4) / 1.6);
    } else if (t < CUT.harpoon) {
      // the counter, from behind the queue
      const k = ease((t - CUT.counter) / (CUT.harpoon - CUT.counter));
      pos = lv(V(4.4, 3.5, 13.6), V(4.3, 3.2, 12.8), k);
      look = lv(V(2.7, 0.7, 7.0), V(2.9, 0.7, 6.9), k);
      fov = 42;
    } else if (t < CUT.runner) {
      const k = ease((t - CUT.harpoon) / 1.4);
      pos = lv(V(-4.2, 1.45, -2.5), V(-4.5, 1.35, -2.9), k);
      look = lv(V(-6.9, 0.85, -6.0), V(-7.0, 0.9, -6.3), k);
      fov = 44;
    } else if (t < CUT.drive) {
      const k = ease((t - CUT.runner) / 1.4);
      pos = lv(V(5.4, 1.7, -0.9), V(5.0, 1.6, -1.2), k);
      look = lv(V(2.6, 0.8, -4.1), V(2.6, 0.8, -4.2), k);
      fov = 44;
    } else if (t < CUT.wide) {
      const k = ease((t - CUT.drive) / 1.8);
      pos = lv(V(12.4, 3.4, 6.4), V(11.9, 3.1, 5.8), k);
      look = lv(V(7.6, 0.8, -1.0), V(7.6, 0.8, -1.2), k);
      fov = 42;
    } else {
      // the whole market, then down onto the gold tile
      const k = easeIO((t - CUT.wide) / 2.3), k2 = ease((t - CUT.wide - 2.3) / 1.2);
      pos = lv(V(12.5, 14.5, 17.5), V(1.6, 4.4, 7.4), k).lerp(V(1.0, 3.6, 6.4), k2);
      look = lv(V(0.4, 0, -0.6), V(-1.4, 0.4, 1.6), k);
      fov = 40;
    }
    cam.position.copy(pos); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix();
    return look;
  }

  window.cineType = { cuts: CUT, len: LEN };
  let last = -1;
  window.cine = {
    len: LEN,
    frame(i, fps = 30) {
      const t = i / fps, dt = last < 0 ? 1 / fps : t - last; last = t;
      world(t);
      GAME.tick(Math.min(0.05, dt));
      const look = shot(t);
      light(t < CUT.catch ? 1 : 1 - ease((t - CUT.catch) / 3.0), look);
      draw(scene, cam);
      c.drawImage(R.canvas, 0, 0, W, H);
      // a soft vignette, a touch of grain
      const vg = c.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.78);
      vg.addColorStop(0, 'rgba(20,10,30,0)'); vg.addColorStop(1, 'rgba(20,10,30,0.35)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
      c.save(); c.globalAlpha = 0.05; c.globalCompositeOperation = 'overlay';
      const gx = -Math.floor(Math.random() * 256), gy = -Math.floor(Math.random() * 256);
      for (let x = gx; x < W; x += 256) for (let y = gy; y < H; y += 256) c.drawImage(grain, x, y);
      c.restore();
      toastAt(t);
      prompts.style.opacity = t > CUT.wide + 1.8 && t < LEN - 0.04 ? ease((t - CUT.wide - 1.8) / 0.3) : 0;
      // up from black at the start; a warm flash and a cut to black at the end
      let black = clamp(1 - t / 1.3);
      if (t >= LEN - 1 / 30 - 0.001) black = 1;
      if (t > LEN - 0.5) { c.fillStyle = `rgba(255,236,190,${0.55 * ease((t - (LEN - 0.5)) / 0.45)})`; c.fillRect(0, 0, W, H); }
      if (black > 0) { c.fillStyle = `rgba(0,0,0,${black})`; c.fillRect(0, 0, W, H); }
      return true;
    },
  };
  console.log('[cine] ready');
})();
