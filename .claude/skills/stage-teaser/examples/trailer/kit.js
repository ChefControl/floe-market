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
  let NEAR0 = null;
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
    // (`near`: how close a thing may come to the lens. A snowflake a hand from it is a white disc a tenth of the picture
    // wide: a night scene in falling snow asks for 1.2 m, and nothing nearer is drawn.)
    if (NEAR0 === null) NEAR0 = cam.near;
    const near = shot.near ?? NEAR0;
    if (cam.fov !== f || cam.far !== far || cam.near !== near) { cam.fov = f; cam.far = far; cam.near = near; cam.updateProjectionMatrix(); }
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
  const grp = document.createElement('canvas'), grpX = grp.getContext('2d'); grp.width = R.canvas.width; grp.height = R.canvas.height;
  R.renderer.render = (s, c) => {
    flagString.visible = false;
    if (dome.visible && c === cam) { dome.position.copy(cam.position); dome.scale.setScalar(Math.max(1, (cam.far * 0.8) / 150)); skyMat.uniforms.uLow.value.copy(R.fog.color); skyMat.uniforms.uT.value = (skyT += 1 / 30); }
    if (blur && c === cam && blur.n > 1) {
      if (acc.width !== R.canvas.width) { acc.width = R.canvas.width; acc.height = R.canvas.height; }
      // (averaged in two steps, twelve draws to a group and then the groups: a running average of 200 draws on an 8-bit
      // canvas gives the late ones a weight under half a grey level each, so they were lost and the smear was the first
      // few dozen copies, stepped. An outside review counted about twelve echoes of a deck edge.)
      if (grp.width !== R.canvas.width) { grp.width = R.canvas.width; grp.height = R.canvas.height; }
      const G = 12, groups = Math.max(1, Math.round(blur.n / G)), n = groups * G;
      for (let g = 0, i = 0; g < groups; g++) {
        for (let j = 0; j < G; j++, i++) {
          const sh = blur.at((i + 0.5) / n);
          cam.position.copy(sh.pos); lookAt(sh.look); cam.updateMatrixWorld();
          R.sun.position.copy(sh.look).add(R.sunOff); R.sun.target.position.copy(sh.look);
          if (sh.fogNear) { R.fog.near = sh.fogNear; R.fog.far = sh.fogFar; }
          draw(s, c);
          grpX.globalAlpha = 1 / (j + 1); grpX.drawImage(R.canvas, 0, 0, grp.width, grp.height);
        }
        accX.globalAlpha = 1 / (g + 1); accX.drawImage(grp, 0, 0);
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
    if (!shot && (cam.fov !== 40 || cam.far !== 200 || (NEAR0 !== null && cam.near !== NEAR0))) { cam.fov = 40; cam.far = 200; if (NEAR0 !== null) cam.near = NEAR0; cam.updateProjectionMatrix(); }
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

  // ---------- a held camera, and noise (SKILL.md "Weight, and not looking machine-made") ----------
  /** Smooth noise, -1..1, never repeating: for whatever's held (a camera, a breath, a flame's lean). A sine is a machine. */
  const n1 = (x, s = 0) => { const h = q => { const v = Math.sin(q * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (h(i) + (h(i + 1) - h(i)) * u) * 2 - 1; };
  /** A hand on the camera: the shot `s` drifts a little about what it's looking at, never the same way twice (`amt` 1 is a
   *  steady hand, 2 a long lens or a nervous one; `seed` a number of its own per shot). Returns a new shot. */
  function held(s, t, amt = 1, seed = 0) {
    const d = s.pos.distanceTo(s.look), w = d * Math.tan((s.fov ?? 40) * Math.PI / 360);
    const nx = n1(t * 1.3, seed) * 0.55 + n1(t * 3.1, seed + 1) * 0.3 + n1(t * 6.3, seed + 2) * 0.15, ny = n1(t * 1.1, seed + 3) * 0.55 + n1(t * 2.9, seed + 4) * 0.3 + n1(t * 5.7, seed + 5) * 0.15;
    const fw = s.look.clone().sub(s.pos).normalize(), rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    return { ...s, look: s.look.clone().add(rt.multiplyScalar(nx * w * 0.055 * amt)).add(up.multiplyScalar(ny * w * 0.046 * amt)), roll: (s.roll ?? 0) + n1(t * 0.7, seed + 6) * 0.011 * amt };
  }
  /** Something heavy happened at `t0`: the picture's knocked (by `amp` of its height), and takes most of a second to steady. */
  function jolt(s, t, t0, amp = 0.04, f = 34) {
    const dt = t - t0; if (dt < 0 || dt > 0.9) return s;
    const w = s.pos.distanceTo(s.look) * Math.tan((s.fov ?? 40) * Math.PI / 360), q = Math.exp(-5.5 * dt);
    s.look = s.look.clone().add(V(Math.sin(dt * f * 0.7 + 1) * 0.4, -Math.cos(dt * f), 0).multiplyScalar(amp * w * q)); s.roll = (s.roll ?? 0) + Math.sin(dt * f * 0.6) * amp * 0.25 * q;
    return s;
  }
  /** A bed of noise through the game's audio (`A` = audio.ts): HELD at `v` for `len` seconds, in over `a`, out over `r`.
   *  (The engine's own envelope fades from the start, so a long `d` is a long fade: a 'wind' made that way is gone in a
   *  second. And nothing sounds on a take's first frames: start a bed at 0.12 s, not 0.) */
  const bed = (A, f, f2, q, len, v, a = 0.5, r = 0.6, kind) => A.noise({ f, f2, q, kind, a, hold: Math.max(0, len - a - r), d: r, v });
  /** AIR: sea, wind, a rush of water, a fire's roar, a room. Made as the game makes its own (ambience.ts): BROWN noise
   *  through a low filter with a second low-pass on top, its level MOVING all the time (waves with calm between, gusts),
   *  and quiet. A steady band of white noise, however it measures, is static to the ear: the owner's first listen said
   *  "heavy constant static... very harsh". `soft(A, { kind, f, q, smooth }, bus)` starts one, silent (after the take's
   *  first frames: the audio must be running); set its level every frame with `.to(v)`. It plays on the game's ambience
   *  bus unless `bus` says 'cue' (for a take that dims the world: the cue bus is about four times as loud). */
  // (Air is all round you: each bed is TWO, cut from different parts of the same noise and set left and right. One bed in
  // the middle made the whole film mono, which an outside review measured. Two that don't match add up to the same
  // loudness at 0.71 each, and to the same sound on one speaker.)
  const soft = (A, o, bus) => { const dest = A.buses[bus ?? 'amb'], from = o.from ?? 0.6;
    const side = (fr, pan) => { const b = A.bed({ soft: true, ...o, from: fr % 3 }), p = A.ac.createStereoPanner(); p.pan.value = pan; b.g.disconnect(); b.g.connect(p); p.connect(dest); return b; };
    const l = side(from, -0.72), r = side(from + 1.37, 0.72);
    return { g: l.g, to: (v, secs = 0.12) => { const x = Math.max(0, v) * 0.7071; A.glide(l.g.gain, x, secs); A.glide(r.g.gain, x, secs); }, stop: () => { l.stop(); r.stop(); } }; };
  /** A wave, `p` (0 to 1) of the way through: it rises, breaks, runs back out (the game's own). And a sea of them at `t`:
   *  two lengths out of step, calm between, 0.2 to 1. */
  const wave = p => (p < 0.3 ? ease(p / 0.3) : (1 - (p - 0.3) / 0.7) ** 2);
  const swell = (t, a = 3.4, b = 5.3) => 0.2 + 0.8 * Math.max(wave((t / a + 0.1) % 1), 0.7 * wave((t / b + 0.45) % 1));
  /** The forest is planted afresh, at random, every time the game loads (world.ts), and baked into one mesh per 14 m
   *  patch and material: a ray doesn't find a pine and a clear spot in one load has a tree on it in the next (a camera
   *  INSIDE a pine shows as a dark slab across the picture). So a scene on open ground clears its ground: every tree
   *  mesh (world.ts TREE_MATS) whose middle is inside the rectangle is hidden. Returns how many. */
  const clearTrees = (W, x0, x1, z0, z1) => { let n = 0; const mats = new Set(W.TREE_MATS);
    R.scene.traverse(o => { if (!o.isMesh || !mats.has(o.material)) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox, cx = (b.min.x + b.max.x) / 2 + o.position.x, cz = (b.min.z + b.max.z) / 2 + o.position.z;
      // (the trunks are one mesh for the whole forest: it goes too, or the cleared ground is a field of stumps; under their
      // needles the other trees' trunks are hardly seen)
      const whole = b.max.x - b.min.x > 30 || b.max.z - b.min.z > 30, over = b.max.x > x0 && b.min.x < x1 && b.max.z > z0 && b.min.z < z1;
      if ((cx > x0 && cx < x1 && cz > z0 && cz < z1) || (whole && over)) { o.visible = false; n++; } });
    return n; };
  /** Better than clearing trees (their trunks are merged into the scenery's one mesh and stay behind as stumps): FIND
   *  open ground for this load's forest. The needles' own vertices say where the trees are; `discs` are what must be
   *  clear, each [dx, dz, radius] from the spot (the set, its people, each camera and the line to it). Returns the spot in
   *  the rectangle with the most room, { x, z, slack } (slack under 0: something's still in the way). */
  const openGround = (W, x0, x1, z0, z1, discs) => {
    const cell = 0.5, occ = new Set(), mats = new Set([W.TREE_MATS[1], W.TREE_MATS[2], W.TREE_MATS[4]]); // (needles, and the snow mounds: a load put a mound on the campfire's ice slab, the fillets half buried in it)
    R.scene.traverse(o => { if (!o.isMesh || !mats.has(o.material)) return; for (let v = o; v; v = v.parent) if (!v.visible) return;
      const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) occ.add(Math.round((p.getX(i) + o.position.x) / cell) + ',' + Math.round((p.getZ(i) + o.position.z) / cell)); });
    const cells = [...occ].map(s => s.split(',').map(n => n * cell)).filter(([x, z]) => x > x0 - 12 && x < x1 + 12 && z > z0 - 12 && z < z1 + 12);
    let best = null;
    for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5) {
      let slack = 99; for (const [dx, dz, r] of discs) { let d = 99; for (const [cx, cz] of cells) { const q = Math.hypot(cx - x - dx, cz - z - dz); if (q < d) d = q; } slack = Math.min(slack, d - r); if (best && slack <= best.slack) break; }
      if (!best || slack > best.slack) best = { x, z, slack }; }
    return best; };
  window.K = { R, T3, V, clamp, ease, easeIO, easeOut, lerp, path, caption, letterbox, lids, fade, vignette, sky, n1, held, jolt, bed, soft, wave, swell, clearTrees, openGround,
    set cam(s) { shot = s; }, get cam() { return shot; },
    /** Motion blur this frame: { n: draws, at(k 0..1): the camera { pos, look } across the frame } or null. */
    set blur(b) { blur = b; },
    /** Called each frame after the game's tick and before the camera's set: pose things and set K.cam here. */
    set pose(f) { pose = f; },
    /** Called each frame once the camera's set (before the draw): place page things over the world here. */
    set after(f) { after = f; } };
  window.__kitReady = true;
})();
