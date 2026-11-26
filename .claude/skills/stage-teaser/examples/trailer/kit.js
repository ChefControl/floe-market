// Trailer kit, loaded before a shot's script (render-play.mjs <kit.js> is concatenated by run.sh).
// window.K: camera override (a path of keys the game's camera follows), captions in the game's banner lettering,
// easing, and the sun kept over what the camera looks at.
(async () => {
  const R = await window.__mod('render.ts');
  const T3 = await import('/node_modules/.vite/deps/three.js');
  const { Vector3 } = T3;
  const V = (x, y, z) => new Vector3(x, y, z);
  const clamp = (k, a = 0, b = 1) => Math.min(b, Math.max(a, k));
  const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeIO = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const cam = R.camera, lookAt = cam.lookAt.bind(cam);
  /** The shot's camera this frame: { pos, look, fov } or null for the game's own. */
  let shot = null, after = null, pose = null, blur = null;
  // (the game aims its camera with lookAt once a frame, main.ts, before it places its bubbles and draws: taking over
  // there keeps the bubbles on the people)
  cam.lookAt = (...a) => {
    // (the game's tick has posed everyone by now: a shot poses the chef and its props here, and picks its camera)
    pose?.();
    if (!shot) return lookAt(...a);
    cam.position.copy(shot.pos);
    lookAt(shot.look);
    if (shot.roll) cam.rotateZ(shot.roll);
    const f = shot.fov ?? 40;
    // (the game's camera sees 200 m: a shot from higher up says how far it needs)
    const far = shot.far ?? 200;
    if (cam.fov !== f || cam.far !== far) { cam.fov = f; cam.far = far; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    after?.(cam);
  };
  // Marketing leaves out elections, voting and Israel (owner, 2026-10-27): Floe Sushi's "World famous" string of world
  // flags has Israel's in the middle, so it's taken down for every shot (ads.ts restaurantAds, the last campaign).
  const { restaurantAds } = await window.__mod('ads.ts');
  const flagString = restaurantAds.at(-1).g;
  const draw = R.renderer.render.bind(R.renderer);
  // Motion blur for a camera that's really moving (a whip round the dock): the frame is drawn `n` times with the camera
  // at as many moments across it, and the draws are averaged on a canvas laid over the game's.
  const acc = document.createElement('canvas'); acc.width = R.canvas.width; acc.height = R.canvas.height;
  Object.assign(acc.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: 18, pointerEvents: 'none', display: 'none' });
  const accX = acc.getContext('2d');
  R.renderer.render = (s, c) => {
    flagString.visible = false;
    if (dome.visible && c === cam) { dome.position.copy(cam.position); dome.scale.setScalar(Math.max(1, (cam.far * 0.8) / 150)); skyMat.uniforms.uLow.value.copy(R.fog.color); skyMat.uniforms.uT.value = (skyT += 1 / 30); }
    if (blur && c === cam && blur.n > 1) {
      if (acc.width !== R.canvas.width) { acc.width = R.canvas.width; acc.height = R.canvas.height; }
      for (let i = 0; i < blur.n; i++) {
        const sh = blur.at((i + 0.5) / blur.n);
        cam.position.copy(sh.pos); lookAt(sh.look); cam.updateMatrixWorld();
        R.sun.position.copy(sh.look).add(R.sunOff); R.sun.target.position.copy(sh.look);
        if (sh.fogNear) { R.fog.near = sh.fogNear; R.fog.far = sh.fogFar; }
        draw(s, c);
        accX.globalAlpha = 1 / (i + 1); accX.drawImage(R.canvas, 0, 0, acc.width, acc.height);
      }
      acc.style.display = 'block';
      return;
    }
    acc.style.display = 'none';
    if (shot && c === cam) {
      // the sun (and its shadows) over what the camera's on, not over the chef
      const at = shot.sun ?? shot.look;
      R.sun.position.copy(at).add(R.sunOff); R.sun.target.position.copy(at);
      if (shot.fogNear) { R.fog.near = shot.fogNear; R.fog.far = shot.fogFar; }
    }
    if (!shot && (cam.fov !== 40 || cam.far !== 200)) { cam.fov = 40; cam.far = 200; cam.updateProjectionMatrix(); }
    draw(s, c);
  };
  /** A camera path: keys [{t, pos:[x,y,z], look:[x,y,z], fov}] eased between, held after the last. */
  function path(keys, t, e = easeIO) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = b === a ? 0 : e((t - a.t) / (b.t - a.t));
    const mix = (p, q) => V(...p).lerp(V(...q), k);
    return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), fov: lerp(a.fov ?? 40, b.fov ?? 40, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
  }

  // ---------- captions: the game's banner lettering (design system Banner: Baloo 2 800, gold title, ink outline) ----
  const cap = document.createElement('div'); cap.id = 'sub';
  const css = document.createElement('style');
  css.textContent = `
    #sub{position:fixed;left:0;right:0;bottom:9%;z-index:20;pointer-events:none;text-align:center;font-family:"Floe Emoji","Baloo 2","Trebuchet MS",system-ui,sans-serif;font-weight:800;}
    #sub .t{--o:3px;--ink:#173042;display:inline-block;font-size:58px;line-height:1;color:#FFC34A;letter-spacing:.01em;
      text-shadow:var(--o) 0 0 var(--ink),calc(-1*var(--o)) 0 0 var(--ink),0 var(--o) 0 var(--ink),0 calc(-1*var(--o)) 0 var(--ink),
      var(--o) var(--o) 0 var(--ink),calc(-1*var(--o)) var(--o) 0 var(--ink),var(--o) calc(-1*var(--o)) 0 var(--ink),
      calc(-1*var(--o)) calc(-1*var(--o)) 0 var(--ink),0 calc(var(--o) + 5px) 0 rgba(20,30,40,.45);}
    #sub .k{--o:2px;--ink:#173042;display:block;margin-bottom:10px;font-size:20px;letter-spacing:.3em;color:#fff;text-transform:uppercase;
      text-shadow:var(--o) 0 0 var(--ink),calc(-1*var(--o)) 0 0 var(--ink),0 var(--o) 0 var(--ink),0 calc(-1*var(--o)) 0 var(--ink),0 calc(var(--o) + 3px) 0 rgba(20,30,40,.45);}
    #teaserBars{position:fixed;inset:0;z-index:19;pointer-events:none;}
    #teaserBars::before,#teaserBars::after{content:"";position:absolute;left:0;right:0;height:var(--bar,0px);background:#000;}
    #teaserBars::before{top:0} #teaserBars::after{bottom:0}
    #teaserLids{position:fixed;inset:0;z-index:19;pointer-events:none;overflow:hidden;display:none;}
    #teaserLids i{position:absolute;left:-18%;width:136%;height:62%;background:#000;filter:blur(18px);}
    #teaserLids i:first-child{top:0;border-radius:0 0 50% 50%/0 0 38% 38%;} #teaserLids i:last-child{bottom:0;border-radius:50% 50% 0 0/38% 38% 0 0;}
    #teaserFade{position:fixed;inset:0;z-index:30;pointer-events:none;background:#000;opacity:0;}
    #teaserVig{position:fixed;inset:0;z-index:17;pointer-events:none;opacity:0;background:radial-gradient(ellipse 78% 78% at 50% 50%, rgba(8,16,26,0) 52%, rgba(8,16,26,.55) 100%);}`;
  document.head.append(css);
  document.body.append(cap);
  const bars = document.createElement('div'); bars.id = 'teaser'; bars.innerHTML = '<div id="teaserVig"></div><div id="teaserBars"></div><div id="teaserLids"><i></i><i></i></div><div id="teaserFade"></div>';
  document.body.append(bars);
  bars.prepend(acc);
  const barsEl = bars.querySelector('#teaserBars'), fadeEl = bars.querySelector('#teaserFade'), vigEl = bars.querySelector('#teaserVig');
  /** A soft darkening of the corners, 0 to 1: for the story shots (never over play, where the HUD lives). */
  const vignette = k => { vigEl.style.opacity = clamp(k); };

  // ---------- a sky: the game's is one flat colour, fine from its own camera and flat in a low, wide shot ----------
  // A dome round the camera: the game's own sky colour at the horizon (so the fog still meets it), deepening
  // overhead, a pale sun with a wide glow, and thin cloud near the horizon. K.sky({ top, sun: [x, y, z], glow }) or null.
  const { Mesh, SphereGeometry, ShaderMaterial, BackSide, Color } = T3;
  const skyMat = new ShaderMaterial({
    side: BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTop: { value: new Color(0x86BDE6) }, uLow: { value: new Color(0xCFEAF5) }, uSun: { value: V(-0.5, 0.3, -0.8).normalize() }, uGlow: { value: new Color(0xFFF4D6) }, uK: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uSun; uniform vec3 uGlow; uniform float uK; uniform float uT; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vD); float up = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(uLow, uTop, pow(smoothstep(0.0, 0.75, up), 0.8));
        float s = max(0.0, dot(d, uSun));
        c += uGlow * (pow(s, 6.0) * 0.07 + pow(s, 60.0) * 0.16 + smoothstep(0.9994, 0.9998, s) * 0.45) * uK;
        // thin cloud: long streaks low in the sky, drifting
        // (a flat layer overhead, seen from below: no seam anywhere round the sky, and the streaks lie along the horizon)
        vec2 pl = d.xz / (up + 0.2);
        vec2 q = vec2(pl.x * 0.55 + uT * 0.004, pl.y * 2.1 + 3.0);
        float cl = smoothstep(0.52, 0.8, n(q) * 0.6 + n(q * 2.3 + 7.0) * 0.4) * smoothstep(0.03, 0.12, up) * (1.0 - smoothstep(0.25, 0.55, up));
        c = mix(c, vec3(1.0), cl * 0.5 * uK);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new Mesh(new SphereGeometry(150, 32, 16), skyMat); dome.renderOrder = -100; dome.frustumCulled = false; dome.visible = false;
  R.scene.add(dome);
  let skyT = 0;
  /** The sky dome on (with its colours) or off. Its horizon follows the game's own fog colour every frame. */
  function sky(o) {
    dome.visible = !!o;
    if (!o) return;
    if (o.top !== undefined) skyMat.uniforms.uTop.value.setHex(o.top);
    if (o.sun) skyMat.uniforms.uSun.value.set(...o.sun).normalize();
    if (o.glow !== undefined) skyMat.uniforms.uGlow.value.setHex(o.glow);
    skyMat.uniforms.uK.value = o.k ?? 1;
  }
  /** The caption at time t: [from, to, text, kicker?] — pops in with the banner's overshoot, out with a quick fade. */
  function caption(list, t) {
    // (?nocap in the address: clean plates, no captions, for loops cut from the takes)
    if (location.search.includes('nocap')) { cap.style.opacity = 0; return; }
    const c = list.find(([a, b]) => t >= a && t < b);
    if (!c) { cap.style.opacity = 0; return; }
    const [a, b, text, kicker] = c;
    const html = (kicker ? `<span class="k">${kicker}</span>` : '') + `<span class="t">${text}</span>`;
    if (cap.dataset.h !== html) { cap.innerHTML = html; cap.dataset.h = html; }
    const kin = clamp((t - a) / 0.28), back = 1 - Math.pow(1 - kin, 3) * (1 - 1.7 * (1 - kin)); // (a slight overshoot)
    const s = lerp(0.7, 1, back), o = Math.min(clamp((t - a) / 0.12), clamp((b - t) / 0.2));
    cap.style.opacity = o; cap.style.transform = `scale(${s})`;
  }
  /** Black bars top and bottom, `px` tall each. */
  const letterbox = px => barsEl.style.setProperty('--bar', `${px}px`);
  /** Eyelids, for a look through someone's eyes: 0 open, 1 shut. Soft and curved, where letterbox bars read as a film format. */
  const lidsEl = bars.querySelector('#teaserLids');
  const lids = k => { k = clamp(k); lidsEl.style.display = k > 0.001 ? 'block' : 'none'; const y = (1 - k) * 100;
    lidsEl.firstChild.style.transform = `translateY(${-y}%)`; lidsEl.lastChild.style.transform = `translateY(${y}%)`; };
  /** Black over everything, 0 to 1. */
  const fade = k => { fadeEl.style.opacity = clamp(k); };

  window.K = { R, T3, V, clamp, ease, easeIO, easeOut, lerp, path, caption, letterbox, lids, fade, vignette, sky,
    set cam(s) { shot = s; }, get cam() { return shot; },
    /** Motion blur this frame: { n: draws, at(k 0..1): the camera { pos, look } across the frame } or null. */
    set blur(b) { blur = b; },
    /** Called each frame after the game's tick and before the camera's set: pose things and set K.cam here. */
    set pose(f) { pose = f; },
    /** Called each frame once the camera's set (before the draw): place page things over the world here. */
    set after(f) { after = f; } };
  window.__kitReady = true;
})();
