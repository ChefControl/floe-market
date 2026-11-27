// Take FB, during the prep (--skip 20 after the gong: the gong is rung at frame -600, 20 s × 30): the chanko pot, then the stands with fans won over.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const G = await window.__mod('gong.ts');
  const { player } = await window.__mod('player.ts');
  const SHOTS = [
    { t0: 0, t1: 3.4, keys: [
      { t: 0, pos: [8.3, -26.2, 6.0], look: [8.3, -29.4, 1.3], fov: 45 },
      { t: 3.4, pos: [8.3, -26.75, 5.3], look: [8.3, -29.4, 1.3], fov: 45 }] },
    { t0: 3.4, t1: 6.8, keys: [
      { t: 3.4, pos: [1.6, -25.0, 10.6], look: [-6, -29.6, 1], fov: 40 },
      { t: 6.8, pos: [0.5, -25.3, 9.6], look: [-6.2, -29.6, 0.8], fov: 40 }] },
  ];
  const CAPS = [[0.4, 3.25, 'Cook chanko for the crowd.'], [3.7, 6.7, 'Win his fans over.']];
  window.cine = {
    len: 6.8,
    setup() { player.g.visible = false; },
    frame(i, fps) {
      if (i === -600) G.ring();
      if (i < 0) return;
      const t = i / fps, s = SHOTS.find(s => t >= s.t0 && t < s.t1) ?? SHOTS.at(-1);
      K.cam = K.path(s.keys, t, K.ease);
      K.caption(CAPS, t);
    },
  };
})();
