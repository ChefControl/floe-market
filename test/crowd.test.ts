// The crowd: walk-up customers, drivers and diners each mix a man's or a woman's wardrobe, so no two look alike.
import { Mesh, type MeshLambertMaterial, type Object3D, type SphereGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const wardrobe = () => import('../src/wardrobe');
const characters = () => import('../src/characters');
/** What a person's showing of their seasonal clothes, hair and the like. */
const worn = (o: Object3D) => o.children.filter(c => c.userData.outfit && c.visible);
const hex = (o: Object3D) => ((o as Mesh).material as MeshLambertMaterial).color.getHex();
/** How someone looks at a glance. */
const look = (s: import('../src/wardrobe').Style) => [s.woman, s.skin, s.hair, s.cut, s.face, s.glasses, s.legs, s.skirt].join();

describe('the crowd', () => {
  it('mixes men and women, each from their own wardrobe, without touching the game\'s luck', async () => {
    const { crowd } = await wardrobe();
    const random = vi.spyOn(Math, 'random');
    const people = Array.from({ length: 60 }, crowd);
    expect(random).not.toHaveBeenCalled();
    const women = people.filter(p => p.woman), men = people.filter(p => !p.woman);
    expect(women.length).toBeGreaterThan(15);
    expect(men.length).toBeGreaterThan(15);
    for (const w of women) {
      expect(['long', 'ponytail', 'bun', 'bob', 'curly']).toContain(w.cut);
      expect(['bare', 'earrings']).toContain(w.face);
      expect(['brim', 'pillbox', 'bare']).toContain(w.hat);
      expect(w.neck).toBe('pearls');
      expect(w.winter).not.toBe('trapper');
    }
    for (const m of men) {
      expect(['short', 'quiff', 'curly', 'bald']).toContain(m.cut);
      expect(m.face).not.toBe('earrings');
      expect(m.skirt).toBeNull();
      expect(['top', 'bowler', 'bare']).toContain(m.hat);
      expect(m.winter).not.toBe('earmuffs');
    }
    // plenty of mixes, and nobody looks just like the person in front of them
    expect(new Set(people.map(p => p.skin)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(people.map(p => p.cut)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(people.map(look)).size).toBe(people.length);
    expect(women.some(w => w.skirt !== null) && women.some(w => w.skirt === null)).toBe(true);
    expect(people.some(p => p.winter !== 'hood')).toBe(true);
    expect(new Set(people.map(p => p.height.toFixed(2))).size).toBeGreaterThan(10);
  });

  it('dresses a woman in her skirt in spring and summer, her hair down under a hat, and her colours', async () => {
    const g = await loadGame();
    const { setSeason } = await import('../src/season');
    const { Person } = await characters();
    const { crowd } = await wardrobe();
    let st = crowd();
    while (!(st.woman && st.skirt !== null && st.cut === 'long' && st.winter === 'bobble')) st = crowd();
    const p = new Person(0x5B8DEF, 'parka', st);
    g.render.scene.add(p);
    const head = p.children.find(c => c instanceof Mesh && c.geometry === g.render.G.head)!;
    expect(hex(head)).toBe(st.skin);
    expect(hex(p.legs[0].children[0])).toBe(st.legs);
    expect(p.scale.x).toBeCloseTo(st.height);
    const skirt = () => worn(p).filter(c => hex(c) === st.skirt && (c as Mesh).geometry.type === 'CylinderGeometry');
    const hair = () => worn(p).filter(c => hex(c) === st.hair);
    // winter: no hood, a woolly hat, and her long hair hanging down below it
    expect(p.children.some(c => (c as Mesh).geometry === g.render.G.hood && c.visible)).toBe(false);
    expect(hair()).toHaveLength(1);
    expect(skirt()).toHaveLength(0);
    setSeason(1);
    expect(skirt()).toHaveLength(1);
    expect(hair()).toHaveLength(2); // all of it showing
    setSeason(2);
    expect(skirt()).toHaveLength(1);
    setSeason(3);
    expect(skirt()).toHaveLength(0);
    expect(hair()).toHaveLength(1);
  });

  it('gives a man his beard all year, and swaps his glasses for sunglasses in summer', async () => {
    const g = await loadGame();
    const { setSeason } = await import('../src/season');
    const { Person } = await characters();
    const { crowd } = await wardrobe();
    let st = crowd();
    while (!(!st.woman && st.face === 'beard' && st.glasses !== null && st.summer === 'shades')) st = crowd();
    const p = new Person(0xF2B33D, 'parka', st);
    g.render.scene.add(p);
    const frames = () => worn(p).filter(c => hex(c) === st.glasses);
    const beard = () => worn(p).filter(c => hex(c) === st.hair
      && ((c as Mesh).geometry === g.render.G.box || ((c as Mesh).geometry as SphereGeometry).parameters.phiLength === 2.6));
    for (const season of [0, 1, 3]) {
      setSeason(season);
      expect(frames()).toHaveLength(3);
      expect(beard()).toHaveLength(2); // the beard and the moustache
    }
    setSeason(2);
    expect(frames()).toHaveLength(0);
    expect(beard()).toHaveLength(2);
  });

  it('dresses the women at the bar in evening dresses and pearls, and the men in suits and ties', async () => {
    const { Person, SUITS } = await characters();
    const { crowd, DRESSES } = await wardrobe();
    const people = Array.from({ length: 20 }, crowd);
    const woman = people.find(p => p.woman)!, man = people.find(p => !p.woman)!;
    const her = new Person(DRESSES[0], 'fancy', woman), him = new Person(SUITS[0], 'fancy', man);
    const pearls = (p: Object3D) => p.children.some(c => (c as Mesh).geometry?.type === 'TorusGeometry' && hex(c) === 0xF8F4EC);
    const shirt = (p: Object3D) => p.children.some(c => (c as Mesh).geometry?.type === 'BoxGeometry' && hex(c) === 0xFFFFFF);
    expect(pearls(her) && !shirt(her)).toBe(true);
    expect(shirt(him) && !pearls(him)).toBe(true);
  });

  it('sends a mixed crowd to the counter, the road and the sushi bar', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'kiosk'), mods: { crew: 8 } });
    const { sushi } = g.restaurant;
    for (let i = 0; i < 10; i++) { sushi.spawnT = 0; g.run(0.05); }
    const { Person, SUITS } = await characters();
    const { DRESSES } = await wardrobe();
    expect(new Set(sushi.diners.map(d => d.g.style.woman)).size).toBe(2);
    for (const d of sushi.diners) {
      const body = d.g.children.find(c => (c as Mesh).geometry === g.render.G.body)!;
      expect(d.g.style.woman ? DRESSES : SUITS).toContain(hex(body));
    }
    const { TAKEOUT } = g.counters;
    g.runUntil(() => TAKEOUT.queue.length > 0, 60);
    // the driver's mixed from the crowd too (nobody plain is exactly 1 tall)
    const driver = TAKEOUT.queue[0].g.children.find((c): c is InstanceType<typeof Person> => c instanceof Person)!;
    expect(driver.style.height).not.toBe(1);
    expect(new Set(sushi.diners.map(d => d.g.style.skin)).size).toBeGreaterThan(1);
  });
});
