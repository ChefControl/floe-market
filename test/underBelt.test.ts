// The bowl line's belts (underBelt.ts): on every stretch the rubber goes the way its bowls do, as fast, so they ride it
// rather than slide over it (a box's own top face runs its texture the other way, so it once ran backwards).
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, type MeshLambertMaterial, Vector3 } from 'three';
import { belts } from '../src/bowlLine';
import { type UnderBelt, underBelt } from '../src/underBelt';

/** How the rubber on stretch `i` moves (metres a second, in the world), and how a bowl riding the middle of it does. */
function motion(b: UnderBelt, i: number, dt = 0.02) {
  const { s, belt } = b.parts[i], tex = (belt.material as MeshLambertMaterial).map!, geo = belt.geometry;
  // which way, in the world, the texture's v runs along the rubber's top face, and how far for each unit of it
  const uv = geo.getAttribute('uv'), pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
  const top = Array.from({ length: uv.count }, (_, j) => j).filter(j => nor.getY(j) > 0.5);
  const lo = top.reduce((a, j) => (uv.getY(j) < uv.getY(a) ? j : a)), hi = top.reduce((a, j) => (uv.getY(j) > uv.getY(a) ? j : a));
  b.group.updateWorldMatrix(true, true);
  const world = (j: number) => belt.localToWorld(new Vector3(pos.getX(j), pos.getY(j), pos.getZ(j)));
  const perV = world(hi).sub(world(lo)).divideScalar(uv.getY(hi) - uv.getY(lo));
  // a bowl sent along (once the last one's off), to the middle of the stretch, the only one on show
  b.update(b.length / b.speed + 1);
  b.send(false, undefined, () => {});
  b.update((s.from + s.to) / 2 / b.speed);
  const bowl = () => {
    b.group.updateWorldMatrix(true, true);
    const on = b.group.children.filter(o => o.visible && !b.parts.some(p => p.g === o));
    expect(on).toHaveLength(1);
    return on[0].getWorldPosition(new Vector3());
  };
  // and a climbing stretch's cleats: the middle one (so not about to go round)
  const cl = belt.parent!.children.find((o): o is InstancedMesh => o instanceof InstancedMesh);
  const cleat = (pick?: number) => {
    const m = new Matrix4(), ps = Array.from({ length: cl!.count }, (_, j) => {
      cl!.getMatrixAt(j, m);
      return new Vector3().setFromMatrixPosition(m);
    });
    const j = pick ?? ps.map((q, k) => ({ z: q.z, k })).sort((a, c) => a.z - c.z)[ps.length >> 1].k;
    return { j, at: cl!.localToWorld(ps[j]) };
  };
  const p0 = bowl(), o0 = tex.offset.y, c0 = cl && cleat();
  b.update(dt);
  const p1 = bowl(), c1 = c0 && cleat(c0.j);
  let dv = tex.offset.y - o0;
  dv -= Math.round(dv);
  return {
    // (the offset's added to the face's v, so the pattern moves the other way)
    rubber: perV.multiplyScalar(-dv / tex.repeat.y / dt), bowl: p1.sub(p0).divideScalar(dt),
    cleat: c0 && c1 ? c1.at.sub(c0.at).divideScalar(dt) : null,
  };
}

function expectCarried(b: UnderBelt) {
  expect(b.parts.length).toBeGreaterThan(0);
  for (let i = 0; i < b.parts.length; i++) {
    const { rubber, bowl, cleat } = motion(b, i);
    expect(bowl.length(), `stretch ${i}`).toBeGreaterThan(0.5);
    expect(!!cleat, `stretch ${i}`).toBe(!!b.parts[i].s.rise);
    // the same way, and as fast
    for (const [what, v] of [['rubber', rubber], ['cleats', cleat]] as const) {
      if (!v) continue;
      expect(v.clone().normalize().dot(bowl.clone().normalize()), `stretch ${i}'s ${what}`).toBeGreaterThan(0.999);
      expect(v.length() / bowl.length(), `stretch ${i}'s ${what}`).toBeCloseTo(1, 2);
    }
  }
}

describe('belts under the floor', () => {
  it('runs every stretch with its bowls: each way across the floor, and climbing', () => {
    // round a square the four ways (east, south, west, north), a stretch on each leg, and then one climbing north
    const path = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 3 }, { x: 0, z: 3 }, { x: 0, z: 0.5 }, { x: 0, z: -2 }];
    expectCarried(underBelt(path, 0, {
      speed: 2,
      stretches: [
        { from: 0.5, to: 2.5 }, { from: 3.5, to: 5.5, up: true }, { from: 6.5, to: 8.5, down: true }, { from: 9.5, to: 11 },
        { from: 11.6, to: 13.4, up: true, rise: 0.9 },
      ],
    }));
  });

  it("runs the bowl line's with its bowls: into the hood by the hopper, and up the ramp onto the stall's counter", () => {
    const [line] = belts;
    expect(line.parts.map(p => !!p.s.rise)).toEqual([false, true]);
    expectCarried(line);
  });
});
