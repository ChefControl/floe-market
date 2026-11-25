// A thin acting layer for game characters in three.js clips, plus 2D overlay helpers (bubbles, crash-in captions).
// A classic script: inject it before your clip script; it defines window.CartoonKit. Pass your page's THREE in.
//
// Face parts are attached to `node` (the object the head moves with: a body group or head bone). `head` is the head
// centre in that node's space, `r` its radius, and the face looks along the node's +z. If your character faces -z or
// +x, wrap the parts: make an empty Group at the head, rotate it so its +z is the face direction, and pass that as
// node with head [0, 0, 0].
(() => {
  const clamp = (k, a = 0, b = 1) => Math.min(b, Math.max(a, k));
  const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  /** 0 → overshoot past 1 → 1, for things popping in */
  const pop = k => { k = clamp(k); const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  /** Brows and a mouth over the character's own eyes. update(mood 0..1, open 0..1 from the voice) each frame. */
  function face(THREE, node, { head = [0, 0, 0], r = 0.2, ink = 0x1B2733, inside = 0x5A1E24, eyeSpread = 0.34, browUp = 0.37, mouthDown = 0.34, depth = 0.95 } = {}) {
    const [hx, hy, hz] = head;
    // transparent with opacity 1 so they draw after (over) a translucent red rise
    const mat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1 });
    const brows = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(ink)); b.userData.s = s; b.renderOrder = 4; node.add(b); return b; });
    const mouth = new THREE.Group(); mouth.position.set(hx, hy - mouthDown * r, hz + depth * r); mouth.rotation.x = 0.33; node.add(mouth);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat(inside)); hole.renderOrder = 4; mouth.add(hole);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0xFFFFFF)); teeth.renderOrder = 5; mouth.add(teeth);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 6, 16, Math.PI), mat(ink)); arc.renderOrder = 4; mouth.add(arc);
    const k = r / 0.2; // the numbers below were tuned on a head of radius 0.2
    return {
      parts: { brows, hole, teeth, arc },
      update(m, open = 0, scream = false) {
        for (const b of brows) {
          const s = b.userData.s;
          b.scale.set(0.085 * k, (0.02 + 0.006 * m) * k, 0.016 * k);
          b.position.set(hx + s * eyeSpread * r, hy + browUp * r - 0.024 * k * m, hz + (depth - 0.05) * r - 0.01 * k * m);
          b.rotation.set(-0.35, 0, s * lerp(-0.14, 0.7, m));
        }
        const o = scream ? Math.max(open, 0.9) : open, talk = o > 0.06;
        hole.visible = talk;
        if (talk) {
          const w = (0.024 + 0.024 * m + 0.012 * o) * k, h = (0.008 + o * (0.022 + 0.03 * m)) * k;
          hole.scale.set(w, h, 0.012 * k);
          teeth.visible = m > 0.5; teeth.scale.set(w * 1.5, 0.012 * k, 0.004 * k); teeth.position.set(0, h * 0.62, 0.007 * k);
        } else teeth.visible = false;
        arc.visible = !talk;
        const happy = m < 0.06, size = (happy ? 0.026 : 0.02 + 0.014 * m) * k;
        arc.scale.set(size, size * (happy ? 0.9 : 0.55 + 0.6 * m), 0.012 * k);
        arc.rotation.z = happy ? Math.PI : 0; arc.position.y = (happy ? 0.016 : -0.012) * k;
        return o;
      },
    };
  }

  /** Red rising from the chin to the crown. update(level 0..1, alpha). */
  function redRise(THREE, node, { head = [0, 0, 0], r = 0.2, color = [0.93, 0.12, 0.08] } = {}) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uFill: { value: -1 }, uA: { value: 0 } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uFill; uniform float uA; varying float vY; void main(){ float k = smoothstep(uFill + 0.02, uFill - 0.02, vY); if (k <= 0.0) discard; gl_FragColor = vec4(${color.map(c => c.toFixed(3)).join(',')}, uA * k); }`,
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 24, 16), m);
    s.position.set(...head); s.renderOrder = 3; node.add(s);
    return { mesh: s, update(level, alpha = 0.75) { m.uniforms.uA.value = alpha * clamp(level * 2); m.uniforms.uFill.value = lerp(-1.2 * r, 1.15 * r, level); } };
  }

  /** Soft steam puffs (ears, pots, kettles). emit(at Vector3, velocity Vector3, size, life, alpha); update(dt) each frame. */
  function steam(THREE, scene) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), puffs = [];
    return {
      puffs,
      emit(at, vel, size = 0.07, life = 0.6, alpha = 0.95) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: alpha }));
        s.userData.cartoon = true; s.position.copy(at); s.scale.setScalar(size); scene.add(s);
        puffs.push({ s, vel: vel.clone(), size, life, alpha, age: 0 });
      },
      update(dt) {
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i]; p.age += dt; const k = p.age / p.life;
          if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); puffs.splice(i, 1); continue; }
          p.s.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.pow(0.25, dt)); p.vel.y += 0.6 * dt;
          p.s.scale.setScalar(p.size * (1 + 2.2 * easeOut(k)));
          p.s.material.opacity = p.alpha * (1 - k) * Math.min(1, p.age / 0.05);
        }
      },
    };
  }

  /** Puffs from both ears of `node`'s head at `rate` per second; power 0.6 (simmering) .. 1.5 (the scream). */
  function earSteam(THREE, st, node, { head = [0, 0, 0], r = 0.2 } = {}) {
    let acc = 0;
    return (rate, power, dt) => {
      acc += dt * rate;
      while (acc >= 1) {
        acc -= 1;
        for (const s of [-1, 1]) {
          const at = node.localToWorld(new THREE.Vector3(head[0] + s * 1.07 * r, head[1] + 0.05 * r, head[2]));
          const out = node.localToWorld(new THREE.Vector3(s, 0.25, 0)).sub(node.localToWorld(new THREE.Vector3())).normalize();
          st.emit(at, out.multiplyScalar(1.5 * power).add(new THREE.Vector3(0, 0.9 * power, 0)), (0.07 + 0.05 * power) * r / 0.2, 0.5 + 0.25 * power, 1);
        }
      }
    };
  }

  /** Puts `prop` at the ear (a point in `node` space) as the hand comes up (w 0..1), turned `turn` rad toward camera. */
  function holdToEar(THREE, prop, node, handWorld, earLocal, w, turn = Math.PI * 0.3, tilt = -0.3) {
    prop.position.copy(handWorld).lerp(node.localToWorld(new THREE.Vector3(...earLocal)), w);
    node.getWorldQuaternion(prop.quaternion); prop.rotateY(turn * w); prop.rotateZ(tilt * w);
    prop.visible = w > 0.05;
  }

  /** Points a tool built along +z (base at its origin, `len` long) from `from` to `to`, stretched to just reach. */
  function between(tool, from, to, len, tip = null) {
    tool.position.copy(from); tool.lookAt(to);
    const reach = from.distanceTo(to) + 0.03 * len; tool.scale.set(1, 1, reach / len);
    if (tip) tip.scale.set(1, 1, len / reach); // keep the tip (a scoop, a hook) its own shape
  }

  // ---------- 2D overlay ----------
  /** The game-style white bubble with its tail down; text in ink (or red when `hot`). k: 0..1 pop-in. */
  function bubble(c, x, y, text, k, { size = 48, font = 'system-ui, sans-serif', weight = 700, rtl = false, hot = false, ink = '#173042', red = '#D93A2B' } = {}) {
    c.save(); c.font = `${weight} ${size}px ${font}`; c.direction = rtl ? 'rtl' : 'ltr';
    const w = c.measureText(text).width + size * 1.1, h = size * 1.65, s = pop(k);
    c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(23,48,66,.18)'; c.beginPath(); c.roundRect(-w / 2, -h / 2 + 5, w, h, h / 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill();
    c.beginPath(); c.moveTo(-14, h / 2 - 2); c.lineTo(-6, h / 2 + 22); c.lineTo(14, h / 2 - 2); c.fill();
    c.fillStyle = hot ? red : ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, size * 0.08);
    c.restore();
  }

  /** A ringing icon (📱 by default) shaking in a round bubble with ring arcs either side. */
  function ringIcon(c, x, y, t, k, { emoji = '📱', scale = 1 } = {}) {
    const r = 50 * scale; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 44) * 0.22); c.scale(pop(k), pop(k));
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.font = `${58 * scale}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, 0, 3);
    c.restore();
    c.save(); c.strokeStyle = '#fff'; c.lineWidth = 6 * scale; c.lineCap = 'round'; c.globalAlpha = clamp(k);
    for (const s of [-1, 1]) for (const n of [1, 2]) { c.beginPath(); c.arc(x, y, (r + 10 + n * 13) * pop(k), s > 0 ? -0.45 : Math.PI - 0.45, s > 0 ? 0.45 : Math.PI + 0.45); c.stroke(); }
    c.restore();
  }

  /**
   * A caption crashing onto the screen on a dark band: scale 2.3 → 1 in ~4 frames, the band sliding out to full width.
   * `t` is the clip time, `at` when it lands. Returns how far it is in (0..1) so you can shake and flash with it.
   */
  function crashCaption(c, W, H, t, at, text, { y = 0.52, size = 150, font = 'system-ui, sans-serif', weight = 800, fill = '#FFC34A', edge = '#FFC34A', tilt = -0.05, rtl = false, band = true, dim = 0, lift = 0, lead = '' } = {}) {
    const k = (t - at) / 0.14; if (k <= 0) return 0;
    c.save(); c.translate(W / 2, H * y - lift); c.rotate(tilt); c.globalAlpha = 1 - dim;
    if (band) {
      const bw = W * 1.3 * easeOut((t - at) / 0.12), bh = size * 1.45;
      c.fillStyle = 'rgba(26,10,3,.92)'; c.fillRect(-bw / 2, -bh / 2, bw, bh);
      c.fillStyle = edge; c.fillRect(-bw / 2, -bh / 2, bw, 8); c.fillRect(-bw / 2, bh / 2 - 8, bw, 8);
    }
    c.font = `${weight} ${size}px ${font}`; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const ew = lead ? size * 0.8 : 0, gap = lead ? size * 0.12 : 0, tw = c.measureText(text).width;
    const fit = Math.min(1, W * 0.9 / (tw + ew + gap)), s = (k < 1 ? lerp(2.3, 1, easeOut(k)) : 1 + 0.02 * Math.sin((t - at) * 6)) * fit;
    c.scale(s, s); c.globalAlpha *= clamp(k * 2);
    // the lead (an emoji) sits before the text: on the right for right-to-left text, on the left otherwise
    const total = tw + gap + ew, textX = rtl ? total / 2 - ew - gap : -total / 2 + ew + gap;
    if (lead) { c.save(); c.font = `${size * 0.72}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign = 'center'; c.fillText(lead, rtl ? total / 2 - ew / 2 : -total / 2 + ew / 2, 4); c.restore(); }
    c.direction = 'ltr'; c.textAlign = rtl ? 'right' : 'left';
    c.lineWidth = size * 0.15; c.strokeStyle = '#000'; c.strokeText(text, textX, size * 0.04);
    c.fillStyle = fill; c.fillText(text, textX, size * 0.04);
    c.restore();
    return clamp(k);
  }

  window.CartoonKit = { clamp, ease, easeOut, lerp, pop, face, redRise, steam, earSteam, holdToEar, between, bubble, ringIcon, crashCaption };
})();
