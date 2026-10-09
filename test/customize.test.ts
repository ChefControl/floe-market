// Your look: the player picks how they look from the crowd's wardrobe, in a panel from the settings.
import { describe, expect, it, vi } from 'vitest';
import type { Person } from '../src/characters';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const customize = () => import('../src/customize');
/** The colour of the piece of `p` in `geo` (the head, a leg, the body). */
const colourOf = (p: Person, geo: unknown) => p.worn().find(w => w.geo === geo)?.c;
/** The game's shared shapes, from this load of it. */
const shapes = async () => (await import('../src/render')).G;
/** The panel's buttons for the option row labelled `label`. */
const row = (label: string) => {
  const lab = [...document.querySelectorAll('#lookRows .lab')].find(l => l.textContent === label)!;
  return [...lab.nextElementSibling!.querySelectorAll('button')];
};
const tab = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('#lookTabs button')].find(b => b.textContent === name)!.click();
const checked = (label: string) => row(label).findIndex(b => b.getAttribute('aria-checked') === 'true');

describe('your look', () => {
  it('opens from the settings, and dresses the player as each thing is picked', async () => {
    const g = await loadGame();
    await import('../src/settings');
    const { OPTIONS, choice } = await customize();
    const G = await shapes();
    const p = g.player.g;
    $('gear').click();
    $('lookOpen').click();
    expect($('look').hidden).toBe(false);
    expect($('settings').hidden).toBe(true);
    expect(checked('Build')).toBe(0);
    row('Skin')[5].click();
    expect(colourOf(p, G.head)).toBe(OPTIONS.skin[5]);
    expect(checked('Skin')).toBe(5);
    row('Build')[1].click();
    expect(p.style.woman).toBe(true);
    expect(Math.abs(p.arms[0].position.x)).toBeCloseTo(0.28);
    tab('Clothes');
    row('Top')[3].click();
    row('Trousers')[2].click();
    expect(colourOf(p, G.body)).toBe(OPTIONS.top[3]);
    expect(colourOf(p, (await import('../src/characters')).LIMBS.trouser)).toBe(OPTIONS.legs[2]);
    expect(choice).toMatchObject({ woman: true, skin: OPTIONS.skin[5], top: OPTIONS.top[3] });
    $('lookDone').click();
    expect($('look').hidden).toBe(true);
  });

  it('tries the look on in spring clothes with nothing on the head, then goes back to the season\'s', async () => {
    const g = await loadGame({ season: 0 });
    const { openLook, setLook } = await customize();
    const G = await shapes();
    const p = g.player.g;
    setLook({ glasses: 0x1F1F1F, cut: 'bun' });
    const hood = () => p.worn().some(w => w.geo === G.hood);
    expect(hood()).toBe(true); // winter: the hood's up
    openLook(true);
    expect(hood()).toBe(false);
    expect(p.worn().filter(w => w.c === 0x1F1F1F).length).toBeGreaterThan(0); // glasses on show
    expect(p.worn().some(w => w.geo === G.sphere && w.o.position.z < -0.1)).toBe(true); // the bun
    openLook(false);
    expect(hood()).toBe(true);
  });

  it('turns the player round to face the camera, and closes when they walk off', async () => {
    const g = await loadGame();
    const { openLook } = await customize();
    g.player.h = 2;
    openLook(true);
    g.run(1);
    expect(g.player.h).toBeCloseTo(g.render.CAM_YAW, 2);
    expect($('look').hidden).toBe(false);
    g.press('w');
    g.run(0.1);
    expect($('look').hidden).toBe(true);
  });

  it('draws cartoon eyes and a mouth, PEAK style, and keeps plain dots under the singer\'s look', async () => {
    const g = await loadGame();
    const { OPTIONS, setLook } = await customize();
    const G = await shapes();
    const p = g.player.g;
    const face = () => JSON.stringify(p.worn().filter(w => w.o.position.y > 0.93 && w.o.position.y < 1.12 && w.o.position.z > 0.22)
      .map(w => [w.geo.id, w.c, w.o.position.toArray(), w.o.scale.toArray()]));
    const dots = () => p.worn().filter(w => w.geo === G.eye).length;
    expect(dots()).toBe(2);
    const seen = new Set<string>();
    for (const eyes of OPTIONS.eyes) for (const mouth of OPTIONS.mouth) { setLook({ eyes, mouth }); seen.add(face()); }
    expect(seen.size).toBe(OPTIONS.eyes.length * OPTIONS.mouth.length); // every pair looks different
    setLook({ eyes: 'round', mouth: 'grin' });
    expect(dots()).toBe(0);
    expect(p.worn().some(w => w.c === 0xFFFFFF && w.o.position.y < 1)).toBe(true); // the grin's teeth
    const { singerLook } = await import('../src/singer');
    const dress = singerLook(p);
    dress(true);
    expect(dots()).toBe(2);
    expect(p.worn().some(w => w.c === 0xFFFFFF && w.o.position.y < 1)).toBe(false); // no grin
    dress(false);
    expect(dots()).toBe(0);
  });

  it('picks rosy or freckled cheeks, and the colour of their shoes (and snow boots in winter)', async () => {
    const g = await loadGame({ season: 0 });
    const { OPTIONS, openLook } = await customize();
    const { LIMBS } = await import('../src/characters');
    const p = g.player.g;
    openLook(true);
    tab('Face');
    const face = () => p.worn().filter(w => w.seasons && w.o.position.y > 0.95 && w.o.position.y < 1.02 && w.o.position.z > 0.18).length;
    expect(face()).toBe(0);
    row('Cheeks')[1].click();
    expect(face()).toBe(2);
    row('Cheeks')[2].click();
    expect(face()).toBe(8);
    tab('Clothes');
    row('Shoes')[3].click();
    expect(p.worn().filter(w => w.geo === LIMBS.shoe).every(w => w.c === OPTIONS.shoes[3])).toBe(true);
    openLook(false);
    expect(p.worn().filter(w => w.geo === LIMBS.boot).every(w => w.c === OPTIONS.shoes[3])).toBe(true);
  });

  it('gives the crowd faces too, from their own wardrobes', async () => {
    const { crowd } = await import('../src/wardrobe');
    const people = Array.from({ length: 80 }, crowd);
    expect(new Set(people.map(p => p.eyes)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(people.map(p => p.mouth)).size).toBeGreaterThanOrEqual(6);
    expect(people.some(p => !p.woman && p.eyes === 'lashes')).toBe(false);
    expect(people.some(p => p.woman && p.eyes === 'lashes')).toBe(true);
    expect(people.some(p => p.mouth === 'frown')).toBe(false);
  });

  it('comes down in front of them, unless something is in the way: then it looks from higher up', async () => {
    const g = await loadGame();
    const { openLook, closeUp, CLOSE } = await customize();
    const { BoxGeometry, Mesh, MeshBasicMaterial } = await import('three');
    g.placePlayer(-1.5, -2);
    openLook(true);
    closeUp(1 / 60);
    const low = CLOSE.y;
    openLook(false);
    for (let i = 0; i < 120; i++) closeUp(1 / 60);
    // a wall between the player and the camera, from the floor to well over their head
    const wall = new Mesh(new BoxGeometry(6, 2.6, 0.2), new MeshBasicMaterial());
    const p = g.player.g.position;
    wall.position.set(p.x + 0.6, p.y + 1.3, p.z + 1.6);
    g.render.scene.add(wall); wall.updateMatrixWorld();
    openLook(true);
    closeUp(1 / 60);
    expect(CLOSE.y).toBeGreaterThan(low + 0.5);
  });

  it('brings the camera in close while it\'s open, and back out after', async () => {
    await loadGame();
    const { openLook, closeUp } = await customize();
    expect(closeUp(1 / 60)).toBe(0);
    openLook(true);
    let near = 0;
    for (let i = 0; i < 60; i++) near = closeUp(1 / 60);
    expect(near).toBeGreaterThan(0.99);
    openLook(false);
    for (let i = 0; i < 60; i++) near = closeUp(1 / 60);
    expect(near).toBeLessThan(0.01);
  });

  it("doesn't walk the player with the arrow keys on its tabs", async () => {
    const g = await loadGame();
    const { openLook } = await customize();
    openLook(true);
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('#lookTabs button')];
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    g.run(0.2);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    expect($('look').hidden).toBe(false);
    expect(g.player.moving).toBe(false);
  });

  it('mixes up a whole new look with the dice', async () => {
    await loadGame();
    const { choice } = await customize();
    const looks = new Set<string>();
    for (let i = 0; i < 20; i++) { $('lookDice').click(); looks.add(JSON.stringify(choice)); }
    expect(looks.size).toBeGreaterThan(15);
  });

  it('goes with the save, and on the device, so a Restart keeps it', async () => {
    const g1 = await loadGame({ money: 5 });
    const { setLook, OPTIONS } = await customize();
    setLook({ woman: true, hair: OPTIONS.hair[7], cut: 'long', face: 'earrings', skirt: OPTIONS.skirt[2] });
    g1.saveMod.save();
    const raw = localStorage.getItem('floe-market-v1')!;
    expect(JSON.parse(raw).look).toMatchObject({ woman: true, cut: 'long', face: 'earrings' });

    const g2 = await loadGame(raw);
    expect(g2.player.g.style).toMatchObject({ woman: true, hair: OPTIONS.hair[7], cut: 'long', skirt: OPTIONS.skirt[2] });

    // Restart: no save, but the device remembers
    const kept = localStorage.getItem('floe-market-look')!;
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {});
    localStorage.removeItem('floe-market-v1');
    localStorage.setItem('floe-market-look', kept);
    const g3 = await loadGame();
    expect(g3.player.g.style).toMatchObject({ woman: true, cut: 'long', face: 'earrings' });
    vi.restoreAllMocks();
  });

  it('reads back only what there is to pick, and older saves keep the device\'s look', async () => {
    await loadGame();
    const { readLook, DEFAULT, OPTIONS } = await customize();
    expect(readLook('nope')).toBeNull();
    expect(readLook({ skin: 0x123456, cut: 'mohawk', face: 'beard', glasses: null, top: OPTIONS.top[2], eyes: 'laser' }))
      .toEqual({ ...DEFAULT, face: 'beard', top: OPTIONS.top[2] });
    expect(readLook({ eyes: 'wink', mouth: 'tongue' })).toEqual({ ...DEFAULT, eyes: 'wink', mouth: 'tongue' });
    const { migrate } = await import('../src/save');
    expect(migrate({ v: 4, money: 1 }).look).toBeUndefined();
  });

  it("keeps the player's build under the singer's look in the rain, and after it", async () => {
    const g = await loadGame();
    const { setLook } = await customize();
    setLook({ woman: true });
    const arm = g.player.g.arms[1];
    const { singerLook } = await import('../src/singer');
    const dress = singerLook(g.player.g);
    dress(true);
    expect(arm.position.x).toBeGreaterThan(0.28);
    dress(false);
    expect(arm.position.x).toBeCloseTo(0.28);
  });
});
