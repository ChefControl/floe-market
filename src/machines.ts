// The fishing machines' models: the auto harpoon on the dock (the 'turret' unlock) and the ice net out in the water
// (the 'net' unlock). What they do is in unlocks.ts.
import {
  CatmullRomCurve3, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshLambertMaterial, PlaneGeometry,
  TorusGeometry, TubeGeometry, BoxGeometry,
} from 'three';
import { detail, quietly, seasonLayer } from './kit';
import { netRig, netSnow, turretBase, turretHead } from './propsMachines';
import { canvasTex, G, mesh, scene } from './render';
import { FY, V } from './util';

const STEEL = 0x5B6B78, DARK = 0x3C4C58, CORAL = 0xFF6B4A, WOOD = 0x8A5A3B, ROPE = 0xE3C26B;

/**
 * The auto harpoon: a harpoon gun on a swivel, on a round wooden platform. `head` turns to aim (its barrel points
 * along +z), with a harpoon loaded, a reel of rope on the side and handles at the back. Low and High (propsMachines.ts)
 * stand side by side in `g`, and in `head`, so the pop-in and the aiming move both.
 */
export function buildTurret() {
  const g = new Group(); g.position.set(-6.9, FY, -5.9);
  const [low, lowHead] = quietly(() => [new Group(), new Group()]);
  g.add(low);
  low.add(mesh(new CylinderGeometry(0.5, 0.55, 0.12, 18), WOOD, 0, 0.06, 0, true));
  low.add(mesh(new CylinderGeometry(0.16, 0.22, 0.42, 12), DARK, 0, 0.33, 0, true));
  low.add(mesh(new CylinderGeometry(0.24, 0.24, 0.06, 16), CORAL, 0, 0.56, 0, true));
  const head = new Group(); head.position.y = 0.72; g.add(head);
  head.add(lowHead);
  // the yoke, and the barrel between its arms
  for (const s of [-1, 1]) lowHead.add(mesh(new BoxGeometry(0.05, 0.28, 0.22), DARK, s * 0.13, -0.04, 0, true));
  const barrel = mesh(new CylinderGeometry(0.075, 0.085, 1.1, 14), STEEL, 0, 0.04, 0.25, true); barrel.rotation.x = Math.PI / 2;
  lowHead.add(barrel);
  for (const z of [0.78, -0.22]) {
    const band = mesh(new CylinderGeometry(0.095, 0.095, 0.07, 14), CORAL, 0, 0.04, z, true); band.rotation.x = Math.PI / 2;
    lowHead.add(band);
  }
  // the harpoon, loaded: a wooden shaft out of the muzzle, a steel point and two barbs
  const shaft = mesh(new CylinderGeometry(0.022, 0.022, 0.42, 8), WOOD, 0, 0.04, 0.98); shaft.rotation.x = Math.PI / 2; lowHead.add(shaft);
  const tip = mesh(new ConeGeometry(0.05, 0.18, 10), 0xD9E2E8, 0, 0.04, 1.27, true); tip.rotation.x = Math.PI / 2; lowHead.add(tip);
  for (const s of [-1, 1]) {
    const barb = mesh(new ConeGeometry(0.02, 0.1, 6), 0xD9E2E8, s * 0.05, 0.04, 1.17); barb.rotation.set(-Math.PI / 2, 0, s * 0.6); lowHead.add(barb);
  }
  // a reel of rope on the side, for reeling the catch in
  const reel = mesh(new CylinderGeometry(0.13, 0.13, 0.1, 16), DARK, 0.22, 0.02, -0.05, true); reel.rotation.z = Math.PI / 2; lowHead.add(reel);
  const coil = mesh(new TorusGeometry(0.1, 0.035, 8, 18), ROPE, 0.22, 0.02, -0.05); coil.rotation.y = Math.PI / 2; lowHead.add(coil);
  // handles at the back
  for (const s of [-1, 1]) {
    const grip = mesh(new CylinderGeometry(0.025, 0.025, 0.22, 8), DARK, s * 0.09, 0.04, -0.38); grip.rotation.x = 0.5; lowHead.add(grip);
  }
  quietly(() => {
    const high = turretBase().mesh(), highHead = turretHead().mesh();
    g.add(high); head.add(highHead);
    detail(low, high);
    detail(lowHead, highHead);
  });
  scene.add(g);
  return { g, head };
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
