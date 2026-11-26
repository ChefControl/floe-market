// Take T, the spin (?stage=1&pile=14 as a new game; acting.js before this): the camera circles the dock, slowly, then
// faster and faster until the picture smears, and the market builds itself as it goes: an upgrade a beat, the yacht
// sailing in, the seasons turning. In the smear the market becomes Floe Sushi; the camera slows, and there it is.
// The game's own music is left on: the market tune gains its parts as the market grows, and the café band takes over.
(async () => {
  while (!window.K || !window.Acting) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeIO } = K;
  const ACT = await Acting();
  const { player } = await window.__mod('player.ts');
  const U = await window.__mod('unlocks.ts'), SE = await window.__mod('season.ts'), FX = await window.__mod('fx.ts'), CT = await window.__mod('counters.ts'), A = await window.__mod('audio.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  const BEAT = 60 / 92, at = n => n * BEAT, FPS = 30;
  // (five and a half beats of a slow turn, the dock building itself in plain sight; then the wind-up, a second and a
  // half of smear, and down onto the restaurant: a smear longer than that and nobody sees the market grow)
  const T = { fast: at(5.5), peak: at(7.5), slow: at(9), there: at(12), end: at(15), tail: at(15) + 9 };

  const P = player.g, rags = ACT.castaway(P); ACT.soles(P);
  // ---------- the orbit: how fast it turns, by time, and so where it is ----------
  const W0 = 0.32, WA = 0.8, W1 = 14;
  const rate = t => t < T.fast ? mix(W0, WA, ease(t / T.fast)) : t < T.peak ? WA * Math.pow(W1 / WA, ease((t - T.fast) / (T.peak - T.fast))) : t < T.slow ? W1 : mix(W1, 0.035, Math.pow(easeIO(clamp((t - T.slow) / (T.there - T.slow))), 0.55));
  const TH0 = 0.42, TH1 = 0.1 + Math.PI * 2 * 9; // from the game's own angle, to square on to the restaurant's front (some turns later)
  const N = Math.round(T.tail * FPS * 8), dt = T.tail / N, th = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) th[i + 1] = th[i] + rate(i * dt) * dt;
  // (the turns it makes at full speed are trimmed so it comes to rest where it should)
  const reach = th[Math.round(T.there / dt)], extra = (((TH1 - TH0 - reach) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const angle = t => { const i = clamp(t / dt, 0, N), a = Math.floor(i), k = i - a; return TH0 + mix(th[a], th[Math.min(N, a + 1)], k) + extra * ease((t - T.peak) / (T.slow - T.peak)); };
  function camAt(t) {
    const a = angle(t), late = ease((t - T.slow) / (T.there - T.slow)), push = ease((t - T.there + 0.5) / 4.5), r = mix(19.5, 27, late) - 4.2 * push, h = mix(11.5, 14.6, late) - 1.3 * push; // (and once it's there, a slow push in: a held shot that's alive)
    const c = V(mix(-0.5, 0, late), 0, mix(0.5, 6, late));
    return { pos: V(c.x + Math.sin(a) * r, h, c.z + Math.cos(a) * r), look: V(c.x, mix(0.5, 1.2, late), c.z), fov: 40, fogNear: 70, fogFar: 190 };
  }

  // ---------- what's built, and when ----------
  const done = new Set(), once = (k, t, now, f) => { if (now >= t && !done.has(k)) { done.add(k); f(); } };
  const pop = id => { const tile = U.tiles.find(x => x.id === id); U.applyUnlock(id, false); FX.unlockFx({ x: tile.x, z: tile.z }, 2.2); FX.coinsFx(V(tile.x, 0.6, tile.z), 6); };
  const STAGE1 = [['turret', 1], ['runner', 1.5], ['roulette', 2], ['pack', 2.5], ['boots', 3], ['sled', 3.5], ['runner2', 4], ['net', 4.5]];
  const STAGE2 = ['paddy', 'farmer', 'seats', 'chef', 'tables', 'plot2', 'runner3', 'chef3', 'tables2', 'plot3', 'kiosk', 'porter']; // (all but the premium menu: the next clip buys it)

  let rush0 = null;
  window.cine = {
    len: T.tail,
    setup() { player.g.position.set(4.6, 0.15, 6.3); player.h = 2.6; },
    frame(i, fps) {
      const t = i / fps;
      STAGE1.forEach(([id, b]) => once(id, at(b), t, () => pop(id)));
      // out of his rags and into his parka as the money comes in
      once('coat', at(2.75), t, () => { rags.userData.restore(); FX.unlockFx({ x: P.position.x, z: P.position.z }, 0.9); });
      // the seasons turn: spring and summer blend in, autumn arrives in the smear with the restaurant
      once('spring', at(3), t, () => SE.setSeason(1, 0)); once('summer', at(5), t, () => SE.setSeason(2, 0));
      once('sushi', at(8.25), t, () => { SE.setSeason(3, 30, true); U.applyUnlock('sushi', true); STAGE2.forEach(id => U.applyUnlock(id, true)); U.tiles.forEach(U.redrawTile); });
      // the wind-up: a rising rush of air under the spin, and a soft landing as it comes to rest on the restaurant
      once('riser', T.fast, t, () => { A.noise({ f: 220, f2: 3000, q: 1.1, d: T.slow - T.fast + 0.5, a: T.peak - T.fast, v: 0.3 }); /* (not up into the hiss) */ A.noise({ f: 90, f2: 260, kind: 'lowpass', d: T.slow - T.fast + 0.3, a: T.peak - T.fast, v: 0.6 }); });
      // (the rush HELD under the whole smear, to a breath before the landing: the riser alone is gone a second before the blur is)
      if (t >= T.peak - 0.2 && !rush0) rush0 = { a: K.soft(A, { kind: 'bandpass', f: 800, q: 0.5, smooth: 1600 }), b: K.soft(A, { kind: 'bandpass', f: 650, q: 0.8, smooth: 1200, from: 1.5 }) }; // (brown noise, moving: a held band of white noise is static)
      if (rush0) { const k = ease((t - T.peak) / 0.5) * (1 - ease((t - T.there + 0.92) / 0.2)), m = 0.75 + 0.25 * K.n1(t * 3.1, 7); rush0.a.to(0.62 * k * m, 0.06); rush0.b.to(0.35 * k * (1.5 - m), 0.06); }
      once('land', T.there - 0.25, t, () => { A.tone({ f: 82, f2: 40, d: 1.0, v: 0.143 }); A.tone({ f: 240, f2: 150, d: 0.3, a: 0.002, type: 'triangle', v: 0.18 }); A.noise({ f: 900, f2: 480, q: 1.4, d: 0.1, a: 0.001, v: 0.09 }); /* (less sub, which only fed the limiter; a body small speakers play) */ [1318.5, 1760, 2637].forEach((f, n) => A.tone({ f, d: 1.3, t: n * 0.07, type: 'triangle', v: 0.1 })); });
      K.cam = camAt(t);
      // the smear: as many draws across the frame as the turn needs (one every 0.003 rad, about 3 px at the picture's
      // edge: further apart and a fence or a tree line shows as a row of stepped copies)
      // (a half-open shutter while it's slow, so what's being built stays sharp; wide open once it's a whip)
      const sh = mix(0.45, 1, clamp((rate(t) - 2) / 4)), turn = (angle(t + sh / fps) - angle(t)), n = Math.min(160, Math.round(turn / 0.003));
      K.blur = n > 1 ? { n, at: k => camAt(t + sh * k / fps) } : null;
      if (i % 30 === 0) console.log('[cine]', t.toFixed(1), 'rate', rate(t).toFixed(2), 'draws', n, 'queue', CT.C1.queue.length);
    },
  };
})();
