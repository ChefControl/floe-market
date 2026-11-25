// The fishing machines' models: the auto harpoon on the dock (the 'turret' unlock) and the ice net out in the water
// (the 'net' unlock). What they do is in unlocks.ts.
import {
  CatmullRomCurve3, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshLambertMaterial, PlaneGeometry,
  Quaternion, TorusGeometry, TubeGeometry, BoxGeometry, type Vector3,
} from 'three';
import { type Line, lineFloor, REACH } from './fishing';
import { apart, baked, detail, dice, quietly, seasonLayer, shadowsOf } from './kit';
import { netRig, netSnow, turretBase, turretHead } from './propsMachines';
import { canvasTex, G, mesh, painted, scene } from './render';
import { lay, ropeGeometry, sagOf } from './rope';
import { FY, V } from './util';

const STEEL = 0x5B6B78, DARK = 0x3C4C58, CORAL = 0xFF6B4A, WOOD = 0x8A5A3B, ROPE = 0xE3C26B;

/** Where the harpoon sits loaded (its tail, where the rope's tied on), in the head's frame: just inside the muzzle. */
const SEAT = V(0, 0.04, 0.77);
/** How high the head's pivot is over the platform's foot. */
const HEAD_Y = 0.72;
/** The barrel's tilt at rest, down toward the water (radians). */
const REST = 0.07;

/** The auto harpoon, as unlocks.ts works it. */
export interface Turret {
  g: Group;
  head: Group;
  /** Its line, for its catches (fishing.ts tryCatch): the harpoon out on its rope, and back. */
  line: Line;
  /**
   * Between shots: turns toward `target` (the fish it'll go for next, if there is one), and as `wind` goes from 0 to
   * 1, draws back to fire.
   */
  ready(dt: number, target: Vector3 | null, wind: number): void;
  /** It has just fired at `fish`, and fires again in `next` seconds: the harpoon's back in the barrel before then. */
  fired(fish: Vector3, next: number): void;
}

const Z = V(0, 0, 1), muzzle = V(0, 0, 0), hit = V(0, 0, 0), to = V(0, 0, 0), tail = V(0, 0, 0), let0 = V(0, 0, 0);
const aimQ = new Quaternion();
const wrap = (a: number) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;
const smooth = (k: number) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };

/**
 * The auto harpoon: a harpoon gun on a swivel, on a round wooden platform. `head` turns to aim (its barrel points
 * along +z), with a harpoon loaded, a reel of rope on the side and handles at the back. Low and High (propsMachines.ts)
 * stand side by side in `g`, and in `head`, so the pop-in and the aiming move both.
 *
 * A shot, as it's seen (what it catches and when is fishing.ts' and unlocks.ts', and no different): the head turns to
 * the next fish as it waits, and draws back a moment before it fires; it kicks, and the harpoon flies out with the rope
 * whipping after it; the rope snaps taut as it strikes, and hauls the fish up out of the water, the barrel following
 * it; then it lets go, the fish sails on to the block by itself, and the harpoon's reeled back in on a slack rope and
 * seats in the muzzle before the next shot.
 */
export function buildTurret(): Turret {
  const g = new Group(); g.position.set(-6.9, FY, -5.9);
  const [low, lowHead] = quietly(() => [new Group(), new Group()]);
  // (what's new is built on dice of its own, so neither the game's luck nor the scenery's dice move for it)
  const [lowDart, dart] = apart(() => [new Group(), new Group()], dice(0x4A28));
  g.add(low);
  low.add(mesh(new CylinderGeometry(0.5, 0.55, 0.12, 18), WOOD, 0, 0.06, 0, true));
  low.add(mesh(new CylinderGeometry(0.16, 0.22, 0.42, 12), DARK, 0, 0.33, 0, true));
  low.add(mesh(new CylinderGeometry(0.24, 0.24, 0.06, 16), CORAL, 0, 0.56, 0, true));
  const head = new Group(); head.position.y = HEAD_Y; g.add(head);
  head.rotation.order = 'YXZ';
  head.add(lowHead);
  // the yoke, and the barrel between its arms
  for (const s of [-1, 1]) lowHead.add(mesh(new BoxGeometry(0.05, 0.28, 0.22), DARK, s * 0.13, -0.04, 0, true));
  const barrel = mesh(new CylinderGeometry(0.075, 0.085, 1.1, 14), STEEL, 0, 0.04, 0.25, true); barrel.rotation.x = Math.PI / 2;
  lowHead.add(barrel);
  for (const z of [0.78, -0.22]) {
    const band = mesh(new CylinderGeometry(0.095, 0.095, 0.07, 14), CORAL, 0, 0.04, z, true); band.rotation.x = Math.PI / 2;
    lowHead.add(band);
  }
  // the harpoon, loaded: a wooden shaft out of the muzzle, a steel point and two barbs (by itself, as it leaves the
  // barrel when it's fired)
  const shaft = mesh(new CylinderGeometry(0.022, 0.022, 0.42, 8), WOOD, 0, 0.04, 0.98); shaft.rotation.x = Math.PI / 2; lowDart.add(shaft);
  const tip = mesh(new ConeGeometry(0.05, 0.18, 10), 0xD9E2E8, 0, 0.04, 1.27, true); tip.rotation.x = Math.PI / 2; lowDart.add(tip);
  for (const s of [-1, 1]) {
    const barb = mesh(new ConeGeometry(0.02, 0.1, 6), 0xD9E2E8, s * 0.05, 0.04, 1.17); barb.rotation.set(-Math.PI / 2, 0, s * 0.6); lowDart.add(barb);
  }
  // a reel of rope on the side, for reeling the catch in
  const reel = mesh(new CylinderGeometry(0.13, 0.13, 0.1, 16), DARK, 0.22, 0.02, -0.05, true); reel.rotation.z = Math.PI / 2; lowHead.add(reel);
  const coil = mesh(new TorusGeometry(0.1, 0.035, 8, 18), ROPE, 0.22, 0.02, -0.05); coil.rotation.y = Math.PI / 2; lowHead.add(coil);
  // handles at the back
  for (const s of [-1, 1]) {
    const grip = mesh(new CylinderGeometry(0.025, 0.025, 0.22, 8), DARK, s * 0.09, 0.04, -0.38); grip.rotation.x = 0.5; lowHead.add(grip);
  }
  const parts = quietly(() => {
    const high = turretBase().mesh(), p = turretHead();
    // (the harpoon's shadow shapes were made here with the head's, when it was part of it: they still are, so the
    // scenery's dice go on from here as they did)
    shadowsOf(p.dart.pieces[0].geo, p.dart.pieces[2].geo);
    const highHead = p.head.mesh();
    g.add(high); head.add(highHead);
    detail(low, high);
    detail(lowHead, highHead);
    return p;
  });
  // The harpoon stands in the platform's frame, so it can leave the head: both models of it built in the head's frame,
  // moved so its tail's at its own middle. And the rope, which is the scene's.
  const rope = apart(() => {
    // (it casts its shadow as itself: it's a handful of triangles, and the kit's plainer copy of a cone is no cone)
    const highDart = baked(parts.dart.pieces, false);
    highDart.castShadow = true;
    for (const o of [lowDart, highDart]) o.position.copy(SEAT).negate();
    const lo = new Group(), hi = new Group();
    lo.add(lowDart); hi.add(highDart);
    dart.add(lo, hi);
    detail(lo, hi);
    dart.userData.noBatch = true;
    g.add(dart);
    return ropeGeometry(0.02, ROPE);
  }, dice(0x4A29));
  scene.add(g);

  // ---------- how it moves ----------
  /** Where it's turned and tilted to, how far it's drawn back to fire (0 to 1), and its kick as it fires or as the
   *  harpoon seats (1, dying away). */
  let yaw = 0, pitch = REST, wind = 0, kick = 0, seat = 0;
  /** Whether the harpoon's out on its rope; when it lets go of the fish, and when it's back in the barrel (seconds
   *  into the catch). */
  let out = false, lets = REACH + 0.24, back = 0.8, held = false;
  /** Puts the head where all that says, and the harpoon in its muzzle if it's loaded. */
  const pose = () => {
    const slide = 0.09 * kick + 0.05 * wind + 0.025 * seat;
    head.rotation.set(pitch - 0.16 * kick + 0.05 * wind, yaw, 0);
    head.position.set(-Math.sin(yaw) * slide, HEAD_Y, -Math.cos(yaw) * slide);
    head.updateMatrix();
    muzzle.copy(SEAT).applyMatrix4(head.matrix);
    if (!out) { dart.position.copy(muzzle); dart.quaternion.copy(head.quaternion); }
  };
  /** Turns and tilts the barrel `k` of the way to point at `p` (in the platform's frame). */
  const aim = (p: Vector3, k: number) => {
    const dx = p.x, dz = p.z, flat = Math.hypot(dx, dz);
    if (flat < 0.3) return;
    yaw += wrap(Math.atan2(dx, dz) - yaw) * k;
    pitch += (Math.max(-0.9, Math.min(0.6, Math.atan2(HEAD_Y + SEAT.y - p.y, flat))) - pitch) * k;
  };
  /** The lowest the rope hangs, in the platform's frame. */
  const floor = (x: number, z: number) => lineFloor(x + g.position.x, z + g.position.z) - g.position.y;
  const line: Line = {
    geo: rope, material: painted,
    draw(t, _from, fish, q) {
      if (!out) return false;
      // (the rope's laid in the world's frame, the harpoon in the platform's)
      const world = (v: Vector3) => v.add(g.position);
      hit.copy(fish).sub(g.position); hit.y += 0.05;
      kick = Math.exp(-t / 0.07);
      if (t >= back) {
        // home: it seats with a little knock
        out = false; seat = 1; pitch = REST;
        pose();
        return false;
      }
      if (q === null) {
        // on its way out, fast at first, the rope whipping after it
        aim(hit, 1);
        pose();
        const s = t / REACH, far = 1 - (1 - s) ** 1.6;
        to.subVectors(hit, muzzle);
        const span = to.length();
        dart.position.copy(muzzle).addScaledVector(to, far);
        dart.quaternion.setFromUnitVectors(Z, to.normalize());
        lay(rope, world(tail.copy(muzzle)), world(to.copy(dart.position)), {
          sag: sagOf(span * far, 0.05 * span * far * (1 - s)), wave: 0.11 * (1 - s) * Math.min(1, far * 3), waves: 2, phase: t * 55, floor: lineFloor,
        });
        held = false;
        return true;
      }
      if (t < lets) {
        // struck: the rope's taut, twanging as it takes the fish's weight, and the barrel follows the fish up
        aim(hit, 0.5);
        pose();
        to.subVectors(hit, muzzle).normalize();
        dart.position.copy(hit);
        if (!held) { aimQ.setFromUnitVectors(Z, to); held = true; }
        dart.quaternion.copy(aimQ);
        const since = t - REACH;
        lay(rope, world(tail.copy(muzzle)), world(to.copy(hit)), { wave: 0.08 * Math.exp(-since / 0.07) * Math.cos(since * 75), phase: -Math.PI / 2 });
        let0.copy(hit);
        return true;
      }
      // let go: the fish flies on, and the harpoon's reeled back in, its rope slack at first and tightening as it comes
      const u = (t - lets) / (back - lets), e = smooth(u);
      pitch += (REST - pitch) * e;
      pose();
      to.subVectors(muzzle, let0);
      const span = to.length() * (1 - e);
      dart.position.copy(let0).addScaledVector(to, e);
      dart.position.y = Math.max(dart.position.y - Math.sin(u * Math.PI) * Math.min(0.9, span * 0.3), floor(dart.position.x, dart.position.z) + 0.05);
      // (it comes home point last, and lines up with the barrel as it nears it)
      dart.quaternion.copy(aimQ).slerp(head.quaternion, e * e);
      lay(rope, world(tail.copy(muzzle)), world(to.copy(dart.position)), {
        sag: sagOf(span, 0.12 * span * Math.sin(u * Math.PI)), wave: 0.07 * Math.sin(u * Math.PI), waves: 1.5, phase: -t * 30, floor: lineFloor,
      });
      return true;
    },
    done() { if (out) { out = false; pose(); } },
  };
  pose();
  return {
    g, head, line,
    ready(dt, target, w) {
      seat = Math.max(0, seat - dt / 0.14);
      if (out) return;
      kick = Math.max(0, kick - dt / 0.1);
      wind = smooth(w);
      if (target) { hit.copy(target).sub(g.position); aim(hit, Math.min(1, dt * 7)); }
      else pitch += (REST - pitch) * Math.min(1, dt * 4);
      pose();
    },
    fired(fish, next) {
      wind = 0; kick = 1; held = false;
      back = Math.max(REACH + 0.18, Math.min(0.8, next - 0.16));
      lets = REACH + (back - REACH) * 0.55;
      hit.copy(fish).sub(g.position);
      aim(hit, 1);
      // (the harpoon's still in the muzzle as the gun kicks: it's out from the next frame)
      pose();
      out = true;
    },
  };
}

/**
 * The ice net: a fishing net hung between two wooden poles out in the water, sagging between them, with cork floats
 * along its top rope and a buoy at each end. Fish swim into it (unlocks.ts) from `src`.
 */
export function buildNet() {
  const g = new Group(); g.position.set(-1.2, 0, -10.8);
  const W = 3.5, TOP = 1.45, BOTTOM = 0.12, SAG = 0.16;
  // Low: the poles, ropes and floats as plain shapes. High: rigged with lashings, a lead line and striped buoys
  // (propsMachines.ts). The net itself is the same on both.
  const low = quietly(() => new Group());
  g.add(low);
  for (const s of [-1, 1]) {
    const pole = mesh(G.cyl, 0x7A5236, s * (W / 2 + 0.05), 0.55, 0, true); pole.scale.set(0.09, 2.1, 0.09); low.add(pole);
    low.add(mesh(new CylinderGeometry(0.1, 0.1, 0.12, 10), ROPE, s * (W / 2 + 0.05), TOP - 0.02, 0));
    low.add(mesh(new CylinderGeometry(0.11, 0.09, 0.06, 10), 0xE9D9C0, s * (W / 2 + 0.05), 1.62, 0, true));
    const buoy = mesh(G.sphere, CORAL, s * (W / 2 + 0.45), 0.06, 0.2, true); buoy.scale.setScalar(0.16); low.add(buoy);
  }
  // the net: a diamond mesh of rope, sagging in the middle and bellying out a little with the current
  const netTex = canvasTex(256, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#F4F6F8'; c.lineWidth = 2.5;
    for (let x = -h; x < w + h; x += 16) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke();
      c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke();
    }
  });
  const sheet = new PlaneGeometry(W, TOP - BOTTOM, 16, 6);
  const pos = sheet.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / W + 0.5, v = pos.getY(i) / (TOP - BOTTOM) + 0.5; // 0..1 across, 0..1 up
    const dip = Math.sin(u * Math.PI) * SAG * v;
    pos.setY(i, pos.getY(i) - dip);
    pos.setZ(i, Math.sin(u * Math.PI) * 0.18 * (1 - v * 0.5));
  }
  sheet.computeVertexNormals();
  const net = new Mesh(sheet, new MeshLambertMaterial({ map: netTex.tex, transparent: true, alphaTest: 0.35, side: DoubleSide }));
  net.position.y = (TOP + BOTTOM) / 2; g.add(net);
  // the top rope, sagging like the net, with cork floats along it
  const top = new CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return V((u - 0.5) * (W + 0.1), TOP - Math.sin(u * Math.PI) * SAG, Math.sin(u * Math.PI) * 0.05);
  }));
  low.add(new Mesh(new TubeGeometry(top, 24, 0.025, 6), new MeshLambertMaterial({ color: ROPE })));
  for (let i = 1; i < 7; i++) {
    const p = top.getPoint(i / 7);
    const cork = mesh(new CylinderGeometry(0.07, 0.07, 0.14, 10), 0xD9A441, p.x, p.y, p.z, true); cork.rotation.z = Math.PI / 2;
    low.add(cork);
  }
  quietly(() => {
    const high = new Group();
    high.add(netRig(W, TOP, BOTTOM, SAG).mesh(), seasonLayer(netSnow(W).mesh(false), [1, 0, 0, 0]));
    g.add(high);
    detail(low, high);
  });
  scene.add(g);
  return { g, src: V(-1.2, 0.3, -10.8) };
}
