// Take G, the first sale (?stage=1&pile=14 as a new game; campfire.js before this): real play, on the game's own
// camera with its HUD. The chef is walked with the game's own joystick: fillets off the pile, down the dock to the
// stand, onto the counter; the queue buys; he collects the money. window.cineType.marks says when each part starts.
(async () => {
  while (!window.K || !window.Campfire || !window.Acting) await new Promise(r => setTimeout(r, 50));
  const { V, T3 } = K;
  const { player } = await window.__mod('player.ts');
  const CT = await window.__mod('counters.ts'), ST = await window.__mod('stations.ts');
  const { wallet } = await window.__mod('wallet.ts');
  const gl = K.R.canvas, OFF = K.R.OFF;
  /* (?plain=1: the first sale on its own, with no castaway story before it: the chef in the game's own winter parka, and no burnt-out campfire on the dock) */
  const PLAIN = new URLSearchParams(location.search).get('plain') === '1';
  const fire = Campfire(T3, K.R.scene, 0.95, 0.15, -3.55); if (PLAIN) fire.g.visible = false;
  // The game's camera sits where a whole laptop screen of dock fits; in a trailer the chef is a dot from there. This
  // is the same view from 0.58 of the way: its own angle, following him as the game does.
  const NEAR = 0.58, tgt = V(0, 0, 0); let tgtSet = false;
  // (still in the rags he washed up in: his first day's trade)
  const ACT = await Acting(); if (!PLAIN) ACT.castaway(player.g); ACT.soles(player.g);
  // the game's joystick: a drag on the canvas, read against the camera (input.ts)
  const camF = V(-OFF.x, 0, -OFF.z).normalize(), camR = V(-camF.z, 0, camF.x), CX = innerWidth / 2, CY = innerHeight / 2;
  const ptr = (type, x, y) => gl.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
  let down = false;
  const letGo = () => { if (down) { ptr('pointerup', CX, CY); down = false; } };
  /** Walks him toward (x, z); true once he's there. */
  function walkTo(x, z, near = 0.12) {
    const p = player.g.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < near) { letGo(); return true; }
    if (!down) { ptr('pointerdown', CX, CY); down = true; }
    const m = Math.min(1, Math.max(0.3, d * 2)), ux = dx / d, uz = dz / d;
    ptr('pointermove', CX + (ux * camR.x + uz * camR.z) * 48 * m, CY - (ux * camF.x + uz * camF.z) * 48 * m);
    return false;
  }
  const marks = {}; window.cineType = { marks };
  let phase = 'pile', since = 0;
  const go = (p, i) => { phase = p; since = i; marks[p] = i; };
  window.cine = {
    len: 7.8,
    async setup() {
      player.g.position.set(0.5, 0.15, -3.4); player.h = 1.2;
      // (the queue's there before he is)
      for (let n = 0; n < 150 && CT.C1.queue.filter(c => c.queued).length < 3; n++) await new Promise(r => setTimeout(r, 100));
    },
    frame(i, fps) {
      // (near the stand the picture is the sale, not him: it settles between him and the queue, the whole stand in it)
      const pp = player.g.position, near = K.clamp(1 - (Math.hypot(pp.x - CT.C1.dropPos.x, pp.z - CT.C1.dropPos.z) - 1) / 4.5), bias = near * near * (3 - 2 * near);
      const focus = pp.clone().lerp(V(2.55, pp.y, 8.5), 0.62 * bias);
      if (!tgtSet) { tgt.copy(focus); tgtSet = true; } else tgt.lerp(focus, Math.min(1, 5 / fps));
      K.fade(1 - K.ease(i / fps / 0.4)); // (out of the campfire's black)
      K.cam = { pos: tgt.clone().add(OFF.clone().multiplyScalar(NEAR)), look: tgt.clone().add(V(0, 0.4, 0)), fov: 40, near: 1.5 }; /* (near 1.5 m: a snowflake drifting a hand from the lens was a pale disc a tenth of the picture wide for four frames; the chef is over 9 m away) */
      fire.set(i / fps, 0);
      const carrying = player.back.items?.length ?? 0, C = CT.C1;
      if (i === 0) marks.pile = 0;
      if (phase === 'pile') { walkTo(ST.PILE_STAND.x, ST.PILE_STAND.z); if (i - since > 40 || (carrying >= 6 && i - since > 14)) go('walk', i); }
      else if (phase === 'walk') { if (walkTo(C.dropPos.x, C.dropPos.z - 0.25, 0.2)) go('sell', i); }
      else if (phase === 'sell') { letGo(); if (i - since > 75) go('cash', i); }
      else if (phase === 'cash') { if (walkTo(C.cashPos.x, C.cashPos.z, 0.15) && marks.till === undefined) marks.till = i; }
      if (i % 30 === 0) console.log('[cine]', i, phase, 'carry', carrying, 'stock', C.stock.items.length, 'cash', C.cash.items.length, '$', wallet.money, 'q', C.queue.length);
    },
  };
})();
