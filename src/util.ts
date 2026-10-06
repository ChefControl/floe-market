import { Vector3 } from 'three';

/** Anything with a ground-plane position. */
export interface XZ {
  x: number;
  z: number;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const UP = V(0, 1, 0);
/** Deck surface height. */
export const FY = 0.15;
/** Unit forward vector for a heading (radians, 0 = +z). */
export const fwd = (h: number) => V(Math.sin(h), 0, Math.cos(h));
/** Squared distance on the ground plane. */
export const d2xz = (a: XZ, b: XZ) => {
  const dx = a.x - b.x, dz = a.z - b.z;
  return dx * dx + dz * dz;
};
