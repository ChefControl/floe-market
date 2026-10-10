// The singer's look: worn over a Person in place of their own clothes, and taken off again.
import { type BufferGeometry, Mesh, type Object3D } from 'three';
import { expect, it } from 'vitest';
import { Person } from '../src/characters';
import { choose } from '../src/graphics';
import { G } from '../src/render';
import { singerLook } from '../src/singer';

it('swaps the parka for the singer and back, arms set wider for his build', () => {
  const p = new Person(0xFF6B4A);
  const before = p.body.children.length;
  const wear = singerLook(p);
  /** Their own body, head and hood (baked into the person, so read from what they're wearing). */
  const own = () => p.worn().filter(w => ([G.body, G.hood, G.hoodBack, G.head] as BufferGeometry[]).includes(w.geo));
  const sleeves = p.arms.map(a => a.children[0]);
  const all = [...p.body.children.slice(before), ...p.arms.flatMap(a => a.children.slice(1))];
  /** His High look is baked the new way (kit.ts), a byte per normal; the Low one is separate meshes, as it always was. */
  const baked = (o: Object3D) => o instanceof Mesh && o.geometry.attributes.normal?.array instanceof Int8Array;
  const look = all.filter(o => !baked(o)), high = all.filter(baked);
  expect(own()).toHaveLength(4);
  expect(look.length).toBeGreaterThan(10);
  expect(high.length).toBeGreaterThan(2);
  expect(all.some(o => o.visible)).toBe(false);
  choose('low');
  wear(true);
  expect(p.arms.map(a => a.position.x)).toEqual([-0.3 * 1.1, 0.3 * 1.1]);
  expect(own()).toHaveLength(0);
  expect(sleeves.some(o => o.visible)).toBe(false);
  expect(look.every(o => o.visible)).toBe(true);
  expect(high.some(o => o.visible)).toBe(false);
  // and on High, the rounder, more detailed look in his place, even while he's worn
  choose('high');
  expect(look.some(o => o.visible)).toBe(false);
  expect(high.every(o => o.visible)).toBe(true);
  wear(false);
  expect(p.arms.map(a => a.position.x)).toEqual([-0.3, 0.3]);
  expect(own()).toHaveLength(4);
  expect(sleeves.every(o => o.visible)).toBe(true);
  expect(all.some(o => o.visible)).toBe(false);
});
