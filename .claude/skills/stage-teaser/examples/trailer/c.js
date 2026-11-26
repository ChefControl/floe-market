// Take C, the idea (?stage=1&pile=14 as a new game, night; kit.js, hero-tuna.js, acting.js and campfire.js before this).
// Round six, the owner's notes: there is NO market yet (this is where he thinks of one), so it's a bare shore: snow,
// pines, the sea, a small fire, the tuna he rode in on lying beside it. The fish he's cooking is OVER the fire. The
// first customer isn't hammering a bell (too rough): someone walks up out of the dark, stops at the edge of the
// firelight and holds out a banknote. And the camera goes where the chef looks: left, the customer; right, the fish;
// left, now two of them; right, the fillets; then him, and the idea, in the game's own bubble (not a "$" badge).
(async () => {
  while (!window.K || !window.Acting || !window.Campfire || !window.HeroTuna) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, T3, n1 } = K;
  const { Mesh, MeshLambertMaterial, CylinderGeometry, BoxGeometry, Sprite, SpriteMaterial } = T3;
  const { scene } = K.R;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const CT = await window.__mod('counters.ts'), STG = await window.__mod('stage.ts'), IT = await window.__mod('items.ts'), ST = await window.__mod('stations.ts');
  const W = await window.__mod('world.ts');
  const A = await window.__mod('audio.ts'), SFX = await window.__mod('sfx.ts'), BB = await window.__mod('bubble.ts'), RD = await window.__mod('render.ts');
  const mix = (a, b, k) => a + (b - a) * k, bump = k => Math.sin(clamp(k) * Math.PI), HP = Math.PI / 2;
  ACT.EASE.settle = k => { k = clamp(k); return k < 0.7 ? 1.06 * ease(k / 0.7) : 1.06 - 0.06 * ease((k - 0.7) / 0.3); };
  // The times. Slow in: the place, the fire, him. Then his looks, each one answered by the camera.
  const T = { cu: 2.6, hear: 3.25, seeC: 3.95, backR: 5.6, seeF: 6.35, backL: 7.7, seeC2: 8.2, backR2: 9.3, seeF2: 9.75, idea: 10.6, got: 11.05, up: 12.3, end: 13.4 }; // (the idea's bubble holds a second and a quarter before he's up)

  // ---------- the set: the open shore west of where the dock will be. Every camera looks west, north or south. ----------
  // The forest is planted afresh at random every time the game loads: the spot is FOUND each time (K.openGround), with
  // room for the fire and its people, the tuna, the customers, and a clear line to every camera.
  const FY = 0.16, SPOT = K.openGround(W, -31, -15.5, -3.5, 9, [[0, 0, 3.4], [-1.2, 3.3, 1.9], [-1.0, -2.2, 2.1], [5.3, 3.7, 1.7], [3.6, 2.5, 1.6], [2.0, 1.2, 1.5], [0.9, 0.3, 1.5], [2.4, 0.2, 1.4]]);
  console.log('[cine] open ground at ' + SPOT.x + ', ' + SPOT.z + ' with ' + SPOT.slack.toFixed(1) + ' m to spare');
  if (SPOT.slack < 0) console.log('[cine] WARNING: no clear spot this load; clearing ' + K.clearTrees(W, SPOT.x - 14, SPOT.x + 10, SPOT.z - 14, SPOT.z + 14) + ' tree meshes round it (stumps will show)');
  const FIRE = V(SPOT.x, FY, SPOT.z),
    SEAT = FIRE.clone().add(V(-0.95, 0.09, 0.1)), CUST = FIRE.clone().add(V(-0.7, 0, 3.1)), CUST2 = FIRE.clone().add(V(-1.75, 0, 3.6)), TUNA = FIRE.clone().add(V(-1.0, 0, -2.15)), SLAB = FIRE.clone().add(V(0.45, 0, -1.45));
  { // (what is the ground here, really? Everything stands at FY: measure it)
    const rc = new T3.Raycaster(), out = [], solid = []; scene.traverse(o => { if (o.isMesh && !o.isSprite) solid.push(o); });
    for (const [dx, dz] of [[0, 0], [-0.95, 0.1], [-0.7, 3.1], [0.45, -1.45], [-1.0, -2.15]]) { rc.set(V(SPOT.x + dx, 6, SPOT.z + dz), V(0, -1, 0)); const hits = rc.intersectObjects(solid, false).filter(h => h.object.visible && h.point.y < 1.2).slice(0, 3);
      out.push(hits.map(h => h.point.y.toFixed(3) + ' ' + (h.object.name || h.object.geometry?.type || '?')).join(' / ')); }
    console.log('[cine] GROUND under fire, seat, customer, slab, tuna: ' + out.join(' || ')); }
  const fire = Campfire(T3, scene, FIRE.x, FIRE.y, FIRE.z);
  // his catch: the tuna, on its side on the snow, and a few fillets cut from it, laid flat on a slab of ice
  const tuna = HeroTuna(T3); tuna.g.rotation.order = 'YZX'; tuna.g.scale.setScalar(2.1); scene.add(tuna.g);
  tuna.set({ wide: 0, look: [0, 0], brow: 0, lid: 0, mouth: 0, smile: 0, flare: 0, dead: true, amp: 0, swim: 0 });
  { const moon = new T3.PointLight(0x9FC4FF, 2.6, 8, 1.3); moon.position.copy(TUNA).add(V(0.9, 1.7, 0.5)); scene.add(moon); } // (no warm fill beside it: half a metre from the ice slab, it bleached the slab white) // (a cold light on its back, off the sea: by firelight alone it's a black lump)
  tuna.g.position.copy(TUNA).setY(FY + 0.3); tuna.g.rotation.set(HP * 0.9, 0.8, 0.04); // (on its side, its head to the fire: its eye and its fins are what say 'a fish')
  const slab = new Mesh(new CylinderGeometry(0.62, 0.68, 0.12, 7), new MeshLambertMaterial({ color: 0xD5ECF5 })); slab.position.copy(SLAB).setY(FY + 0.06); slab.rotation.y = 0.4; slab.castShadow = true; scene.add(slab);
  [[-0.24, 0.1, 0.3], [0.12, -0.14, -0.5], [0.26, 0.2, 1.3], [-0.08, -0.3, 2.2]].forEach(([x, z, r]) => { const f = IT.newFillet(); f.scale.setScalar(0.95); f.position.set(SLAB.x + x, FY + 0.13, SLAB.z + z); f.rotation.y = r; scene.add(f); });
  const P = player.g, setFace = ACT.face(P), chef = o => ACT.pose(P, o, setFace);
  ACT.soles(P); ACT.castaway(P);
  // a stick with a piece of the tuna on it, from his hand to the flames: the fish is IN the fire's heat, wherever his hand goes
  const stick = new Mesh(new CylinderGeometry(0.012, 0.016, 1, 5), new MeshLambertMaterial({ color: 0x7A5236 })); stick.geometry.translate(0, 0.5, 0); scene.add(stick);
  const morsel = IT.newFillet(); morsel.scale.setScalar(0.5); scene.add(morsel);
  // the game's own bubbles: an order over a customer's head (fish, one), and the idea over his: fish = $
  const bubble = draw => { const t = RD.canvasTex(128, 128, draw), s = new Sprite(new SpriteMaterial({ map: t.tex, depthTest: false })); s.visible = false; s.renderOrder = 9; scene.add(s); return s; };
  const order1 = bubble((c, w, h) => BB.drawBubble(c, w, h, 1, 1, 'fish')), order2 = bubble((c, w, h) => BB.drawBubble(c, w, h, 2, 1, 'fish')), thought = bubble((c, w, h) => BB.drawNeed(c, w, h, 'fish', '= $'));
  const popAt = (s, at, t, t0, size = 0.62) => { const k = clamp((t - t0) / 0.16); s.visible = t >= t0; if (!s.visible) return; s.position.copy(at); s.scale.setScalar(size * (k + 0.42 * Math.sin(k * Math.PI)) * (1 + 0.025 * Math.sin(t * 3.1))); };

  let who = null, who2 = null, face1 = null, face2 = null;
  // (a soft shade where each customer stands: the game's moon shadow lies off to one side, and without something dark under
  // their boots they look as if they hang over it)
  const under = [0, 1].map(() => { const m = new Mesh(new T3.CircleGeometry(0.24, 16), new T3.MeshBasicMaterial({ color: 0x0B1620, transparent: true, opacity: 0.4, depthWrite: false })); m.rotation.x = -HP; m.visible = false; m.renderOrder = 2; scene.add(m); return m; });
  // The game's moon shadow lies a good half metre off whatever casts it (it's set up for a camera high overhead): from
  // down here a thing and its shadow apart read as the thing hanging in the air. So nothing in this scene casts one,
  // and each has a soft shade right under it, as the customers do.
  const shadeAt = (x, z, rx, rz, yaw = 0, o = 0.4) => { const m = new Mesh(new T3.CircleGeometry(1, 20), new T3.MeshBasicMaterial({ color: 0x0B1620, transparent: true, opacity: o, depthWrite: false })); m.rotation.set(-HP, 0, yaw); m.scale.set(rx, rz, 1); m.position.set(x, FY + 0.012, z); m.renderOrder = 2; scene.add(m); return m; };
  const seatShade = shadeAt(SEAT.x + 0.12, SEAT.z, 0.5, 0.36, 0, 0.42); shadeAt(SLAB.x, SLAB.z, 0.8, 0.8, 0, 0.36); shadeAt(TUNA.x, TUNA.z, 1.75, 0.62, 0.8, 0.4);
  for (const o of [P, slab, tuna.g]) o.traverse(m => { m.castShadow = false; });
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const toFire = yawTo(SEAT, FIRE), toCust = yawTo(SEAT, CUST), toFish = yawTo(SEAT, SLAB), toUs = toFire + 0.42;

  // The chef, pose to pose. h: his hips over where he sits; up: 0 sitting, legs out, to 1 on his feet; arms [swing, out].
  const S = ACT.track([
    { t: 0, h: 0, yaw: toFire, tip: 0.14, roll: 0, up: 0, a00: 0.3, a01: 0.15, a10: -1.1, a11: 0.12, sq: 1 },
    // (turning his supper in the heat: a lean in, and back; again)
    { t: 1.1, mv: 0.5, tip: 0.22, a10: -1.2 }, { t: 1.9, mv: 0.6, tip: 0.12, a10: -1.08 }, { t: 2.9, mv: 0.5, tip: 0.2, a10: -1.18 },
    // a step in the snow, behind him. He stops; and looks round (a little the other way first)
    { t: T.hear + 0.1, mv: 0.1, sq: 0.97, tip: 0.1 },
    { t: T.hear + 0.3, mv: 0.1, yaw: toFire - 0.12 }, { t: T.hear + 0.62, mv: 0.3, e: 'settle', yaw: toCust, tip: 0.04, sq: 1 },
    // ...round to his fish (out of shot he's still looking at them; when the shot's back he turns)
    { t: T.backR + 0.14, mv: 0.12, yaw: toCust + 0.1 }, { t: T.backR + 0.56, mv: 0.4, e: 'settle', yaw: toFish, tip: 0.1 },
    // ...and back: more of them? Quicker now
    { t: T.backL + 0.38, mv: 0.3, e: 'settle', yaw: toCust, tip: 0.02, sq: 1.03 },
    { t: T.backR2 + 0.36, mv: 0.28, e: 'settle', yaw: toFish, tip: 0.12, sq: 1 },
    // the idea: he's still on the fish; a blink; a little drop as it lands; and round to us, grinning
    { t: T.idea + 0.3, mv: 0.2, sq: 0.94, tip: 0.16 },
    { t: T.got + 0.2, mv: 0.24, e: 'settle', yaw: toUs, sq: 1.05, tip: 0, a00: 0.1, a01: 0.35 }, { t: T.got + 0.42, mv: 0.2, sq: 1 },
    // up: forward over his knees (the wind-up), a spring, both arms thrown up one after the other, down and a settle
    { t: T.up - 0.02, mv: 0.16, tip: 0.36, sq: 0.9, a00: 0.5, a10: 0.4, a11: 0.3 },
    { t: T.up + 0.2, mv: 0.2, e: 'out', h: 0.5, up: 1, tip: 0.02, sq: 1.1, a00: 0, a01: 2.5, a10: 0, a11: 2.25 },
    { t: T.up + 0.38, mv: 0.18, e: 'in', h: 0.17, sq: 1.04, a11: 2.45, a01: 2.2 }, { t: T.up + 0.44, mv: 0.06, e: 'out', sq: 0.85 },
    { t: T.up + 0.72, mv: 0.26, e: 'settle', sq: 1, a00: -0.25, a01: 1.15, a10: 0.1, a11: 0.75 },
  ]);

  const said = new Set(), once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const crackle = (k = 1) => A.noise({ f: 1700 + 1400 * k, q: 3, d: 0.03, v: 0.21 * k, at: FIRE });
  /** A customer walking up and standing there: in from `from` over `walk` seconds from `t0`, then waiting, shy and hopeful. */
  function customer(g, setF, at, from, t, t0, walk, offer, seed) {
    if (!g) return;
    const k = clamp((t - t0) / walk), on = ease(k), pos = from.clone().lerp(at, on), here = k >= 1, w = t - t0 - walk;
    const stride = here ? 0 : Math.sin(k * walk * 9.5) * 0.6, bob = here ? 0 : Math.abs(Math.sin(k * walk * 9.5)) * 0.03;
    // (arrived: a rock onto his toes, a sniff of the air (his head back, twice), and the note comes up, held out in both hands' way)
    const sniff = here ? bump((w - 0.15) / 0.3) + bump((w - 0.5) / 0.26) : 0, give = here ? ACT.EASE.settle((t - offer) / 0.35) : 0, wag = give * Math.sin(t * 5.2 + seed) * 0.09;
    ACT.pose(g, { hip: V(pos.x + n1(t * 0.7, seed) * 0.012, FY + 0.3 + bob + 0.02 * sniff, pos.z), /* (their feet are 0.3 under their hips: at +0.62, right for the old stand's step, they hung in the air here) */ yaw: yawTo(pos, FIRE) + n1(t * 0.9, seed + 1) * 0.05, lean: mix(0.14, 0.03, on) - 0.1 * sniff + 0.07 * give, roll: n1(t * 1.1, seed + 2) * 0.03,
      legs: [stride, -stride], arms: [[-stride * 0.5 * (1 - give) - 1.25 * give + wag, 0.1 + 0.12 * give], [stride * 0.5, 0.12 + 0.2 * sniff]], sq: 1 + 0.03 * sniff,
      f: give > 0.3 ? { brow: [0.9, -0.5], mouth: 'smile' } : sniff > 0.2 ? { eyes: 'shut', brow: [0.8, -0.2], mouth: 'o', open: 0.7 } : { brow: [0.6, -0.4], mouth: 'none' } }, setF);
    g.visible = t > t0 - 0.05;
  }

  let air0 = null, now = { i: 0, fps: 30 };
  function frame(i, fps) {
    const t = i / fps;
    player.tPick = player.tDrop = player.tCatch = player.tCash = 9;
    STG.setNight(0.8);
    { const fishy = (t >= T.seeF && t < T.backL) || (t >= T.seeF2 && t < T.idea); fire.set(t, fishy ? 0.62 : 0.9, 0.95); } // (lower while the camera's beside it: its glow bleaches the lens)
    if (ST.blade) ST.blade.visible = false;
    // ---------- sound: the fire, the sea a way off, snow underfoot; nothing loud ----------
    if (t >= 0.03 && !air0) air0 = { fire: K.soft(A, { kind: 'lowpass', f: 300, q: 0.5, smooth: 600 }), sea: K.soft(A, { kind: 'lowpass', f: 420, q: 0.5, smooth: 800 }) };
    if (air0) { const on = (0.3 + 0.7 * ease((t - 0.03) / 0.7)) * (1 - ease((t - T.end + 0.6) / 0.5)); // (it comes in already there: the sea from the scene before, carried through the black)
      air0.fire.to(0.1 * Math.max(0.2, 0.6 + 0.3 * n1(t * 1.9, 3) + 0.2 * n1(t * 5.3, 8)) * on, 0.08); air0.sea.to(0.06 * K.swell(t + 1.5, 2.9, 4.4) * on); }
    { const r = (n1(i * 7.31, 11) + 1) / 2, r2 = (n1(i * 3.17 + 40, 23) + 1) / 2; if (r > 0.88) crackle(0.63 + 0.95 * r2); }
    // (his first steps, heard before he's seen; then each one in the snow as he comes into the light)
    for (const [k, at2, v] of [['st0', T.hear - 0.1, 0.5], ['st1', T.hear + 0.42, 0.6], ['st2', T.seeC + 0.12, 0.8], ['st3', T.seeC + 0.45, 0.8], ['st4', T.seeC + 0.76, 0.7], ['st5', T.backL + 0.1, 0.5], ['st6', T.backL + 0.42, 0.6], ['st7', T.seeC2 + 0.2, 0.7]])
      once(k, at2, t, () => { A.noise({ f: 900, f2: 420, q: 0.9, d: 0.11, a: 0.012, v: 0.11 * v }); A.tone({ f: 120, f2: 80, d: 0.07, v: 0.09 * v }); });
    once('huh', T.hear + 0.5, t, () => { A.tone({ f: 520, f2: 620, d: 0.1, type: 'triangle', v: 0.1 }); });
    once('ord1', T.seeC + 1.02, t, () => SFX.pop()); once('ord2', T.seeC2 + 0.42, t, () => SFX.pop());
    once('note', T.seeC + 1.22, t, () => A.noise({ f: 2400, f2: 1500, q: 1.2, d: 0.08, v: 0.06 }));
    once('idea', T.got - 0.03, t, () => { A.tone({ f: 660, d: 0.09, type: 'triangle', v: 0.14 }); A.tone({ f: 990, d: 0.2, t: 0.09, type: 'triangle', v: 0.162 }); A.tone({ f: 1320, d: 0.3, t: 0.2, type: 'triangle', v: 0.14 }); /* (2.6 dB down: it stood 13 LU over the quietest scene in the film) */ });
    once('hop', T.up + 0.4, t, () => { A.tone({ f: 150, f2: 70, d: 0.09, v: 0.2 }); A.noise({ f: 900, kind: 'lowpass', d: 0.06, v: 0.1 }); });
    // (in softly: a slow fade up; out after he's landed)
    K.fade(Math.max(1 - ease(t / 0.9), ease((t - T.up - 0.6) / 0.45))); K.vignette(0.62);

    // ---------- the customers ----------
    customer(who, face1, CUST, CUST.clone().add(V(-0.5, 0, 2.6)), t, T.hear - 0.2, T.seeC + 0.8 - T.hear + 0.2, T.seeC + 1.15, 21);
    customer(who2, face2, CUST2, CUST2.clone().add(V(-0.9, 0, 2.8)), t, T.backL - 0.1, T.seeC2 + 0.3 - T.backL + 0.1, T.seeC2 + 0.75, 31);
    [who, who2].forEach((g, n) => { under[n].visible = !!g && g.visible; if (g) under[n].position.set(g.position.x, FY + 0.012, g.position.z); });
    if (who) popAt(order1, who.position.clone().add(V(0, 1.72, 0)), t, T.seeC + 1.0); if (who2) popAt(order2, who2.position.clone().add(V(0, 1.72, 0)), t, T.seeC2 + 0.4);

    for (const g of [P, who, who2]) g?.traverse(m => { if (m.castShadow) m.castShadow = false; }); // (every frame: the game dresses them again as it goes, shadows and all)
    // ---------- the chef ----------
    const p = S(t), pa = S(t - 0.05), pb = S(t - 0.1), got = t > T.got;
    const blink = (a, d = 0.09) => t >= a && t < a + d;
    const f = t < T.hear + 0.2 ? { eyes: 'happy', mouth: 'smile' } : t < T.backR ? { eyes: blink(T.hear + 0.9) ? 'shut' : 'big', brow: [1.2, -0.3], mouth: 'o', open: 0.9 }
      : t < T.idea ? { eyes: blink(T.backL + 0.1) ? 'shut' : 'dot', brow: [0.8, -0.5], mouth: 'none' }
        : !got ? { eyes: blink(T.idea + 0.25, 0.1) ? 'shut' : 'dot', brow: [0.9, 0], mouth: 'none' } : { eyes: t > T.up - 0.1 ? 'happy' : 'dot', brow: [0.6, 0.45], mouth: 'grin', open: 0.7 + 0.5 * clamp((t - T.got) / 0.15) };
    const breath = 1 + Math.sin(t * 2.5) * 0.014;
    chef({ hip: SEAT.clone().setY(SEAT.y + p.h), yaw: p.yaw + n1(t * 0.5, 2) * 0.03, lean: p.tip + n1(t * 0.6, 1) * 0.015, roll: n1(t * 0.45, 3) * 0.035 * (1 - p.up),
      legs: [(-HP + 0.25) * (1 - p.up), -HP * 0.9 * (1 - p.up)],
      arms: [[pa.a00, pa.a01 + n1(t * 0.8, 4) * 0.03], [pb.a10 + n1(t * 0.9, 5) * 0.04, pb.a11 + n1(t * 0.7, 6) * 0.03]], sq: p.sq * breath, f });
    P.updateMatrixWorld(true);
    // the stick: from his hand to a spot in the flames (it turns, slowly, and his hand drifts: the spot wanders a little)
    { const hand = P.arms[1].localToWorld(V(0, -0.42, 0)), tip = FIRE.clone().add(V(-0.02 + n1(t * 0.6, 7) * 0.03, 0.5 + n1(t * 0.8, 8) * 0.02, 0.02)), d = tip.clone().sub(hand), len = d.length();
      stick.visible = morsel.visible = p.up < 0.4; stick.position.copy(hand); stick.scale.set(1, len, 1); stick.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
      morsel.position.copy(tip).add(V(0, 0.01, 0)); morsel.rotation.set(Math.sin(t * 0.9) * 0.25, t * 0.5, 0.1); }
    popAt(thought, P.position.clone().add(V(0, 1.72 + p.h, 0)), t, T.got, 0.7); if (t > T.up + 0.02) thought.visible = false;

    // ---------- the shots: all held, each with a little move of its own ----------
    let shot;
    const hd = SEAT.clone().add(V(0.05, 0.95 + 0.6 * p.h, 0));
    if (t < T.cu) shot = K.held(K.path([{ t: 0, pos: [FIRE.x + 5.6, 2.15, FIRE.z + 3.9], look: [FIRE.x - 0.9, 0.62, FIRE.z - 0.5], fov: 36 }, { t: T.cu, pos: [FIRE.x + 5.0, 2.0, FIRE.z + 3.5], look: [FIRE.x - 0.9, 0.64, FIRE.z - 0.45], fov: 35 }], t, ease), t, 0.8, 31);
    else if (t < T.seeC || (t >= T.backR && t < T.seeF) || (t >= T.backL && t < T.seeC2) || (t >= T.backR2 && t < T.seeF2))
      // on him, over the fire: its light on his face, the dark behind. It goes a little the way he turns.
      { const yl = (S(t - 0.1).yaw + S(t - 0.25).yaw + S(t - 0.4).yaw + S(t - 0.55).yaw) / 4; // (it follows his turn late and slowly: on his own yaw it lurched across in three frames)
        shot = K.held({ pos: V(FIRE.x + 1.75, 1.2, FIRE.z + 1.15), look: V(hd.x, SEAT.y + 0.74, hd.z + Math.sin(yl - toFire) * -0.16), fov: 27 }, t, 1.3, 32); } // (his face in the middle, and the fire in the corner under it, his supper in it: aimed over his hat, the flame's tip came and went at the bottom edge)
    else if ((t >= T.seeC && t < T.backR) || (t >= T.seeC2 && t < T.backR2)) {
      // LEFT, what he sees: someone at the edge of the firelight (the second time, two of them)
      const two = t >= T.seeC2, t0 = two ? T.seeC2 : T.seeC, k = (t - t0) / ((two ? T.backR2 : T.backR) - t0), c = two ? CUST.clone().lerp(CUST2, 0.5) : CUST;
      shot = K.held({ pos: V(FIRE.x + 0.75 - 0.12 * k, 1.3, FIRE.z + 0.2 - 0.1 * k), look: V(c.x + 0.05 - 0.12 * k, 1.12, c.z), fov: two ? 44 : 40 }, t, 1.2, two ? 34 : 33); // (room over their heads for what they want)
    } else if ((t >= T.seeF && t < T.backL) || (t >= T.seeF2 && t < T.idea)) {
      // RIGHT, what he sees: the tuna in the firelight, and what he's cut from it (closer the second time: the fillets)
      const near = t >= T.seeF2, t0 = near ? T.seeF2 : T.seeF, k = (t - t0) / ((near ? T.idea : T.backL) - t0);
      shot = near ? K.held({ pos: V(FIRE.x + 1.05 - 0.06 * k, 1.55, FIRE.z - 0.55), look: V(SLAB.x - 0.05, FY + 0.16, SLAB.z - 0.05), fov: 30 - 2 * k }, t, 1.1, 36) // (down on them: from lower the tuna's dark belly filled the top third)
        : K.held({ pos: V(FIRE.x + 1.9 - 0.15 * k, 1.4, FIRE.z - 0.5), look: V(mix(SLAB.x, TUNA.x, 0.4) + 0.12 * k, FY + 0.3, mix(SLAB.z, TUNA.z, 0.4)), fov: 36 }, t, 1.2, 35); // (past him: what he sees is the fish, and his own face was cut in half by the frame's edge)
    } else { const hy = 0.17 * ease(S(t - 0.08).up), kI = ACT.EASE.settle((t - T.got) / 0.3);
      // on him: the idea; and up with him as he gets to his feet (it doesn't chase the hop: he jumps IN the picture)
      shot = K.held({ pos: V(FIRE.x + 1.8, 1.26, FIRE.z + 1.0), look: hd.clone().add(V(0, 0.08, 0)), fov: 30 - 1.5 * kI }, t, 1.2, 37);
      shot.look.y += hy * 0.9; shot.pos.y += hy * 0.5; shot.fov += hy * 34; }
    shot.sun = FIRE; shot.near = 1.2; // (no snowflake on the lens)
    K.cam = shot;
  }
  K.pose = () => frame(now.i, now.fps);
  window.cine = {
    len: T.end,
    async setup() {
      player.held = true;
      // (the game's own first customers: borrowed from the queue at the stand that isn't in this scene)
      for (let n = 0; n < 260 && !(CT.C1.queue[0]?.queued && CT.C1.queue[1]); n++) await new Promise(r => setTimeout(r, 100));
      who = CT.C1.queue[0]?.g ?? null; who2 = CT.C1.queue[1]?.g ?? null; for (const g of [who, who2]) g?.traverse(m => { m.castShadow = false; });
      for (const c of CT.C1.queue) { c.bubble.visible = false; c.mood.visible = false; }
      if (who) { face1 = ACT.face(who); const b = IT.newBill(5); b.scale.setScalar(1.3); b.position.set(0, -0.45, 0); b.rotation.set(HP, 0, 0); who.arms[0].add(b); }
      if (who2) { face2 = ACT.face(who2); const b = IT.newBill(5); b.scale.setScalar(1.3); b.position.set(0, -0.45, 0); b.rotation.set(HP, 0, 0); who2.arms[0].add(b); }
      console.log('[cine] customers', !!who, !!who2, CT.C1.queue.length);
    },
    frame(i, fps) { now = { i, fps }; for (const c of CT.C1.queue) { c.bubble.visible = false; c.mood.visible = false; c.wait = 0; c.held = 0; } /* (and their patience never runs out: a customer who gives up is taken off by the game) */ if (!K.cam) K.cam = { pos: V(FIRE.x + 5.6, 2.15, FIRE.z + 3.9), look: V(FIRE.x - 0.9, 0.62, FIRE.z - 0.5), fov: 36 }; },
  };
})();
