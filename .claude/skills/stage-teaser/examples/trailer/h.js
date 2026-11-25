// Take H, three thuds (the demo's ?upto=porter: no hatch of the game's yet, so nothing knocks but this): the music has
// stopped; low on the dock at dusk, a hatch in the planks jumps three times, a thud on each beat, as the sea did at
// the start. The hatch is the game's own (fugu.ts), put where the game puts it.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V, clamp, ease } = K;
  const { player } = await window.__mod('player.ts');
  const FG = await window.__mod('fugu.ts'), STG = await window.__mod('stage.ts'), A = await window.__mod('audio.ts'), FX = await window.__mod('fx.ts');
  const BEAT = 60 / 92, at = n => n * BEAT, HITS = [at(1), at(2), at(3)], AT = V(6.0, 0.15, -5.1);
  const hatch = new FG.Hatch(); hatch.position.copy(AT); hatch.rotation.y = Math.PI; K.R.scene.add(hatch);
  const pill = document.createElement('div');
  Object.assign(pill.style, { position: 'fixed', left: 0, top: 0, zIndex: 21, width: '46px', height: '46px', margin: '-23px 0 0 -23px', borderRadius: '50%',
    display: 'grid', placeItems: 'center', background: '#fff', color: '#C93F25', font: '800 32px/1 "Baloo 2",system-ui,sans-serif',
    boxShadow: '0 3px 0 rgba(23,48,66,.25), 0 0 0 3px #FFC34A', pointerEvents: 'none', transform: 'scale(0)' });
  pill.textContent = '!'; document.getElementById('teaser').append(pill);
  const said = new Set(), once = (k, t, now, f) => { if (now >= t && !said.has(k)) { said.add(k); f(); } };
  const thud = big => { A.tone({ f: 95, f2: 34, d: 0.55, v: 0.75 + big * 0.25 }); A.noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.5 + big * 0.2 }); };
  let now = { i: 0, fps: 30 };
  K.pose = () => {
    const t = now.i / now.fps;
    player.g.visible = false;
    STG.setNight(0.3);
    hatch.update(1 / now.fps);
    HITS.forEach((h, n) => once('h' + n, h, t, () => { hatch.knock(); thud(n / 2); FX.dustFx(AT.clone().add(V(0, 0.08, 0.5)), 5 + n * 3, 0.8 + n * 0.3); }));
    const last = HITS.filter(h => h <= t).at(-1) ?? -9, sh = Math.max(0, 1 - (t - last) / 0.18) * 0.03;
    const p = K.path([{ t: 0, pos: [6.95, 1.55, -0.9], look: [6.0, 0.5, -5.1], fov: 40 }, { t: at(5), pos: [6.5, 1.2, -2.5], look: [6.0, 0.45, -5.1], fov: 40 }], t, k => k);
    p.pos.add(V(Math.sin(t * 90) * sh, Math.cos(t * 70) * sh, 0));
    K.cam = p;
  };
  K.after = cam => {
    const t = now.i / now.fps, k = clamp((t - HITS[0]) / 0.14);
    if (t < HITS[0]) { pill.style.transform = 'scale(0)'; return; }
    const s = AT.clone().add(V(0, 1.15, 0)).project(cam);
    pill.style.transform = `translate(${(s.x + 1) / 2 * innerWidth}px, ${(1 - s.y) / 2 * innerHeight}px) scale(${(k + 0.5 * Math.sin(k * Math.PI)) * 1.5})`;
  };
  window.cine = { len: at(5), frame(i, fps) { now = { i, fps }; if (!K.cam) K.cam = { pos: V(6.95, 1.55, -0.9), look: AT, fov: 40 }; } };
})();
