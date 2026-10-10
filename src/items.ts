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

const steak = oneSkin(G.steak, [1, 2], '#B52E3E', 64, 64, c => {
  c.fillStyle = '#D8394B'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill();
  c.strokeStyle = '#F6D0D0'; c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 26, 0.4, 5.0); c.stroke();
  c.fillStyle = '#FFF4E6'; c.beginPath(); c.arc(41, 25, 7, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,215,215,.7)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(13, 38); c.quadraticCurveTo(30, 28, 47, 44); c.stroke();
});

// box faces: +x, -x, +y (the top), -y, +z, -z
const bill = oneSkin(G.bill, [2], '#3FAE52', 128, 80, (c, w, h) => {
  c.fillStyle = '#55C866'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2E8C40'; c.lineWidth = 6; c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = '#2E8C40'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('$', w / 2, h / 2 + 3);
});

/** High's items: the same pictures, on rounded shapes of the same size. */
const ROUND = quietly(() => ({
  steak: steak.fit(roundSlice(0.19, 0.08, 0.022)),
  bill: bill.fit(rbox(0.4, 0.06, 0.24, 0.012)),
}));

/** What a carried or stocked item is, so mixed stacks can be sorted at drop-offs. */
export type Kind = 'fish' | 'rice' | 'box';
export const kindOf = (m: Object3D): Kind | undefined => m.userData.kind;

/** A fish slice (drawn as a salmon steak), as it comes off the chopping block. */
export function newSteak() {
  const m = looks(mesh(steak.geo, steak.mat), steak, { geo: ROUND.steak, mat: steak.mat });
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
