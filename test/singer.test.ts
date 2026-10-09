// The singer's look: worn over a Person in place of their own clothes, and taken off again.
import type { BufferGeometry } from 'three';
import { expect, it } from 'vitest';
import { Person } from '../src/characters';
import { G } from '../src/render';
import { singerLook } from '../src/singer';

it('swaps the parka for the singer and back, arms set wider for his build', () => {
  const p = new Person(0xFF6B4A);
  const before = p.body.children.length;
  const wear = singerLook(p);
  /** Their own body, head and hood (baked into the person, so read from what they're wearing). */
  const own = () => p.worn().filter(w => ([G.body, G.hood, G.hoodBack, G.head] as BufferGeometry[]).includes(w.geo));
  const sleeves = p.arms.map(a => a.children[0]);
  const look = [...p.body.children.slice(before), ...p.arms.flatMap(a => a.children.slice(1))];
  expect(own()).toHaveLength(4);
  expect(look.length).toBeGreaterThan(10);
  expect(look.some(o => o.visible)).toBe(false);
  wear(true);
  expect(p.arms.map(a => a.position.x)).toEqual([-0.3 * 1.1, 0.3 * 1.1]);
  expect(own()).toHaveLength(0);
  expect(sleeves.some(o => o.visible)).toBe(false);
  expect(look.every(o => o.visible)).toBe(true);
  wear(false);
  expect(p.arms.map(a => a.position.x)).toEqual([-0.3, 0.3]);
  expect(own()).toHaveLength(4);
  expect(sleeves.every(o => o.visible)).toBe(true);
  expect(look.some(o => o.visible)).toBe(false);
});
