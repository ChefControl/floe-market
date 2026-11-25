// Take O, the opening (?stage=1): the chef wakes on an ice floe in the middle of the sea, stands, "!"; three zoom-outs
// on three thuds show nothing but water; through his eyes, a tuna jumps; he ropes it and rides it to the pier; the
// cleaver comes down. Everything on a 92 BPM grid (the market tune's tempo), a cut or a hit on a beat.
// The chef's moves here (lying, sitting up, the lasso, the ride) aren't in the game: they're posed in this script only,
// from the game's own chef, tuna, floe, splashes and sounds.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, lerp, T3 } = K;
  const { Group, Mesh, MeshLambertMaterial, TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3 } = T3;
  const { scene } = K.R;
  const { player } = await window.__mod('player.ts');
  const { newFish } = await window.__mod('fishModel.ts');
  const { FLOES } = await window.__mod('props.ts');
  const { foamRing, seaGeometry } = await window.__mod('sea.ts');
  const FX = await window.__mod('fx.ts'), SFX = await window.__mod('sfx.ts'), A = await window.__mod('audio.ts');
  const ST = await window.__mod('stations.ts');

  const BEAT = 60 / 92, at = n => n * BEAT;
  // the beats: wake 0, "!" 3, thuds 4 5 6, his eyes 8, the rope 10, taut 12, ride 12–16, chop 16
  const T = { bang: at(3), hit1: at(4), hit2: at(5), hit3: at(6), pov: at(8), rope: at(10), thrown: at(11), taut: at(12), ride2: at(14), chop: at(16), end: at(18.5) };

  // ---------- the set ----------
  /** The floe, far out: the dock is behind every camera here. */
  const F = V(-90, 0, -110);
  /** The ride: across open water (R1), then in to the dock between the yacht and the pier (R2), and across each. */
  const DOCK = V(-3.4, 0, -8.6), R1 = V(0.6, 0, 0.8), R2 = V(0.2, 0, 0.98).normalize();
  const sideOf = d => V(-d.z, 0, d.x);
  // "nothing but water": the islands out in the bay (horizon.ts) are put away until he's on his way in
  const hills = scene.getObjectByName('horizon').children.filter(c => c.geometry?.type === 'ConeGeometry');
  // The bay's rolling sea stops 60 m out and a flat sheet carries on (horizon.ts): from high up its edge shows. So the
  // opening has a sea of its own over both, the game's own water (its material, its swell) in the deep colour all over.
  let seaMat = null;
  scene.traverse(m => { if (!seaMat && m.isMesh && m.material?.customProgramCacheKey?.() === 'sea') seaMat = m.material; });
  const openSea = (() => {
    const g = seaGeometry(420, 200), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, 0.99);
    const m = new Mesh(g, seaMat); m.rotation.x = -Math.PI / 2; m.position.set(F.x, 0.075, F.z); m.receiveShadow = true;
    return m;
  })();
  scene.add(openSea);
  const floe = new Group();
  const ice = FLOES[0].mesh(false); ice.scale.set(2.3, 1.25, 1.9);
  const ring = foamRing(2.3); ring.position.y = 0.03;
  floe.add(ice, ring); floe.position.copy(F); floe.position.y = 0.105; floe.rotation.y = 0.6;
  scene.add(floe);
  const ICE_Y = 0.23; // the top of the floe, where he lies and stands

  const tuna = newFish(); tuna.g.rotation.order = 'YZX'; tuna.g.scale.setScalar(2.3); tuna.g.visible = false;
  scene.add(tuna.g);
  const heading = d => Math.atan2(-d.z, d.x);
  const ropeMat = new MeshLambertMaterial({ color: 0xC9A66B });
  const rope = new Mesh(new TubeGeometry(new CatmullRomCurve3([V(0, 0, 0), V(0, 1, 0)]), 2, 0.02, 5), ropeMat); rope.visible = false; rope.frustumCulled = false;
  const loop = new Mesh(new TorusGeometry(1, 0.045, 6, 22), ropeMat); loop.visible = false; loop.rotation.order = 'YXZ';
  scene.add(rope, loop);
  function lay(points, r = 0.022) {
    rope.geometry.dispose();
    rope.geometry = new TubeGeometry(new CatmullRomCurve3(points), 18, r, 5);
    rope.visible = true;
  }

  // the "!" over his head: the game's own alert pill (index.html #offerAlert)
  const bang = document.createElement('div');
  Object.assign(bang.style, { position: 'fixed', left: 0, top: 0, zIndex: 21, width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%',
    display: 'grid', placeItems: 'center', background: '#fff', color: '#C93F25', font: '800 32px/1 "Baloo 2",system-ui,sans-serif',
    boxShadow: '0 3px 0 rgba(23,48,66,.25), 0 0 0 3px #FFC34A', pointerEvents: 'none', transform: 'scale(0)' });
  bang.textContent = '!';
  document.getElementById('teaser').append(bang);

  // ---------- the chef ----------
  const P = player.g;
  /** Poses him: hips at `hip` (world), facing `yaw`, tipped back by `back` (π/2: flat on his back), legs swung `legs`
   *  from straight down, arms [x, z] each. Set after the game's own animation, which this replaces for the shot. */
  function chef({ hip, yaw, back = 0, legs = [0, 0], arms = [[0, 0.08], [0, 0.08]], lean = 0, roll = 0 }) {
    P.rotation.order = 'YXZ';
    P.rotation.set(-back + lean, yaw, roll);
    // (his hips are 0.3 up his body: his feet's place follows from where they are and how he's tipped)
    const up = V(0, 0.3, 0).applyEuler(P.rotation);
    P.position.copy(hip).sub(up);
    P.body.position.y = 0; P.body.rotation.set(0, 0, 0); P.body.scale.y = 1;
    P.legs[0].rotation.x = legs[0]; P.legs[1].rotation.x = legs[1];
    P.arms[0].rotation.set(arms[0][0], 0, -arms[0][1]); P.arms[1].rotation.set(arms[1][0], 0, arms[1][1]);
    P.visible = true;
  }
  const mix = (a, b, k) => a + (b - a) * k;
  /** His right hand, in the world (the end of his arm, 0.42 down it). */
  const hand = i => P.arms[i].localToWorld(V(0, -0.42, 0));

  // ---------- sound: through the game's own engine, so it lands on the frame ----------
  const said = new Set();
  const once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const thud = big => { A.tone({ f: 95, f2: 34, d: 0.55, v: 0.75 + big * 0.25 }); A.noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.5 + big * 0.2 }); };
  const whoosh = (d, v = 0.3, f = 500, f2 = 2200) => A.noise({ f, f2, q: 0.9, d, a: d * 0.35, v });

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
  const LEAP1 = F.clone().add(V(-7.5, 0, -6)), LEAP2 = F.clone().add(V(1.2, 0, -6.5));
  function leap(c, dir, k, len = 4.2, high = 2.3) {
    // k 0..1 along the arc; under the water before and after
    const x = (k - 0.5) * len, y = high * 4 * k * (1 - k) - 0.25;
    tuna.g.position.copy(c).add(dir.clone().multiplyScalar(x)).setY(y);
    tuna.g.rotation.set(0, heading(dir), Math.atan2(high * 4 * (1 - 2 * k), len) * 0.9);
    tuna.tail.rotation.y = Math.sin(k * 40) * 0.5;
    tuna.g.visible = k > 0 && k < 1;
  }
  /** The ride: how far along the way home, by time. */
  const RIDE1 = F.clone().add(V(8, 0, 5)), RIDE2 = DOCK.clone().sub(R2.clone().multiplyScalar(80));
  function riding(t, from, TO, speed, t0, lift = 0) {
    const s = (t - t0) * speed, c = from.clone().add(TO.clone().multiplyScalar(s));
    const bob = Math.sin(t * 9) * 0.1, pitch = Math.cos(t * 9) * 0.12;
    tuna.g.visible = true;
    tuna.g.position.copy(c).setY(0.12 + bob + lift);
    tuna.g.rotation.set(0, heading(TO), pitch + lift * 0.12);
    tuna.tail.rotation.y = Math.sin(t * 34) * 0.55;
    // he stands on its back, a little behind its fin, leaning back on the rope, knees riding the bumps
    const back = c.clone().sub(TO.clone().multiplyScalar(0.35));
    chef({ hip: back.setY(0.12 + bob + lift + 0.34 + 0.3), yaw: Math.atan2(TO.x, TO.z), lean: -0.32 + pitch * 0.5, roll: Math.sin(t * 5.2) * 0.08,
      legs: [0.35 + pitch, 0.2 + pitch], arms: [[-0.95, 0.05], [-0.95, 0.05]] });
    P.updateMatrixWorld(true);
    // the rope: from his hands to the loop behind its head
    const neck = tuna.g.localToWorld(V(0.3, 0.06, 0));
    loop.visible = true; loop.position.copy(neck); loop.scale.setScalar(0.42); loop.rotation.set(0, heading(TO) + Math.PI / 2, 0);
    const h = hand(0).lerp(hand(1), 0.5);
    lay([h, h.clone().lerp(neck, 0.5).add(V(0, -0.06, 0)), neck.clone().add(V(0, 0.42, 0))]);
    return c;
  }
  let sprayT = 0;

  function frame(i, fps) {
    const t = i / fps;
    // ---------- sound cues ----------
    once('bang', T.bang, t, () => { A.tone({ f: 880, f2: 1320, d: 0.12, type: 'triangle', v: 0.45 }); A.tone({ f: 1320, d: 0.22, t: 0.1, type: 'triangle', v: 0.4 }); });
    once('h1', T.hit1, t, () => thud(0)); once('h2', T.hit2, t, () => thud(0.5)); once('h3', T.hit3, t, () => thud(1));
    once('s1', T.pov + 0.2, t, () => SFX.splash(P.position)); once('s2', T.pov + 1.05, t, () => SFX.splash(P.position));
    for (let n = 0; n < 4; n++) once('w' + n, T.rope + n * 0.16, t, () => whoosh(0.15, 0.16, 380, 900));
    once('throw', T.thrown, t, () => whoosh(0.4, 0.3)); once('s3', T.thrown + 0.15, t, () => SFX.splash(P.position));
    once('taut', T.taut - 0.06, t, () => { A.tone({ f: 230, f2: 170, d: 0.16, type: 'triangle', v: 0.4 }); whoosh(2.7, 0.3, 700, 1500); });
    once('chop', T.chop + 2 / 30, t, () => { SFX.chop(ST.chopTop, 0); thud(0.6); FX.chipsFx(ST.chopTop); });

    // ---------- the picture ----------
    let shot;
    // (he's in a scene: he doesn't fish from the pad, pick fillets up or drop them, wherever it puts him)
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    bang.style.transform = 'scale(0)';
    rope.visible = false; loop.visible = false;
    for (const h of hills) h.visible = t >= T.chop;
    openSea.visible = t < T.chop;
    K.fade(0);
    if (t < T.hit1) {
      // close on him: flat on his back, he stirs, sits up, hops to his feet; "!"
      shot = K.path([{ t: 0, pos: [F.x + 1.5, 0.75, F.z + 2.5], look: [F.x - 0.1, 0.42, F.z - 0.25], fov: 36 },
        { t: 1.3, pos: [F.x + 1.5, 0.8, F.z + 2.6], look: [F.x - 0.05, 0.5, F.z - 0.15], fov: 36 },
        { t: T.bang, pos: [F.x + 1.75, 1.2, F.z + 3.3], look: [F.x, 1.05, F.z], fov: 36 },
        { t: T.hit1, pos: [F.x + 1.7, 1.2, F.z + 3.2], look: [F.x, 1.05, F.z], fov: 36 }], t, ease);
    } else if (t < T.hit2) shot = { ...hit(t, T.hit1, wide(8, 0.3), F.clone().setY(0.6)), fogNear: 40, fogFar: 120 };
    else if (t < T.hit3) shot = { ...hit(t, T.hit2, wide(30, 0.75), F.clone()), fogNear: 80, fogFar: 200 };
    else if (t < T.pov) shot = { ...hit(t, T.hit3, wide(115, 1.36), F.clone()), fogNear: 200, fogFar: 500 };
    if (t < T.pov) {
      const sit = ease((t - 0.7) / 0.55), stand = ease((t - 1.35) / 0.35), hop = Math.sin(clamp((t - 1.35) / 0.5) * Math.PI) * 0.22;
      const stir = t < 0.7 ? Math.sin(t * 9) * 0.05 * clamp(t / 0.3) : 0;
      const jump = Math.sin(clamp((t - T.bang) / 0.28) * Math.PI) * 0.16, startle = clamp((t - T.bang) / 0.1) * clamp(1 - (t - T.bang - 0.45) / 0.3);
      const look = t > T.bang + 0.3 ? Math.sin((t - T.bang - 0.3) * 3.1) * 0.75 * clamp((t - T.bang - 0.3) / 0.3) : 0;
      chef({
        hip: F.clone().setY(ICE_Y + mix(mix(0.2, 0.13, sit), 0.3, stand) + hop + jump), yaw: mix(1.45, yaw0, easeIO((t - 0.9) / 0.8)) + look,
        back: (1 - sit) * (Math.PI / 2) + stir, legs: [-(Math.PI / 2) * sit * (1 - stand), -(Math.PI / 2) * sit * (1 - stand) * 0.92],
        arms: [[mix(0, 0.5, sit) * (1 - stand), mix(1.15, 0.25, sit) + startle * 0.55], [mix(0, 0.5, sit) * (1 - stand), mix(1.0, 0.25, sit) + startle * 0.55]],
      });
    } else if (t < T.rope) {
      // through his eyes: the empty water, breathing, and a tuna going over
      const k = (t - T.pov - 0.2) / 0.85;
      leap(LEAP1, V(0.86, 0, -0.5).normalize(), k);
      once('f1', T.pov + 0.2, t, () => FX.splashFx(LEAP1.clone().add(V(-1.8, 0, 1.05)))); once('f2', T.pov + 1.05, t, () => FX.splashFx(LEAP1.clone().add(V(1.8, 0, -1.05))));
      const eye = F.clone().setY(ICE_Y + 1.12), follow = clamp((t - T.pov - 0.25) / 0.35);
      const aim = F.clone().add(V(-9, 0.4, -4)).lerp(tuna.g.visible ? tuna.g.position.clone() : LEAP1.clone().add(V(1.8, 0.2, -1.05)), follow * 0.85);
      aim.add(V(Math.sin(t * 13) * 0.16 + Math.sin(t * 31) * 0.07, Math.sin(t * 17) * 0.12, Math.cos(t * 11) * 0.14));
      eye.add(V(0, Math.sin(t * 6) * 0.025, 0));
      shot = { pos: eye, look: aim, fov: 52, roll: Math.sin(t * 7) * 0.012, fogNear: 22, fogFar: 85 };
      P.visible = false;
    } else if (t < T.taut) {
      // over his shoulder: the loop spun overhead, thrown, and round the tuna as it jumps again
      const dirL = V(-0.98, 0, 0.2).normalize();
      const k = (t - T.thrown + 0.25) / 0.95;
      leap(LEAP2, dirL, k, 3.6, 2.0);
      once('f3', T.thrown - 0.25, t, () => FX.splashFx(LEAP2.clone().sub(dirL.clone().multiplyScalar(1.6))));
      const spin = (t - T.rope) * 20, thrown = clamp((t - T.thrown) / 0.3), sw = ease(thrown);
      const face = Math.atan2(LEAP2.x - F.x, LEAP2.z - F.z);
      chef({ hip: F.clone().setY(ICE_Y + 0.3), yaw: face, lean: mix(-0.12, 0.3, sw), legs: [0.25, -0.25],
        arms: [[0, 0.1], [mix(0, -1.0, sw), mix(2.75 + Math.sin(spin) * 0.12, 0.25, sw)]] });
      P.updateMatrixWorld(true);
      const h = hand(1);
      const over = h.clone().add(V(Math.cos(spin) * 0.2, 0.5, Math.sin(spin) * 0.2));
      const tunaAt = tuna.g.visible ? tuna.g.localToWorld(V(0.3, 0, 0)) : LEAP2.clone().setY(1.6);
      const fly = over.clone().lerp(tunaAt, easeOut(thrown)).add(V(0, Math.sin(thrown * Math.PI) * 1.2, 0));
      loop.visible = true; loop.position.copy(thrown > 0 ? fly : over);
      loop.scale.setScalar(mix(0.5, 0.42, thrown));
      loop.rotation.set(mix(Math.PI / 2 - 0.5 + 0.15 * Math.sin(spin), 0, ease(thrown)), mix(0, heading(dirL) + Math.PI / 2, ease(thrown)), mix(spin, 0, ease(thrown)));
      lay([h, h.clone().lerp(loop.position, 0.5).add(V(0, 0.25 - 0.5 * thrown, 0)), loop.position.clone()]);
      const back = F.clone().add(V(-1.5, 0, 3.0));
      shot = K.path([{ t: T.rope, pos: [back.x, 2.5, back.z + 0.3], look: [F.x + 0.5, 1.5, F.z - 2.5], fov: 44 },
        { t: T.taut, pos: [back.x + 0.1, 2.35, back.z - 0.2], look: [F.x + 0.8, 1.35, F.z - 4], fov: 44 }], t, ease);
      shot.fogNear = 26; shot.fogFar = 90;
    } else if (t < T.ride2) {
      // the ride, alongside: open water going by
      const TO = R1, c = riding(t, RIDE1, TO, 22, T.taut);
      const camAt = c.clone().add(TO.clone().multiplyScalar(3.3)).add(sideOf(TO).multiplyScalar(3.3)).setY(0.95 + Math.sin(t * 23) * 0.03);
      shot = { pos: camAt, look: c.clone().add(TO.clone().multiplyScalar(0.2)).setY(1.0), fov: 42, fogNear: 30, fogFar: 95 };
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.07; FX.splashFx(c.clone().add(TO.clone().multiplyScalar(1.0)), 0.1); FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.6)), 0.1); }
      once('sp1', T.taut + 0.5, t, () => SFX.splash(P.position)); once('sp2', T.taut + 1.0, t, () => SFX.splash(P.position));
    } else if (t < T.chop) {
      // the ride, from behind: the market comes into sight, small and far off across the water, and the picture
      // fades to black on it (the owner's cut: no swim all the way in)
      const TO = R2, c = riding(t, RIDE2, TO, 13, T.ride2);
      const camAt = c.clone().sub(TO.clone().multiplyScalar(6.2)).add(sideOf(TO).multiplyScalar(-1.7)).setY(2.9 + Math.sin(t * 5.2) * 0.04);
      shot = { pos: camAt, look: c.clone().add(TO.clone().multiplyScalar(30)).setY(0.6), fov: 36, roll: Math.sin(t * 5.2) * 0.012, fogNear: 55, fogFar: 150 };
      sprayT -= 1 / fps; if (sprayT <= 0) { sprayT = 0.1; FX.splashFx(c.clone().sub(TO.clone().multiplyScalar(1.4)), 0.1); }
      once('sp3', T.ride2 + 0.3, t, () => SFX.splash(P.position));
      K.fade(ease((t - at(14.85)) / (at(15.75) - at(14.85))));
    } else {
      // the cleaver: the tuna on the board, the blade down on the beat
      const B = ST.chopTop, k = clamp((t - T.chop) / (2 / 30)), down = k * k;
      tuna.g.visible = true; tuna.g.scale.setScalar(0.92); tuna.g.position.set(B.x - 0.05, B.y + 0.1, B.z); tuna.g.rotation.set(0, 0, 0); tuna.tail.rotation.y = t < T.chop + 0.5 ? Math.sin(t * 30) * 0.35 * clamp(1 - (t - T.chop) / 0.5) : 0;
      ST.blade.position.set(B.x + 0.3, B.y + mix(0.95, 0.2, down), B.z); ST.blade.rotation.set(0, 0, mix(-0.5, 0, down));
      chef({ hip: V(B.x + 0.35, 0.15 + 0.3, B.z - 0.95), yaw: 0, lean: 0.12 * down, arms: [[0, 0.1], [mix(-2.3, -1.0, down), 0.1]] });
      const sh = Math.max(0, 1 - (t - T.chop - 2 / 30) / 0.22) * (t >= T.chop + 2 / 30 ? 0.035 : 0);
      shot = { pos: V(B.x + 1.0 + Math.sin(t * 90) * sh, B.y + 1.0 + Math.cos(t * 70) * sh, B.z + 2.7), look: V(B.x + 0.05, B.y + 0.3, B.z - 0.2), fov: 38 };
    }
    K.cam = shot;
  }
  // (the chef and the props are posed once the game's tick has had its say: its own walk cycle and blade)
  let now = { i: 0, fps: 30 };
  K.pose = () => frame(now.i, now.fps);
  K.after = cam => {
    const t = now.i / now.fps;
    if (t < T.bang || t >= T.hit1) return;
    const head = P.position.clone().add(V(0, 1.68, 0)).project(cam), w = innerWidth, h = innerHeight;
    const k = clamp((t - T.bang) / 0.14), s = (k + 0.5 * Math.sin(k * Math.PI)) * 1.5;
    bang.style.transform = `translate(${(head.x + 1) / 2 * w}px, ${(1 - head.y) / 2 * h}px) scale(${s})`;
  };
  window.cine = {
    len: T.end,
    setup() { player.held = true; },
    frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(F.x + 1.5, 0.75, F.z + 2.5), look: F.clone(), fov: 36 }; },
  };
})();
