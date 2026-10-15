import { BoxGeometry, type BufferGeometry, CylinderGeometry, type Material, type Mesh, MeshLambertMaterial, Object3D } from 'three';
import { isHigh, onQuality } from './graphics';
import { type Build, pack, quietly, rbox } from './kit';
import { boxLid, boxTray, nigiri as roundNigiri, plate as roundPlate, roundSlice } from './propsKitchen';
import { bakePainted, canvasTex, type Draw, G, mesh, painted, scene } from './render';
import { rand } from './util';

// Stacks hold up to 90 of these, so each draws in one call. three.js draws a mesh once per face group, even when
// the groups share a material, so a box with a picture on top and plain sides would cost six. Instead each item has
// one texture: the top's picture, a few rows repeating its bottom edge (so it blurs into itself, as at the clamped
// edge it had before), then a strip of the side colour that every other face samples from its middle.
const GUTTER = 4, STRIP = 8;

/**
 * One material and geometry for an item: `geo`'s `top` groups show `draw` (w×h), the other faces `side`. `fit` lays
 * the same picture over another shape made the same way (High's rounder one), so both share the texture.
 */
function oneSkin(geo: BufferGeometry, top: number[], side: string, w: number, h: number, draw: Draw) {
  const H = h + GUTTER + STRIP;
  const { tex } = canvasTex(w, H, c => {
    draw(c, w, h);
    c.drawImage(c.canvas, 0, h - 1, w, 1, 0, h, w, GUTTER);
    c.fillStyle = side; c.fillRect(0, h + GUTTER, w, STRIP);
  });
  // Canvas row 0 is the texture's top (v = 1), so the picture spans v from 1 - h/H to 1 and the strip 0 to STRIP/H.
  const fit = (geo: BufferGeometry) => {
    const g = geo.clone(), uv = g.attributes.uv, k = h / H, done = new Set<number>();
    for (const grp of g.groups) {
      const onTop = top.includes(grp.materialIndex ?? 0);
      for (let i = grp.start; i < grp.start + grp.count; i++) {
        // a face's triangles share its vertices (but faces don't share theirs), so each is moved once
        const v = g.index!.getX(i);
        if (done.has(v)) continue;
        done.add(v);
        uv.setXY(v, onTop ? uv.getX(v) : 0.5, onTop ? 1 - k + uv.getY(v) * k : STRIP / 2 / H);
      }
    }
    g.clearGroups();
    return g;
  };
  const g = fit(geo);
  return { geo: g, mat: new MeshLambertMaterial({ map: tex }), fit };
}

// ---------- High and Low ----------
// Items come and go by the hundred, so rather than a High mesh beside each Low one (twice the meshes, and the game's
// luck), each item is one mesh that wears the Low look or the High one: the shape (and for some the material) is
// swapped when the graphics change (for every item in the scene), and as it's drawn (for any that weren't).
interface Look { geo: BufferGeometry; mat: Material }
const wearing = new WeakMap<Object3D, () => void>();
/** Dresses `m` in `low` or `high` for the graphics there are, now and from then on. */
function looks<T extends Mesh>(m: T, low: Look, high: Look) {
  const wear = () => {
    const l = isHigh() ? high : low;
    if (m.geometry !== l.geo) { m.geometry = l.geo; m.material = l.mat; }
  };
  wear();
  m.onBeforeRender = wear;
  wearing.set(m, wear);
  return m;
}
onQuality(() => scene.traverse(o => wearing.get(o)?.()));

/**
 * A bluefin tuna fillet's face, drawn on a round slice's cap (across the picture is across the fillet, up it towards the
 * tail): the dark blue skin down one long edge with a silver line and a layer of white fat under it, then the red flesh
 * with its white fat lines in chevrons pointing to the tail. In its colours: fresh, or cured.
 */
const filletFace = (flesh: string, deep: string, line: string, skin: string, sheen: string) => (c: CanvasRenderingContext2D, w: number, h: number) => {
  c.save();
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); c.clip();
  const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, deep); g.addColorStop(0.55, flesh); g.addColorStop(1, deep);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = line; c.lineWidth = 2.5; c.lineCap = 'round';
  const mid = w * 0.58;
  for (let y = -20; y < h + 40; y += 15) {
    c.beginPath(); c.moveTo(w * 0.22, y + 18); c.quadraticCurveTo(mid - 14, y + 4, mid, y); c.quadraticCurveTo(mid + 14, y + 6, w, y + 20); c.stroke();
  }
  c.lineWidth = 1.5; c.beginPath(); c.moveTo(mid, 0); c.lineTo(mid, h); c.stroke();
  c.fillStyle = 'rgba(255,240,242,.85)'; c.fillRect(w * 0.17, 0, w * 0.05, h);
  c.fillStyle = sheen; c.fillRect(w * 0.14, 0, w * 0.035, h);
  c.fillStyle = skin; c.fillRect(0, 0, w * 0.145, h);
  c.restore();
};
/** Pulls a round slice out into a block off the loin: longer than it's wide, narrowing towards the tail end (+x). */
function asFillet(geo: BufferGeometry, r = 0.19) {
  const g = geo.clone(), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), w = 0.85 * (1 - 0.38 * Math.max(0, x / r));
    p.setXYZ(i, x * 1.12, p.getY(i), p.getZ(i) * w);
    n.setXYZ(i, n.getX(i) / 1.12, n.getY(i), n.getZ(i) / w);
  }
  g.normalizeNormals();
  return g;
}
const fillet = oneSkin(asFillet(G.fillet), [1, 2], '#C62F48', 128, 128, filletFace('#E23A57', '#B81F3D', 'rgba(255,226,232,.8)', '#16203A', '#6F8CB8'));
/** The same fillet out of the salt barrel: cured brown. */
const cured = oneSkin(asFillet(G.fillet), [1, 2], '#7A4626', 128, 128, filletFace('#AE6A3E', '#8A4E2C', 'rgba(242,214,178,.7)', '#2B2622', '#8A7A6A'));

// box faces: +x, -x, +y (the top), -y, +z, -z
const bill = oneSkin(G.bill, [2], '#3FAE52', 128, 80, (c, w, h) => {
  c.fillStyle = '#55C866'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2E8C40'; c.lineWidth = 6; c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = '#2E8C40'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('$', w / 2, h / 2 + 3);
});

/** High's items: the same pictures, on rounded shapes of the same size. */
const ROUND = quietly(() => ({
  fillet: fillet.fit(asFillet(roundSlice(0.19, 0.08, 0.022))),
  cured: cured.fit(asFillet(roundSlice(0.19, 0.08, 0.022))),
  bill: bill.fit(rbox(0.4, 0.06, 0.24, 0.012)),
}));

/** What a carried or stocked item is, so mixed stacks can be sorted at drop-offs. */
export type Kind = 'fish' | 'rice' | 'box' | 'bowl' | 'rrice' | 'cfish' | 'mush';
export const kindOf = (m: Object3D): Kind | undefined => m.userData.kind;

/** A fish slice (drawn as a block of bluefin tuna fillet), as it comes off the chopping block. */
export function newFillet() {
  const m = looks(mesh(fillet.geo, fillet.mat), fillet, { geo: ROUND.fillet, mat: fillet.mat });
  m.userData.kind = 'fish';
  return m;
}

const sack = oneSkin(new BoxGeometry(0.3, 0.08, 0.24), [2], '#E6DBC0', 64, 64, c => {
  c.fillStyle = '#F1E8D2'; c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#C0392B'; c.fillRect(0, 26, 64, 12);
  c.fillStyle = '#FFFDF5'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('米', 32, 33);
});
const roundSack = quietly(() => sack.fit(rbox(0.3, 0.08, 0.24, 0.032)));

/** A bag of rice: enough for one plate. */
export function newRice() {
  const m = looks(mesh(sack.geo, sack.mat, 0, 0, 0, true), sack, { geo: roundSack, mat: sack.mat });
  m.userData.kind = 'rice';
  return m;
}

const boxGeo = new BoxGeometry(0.34, 0.08, 0.26), lidGeo = new BoxGeometry(0.35, 0.025, 0.27);
/** High: a rounded box, its lid banded with paper (cream on red; red on the premium menu's gold). */
const baked = (b: Build): Look => ({ geo: pack(b.pieces), mat: painted });
const BOX = quietly(() => ({
  tray: baked(boxTray()), lid: baked(boxLid(0xC0392B, 0xF4EBDD, 0xC0392B)), gold: baked(boxLid(0xF2C14E, 0xC0392B, 0xF2C14E)),
}));

/** A takeout box of sushi; `value` is its price. */
export function newBox(value: number, premium: boolean) {
  const m = mesh(boxGeo, 0x22262B, 0, 0, 0, true);
  looks(m, { geo: boxGeo, mat: m.material as Material }, BOX.tray);
  const lid = mesh(lidGeo, premium ? 0xF2C14E : 0xC0392B, 0, 0.045, 0);
  m.add(looks(lid, { geo: lidGeo, mat: lid.material as Material }, premium ? BOX.gold : BOX.lid));
  m.userData.kind = 'box';
  m.userData.value = value;
  return m;
}

const bowlGeo = new CylinderGeometry(0.17, 0.11, 0.1, 14), stewGeo = new CylinderGeometry(0.155, 0.155, 0.01, 14);
const bitGeo = new BoxGeometry(0.05, 0.03, 0.05), capGeo = new CylinderGeometry(0.03, 0.075, 0.05, 9);
/** A bowl of chanko from the pot in the cellar (stage 3): rice and fish in it, and mushrooms too once there are some
 *  (`mush`, a bowl that sells for double). */
export function newBowl(mush = false) {
  const m = mesh(bowlGeo, 0xA8322D, 0, 0, 0, true);
  // (the stew a little over the bowl's top, not level with it: two faces at one height flicker)
  m.add(mesh(stewGeo, mush ? 0xA8743E : 0xC98A3E, 0, 0.056, 0));
  for (const [x, z, c] of [[-0.05, 0.03, 0x6FAF4F], [0.06, -0.02, 0xF4F1EA], [0.0, -0.07, 0xE59A6B]] as const) m.add(mesh(bitGeo, c, x, 0.068, z));
  if (mush) m.add(mesh(capGeo, 0x7A5236, 0.04, 0.075, 0.06));
  m.userData.kind = 'bowl';
  m.userData.mush = mush;
  return m;
}

// The cellar's ingredients once a line has done its work: a ball of washed, dried rice; a salted fish, gone brown; a
// mushroom from the grow room.
const ballGeo = new CylinderGeometry(0.1, 0.12, 0.09, 10);
const stemGeo = new CylinderGeometry(0.035, 0.04, 0.08, 7), bigCapGeo = new CylinderGeometry(0.04, 0.13, 0.07, 10);
/** Rice off the racks, ready for the pot. */
export function newReadyRice() {
  const m = mesh(ballGeo, 0xFFFBEF, 0, 0, 0, true);
  m.add(mesh(new BoxGeometry(0.06, 0.092, 0.02), 0x2E3A2E, 0, 0, 0.11));
  m.userData.kind = 'rrice';
  return m;
}
/** Fish out of the salt barrels: the market's fillet, cured brown. */
export function newCuredFish() {
  const m = looks(mesh(cured.geo, cured.mat, 0, 0, 0, true), cured, { geo: ROUND.cured, mat: cured.mat });
  m.userData.kind = 'cfish';
  return m;
}
/** A mushroom, picked. */
export function newMushroom() {
  const m = mesh(stemGeo, 0xEDE2CC, 0, 0, 0, true);
  m.add(mesh(bigCapGeo, 0x8C6542, 0, 0.06, 0));
  m.userData.kind = 'mush';
  return m;
}

export function newBill(v: number) {
  const m = looks(mesh(bill.geo, bill.mat), bill, { geo: ROUND.bill, mat: bill.mat });
  m.userData.value = v;
  m.rotation.y = rand(-.15, .15);
  return m;
}

/** Cash value carried by a bill mesh. */
export const billValue = (b: Object3D): number => b.userData.value;
export const addBillValue = (b: Object3D, v: number) => { b.userData.value += v; };

const plateGeo = new CylinderGeometry(0.2, 0.16, 0.035, 16);
const riceGeo = new BoxGeometry(0.09, 0.055, 0.15), fishGeo = new BoxGeometry(0.1, 0.025, 0.17);
const SALMON = 0xFF8A5C, TUNA = 0xD8394B;
/** The nigiri on a plate, baked into one mesh: rice, with its fish on top. */
const nigiri = (tops: number[]) => bakePainted(tops.flatMap((c, i) => {
  const x = (i - (tops.length - 1) / 2) * 0.11;
  return [{ geo: riceGeo, c: 0xFFFDF5, at: [x, 0.045, 0] }, { geo: fishGeo, c, at: [x, 0.085, 0] }];
}));
const NIGIRI = { plain: nigiri([SALMON, SALMON]), premium: nigiri([TUNA, SALMON, TUNA]) };
/** High: plates with a foot, a well and a line round the rim (navy on white, darker gold on gold), and rounder nigiri. */
const PLATE = quietly(() => ({
  plain: baked(roundPlate(0xF4F7FA, 0x2C4A6B)), premium: baked(roundPlate(0xF2C14E, 0xB8862A)),
  nigiri: baked(roundNigiri([SALMON, SALMON])), premiumNigiri: baked(roundNigiri([TUNA, SALMON, TUNA])),
}));

/** A sushi plate: two salmon nigiri, or three on a gold plate from the premium menu. `value` is its price. */
export function newPlate(value: number, premium: boolean) {
  const p = mesh(plateGeo, premium ? 0xF2C14E : 0xF4F7FA, 0, 0, 0, true);
  looks(p, { geo: plateGeo, mat: p.material as Material }, premium ? PLATE.premium : PLATE.plain);
  const n = mesh(premium ? NIGIRI.premium : NIGIRI.plain, painted);
  p.add(looks(n, { geo: n.geometry, mat: painted }, premium ? PLATE.premiumNigiri : PLATE.nigiri));
  p.userData.value = value;
  return p;
}
