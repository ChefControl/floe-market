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

export function newSteak() {
  return mesh(G.steak, steakMats);
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
