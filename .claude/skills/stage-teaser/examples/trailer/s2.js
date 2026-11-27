// Take S2, Floe Sushi (the demo's default: stage 2 built, someone knocking under the dock).
// Shot 3: along the belt. Shot 4: the whole restaurant, a slow drift. Shot 5: the hatch on the dock, knocking.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const UI = await window.__mod('ui.ts');
  const SHOTS = [
    { t0: 0, t1: 4.5, keys: [
      { t: 0, pos: [4.2, 3.2, 12.2], look: [-1, 0.9, 7], fov: 45 },
      { t: 4.5, pos: [0.4, 2.8, 11.8], look: [-3.6, 0.9, 7], fov: 45 }] },
    { t0: 4.5, t1: 8.6, fog: [60, 150], keys: [
      { t: 4.5, pos: [-7, 12.5, 24], look: [0, 0, 8], fov: 40 },
      { t: 8.6, pos: [6.5, 12, 23.5], look: [1, 0, 7], fov: 40 }] },
    { t0: 8.6, t1: 13.2, keys: [
      { t: 8.6, pos: [6.9, 1.6, -0.9], look: [6.0, 0.55, -5.1], fov: 40 },
      { t: 13.2, pos: [6.5, 1.3, -2.3], look: [6.0, 0.55, -5.1], fov: 40 }] },
  ];
  const CAPS = [[0.5, 4.3, 'Build a sushi restaurant.']];
  let toasted = false;
  window.cine = {
    len: 13.2,
    frame(i, fps) {
      const t = i / fps, s = SHOTS.find(s => t >= s.t0 && t < s.t1) ?? SHOTS.at(-1);
      K.cam = { ...K.path(s.keys, t, K.ease), fogNear: s.fog?.[0], fogFar: s.fog?.[1] };
      K.caption(CAPS, t);
      if (t >= 9.2 && !toasted) { toasted = true; UI.toast('Something is knocking under the dock', undefined, 3500); }
    },
  };
})();
