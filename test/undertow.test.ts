// The Undertow (stage 3): the Family's club, behind the out-of-order stall in Mama Moray's restroom, through its back,
// the doorman's door, found when the second boss is beaten; the Family's three spread round the room,
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
/** Where the doorman's door stands, the out-of-order stall's back; where to try the stall from, just outside its front;
 *  and a step inside it. */
const doorAt = (plan: typeof import('../src/cellarPlan')) => ({ x: plan.CLUB_DOOR.x, z: (plan.CLUB_DOOR.z0 + plan.CLUB_DOOR.z1) / 2 });
const front = (plan: typeof import('../src/cellarPlan')) => ({ x: plan.STALLS.x + 0.25, z: doorAt(plan).z });
const inside = (plan: typeof import('../src/cellarPlan')) => ({ x: plan.STALLS.x - 0.5, z: doorAt(plan).z });

describe('the Undertow', () => {
  it("is a secret until the second boss is beaten: the out-of-order stall in Mama Moray's restroom, out of order, and nobody can walk in", async () => {
    const { g, cellar, plan, at } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    const S = await import('../src/southDoor');
    const L = g.layout;
    expect(L.found.den).toBe(false);
    expect(cellar.parts.den.visible).toBe(false);
    expect(cellar.parts.denHidden.visible).toBe(true);
    expect(cellar.lights[9].intensity).toBe(0);
    for (const d of L.DOORS.filter(t => t.b === 'den')) expect(standable(g, cellar, middle(d))).toBe(false);
    expect(standable(g, cellar, middle(L.DEN))).toBe(false);
    // the restroom's open to anyone, through the dining wing, but the stall's taped across
    expect(standable(g, cellar, { x: L.LOO.x1 - 0.5, z: L.LOO.z0 + 1 })).toBe(true);
    g.run(0.1);
    expect(standable(g, cellar, { x: plan.STALLS.x, z: doorAt(plan).z })).toBe(false);
    // try it: out of order, really, and its back stays shut
    at(front(plan));
    g.runUntil(() => S.wayState().says === S.LINES.nobody, 3);
    expect(S.wayState().scene).toBeNull();
    expect(g.player.held).toBe(false);
    g.run(3);
    expect(S.wayState().open).toBe(0);
    expect(L.found.den).toBe(false);
  });

  it("opens when Yokobashiri's beaten: Mr. Fugu hands over his matchbook, the doorman asks for the password, and the stall's back swings in on the club", async () => {
    const { g, plan, fight, cellar, at, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    const S = await import('../src/southDoor'), { DESK_PAD } = await import('../src/office'), { fogLeft } = await import('../src/clubFog');
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    const need = fight.toBeat(fight.BOSSES[1]);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < need && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush!.win).toBe(true);
    g.run(fight.BOUT.sit + fight.BOUT.fight + 0.5);
    expect(F().beaten).toBe(2);
    // the card says there's a way in now; the room's not there yet
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').textContent).toContain('🔓 New: Back-Alley Ring, bowl slide, steam baskets, a way');
    expect(g.layout.found.den).toBe(false);
    // the card goes, his crowd goes home, the next bout begins: Mr. Fugu wants a word, a "!" over him
    $('fightCard').click();
    g.runUntil(() => S.wayState().calling, fight.EPIC_PAY + 1);
    expect(F().rush).toBeNull();
    expect(g.layout.found.den).toBe(false);
    // trying the stall before he's had his word: "Password?" through a slot in its back, and nobody's let in
    at(front(plan));
    g.runUntil(() => S.wayState().says === S.LINES.ask, 3);
    g.runUntil(() => S.wayState().says === S.LINES.no, 3);
    expect(S.wayState().scene).toBeNull();
    // (his bubble left to fade)
    g.runUntil(() => S.wayState().says === '', 8);
    expect(g.layout.found.den).toBe(false);
    // at his desk: the camera on him, the cellar holding still, his lines a tap at a time, and his matchbook
    at(DESK_PAD);
    g.run(0.1);
    expect(S.wayState().scene).toBe('fugu');
    expect(g.player.held).toBe(true);
    const t = F().t;
    for (const line of S.LINES.fugu) {
      g.runUntil(() => S.wayState().says === line, 6);
      // (a tap while he's still saying it shows the rest of it at once)
      g.run(0.4);
      expect($('wayLine').textContent).not.toBe(line);
      g.press(' ');
      expect($('wayLine').textContent).toBe(line);
      g.run(0.5);
      expect(S.wayState().says).toBe(line);
      g.press(' ');
    }
    // then his matchbook's up close, to turn about and pocket
    g.run(0.8);
    expect($('wayLook').hidden).toBe(false);
    expect(F().den.book).toBe(false);
    g.press('ArrowLeft');
    g.run(0.5);
    g.press('ArrowLeft', 'keyup');
    $('wayPocket').click();
    g.runUntil(() => S.wayState().scene === null, 2);
    expect($('wayLook').hidden).toBe(true);
    expect(F().t).toBe(t);
    expect(F().den.book).toBe(true);
    expect(S.wayState().scene).toBeNull();
    expect(g.player.held).toBe(false);
    // back at the stall: the tape torn away, a step in, the slot, "Password?", the matchbook, and in; the club's smoke
    // rolling back off it
    at(front(plan));
    g.run(0.1);
    expect(S.wayState().scene).toBe('door');
    expect(g.player.held).toBe(true);
    g.runUntil(() => S.wayState().says === S.LINES.ask, 4);
    expect(g.player.g.position.x).toBeLessThan(plan.STALLS.x);
    g.runUntil(() => S.wayState().says === S.LINES.ok, 3);
    g.runUntil(() => g.layout.found.den, 3);
    expect(F().den.way).toBe(true);
    expect(F().den.door).toBe(true);
    g.runUntil(() => S.wayState().scene === null, 4);
    expect(g.player.held).toBe(false);
    expect(S.wayState().open).toBeGreaterThan(0.9);
    expect(cellar.parts.den.visible).toBe(true);
    expect(cellar.parts.denHidden.visible).toBe(false);
    expect(cellar.lights[9].intensity).toBeGreaterThan(0);
    g.run(0.5);
    expect(fogLeft()).toBeLessThan(1);
    // through it and into the club; the stall's front open now
    const L = g.layout;
    expect(standable(g, cellar, doorAt(plan))).toBe(true);
    expect(standable(g, cellar, middle(plan.CLUB_WAY))).toBe(true);
    expect(standable(g, cellar, { x: plan.STALLS.x, z: doorAt(plan).z })).toBe(true);
    expect(cellar.roomAt(middle(L.DEN))).toBe('den');
    // the door shuts behind you, and opens as you come up to it again: from the restroom, a good evening through the slot
    at(middle(L.DEN));
    g.run(0.5);
    at({ x: L.ARENA.x0 + 3, z: 0 });
    g.run(3);
    expect(S.wayState().open).toBeLessThan(0.1);
    expect(standable(g, cellar, doorAt(plan))).toBe(false);
    at(inside(plan));
    g.run(0.2);
    expect(S.wayState().says).toBe(S.LINES.evening);
    g.runUntil(() => S.wayState().open > 0.9, 3);
    // (a whole bout, and the club built: longer than most)
  }, 40_000);

  it('the way in: the band through the out-of-order stall, louder nearer it; the first time it opens on the club, its smoke rolls back', async () => {
    const { g, plan, cellar, at, F } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { door: false } } });
    const D = await import('../src/doorway'), S = await import('../src/southDoor'), { club } = await import('../src/noir'), { fogLeft } = await import('../src/clubFog');
    const L = g.layout, door = doorAt(plan);
    expect(F().den.door).toBe(false);
    // in the restroom: the band, muffled, louder nearer the stall; and the view in a little closer
    at({ x: L.LOO.x1 - 0.3, z: L.LOO.z0 + 0.5 });
    g.run(0.2);
    const far = club.k;
    expect(far).toBeGreaterThan(0);
    at(front(plan));
    g.run(0.2);
    expect(club.k).toBeGreaterThan(far);
    expect(club.muffle).toBe(1);
    expect(standable(g, cellar, door)).toBe(false);
    g.run(3);
    expect(g.stage.view.close).toBeCloseTo(D.CLOSE.loo, 2);
    // till it's open, the club behind it is under a bank of smoke
    expect(fogLeft()).toBe(1);
    // into the stall: a good evening through the slot, and its back swings open, the band coming through clear
    at(inside(plan));
    g.runUntil(() => S.wayState().open > 0.9, 3);
    g.run(0.5);
    expect(F().den.door).toBe(true);
    expect(g.player.held).toBe(false);
    expect(S.wayState().open).toBeGreaterThan(0.9);
    expect(standable(g, cellar, door)).toBe(true);
    expect(club.muffle).toBeLessThan(0.1);
    // the smoke rolls back off the room
    expect(fogLeft()).toBeGreaterThan(0);
    g.runUntil(() => fogLeft() === 0, 6);
    // in the club, the band at full
    at(middle(L.DEN));
    g.run(0.2);
    expect(club).toEqual({ k: 1, muffle: 0, vol: 1 });
    // in Harry's office, Tommy's card room and Eddie's room, through their doorways, a little quieter and duller; and the
    // stage's music still all gone, right into each one's corners
    for (const r of [L.LOANS, L.CARDS, L.VIP]) {
      for (const [px, pz] of [[r.x0 + 0.25, r.z0 + 0.25], [r.x1 - 0.25, r.z0 + 0.25], [r.x0 + 0.25, r.z1 - 0.25], [r.x1 - 0.25, r.z1 - 0.25], [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]]) {
        at({ x: px, z: pz });
        g.run(0.1);
        expect(club.k, `${px}, ${pz}`).toBe(1);
        expect(club.vol, `${px}, ${pz}`).toBeLessThan(1);
        expect(club.muffle, `${px}, ${pz}`).toBeGreaterThan(0);
      }
    }
    // and in the club the camera's in closer than in the rest of the cellar (closer than in the restroom)
    at(middle(L.DEN));
    g.run(3);
    expect(g.stage.view.close).toBeCloseTo(D.CLOSE.club, 2);
    expect(D.CLOSE.club).toBeLessThan(D.CLOSE.loo);
    // and the player's stride as much shorter, so the club's as big on foot as it looks
    expect(g.player.stride).toBeCloseTo(D.CLOSE.club, 2);
    // (back to full out in the cellar)
    at(middle(L.ARENA));
    g.run(3);
    expect(g.player.stride).toBe(1);
    // the stall's back shuts behind you, and opens as you come up to it again
    at({ x: L.LOO.x1 - 0.3, z: L.LOO.z0 + 0.5 });
    g.run(2);
    expect(S.wayState().open).toBeLessThan(0.1);
    expect(standable(g, cellar, door)).toBe(false);
    at(inside(plan));
    g.runUntil(() => S.wayState().open > 0.9, 2);
    // (and it's open for a game loaded later, the smoke long gone)
    expect(fogLeft()).toBe(0);
  });

  it("is still behind the door, on loading a game that's beaten two but not been let in", async () => {
    const { g, cellar, F } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { book: false, way: false } } });
    const S = await import('../src/southDoor');
    expect(F().den.way).toBe(false);
    expect(g.layout.found.den).toBe(false);
    expect(S.wayState().calling).toBe(true);
    expect(cellar.parts.den.visible).toBe(false);
  });

  it("leaves no marking of the Family's pads up top, on the world over the cellar", async () => {
    await loadGame({ tiles: bought(...MARKET, 'sushi') });
    const [{ scene }, { BOOTH_PADS }, { CY }] = await Promise.all([import('../src/render'), import('../src/cellarPlan'), import('../src/cellar')]);
    const { Mesh, Vector3 } = await import('three');
    const shown = (o: import('three').Object3D) => { for (let p: typeof o | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const at = new Vector3();
    for (const k of ['eddie', 'harry', 'tommy'] as const) {
      const pad = BOOTH_PADS[k], up: string[] = [];
      scene.traverse(o => {
        if (!(o instanceof Mesh) || !shown(o)) return;
        o.getWorldPosition(at);
        if (at.y > CY + 3 && Math.hypot(at.x - pad.x, at.z - pad.z) < 0.01) up.push(o.name || o.uuid);
      });
      expect(up, k).toEqual([]);
    }
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

  it("can't hear the fans in the arena from in the club: none of their bubbles show while you're in the Undertow", async () => {
    const { g, plan, cellar, at } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const swarm = await import('../src/swarm'), { F } = await import('../src/fight'), L = g.layout;
    F.stall.length = 0;
    // in the club and in Eddie's room, all through the bout's preparation, while the fans go hungry
    for (const p of [{ x: (L.DEN.x0 + L.DEN.x1) / 2, z: (L.DEN.z0 + L.DEN.z1) / 2 }, plan.BOOTH_PADS.eddie]) {
      at(p);
      for (let i = 0; i < 40; i++) { g.run(0.1); expect(swarm.said()).toEqual([]); }
    }
    // back in the arena, they're heard again
    at({ x: cellar.RING.x + 4, z: cellar.RING.z + 3 });
    const heard = new Set<string>();
    for (let i = 0; i < 80 && !heard.size; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect(heard.size).toBeGreaterThan(0);
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
    // he's watching; his head bobs to his words as he talks, smoothly, never jumping from one frame to the next
    expect(family.harry.watch).not.toBeNull();
    let jump = 0, nodded = 0, last = family.harry.head.rotation.x;
    for (let i = 0; i < 60; i++) {
      g.run(1 / 60);
      const x = family.harry.head.rotation.x;
      jump = Math.max(jump, Math.abs(x - last)); nodded = Math.max(nodded, Math.abs(x)); last = x;
    }
    expect(nodded).toBeGreaterThan(0.04);
    expect(jump).toBeLessThan(0.03);
    // and he's done talking (still and quiet) well before his bubble goes, so it can be read
    g.runUntil(() => !family.harry.talking, 8);
    expect(undertow.undertowSays('harry')).toBe(undertow.LINES.harry[0]);
    // standing there, he doesn't repeat himself; off and back on, the next line
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
    expect(undertow.undertowSays('tommy')).toContain('Three-Card Tommy');
    at(plan.BOOTH_PADS.eddie);
    g.run(0.2);
    expect(undertow.undertowSays('eddie')).toContain('Slick Eddie');
    // out of the room, nobody's watching
    at(cellar.RING);
    g.run(0.2);
    expect(family.eddie.watch).toBeNull();
  });

  it('the first time, each of the Family introduces himself, staged like Mr. Fugu, once a game; then his table opens', async () => {
    // (a game from before the introductions, with nothing to show it's used any of them)
    const { g, plan, undertow, fight, at, F } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { met: undefined } } });
    const meet = await import('../src/meet');
    const { family } = await import('../src/family');
    expect(F().den.met).toEqual({ eddie: false, harry: false, tommy: false });
    at(plan.BOOTH_PADS.eddie);
    g.run(0.1);
    // the cellar holds still, the camera comes in on him, his panel waits, and nobody else has a word
    expect(meet.meetPlaying()).toBe(true);
    expect(g.player.held).toBe(true);
    expect($('meet').hidden).toBe(false);
    expect($('eddie').hidden).toBe(true);
    expect(undertow.undertowSays('eddie')).toBe('');
    const t = F().t;
    g.run(1);
    expect(F().t).toBe(t);
    expect(meet.meetCam.k).toBeGreaterThan(0.9);
    // his lines, one at a time in his bubble, his name on it, his head bobbing as he says them; a tap for the next
    expect(meet.meetState()).toMatchObject({ who: 'eddie', says: meet.INTRO.eddie[0], line: 0 });
    expect($('meetWho').textContent).toBe('Slick Eddie');
    expect(family.eddie.talking).toBe(true);
    const said: string[] = [];
    for (let i = 0; i < 20 && meet.meetPlaying(); i++) {
      g.run(1.5);
      said.push(meet.meetState().says);
      window.dispatchEvent(new PointerEvent('pointerdown'));
      g.run(0.1);
    }
    expect([...new Set(said)]).toEqual(meet.INTRO.eddie);
    // every line 8 words or fewer, all three of them
    for (const l of Object.values(meet.INTRO).flat()) expect(l.split(' ').length, l).toBeLessThanOrEqual(8);
    // then back to the game: his panel opens as ever, and it's kept
    g.run(0.1);
    expect(meet.meetPlaying()).toBe(false);
    expect(g.player.held).toBe(false);
    expect($('eddie').hidden).toBe(false);
    expect(F().den.met.eddie).toBe(true);
    g.saveMod.save();
    expect(JSON.parse(localStorage.getItem('floe-market-v1')!).ring.den.met).toEqual({ eddie: true, harry: false, tommy: false });
    // off and back on: no introduction again, his word as before
    at({ x: plan.BOOTH_PADS.eddie.x + 1.5, z: plan.BOOTH_PADS.eddie.z });
    g.run(0.3);
    at(plan.BOOTH_PADS.eddie);
    g.run(0.2);
    expect(meet.meetPlaying()).toBe(false);
    expect(undertow.undertowSays('eddie')).toContain('Slick Eddie');
    // the next one has his own
    at(plan.BOOTH_PADS.tommy);
    g.run(1);
    expect(meet.meetState()).toMatchObject({ who: 'tommy', says: meet.INTRO.tommy[0] });
    expect($('meetWho').textContent).toBe('Three-Card Tommy');
    expect($('monte').hidden).toBe(true);
    // (and a reload keeps who's been met)
    const again = await ring(JSON.parse(localStorage.getItem('floe-market-v1')!));
    expect(again.fight.F.den.met.eddie).toBe(true);
    void fight;
  }, 30_000);

  it('a save from before the introductions counts a vendor met when it shows he was used', async () => {
    const { F } = await ring({ ring: { beaten: 3, lines: { mush: { n: 1 } }, den: { met: undefined, monte: { bout: 4, played: 2 }, loan: { owed: 18, total: 24 } } } });
    expect(F().den.met).toEqual({ eddie: false, harry: true, tommy: true });
    const fixed = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } }, den: { met: undefined, eddie: { boss: 2, cut: 2, caught: false } } } });
    expect(fixed.F().den.met).toEqual({ eddie: true, harry: false, tommy: false });
  }, 30_000);

  it("Tommy deals monte at his crate: the stake in Fugu Chips up to his limit, half again for the queen, 3 rounds a fight", async () => {
    const { g, plan, fight, at, F } = await ring({ money: 100 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const M = await import('../src/monteTable');
    const { wallet } = g;
    at(plan.BOOTH_PADS.tommy);
    g.run(0.2);
    expect($('monte').hidden).toBe(false);
    // his limit's a fight's takings at a full house (here, the floor's 20 chips), and he'll play 3 rounds; the chips
    // over it aren't on his table
    const H = await import('../src/fullHouse'), Mo = await import('../src/monte');
    expect(Mo.limitFor(H.heldFight())).toBe(20);
    expect(M.monteMsg()).toContain('limit 🐡 20');
    expect(M.monteMsg()).toContain('3 rounds left');
    const chip = (i: number) => $('monte').querySelector<HTMLButtonElement>(`[data-stake="${i}"]`)!;
    expect([0, 1, 2, 3].map(i => chip(i).hidden)).toEqual([false, false, true, true]);
    // over his limit, he won't deal
    M.stakeMonte(25);
    expect(M.dealMonte()).toBe(false);
    // 5 chips: taken as he deals; he shows her, swaps (4 to 12 times), and waits for a pick
    M.stakeMonte(5);
    expect(M.dealMonte(() => 0.5)).toBe(true);
    expect(wallet.money).toBe(95_000);
    expect(F().den.monte).toEqual({ bout: F().bout.n, played: 1 });
    g.runUntil(() => M.monteNow()?.phase === 'pick', 20);
    const r = M.monteNow()!.round;
    expect(r.swaps.length).toBeGreaterThanOrEqual(4);
    // find her: paid at once, half again, and the cards turn over
    expect(M.pickMonte(r.queen)).toBe(true);
    expect(wallet.money).toBe(102_500);
    g.runUntil(() => M.monteNow() === null, 5);
    expect(M.monteMsg()).toContain('Sharp eyes');
    // a wrong card loses the stake
    M.dealMonte();
    g.runUntil(() => M.monteNow()?.phase === 'pick', 20);
    M.pickMonte((M.monteNow()!.round.queen + 1) % 3);
    g.runUntil(() => M.monteNow() === null, 5);
    expect(wallet.money).toBe(97_500);
    expect(M.monteMsg()).toContain('She was on the');
    // walking off before picking leaves the stake on his crate (he waits a little first)
    M.dealMonte();
    g.run(0.5);
    at({ x: plan.BOOTH_PADS.tommy.x + 1.5, z: plan.BOOTH_PADS.tommy.z });
    g.run(0.2);
    expect($('monte').hidden).toBe(true);
    expect(M.monteNow()).not.toBeNull();
    g.run(11);
    expect(M.monteNow()).toBeNull();
    expect(wallet.money).toBe(92_500);
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

  it('is a club: the bar and its stools, the tables and the bandstand in the way, the bar\'s pad clear', async () => {
    const { g, cellar, plan } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    expect(standable(g, cellar, plan.DRINK_PAD)).toBe(true);
    const B = plan.DEN_BAR;
    expect(standable(g, cellar, { x: (B.x0 + B.x1) / 2, z: B.front - 0.2 })).toBe(false);
    for (const t of [...Object.values(plan.DEN_TABLES), plan.STAGE, ...Object.values(plan.BAND), plan.BAR_STOOLS[0]]) expect(standable(g, cellar, t)).toBe(false);
    // and there's room to walk in from the stall's back, between the tables, to the bar and down to the far end of the room
    const L = g.layout, z = doorAt(plan).z;
    for (const p of [{ x: L.DEN.x1 - 0.5, z }, { x: L.DEN.x1 - 1.0, z }, { x: L.DEN.x1 - 1.3, z: plan.LOUNGE.z - 0.5 }, { x: L.DEN.x1 - 2.6, z: L.DEN.z0 + 3.4 }, { x: (plan.ARCHES[0] + plan.ARCHES[1]) / 2, z: L.DEN.z0 + 2.8 }, { x: (L.DEN.x0 + L.DEN.x1) / 2, z: L.DEN.z1 - 0.3 }]) {
      expect(standable(g, cellar, p), JSON.stringify(p)).toBe(true);
    }
  });

  it('has a band on the bandstand playing along with the music: the sax up for the last A, two of the drummer\'s arms on the vibes for the bridge', async () => {
    const { g, plan } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const { band, bandState } = await import('../src/band'), { eighth } = await import('../src/noir');
    // all five up on the stand
    for (const m of Object.values(band)) expect(m.position.y).toBeCloseTo(g.layout.CELLAR_Y + plan.BANDSTAND.h, 2);
    /** Plays on to `bar` (sixteen to a round), and how far the sax and the vibes arms are in there. */
    const at = (bar: number) => {
      g.runUntil(() => bandState().bar === bar, 60);
      g.run(eighth() * 6);
      return bandState();
    };
    expect(at(2).sax).toBeLessThan(0.1);
    expect(at(2).vibes).toBeLessThan(0.1);
    expect(at(9).vibes).toBeGreaterThan(0.9);
    expect(at(9).sax).toBeLessThan(0.1);
    expect(at(13).sax).toBeGreaterThan(0.9);
    expect(at(13).vibes).toBeLessThan(0.1);
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

  it("Harry lends up to four bouts' takings at a full house, held from when you walk in, and takes 30% of the stall's sales till it's paid", async () => {
    const { g, plan, at, fight } = await ring({ money: 50 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const D = await import('../src/loanDesk'), Lo = await import('../src/loan'), L = g.layout;
    // his limit's worked out as you walk in: four bouts at a full house, a plain bowl each
    at({ x: (L.DEN.x0 + L.DEN.x1) / 2, z: (L.DEN.z0 + L.DEN.z1) / 2 });
    g.run(0.1);
    const max = Lo.maxLoan(), full = fight.crowdNow() * fight.bowlPrice(false);
    expect(max).toBe(Math.max(10, Math.floor(4 * full / 5) * 5));
    // ...and held while you're in, whatever the stall does meanwhile
    fight.F.tier++;
    expect((await import('../src/fullHouse')).fullFight()).not.toBe(full);
    at(plan.BOOTH_PADS.harry);
    g.run(0.2);
    expect(Lo.maxLoan()).toBe(max);
    expect($('loans').hidden).toBe(false);
    // the slider ends at his limit; the button says what's borrowed and returned; one caption for his cut
    expect($('loansBorrow').textContent).toBe(`Borrow 🐡 ${max} · Return 🐡 ${Math.ceil(max * 1.25)}`);
    expect(D.loansMsg()).toBe("30% of your sales till it's paid");
    expect(($('loansAmount') as HTMLInputElement).max).toBe(String(max));
    // not more than that
    expect(D.takeLoan(max + 5)).toBe(false);
    const money = g.wallet.money, n = Math.max(10, Math.floor(max / 2 / 5) * 5);
    expect(D.takeLoan(n)).toBe(true);
    expect(g.wallet.money).toBe(money + n * 1000);
    expect(Lo.owed()).toBe(Math.ceil(n * 1.25));
    expect(D.takeLoan(10)).toBe(false); // one at a time
    g.run(0.1);
    expect($('loansPick').hidden).toBe(true);
    expect($('iou').hidden).toBe(false);
    expect($('iouLeft').textContent).toBe('30% of sales');
    // he takes three chips in ten of what the stall sells, not of a prize
    const due = Lo.owed(), before = g.wallet.money;
    fight.on.earn(10, 'bowls');
    expect(g.wallet.money).toBe(before + 7000);
    expect(Lo.owed()).toBeCloseTo(due - 3);
    fight.on.earn(10, 'prize');
    expect(Lo.owed()).toBeCloseTo(due - 3);
    // it's still owed after a reload
    expect(fight.fightFrom(fight.saveFight()).den.loan).toEqual(fight.F.den.loan);
    // pay off the rest at his desk
    expect(D.payLoan()).toBe(true);
    expect(Lo.owed()).toBe(0);
    g.run(0.1);
    expect($('iou').hidden).toBe(true);
    // or let the sales pay it: he never takes more than's owed
    expect(D.takeLoan(10)).toBe(true);
    const owing = Lo.owed(), had = g.wallet.money;
    fight.on.earn(100, 'bowls');
    expect(Lo.owed()).toBe(0);
    expect(g.wallet.money).toBe(had + (100 - owing) * 1000);
  });

  it("Gus, the blobfish at the bar, tells you what he's heard about the next boss for a drink", async () => {
    const { g, plan, at, F } = await ring({ money: 100 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const club = await import('../src/club'), fight = await import('../src/fight');
    // no pad: his panel opens when you speak to him
    const gusAt = { x: plan.BAR_STOOLS[3].x + 0.5, z: plan.DEN_BAR.front + 1.2 };
    at(gusAt);
    g.run(0.2);
    expect($('denGus').hidden).toBe(true);
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect($('denGus').hidden).toBe(false);
    expect(club.buyGus()).toBe(true);
    expect(g.wallet.money).toBe(95_000);
    expect(club.clubSays('gus')).toContain(club.RUMOURS[2]);
    expect(club.clubSays('gus')).toContain(fight.BOSSES[2].face);
    F().beaten = 5;
    club.buyGus();
    expect(club.clubSays('gus')).toContain('You beat the lot');
    // and it shuts the moment you move off
    at({ x: gusAt.x, z: gusAt.z + 0.2 });
    g.run(0.1);
    expect($('denGus').hidden).toBe(true);
  });

  it('the regulars have a word as you come up to them (Doc and Gus only when you speak to them), and Velvet sings while you\'re in the room', async () => {
    const { g, at, plan } = await ring({ ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const club = await import('../src/club'), R = await import('../src/regulars');
    const L = g.layout, mid = { x: (L.DEN.x0 + L.DEN.x1) / 2, z: (L.DEN.z0 + L.DEN.z1) / 2 };
    /** A step from `k` towards the middle of the club. */
    const beside = (k: 'inky' | 'coat' | 'doc' | 'gus') => {
      const w = R.where(k), d = Math.hypot(mid.x - w.x, mid.z - w.z);
      return { x: w.x + (mid.x - w.x) / d * 1.1, z: w.z + (mid.z - w.z) / d * 1.1 };
    };
    for (const k of ['inky', 'coat'] as const) {
      at(beside(k));
      g.run(0.2);
      expect(club.clubSays(k)).toBe(club.CLUB_LINES[k][0]);
    }
    // Doc and Gus keep to themselves till you speak to them, and only close up (a step off, there's no Talk)
    const cellar = await import('../src/cellar'), w = R.where('doc');
    let docAt = { x: 0, z: 0 }, best = Infinity;
    for (let x = -1.1; x <= 1.1; x += 0.1) for (let z = -1.1; z <= 1.1; z += 0.1) {
      const q = { x: w.x + x, z: w.z + z }, d = Math.hypot(x, z);
      if (d < best && d > 0.5 && standable(g, cellar, q)) { best = d; docAt = q; }
    }
    expect(best).toBeLessThan(1.0);
    const off = beside('doc');
    at({ x: w.x + (off.x - w.x) * 1.4, z: w.z + (off.z - w.z) * 1.4 });
    g.run(0.3);
    expect(document.getElementById('buy')!.textContent).not.toContain('Talk');
    for (const [k, p] of [['doc', docAt], ['gus', { x: plan.BAR_STOOLS[3].x + 0.5, z: plan.DEN_BAR.front + 1.2 }]] as const) {
      at(p);
      g.run(0.5);
      expect(club.clubSays(k), k).toBe('');
      expect(document.getElementById('buy')!.textContent, k).toContain('Talk');
      g.press('e'); g.run(0.1); g.press('e', 'keyup');
      expect(club.clubSays(k), k).toBe(club.CLUB_LINES[k][0]);
      // (and he's watching you)
      if (k === 'doc') expect(R.regulars.doc.watch).not.toBeNull();
    }
    g.runUntil(() => club.SONG.includes(club.clubSays('velvet')), 12);
  });

  it("Slick Eddie fixes the next boss: his fans kept home for 🐡 8 each, up front; the gong shows both ways it could go", async () => {
    const { g, plan, fight, at, F } = await ring({ money: 5000 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const E = await import('../src/eddie');
    at(plan.BOOTH_PADS.eddie);
    g.run(0.2);
    expect($('eddie').hidden).toBe(false);
    // 30% of Dobu's 498 fans: 149 kept home, at 8 chips a fan; a 30% chance it gets out
    E.pickCut(3);
    expect($('eddieFix').textContent).toBe('Fix 🐟 −149 fans · 30% caught');
    // (each size says what it costs)
    expect($('eddie').querySelector('[data-cut="3"]')!.textContent).toBe('🐡1,192');
    expect(E.payEddie(3, () => 0.99)).toBe(true);
    expect(g.wallet.money).toBe(5000 * 1000 - 1192 * 1000);
    expect(F().den.eddie).toEqual({ boss: 2, cut: 3, caught: false });
    // one fix a boss
    expect(E.payEddie(1, () => 0.99)).toBe(false);
    expect(E.eddieMsg()).toContain("You'll know at the gong");
    // saved as it's paid for: a reload doesn't undo it, or roll it again
    expect(fight.fightFrom(fight.saveFight()).den.eddie).toEqual({ boss: 2, cut: 3, caught: false });
    // the gong: your chances if the fix holds (349 fans) and if it's caught (all 498), a word for each face of his coin
    at(plan.GONG_PAD);
    g.run(0.7);
    // (each as the forecasts have it, a cooking bonus bought at the gong included)
    const gong = await import('../src/gong'), dobu = fight.BOSSES[2];
    const says = (kept: number) => gong.VERDICT[gong.verdict(dobu, fight.forecast(kept)!, dobu.crowd - kept, { at35: fight.forecast(kept, { bonus: 35 })!, at50: fight.forecast(kept, { bonus: 50 })! })];
    expect([...$('gongCast').children].map(r => r.textContent)).toEqual([`Fix holds${says(149)}`, `Caught${says(0)}`]);
    expect($('gongCast').querySelectorAll('svg.mini use[href="#coinGrin"], svg.mini use[href="#coinGrimace"]')).toHaveLength(2);
    // rung: it held, and he walks in with 149 fewer; the fix is spent
    expect(fight.ringGong()).toBe(true);
    expect(F().rush).toMatchObject({ n: 349, kept: 149, fix: { cut: 3, caught: false } });
    expect(fight.fixOn()).toBeNull();
    expect(F().den.scandal.bouts).toBe(0);
    // (and a reload in the middle of it calls the rush off, but keeps the fix for next time: it was paid for)
    expect(fight.saveFight().den.eddie).toEqual({ boss: 2, cut: 3, caught: false });
  });

  it("rung with a fix on, Eddie's coin is tossed, and the world waits on it till it's tapped away; then the boss walks in", async () => {
    const { g, plan, fight, at, F } = await ring({ money: 5000 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const E = await import('../src/eddie'), gong = await import('../src/gong');
    expect(E.payEddie(3, () => 0.99)).toBe(true);
    at(plan.GONG_PAD);
    g.run(0.2);
    const t = F().t;
    expect(gong.ring()).toBe(true);
    // up: smiling Eddie, the gong's panel away, and nothing moves: his crowd's at the door, the bell's not started
    expect($('coin').hidden).toBe(false);
    expect($('coin').className).toBe('hold');
    expect($('gong').hidden).toBe(true);
    expect($('fightBanner').hidden).toBe(true);
    expect($('rush').hidden).toBe(true);
    g.run(3);
    expect(F().rush).toMatchObject({ n: 349, walk: fight.WALK_IN, t: 0 });
    expect(F().t).toBe(t);
    expect(g.player.held).toBe(true);
    // (a tap before it's said its piece does nothing)
    $('coin').click();
    expect($('coin').hidden).toBe(false);
    g.run(2.5);
    expect($('coin').className).toBe('hold ready');
    expect($('coinHead').textContent).toBe('THE FIX HOLDS');
    expect($('coinSub').textContent).toBe('Dobu brings 349, not 498');
    // tapped: he walks in
    $('coin').click();
    expect($('coin').hidden).toBe(true);
    expect(g.player.held).toBe(false);
    expect($('fightBanner').textContent).toBe('入場Dobu 🐟 · 349 fansTURN 280 TO WIN');
    g.run(1);
    expect(F().rush!.walk).toBeLessThan(fight.WALK_IN);
    expect($('rush').hidden).toBe(false);
    // caught, the next time: frowning Eddie, and he brings them all
    g.runUntil(() => !F().rush, 120);
    expect(E.payEddie(2, () => 0.01)).toBe(true);
    expect(gong.ring()).toBe(true);
    expect($('coin').className).toBe('caught');
    g.run(6);
    expect($('coinHead').textContent).toBe('🗞️ CAUGHT!');
    expect($('coinSub').textContent).toBe('He brings all 498');
    // (E does it too)
    g.press('e');
    g.run(0.1);
    g.press('e', 'keyup');
    expect($('coin').hidden).toBe(true);
  }, 60_000);

  it("if the papers get Eddie's fix, the boss brings them all, and the player's own fans stay away for a bout or more", async () => {
    const { g, plan, fight, at, F } = await ring({ money: 5000 * 1000, ring: { beaten: 2, lines: { mush: { n: 1 } } } });
    const E = await import('../src/eddie');
    at(plan.BOOTH_PADS.eddie);
    g.run(0.2);
    expect(E.payEddie(4, () => 0.2)).toBe(true); // (under 50%: caught)
    const fans = fight.crowdNow();
    expect(fight.ringGong()).toBe(true);
    expect(F().rush).toMatchObject({ n: 498, kept: 0, fix: { cut: 4, caught: true } });
    // 40% of your own fans stay away, for the next 2 local bouts
    expect(F().den.scandal).toEqual({ cut: 4, bouts: 2 });
    expect(fight.crowdNow()).toBe(Math.round(fans * 0.6));
    g.runUntil(() => !F().rush && F().bout.crowd >= 0, 120);
    expect(F().bout.crowd).toBe(Math.round(fans * 0.6));
    g.runUntil(() => F().den.scandal.bouts === 1, 60);
    // (and it's saved as it stands)
    expect(fight.fightFrom(fight.saveFight()).den.scandal).toEqual({ cut: 4, bouts: 1 });
    g.runUntil(() => F().den.scandal.bouts === 0, 60);
    expect(fight.crowdNow()).toBe(fans);
  }, 60_000);

  it("the gong's forecast of a fixed rush is what the rush does, and junk in a saved fix reads back as none", async () => {
    const { fight: f } = await ring({ level: 0 });
    f.resetFight();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 2; i++) f.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) f.hire(r);
    for (let t = 0; t < 90; t += 0.05) f.step(0.05);
    const boss = f.BOSSES[0], kept = f.keptHome(boss, 5);
    expect(f.setFix(5, false)).toBe(true);
    const fc = f.forecast(kept)!, all = f.forecast()!;
    expect(fc.turned).toBeGreaterThan(0);
    expect(f.ringGong()).toBe(true);
    // (a local fight on: he walks in once it's over, and the forecast knew)
    expect(f.F.called).toBe(true);
    while (f.F.called) f.step(0.05);
    expect(f.F.rush!.n).toBe(boss.crowd - kept);
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) f.step(0.05);
    expect(f.F.rush!.turned).toBe(fc.turned);
    expect(f.F.rush!.win).toBe(fc.turned >= f.toBeat(boss, boss.crowd - kept));
    expect(all.turned).toBeGreaterThanOrEqual(fc.turned);
    for (const den of [{ eddie: { boss: 9, cut: 'x' } }, { eddie: { cut: 99, boss: 1 }, scandal: { cut: -3, bouts: 40 } }]) {
      const back = f.fightFrom({ ...f.saveFight(), den }).den;
      expect(back.eddie.cut === 0 || (back.eddie.cut >= 1 && back.eddie.cut <= 5)).toBe(true);
      expect(back.scandal.bouts).toBeLessThanOrEqual(3);
      expect(back.scandal.cut).toBeGreaterThanOrEqual(0);
    }
  });

  it("Mr. Fugu, once you've met the Family, wants you to know who he pays", async () => {
    const { office, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    expect(office.fuguLines().join(' ')).not.toContain('the Family');
    F().beaten = 2;
    expect(office.fuguLines()[0]).toContain('the Family');
  });
});
