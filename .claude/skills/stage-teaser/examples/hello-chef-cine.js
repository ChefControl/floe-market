// Mr. Fugu breaks out of the dock at night: three shoves at the trapdoor, the blast, smoke, a silhouette, the reveal,
// and "Hello, Chef." Built from the game's own scene and models, rendered a frame at a time on a fixed clock.
(async () => {
  const R = window.__mods.R, THREE_ = await window.__mod('render.ts');
  const { Fugu, Hatch } = await window.__mod('fugu.ts');
  const { HATCH } = await window.__mod('offer.ts');
  const { player } = window.__mods;
  const { scene, renderer, hemi, sun, fog } = R;
  const V3 = HATCH.constructor, Col = scene.background.constructor;
  const Persp = R.camera.constructor;
  // three's classes, borrowed from objects that are already about
  const SpriteMat = (await import('/node_modules/.vite/deps/three.js').catch(() => null))?.SpriteMaterial;
  const T3 = await import('/node_modules/.vite/deps/three.js');
  const { AdditiveBlending, BackSide, CylinderGeometry, SpotLight, Sprite, SpriteMaterial, CanvasTexture, PointLight, Color, MathUtils, Mesh, PlaneGeometry, BoxGeometry, ShaderMaterial, MeshLambertMaterial, Group, AlwaysDepth, RepeatWrapping, DoubleSide } = T3;

  // Stop the game's own clock (a stale tab doesn't tick: save.ts), and step its world on the clip's clock instead, a
  // frame at a time, so the diners and chefs behind him move smoothly rather than jumping between frames.
  const SAVE = await window.__mod('save.ts'), GAME = await window.__mod('game.ts');
  // (and no spring petals drifting across the night: they read as specks and blobs flying about behind him)
  const { weather } = await window.__mod('season.ts');
  SAVE.replaceSave(SAVE.deviceStore.read() ?? '');
  // Stop the game drawing on its own; this script draws every frame.
  const draw = renderer.render.bind(renderer);
  renderer.render = () => {};
  player.g.visible = false;
  // the game's floor markers (upgrade and shop squares) aren't part of this scene
  scene.traverse(o => {
    const p = o.geometry?.parameters, m = o.material;
    if (o.isMesh && p && p.width && p.width <= 3.5 && m?.map?.image instanceof HTMLCanvasElement && m.transparent) o.visible = false;
  });
  player.g.position.set(HATCH.x - 6, HATCH.y, HATCH.z + 6);

  const W = R.canvas.width, H = R.canvas.height;
  const cam = new Persp(38, W / H, 0.05, 200);
  const H0 = HATCH.clone();

  // ---------- the hatch and him ----------
  const hatch = new Hatch();
  hatch.position.copy(H0);
  scene.add(hatch);
  hatch.light.intensity = 0; hatch.light.distance = 9; hatch.light.decay = 1.4;
  const fugu = new Fugu();
  scene.add(fugu);
  fugu.position.set(H0.x, H0.y - 1.9, H0.z - 0.05);
  // He keeps his own colours, darkened while he's a silhouette in the smoke.
  const looks = [];
  fugu.traverse(o => {
    if (!o.isMesh) return;
    if (!o.material.__own) { o.material = o.material.clone(); o.material.__own = true; }
    looks.push({ m: o.material, c: o.material.color.clone(), e: o.material.emissive ? o.material.emissive.clone() : null });
  });
  // the lens keeps its glint: find his lens material (the one with a white emissive) and leave it his own
  const lens = fugu.children.length && Object.values(fugu).find(v => v && v.isMaterial && v.emissive);
  if (lens) fugu.traverse(o => { if (o.isMesh && o.material.color.equals(lens.color) && o.material.emissive?.getHex() === 0xFFFFFF) o.material = lens; });
  const lensMeshes = []; fugu.traverse(o => { if (o.isMesh && o.material === lens) lensMeshes.push(o); });
  function reveal(k) {
    for (const l of looks) { l.m.color.copy(l.c).multiplyScalar(0.025 + 0.975 * k); }
    if (lens) lens.color.setHex(0x111111);
  }
  // ---- a real hole: the game only paints one on the deck ----
  // An invisible cutter pushes the depth inside the opening back to the far plane, so the shaft under the deck shows
  // through it (and only through it), and he can rise out of it. It's drawn after the deck and before everything that
  // belongs to the hatch.
  hatch.traverse(o => { if (o.isMesh && o.material === hatch.pit) o.visible = false; });
  const OPEN = 1.1, DEEP = 2.6;
  const cutter = new Mesh(new PlaneGeometry(OPEN, OPEN), new ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); gl_FragDepth = 1.0; }',
    colorWrite: false, depthWrite: true, depthTest: true, depthFunc: AlwaysDepth,
  }));
  cutter.rotation.x = -Math.PI / 2; cutter.position.set(H0.x, H0.y + 0.004, H0.z); cutter.renderOrder = 1;
  scene.add(cutter);
  // the shaft: rough plank walls, a ladder down the north side, and a furnace glow at the bottom
  const boards = (() => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = '#5A3A24'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 6; i++) { x.fillStyle = ['#4E321F', '#5F3E27', '#553622'][i % 3]; x.fillRect(i * 21.3 + 1, 0, 19.3, 256); x.fillStyle = '#1E120A'; x.fillRect(i * 21.3, 0, 1.5, 256); }
    for (let j = 0; j < 40; j++) { x.fillStyle = 'rgba(20,10,4,0.25)'; x.fillRect(Math.random() * 128, Math.random() * 256, 1, 8 + Math.random() * 30); }
    const t = new CanvasTexture(cv); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(1, 2); return t;
  })();
  const shaft = new Group(); shaft.position.copy(H0);
  const wallMat = new MeshLambertMaterial({ color: 0xFFFFFF, map: boards });
  for (const [x, z, ry] of [[0, -OPEN / 2, 0], [0, OPEN / 2, Math.PI], [-OPEN / 2, 0, Math.PI / 2], [OPEN / 2, 0, -Math.PI / 2]]) {
    const w = new Mesh(new PlaneGeometry(OPEN, DEEP), wallMat); w.position.set(x, -DEEP / 2, z); w.rotation.y = ry; shaft.add(w);
  }
  const floor = new Mesh(new PlaneGeometry(OPEN, OPEN), new MeshLambertMaterial({ color: 0x2A1208, emissive: 0xFF5A1C, emissiveIntensity: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -DEEP; shaft.add(floor);
  const rail = new MeshLambertMaterial({ color: 0x6E4B2E });
  for (const sx of [-0.3, 0.3]) { const r = new Mesh(new BoxGeometry(0.045, DEEP, 0.045), rail); r.position.set(sx, -DEEP / 2, -OPEN / 2 + 0.07); shaft.add(r); }
  for (let y = -0.35; y > -DEEP; y -= 0.3) { const r = new Mesh(new BoxGeometry(0.6, 0.035, 0.035), rail); r.position.set(0, y, -OPEN / 2 + 0.07); shaft.add(r); }
  scene.add(shaft);
  const beamMat = new ShaderMaterial({
    uniforms: { uI: { value: 0 }, uT: { value: 0 }, uC: { value: new Color(0xFF8A44) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uI; uniform float uT; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float up = pow(1.0 - vUv.y, 1.7);
        float face = pow(abs(dot(vN, vV)), 2.0);
        float rays = 0.75 + 0.25 * sin(vUv.x * 46.0 + uT * 0.7) * sin(vUv.x * 17.0 - uT * 0.4);
        float a = uI * up * face * rays;
        gl_FragColor = vec4(uC * a, a);
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide,
  });
  const beam = new Mesh(new CylinderGeometry(1.05, 0.5, 4.6, 32, 1, true), beamMat);
  beam.position.set(H0.x, H0.y + 2.3, H0.z); beam.renderOrder = 3;
  scene.add(beam);
  // everything of the hatch's, the shaft's and his is drawn after the cutter
  for (const g of [hatch, shaft, fugu]) g.traverse(o => { o.renderOrder = 2; });
  // Glow from under the dock: a stronger light down in the shaft, to light its walls and backlight the smoke and him.
  const under = new PointLight(0xFF6A2A, 0, 10, 1.3);
  under.position.set(H0.x, H0.y - 1.3, H0.z + 0.2);
  scene.add(under);
  const key = new PointLight(0xFFE2C2, 0, 6, 1.2);
  const spot = new SpotLight(0xFFE6CC, 0, 9, 0.13, 0.7, 1.0);
  spot.position.set(H0.x + 0.5, H0.y + 4.4, H0.z - 1.9);
  spot.target.position.set(H0.x, H0.y + 1.45, H0.z);
  scene.add(spot); scene.add(spot.target);
  key.position.set(H0.x + 0.9, H0.y + 2.1, H0.z - 1.7);
  scene.add(key);

  // ---------- smoke ----------
  function puffTex(seed) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 22; i++) {
      const px = 64 + (rnd() - 0.5) * 56, py = 64 + (rnd() - 0.5) * 56, r = 12 + rnd() * 18;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${0.22 + rnd() * 0.2})`); g.addColorStop(0.6, `rgba(255,255,255,${0.08 + rnd() * 0.06})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    x.globalCompositeOperation = 'destination-in';
    const mask = x.createRadialGradient(64, 64, 20, 64, 64, 64); mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = mask; x.fillRect(0, 0, 128, 128);
    const t = new CanvasTexture(c); return t;
  }
  const TEX = [1, 2, 3, 4].map(puffTex);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const puffs = [];
  function emit(n, o) {
    for (let i = 0; i < n; i++) {
      const m = new SpriteMaterial({ map: TEX[i % 4], transparent: true, depthWrite: false, opacity: 0, fog: true });
      const s = new Sprite(m);
      s.userData.smoke = true;
      scene.add(s);
      const a = rnd() * Math.PI * 2, toCam = Math.sin(a) < 0 ? (o.camK ?? 1) : 1, out = (o.out[0] + rnd() * (o.out[1] - o.out[0])) * toCam;
      puffs.push({
        s, t0: o.t, life: o.life[0] + rnd() * (o.life[1] - o.life[0]), rot: (rnd() - 0.5) * 0.6,
        p: new V3(H0.x + Math.cos(a) * o.r * rnd(), H0.y + (o.y ?? 0.02), H0.z + Math.sin(a) * o.r * rnd() + (o.dz ?? 0)),
        v: new V3(Math.cos(a) * out, o.up[0] + rnd() * (o.up[1] - o.up[0]), Math.sin(a) * out * (o.flat ?? 1)),
        size: o.size[0] + rnd() * (o.size[1] - o.size[0]), grow: o.grow, peak: o.peak, dust: o.dust,
      });
    }
  }
  const HITS = [1.9, 3.75, 5.6], BLAST = HITS[2];
  // dust squeezed out of the cracks on the first two shoves
  emit(14, { t: HITS[0] + 0.04, r: 0.6, out: [1.2, 2.2], up: [0.3, 0.9], life: [0.9, 1.6], size: [0.12, 0.22], grow: 0.9, peak: 0.55, dust: true, flat: 1 });
  emit(22, { t: HITS[1] + 0.04, r: 0.6, out: [1.6, 2.8], up: [0.4, 1.2], life: [1.1, 1.9], size: [0.15, 0.3], grow: 1.2, peak: 0.65, dust: true, flat: 1 });
  // the blast: a wall of smoke, then a column still pouring out of the hole while he rises through it
  emit(75, { t: BLAST, r: 0.5, out: [0.6, 3.0], up: [1.4, 4.4], life: [2.6, 4.6], size: [0.6, 1.1], grow: 1.5, peak: 0.78, camK: 0.45 });
  emit(36, { t: BLAST + 0.05, r: 0.7, out: [2.0, 4.5], up: [0.1, 0.6], life: [1.4, 2.6], size: [0.5, 0.9], grow: 1.6, peak: 0.7, flat: 1, camK: 0.6 });
  for (let k = 0; k < 20; k++) emit(3, { t: BLAST + 0.25 + k * 0.14, r: 0.45, out: [0.2, 0.7], up: [1.0, 2.2], life: [2.4, 3.8], size: [0.5, 0.9], grow: 1.1, peak: 0.5 - k * 0.018, dz: 0.3, camK: 0.3 });
  const MOON = new Color(0x2E3440), FIRE = new Color(0xFF7A36), DUST = new Color(0x6B5A4A), tmp = new Color();

  function updPuffs(t, glow) {
    for (const q of puffs) {
      const a = t - q.t0;
      if (a < 0 || a > q.life) { q.s.visible = false; continue; }
      q.s.visible = true;
      // drag: they burst out, then hang and drift off on the night air (east, and up)
      const d = (1 - Math.exp(-a * 1.6)) / 1.6;
      q.s.position.set(q.p.x + q.v.x * d + a * 0.28, q.p.y + q.v.y * d + a * 0.22, q.p.z + q.v.z * d + a * 0.05);
      const sc = q.size * (1 + q.grow * Math.sqrt(a) * 1.4);
      q.s.scale.setScalar(sc);
      q.s.material.rotation = q.rot * a + q.rot * 3;
      const u = a / q.life;
      let op = q.peak * Math.min(1, a / 0.08) * Math.pow(1 - u, 1.6);
      // once he's rising, keep the smoke between the camera and him thin, so he reads as a crisp shape against the light
      if (t > BLAST + 0.8 && q.s.position.z < H0.z - 0.35) op *= lerp(1, 0.3, ease((t - BLAST - 0.8) / 0.8));
      q.s.material.opacity = op;
      // lit from the hole: bright orange inside the column of light over it, falling off with height; outside it, dark
      // night smoke
      const rr = Math.hypot(q.s.position.x - H0.x, q.s.position.z - H0.z);
      const inCol = clamp(1 - (rr - 0.35) / 1.0), hgt = clamp(1 - (q.s.position.y - H0.y) / 4.5);
      const lit = Math.min(1, glow * inCol * (0.35 + 0.65 * hgt));
      tmp.copy(q.dust ? DUST : MOON).lerp(FIRE, lit);
      tmp.multiplyScalar(0.7 + 1.3 * lit + (q.dust ? 0.3 : 0));
      q.s.material.color.copy(tmp);
    }
  }

  // ---------- timing helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const lv = (a, b, k) => new V3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
  const at = (x, y, z) => new V3(H0.x + x, H0.y + y, H0.z + z);
  // how far the lid's thrown up by a shove: up fast, slammed back down, a bounce or two
  function shove(a, amp) {
    if (a < 0) return 0;
    if (a < 0.07) return amp * Math.sin(a / 0.07 * Math.PI / 2);
    const b = a - 0.07;
    return amp * Math.exp(-b * 9) * Math.abs(Math.cos(b * 15));
  }
  const noise = (t, f) => Math.sin(t * f) * 0.6 + Math.sin(t * f * 2.31 + 1.3) * 0.4;

  // ---------- the overlay: vignette, grain, flashes, the line ----------
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d');
  out.id = 'teaser'; Object.assign(out.style, { position: 'fixed', inset: '0', width: W + 'px', height: H + 'px', zIndex: 4 });
  document.body.appendChild(out);
  const grain = document.createElement('canvas'); grain.width = grain.height = 256;
  { const g = grain.getContext('2d'), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); }
  const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
  // the game's speech bubble (#offerSay), at the clip's scale: white, his name on a red tag, its tail pointing down at him
  function rrect(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const toScreen = v => { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
  const mouthAt = () => toScreen(fugu.lips.getWorldPosition(new V3()));
  // The game's own speech bubble (#offerSay), placed as drawOffer() places it: beside his head if there's room,
  // otherwise over it. Its text types out as in the game; the page is filmed with it on top.
  const root = document.getElementById('offer'), say = document.getElementById('offerSay'), lineEl = document.getElementById('offerLine');
  const style = document.createElement('style');
  style.textContent = '#offerShade,#offerAlert,#offerPick,#offerBlink{display:none!important} #offerSay{transition:none!important;width:fit-content!important;min-width:170px;white-space:nowrap}';
  document.head.appendChild(style);
  root.hidden = false;
  root.hidden = true;
  const subEl = document.createElement('div');
  subEl.id = 'sub';
  Object.assign(subEl.style, { position: 'fixed', left: '50%', top: (H - H * 0.125) + 'px', zIndex: 6, fontSize: '30px', fontWeight: 800, lineHeight: 1.15,
    padding: '9px 26px', borderRadius: '24px', background: '#C93F25', color: '#fff', boxShadow: '0 4px 0 rgba(120,35,20,.45)',
    width: 'max-content', fontFamily: getComputedStyle(document.body).fontFamily, opacity: 0, whiteSpace: 'nowrap' });
  document.body.appendChild(subEl);
  function subtitle(t) {
    const a = t - S1;
    if (a < 0 || t >= END - 0.04) { subEl.style.opacity = 0; return; }
    subEl.textContent = t >= S2 ? LINE : 'Hello,';
    const k = clamp(a / 0.2);
    subEl.style.opacity = k;
    subEl.style.transform = `translate(-50%, calc(-50% + ${(1 - k) * 10}px))`;
  }
  function bubble(text, a, done) {
    say.classList.toggle('on', a >= 0);
    if (a < 0) { say.style.opacity = '0'; return; }
    const k = clamp(a / POP), head = toScreen(new V3(fugu.position.x, fugu.position.y + 1.2, fugu.position.z));
    lineEl.textContent = text;
    say.classList.toggle('done', done);
    const edge = toScreen(new V3(fugu.position.x, fugu.position.y + 1.2, fugu.position.z).add(new V3(1, 0, 0).applyQuaternion(cam.quaternion).multiplyScalar(0.36))).x;
    const w = say.offsetWidth, above = edge + w + 12 > W;
    say.classList.toggle('above', above);
    const x = above ? Math.max(12, Math.min(head.x - w / 2, W - w - 12)) : edge;
    const y = above ? head.y - 70 : head.y - 10;
    say.style.left = x + 'px'; say.style.top = Math.max(say.offsetHeight + 16, y) + 'px';
    say.style.opacity = String(k);
    say.style.transform = `translateY(calc(-100% + ${(1 - k) * 8}px))`;
  }
  // Anime speed lines rushing in on the crash zoom, and a sparkle off his shades.
  function zoomFx(z, frame, fade = 1, whip = false) {
    const cx = W / 2, cy = H / 2;
    // a white blink on the impact
    if (z < 0.2) { c.fillStyle = `rgba(255,255,255,${0.55 * Math.exp(-z * 22) * (z > 0.11 ? 1 : 0)})`; c.fillRect(0, 0, W, H); }
    const lines = z < 0.13 ? 1 : Math.exp(-(z - 0.13) * 2.2);
    let sd = frame * 7919 + 13; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    c.save(); c.fillStyle = `rgba(255,255,255,${0.75 * lines * fade})`;
    for (let n = 0; n < 70; n++) {
      const ang = r() * Math.PI * 2, r0 = H * (0.3 + r() * 0.22), w = (2 + r() * 7) * Math.PI / 1800;
      const R = H * 1.2;
      c.beginPath();
      c.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      c.lineTo(cx + Math.cos(ang - w) * R, cy + Math.sin(ang - w) * R);
      c.lineTo(cx + Math.cos(ang + w) * R, cy + Math.sin(ang + w) * R);
      c.closePath(); c.fill();
    }
    c.restore();
    // the sparkle, on the lens on the right of the frame
    const g = z - (GLINT - ZOOM0);
    if (g > 0 && g < 0.55 && lensMeshes.length) {
      const pts = lensMeshes.map(m => toScreen(m.getWorldPosition(new V3())));
      const p = pts.reduce((a, b) => (b.x > a.x ? b : a));
      const sx = p.x + 30, sy = p.y - 22, u = g / 0.55, s = Math.sin(u * Math.PI), rot = u * 0.6;
      c.save(); c.translate(sx, sy); c.globalCompositeOperation = 'lighter';
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, 120 * s + 1);
      glow.addColorStop(0, `rgba(255,255,240,${0.9 * s})`); glow.addColorStop(0.3, `rgba(255,240,200,${0.35 * s})`); glow.addColorStop(1, 'rgba(255,230,180,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(0, 0, 120 * s + 1, 0, Math.PI * 2); c.fill();
      const star = (len, wid, a0) => {
        c.save(); c.rotate(a0); c.beginPath();
        for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.lineTo(Math.cos(a + Math.PI / 4) * wid, Math.sin(a + Math.PI / 4) * wid); }
        c.closePath(); c.fillStyle = `rgba(255,255,255,${s})`; c.fill(); c.restore();
      };
      star(150 * s, 10 * s, rot); star(70 * s, 6 * s, rot + Math.PI / 4);
      c.restore();
    }
  }
  function sub(text, a) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `600 50px ${FONT}`; c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = 'rgba(8,4,2,0.9)';
    c.strokeText(text, W / 2, H * 0.87); c.fillStyle = '#FFF1D2'; c.fillText(text, W / 2, H * 0.87);
    c.restore();
  }

  const END = 15.6, ZOOM0 = 12.0, GLINT = 12.34, OUT0 = 99;
  // "Hello, Chef." typed out the way he talks in the game: a letter at a time, a beat at the comma
  // "Hello, Chef." typed out in his speech bubble, the way he talks in the game: a letter at a time, a beat at the comma
  const LINE = 'Hello, Chef.', S1 = 13.25, S2 = 14.3, POP = 0.18;
  const CH = [...LINE].map((ch, k) => (k < 6 ? S1 + k * 0.05 : k === 6 ? S2 - 0.01 : S2 + (k - 7) * 0.05));
  window.cineType = { type: CH, end: END };
  let lastT = 0, zoomRef = null, headLock = null;

  window.cine = {
    len: END,
    frame(i, fps = 30) {
      const t = i / fps, dt = i ? t - lastT : 1 / fps; lastT = t;
      GAME.tick(Math.min(0.05, dt));
      weather.visible = false;
      // night: moonlight off the water, a dark sky, the dock lit mostly by what's under it
      scene.background.setHex(0x060A14); fog.color.setHex(0x060A14); fog.near = 9; fog.far = 34;
      // on the zoom in, everything past his head sinks into black: only he is left in the light
      if (t >= ZOOM0) {
        const kd = easeOut((t - ZOOM0) / 0.35);
        scene.background.lerp(new Color(0x000000), kd); fog.color.lerp(new Color(0x000000), kd);
        fog.near = lerp(9, 2.0, kd); fog.far = lerp(34, 4.0, kd);
      }
      hemi.color.setHex(0x3E4C78); hemi.groundColor.setHex(0x0C0C12); hemi.intensity = 0.55;
      sun.color.setHex(0x9AB2FF); sun.intensity = 0.55;
      sun.position.set(H0.x - 7, H0.y + 11, H0.z - 6); sun.target.position.copy(H0); sun.target.updateMatrixWorld();

      // ---- the lid, the glow ----
      let lid = 0, gap = 0;
      HITS.slice(0, 2).forEach((h, k) => { const s = shove(t - h, [0.17, 0.36][k]); lid += s; gap = Math.max(gap, s / 0.36); });
      const b = t - BLAST;
      if (b >= 0) lid = 2.02 * easeOut(b / 0.11) - (b > 0.11 ? 0.12 * Math.exp(-(b - 0.11) * 6) * Math.cos((b - 0.11) * 18) : 0);
      hatch.lid.rotation.x = lid;
      const flick = 1 + 0.12 * noise(t, 23) + 0.08 * noise(t, 61);
      let glow;
      if (b < 0) glow = 0.06 + gap * 1.1 + 0.03 * noise(t, 7);
      else glow = (b < 0.25 ? lerp(4, 1.6, b / 0.25) : lerp(1.6, 0.75, clamp((b - 0.25) / 3))) * flick;
      hatch.light.intensity = glow * 7;
      under.intensity = (b >= 0 ? glow * 10 : glow * 2);
      hatch.pit.emissiveIntensity = b >= 0 ? 0.35 + 0.25 * glow : gap * 0.6;
      const dim = 1 - 0.7 * ease((t - 9.0) / 2.5);
      hatch.light.intensity = glow * 7 * dim; under.intensity *= (0.45 + 0.55 * dim);
      hatch.update(0); hatch.lid.rotation.x = lid; hatch.light.intensity = glow * 7 * dim; hatch.pit.emissiveIntensity = b >= 0 ? 0.35 + 0.25 * glow : gap * 0.6;

      // ---- him: up through the smoke on the lift, a shape, then himself ----
      const rise = ease((t - (BLAST + 0.7)) / 2.4);
      fugu.position.y = lerp(H0.y - 1.9, H0.y + 0.08, rise);
      fugu.visible = t > BLAST;
      hatch.lift.visible = t > BLAST;
      hatch.lift.position.y = fugu.position.y - H0.y;
      fugu.rotation.y = Math.atan2(cam.position.x - H0.x, cam.position.z - H0.z);
      const shown = CH.filter(x => x <= t).length;
      CH.forEach((x, k) => { if (x <= t && x > t - dt && /[A-Za-z]/.test(LINE[k])) fugu.syllable?.(); });
      fugu.talking = false;
      if (t >= GLINT && t - dt < GLINT) fugu.glint();
      fugu.update(dt);
      if (t >= ZOOM0) {
        headLock ??= { r: fugu.head.rotation.clone(), p: fugu.head.position.clone(), hr: fugu.hat.rotation.clone(), hp: fugu.hat.position.clone() };
        fugu.head.rotation.copy(headLock.r); fugu.head.position.copy(headLock.p);
        fugu.hat.rotation.copy(headLock.hr); fugu.hat.position.copy(headLock.hp);
      }
      if (lens && t >= GLINT + 0.12) { lens.emissive.setHex(0xFFFFFF); lens.emissiveIntensity = 0.9 + 0.1 * noise(t, 5); }
      const rv = ease((t - 8.9) / 3.0);
      reveal(rv);
      key.intensity = 4.2 * rv * (t >= ZOOM0 ? 0.25 : 1 - 0.5 * ease((t - 10.5) / 1.5));
      spot.intensity = 7 * ease((t - 9.6) / 2.2);

      updPuffs(t, b >= 0 ? glow : gap * 0.8);
      beamMat.uniforms.uT.value = t;
      beamMat.uniforms.uI.value = b < 0 ? 0 : 0.7 * ease((b - 0.15) / 0.7) * (1 - 0.85 * ease((t - 8.6) / 3.0)) * Math.min(1.0, glow);

      // ---- the camera: creeping in, a small push with each shove, thrown back by the blast, then a slow move in ----
      const step = k => HITS.slice(0, 2).reduce((f, h) => f - 0.12 * easeOut((t - h - 0.05) / 0.35), k);
      let pos, look;
      const o1 = new V3(0.95, 1.1, -4.7);
      if (b < 0) {
        const f = step(1 - t * 0.012);
        look = at(0, 0.12, 0); pos = look.clone().add(o1.clone().multiplyScalar(f));
      } else {
        const f0 = step(1 - BLAST * 0.012);
        const back = 0.1 * Math.exp(-b * 3) * Math.sin(Math.min(b, 0.3) / 0.3 * Math.PI / 2);
        const k1 = ease((t - BLAST) / 2.6), k2 = ease((t - 8.4) / 7.6);
        const lookA = at(0, 0.12, 0), lookB = at(0, 0.95, 0), lookC = at(-0.34, 1.0, 0);
        look = k2 > 0 ? lv(lookB, lookC, k2) : lv(lookA, lookB, k1);
        const oA = o1.clone().multiplyScalar(f0 + back * 3), oB = new V3(0.75, 0.75, -3.7), oC = new V3(0.28, 0.32, -3.35);
        const off = k2 > 0 ? lv(oB, oC, k2) : lv(oA, oB, k1);
        pos = look.clone().add(off);
      }
      // shake: a jolt with each shove, a big one at the blast
      let sh = 0;
      HITS.slice(0, 2).forEach((h, k) => { const a = t - h; if (a > 0) sh += [0.025, 0.05][k] * Math.exp(-a * 10); });
      if (b > 0) sh += 0.16 * Math.exp(-b * 4.5);
      pos.x += noise(t, 71) * sh; pos.y += noise(t + 3, 59) * sh; look.x += noise(t + 7, 43) * sh * 0.5;
      let fov = 38 - 2.5 * ease((t - 8.4) / 6.8);
      if (t >= ZOOM0) {
        // anime crash zoom: snapped in on his shades in a blink, a slow creep while they glint, then a long ease back
        // out to the game's view of the meeting (offer.ts: over the water, past where the chef stands)
        // where his shades are when the zoom hits, held from then on: the camera doesn't follow his head as he talks
        if (!zoomRef) {
          const at0 = lensMeshes.reduce((v, m) => v.add(m.getWorldPosition(new V3())), new V3()).multiplyScalar(1 / Math.max(1, lensMeshes.length));
          zoomRef = { shades: at0, dir: pos.clone().sub(at0).normalize() };
        }
        const shades = zoomRef.shades.clone(), dir = zoomRef.dir.clone();
        const z = t - ZOOM0, k = easeOut(z / 0.13);
        const near = shades.clone().add(dir.multiplyScalar(lerp(1.62, 1.42, ease((z - 0.13) / (END - ZOOM0 - 0.13)))));
        near.x += 0.006 * noise(t, 1.3); near.y += 0.005 * noise(t + 5, 1.1);
        const jolt = 0.012 * Math.exp(-Math.max(0, z - 0.13) * 14) * (z > 0.13 ? 1 : 0);
        let p2 = lv(pos, near, k), l2 = lv(look, shades, k), f2 = lerp(fov, 30, k);
        p2.x += noise(t, 83) * jolt; p2.y += noise(t + 2, 71) * jolt;
        if (t >= OUT0) {
          // reverse crash zoom: whipped back out to where the zoom started; the slow creep in carries on from there
          const kb = easeOut((t - OUT0) / 0.22);
          const nearOut = shades.clone().add(pos.clone().sub(shades).normalize().multiplyScalar(1.3));
          p2 = lv(nearOut, pos, kb); l2 = lv(shades, look, kb); f2 = lerp(30, fov, kb);
        }
        pos = p2; look = l2; fov = f2;
      }
      cam.position.copy(pos); cam.lookAt(look);
      cam.fov = fov; cam.updateProjectionMatrix();

      // the game's floating badges (orders, counts) aren't part of this scene
      scene.traverse(o => { if (o.isSprite && !o.userData.smoke) o.visible = false; });
      draw(scene, cam);

      // ---- the overlay ----
      c.drawImage(R.canvas, 0, 0, W, H);
      const vg = c.createRadialGradient(W / 2, H * 0.48, H * 0.18, W / 2, H * 0.5, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${t >= OUT0 ? 0.92 : 0.78})`);
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
      // the blast's flash
      if (b >= 0 && b < 0.5) { c.fillStyle = `rgba(255,190,120,${0.85 * Math.exp(-b * 9)})`; c.fillRect(0, 0, W, H); }
      c.save(); c.globalAlpha = 0.07; c.globalCompositeOperation = 'overlay';
      const gx = -Math.floor(Math.random() * 256), gy = -Math.floor(Math.random() * 256);
      for (let x = gx; x < W; x += 256) for (let y = gy; y < H; y += 256) c.drawImage(grain, x, y);
      c.restore();
      if (t >= ZOOM0 && t < ZOOM0 + 1.3) zoomFx(t - ZOOM0, i, clamp((ZOOM0 + 1.3 - t) / 0.5));
      // movie bars close in with the zoom and stay; the line is a subtitle in the bottom one
      if (t >= ZOOM0) { const bar = H * 0.25 * easeOut((t - ZOOM0) / 0.35); c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar); }
      subtitle(t);
      // fade in from black; cut to black at the end
      const black = Math.max(clamp(1 - t / 1.4), t >= END - 0.04 ? 1 : 0);
      if (black > 0) { c.fillStyle = `rgba(0,0,0,${black})`; c.fillRect(0, 0, W, H); }
      if (t >= END - 0.04) say.style.opacity = '0';
      return true;
    },
  };
})();
