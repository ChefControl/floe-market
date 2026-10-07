// Static scenery: ground, water, deck, fences, road, trees.
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, RepeatWrapping } from 'three';
import { canvasTex, G, mat, mesh, scene } from './render';
import { FY, rand } from './util';

// ---------- textures ----------
const plank = canvasTex(256, 256, (c, w) => {
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? '#C3875D' : '#CF946A'; c.fillRect(0, i * 32, w, 32);
    c.fillStyle = 'rgba(95,52,30,.35)'; c.fillRect(0, i * 32, w, 2);
    c.fillRect((i * 97 + 40) % 256, i * 32, 2, 32);
  }
});
plank.tex.wrapS = plank.tex.wrapT = RepeatWrapping;
plank.tex.repeat.set(4, 4);

const waterTex = canvasTex(4, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1E8FC0'); g.addColorStop(.75, '#36BEDB'); g.addColorStop(1, '#86E3F0');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

// ---------- ground and water ----------
const ground = mesh(new PlaneGeometry(160, 160), 0xF3F8FB);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

const water = new Mesh(new PlaneGeometry(30, 26), new MeshLambertMaterial({ map: waterTex.tex }));
water.rotation.x = -Math.PI / 2; water.position.set(-7.5, 0.01, -19.5); water.receiveShadow = true; scene.add(water);
const foamMat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: .75 });
const foam = new Mesh(new PlaneGeometry(30, 0.35), foamMat);
foam.rotation.x = -Math.PI / 2; foam.position.set(-7.5, 0.02, -6.62); scene.add(foam);
const sideFoam = new Mesh(new PlaneGeometry(0.35, 26), foamMat);
sideFoam.rotation.x = -Math.PI / 2; sideFoam.position.set(7.45, 0.02, -19.5); scene.add(sideFoam);

const floes: { m: Mesh; ph: number }[] = [];
for (let i = 0; i < 9; i++) {
  const m = mesh(G.cyl, 0xFFFFFF, rand(-20, 5), 0.03, rand(-30, -16));
  m.scale.set(rand(.5, 1.4), 0.12, rand(.4, 1.1));
  scene.add(m);
  floes.push({ m, ph: rand(0, 6) });
}
export function updFloes(time: number) {
  for (const f of floes) f.m.position.y = 0.03 + Math.sin(time * 1.3 + f.ph) * 0.03;
}

// ---------- deck ----------
const deckSide = mat(0x9C6644), deckTop = new MeshLambertMaterial({ map: plank.tex });
const deck = new Mesh(new BoxGeometry(16, 0.3, 14.5), [deckSide, deckSide, deckTop, deckSide, deckSide, deckSide]);
deck.position.set(0, 0, 0.75); deck.receiveShadow = true; scene.add(deck);
for (let x = -7.5; x <= 7.5; x += 2.5) {
  const p = mesh(G.cyl, 0x8A5A3B, x, -0.1, -6.65, true);
  p.scale.set(0.18, 0.6, 0.18); scene.add(p);
}

// ---------- fences ----------
/** Fence logs that get removed when the sled window opens. */
export const gapLogs: Mesh[] = [];
/** West fence, which opens for the walkway and the conveyor once the sushi restaurant is built. */
const westLogs: Mesh[] = [];
/** The conveyor to the sushi kitchen runs along this line. */
export const BELT_Z = -3.3;
/** Where the walkway to the sushi restaurant leaves the deck. */
export const WEST_GATE = { z0: 1.5, z1: 3.5 };
function log(x: number, z: number, list?: Mesh[]) {
  const h = rand(.78, .98);
  const l = mesh(G.log, 0xB0724A, x, FY + h / 2 - 0.05, z, true);
  l.scale.y = h; scene.add(l);
  if (list) list.push(l);
}
for (let z = -6.2; z <= 8; z += 0.5) log(-7.85, z, westLogs);
for (let x = -7.35; x <= 7.9; x += 0.5) {
  if (x > 1.7 && x < 4.3) continue;
  log(x, 7.85);
}
for (let z = -6.2; z < 7.6; z += 0.5) {
  const inGap = z > -2.3 && z < 0.3;
  log(7.85, z, inGap ? gapLogs : undefined);
}

/** Opens the west fence for the restaurant walkway and the conveyor. */
export function openWestGaps() {
  for (const l of westLogs) {
    const z = l.position.z;
    if ((z > WEST_GATE.z0 && z < WEST_GATE.z1) || Math.abs(z - BELT_Z) < 0.6) l.visible = false;
  }
}

// ---------- road ----------
const road = mesh(new PlaneGeometry(2.1, 90), 0x6B7785);
road.rotation.x = -Math.PI / 2; road.position.set(9.6, 0.0, 0); scene.add(road);
const dashGeo = new PlaneGeometry(0.12, 0.9), dashMat = new MeshBasicMaterial({ color: 0xE8EEF2 });
for (let z = -44; z < 44; z += 2.2) {
  const d = new Mesh(dashGeo, dashMat);
  d.rotation.x = -Math.PI / 2; d.position.set(9.6, 0.01, z); scene.add(d);
}

// ---------- trees and snow ----------
const TIERS: [r: number, h: number, y: number][] = [[0.75, 0.9, 0.75], [0.58, 0.8, 1.3], [0.4, 0.7, 1.8]];
function makeTree(s: number) {
  const g = new Group();
  const trunk = mesh(G.cyl, 0x7A5236, 0, 0.25 * s, 0, true);
  trunk.scale.set(.12 * s, .5 * s, .12 * s); g.add(trunk);
  TIERS.forEach(([r, h, y], i) => {
    const c = mesh(G.cone, i % 2 ? 0x3B8270 : 0x2E6E5E, 0, y * s, 0, true);
    c.scale.set(r * s, h * s, r * s); g.add(c);
    const cap = mesh(G.cone, 0xFFFFFF, 0, (y + h * .28) * s, 0);
    cap.scale.set(r * .62 * s, h * .46 * s, r * .62 * s); g.add(cap);
  });
  return g;
}
/** Keeps trees off the deck, road, customer paths, the sushi restaurant's lot and water. */
function treeOK(x: number, z: number) {
  if (x > -8.8 && x < 8.8 && z > -7.2 && z < 8.8) return false;
  if (x > -24.5 && x < -8 && z > -6.5 && z < 6.5) return false;
  if (x > -19.5 && x < -14.5 && z > 4 && z < 30) return false;
  if (x > 8.2 && x < 11.2) return false;
  if (x > -5 && x < 8.6 && z > 8.4 && z < 20) return false;
  if (x < 7.8 && z < -6.2) return false;
  return true;
}
let placed = 0;
for (let i = 0; i < 400 && placed < 46; i++) {
  const x = rand(-24, 24), z = rand(-8, 28);
  if (!treeOK(x, z)) continue;
  const t = makeTree(rand(.8, 1.25));
  t.position.set(x, 0, z); t.rotation.y = rand(0, 6); scene.add(t);
  placed++;
}
for (let i = 0; i < 22; i++) {
  const x = rand(-22, 22), z = rand(-6, 26);
  if (!treeOK(x, z)) continue;
  const m = mesh(G.sphere, 0xFFFFFF, x, 0, z);
  m.scale.set(rand(.6, 1.6), rand(.25, .5), rand(.6, 1.4)); scene.add(m);
}
