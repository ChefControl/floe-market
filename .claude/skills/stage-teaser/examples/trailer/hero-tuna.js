// The hero tuna: the one fish a trailer looks at closely. The game's own fish is a few dozen triangles, fine from its
// camera and wrong in a close-up; this one is made for the clip only, in the game's colours and plain shapes: a smooth
// countershaded body that bends as it swims, a crescent tail, dorsal fins, gold finlets, long pectorals that flare,
// and a face (eyes that widen, look and cross out, brows, a mouth). +x is its nose, 1.5 long; scale the group.
//   const tuna = HeroTuna(THREE); scene.add(tuna.g); tuna.set({ swim: phase, amp, wide, look: [x, y], brow, mouth, flare, dead })
window.HeroTuna = T3 => {
  const { Group, Mesh, MeshPhongMaterial, MeshLambertMaterial, LatheGeometry, ShapeGeometry, Shape, SphereGeometry, BoxGeometry,
    Vector2, Color, Float32BufferAttribute, DoubleSide } = T3;
  const L = 1.5, clamp = (k, a = 0, b = 1) => Math.min(b, Math.max(a, k)), sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  /** The body's radius u of the way from nose (0) to the root of the tail (1). */
  const rad = u => 0.255 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), 0.62)), 0.8) * (1 - 0.12 * u) + 0.02 * u + 0.012 * (1 - u);
  const radAt = x => rad((L / 2 - x) / L), WIDE = 0.74;
  /** Where the skin is at (x, y), out to the side. */
  const skin = (x, y) => WIDE * Math.sqrt(Math.max(0, radAt(x) ** 2 - y * y));

  const g = new Group();
  // ---------- the body ----------
  const pts = [];
  // (from the tail forward: a lathe's faces look outward when its profile climbs)
  for (let i = 34; i >= 0; i--) { const u = i / 34; pts.push(new Vector2(rad(u), L / 2 - u * L)); }
  const body = new LatheGeometry(pts, 28);
  body.rotateZ(-Math.PI / 2); body.scale(1, 1, WIDE);
  const P = body.attributes.position, col = [];
  const NAVY = new Color(0x14306A), BLUE = new Color(0x2C63B4), STEEL = new Color(0x9FBAD8), BELLY = new Color(0xF2F6FA), c = new Color();
  for (let i = 0; i < P.count; i++) {
    const h = P.getY(i) / Math.max(1e-3, radAt(P.getX(i)));
    c.copy(BELLY).lerp(STEEL, sm(-0.55, -0.1, h)).lerp(BLUE, sm(-0.05, 0.3, h)).lerp(NAVY, sm(0.35, 0.8, h));
    col.push(c.r, c.g, c.b);
  }
  body.setAttribute('color', new Float32BufferAttribute(col, 3));
  body.computeVertexNormals();
  const base = Float32Array.from(P.array);
  // (matt, as everything in the game is: a shine on it read as plastic)
  const bodyMesh = new Mesh(body, new MeshLambertMaterial({ vertexColors: true }));
  bodyMesh.castShadow = true; bodyMesh.frustumCulled = false;
  g.add(bodyMesh);

  // ---------- fins ----------
  const FIN = new MeshLambertMaterial({ color: 0x1D3B78, side: DoubleSide }), GOLD = new MeshLambertMaterial({ color: 0xF2C230, side: DoubleSide });
  const flat = (mat, draw) => { const s = new Shape(); draw(s); const m = new Mesh(new ShapeGeometry(s, 8), mat); m.castShadow = true; return m; };
  /** Fins that ride the bend: [mesh, x along the body, its own z]. */
  const riders = [];
  const ride = (m, x, y, z = 0) => { m.position.set(x, y, z); g.add(m); riders.push([m, x, z]); return m; };
  ride(flat(FIN, s => { s.moveTo(0.15, 0); s.quadraticCurveTo(0.06, 0.2, -0.05, 0.23); s.quadraticCurveTo(-0.03, 0.08, -0.24, 0); }), 0.1, radAt(0.02) * 0.97);
  ride(flat(FIN, s => { s.moveTo(0.07, 0); s.quadraticCurveTo(0.0, 0.2, -0.11, 0.27); s.quadraticCurveTo(-0.05, 0.1, -0.1, 0); }), -0.2, radAt(-0.24) * 0.95);
  ride(flat(FIN, s => { s.moveTo(0.07, 0); s.quadraticCurveTo(0.0, -0.18, -0.11, -0.24); s.quadraticCurveTo(-0.05, -0.09, -0.1, 0); }), -0.24, -radAt(-0.28) * 0.95);
  for (let i = 0; i < 6; i++) {
    const x = -0.36 - i * 0.058;
    for (const s of [1, -1]) ride(flat(GOLD, sh => { sh.moveTo(0.03, 0); sh.lineTo(-0.02, s * 0.05); sh.lineTo(-0.036, 0); }), x, s * radAt(x) * 0.96);
  }
  // the tail: a crescent on a joint at the end of the body
  const tail = new Group(); tail.position.x = -L / 2 + 0.01; g.add(tail);
  tail.add(flat(FIN, s => {
    s.moveTo(0.03, 0.03); s.quadraticCurveTo(-0.12, 0.12, -0.3, 0.45); s.quadraticCurveTo(-0.2, 0.16, -0.17, 0);
    s.quadraticCurveTo(-0.2, -0.16, -0.3, -0.45); s.quadraticCurveTo(-0.12, -0.12, 0.03, -0.03);
  }));
  // the long side fins, on joints so they can flare
  const pects = [1, -1].map(s => {
    const j = new Group(); j.position.set(0.3, -0.07, s * skin(0.3, -0.07) * 0.96); g.add(j);
    const m = flat(FIN, sh => { sh.moveTo(0, 0.035); sh.quadraticCurveTo(-0.2, 0.02, -0.38, -0.07); sh.quadraticCurveTo(-0.15, -0.06, 0, -0.035); });
    m.rotation.x = s * 1.2; // (lying nearly flat along the side)
    j.add(m); j.userData.s = s;
    return j;
  });

  // ---------- the face ----------
  const basic = c0 => new MeshLambertMaterial({ color: c0 });
  const ball = new SphereGeometry(1, 18, 12), box = new BoxGeometry(1, 1, 1);
  const INK = 0x16202C, EX = 0.5, EY = 0.05;
  const eyes = [1, -1].map(s => {
    const e = new Group(); e.position.set(EX, EY, s * (skin(EX, EY) - 0.006)); e.rotation.y = (s > 0 ? 0 : Math.PI) + s * 0.42; g.add(e);
    const white = new Mesh(ball, basic(0xFFFFFF)), pupil = new Mesh(ball, basic(INK)), glint = new Mesh(ball, basic(0xFFFFFF));
    const brow = new Mesh(box, basic(0x0F2552)), lid = new Mesh(ball, basic(0x1F4A94));
    const x1 = new Mesh(box, basic(INK)), x2 = new Mesh(box, basic(INK));
    e.add(white, pupil, glint, brow, lid, x1, x2);
    return { e, s, white, pupil, glint, brow, lid, x1, x2 };
  });
  // the mouth: drawn on each side of the head as the eyes are (a cartoon fish is looked at side on): a line that
  // tips into a smile or a scowl, and the inside of it when it opens
  const MX = 0.64, MY = -0.075;
  const mouths = [1, -1].map(s => {
    const e = new Group(); e.position.set(MX, MY, s * (skin(MX, MY) - 0.004));
    e.rotation.y = (s > 0 ? 0 : Math.PI) + s * Math.atan((skin(MX - 0.05, MY) - skin(MX + 0.05, MY)) / 0.1); g.add(e);
    const line = new Mesh(box, basic(INK)), lip = new Mesh(ball, basic(INK)), inside = new Mesh(ball, basic(0x3A1218));
    e.add(line, lip, inside);
    return { s, line, lip, inside };
  });
  const st = { swim: 0, amp: 0.05, wide: 0, look: [0, 0], brow: 0, lid: 0, mouth: 0, smile: 0.5, flare: 0, dead: false };
  function set(o = {}) {
    Object.assign(st, o);
    // the bend: a wave down the body, nothing at the head and most at the tail
    const bend = x => { const w = Math.pow(clamp((0.25 - x) / 1.0), 1.7); return st.amp * w * Math.sin(st.swim + x * 3.4); };
    for (let i = 0; i < P.count; i++) P.setZ(i, base[i * 3 + 2] + bend(base[i * 3]));
    P.needsUpdate = true;
    for (const [m, x, z] of riders) m.position.z = z + bend(x);
    tail.position.z = bend(-L / 2); tail.rotation.y = -Math.cos(st.swim - L / 2 * 3.4) * st.amp * 5.5;
    for (const j of pects) j.rotation.set(0, j.userData.s * (-0.25 - st.flare * 1.0), -0.15 + st.flare * 0.5);
    for (const { s, white, pupil, glint, brow, lid, x1, x2 } of eyes) {
      const w = 1 + st.wide * 0.22, dead = st.dead;
      white.scale.set(0.047 * w, 0.05 * w, 0.016); white.position.set(0, 0, 0);
      // (looking: forward is +x for both; on the far side that's the other way across the eye)
      const lx = st.look[0] * 0.012 * s, ly = st.look[1] * 0.012, p = 1 - st.wide * 0.18;
      pupil.visible = glint.visible = !dead;
      pupil.scale.set(0.031 * p, 0.034 * p, 0.01); pupil.position.set(lx, ly, 0.011);
      glint.scale.setScalar(0.009); glint.position.set(lx + 0.011, ly + 0.013, 0.02);
      brow.visible = Math.abs(st.brow) > 0.02 && !dead;
      brow.scale.set(0.085, 0.02, 0.018); brow.position.set(0, 0.06 * w + (st.brow < 0 ? 0.012 : -0.004 * st.brow), 0.016); brow.rotation.z = s * st.brow * 0.55;
      lid.visible = st.lid > 0.02 && !dead;
      lid.scale.set(0.052 * w, 0.054 * w * st.lid, 0.02); lid.position.set(0, 0.05 * w * (1 - st.lid), 0.003);
      x1.visible = x2.visible = dead;
      for (const [x, r] of [[x1, 0.78], [x2, -0.78]]) { x.scale.set(0.07, 0.015, 0.01); x.position.set(0, 0, 0.018); x.rotation.z = r; }
    }
    const open = st.mouth;
    for (const { s, line, lip, inside } of mouths) {
      line.visible = open < 0.5;
      line.scale.set(0.1, 0.012, 0.01); line.position.set(0, 0, 0.006); line.rotation.z = -s * st.smile * 0.35;
      // open: a dark oval ringed by its lip, gaping more the more it's open
      inside.visible = lip.visible = open > 0.05;
      const w = 0.03 + open * 0.022, h = 0.006 + open * 0.04;
      lip.scale.set(w + 0.008, h + 0.008, 0.006); lip.position.set(s * 0.012, -open * 0.012, 0.006);
      inside.scale.set(w, h, 0.007); inside.position.set(s * 0.012, -open * 0.012, 0.008);
    }
  }
  set();
  return { g, set, tail, L, radAt };
};
