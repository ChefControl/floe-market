// The cinematic's soundtrack, rendered offline: night water, a drone, three shoves at the trapdoor (the third the
// blast), smoke, the lift, a dark swell, a second's silence, a glint, "Hello, Chef.", and a low hit.
window.soundtrack = async ({ type: TYPE, end: END }) => {
  const SR = 48000, LEN = END + 0.8 + 8.2;
  const ac = new OfflineAudioContext(2, SR * LEN, SR);
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const master = ac.createGain(); master.gain.value = 0.5;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(comp); comp.connect(ac.destination);
  // a room for the voice and the hits: a decaying noise tail
  const verb = ac.createConvolver();
  { const n = SR * 2.2, b = ac.createBuffer(2, n, SR);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    verb.buffer = b; }
  const wet = ac.createGain(); wet.gain.value = 0.32; verb.connect(wet); wet.connect(master);
  const noiseBuf = (() => { const b = ac.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
  const brownBuf = (() => { const b = ac.createBuffer(1, SR * 4, SR), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (rnd() * 2 - 1)) / 1.02; d[i] = l * 3.5; } return b; })();
  const out = (node, g = 1, rv = 0, pan = 0) => {
    const p = ac.createStereoPanner(); p.pan.value = pan; const gg = ac.createGain(); gg.gain.value = g;
    node.connect(gg); gg.connect(p); p.connect(master);
    if (rv) { const s = ac.createGain(); s.gain.value = rv; gg.connect(s); s.connect(verb); }
    return gg;
  };
  const env = (t, a, hold, d, v, curve = 'exp') => {
    const g = ac.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, Math.max(0, t));
    g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + a + hold);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d); else g.gain.linearRampToValueAtTime(0, t + a + hold + d);
    return g;
  };
  function noise(t, d, { f = 1000, q = 0.7, type = 'lowpass', a = 0.005, hold = 0, v = 0.5, f2, brown, rv = 0, pan = 0, curve } = {}) {
    const s = ac.createBufferSource(); s.buffer = brown ? brownBuf : noiseBuf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + hold + d);
    const g = env(t, a, hold, d, v, curve);
    s.connect(fl); fl.connect(g); out(g, 1, rv, pan);
    s.start(t, rnd() * 3); s.stop(t + a + hold + d + 0.05);
    return { fl, g };
  }
  function tone(t, d, { f = 100, f2, type = 'sine', a = 0.004, hold = 0, v = 0.5, rv = 0, pan = 0, curve, lp } = {}) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + hold + d);
    const g = env(t, a, hold, d, v, curve);
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); } else o.connect(g);
    out(g, 1, rv, pan); o.start(t); o.stop(t + a + hold + d + 0.05);
    return o;
  }

  // ---- night on the dock: water under the planks, a little wind ----
  { const s = ac.createBufferSource(); s.buffer = brownBuf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380;
    const g = ac.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.5, 1.4);
    g.gain.setValueAtTime(0.5, 11.6); g.gain.linearRampToValueAtTime(0.22, 12.0); g.gain.setValueAtTime(0.22, END - 1.0); g.gain.linearRampToValueAtTime(0, END - 0.02);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.16; lg.gain.value = 0.18; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    // the swell fades out with the water (it adds to the water's level, so left alone it would keep the water going)
    lg.gain.setValueAtTime(0.18, END - 1.0); lg.gain.linearRampToValueAtTime(0, END - 0.02); lfo.stop(END + 0.1);
    s.connect(fl); fl.connect(g); out(g, 1); s.start(0); }
  noise(0, 4, { f: 650, q: 0.6, type: 'bandpass', a: 3, hold: 8, v: 0.035, curve: 'lin' });
  // a far-off gull, and the dock creaking in the quiet before the first shove
  tone(0.9, 0.5, { f: 1500, f2: 1150, type: 'triangle', a: 0.05, v: 0.012, rv: 0.6, pan: -0.6 });
  tone(1.3, 0.35, { f: 210, f2: 180, type: 'sawtooth', a: 0.12, v: 0.03, lp: 700, pan: 0.2 });

  // ---- the drone, tightening toward the blast ----
  for (const [f, v] of [[49, 0.11], [73.4, 0.05], [98.5, 0.025]]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(140, 0.5); fl.frequency.linearRampToValueAtTime(420, 5.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0, 0.5); g.gain.linearRampToValueAtTime(v * 0.5, 2.0); g.gain.linearRampToValueAtTime(v, 5.45); g.gain.linearRampToValueAtTime(0, 5.6);
    o.connect(fl); fl.connect(g); out(g); o.start(0.5); o.stop(5.7);
  }

  // ---- a shove from underneath: the thump, the lid jumping and slamming back, the iron ring rattling ----
  function shove(t, k) {
    tone(t, 0.55 + 0.2 * k, { f: 120, f2: 38, v: 0.75 + 0.25 * k, rv: 0.15 });
    noise(t, 0.16, { f: 1400, f2: 300, v: 0.45 + 0.3 * k, rv: 0.2 });
    noise(t + 0.004, 0.05, { f: 2600, q: 1.4, type: 'bandpass', v: 0.25 + 0.15 * k });
    // slammed back down, bouncing
    for (const [dt, v] of [[0.11, 0.7], [0.21, 0.35], [0.28, 0.16]]) {
      tone(t + dt, 0.22, { f: 160, f2: 60, v: v * (0.6 + 0.4 * k), rv: 0.15 });
      noise(t + dt, 0.06, { f: 3200, q: 1.8, type: 'bandpass', v: v * 0.35 });
    }
    for (const dt of [0.12, 0.2, 0.27, 0.33]) tone(t + dt, 0.25, { f: 1840 + rnd() * 300, type: 'triangle', v: 0.03 * (0.6 + 0.4 * k), pan: 0.15 });
  }
  shove(1.9, 0.4); shove(3.75, 0.8);
  // the breath in before the blast: a swelling hiss that stops dead
  { const { g } = noise(4.4, 0.02, { f: 600, f2: 4200, q: 0.9, type: 'bandpass', a: 1.18, v: 0.32, curve: 'lin' }); }

  // ---- the blast ----
  const B = 5.6;
  tone(B, 2.2, { f: 85, f2: 26, v: 1.0, rv: 0.25 });
  tone(B, 0.9, { f: 160, f2: 45, v: 0.6 });
  noise(B, 1.6, { f: 5000, f2: 260, v: 0.9, rv: 0.35 });
  noise(B, 3.5, { f: 180, brown: true, v: 0.5, a: 0.01, curve: 'exp' });
  // the lid slams onto the dock behind the hole
  tone(B + 0.11, 0.5, { f: 140, f2: 45, v: 0.9, rv: 0.3 });
  noise(B + 0.11, 0.12, { f: 2400, q: 1.2, type: 'bandpass', v: 0.5 });
  // splinters and grit raining down
  for (let i = 0; i < 26; i++) { const t = B + 0.15 + rnd() * 1.4; noise(t, 0.03 + rnd() * 0.05, { f: 2500 + rnd() * 4000, q: 2, type: 'bandpass', v: 0.12 * (1 - (t - B) / 1.8), pan: rnd() * 1.4 - 0.7 }); }
  // smoke pouring out
  noise(B + 0.1, 3.4, { f: 2200, type: 'highpass', a: 0.2, v: 0.16, curve: 'lin', pan: 0.1 });

  // ---- the lift bringing him up: a grinding rumble and a chain ----
  noise(6.3, 0.5, { f: 140, brown: true, a: 0.3, hold: 1.8, v: 0.22, curve: 'lin' });
  for (let t = 6.35; t < 8.7; t += 0.085 + rnd() * 0.02) tone(t, 0.05, { f: 900 + rnd() * 500, type: 'square', v: 0.008, lp: 2500 });
  tone(8.7, 0.35, { f: 110, f2: 55, v: 0.45, rv: 0.2 }); // the lift stops

  // ---- the dark swell while the smoke clears, cut to silence ----
  for (const [f, v] of [[41.2, 0.12], [61.7, 0.07], [98, 0.035], [146.8, 0.02]]) {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (rnd() - 0.5) * 8;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(200, 7); fl.frequency.linearRampToValueAtTime(900, 11.9);
    const g = ac.createGain(); g.gain.setValueAtTime(0, 7); g.gain.linearRampToValueAtTime(v, 11.85); g.gain.linearRampToValueAtTime(0, 11.98);
    o.connect(fl); fl.connect(g); out(g, 1, 0.2); o.start(7); o.stop(12.1);
  }

  // ---- the crash zoom: a whip in, a soft impact, the glint's "kiiin", and a whip back out on the cut ----
  noise(11.86, 0.03, { f: 700, f2: 6000, q: 1.2, type: 'bandpass', a: 0.12, v: 0.22, curve: 'lin' });
  tone(12.13, 0.35, { f: 90, f2: 50, v: 0.35, rv: 0.2 });
  for (const [f, v] of [[2637, 0.07], [3951, 0.05], [5274, 0.035]]) {
    const o = tone(12.34, 1.3, { f, type: 'sine', a: 0.01, v, rv: 0.9, pan: 0.2 });
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 9; lg.gain.value = f * 0.004; lfo.connect(lg); lg.connect(o.frequency); lfo.start(12.34); lfo.stop(13.8);
  }
  // under the line: a heartbeat that quickens, and a drone that swells and is cut dead by the smash to black
  { let t = 13.05, gap = 0.95;
    while (t < END - 0.15) { tone(t, 0.18, { f: 58, f2: 40, v: 0.42 }); tone(t + 0.17, 0.16, { f: 52, f2: 38, v: 0.28 }); t += gap; gap = Math.max(0.55, gap * 0.88); } }
  for (const [f, v] of [[36.7, 0.12], [55, 0.06], [73.4, 0.03]]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(90, 13.0); fl.frequency.exponentialRampToValueAtTime(700, END);
    const g = ac.createGain(); g.gain.setValueAtTime(0, 13.0); g.gain.linearRampToValueAtTime(v, END - 0.02); g.gain.linearRampToValueAtTime(0, END + 0.01);
    o.connect(fl); fl.connect(g); out(g); o.start(13.0); o.stop(END + 0.05);
  }
  // ---- "Hello, Chef.": his mumble as it types out, as in the game (a low blip every other letter, a lower "hm" at the end) ----
  const LINE = 'Hello, Chef.';
  TYPE.forEach((t, k) => {
    const ch = LINE[k];
    if (ch === '.') tone(t, 0.16, { f: 88 + rnd() * 10, type: 'triangle', a: 0.008, v: 0.5, rv: 0.12 });
    else if (ch.trim() && ch !== ',' && k % 2 === 0) tone(t, 0.08, { f: 105 + rnd() * 35, type: 'triangle', a: 0.008, v: 0.5, rv: 0.12 });
  });
  tone(TYPE[0] - 0.18, 0.12, { f: 520, f2: 780, type: 'sine', a: 0.01, v: 0.05 });
  // and the low hit after it
  const H2 = END - 0.01; // the smash cut to black lands on it
  tone(H2, 1.3, { f: 52, f2: 34, v: 0.75, rv: 0.4 });
  noise(H2, 0.8, { f: 300, f2: 90, v: 0.18, rv: 0.4 });
  // ---- the banner: a taiko drum under the title ----
  // (under the banner: the gloop ring itself, all four layers, mixed in afterwards)

  const r = await ac.startRendering();
  // to 16-bit WAV
  const n = r.length, chs = [r.getChannelData(0), r.getChannelData(1)];
  const buf = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((ch, i) => buf.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); buf.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true);
  buf.setUint16(22, 2, true); buf.setUint32(24, SR, true); buf.setUint32(28, SR * 4, true); buf.setUint16(32, 4, true); buf.setUint16(34, 16, true);
  w(36, 'data'); buf.setUint32(40, n * 4, true);
  let peak = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) { const v = Math.max(-1, Math.min(1, chs[c][i])); peak = Math.max(peak, Math.abs(v)); buf.setInt16(44 + i * 4 + c * 2, v * 32767, true); }
  const u8 = new Uint8Array(buf.buffer); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), peak };
};
