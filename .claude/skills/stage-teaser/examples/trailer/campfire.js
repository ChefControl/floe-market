// A campfire for a clip (after kit.js): a ring of stones, crossed logs, a bed of embers, flames in three layers that
// lick and lean, a glow, sparks that rise and wink out, thin smoke, and a warm light that flickers with it all.
//   const fire = Campfire(K.T3, K.R.scene, x, y, z); fire.set(t, lit 0..1, bright = 1) each frame (bright: its light alone, for a close-up it would bleach)
window.Campfire = (T3, scene, x, y, z) => {
  const { Group, Mesh, MeshLambertMaterial, MeshBasicMaterial, SphereGeometry, CylinderGeometry, LatheGeometry, Vector2, PointLight,
    Sprite, SpriteMaterial, CanvasTexture, AdditiveBlending } = T3;
  const g = new Group(); g.position.set(x, y, z); scene.add(g);
  const lam = c => new MeshLambertMaterial({ color: c });
  const stone = new SphereGeometry(1, 7, 5);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, m = new Mesh(stone, lam(i % 2 ? 0x8C97A0 : 0x76828C));
    m.scale.set(0.085 + (i * 37 % 5) * 0.006, 0.06, 0.075); m.position.set(Math.cos(a) * 0.36, 0.04, Math.sin(a) * 0.36); m.rotation.y = a; m.castShadow = true; g.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const m = new Mesh(new CylinderGeometry(0.045, 0.05, 0.52, 7), lam(i % 2 ? 0x4A2E1C : 0x5E3B24));
    m.rotation.set(Math.PI / 2 - 0.42, i * Math.PI / 2 + 0.3, 0, 'YXZ'); m.position.set(Math.sin(i * Math.PI / 2 + 0.3) * 0.1, 0.13, Math.cos(i * Math.PI / 2 + 0.3) * 0.1); m.castShadow = true; g.add(m);
  }
  // a flame: a teardrop (fat low down, drawn out to a tip), turned from a profile
  const drop = (() => { const p = []; for (let i = 0; i <= 12; i++) { const k = i / 12; p.push(new Vector2(Math.sin(Math.pow(k, 0.7) * Math.PI) * (1 - k * 0.55) * 0.5, k)); } return new LatheGeometry(p, 10); })();
  const soft = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d'), gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128); return new CanvasTexture(c); };
  const glow = new Sprite(new SpriteMaterial({ map: soft('rgba(255,170,70,.55)', 'rgba(255,120,30,0)'), blending: AdditiveBlending, depthWrite: false, fog: false })); glow.position.y = 0.38; g.add(glow);
  // outer to inner: deep orange, orange, yellow, a pale core
  const flames = [[0xE8481A, 0.34, 0.62, 0, 0, 0], [0xF26A1B, 0.24, 0.5, 0.09, 0.05, 1.3], [0xF26A1B, 0.2, 0.42, -0.1, -0.03, 2.9], [0xFF9A1F, 0.22, 0.48, 0.0, 0.02, 0.7],
    [0xFFC43A, 0.14, 0.36, 0.03, -0.02, 2.1], [0xFFE98A, 0.08, 0.22, -0.01, 0.01, 4.0]].map(([c, w, h, fx, fz, ph]) => {
    const m = new Mesh(drop, new MeshBasicMaterial({ color: c, fog: false })); m.position.set(fx, 0.12, fz); m.userData = { w, h, ph }; g.add(m); return m;
  });
  const embers = new Mesh(new SphereGeometry(0.2, 10, 6), new MeshBasicMaterial({ color: 0xD9501A })); embers.scale.y = 0.28; embers.position.y = 0.09; g.add(embers);
  const sparkTex = soft('rgba(255,230,150,1)', 'rgba(255,140,40,0)');
  const sparks = [...Array(14)].map((_, i) => { const s = new Sprite(new SpriteMaterial({ map: sparkTex, blending: AdditiveBlending, depthWrite: false, fog: false })); s.userData = { ph: i * 0.618, sp: 0.55 + (i * 37 % 10) * 0.05, a: i * 2.4 }; g.add(s); return s; });
  const smokeTex = soft('rgba(90,96,108,.5)', 'rgba(90,96,108,0)');
  const smoke = [...Array(5)].map((_, i) => { const s = new Sprite(new SpriteMaterial({ map: smokeTex, depthWrite: false })); s.userData = { ph: i / 5 }; g.add(s); return s; });
  const light = new PointLight(0xFF9A3C, 0, 9, 1.6); light.position.set(0, 0.7, 0); g.add(light);
  return { g, at: g.position,
    set(t, lit = 1, bright = 1) {
      const on = lit > 0.05;
      for (const m of flames) {
        const { w, h, ph } = m.userData, k = 0.82 + 0.2 * Math.sin(t * 9.3 + ph) + 0.12 * Math.sin(t * 17.7 + ph * 2.1) + 0.06 * Math.sin(t * 31 + ph * 3);
        m.visible = on; m.scale.set(w * (1.08 - 0.12 * k), h * k * lit, w * (1.08 - 0.12 * k));
        m.rotation.set(Math.sin(t * 5.1 + ph) * 0.13, t * 0.6 + ph, Math.sin(t * 6.3 + ph * 1.7) * 0.13);
      }
      glow.visible = on; glow.scale.setScalar((1.5 + 0.18 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23.1)) * lit);
      for (const s of sparks) {
        const { ph, sp, a } = s.userData, life = ((t * sp * 0.6 + ph) % 1), r = 0.05 + life * 0.22;
        s.visible = on; s.position.set(Math.cos(a + life * 3) * r, 0.25 + life * 1.5, Math.sin(a + life * 3) * r);
        s.scale.setScalar(0.035 * (1 - life) + 0.008); s.material.opacity = Math.min(1, life * 8) * (1 - life) * 1.4;
      }
      for (const s of smoke) {
        const life = ((t * 0.22 + s.userData.ph) % 1);
        s.position.set(Math.sin(life * 4 + s.userData.ph * 9) * 0.15 + life * 0.35, 0.7 + life * 2.2, life * 0.1);
        s.scale.setScalar(0.35 + life * 0.9); s.material.opacity = (on ? 0.5 : 0.3) * Math.sin(life * Math.PI) * 0.55;
      }
      embers.material.color.setHex(on ? 0xE2571C : 0x3A2A22);
      light.intensity = lit * bright * (2.5 + 0.45 * Math.sin(t * 13) + 0.3 * Math.sin(t * 29.3));
    } };
};
