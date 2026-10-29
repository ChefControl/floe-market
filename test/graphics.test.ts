// Graphics, Auto, Low or High: Low draws people as they were before the detail, Auto (the default) has the game pick by
// the frame rate and its stutters, and the player's choice in the settings is kept for the device.
import { InstancedMesh, Mesh, type Object3D } from 'three';
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
/** Frames at 60 a second for `seconds`, with a 0.1 s hitch every `every` seconds. */
const stutter = (frameDrawn: (s: number) => void, every: number, seconds: number) => {
  for (let t = 0, next = every; t < seconds;) {
    const sec = t >= next ? (next += every, 0.1) : 1 / 60;
    frameDrawn(sec); t += sec;
  }
};

/** Loads the game with the graphics already chosen on this device. */
async function loadWith(q: 'potato' | 'low' | 'high') {
  const get = Storage.prototype.getItem;
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
    return k === 'floe-market-graphics' ? q : get.call(this, k);
  });
  const g = await loadGame();
  spy.mockRestore();
  return g;
}

describe('graphics', () => {
  it("keeps the textures' canvases in the computer's memory, where a phone can't wipe them (reports 16-18, 20)", async () => {
    await loadGame();
    const { canvasTex } = await import('../src/render');
    const asked = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    canvasTex(8, 8, () => {});
    expect(asked).toHaveBeenCalledWith('2d', { willReadFrequently: true });
    asked.mockRestore();
  });

  it('draws people plainer on Low: blocks for arms and legs, no ears, nose or buttons', async () => {
    const g = await loadGame();
    const { Person, LIMBS } = await import('../src/characters');
    const { choose, gfx } = await graphics();
    const G = g.render.G;
    expect(gfx).toMatchObject({ quality: 'high', picked: false });
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

  it('on Auto, drops to Low when four of the last five two-second looks are slow or stutter, not for a moment or a pause', async () => {
    await loadGame();
    const { frameDrawn, gfx, choose } = await graphics();
    frames(frameDrawn, 1 / 60, 20);
    expect(gfx.quality).toBe('high');
    stutter(frameDrawn, 5, 20); // a hitch now and then is fine
    expect(gfx.quality).toBe('high');
    frames(frameDrawn, 1 / 30, 2.5); // a slow moment
    frames(frameDrawn, 1 / 60, 3);
    frames(frameDrawn, 1 / 30, 2.5);
    expect(gfx.quality).toBe('high');
    frameDrawn(2); // the tab was hidden: settles again after
    frames(frameDrawn, 1 / 30, 2.9);
    expect(gfx.quality).toBe('high');
    frames(frameDrawn, 1 / 30, 6);
    expect(gfx.quality).toBe('high');
    frames(frameDrawn, 1 / 30, 3);
    expect(gfx.quality).toBe('low');
    frames(frameDrawn, 1 / 60, 10); // it doesn't go back up by itself
    expect(gfx.quality).toBe('low');
    // and starts on Low on this device from now on
    expect(localStorage.getItem('floe-market-graphics-auto')).toBe('low');
    vi.resetModules();
    expect((await graphics()).gfx).toMatchObject({ quality: 'low', picked: false });
    // the player's choice stands, however slow it gets
    choose('high');
    frames(frameDrawn, 1 / 20, 20);
    expect(gfx.quality).toBe('high');
    // and choosing Auto again starts on High, and watches again
    choose('low');
    choose('auto');
    expect(gfx).toMatchObject({ quality: 'high', picked: false });
    expect(localStorage.getItem('floe-market-graphics-auto')).toBeNull();
    frames(frameDrawn, 1 / 30, 12); // settling, then four looks
    expect(gfx.quality).toBe('low');
  });

  it('on Auto, drops to Low for stutters at a smooth frame rate, and a hitch along the way starts nothing over', async () => {
    await loadGame();
    const { frameDrawn, gfx } = await graphics();
    frames(frameDrawn, 1 / 60, 3.05); // settling
    // 60 a second, but a hitch every half second: the slowest frame in 100 is slow. Three looks of it
    stutter(frameDrawn, 0.5, 6.5);
    expect(gfx.quality).toBe('high');
    frameDrawn(0.6); // loading something: a slow frame, not a pause
    expect(gfx.quality).toBe('high');
    stutter(frameDrawn, 0.5, 1.5); // the fourth
    expect(gfx.quality).toBe('low');
  });

  it("is chosen in the settings, Auto at first, kept for the device, and the look panel leaves out what Low doesn't draw", async () => {
    await loadGame();
    await import('../src/settings');
    await import('../src/customize');
    const { gfx } = await graphics();
    const [autoB, potatoB, lowB, highB] = $('gfx').querySelectorAll<HTMLButtonElement>('.seg button');
    const pressed = () => [autoB, lowB, highB].map(b => b.getAttribute('aria-pressed'));
    expect(pressed()).toEqual(['true', 'false', 'false']);
    expect(potatoB.getAttribute('aria-pressed')).toBe('false');
    expect($('gfx').hidden).toBe(true); // closed, the row shows the choice
    expect($('gfxPick').textContent).toBe('Auto');
    $('gfxCat').click();
    expect([$('gfx').hidden, $('gfxCat').getAttribute('aria-expanded')]).toEqual([false, 'true']);
    expect([$('gfxNow').hidden, $('gfxNow').textContent]).toEqual([false, 'Auto is on High now']); // which one Auto is using
    $('lookOpen').click();
    const rows = () => [...document.querySelectorAll('#lookRows .lab')].map(l => l.textContent);
    [...document.querySelectorAll<HTMLButtonElement>('#lookTabs button')][1].click();
    expect(rows()).toContain('Cheeks');
    lowB.click();
    expect(gfx).toMatchObject({ quality: 'low', picked: true });
    expect(pressed()).toEqual(['false', 'true', 'false']);
    expect($('gfxNow').hidden).toBe(true);
    expect($('gfxPick').textContent).toBe('Low');
    expect(rows()).not.toContain('Cheeks'); // the open panel follows
    expect(localStorage.getItem('floe-market-graphics')).toBe('low');
    // next time on this device
    vi.resetModules();
    expect((await graphics()).gfx).toMatchObject({ quality: 'low', picked: true });
    // back to Auto: High, with the game picking, and nothing kept
    autoB.click();
    expect(pressed()).toEqual(['true', 'false', 'false']);
    expect(rows()).toContain('Cheeks');
    expect(localStorage.getItem('floe-market-graphics')).toBeNull();
    vi.resetModules();
    expect((await graphics()).gfx).toMatchObject({ quality: 'high', picked: false });
    // and a blocked storage just means Auto, and a choice for this visit only
    const blocked = () => { throw new Error('blocked'); };
    const spies = (['getItem', 'setItem', 'removeItem'] as const).map(k => vi.spyOn(Storage.prototype, k).mockImplementation(blocked));
    vi.resetModules();
    const fresh = await graphics();
    expect(fresh.gfx).toMatchObject({ quality: 'high', picked: false });
    fresh.choose('low');
    expect(fresh.gfx.quality).toBe('low');
    fresh.choose('auto');
    expect(fresh.gfx.quality).toBe('high');
    spies.forEach(s => s.mockRestore());
  });
});

describe('Potato', () => {
  it('on Auto, drops from Low to Potato only while the phone still struggles there: under 25 a second, or stuttering', async () => {
    await loadGame();
    const { frameDrawn, gfx } = await graphics();
    frames(frameDrawn, 1 / 30, 12); // settling, then four slow looks on High
    expect(gfx.quality).toBe('low');
    frames(frameDrawn, 1 / 30, 20); // 30 a second is fine on Low
    expect(gfx.quality).toBe('low');
    frames(frameDrawn, 1 / 20, 7); // three slow looks of the last five
    expect(gfx.quality).toBe('low');
    frames(frameDrawn, 1 / 20, 2.2); // the fourth
    expect(gfx).toMatchObject({ quality: 'potato', picked: false, reload: false });
    // and starts there on this device from now on, without building High
    expect(localStorage.getItem('floe-market-graphics-auto')).toBe('potato');
    vi.resetModules();
    const next = await graphics();
    expect([next.gfx.quality, next.highBuilt]).toEqual(['potato', false]);
  });

  it('on Low, a smooth frame rate with a bad stutter (one frame in 20 slower than 50 ms) drops it to Potato', async () => {
    await loadGame();
    const { choose, frameDrawn, gfx } = await graphics();
    choose('auto');
    frames(frameDrawn, 1 / 30, 12);
    expect(gfx.quality).toBe('low');
    stutter(frameDrawn, 2, 20); // a hitch now and then is fine
    expect(gfx.quality).toBe('low');
    stutter(frameDrawn, 0.25, 12);
    expect(gfx.quality).toBe('potato');
  });

  it('drops a step each time the browser takes the 3D view away on Auto, and never past a pick', async () => {
    await loadGame();
    const { choose, gfx, lowAfterLoss } = await graphics();
    lowAfterLoss();
    expect(gfx.quality).toBe('low');
    lowAfterLoss();
    expect(gfx.quality).toBe('potato');
    lowAfterLoss();
    expect(gfx.quality).toBe('potato');
    expect(localStorage.getItem('floe-market-graphics-auto')).toBe('potato');
    choose('low');
    lowAfterLoss();
    expect(gfx.quality).toBe('low');
  });

  it("is picked in the settings: the cuts at once, a reload to finish, and a toast only when Auto picks it", async () => {
    const g = await loadGame();
    await import('../src/settings');
    const { gfx, choose } = await graphics();
    const [, potatoB] = $('gfx').querySelectorAll<HTMLButtonElement>('.seg button');
    expect($('gfxReload').hidden).toBe(true);
    potatoB.click();
    expect(gfx).toEqual({ quality: 'potato', choice: 'potato', picked: true, reload: true });
    expect([potatoB.getAttribute('aria-pressed'), $('gfxPick').textContent, $('gfxReload').hidden]).toEqual(['true', 'Potato', false]);
    expect($('toast').textContent).not.toContain('Potato'); // the player knows: they picked it
    // no shadows, one pixel a point
    const ratio = vi.spyOn(g.render.renderer, 'setPixelRatio');
    choose('low');
    expect(g.render.sun.castShadow).toBe(true);
    choose('potato');
    expect(g.render.sun.castShadow).toBe(false);
    expect(ratio).toHaveBeenLastCalledWith(1);
    expect(localStorage.getItem('floe-market-graphics')).toBe('potato');
    // back to Low on this load: nothing to reload
    choose('low');
    expect(gfx.reload).toBe(false);
    // Auto picking it says so, once, and the row says which it's on
    choose('auto');
    const { lowAfterLoss } = await graphics();
    lowAfterLoss();
    lowAfterLoss();
    expect([$('toast').textContent, $('gfxNow').textContent, $('gfxReload').hidden]).toEqual(['🥔 Switched to Potato graphics', 'Auto is on Potato now', true]);
  });

  it('draws the floor markings at half size on Low and Potato loads, the same drawing scaled', async () => {
    /** The floor markings' canvas sizes (decals.ts). */
    const sizes = async (q: 'potato' | 'low' | 'high') => {
      const g = await loadWith(q), out = new Set<number>();
      g.render.scene.traverse(o => {
        const m = o as Mesh;
        if (m.isMesh && m.renderOrder === 1 && m.geometry.type === 'PlaneGeometry') {
          const img = (m.material as { map?: { image?: HTMLCanvasElement } }).map?.image;
          if (img instanceof HTMLCanvasElement) out.add(img.width);
        }
      });
      return [...out];
    };
    expect(await sizes('high')).toEqual([256]);
    expect(await sizes('low')).toEqual([128]);
    expect(await sizes('potato')).toEqual([128]);
  }, 60_000);

  it("bakes the presents' High pile on Potato too, for the scenery's dice, but doesn't keep it", async () => {
    const pile = async (q: 'potato' | 'high') => {
      const g = await loadWith(q);
      const [{ givePresents }, { Build }] = await Promise.all([import('../src/presents'), import('../src/kit')]);
      const shapes = () => {
        let n = 0;
        g.render.scene.traverse(o => {
          if (o instanceof Mesh && o.userData.baked && o.geometry.attributes.position.count) n++;
        });
        return n;
      };
      const before = shapes(), baking = vi.spyOn(Build.prototype, 'mesh');
      givePresents(3, true);
      givePresents(1);
      const baked = baking.mock.calls.length;
      baking.mockRestore();
      return { kept: shapes() - before, baked };
    };
    const high = await pile('high'), potato = await pile('potato');
    expect(high.kept).toBe(2); // the pile, and the newest popping in
    expect(potato.kept).toBe(0);
    // (baked all the same, so the scenery's dice roll as they would on High)
    expect(high.baked).toBeGreaterThan(0);
    expect(potato.baked).toBe(high.baked);
  });

  it('never builds High: its baked shapes are let go, the effects have no room, and leaving it takes a reload', async () => {
    /** The kit's baked meshes, how many of them hold no shape, and how many have shadow hooks of their own (which hold
     *  the shape they swap the drawing of: `baked`, family.ts `castAs`). */
    const baked = (scene: Object3D) => {
      let all = 0, empty = 0, hooked = 0, emptyHooked = 0;
      scene.traverse(o => {
        if (!(o instanceof Mesh && o.userData.baked)) return;
        const none = !o.geometry.attributes.position.count, hook = o.onBeforeShadow !== Mesh.prototype.onBeforeShadow
          || o.onAfterShadow !== Mesh.prototype.onAfterShadow;
        all++; if (none) empty++; if (hook) hooked++; if (none && hook) emptyHooked++;
      });
      return { all, empty, hooked, emptyHooked };
    };
    const onHigh = baked((await loadWith('high')).render.scene);
    expect(onHigh.empty).toBe(0);
    expect(onHigh.hooked).toBeGreaterThan(0);
    const g = await loadWith('potato');
    const { choose, gfx, highBuilt, isHigh } = await graphics();
    expect([gfx.quality, highBuilt, isHigh()]).toEqual(['potato', false, false]);
    const { empty, all, emptyHooked } = baked(g.render.scene);
    expect(empty).toBeGreaterThan(all * 0.4);
    // (a High mesh let go of keeps no hook on its shadow, or the hook would keep the shape it gave up)
    expect(emptyHooked).toBe(0);
    const fx = g.render.scene.children.filter((o): o is InstancedMesh => o instanceof InstancedMesh && o.name === 'fx');
    expect(fx.length).toBeGreaterThan(0);
    expect(fx.every(m => m.instanceMatrix.count === 0)).toBe(true);
    // High can't be drawn without a reload: Low until then
    choose('high');
    expect(gfx).toEqual({ quality: 'low', choice: 'high', picked: true, reload: true });
    choose('auto');
    expect([gfx.quality, gfx.reload]).toEqual(['low', true]);
    // and once Auto steps back down to Potato, there's nothing left to reload for
    const { lowAfterLoss } = await graphics();
    lowAfterLoss();
    expect([gfx.quality, gfx.reload]).toEqual(['potato', false]);
    choose('potato');
    expect([gfx.quality, gfx.reload]).toEqual(['potato', false]);
  });
});
