(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const G = await window.__mod('gong.ts');
  const { player } = await window.__mod('player.ts');
  const C = JSON.parse(decodeURIComponent(location.hash.slice(1)));
  window.cine = { len: C.length * 10 / 30 + 0.1, setup() { player.g.visible = false; },
    frame(i) { if (i === -600) G.ring(); const c = C[Math.floor(Math.max(0, i) / 10)]; if (c) K.cam = { pos: K.V(...c[0]), look: K.V(...c[1]), fov: c[2] ?? 40 }; } };
})();
