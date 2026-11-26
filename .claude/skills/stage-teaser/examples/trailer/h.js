// Take H, three thuds, and the end of the story (the demo's ?upto=porter: no hatch of the game's yet, so nothing knocks
// but this): the music has stopped; low on the dock at dusk, a hatch in the planks jumps three times, a thud on each
// beat, as the sea did at the start, each harder than the last; then, in the quiet, the lid lifts a dark crack. Black.
// (The night that followed, the blast and "Hello, Chef." were cut by the owner: the trailer ends on not knowing.)
// The hatch is the game's own (fugu.ts), put where the game puts it; its knock, its shove and its peek are the game's.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease, n1 } = K;
  const { player } = await window.__mod('player.ts');
  const FG = await window.__mod('fugu.ts'), STG = await window.__mod('stage.ts'), A = await window.__mod('audio.ts'), FX = await window.__mod('fx.ts');
  const BEAT = 60 / 92, at = n => n * BEAT, HITS = [at(1), at(2) - 0.12, at(3)], PEEK = at(3) + 0.92, GLINT = PEEK + 0.72, LEN = GLINT + 1.4, AT = V(6.0, 0.15, -5.1);
  const hatch = new FG.Hatch(); hatch.position.copy(AT); hatch.rotation.y = Math.PI; K.R.scene.add(hatch);
  hatch.lift.visible = false;
  // The game has a hatch of its own lying shut on this very spot from this state on: under a lifted lid it shows as a
  // second lid, ring and all. Hidden for the take (every frame: the game may show it again).
  const others = []; K.R.scene.traverse(o => { if (o instanceof FG.Hatch && o !== hatch) others.push(o); });
  console.log('[cine] the game\'s own hatches hidden: ' + others.length);
  // Under the lid, for the crack it opens: the dark. (The dock here has a trapdoor of its own painted on it, which shows
  // under the lifted lid as a second lid. So a black leaf is hinged where the lid is and lifts half as far: it covers
  // that, and what's seen in the wedge between the two is black.) And in the dark, at the very end, two small glints:
  // something looking out. (The game's own first peek at him is
  // just this: his shades catching the light in a dark crack. Nothing more of him is shown.)
  const { Mesh, MeshBasicMaterial, PlaneGeometry, Sprite, SpriteMaterial, CanvasTexture, AdditiveBlending } = K.T3;
  const spark = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(0.3, 'rgba(255,200,120,.5)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c); })();
  const glints = [-0.085, 0.085].map(x => { const s = new Sprite(new SpriteMaterial({ map: spark, blending: AdditiveBlending, depthWrite: false, fog: false, opacity: 0 })); s.position.set(x * 1.25, 0.04, -1.07); s.scale.setScalar(0.12); return s; });
  const leaf = new K.T3.Group(); leaf.position.copy(hatch.lid.position); hatch.add(leaf);
  { const g = new PlaneGeometry(1.16, 1.14); g.rotateX(-Math.PI / 2); g.translate(0, 0, -0.57); const m = new Mesh(g, new MeshBasicMaterial({ color: 0x05070A, side: K.T3.DoubleSide })); leaf.add(m, ...glints); }
  leaf.visible = false;
  const pill = document.createElement('div');
  Object.assign(pill.style, { position: 'fixed', left: 0, top: 0, zIndex: 21, width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%',
    display: 'grid', placeItems: 'center', background: '#fff', color: '#C93F25', font: '800 32px/1 "Baloo 2",system-ui,sans-serif',
    boxShadow: '0 3px 0 rgba(23,48,66,.25), 0 0 0 3px #FFC34A', pointerEvents: 'none', transform: 'scale(0)' });
  pill.textContent = '!'; document.getElementById('teaser').append(pill);
  const said = new Set(), once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  // (the same thud as the sea's at the start and the logo's at the end; bigger each time, with more of the 150-400 Hz a phone can play)
  // The dock's own sounds (plates, customers, the till) tick on under everything from this state of the game: with the
  // music cut they're all that's heard in the "quiet". So the world is turned right down (audio.ts dimWorld) and this take's
  // sounds go out on the cue bus, which that leaves alone.
  const tone = o => A.tone({ bus: 'cue', ...o }), noise = o => A.noise({ bus: 'cue', ...o }), CUE = { noise };
  // (the trailer's thud, the same as the sea's at the start and the logo's at the end: a low tone for the weight, and
  // over it a triangle and a band of noise, which is all of it a laptop or a phone can play)
  const thud = big => { const amp = 0.5 * Math.pow(2, big);
    tone({ f: 95, f2: 34, d: 0.55, v: 0.092 * amp }); tone({ f: 240, f2: 150, d: 0.3, a: 0.002, type: 'triangle', v: 0.149 * amp }); tone({ f: 440, f2: 230, d: 0.2, a: 0.002, type: 'triangle', v: 0.085 * amp });
    noise({ f: 700, f2: 300, q: 1.5, d: 0.15, a: 0.001, v: 0.134 * amp }); noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.106 * amp });
    noise({ f: 900, f2: 480, q: 1.4, d: 0.1, a: 0.001, v: 0.1 * amp }); }; // (the knock a phone has: 400-900 Hz)
  let now = { i: 0, fps: 30 };
  K.pose = () => {
    const t = now.i / now.fps;
    player.g.visible = false; for (const o of others) o.visible = false;
    STG.setNight(0.3);
    if (now.i < 12) A.dimWorld(0, 0.03); // (dimWorld, not hushWorld: the game sets its hush afresh every tick, and would undo it)
    // dusk on the dock: a low bed that HOLDS (so the cut from the music isn't into a dead track), thinning before the crack
    once('bed', 0.12, t, () => { K.bed(CUE, 380, 520, 0.4, PEEK - 0.3, 0.06, 0.07, 0.5); K.bed(CUE, 260, 200, 1, PEEK - 0.3, 0.055, 0.09, 0.5, 'lowpass');
      K.bed(CUE, 380, 520, 0.4, LEN - 0.3, 0.017, 0.25, 0.15); }); // (and a breath of it right through: the stillness is quiet, not a dead track)
    // each knock: the lid jumps (the game's knock), harder each time (its shove on top), dust out of the cracks round it
    HITS.forEach((h, n) => once('h' + n, h - 0.034, t, () => { hatch.knock(); thud(n / 2);
      FX.dustFx(AT.clone().add(V(0, 0.08, 0.5)), 5 + n * 3, 0.45 + n * 0.18); if (n) FX.dustFx(AT.clone().add(V(n === 2 ? -0.55 : 0.5, 0.08, 0.1)), 3 + n * 2, 0.4 + n * 0.1); }));
    // (the lid rattles down after the hard one: two small bounces, each softer)
    once('r1', HITS[2] + 0.2, t, () => { hatch.knock(); tone({ f: 520, f2: 300, d: 0.06, type: 'triangle', v: 0.1 }); tone({ f: 170, f2: 90, d: 0.07, v: 0.06 }); }); once('r2', HITS[2] + 0.34, t, () => tone({ f: 560, f2: 340, d: 0.05, type: 'triangle', v: 0.09 }));
    // ...and then, in the quiet, it lifts a crack: dark under it, a breath of warm light on the planks
    once('peek', PEEK, t, () => { hatch.peekTo = 1; tone({ f: 150, f2: 235, d: 0.5, a: 0.25, type: 'triangle', v: 0.045 }); tone({ f: 420, f2: 640, d: 0.5, a: 0.25, type: 'triangle', v: 0.04 });
      // (a hum under the lifting lid: quiet, and with an octave on it that small speakers have)
      tone({ f: 46, f2: 58, a: 0.5, hold: LEN - PEEK - 0.7, d: 0.15, v: 0.013 }); tone({ f: 92, f2: 116, a: 0.5, hold: LEN - PEEK - 0.7, d: 0.15, type: 'triangle', v: 0.026 });
      tone({ f: 184, f2: 232, a: 0.5, hold: LEN - PEEK - 0.7, d: 0.15, type: 'triangle', v: 0.012 }); tone({ f: 368, f2: 464, a: 0.5, hold: LEN - PEEK - 0.7, d: 0.15, type: 'triangle', v: 0.006 }); }); // (two more octaves of it: what a phone plays of a hum)
    // (the shove on top of the game's knock, harder each time: thrown up, down, and a rattle: the game leaves this to whoever's shoving)
    hatch.jolt = HITS.reduce((s, h, n) => { const dt = t - h; return s + (dt > 0 ? [0, 0.1, 0.24][n] * Math.exp(-dt * 8) * Math.abs(Math.cos(dt * 20)) : 0); }, 0) + 0.16 * ease((t - PEEK) / 0.9) * (1 + n1(t * 6, 5) * 0.06);
    hatch.light.intensity = 2.4 * ease((t - PEEK - 0.1) / 0.6) * (1 + n1(t * 9, 3) * 0.12);
    hatch.update(1 / now.fps);
    leaf.visible = t > PEEK + 0.03; leaf.rotation.x = hatch.lid.rotation.x * 0.5;
    // (the glints: on, a blink, on; the last thing in the picture)
    // (twelve frames on, three off, and on again for as long before the black: long enough that the blink is a blink)
    // (and a blink has lids: a frame squashed flat going shut and another coming open, not a light switched off and on)
    { const g = t - GLINT, on = g > 0 && !(g > 0.4 && g < 0.5) ? Math.min(1, g / 0.08) : 0, lid = (g > 0.36 && g <= 0.4) || (g >= 0.5 && g < 0.54) ? 0.3 : 1;
      for (const s of glints) { s.material.opacity = on * (0.85 + n1(t * 14, 6) * 0.1); s.scale.set(0.12, 0.12 * lid, 1); } }
    once('glint', GLINT - 0.034, t, () => tone({ f: 2400, f2: 2600, d: 0.45, a: 0.01, type: 'triangle', v: 0.1 }));
    K.vignette(0.75 + 0.15 * ease((t - PEEK) / 0.8));
    // The camera: over the hatch, held; knocked by each thud, harder each time; and it creeps in once the lid starts to lift
    const push = ease((t - PEEK) / (LEN - PEEK)), k = t / LEN;
    let p = K.held({ pos: V(6.75 - 0.2 * k - 0.1 * push, 3.0 - 0.4 * k - 0.35 * push, -2.9 - 0.5 * k - 0.3 * push), look: V(6.0, 0.15 + 0.1 * push, -5.15), fov: 36 - 3 * push }, t, 1.1, 21);
    HITS.forEach((h, n) => { p = K.jolt(p, t, h, 0.035 + n * 0.03, 30); });
    K.cam = p;
  };
  K.after = cam => {
    const t = now.i / now.fps, k = clamp((t - HITS[0]) / 0.14);
    if (t < HITS[0] || t > PEEK + 0.12) { pill.style.transform = 'scale(0)'; return; }
    // (it jumps with each thud, as the lid does)
    const last = HITS.filter(h => h <= t).at(-1), bump = Math.max(0, 1 - (t - last) / 0.2);
    const s = AT.clone().add(V(0, 0.55, -0.55)).project(cam);
    const out = 1 - clamp((t - PEEK) / 0.12);
    pill.style.transform = `translate(${(s.x + 1) / 2 * innerWidth}px, ${(1 - s.y) / 2 * innerHeight - bump * 10}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5 * (1 + 0.18 * bump) * out})`;
  };
  window.cine = { len: LEN, frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(6.95, 1.55, -0.9), look: AT, fov: 40 }; } };
})();
