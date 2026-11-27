// Take FA, fight night (?cellar&full&beaten=4): a crane over the cellar's ring and stands, then the gong struck and
// the boss's walk-in banner (入場).
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const G = await window.__mod('gong.ts');
  const { player } = await window.__mod('player.ts');
  const SHOTS = [
    { t0: 0, t1: 3.4, keys: [
      { t: 0, pos: [9, -19, 15], look: [-4, -30, -1], fov: 40 },
      { t: 3.4, pos: [2.2, -25.6, 7.6], look: [-4.4, -29.6, -1.4], fov: 40 }] },
    { t0: 3.4, t1: 6.6, keys: [
      { t: 3.4, pos: [0.3, -27.2, 7.3], look: [-5.3, -28.9, 4.3], fov: 34 },
      { t: 6.6, pos: [-0.5, -27.35, 6.6], look: [-5.3, -28.9, 4.3], fov: 34 }] },
  ];
  const CAPS = [[0.5, 3.3, 'Fight night, under the dock.']];
  let rung = false;
  window.cine = {
    len: 6.6,
    setup() { player.g.visible = false; },
    frame(i, fps) {
      const t = i / fps, s = SHOTS.find(s => t >= s.t0 && t < s.t1) ?? SHOTS.at(-1);
      K.cam = K.path(s.keys, t, K.ease);
      K.caption(CAPS, t);
      if (t >= 3.5 && !rung) rung = G.ring() || true;
    },
  };
})();
