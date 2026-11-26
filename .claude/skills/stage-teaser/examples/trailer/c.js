// Take C, the campfire (?stage=1&pile=14 as a new game; acting.js and campfire.js before this). That night: the chef
// sits by a fire next to his cut-up tuna, about to roast a piece, when a customer at the lone stand starts hammering
// its bell and waving money. He looks at the fish. He looks at the customer. "$".
// Acting keyed pose to pose (acting.js track), cameras held (kit.js held/jolt), nothing on a fixed wobble: the lessons of
// the opening (SKILL.md "Weight, and not looking machine-made") applied here.
(async () => {
  while (!window.K || !window.Acting || !window.Campfire) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, T3, n1 } = K;
  const { Group, Mesh, MeshLambertMaterial, MeshBasicMaterial, CylinderGeometry, SphereGeometry, BoxGeometry } = T3;
  const { scene } = K.R;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const CT = await window.__mod('counters.ts'), STG = await window.__mod('stage.ts'), IT = await window.__mod('items.ts');
  const FX = await window.__mod('fx.ts'), A = await window.__mod('audio.ts'), ST = await window.__mod('stations.ts');
  const mix = (a, b, k) => a + (b - a) * k, bump = k => Math.sin(clamp(k) * Math.PI);
  ACT.EASE.settle = k => { k = clamp(k); return k < 0.7 ? 1.06 * ease(k / 0.7) : 1.06 - 0.06 * ease((k - 0.7) / 0.3); };
  const BEAT = 60 / 92, at = n => n * BEAT;
  const T = { ding: at(2), chef: at(4), fish: at(5.2), stand: at(6), idea: at(8), up: at(10.4), end: at(12) }; // (his startle gets a landing and a held look before the cut to the fish)

  // ---------- the set: a fire by the pile of fillets, at the dock's sea end; the stand is 12 m off to the south ----------
  const FY = 0.15, FIRE = V(0.95, FY, -3.55), SEAT = V(0.0, FY + 0.13, -3.75), PILE = V(2.1, FY, -5.0), BELL = V(2.05, 1.1, 8.3);
  const fire = Campfire(T3, scene, FIRE.x, FIRE.y, FIRE.z);
  // The stall's own bell is the size of a thimble. For this scene a proper counter bell stands on the other corner:
  // a brass dome on a dark foot with a button on top, and three strokes that jump off it when it's struck.
  const bell = new Group(); bell.position.copy(BELL); scene.add(bell);
  // a lantern under the stand's roof: the customers are in its light, as warm as the fire's
  const lamp = new T3.PointLight(0xFFB868, 1.9, 9, 1.5); lamp.position.set(2.65, 1.62, 7.95); scene.add(lamp);
  { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,214,140,0.9)'); gr.addColorStop(0.35, 'rgba(255,170,80,0.35)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const halo = new T3.Sprite(new T3.SpriteMaterial({ map: new T3.CanvasTexture(cv), blending: T3.AdditiveBlending, depthWrite: false, fog: false })); halo.position.set(3.45, 1.9, 7.95); halo.scale.setScalar(1.1); scene.add(halo); }
  const lantern = new Mesh(new BoxGeometry(0.13, 0.17, 0.13), new MeshBasicMaterial({ color: 0xFFD98A, fog: false })); lantern.position.set(3.45, 1.9, 7.95); scene.add(lantern);
  const lanternTop = new Mesh(new BoxGeometry(0.17, 0.035, 0.17), new MeshLambertMaterial({ color: 0x2A2320 })); lanternTop.position.set(3.45, 2.0, 7.95); scene.add(lanternTop);
  {
    const brass = new MeshLambertMaterial({ color: 0xF2C14E }), foot = new MeshLambertMaterial({ color: 0x4A3A22 });
    const f = new Mesh(new CylinderGeometry(0.1, 0.11, 0.025, 14), foot); f.position.y = 0.012; bell.add(f);
    const dome = new Mesh(new SphereGeometry(0.095, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.y = 0.02; dome.castShadow = true; bell.add(dome);
    const btn = new Mesh(new CylinderGeometry(0.018, 0.018, 0.03, 8), foot); btn.position.y = 0.125; bell.add(btn);
  }
  const dings = [-0.7, 0, 0.7].map(a => { const m = new Mesh(new BoxGeometry(0.018, 0.09, 0.018), new MeshBasicMaterial({ color: 0xFFC34A })); m.userData.a = a; scene.add(m); return m; });
  const P = player.g, setFace = ACT.face(P), chef = o => ACT.pose(P, o, setFace);
  ACT.soles(P); ACT.castaway(P);
  // a stick with a piece of the tuna on it
  const stick = new Mesh(new CylinderGeometry(0.012, 0.016, 0.9, 5), new MeshLambertMaterial({ color: 0x7A5236 })); stick.geometry.translate(0, -0.45, 0);
  const morsel = IT.newFillet(); morsel.scale.setScalar(0.55); morsel.position.set(0, -0.9, 0); stick.add(morsel);
  P.arms[1].add(stick); stick.position.set(0, -0.4, 0); stick.rotation.set(-0.5, 0, 0);
  // the customer: the game's own first in the queue, with a face for the occasion and a bill to wave
  let who = null, whoFace = null, bill = null;
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const toFire = yawTo(SEAT, FIRE), toPile = yawTo(SEAT, PILE), toStand = yawTo(SEAT, BELL);

  // The chef, pose to pose. h: his hips over where he sits; up: 0 sitting, legs out, to 1 on his feet; arms [swing, out].
  // He's seen in three shots: the wide (till the bell), his face (the startle), and from the idea on.
  const S = ACT.track([
    { t: 0, h: 0, yaw: toFire, tip: 0.12, roll: 0, up: 0, a00: 0.3, a01: 0.15, a10: -1.15, a11: 0.1, sq: 1 },
    // (turning his supper over the fire: a lean in, and back)
    { t: 0.75, mv: 0.4, tip: 0.2, a10: -1.25 }, { t: T.ding + 0.2, mv: 0.5, tip: 0.1, a10: -1.1 },
    // the bell: he starts (up off his seat, his arms going different ways), comes down, and holds, wide-eyed
    // (six calm frames on his face first, so the start is seen to happen, not cut into)
    { t: T.chef + 0.3, mv: 0.09, e: 'out', h: 0.13, sq: 1.1, a00: -0.2, a01: 0.85, a10: -0.9, a11: 0.5, tip: 0 },
    { t: T.chef + 0.46, mv: 0.14, e: 'in', h: 0, sq: 1.02 }, { t: T.chef + 0.52, mv: 0.06, e: 'out', sq: 0.9 },
    { t: T.chef + 0.72, mv: 0.2, e: 'settle', sq: 1, a00: 0.2, a01: 0.3, a10: -0.9, a11: 0.2, tip: 0.06 },
    // (out of shot: he looks at his fish, then at the stand; when the shot comes back he's still looking at it)
    { t: T.fish + 0.3, mv: 0.3, yaw: toPile }, { t: T.stand + 0.35, mv: 0.35, yaw: toStand, a10: 0 },
    // the idea: one more look at the fish (a glance: quick there, a hold, back), then round to us, a drop as it lands
    { t: T.idea + 0.42, mv: 0.16, e: 'settle', yaw: mix(toStand, toPile, 0.55), tip: 0.1 },
    { t: T.idea + 0.72, mv: 0.14, yaw: toStand },
    { t: T.idea + 0.86, mv: 0.1, sq: 0.9, tip: 0.14 },
    { t: T.idea + 1.06, mv: 0.2, e: 'settle', yaw: 0.9, sq: 1.04, tip: 0 }, { t: T.idea + 1.24, mv: 0.16, sq: 1 },
    // up: forward over his knees (the wind-up), a spring, arms up one after the other, down and a settle
    { t: T.up - 0.02, mv: 0.16, tip: 0.36, sq: 0.9, a00: 0.5, a10: 0.4 },
    { t: T.up + 0.2, mv: 0.2, e: 'out', h: 0.5, up: 1, tip: 0.02, sq: 1.1, a00: 0, a01: 2.5, a10: 0, a11: 2.25 }, // (both arms thrown UP in a V, one ahead of the other: out level they read as a rig at rest)
    { t: T.up + 0.38, mv: 0.18, e: 'in', h: 0.17, sq: 1.04, a11: 2.45, a01: 2.2 }, { t: T.up + 0.44, mv: 0.06, e: 'out', sq: 0.85 },
    { t: T.up + 0.72, mv: 0.26, e: 'settle', sq: 1, a00: -0.25, a01: 1.15, a10: 0.1, a11: 0.75 }, // (both coming down, one ahead: never both out level, never one out straight alone)
  ]);

  const pill = document.createElement('div');
  Object.assign(pill.style, { position: 'fixed', left: 0, top: 0, zIndex: 21, width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%',
    display: 'grid', placeItems: 'center', background: '#23803A', color: '#fff', font: '800 30px/1 "Baloo 2",system-ui,sans-serif',
    boxShadow: '0 3px 0 rgba(23,48,66,.25), 0 0 0 3px #FFC34A', pointerEvents: 'none', transform: 'scale(0)' });
  pill.textContent = '$';
  document.getElementById('teaser').append(pill);
  let pillAt = null;

  const said = new Set();
  const once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const ding = (v = 0.5) => { A.tone({ f: 2093, d: 0.5, v, at: BELL }); A.tone({ f: 3136, d: 0.3, v: v * 0.5, at: BELL }); A.tone({ f: 4186, d: 0.12, v: v * 0.3, at: BELL }); };
  const crackle = (k = 1) => A.noise({ f: 1700 + 1400 * k, q: 3, d: 0.03, v: 0.21 * k, at: FIRE }); // (each its own size and pitch)
  /** How hard the customer's fist is coming down at `t`, 0..1 (up before each stroke, down on it), and how long since the last. */
  /** The bell's strokes: two a beat from the first ding to the idea, each a moment before it sounds. */
  // (rung by a fist, not a clock: each a few hundredths early or late, and harder or softer than the last)
  const strokes = [], hard = []; for (let b = 2, n = 0; b < 10.4; b += 0.5, n++) { strokes.push(at(b) + (n ? K.n1(n * 1.7, 41) * 0.035 : 0)); hard.push([1, 0.62, 0.86, 0.55][n % 4] * (1 + K.n1(n * 2.3, 42) * 0.12)); }

  let air0 = null;
  function frame(i, fps) {
    const t = i / fps;
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    STG.setNight(0.78);
    // (burning lower once the shots are close on him: its tip poked up into the bottom of the picture)
    { const low = ease((t - T.ding) / 0.3); fire.set(t, mix(1, 0.78, low), mix(0.72, 0.92, low)); }
    if (ST.blade) ST.blade.visible = false; // (the chopping blade hangs in the air over its board: a floating box, from here)
    // (a fire spits when it likes: on any frame, about three a second, never on a grid. Every fifth frame, it was a clock
    // once the hiss that hid it had gone.)
    { const r = (n1(i * 7.31, 11) + 1) / 2, r2 = (n1(i * 3.17 + 40, 23) + 1) / 2; if (r > 0.88) crackle(0.63 + 0.95 * r2); } // (n1 runs -1 to 1)
    // (the fire's own low roar and the night air, held under it all: beds, not fades)
    // (brown noise that MOVES, as the game's own ambience is made: a held band of white noise is static to the ear.
    // The take's own cues are 5 dB hotter than they were and the cut's gain 5 dB lower: the game's winter wind, which
    // plays under all of this at the cut's gain, was a rumble at -21 dBFS.)
    if (t >= 0.12 && !air0) air0 = { fire: K.soft(A, { kind: 'lowpass', f: 300, q: 0.5, smooth: 600 }), sea: K.soft(A, { kind: 'lowpass', f: 420, q: 0.5, smooth: 800 }) };
    if (air0) { const on = ease((t - 0.12) / 0.4) * (1 - ease((t - T.end + 0.55) / 0.45));
      air0.fire.to(0.1 * Math.max(0.2, 0.6 + 0.3 * K.n1(t * 1.9, 3) + 0.2 * K.n1(t * 5.3, 8)) * on, 0.08); air0.sea.to(0.06 * K.swell(t + 1.5, 2.9, 4.4) * on); }
    strokes.forEach((s, n) => once('d' + n, s, t, () => ding((t < T.chef ? 0.5 : t >= T.stand && t < T.idea ? 0.45 : 0.29) * hard[n])));
    // the bell dips under his fist, and its strokes jump
    { const last = strokes.filter(s => s <= t).at(-1) ?? -9, k = clamp((t - last) / 0.2);
      bell.scale.y = 1 - 0.2 * Math.sin(Math.min(1, k * 2) * Math.PI);
      for (const m of dings) { const a = m.userData.a, r = 0.16 + 0.1 * k; m.visible = k < 1 && last > 0; m.position.set(BELL.x + Math.sin(a) * r, BELL.y + 0.1 + Math.cos(a) * r, BELL.z); m.rotation.z = -a; m.scale.setScalar(Math.sin(k * Math.PI)); } }
    once('idea', T.idea + 0.88, t, () => { A.tone({ f: 660, d: 0.09, type: 'triangle', v: 0.189 }); A.tone({ f: 990, d: 0.2, t: 0.09, type: 'triangle', v: 0.219 }); A.tone({ f: 1320, d: 0.3, t: 0.2, type: 'triangle', v: 0.189 }); });
    K.fade(Math.max(1 - ease(t / 0.3), ease((t - T.up - 0.56) / 0.45))); K.vignette(0.6);
    pillAt = null;

    // ----- the customer: both fists going, one on the bell, one full of money -----
    if (who) {
      const next = strokes.find(s => s >= t - 0.06) ?? 1e9, last = strokes.filter(s => s <= t).at(-1) ?? -9, k = clamp(1 - (next - t) / 0.16), hitK = t > next ? 1 - clamp((t - next) / 0.06) : k * k;
      // (his whole body goes into each stroke: up on his toes before it, down with it; the money hand has a temper of
      // its own, faster and slower, never in step with the bell)
      const since = t - last, drop = last > 0 ? Math.exp(-since * 9) : 0, wave = Math.sin(t * 15 + n1(t * 1.7, 4) * 2.2) * (0.3 + 0.14 * n1(t * 0.9, 5));
      ACT.pose(who, { hip: V(2.32 + n1(t * 0.8, 6) * 0.015, FY + 0.62 + 0.05 * k - 0.045 * drop, 8.72), yaw: Math.PI + n1(t * 1.1, 7) * 0.09, lean: 0.2 + 0.1 * hitK + 0.05 * drop, roll: n1(t * 1.3, 8) * 0.05,
        arms: [[0.15 * n1(t * 2.1, 9), 2.4 + wave], [mix(-2.85, -2.0, hitK), 0.02]], sq: 1 + 0.05 * k - 0.07 * drop,
        f: { brow: [0.1, 1.4], mouth: 'o', open: 1.25 + 0.5 * drop + 0.25 * n1(t * 3, 10) } }, whoFace);
    }
    // ----- the chef -----
    const p = S(t), pa = S(t - 0.05), pb = S(t - 0.1), ik = t - T.idea, got = ik > 0.9;
    const f = t < T.chef + 0.2 ? { eyes: 'happy', mouth: 'smile' } : t < T.fish ? { eyes: 'big', brow: [1.3, -0.3], mouth: 'o', open: 1.1 }
      : t < T.stand ? { eyes: 'dot', brow: [0.7, -0.5], mouth: 'none' } : t < T.idea ? { eyes: 'dot', brow: [0.5, -0.9], mouth: 'frown' }
        : !got ? { eyes: t >= T.idea + 0.5 && t < T.idea + 0.58 ? 'shut' : 'dot', brow: [0.9, 0], mouth: 'none' } : { eyes: 'dot', brow: [0.6, 0.45], mouth: 'grin', open: 0.7 + 0.5 * clamp((ik - 0.9) / 0.15) };
    // (held poses breathe and drift: never on a count)
    const breath = 1 + Math.sin(t * 2.5) * 0.014, lookStand = clamp((t - T.stand) / 0.35);
    chef({ hip: SEAT.clone().setY(SEAT.y + p.h), yaw: p.yaw + n1(t * 0.5, 2) * 0.03, lean: p.tip + n1(t * 0.6, 1) * 0.015, roll: n1(t * 0.45, 3) * 0.035 * (1 - p.up),
      legs: [(-(Math.PI / 2) + 0.25) * (1 - p.up), -(Math.PI / 2) * 0.9 * (1 - p.up)],
      arms: [[pa.a00, pa.a01 + n1(t * 0.8, 4) * 0.03], [pb.a10 + n1(t * 0.9, 5) * 0.05 * (1 - lookStand), pb.a11 + n1(t * 0.7, 6) * 0.03]], sq: p.sq * breath, f });
    stick.visible = p.up < 0.5 && !(t >= T.fish && t < T.stand); // (out of the way of the look at the tray)
    stick.rotation.x = mix(-0.55 + n1(t * 0.7, 7) * 0.08, 0.6, lookStand);
    P.updateMatrixWorld(true);
    if (got && t < T.up + 0.04) pillAt = P.position.clone().add(V(0, 1.5, 0));

    // ----- the shots -----
    let shot;
    if (t < T.ding) shot = K.held(K.path([{ t: 0, pos: [4.3, 1.5, -0.3], look: [0.8, 0.6, -4.0], fov: 38 }, { t: T.ding, pos: [4.0, 1.4, -0.7], look: [0.75, 0.6, -4.0], fov: 38 }], t, ease), t, 0.8, 31);
    else if (t < T.chef) shot = K.held(K.path([{ t: T.ding, pos: [2.3, 2.1, 6.3], look: [2.16, 1.42, 8.72], fov: 34 }, { t: T.chef, pos: [2.3, 2.05, 6.65], look: [2.16, 1.42, 8.72], fov: 32 }], t, ease), t, 1.3, 32);
    // (tight on his face, the fire just under the picture: its light and sparks are enough. Knocked as he starts.)
    else if (t < T.fish) shot = K.jolt(K.held({ pos: V(2.0, 1.28, -2.3), look: V(0.05, 1.14 + S(t - 0.1).h * 0.5, -3.75), fov: 22 }, t, 1.6, 33), t, T.chef + 0.22, 0.03);
    // (what he looks at: the tuna, cut up, in the firelight)
    else if (t < T.stand) shot = K.held(K.path([{ t: T.fish, pos: [1.15, 0.95, -3.75], look: [2.1, 0.22, -5.0], fov: 30 }, { t: T.stand, pos: [1.25, 0.9, -3.9], look: [2.1, 0.22, -5.0], fov: 27 }], t, ease), t, 1.1, 34);
    // (through his eyes, on a long lens: it wanders as a long lens does)
    else if (t < T.idea) shot = K.held(K.path([{ t: T.stand, pos: [-0.2, 1.75, -4.0], look: [2.35, 1.3, 8.5], fov: 13 }, { t: T.idea, pos: [-0.2, 1.75, -4.0], look: [2.35, 1.3, 8.5], fov: 10 }], t, ease), t, 1.5, 35);
    else { const hy = 0.17 * ease(S(t - 0.08).up); // (up with him as he gets to his feet, a little late; it doesn't chase the hop: he jumps IN the picture)
      shot = K.held({ ...K.path([{ t: T.idea, pos: [1.95, 1.3, -2.25], look: [0.05, 1.08, -3.76], fov: 27 }, { t: T.up, pos: [1.9, 1.3, -2.3], look: [0.05, 1.09, -3.76], fov: 26 }, { t: T.up + 0.22, pos: [2.05, 1.4, -2.05], look: [0.05, 1.22, -3.76], fov: 33 }], t, ease) }, t, 1.2, 36);
      shot.look.y += hy * 0.72; shot.pos.y += hy * 0.5; shot.fov += hy * 30; }
    shot.sun = FIRE;
    K.cam = shot;
  }
  let now = { i: 0, fps: 30 };
  K.pose = () => frame(now.i, now.fps);
  K.after = cam => {
    const t = now.i / now.fps;
    if (!pillAt) { pill.style.transform = 'scale(0)'; return; }
    const s = pillAt.clone().project(cam), k = clamp((t - T.idea - 0.9) / 0.14);
    pill.style.transform = `translate(${(s.x + 1) / 2 * innerWidth}px, ${Math.max(52, (1 - s.y) / 2 * innerHeight)}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5})`;
  };
  window.cine = {
    len: T.end,
    async setup() {
      player.held = true;
      // (wait for the game's first customer to reach the stand: that's our bell ringer)
      for (let n = 0; n < 200 && !CT.C1.queue[0]?.queued; n++) await new Promise(r => setTimeout(r, 100));
      who = CT.C1.queue[0]?.g ?? null;
      if (who) { whoFace = ACT.face(who); bill = IT.newBill(5); bill.scale.setScalar(1.3); bill.position.set(0, -0.45, 0); bill.rotation.set(Math.PI / 2, 0, 0); who.arms[0].add(bill); }
      console.log('[cine] bell ringer', !!who, CT.C1.queue.length);
    },
    frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(4.3, 1.5, -0.3), look: V(0.8, 0.6, -4.0), fov: 38 }; },
  };
})();
