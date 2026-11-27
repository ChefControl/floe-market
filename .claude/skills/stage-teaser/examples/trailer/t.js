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

  const PRE = at(Number(new URLSearchParams(location.search).get('pre') || 0));
  /* (?band=0..3: the season the cafe band plays in on the MUSIC stem, winter to autumn; the owner asked for winter's under Floe Sushi. The picture stays autumn.) */
  const BAND = Number(new URLSearchParams(location.search).get('band') ?? 3);
  /* (?plain=1: the chef in the game's own clothes from the first frame, no change out of the castaway's whites) */
  const PLAIN = new URLSearchParams(location.search).get('plain') === '1';
  const P = player.g, rags = PLAIN ? null : ACT.castaway(P); ACT.soles(P);
  // ---------- the orbit: how fast it turns, by time, and so where it is ----------
  const W0 = 0.32, WA = 0.8, W1 = 9.4; // (was 14: one turn fewer in the smear, the owner's note)
  const rate = t => t < T.fast ? mix(W0, WA, ease(t / T.fast)) : t < T.peak ? WA * Math.pow(W1 / WA, ease((t - T.fast) / (T.peak - T.fast))) : t < T.slow ? W1 : mix(W1, 0.035, Math.pow(easeIO(clamp((t - T.slow) / (T.there - T.slow))), 0.55));
  const TH0 = 0.42, TH1 = 0.1 + Math.PI * 2 * 9; // from the game's own angle, to square on to the restaurant's front (some turns later)
  const N = Math.round(T.tail * FPS * 8), dt = T.tail / N, th = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) th[i + 1] = th[i] + rate(i * dt) * dt;
  // (the turns it makes at full speed are trimmed so it comes to rest where it should)
  const reach = th[Math.round(T.there / dt)], extra = (((TH1 - TH0 - reach) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const angle = t => { const i = clamp(t / dt, 0, N), a = Math.floor(i), k = i - a; return TH0 + mix(th[a], th[Math.min(N, a + 1)], k) + extra * ease((t - T.peak) / (T.slow - T.peak)); };
  function camAt(t) {
    const a = angle(t), late = ease((t - T.slow) / (T.there - T.slow)), out = Math.max(late, ease((t - at(8.25) + 0.15) / 0.5)), push = ease((t - T.there + 0.5) / 4.5), r = mix(19.5, 27, out) - 4.2 * push, /* (out to the landing's distance inside the smear, as the market becomes the restaurant: from 19.5 m the restaurant's front roof passed right under the camera, a flat dark slab across a fifth of the picture, twice, before the spin slowed. An outside review.) */ h = mix(11.5, 10.8, late) - 0.9 * push; // (lower over the restaurant than it was, 14.6: from up there its front roof beam lay across the sign) // (and once it's there, a slow push in: a held shot that's alive)
    const c = V(mix(-0.5, 0, late), 0, mix(0.5, 6, late));
    return { pos: V(c.x + Math.sin(a) * r, h, c.z + Math.cos(a) * r), look: V(c.x + Math.sin(a) * 4.2 * out, mix(0.5, 0.4, late), c.z + Math.cos(a) * 4.2 * out) /* (aimed nearer with the pull-out, or the sky came into the top of the smear as a pale band) */, fov: 40, fogNear: 70, fogFar: 190 }; // (aimed at the ground before its gate once it's there: looking at its middle from this low, the world's edge and the flat sky came into the top of the picture)
  }

  // ---------- what's built, and when ----------
  const done = new Set(), once = (k, t, now, f) => { if (now >= t && !done.has(k)) { done.add(k); f(); } };
  const pop = id => { const tile = U.tiles.find(x => x.id === id); U.applyUnlock(id, PRE > 0); if (PRE > 0) return; FX.unlockFx({ x: tile.x, z: tile.z }, 2.2); FX.coinsFx(V(tile.x, 0.6, tile.z), 6); }; // (for the music stem, silently: a shown unlock is spotlit and the music hushes under the spotlight, which left the spin's tune in pieces)
  const STAGE1 = [['turret', 1], ['runner', 1.5], ['roulette', 2], ['pack', 2.5], ['boots', 3], ['sled', 3.5], ['runner2', 4], ['net', 4.5]];
  const STAGE2 = ['paddy', 'farmer', 'seats', 'chef', 'tables', 'plot2', 'runner3', 'chef3', 'tables2', 'plot3', 'kiosk', 'porter']; // (all but the premium menu: the next clip buys it)

  let rush0 = null;
  // The season's change is the game's own: the whole world swaps in one frame (snow to grass, every tree). In play the
  // eye is on the stall; here it's the whole picture. A white bloom over it, up in five frames and off in eight: the
  // snow goes to white, and it's spring when the white clears.
  const bloom = document.createElement('div'); Object.assign(bloom.style, { position: 'fixed', inset: '0', background: '#FFFFFF', opacity: '0', pointerEvents: 'none', zIndex: '19' }); (document.getElementById('teaser') ?? document.body).appendChild(bloom); // (inside #teaser: the renderer hides everything else on the page)
  window.cine = {
    len: T.tail + PRE,
    setup() { player.g.position.set(4.6, 0.15, 6.3); player.h = 2.6; },
    frame(i, fps) {
      const t = i / fps - PRE;
      // (the spin has no game sounds of its own, the owner's note: the buying and the coins belong to real play. The world is
      // turned right down; the spin's own rush and landing go out on the cue bus; the music comes from the stem.)
      if (i < 12) A.dimWorld(0, 0.03);
      if (t < 0) { K.cam = camAt(0); return; }
      STAGE1.forEach(([id, b]) => once(id, at(b), t, () => pop(id)));
      // out of his rags and into his parka as the money comes in
      if (rags) once('coatFx', at(2.75) - 0.034, t, () => FX.unlockFx({ x: P.position.x, z: P.position.z }, 0.9)); /* (the sparkle a frame ahead of the change it covers, the change two frames into it: it was a bare one-frame swap with the sparkle after) */
      if (rags) once('coat', at(2.75) + 0.05, t, () => { rags.userData.restore(); });
      // the seasons turn: spring and summer blend in, autumn arrives in the smear with the restaurant
      once('summer', at(5), t, () => { SE.setSeason(1, 0, true); SE.setSeason(2, 0); }); /* (spring and then summer in the same frame, under the white bloom: the world blends on from the season before, so from winter the snow stayed; from spring, set whole, it clears to green. Spring used to be set at beat 3 with nothing over it: the ground stays snow at a season's start, but everyone's clothes change at once, so every hood and hat popped in one frame in plain view, an outside review) */
      once('sushi', at(8.25), t, () => { SE.setSeason(PRE > 0 ? BAND : 3, 30, true); U.applyUnlock('sushi', true); STAGE2.forEach(id => U.applyUnlock(id, true)); U.tiles.forEach(U.redrawTile); });
      // the wind-up: a rising rush of air under the spin, and a soft landing as it comes to rest on the restaurant
      once('riser', T.fast, t, () => { A.noise({ bus: 'cue', f: 90, f2: 260, kind: 'lowpass', d: T.slow - T.fast + 0.3, a: T.peak - T.fast, v: 0.6 }); }); // (the low half only: the half that swept up to 3 kHz was WHITE noise, and measured as hiss to 20 kHz for three seconds; the rise is the brown beds below now)
      // (the rush HELD under the whole smear, to a breath before the landing: the riser alone is gone a second before the blur is)
      if (t >= 0 && !rush0) rush0 = { a: K.soft(A, { kind: 'bandpass', f: 800, q: 0.5, smooth: 1600 }, 'cue'), b: K.soft(A, { kind: 'bandpass', f: 650, q: 0.8, smooth: 1200, from: 1.5 }, 'cue'),
        air: K.soft(A, { kind: 'lowpass', f: 380, q: 0.5, smooth: 700, from: 2.2 }, 'cue'), up: K.soft(A, { kind: 'bandpass', f: 1300, q: 0.7, smooth: 2400, from: 3.1 }, 'cue') }; // (brown noise, moving: a held band of white noise is static)
      if (rush0) { const k = ease((t - T.peak) / 0.5) * (1 - ease((t - T.there + 0.92) / 0.2)), m = 0.75 + 0.25 * K.n1(t * 3.1, 7);
        // (air under the turning world from its first frame, a breeze that moves: the game's sound stopped dead at the cut and
        // left the tune's plucks over nothing. And the rise into the smear: a higher band of the same brown noise, growing.)
        const rise = clamp((t - T.fast) / (T.peak - T.fast)); rush0.air.to(0.03 * (1 + 6 * (1 - ease(t / 0.7))) /* (up at once and seven times up, then down to its own level in a second: it faded in from nothing, a 0.12 s hole after the dock's louder air at the cut, an outside review's measurement) */ * (0.7 + 0.3 * K.n1(t * 0.9, 21)) * mix(1 - 0.6 * ease((t - T.peak) / 0.5), 1.6, ease((t - T.there + 0.92) / 0.5)), t < 0.1 ? 0.002 : 0.1); // (and it stays, a little up, under the landing: the hits there stood in dead air, digital silence between them, over a busy restaurant)
        rush0.up.to(0.085 * rise * rise * (1 - ease((t - T.slow) / 0.6)) * (0.8 + 0.2 * K.n1(t * 2.3, 23)), 0.06); rush0.a.to(0.165 * k * m, 0.06); rush0.b.to(0.092 * k * (1.5 - m), 0.06); /* (the cue bus is about 3.8 times the ambience bus) */ }
      once('land', T.there - 0.25, t, () => { A.tone({ bus: 'cue', f: 82, f2: 40, d: 1.0, v: 0.143 }); A.tone({ bus: 'cue', f: 240, f2: 150, d: 0.3, a: 0.002, type: 'triangle', v: 0.18 }); A.noise({ bus: 'cue', f: 900, f2: 480, q: 1.4, d: 0.1, a: 0.001, v: 0.09 }); /* (less sub, which only fed the limiter; a body small speakers play) */ [1318.5, 1760, 2637].forEach((f, n) => A.tone({ bus: 'cue', f, d: 1.3, t: n * 0.07, type: 'triangle', v: 0.1 })); });
      K.cam = camAt(t);
      { const veil = (at0, top) => { const d = t - (at0 - 0.012), k = d < 0 ? clamp(1 + d / 0.17) : clamp(1 - d / 0.27); return top * k * k * (3 - 2 * k); };
        // (and over the swap to autumn inside the smear: the blur hid its shapes, not its brightness, which fell by a third in one frame)
        bloom.style.opacity = String(Math.max(veil(at(5), 0.93), veil(at(8.25), 0.93))); /* (the second as white as the first: at 0.7 the market deck and then a close view of the restaurant showed through it on the two frames of the swap, an outside review) */ }
      // the smear: as many draws across the frame as the turn needs (one every 0.003 rad, about 3 px at the picture's
      // edge: further apart and a fence or a tree line shows as a row of stepped copies)
      // (a half-open shutter while it's slow, so what's being built stays sharp; wide open once it's a whip)
      const sh = mix(0.45, 1, clamp((rate(t) - 2) / 4)), turn = (angle(t + sh / fps) - angle(t)), n = Math.min(204, Math.round(turn / 0.0022)); // (the steps an outside review saw were the average losing its late draws, kit.js, not their spacing)
      K.blur = turn > 0.0004 ? { n: Math.max(12, n), at: k => camAt(t + sh * k / fps) } : null; /* (blurred until the turn is under half a pixel: it used to switch off below two draws, about five pixels of blur gone in one frame as the spin lands, on the sign) */
      if (i % 30 === 0) console.log('[cine]', t.toFixed(1), 'rate', rate(t).toFixed(2), 'draws', n, 'queue', CT.C1.queue.length);
    },
  };
})();
