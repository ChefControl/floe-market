import { BoxGeometry, CylinderGeometry, MeshLambertMaterial, Object3D } from 'three';
import { canvasTex, G, mat, mesh } from './render';
import { rand } from './util';

const steakTop = canvasTex(64, 64, c => {
  c.fillStyle = '#D8394B'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill();
  c.strokeStyle = '#F6D0D0'; c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 26, 0.4, 5.0); c.stroke();
  c.fillStyle = '#FFF4E6'; c.beginPath(); c.arc(41, 25, 7, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,215,215,.7)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(13, 38); c.quadraticCurveTo(30, 28, 47, 44); c.stroke();
});
const steakMats = [mat(0xB52E3E), new MeshLambertMaterial({ map: steakTop.tex }), new MeshLambertMaterial({ map: steakTop.tex })];

const billTop = canvasTex(128, 80, (c, w, h) => {
  c.fillStyle = '#55C866'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2E8C40'; c.lineWidth = 6; c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = '#2E8C40'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('$', w / 2, h / 2 + 3);
});
const billSide = mat(0x3FAE52);
const billMats = [billSide, billSide, new MeshLambertMaterial({ map: billTop.tex }), billSide, billSide, billSide];

/** What a carried or stocked item is, so mixed stacks can be sorted at drop-offs. */
export type Kind = 'fish' | 'rice' | 'box';
export const kindOf = (m: Object3D): Kind | undefined => m.userData.kind;

/** A fish slice (drawn as a salmon steak), as it comes off the chopping block. */
export function newSteak() {
  const m = mesh(G.steak, steakMats);
  m.userData.kind = 'fish';
  return m;
}

const sackTop = canvasTex(64, 64, c => {
  c.fillStyle = '#F1E8D2'; c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#C0392B'; c.fillRect(0, 26, 64, 12);
  c.fillStyle = '#FFFDF5'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('米', 32, 33);
});
const sackSide = mat(0xE6DBC0);
const sackMats = [sackSide, sackSide, new MeshLambertMaterial({ map: sackTop.tex }), sackSide, sackSide, sackSide];
const sackGeo = new BoxGeometry(0.3, 0.08, 0.24);

/** A bag of rice: enough for one plate. */
export function newRice() {
  const m = mesh(sackGeo, sackMats, 0, 0, 0, true);
  m.userData.kind = 'rice';
  return m;
}

const boxGeo = new BoxGeometry(0.34, 0.08, 0.26), lidGeo = new BoxGeometry(0.35, 0.025, 0.27);

/** A takeout box of sushi; `value` is its price. */
export function newBox(value: number, premium: boolean) {
  const m = mesh(boxGeo, 0x22262B, 0, 0, 0, true);
  m.add(mesh(lidGeo, premium ? 0xF2C14E : 0xC0392B, 0, 0.045, 0));
  m.userData.kind = 'box';
  m.userData.value = value;
  return m;
}

export function newBill(v: number) {
  const m = mesh(G.bill, billMats);
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

/** A sushi plate: two salmon nigiri, or three on a gold plate from the premium menu. `value` is its price. */
export function newPlate(value: number, premium: boolean) {
  const p = mesh(plateGeo, premium ? 0xF2C14E : 0xF4F7FA, 0, 0, 0, true);
  const tops = premium ? [TUNA, SALMON, TUNA] : [SALMON, SALMON];
  tops.forEach((c, i) => {
    const r = mesh(riceGeo, 0xFFFDF5, (i - (tops.length - 1) / 2) * 0.11, 0.045, 0);
    r.add(mesh(fishGeo, c, 0, 0.04, 0));
    p.add(r);
  });
  p.userData.value = value;
  return p;
}
