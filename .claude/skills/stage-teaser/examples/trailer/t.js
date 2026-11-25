// Take T, the spin (?stage=1&pile=14 as a new game; acting.js before this): the camera circles the dock, slowly, then
// faster and faster until the picture smears, and the market builds itself as it goes: an upgrade a beat, the yacht
// sailing in, the seasons turning. In the smear the market becomes Floe Sushi; the camera slows, and there it is.
// The game's own music is left on: the market tune gains its parts as the market grows, and the café band takes over.
(async () => {
  while (!window.K || !window.Acting) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeIO } = K;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const U = await window.__mod('unlocks.ts'), SE = await window.__mod('season.ts'), FX = await window.__mod('fx.ts'), CT = await window.__mod('counters.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  const BEAT = 60 / 92, at = n => n * BEAT, FPS = 30;
  const T = { fast: at(2), peak: at(8), slow: at(10), there: at(13.5), end: at(16.5), tail: at(16.5) + 9 };

  const P = player.g, rags = ACT.castaway(P); ACT.soles(P);
  // ---------- the orbit: how fast it turns, by time, and so where it is ----------
  const W0 = 0.32, W1 = 14;
  const rate = t => t < T.fast ? W0 : t < T.peak ? W0 * Math.pow(W1 / W0, ease((t - T.fast) / (T.peak - T.fast))) : t < T.slow ? W1 : mix(W1, 0.035, Math.pow(easeIO(clamp((t - T.slow) / (T.there - T.slow))), 0.55));
  const TH0 = 0.42, TH1 = 0.1 + Math.PI * 2 * 9; // from the game's own angle, to square on to the restaurant's front (some turns later)
  const N = Math.round(T.tail * FPS * 8), dt = T.tail / N, th = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) th[i + 1] = th[i] + rate(i * dt) * dt;
  // (the turns it makes at full speed are trimmed so it comes to rest where it should)
  const reach = th[Math.round(T.there / dt)], extra = (((TH1 - TH0 - reach) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const angle = t => { const i = clamp(t / dt, 0, N), a = Math.floor(i), k = i - a; return TH0 + mix(th[a], th[Math.min(N, a + 1)], k) + extra * ease((t - T.peak) / (T.slow - T.peak)); };
  function camAt(t) {
    const a = angle(t), late = ease((t - T.slow) / (T.there - T.slow)), r = mix(25, 27, late), h = mix(17, 12.5, late);
    const c = V(0, 0, mix(1.5, 6, late));
    return { pos: V(c.x + Math.sin(a) * r, h, c.z + Math.cos(a) * r), look: V(c.x, mix(0.5, 1.2, late), c.z), fov: 40, fogNear: 70, fogFar: 190 };
  }

  // ---------- what's built, and when ----------
  const done = new Set(), once = (k, t, now, f) => { if (now >= t && !done.has(k)) { done.add(k); f(); } };
  const pop = id => { const tile = U.tiles.find(x => x.id === id); U.applyUnlock(id, false); FX.unlockFx({ x: tile.x, z: tile.z }, 1.2); };
  const STAGE1 = [['turret', 1], ['runner', 2], ['roulette', 3], ['pack', 3.5], ['boots', 4], ['sled', 4.5], ['runner2', 5.5], ['net', 6.5]];
  const STAGE2 = ['paddy', 'farmer', 'seats', 'chef', 'tables', 'plot2', 'runner3', 'chef3', 'tables2', 'plot3', 'kiosk', 'porter']; // (all but the premium menu: the next clip buys it)

  window.cine = {
    len: T.tail,
    setup() { player.g.position.set(4.6, 0.15, 6.3); player.h = 2.6; },
    frame(i, fps) {
      const t = i / fps;
      STAGE1.forEach(([id, b]) => once(id, at(b), t, () => pop(id)));
      // out of his rags and into his parka as the money comes in
      once('coat', at(2.5), t, () => { rags.userData.restore(); FX.unlockFx({ x: P.position.x, z: P.position.z }, 0.9); });
      // the seasons turn: spring and summer blend in, autumn arrives in the smear with the restaurant
      once('spring', at(4), t, () => SE.setSeason(1, 0)); once('summer', at(6.5), t, () => SE.setSeason(2, 0));
      once('sushi', at(9), t, () => { SE.setSeason(3, 30, true); U.applyUnlock('sushi', true); STAGE2.forEach(id => U.applyUnlock(id, true)); U.tiles.forEach(U.redrawTile); });
      K.cam = camAt(t);
      // the smear: as many draws across the frame as the turn needs (a draw every half degree or so)
      const turn = (angle(t + 1 / fps) - angle(t)), n = Math.min(28, Math.round(turn / 0.011));
      K.blur = n > 1 ? { n, at: k => camAt(t + k / fps) } : null;
      if (i % 30 === 0) console.log('[cine]', t.toFixed(1), 'rate', rate(t).toFixed(2), 'draws', n, 'queue', CT.C1.queue.length);
    },
  };
})();
