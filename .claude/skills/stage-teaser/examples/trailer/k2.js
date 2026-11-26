// Take K2, the knock (the demo's default: Floe Sushi built, someone knocking): the game's own scene (offer.ts
// meet()) with its own sound and light, on the clip's cameras once night has fallen. Black bars from there on: the
// hatch from the deck beside it as the two shoves throw the lid up; the blast from behind the chef, a shape against
// the light; low on Mr. Fugu so he looms as the game lights him; then a cut onto his face as his shades catch the
// light, and his line in the game's own red toast, like a subtitle. No pull back. Black.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, easeOut } = K;
  const OF = await window.__mod('offer.ts'), UI = await window.__mod('ui.ts'), A = await window.__mod('audio.ts');
  const mix = (a, b, k) => a + (b - a) * k;
  // the scene's own clock from meet(): the blinks 1.2 s, nightfall, the encounter at 5.4 s (offer.ts)
  const E = 5.4, T = { night: 4.6, hatch: E + 1.2, blast: E + 3.4, wide: E + 3.3, rise: E + 4.1, low: E + 6.2, talk: E + 8.4, end: E + 11.4 };
  const HEAD = V(6.0, 1.52, -5.05); // his shades, once he's up
  const css = document.createElement('style');
  // (the game's own "That night…" is small grey type for a player who's waiting for it: here it's the clip's caption)
  css.textContent = `#offerCaption{opacity:0!important} #sub .t{font-size:44px!important}
    body.k2line #offerSay{opacity:0!important}
    body.k2line #toast{top:auto!important;bottom:70px!important;transform:translateX(-50%) scale(1.7)!important;transform-origin:50% 100%;z-index:40!important;opacity:1!important}`;
  document.head.append(css);
  // his own light for the last shots: the hatch's glow from below, warm on his chin and the brim of his hat
  const glow = new K.T3.PointLight(0xFF8A3C, 0, 7, 1.6); glow.position.set(5.85, 0.45, -4.25); K.R.scene.add(glow);
  // moonlight for the wait before the blast: the game's night is right for play and too dark for a film, where the
  // chef and the hatch have to separate from the deck. A cool fill and a rim from over the water; gone at the blast.
  const moon = new K.T3.DirectionalLight(0x9DBEFF, 0), fill = new K.T3.AmbientLight(0x6E8FC4, 0);
  moon.position.set(1.5, 7, -14); moon.target.position.set(6, 0, -5); K.R.scene.add(moon, moon.target, fill);
  let fugu = null, said = false, glinted = false, boomed = false;
  let now = { i: 0, fps: 30 };
  K.pose = () => {
    const t = now.i / now.fps;
    if (now.i === 0) OF.meet(false);
    fugu ??= K.R.scene.children.find(o => typeof o.glint === 'function' && typeof o.stare === 'function') ?? null;
    // (his light comes up as he does: by the time the camera's on his face there's a face to see)
    glow.intensity = 2.1 * ease((t - T.rise) / 1.1) * (1 + 0.06 * Math.sin(t * 9));
    { const night = ease((t - 2.6) / 1.2) * (1 - 0.8 * ease((t - T.blast + 0.1) / 0.3)); moon.intensity = 2.3 * night; fill.intensity = 0.9 * night; }
    // (the game brings him out of the dark over two seconds; the film has a camera on his face by then)
    if (t >= T.low - 0.15) fugu?.shade?.(mix(0.03, 1, ease((t - T.low + 0.15) / 0.7)));
    K.caption([[T.night + 0.15, T.night + 2.0, 'That night…']], t);
    // the blast, heavier than the game plays it (a trailer's loudest moment), and a low note under his line
    if (t >= T.blast - 0.02 && !boomed) { boomed = true; A.tone({ f: 92, f2: 30, d: 1.3, v: 1.0 }); A.noise({ f: 320, kind: 'lowpass', d: 0.55, v: 0.75 }); A.noise({ f: 2200, f2: 500, q: 0.7, d: 0.9, a: 0.02, v: 0.22 }); }
    if (t < T.night) { K.cam = null; K.letterbox(0); K.vignette(0); return; }
    // From here it's a film: black bars from this cut to the end, and the clip's own cameras.
    K.letterbox(64); K.vignette(0.4);
    if (t < T.hatch) {
      // night on the dock, from behind the chef: him, the hatch, the moonlit water; the first shove lifts the lid
      const k = (t - T.night) / (T.hatch - T.night);
      K.cam = { pos: V(mix(7.0, 6.85, k), mix(1.55, 1.45, k), mix(-0.35, -0.7, k)), look: V(5.9, 0.7, -5.05), fov: 42 };
    } else if (t < T.wide) {
      // the hatch, from the deck beside it (the water behind it): the second shove throws the lid up and the light out
      const k = (t - T.hatch) / (T.wide - T.hatch);
      K.cam = { pos: V(mix(7.1, 7.0, k), mix(0.44, 0.38, k), mix(-3.35, -3.5, k)), look: V(6.0, 0.3, -5.05), fov: 36 };
    } else if (t < T.low) {
      // the blast, from behind the chef: he's a shape against the light, and something's coming up into it
      const k = ease((t - T.wide) / (T.low - T.wide));
      K.cam = { pos: V(mix(6.75, 6.6, k), mix(1.3, 1.2, k), mix(-0.75, -1.05, k)), look: V(5.95, mix(0.9, 1.15, k), -5.05), fov: 40 };
    } else if (t < T.talk - 0.1) {
      // low and close on him: he looms. A slow creep in.
      const creep = ease((t - T.low) / (T.talk - T.low));
      // (from the sea side of the chef, who stands at his other shoulder: nothing between the camera and him)
      K.cam = { pos: V(mix(7.0, 6.88, creep), 0.55, mix(-2.55, -2.9, creep)), look: V(6.0, 1.26, -5.05), fov: 36 };
    } else {
      // the cut onto his face as his shades catch the light: head, hat and shoulders, from where the chef stands
      // (between the two of them: from behind the chef his hat fills the picture); a slow push in while he says it
      const push = clamp((t - T.talk) / 3);
      K.cam = { pos: V(5.64 + 0.06 * push, 1.44, -3.5 - 0.3 * push), look: V(6.0, 1.41, -5.05), fov: 48 };
    }
    if (t >= T.talk - 0.1 && !glinted) { glinted = true; fugu?.glint(); A.tone({ f: 2400, f2: 3600, d: 0.25, type: 'triangle', v: 0.18 }); A.tone({ f: 58, f2: 41, d: 2.4, type: 'triangle', v: 0.6 }); }
    if (t >= T.talk + 0.05 && !said) { said = true; document.body.classList.add('k2line'); UI.toast('Hello, Chef.', 'k2', 6000); }
  };
  window.cineType = { marks: { night: Math.round(T.night * 30), hatch: Math.round(T.hatch * 30), blast: Math.round(T.blast * 30), low: Math.round(T.low * 30), talk: Math.round(T.talk * 30) } };
  window.cine = { len: T.end, frame(i, fps) { now = { i, fps }; } };
})();
