// The save for the Hello, Chef cinematic: stage 2 fully built, the money short of Mr. Fugu's million (so the game's own
// hatch doesn't turn up; the cinematic brings its own), spring. Pass with --save to render-frames.mjs.
export default tiles => {
  const done = t => t.stage < 3 && t.id !== 'dohyo';
  return {
    v: 5, savedAt: Date.now(), money: 640_000, best: 640_000,
    tiles: tiles.map(t => ({ id: t.id, paid: done(t) ? t.cost : 0, done: done(t), open: true })),
    mods: { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8 },
    reviews: Array(20).fill(5), pile: 10, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0,
    fish: 8, rice: 8, plates: 6, cash: 0, boxes: 2, tcash: 0, field: 6, season: 1, seasonT: 40, fugu: 0, level: 0, backBowls: 0, ring: {},
  };
};
