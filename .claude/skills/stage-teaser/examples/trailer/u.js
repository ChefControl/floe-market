// Take U, Floe Sushi at work (the demo's ?upto=porter: all of it built but the premium menu, $999,900 in hand):
// real play on the game's camera with its HUD. The chef collects the register's money, walks to the last upgrade's
// tile and holds Buy: the gold ring fills, "Premium menu" is bought. window.cineType.marks says when each part starts.
(async () => {
  while (!window.K) await new Promise(r => setTimeout(r, 50));
  const { V } = K;
  const { player } = await window.__mod('player.ts');
  const RS = await window.__mod('restaurant.ts'), U = await window.__mod('unlocks.ts');
  const { wallet } = await window.__mod('wallet.ts');
  const gl = K.R.canvas, OFF = K.R.OFF;
  const camF = V(-OFF.x, 0, -OFF.z).normalize(), camR = V(-camF.z, 0, camF.x), CX = innerWidth / 2, CY = innerHeight / 2;
  const ptr = (type, x, y) => gl.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
  let down = false;
  const letGo = () => { if (down) { ptr('pointerup', CX, CY); down = false; } };
  function walkTo(x, z, near = 0.12) {
    const p = player.g.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < near) { letGo(); return true; }
    if (!down) { ptr('pointerdown', CX, CY); down = true; }
    const m = Math.min(1, Math.max(0.3, d * 2)), ux = dx / d, uz = dz / d;
    ptr('pointermove', CX + (ux * camR.x + uz * camR.z) * 48 * m, CY - (ux * camF.x + uz * camF.z) * 48 * m);
    return false;
  }
  const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: 'e', code: 'KeyE', bubbles: true }));
  const tile = U.tiles.find(t => t.id === 'premium');
  const marks = {}; window.cineType = { marks };
  let phase = 'till', since = 0, holding = false;
  const go = (p, i) => { phase = p; since = i; marks[p] = i; };
  // In the close shot a customer's order bubble (a sprite over his head, bubble.ts) can sit half out of the picture or
  // under the HUD pills: a clipped ring in the corner. For that shot, a bubble whose middle is at the picture's edge or
  // behind the HUD's column isn't drawn. (The wide play before it is the game's own camera, and is left as it is.)
  let close = false; const hid = [];
  K.after = cam => {
    while (hid.length) hid.pop().visible = true;
    if (!close) return;
    K.R.scene.traverse(o => { if (!o.isSprite || !o.visible) return; const im = o.material && o.material.map && o.material.map.image;
      if (!im || im.width !== im.height || im.width % 128) return; // (the bubbles' own square canvases)
      const s = o.getWorldPosition(V(0, 0, 0)).project(cam);
      if (Math.abs(s.x) > 0.88 || Math.abs(s.y) > 0.8 || (s.x < -0.52 && s.y > 0.2)) { o.visible = false; hid.push(o); } });
  };
  window.cine = {
    len: 11,
    async setup() {
      // (some money in the register to collect)
      for (let n = 0; n < 250 && RS.register.items.length < 5; n++) await new Promise(r => setTimeout(r, 100));
      player.g.position.set(RS.REGISTER.x + 2.4, 0.15, RS.REGISTER.z + 1.6);
      console.log('[cine] register', RS.register.items.length, 'tile', tile.x, tile.z, tile.open, tile.done, '$', wallet.money);
    },
    frame(i, fps) {
      K.cam = null;
      if (i === 0) marks.till = 0;
      const p = player.g.position;
      // once it's bought and the first toast has gone: closer on him for the game's next line, "Something is knocking under
      // the dock" (the cut skips the seconds between: a new angle makes it a cut and not a jump). Turned 1.7 rad
      // round him from the game's angle: from there no gate post or lantern hangs between the camera and him.
      close = false;
      if (close) { const k = K.ease((i - since - 70) / 200); const A = -1.7, o = OFF.clone().multiplyScalar(0.46 - 0.04 * k), ca = Math.cos(A), sa = Math.sin(A); K.cam = { pos: p.clone().add(V(o.x * ca - o.z * sa, o.y * 0.8, o.x * sa + o.z * ca)), look: p.clone().add(V(0, 0.6, 0)), fov: 40 }; }
      if (phase === 'till') { if (walkTo(RS.REGISTER.x, RS.REGISTER.z, 0.2) && i - since > 30) go('walk', i); else if (i - since > 90) go('walk', i); }
      else if (phase === 'walk') { if (walkTo(tile.x, tile.z, 0.25) || i - since > 150) go('buy', i); }
      else if (phase === 'buy') { letGo(); if (!holding) { key('keydown'); holding = true; } if (tile.done) { key('keyup'); go('bought', i); } }
      if (i % 30 === 0) console.log('[cine]', i, phase, p.x.toFixed(1), p.z.toFixed(1), 'reg', RS.register.items.length, '$', wallet.money, 'paid', tile.paid, tile.done);
    },
  };
})();
