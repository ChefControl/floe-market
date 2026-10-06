// Fixed work stations on the deck: fishing pad, chopping block, steak pile.
import { BoxGeometry } from 'three';
import { decal, drawPad } from './decals';
import { Holder } from './holder';
import { mesh, scene } from './render';
import { FY, V } from './util';

export const PAD = { x: -4.5, z: -5.2, r: 1.05 };
decal(2.3, (c, w, h) => drawPad(c, w, h, '🎣')).mesh.position.set(PAD.x, FY + 0.01, PAD.z);

export const CHOP = { x: 0.5, z: -5.6 };
export const chopTop = V(CHOP.x, FY + 0.82, CHOP.z);
scene.add(mesh(new BoxGeometry(1.4, 0.7, 1.0), 0x5F7F94, CHOP.x, FY + 0.35, CHOP.z, true));
scene.add(mesh(new BoxGeometry(1.3, 0.1, 0.9), 0xE9D9C0, CHOP.x, FY + 0.75, CHOP.z, true));
export const BLADE_Y = FY + 1.25;
export const blade = mesh(new BoxGeometry(0.06, 0.42, 0.8), 0xD9E2E8, CHOP.x + 0.15, BLADE_Y, CHOP.z, true);
scene.add(blade);
scene.add(mesh(new BoxGeometry(0.08, 0.9, 0.08), 0x3C4C58, CHOP.x + 0.15, FY + 1.2, CHOP.z - 0.48, true));

export const PILE = { x: 2.7, z: -5.0 };
export const pile = new Holder(i => {
  const j = i % 9;
  return V(PILE.x + ((j % 3) - 1) * 0.42, FY + 0.05 + Math.floor(i / 9) * 0.085, PILE.z + (Math.floor(j / 3) - 1) * 0.42);
}, 54);
scene.add(mesh(new BoxGeometry(1.5, 0.04, 1.5), 0x7F98A8, PILE.x, FY + 0.01, PILE.z));
/** Where the runner stands to load up from the pile. */
export const PILE_STAND = V(PILE.x, FY, PILE.z + 1.35);
