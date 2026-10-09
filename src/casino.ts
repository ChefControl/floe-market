// The casino boat: a paddle steamer moored in the bay north-west of the dock, reached by a jetty along the shore from
// a gap in the dock's west fence, then a pier out to it. The 'roulette' unlock brings it in with its roulette table;
// the blackjack table and the slot machines are upgrades of their own, bought on its deck. It stays put through the
// stage-up. The games themselves are in rouletteTable.ts, blackjackTable.ts and slotMachine.ts.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, TorusGeometry, type Object3D } from 'three';
import { collideBlackjack, updBlackjack } from './blackjackTable';
import { BOAT, casinoBoat, JETTY_Z, PIER_X } from './layout';
import { bake, canvasTex, FONT, G, mesh, scene, type Part } from './render';
import { collideRoulette, enableRoulette, updRoulette } from './rouletteTable';
import { collideSlots, updSlots } from './slotMachine';
import { FY, type XZ } from './util';
import { openJettyGap, planks } from './world';

const CX = (BOAT.x0 + BOAT.x1) / 2, CZ = (BOAT.z0 + BOAT.z1) / 2, LEN = BOAT.x1 - BOAT.x0, BEAM = BOAT.z1 - BOAT.z0;
const GOLD = 0xE3B23C, HULL = 0xF4EFE6, STRIPE = 0xB0283A, WOOD = 0x8A5A3B;
const bulbMat = new MeshBasicMaterial({ color: 0xFFE08A });

/** A group at (x, z) that pops in about its own centre; `put` places things in it by world position. */
function piece(x: number, z: number) {
  const g = new Group(); g.position.set(x, 0, z); scene.add(g);
  return g;
}
function put<T extends Object3D>(g: Group, o: T, x: number, y: number, z: number) {
  o.position.set(x - g.position.x, y, z - g.position.z); g.add(o);
  return o;
}

const SIGN = canvasTex(512, 160, (c, w, h) => {
  c.fillStyle = '#5A1420'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#FFD24A';
  for (let i = 0; i < 24; i++) {
    c.beginPath(); c.arc(12 + i * 21.2, 12, 6, 0, Math.PI * 2); c.arc(12 + i * 21.2, h - 12, 6, 0, Math.PI * 2); c.fill();
  }
  c.font = `800 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = '#2A0F16'; c.strokeText('CASINO', w / 2, h / 2 + 6);
  c.fillStyle = '#FFD24A'; c.fillText('CASINO', w / 2, h / 2 + 6);
});

/** The boat: hull and deck, railings strung with bulbs, the red back wall with its sign, smokestacks and the wheel. */
function buildBoat() {
  const g = piece(CX, CZ);
  const top = new MeshLambertMaterial({ map: planks('#9B5A3C', '#A8664A', 3, 2) });
  const side = new MeshLambertMaterial({ color: HULL });
  put(g, new Mesh(new BoxGeometry(LEN, 0.75, BEAM), [side, side, top, side, side, side]), CX, FY - 0.375, CZ).castShadow = true;
  put(g, mesh(new BoxGeometry(LEN + 0.04, 0.12, BEAM + 0.04), STRIPE), CX, FY - 0.32, CZ);
  // the railing round the deck, with a gap on the south side where the pier comes aboard
  const posts: Part[] = [], rails: Part[] = [], bulbs: Part[] = [];
  const railAt = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n - CX, z = z0 + (z1 - z0) * i / n - CZ;
      posts.push({ geo: G.cyl, at: [x, FY + 0.3, z], scale: [0.04, 0.6, 0.04] });
      bulbs.push({ geo: G.sphere, at: [x, FY + 0.66, z], scale: [0.06, 0.06, 0.06] });
    }
    const len = Math.hypot(x1 - x0, z1 - z0);
    rails.push({ geo: G.box, at: [(x0 + x1) / 2 - CX, FY + 0.6, (z0 + z1) / 2 - CZ], rot: [0, -Math.atan2(z1 - z0, x1 - x0), 0], scale: [len, 0.05, 0.06] });
  };
  const e = 0.12, { x0, x1, z0, z1 } = BOAT;
  railAt(x0 + e, z1 - e, PIER_X - 0.55, z1 - e);
  railAt(PIER_X + 0.55, z1 - e, x1 - e, z1 - e);
  railAt(x0 + e, z0 + e, x0 + e, z1 - e);
  railAt(x1 - e, z0 + e, x1 - e, z1 - e);
  g.add(mesh(bake(posts), GOLD, 0, 0, 0, true), mesh(bake(rails), GOLD, 0, 0, 0, true));
  // the back wall: red, trimmed in gold, with the sign over its middle and bulbs along its top
  const WALL_Z = z0 + 0.2, WALL_H = 1.9;
  put(g, mesh(new BoxGeometry(LEN - 0.3, WALL_H, 0.2), 0x8E1F2F, 0, 0, 0, true), CX, FY + WALL_H / 2, WALL_Z);
  put(g, mesh(new BoxGeometry(LEN - 0.2, 0.1, 0.3), GOLD, 0, 0, 0, true), CX, FY + WALL_H + 0.05, WALL_Z);
  put(g, mesh(new BoxGeometry(LEN - 0.3, 0.08, 0.24), GOLD), CX, FY + 1.0, WALL_Z);
  for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.42) bulbs.push({ geo: G.sphere, at: [x - CX, FY + WALL_H + 0.16, WALL_Z - CZ + 0.05], scale: [0.07, 0.07, 0.07] });
  put(g, mesh(new BoxGeometry(3.5, 1.1, 0.16), 0x5A1420, 0, 0, 0, true), CX, FY + WALL_H + 0.75, WALL_Z);
  put(g, new Mesh(new PlaneGeometry(3.3, 1.03), new MeshBasicMaterial({ map: SIGN.tex })), CX, FY + WALL_H + 0.75, WALL_Z + 0.09);
  g.add(mesh(bake(bulbs), bulbMat));
  // two smokestacks at the stern, behind the wall
  for (const x of [x0 + 0.9, x0 + 1.7]) {
    put(g, mesh(new CylinderGeometry(0.24, 0.28, 3.4, 14), 0x22303C, 0, 0, 0, true), x, FY + 1.7, z0 + 0.65);
    put(g, mesh(new CylinderGeometry(0.34, 0.26, 0.24, 14), GOLD, 0, 0, 0, true), x, FY + 3.45, z0 + 0.65);
  }
  // the paddle wheel off the stern, turning slowly on its axle across the beam, under a red housing
  const WX = x0 - 1.1, WY = FY + 0.15;
  const wheel = put(g, new Group(), WX, WY, CZ);
  const paddles: Part[] = [];
  for (let i = 0; i < 6; i++) paddles.push({ geo: G.box, at: [0, 0, 0], rot: [0, 0, i / 6 * Math.PI], scale: [2.1, 0.08, 2.1] });
  wheel.add(mesh(bake(paddles), STRIPE, 0, 0, 0, true));
  for (const z of [-1.08, 1.08]) wheel.add(mesh(new TorusGeometry(1.05, 0.05, 6, 24), GOLD, 0, 0, z, true));
  for (const z of [-1.25, 1.25]) put(g, mesh(new BoxGeometry(1.3, 0.14, 0.14), WOOD, 0, 0, 0, true), x0 - 0.55, WY, CZ + z);
  put(g, mesh(new BoxGeometry(1.0, 0.16, 2.7), STRIPE, 0, 0, 0, true), WX, WY + 1.2, CZ);
  return { g, wheel };
}

/** The jetty along the shore from the dock's west fence, and the pier from its end out to the boat, on posts. */
function buildJetty() {
  const x0 = PIER_X - 0.55, x1 = -8.0;
  const jetty = piece((x0 + x1) / 2, JETTY_Z);
  const top = (rx: number, ry: number) => new MeshLambertMaterial({ map: planks('#C3875D', '#CF946A', rx, ry) });
  const sideMat = new MeshLambertMaterial({ color: 0x9C6644 });
  const deck = (w: number, d: number, rx: number, ry: number) => new Mesh(new BoxGeometry(w, 0.2, d), [sideMat, sideMat, top(rx, ry), sideMat, sideMat, sideMat]);
  put(jetty, deck(x1 - x0, 1.1, 3, 0.4), (x0 + x1) / 2, FY - 0.1, JETTY_Z).receiveShadow = true;
  const posts: Part[] = [];
  for (let x = x0 + 0.15; x < x1; x += 1.4) {
    if (Math.abs(x - PIER_X) > 0.7) posts.push({ geo: G.log, at: [x - jetty.position.x, FY + 0.15, -0.6], scale: [0.6, 0.6, 0.6] });
    posts.push({ geo: G.log, at: [x - jetty.position.x, FY + 0.15, 0.6], scale: [0.6, 0.6, 0.6] });
  }
  jetty.add(mesh(bake(posts), 0xB0724A, 0, 0, 0, true));
  const z0 = BOAT.z1, z1 = JETTY_Z - 0.55;
  const pier = piece(PIER_X, (z0 + z1) / 2);
  put(pier, deck(1.1, z1 - z0, 0.4, 1), PIER_X, FY - 0.1, (z0 + z1) / 2).receiveShadow = true;
  const piles: Part[] = [];
  for (const x of [-0.6, 0.6]) for (const z of [z0 + 0.3, (z0 + z1) / 2, z1 - 0.1]) piles.push({ geo: G.log, at: [x, 0, z - pier.position.z], scale: [0.7, 1.0, 0.7] });
  pier.add(mesh(bake(piles), 0xB0724A, 0, 0, 0, true));
  return [jetty, pier];
}

let boat: ReturnType<typeof buildBoat> | null = null;
let pieces: Object3D[] = [];
/** The jetty, the pier and the boat, once it's in. */
export const casinoPieces = () => pieces;

/** The 'roulette' unlock: the boat comes in, with the jetty and pier out to it and its roulette table. */
export function enableCasino(): Object3D[] {
  casinoBoat.open = true;
  openJettyGap();
  boat = buildBoat();
  pieces = [...buildJetty(), boat.g];
  return [...pieces, enableRoulette()];
}

/** Keeps the player out of the games' tables and machines. */
export function collideCasino(p: XZ) {
  if (!boat) return;
  collideRoulette(p); collideBlackjack(p); collideSlots(p);
}

export function updCasino(dt: number) {
  if (!boat) return;
  boat.wheel.rotation.z += dt * 0.6;
  updRoulette(dt);
  updBlackjack(dt);
  updSlots(dt);
}
