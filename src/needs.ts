// What the kitchen is waiting on, said in speech bubbles like the customers' orders (bubble.ts): when the chefs stand
// idle for want of fish or rice, the cook at that pad on the kitchen line asks for it, right where it's dropped off.
import { Sprite, SpriteMaterial, type Object3D } from 'three';
import { drawNeed, type OrderIcon } from './bubble';
import { canvasTex } from './render';
import { fishTray, ricePot, sushi } from './restaurant';
import { staging } from './stage';

/** Seconds something has to stay short before its bubble comes up, so a moment between deliveries shows nothing. */
export const NEED_AFTER = 1.5;
/** A bubble's size, as the customers' are, and how long it takes to grow in. */
const SIZE = 0.8, GROW = 0.2;

function needSprite(icon: OrderIcon, label: string) {
  const t = canvasTex(128, 128, (c, w, h) => drawNeed(c, w, h, icon, label));
  const s = new Sprite(new SpriteMaterial({ map: t.tex, depthTest: false }));
  s.renderOrder = 5; s.visible = false;
  return s;
}

interface Need {
  sprite: Sprite;
  /** Seconds it's been short. */
  t: number;
  short: () => boolean;
}

/** The cooks' asks, in the order the cooks stand: the fish cook, then the rice cook (restaurant.ts). */
export const asks: Need[] = [
  { sprite: needSprite('fish', '?'), t: 0, short: () => !fishTray.items.length },
  // a bag of rice makes two plates, so an open bag still has one in it
  { sprite: needSprite('rice', '?'), t: 0, short: () => !sushi.portions && !ricePot.items.length },
];

/** Shows a bubble once its need has lasted NEED_AFTER, growing it in; hides it as soon as it's met. */
function show(n: Need, on: boolean, dt: number) {
  n.t = on && n.short() ? n.t + dt : 0;
  const s = n.sprite, grown = (n.t - NEED_AFTER) / GROW;
  s.visible = grown >= 0;
  if (s.visible) s.scale.setScalar(SIZE * Math.min(1, 0.3 + 0.7 * grown));
}

export function updNeeds(dt: number) {
  // chefs only stand idle when there's nothing to make a plate from: a full belt keeps them holding one instead
  const waiting = !staging() && sushi.built && sushi.chefs.some(c => c.state === 'idle');
  asks.forEach((a, i) => {
    const cook: Object3D | undefined = sushi.cooks[i]?.g;
    if (cook && a.sprite.parent !== cook) { cook.add(a.sprite); a.sprite.position.set(0, 1.95, 0); }
    show(a, waiting && !!cook, dt);
  });
}
