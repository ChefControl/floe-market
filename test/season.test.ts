// The seasons: they come round every few minutes of play, recolour the scenery, change what falls from the sky and
// what everyone wears, and are saved with the game.
import { Mesh, type MeshLambertMaterial, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
type Game = Awaited<ReturnType<typeof loadGame>>;
const seasonMod = () => import('../src/season');
const groundHex = (g: Game) => {
  const ground = g.render.scene.children.find(c => c instanceof Mesh && c.geometry.type === 'PlaneGeometry'
    && (c.geometry as unknown as { parameters: { width: number } }).parameters.width === 220) as Mesh;
  return (ground.material as MeshLambertMaterial).color.getHex();
};
/** The player's clothes for the season that are showing, by kind. */
const worn = (o: Object3D) => o.children.filter(c => c.userData.outfit && c.visible);
const hoodShowing = (g: Game) => g.player.g.children.some(c => c instanceof Mesh && c.geometry === g.render.G.hood && c.visible);

describe('seasons', () => {
  it('starts in winter, then comes round to spring, summer and autumn, and back to winter', async () => {
    const g = await loadGame();
    const s = await seasonMod();
    expect(s.current()).toBe('winter');
    expect($('seasonName').textContent).toBe('Winter');
    expect(groundHex(g)).toBe(s.PAL.ground[0]);
    expect(hoodShowing(g)).toBe(true);

    g.run(s.SEASON_LEN + 0.1, 0.25);
    expect(s.current()).toBe('spring');
    expect($('seasonName').textContent).toBe('Spring');
    expect($('season').dataset.season).toBe('spring');
    expect($('toast').textContent).toContain('Spring');
    expect(hoodShowing(g)).toBe(false); // everyone changes at once
    expect(groundHex(g)).not.toBe(s.PAL.ground[1]); // the snow takes a few seconds to melt
    g.run(s.BLEND, 0.05);
    expect(groundHex(g)).toBe(s.PAL.ground[1]);

    g.run(s.SEASON_LEN, 0.25);
    expect(s.current()).toBe('summer');
    g.run(s.BLEND, 0.05);
    g.run(s.SEASON_LEN, 0.25);
    expect(s.current()).toBe('fall');
    g.run(s.SEASON_LEN, 0.25);
    expect(s.current()).toBe('winter');
    expect(hoodShowing(g)).toBe(true);
  });

  it('melts the ice floes by summer and stops the snow; petals fall in spring and leaves in autumn', async () => {
    const g = await loadGame({ season: 1, seasonT: 0 });
    const s = await seasonMod();
    g.run(0.1);
    expect(s.weather.visible).toBe(true); // petals
    s.setSeason(2);
    g.run(s.BLEND);
    expect(s.weather.visible).toBe(false);
    expect(g.world.FLOE_SIZE[2]).toBe(0);
    const floes = g.render.scene.children.filter(c => c instanceof Mesh && c.geometry === g.render.G.cyl && c.position.z < -15);
    expect(floes.length).toBeGreaterThan(0);
    expect(floes.every(f => !f.visible)).toBe(true);
    s.setSeason(3);
    g.run(s.BLEND);
    expect(s.weather.visible).toBe(true); // leaves
    expect(floes.every(f => f.visible)).toBe(true); // forming again
    // the rain at her house clears it
    g.placePlayer(21.6, g.layout.HOUSE_PATH_Z);
    g.run(4);
    expect(s.weather.visible).toBe(false);
  });

  it('dresses people for the season: caps, short sleeves and sunglasses, woolly hats and scarves', async () => {
    const g = await loadGame();
    const s = await seasonMod();
    const { Person } = await import('../src/characters');
    const p = new Person(0x5B8DEF);
    const diner = new Person(0x22303C, 'fancy');
    const chef = new Person(0xF4F6F8, 'chef');
    g.render.scene.add(p, diner, chef);
    const kinds = () => worn(p).length + p.arms.flatMap(worn).length + p.legs.flatMap(worn).length;
    expect(worn(p)).toHaveLength(2); // the hood
    expect(worn(diner)).toHaveLength(2); // a scarf, in winter
    s.setSeason(1);
    expect(worn(p)).toHaveLength(3); // hair, a cap and its brim
    expect(worn(diner)).toHaveLength(0);
    s.setSeason(2);
    expect(kinds()).toBe(1 + 3 + 2 + 2); // hair, sunglasses, bare forearms and shins
    s.setSeason(3);
    expect(worn(p)).toHaveLength(5); // a woolly hat, its cuff and bobble, and a scarf
    expect(worn(diner)).toHaveLength(2);
    expect(chef.children.some(c => c.userData.outfit)).toBe(false); // chefs wear whites all year
    // new people come dressed for the season
    expect(worn(new Person(0xF2B33D))).toHaveLength(5);
  });

  it('takes the season off the player while they are the singer, and puts it back after', async () => {
    const g = await loadGame({ season: 2 });
    expect(worn(g.player.g).length).toBeGreaterThan(0);
    g.placePlayer(21.6, g.layout.HOUSE_PATH_Z);
    g.run(0.1);
    expect(worn(g.player.g)).toHaveLength(0);
    expect(g.player.g.arms.flatMap(worn)).toHaveLength(0);
    g.placePlayer(15, g.layout.HOUSE_PATH_Z);
    g.run(0.1);
    expect(worn(g.player.g).length).toBeGreaterThan(0);
    expect(hoodShowing(g)).toBe(false);
  });

  it('keeps falling snow still in the world while the player walks, instead of moving with the camera', async () => {
    const g = await loadGame();
    const s = await seasonMod();
    const pos = s.weather.geometry.attributes.position.array as Float32Array;
    g.placePlayer(0, 0);
    g.game.tick(0.0001);
    const before = Array.from(pos.slice(0, 300));
    g.placePlayer(0.5, 0.3);
    g.game.tick(0.0001);
    let still = 0;
    for (let i = 0; i < 100; i++) {
      if (Math.abs(pos[i * 3] - before[i * 3]) < 0.01 && Math.abs(pos[i * 3 + 2] - before[i * 3 + 2]) < 0.01) still++;
    }
    expect(still).toBeGreaterThan(90); // a few at the box's edge come back in on the far side
    expect(s.weather.position.x).toBe(0);
  });

  it("doesn't let snow fall inside buildings", async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi') });
    const s = await seasonMod();
    const { HALL_BOX } = g.layout;
    g.placePlayer(0, 8);
    const cam = g.render.camera.position.set(0 + 6, 18, 8 + 14.4); // where main.ts puts it, over the player's shoulder
    g.run(2);
    const pos = s.weather.geometry.attributes.position.array as Float32Array;
    const n = s.weather.geometry.drawRange.count;
    const over = (x: number, z: number) => x > HALL_BOX.x0 && x < HALL_BOX.x1 && z > HALL_BOX.z0 && z < HALL_BOX.z1;
    let inside = 0, inView = 0, outside = 0;
    for (let i = 0; i < n; i++) {
      const [x, y, z] = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      if (y < 0) continue; // hidden
      if (over(x, z) && y < 4) inside++;
      // seen against the floor inside, from the camera
      const t = (cam.y - g.util.FY) / (cam.y - y);
      if (over(cam.x + (x - cam.x) * t, cam.z + (z - cam.z) * t)) inView++;
      else outside++;
    }
    expect(inside).toBe(0);
    expect(inView).toBe(0);
    expect(outside).toBeGreaterThan(50); // still snowing outside
  });

  it('turns the sky with the season, by day and at dusk', async () => {
    const g = await loadGame();
    const s = await seasonMod();
    const winter = g.render.sky.bg.getHex();
    s.setSeason(2, 0, true);
    const summer = g.render.sky.bg.getHex();
    expect(summer).not.toBe(winter);
    expect(g.render.fog.color.getHex()).toBe(summer);
  });

  it('saves the season and how far into it, and old saves start in winter', async () => {
    const g = await loadGame({ season: 3, seasonT: 100 });
    const s = await seasonMod();
    expect(s.current()).toBe('fall');
    expect(s.season.t).toBe(100);
    expect($('seasonBar').style.width).toBe('');
    g.run(1);
    expect($('seasonBar').style.width).toBe('33%');
    g.saveMod.save();
    const saved = JSON.parse(localStorage.getItem('floe-market-v1')!);
    expect(saved.season).toBe(3);
    expect(saved.seasonT).toBeGreaterThanOrEqual(100);
    expect(g.saveMod.migrate({ v: 4 })).toMatchObject({ season: 0, seasonT: 0 });
    expect(g.saveMod.migrate({ v: 4, season: 7, seasonT: 1e9 })).toMatchObject({ season: 3, seasonT: s.SEASON_LEN - 1 });
  });
});
