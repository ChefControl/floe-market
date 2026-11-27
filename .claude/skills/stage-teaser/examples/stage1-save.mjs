// Stage 1, early winter morning: bigger arms, the roulette table and snow boots bought; the harpoon, runners, the
// drive-up window and the net still to come (the teaser buys them on camera). Rating high enough for every tile.
export default tiles => {
  const done = t => ['pack', 'roulette', 'boots'].includes(t.id);
  return {
    v: 5, savedAt: Date.now(), money: 9_400, best: 9_400,
    tiles: tiles.map(t => ({ id: t.id, paid: done(t) ? t.cost : 0, done: done(t), open: true })),
    mods: {}, reviews: Array(20).fill(5), pile: 18, back: 0, backRice: 0, c1: 5, c1c: 0, c2: 0, c2c: 0,
    fish: 0, rice: 0, plates: 0, cash: 0, boxes: 0, tcash: 0, field: 0, season: 0, seasonT: 20, fugu: 0, level: 0, backBowls: 0, ring: {},
  };
};
