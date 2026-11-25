// Take FC, the fight itself (--skip 64 after the gong: rung at frame -1920): the game's watch camera, the fight, and the finish (push him out,
// then slam him down on the slow motion), all on the game's own cameras.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const G = await window.__mod('gong.ts'), FT = await window.__mod('fight.ts');
  const { player } = await window.__mod('player.ts');
  const ev = (type, k, code) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true }));
  const key = (k, code) => { ev('keydown', k, code); ev('keyup', k, code); };
  let slamT = -1, watched = 0;
  window.cineType = { marks: {} };
  window.cine = {
    len: 26,
    frame(i, fps) {
      const R = FT.F.rush, B = FT.F.bout, m = window.cineType.marks;
      if (i === -1920) G.ring();
      if (R && B.phase !== 'prep' && watched === 0) { ev('keydown', 'v', 'KeyV'); watched = 1; } else if (watched === 1) { ev('keyup', 'v', 'KeyV'); watched = 2; }
      if (i >= 0 && B.phase && m[B.phase] === undefined) m[B.phase] = i;
      const f = FT.finish();
      if (f?.step === 'push' && i % 2 === 0) { key(' ', 'Space'); if (m.push === undefined) m.push = i; }
      if (FT.slamOn(f)) { if (slamT < 0) { slamT = i; m.slow = i; } if (i - slamT === 3) { key('ArrowDown', 'ArrowDown'); m.slam = i; } }
    },
  };
})();
