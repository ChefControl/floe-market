// Co-op's mirror (src/mirror.ts): two copies of the game, a host and a guest, built the same way while loading. The
// host plays; what its Encoder writes, the guest's Decoder applies, and the guest's scene ends up like the host's.
import { describe, expect, it, vi } from 'vitest';
import type { Object3D } from 'three';
import { bought, loadGame, MARKET, type SaveFixture } from './helpers';
import { seeded } from './setup';

/** Loads a copy of the game, notes its scene as built, then loads `save` into it. */
async function copy(save?: SaveFixture) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(1));
  const g = await loadGame(save, { noLoad: true });
  const [mirror, boot, characters] = await Promise.all([import('../src/mirror'), import('../src/boot'), import('../src/characters')]);
  const end = boot.endBoot(), base = boot.BASE;
  const counts = [end.o - base.o, end.g - base.g, end.m - base.m, end.t - base.t].join(',');
  const b = mirror.captureBoundary(g.render.scene, g.player.g, counts);
  if (save) g.saveMod.load();
  return { ...g, mirror, boot, characters, b };
}
type Copy = Awaited<ReturnType<typeof copy>>;

/** A host and a guest, with the guest's phone listening to the host's. */
async function pair(save?: SaveFixture) {
  const host = await copy(save);
  const guest = await copy();
  const enc = new host.mirror.Encoder(host.render.scene, host.b);
  const people = {
    make: (c: number, look: string, style: unknown) => new guest.characters.Person(c, look as 'parka', style as never),
    disguise: (p: InstanceType<typeof guest.characters.Person>, on: boolean) => { p.disguised = on; p.wear(); },
  };
  const dec = new guest.mirror.Decoder(guest.render.scene, guest.b, people, guest.player.g);
  let now = 0, bytes = 0;
  /** The host plays `secs`, sending every tenth of a second; the guest catches up. */
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += 0.1) {
      host.run(0.1);
      now += 100;
      const d = enc.encode(now);
      if (!d) continue;
      const wire = JSON.stringify(d);
      bytes += wire.length;
      dec.apply(JSON.parse(wire), now);
    }
    dec.frame(now + 1e6);
  };
  return { host, guest, enc, dec, play, bytes: () => bytes };
}

/** Everything the host sends: all of its scene but what each phone keeps for itself. */
function sent(host: Copy) {
  const out: Object3D[] = [];
  const visit = (o: Object3D) => {
    if (o.userData.net === 'local') return;
    out.push(o);
    if (o.userData.net !== 'self') o.children.forEach(visit);
  };
  host.render.scene.children.forEach(visit);
  return out;
}

/** Where the guest's phone has each thing the host has, and whether it shows the same. */
function compare(p: Awaited<ReturnType<typeof pair>>) {
  const { host, dec } = p, base = host.boot.BASE.o;
  const off: string[] = [];
  let n = 0;
  for (const o of sent(host)) {
    const g = dec.nodes.get(o.id - base);
    n++;
    if (!g) { off.push(`missing ${o.type} ${o.id - base}`); continue; }
    if (!g.parent) { off.push(`detached ${o.type} ${o.id - base}`); continue; }
    const a = o.getWorldPosition(o.position.clone()), b = g.getWorldPosition(g.position.clone());
    if (a.distanceTo(b) > 0.01) off.push(`${o.type} ${o.id - base} at ${a.toArray().map(v => v.toFixed(2))} vs ${b.toArray().map(v => v.toFixed(2))}`);
    if (o.visible !== g.visible) off.push(`${o.type} ${o.id - base} shown ${o.visible} vs ${g.visible}`);
  }
  return { n, off };
}

describe('the mirror', () => {
  it('both copies build the same scene while loading', async () => {
    // The copies share one three.js here (a phone has its own), which builds a few things of its own the first time
    // they're needed: a first copy warms it up.
    await copy();
    const a = await copy(), b = await copy();
    expect(b.b.print).toBe(a.b.print);
    expect(a.b.nodes.size).toBeGreaterThan(500);
  });

  it('shows the guest a fresh market as the host has it', async () => {
    const p = await pair();
    p.play(3);
    const { n, off } = compare(p);
    expect(off).toEqual([]);
    expect(n).toBeGreaterThan(500);
  });

  it('keeps up with a busy stage 2 restaurant: customers, plates, cash and all', async () => {
    const p = await pair({
      money: 50000, tiles: bought(...MARKET, 'sushi', 'paddy', 'seats', 'chef', 'farmer', 'porter', 'tables'),
      fish: 30, rice: 20, plates: 10,
    });
    p.play(20);
    const { off } = compare(p);
    expect(off).toEqual([]);
    // the restaurant's diners, chefs and waiters are people on the guest's phone too
    const people = [...p.dec.nodes.values()].filter(o => o instanceof p.guest.characters.Person);
    expect(people.length).toBeGreaterThan(10);
  });

  it('starts a guest who joins late from a keyframe', async () => {
    const p = await pair({ money: 900, tiles: bought('pack', 'turret', 'roulette', 'runner') });
    p.host.run(10);
    p.enc.reset();
    p.play(1);
    expect(compare(p).off).toEqual([]);
  });

  it('catches a guest up from a keyframe after it missed messages', async () => {
    const p = await pair({ money: 900, tiles: bought('pack', 'turret', 'roulette', 'runner', 'boots', 'sled'), pile: 20 });
    p.play(3);
    // ten seconds of messages lost: customers came and went, fish were caught and sold
    let now = 1e6;
    for (let t = 0; t < 10; t += 0.1) { p.host.run(0.1); p.enc.encode(now += 100); }
    p.enc.reset();
    p.dec.key(p.enc.encode(now += 100)!, now);
    p.dec.frame(now + 1e6);
    expect(compare(p).off).toEqual([]);
    // nothing the host no longer has is left over
    const hostIds = new Set(sent(p.host).map(o => o.id - p.host.boot.BASE.o));
    const extra = [...p.dec.nodes.entries()].filter(([i, o]) => !hostIds.has(i) && o.parent && o !== p.guest.player.g);
    expect(extra.map(([i, o]) => `${o.type} ${i}`)).toEqual([]);
  });

  it('sends a busy scene in a few kilobytes a tenth of a second', async () => {
    const p = await pair({ money: 50000, tiles: bought(...MARKET, 'sushi', 'paddy', 'seats', 'chef'), fish: 30, rice: 20 });
    p.play(5);
    const first = p.bytes();
    p.play(10);
    const perTick = (p.bytes() - first) / 100;
    console.log(`about ${Math.round(perTick)} bytes a tenth of a second`);
    expect(perTick).toBeLessThan(8000);
  });
});
