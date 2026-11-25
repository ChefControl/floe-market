// A campfire for a clip (after kit.js): a ring of stones, crossed logs, flames that flicker, a warm light and smoke.
//   const fire = Campfire(K.T3, K.R.scene, x, y, z); fire.set(t, lit 0..1) each frame
window.Campfire = (T3, scene, x, y, z) => {
  const { Group, Mesh, MeshLambertMaterial, MeshBasicMaterial, SphereGeometry, CylinderGeometry, ConeGeometry, PointLight } = T3;
  const g = new Group(); g.position.set(x, y, z); scene.add(g);
  const lam = c => new MeshLambertMaterial({ color: c });
  const stone = new SphereGeometry(1, 7, 5);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, m = new Mesh(stone, lam(i % 2 ? 0x8C97A0 : 0x76828C));
    m.scale.set(0.085 + (i * 37 % 5) * 0.006, 0.06, 0.075); m.position.set(Math.cos(a) * 0.36, 0.04, Math.sin(a) * 0.36); m.rotation.y = a; m.castShadow = true; g.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const m = new Mesh(new CylinderGeometry(0.045, 0.05, 0.52, 7), lam(i % 2 ? 0x5E3B24 : 0x7A5236));
    m.rotation.set(Math.PI / 2 - 0.42, i * Math.PI / 2 + 0.3, 0, 'YXZ'); m.position.set(Math.sin(i * Math.PI / 2 + 0.3) * 0.1, 0.13, Math.cos(i * Math.PI / 2 + 0.3) * 0.1); m.castShadow = true; g.add(m);
  }
  const flames = [[0xFF7A1A, 0.19, 0.5, 0, 0], [0xFFA62B, 0.14, 0.4, 0.06, 0.04], [0xFFD64A, 0.09, 0.3, -0.03, -0.02], [0xFF8A1E, 0.11, 0.34, -0.07, 0.05]].map(([c, r, h, fx, fz], i) => {
    const m = new Mesh(new ConeGeometry(r, h, 7), new MeshBasicMaterial({ color: c })); m.position.set(fx, 0.16 + h / 2, fz); m.userData = { h, i }; g.add(m); return m;
  });
  const embers = new Mesh(new SphereGeometry(0.16, 8, 5), new MeshBasicMaterial({ color: 0xC9481A })); embers.scale.y = 0.3; embers.position.y = 0.1; g.add(embers);
  const light = new PointLight(0xFF9A3C, 0, 9, 1.6); light.position.set(0, 0.7, 0); g.add(light);
  return { g, at: g.position,
    set(t, lit = 1) {
      for (const m of flames) {
        const { h, i } = m.userData, k = 0.8 + 0.25 * Math.sin(t * (11 + i * 3.1) + i) + 0.12 * Math.sin(t * 23.7 + i * 2);
        m.visible = lit > 0.05; m.scale.set(1 - 0.15 * Math.sin(t * 9 + i), k * lit, 1); m.position.y = 0.16 + h * k * lit / 2; m.rotation.y = t * (1 + i * 0.4);
      }
      embers.material.color.setHex(lit > 0.05 ? 0xE2571C : 0x3A2A22);
      light.intensity = lit * (3.2 + 0.6 * Math.sin(t * 13) + 0.4 * Math.sin(t * 29.3));
    } };
};
