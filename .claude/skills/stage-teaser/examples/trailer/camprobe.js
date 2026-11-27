// frame i*10 shows candidate i (from window.CANDS, set by the URL's #c=JSON... or below)
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const C = JSON.parse(decodeURIComponent(location.hash.slice(1)));
  window.cine = { len: C.length * 10 / 30 + 0.1, frame(i) { const c = C[Math.floor(i / 10)]; if (c) K.cam = { pos: K.V(...c[0]), look: K.V(...c[1]), fov: c[2] ?? 40 }; } };
})();
