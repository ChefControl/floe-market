// What the kitchen is waiting on, in speech bubbles: the cooks ask for fish or rice when the chefs are waiting on it.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

describe("the kitchen's needs", () => {
  it('a cook asks for fish or rice once the chefs have waited on it a moment, and stops as it comes', async () => {
    const g = await loadGame({ tiles: bought('sushi'), back: 2, backRice: 1 });
    const { asks, NEED_AFTER } = await import('../src/needs');
    const { FISH_DROP, RICE_DROP, REGISTER, sushi } = g.restaurant;
    const [fish, rice] = asks.map(a => a.sprite);
    const shown = () => [fish.visible, rice.visible];
    g.placePlayer(REGISTER.x, REGISTER.z); // out of the way, arms full
    g.run(NEED_AFTER - 0.3);
    expect(shown()).toEqual([false, false]); // a moment's gap shows nothing
    g.run(0.5);
    expect(shown()).toEqual([true, true]);
    expect(fish.parent).toBe(sushi.cooks[0].g); // over the cook at the fish pad
    expect(rice.parent).toBe(sushi.cooks[1].g);

    g.placePlayer(FISH_DROP.x, FISH_DROP.z);
    g.run(0.3);
    expect(shown()).toEqual([false, true]); // fish in, but the chef still can't start without rice
    g.placePlayer(RICE_DROP.x, RICE_DROP.z);
    g.run(0.3);
    expect(shown()).toEqual([false, false]); // the chef is at it
    g.placePlayer(REGISTER.x, REGISTER.z);
    g.run(15); // two plates from a bag, then nothing left of either
    expect(shown()).toEqual([true, true]);
  });

  it("doesn't ask while the chefs are busy, however low the kitchen runs", async () => {
    const g = await loadGame({ tiles: bought('sushi'), fish: 1, rice: 1 });
    const { asks } = await import('../src/needs');
    g.run(0.5);
    expect(g.restaurant.sushi.chefs[0].state).not.toBe('idle');
    expect(asks.map(a => a.sprite.visible)).toEqual([false, false]);
  });
});
