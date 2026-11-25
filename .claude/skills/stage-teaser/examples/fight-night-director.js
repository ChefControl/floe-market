// Runs inside the game page: drives the camera through the shot list (keyed to the bout's phases), draws the titles
// over each frame on a 2D canvas, and records that canvas with the game's own sound.
(async () => {
  const R = window.__R, { bout, player } = window.__mods;
  const { tiles } = await window.__mod('unlocks.ts');
  const { scene } = R;
  const gl = R.canvas, W = gl.width, H = gl.height;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d');
  // Hide the floor squares (upgrades, shops) and the player; the player stands ringside so the crowd is heard in full.
  scene.traverse(o => {
    const p = o.geometry?.parameters;
    if (o.isMesh && p && p.width && p.width <= 3.2 && Math.abs(o.position.y + 29.98) < 0.1 && o.material?.map?.image instanceof HTMLCanvasElement) o.visible = false;
  });
  scene.traverse(o => {
    if (!o.isMesh) return;
    const p = o.getWorldPosition(new o.position.constructor());
    if (p.y > -30.05 && p.y < -29.9 && Math.hypot(p.x - 0.0, p.z - 5.4) < 1.6) o.visible = false;
  });
  player.g.visible = false;
  player.g.position.set(0.5, -30, 1.6);
  const RING = [-4.4, -30, -1.4];
  const r = (dx, dy, dz) => [RING[0] + dx, RING[1] + dy, RING[2] + dz];
  const ease = k => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const move = (p0, p1, l0, l1) => k => ({ pos: mix(p0, p1, ease(k)), look: mix(l0, l1, ease(k)) });
  const S = {
    ladder: move([6.0, -23.4, 3.4], [6.7, -25.8, 3.0], [9.6, -27.4, -1.6], [9.4, -29.1, -1.6]),
    kitchen: move([8.6, -25.0, 9.0], [8.3, -26.1, 7.1], [8.6, -29.5, 2.4], [8.4, -29.4, 2.6]),
    office: move([7.55, -26.5, -4.3], [7.55, -27.4, -5.3], [7.55, -28.4, -8.7], [7.55, -28.7, -8.7]),
    arena: move(r(7.5, 9.5, 12.5), r(4.6, 6.2, 9.4), r(0, 0.4, 0), r(0, 0.8, 0)),
    shiko: move(r(3.0, 3.7, 6.3), r(2.1, 3.1, 5.5), r(0, 1.3, 0), r(0, 1.2, 0)),
    crouch: move(r(5.4, 2.7, 2.0), r(4.8, 2.4, 1.6), r(-1.0, 1.0, 0), r(-1.0, 0.95, 0)),
    clash: k => {
      // Follows the pair (the winner drives the loser to the edge), from off the east side, so the push runs into the frame.
      const a = 0.42 + 0.38 * ease(k), d = 5.6 - 0.6 * ease(k), s = 0.3 * Math.exp(-k * 9), t = performance.now() / 1000;
      const m = mid();
      return { pos: [m[0] + Math.cos(a) * d + Math.sin(t * 61) * s, m[1] + 2.4 + Math.sin(t * 47) * s, m[2] + Math.sin(a) * d], look: [m[0], m[1] + 1.0, m[2]] };
    },
    win: k => {
      const m = mid(), e = ease(k);
      return { pos: mix(r(-1.8, 3.6, 6.8), r(-3.0, 7.0, 10.2), e), look: mix([m[0], m[1] + 1.0, m[2]], r(0, 1.4, -2.0), e) };
    },
    end: move(r(-3.0, 7.0, 10.2), r(-3.6, 9.4, 12.6), r(0, 1.4, -2.0), r(0, 1.8, -3.0)),
  };
  // The middle of the two wrestlers, eased so the camera glides after them.
  let sm = null;
  function mid() {
    const e = bout.east?.g.position, w = bout.west?.g.position;
    const m = e && w ? [(e.x + w.x) / 2, (e.y + w.y) / 2, (e.z + w.z) / 2] : [RING[0], RING[1] + 0.6, RING[2]];
    sm = sm ? mix(sm, m, 0.08) : m;
    return sm;
  }
  const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
  function title(lines, a, { y = H * 0.8, size = 58, fill = '#FFF1D2', stroke = '#2A1208', scale = 1, spacing = 0 } = {}) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = Math.min(1, a); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(W / 2, y); c.scale(scale, scale);
    c.font = `800 ${size}px ${FONT}`; c.letterSpacing = `${spacing}px`;
    lines.forEach((t, i) => {
      const yy = (i - (lines.length - 1) / 2) * size * 1.02;
      c.lineJoin = 'round'; c.lineWidth = size * 0.2; c.strokeStyle = stroke; c.strokeText(t, 0, yy);
      c.fillStyle = fill; c.fillText(t, 0, yy);
    });
    c.restore();
  }
  // How much of a caption shows, k seconds into a shot of len seconds: in quickly, out at the cut.
  const cap = (t, len) => Math.min(1, t / 0.35, (len - t) / 0.25 + 0.2);
  function vignette(k = 0.55) {
    const g = c.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.72);
    g.addColorStop(0, 'rgba(10,4,0,0)'); g.addColorStop(1, `rgba(10,4,0,${k})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  const D = { start: 0, marks: {}, last: '', done: false, rec: null, chunks: [] };
  window.__D = D;
  const CUT = [2.8, 5.6, 8.4];
  function shotAt(now) {
    const t = now - D.start, m = D.marks, ph = bout.phase;
    if (!m.shiko) {
      if (t < CUT[0]) return ['ladder', t / CUT[0], t, CUT[0]];
      if (t < CUT[1]) return ['kitchen', (t - CUT[0]) / 2.8, t - CUT[0], 2.8];
      if (t < CUT[2]) return ['office', (t - CUT[1]) / 2.8, t - CUT[1], 2.8];
      return ['arena', (t - CUT[2]) / 2.6, t - CUT[2], 99];
    }
    if (m.leave2) return ['end', (now - m.leave2) / 4.8, now - m.leave2, 4.8];
    if (ph === 'shiko') return ['shiko', (now - m.shiko) / 2.4, now - m.shiko, 2.4];
    if (ph === 'crouch') return ['crouch', (now - m.crouch) / 1.6, now - m.crouch, 1.6];
    if (ph === 'charge' || ph === 'push') return ['clash', (now - m.charge) / 3.5, now - m.charge, 3.5];
    return ['win', (now - m.out) / 3.0, now - m.out, 3.0];
  }

  const orig = R.renderer.render.bind(R.renderer);
  window.__shot = null;
  R.renderer.render = (s, cam) => {
    const now = performance.now() / 1000;
    tiles.forEach(t => { t.d.mesh.visible = false; });
    const ph = bout.phase;
    if (ph !== D.last) {
      if (!D.start && ph === 'leave' && D.armed) { D.start = now; startRec(); }
      else if (D.start) { if (ph === 'leave' && D.marks.bow) D.marks.leave2 = now; else D.marks[ph] ??= now; }
      D.last = ph;
    }
    let shot = null;
    if (D.start && !D.done) {
      shot = shotAt(now);
      const v = S[shot[0]](shot[1]);
      cam.position.set(...v.pos); cam.lookAt(...v.look);
    }
    orig(s, cam);
    if (!D.start || D.done) return;
    c.drawImage(gl, 0, 0, W, H);
    vignette(shot[0] === 'end' ? 0.6 : 0.5);
    const [name, , t, len] = shot;
    if (name === 'ladder') { title(['Under the dock…'], cap(t, len)); c.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - t / 0.6)})`; c.fillRect(0, 0, W, H); }
    if (name === 'kitchen') title(['the chanko', 'never stops…'], cap(t, len));
    if (name === 'office') title(['Mr. Fugu', 'takes the bets…'], cap(t, len));
    if (name === 'arena') title(['and the crowd', 'wants a fight.'], Math.min(1, t / 0.35));
    if (name === 'shiko') title(['and the crowd', 'wants a fight.'], 1 - t / 0.3);
    if (name === 'clash' && t < 1.3) {
      const pop = 1 + 0.5 * Math.exp(-t * 12);
      title(['HAKKEYOI!'], Math.min(1, (1.3 - t) / 0.3), { y: H * 0.24, size: 104, fill: '#FFD34A', stroke: '#5A0E06', scale: pop });
    }
    if (name === 'win' && bout.winner && D.marks.bow) {
      const tb = now - D.marks.bow;
      title([`${bout.winner.name}`, 'wins!'], Math.min(1, tb / 0.3), { y: H * 0.22, size: 76, fill: '#FFD34A', stroke: '#5A0E06', scale: 1 + 0.3 * Math.exp(-tb * 10) });
    }
    if (name === 'end') {
      c.fillStyle = `rgba(14,6,2,${0.72 * ease(t / 1.0)})`; c.fillRect(0, 0, W, H);
      const a = k => ease((t - k) / 0.6);
      title(['FLOE MARKET  ·  STAGE 3'], a(0.6), { y: H * 0.34, size: 30, fill: '#F2C14E', stroke: '#1A0A03', spacing: 3 });
      title(['THE DOHYO', 'BELOW'], a(0.9), { y: H * 0.45, size: 104, scale: 1 + 0.08 * (1 - a(0.9)) });
      title(['Coming soon'], a(1.8), { y: H * 0.6, size: 44, fill: '#FFF1D2' });
      if (t >= 4.8) stopRec();
    }
  };

  function startRec() {
    const vs = out.captureStream(30).getVideoTracks();
    const as = window.__tap ? window.__tap.stream.getAudioTracks() : [];
    D.audio = as.length;
    D.rec = new MediaRecorder(new MediaStream([...vs, ...as]), { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 14e6, audioBitsPerSecond: 192e3 });
    D.rec.ondataavailable = e => D.chunks.push(e.data);
    D.rec.onstop = async () => {
      const b = new Blob(D.chunks, { type: 'video/webm' });
      const u8 = new Uint8Array(await b.arrayBuffer());
      let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      D.b64 = btoa(s);
    };
    D.rec.start(500);
  }
  function stopRec() { if (D.done) return; D.done = true; D.rec.stop(); }
  D.armed = true;
})();
