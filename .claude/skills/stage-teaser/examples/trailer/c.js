// Take C, the campfire (?stage=1&pile=14 as a new game; acting.js and campfire.js before this). That night: the chef
// sits by a fire next to his cut-up tuna, about to roast a piece, when a customer at the lone stand starts hammering
// its bell and waving money. He looks at the fish. He looks at the customer. "$".
(async () => {
  while (!window.K || !window.Acting || !window.Campfire) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, T3 } = K;
  const { Group, Mesh, MeshLambertMaterial, MeshBasicMaterial, CylinderGeometry, SphereGeometry, BoxGeometry } = T3;
  const { scene } = K.R;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const CT = await window.__mod('counters.ts'), STG = await window.__mod('stage.ts'), IT = await window.__mod('items.ts');
  const FX = await window.__mod('fx.ts'), A = await window.__mod('audio.ts'), ST = await window.__mod('stations.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  const BEAT = 60 / 92, at = n => n * BEAT;
  const T = { ding: at(2), chef: at(4), fish: at(4.6), stand: at(6), idea: at(8), up: at(10.4), end: at(12) };

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
  const crackle = () => A.noise({ f: 2600, q: 3, d: 0.03, v: 0.12, at: FIRE });
  /** The bell's strokes: two a beat from the first ding to the idea, each a moment before it sounds. */
  const strokes = []; for (let b = 2; b < 10.4; b += 0.5) strokes.push(at(b));

  function frame(i, fps) {
    const t = i / fps;
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    STG.setNight(0.78);
    // (burning lower once the shots are close on him: its tip poked up into the bottom of the picture)
    { const low = ease((t - T.ding) / 0.3); fire.set(t, mix(1, 0.78, low), mix(0.72, 0.92, low)); }
    if (ST.blade) ST.blade.visible = false; // (the chopping blade hangs in the air over its board: a floating box, from here)
    if (i % 5 === 0 && Math.sin(i * 12.9898) > 0.2) crackle();
    strokes.forEach((s, n) => once('d' + n, s, t, () => ding(t < T.chef ? 0.55 : t >= T.stand && t < T.idea ? 0.4 : 0.2)));
    // the bell dips under his fist, and its strokes jump
    { const last = strokes.filter(s => s <= t).at(-1) ?? -9, k = clamp((t - last) / 0.2);
      bell.scale.y = 1 - 0.2 * Math.sin(Math.min(1, k * 2) * Math.PI);
      for (const m of dings) { const a = m.userData.a, r = 0.16 + 0.1 * k; m.visible = k < 1 && last > 0; m.position.set(BELL.x + Math.sin(a) * r, BELL.y + 0.1 + Math.cos(a) * r, BELL.z); m.rotation.z = -a; m.scale.setScalar(Math.sin(k * Math.PI)); } }
    once('idea', T.idea + 0.35, t, () => { A.tone({ f: 660, d: 0.09, type: 'triangle', v: 0.3 }); A.tone({ f: 990, d: 0.2, t: 0.09, type: 'triangle', v: 0.35 }); A.tone({ f: 1320, d: 0.3, t: 0.2, type: 'triangle', v: 0.3 }); });
    K.fade(Math.max(1 - ease(t / 0.6), ease((t - T.up - 0.35) / 0.45))); K.vignette(0.6);
    pillAt = null;

    // ----- the customer: both fists going, one on the bell, one full of money -----
    if (who) {
      const next = strokes.find(s => s >= t - 0.06) ?? 1e9, k = clamp(1 - (next - t) / 0.16), hitK = t > next ? 1 - clamp((t - next) / 0.06) : k * k;
      const hop = Math.abs(Math.sin(t * Math.PI / BEAT * 2)) * 0.04;
      ACT.pose(who, { hip: V(2.32, FY + 0.62 + hop * 2, 8.72), yaw: Math.PI + Math.sin(t * 9) * 0.05, lean: 0.2 + 0.08 * hitK, arms: [[0, 2.45 + Math.sin(t * 17) * 0.4], [mix(-2.8, -2.02, hitK), 0.02]],
        f: { brow: [0.1, 1.4], mouth: 'o', open: 1.2 + 0.6 * Math.abs(Math.sin(t * 9)) } }, whoFace);
    }
    // ----- the chef -----
    const startle = clamp((t - T.chef) / 0.12) * clamp(1 - (t - T.chef - 0.3) / 0.25), jump = Math.sin(clamp((t - T.chef) / 0.3) * Math.PI) * 0.12;
    const lookPile = easeIO((t - T.fish) / 0.3), lookStand = easeIO((t - T.stand) / 0.35);
    const ik = t - T.idea, again = ik > 0 ? (ik < 0.3 ? easeIO(ik / 0.25) : ik < 0.6 ? 1 - easeIO((ik - 0.3) / 0.25) * 2.0 : -1 + easeIO((ik - 0.6) / 0.25) * 1.0) : 0;
    // (at the idea: one more look at the fish, one more at the stand, then straight ahead, grinning)
    let yaw = mix(mix(toFire, toPile, lookPile), toStand, lookStand);
    // (still looking at the stand as the shot comes back to him; then round to the camera as it lands)
    if (ik > 0) yaw = ik < 0.5 ? toStand + Math.sin(ik * 12) * 0.05 : mix(toStand, 0.9, easeIO((ik - 0.5) / 0.3));
    const got = ik > 0.85, rise = ease((t - T.up) / 0.35), hop2 = Math.sin(clamp((t - T.up) / 0.45) * Math.PI) * 0.3;
    const f = t < T.chef ? { eyes: 'happy', mouth: 'smile' } : t < T.fish ? { eyes: 'big', brow: [1.3, -0.3], mouth: 'o', open: 1.1 }
      : t < T.stand ? { eyes: 'dot', brow: [0.7, -0.5], mouth: 'none' } : t < T.idea ? { eyes: 'dot', brow: [0.5, -0.9], mouth: 'frown' }
        : !got ? { eyes: 'dot', brow: [0.9, 0], mouth: 'none' } : { eyes: 'dot', brow: [0.6, 0.45], mouth: 'grin', open: 1.2 };
    const sway = t < T.chef ? Math.sin(t * 2.4) * 0.05 : 0;
    chef({ hip: SEAT.clone().setY(SEAT.y + jump + rise * 0.17 + hop2), yaw, lean: mix(0.12, 0, rise), roll: sway,
      legs: [-(Math.PI / 2) * (1 - rise) + 0.25 * (1 - rise), -(Math.PI / 2) * (1 - rise) * 0.9],
      arms: [[0.3 * (1 - rise), 0.15 + startle * 0.6 + rise * 0.9], [mix(-1.15, 0, lookStand), 0.1 + startle * 0.3 + rise * 0.9]], sq: 1 + startle * 0.08, f });
    stick.visible = rise < 0.5 && !(t >= T.fish && t < T.stand); // (out of the way of the look at the tray)
    stick.rotation.x = mix(-0.55, 0.6, lookStand);
    P.updateMatrixWorld(true);
    if (got && t < T.up + 0.25) pillAt = P.position.clone().add(V(0, 1.5, 0));

    // ----- the shots -----
    let shot;
    if (t < T.ding) shot = K.path([{ t: 0, pos: [4.3, 1.5, -0.3], look: [0.8, 0.6, -4.0], fov: 38 }, { t: T.ding, pos: [4.0, 1.4, -0.7], look: [0.75, 0.6, -4.0], fov: 38 }], t, k => k);
    else if (t < T.chef) shot = K.path([{ t: T.ding, pos: [2.3, 2.1, 6.3], look: [2.16, 1.52, 8.72], fov: 34 }, { t: T.chef, pos: [2.3, 2.05, 6.65], look: [2.16, 1.52, 8.72], fov: 32 }], t, k => k);
    else if (t < T.fish) shot = { pos: V(2.0, 1.28, -2.3), look: V(0.05, 1.14, -3.75), fov: 22 }; // (tight on his face, the fire just under the picture: its light and sparks are enough)
    // (what he looks at: the tuna, cut up, in the firelight)
    else if (t < T.stand) shot = K.path([{ t: T.fish, pos: [1.15, 0.95, -3.75], look: [2.1, 0.22, -5.0], fov: 30 }, { t: T.stand, pos: [1.25, 0.9, -3.9], look: [2.1, 0.22, -5.0], fov: 27 }], t, k => k);
    else if (t < T.idea) shot = K.path([{ t: T.stand, pos: [-0.2, 1.75, -4.0], look: [2.35, 1.3, 8.5], fov: 13 }, { t: T.idea, pos: [-0.2, 1.75, -4.0], look: [2.35, 1.3, 8.5], fov: 10 }], t, ease); // (through his eyes, on a long lens)
    else shot = K.path([{ t: T.idea, pos: [1.95, 1.3, -2.25], look: [0.05, 1.08, -3.76], fov: 27 }, { t: T.up, pos: [1.9, 1.3, -2.3], look: [0.05, 1.09, -3.76], fov: 26 }, { t: T.up + 0.4, pos: [2.0, 1.42, -2.15], look: [0.05, 1.3, -3.76], fov: 28 }], t, ease);
    shot.sun = FIRE;
    K.cam = shot;
  }
  let now = { i: 0, fps: 30 };
  K.pose = () => frame(now.i, now.fps);
  K.after = cam => {
    const t = now.i / now.fps;
    if (!pillAt) { pill.style.transform = 'scale(0)'; return; }
    const s = pillAt.clone().project(cam), k = clamp((t - T.idea - 0.85) / 0.14);
    pill.style.transform = `translate(${(s.x + 1) / 2 * innerWidth}px, ${(1 - s.y) / 2 * innerHeight}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5})`;
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
