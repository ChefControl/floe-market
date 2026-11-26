// Take O, the opening (?stage=1 as a new game, --init newgame.js; hero-tuna.js before this): a wide look at an icy sea
// and one floe; the chef wakes on it, slowly, sits up, shivers, gets to his feet, looks about, "!"; three zoom-outs on
// three thuds show nothing but water; he sits, beaten; THUD, something under the ice; a shadow goes by; a tuna bursts
// out in his face; he ropes it, is pulled off his feet, and rides it; the market comes into sight far off, and a fade.
// Version 4 (the owner: too fast, looks machine-made, no weight). So: every move is keyed pose to pose (acting.js
// track): a wind-up, the move, a settle, and a HOLD; his arms come late and never together; the floe dips, tips and
// rocks under him; nothing repeats (noise, not sines); the camera is held by someone (it drifts, follows late, jolts).
// None of these moves are in the game: the chef is posed here, with a face made of the game's own face parts
// (characters.ts: round eyes, brows, the "o", the grin), and the tuna is the clip's own (hero-tuna.js).
(async () => {
  while (!window.K || !window.HeroTuna || !window.Acting) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, lerp, T3 } = K;
  const { Group, Mesh, MeshLambertMaterial, TorusGeometry, TubeGeometry, CatmullRomCurve3, Sprite, SpriteMaterial, CanvasTexture } = T3;
  const { scene } = K.R;
  // everything the game put in the bay (but its lights and the clip's sky): put away for the look from high up
  const bay = scene.children.filter(o => !o.isLight && !o.isCamera && !o.material?.uniforms?.uTop && o.name !== 'batches' && Math.hypot(o.position.x, o.position.z) < 70);
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const { FLOES } = await window.__mod('props.ts');
  const { foamRing, seaGeometry } = await window.__mod('sea.ts');
  const FX = await window.__mod('fx.ts'), SFX = await window.__mod('sfx.ts'), A = await window.__mod('audio.ts');
  const ST = await window.__mod('stations.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  /** 0 → a little past 1 → 1: things that land with a bounce. */
  const back = k => { k = clamp(k); const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  const { n1, EASE } = ACT;
  /** A heavy thing arriving: a touch past its pose, and back. (EASE.over is for light things: it snaps.) */
  EASE.settle = k => { k = clamp(k); return k < 0.7 ? 1.06 * ease(k / 0.7) : 1.06 - 0.06 * ease((k - 0.7) / 0.3); };
  /** Gently off and gently on, and no rush in the middle: for a body getting up. */
  EASE.soft = k => ease(k);
  const bump = k => Math.sin(clamp(k) * Math.PI);
  /** What's left of a knock, `dt` after it: a swing that dies away. */
  const sway = (dt, f = 7.5, d = 2.8) => dt > 0 ? Math.exp(-d * dt) * Math.sin(f * dt) : 0;

  // The times, in seconds. Slow where the audience is finding out where they are (the sea, the floe, him waking),
  // and each cut-out held a full second. Only the thuds keep an even beat (there's no music under this take).
  const T = { close: 1.8, spray: 2.3, open: 3.0, plant: 3.6, elbows: 4.1, sit: 4.7, face: 5.05, wide: 5.7, rise: 6.4, lookL: 7.15, lookR: 7.65, bang: 8.0, land: 8.32,
    hit1: 8.75, hit2: 9.68, hit3: 10.61, glum: 11.45, sat: 12.05, thud: 12.8, peer: 13.3, shadow: 13.42, side: 14.7, breach: 15.1, splash2: 16.25, sitUp: 16.45, idea: 17.6,
    twirl: 17.95, over: 18.3, wind: 18.6, thrown: 18.8, caught: 19.1, taut: 19.75, yank: 20.37, drag: 20.84, far: 23.77, end: 25.37 };

  // ---------- the set ----------
  /** The floe, far out: no shore or island in any shot from here. */
  const F = V(-90, 0, -110);
  /** The ride: across open water (R1), then toward the dock, far off (R2), and across each. */
  const DOCK = V(-3.4, 0, -8.6), R1 = V(0.6, 0, 0.8), R2 = V(0.2, 0, 0.98).normalize();
  const sideOf = d => V(-d.z, 0, d.x);
  // "nothing but water": the islands out in the bay (horizon.ts) are put away
  const hills = scene.getObjectByName('horizon').children.filter(c => c.geometry?.type === 'ConeGeometry');
  // The bay's rolling sea stops 60 m out and a flat sheet carries on (horizon.ts): from high up its edge shows. So the
  // opening has a sea of its own over both, the game's own water (its material, its swell) in the deep colour all over.
  let seaMat = null;
  scene.traverse(m => { if (!seaMat && m.isMesh && m.material?.customProgramCacheKey?.() === 'sea') seaMat = m.material; });
  const openSea = (() => {
    const g = seaGeometry(460, 300), uv = g.attributes.uv, p = g.attributes.position;
    // From high up the game's sea shows its making: facets on a square grid, tilted by three regular swells, so the
    // shading and the glints line up in rows. Here every point is pushed about again, across and up and down (a
    // different tilt for every facet, under the same swell), and the sheet is turned off the swells' axes.
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, 0.5, 0.99);
      p.setXYZ(i, p.getX(i) + (rnd() - 0.5) * 0.36, p.getY(i) + (rnd() - 0.5) * 0.36, (rnd() - 0.5) * 0.026 + Math.sin(p.getX(i) * 0.11 + p.getY(i) * 0.07) * 0.02);
    }
    const mat = seaMat.clone(); mat.onBeforeCompile = seaMat.onBeforeCompile; mat.customProgramCacheKey = () => 'sea-open'; mat.specular.setHex(0x000000); mat.shininess = 1;
    const m = new Mesh(g, mat); m.rotation.set(-Math.PI / 2, 0, 0.47); m.position.set(F.x, 0.085, F.z); m.receiveShadow = true;
    return m;
  })();
  scene.add(openSea);
  // From 100 m and more those small facets are a pixel or two each and shimmer like cloth. For the long look down the
  // sea is cut big: facets 3.5 m across, each tipped its own way, which read as water from up there.
  const farSea = (() => {
    const g = new T3.PlaneGeometry(1000, 760, 286, 217), p = g.attributes.position, uv = g.attributes.uv;
    let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < p.count; i++) { uv.setXY(i, 0.5, 0.99); p.setXYZ(i, p.getX(i) + (rnd() - 0.5) * 1.7, p.getY(i) + (rnd() - 0.5) * 1.7, (rnd() - 0.5) * 0.1); }
    const m = new Mesh(g, openSea.material); m.rotation.set(-Math.PI / 2, 0, 0.47); m.position.set(F.x, 0.125, F.z); m.visible = false;
    return m;
  })();
  scene.add(farSea);
  // (the floe in two: the outside one bobs, dips and tips under him; the inside one is turned, and carries the ice)
  const floe = new Group(), floeIn = new Group();
  const ice = FLOES[0].mesh(false); ice.scale.set(2.3, 1.25, 1.9);
  const ring = foamRing(2.3); ring.position.y = 0.03;
  floeIn.add(ice, ring); floeIn.rotation.y = 0.6; floe.add(floeIn); floe.position.copy(F); floe.position.y = 0.105;
  scene.add(floe);
  // A bare white disc reads as a placeholder. What a floe that's been at sea has: cracks, drifted snow, a melt pool,
  // and bits broken off it bobbing alongside (all in the game's own ice colours, palette.ts).
  {
    const lam = c => new MeshLambertMaterial({ color: c }), TOP = 0.141; // (on the slab, round the cushion of snow he lies on)
    ice.traverse(o => { o.receiveShadow = true; });
    const crack = lam(0x5FA8C8), snow = lam(0xFFFFFF), pool = lam(0xD5ECF5);
    for (const line of [[[1.45, 0.25], [1.7, 0.42], [1.85, 0.32], [2.05, 0.5]], [[-2.0, -0.25], [-1.75, -0.2], [-1.6, -0.42], [-1.42, -0.4]], [[0.2, 1.05], [0.38, 1.25], [0.3, 1.5]], [[-0.7, -1.02], [-0.5, -1.3], [-0.62, -1.5]]])
      for (let i = 0; i < line.length - 1; i++) { const [x0, z0] = line[i], [x1, z1] = line[i + 1], m = new Mesh(new T3.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.006, 0.03), crack);
        m.position.set((x0 + x1) / 2, TOP, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); floeIn.add(m); }
    for (const [x, z, s, r] of [[1.3, 0.85, 0.34, 0.4], [-1.25, -0.8, 0.42, 1.3], [-0.1, -1.2, 0.26, 2.2], [1.7, -0.2, 0.2, 0.2], [-1.75, 0.3, 0.24, 2.9]]) {
      const m = new Mesh(new T3.SphereGeometry(1, 9, 6), snow); m.scale.set(s, s * 0.3, s * 0.72); m.position.set(x, TOP - 0.01, z); m.rotation.y = r; m.castShadow = m.receiveShadow = true; floeIn.add(m); }
    const pl = new Mesh(new T3.CircleGeometry(1, 9), pool); pl.rotation.x = -Math.PI / 2; pl.scale.set(0.34, 0.2, 1); pl.position.set(-0.85, TOP + 0.001, 1.22); pl.receiveShadow = true; floeIn.add(pl);
  }
  const chunks = [[2.9, 1.4, 0.3], [3.4, 0.4, 0.16], [-2.8, 1.9, 0.22], [-3.5, -0.6, 0.36], [1.2, 2.9, 0.18], [-1.3, -2.9, 0.28], [2.4, -2.6, 0.2], [0.6, 3.6, 0.12], [-4.6, 2.2, 0.14], [4.4, -1.2, 0.26],
    // (two close to where the opening's camera sits: something near, to give the far floe its distance)
    [19.5, 22.5, 0.5], [15, 17.5, 0.34], [23.5, 26.8, 0.22]].map(([x, z, s], i) => {
    const m = FLOES[i % 3].mesh(false); m.scale.set(s, 0.5 + (i % 3) * 0.14, s * (0.7 + (i % 4) * 0.12)); m.position.set(F.x + x, 0.09, F.z + z); m.rotation.y = i * 1.7; m.userData.i = i; scene.add(m); return m; });
  {
    let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2, d = 46 + rnd() * 170, x = F.x + Math.cos(a) * d, z = F.z + Math.sin(a) * d;
      // (clear of the way the tuna takes him: south-east of the floe)
      if (x > F.x && z > F.z - 6 && Math.abs((x - F.x) * 0.8 - (z - F.z) * 0.6) < 9) continue;
      const m = FLOES[i % 3].mesh(false), s = 0.5 + rnd() * 1.9;
      m.scale.set(s, 1.1, s * (0.7 + rnd() * 0.5)); m.position.set(x, 0.1, z); m.rotation.y = rnd() * 6;
      scene.add(m);
    }
  }
  // low cloud for the long look down: soft banks drifting between the camera and the sea
  const bank = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(0.5, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new CanvasTexture(c); })();
  const banks = [[-34, 46, 12, 60], [28, 62, -22, 78], [52, 38, 30, 54], [-58, 70, -30, 90], [8, 88, 40, 70], [-14, 30, -46, 48], [70, 80, -8, 96]].map(([x, y, z, s], i) => {
    const m = new Sprite(new SpriteMaterial({ map: bank, depthWrite: false, fog: false, opacity: 0.55 })); m.position.set(F.x + x, y, F.z + z); m.scale.set(s, s * 0.6, 1); m.userData = { x: F.x + x, sp: 2 + (i % 3) }; m.visible = false; scene.add(m); return m;
  });
  // from high up his floe is one white dot among thirty: slow rings go out from it (it rocks under him), and the eye finds it
  const rings = [0, 1, 2].map((_, n) => { const mat = new T3.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false, fog: false }), g = new Group();
    // (each a few arcs of different lengths with gaps between, as a ripple breaks up on a swell: three clean circles read as a target)
    for (const [a0, len, r] of [[0.3 + n * 1.9, 1.5, 1], [2.4 + n * 1.9, 0.8, 0.985], [3.7 + n * 1.9, 1.7, 1.01], [5.8 + n * 1.9, 0.4, 0.99]]) g.add(new Mesh(new T3.RingGeometry(r * 0.955, r, 22, 1, a0, len), mat));
    g.rotation.x = -Math.PI / 2; g.position.set(F.x, 0.3, F.z); g.visible = false; g.userData.mat = mat; scene.add(g); return g; });
  // and an icy sea has ice in it: a few sheets the size of a house, far off, clear of where the tuna takes him (south-east)
  for (const [x, z, s, r] of [[-64, -52, 5, 0.4], [-128, 34, 7.5, 1.9], [58, -118, 6, 2.6], [-28, -150, 8.5, 0.9], [-150, -84, 6.5, 3.3], [-96, 96, 5.5, 1.2], [26, -64, 4.2, 2.1]]) {
    const m = FLOES[(x + 200) % 3 | 0].mesh(false); m.scale.set(s, 1.5, s * 0.72); m.position.set(F.x + x, 0.1, F.z + z); m.rotation.y = r; scene.add(m);
  }
  // The light: the game's sun stands high in the south-west, which is flat on a face from these cameras. For the
  // opening it's low in the west: long shadows that lie across the ice (and show his feet are on it), form on him.
  K.R.sunOff.set(-10, 4.4, 3.2);
  K.sky({ top: 0x7FB4E0, sun: [-0.84, 0.2, -0.5], glow: 0xFFF1CC });
  // An even blue from here to the horizon is a painted floor: clouds' shadows lie on a real sea, and drift.
  const shades = [[-30, -40, 34], [26, -75, 46], [60, -20, 30], [-70, 10, 40], [10, 30, 26], [-20, -120, 60], [90, -110, 50]].map(([x, z, r], i) => {
    const m = new Mesh(new T3.CircleGeometry(1, 20), new T3.MeshBasicMaterial({ map: bank, color: 0x0B3A66, transparent: true, opacity: 0.3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.scale.set(r, r * 0.6, 1); m.position.set(F.x + x, 0.2, F.z + z); m.userData = { x: F.x + x, sp: 0.5 + (i % 3) * 0.25 }; m.renderOrder = 2; scene.add(m); return m; });
  // The cold, in the air: his breath, and spindrift on the wind low over the ice.
  const puffs = Array.from({ length: 10 }, () => { const m = new Sprite(new SpriteMaterial({ map: bank, depthWrite: false, opacity: 0 })); m.visible = false; scene.add(m); return { m, t0: -9, at: V(0, 0, 0), dir: V(0, 0, 0), big: 1 }; });
  const drift = Array.from({ length: 34 }, (_, i) => { const m = new Sprite(new SpriteMaterial({ map: bank, depthWrite: false, opacity: 0 })); m.visible = false; scene.add(m);
    const r = k => { const v = Math.sin((i + 1) * 91.7 * k) * 43758.5453; return v - Math.floor(v); };
    return { m, x: r(1) * 30, z: (r(2) - 0.5) * 22, y: 0.24 + r(3) * r(3) * 1.3, sp: 5 + r(4) * 5, len: 0.5 + r(5) * 0.9, i }; });
  // The thing under the ice: a long dark shape going by under the water.
  const dark = (() => { const s = new T3.Shape(); s.moveTo(1.7, 0); s.quadraticCurveTo(1.0, 0.52, 0, 0.5); s.quadraticCurveTo(-1.0, 0.36, -1.45, 0.06); s.lineTo(-1.95, 0.5); s.lineTo(-1.8, 0); s.lineTo(-1.95, -0.5); s.lineTo(-1.45, -0.06);
    s.quadraticCurveTo(-1.0, -0.36, 0, -0.5); s.quadraticCurveTo(1.0, -0.52, 1.7, 0);
    const m = new Mesh(new T3.ShapeGeometry(s, 10), new T3.MeshBasicMaterial({ color: 0x0A2E55, transparent: true, opacity: 0, depthWrite: false })); m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; scene.add(m); return m; })();
  const ICE_Y = 0.23; // the top of the floe, where he lies and stands

  // ---------- the tuna ----------
  const tuna = HeroTuna(T3); tuna.g.rotation.order = 'YZX'; tuna.g.scale.setScalar(2.3); tuna.g.visible = false;
  scene.add(tuna.g);
  const heading = d => Math.atan2(-d.z, d.x);
  const CALM = { wide: 0, look: [0, 0], brow: 0, lid: 0, mouth: 0, smile: 0.6, flare: 0.1, dead: false, amp: 0.06 };
  const fish = o => tuna.set({ ...CALM, ...o });
  const wash = foamRing(1); wash.visible = false; scene.add(wash);
  /** The foam round the tuna where it sits in the water (the game's foam, as round its floes), drawn out along it. */
  function waterline(c, dir) { wash.visible = true; wash.position.copy(c).setY(0.14); wash.rotation.y = heading(dir); wash.scale.set(1.75, 1, 0.62); }
  const ropeMat = new MeshLambertMaterial({ color: 0xC9A66B });
  const rope = new Mesh(new TubeGeometry(new CatmullRomCurve3([V(0, 0, 0), V(0, 1, 0)]), 2, 0.02, 5), ropeMat); rope.visible = false; rope.frustumCulled = false;
  const loop = new Mesh(new TorusGeometry(1, 0.045, 6, 22), ropeMat); loop.visible = false; loop.rotation.order = 'YXZ';
  scene.add(rope, loop);
  function lay(points, r = 0.022) {
    rope.geometry.dispose();
    rope.geometry = new TubeGeometry(new CatmullRomCurve3(points), 18, r, 5);
    rope.visible = true;
  }
  /** The loop round the tuna, behind its head, and where the rope leaves it. */
  function collar(dir) {
    tuna.g.updateMatrixWorld(true);
    const c = tuna.g.localToWorld(V(0.3, 0, 0)), k = tuna.g.scale.x;
    loop.visible = true; loop.position.copy(c); loop.scale.set(0.2 * k, 0.27 * k, 0.4); loop.rotation.set(0, heading(dir) + Math.PI / 2, 0);
    return tuna.g.localToWorld(V(0.3, 0.27, 0));
  }

  // "!" pills: the game's own alert (index.html #offerAlert), over whoever's startled
  const pill = () => {
    const e = document.createElement('div');
    Object.assign(e.style, { position: 'fixed', left: 0, top: 0, zIndex: 21, width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%',
      display: 'grid', placeItems: 'center', background: '#fff', color: '#C93F25', font: '800 32px/1 "Baloo 2",system-ui,sans-serif',
      boxShadow: '0 3px 0 rgba(23,48,66,.25), 0 0 0 3px #FFC34A', pointerEvents: 'none', transform: 'scale(0)' });
    e.textContent = '!';
    document.getElementById('teaser').append(e);
    return e;
  };
  /** Each: its pill, when it's up, and where in the world it floats. */
  const pills = [{ el: pill(), t0: T.bang, t1: T.hit1, at: null }, { el: pill(), t0: T.caught + 0.16, t1: T.taut, at: null }];

  // ---------- the chef ----------
  const P = player.g;
  // his face, his pose, soles under his boots, and the game's summer clothes gone to rags: a castaway (acting.js)
  const setFace = ACT.face(P), chef = o => ACT.pose(P, o, setFace);
  ACT.soles(P); const rags = ACT.castaway(P);
  /** His hand, in the world (the end of his arm, 0.42 down it). */
  const hand = i => P.arms[i].localToWorld(V(0, -0.42, 0));
  const headAt = () => P.body.localToWorld(V(0, 1.03, 0.05));

  // ---------- sound: through the game's own engine, so it lands on the frame ----------
  const said = new Set();
  const once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const thud = big => { const amp = 0.5 * Math.pow(2, big); // (big 0 / 0.5 / 1: -6 / -3 / 0 dB)
    // The low tone is the weight; but a laptop plays nothing under 180 Hz and a phone nothing under 350, so the knock
    // itself is a triangle an octave and more up and a short band of noise: that's what small speakers play of it.
    A.tone({ f: 95, f2: 34, d: 0.55, v: 0.092 * amp }); A.tone({ f: 240, f2: 150, d: 0.3, a: 0.002, type: 'triangle', v: 0.149 * amp }); A.tone({ f: 440, f2: 230, d: 0.2, a: 0.002, type: 'triangle', v: 0.085 * amp });
    A.noise({ f: 700, f2: 300, q: 1.5, d: 0.15, a: 0.001, v: 0.134 * amp }); A.noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.106 * amp });
    A.noise({ f: 900, f2: 480, q: 1.4, d: 0.1, a: 0.001, v: 0.1 * amp }); }; // (the knock a phone has: 400-900 Hz)
  /** A splash with its top end on (the game's own is all low: dull on its own in a picture this wet). */
  const spl = (v = 0.2, d = 0.35) => { SFX.splash(P.position); A.noise({ f: 2600, f2: 1100, q: 0.7, d, a: 0.008, v: v * 0.7 }); }; // (a splash's top is a band round 1-3 kHz: high-passed white noise is hiss)
  /** The water of a big hit, without the game's own splash: that one is all peak, and under a thud the two stack into the limiter. */
  const water = (v = 0.2, d = 0.5) => { A.noise({ f: 2800, f2: 1200, q: 0.7, d, a: 0.008, v: v * 0.7 }); A.noise({ f: 1100, f2: 420, q: 0.8, d: d * 0.8, a: 0.01, v: v * 0.6 }); };
  const whoosh = (d, v = 0.3, f = 500, f2 = 2200) => A.noise({ f, f2, q: 0.9, d, a: d * 0.35, v });
  /** A bed: noise HELD at its level for `len` seconds (the engine's own envelope dies away from the start: a long
   *  `d` is a long fade, and a 'wind' made that way is gone in a second or two), in over `a`, out over `r`. */
  const bed = (f, f2, q, len, v, a = 0.5, r = 0.6, kind) => A.noise({ f, f2, q, kind, a, hold: Math.max(0, len - a - r), d: r, v });
  const blip = (f, f2, v = 0.4, t = 0, d = 0.12) => A.tone({ f, f2, d, t, type: 'triangle', v });

  // ---------- his moves: pose to pose (acting.js track) ----------
  // What a key holds: where his hips are on the floe (px, pz) and how high over the ice (h), which way he faces
  // (yaw: 0 south, at the cameras), how far he's tipped (tip: -PI/2 flat on his back, 0 upright, +PI/2 on his front),
  // roll, his legs (flat 1: lying along the ice whatever his tip), his arms [forward swing, out] and squash.
  const OUT = V(0.12, 0, 0.99).normalize(); // the way the cameras pull back: south, looking north out to sea
  const LEAP2 = F.clone().add(V(-6.5, 0, 1.5)), DIR2 = V(0.15, 0, -0.99).normalize(); // (west of the floe, where it burst out and dived; it jumps northward)
  const SEAWARD = Math.atan2(LEAP2.x - F.x + 0.45, LEAP2.z - F.z); // (he's facing west already: a look, not a turn)
  const HP = Math.PI / 2;
  const S = ACT.track([
    { t: 0, px: 0, pz: 0, h: 0.15, yaw: 1.45, tip: -HP, roll: 0, flat: 1, l0: 0, l1: 0, a00: 0, a01: 1.15, a10: 0, a11: 1.0, sq: 1 },
    // spray on his face: a flinch, and it lets go slowly
    { t: T.spray + 0.08, mv: 0.07, e: 'out', sq: 0.93, l0: -0.25, l1: -0.12, a01: 1.32, a11: 0.85 },
    { t: T.spray + 0.6, mv: 0.5, sq: 1, l0: 0, l1: 0, a01: 1.15, a11: 1.0 },
    // awake. He gathers his arms in under him (the wind-up) and pushes up onto his elbows; a hold there
    { t: T.plant, mv: 0.26, a00: 0.3, a01: 0.5, a10: 0.3, a11: 0.42, sq: 0.97 },
    { t: T.elbows, mv: 0.5, e: 'settle', tip: -1.06, h: 0.14, a00: 1.06, a01: 0.3, a10: 1.06, a11: 0.24, sq: 1, yaw: 1.25 }, // (his hands reach the ice: he's propped on them)
    { t: T.elbows + 0.42, mv: 0.26, yaw: 1.02 },
    // a dip back (the wind-up), and he sits up: past upright, then settling
    { t: T.sit - 0.42, mv: 0.18, tip: -1.17, sq: 0.96 },
    { t: T.sit + 0.12, mv: 0.54, e: 'settle', tip: 0.06, h: 0.09, yaw: 1.15, a00: 0.15, a01: 0.32, a10: 0.1, a11: 0.3, sq: 1 },
    // cold: his arms round himself, hunched
    { t: T.face + 0.3, mv: 0.32, a00: -0.85, a01: -0.5, a10: -0.85, a11: -0.46, tip: 0.16, sq: 0.97, yaw: 0.85 },
    // up: forward over his knees with a hand down (the wind-up), a push, and on his feet with the floe tipping under him:
    // he sways back, forward, and finds his balance, arms out and never together
    { t: T.wide + 0.28, mv: 0.26, tip: 0.5, a00: -0.5, a01: 0.3, a10: -0.7, a11: 0.25, sq: 0.93, yaw: 1.2 },
    { t: T.rise, mv: 0.42, e: 'out', h: 0.3, flat: 0, tip: 0.2, a00: 0.55, a01: 0.5, a10: -0.45, a11: 1.3, sq: 1.05, yaw: 0.9 },
    { t: T.rise + 0.28, mv: 0.28, tip: -0.12, roll: 0.1, a00: -0.3, a01: 1.4, a10: 0.4, a11: 0.45, sq: 1 },
    { t: T.rise + 0.52, mv: 0.24, tip: 0.05, roll: -0.05, a00: 0.2, a01: 0.4, a10: -0.3, a11: 1.05 },
    { t: T.rise + 0.74, mv: 0.22, tip: 0, roll: 0, a00: 0, a01: 0.2, a10: 0, a11: 0.25, yaw: 0.45 },
    // anyone? A look one way (his body winds back a hair first), a hold; right round the other way, a hold
    { t: T.lookL - 0.14, mv: 0.1, yaw: 0.3 },
    { t: T.lookL + 0.12, mv: 0.26, e: 'settle', yaw: 1.2, a01: 0.42, a11: 0.2 },
    { t: T.lookR - 0.2, mv: 0.1, yaw: 1.32 },
    { t: T.lookR + 0.14, mv: 0.34, e: 'settle', yaw: -0.5, a01: 0.2, a11: 0.45 },
    { t: T.bang - 0.2, mv: 0.16, yaw: 0.45, a01: 0.2, a11: 0.25 },
    // "!": a crouch, a hop, the fall, the squash where he lands, and up out of it
    { t: T.bang - 0.02, mv: 0.14, sq: 0.84, a00: 0.3, a10: 0.3, a01: 0.12, a11: 0.12 },
    { t: T.bang + 0.15, mv: 0.15, e: 'out', sq: 1.14, h: 0.58, a00: -0.5, a01: 1.35, a10: 0.25, a11: 0.75 },
    { t: T.land, mv: 0.17, e: 'in', h: 0.3, sq: 1.08 },
    { t: T.land + 0.07, mv: 0.07, e: 'out', sq: 0.8, a00: 0.1, a01: 0.8, a10: -0.2, a11: 0.4 },
    { t: T.land + 0.4, mv: 0.33, e: 'settle', sq: 1, a00: -0.25, a01: 1.0, a10: 0.1, a11: 0.6 },
    // first cut out: he runs for the edge, digs his heels in, teeters over the water, and catches himself
    { t: T.hit1 + 0.1, mv: 0.1, sq: 0.92, yaw: 0.3 },
    { t: T.hit1 + 0.3, mv: 0.2, yaw: 1.5, tip: 0.3, sq: 1, a00: 0.5, a01: 0.3, a10: -0.5, a11: 0.3 },
    { t: T.hit1 + 0.64, mv: 0.38, e: 'lin', px: 1.18 },
    { t: T.hit1 + 0.72, mv: 0.1, e: 'out', px: 1.36, tip: -0.32, a00: 0, a10: 0, a01: 1.4, a11: 1.1 },
    { t: T.hit1 + 0.9, mv: 0.18, tip: 0.3, a01: 1.0, a11: 1.5 },
    { t: T.hit1 + 1.02, mv: 0.12, tip: 0.02, a01: 0.5, a11: 0.6 },
    // second: he jumps and waves at nobody (the jumps are in the frame code); third: his arms come down, he trudges
    // back to the middle and sits, heavily
    { t: T.hit2 + 0.1, mv: 0.1, yaw: 0.45, tip: 0, a00: 0, a10: 0, a01: 2.5, a11: 2.5 },
    { t: T.hit3 + 0.5, mv: 0.4, a01: 0.15, a11: 0.15, tip: 0.2, sq: 0.96 },
    { t: T.hit3 + 1.3, mv: 0.7, px: 0.1, yaw: -0.05 },
    // beaten: his knees go (a bend first), he drops onto his seat, the floe takes it; a breath in, and a long sigh out
    { t: T.sat - 0.22, mv: 0.2, tip: 0.32, sq: 0.93 },
    { t: T.sat, mv: 0.22, e: 'in', h: 0.09, flat: 1, tip: 0.2, px: 0, a00: -0.85, a01: -0.3, a10: -0.85, a11: -0.28, sq: 1.04 },
    { t: T.sat + 0.07, mv: 0.07, e: 'out', sq: 0.85 },
    { t: T.sat + 0.36, mv: 0.28, e: 'settle', sq: 1, tip: 0.24 },
    { t: T.sat + 0.52, mv: 0.16, sq: 1.04, tip: 0.18 },
    { t: T.thud - 0.03, mv: 0.3, sq: 0.95, tip: 0.33 },
    // THUD: thrown off the ice, arms flung, down again on his seat; then stock still, hands flat on the ice
    { t: T.thud + 0.1, mv: 0.09, e: 'out', h: 0.22, sq: 1.1, tip: -0.12, a00: 0, a01: 1.0, a10: 0, a11: 0.85 },
    { t: T.thud + 0.27, mv: 0.17, e: 'in', h: 0.09, sq: 1.05 },
    { t: T.thud + 0.33, mv: 0.06, e: 'out', sq: 0.84 },
    { t: T.thud + 0.7, mv: 0.35, e: 'settle', sq: 1, tip: 0, a00: 0.35, a01: 0.5, a10: 0.35, a11: 0.5 },
    // what was that? Down onto his front, and two pulls on his elbows to the floe's west edge, to look over it
    { t: T.peer + 0.3, mv: 0.26, yaw: -HP, tip: 0.5, a00: -1.2, a10: -1.2, a01: 0.2, a11: 0.2 },
    { t: T.peer + 0.55, mv: 0.24, e: 'in', tip: 1.48, flat: 0, h: 0.13, px: -0.5, a00: -2.6, a10: -2.2, sq: 1 },
    { t: T.peer + 0.62, mv: 0.07, e: 'out', sq: 0.9 }, { t: T.peer + 0.82, mv: 0.2, sq: 1 },
    { t: T.peer + 0.96, mv: 0.18, e: 'out', px: -0.85, a00: -2.0, a10: -2.7 },
    { t: T.peer + 1.2, mv: 0.18, e: 'out', px: -1.18, a00: -2.6, a10: -2.1 },
    { t: T.side - 0.02, mv: 0.2, px: -1.25, tip: 1.36 },
    // it comes out of the water in his face: his head and arms jerk up, he's thrown back off his front with his legs in
    // the air, lands on his back, and props himself on his hands to watch it go over
    { t: T.breach - 0.12, mv: 0.16, tip: 1.22, a00: -1.5, a10: -1.4, a01: 0.7, a11: 0.9 }, // (his head comes up: the water's doing something)
    // the edge of the floe comes up under him and he's off it: up and over backward through the air (fast off, a hang,
    // down hard), onto his back with a bounce, legs last
    { t: T.breach + 0.3, mv: 0.24, e: 'out', h: 0.62, px: -0.95, sq: 1.1, l0: 0.75, l1: -0.5, a00: -1.2, a10: 0.9, a01: 1.5, a11: 1.2 },
    { t: T.breach + 0.56, mv: 0.5, e: 'lin', tip: -1.45 },
    { t: T.breach + 0.56, mv: 0.26, e: 'in', h: 0.15, px: -0.45, sq: 1.04, l0: -1.1, l1: -0.6, a00: 0.3, a10: 0.2, a01: 1.25, a11: 1.0 },
    { t: T.breach + 0.62, mv: 0.06, e: 'out', sq: 0.82 },
    { t: T.breach + 0.74, mv: 0.12, e: 'out', h: 0.26, sq: 1.04, l0: -0.6, l1: -1.0 },
    { t: T.breach + 0.86, mv: 0.12, e: 'in', h: 0.15 },
    { t: T.breach + 0.92, mv: 0.06, e: 'out', sq: 0.91 },
    { t: T.breach + 1.14, mv: 0.22, sq: 1, l0: -0.15, l1: -0.05, a01: 1.15, a11: 0.95 },
    // soaked: he sits up; shakes it off; folds forward over his knees, gets up; and turns after it (a little the other
    // way first), each a move of its own
    { t: T.sitUp + 0.12, mv: 0.12, a00: 0.5, a10: 0.5, a01: 0.5, a11: 0.45, sq: 0.97 },
    { t: T.sitUp + 0.52, mv: 0.4, e: 'settle', tip: 0.1, flat: 1, h: 0.09, l0: 0, l1: 0, a00: 0.1, a10: 0.1, a01: 0.3, a11: 0.3, sq: 1 },
    { t: T.idea - 0.5, mv: 0.18, tip: 0.5, sq: 0.93, a00: -0.5, a10: -0.6 },
    { t: T.idea - 0.1, mv: 0.38, e: 'soft', h: 0.3, flat: 0, tip: 0.1, px: -0.45, sq: 1.03, a00: 0, a10: 0, a01: 0.5, a11: 0.3 },
    { t: T.idea - 0.02, mv: 0.2, e: 'settle', yaw: SEAWARD },
    { t: T.idea + 0.04, mv: 0.14, sq: 1, a01: 0.25, a11: 0.25 },
    // the idea: a little drop as it lands, then his hand goes to the rope at his belt
    { t: T.idea + 0.1, mv: 0.1, sq: 0.9 },
    { t: T.idea + 0.1, mv: 0.1, a10: -0.2, a11: 0.75 },
    { t: T.idea + 0.24, mv: 0.12, e: 'out', sq: 1, a10: -0.72, a11: -0.28 },
    { t: T.idea + 0.44, mv: 0.08, e: 'out', a10: -0.3, a11: 0.5, sq: 1.06 },
    // the rope up over his head and round; back onto his heels (the wind-up); the throw, right through, and a settle
    { t: T.twirl + 0.12, mv: 0.24, e: 'settle', a10: 0, a11: 2.75, a00: 0, a01: 0.5, l0: 0.28, l1: -0.28, tip: -0.12 },
    { t: T.wind + 0.17, mv: 0.17, tip: -0.36, a10: 0.8, a11: 2.2, sq: 0.94, l0: 0.4, l1: -0.3 },
    { t: T.thrown + 0.13, mv: 0.13, e: 'io', tip: 0.5, a10: -1.5, a11: 0.3, a00: 0.9, a01: 0.25, sq: 1.08, l0: -0.35, l1: 0.5 },
    { t: T.thrown + 0.42, mv: 0.29, e: 'settle', tip: 0.28, a10: -1.1, a11: 0.25, a00: 0.4, a01: 0.2, sq: 1, l0: -0.15, l1: 0.25 },
    // the rope goes tight: both hands on it, heels in, leaning back against it. He's got it! A long held beat (the
    // quiver's in the frame code), his heels giving twice...
    { t: T.taut + 0.16, mv: 0.06, e: 'out', tip: 0.42, px: -0.56, sq: 1.05, a00: -1.4, a01: 0.12, a10: -1.45, a11: 0.1 },
    { t: T.taut + 0.3, mv: 0.14, tip: -0.36, a00: -1.2, a10: -1.25, sq: 0.94, l0: -0.38, l1: -0.22 },
    { t: T.taut + 0.4, mv: 0.06, e: 'out', px: -0.68, tip: -0.3 }, { t: T.taut + 0.48, mv: 0.08, tip: -0.42 },
    { t: T.taut + 0.54, mv: 0.06, e: 'out', px: -0.84, tip: -0.32 }, { t: T.yank - 0.02, mv: 0.06, tip: -0.46, sq: 0.92 },
    // ...and it has him: his arms and chest go and his feet are still where they were (he's drawn out long); then he's off
    { t: T.yank + 0.07, mv: 0.07, e: 'out', tip: 0.42, sq: 1.18, a00: -1.75, a10: -1.8, l0: 0.2, l1: 0.1 },
    { t: T.yank + 0.17, mv: 0.1, e: 'in', px: -1.5, tip: 0.7, sq: 1.12, l0: 0.55, l1: 0.38 },
    { t: T.yank + 0.3, mv: 0.13, e: 'in', px: -5.2, pz: 0.2, h: 0.7, tip: 1.3, sq: 1.2, a00: -2.8, a10: -2.8, l0: 0.35, l1: -0.25 },
  ]);

  // ---------- the floe under him: it floats, so it answers everything he does ----------
  // Knocks: [when, how far it jumps (down first: under 0), tip north-south, tip east-west, how fast it rocks, how soon it dies]
  const KICKS = [[T.rise - 0.1, -0.02, 0.02, 0], [T.land, -0.06, 0.01, 0.015], [T.hit1 + 0.72, -0.03, 0, -0.03], [T.hit2 + 0.55, -0.05, 0, -0.02], [T.hit2 + 1.0, -0.05, 0, -0.02], [T.sat, -0.055, 0.012, 0],
    [T.thud, 0.13, 0.05, -0.03, 13, 4.5], [T.thud + 0.3, -0.05, 0, 0], [T.peer + 0.6, -0.03, 0, -0.02],
    // (the burst: the swell lifts the edge he's on, then it's kicked up hard and the floe rocks; he comes down on it; the wave from the dive)
    [T.breach - 0.3, 0.03, 0, -0.08, 4, 1.5], [T.breach, 0.07, 0.02, -0.25, 7, 2.6], [T.breach + 0.56, -0.08, 0, 0.03], [T.breach + 1.02, 0.07, 0.03, -0.14, 7, 2.6],
    [T.taut + 0.4, 0, 0, 0.025], [T.taut + 0.54, 0, 0, 0.03], [T.yank + 0.06, 0.02, 0, 0.05], [T.yank + 0.2, 0.06, 0, 0.13, 6, 1.9]];
  function floeAt(t) {
    let y = 0.012 * Math.sin(t * 1.1) + 0.006 * n1(t * 0.6, 2), rx = 0.012 * Math.sin(t * 0.8 + 1), rz = 0.01 * Math.sin(t * 0.63);
    for (const [t0, up, tx, tz, f, d] of KICKS) { const k = sway(t - t0, f, d); y += up * k; rx += tx * k; rz += tz * k; }
    // (his weight: it tips toward where he stands, a moment late)
    if (t < T.yank + 0.2) { const p = S(t - 0.12); rx += clamp(p.pz, -2, 2) * 0.022; rz -= clamp(p.px, -2, 2) * 0.022; }
    return { y, rx, rz };
  }
  // The floe isn't flat: a cushion of snow in the middle, the slab lower round it. Its height everywhere, measured once
  // (rays down onto it), so his feet are ON it wherever he goes, and so is his shadow.
  const iceH = (() => { floe.updateMatrixWorld(true); const N = 48, R = 2.5, ray = new T3.Raycaster(), g = new Float32Array((N + 1) ** 2), down = V(0, -1, 0);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { ray.set(V(F.x + (i / N * 2 - 1) * R, 3, F.z + (j / N * 2 - 1) * R), down); const h = ray.intersectObject(ice, true)[0]; g[j * (N + 1) + i] = h ? h.point.y : -1; }
    console.log('[cine] ice top', g[(N / 2) * (N + 1) + N / 2].toFixed(3), 'slab', g[(N / 2) * (N + 1) + N / 2 + 16].toFixed(3));
    return (x, z) => { const u = clamp((x / R + 1) / 2) * N, v = clamp((z / R + 1) / 2) * N, i = Math.min(N - 1, Math.floor(u)), j = Math.min(N - 1, Math.floor(v)), fu = u - i, fv = v - j;
      const a = g[j * (N + 1) + i], b2 = g[j * (N + 1) + i + 1], c = g[(j + 1) * (N + 1) + i], d = g[(j + 1) * (N + 1) + i + 1];
      if (Math.min(a, b2, c, d) < 0 || Math.abs(x) > R || Math.abs(z) > R) return null;
      return mix(mix(a, b2, fu), mix(c, d, fu), fv); }; })();
  /** His hips and his head in the world at any time (so a camera can follow where he WAS: late, as a hand would). */
  const hipW = (t, p = S(t), fl = floeAt(t)) => V(F.x + p.px, (iceH(p.px, p.pz) ?? ICE_Y) + p.h + fl.y - clamp(p.pz, -2, 2) * fl.rx + clamp(p.px, -2, 2) * fl.rz, F.z + p.pz);
  const headW = t => { const p = S(t); return hipW(t, p).add(V(Math.sin(p.yaw) * Math.sin(p.tip), Math.cos(p.tip), Math.cos(p.yaw) * Math.sin(p.tip)).multiplyScalar(0.73)); };
  const lag = (fn, t, d = 0.16) => fn(t - d * 0.5).add(fn(t - d)).add(fn(t - d * 1.5)).multiplyScalar(1 / 3);
  /** Poses him from the track at `t`: his arms a few frames behind his body and each other (so nothing arrives
   *  together), his legs striding by how far he's gone (no sliding feet), breath and the small drift of someone
   *  holding still, shivers in bursts when he's cold. `o` adds to any of it for the shot. */
  function act(t, f, o = {}) {
    const c = S(t), aL = S(t - 0.05), aR = S(t - 0.1), lg = S(t - 0.03), fl = floeAt(t);
    const alive = o.alive ?? 1, burst = (o.cold ?? 0) * ease((n1(t * 1.4, 9) + 0.15) / 0.5), sh = n1(t * 43, 5) * 0.013 * burst;
    const breath = 1 + Math.sin(t * (alive ? 2.6 : 2.1)) * (alive ? 0.02 : 0.055);
    const flatL = -HP - c.tip, sp = Math.hypot(S(t + 0.02).px - S(t - 0.02).px, S(t + 0.02).pz - S(t - 0.02).pz) / 0.04;
    const stride = (o.stride ?? 1) && Math.sin((c.px + c.pz) * 9) * 0.75 * clamp(sp / 1.5) * (1 - c.flat) * (o.stride ?? 1);
    const hip = hipW(t, c, fl); hip.x += sh + (o.dx ?? 0); hip.y += o.dy ?? 0; hip.z += o.dz ?? 0;
    chef({ hip, yaw: c.yaw + n1(t * 0.45, 2) * 0.025 * alive + (o.yaw ?? 0), lean: c.tip + n1(t * 0.6, 1) * 0.014 * alive + fl.rx * Math.cos(c.yaw) + (o.tip ?? 0),
      roll: c.roll + fl.rz * Math.cos(c.yaw) + (o.roll ?? 0),
      legs: [mix(lg.l0, flatL + lg.l0, c.flat) + stride + (o.l0 ?? 0), mix(lg.l1, flatL * 0.94 + lg.l1, c.flat) - stride + (o.l1 ?? 0)],
      arms: [[aL.a00 + (o.a00 ?? 0), aL.a01 + n1(t * 0.8, 3) * 0.035 * alive - burst * 0.05 + (o.a01 ?? 0)], [aR.a10 + (o.a10 ?? 0), aR.a11 + n1(t * 0.7, 4) * 0.035 * alive - burst * 0.05 + (o.a11 ?? 0)]],
      sq: c.sq * breath * (o.sq ?? 1), f });
    P.updateMatrixWorld(true);
    shadeAt(t, { ...c, h: c.h + (o.dy ?? 0) }, fl);
    return c;
  }
  const mouthAt = () => P.body.localToWorld(V(0, 0.965, 0.27));
  // His shadow on the ice. The game's sun does cast one, but the snow is at full white under its sky light and nothing
  // shows; without it he floats. So: a soft shade laid on the ice under him, drawn out away from the low sun, that
  // lets go of his feet and thins when he's in the air.
  const SUNWARD = V(0.952, 0, -0.305), SIDE = V(0, 1, 0).cross(SUNWARD).normalize();
  // (a sheet of points laid ON the snow, each at the ice's own height there: the cushion's round, and a flat shade cuts into it)
  const shade = new Mesh(new T3.PlaneGeometry(2, 2, 12, 4), new T3.MeshBasicMaterial({ map: bank, color: 0x1F5A8E, transparent: true, opacity: 0.5, depthWrite: false, side: T3.DoubleSide }));
  shade.renderOrder = 4; shade.frustumCulled = false; scene.add(shade);
  const shadeUV = shade.geometry.attributes.uv, shadeP = shade.geometry.attributes.position;
  function shadeAt(t, c, fl) {
    const up = Math.max(0, c.h - mix(0.3, 0.15, Math.abs(Math.sin(c.tip)))), len = mix(0.7, 1.45, Math.cos(c.tip) ** 2) * (1 + up), wid = 0.55 * (1 + up * 0.6);
    const cx = c.px + SUNWARD.x * (up * 1.6 - 0.1 + len / 2), cz = c.pz + SUNWARD.z * (up * 1.6 - 0.1 + len / 2);
    shade.visible = iceH(c.px, c.pz) !== null; if (!shade.visible) return;
    for (let n = 0; n < shadeP.count; n++) {
      const u = shadeUV.getX(n) * 2 - 1, v = shadeUV.getY(n) * 2 - 1, x = cx + SUNWARD.x * u * len * 0.62 + SIDE.x * v * wid, z = cz + SUNWARD.z * u * len * 0.62 + SIDE.z * v * wid, y = iceH(x, z);
      shadeP.setXYZ(n, F.x + x, y === null ? -1 : y + 0.02 + fl.y - z * fl.rx + x * fl.rz, F.z + z);
    }
    shadeP.needsUpdate = true; shade.material.opacity = 0.85 / (1 + up * 4);
  }
  const mouthAt_ = 0;

  // ---------- the camera: held by someone ----------
  /** A hand on the camera: it drifts a little, never the same way twice, more on a long lens' subject than the frame's edge. */
  function operate(s, t, amt = 1, seed = 0) {
    const d = s.pos.distanceTo(s.look), w = d * Math.tan((s.fov ?? 40) * Math.PI / 360);
    const nx = n1(t * 1.3, seed) * 0.55 + n1(t * 3.1, seed + 1) * 0.3 + n1(t * 6.3, seed + 2) * 0.15, ny = n1(t * 1.1, seed + 3) * 0.55 + n1(t * 2.9, seed + 4) * 0.3 + n1(t * 5.7, seed + 5) * 0.15;
    const fw = s.look.clone().sub(s.pos).normalize(), rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    return { ...s, look: s.look.clone().add(rt.multiplyScalar(nx * w * 0.055 * amt)).add(up.multiplyScalar(ny * w * 0.046 * amt)), roll: (s.roll ?? 0) + n1(t * 0.7, seed + 6) * 0.011 * amt };
  }
  /** Something heavy happened at `t0`: the picture's knocked, and steadies. */
  function jolt(s, t, t0, amp = 0.04, f = 34) {
    const dt = t - t0; if (dt < 0 || dt > 0.9) return s;
    const w = s.pos.distanceTo(s.look) * Math.tan((s.fov ?? 40) * Math.PI / 360), k = Math.exp(-5.5 * dt);
    s.look = s.look.clone().add(V(Math.sin(dt * f * 0.7 + 1) * 0.4, -Math.cos(dt * f), 0).multiplyScalar(amp * w * k)); s.roll = (s.roll ?? 0) + Math.sin(dt * f * 0.6) * amp * 0.25 * k;
    return s;
  }
  const wide = (d, elev) => F.clone().add(OUT.clone().multiplyScalar(d * Math.cos(elev))).add(V(0, d * Math.sin(elev), 0));
  /** A cut that lands: starts a touch closer and settles, with a few frames of shake. */
  function hit(t, t0, pos, look, fov = 40) {
    const k = easeOut((t - t0) / 0.3), sh = Math.max(0, 1 - (t - t0) / 0.2) * 0.012 * pos.distanceTo(look);
    const p = look.clone().lerp(pos, 0.93 + 0.07 * k);
    p.add(V(Math.sin(t * 91) * sh, Math.cos(t * 77) * sh, 0));
    return { pos: p, look, fov };
  }

  // ---------- the tuna's jumps ----------
  // Out of the water in his face (A), and the one he ropes (2). A fish this size is slow in the air: over a second.
  const STARTA = F.clone().add(V(-3.55, 0, 0.15)), DIRA = V(-0.8, 0, 0.3).normalize(), LENA = 2.4, HIGHA = 3.35, CA = STARTA.clone().add(DIRA.clone().multiplyScalar(LENA / 2));
  function leap(c, dir, k, len = 4.2, high = 2.3) {
    // k 0..1 along the arc; under the water before and after. It's long out of the water and coming down, round at the top.
    const x = (k - 0.5) * len, y = high * 4 * k * (1 - k) - 0.95, st = Math.abs(2 * k - 1);
    tuna.g.position.copy(c).add(dir.clone().multiplyScalar(x)).setY(y);
    tuna.g.rotation.set(0, heading(dir), Math.atan2(high * 4 * (1 - 2 * k), len) * 0.9);
    tuna.g.scale.set(2.3 * (1 + 0.07 * st), 2.3 * (1 - 0.045 * st), 2.3);
    tuna.g.visible = k > 0 && k < 1;
  }
  const tunaYA = t => { const k = clamp((t - T.breach) / (T.splash2 - T.breach)); return Math.max(0, HIGHA * 4 * k * (1 - k) - 0.95); };
  /** The ride: the tuna going `TO` from `from`, and the loop round it. `dip`: sunk a little (he's just landed on it). */
  const DOCKR = DOCK.clone().sub(R2.clone().multiplyScalar(80)), RIDE1 = F.clone().add(V(8, 0, 5));
  function swimming(t, from, TO, speed, t0, mood, dip = 0) {
    const s = (t - t0) * speed, c = from.clone().add(TO.clone().multiplyScalar(s));
    const bob = Math.sin(t * 9) * 0.1, pitch = Math.cos(t * 9) * 0.1 + dip * 0.9;
    tuna.g.visible = true; tuna.g.scale.setScalar(2.3);
    tuna.g.position.copy(c).setY(0.34 + bob - dip);
    tuna.g.rotation.set(0, heading(TO), pitch);
    fish({ swim: t * 30, amp: 0.11, ...mood });
    waterline(c, TO);
    return { c, pitch, knot: collar(TO) };
  }
  const deck = () => tuna.g.localToWorld(V(-0.2, tuna.radAt(-0.2) * 0.96, 0));
  let sprayT = 0, dripT = 0;
  const wash2 = foamRing(1); wash2.visible = false; scene.add(wash2); // (his own wake, dragged)
  // (the water doming up over something coming: the game's shallow-water colour, where the sea thins over its back)
  const coil = new Mesh(new TorusGeometry(0.075, 0.02, 6, 16), ropeMat); coil.visible = false; scene.add(coil); // (the rope in his hand before it's a loop: as thick as the belt it was)
  const swell = new Mesh(new T3.SphereGeometry(1, 18, 9), new MeshLambertMaterial({ color: 0x36BEDB })); swell.visible = false; scene.add(swell);
  /** The rope from `a` to `b2`, hanging `sag` in the middle and blown `side` off the line: more than one bend to it. */
  const hung = (a, b2, sag, side = 0, r) => lay([a, a.clone().lerp(b2, 0.3).add(V(side * 0.6, -sag * 0.8, side * 0.3)), a.clone().lerp(b2, 0.68).add(V(-side * 0.5, -sag, -side * 0.4)), b2], r);

  // ---------- what's in the air and on the water, every frame ----------
  const BREATHS = [[T.close + 0.2, 1], [T.open + 0.25, 0.8], [T.elbows + 0.2, 1], [T.sit + 0.15, 1.1], [T.face + 0.15, 0.6], [T.face + 0.33, 0.6], [T.face + 0.52, 0.6], [T.rise + 0.3, 1], [T.lookL + 0.25, 0.9], [T.lookR + 0.2, 0.8], [T.bang + 0.12, 1.5], [T.sat + 0.6, 1.8], [T.thud + 0.75, 0.8], [T.sitUp + 0.85, 1.2], [T.idea + 0.5, 0.9]];
  function air(t, low) {
    // the floe: its bob and tip
    chunks.forEach(m => { const i = m.userData.i; m.position.y = 0.09 + Math.sin(t * (1.1 + i * 0.13) + i * 2) * 0.018; m.rotation.z = Math.sin(t * (0.9 + i * 0.1) + i) * 0.05; });
    for (const s of shades) { s.position.x = s.userData.x + t * s.userData.sp; s.visible = true; }
    // his breath: each one caught where his mouth was, then it hangs, drifts down the wind and thins
    BREATHS.forEach(([t0, big], n) => once('br' + n, t0, t, () => { const p = puffs[n % puffs.length], m = mouthAt(), fw = P.body.localToWorld(V(0, 0.965, 1.27)).sub(m); Object.assign(p, { t0, big }); p.at.copy(m); p.dir.copy(fw); }));
    for (const p of puffs) { const u = (t - p.t0) / 1.25; p.m.visible = low && u > 0 && u < 1; if (!p.m.visible) continue;
      p.m.position.copy(p.at).add(p.dir.clone().multiplyScalar(0.3 * (1 - Math.exp(-3.5 * u)))).add(V(0.22 * u * u, 0.1 * u, 0.05 * u));
      p.m.scale.setScalar((0.07 + 0.3 * Math.sqrt(u)) * p.big); p.m.material.opacity = 0.5 * (1 - u) * clamp(u * 9); }
    // spindrift: thin streaks low over the ice, in gusts
    for (const d of drift) { d.m.visible = low; if (!low) continue;
      const x = (d.x + t * d.sp) % 30 - 15, gust = 0.5 + 0.5 * n1(t * 0.45 + d.i * 0.31, 11);
      d.m.position.set(F.x + x, d.y + Math.sin(t * 2 + d.i) * 0.04, F.z + d.z + x * 0.2); d.m.scale.set(d.len, 0.035, 1); d.m.material.opacity = 0.34 * gust * bump((x + 15) / 30); }
  }

  // ---------- his face, by the moment ----------
  function faceAt(t) {
    const blink = (a, d = 0.09) => t >= a && t < a + d;
    if (t < T.spray + 0.05) return { eyes: 'shut' };
    if (t < T.spray + 0.45) return { eyes: 'shut', brow: [0.1, 1], mouth: 'frown' };
    if (t < T.open) return { eyes: ((t >= T.open - 0.24 && t < T.open - 0.17) || (t >= T.open - 0.1 && t < T.open - 0.04)) ? 'dot' : 'shut' };
    if (t < T.elbows - 0.25) return { eyes: blink(T.open + 0.32) ? 'shut' : 'dot', brow: [0.5, -0.3] };
    if (t < T.sit - 0.2) return { eyes: blink(T.elbows + 0.18) ? 'shut' : 'dot', brow: [0.7, -0.5], mouth: 'o', open: 0.6 };
    if (t < T.face) return { eyes: 'big', brow: [0.8, -0.8], mouth: 'o', open: 0.8 };
    if (t < T.wide) return { eyes: 'big', brow: [0.8, -0.8], mouth: 'chatter', open: 0.5 + 0.5 * Math.sign(n1(t * 27, 7)) };
    if (t < T.lookL - 0.14) return { eyes: blink(T.rise + 0.5) ? 'shut' : 'dot', brow: [0.6, -0.6], mouth: 'frown' };
    if (t < T.bang) return { eyes: blink(T.lookR - 0.3) ? 'shut' : 'dot', brow: [1.0, -0.9], mouth: 'frown' }; // (his own dot eyes while he's side on: the big ones stand proud of his face)
    if (t < T.hit1) return { eyes: 'big', brow: [1.6, -0.4], mouth: 'o', open: 1.9 };
    if (t < T.hit3) return { eyes: 'big', brow: [1.2, -0.8], mouth: 'o', open: 1.5 };
    if (t < T.thud) return { eyes: blink(T.sat + 0.55, 0.32) ? 'shut' : 'dot', brow: [0.4, -1], mouth: 'frown' };
    if (t < T.breach) return { eyes: blink(T.peer - 0.25) ? 'shut' : 'big', brow: [1.4, -0.6], mouth: 'o', open: t < T.thud + 0.5 ? 1.5 : 0.7 };
    if (t < T.sitUp) return { eyes: 'big', brow: [1.7, -0.3], mouth: 'o', open: 2.0 };
    if (t < T.sitUp + 0.9) return { eyes: 'shut', brow: [0.1, 1], mouth: 'frown' };
    if (t < T.idea - 0.5) return { eyes: 'dot', brow: [0.2, 0.9], mouth: 'frown' };
    if (t < T.idea) return { eyes: 'big', brow: [1.2, -0.3], mouth: 'o', open: 1.2 };
    if (t < T.thrown) return { eyes: 'dot', brow: [-0.2, 1.1], mouth: 'grin', open: 0.45 + 0.45 * clamp((t - T.idea) / 0.15) };
    if (t < T.taut) return { eyes: 'dot', brow: [0, 1.2], mouth: 'o', open: 1.4 };
    if (t < T.yank - 0.03) return { eyes: 'happy', brow: [0.6, 0.3], mouth: 'grin', open: 1.1 };
    return { eyes: 'big', brow: [1.7, -0.6], mouth: 'o', open: 2.1 };
  }

  let air0 = null; const SEA = 0.16, SEAWIND = 0.14, RUSHK = 0.22; // (the air's levels, on the game's ambience bus: set by measuring, then by the owner's ear)
  function frame(i, fps) {
    const t = i / fps;
    // ---------- sound cues ----------
    const LEAD = 0.034;
    // THE AIR: the sea and the wind, the game's own way (ambience.ts): brown noise, low, its level moving all the time,
    // waves with calm between and wind in gusts. (It was two held bands of white noise: the owner heard "a heavy
    // constant static... very harsh on the ear".) A hole in it before the tuna comes up; a rush of water for the ride.
    if (t >= 0.12 && !air0) air0 = { sea: K.soft(A, { kind: 'lowpass', f: 420, q: 0.5, smooth: 800 }), wash: K.soft(A, { kind: 'bandpass', f: 800, q: 0.5, smooth: 1600 }),
      wind: K.soft(A, { kind: 'bandpass', f: 330, q: 0.8, smooth: 1200 }), gust: K.soft(A, { kind: 'bandpass', f: 650, q: 0.8, smooth: 1200, from: 1.5 }) };
    if (air0) { const w = K.swell(t), g = (0.5 + 0.5 * K.n1(t * 0.33, 17)) ** 2;
      const hole = 1 - ease((t - T.side + 1.0) / 0.4) * (1 - ease((t - T.breach + 0.05) / 0.25)); // (still, before the water moves)
      const farK = ease((t - T.hit3) / 0.3) * (1 - ease((t - T.glum) / 0.3)); // (from high up: more wind, less water)
      const ride = ease((t - T.drag) / 0.5), out = 1 - ease((t - T.end + 0.75) / 0.7), on = ease((t - 0.12) / 0.8) * out;
      const blow = SEAWIND * (0.35 + 0.65 * g) * (1 + 0.8 * farK) * hole * on * (1 - 0.5 * ride);
      air0.sea.to(SEA * w * (1 - 0.6 * farK) * hole * on * (1 - 0.4 * ride)); air0.wash.to((SEA * 1.3 * Math.max(0, w - 0.75) * (1 - farK) * hole + RUSHK * ride * (0.75 + 0.25 * K.n1(t * 1.7, 5))) * on);
      air0.wind.to(blow * Math.cos(g * Math.PI / 2), 0.3); air0.gust.to(blow * Math.sin(g * Math.PI / 2), 0.3); }
    once('spray', T.spray - 0.05, t, () => A.noise({ f: 2200, f2: 700, kind: 'lowpass', d: 0.3, a: 0.02, v: 0.13 }));
    once('blinkA', T.open, t, () => blip(700, 760, 0.07, 0, 0.05));
    once('elb', T.elbows - 0.36, t, () => whoosh(0.3, 0.17, 260, 600)); once('sitUp', T.sit - 0.3, t, () => whoosh(0.34, 0.27, 300, 900));
    for (let n = 0; n < 3; n++) once('teeth' + n, T.face + 0.1 + n * 0.22, t, () => { for (let j = 0; j < 4; j++) A.tone({ f: 1500, f2: 1300, d: 0.018, t: j * 0.045, type: 'triangle', v: 0.125 }); });
    const step = (k, at, v = 0.3) => once(k, at, t, () => { A.tone({ f: 150, f2: 70, d: 0.09, v }); A.noise({ f: 900, kind: 'lowpass', d: 0.06, v: v * 0.5 }); });
    step('up1', T.rise - 0.1, 0.2); step('up2', T.rise + 0.3, 0.14); step('up3', T.rise + 0.54, 0.1);
    once('lk1', T.lookL - 0.1, t, () => whoosh(0.2, 0.15, 300, 700)); once('lk2', T.lookR - 0.16, t, () => whoosh(0.28, 0.2, 300, 800));
    once('bang', T.bang, t, () => { blip(880, 1320, 0.2); blip(1320, 1320, 0.18, 0.1, 0.22); }); // (blips are all peak: at full level they hit the limiter harder than the thuds)
    step('land', T.land, 0.15); once('slosh', T.land + 0.05, t, () => A.noise({ f: 600, f2: 250, kind: 'lowpass', d: 0.5, a: 0.05, v: 0.12 }));
    once('h1', T.hit1 - LEAD, t, () => thud(0.1)); once('h2', T.hit2 - LEAD, t, () => thud(0.5)); once('h3', T.hit3 - LEAD, t, () => thud(0.8)); // (each bigger, the first over his own landing just before it, the third under the THUD to come)
    for (let n = 0; n < 4; n++) step('run' + n, T.hit1 + 0.3 + n * 0.1, 0.16);
    once('skid', T.hit1 + 0.64, t, () => A.noise({ f: 2000, f2: 900, q: 0.8, d: 0.18, v: 0.09 }));
    step('j1', T.hit2 + 0.55, 0.14); step('j2', T.hit2 + 1.0, 0.14);
    once('wind', T.hit3 + 0.1, t, () => { A.tone({ f: 52, f2: 46, a: 0.25, hold: T.glum - T.hit3 - 0.6, d: 0.3, v: 0.056 }); });
    step('sat', T.sat, 0.165); once('sigh', T.sat + 0.5, t, () => A.noise({ f: 900, f2: 450, q: 0.6, d: 0.45, a: 0.2, v: 0.125 }));
    once('under', T.thud - LEAD, t, () => { thud(1); A.tone({ f: 380, f2: 240, d: 0.32, t: 0.1, type: 'triangle', v: 0.07 }); A.noise({ f: 500, f2: 200, kind: 'lowpass', d: 0.7, a: 0.05, v: 0.14, t: 0.12 }); });
    step('seat', T.thud + 0.3, 0.2);
    once('flop', T.peer + 0.55, t, () => { A.tone({ f: 120, f2: 60, d: 0.1, v: 0.22 }); }); once('crawl1', T.peer + 0.8, t, () => A.noise({ f: 1500, f2: 800, q: 0.7, d: 0.18, v: 0.13 })); once('crawl2', T.peer + 0.98, t, () => A.noise({ f: 1500, f2: 800, q: 0.7, d: 0.14, v: 0.13 }));
    once('deep', T.shadow, t, () => { A.tone({ f: 62, f2: 46, d: 0.35, a: 0.4, v: 0.1 }); A.tone({ f: 186, f2: 138, d: 0.35, a: 0.4, type: 'triangle', v: 0.04 }); A.noise({ f: 260, f2: 140, kind: 'lowpass', d: 0.35, a: 0.4, v: 0.05 }); });
    once('swell', T.side + 0.08, t, () => { A.noise({ f: 180, f2: 420, kind: 'lowpass', d: 0.1, a: 0.3, v: 0.14 }); A.tone({ f: 46, f2: 72, d: 0.1, a: 0.3, v: 0.114 }); A.noise({ f: 250, f2: 900, q: 1.5, d: 0.05, a: 0.3, v: 0.2 }); });
    // (the biggest thing in the scene by how LONG its water lasts, not by a peak: a peak only meets the limiter and comes out smaller)
    once('burst', T.breach - 0.03 - LEAD, t, () => { thud(0.05); A.noise({ f: 500, f2: 2600, q: 0.6, d: 0.8, a: 0.03, v: 0.09 }); A.noise({ f: 900, f2: 300, kind: 'lowpass', d: 1.3, a: 0.02, v: 0.068 }); A.noise({ f: 3400, f2: 1200, q: 0.6, d: 0.7, a: 0.005, v: 0.09 }); A.noise({ f: 1300, f2: 420, q: 0.8, d: 0.55, a: 0.012, v: 0.095 }); }); // (a body of water under the hiss: 0.4-1.3 kHz for half a second, or the burst is a 'tss')
    once('burst2', T.breach + 0.08, t, () => water(0.16, 0.5));
    once('rain', T.breach + 0.4, t, () => A.noise({ f: 3200, f2: 1500, q: 0.6, d: 0.64, a: 0.06, v: 0.11 }));
    step('back', T.breach + 0.57 - LEAD, 0.18); step('back2', T.breach + 0.87, 0.13);
    once('in', T.breach + 0.9, t, () => { water(0.17, 0.6); thud(0.1); A.noise({ f: 400, f2: 2400, q: 0.6, d: 0.7, a: 0.03, v: 0.135 }); A.noise({ f: 700, f2: 250, kind: 'lowpass', d: 0.8, a: 0.02, v: 0.22 }); });
    for (let n = 0; n < 3; n++) once('shake' + n, T.sitUp + 0.48 + n * 0.1, t, () => A.noise({ f: 2600, f2: 1600, q: 0.8, d: 0.07, v: 0.06 }));
    once('far', T.idea - 0.56, t, () => SFX.splash(P.position));
    once('idea', T.idea - LEAD, t, () => { blip(660, 660, 0.15, 0, 0.09); blip(990, 990, 0.17, 0.09, 0.2); });
    once('belt', T.idea + 0.3, t, () => A.tone({ f: 170, f2: 120, d: 0.06, v: 0.14 })); once('belt2', T.idea + 0.42, t, () => whoosh(0.16, 0.25, 500, 900));
    for (let n = 0; n < 5; n++) once('w' + n, T.twirl + 0.2 + n * 0.17 - n * n * 0.008, t, () => whoosh(0.15, 0.3 + n * 0.03, 380, 900));
    once('throw', T.thrown, t, () => whoosh(0.35, 0.3)); once('s3', T.caught - 0.42, t, () => { SFX.splash(P.position); A.noise({ f: 500, f2: 2200, q: 0.6, d: 0.4, a: 0.03, v: 0.2 }); });
    once('gotcha', T.caught + 0.16, t, () => { blip(1100, 1500, 0.17, 0, 0.1); A.tone({ f: 230, f2: 170, d: 0.16, type: 'triangle', v: 0.15 }); });
    once('taut', T.taut + 0.12 - LEAD, t, () => { A.tone({ f: 250, f2: 150, d: 0.2, type: 'triangle', v: 0.18 }); A.tone({ f: 500, f2: 480, d: 0.12, type: 'triangle', v: 0.06 }); });
    once('slip1', T.taut + 0.3, t, () => A.noise({ f: 2100, f2: 1300, q: 0.8, d: 0.07, v: 0.1 })); once('slip2', T.taut + 0.48, t, () => A.noise({ f: 2100, f2: 1300, q: 0.8, d: 0.07, v: 0.12 }));
    once('creak', T.taut + 0.2, t, () => A.tone({ f: 190, f2: 230, d: 0.4, a: 0.1, type: 'triangle', v: 0.1 }));
    once('yank', T.yank - LEAD, t, () => { A.tone({ f: 210, f2: 120, d: 0.16, type: 'triangle', v: 0.18 }); blip(900, 520, 0.12, 0.05, 0.24); });
    once('scrape', T.yank + 0.07, t, () => A.noise({ f: 2100, f2: 1100, q: 0.8, d: 0.12, a: 0.02, v: 0.14 })); once('gone', T.yank + 0.14, t, () => whoosh(0.4, 0.34, 500, 1900));
    once('rock', T.yank + 0.34, t, () => { A.noise({ f: 600, f2: 250, kind: 'lowpass', d: 0.6, a: 0.05, v: 0.14 }); SFX.splash(P.position); });
    once('dragw', T.drag, t, () => spl(0.2));
    once('sp1', T.drag + 0.2, t, () => SFX.splash(P.position)); once('sp2', T.drag + 1.0, t, () => SFX.splash(P.position));
    [0.4, 0.72, 1.14].forEach((at, n) => once('hv' + n, T.drag + at, t, () => whoosh(n === 2 ? 0.3 : 0.16, [0.25, 0.27, 0.38][n], 300, 520)));
    once('heave', T.drag + 1.58, t, () => { whoosh(0.4, 0.2, 400, 1300); spl(0.2); }); once('mount', T.drag + 1.8 - LEAD, t, () => { thud(0.12); water(0.13, 0.5); });
    once('whee', T.drag + 2.6, t, () => { blip(520, 1040, 0.15, 0, 0.25); });
    once('sp3', T.far + 0.3, t, () => SFX.splash(P.position));

    // ---------- the picture ----------
    let shot, low = true;
    // (he's in a scene: he doesn't fish from the pad, pick fillets up or drop them, wherever it puts him)
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    rope.visible = false; loop.visible = false; wash.visible = false; wash2.visible = false; swell.visible = false; coil.visible = false; dark.visible = false; dark.scale.setScalar(1); tuna.g.visible = false; shade.visible = false;
    for (const h of hills) h.visible = false;
    K.fade(0); K.letterbox(0); K.lids(0); K.vignette(0.38);
    for (const b of banks) b.visible = false;
    for (const r of rings) r.visible = false;
    farSea.visible = t >= T.hit3 && t < T.glum; openSea.visible = !farSea.visible;
    for (const o of bay) if (o !== P) { if (farSea.visible) { if (o.visible) { o.visible = false; o.userData.put = 1; } } else if (o.userData.put) { o.visible = true; o.userData.put = 0; } }
    pills[0].at = pills[1].at = null;
    tuna.g.scale.setScalar(2.3); tuna.g.children[2].scale.y = 1;
    const f = faceAt(t);
    // (his belt, till he takes it off for a rope: it draws in under his hand over four frames, and is gone)
    { const k = clamp((t - T.idea - 0.3) / 0.13), [band, knob, tail] = rags.userData.belt; band.visible = knob.visible = tail.visible = k < 1; band.scale.set(1 - 0.16 * k, 1 - 0.16 * k, 1); knob.scale.set(0.035 * (1 - k), 0.035 * (1 - k), 0.03 * (1 - k)); tail.scale.setScalar(1 - k); }
    // the floe: its bob and tip
    { const fl = floeAt(t); floe.position.y = 0.105 + fl.y; floe.rotation.set(fl.rx, 0, fl.rz); }

    if (t < T.hit1) {
      // ----- the sea, the floe, him: asleep, awake, up, and what he sees -----
      act(t, f, { alive: t > T.open ? 1 : 0, cold: t > T.plant && t < T.bang - 0.3 ? (t < T.sit ? 0.6 : 1) : 0 });
      once('skidFx', T.hit1 + 0.66, t, () => FX.dustFx(F.clone().add(V(1.3, 0.3, 0)), 5, 0.8, [0xFFFFFF, 0xD5ECF5]));
      once('wet', T.spray - 0.14, t, () => FX.splashFx(F.clone().add(V(-1.75, 0, -0.35)), 0.12));
      if (t < T.close) {
        // far off and low over the water, a long lens: a sea with ice in it, one floe, something orange on it. It creeps in.
        const k = t / T.close;
        shot = operate({ pos: F.clone().add(V(26, 0, 30).multiplyScalar(mix(0.7, 0.63, k))).setY(mix(1.5, 1.85, k)), look: F.clone().add(V(-2.2, 1.9, -1.0)), fov: 25, fogNear: 45, fogFar: 170 }, t, 0.7, 1);
        shot.roll += Math.sin(t * 0.9) * 0.007; // (shot from a boat)
      } else if (t < T.face) {
        // beside him, low on the ice. It stays put while he sleeps, and comes up after him as he sits (late, as a hand would)
        const hd = lag(headW, t, 0.22), hp = lag(hipW, t, 0.22), up = hd.y - 0.52;
        shot = operate({ pos: V(F.x + 0.95, 0.58 + up * 0.55, F.z + 2.55 + up * 0.45), look: V(mix(hp.x, hd.x, 0.6) + 0.15, 0.47 + up * 0.8, F.z - 0.05), fov: 32, fogNear: 30, fogFar: 110 }, t, 0.8, 2);
        jolt(shot, t, T.spray, 0.012);
      } else if (t < T.wide) {
        // his face: cold, and nowhere
        const hd = headW(t);
        const a = 0.5, d = 1.6 - (t - T.face) * 0.1;
        shot = operate({ pos: V(hd.x + Math.sin(a) * d, hd.y + 0.04, hd.z + Math.cos(a) * d), look: V(hd.x + 0.03, hd.y - 0.03, hd.z), fov: 29, fogNear: 30, fogFar: 110 }, t, 1.7, 3);
      } else {
        // wider, so the floe's seen to tip: up on his feet, the looks (the camera goes a little the way he looks), "!"
        const hp = lag(hipW, t, 0.24), hy = lag(hipW, Math.min(t, T.rise + 0.8), 0.24).y, p = S(t - 0.22), lead = Math.sin(p.yaw - 0.45) * 0.3, push = EASE.settle((t - T.bang) / 0.35);
        shot = operate({ pos: V(F.x + 2.2, 1.5, F.z + 4.3), look: V(hp.x - 0.3 + lead, mix(0.88, hy + 0.5, 0.6), hp.z), fov: 33 - 3.5 * push, fogNear: 30, fogFar: 110 }, t, 1, 4);
        jolt(shot, t, T.land, 0.03);
      }
      once('landFx', T.land + 0.03, t, () => FX.splashFx(F.clone().add(V(0.9, 0, -1.75)), 0.1)); // (the floe's far edge slaps the water as it takes him)
      if (t >= T.bang) pills[0].at = headW(t).add(V(0, 0.62, 0));
    } else if (t < T.glum) {
      // ----- three thuds: further, further, nothing but sea. He runs out of ideas a size at a time. -----
      const b = t - T.hit2 - 0.1, jumping = b > 0 && b < 0.9, u = jumping ? (b / 0.45) % 1 : 0;
      for (let n = 0; n < 2; n++) once('jfx' + n, T.hit2 + 0.56 + n * 0.45, t, () => FX.splashFx(F.clone().add(V(2.1, 0, n ? -0.4 : 0.5)), 0.1));
      const r1 = t - T.hit1, mill = bump((r1 - 0.7) / 0.34);
      if (r1 < 1.05 && !jumping) act(t, f, { dy: r1 > 0.28 && r1 < 0.66 ? Math.abs(Math.sin(S(t).px * 9)) * 0.06 : 0, a00: Math.sin(r1 * 27) * 0.8 * mill, a10: Math.cos(r1 * 27) * 0.8 * mill, a01: 0.3 * mill, a11: 0.3 * mill });
      else act(t, f, jumping ? { dy: 0.5 * 4 * u * (1 - u), sq: u < 0.12 || u > 0.9 ? 0.86 : 1.07, a01: Math.sin(b * 22) * 0.35, a11: -Math.sin(b * 22 + 0.9) * 0.35 } : {});
      low = t < T.hit2;
      if (t < T.hit2) shot = { ...hit(t, T.hit1, wide(8, 0.3), F.clone().setY(0.6)), fogNear: 40, fogFar: 120 };
      else if (t < T.hit3) shot = { ...hit(t, T.hit2, wide(15, 0.55), F.clone().setY(0.5)), fogNear: 80, fogFar: 200 };
      else { const c = t - T.hit3, pull = ease((c - 0.2) / (T.glum - T.hit3 - 0.2)); K.vignette(0.38 + 0.4 * pull);
        // (one ripple going out from his floe, soft and broken: where he is, without drawing a target on him)
        { const r = rings[0], k = clamp(c / 1.2); r.visible = true; r.scale.setScalar(mix(3, 9, easeOut(k))); r.userData.mat.opacity = 0.32 * Math.sin(k * Math.PI); r.rotation.z = 0.7; }
        shot = { ...hit(t, T.hit3, wide(mix(56, 80, pull), mix(1.18, 1.27, pull)), F.clone()), fogNear: 300, fogFar: 900, far: 500, roll: c * 0.012 }; }
    } else if (t < T.peer) {
      // ----- beaten. A sigh. And THUD: something under the ice -----
      act(t, f, { cold: t < T.thud ? 0.6 : 0 });
      const hd = lag(headW, t, 0.3);
      shot = operate({ pos: V(F.x + 2.0, 0.74, F.z + 2.6), look: V(F.x - 0.2, 0.95 + 0.5 * (hd.y - 1.19), F.z), fov: 32, fogNear: 30, fogFar: 110 }, t, t > T.thud ? 1.6 : 0.9, 5);
      jolt(shot, t, T.thud, 0.1, 30);
      once('satFx', T.sat + 0.04, t, () => FX.splashFx(F.clone().add(V(-0.7, 0, -1.8)), 0.1));
      [[-0.6, -1.8, 0.03], [1.5, -1.5, 0.11], [-2.0, -0.9, 0.17]].forEach(([x, z, dt], n) => once('thudFx' + n, T.thud + dt, t, () => FX.splashFx(F.clone().add(V(x, 0, z)), 0.1)));
    } else if (t < T.side) {
      // ----- over his shoulder, down at the water: he crawls to the edge, and a long dark shape goes by under it -----
      act(t, f);
      const k = (t - T.peer) / (T.side - T.peer), sk = clamp((t - T.shadow) / 0.98);
      dark.visible = sk > 0 && sk < 1;
      dark.position.set(F.x - 3.45 + Math.sin(sk * Math.PI) * 0.45, 0.19, F.z + mix(-5.2, 5.6, EASE.io(sk) * 0.6 + sk * 0.4));
      dark.rotation.y = -HP + Math.cos(sk * Math.PI) * 0.12 + Math.sin(t * 9) * 0.05; dark.material.opacity = 0.5 * bump(sk);
      shot = operate({ pos: V(F.x + 1.5, mix(2.5, 2.3, k), F.z + 1.0), look: V(F.x - 2.4, 0.1, F.z - 0.15), fov: mix(40, 35, ease(k)), fogNear: 30, fogFar: 110 }, t, 0.9, 6);
    } else if (t < T.sitUp) {
      // ----- from the side: the water darkens and swells in front of him; it comes out of it in his face, a sheet of
      // water coming off it, hangs over him, and goes back in with a crown of spray and a wave that lifts the floe -----
      act(t, f);
      const kb = (t - T.breach) / (T.splash2 - T.breach), sw = clamp((t - T.side - 0.03) / (T.breach - T.side - 0.03)), TIN = T.breach + 0.9, ENTRY = CA.clone().add(DIRA.clone().multiplyScalar(1.75));
      leap(CA, DIRA, kb, LENA, HIGHA);
      // (it bends as it comes, and flicks its tail at the top)
      fish({ swim: t * 26, amp: 0.1 + 0.14 * bump(kb * 1.6) + 0.1 * bump((kb - 0.35) / 0.3), smile: 1, flare: 0.5 + 0.5 * bump(kb), lid: 0.2, look: [0.7, -0.5] });
      // the swell: the water domes up in front of him, foam widening round it, and breaks as it comes through
      if (kb < 0.16) { const up = ease(sw) * (1 - clamp(kb / 0.16)); swell.visible = up > 0.01; swell.position.copy(STARTA).setY(0.02); swell.scale.set(0.9 + 0.8 * ease(sw), 0.62 * up, 0.8 + 0.7 * ease(sw)); }
      const into = t - TIN;
      if (t < T.breach + 0.3) { wash.visible = true; wash.position.copy(STARTA).setY(0.14); wash.rotation.y = 0; wash.scale.setScalar(mix(0.5, 2.0, ease(sw * 0.55 + clamp(kb / 0.25) * 0.45))); }
      else if (into > 0) { wash.visible = true; wash.position.copy(ENTRY).setY(0.14); wash.rotation.y = 0; wash.scale.setScalar(mix(0.6, 3.0, easeOut(into / 0.7))); }
      for (let n = 0; n < 3; n++) once('pre' + n, T.side + 0.14 + n * 0.08, t, () => FX.splashFx(STARTA.clone().add(V(n * 0.3 - 0.3, 0, 0.2 - n * 0.2)), 0.03));
      // (the water it throws up: a crown at the surface, and more torn off its body as it climbs)
      for (let n = 0; n < 22; n++) once('bfx' + n, T.breach - 0.02 + n * 0.016, t, () => { tuna.g.updateMatrixWorld(true); const up = n > 7 ? tuna.g.localToWorld(V(0.5 - ((n - 8) % 7) * 0.2, 0, ((n % 3) - 1) * 0.12)) : STARTA.clone().add(V(Math.cos(n * 0.8) * 0.55, 0, Math.sin(n * 0.8) * 0.55)); FX.splashFx(up, n > 7 ? Math.max(0.1, up.y - 0.3) : 0.1 + (n % 3) * 0.25); });
      // (and going back in: the biggest of all, where its nose goes through, a ring of it spreading)
      for (let n = 0; n < 26; n++) once('efx' + n, TIN - 0.03 + n * 0.014, t, () => FX.splashFx(ENTRY.clone().add(V(Math.cos(n * 2.4) * (0.15 + n * 0.035), 0, Math.sin(n * 2.4) * (0.15 + n * 0.035))), 0.1 + (n % 5) * 0.28));
      for (let n = 0; n < 5; n++) once('soak' + n, T.breach + 0.34 + n * 0.09, t, () => FX.splashFx(hipW(t).add(V(n1(n, 3) * 0.4, 0, n1(n, 5) * 0.3)), 0.5 + (n % 2) * 0.3)); // (and it comes down on him)
      // (water streaming off it on the way up)
      if (kb > 0.03 && kb < 0.6 && (dripT -= 1 / fps) <= 0) { dripT = 0.034; FX.pourFx(tuna.g.localToWorld(V(-0.4, -0.1, 0)), 0xBDEFF8, 4, 0.034); FX.pourFx(tuna.g.localToWorld(V(0.1, -0.2, 0)), 0xFFFFFF, 3, 0.03); FX.pourFx(tuna.g.localToWorld(V(-0.7, 0, 0)), 0xBDEFF8, 2, 0.03); }
      const ty = (tunaYA(t - 0.07) + tunaYA(t - 0.14) + tunaYA(t - 0.21)) / 3;
      shot = operate({ pos: V(F.x - 2.3, 0.6, F.z + 8.2), look: V(F.x - 2.6 - 1.0 * ease(kb * 1.3), 1.2 + 0.3 * ty, F.z), fov: 38, fogNear: 30, fogFar: 110 }, t, 1.3, 7);
      jolt(shot, t, T.breach, 0.08); jolt(shot, t, T.breach + 0.9, 0.06);
    } else if (t < T.taut) {
      // ----- soaked, he sits up and shakes it off; on his feet; the idea; the rope spun overhead, thrown, and round the tuna -----
      const twT = t - T.twirl - 0.1, twirling = twT > 0, spin = 6 * Math.max(0, twT) + 9 * Math.max(0, twT) ** 2, flown = clamp((t - T.thrown - 0.04) / 0.24), away = flown > 0, hang = t >= T.caught;
      const tw = twirling && !away ? clamp(twT / 0.2) : 0, shk = bump((t - T.sitUp - 0.35) / 0.45);
      act(t, f, { yaw: Math.sin(spin) * 0.07 * tw + Math.sin(t * 40) * 0.2 * shk, roll: Math.sin(spin) * 0.06 * tw, dy: Math.abs(Math.sin(spin * 0.5)) * 0.03 * tw, a11: Math.sin(spin) * 0.14 * tw });
      // (water coming off him)
      if (t < T.idea + 0.6 && (dripT -= 1 / fps) <= 0) { dripT = shk > 0.1 ? 0.03 : 0.11; const hd = headW(t); FX.pourFx(hd.add(V(n1(t * 31, 1) * 0.22, -0.1 - Math.abs(n1(t * 17, 2)) * 0.4, n1(t * 23, 3) * 0.22)), 0xBDEFF8, shk > 0.1 ? 3 : 1, 0.022); }
      // the one he ropes: it's out of the water as he winds up, and at the top of its jump when the loop gets there
      leap(LEAP2, DIR2, hang ? mix(0.45, 0.6, (t - T.caught) / (T.taut - T.caught)) : 0.5 + (t - T.caught) / 1.0, 3.6, 2.75);
      { const out = LEAP2.clone().sub(DIR2.clone().multiplyScalar(1.75)), u = (t - T.caught + 0.68) / 0.3; if (u > 0 && u < 1.25) { swell.visible = true; swell.position.copy(out).setY(0.02); swell.scale.set(0.8 + 0.7 * ease(u), 0.55 * ease(u) * (1 - clamp((u - 0.9) / 0.35)), 0.7 + 0.6 * ease(u)); } }
      const got = clamp((t - T.caught - 0.14) / 0.08);
      fish({ swim: t * (hang ? 44 : 22), amp: hang ? 0.05 + 0.08 * got : 0.09, smile: mix(1, -0.6, got), lid: 0.25 * (1 - got), wide: EASE.over(got * 0.6), mouth: got * 0.9,
        flare: mix(0.5, 1, got), look: [mix(0, -0.9, got), 0.3 * got], brow: -got });
      for (let n = 0; n < 14; n++) once('f3' + n, T.caught - 0.42 + n * 0.016, t, () => FX.splashFx(LEAP2.clone().sub(DIR2.clone().multiplyScalar(1.75 - (n % 5) * 0.12)).add(V(Math.cos(n * 1.3) * 0.5, 0, Math.sin(n * 1.3) * 0.5)), 0.1 + (n % 4) * 0.28));
      // The loop isn't a hoop on a stick: it starts small as he pays the rope out, it's pulled out of round as it goes
      // (longer along its swing), it tips late behind his hand, and the rope up to it has a bend that trails.
      // (he pulls it off his belt first: a length of it hanging from his hand, a small loop at its end, before it's up and round)
      const h = hand(1), pre0 = t > T.idea + 0.3 ? 1 : 0, pre = ease((t - T.idea - 0.36) / 0.18), drawn = ease((t - T.idea - 0.36) / 0.12), knotAt = P.body.localToWorld(V(0.07, 0.5, 0.27)), hangEnd = knotAt.clone().lerp(h.clone().add(V(0.03 + Math.sin(t * 7) * 0.03 * pre, -0.46 * pre, 0.02)), drawn), lift = ease(twT / 0.24);
      const grown = ease(twT / 0.45), rad = 0.2 + 0.1 * grown, over = hangEnd.clone().lerp(h.clone().add(V(Math.cos(spin) * rad, 0.28 + 0.24 * grown, Math.sin(spin) * rad)), lift);
      tuna.g.updateMatrixWorld(true);
      const tunaAt = tuna.g.localToWorld(V(0.3, 0, 0)), fk = flown, fly = over.clone().lerp(tunaAt.clone().add(V(0, 1.2, 0)), fk).add(V(0, Math.sin(fk * Math.PI) * 0.55, 0)), sw = ease(clamp((t - T.thrown) / 0.22));
      let knot = null;
      if (twirling) {
        const on = t >= T.caught + 0.14;
        if (on) knot = collar(DIR2);
        else {
          loop.visible = lift > 0.5; loop.position.copy(away ? fly : over);
          if (lift <= 0.5) { coil.visible = true; coil.position.copy(over); coil.rotation.set(HP * lift * 2, 0.5, 0); coil.scale.setScalar(1 + lift * 2.2); }
          const drop = clamp((t - T.caught) / 0.14), size = mix(0.3, 0.5, grown) * mix(1, 1.24, flown), oval = 0.14 * (1 - sw) * Math.sin(spin * 2) + 0.2 * Math.sin(flown * Math.PI);
          loop.scale.set(size * (1 + oval), size * (1 - oval), size);
          if (hang) loop.position.copy(tunaAt).add(V(0, mix(1.2, 0, drop * drop), 0));
          // (flat and still turning all the way there; it comes round the tuna only as it drops)
          if (!hang) loop.rotation.set(HP - (0.5 - 0.26 * Math.sin(spin - 0.7)) * (1 - flown) + 0.18 * Math.sin(flown * Math.PI), 0.2 * Math.sin(spin * 0.5) * (1 - flown), spin);
          else loop.rotation.set(mix(HP, 0, drop), mix(0, heading(DIR2) + HP, drop), (spin % (Math.PI * 2)) * (1 - drop));
        }
        const end = knot ?? loop.position.clone();
        hung(h, end, away ? 0.55 * Math.sin(flown * Math.PI) - 0.2 * (1 - flown) : -0.12 * lift, away ? 0.25 * Math.sin(flown * 5) * (1 - flown) : 0.1 * Math.sin(spin - 1) * lift);
      } else if (pre0) { coil.visible = true; coil.position.copy(hangEnd).add(V(0, -0.07 * drawn, 0)); coil.scale.setScalar(0.35 + 0.65 * clamp((t - T.idea - 0.3) / 0.13)); coil.rotation.set(0, 0.5, 0); lay([h, h.clone().lerp(hangEnd, 0.5).add(V(0.02, 0.02 * (1 - drawn), 0.02)), hangEnd]); }
      const d = V(Math.sin(SEAWARD), 0, Math.cos(SEAWARD));
      if (t < T.over) {
        // from the north-west, the low sun behind the camera: his face the whole time, as he sits up facing where it went,
        // shakes, hears it jump again, gets up and turns after it. Up with him as he stands, in on the idea, out for the rope
        const hd = lag(headW, t, 0.2), kI = EASE.settle((t - T.idea) / 0.3), kO = ease((t - T.twirl) / (T.over - T.twirl));
        shot = operate({ pos: V(F.x - 3.45 - 0.3 * kO, 0.7 + hd.y * 0.38 + 0.2 * kO, F.z - 1.5 - 0.15 * kO), look: V(hd.x, hd.y - 0.12 + 0.35 * kO, hd.z), fov: 31 - 2.5 * kI + 11.5 * kO, fogNear: 30, fogFar: 110 }, t, 1, 8);
      } else if (!hang) {
        // from behind him and to his right: the tuna comes out of the water beside his hat and goes across to the right
        const k = ease((t - T.over) / (T.caught - T.over));
        shot = operate({ pos: V(F.x + 2.0 - 0.1 * k, mix(2.3, 2.2, k), F.z - 2.4 + 0.2 * k), look: V(F.x - mix(3.0, 3.5, k), mix(1.45, 1.55, k), F.z + mix(0.6, 0.95, k)), fov: 44, fogNear: 26, fogFar: 90 }, t, 1.1, 9);
      } else {
        // the tuna, hung in the air at the top of its jump as the loop drops over its nose: "!"
        const c = tuna.g.position.clone(), sh = got > 0 && got < 1 ? 0.03 : 0;
        shot = operate({ pos: c.clone().add(V(3.0 + Math.sin(t * 80) * sh, 0.45, -2.9)), look: c.clone().add(V(0, 0.1, -0.25)), fov: 40, fogNear: 26, fogFar: 90 }, t, 0.8, 10); // (it heads right, as it will pull him; the rope runs back to him off the left)
        if (got > 0) pills[1].at = tuna.g.localToWorld(V(0.45, 0.52, 0));
        P.visible = false;
      }
    } else if (t < T.drag) {
      // ----- the rope lies slack... and snaps tight. He's got it! He leans back on it, grinning. And it has him: his arms go,
      // his heels scrape, he's gone; and the floe, tipped by it, rocks empty -----
      const dt = t - T.taut, yk = t - T.yank, strain = dt > 0.16 && yk < 0 ? 1 : 0;
      // (straining: he quivers against it)
      act(t, f, { stride: 0, tip: n1(t * 33, 7) * 0.035 * strain, dx: n1(t * 41, 8) * 0.006 * strain, a00: n1(t * 29, 9) * 0.06 * strain, a10: n1(t * 27, 10) * 0.06 * strain });
      const gone = yk > 0.3; if (gone) P.visible = false; // (off the picture's edge and away)
      const hnd = hand(0).lerp(hand(1), 0.5);
      // (where the rope goes into the water: off after the tuna, slowly while he holds it, then away)
      const W = LEAP2.clone().add(V(-1 - dt * 2 - Math.max(0, yk) * 22, 0.1, -1.8 - dt * 1.2 - Math.max(0, yk) * 3));
      const snap = clamp((dt - 0.1) / 0.06), ring = dt > 0.16 ? Math.sin(dt * 95) * 0.02 * Math.exp(-(dt - 0.16) * 9) + n1(t * 37, 12) * 0.008 * strain : 0;
      if (!gone) hung(hnd, W, mix(0.75 + 0.06 * Math.sin(dt * 30), ring, snap), mix(0.3 * Math.sin(dt * 22), 0, snap));
      // (ice thrown up from under his heels each time they give, and as they go)
      const heels = () => FX.dustFx(P.position.clone().setY(ICE_Y + 0.17), 4, 0.9, [0xFFFFFF, 0xD5ECF5]);
      once('slipFx1', T.taut + 0.3, t, heels); once('slipFx2', T.taut + 0.48, t, heels); once('goFx1', T.yank + 0.08, t, heels); once('goFx2', T.yank + 0.14, t, heels);
      once('offFx', T.yank + 0.24, t, () => { FX.splashFx(F.clone().add(V(-2.4, 0, 0.1)), 0.1); FX.splashFx(F.clone().add(V(-3.5, 0, 0.3)), 0.1); });
      once('rockFx', T.yank + 0.42, t, () => FX.splashFx(F.clone().add(V(1.9, 0, 0.5)), 0.1));
      // (the camera goes after him a little, late, and gives up: it's left on the floe)
      const hp = lag(hipW, t, 0.26);
      shot = operate({ pos: V(F.x + 0.3, 0.95, F.z - 4.3), look: V(Math.max(F.x - 1.75, mix(F.x - 0.9, hp.x - 0.5, 0.75)), mix(hp.y + 0.4, 0.9, clamp(yk / 0.3)), F.z + 0.1), fov: 36, fogNear: 30, fogFar: 110 }, t, 1.4, 11);
      jolt(shot, t, T.taut + 0.12, 0.035); jolt(shot, t, T.yank + 0.06, 0.05);
    } else if (t < T.far) {
      // ----- the ride, alongside. He's skipping along behind it on the end of the rope, half under; three pulls up the
      // rope (short, short, and a long heave: never a steady beat), its tail flicking at each; at its tail he sinks
      // (the wind-up), comes up out of the water turning upright as he goes, and lands on its back on his feet in a
      // deep squat: it sinks under him and kicks; he rocks forward, back, arms going, and finds his feet; then joy -----
      const TO = R1, a = t - T.drag, PULLS = [[0.4, 0.14, 0.26], [0.72, 0.13, 0.24], [1.14, 0.3, 0.5]], J0 = 1.58, J1 = 1.8; // (three tugs with a rest between, the last a long heave)
      let haul = 0, surge = 0, reach = 0; for (const [at, d, share] of PULLS) { haul += share * EASE.out((a - at) / d); surge += bump((a - at) / d); reach += bump((a - at + 0.1) / 0.11); } // (each pull: a reach held a moment, then the surge)
      const jump = clamp((a - J0) / (J1 - J0)), on = ease(jump), dunk = bump((a - J0 + 0.14) / 0.16), landed = a - J1, joy = ease((landed - 0.7) / 0.3);
      // (the tuna under his weight: down as he lands on it, its tail going hard; a flick at each pull)
      const dip = 0.24 * sway(landed, 8.5, 3.4) + 0.06 * sway(a - J0 + 0.14, 10, 5), kickT = bump(landed / 0.5) + 0.5 * surge + 0.6 * bump((a - J0 + 0.2) / 0.3);
      const { c, pitch, knot } = swimming(t, RIDE1, TO, 20, T.drag, { brow: 1, smile: -1, look: [-1, 0.5], flare: 0.8, wide: 0.2 + 0.7 * bump(landed / 0.35), amp: 0.11 + 0.12 * kickT }, dip);
      const yawTo = Math.atan2(TO.x, TO.z), tailAt = c.clone().sub(TO.clone().multiplyScalar(1.9));
      // (its second back fin lies down as he comes aboard, as a tuna's does into its groove: he lands and stands where it was)
      tuna.g.children[2].scale.y = 1 - 0.96 * ease((a - J0 + 0.3) / 0.25);
      // dragged: on his front in the water, a third of him under, bouncing off it, never the same bounce twice
      const skim = Math.abs(Math.sin(a * 10 + n1(a * 3, 4) * 1.2)) * (0.1 + 0.05 * n1(a * 2, 5)), behind = mix(2.5, 0.3, haul);
      // (up the rope he comes out to its near side: a body's width clear of its tail, which would go through him, and of its flank)
      const inWater = tailAt.clone().sub(TO.clone().multiplyScalar(Math.max(behind, 0.55))).add(sideOf(TO).multiplyScalar(1.05 * ease(haul * 1.15))).setY(-0.02 + skim * (1 - 0.6 * haul) + 0.12 * haul - 0.05 * surge);
      // (something to push off: he gets his boots up onto its tail stalk, in front of the fin, and gathers there)
      const gather = ease((a - J0 + 0.24) / 0.16), stalk = tuna.g.localToWorld(V(-0.6, tuna.radAt(-0.6) * 0.96, 0.03)), drag = inWater.clone().lerp(stalk, gather);
      // onto its back: where his feet come down, and the arc there. He turns upright all the way through the air.
      // (he lands at the back of it, behind its fin, and steps up to where he rides as he finds his feet)
      const step = ease((landed - 0.14) / 0.45), feetUp = tuna.g.localToWorld(V(mix(-0.5, -0.2, step), tuna.radAt(mix(-0.5, -0.2, step)) * 0.96, 0)), arc = Math.sin(jump * Math.PI) * 0.26, tuck = bump(jump);
      const feet = drag.clone().lerp(feetUp, on).add(V(0, arc, 0));
      // (the landing: a deep squat for two frames, up out of it, and a rock forward, back, and still)
      const squat = landed < 0 ? 1 : landed < 0.07 ? mix(1.1, 0.7, landed / 0.07) : landed < 0.14 ? 0.7 : mix(0.7, 1, EASE.settle((landed - 0.14) / 0.34));
      const sq = a < J0 - 0.24 ? 1 + 0.07 * surge : a < J0 ? 1 - 0.24 * gather * (1 - 0.5 * clamp((a - J0 + 0.03) / 0.03)) : a < J1 ? 1 + 0.12 * Math.sin(jump * Math.PI) : squat * (1 + 0.03 * joy * Math.sin(a * 9));
      const rock = landed > 0 ? Math.exp(-3.2 * landed) * Math.cos(landed * 10.5) : 0, wave = joy * (2.3 + Math.sin(a * 11) * 0.55);
      const kick = Math.sin(a * 19) * 0.7 * (1 - jump) * (1 - 0.6 * haul) * (1 - gather);
      chef({ feet, yaw: yawTo + n1(a * 2.2, 8) * 0.15 * (1 - on), lean: mix(mix(1.18 - skim * 0.6 - 0.22 * surge, 0.75, gather), -0.26 + pitch * 0.6, ease(jump * 1.05)) + 0.55 * rock + 0.06 * joy * Math.sin(a * 5.5), roll: n1(a * 4.5, 6) * 0.26 * (1 - on) * (1 - gather) + 0.14 * rock * Math.sin(landed * 7) + Math.sin(t * 5.2) * 0.08 * joy,
        legs: [mix(0.3 + kick, 0.4 + pitch - 0.3 * rock, on) - 1.0 * tuck, mix(0.3 - kick, 0.16 + pitch - 0.3 * rock, on) - 0.75 * tuck], sq,
        arms: [[mix(-2.85 + 0.55 * surge - 0.25 * reach, -0.95 + 1.3 * rock, on) - 0.5 * tuck, 0.05 + 1.1 * Math.max(0, rock) + 0.5 * Math.max(0, -rock)], [mix(-2.85 - 0.45 * surge - 0.2 * reach, -0.95 - 1.1 * rock, on) * (1 - joy) - 0.3 * tuck, 0.05 + (0.4 * Math.max(0, rock) + 1.0 * Math.max(0, -rock)) * (1 - joy) + wave]],
        f: joy > 0.5 ? { eyes: 'happy', brow: [0.8, 0], mouth: 'grin', open: 1.3 } : landed > 0 ? { eyes: 'big', brow: [1.3, -0.6], mouth: 'o', open: 1.4 } : jump > 0 ? { eyes: 'big', brow: [1.0, 0.4], mouth: 'o', open: 1.0 } : haul > 0.03 ? { eyes: 'dot', brow: [0.2, 1.2], mouth: 'frown' } : { eyes: 'big', brow: [1.5, -0.9], mouth: 'o', open: 2.0 } });
      P.updateMatrixWorld(true);
      const h = joy > 0.5 ? hand(0) : hand(0).lerp(hand(1), 0.5);
      hung(h, knot, 0.05 + 0.12 * (1 - haul) * (1 - Math.min(1, surge)) + 0.1 * on, 0);
      // (his own wake while he's in the water)
      if (gather < 0.5) { wash2.visible = true; wash2.position.copy(inWater).setY(0.14).sub(TO.clone().multiplyScalar(0.25)); wash2.rotation.y = heading(TO); wash2.scale.set(0.95, 1, 0.42); }
      // the camera: first behind its tail and to one side, on HIM (he's the one doing something); as he goes up onto its
      // back it travels forward along the fish to a three-quarter view from ahead, where its face and his joy both are
      const fwd = ease((a - 1.3) / 0.95), side = sideOf(TO);
      const tailCam = inWater.clone().sub(TO.clone().multiplyScalar(0.9)).add(side.clone().multiplyScalar(3.3)).setY(0.85), frontCam = c.clone().add(TO.clone().multiplyScalar(3.0)).add(side.clone().multiplyScalar(3.1)).setY(1.55); // (high enough to see his feet on its back)
      const tailLook = inWater.clone().add(TO.clone().multiplyScalar(1.3)).setY(0.45), frontLook = c.clone().sub(TO.clone().multiplyScalar(0.5)).setY(1.15);
      shot = operate({ pos: tailCam.lerp(frontCam, fwd), look: tailLook.lerp(frontLook, fwd).add(V(0, 0.4 * bump(jump * 1.1), 0)), fov: mix(40, 42, fwd) + 3 * bump(jump), fogNear: 30, fogFar: 95 }, t, 1.8, 13); // (up and a touch wider for the jump: his hat stays in the picture)
      jolt(shot, t, T.drag + J1, 0.06);
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.07; FX.splashFx(c.clone().add(TO.clone().multiplyScalar(1.0)), 0.1); FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.6)), 0.1); if (jump < 0.2 && skim < 0.03) FX.splashFx(drag.clone().sub(TO.clone().multiplyScalar(0.25)).setY(0.1), 0.12); }
      for (let n = 0; n < 3; n++) once('upFx' + n, T.drag + J0 - 0.24 + n * 0.03, t, () => FX.splashFx(inWater.clone().add(V(n * 0.15, 0, 0)), 0.1 + n * 0.15));
      for (let n = 0; n < 3; n++) once('heaveFx' + n, T.drag + J0 + n * 0.03, t, () => FX.splashFx(stalk.clone().add(sideOf(TO).multiplyScalar(n - 1)), 0.1 + n * 0.1));
      for (let n = 0; n < 6; n++) once('mountFx' + n, T.drag + J1 + n * 0.025, t, () => FX.splashFx(c.clone().add(sideOf(TO).multiplyScalar(n % 2 ? 0.9 : -0.85)).sub(TO.clone().multiplyScalar(0.3 + (n >> 1) * 0.6)), 0.1 + (n % 3) * 0.15));
    } else {
      // ----- from behind: the market comes into sight, small and far off across the water, and the picture fades on it -----
      const TO = R2, a = t - T.far;
      const { c, pitch, knot } = swimming(t, DOCKR, TO, 13, T.far, { brow: 1, smile: -1 });
      tuna.g.children[2].scale.y = 0.04;
      chef({ feet: deck(), yaw: Math.atan2(TO.x, TO.z), lean: -0.28 + pitch * 0.6, roll: Math.sin(t * 5.2) * 0.1, legs: [0.38 + pitch, 0.18 + pitch],
        arms: [[-0.95, 0.05], [0, 2.5 + Math.sin(a * 16) * 0.35]], f: { eyes: 'happy', mouth: 'grin' } });
      P.updateMatrixWorld(true);
      const h = hand(0);
      lay([h, h.clone().lerp(knot, 0.5).add(V(0, -0.06, 0)), knot]);
      const toDock = DOCK.clone().sub(c).setY(0).normalize(), camAt = c.clone().sub(toDock.clone().multiplyScalar(11.5)).add(sideOf(toDock).multiplyScalar(-0.35)).setY(3.4);
      shot = operate({ pos: camAt, look: c.clone().add(toDock.multiplyScalar(18)).setY(-0.1), fov: 27, fogNear: 55, fogFar: 150 }, t, 1.2, 14);
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.1; FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.4)), 0.1); }
      K.fade(ease((a - 1.02) / 0.55));
      low = false;
    }
    air(t, low);
    K.cam = shot;
  }
  // (the chef and the props are posed once the game's tick has had its say: its own walk cycle and blade)
  let now = { i: 0, fps: 30 };
  K.pose = () => frame(now.i, now.fps);
  K.after = cam => {
    const t = now.i / now.fps, w = innerWidth, h = innerHeight;
    for (const p of pills) {
      if (!p.at || t < p.t0 || t >= p.t1) { p.el.style.transform = 'scale(0)'; continue; }
      const s = p.at.clone().project(cam), k = clamp((t - p.t0) / 0.14);
      p.el.style.transform = `translate(${(s.x + 1) / 2 * w}px, ${Math.max(52, (1 - s.y) / 2 * h)}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5})`;
    }
  };
  window.cine = {
    len: T.end,
    setup() { player.held = true; },
    frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(F.x + 1.5, 0.75, F.z + 2.5), look: F.clone(), fov: 36 }; },
  };
})();
