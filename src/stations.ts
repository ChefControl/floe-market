// Fixed work stations on the deck: fishing pad, chopping block, fish pile.
import { BoxGeometry, CylinderGeometry, DoubleSide, Group, MeshLambertMaterial, TorusGeometry } from 'three';
import { decal, drawPad } from './decals';
import { Holder } from './holder';
import { canvasTex, G, mat, mesh, scene } from './render';
import { FY, V } from './util';

export const PAD = { x: -4.5, z: -5.2, r: 1.05 };
decal(2.3, (c, w, h) => drawPad(c, w, h, '🎣')).mesh.position.set(PAD.x, FY + 0.01, PAD.z);

// ---------- the chopping block ----------
// A wooden workbench with a thick end-grain board on it, a cleaver that chops the fish across into slices
// (fishing.ts), and a bucket beside it for the heads.
export const CHOP = { x: 0.5, z: -5.6 };
/** Where a fish lies on the board. */
export const chopTop = V(CHOP.x, FY + 0.82, CHOP.z);
{
  const wood = 0x8A5A3B, dark = 0x5E3B24;
  scene.add(mesh(new BoxGeometry(1.4, 0.1, 1.0), wood, CHOP.x, FY + 0.57, CHOP.z, true));
  for (const [dx, dz] of [[-0.6, -0.42], [0.6, -0.42], [-0.6, 0.42], [0.6, 0.42]]) {
    scene.add(mesh(new BoxGeometry(0.1, 0.52, 0.1), dark, CHOP.x + dx, FY + 0.26, CHOP.z + dz, true));
  }
  scene.add(mesh(new BoxGeometry(1.2, 0.05, 0.05), dark, CHOP.x, FY + 0.16, CHOP.z - 0.42));
  scene.add(mesh(new BoxGeometry(1.2, 0.05, 0.05), dark, CHOP.x, FY + 0.16, CHOP.z + 0.42));
  // the board: blocks of end grain, light and honey-coloured, with their growth rings showing
  const grain = canvasTex(256, 192, (c, w, h) => {
    const n = 8, m = 6, cw = w / n, ch = h / m;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      c.fillStyle = (i + j) % 2 ? '#D9B98C' : '#E8CFA6';
      c.fillRect(i * cw, j * ch, cw, ch);
      c.strokeStyle = 'rgba(120,80,40,.25)'; c.lineWidth = 1.5;
      for (let r = 4; r < cw * 0.7; r += 5) { c.beginPath(); c.arc(i * cw + (i % 2 ? 4 : cw - 4), j * ch + ch / 2, r, 0, Math.PI * 2); c.stroke(); }
    }
    c.strokeStyle = 'rgba(90,55,25,.4)'; c.lineWidth = 2;
    for (let i = 1; i < n; i++) { c.beginPath(); c.moveTo(i * cw, 0); c.lineTo(i * cw, h); c.stroke(); }
    for (let j = 1; j < m; j++) { c.beginPath(); c.moveTo(0, j * ch); c.lineTo(w, j * ch); c.stroke(); }
  });
  const side = mat(0xB98A5A);
  const board = mesh(new BoxGeometry(1.3, 0.16, 0.9), [side, side, new MeshLambertMaterial({ map: grain.tex }), side, side, side], CHOP.x, FY + 0.7, CHOP.z, true);
  scene.add(board);
  // the bucket the heads go in
  const tin = new MeshLambertMaterial({ color: 0x7F98A8, side: DoubleSide });
  scene.add(mesh(new CylinderGeometry(0.24, 0.2, 0.42, 14, 1, true), tin, CHOP.x - 0.98, FY + 0.21, CHOP.z + 0.25, true));
  scene.add(mesh(new CylinderGeometry(0.2, 0.2, 0.02, 14), 0x5B6B78, CHOP.x - 0.98, FY + 0.01, CHOP.z + 0.25));
  const rim = mesh(new TorusGeometry(0.24, 0.02, 6, 18), 0x5B6B78, CHOP.x - 0.98, FY + 0.42, CHOP.z + 0.25); rim.rotation.x = Math.PI / 2; scene.add(rim);
}
/** The cleaver: up over the board at BLADE_Y, resting at BLADE_HOME between fish. Its edge runs along z. */
export const BLADE_Y = FY + 1.25;
export const BLADE_HOME = V(CHOP.x + 0.45, BLADE_Y, CHOP.z);
export const blade = new Group();
{
  blade.add(mesh(new BoxGeometry(0.025, 0.24, 0.4), 0xD9E2E8, 0, 0, 0, true));
  blade.add(mesh(new BoxGeometry(0.035, 0.03, 0.4), 0x9AA9B4, 0, 0.12, 0));
  const handle = mesh(G.cyl, 0x5E3B24, 0, 0.07, 0.33, true); handle.scale.set(0.035, 0.26, 0.035); handle.rotation.x = Math.PI / 2;
  blade.add(handle);
  blade.position.copy(BLADE_HOME);
}
scene.add(blade);

export const PILE = { x: 2.7, z: -5.0 };
export const pile = new Holder(i => {
  const j = i % 9;
  return V(PILE.x + ((j % 3) - 1) * 0.42, FY + 0.05 + Math.floor(i / 9) * 0.085, PILE.z + (Math.floor(j / 3) - 1) * 0.42);
}, 54);
scene.add(mesh(new BoxGeometry(1.5, 0.04, 1.5), 0x7F98A8, PILE.x, FY + 0.01, PILE.z));
/** Where the runner stands to load up from the pile. */
export const PILE_STAND = V(PILE.x, FY, PILE.z + 1.35);
