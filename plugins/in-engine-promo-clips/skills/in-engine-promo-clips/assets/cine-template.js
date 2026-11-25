// A clip script skeleton for render_frames.mjs. Inject after timeline.js (window.CLIP from mix_example.mjs) and
// cartoon-kit.js. It defines window.cine = { len, frame(i, fps) }: everything on screen at frame i is decided here.
//
// Adapt the "the game" block to your game: how to reach three.js, the scene, the renderer, the world's update
// function, and the character. Everything below it is generic.
(async () => {
  const K = window.CartoonKit, { T, len, voice = [], phone = [] } = window.CLIP;
  const { clamp, ease, easeOut, lerp } = K;

  // ---------- the game (adapt this block) ----------
  // Example: the game exposes window.GAME = { THREE, scene, renderer, tick(dt), stop(), hero }.
  // Under Vite, import modules by the URL the page loaded, or you get a second copy that changes nothing:
  //   const mod = n => import(performance.getEntriesByType('resource').map(r => r.name).filter(u => new URL(u).pathname === '/src/' + n).at(-1) ?? '/src/' + n);
  const G = window.GAME, THREE = G.THREE, scene = G.scene, renderer = G.renderer;
  G.stop?.();                                   // the game's own loop stops: this script steps the world
  const draw = renderer.render.bind(renderer);
  renderer.render = () => {};                   // and nothing else draws
  const hero = G.hero;                          // the character; HEAD is its head centre in hero.body (or hero) space
  const BODY = hero.body ?? hero, HEAD = [0, 1.03, 0.05], R = 0.2;
  // wake the game's sound now, at frame 0 (games start audio on a key or click)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));

  // ---------- the overlay ----------
  const W = renderer.domElement.width, H = renderer.domElement.height;
  const cam = new THREE.PerspectiveCamera(38, W / H, 0.05, 300);
  const out = document.createElement('canvas'); out.width = W; out.height = H; out.id = 'cine';
  Object.assign(out.style, { position: 'fixed', inset: '0', width: W + 'px', height: H + 'px', zIndex: 9999 });
  document.body.append(out);
  const c = out.getContext('2d'), frozen = document.createElement('canvas'); frozen.width = W; frozen.height = H;
  const screen = v => { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
  const noise = (t, f) => Math.sin(t * f) * 0.6 + Math.sin(t * f * 2.31 + 1.7) * 0.4;
  // fonts: load what the captions use before the first frame (a missing font silently falls back)
  await document.fonts.load('800 80px system-ui').catch(() => {});

  // ---------- acting ----------
  const face = K.face(THREE, BODY, { head: HEAD, r: R });
  const red = K.redRise(THREE, BODY, { head: HEAD, r: R });
  const st = K.steam(THREE, scene), ears = K.earSteam(THREE, st, BODY, { head: HEAD, r: R });
  /** how cross the character is, 0..1, over the timeline: everything reads this one curve */
  const mood = t => t < T.hello1 ? 0 : t < T.hang1 ? lerp(0.1, 0.3, ease((t - T.call1) / (T.hang1 - T.call1)))
    : t < T.hang2 ? lerp(0.35, 0.55, ease((t - T.ring2) / (T.hang2 - T.ring2))) : t < T.scream ? lerp(0.6, 0.9, ease((t - T.hang2) / (T.scream - T.hang2))) : 1;

  // ---------- the camera ----------
  function shot(t) {
    const P = hero.position, head = BODY.localToWorld(new THREE.Vector3(...HEAD));
    const wide = { e: P.clone().add(new THREE.Vector3(-0.45, 1.5, 3.5)), l: P.clone().add(new THREE.Vector3(0.05, 0.86, 0)) };
    const close = { e: head.clone().add(new THREE.Vector3(-0.14, 0.1, 2.1)), l: head.clone() };
    // a punch in on each of the fast beats, a crash zoom on the scream
    let k = 0.15 * ease(t / T.ring3);
    for (const x of [T.hello3, T.hello4, T.hello5]) k += 0.18 * easeOut((t - x) / 0.09);
    if (t >= T.scream) k = lerp(k, 1, easeOut((t - T.scream) / 0.12));
    const e = wide.e.clone().lerp(close.e, clamp(k)), l = wide.l.clone().lerp(close.l, clamp(k));
    const sh = t > T.scream ? 0.03 : 0; e.x += noise(t, 61) * sh; e.y += noise(t + 3, 53) * sh;
    cam.position.copy(e); cam.lookAt(l); cam.updateProjectionMatrix();
  }

  let last = -1;
  window.cine = {
    len,
    frame(i, fps = 30) {
      const t = i / fps, dt = last < 0 ? 1 / fps : t - last; last = t;
      if (t < T.freeze) {
        G.tick(Math.min(0.05, dt));                        // the world moves on the clip's clock
        const m = mood(t);
        face.update(m, voice[i] ?? 0, t >= T.scream);
        red.update(clamp((m - 0.12) / 0.88));
        if (m > 0.3) ears(m > 0.95 ? 45 : 8 + 22 * m, m > 0.95 ? 1.5 : 0.6 + 0.6 * m, dt);
        st.update(dt);
        shot(t);
        draw(scene, cam);
        c.drawImage(renderer.domElement, 0, 0, W, H);
        frozen.getContext('2d').drawImage(out, 0, 0);       // kept for the freeze (before any bubbles)
        // bubbles: the character's lines over the head (replace with the transcript's exact words)
        const top = screen(BODY.localToWorld(new THREE.Vector3(HEAD[0], HEAD[1] + 1.6 * R, HEAD[2])));
        for (const [k, text, size, hot] of [['hello1', 'Hello?', 44, false], ['hello2', 'Yes?', 50, false], ['hello3', 'Hello?!', 54, true], ['hello4', 'Come on!!', 60, true], ['hello5', 'What?!', 68, true], ['scream', 'WHAAAT!!!', 76, true]]) {
          const a = T[k], d = k === 'scream' ? 9 : 0.85;
          if (t >= a && t < a + d) K.bubble(c, top.x, top.y - 40, text, (t - a) / 0.16, { size, hot });
        }
        if ([T.ring1, T.ring2].some(a => t >= a && t < a + 0.9)) K.ringIcon(c, top.x + 140, top.y - 60, t, (t - Math.max(...[T.ring1, T.ring2].filter(a => a <= t))) / 0.2);
      } else {
        // the freeze: the last frame held, drained a little, a slow creep in; shakes on each caption's hit
        const k = t - T.freeze, z = 1 + 0.04 * ease(k / 1.6);
        const s1 = t - T.cap1, s2 = t - T.cap2, shk = (s1 > 0 ? 13 * Math.exp(-s1 * 9) : 0) + (s2 > 0 ? 16 * Math.exp(-s2 * 9) : 0);
        c.save(); c.translate(W / 2 + noise(t, 97) * shk, H * 0.4 + noise(t + 4, 89) * shk); c.scale(z, z); c.translate(-W / 2, -H * 0.4);
        c.filter = `saturate(${lerp(1, 0.55, ease(k / 0.25))})`; c.drawImage(frozen, 0, 0); c.filter = 'none'; c.restore();
        if (k < 0.12) { c.fillStyle = `rgba(255,255,255,${0.7 * (1 - k / 0.12)})`; c.fillRect(0, 0, W, H); }
        if (s2 > 0) { c.fillStyle = `rgba(0,0,0,${0.4 * ease(s2 / 0.12)})`; c.fillRect(0, 0, W, H); }
        // the setup crashes in, then the punchline, bigger, in the middle; the setup steps back
        const back = ease(s2 / 0.15);
        K.crashCaption(c, W, H, t, T.cap1, 'Angry?', { y: 0.3, size: 150, fill: '#FFF1D2', edge: '#FFF1D2', tilt: 0.045, dim: 0.3 * back, lift: 50 * back });
        K.crashCaption(c, W, H, t, T.cap2, 'Come fish!', { y: 0.53, size: 150, lead: '🎣' });
        if (s2 > 0 && s2 < 0.12) { c.fillStyle = `rgba(255,236,190,${0.55 * (1 - s2 / 0.12)})`; c.fillRect(0, 0, W, H); }
        if (s1 > 0 && s1 < 0.1) { c.fillStyle = `rgba(255,255,255,${0.45 * (1 - s1 / 0.1)})`; c.fillRect(0, 0, W, H); }
      }
      // up from black at the start, down to black at the end
      const black = Math.max(clamp(1 - t / 0.35), ease((t - (len - 0.4)) / 0.4));
      if (black > 0) { c.fillStyle = `rgba(0,0,0,${black})`; c.fillRect(0, 0, W, H); }
    },
  };
  console.log('[cine] ready');
})();
