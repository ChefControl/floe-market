// Pointing out new upgrades: a message saying what's on offer now, and an arrow at the edge of the screen that
// leads the way to it until the player has seen it.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
type Game = Awaited<ReturnType<typeof loadGame>>;

/** Loads a game, with the arrows' module and a camera that looks at a spot from the usual angle. */
async function setup(save: Parameters<typeof loadGame>[0]) {
  const g = await loadGame(save);
  vi.useFakeTimers();
  const pointers = await import('../src/pointers');
  const { camera, OFF } = g.render;
  const look = (x: number, z: number) => {
    camera.position.set(x + OFF.x, OFF.y, z + OFF.z);
    camera.lookAt(x, 0, z);
    camera.updateMatrixWorld();
  };
  return { g, upd: pointers.updPointers, look };
}
const tile = (g: Game, id: string) => g.unlocks.tiles.find(t => t.id === id)!;
const arrows = () => [...document.querySelectorAll<HTMLElement>('.ptr')];

describe('new upgrades', () => {
  it('are announced, and pointed to while off-screen until the player has seen them', async () => {
    const { g, upd, look } = await setup({ tiles: bought('korki') });
    g.unlocks.visibleTiles(); // what's on offer from the start isn't news
    expect($('toast').textContent).toBe('');
    expect(arrows()).toHaveLength(0);

    g.unlocks.applyUnlock('pack');
    g.unlocks.visibleTiles();
    expect($('toast').textContent).toBe('Bigger arms unlocked');
    vi.advanceTimersByTime(2000); // its turn
    expect($('toast').textContent).toBe('New upgrade: Casino boat');

    const roulette = tile(g, 'roulette');
    look(roulette.x + 30, roulette.z); // it's off to the left
    upd(0.1);
    const [a] = arrows();
    expect(a.hidden).toBe(false);
    expect(a.textContent).toBe('🛳️');
    const [x] = a.style.transform.match(/-?[\d.]+/g)!.map(Number);
    expect(x).toBe(34); // on the left edge
    expect(Math.abs(Number((a.firstChild as HTMLElement).style.transform.match(/-?[\d.]+/)![0]))).toBeGreaterThan(2); // pointing left

    look(roulette.x, roulette.z); // in view: no arrow, and after a moment it's seen
    upd(0.6);
    expect(a.hidden).toBe(true);
    upd(0.6);
    upd(0);
    expect(arrows()).toHaveLength(0);
  });

  it('points the other way to something behind the camera, and keeps clear of the HUD', async () => {
    const { g, upd, look } = await setup({ tiles: bought('korki') });
    g.unlocks.visibleTiles();
    g.unlocks.applyUnlock('pack');
    g.unlocks.visibleTiles();
    const roulette = tile(g, 'roulette');
    vi.spyOn($('hud'), 'getBoundingClientRect').mockReturnValue({ left: 0, right: 1024, bottom: 120 } as DOMRect);
    // the camera looks at a spot well beyond the tile, so it's behind
    g.render.camera.position.set(roulette.x, 15, roulette.z - 3);
    g.render.camera.lookAt(roulette.x, 0, roulette.z - 40);
    g.render.camera.updateMatrixWorld();
    upd(0.1);
    const [a] = arrows();
    const [, y] = a.style.transform.match(/-?[\d.]+/g)!.map(Number);
    expect(y).toBeGreaterThan(400); // the bottom of the screen, towards the camera's back
    look(roulette.x, roulette.z + 40); // now it's off the top, where the HUD is
    upd(0.1);
    expect(Number(a.style.transform.match(/-?[\d.]+/g)![1])).toBe(120 + 34); // just under the HUD
  });

  it('stop pointing once the tile has been bought', async () => {
    const { g, upd, look } = await setup({ tiles: bought('korki') });
    g.unlocks.visibleTiles();
    g.unlocks.applyUnlock('pack');
    g.unlocks.visibleTiles();
    look(100, 100);
    upd(0.1);
    expect(arrows()).toHaveLength(1);
    g.unlocks.applyUnlock('roulette');
    g.unlocks.visibleTiles();
    upd(0.1);
    expect(arrows().map(a => a.textContent)).toEqual(['🏃', '🎰', '🃏']); // the next one's, and the boat's games
  });

  it('come out together with one message; the gold tile has its own', async () => {
    const { g } = await setup({ tiles: bought(...MARKET.filter(id => id !== 'runner3'), 'korki') });
    g.unlocks.visibleTiles();
    g.unlocks.applyUnlock('runner3');
    g.unlocks.visibleTiles();
    expect($('toast').textContent).toBe('Third runner unlocked');
    vi.advanceTimersByTime(2000);
    expect($('toast').textContent).toBe('Floe Sushi is ready to open');
    vi.advanceTimersByTime(2000);
    expect($('toast').classList.contains('on')).toBe(false); // nothing more: the gold tile isn't "new upgrade" news
    expect(arrows().map(a => a.textContent)).toEqual(['🏯']); // but it's pointed to

    g.unlocks.applyUnlock('sushi', true);
    g.run(0.1);
    g.unlocks.visibleTiles();
    expect($('toast').textContent).toBe('New upgrades: Rice terrace, More seats, Second chef');
  });
});
