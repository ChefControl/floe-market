// Take S1, stage 1 (?stage=1): the ice market at work. Shot 1: a crane down over the bay onto the chef fishing.
// Shot 2: the fish table, a line of customers buying.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { player } = await window.__mod('player.ts');
  const ST = await window.__mod('stations.ts');
  const SHOTS = [
    { t0: 0, t1: 5.0, fog: [55, 140], keys: [
      { t: 0, pos: [-24, 19, 15], look: [-6, 0, -7], fov: 40 },
      { t: 5.0, pos: [-1.6, 2.5, -1.4], look: [-4.9, 0.9, -6.2], fov: 38 }] },
    { t0: 5.0, t1: 9.6, keys: [
      { t: 5.0, pos: [9.6, 3.0, 0.6], look: [2, 0.8, -5], fov: 44 },
      { t: 9.6, pos: [8.2, 2.6, -0.4], look: [1.4, 0.9, -5.4], fov: 44 }] },
  ];
  const CAPS = [[0.9, 4.7, 'Catch fish on the ice.'], [5.4, 9.3, 'Sell to a hungry line.']];
  window.cine = {
    len: 9.6,
    setup() { player.g.position.set(ST.PAD.x, 0.15, ST.PAD.z); player.h = Math.PI; },
    frame(i, fps) {
      const t = i / fps, s = SHOTS.find(s => t >= s.t0 && t < s.t1) ?? SHOTS.at(-1);
      const c = K.path(s.keys, t, s === SHOTS[0] ? k => K.easeOut(k) * 0.35 + K.easeIO(k) * 0.65 : K.ease);
      K.cam = { ...c, fogNear: s.fog?.[0], fogFar: s.fog?.[1] };
      K.caption(CAPS, t);
    },
  };
})();
