// Stage 3: the arena's bouts and the fans who pay for bowls, the crowd's bubbles, the swarm on the floor and the watch
// spot, the wrestlers, the buyout and the restaurant upstairs as the front, Mr. Fugu's office, and saving it all.
import { describe, expect, it } from 'vitest';
import { loadGame, overHall, RING_DONE } from './helpers';
import { $, ring } from './stage3Ring';

describe('a bout', () => {
  it('the fans buy soup and sit down round the ring, the hungry go home, and the champion wins the local', async () => {
    const { g, fight, swarm, F } = await ring();
    const crowd = fight.crowdNow(), mine = Math.ceil((crowd + 1) / 2);
    for (let i = 0; i < mine; i++) fight.toStall(false);
    // the preparation: they come in and crowd round the soup bar, and the ones who eat go and sit on the champion's
    // side (a local's the free show, told by the arena alone: no tug of war at the top of the screen)
    g.run(3);
    g.ui.hud(0);
    expect(F().bout.phase).toBe('prep');
    expect($('rush').hidden).toBe(true);
    // (nobody eats from afar: there's soup on the bar, but they've still to walk up to it from their tunnel)
    expect(F().bout.came).toBeGreaterThan(0);
    expect(F().bout.fed).toBe(0);
    expect(F().stall).toHaveLength(mine);
    // (the first is served as soon as they've been in long enough to reach it)
    g.runUntil(() => F().bout.fed > 0, fight.REACH);
    expect(F().bout.fed).toBeGreaterThan(0);
    // (each one served steps up to a spot at the bar for their bowl, in their own colour, and turns yours there)
    const { BAR_SPOTS } = await import('../src/cellarPlan');
    for (let i = 0; i < 200 && swarm.swarm().ours < mine; i++) {
      g.run(0.1);
      for (const f of swarm.turnedAt()) expect(Math.min(...BAR_SPOTS.map(s => Math.hypot(f.x - s.x, f.z - s.z)))).toBeLessThan(0.05);
    }
    expect(swarm.swarm().ours).toBe(mine);
    expect(F().bout.fed).toBe(mine);
    g.runUntil(() => F().bout.phase !== 'prep', fight.BOUT.prep);
    g.run(0.01);
    expect(F().bout.phase).toBe('sit');
    expect(F().queue).toHaveLength(0);
    expect(F().stall).toHaveLength(0);
    // the ones who didn't eat go home, and nobody's sold anything while the rest sit down
    g.run(fight.BOUT.sit - 0.2);
    fight.toStall(false);
    g.run(1.5);
    expect(F().bout.phase).toBe('fight');
    expect(F().stall).toHaveLength(1);
    // (all who ate in their seats by the charge, round the furniture and up on the benches, never through anything)
    expect(swarm.swarm()).toMatchObject({ n: mine, ours: mine, seated: mine, benched: mine });
    g.run(fight.BOUT.fight);
    expect(F().bout.phase).toBe('pay');
    expect(F().bout.win).toBe(true);
    expect($('rush').hidden).toBe(true);
    // then they go home, and the next bout's fans come in; with nothing on the bar they all go home hungry, and the
    // champion still wins
    F().stall.length = 0;
    g.run(fight.BOUT.pay + 0.1);
    expect(F().bout).toMatchObject({ phase: 'prep', fed: 0 });
    g.run(fight.BOUT.prep + fight.BOUT.sit + 1);
    expect(swarm.swarm().n).toBe(0);
    g.run(fight.BOUT.fight);
    expect(F().bout.win).toBe(true);
  }, 30_000);

  it('the fans go home at a walk, the hungry ones and the rest after the bout, never in a jump', async () => {
    const { g, fight, swarm, F } = await ring();
    const crowd = fight.crowdNow();
    for (let i = 0; i < Math.ceil(crowd / 2); i++) fight.toStall(false);
    const was = new Map<number, { x: number; z: number }>();
    let fastest = 0, leaving = 0;
    const DT = 0.05, end = F().bout.n + 1;
    for (let i = 0; i < 4000 && F().bout.n <= end; i++) {
      g.run(DT);
      for (const f of swarm.whereabouts()) {
        const p = was.get(f.key);
        if (f.out && p) { fastest = Math.max(fastest, Math.hypot(f.x - p.x, f.z - p.z) / DT); leaving++; }
        was.set(f.key, { x: f.x, z: f.z });
      }
    }
    // (hungry ones went home when the fans sat down, and everyone after the result)
    expect(leaving).toBeGreaterThan(100);
    expect(fastest).toBeLessThan(3.5);
  }, 30_000);
});

describe('the crowd', () => {
  it('shouts in speech bubbles: an empty soup bar gets them asking for their chanko', async () => {
    const { g, swarm, fight, F } = await ring();
    F().stall.length = 0;
    await overHall();
    const heard = new Set<string>();
    for (let i = 0; i < 120 && F().bout.phase === 'prep'; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect([...heard].some(t => /chanko|soup|starving|chef/i.test(t))).toBe(true);
    expect(swarm.said().length).toBeLessThanOrEqual(4);
    // fed, they're happier about it
    for (let i = 0; i < 30; i++) fight.toStall(false);
    g.runUntil(() => F().bout.phase === 'prep' && F().bout.fed > 5, 60);
    heard.clear();
    for (let i = 0; i < 100 && F().bout.phase === 'prep'; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect(heard.size).toBeGreaterThan(0);
  });

  it("only fans you can see say anything: with the view turned away from the hall, no bubbles", async () => {
    const { g, swarm, F } = await ring();
    F().stall.length = 0;
    const { camera } = await import('../src/render'), { RING } = await import('../src/cellar');
    camera.position.set(RING.x + 500, RING.y + 70, RING.z);
    camera.lookAt(RING.x + 600, RING.y, RING.z);
    camera.updateMatrixWorld();
    for (let i = 0; i < 60; i++) { g.run(0.1); expect(swarm.said()).toEqual([]); }
    await overHall();
    const heard = new Set<string>();
    for (let i = 0; i < 80 && !heard.size; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect(heard.size).toBeGreaterThan(0);
  });
});

describe('the swarm and the watch spot', () => {
  it('the waiting fans crowd the floor round the soup square, a step back from its counters and never inside', async () => {
    const { g, swarm, plan, F } = await ring();
    g.run(10);
    expect(F().queue.length).toBeGreaterThan(3);
    expect(swarm.swarm().n).toBe(F().queue.length);
    expect(swarm.swarm().shadows).toBe(true);
    const stood = swarm.ways().filter(w => w.length === 1).map(([p]) => p);
    expect(stood.length).toBeGreaterThan(3);
    for (const p of stood) {
      expect(plan.fromBar(p)).toBeGreaterThan(0.8);
      expect(plan.inSquare(p)).toBe(false);
    }
    // (the ones at the front of the crowd are round it, not off across the floor)
    expect(Math.min(...stood.map(p => plan.fromBar(p)))).toBeLessThan(1.5);
  });

  it('a local fan late for the bar runs there, no faster than a person can', async () => {
    // (a busy kitchen, its hands all hired, four bosses down: a crowd that comes in fast)
    const { g, swarm } = await ring({ ring: {
      beaten: 4, tier: 3, slide: true, resto: 3, pantry: { rice: 40, fish: 40, mush: 40 },
      hires: { washer: true, salter: true, picker: true, attendant: true, cook: true },
      lines: { rice: { n: 6, up: 1 }, fish: { n: 6, up: 1 }, mush: { n: 6, up: 1 } },
    } });
    const dt = 1 / 60, was = new Map<number, { x: number; z: number; seen: number }>();
    let fastest = 0;
    for (let i = 0; i < 20 / dt; i++) {
      g.run(dt, dt);
      for (const f of swarm.whereabouts()) {
        const p = was.get(f.key);
        // (from half a second after they're first seen: a new fan is set in place in their tunnel before they set off)
        if (p && p.seen > 0.5) fastest = Math.max(fastest, Math.hypot(f.x - p.x, f.z - p.z) / dt);
        was.set(f.key, { x: f.x, z: f.z, seen: (p?.seen ?? 0) + dt });
      }
    }
    expect(fastest).toBeGreaterThan(2);
    expect(fastest).toBeLessThan(7); // (swarm.ts RUN, 6 m/s: a person running, not 58 as late ones were)
  }, 30_000);

  it('a bowl sold waits on the soup square for the fan who bought it, and hops to them when they get there', async () => {
    const { g, swarm, fight, F } = await ring();
    const { barShows } = await import('../src/ringKitchen');
    for (let i = 0; i < 10; i++) fight.toStall(false);
    // (sold: it stays out on its counter while its fan walks up)
    g.runUntil(() => fight.sold.n > 0 && swarm.heading() > 0, 20);
    g.run(1 / 60);
    expect(barShows().waiting).toBeGreaterThan(0);
    expect(barShows().out).toBe(F().stall.length);
    // (and when they're at the bar, it's theirs: it leaves its place, flying to them)
    g.runUntil(() => swarm.turnedAt().length > 0, 20);
    const was = barShows().waiting;
    g.run(1 / 60);
    expect(barShows().waiting).toBeLessThan(was);
  });

  it('each fan served steps up to a free spot of their own round the soup square, walking round it, never through it', async () => {
    const { g, swarm, plan, fight, F } = await ring();
    for (let i = 0; i < fight.STALL_CAP; i++) fight.toStall(false);
    const { BAR, BAR_SPOTS } = plan, at = new Set<number>();
    const inBar = (x: number, z: number) => x > BAR.x0 + 0.02 && x < BAR.x1 - 0.02 && z > BAR.z0 + 0.02 && z < BAR.z1 - 0.02;
    for (let i = 0; i < 900 && F().bout.phase === 'prep'; i++) {
      g.run(1 / 30, 1 / 30);
      for (const f of swarm.turnedAt()) {
        const k = BAR_SPOTS.findIndex(s => Math.hypot(f.x - s.x, f.z - s.z) < 0.05);
        expect(k).toBeGreaterThanOrEqual(0);
        at.add(k);
      }
      // (round the square to their spot and on to their seat, never across its counters nor into it)
      for (const way of swarm.ways()) {
        for (let j = 1; j < way.length; j++) {
          const a = way[j - 1], b = way[j];
          for (let t = 0; t <= 20; t++) {
            const x = a.x + (b.x - a.x) * t / 20, z = a.z + (b.z - a.z) * t / 20;
            expect(inBar(x, z), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(false);
          }
        }
      }
    }
    expect(F().bout.fed).toBeGreaterThan(8);
    // (a good few different spots, on both its open sides, each a step out from its counters)
    expect(at.size).toBeGreaterThanOrEqual(5);
    const sides = new Set([...at].map(k => BAR_SPOTS[k]).map(s => s.z < BAR.z0 ? 'n' : 'w'));
    expect(sides.size).toBeGreaterThanOrEqual(2);
    for (const s of BAR_SPOTS) expect(plan.fromBar(s)).toBeCloseTo(0.35, 5);
  });

  it('the soup square closes in the hearth room\'s doorway: you serve from inside it and leave through the hearth room', async () => {
    const { g, cellar, plan, fight } = await ring();
    const { BAR, BAR_PLACES, BAR_PAD } = plan;
    // a place on the counters' tops for every bowl out, each on a counter, none crowding the next
    expect(BAR_PLACES).toHaveLength(fight.STALL_CAP);
    for (const h of BAR_PLACES) {
      expect(plan.fromBar(h)).toBe(0);
      expect(plan.inSquare(h)).toBe(false);
      for (const o of BAR_PLACES) if (o !== h) expect(Math.hypot(h.x - o.x, h.z - o.z)).toBeGreaterThan(0.25);
    }
    // the pad's inside it; walking out west or north stops at the counters, and south at the arena's wall
    expect(plan.inSquare(BAR_PAD)).toBe(true);
    for (const [dx, dz] of [[-1, 0], [0, -1], [0, 1]]) {
      g.player.g.position.set(BAR_PAD.x, cellar.CY, BAR_PAD.z);
      for (let i = 0; i < 90; i++) { g.player.g.position.x += dx * 0.05; g.player.g.position.z += dz * 0.05; g.run(1 / 60); }
      const p = g.player.g.position;
      expect(p.x).toBeGreaterThan(BAR.x0 + BAR.d);
      expect(p.z).toBeGreaterThan(BAR.z0 + BAR.d);
      expect(p.z).toBeLessThanOrEqual(g.layout.ARENA.z1 + 1e-6);
    }
    // and in from the hearth room through its doorway
    g.player.g.position.set(g.layout.KITCHEN.x0 + 0.6, cellar.CY, 5.5);
    for (let i = 0; i < 120 && !plan.inSquare({ x: g.player.g.position.x, z: g.player.g.position.z }); i++) { g.player.g.position.x -= 0.05; g.run(1 / 60); }
    expect(plan.inSquare({ x: g.player.g.position.x, z: g.player.g.position.z })).toBe(true);
    // the crew's way from it to the ring's gong goes back through the hearth room and round by the landing
    const way = cellar.cellarWay(BAR_PAD, plan.GONG_PAD).map(w => cellar.roomAt(w));
    expect(way).toContain('kitchen');
    expect(way).toContain('landing');
    // and from the hearth room to the arena's floor, never through the square
    const round = cellar.cellarWay(plan.POT_PAD, plan.WATCH);
    expect(round.some(w => plan.inSquare(w))).toBe(false);
  });

  it('the flap at the west counter\'s south end lifts for the player, right up at it, lets them through, and shuts after them', async () => {
    const { g, cellar, plan } = await ring();
    const { BAR, FLAP } = plan, p = g.player.g.position, z = (FLAP.z0 + FLAP.z1) / 2 + 0.1, edge = BAR.x0 - 0.22;
    // nothing's set out on it, and no fan steps up to buy at it
    for (const h of plan.BAR_PLACES) expect(h.x > BAR.x0 + BAR.d || h.z < FLAP.z0).toBe(true);
    for (const s of plan.BAR_SPOTS) expect(s.z).toBeLessThan(FLAP.z0);
    // a couple of steps away from it, it stays shut
    p.set(BAR.x0 - cellar.FLAP_REACH.out - 0.3, cellar.CY, z);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // but it opens for a player passing well out from it in the arena, so it's found
    p.set(BAR.x0 - cellar.FLAP_REACH.out + 0.2, cellar.CY, FLAP.z0 - 0.5);
    g.run(0.5);
    expect(cellar.flapOpen()).toBe(true);
    p.set(BAR.x0 - 3, cellar.CY, z);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // and not for one serving inside the square, at the soup bar's pad
    p.set(plan.BAR_PAD.x, cellar.CY, plan.BAR_PAD.z + plan.BAR_PAD.r * 0.9);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // walked up to from the arena, it's open by the time the player reaches the counter (it holds them there till it
    // is), and lets them into the square
    p.set(BAR.x0 - 3, cellar.CY, z);
    g.run(1);
    let held = 0;
    for (let i = 0; i < 120 && !plan.inSquare(p); i++) {
      p.x += 0.05;
      g.run(1 / 60);
      if (!cellar.flapOpen()) { expect(p.x).toBeLessThanOrEqual(edge + 1e-6); if (p.x >= edge - 1e-6) held++; }
    }
    expect(held).toBe(0);
    expect(plan.inSquare(p)).toBe(true);
    // and back out the same way
    for (let i = 0; i < 90 && p.x > BAR.x0 - 0.5; i++) { p.x -= 0.05; g.run(1 / 60); }
    expect(p.x).toBeLessThanOrEqual(BAR.x0 - 0.5);
    // even open, it's never a way through for the fans or the crew; and it shuts once the player's away
    p.set(BAR.x0 + BAR.d / 2, cellar.CY, z);
    g.run(0.5);
    expect(cellar.flapOpen()).toBe(true);
    expect(cellar.cellarBoxes().some(([cx, cz, hx, hz]) => Math.abs(BAR.x0 + BAR.d / 2 - cx) < hx && Math.abs(z - cz) < hz)).toBe(true);
    p.set(BAR.x0 - 2, cellar.CY, 5);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
  });

  it('a boss\'s crowd walks round the ring, the stands and the soup bar to its seats, never through them', async () => {
    const { g, fight, swarm, cellar, F } = await ring({ ring: { tier: 2 } });
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 51 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.run(0.3);
    const A = g.layout.ARENA, boxes = cellar.cellarBoxes().filter(([cx, cz, hx, hz]) => cx + hx > A.x0 && cx - hx < A.x1 && cz + hz > A.z0 && cz - hz < A.z1);
    const inside = (x: number, z: number) => boxes.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx - 0.02 && Math.abs(z - cz) < hz - 0.02);
    let legs = 0;
    for (const way of swarm.ways()) {
      for (let i = 1; i < way.length; i++) {
        const a = way[i - 1], b = way[i];
        // (stepping down off a bench, or up onto one, is the only way into a stand's footprint)
        if (inside(a.x, a.z) || inside(b.x, b.z)) continue;
        legs++;
        for (let k = 0; k <= 30; k++) {
          const x = a.x + (b.x - a.x) * k / 30, z = a.z + (b.z - a.z) * k / 30;
          expect(inside(x, z), `${x.toFixed(2)}, ${z.toFixed(2)} on ${JSON.stringify(way.map(w => [+w.x.toFixed(2), +w.z.toFixed(2)]))}`).toBe(false);
          expect(x > A.x0 && x < A.x1 && z > A.z0 && z < A.z1).toBe(true);
        }
      }
    }
    expect(legs).toBeGreaterThan(50);
    // and they all sit down, the benches first
    g.run(fight.BOUT.sit + 2);
    expect(swarm.swarm()).toMatchObject({ n: 100, seated: 100 });
    expect(swarm.swarm().benched).toBeGreaterThan(60);
  });

  it('standing on the watch spot closes the camera in on the bout, with the names over it', async () => {
    const { g, plan, gong, stage, cellar, at } = await ring();
    at(plan.WATCH);
    g.run(3);
    expect(gong.watching()).toBe(true);
    expect(stage.view.zoom).toBeLessThan(stage.CELLAR_ZOOM);
    // aimed as ever, 0.4 m up: main.ts aims a little over the player's feet, and at the middle of anything else
    const { k, focus } = stage.view, feet = g.player.g.position.y;
    expect(feet + (focus.y - feet) * k + 0.4 * (1 - k)).toBeCloseTo(cellar.CY + 0.4, 5);
    // (and the strip along the top, the champion against tonight's local)
    expect($('rush').hidden).toBe(false);
    expect($('rushYou').textContent).toMatch(/^Chunkos \d+$/);
    expect($('rushThem').textContent).toMatch(/^\d+ Local$/);
    at(plan.BAR_PAD);
    g.run(3);
    expect(gong.watching()).toBe(false);
    expect($('rush').hidden).toBe(true);
  });

  it('bouts go on between boss nights: the fans buy soup, sit, the fight, and the result', async () => {
    const { g, fight, F } = await ring();
    const seen = new Set<string>();
    g.runUntil(() => { seen.add(F().bout.phase); return F().bout.n >= 1 && F().bout.phase === 'prep'; }, fight.BOUT.prep + fight.BOUT.sit + fight.BOUT.fight + fight.BOUT.pay + 5);
    expect([...seen]).toEqual(['prep', 'sit', 'fight', 'pay']);
  });
});

describe('the buyout, and the front', () => {
  it("buying Mr. Fugu out: he goes, his share ends, the restaurant's till comes back, and stage 4 is hinted at", async () => {
    const { g, cellar, front, fight, buy } = await ring({ money: 7_500_000, ring: RING_DONE, till: 300_000_000 });
    buy('buyout');
    expect(front.front.boughtOut).toBe(true);
    // the cash from upstairs comes out of the till
    expect(front.front.till).toBe(0);
    expect(g.wallet.money).toBe(300_500_000);
    expect(fight.F.boughtOut).toBe(true);
    expect(fight.bowlPrice(false)).toBe(fight.listPrice(false));
    expect(cellar.boss.visible).toBe(false);
    expect($('banner').textContent).toBe('Stage 3 completeThe Dohyo Below');
    expect($('stageCount').textContent).toBe('Complete');
    g.run(7);
    expect(g.stage.staging()).toBe(false);
  });

  it("in stage 3 the restaurant's takings are Mr. Fugu's rent (or a trickle, for the playtest), and its reviews don't count", async () => {
    const { front } = await ring();
    expect(front.tillShare()).toBe(0);
    expect(front.toTill([30, 30])).toEqual([]);
    front.front.mode = 'trickle';
    expect(front.toTill([30, 30])).toEqual([6, 6]);
    front.front.boughtOut = true;
    expect(front.toTill([30, 30])).toEqual([30, 30]);
    const { reviews } = await import('../src/rating');
    const n = reviews.length;
    front.frontReview(1);
    expect(reviews).toHaveLength(n);
  });

  it('diners upstairs still eat, but pay nothing into the register while it is rent', async () => {
    const { g } = await ring({ level: 0, plates: 30 });
    g.run(60);
    expect(g.restaurant.sushi.diners.length).toBeGreaterThan(0);
    expect(g.restaurant.register.n).toBe(0);
  });

  it('reads the playtest switch from the address', async () => {
    history.replaceState(null, '', '/?front=trickle');
    const { front } = await ring();
    expect(front.front.mode).toBe('trickle');
    history.replaceState(null, '', '/');
  });
});

describe("Mr. Fugu's office", () => {
  it('he has a word for whoever steps up to his desk: a new one each time, by how the ring is doing', async () => {
    const { g, F, at } = await ring();
    const office = await import('../src/office');
    const lines = office.fuguLines();
    expect(lines[0]).toContain('30% of every bowl');
    expect(lines.join(' ')).toContain('Hakkaku');
    expect(office.fuguSays()).toBe('');
    at(office.DESK_PAD);
    g.run(0.2);
    expect(office.fuguSays()).toBe(lines[0]);
    // (his mouth going as he says it, and shut once it's said)
    const { boss } = await import('../src/cellar');
    expect(boss.talking).toBe(true);
    // standing there, he doesn't repeat himself; off and back on, the next line
    g.run(1);
    expect(office.fuguSays()).toBe(lines[0]);
    at({ x: office.DESK_PAD.x, z: office.DESK_PAD.z + 2 });
    g.run(0.2);
    at(office.DESK_PAD);
    g.run(0.2);
    expect(office.fuguSays()).toBe(lines[1]);
    // and the bubble goes after a while
    g.run(10);
    expect(office.fuguSays()).toBe('');
    expect(boss.talking).toBe(false);
    // a boss beaten: the grow room's his secret
    F().beaten = 1;
    expect(office.fuguLines().join(' ')).toContain('Mushroom bowls');
    F().boughtOut = true;
    expect(office.fuguLines()[0]).toContain('Your house');
  });
});

describe('saving the cellar', () => {
  it('round-trips the lines, the crew, the ledge, the bowls, what the player carries, and the level', async () => {
    const { g, F, buy, plan, at } = await ring({ money: 10_000_000 });
    buy('rack');
    buy('washer');
    F().pantry.fish = 7;
    F().counter.push(false, false, true);
    F().stall.push(false);
    F().beaten = 2;
    at(plan.BIN_PADS.fish);
    g.run(3);
    at(plan.BAR_PAD);
    g.run(0.1);
    g.render.scene.remove(g.player.back.takeKind('fish')!);
    g.player.back.put(g.items.newBowl(true));
    const carried = g.player.back.count('fish');
    g.saveMod.save();
    const raw = JSON.parse(localStorage.getItem('floe-market-v1')!);
    expect(raw.v).toBe(6);
    const r2 = await ring(raw);
    const f = r2.F();
    expect(r2.g.layout.level.down).toBe(true);
    expect(f.lines.rice.n).toBe(2);
    expect(f.hires.washer).toBe(true);
    expect(f.crew.map(w => w.role)).toContain('washer');
    expect(f.pantry.fish).toBe(7);
    expect(f.counter).toEqual([false, false, true]);
    expect(f.beaten).toBe(2);
    expect(r2.g.player.back.count('fish')).toBe(carried);
    expect(r2.g.player.back.all().filter(m => m.userData.kind === 'bowl' && m.userData.mush)).toHaveLength(1);
    // the tiles follow: the next rack's price, the washer bought, the grow room found
    expect(r2.g.unlocks.tiles.find(t => t.id === 'rack')!.cost).toBe(15_000);
    expect(r2.g.unlocks.tiles.find(t => t.id === 'washer')!.done).toBe(true);
    expect(r2.g.layout.found.grow).toBe(true);
    expect($('stageCount').textContent).toBe('2/5');
  });

  it('a rush cut short by closing the page is called off, no win and no loss', async () => {
    const { g, fight } = await ring();
    fight.ringGong();
    g.run(2);
    g.saveMod.save();
    const r2 = await ring(JSON.parse(localStorage.getItem('floe-market-v1')!));
    expect(r2.F().rush).toBeNull();
    expect(r2.F().beaten).toBe(0);
    expect(r2.fight.ringGong()).toBe(true);
  });

  it('cleans up a bad cellar in a save, and starts an old design\'s ring over', async () => {
    const g = await loadGame();
    const { fightFrom, LEDGE_CAP } = await import('../src/fight');
    const f = fightFrom({ beaten: 99, tier: -4, lines: { rice: { n: 40, m: [{ items: [5, 'x', -1] }] } }, pantry: { rice: 1e9 }, counter: 'no', hires: { cook: 1, wizard: true } });
    expect(f.beaten).toBe(5);
    expect(f.tier).toBe(0);
    expect(f.lines.rice.n).toBe(6);
    expect(f.lines.rice.m[0].items).toEqual([1, 0]);
    expect(f.pantry.rice).toBe(LEDGE_CAP);
    expect(f.counter).toEqual([]);
    expect(Object.keys(f.hires)).toEqual(['cook']);
    expect(fightFrom('junk').beaten).toBe(0);
    // version 5's ring (the stable and the book) starts over
    const s = g.saveMod.migrate({ v: 5, money: 5, ring: { names: ['Big Al'], kg: [150] }, level: 7 });
    expect(s.ring).toBeNull();
    expect(s.level).toBe(1);
    expect(s.v).toBe(6);
  });
});

describe('the wrestlers', () => {
  it("grip, slap and push without ever standing inside each other; the belt bends with them; the loser goes down off the ring", async () => {
    const { g, cellar, dohyo, fight, F } = await ring();
    const { champ, rival } = dohyo.ring;
    const apart = () => Math.hypot(champ.position.x - rival.position.x, champ.position.z - rival.position.z);
    g.runUntil(() => F().bout.phase === 'sit', fight.BOUT.prep + 1);
    // crouched behind the lines, the hips (and the belt on them) tip forward with the body
    g.run(fight.BOUT.sit - 0.3);
    expect(champ.hips.rotation.x).toBeGreaterThan(0.2);
    // (today's pair stood 0.9 apart, inside each other: these meet chest to chest and no closer)
    g.runUntil(() => F().bout.phase === 'fight', 2);
    let closest = Infinity;
    for (let t = 0; t < fight.BOUT.fight - 0.1; t += 0.05) { g.run(0.05); closest = Math.min(closest, apart()); }
    expect(closest).toBeGreaterThan(1);
    // the local goes over the hawser on the west and down off the ring by the pallets; the champion stays up on it
    g.runUntil(() => F().bout.phase === 'pay', 1);
    g.run(2.6);
    expect(cellar.RING.x - rival.position.x).toBeGreaterThan(cellar.RING_HALF);
    expect(rival.position.y).toBeLessThan(cellar.CY + 0.1);
    expect(Math.abs(champ.position.x - cellar.RING.x)).toBeLessThan(cellar.RING_R);
    expect(champ.position.y).toBeCloseTo(cellar.CY + cellar.RING_TOP, 2);
  });
  it('the bosses are sea creatures on the same body, built without touching the luck, and a local after is a man again', async () => {
    const { dohyo, fight } = await ring();
    const { LOOKS } = await import('../src/creatures');
    const { pose } = await import('../src/rikishi');
    const { rival } = dohyo.ring;
    const meshes = () => { let n = 0; rival.traverse(o => { if ((o as { isMesh?: boolean }).isMesh) n++; }); return n; };
    rival.dress(0x2C3A6B); rival.setWeight(150);
    const man = meshes();
    const luck = Math.random;
    let rolled = 0;
    Math.random = () => { rolled++; return luck(); };
    try {
      for (const b of fight.BOSSES) {
        rival.dressAs(LOOKS[b.kind!], 180);
        expect(rival.kind).toBe(b.kind);
        // his own head, claws, tentacles, fins: more parts than a man's
        expect(meshes()).toBeGreaterThan(man);
      }
    } finally { Math.random = luck; }
    expect(rolled).toBe(0);
    // Fukure blows up a third bigger when he's angry
    rival.dressAs(LOOKS.puffer, 200);
    rival.puffTo = 1;
    for (let i = 0; i < 30; i++) rival.apply(pose(), 1 / 30);
    expect(rival.chestAt.scale.x).toBeGreaterThan(1.25);
    expect(rival.girth).toBeGreaterThan(rival.f * 1.25);
    // and a local is a plain wrestler again
    rival.dress(0x2C3A6B); rival.setWeight(150);
    expect(rival.kind).toBeUndefined();
    expect(meshes()).toBe(man);
    expect(rival.chestAt.scale.x).toBe(1);
  });
});
