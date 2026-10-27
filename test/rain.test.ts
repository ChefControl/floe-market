// Her house past the road: the path out to it, and the rain, tears and song in the circle out front.
import { LineSegments, Mesh, type Color, type MeshLambertMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

const $ = (id: string) => document.getElementById(id)!;

async function house() {
  const g = await loadGame();
  const rain = await import('../src/rain');
  return { g, rain, toPad: () => g.placePlayer(rain.RAIN_PAD.x, rain.RAIN_PAD.z) };
}

describe('her house', () => {
  it('can be walked to from the deck, across the road, but not into', async () => {
    const { g, rain } = await house();
    for (const x of [7.8, 9.6, 15, rain.RAIN_PAD.x]) {
      g.placePlayer(x, rain.RAIN_PAD.z);
      g.run(0.05);
      expect(g.player.g.position.x).toBeCloseTo(x);
    }
    g.placePlayer(30, rain.RAIN_PAD.z);
    g.run(0.05);
    expect(g.player.g.position.x).toBeLessThan(24); // the front wall
    g.placePlayer(12, 3);
    g.run(0.05);
    expect(g.player.g.position.z).toBeGreaterThan(5.7); // off the path is snow, not floor
  });

  it('keeps the path open once the sushi restaurant is built', async () => {
    const g = await loadGame({ tiles: bought('sushi') });
    const { RAIN_PAD } = await import('../src/rain');
    g.placePlayer(RAIN_PAD.x, RAIN_PAD.z);
    g.run(0.05);
    expect(g.player.g.position.x).toBeCloseTo(RAIN_PAD.x);
  });

  it('rains, greys the sky, and makes the player cry while standing in the circle', async () => {
    const { g, rain, toPad } = await house();
    const bg = () => g.render.scene.background as Color;
    const sky = bg().clone();
    const tears = g.player.g.body.children.filter(c => !c.visible && c.scale.y === 1.6);
    /** Colour of the shirt or parka the player is wearing. */
    const top = () => {
      const own = g.player.g.worn().find(w => w.geo === g.render.G.body);
      const jacket = g.player.g.body.children.find(c => c.visible && c instanceof Mesh && c.geometry === g.render.G.body) as Mesh | undefined;
      expect(!own !== !jacket).toBe(true); // one or the other, never both
      return own ? own.c : (jacket!.material as MeshLambertMaterial).color.getHex();
    };
    // the jacket is read off the Low look's own mesh (High bakes it in with the rest of him)
    (await import('../src/graphics')).choose('low');
    expect(top()).toBe(0xFF6B4A);
    expect(tears).toHaveLength(4);
    expect($('rain').hidden).toBe(true);
    g.run(1);
    expect(rain.rainK).toBe(0);

    const cam = g.render.camera;
    cam.position.set(rain.RAIN_PAD.x + 5, 15, rain.RAIN_PAD.z + 12);
    cam.lookAt(rain.RAIN_PAD.x, 0, rain.RAIN_PAD.z);
    cam.updateMatrixWorld();
    toPad();
    g.run(1);
    expect(rain.crying).toBe(true);
    expect($('rain').hidden).toBe(false);
    expect(rain.rainK).toBeGreaterThan(0.3);
    expect(rain.rainK).toBeLessThan(0.5);
    expect(tears.every(t => t.visible)).toBe(true);
    expect(top()).toBe(0xF4F6F8); // in the crooner's chef's whites
    expect(document.querySelector('.pop')!.textContent).toBe('😢');
    g.run(2);
    expect(rain.rainK).toBe(1);
    expect(bg().equals(sky)).toBe(false);
    expect(g.render.hemi.intensity).toBeLessThan(0.78 * Math.PI);
    // turned to face her window, a hand up to wipe the tears
    expect(g.player.h).toBeCloseTo(Math.PI / 2, 1);
    expect(g.player.g.arms[0].rotation.x).toBeLessThan(-2);
    expect(g.player.g.arms[0].rotation.z).toBe(0.6);

    g.placePlayer(15, rain.RAIN_PAD.z);
    g.run(0.1);
    expect(rain.crying).toBe(false);
    expect($('rain').hidden).toBe(true);
    expect(tears.some(t => t.visible)).toBe(false);
    expect(top()).toBe(0xFF6B4A);
    expect(g.player.g.arms[0].rotation.z).toBe(-g.player.g.arms[1].rotation.z); // hanging again, like the other
    expect(rain.rainK).toBeGreaterThan(0.5);
    g.run(3);
    expect(rain.rainK).toBe(0);
    expect(bg().equals(sky)).toBe(true);
    expect(g.render.hemi.intensity).toBeCloseTo(0.78 * Math.PI);
  });

  it('lets the rain fall where it is: it stays put as the player walks about in it', async () => {
    const { g, toPad } = await house();
    toPad();
    g.run(1);
    const rain = g.render.scene.children.find(o => o instanceof LineSegments)!;
    const xs = () => Array.from((rain.geometry.attributes.position.array as Float32Array).filter((_, i) => i % 6 === 0));
    const before = xs();
    g.placePlayer(g.player.g.position.x - 0.5, g.player.g.position.z);
    g.run(1 / 60);
    const after = xs(), moved = after.filter((x, i) => Math.abs(x - before[i]) > 1e-4).length;
    expect(rain.position.x).toBe(0);
    expect(moved / after.length).toBeLessThan(0.05); // only those that wrapped round to the far side
  });

  it('leaves the hands alone while carrying fillets', async () => {
    const { g, toPad } = await house();
    g.stations.pile.put(g.items.newFillet());
    g.player.back.put(g.stations.pile.take()!);
    toPad();
    g.run(1);
    expect(g.player.g.arms[0].rotation.x).toBe(-1.25);
  });

  describe('the song', () => {
    it('fades in with the rain, fades out after walking away, and all the way out before it comes in again', async () => {
      const { g, rain, toPad } = await house();
      g.run(1);
      expect(rain.rainSongK()).toBe(0);
      toPad();
      g.run(1);
      expect(rain.rainSongK()).toBeGreaterThan(0.4);
      expect(rain.rainSongK()).toBeLessThan(0.6);
      g.run(1.5);
      expect(rain.rainSongK()).toBe(1);
      g.placePlayer(15, rain.RAIN_PAD.z);
      g.run(1.5);
      expect(rain.rainSongK()).toBeGreaterThan(0.4);
      g.run(2);
      expect(rain.rainSongK()).toBe(0);
    });

    it('names the song on the banner while it rains, with no link out, no button and no player from another site', async () => {
      const { g, rain, toPad } = await house();
      toPad();
      g.run(0.5);
      expect($('rain').hidden).toBe(false);
      expect($('rain').textContent!.trim()).toBe('♪ Caesarea');
      expect($('rain').querySelector('a, button')).toBeNull();
      expect(document.querySelector('iframe, script[src*="youtube"]')).toBeNull();
      g.placePlayer(15, rain.RAIN_PAD.z);
      g.run(0.1);
      expect($('rain').hidden).toBe(true);
    });
  });
});
