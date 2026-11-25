// Take C, the campfire (?stage=1&pile=14 as a new game; acting.js and campfire.js before this). That night: the chef
// sits by a fire next to his cut-up tuna, about to roast a piece, when a customer at the lone stand starts hammering
// its bell and waving money. He looks at the fish. He looks at the customer. "$".
(async () => {
  while (!window.K || !window.Acting || !window.Campfire) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut, easeIO, T3 } = K;
  const { Mesh, MeshLambertMaterial, CylinderGeometry } = T3;
  const { scene } = K.R;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const CT = await window.__mod('counters.ts'), STG = await window.__mod('stage.ts'), IT = await window.__mod('items.ts');
  const FX = await window.__mod('fx.ts'), A = await window.__mod('audio.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  const BEAT = 60 / 92, at = n => n * BEAT;
  const T = { ding: at(2), chef: at(4), fish: at(4.6), stand: at(6), idea: at(8), up: at(10.4), end: at(12) };

  // ---------- the set: a fire by the pile of fillets, at the dock's sea end; the stand is 12 m off to the south ----------
  const FY = 0.15, FIRE = V(0.95, FY, -3.55), SEAT = V(0.0, FY + 0.13, -3.75), PILE = V(2.1, FY, -5.0), BELL = V(3.98, 1.12, 8.28);
  const fire = Campfire(T3, scene, FIRE.x, FIRE.y, FIRE.z);
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
    fire.set(t, 1);
    if (i % 5 === 0 && Math.sin(i * 12.9898) > 0.2) crackle();
    strokes.forEach((s, n) => once('d' + n, s, t, () => ding(t < T.chef || (t >= T.stand && t < T.idea) ? 0.5 : 0.22)));
    once('idea', T.idea + 0.35, t, () => { A.tone({ f: 660, d: 0.09, type: 'triangle', v: 0.3 }); A.tone({ f: 990, d: 0.2, t: 0.09, type: 'triangle', v: 0.35 }); A.tone({ f: 1320, d: 0.3, t: 0.2, type: 'triangle', v: 0.3 }); });
    K.fade(Math.max(1 - ease(t / 0.6), ease((t - T.up - 0.35) / 0.45)));
    pillAt = null;

    // ----- the customer: both fists going, one on the bell, one full of money -----
    if (who) {
      const next = strokes.find(s => s >= t - 0.06) ?? 1e9, k = clamp(1 - (next - t) / 0.16), hitK = t > next ? 1 - clamp((t - next) / 0.06) : k * k;
      const hop = Math.abs(Math.sin(t * Math.PI / BEAT * 2)) * 0.04;
      ACT.pose(who, { hip: V(3.72, FY + 0.3 + hop, 8.7), yaw: Math.PI + Math.sin(t * 9) * 0.05, lean: 0.22, arms: [[mix(-2.75, -2.02, hitK), 0.02], [0, 2.45 + Math.sin(t * 17) * 0.4]],
        f: { brow: [0.1, 1.4], mouth: 'o', open: 1.2 + 0.6 * Math.abs(Math.sin(t * 9)) } }, whoFace);
    }
    // ----- the chef -----
    const startle = clamp((t - T.chef) / 0.12) * clamp(1 - (t - T.chef - 0.3) / 0.25), jump = Math.sin(clamp((t - T.chef) / 0.3) * Math.PI) * 0.12;
    const lookPile = easeIO((t - T.fish) / 0.3), lookStand = easeIO((t - T.stand) / 0.35);
    const ik = t - T.idea, again = ik > 0 ? (ik < 0.3 ? easeIO(ik / 0.25) : ik < 0.6 ? 1 - easeIO((ik - 0.3) / 0.25) * 2.0 : -1 + easeIO((ik - 0.6) / 0.25) * 1.0) : 0;
    // (at the idea: one more look at the fish, one more at the stand, then straight ahead, grinning)
    let yaw = mix(mix(toFire, toPile, lookPile), toStand, lookStand);
    if (ik > 0) yaw = ik < 0.3 ? mix(toStand, toPile, easeIO(ik / 0.25)) : ik < 0.6 ? mix(toPile, toStand, easeIO((ik - 0.3) / 0.25)) : mix(toStand, 0.9, easeIO((ik - 0.6) / 0.3));
    const got = ik > 0.85, rise = ease((t - T.up) / 0.35), hop2 = Math.sin(clamp((t - T.up) / 0.45) * Math.PI) * 0.3;
    const f = t < T.chef ? { eyes: 'happy', mouth: 'smile' } : t < T.fish ? { eyes: 'big', brow: [1.3, -0.3], mouth: 'o', open: 1.1 }
      : t < T.stand ? { eyes: 'dot', brow: [0.7, -0.5], mouth: 'none' } : t < T.idea ? { eyes: 'dot', brow: [0.5, -0.9], mouth: 'frown' }
        : !got ? { eyes: 'dot', brow: [0.9, 0], mouth: 'none' } : { eyes: 'dot', brow: [0.6, 0.45], mouth: 'grin', open: 1.2 };
    const sway = t < T.chef ? Math.sin(t * 2.4) * 0.05 : 0;
    chef({ hip: SEAT.clone().setY(SEAT.y + jump + rise * 0.17 + hop2), yaw, lean: mix(0.12, 0, rise), roll: sway,
      legs: [-(Math.PI / 2) * (1 - rise) + 0.25 * (1 - rise), -(Math.PI / 2) * (1 - rise) * 0.9],
      arms: [[0.3 * (1 - rise), 0.15 + startle * 0.6 + rise * 0.9], [mix(-1.15, 0, lookStand), 0.1 + startle * 0.3 + rise * 0.9]], sq: 1 + startle * 0.08, f });
    stick.visible = rise < 0.5;
    stick.rotation.x = mix(-0.55, 0.6, lookStand);
    P.updateMatrixWorld(true);
    if (got && t < T.up + 0.25) pillAt = P.position.clone().add(V(0, 1.5, 0));

    // ----- the shots -----
    let shot;
    if (t < T.ding) shot = K.path([{ t: 0, pos: [4.3, 1.5, -0.3], look: [0.8, 0.6, -4.0], fov: 38 }, { t: T.ding, pos: [4.0, 1.4, -0.7], look: [0.75, 0.6, -4.0], fov: 38 }], t, k => k);
    else if (t < T.chef) shot = K.path([{ t: T.ding, pos: [3.2, 1.95, 6.5], look: [3.78, 1.2, 8.6], fov: 34 }, { t: T.chef, pos: [3.25, 1.9, 6.65], look: [3.78, 1.2, 8.6], fov: 34 }], t, k => k);
    else if (t < T.stand) shot = { pos: V(1.95, 0.95, -1.9), look: V(0.2, 0.82, -3.7), fov: 30 };
    else if (t < T.idea) shot = K.path([{ t: T.stand, pos: [-0.75, 1.3, -5.25], look: [3.7, 1.15, 8.4], fov: 21 }, { t: T.idea, pos: [-0.7, 1.3, -5.15], look: [3.7, 1.15, 8.4], fov: 19 }], t, ease);
    else shot = K.path([{ t: T.idea, pos: [1.9, 1.05, -1.85], look: [0.1, 1.0, -3.76], fov: 28 }, { t: T.up, pos: [1.85, 1.05, -1.9], look: [0.1, 1.02, -3.76], fov: 27 }, { t: T.up + 0.4, pos: [2.0, 1.2, -1.7], look: [0.1, 1.15, -3.76], fov: 32 }], t, ease);
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
      if (who) { whoFace = ACT.face(who); bill = IT.newBill(5); bill.scale.setScalar(1.6); bill.position.set(0, -0.45, 0); bill.rotation.set(Math.PI / 2, 0, 0); who.arms[1].add(bill); }
      console.log('[cine] bell ringer', !!who, CT.C1.queue.length);
    },
    frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(4.3, 1.5, -0.3), look: V(0.8, 0.6, -4.0), fov: 38 }; },
  };
})();
