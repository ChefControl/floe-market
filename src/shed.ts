// The fertilizer shed (stage 2): a little storehouse like the farmhouse beside it (cream plaster, dark timber and a
// thatched roof), on a plank deck off the south end of the path, by the water wheel. It opens with the takeout
// kiosk, when all three terraces may be planted and the kiosk's drivers eat into the rice: its square sells rice
// fertilizer (shop.ts), each kind making the terraces ripen faster (rice.ts) and each a sack on the pallet beside
// the shed (looks.ts).
import {
  BoxGeometry, DoubleSide, ExtrudeGeometry, Group, type Material, MeshLambertMaterial, PlaneGeometry, Shape, Vector2,
  type Object3D,
} from 'three';
import { glowMats } from './hall';
import { Build, detail, K, quietly, rbox, tube } from './kit';
import { farmIcon, type FarmIcon } from './propsFarm';
import { SHED_YARD, shedYard } from './layout';
import { pointAt } from './pointers';
import { bake, canvasTex, FONT, G, mat, mesh, scene, type Part } from './render';
import { seasonal } from './season';
import { planks } from './world';

/** The middle of the shed's square, on the deck in front of it. */
export const SHED_AT = { x: -13.6, z: 7.25 };
/**
 * The storehouse: open to the east, toward the square and the camera, and clear of the farmhouse's roof and the
 * water wheel. `h` is its walls' height. The deck's walkable part starts east of it and its pallet of sacks.
 */
const SHED = { x0: -16.45, x1: -14.95, z0: 5.85, z1: 7.5, h: 1.2 };
/** The deck runs on under the shed to the west, and past the walkable part to the south, under the planters. */
const DECK = { x0: SHED.x0 - 0.15, z1: 8.85 };
const Y0 = SHED_YARD.y;

const XC = (DECK.x0 + SHED_YARD.x1) / 2, ZC = (SHED_YARD.z0 + DECK.z1) / 2;
/** Everything here, hidden until the shed opens. */
export const shed = new Group();
shed.position.set(XC, 0, ZC);
shed.visible = false;
scene.add(shed);
/** World x, z to the group's own. */
const lx = (x: number) => x - XC, lz = (z: number) => z - ZC;

const PLASTER = 0xEDE2CB, TIMBER = 0x5B3A26, THATCH = 0xB8894A, SOIL = 0x4A3322;

// Low: the shed as it was. High: the same, its boxes rounded off (graphics.ts). What's the same on both (the cloth,
// the gables, the pots, the lantern, the seedlings, the rake) stays in `shed`.
const [lo, hi] = quietly(() => [new Group(), new Group()]);
shed.add(lo, hi);
detail(lo, hi);
/** The rounded boxes, baked into one mesh at the end (they're painted, so all one material). */
const rounded = new Build();
/** Adds a rounded copy of each box in `parts` (G.box, sized by its scale) to `rounded`, painted `c`. */
const round = (parts: Part[], c: number, r = 0.03) => quietly(() => {
  for (const p of parts) rounded.add(rbox(...p.scale!, r), c, ...p.at, p.rot);
});
/** A rounded copy of `parts` baked into one geometry, for a textured mesh. */
const roundBake = (parts: Part[], r: number) => quietly(() => bake(parts.map(p => ({ ...p, geo: rbox(...p.scale!, r), scale: undefined }))));

// ---------- the deck ----------
{
  const w = SHED_YARD.x1 - DECK.x0, d = DECK.z1 - SHED_YARD.z0;
  const side = mat(0x8E6440), top = new MeshLambertMaterial({ map: planks('#B98A5C', '#AD7F52', 3, 2) });
  const faces = [side, side, top, side, side, side];
  lo.add(mesh(new BoxGeometry(w, Y0, d), faces, 0, Y0 / 2, 0, true));
  // a rim of darker beams along the long sides, standing just proud of the boards
  const rim: Part[] = [-1, 1].map(s => ({ geo: G.box, at: [0, Y0 + 0.01, s * (d / 2 - 0.06)], scale: [w, 0.04, 0.12] }));
  lo.add(mesh(bake(rim), 0x7A5434, 0, 0, 0, true));
  quietly(() => hi.add(mesh(rbox(w, Y0, d, 0.03), faces, 0, Y0 / 2, 0, true)));
  round(rim, 0x7A5434, 0.015);
}

// ---------- the storehouse ----------
{
  const { x0, x1, z0, z1, h } = SHED, sw = x1 - x0, sd = z1 - z0;
  const cx = lx((x0 + x1) / 2), cz = lz((z0 + z1) / 2), X0 = lx(x0), X1 = lx(x1), Z0 = lz(z0), Z1 = lz(z1);
  // plaster walls on three sides, open to the east
  const walls: Part[] = [
    { geo: G.box, at: [X0 + 0.05, Y0 + h / 2, cz], scale: [0.1, h, sd] },
    { geo: G.box, at: [cx, Y0 + h / 2, Z0 + 0.05], scale: [sw, h, 0.1] },
    { geo: G.box, at: [cx, Y0 + h / 2, Z1 - 0.05], scale: [sw, h, 0.1] },
  ];
  lo.add(mesh(bake(walls), PLASTER, 0, 0, 0, true));
  round(walls, PLASTER, 0.025);
  // the timber frame: corner posts, a beam round the top, a rail half-way up the end walls, and sills
  const frame: Part[] = [];
  for (const x of [X0 + 0.05, X1 - 0.05]) for (const z of [Z0 + 0.05, Z1 - 0.05]) frame.push({ geo: G.box, at: [x, Y0 + h / 2, z], scale: [0.14, h, 0.14] });
  for (const z of [Z0 + 0.05, Z1 - 0.05]) {
    frame.push({ geo: G.box, at: [cx, Y0 + h - 0.06, z], scale: [sw + 0.04, 0.14, 0.14] });
    frame.push({ geo: G.box, at: [cx, Y0 + 0.5, z], scale: [sw, 0.08, 0.13] });
    frame.push({ geo: G.box, at: [cx, Y0 + 0.06, z], scale: [sw + 0.04, 0.12, 0.14] });
  }
  for (const x of [X0 + 0.05, X1 - 0.05]) frame.push({ geo: G.box, at: [x, Y0 + h - 0.06, cz], scale: [0.14, 0.14, sd + 0.04] });
  frame.push({ geo: G.box, at: [X0 + 0.05, Y0 + 0.06, cz], scale: [0.14, 0.12, sd + 0.04] });
  lo.add(mesh(bake(frame), TIMBER, 0, 0, 0, true));
  round(frame, TIMBER, 0.03);

  // a thatched roof, its ridge running north to south, with snow on its upper half in winter
  const rise = 0.6, hd = sw / 2, a = Math.atan2(rise, hd), L = Math.hypot(hd, rise) + 0.14, top = Y0 + h + rise;
  const thatch: Part[] = [], snow: Part[] = [];
  for (const s of [-1, 1]) {
    // `s` is the slope's side: down to the east (+1) or the west (-1)
    const dx = s * Math.cos(a), dy = -Math.sin(a), nx = s * Math.sin(a), ny = Math.cos(a);
    thatch.push({ geo: G.box, at: [cx + dx * L / 2 + nx * 0.08, top + dy * L / 2 + ny * 0.08, cz], rot: [0, 0, -s * a], scale: [L, 0.16, sd + 0.5] });
    snow.push({ geo: G.box, at: [cx + dx * L * 0.27 + nx * 0.17, top + dy * L * 0.27 + ny * 0.17, cz], rot: [0, 0, -s * a], scale: [L * 0.54, 0.03, sd + 0.52] });
  }
  // layers of straw running along the ridge
  const straw = canvasTex(128, 128, (c, w, hh) => {
    c.fillStyle = '#B8894A'; c.fillRect(0, 0, w, hh);
    for (let i = 0; i < 6; i++) {
      const x = i * w / 6;
      c.fillStyle = '#9E7239'; c.fillRect(x, 0, 4, hh);
      c.fillStyle = 'rgba(214,170,98,.55)'; c.fillRect(x + 6, 0, 5, hh);
      c.strokeStyle = 'rgba(120,84,40,.45)'; c.lineWidth = 2;
      for (let k = 0; k < 9; k++) { const y = (k * 37 + i * 19) % hh; c.beginPath(); c.moveTo(x + 4, y); c.lineTo(x + w / 6 - 2, y + 6); c.stroke(); }
    }
  });
  const roof = mesh(bake(thatch), new MeshLambertMaterial({ map: straw.tex }), 0, 0, 0, true);
  const snowy = mesh(bake(snow), seasonal([0xFFFFFF, THATCH, THATCH, THATCH]));
  lo.add(roof, snowy);
  quietly(() => hi.add(mesh(roundBake(thatch, 0.05), roof.material, 0, 0, 0, true), mesh(roundBake(snow, 0.015), snowy.material)));
  const ridge = mesh(G.box, TIMBER, cx, top + 0.2, cz, true); ridge.scale.set(0.2, 0.12, sd + 0.62); lo.add(ridge);
  quietly(() => rounded.add(rbox(0.2, 0.12, sd + 0.62, 0.05), TIMBER, cx, top + 0.2, cz));
  // plaster gables closing the roof at either end
  const gable = new ExtrudeGeometry(new Shape([new Vector2(-hd, 0), new Vector2(hd, 0), new Vector2(0, rise)]), { depth: 0.1, bevelEnabled: false });
  for (const z of [Z0, Z1 - 0.1]) shed.add(mesh(gable, PLASTER, cx, Y0 + h, z, true));

  // inside: a shelf of clay pots along the back wall, and a crate
  const shelf = mesh(G.box, 0x8A6240, X0 + 0.25, Y0 + 0.72, cz, true); shelf.scale.set(0.26, 0.05, sd - 0.3); lo.add(shelf);
  round([{ geo: G.box, at: [X0 + 0.25, Y0 + 0.72, cz], scale: [0.26, 0.05, sd - 0.3] }], 0x8A6240, 0.02);
  const pots: Part[] = [-0.5, -0.2, 0.12, 0.42].map((dz, i) => ({
    geo: G.cyl, at: [X0 + 0.25, Y0 + 0.82 + (i % 2) * 0.02, cz + dz], scale: [0.08 + (i % 2) * 0.02, 0.17 + (i % 2) * 0.04, 0.08 + (i % 2) * 0.02],
  }));
  shed.add(mesh(bake(pots), 0xB5623B, 0, 0, 0, true));
  const crate = mesh(G.box, 0xA27A4E, X0 + 0.4, Y0 + 0.17, Z0 + 0.38, true); crate.scale.set(0.38, 0.34, 0.42); lo.add(crate);
  quietly(() => {
    rounded.add(rbox(0.38, 0.34, 0.42, 0.03), 0xA27A4E, X0 + 0.4, Y0 + 0.17, Z0 + 0.38);
    // its slats' bands round it
    for (const dy of [-0.1, 0.1]) rounded.add(rbox(0.4, 0.05, 0.44, 0.015), 0x8A6240, X0 + 0.4, Y0 + 0.17 + dy, Z0 + 0.38);
  });

  // a green noren over the doorway, split in three, with the sprig across it
  const noren = canvasTex(256, 96, (c, w, hh) => {
    c.clearRect(0, 0, w, hh);
    c.fillStyle = '#2F6B3E';
    for (let i = 0; i < 3; i++) c.fillRect(i * w / 3 + 3, 0, w / 3 - 6, hh);
    c.fillRect(0, 0, w, 14);
    c.fillStyle = '#F4EBD6'; c.beginPath(); c.arc(w / 2, hh / 2 + 6, 30, 0, Math.PI * 2); c.fill();
    farmIcon(c, 'sprig', w / 2, hh / 2 + 6, 46);
  });
  const cloth = new MeshLambertMaterial({ map: noren.tex, transparent: true, alphaTest: 0.5, side: DoubleSide });
  const nh = 0.52;
  const curtain = mesh(new PlaneGeometry(sd - 0.3, nh), cloth, X1 + 0.03, Y0 + h - 0.14 - nh / 2, cz);
  curtain.rotation.y = Math.PI / 2; shed.add(curtain);

  // a sign on the south end of the ridge, leaning back to face the camera
  const sign = canvasTex(256, 96, (c, w, hh) => {
    c.fillStyle = '#EAD3A6'; c.fillRect(0, 0, w, hh);
    c.strokeStyle = '#5B3424'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, hh - 8);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    farmIcon(c, 'sprig', 46, hh / 2 + 2, 58);
    c.fillStyle = '#4A2A1A'; c.font = `800 40px ${FONT}`; c.fillText('Fertilizer', 150, hh / 2 + 4);
  });
  const wood = mat(0x6B4A35);
  const board = mesh(new BoxGeometry(1.1, 0.41, 0.05), [wood, wood, wood, wood, new MeshLambertMaterial({ map: sign.tex }), wood], cx, top + 0.42, Z1 - 0.15);
  board.rotation.x = -0.45; lo.add(board);
  for (const s of [-1, 1]) {
    const post = mesh(G.box, TIMBER, cx + s * 0.4, top + 0.2, Z1 - 0.1); post.scale.set(0.06, 0.34, 0.06); lo.add(post);
  }
  quietly(() => {
    const b = mesh(rbox(1.1, 0.41, 0.05, 0.02), board.material as Material[], cx, top + 0.42, Z1 - 0.15);
    b.rotation.x = -0.45; hi.add(b);
    for (const s of [-1, 1]) rounded.add(tube(0.03, 0.035, 0.34, 8), TIMBER, cx + s * 0.4, top + 0.2, Z1 - 0.1);
  });

  // a red paper lantern hung from the south-east corner of the eaves, which glows at dusk like the restaurant's
  const paper = new MeshLambertMaterial({ color: 0xE0392B, emissive: 0xB0250F, emissiveIntensity: 0.12 });
  glowMats.push(paper);
  const lX = X1 + 0.16, lY = Y0 + h - 0.3, lZ = Z1 - 0.12;
  const lantern = mesh(G.sphere, paper, lX, lY, lZ, true); lantern.scale.set(0.12, 0.16, 0.12); shed.add(lantern);
  const caps: Part[] = [-1, 1].map(d => ({ geo: G.cyl, at: [lX, lY + d * 0.15, lZ], scale: [0.065, 0.03, 0.065] }));
  caps.push({ geo: G.cyl, at: [lX, lY + 0.27, lZ], scale: [0.008, 0.2, 0.008] });
  shed.add(mesh(bake(caps), 0x1B2430));

  // a rake leaning on the south wall
  const rake = new Group(); rake.position.set(lx(-16.0), Y0, Z1 + 0.1); rake.rotation.x = -0.16; shed.add(rake);
  const handle = mesh(G.cyl, 0x9A7A4E, 0, 0.62, 0, true); handle.scale.set(0.022, 1.24, 0.022); rake.add(handle);
  const head: Part[] = [{ geo: G.box, at: [0, 1.24, 0], scale: [0.34, 0.04, 0.04] }];
  for (let i = 0; i < 6; i++) head.push({ geo: G.box, at: [-0.15 + i * 0.06, 1.24, 0.04], scale: [0.015, 0.015, 0.08] });
  rake.add(mesh(bake(head), 0x6E7378, 0, 0, 0, true));
}

// ---------- around it ----------
{
  // seedlings in planters along the deck's south edge
  const boxes: Part[] = [], soil: Part[] = [], shoots: Part[] = [];
  for (const x of [-13.55, -12.35]) {
    boxes.push({ geo: G.box, at: [lx(x), Y0 + 0.12, lz(8.68)], scale: [0.62, 0.24, 0.28] });
    soil.push({ geo: G.box, at: [lx(x), Y0 + 0.235, lz(8.68)], scale: [0.56, 0.02, 0.22] });
    for (let i = 0; i < 5; i++) shoots.push({ geo: G.cone, at: [lx(x) - 0.22 + i * 0.11, Y0 + 0.31, lz(8.68) + (i % 2 ? 0.04 : -0.04)], scale: [0.045, 0.16, 0.045] });
  }
  lo.add(mesh(bake(boxes), 0x8A6240, 0, 0, 0, true));
  round(boxes, 0x8A6240, 0.03);
  shed.add(mesh(bake(soil), SOIL));
  shed.add(mesh(bake(shoots), 0x5E9B3E, 0, 0, 0, true));

  // a wheelbarrow of compost parked on the ground against the terrace wall, north of the deck, by the sacks
  const barrow = new Group(); barrow.position.set(lx(-12.9), 0, lz(5.4)); shed.add(barrow);
  const barrowLo = quietly(() => new Group()); barrow.add(barrowLo);
  const tray = mesh(new BoxGeometry(0.6, 0.18, 0.36), 0x4F7F9A, 0.05, 0.36, 0, true); tray.rotation.z = 0.06; barrowLo.add(tray);
  const heap = mesh(G.sphere, SOIL, 0.05, 0.46, 0, true); heap.scale.set(0.26, 0.1, 0.15); barrow.add(heap);
  const wheel = mesh(G.cyl, 0x2B2F33, 0.42, 0.13, 0, true); wheel.scale.set(0.13, 0.06, 0.13); wheel.rotation.x = Math.PI / 2; barrow.add(wheel);
  const bars: Part[] = [];
  for (const s of [-1, 1]) {
    bars.push({ geo: G.box, at: [-0.1, 0.3, s * 0.14], rot: [0, 0, 0.12], scale: [1.0, 0.04, 0.04] });
    bars.push({ geo: G.box, at: [-0.15, 0.15, s * 0.14], scale: [0.04, 0.3, 0.04] });
  }
  barrowLo.add(mesh(bake(bars), 0x6B4A2E, 0, 0, 0, true));
  // High: the tray rounded with a rolled lip, its bars rounded, with grips on the handles
  const barrowHi = quietly(() => {
    const b = new Build();
    b.add(rbox(0.6, 0.18, 0.36, 0.04), 0x4F7F9A, 0.05, 0.36, 0, [0, 0, 0.06]);
    b.add(rbox(0.64, 0.03, 0.4, 0.015), 0x3F6A82, 0.055, 0.45, 0, [0, 0, 0.06]);
    for (const p of bars) b.add(rbox(...p.scale!, 0.015), 0x6B4A2E, ...p.at, p.rot);
    for (const s of [-1, 1]) b.add(tube(0.03, 0.03, 0.14, 8), 0x2B2F33, -0.55, 0.36, s * 0.14, [0, 0, Math.PI / 2 + 0.12]);
    return b.mesh();
  });
  barrow.add(barrowHi);
  detail(barrowLo, barrowHi);
}

// ---------- the sacks ----------
/**
 * Where the pallet stands: on the ground just north of the deck, by the shed's north-east corner, where neither its
 * eaves nor the water wheel hide it from the camera.
 */
const PALLET = { x: lx(-14.1), z: lz(5.42), y: 0 };
{
  const slats: Part[] = [];
  for (let i = 0; i < 3; i++) slats.push({ geo: G.box, at: [PALLET.x, PALLET.y + 0.07, PALLET.z - 0.16 + i * 0.16], scale: [0.95, 0.03, 0.12] });
  for (const dx of [-0.4, 0, 0.4]) slats.push({ geo: G.box, at: [PALLET.x + dx, PALLET.y + 0.03, PALLET.z], scale: [0.08, 0.06, 0.46] });
  lo.add(mesh(bake(slats), 0xA27A4E, 0, 0, 0, true));
  round(slats, 0xA27A4E, 0.012);
}
quietly(() => hi.add(rounded.mesh()));
/** Each fertilizer, in order: its sack's colour and the drawing on its label. */
const SACKS: { color: number; label: FarmIcon }[] = [
  { color: 0x7A5230, label: 'leaves' }, // compost
  { color: 0x4F7FA6, label: 'fish' }, // fish meal
  { color: 0xEDE3CC, label: 'spring' }, // spring minerals
];
/** Two side by side on the pallet, the third on top of them. */
const SACK_AT: [number, number, number][] = [[-0.23, 0.2, 0], [0.23, 0.2, 0.02], [0, 0.4, 0.01]];
/** A sack for each level of fertilizer bought, lying on the pallet in front of the shed. */
export const sacks: Object3D[] = SACKS.map(({ color, label }, i) => {
  const g = new Group();
  const [dx, y, dz] = SACK_AT[i];
  g.position.set(PALLET.x + dx, PALLET.y + y - 0.08, PALLET.z + dz);
  g.rotation.y = [0.08, -0.1, 0.2][i];
  const body = mesh(G.sphere, color, 0, 0, 0, true); body.scale.set(0.23, 0.12, 0.19); g.add(body);
  // the tied corners at either end
  const ears: Part[] = [-1, 1].map(s => ({ geo: G.sphere, at: [s * 0.22, 0.02, 0], scale: [0.06, 0.05, 0.07] }));
  g.add(mesh(bake(ears), color));
  const tag = canvasTex(64, 48, (c, w, hh) => {
    c.fillStyle = '#F4EBD6'; c.fillRect(0, 0, w, hh);
    farmIcon(c, label, w / 2, hh / 2, 40);
  });
  const sticker = mesh(new PlaneGeometry(0.2, 0.15), new MeshLambertMaterial({ map: tag.tex }), 0, 0.122, 0.01);
  sticker.rotation.x = -Math.PI / 2; g.add(sticker);
  // High: twine tied round the sack's corners
  const ties = quietly(() => {
    const b = new Build();
    for (const s of [-1, 1]) b.add(K.ring, 0xC9A66B, s * 0.18, 0.02, 0, [0, Math.PI / 2, 0], [0.05, 0.055, 0.3]);
    return b.mesh(false);
  });
  g.add(ties);
  detail(null, ties);
  g.visible = false;
  shed.add(g);
  return g;
});

/** Opens the shed (with the takeout kiosk). Returns it for the pop-in; unless `silent`, points the way to it. */
export function openShed(silent = false): Object3D[] {
  shedYard.open = true;
  shed.visible = true;
  if (!silent) pointAt({ x: SHED_AT.x, y: SHED_YARD.y, z: SHED_AT.z }, '🌿', () => shed.visible);
  return [shed];
}
