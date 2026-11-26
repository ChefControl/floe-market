// Take L, the logo on black (after "Hello, Chef." nothing of the game shows again): the name comes in with the
// app icon and the one thing to do (the design system's Banner lettering: gold title, ink outline).
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const LEN = 5.2; const A = await window.__mod('audio.ts'); let hit = false;
  const card = document.createElement('div'); card.id = 'endCard';
  card.innerHTML = '<img src="/icon-512.png" alt=""><div class="t">Floe Market</div><div class="s">Wishlist on Steam</div>';
  const css = document.createElement('style');
  css.textContent = `
    #endCard{position:fixed;inset:0;z-index:25;display:grid;place-content:center;justify-items:center;gap:6px;pointer-events:none;
      font-family:"Floe Emoji","Baloo 2","Trebuchet MS",system-ui,sans-serif;font-weight:800;text-align:center;}
    #endCard img{width:150px;height:150px;border-radius:34px;box-shadow:0 8px 0 rgba(20,30,40,.45);margin-bottom:14px;}
    #endCard .t,#endCard .s{--ink:#173042;text-shadow:var(--o) 0 0 var(--ink),calc(-1*var(--o)) 0 0 var(--ink),0 var(--o) 0 var(--ink),0 calc(-1*var(--o)) 0 var(--ink),
      var(--o) var(--o) 0 var(--ink),calc(-1*var(--o)) var(--o) 0 var(--ink),var(--o) calc(-1*var(--o)) 0 var(--ink),calc(-1*var(--o)) calc(-1*var(--o)) 0 var(--ink),0 calc(var(--o) + 5px) 0 rgba(20,30,40,.45);}
    #endCard .t{--o:4px;font-size:118px;line-height:.95;color:#FFC34A;}
    #endCard .s{--o:3px;font-size:56px;color:#fff;margin-top:14px;}
    #endShade{position:fixed;inset:0;z-index:24;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, #0B1620, #05090D);}`;
  document.head.append(css);
  const shade = document.createElement('div'); shade.id = 'endShade';
  document.getElementById('teaser').append(shade, card);
  const [img, t, s] = card.children;
  const pop = (el, k) => { const b = 1 - Math.pow(1 - K.clamp(k), 3) * (1 - 1.7 * (1 - K.clamp(k))); el.style.opacity = K.clamp(k * 4); el.style.transform = `scale(${K.lerp(0.6, 1, b)})`; };
  window.cine = {
    len: LEN,
    frame(i, fps) {
      const t0 = i / fps;
      K.cam = { ...K.path([
        { t: 0, pos: [-16, 22, 30], look: [-2, 0, 2], fov: 40 },
        { t: LEN, pos: [4, 20, 31], look: [1, 0, 2], fov: 40 }], t0, k => k), fogNear: 70, fogFar: 170 };
      shade.style.opacity = 1;
      if (t0 >= 0.5 && !hit) { hit = true; A.tone({ f: 95, f2: 34, d: 0.6, v: 1 }); A.noise({ f: 170, kind: 'lowpass', d: 0.16, v: 0.7 }); }
      pop(img, (t0 - 0.35) / 0.45); pop(t, (t0 - 0.5) / 0.5); pop(s, (t0 - 1.4) / 0.45);
    },
  };
})();
