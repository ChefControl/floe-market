// Acting for the game's people in a clip (after kit.js): a face, a pose, and what a castaway wears.
// The game's people are built to walk and carry; these are worn only in the clip.
//   const A = await Acting(); const face = A.face(person); A.pose(person, { hip, yaw, ..., f: { brow: [0.8, -0.8], mouth: 'frown' } }, face)
window.Acting = async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V, T3 } = K;
  const { Group, Mesh, MeshLambertMaterial, TorusGeometry, SphereGeometry, BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide } = T3;
  const INK = 0x1B2733, INSIDE = 0x5A1E24, lam = c => new MeshLambertMaterial({ color: c, side: DoubleSide });
  const ball = new SphereGeometry(1, 14, 10), box = new BoxGeometry(1, 1, 1), arch = new TorusGeometry(1, 0.24, 6, 14, Math.PI), halfDisc = new CircleGeometry(1, 16, Math.PI, Math.PI);

  /** A face for `P`, from the game's own face parts (characters.ts `face`), laid over their dot eyes. Returns
   *  set({ eyes, brow, mouth, open }): eyes 'dot' (their own), 'big' (the dots grown: startled), 'shut', 'happy';
   *  brow null or [how high 0..1, tilt: + a scowl, - worry]; mouth 'none' | 'o' | 'smile' | 'frown' | 'grin' | 'chatter'.
   *  (No whites to the eyes: on these faces round eyes with pupils stare.) */
  function face(P) {
    const part = (geo, c) => { const m = new Mesh(geo, lam(c)); m.visible = false; P.body.add(m); return m; };
    const F = {
      brows: [-1, 1].map(() => part(box, INK)), bigs: [-1, 1].map(() => part(ball, INK)), glints: [-1, 1].map(() => part(ball, 0xFFFFFF)),
      covers: [-1, 1].map(() => part(ball, P.style.skin)), arcs: [-1, 1].map(() => part(arch, INK)),
      o: part(ball, INSIDE), smile: part(arch, INK), grin: part(halfDisc, INSIDE), teeth: part(box, 0xFFFFFF), gum: part(box, INK),
    };
    // THEIR OWN EYES are the eyes: the game's dots, with the glint the game gives them. Wide is those same dots a third
    // bigger; shut and happy put them away and draw a lid line. (Ink discs laid over them, twice their size and with a
    // glint of their own beside the game's, were two pairs of eyes at once: the owner called it creepy.)
    // (The game bakes all a person wears, eyes included, into one mesh (characters.ts `pieces`, `wear()`). So their eye
    // pieces are taken out of that list and the mesh baked again without them, and the same shapes, in the same places,
    // are put back as meshes of their own that a face can size and hide. Done again whenever the game re-dresses them.)
    const own = { dots: [], glints: [] };
    const near = (p, x, y, z) => Math.abs(Math.abs(p.x) - x) < 0.02 && Math.abs(p.y - y) < 0.004 && Math.abs(p.z - z) < 0.004;
    const theirs = () => {
      const eyeish = p => p.o && (near(p.o.position, 0.07, 1.06, 0.24) || near(p.o.position, 0.075, 1.071, 0.264));
      if (!P.pieces || !P.pieces.some(eyeish)) return own;
      const took = P.pieces.filter(eyeish); P.pieces = P.pieces.filter(p => !eyeish(p)); P.wear();
      if (!own.dots.length) for (const p of took) { const m = new Mesh(p.geo, lam(p.c)); m.position.copy(p.o.position); m.scale.copy(p.o.scale); m.rotation.copy(p.o.rotation); m.userData.s0 = m.scale.clone(); P.body.add(m);
        (near(p.o.position, 0.07, 1.06, 0.24) ? own.dots : own.glints).push(m); }
      console.log('[cine] face: their own eyes taken over: ' + own.dots.length + ' dots, ' + own.glints.length + ' glints');
      return own;
    };
    return ({ eyes = 'dot', brow = null, mouth = 'none', open = 1 } = {}) => {
      { const { dots, glints } = theirs(), open2 = eyes === 'dot' || eyes === 'big', k = eyes === 'big' ? 1.32 : 1;
        for (const o of dots) { o.visible = open2; o.scale.copy(o.userData.s0).multiplyScalar(k); }
        for (const o of glints) { o.visible = open2; o.scale.copy(o.userData.s0).multiplyScalar(eyes === 'big' ? 1.2 : 1); } }
      [-1, 1].forEach((s, i) => {
        const x = s * 0.07, b = F.brows[i], g = F.bigs[i], gl = F.glints[i], c = F.covers[i], a = F.arcs[i];
        b.visible = !!brow;
        // (in ink and proud of the face, so they show over a fringe or under a hat's brim)
        if (brow) { b.scale.set(0.072, 0.017, 0.014); b.position.set(x, 1.106 + brow[0] * 0.024, 0.252); b.rotation.set(-0.35, 0, s * brow[1] * 0.45); }
        g.visible = gl.visible = false;
        if (false) { g.scale.set(0.04, 0.043, 0.006); g.position.set(x, 1.06, 0.237); gl.scale.set(0.011, 0.011, 0.004); gl.position.set(x + 0.013, 1.074, 0.243); } // (flat to his face: as balls they stood out of it like goggles whenever he turned side on)
        a.visible = eyes === 'shut' || eyes === 'happy'; c.visible = false; // (no skin patch needed: their dots are put away)
        if (a.visible) {
          a.scale.setScalar(0.026); a.position.set(x, eyes === 'happy' ? 1.05 : 1.066, 0.262); a.rotation.z = eyes === 'happy' ? 0 : Math.PI;
        }
      });
      const y = 0.965, z = 0.246;
      F.o.visible = mouth === 'o';
      F.o.scale.set(0.02 * (0.8 + 0.3 * open), 0.026 * open, 0.012); F.o.position.set(0, y, z); F.o.rotation.x = 0.33;
      F.smile.visible = mouth === 'smile' || mouth === 'frown';
      F.smile.scale.set(0.04, 0.03, 0.03); F.smile.position.set(0, y + (mouth === 'smile' ? 0.02 : -0.022), z); F.smile.rotation.set(0.33, 0, mouth === 'smile' ? Math.PI : 0);
      F.grin.visible = mouth === 'grin'; F.teeth.visible = mouth === 'grin' || mouth === 'chatter'; F.gum.visible = mouth === 'chatter';
      F.grin.scale.set(0.05, 0.046 * open, 1); F.grin.position.set(0, y + 0.014, z + 0.002); F.grin.rotation.x = 0.33;
      F.teeth.scale.set(0.072, 0.012, 0.004); F.teeth.position.set(0, y + 0.008, z + 0.008); F.teeth.rotation.x = 0.33;
      // chattering: a flat strip of teeth in a dark line, no curve to it (a curve reads as a smile), jumping with `open`
      if (mouth === 'chatter') {
        F.gum.scale.set(0.066, 0.03, 0.004); F.gum.position.set(0, y + 0.002, z + 0.004); F.gum.rotation.x = 0.33;
        F.teeth.scale.set(0.056, 0.014, 0.004); F.teeth.position.set(0, y + 0.002 + (open - 0.5) * 0.008, z + 0.008);
      }
    };
  }

  /** Poses `P`: hips at `hip` (or feet at `feet`), facing `yaw`, tipped back by `back` (π/2: flat on their back) or
   *  forward by `lean`, legs swung from straight down, arms [forward swing, out to the side] each, `sq` a squash (under
   *  1) or a stretch. Call it after the game's tick (K.pose), whose own walk cycle it replaces for the shot. */
  function pose(P, { hip, feet, yaw, back = 0, legs = [0, 0], arms = [[0, 0.08], [0, 0.08]], lean = 0, roll = 0, sq = 1, f = {} }, setFace) {
    P.rotation.order = 'YXZ';
    P.rotation.set(-back + lean, yaw, roll);
    if (feet) P.position.copy(feet);
    else P.position.copy(hip).sub(V(0, 0.3, 0).applyEuler(P.rotation)); // (their hips are 0.3 up their body)
    P.body.position.y = 0; P.body.rotation.set(0, 0, 0); P.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    P.legs[0].rotation.x = legs[0]; P.legs[1].rotation.x = legs[1];
    P.arms[0].rotation.set(arms[0][0], 0, -arms[0][1]); P.arms[1].rotation.set(arms[1][0], 0, arms[1][1]);
    P.visible = true;
    setFace?.(f);
  }

  /** Soles under their boots: the game's legs are open tubes, seen from below when someone lies down. */
  function soles(P) {
    // (the shoe is half a ball, open underneath, longer than it's wide: the sole is that shape, a leather colour and not a
    // black round, which read as a hole; a darker heel so it's plainly the bottom of a shoe)
    for (const l of P.legs) {
      const s = new Mesh(new CircleGeometry(1, 14), new MeshLambertMaterial({ color: 0x9C6644, side: 2 })); s.rotation.x = Math.PI / 2; s.position.set(0, -0.2995, 0.025); s.scale.set(0.069, 0.101, 1); l.add(s);
      const h = new Mesh(new CircleGeometry(1, 10, 0, Math.PI), new MeshLambertMaterial({ color: 0x6B4A35, side: 2 })); h.rotation.set(Math.PI / 2, 0, Math.PI); h.position.set(0, -0.3005, 0.012); h.scale.set(0.058, 0.05, 1); l.add(h);
    }
  }

  /** A castaway: out of the parka and into the game's own summer clothes (characters.ts dresses anyone for a season),
   *  on the ice: a faded T-shirt gone ragged at the hem, torn and stained, a rope for a belt, a battered straw hat in
   *  place of the summer's sunglasses (his eyes have to show), seaweed on a shoulder. (Tried first and turned down by
   *  the owner: a life vest, then the parka itself stained and torn.) */
  function castaway(P, { color = 0xD0623F } = {}) {
    const was = { season: P.season, style: P.style, color: P.color };
    P.season = 'summer'; P.style = { ...P.style, summer: 'straw', summerC: 0x8A5A3A }; P.color = color; P.redress();
    const g = new Group(), cloth = lam(color), dark = lam(0x9A4A30), grime = lam(0x8A5A44), hole = lam(0x2B1A14), skin = lam(P.style.skin);
    const add = (geo, m, x, y, z, s, r) => { const o = new Mesh(geo, m); o.position.set(x, y, z); if (s) o.scale.set(...s); if (r) o.rotation.set(...r); g.add(o); return o; };
    /** On the shirt at angle `a` round him (0 his front) and height `y`: it hangs as a cone, wider at the hem. */
    const R = y => 0.275 - (y - 0.3) * 0.085, on = (a, y, out = 0.004) => [Math.sin(a) * (R(y) + out), y, Math.cos(a) * (R(y) + out)];
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [a, y, w, h, m] of [[0.4, 0.42, 0.12, 0.04, grime], [-0.8, 0.66, 0.05, 0.09, dark], [2.5, 0.6, 0.13, 0.05, grime], [-2.5, 0.45, 0.1, 0.04, dark], [0.15, 0.8, 0.025, 0.02, grime],
      [1.4, 0.44, 0.03, 0.05, dark], [-1.4, 0.74, 0.07, 0.025, grime]]) add(ball, m, ...on(a, y, -0.004), [w, h, 0.012], [0, a, rnd() * 3]);
    // the hem in tatters: ragged tongues of cloth hanging off it all the way round, no two the same
    for (let i = 0; i < 15; i++) {
      const a = i / 15 * Math.PI * 2 + rnd() * 0.2, len = 0.035 + rnd() * 0.075, w = 0.03 + rnd() * 0.03;
      add(new CylinderGeometry(w, 0.004, len, 3, 1), i % 4 ? cloth : dark, ...on(a, 0.3 - len / 2 + 0.012, -0.006), [1, 1, 0.25], [0, a, (rnd() - 0.5) * 0.5]);
    }
    // holes: one at the shoulder and one at the side, skin showing through a dark, frayed edge
    for (const [a, y, w, h, r] of [[0.85, 0.78, 0.034, 0.022, 0.5], [-1.1, 0.5, 0.032, 0.045, -0.3]]) {
      add(ball, hole, ...on(a, y, 0.001), [w, h, 0.008], [0, a, r]); add(ball, skin, ...on(a, y, 0.004), [w * 0.72, h * 0.68, 0.008], [0, a, r]);
    }
    // a patch on the front, sewn on in a hurry
    add(box, lam(0x8E9AA3), ...on(-0.3, 0.6, 0.003), [0.085, 0.075, 0.008], [0, -0.3, 0.12]);
    for (const [dx, dy] of [[-0.03, 0.03], [0.03, 0.03], [-0.03, -0.03], [0.03, -0.03]]) add(box, hole, ...on(-0.3 + dx * 3.6, 0.6 + dy, 0.008), [0.016, 0.005, 0.004], [0, -0.3, 0.8]);
    // a rope for a belt, knotted at the front with an end hanging (it's what he ropes the tuna with)
    const rope = lam(0xC9A66B);
    g.userData.belt = [add(new TorusGeometry(R(0.5) + 0.006, 0.02, 6, 20), rope, 0, 0.5, 0, null, [Math.PI / 2, 0, 0]),
      add(ball, rope, ...on(0.25, 0.5, 0.02), [0.035, 0.035, 0.03]),
      add(new CylinderGeometry(0.014, 0.014, 0.14, 5), rope, ...on(0.3, 0.42, 0.02), null, [0, 0, 0.25])]; // (so a shot can have him take it off)
    // seaweed over a shoulder, down his back
    const weed = lam(0x3F7D4A);
    for (let k = 0; k < 5; k++) add(box, weed, ...on(2.2 - k * 0.05, 0.86 - k * 0.075, 0.012), [0.035 - k * 0.003, 0.085, 0.008], [0.1, 2.2, 0.25 * Math.sin(k * 1.7)]);
    P.body.add(g);
    // one trouser leg torn off at the knee
    const t = new Mesh(new CylinderGeometry(0.078, 0.082, 0.025, 8, 1, true), hole); t.position.y = -0.12; P.legs[1].add(t);
    const shin = new Mesh(new CylinderGeometry(0.068, 0.062, 0.13, 8), skin); shin.position.y = -0.19; P.legs[1].add(shin);
    /** Back into what they had on before. */
    g.userData.restore = () => { P.body.remove(g); P.legs[1].remove(t, shin); Object.assign(P, was); P.redress(); };
    return g;
  }
  // ---------- weight: what makes a posed move read as done by a body, not a formula ----------
  /** Smooth noise, -1..1, never repeating: for a shiver, a breath, a held camera (a sine there reads as a machine). */
  const n1 = (x, s = 0) => { const h = k => { const v = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (h(i) + (h(i + 1) - h(i)) * u) * 2 - 1; };
  const c01 = k => Math.min(1, Math.max(0, k));
  /** How a move gets to its pose: 'io' gently off and on, 'out' fast off and soft on (arriving), 'in' slow off and
   *  hard on (falling, thrown), 'over' past it and back (a body settling), 'lin'. */
  const EASE = { lin: c01, io: k => { k = c01(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: k => 1 - Math.pow(1 - c01(k), 3), in: k => Math.pow(c01(k), 2.4),
    over: k => { k = c01(k); return k >= 1 ? 1 : 1 - Math.exp(-5.5 * k) * Math.cos(8.5 * k); } };
  /** Pose to pose, as an animator keys it: each key is the pose he's in AT `t`, got to over the `mv` seconds before
   *  (so between keys he HOLDS: the holds are the acting, the moves are quick), by ease `e`. A key names only what
   *  changes. Anticipation and settle are keys of their own, never left to the easing. Returns pose(t): the numbers. */
  function track(keys) {
    const ks = keys.map(k => ({ mv: 0.25, e: 'io', ...k }));
    const chan = c => c !== 't' && c !== 'mv' && c !== 'e';
    return t => {
      const p = {};
      for (const c in ks[0]) if (chan(c)) p[c] = ks[0][c];
      for (let i = 1; i < ks.length; i++) {
        const k = ks[i], t0 = k.t - k.mv;
        if (t <= t0) continue;
        const w = EASE[k.e]((t - t0) / k.mv);
        for (const c in k) if (chan(c) && c in p) p[c] += (k[c] - p[c]) * w;
      }
      return p;
    };
  }
  return { face, pose, soles, castaway, INK, n1, EASE, track };
};
