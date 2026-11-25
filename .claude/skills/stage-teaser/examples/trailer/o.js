// Take O, the opening (?stage=1 as a new game, --init newgame.js; hero-tuna.js before this): the chef wakes on an ice
// floe in the middle of the sea, looks about, "!"; three zoom-outs on three thuds show nothing but water; through his
// eyes, a tuna jumps; he ropes it and rides it; the market comes into sight far off and the picture fades; the cleaver
// comes down. Everything on a 92 BPM grid (the market tune's tempo), a cut or a hit on a beat.
// None of these moves are in the game: the chef is posed here, with a face made of the game's own face parts
// (characters.ts: round eyes, brows, the "o", the grin), and the tuna is the clip's own (hero-tuna.js).
(async () => {
  while (!window.K || !window.HeroTuna || !window.Acting) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, lerp, T3 } = K;
  const { Group, Mesh, MeshLambertMaterial, TorusGeometry, TubeGeometry, CatmullRomCurve3, SphereGeometry, BoxGeometry, CircleGeometry, DoubleSide } = T3;
  const { scene } = K.R;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const { FLOES } = await window.__mod('props.ts');
  const { foamRing, seaGeometry } = await window.__mod('sea.ts');
  const FX = await window.__mod('fx.ts'), SFX = await window.__mod('sfx.ts'), A = await window.__mod('audio.ts');
  const ST = await window.__mod('stations.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  /** 0 → a little past 1 → 1: things that land with a bounce. */
  const back = k => { k = clamp(k); const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  const BEAT = 60 / 92, at = n => n * BEAT;
  const T = { sit: 1.0, peek: at(2.5), up: at(3.6), bang: at(5), hit1: at(6), hit2: at(7), hit3: at(8), pov: at(12), react: at(14), idea: at(14.7),
    over: at(15.5), thrown: at(16), caught: at(16.5), taut: at(17), ride2: at(21), end: at(23) };

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
    const m = new Mesh(g, seaMat); m.rotation.set(-Math.PI / 2, 0, 0.47); m.position.set(F.x, 0.085, F.z); m.receiveShadow = true;
    return m;
  })();
  scene.add(openSea);
  const floe = new Group();
  const ice = FLOES[0].mesh(false); ice.scale.set(2.3, 1.25, 1.9);
  const ring = foamRing(2.3); ring.position.y = 0.03;
  floe.add(ice, ring); floe.position.copy(F); floe.position.y = 0.105; floe.rotation.y = 0.6;
  scene.add(floe);
  {
    let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2, d = 26 + rnd() * rnd() * 190, x = F.x + Math.cos(a) * d, z = F.z + Math.sin(a) * d;
      // (clear of the way the tuna takes him: south-east of the floe)
      if (x > F.x && z > F.z - 6 && Math.abs((x - F.x) * 0.8 - (z - F.z) * 0.6) < 9) continue;
      const m = FLOES[i % 3].mesh(false), s = 0.5 + rnd() * 1.9;
      m.scale.set(s, 1.1, s * (0.7 + rnd() * 0.5)); m.position.set(x, 0.1, z); m.rotation.y = rnd() * 6;
      scene.add(m);
    }
  }
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
  // his face, his pose, soles under his boots, and a castaway's coat, faded, filthy and torn (acting.js)
  const setFace = ACT.face(P), chef = o => ACT.pose(P, o, setFace);
  ACT.soles(P); ACT.castaway(P);
  /** His hand, in the world (the end of his arm, 0.42 down it). */
  const hand = i => P.arms[i].localToWorld(V(0, -0.42, 0));
  const headAt = () => P.body.localToWorld(V(0, 1.03, 0.05));

  // ---------- sound: through the game's own engine, so it lands on the frame ----------
  const said = new Set();
  const once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const thud = big => { A.tone({ f: 95, f2: 34, d: 0.55, v: 0.75 + big * 0.25 }); A.noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.5 + big * 0.2 }); };
  const whoosh = (d, v = 0.3, f = 500, f2 = 2200) => A.noise({ f, f2, q: 0.9, d, a: d * 0.35, v });
  const blip = (f, f2, v = 0.4, t = 0, d = 0.12) => A.tone({ f, f2, d, t, type: 'triangle', v });

  // ---------- the shots ----------
  const yaw0 = 0.45; // he faces the cameras, three quarters on
  const OUT = V(0.12, 0, 0.99).normalize(); // the way the cameras pull back: south, looking north out to sea
  const wide = (d, elev) => F.clone().add(OUT.clone().multiplyScalar(d * Math.cos(elev))).add(V(0, d * Math.sin(elev), 0));
  /** A cut that lands: starts a touch closer and settles, with a few frames of shake. */
  function hit(t, t0, pos, look, fov = 40) {
    const k = easeOut((t - t0) / 0.3), sh = Math.max(0, 1 - (t - t0) / 0.2) * 0.012 * pos.distanceTo(look);
    const p = look.clone().lerp(pos, 0.93 + 0.07 * k);
    p.add(V(Math.sin(t * 91) * sh, Math.cos(t * 77) * sh, 0));
    return { pos: p, look, fov };
  }
  // the leap he sees, and the one he ropes: where the tuna breaks the water, and its arc
  const LEAP1 = F.clone().add(V(-7.5, 0, -6)), LEAP2 = F.clone().add(V(1.2, 0, -6.5)), DIR1 = V(0.86, 0, -0.5).normalize(), DIR2 = V(-0.98, 0, 0.2).normalize();
  function leap(c, dir, k, len = 4.2, high = 2.3) {
    // k 0..1 along the arc; under the water before and after
    const x = (k - 0.5) * len, y = high * 4 * k * (1 - k) - 0.3;
    tuna.g.position.copy(c).add(dir.clone().multiplyScalar(x)).setY(y);
    tuna.g.rotation.set(0, heading(dir), Math.atan2(high * 4 * (1 - 2 * k), len) * 0.9);
    tuna.g.visible = k > 0 && k < 1;
  }
  /** The ride: the tuna going `TO` from `from`, and the loop round it. Returns where it is, and where the rope ties on. */
  const RIDE1 = F.clone().add(V(8, 0, 5)), RIDE2 = DOCK.clone().sub(R2.clone().multiplyScalar(80));
  function swimming(t, from, TO, speed, t0, mood) {
    const s = (t - t0) * speed, c = from.clone().add(TO.clone().multiplyScalar(s));
    const bob = Math.sin(t * 9) * 0.1, pitch = Math.cos(t * 9) * 0.1;
    tuna.g.visible = true; tuna.g.scale.setScalar(2.3);
    tuna.g.position.copy(c).setY(0.34 + bob);
    tuna.g.rotation.set(0, heading(TO), pitch);
    fish({ swim: t * 30, amp: 0.11, ...mood });
    waterline(c, TO);
    return { c, pitch, knot: collar(TO) };
  }
  /** Where his feet go on its back. */
  const deck = () => tuna.g.localToWorld(V(-0.2, tuna.radAt(-0.2) * 0.96, 0));
  let sprayT = 0;

  function frame(i, fps) {
    const t = i / fps;
    // ---------- sound cues ----------
    once('blinkA', 0.62, t, () => blip(700, 760, 0.08, 0, 0.05)); once('sitUp', T.sit, t, () => whoosh(0.3, 0.12, 300, 900));
    once('bang', T.bang, t, () => { blip(880, 1320, 0.45); blip(1320, 1320, 0.4, 0.1, 0.22); });
    once('h1', T.hit1, t, () => thud(0)); once('h2', T.hit2, t, () => thud(0.5)); once('h3', T.hit3, t, () => thud(1));
    once('s1', T.pov + 0.35, t, () => SFX.splash(P.position)); once('s2', T.pov + 1.2, t, () => SFX.splash(P.position));
    once('idea', T.idea, t, () => { blip(660, 660, 0.3, 0, 0.09); blip(990, 990, 0.35, 0.09, 0.2); });
    for (let n = 0; n < 6; n++) once('w' + n, T.idea + 0.4 + n * 0.16, t, () => whoosh(0.15, 0.16, 380, 900));
    once('throw', T.thrown, t, () => whoosh(0.4, 0.3)); once('s3', T.thrown - 0.2, t, () => SFX.splash(P.position));
    once('gotcha', T.caught + 0.16, t, () => { blip(1100, 1500, 0.4, 0, 0.1); A.tone({ f: 230, f2: 170, d: 0.16, type: 'triangle', v: 0.35 }); });
    once('taut', T.taut - 0.04, t, () => { A.tone({ f: 250, f2: 150, d: 0.2, type: 'triangle', v: 0.45 }); whoosh(2.7, 0.3, 700, 1500); SFX.splash(P.position); });
    once('mount', T.taut + 1.9, t, () => thud(0.1));
    once('wind', T.hit3 + 0.3, t, () => { A.noise({ f: 380, f2: 760, q: 0.5, d: T.pov - T.hit3 - 0.3, a: 1.3, v: 0.09 }); A.tone({ f: 52, f2: 46, d: T.pov - T.hit3 - 0.4, a: 1.2, v: 0.1 }); });

    // ---------- the picture ----------
    let shot;
    // (he's in a scene: he doesn't fish from the pad, pick fillets up or drop them, wherever it puts him)
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    rope.visible = false; loop.visible = false; wash.visible = false;
    for (const h of hills) h.visible = false;
    K.fade(0); K.letterbox(0);
    pills[0].at = pills[1].at = null;
    tuna.g.scale.setScalar(2.3);

    if (t < T.pov) {
      // ----- waking: asleep, a flutter of the eyes, up on his elbows... where is this? -----
      const shiver = Math.sin(t * 70) * 0.006;
      if (t < T.hit1) {
        const sitK = back((t - T.sit) / 0.5), sit = clamp(sitK), stand = ease((t - T.up) / 0.3), hop = Math.sin(clamp((t - T.up) / 0.42) * Math.PI) * 0.26;
        const landed = clamp((t - T.up - 0.42) / 0.16), land = t > T.up + 0.42 ? 1 - 0.14 * Math.sin(landed * Math.PI) : 1;
        const breath = t < 0.55 ? 1 + Math.sin(t * 5.5) * 0.04 : 1;
        // looking about, sitting: left, right (his eyes get there first)
        const lookT = t - T.peek, eyeX = lookT < 0 ? 0 : lookT < 0.36 ? -ease(lookT / 0.12) : mix(-1, 1, ease((lookT - 0.36) / 0.12));
        const bodyLook = lookT < 0 ? 0 : lookT < 0.36 ? 0.45 * ease((lookT - 0.06) / 0.2) : mix(0.45, -0.5, ease((lookT - 0.42) / 0.22));
        // on his feet: a turn right round, looking for anything at all
        const upT = t - T.up - 0.3, spin = upT > 0 && t < T.bang ? Math.sin(clamp(upT / (T.bang - T.up - 0.3)) * Math.PI * 2) * 1.5 : 0;
        const gasp = t >= T.bang, gk = (t - T.bang), jump = gasp ? Math.sin(clamp(gk / 0.3) * Math.PI) * 0.2 : 0;
        const f = t < 0.55 ? { eyes: 'shut' } : t < 0.62 ? { eyes: 'dot' } : t < 0.72 ? { eyes: 'shut' } : t < 0.82 ? { eyes: 'dot' } : t < 0.9 ? { eyes: 'shut' }
          : t < T.sit + 0.5 ? { eyes: 'dot', brow: [0.6, -0.3], mouth: t > T.sit + 0.1 ? 'o' : 'none', open: 0.7 }
            : t < T.up ? { eyes: 'big', look: [eyeX, 0.1], brow: [0.8, -0.8], mouth: lookT > 0.4 ? 'frown' : 'none' }
              : !gasp ? { eyes: 'big', look: [Math.sign(spin) * 0.8, 0], brow: [0.9, -0.9], mouth: 'frown' }
                : { eyes: 'big', look: [0, 0.2], brow: [1.6, -0.4], mouth: 'o', open: 1.9 };
        chef({
          hip: F.clone().add(V(shiver * (t > T.sit ? 1 : 0), 0, 0)).setY(ICE_Y + mix(mix(0.2, 0.13, sit), 0.3, stand) + hop + jump),
          yaw: mix(1.45, mix(0.3, yaw0, stand), easeIO((t - 0.95) / 0.6)) + bodyLook * (1 - stand) + spin,
          back: (1 - sitK) * (Math.PI / 2) + (t < T.sit ? Math.sin(t * 2.2) * 0.02 : 0),
          legs: [-(Math.PI / 2) * sit * (1 - stand), -(Math.PI / 2) * sit * (1 - stand) * 0.92],
          arms: gasp ? [[0, 0.95 - 0.25 * clamp(gk / 0.5)], [0, 0.95 - 0.25 * clamp(gk / 0.5)]]
            : [[mix(0, 0.55, sit) * (1 - stand), mix(1.15, 0.22, sit) + Math.abs(spin) * 0.25], [mix(0, 0.55, sit) * (1 - stand), mix(1.0, 0.22, sit) + Math.abs(spin) * 0.25]],
          sq: breath * land * (gasp ? 1 + 0.12 * Math.sin(clamp(gk / 0.3) * Math.PI) : 1), f,
        });
        P.updateMatrixWorld(true);
        if (t < T.peek) shot = K.path([{ t: 0, pos: [F.x + 1.5, 0.75, F.z + 2.5], look: [F.x - 0.1, 0.42, F.z - 0.25], fov: 36 },
          { t: T.peek, pos: [F.x + 1.45, 0.85, F.z + 2.4], look: [F.x - 0.05, 0.6, F.z - 0.1], fov: 36 }], t, ease);
        else if (t < T.up) { const h = headAt(); shot = { pos: V(F.x + 0.5, h.y + 0.02, F.z + 1.55 - (t - T.peek) * 0.12), look: V(F.x, h.y - 0.02, F.z + 0.05), fov: 30 }; }
        else shot = K.path([{ t: T.up, pos: [F.x + 1.75, 1.2, F.z + 3.4], look: [F.x, 1.0, F.z], fov: 36 }, { t: T.hit1, pos: [F.x + 1.6, 1.2, F.z + 3.1], look: [F.x, 1.05, F.z], fov: 36 }], t, ease);
        if (gasp) pills[0].at = P.position.clone().add(V(0, 1.68, 0));
      } else {
        // ----- three thuds: further, further, nothing but sea. He runs out of ideas a size at a time. -----
        const a = t - T.hit1, b = t - T.hit2, c = t - T.hit3;
        if (t < T.hit2) chef({ hip: F.clone().setY(ICE_Y + 0.3 + Math.abs(Math.sin(a * 16)) * 0.05), yaw: yaw0 + a * 9.6, arms: [[0, 1.2 + Math.sin(a * 30) * 0.3], [0, 1.2 - Math.sin(a * 30) * 0.3]], f: { eyes: 'big', brow: [1.2, -0.8], mouth: 'o', open: 1.5 } });
        else if (t < T.hit3) chef({ hip: F.clone().setY(ICE_Y + 0.3 + Math.abs(Math.sin(b * 15)) * 0.3), yaw: yaw0, arms: [[0, 2.5 + Math.sin(b * 22) * 0.35], [0, 2.5 - Math.sin(b * 22) * 0.35]], f: { eyes: 'big', mouth: 'o', open: 1.6 } });
        else { const down = ease((c - 0.9) / 0.5); chef({ hip: F.clone().setY(ICE_Y + mix(0.3, 0.13, down)), yaw: yaw0, lean: 0.2 * ease(c / 0.6), legs: [-(Math.PI / 2) * down, -(Math.PI / 2) * down * 0.92],
          arms: [[0.4 * down, mix(1.6, 0.1, ease(c / 0.5))], [0.4 * down, mix(1.6, 0.1, ease(c / 0.5))]], f: { eyes: 'dot', brow: [0.4, -1], mouth: 'frown' } }); }
        if (t < T.hit2) shot = { ...hit(t, T.hit1, wide(8, 0.3), F.clone().setY(0.6)), fogNear: 40, fogFar: 120 };
        else if (t < T.hit3) shot = { ...hit(t, T.hit2, wide(30, 0.75), F.clone()), fogNear: 80, fogFar: 200 };
        else { const pull = ease((t - T.hit3 - 0.25) / (T.pov - T.hit3 - 0.25)); shot = { ...hit(t, T.hit3, wide(mix(115, 185, pull), mix(1.36, 1.44, pull)), F.clone()), fogNear: 400, fogFar: 1200, far: 700 }; }
      }
    } else if (t < T.react) {
      // ----- through his eyes: a blink, the empty water, breathing... and a tuna going over, happy as anything -----
      const k = (t - T.pov - 0.35) / 0.85;
      leap(LEAP1, DIR1, k);
      fish({ swim: t * 22, amp: 0.09, smile: 1, flare: 0.5 + 0.4 * Math.sin(k * Math.PI), lid: 0.25 });
      once('f1', T.pov + 0.35, t, () => FX.splashFx(LEAP1.clone().sub(DIR1.clone().multiplyScalar(2.1)))); once('f2', T.pov + 1.2, t, () => FX.splashFx(LEAP1.clone().add(DIR1.clone().multiplyScalar(2.1))));
      const eye = F.clone().setY(ICE_Y + 1.12), seen = clamp((t - T.pov - 0.42) / 0.14), follow = ease((t - T.pov - 0.4) / 0.3);
      const aim = F.clone().add(V(-9, 0.4, -4)).lerp(tuna.g.visible ? tuna.g.position.clone() : LEAP1.clone().add(DIR1.clone().multiplyScalar(2.1)).setY(0.2), follow * 0.9);
      aim.add(V(Math.sin(t * 13) * 0.16 + Math.sin(t * 31) * 0.07, Math.sin(t * 17) * 0.12, Math.cos(t * 11) * 0.14));
      eye.add(V(0, Math.sin(t * 6) * 0.025, 0));
      // (his eyes open on it, and jump in on the fish when he sees it)
      shot = { pos: eye, look: aim, fov: mix(54, 40, back(seen)), roll: Math.sin(t * 7) * 0.012, fogNear: 22, fogFar: 85 };
      const bk = (t - T.pov) / 0.3, lidK = bk < 1 ? 1 - ease(bk) : 0;
      K.letterbox(innerHeight / 2 * lidK);
      P.visible = false;
    } else if (t < T.taut) {
      // ----- an idea: his face, then the rope spun overhead, thrown, and round the tuna as it jumps again -----
      const k = (t - T.thrown + 0.33) / 0.95, hang = t >= T.caught;
      leap(LEAP2, DIR2, hang ? mix(0.47, 0.56, (t - T.caught) / (T.taut - T.caught)) : k, 3.6, 2.0);
      const got = clamp((t - T.caught - 0.14) / 0.08);
      fish({ swim: t * (hang ? 44 : 22), amp: hang ? 0.05 + 0.08 * got : 0.09, smile: mix(1, -0.6, got), lid: 0.25 * (1 - got), wide: back(got), mouth: got * 0.9,
        flare: mix(0.5, 1, got), look: [mix(0, -0.9, got), 0.3 * got], brow: -got });
      once('f3', T.thrown - 0.33, t, () => FX.splashFx(LEAP2.clone().sub(DIR2.clone().multiplyScalar(1.6))));
      const twirlT = t - T.idea - 0.3, twirling = twirlT > 0, spin = Math.max(0, twirlT) * 20, thrown = clamp((t - T.thrown) / 0.3), sw = ease(thrown);
      const seaward = Math.atan2(LEAP2.x - F.x, LEAP2.z - F.z), idea = t >= T.idea, ik = t - T.idea;
      // his face: wide-eyed after the fish, then the idea lands and he narrows them
      const f = !idea ? { eyes: 'big', look: [mix(-0.6, 0.9, ease((t - T.react) / 0.4)), mix(0.5, -0.4, ease((t - T.react) / 0.4))], brow: [1.2, -0.3], mouth: 'o', open: 1.2 }
        : thrown > 0 ? { eyes: 'dot', brow: [0, 1.2], mouth: 'o', open: 1.4 } : { eyes: 'dot', brow: [-0.2, 1.1], mouth: ik > 0.12 ? 'grin' : 'smile', open: 0.9 };
      const crouch = idea && ik < 0.3 ? 1 - 0.16 * Math.sin(clamp(ik / 0.3) * Math.PI) : 1;
      chef({ hip: F.clone().setY(ICE_Y + 0.3 + (twirling && !thrown ? Math.abs(Math.sin(spin * 0.5)) * 0.04 : 0)), yaw: seaward + (twirling ? Math.sin(spin) * 0.07 : 0),
        lean: mix(twirling ? -0.14 : 0, 0.36, sw), roll: twirling && !thrown ? Math.sin(spin) * 0.06 : 0, legs: twirling ? [0.28, -0.28] : [0, 0], sq: crouch,
        arms: [[0, twirling ? 0.5 : 0.1], [mix(0, -1.0, sw), mix(twirling ? 2.75 + Math.sin(spin) * 0.14 : 0.1, 0.3, sw)]], f });
      P.updateMatrixWorld(true);
      const h = hand(1);
      const over = h.clone().add(V(Math.cos(spin) * 0.2, 0.5, Math.sin(spin) * 0.2));
      tuna.g.updateMatrixWorld(true);
      const tunaAt = tuna.g.localToWorld(V(0.3, 0, 0));
      const fly = over.clone().lerp(tunaAt, easeOut(thrown)).add(V(0, Math.sin(thrown * Math.PI) * 1.2, 0));
      let knot = null;
      if (twirling) {
        const on = t >= T.caught + 0.14;
        if (on) knot = collar(DIR2);
        else {
          loop.visible = true; loop.position.copy(thrown > 0 ? fly : over);
          const drop = clamp((t - T.caught) / 0.14);
          loop.scale.setScalar(mix(0.5, 0.62, thrown));
          if (hang) loop.position.copy(tunaAt).add(V(0, mix(1.3, 0, drop * drop), 0));
          loop.rotation.set(mix(Math.PI / 2 - 0.5 + 0.15 * Math.sin(spin), hang ? Math.PI / 2 : 0, ease(thrown)), mix(0, heading(DIR2) + Math.PI / 2, ease(thrown)), mix(spin, 0, ease(thrown)));
        }
        const end = knot ?? loop.position.clone();
        lay([h, h.clone().lerp(end, 0.5).add(V(0, 0.25 - 0.5 * thrown, 0)), end]);
      }
      if (t < T.over) {
        // from in front of him, the sea he's looking at behind the camera
        const d = V(Math.sin(seaward), 0, Math.cos(seaward)), camAt = F.clone().add(d.clone().multiplyScalar(2.9)).add(sideOf(d).multiplyScalar(-1.1));
        shot = K.path([{ t: T.react, pos: [camAt.x, 1.25, camAt.z], look: [F.x, 1.12, F.z], fov: 30 }, { t: T.idea, pos: [camAt.x, 1.25, camAt.z], look: [F.x, 1.12, F.z], fov: 28 },
          { t: T.over, pos: [camAt.x - d.x * 0.3, 1.45, camAt.z - d.z * 0.3], look: [F.x, 1.5, F.z], fov: 40 }], t, ease);
        shot.fogNear = 30; shot.fogFar = 110;
      } else if (!hang) {
        // over his shoulder: the throw
        const backAt = F.clone().add(V(-1.5, 0, 3.0));
        shot = K.path([{ t: T.over, pos: [backAt.x, 2.5, backAt.z + 0.3], look: [F.x + 0.5, 1.5, F.z - 2.5], fov: 44 },
          { t: T.caught, pos: [backAt.x + 0.1, 2.35, backAt.z - 0.2], look: [F.x + 0.8, 1.45, F.z - 4], fov: 44 }], t, ease);
        shot.fogNear = 26; shot.fogFar = 90;
      } else {
        // the tuna, hung in the air at the top of its jump as the loop drops over its nose: "!"
        const c = tuna.g.position.clone(), sh = got > 0 && got < 1 ? 0.03 : 0;
        shot = { pos: c.clone().add(V(-1.9 + Math.sin(t * 80) * sh, 0.35, 3.7)), look: c.clone().add(V(-0.25, 0.1, 0)), fov: 40, fogNear: 26, fogFar: 90 };
        if (got > 0) pills[1].at = tuna.g.localToWorld(V(0.45, 0.52, 0));
        P.visible = false;
      }
    } else if (t < T.ride2) {
      // ----- the ride, alongside: dragged along behind, he hauls himself up the rope and onto its back; then the time of his life -----
      const TO = R1, a = t - T.taut, joy = ease((a - 2.0) / 0.3);
      const { c, pitch, knot } = swimming(t, RIDE1, TO, 20, T.taut, { brow: 1, smile: -1, look: [-1, 0.5], flare: 0.8, wide: 0.2 });
      // (skimming 1.6 m behind its tail; up the rope to it by 1.2 s; onto its back by 1.9 s, in one arc)
      const haul = easeIO((a - 0.45) / 0.75), up = easeIO((a - 1.15) / 0.75), yawTo = Math.atan2(TO.x, TO.z);
      const feet = deck(), tailAt = c.clone().sub(TO.clone().multiplyScalar(1.9));
      const drag = tailAt.clone().sub(TO.clone().multiplyScalar(mix(1.6, 0.1, haul))).setY(0.5 + Math.sin(a * 11) * 0.06 * (1 - up));
      const arc = Math.sin(up * Math.PI) * 0.35, land = a > 1.9 && a < 2.15 ? 1 - 0.1 * Math.sin((a - 1.9) / 0.25 * Math.PI) : 1;
      const wave = joy * (2.5 + Math.sin(a * 12) * 0.3), kick = Math.sin(a * 13) * 0.3 * (1 - up);
      chef({ feet: drag.lerp(feet, up).add(V(0, arc, 0)), yaw: yawTo, lean: mix(1.3, -0.28 + pitch * 0.6, up), roll: Math.sin(t * 5.2) * 0.08 * up,
        legs: [mix(0.3 + kick, 0.38 + pitch, up), mix(0.3 - kick, 0.18 + pitch, up)], sq: land,
        arms: [[mix(-2.85, -0.95, up), 0.05], [mix(-2.85, -0.95, up) * (1 - joy), 0.05 + wave]],
        f: joy > 0.5 ? { eyes: 'happy', brow: [0.8, 0], mouth: 'grin', open: 1.3 } : up > 0.5 ? { eyes: 'big', brow: [1.2, -0.6], mouth: 'o', open: 1.2 } : { eyes: 'big', brow: [1.5, -0.9], mouth: 'o', open: 2.0 } });
      P.updateMatrixWorld(true);
      const h = joy > 0.5 ? hand(0) : hand(0).lerp(hand(1), 0.5);
      lay([h, h.clone().lerp(knot, 0.5).add(V(0, -0.06, 0)), knot]);
      const camAt = c.clone().add(TO.clone().multiplyScalar(3.0)).add(sideOf(TO).multiplyScalar(2.9)).setY(1.0 + Math.sin(t * 23) * 0.03);
      shot = { pos: camAt, look: c.clone().sub(TO.clone().multiplyScalar(0.9 * (1 - up) + 0.25)).setY(1.1), fov: mix(52, 42, up), fogNear: 30, fogFar: 95 };
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.07; FX.splashFx(c.clone().add(TO.clone().multiplyScalar(1.0)), 0.1); FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.6)), 0.1); if (up < 0.5) FX.splashFx(drag, 0.1); }
      once('sp1', T.taut + 0.5, t, () => SFX.splash(P.position)); once('sp2', T.taut + 1.2, t, () => SFX.splash(P.position));
      once('whee', T.taut + 2.0, t, () => { blip(520, 1040, 0.25, 0, 0.25); });
    } else {
      // ----- from behind: the market comes into sight, small and far off across the water, and the picture fades on it -----
      const TO = R2, a = t - T.ride2;
      const { c, pitch, knot } = swimming(t, RIDE2, TO, 13, T.ride2, { brow: 1, smile: -1 });
      chef({ feet: deck(), yaw: Math.atan2(TO.x, TO.z), lean: -0.28 + pitch * 0.6, roll: Math.sin(t * 5.2) * 0.1, legs: [0.38 + pitch, 0.18 + pitch],
        arms: [[-0.95, 0.05], [0, 2.5 + Math.sin(a * 16) * 0.35]], f: { eyes: 'happy', mouth: 'grin' } });
      P.updateMatrixWorld(true);
      const h = hand(0);
      lay([h, h.clone().lerp(knot, 0.5).add(V(0, -0.06, 0)), knot]);
      const camAt = c.clone().sub(TO.clone().multiplyScalar(6.2)).add(sideOf(TO).multiplyScalar(-1.7)).setY(2.9 + Math.sin(t * 5.2) * 0.04);
      shot = { pos: camAt, look: c.clone().add(TO.clone().multiplyScalar(30)).setY(0.6), fov: 36, roll: Math.sin(t * 5.2) * 0.012, fogNear: 55, fogFar: 150 };
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.1; FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.4)), 0.1); }
      once('sp3', T.ride2 + 0.3, t, () => SFX.splash(P.position));
      K.fade(ease((a - at(0.85)) / at(0.9)));

    }
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
      p.el.style.transform = `translate(${(s.x + 1) / 2 * w}px, ${(1 - s.y) / 2 * h}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5})`;
    }
  };
  window.cine = {
    len: T.end,
    setup() { player.held = true; },
    frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(F.x + 1.5, 0.75, F.z + 2.5), look: F.clone(), fov: 36 }; },
  };
})();
