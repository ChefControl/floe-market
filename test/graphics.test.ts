// Graphics, Auto, Low or High: Low draws people as they were before the detail, Auto (the default) has the game pick by
// the frame rate, and the player's choice in the settings is kept for the device.
import { Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Person } from '../src/characters';
import { loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const graphics = () => import('../src/graphics');
/** The vertices someone is drawn with. */
const vertices = (p: Person) => {
  let n = 0;
  p.traverse(o => { if (o instanceof Mesh) n += o.geometry.attributes.position?.count ?? 0; });
  return n;
};
/** Frames drawn `sec` apart for `seconds`. */
const frames = (frameDrawn: (s: number) => void, sec: number, seconds: number) => {
  for (let t = 0; t < seconds; t += sec) frameDrawn(sec);
};

describe('graphics', () => {
  it('draws people plainer on Low: blocks for arms and legs, no ears, nose or buttons', async () => {
    const g = await loadGame();
    const { Person, LIMBS } = await import('../src/characters');
    const { choose, gfx } = await graphics();
    const G = g.render.G;
    expect(gfx).toEqual({ quality: 'high', picked: false });
    const high = new Person(0xF4F6F8, 'chef');
    expect(high.worn().some(w => w.geo === LIMBS.hand)).toBe(true);
    choose('low');
    const low = new Person(0xF4F6F8, 'chef');
    const worn = low.worn();
    expect(worn.filter(w => w.geo === G.arm)).toHaveLength(2);
    expect(worn.filter(w => w.geo === G.leg)).toHaveLength(2);
    const limbs: unknown[] = Object.values(LIMBS);
    expect(worn.some(w => limbs.includes(w.geo))).toBe(false);
    expect(worn.filter(w => w.c === 0xB8C0C8)).toHaveLength(0); // the chef's buttons
    expect(vertices(low)).toBeLessThan(vertices(high) * 0.75);
    // a parka in summer: bare forearms and shins as blocks, and no zip
    const { setSeason } = await import('../src/season');
    setSeason(2);
    const parka = new Person(0x5B8DEF);
    expect(parka.worn().filter(w => w.c === parka.style.skin).length).toBeGreaterThanOrEqual(5); // head, 2 forearms, 2 shins
  });

  it('redraws everyone when it changes, in the same clothes, and the chef keeps one toque', async () => {
    const g = await loadGame();
    const { Person, animPerson } = await import('../src/characters');
    const { choose } = await graphics();
    const chef = new Person(0xF4F6F8, 'chef');
    g.render.scene.add(chef);
    chef.toque(2);
    const offstage = new Person(0x5B8DEF, 'fancy');
    /** Where the toque's band and puff are. */
    const toque = () => chef.body.children.filter(c => c.position.y > 1.2).map(c => c.position.y);
    const before = vertices(chef), tall = toque();
    expect(tall).toHaveLength(2);
    choose('low');
    expect(vertices(chef)).toBeLessThan(before);
    expect(chef.upToDate).toBe(true);
    expect(toque()).toEqual(tall); // the same toque, as tall
    expect(offstage.upToDate).toBe(false);
    animPerson(offstage, false, 1 / 60, false); // walked on: drawn in Low then
    expect(offstage.upToDate).toBe(true);
    choose('high');
    expect(vertices(chef)).toBe(before);
  });

  it('on Auto, drops to Low when the frame rate stays under 45 for six seconds, but not for a moment or a pause', async () => {
    await loadGame();
    const { frameDrawn, gfx, choose } = await graphics();
    frames(frameDrawn, 1 / 60, 20);
    expect(gfx.quality).toBe('high');
    frames(frameDrawn, 1 / 30, 2.5); // a slow moment
    frames(frameDrawn, 1 / 60, 3);
    frames(frameDrawn, 1 / 30, 2.5);
    expect(gfx.quality).toBe('high');
    frameDrawn(2); // the tab was hidden: settles again after
    frames(frameDrawn, 1 / 30, 2.9);
    expect(gfx.quality).toBe('high');
    frames(frameDrawn, 1 / 30, 8);
    expect(gfx.quality).toBe('low');
    frames(frameDrawn, 1 / 60, 10); // it doesn't go back up by itself
    expect(gfx.quality).toBe('low');
    // the player's choice stands, however slow it gets
    choose('high');
    frames(frameDrawn, 1 / 20, 20);
    expect(gfx.quality).toBe('high');
    // and choosing Auto again starts on High, and watches again
    choose('low');
    choose('auto');
    expect(gfx).toEqual({ quality: 'high', picked: false });
    frames(frameDrawn, 1 / 30, 10); // settling, then six seconds
    expect(gfx.quality).toBe('low');
  });

  it("is chosen in the settings, Auto at first, kept for the device, and the look panel leaves out what Low doesn't draw", async () => {
    await loadGame();
    await import('../src/settings');
    await import('../src/customize');
    const { gfx } = await graphics();
    const [autoB, lowB, highB] = $('gfx').querySelectorAll('button');
    const pressed = () => [autoB, lowB, highB].map(b => b.getAttribute('aria-pressed'));
    expect(pressed()).toEqual(['true', 'false', 'false']);
    expect([$('gfxNow').hidden, $('gfxNow').textContent]).toEqual([false, 'High now']); // which one Auto is using
    $('lookOpen').click();
    const rows = () => [...document.querySelectorAll('#lookRows .lab')].map(l => l.textContent);
    [...document.querySelectorAll<HTMLButtonElement>('#lookTabs button')][1].click();
    expect(rows()).toContain('Cheeks');
    lowB.click();
    expect(gfx).toEqual({ quality: 'low', picked: true });
    expect(pressed()).toEqual(['false', 'true', 'false']);
    expect($('gfxNow').hidden).toBe(true);
    expect(rows()).not.toContain('Cheeks'); // the open panel follows
    expect(localStorage.getItem('floe-market-graphics')).toBe('low');
    // next time on this device
    vi.resetModules();
    expect((await graphics()).gfx).toEqual({ quality: 'low', picked: true });
    // back to Auto: High, with the game picking, and nothing kept
    autoB.click();
    expect(pressed()).toEqual(['true', 'false', 'false']);
    expect(rows()).toContain('Cheeks');
    expect(localStorage.getItem('floe-market-graphics')).toBeNull();
    vi.resetModules();
    expect((await graphics()).gfx).toEqual({ quality: 'high', picked: false });
    // and a blocked storage just means Auto, and a choice for this visit only
    const blocked = () => { throw new Error('blocked'); };
    const spies = (['getItem', 'setItem', 'removeItem'] as const).map(k => vi.spyOn(Storage.prototype, k).mockImplementation(blocked));
    vi.resetModules();
    const fresh = await graphics();
    expect(fresh.gfx).toEqual({ quality: 'high', picked: false });
    fresh.choose('low');
    expect(fresh.gfx.quality).toBe('low');
    fresh.choose('auto');
    expect(fresh.gfx.quality).toBe('high');
    spies.forEach(s => s.mockRestore());
  });
});
