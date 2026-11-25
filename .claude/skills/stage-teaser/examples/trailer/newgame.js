// Init script (render-play --init): the demo build's ?stage=1 market, but as a brand new game. The demo writes its
// ready-built stage 1 save as it starts (fuguDemo.ts) and loads it straight back; this rewrites that one save on its
// way into storage: nothing bought, no money, no fish, the tutorial's lessons kept as learnt so the coach stays away.
(() => {
  const set = Storage.prototype.setItem;
  let done = false;
  Storage.prototype.setItem = function (k, v) {
    if (!done && k === 'floe-market-v1') {
      done = true;
      try {
        const s = JSON.parse(v);
        Object.assign(s, { tiles: [], mods: {}, money: 0, best: 0, reviews: [], pile: 0, back: 0, c1: 0, c1c: 0, c2: 0, c2c: 0, fish: 0, cash: 0, tcash: 0, presents: 0 });
        v = JSON.stringify(s);
      } catch { /* not the save: leave it */ }
    }
    return set.call(this, k, v);
  };
})();
