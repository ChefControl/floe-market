// What the repeatable upgrades look like: every level bought shows somewhere in the world.
import { Box3, Mesh, MeshBasicMaterial, type MeshLambertMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

type Game = Awaited<ReturnType<typeof loadGame>>;
const shown = (os: { visible: boolean }[]) => os.filter(o => o.visible).length;
const beltColor = (g: Game) => ((g.player.g.band!.children[0] as Mesh).material as MeshLambertMaterial).color.getHex();
const hatTop = (g: Game) => new Box3().setFromObject(g.restaurant.sushi.chefs[0].g).max.y;

describe('upgrade looks', () => {
  it('puts up each marketing campaign south of the market, popping it in', async () => {
    const g = await loadGame({ money: 1e9 });
    const adBoards = g.looks.marketAds.map(a => a.g);
    g.run(0.05);
    expect(shown(adBoards)).toBe(0);
    g.shop.buyMod('marketing'); g.shop.buyMod('marketing');
    g.run(0.05);
    expect(shown(adBoards)).toBe(2);
    expect(adBoards[1].scale.x).toBeLessThan(1); // still popping in
    g.run(0.5);
    expect(adBoards[1].scale.x).toBe(1);
  });

  it("plays the market's commercial on the TV ad, and only while it's up", async () => {
    const g = await loadGame({ money: 1e9 });
    const tv = g.looks.marketAds[7].g;
    const screen = tv.children.find((c): c is Mesh => c instanceof Mesh && c.material instanceof MeshBasicMaterial)!;
    const { map } = screen.material as MeshBasicMaterial;
    const v = map!.version;
    g.run(1);
    expect(map!.version).toBe(v); // not bought yet
    for (let i = 0; i < 8; i++) g.shop.buyMod('marketing');
    g.run(3);
    expect(tv.visible).toBe(true);
    expect(map!.version).toBeGreaterThan(v + 10); // a few frames a second, across slides
  });

  it('redraws the price board over the walk-up counter when fish sells for more', async () => {
    const g = await loadGame({ money: 1e9 });
    const { tex } = g.looks.priceBoard.t;
    g.run(0.05);
    const v = tex.version;
    g.run(0.05);
    expect(tex.version).toBe(v); // nothing changed, so no redraw
    g.shop.buyMod('fillets');
    g.run(0.05);
    expect(tex.version).toBeGreaterThan(v);
  });

  it('ties a headband on the player for crew training, a belt colour a level, white to black', async () => {
    const g = await loadGame({ money: 1e9 });
    g.run(0.05);
    expect(g.player.g.band).toBeUndefined();
    g.shop.buyMod('training');
    g.run(0.05);
    expect(beltColor(g)).toBe(g.looks.BELTS[0]);
    for (let i = 0; i < 7; i++) g.shop.buyMod('training');
    g.run(0.05);
    expect(beltColor(g)).toBe(0x1E1E1E);
  });

  it('takes the headband off when the restaurant opens', async () => {
    const g = await loadGame({ money: 1e9, mods: { training: 3 } });
    g.run(0.05);
    expect(g.player.g.band?.visible).toBe(true);
    g.layout.stage.n = 2;
    g.run(0.05);
    expect(g.player.g.band?.visible).toBe(false);
  });

  it('has no headband in a stage 2 game, whatever crew training was bought', async () => {
    const g = await loadGame({ tiles: bought('sushi'), mods: { training: 8 } });
    g.run(0.05);
    expect(g.player.g.band?.visible ?? false).toBe(false);
  });

  it("hangs a menu tag over the kitchen line for each of the chef's specials", async () => {
    const g = await loadGame({ tiles: bought('sushi'), money: 1e9 });
    g.run(0.05);
    expect(g.looks.rail.visible).toBe(false);
    for (let i = 0; i < 3; i++) g.shop.buyMod('specials');
    g.run(0.05);
    expect(g.looks.rail.visible).toBe(true);
    expect(shown(g.looks.tags)).toBe(3);
  });

  it("puts the restaurant's campaigns up along its west aisle", async () => {
    const g = await loadGame({ tiles: bought('sushi'), money: 1e9 });
    g.shop.buyMod('promo'); g.shop.buyMod('promo');
    g.run(0.05);
    expect(shown(g.looks.restaurantAds.map(a => a.g))).toBe(2);
  });

  it("grows the chefs' toques with the kitchen crew, a little at a time", async () => {
    const g = await loadGame({ tiles: bought('sushi'), money: 1e9 });
    g.run(0.05);
    const before = hatTop(g);
    g.shop.buyMod('crew'); g.shop.buyMod('crew');
    g.run(0.3);
    const growing = hatTop(g);
    g.run(1);
    expect(growing).toBeGreaterThan(before);
    expect(growing).toBeLessThan(hatTop(g));
    expect(hatTop(g) - before).toBeCloseTo(2 * 0.06);
  });

  it('loads straight into the looks a save had, without popping them in', async () => {
    const g = await loadGame({ tiles: bought(...MARKET, 'sushi'), mods: { marketing: 8, training: 3, specials: 5, promo: 4, crew: 8 } });
    g.run(0.05);
    const ads = g.looks.restaurantAds.map(a => a.g);
    expect(shown(ads)).toBe(4);
    expect(ads[3].scale.x).toBe(1);
    expect(shown(g.looks.tags)).toBe(5);
    expect(g.player.g.band?.visible ?? false).toBe(false); // the market's headband stays with the market
    const top = hatTop(g);
    g.run(0.5);
    expect(hatTop(g)).toBe(top); // already at full height, not still growing
    // the market's ad boards went with the market
    expect(g.looks.marketLooks.visible).toBe(false);
  });

  it("takes the market's looks down with the market at the stage-up", async () => {
    const g = await loadGame({ tiles: bought(...MARKET), money: 1e9, mods: { marketing: 3, fillets: 2 } });
    g.run(0.05);
    expect(g.looks.marketLooks.visible).toBe(true);
    g.unlocks.applyUnlock('sushi');
    g.runUntil(() => !g.looks.marketLooks.visible, 3);
  });
});
