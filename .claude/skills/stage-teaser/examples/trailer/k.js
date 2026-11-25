// Take K, the knock: the game's own scene (offer.ts meet()), on its own cameras and with its own sound and music.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const OF = await window.__mod('offer.ts');
  window.cine = { len: 16.8, frame(i) { if (i === 0) OF.meet(false); } };
})();
