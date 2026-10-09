// Flat canvas-textured markings on the deck. Circles are for doing something (fishing, dropping fish or rice off,
// the roulette table); squares are for buying (the upgrade tiles, and the upgrade squares' menus). They lie square
// with the world, and what's drawn on them (icon, price) is turned to face the camera, so it reads straight on screen.
// Each has a dark fill, a dark edge round its white dashed line and a white badge behind its icon, so it stands out
// on boards, snow and grass alike.
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { CAM_YAW, canvasTex, FONT, rr, scene, type CanvasTex, type Draw } from './render';
import { price } from './util';

export interface Decal extends CanvasTex {
  mesh: Mesh;
}

export function decal(size: number, draw: Draw): Decal {
  const ct = canvasTex(256, 256, draw);
  const m = new Mesh(
    new PlaneGeometry(size, size),
    new MeshBasicMaterial({ map: ct.tex, transparent: true, depthWrite: false }),
  );
  // flat on the ground and square with the world (the deck's boards, the walls), like everything else built on it
  m.rotation.set(-Math.PI / 2, 0, 0);
  m.renderOrder = 1;
  scene.add(m);
  return { mesh: m, ...ct };
}

/** Draws `f` turned to face the camera, about the middle of the marking. */
function facingCamera(c: CanvasRenderingContext2D, w: number, h: number, f: () => void) {
  c.save();
  c.translate(w / 2, h / 2); c.rotate(-CAM_YAW); c.translate(-w / 2, -h / 2);
  f();
  c.restore();
}

/** The marking's outline: a dark edge, then the white dashed line over it. */
function outline(c: CanvasRenderingContext2D, path: () => void) {
  c.lineWidth = 18; c.strokeStyle = 'rgba(20,45,60,.35)'; path(); c.stroke();
  c.setLineDash([22, 14]); c.lineWidth = 9; c.strokeStyle = '#fff'; path(); c.stroke(); c.setLineDash([]);
}
/** A round white badge behind an icon. */
function badge(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.lineWidth = 5; c.strokeStyle = 'rgba(20,45,60,.35)'; c.stroke();
}
const DARK = 'rgba(20,45,60,.3)';

function iconText(c: CanvasRenderingContext2D, w: number, icon: string, y: number, size: number) {
  c.font = size + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(icon, w / 2, y);
}

/** A circle to stand in and do something: fish, drop things off, bet. */
export function drawPad(c: CanvasRenderingContext2D, w: number, h: number, icon: string) {
  c.clearRect(0, 0, w, h);
  const ring = () => { c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2); };
  c.fillStyle = DARK; ring(); c.fill();
  outline(c, ring);
  badge(c, w / 2, h / 2, 60);
  facingCamera(c, w, h, () => iconText(c, w, icon, h / 2 + 3, 76));
}

/** A square to stand on and buy from a menu (the upgrade squares): an icon, and what it is under it. */
export function drawMenu(c: CanvasRenderingContext2D, w: number, h: number, icon: string, label: string) {
  c.clearRect(0, 0, w, h);
  const edge = () => rr(c, 12, 12, w - 24, h - 24, 28);
  c.fillStyle = DARK; edge(); c.fill();
  outline(c, edge);
  facingCamera(c, w, h, () => {
    badge(c, w / 2, h * 0.37, 56);
    iconText(c, w, icon, h * 0.38, 74);
    c.font = '800 46px ' + FONT; c.lineJoin = 'round'; c.lineWidth = 11; c.strokeStyle = 'rgba(20,45,60,.9)';
    c.strokeText(label, w / 2, h * 0.76);
    c.fillStyle = '#fff'; c.fillText(label, w / 2, h * 0.76);
  });
}

/**
 * Unlock tile: fills green as it's paid off and shows the remaining price.
 * While its star requirement isn't met it's dimmed, with a lock and the rating it needs instead of the price.
 * The gold one starts stage 2.
 */
export function drawTile(
  c: CanvasRenderingContext2D, w: number, h: number,
  u: { paid: number; cost: number; icon: string; stars?: number; open?: boolean; gold?: boolean },
) {
  c.clearRect(0, 0, w, h);
  const locked = !!u.stars && !u.open;
  const p = Math.min(1, u.paid / u.cost);
  c.fillStyle = u.gold ? 'rgba(242,193,78,.92)' : DARK; rr(c, 10, 10, w - 20, h - 20, 28); c.fill();
  if (p > 0) {
    c.save(); rr(c, 10, 10, w - 20, h - 20, 28); c.clip();
    c.fillStyle = 'rgba(73,194,91,.8)';
    const fh = (h - 20) * p; c.fillRect(10, h - 10 - fh, w - 20, fh);
    c.restore();
  }
  outline(c, () => rr(c, 10, 10, w - 20, h - 20, 28));
  facingCamera(c, w, h, () => {
    c.globalAlpha = locked ? 0.6 : 1;
    badge(c, w / 2, h * 0.37, 56);
    c.globalAlpha = locked ? .45 : 1;
    iconText(c, w, u.icon, h * 0.38, 74);
    c.globalAlpha = 1;
    if (locked) iconText(c, w, '🔒', h * 0.48, 54);
    const t = locked ? '★' + u.stars!.toFixed(1) : price(Math.max(0, u.cost - u.paid));
    c.font = '800 58px ' + FONT; c.lineJoin = 'round'; c.lineWidth = 12; c.strokeStyle = 'rgba(20,45,60,.9)';
    c.strokeText(t, w / 2, h * 0.76);
    c.fillStyle = locked ? '#FFD24A' : '#fff'; c.fillText(t, w / 2, h * 0.76);
  });
}
