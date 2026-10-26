// Cooking Hazard's screen (hazardPlay.ts) and its street in 3D (hazardSet.ts): the loadout, a run on the keys and mouse
// or by touch, what floats over the zombies, leaving mid-run, and the phone held upright. The rules are in hazard.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISHES, W, hit, press, type Dir, type Run, type Zombie } from '../src/hazard';

/** A zombie of the horde standing at (x, y). */
function zombie(run: Run, x: number, y: number, more: Partial<Zombie> = {}): Zombie {
  const z: Zombie = {
    id: run.nextId++, x, y, r: 16, hp: 100, maxHp: 100, speed: 0,
    coat: null, coatT: 0, meter: 0, burnT: 0, burnSpreads: false, poison: 0, poisonT: 0, poisonFast: 0,
    meltT: 0, freezeT: 0, twitchT: 0, lureT: 0, marinateT: 0, immuneT: 0, hasteT: 0, ticket: null, step: 0, dead: false,
    ...more,
  };
  run.zombies.push(z);
  return z;
}
const key = (type: 'keydown' | 'keyup', code: string, more: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, ...more }));
const ARROW: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
/** A pointer event from a finger (`id`) or, with no id, the mouse. */
function pointer(el: EventTarget, type: string, x: number, y: number, id?: number, more: MouseEventInit = {}) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, ...more });
  if (id !== undefined) Object.defineProperties(e, { pointerId: { value: id }, pointerType: { value: 'touch' } });
  el.dispatchEvent(e);
}
/** Plays as a phone does: a coarse pointer, and the screen `w` by `h`. */
function phone(w = 900, h = 420) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') }));
  vi.stubGlobal('innerWidth', w);
  vi.stubGlobal('innerHeight', h);
}

async function open() {
  const play = await import('../src/hazardPlay');
  const set = await import('../src/hazardSet');
  const root = document.getElementById('hazard')!;
  play.openHazard();
  return { play, set, root, area: root.querySelector<HTMLElement>('.hz-play')! };
}
function start(play: typeof import('../src/hazardPlay'), root: HTMLElement) {
  root.querySelector<HTMLButtonElement>('.hz-start')!.click();
  const run = play.hazardRun()!;
  run.spawnT = 1e9; run.specialT = 1e9;
  return run;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('the screen, on the keys and mouse', () => {
  it('picks a loadout, plays a run, ends it, and takes the screen from the game while it plays', async () => {
    const { play, set, root, area } = await open();
    const { takeover } = await import('../src/render');
    expect(root.hidden).toBe(false);
    expect(takeover.on).toBe(true);
    expect(document.body.classList.contains('hz-on')).toBe(true);
    expect(root.dataset.mode).toBe('pick');
    // a third dish replaces the older pick; the gun's choice is its own
    root.querySelector<HTMLButtonElement>('[data-dish="lemon"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-gun="salt"]')!.click();
    expect(root.querySelector('[data-dish="chiliPot"]')!.getAttribute('aria-pressed')).toBe('false');
    root.querySelector<HTMLButtonElement>('[data-dish="lemon"]')!.click();
    expect(root.querySelector<HTMLButtonElement>('.hz-start')!.disabled).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-dish="bait"]')!.click();
    const run = start(play, root);
    expect(root.dataset.mode).toBe('play');
    expect(run.loadout).toEqual({ gun: 'salt', dishes: ['syrup', 'bait'] });
    // the chef stands in the street's middle, in the set's metres
    play.advance(0.016);
    expect(set.setView().chef!.x).toBeCloseTo(0);

    // walk right
    key('keydown', 'KeyD');
    play.advance(0.5);
    key('keyup', 'KeyD');
    expect(run.player.x).toBeGreaterThan(W / 2);
    expect(set.setView().chef!.x).toBeGreaterThan(0);

    // serve the syrup: hold 1, type its code, let go; it's aimed at the mouse, and a click throws it there
    key('keydown', 'Digit1');
    for (const d of DISHES.syrup.code) key('keydown', ARROW[d]);
    key('keyup', 'Digit1');
    expect(root.querySelector('.hz-serve')).toBeNull();
    pointer(area, 'pointermove', 600, 300);
    play.advance(0.016);
    expect(run.serving?.ready).toBe(true);
    expect(root.querySelectorAll('.hz-serve > i.done')).toHaveLength(DISHES.syrup.code.length);
    expect(set.setView().target).toBe(true);
    pointer(area, 'pointerdown', 600, 300);
    expect(run.servings[0]).toBe(2);
    play.advance(0.1);
    expect(set.setView().plates).toBe(1);

    // fire at a zombie: the rock salt flies, and splats where it hits; shove, reload
    const z = zombie(run, run.player.x + 120, run.player.y, { hp: 1000, maxHp: 1000 });
    const at = set.toScreen(z.x, z.y, 0);
    pointer(area, 'pointermove', at.x, at.y);
    pointer(area, 'pointerdown', at.x, at.y);
    play.advance(0.016);
    expect(set.setView().shots).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) play.advance(0.05);
    expect(z.hp).toBeLessThan(1000);
    expect(set.setView().splats).toBeGreaterThan(0);
    window.dispatchEvent(new MouseEvent('pointerup'));
    // (the right button doesn't fire)
    pointer(area, 'pointerdown', at.x, at.y, undefined, { button: 2 });
    key('keydown', 'KeyF');
    key('keydown', 'KeyR');
    play.advance(0.05);
    expect(root.querySelector('.hz-time')!.textContent).toMatch(/^0:0\d$/);
    expect(root.querySelectorAll('.hz-slot')).toHaveLength(4);

    // the horde gets the chef: the result, with a best kept
    run.player.hp = 0.001;
    zombie(run, run.player.x, run.player.y, { speed: 50 });
    play.advance(0.05);
    expect(root.dataset.mode).toBe('over');
    expect(localStorage.getItem('floe-market-hazard-best')).not.toBeNull();
    // the street's cleared for the next run, and the loadout screen shows it empty
    root.querySelector<HTMLButtonElement>('.hz-again')!.click();
    expect(root.dataset.mode).toBe('play');
    play.advance(0.016);
    expect(set.setView().bodies).toBe(0);
    root.querySelector<HTMLButtonElement>('.hz-change')!.click();
    expect(root.dataset.mode).toBe('pick');
    play.advance(0.016);

    // ✕ on the loadout screen leaves, and gives the game its screen back
    root.querySelector<HTMLButtonElement>('.hz-x')!.click();
    expect(root.hidden).toBe(true);
    expect(takeover.on).toBe(false);
    expect(document.body.classList.contains('hz-on')).toBe(false);
  });

  it('asks before leaving mid-run (Esc or ✕), and holds the run still while it asks', async () => {
    const { play, root } = await open();
    const run = start(play, root);
    play.advance(0.1);
    key('keydown', 'Escape');
    const leave = root.querySelector<HTMLElement>('.hz-leave')!;
    expect(leave.hidden).toBe(false);
    expect(root.hidden).toBe(false);
    const t = run.t;
    play.advance(0.5);
    expect(run.t).toBe(t);
    // nothing typed or held goes to the run meanwhile
    key('keydown', 'KeyD');
    expect(run.serving).toBeNull();
    // Esc again keeps going; ✕, then E (the main button: Keep going); ✕, then Leave
    key('keydown', 'Escape');
    expect(leave.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('.hz-x')!.click();
    expect(leave.hidden).toBe(false);
    key('keydown', 'KeyE', { key: 'e' });
    expect(leave.hidden).toBe(true);
    play.advance(0.5);
    expect(run.t).toBeGreaterThan(t);
    root.querySelector<HTMLButtonElement>('.hz-x')!.click();
    root.querySelector<HTMLButtonElement>('.hz-quit')!.click();
    expect(root.hidden).toBe(true);
    expect(play.hazardRun()).toBeNull();
  });

  it('draws everything a busy street has, over it and on it', async () => {
    const { play, set, root } = await open();
    const { gfx } = await import('../src/graphics');
    const run = start(play, root);
    play.advance(0.016);

    // a cooked zombie (a stamp, a garnish, its caramel), a special with its ticket, one off the screen, coats, zones
    const z = zombie(run, 700, 300, { hp: 1000, maxHp: 1000 });
    hit(run, z, 1, 'sweet', 0.5); hit(run, z, 1, 'spicy');
    const s = zombie(run, 760, 420, { ticket: ['umami', 'spicy'], hp: 1000, maxHp: 1000, r: 26 });
    hit(run, s, 1, 'umami');
    zombie(run, -900, 360, { ticket: ['sour', 'salty'], hp: 1000, maxHp: 1000, r: 26 });
    zombie(run, 500, 450, { coat: 'salty', coatT: 3, meter: 0.5, hp: 1000, maxHp: 1000 });
    zombie(run, 560, 250, { freezeT: 5, hp: 1000, maxHp: 1000 });
    zombie(run, 600, 520, { twitchT: 5, hp: 1000, maxHp: 1000 });
    for (const kind of ['smoke', 'battery', 'syrup'] as const) run.zones.push({ x: 600, y: 600, r: 50, t: 5, kind, acc: 0 });
    run.thrown.push({ x: 700, y: 300, fromX: 640, fromY: 360, t: 0.3, dish: 'chiliPot' });
    // a code half in, smudged by a slip
    key('keydown', 'Digit2');
    key('keydown', 'Digit2', { repeat: true });
    press(run, DISHES[run.loadout.dishes[1]].code[0] === 'up' ? 'down' : 'up');
    play.advance(0.05);

    const v = set.setView();
    expect(v.bodies).toBe(run.zombies.length);
    expect(v.looks).toEqual(expect.arrayContaining(['salty', 'candy', 'plain']));
    expect(v.zones).toBe(4);
    expect(v.herbs).toBe(1);
    expect(v.plates).toBe(1);
    expect(v.puffs).toBe(gfx.quality === 'high' ? 6 : 0);
    expect(root.querySelector('.hz-stamp')!.textContent).toBe('BRÛLÉED!');
    expect(root.querySelectorAll('.hz-coat').length).toBeGreaterThan(0);
    // the special's ticket: the umami done, the spicy to go; the one off the screen as an arrow at its edge
    const tickets = [...root.querySelectorAll('.hz-tag.hz-ticket')];
    expect(tickets).toHaveLength(1);
    expect(tickets[0].querySelectorAll('i.done')).toHaveLength(1);
    const edge = root.querySelector<HTMLElement>('.hz-edge')!;
    expect(edge.classList.contains('right')).toBe(false);
    expect(root.querySelector('.hz-serve.smudged')).not.toBeNull();
    expect(root.querySelector('.hz-slot.on')).not.toBeNull();
    // (nothing aimed while the dish is still going in)
    expect(v.target).toBe(false);

    // a zombie gone swells up, then pops: into confetti on High, nothing on Low (where there's no smoke either)
    gfx.quality = 'high';
    z.hp = 1; hit(run, z, 5, null);
    for (let i = 0; i < 6; i++) play.advance(0.05);
    expect(set.setView().confetti).toBeGreaterThan(0);
    expect(set.setView().shadows).toBe(true);
    for (let i = 0; i < 40; i++) play.advance(0.05);
    expect(set.setView().confetti).toBe(0);
    gfx.quality = 'low';
    const y = zombie(run, 400, 300, { hp: 1, maxHp: 100 });
    play.advance(0.05);
    hit(run, y, 5, null);
    for (let i = 0; i < 6; i++) play.advance(0.05);
    expect(set.setView().confetti).toBe(0);
    expect(set.setView().shadows).toBe(false);
    expect(set.setView().puffs).toBe(0);
    gfx.quality = 'high';
    // the pool's bodies are used again
    const made = set.setView().made;
    zombie(run, 450, 300, { hp: 1000, maxHp: 1000 });
    play.advance(0.05);
    expect(set.setView().made).toBe(made);
    play.closeHazard();
  });

  it('runs on animation frames, and stops once it closes', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.push(f); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const { play, root } = await open();
    // (nothing to move on the loadout screen)
    play.advance(0.1);
    expect(play.hazardRun()).toBeNull();
    const run = start(play, root);
    window.dispatchEvent(new Event('blur'));
    // (each frame asks for the next)
    for (let i = 0; i < 5; i++) frames.shift()!(performance.now() + 16);
    expect(run.t).toBeGreaterThan(0);
    play.closeHazard();
    // (a frame already asked for does nothing once it's shut)
    frames.length = 0;
    play.openHazard();
    play.closeHazard();
    frames.shift()?.(performance.now());
    expect(root.hidden).toBe(true);
  });
});

describe('the screen, by touch', () => {
  it('goes full screen and sideways where the phone lets it, and gives the screen back after', async () => {
    phone();
    const lock = vi.fn(async () => {}), unlock = vi.fn(), full = vi.fn(async () => {}), exit = vi.fn(async () => {});
    vi.stubGlobal('screen', { orientation: { lock, unlock } });
    document.documentElement.requestFullscreen = full;
    document.exitFullscreen = exit;
    const { play, root } = await open();
    expect(root.dataset.touch).toBe('1');
    await vi.waitFor(() => expect(lock).toHaveBeenCalledWith('landscape'));
    expect(full).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true });
    play.closeHazard();
    expect(unlock).toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    // a phone that won't: nothing breaks, and the screen asks to turn it instead
    full.mockRejectedValueOnce(new Error('no'));
    play.openHazard();
    play.closeHazard();
  });

  it('walks and aims on two sticks, and fires while aiming', async () => {
    phone();
    const { play, set, root, area } = await open();
    const run = start(play, root);
    const ammo = run.ammo;
    // the left thumb walks: down anywhere on the left half, pushed right
    pointer(area, 'pointerdown', 200, 300, 1);
    pointer(area, 'pointermove', 260, 300, 1);
    expect(root.querySelector('.hz-move.on')).not.toBeNull();
    play.advance(0.5);
    expect(run.player.x).toBeGreaterThan(W / 2);
    // (a second thumb on the same half doesn't take it over)
    pointer(area, 'pointerdown', 100, 300, 9);
    pointer(area, 'pointerup', 260, 300, 1);
    expect(root.querySelector('.hz-move.on')).toBeNull();
    const x = run.player.x;
    play.advance(0.2);
    expect(run.player.x).toBe(x);
    // the right thumb aims, and fires while it's pushed: the chef turns that way
    pointer(area, 'pointerdown', 700, 200, 2);
    pointer(area, 'pointermove', 700, 260, 2);
    play.advance(0.3);
    expect(run.ammo).toBeLessThan(ammo);
    expect(set.setView().shots).toBeGreaterThan(0);
    pointer(area, 'pointercancel', 700, 260, 2);
    const left = run.ammo;
    play.advance(0.5);
    expect(run.ammo).toBe(left);
    // shove, and a tap on the ammo reloads
    const z = zombie(run, run.player.x + 30, run.player.y);
    pointer(root.querySelector('.hz-shove')!, 'pointerdown', 800, 300, 3);
    expect(z.x).toBeGreaterThan(run.player.x + 30);
    pointer(root.querySelector('.hz-ammo-pill')!, 'pointerdown', 40, 120, 3);
    expect(run.reloadT).toBeGreaterThan(0);
    // (any other button does nothing to the run)
    pointer(root.querySelector('.hz-x')!, 'pointerdown', 880, 20, 3);
    play.closeHazard();
  });

  it('serves a dish: hold its button, swipe the code, tap where it lands', async () => {
    phone();
    const { play, root, area } = await open();
    const run = start(play, root);
    play.advance(0.016);
    // only the dishes taken show, on the left
    expect(root.querySelectorAll('.hz-slot[data-slot]')).toHaveLength(2);
    const slot = (i: number) => root.querySelector<HTMLElement>(`.hz-slot[data-slot="${i}"]`)!;
    pointer(slot(0), 'pointerdown', 60, 250, 1);
    expect(run.serving?.slot).toBe(0);
    // each swipe of the other thumb is a move of the code
    const step = { up: [0, -50], down: [0, 50], left: [-50, 0], right: [50, 0] } as const;
    let x = 600, y = 200;
    pointer(area, 'pointerdown', x, y, 2);
    const dish = DISHES[run.loadout.dishes[0]];
    for (const d of dish.code) {
      // (a little way doesn't count yet)
      pointer(area, 'pointermove', x + step[d][0] / 5, y + step[d][1] / 5, 2);
      x += step[d][0]; y += step[d][1];
      pointer(area, 'pointermove', x, y, 2);
    }
    pointer(area, 'pointerup', x, y, 2);
    expect(run.serving?.ready).toBe(true);
    // letting go of the button keeps it in hand, all typed in; a tap throws it there
    pointer(area, 'pointerup', 60, 250, 1);
    expect(run.serving?.ready).toBe(true);
    pointer(area, 'pointerdown', 600, 220, 3);
    expect(run.servings[0]).toBe(dish.servings - 1);
    expect(run.thrown).toHaveLength(1);

    // a slip smudges the ticket and starts it over; letting go half typed puts the dish back
    pointer(slot(1), 'pointerdown', 60, 330, 4);
    pointer(area, 'pointerdown', 600, 200, 5);
    const wrong = DISHES[run.loadout.dishes[1]].code[0] === 'down' ? -60 : 60;
    pointer(area, 'pointermove', 600, 200 + wrong, 5);
    expect(run.serving?.typed).toBe(0);
    expect(run.serving!.smudge).toBeGreaterThan(0);
    pointer(area, 'pointerup', 60, 330, 4);
    expect(run.serving).toBeNull();
    // a dish with no servings left doesn't start
    run.servings[1] = 0;
    play.advance(0.016);
    pointer(slot(1), 'pointerdown', 60, 330, 6);
    expect(run.serving).toBeNull();
    play.closeHazard();
  });

  it('holds the run still while the phone is upright, and asks to turn it', async () => {
    phone(420, 900);
    const { play, root } = await open();
    const run = start(play, root);
    play.advance(0.5);
    expect(root.dataset.upright).toBe('true');
    expect(run.t).toBe(0);
    vi.stubGlobal('innerWidth', 900);
    vi.stubGlobal('innerHeight', 420);
    play.advance(0.5);
    expect(root.dataset.upright).toBe('false');
    expect(run.t).toBeGreaterThan(0);
    play.closeHazard();
  });
});

describe('the set', () => {
  it('turns screen points into spots on the street and back', async () => {
    const set = await import('../src/hazardSet');
    set.resetView(null);
    const at = set.toArena(window.innerWidth / 2, window.innerHeight / 2)!;
    const back = set.toScreen(at.x, at.y, 0);
    expect(back.x).toBeCloseTo(window.innerWidth / 2, 0);
    expect(back.y).toBeCloseTo(window.innerHeight / 2, 0);
    // (above the horizon, there's no street)
    expect(set.toArena(window.innerWidth / 2, -50000)).toBeNull();
    // the camera pulls back on a tall screen
    vi.stubGlobal('innerWidth', 400);
    vi.stubGlobal('innerHeight', 900);
    set.resetView(null);
    expect(set.camera.fov).toBe(46);
  });
});
