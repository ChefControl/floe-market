// A virtual clock for the game page, injected before the game loads (render-play.mjs adds it as an init script).
// Until window.__vt.take() the page runs on real time as usual (loading, fonts, the first frames). After it, time only
// moves when window.__vt.step(seconds) is called: performance.now, Date.now, requestAnimationFrame, setTimeout and
// setInterval all follow the virtual clock, so the game's own main loop (its tick, its cameras, its cutscenes) runs
// one exact frame per step however long a frame takes to draw and screenshot. Nothing in the game is changed.
(() => {
  const realNow = performance.now.bind(performance), realDate = Date.now, realRaf = window.requestAnimationFrame.bind(window);
  const realSet = window.setTimeout.bind(window), realClear = window.clearTimeout.bind(window);
  const realEvery = window.setInterval.bind(window), realStop = window.clearInterval.bind(window);
  let manual = false, vt = 0, dateAt = 0, nextId = 1e9;
  const timers = new Map(); // id → { due, fn, args, every }
  let rafs = [];
  performance.now = () => (manual ? vt : realNow());
  Date.now = () => (manual ? dateAt + vt : realDate());
  window.requestAnimationFrame = cb => {
    if (manual) { const id = nextId++; rafs.push({ id, cb }); return id; }
    // (a frame asked for on real time that comes after the switch joins the virtual frames)
    return realRaf(t => (manual ? rafs.push({ id: nextId++, cb }) : cb(t)));
  };
  const realCancel = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = id => { rafs = rafs.filter(r => r.id !== id); realCancel(id); };
  window.setTimeout = (fn, ms = 0, ...args) => {
    if (!manual) return realSet(fn, ms, ...args);
    const id = nextId++; timers.set(id, { due: vt + Math.max(0, +ms || 0), fn, args }); return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    if (!manual) return realEvery(fn, ms, ...args);
    const id = nextId++, every = Math.max(1, +ms || 0); timers.set(id, { due: vt + every, fn, args, every }); return id;
  };
  window.clearTimeout = id => { timers.delete(id); realClear(id); };
  window.clearInterval = id => { timers.delete(id); realStop(id); };
  const run = f => { try { typeof f.fn === 'function' ? f.fn(...f.args) : 0; } catch (e) { console.error(e); } };
  window.__vt = {
    get now() { return vt; },
    /** From now on time moves only on step(). */
    take() { if (manual) return; vt = realNow(); dateAt = realDate() - vt; manual = true; },
    /** Moves time on by `s` seconds: the timers that fall due (in order), then one animation frame. */
    step(s) {
      const end = vt + s * 1000;
      for (;;) {
        let best = null;
        for (const [id, t] of timers) if (t.due <= end && (!best || t.due < best[1].due)) best = [id, t];
        if (!best) break;
        const [id, t] = best;
        vt = Math.max(vt, t.due);
        if (t.every) t.due += t.every; else timers.delete(id);
        run(t);
      }
      vt = end;
      const q = rafs; rafs = [];
      for (const r of q) { try { r.cb(vt); } catch (e) { console.error(e); } }
    },
  };
})();
