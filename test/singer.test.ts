// The singer's look: worn over a Person in place of their own clothes, and taken off again.
import { Mesh } from 'three';
import { expect, it } from 'vitest';
import { Person } from '../src/characters';
import { G } from '../src/render';
import { singerLook } from '../src/singer';

it('swaps the parka for the singer and back', () => {
  const p = new Person(0xFF6B4A);
  const before = p.children.length;
  const wear = singerLook(p);
  const own = [...p.children.slice(0, before), ...p.arms.map(a => a.children[0])]
    .filter(c => c instanceof Mesh && [G.body, G.hood, G.hoodBack, G.arm].includes(c.geometry));
  const look = [...p.children.slice(before), ...p.arms.flatMap(a => a.children.slice(1))];
  expect(own).toHaveLength(5);
  expect(look.length).toBeGreaterThan(10);
  expect(look.some(o => o.visible)).toBe(false);
  wear(true);
  expect(own.some(o => o.visible)).toBe(false);
  expect(look.every(o => o.visible)).toBe(true);
  wear(false);
  expect(own.every(o => o.visible)).toBe(true);
  expect(look.some(o => o.visible)).toBe(false);
});
