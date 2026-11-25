// Trailer kit, loaded before a shot's script (render-play.mjs <kit.js> is concatenated by run.sh).
// window.K: camera override (a path of keys the game's camera follows), captions in the game's banner lettering,
// easing, and the sun kept over what the camera looks at.
(async () => {
  const R = await window.__mod('render.ts');
  const T3 = await import('/node_modules/.vite/deps/three.js');
  const { Vector3 } = T3;
  const V = (x, y, z) => new Vector3(x, y, z);
  const clamp = (k, a = 0, b = 1) => Math.min(b, Math.max(a, k));
  const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeIO = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const cam = R.camera, lookAt = cam.lookAt.bind(cam);
  /** The shot's camera this frame: { pos, look, fov } or null for the game's own. */
  let shot = null;
  // (the game aims its camera with lookAt once a frame, main.ts, before it places its bubbles and draws: taking over
  // there keeps the bubbles on the people)
  cam.lookAt = (...a) => {
    if (!shot) return lookAt(...a);
    cam.position.copy(shot.pos);
    lookAt(shot.look);
    if (shot.roll) cam.rotateZ(shot.roll);
    const f = shot.fov ?? 40;
    if (cam.fov !== f) { cam.fov = f; cam.updateProjectionMatrix(); }
  };
  // Marketing leaves out elections, voting and Israel (owner, 2026-10-27): Floe Sushi's "World famous" string of world
  // flags has Israel's in the middle, so it's taken down for every shot (ads.ts restaurantAds, the last campaign).
  const { restaurantAds } = await window.__mod('ads.ts');
  const flagString = restaurantAds.at(-1).g;
  const draw = R.renderer.render.bind(R.renderer);
  R.renderer.render = (s, c) => {
    flagString.visible = false;
    if (shot && c === cam) {
      // the sun (and its shadows) over what the camera's on, not over the chef
      const at = shot.sun ?? shot.look;
      R.sun.position.copy(at).add(R.sunOff); R.sun.target.position.copy(at);
      if (shot.fogNear) { R.fog.near = shot.fogNear; R.fog.far = shot.fogFar; }
    }
    if (!shot && cam.fov !== 40) { cam.fov = 40; cam.updateProjectionMatrix(); }
    draw(s, c);
  };
  /** A camera path: keys [{t, pos:[x,y,z], look:[x,y,z], fov}] eased between, held after the last. */
  function path(keys, t, e = easeIO) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = b === a ? 0 : e((t - a.t) / (b.t - a.t));
    const mix = (p, q) => V(...p).lerp(V(...q), k);
    return { pos: mix(a.pos, b.pos), look: mix(a.look, b.look), fov: lerp(a.fov ?? 40, b.fov ?? 40, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
  }

  // ---------- captions: the game's banner lettering (design system Banner: Baloo 2 800, gold title, ink outline) ----
  const cap = document.createElement('div'); cap.id = 'sub';
  const css = document.createElement('style');
  css.textContent = `
    #sub{position:fixed;left:0;right:0;bottom:9%;z-index:20;pointer-events:none;text-align:center;font-family:"Floe Emoji","Baloo 2","Trebuchet MS",system-ui,sans-serif;font-weight:800;}
    #sub .t{--o:3px;--ink:#173042;display:inline-block;font-size:58px;line-height:1;color:#FFC34A;letter-spacing:.01em;
      text-shadow:var(--o) 0 0 var(--ink),calc(-1*var(--o)) 0 0 var(--ink),0 var(--o) 0 var(--ink),0 calc(-1*var(--o)) 0 var(--ink),
      var(--o) var(--o) 0 var(--ink),calc(-1*var(--o)) var(--o) 0 var(--ink),var(--o) calc(-1*var(--o)) 0 var(--ink),
      calc(-1*var(--o)) calc(-1*var(--o)) 0 var(--ink),0 calc(var(--o) + 5px) 0 rgba(20,30,40,.45);}
    #sub .k{--o:2px;--ink:#173042;display:block;margin-bottom:10px;font-size:20px;letter-spacing:.3em;color:#fff;text-transform:uppercase;
      text-shadow:var(--o) 0 0 var(--ink),calc(-1*var(--o)) 0 0 var(--ink),0 var(--o) 0 var(--ink),0 calc(-1*var(--o)) 0 var(--ink),0 calc(var(--o) + 3px) 0 rgba(20,30,40,.45);}
    #teaserBars{position:fixed;inset:0;z-index:19;pointer-events:none;}
    #teaserBars::before,#teaserBars::after{content:"";position:absolute;left:0;right:0;height:var(--bar,0px);background:#000;}
    #teaserBars::before{top:0} #teaserBars::after{bottom:0}
    #teaserFade{position:fixed;inset:0;z-index:30;pointer-events:none;background:#000;opacity:0;}`;
  document.head.append(css);
  document.body.append(cap);
  const bars = document.createElement('div'); bars.id = 'teaser'; bars.innerHTML = '<div id="teaserBars"></div><div id="teaserFade"></div>';
  document.body.append(bars);
  const barsEl = bars.firstChild, fadeEl = bars.lastChild;
  /** The caption at time t: [from, to, text, kicker?] — pops in with the banner's overshoot, out with a quick fade. */
  function caption(list, t) {
    const c = list.find(([a, b]) => t >= a && t < b);
    if (!c) { cap.style.opacity = 0; return; }
    const [a, b, text, kicker] = c;
    const html = (kicker ? `<span class="k">${kicker}</span>` : '') + `<span class="t">${text}</span>`;
    if (cap.dataset.h !== html) { cap.innerHTML = html; cap.dataset.h = html; }
    const kin = clamp((t - a) / 0.28), back = 1 - Math.pow(1 - kin, 3) * (1 - 1.7 * (1 - kin)); // (a slight overshoot)
    const s = lerp(0.7, 1, back), o = Math.min(clamp((t - a) / 0.12), clamp((b - t) / 0.2));
    cap.style.opacity = o; cap.style.transform = `scale(${s})`;
  }
  /** Black bars top and bottom, `px` tall each. */
  const letterbox = px => barsEl.style.setProperty('--bar', `${px}px`);
  /** Black over everything, 0 to 1. */
  const fade = k => { fadeEl.style.opacity = clamp(k); };

  window.K = { R, T3, V, clamp, ease, easeIO, easeOut, lerp, path, caption, letterbox, fade,
    set cam(s) { shot = s; }, get cam() { return shot; } };
  window.__kitReady = true;
})();
