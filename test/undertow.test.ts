// The Undertow (stage 3): the Family's club, down a long tunnel out of the arena's south wall and through a pair of
// doors with a doorman behind them, found when the second boss is beaten; the Family's three spread round the room,
// each with a word for whoever steps up to his pad.
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, type SaveFixture } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A game in stage 3 (the ring bought), down in the cellar. */
async function ring(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), ...save });
  const [cellar, plan, fight, undertow, office] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/undertow'), import('../src/office'),
  ]);
  const at = (p: { x: number; z: number }) => g.player.g.position.set(p.x, cellar.CY, p.z);
  return { g, cellar, plan, fight, undertow, office, at, F: () => fight.F };
}
/** Whether a walker can stand at `p` (the floor's there and nothing's in the way). */
const standable = (g: Awaited<ReturnType<typeof loadGame>>, cellar: typeof import('../src/cellar'), p: { x: number; z: number }) => {
  const q = { ...p };
  g.layout.keepOnFloor(q, g.layout.walkable());
  cellar.collideCellar(q);
  return Math.hypot(q.x - p.x, q.z - p.z) < 1e-6;
};
const middle = (r: { x0: number; x1: number; z0: number; z1: number }) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 });
/** Where the club's doors stand, in the tunnel's side. */
const doorAt = (plan: typeof import('../src/cellarPlan')) => ({ x: plan.CLUB_DOOR.x, z: (plan.CLUB_DOOR.z0 + plan.CLUB_DOOR.z1) / 2 });

describe('the Undertow', () => {
  it("is a secret until the second boss is beaten: the arena's wall runs on across its tunnel, and nobody can walk in", async () => {
    const { g, cellar } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    const L = g.layout;
    expect(L.found.den).toBe(false);
    expect(cellar.parts.den.visible).toBe(false);
    expect(cellar.parts.denHidden.visible).toBe(true);
    expect(cellar.lights[9].intensity).toBe(0);
    for (const d of L.DOORS.filter(t => t.b === 'passage' || t.b === 'den')) expect(standable(g, cellar, middle(d))).toBe(false);
    expect(standable(g, cellar, middle(L.DEN))).toBe(false);
  });

  it("opens when Yokobashiri's beaten: once his card's away and the next bout's begun, the wall comes down on the tunnel", async () => {
    const { g, plan, fight, cellar, at, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    const need = fight.toBeat(fight.BOSSES[1]);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < need && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush!.win).toBe(true);
    g.run(fight.BOUT.sit + fight.BOUT.fight + 0.5);
    expect(F().beaten).toBe(2);
    // the card says something's behind the south wall; the room's not there yet
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').textContent).toContain('south wall');
    expect(g.layout.found.den).toBe(false);
    // the card goes, his crowd goes home, the next bout begins: there it is
    $('fightCard').click();
    g.runUntil(() => g.layout.found.den, fight.BOUT.pay + 1);
    expect(F().rush).toBeNull();
    expect(cellar.parts.den.visible).toBe(true);
    expect(cellar.parts.denHidden.visible).toBe(false);
    expect(cellar.lights[9].intensity).toBeGreaterThan(0);
    // into the tunnel, down to the club's doors: shut, until the doorman lets you in (below)
    const L = g.layout;
    for (const d of L.DOORS.filter(t => t.b === 'passage')) expect(standable(g, cellar, middle(d))).toBe(true);
    expect(standable(g, cellar, middle(L.PASSAGE))).toBe(true);
    expect(standable(g, cellar, doorAt(plan))).toBe(false);
    expect(cellar.roomAt(middle(L.DEN))).toBe('den');
  });

  it('the way in: down a long dark tunnel to a pair of doors, the band louder through them; the first time, the doorman looks you over', async () => {
    const { g, plan, cellar, at, F } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const D = await import('../src/doorway'), { club } = await import('../src/noir'), { fogLeft } = await import('../src/clubFog');
    const L = g.layout, x = (L.PASSAGE.x0 + L.PASSAGE.x1) / 2, door = doorAt(plan);
    expect(F().den.door).toBe(false);
    // down the tunnel: the band, muffled, louder as you go
    at({ x, z: L.PASSAGE.z0 + 0.5 });
    g.run(0.2);
    const far = club.k;
    expect(far).toBeGreaterThan(0);
    at({ x, z: door.z - 2.2 });
    g.run(0.2);
    expect(club.k).toBeGreaterThan(far);
    expect(club.muffle).toBe(1);
    expect(standable(g, cellar, door)).toBe(false);
    // till the doors open, the club behind them is under a bank of smoke
    expect(fogLeft()).toBe(1);
    // up to the doors: a knock, the slot, "Password?", Mr. Fugu's matchbook, and in
    at({ x, z: door.z });
    g.run(0.2);
    expect(D.doorState().scene).not.toBeNull();
    expect(g.player.held).toBe(true);
    g.runUntil(() => D.doorState().says === 'Password?', 3);
    g.runUntil(() => F().den.door, 5);
    g.runUntil(() => D.doorState().scene === null, 3);
    expect(g.player.held).toBe(false);
    expect(D.doorState().open).toBeGreaterThan(0.9);
    expect(standable(g, cellar, door)).toBe(true);
    expect(club.muffle).toBeLessThan(0.1);
    // the smoke rolls back off the room
    expect(fogLeft()).toBeGreaterThan(0);
    g.runUntil(() => fogLeft() === 0, 6);
    // in the club, the band at full
    at(middle(L.DEN));
    g.run(0.2);
    expect(club).toEqual({ k: 1, muffle: 0 });
    // in Harry's office through its doorway, a little quieter and duller
    at(plan.BOOTH_PADS.harry);
    g.run(0.2);
    expect(club.k).toBeLessThan(1);
    expect(club.muffle).toBeGreaterThan(0);
    // the doors shut behind you, and open as you come up to them again: a good evening through the slot first
    at({ x, z: L.PASSAGE.z0 + 0.5 });
    g.run(2);
    expect(D.doorState().open).toBeLessThan(0.1);
    expect(standable(g, cellar, door)).toBe(false);
    at({ x, z: door.z });
    g.run(0.2);
    expect(D.doorState().scene).toBeNull();
    expect(D.doorState().says).toBe('Evening.');
    g.run(1.5);
    expect(D.doorState().open).toBeGreaterThan(0.9);
    // (and they're open for a game loaded later, the smoke long gone)
    expect(F().den.door).toBe(true);
    expect(fogLeft()).toBe(0);
  });

  it("is there on loading a game that's beaten two, with each of the Family's pads clear to stand on and his table in the way", async () => {
    const { g, cellar, plan } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    expect(g.layout.found.den).toBe(true);
    for (const k of ['eddie', 'harry', 'tommy'] as const) {
      expect(standable(g, cellar, plan.BOOTH_PADS[k]), k).toBe(true);
      expect(standable(g, cellar, plan.DESKS[k]), k).toBe(false);
    }
    // Harry's in his office, through the club's west wall, his bookkeeper's desk in the corner
    const L = g.layout, door = L.DOORS.find(d => d.b === 'loans')!;
    expect(cellar.roomAt(plan.BOOTH_PADS.harry)).toBe('loans');
    expect(standable(g, cellar, middle(door))).toBe(true);
    expect(standable(g, cellar, plan.LEDGER.desk)).toBe(false);
    expect(cellar.cellarWay(plan.DRINK_PAD, plan.BOOTH_PADS.harry).length).toBeGreaterThan(1);
  });

  it('the Family each have a word for whoever steps up to his pad: who he is first, then his business', async () => {
    const { g, plan, undertow, cellar, at } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const { family } = await import('../src/family');
    expect(undertow.undertowSays('harry')).toBe('');
    at(plan.BOOTH_PADS.harry);
    g.run(0.2);
    expect(undertow.undertowSays('harry')).toBe(undertow.LINES.harry[0]);
    expect(undertow.undertowSays('harry')).toContain('Samehada');
    expect(family.harry.talking).toBe(true);
    // he's watching; standing there, he doesn't repeat himself; off and back on, the next line
    expect(family.harry.watch).not.toBeNull();
    g.run(1);
    expect(undertow.undertowSays('harry')).toBe(undertow.LINES.harry[0]);
    at({ x: plan.BOOTH_PADS.harry.x, z: plan.BOOTH_PADS.harry.z + 0.9 });
    g.run(0.2);
    at(plan.BOOTH_PADS.harry);
    g.run(0.2);
    expect(undertow.undertowSays('harry')).toBe(undertow.LINES.harry[1]);
    g.run(10);
    expect(undertow.undertowSays('harry')).toBe('');
    expect(family.harry.talking).toBe(false);
    // the others too, each his own
    at(plan.BOOTH_PADS.tommy);
    g.run(0.2);
    expect(undertow.undertowSays('tommy')).toContain('Follow the lady');
    at(plan.BOOTH_PADS.eddie);
    g.run(0.2);
    expect(undertow.undertowSays('eddie')).toContain('Slick Eddie');
    // out of the room, nobody's watching
    at(cellar.RING);
    g.run(0.2);
    expect(family.eddie.watch).toBeNull();
  });

  it("Tommy deals monte at his crate: the stake in Fugu Chips up to his limit, double for the queen, 3 rounds a bout", async () => {
    const { g, plan, fight, at, F } = await ring({ money: 100 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const M = await import('../src/monteTable');
    const { wallet } = g;
    at(plan.BOOTH_PADS.tommy);
    g.run(0.2);
    expect($('monte').hidden).toBe(false);
    // nothing taken yet: his limit's the floor's 20 chips, and he'll play 3 rounds
    expect(M.monteMsg()).toContain('Table limit 🐡 20');
    expect(M.monteMsg()).toContain('3 rounds left');
    // over his limit, he won't deal
    M.stakeMonte(25);
    expect(M.dealMonte()).toBe(false);
    // 5 chips: taken as he deals; he shows her, swaps (4 to 10 times), and waits for a pick
    M.stakeMonte(5);
    expect(M.dealMonte(() => 0.5)).toBe(true);
    expect(wallet.money).toBe(95_000);
    expect(F().den.monte).toEqual({ bout: F().bout.n, played: 1 });
    g.runUntil(() => M.monteNow()?.phase === 'pick', 20);
    const r = M.monteNow()!.round;
    expect(r.swaps.length).toBeGreaterThanOrEqual(4);
    // find her: paid at once, double, and the cards turn over
    expect(M.pickMonte(r.queen)).toBe(true);
    expect(wallet.money).toBe(105_000);
    g.runUntil(() => M.monteNow() === null, 5);
    expect(M.monteMsg()).toContain('Sharp eyes');
    // a wrong card loses the stake
    M.dealMonte();
    g.runUntil(() => M.monteNow()?.phase === 'pick', 20);
    M.pickMonte((M.monteNow()!.round.queen + 1) % 3);
    g.runUntil(() => M.monteNow() === null, 5);
    expect(wallet.money).toBe(100_000);
    expect(M.monteMsg()).toContain('Not that one');
    // walking off before picking leaves the stake on his crate (he waits a little first)
    M.dealMonte();
    g.run(0.5);
    at({ x: plan.BOOTH_PADS.tommy.x + 1.5, z: plan.BOOTH_PADS.tommy.z });
    g.run(0.2);
    expect($('monte').hidden).toBe(true);
    expect(M.monteNow()).not.toBeNull();
    g.run(11);
    expect(M.monteNow()).toBeNull();
    expect(wallet.money).toBe(95_000);
    // that's three: no more this bout, even after a reload, and three more the next
    at(plan.BOOTH_PADS.tommy);
    g.run(0.2);
    expect(M.roundsLeft()).toBe(0);
    expect(M.dealMonte()).toBe(false);
    expect(M.monteMsg()).toContain("That's three");
    expect(fight.fightFrom(fight.saveFight()).den.monte).toEqual({ bout: F().bout.n, played: 3 });
    F().bout.n++;
    expect(M.roundsLeft()).toBe(3);
  });

  it('is a club: the bar and its stools, the tables, the banquette and the stage in the way, the bar and Gus\'s pads clear', async () => {
    const { g, cellar, plan } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    for (const p of [plan.DRINK_PAD, plan.BLOB_PAD]) expect(standable(g, cellar, p)).toBe(true);
    const B = plan.DEN_BAR;
    expect(standable(g, cellar, { x: (B.x0 + B.x1) / 2, z: B.front - 0.2 })).toBe(false);
    for (const t of [...Object.values(plan.DEN_TABLES), plan.STAGE, plan.BAR_STOOLS[0]]) expect(standable(g, cellar, t)).toBe(false);
    // and there's room to walk in from the doors, between the tables, to the bar and down to the far end of the room
    const L = g.layout, z = doorAt(plan).z;
    for (const p of [middle(plan.CLUB_WAY), { x: L.DEN.x1 - 0.5, z }, { x: L.DEN.x1 - 2.6, z }, { x: L.DEN.x1 - 2.6, z: L.DEN.z0 + 2.8 }, { x: (plan.ARCHES[0] + plan.ARCHES[1]) / 2, z: L.DEN.z0 + 2.8 }, { x: (L.DEN.x0 + L.DEN.x1) / 2, z: L.DEN.z1 - 0.3 }]) {
      expect(standable(g, cellar, p), JSON.stringify(p)).toBe(true);
    }
  });

  it('Angler Al pours a drink at the bar: a kelp tonic clears your head, the house special leaves you tipsy', async () => {
    const { g, plan, at } = await ring({ money: 100 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const club = await import('../src/club'), { tipsy } = await import('../src/casinoKit');
    at(plan.DRINK_PAD);
    g.run(0.2);
    expect($('denBar').hidden).toBe(false);
    expect(club.clubSays('al')).toContain('Angler Al');
    expect(club.buyDrink('house')).toBe(true);
    expect(g.wallet.money).toBe(90_000);
    // one at a time
    expect(club.buyDrink('tonic')).toBe(false);
    g.run(2);
    expect(tipsy.t).toBeGreaterThan(9);
    expect(club.buyDrink('tonic')).toBe(true);
    g.run(2);
    expect(tipsy.t).toBe(0);
    expect(g.wallet.money).toBe(88_000);
    // not without the chips
    g.wallet.money = 1000;
    g.run(0.1);
    expect(club.buyDrink('tonic')).toBe(false);
  });

  it("Gus, the blobfish at the bar, tells you what he's heard about the next boss for a drink", async () => {
    const { g, plan, at, F } = await ring({ money: 100 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const club = await import('../src/club'), fight = await import('../src/fight');
    at(plan.BLOB_PAD);
    g.run(0.2);
    expect($('denGus').hidden).toBe(false);
    expect(club.buyGus()).toBe(true);
    expect(g.wallet.money).toBe(95_000);
    expect(club.clubSays('gus')).toContain(club.RUMOURS[2]);
    expect(club.clubSays('gus')).toContain(fight.BOSSES[2].face);
    F().beaten = 5;
    club.buyGus();
    expect(club.clubSays('gus')).toContain('You beat the lot');
  });

  it('the regulars have a word as you come up to them, and Velvet sings while you\'re in the room', async () => {
    const { g, at } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const club = await import('../src/club'), R = await import('../src/regulars');
    for (const k of ['inky', 'coat', 'doc'] as const) {
      const w = R.where(k);
      at({ x: w.x + 1.2, z: w.z + 0.9 });
      g.run(0.2);
      expect(club.clubSays(k)).toBe(club.CLUB_LINES[k][0]);
    }
    expect(R.regulars.doc.watch).not.toBeNull();
    g.runUntil(() => club.SONG.includes(club.clubSays('velvet')), 12);
  });

  it("Mr. Fugu, once you've met the Family, wants you to know who he pays", async () => {
    const { office, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    expect(office.fuguLines().join(' ')).not.toContain('the Family');
    F().beaten = 2;
    expect(office.fuguLines()[0]).toContain('the Family');
  });
});
