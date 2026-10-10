// The game's colours, by name: the ones that come back again and again across the market, the restaurant and the
// farm. New art takes its colours from here, so one change retunes them everywhere. (The plainer Low versions keep
// the literal values they've always had, which are these same colours.)
export const C = {
  // woods, light to dark
  deck: 0xC3875D, deck2: 0xCF946A, log: 0xB0724A, plank: 0x9C6644, post: 0x8A5A3B, frame: 0x6B4A35, timber: 0x6B4A2E,
  bark: 0x5E3B24, trunk: 0x7A5236, endGrain: 0xD9A877, rope: 0xC9A66B,
  // reds and golds
  red: 0xC0392B, tomato: 0xE0392B, lacquer: 0xD8394B, gold: 0xF2C14E, amber: 0xF2B33D,
  // inks and stone
  ink: 0x1B2430, navy: 0x23384A, slate: 0x2C3A47, steel: 0x8FA6B4, iron: 0x4A5560, stone: 0x9AA4AC, tin: 0x5B6B78,
  // whites
  snow: 0xFFFFFF, paper: 0xF4F1EA, enamel: 0xE8F1F6, ice: 0xD5ECF5,
  // the sea and sky
  sea: 0x1E8FC0, shallows: 0x36BEDB, sky: 0xCFEAF5, counterTop: 0x5FA8C8,
} as const;
