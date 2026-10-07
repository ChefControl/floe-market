// Flat canvas-textured markings on the deck: pads, drop zones and unlock tiles.
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { CAM_YAW, canvasTex, FONT, rr, scene, type CanvasTex, type Draw } from './render';

export interface Decal extends CanvasTex {
  mesh: Mesh;
}

export function decal(size: number, draw: Draw): Decal {
  const ct = canvasTex(256, 256, draw);
  const m = new Mesh(
    new PlaneGeometry(size, size),
    new MeshBasicMaterial({ map: ct.tex, transparent: true, depthWrite: false }),
  );
  m.rotation.set(-Math.PI / 2, 0, CAM_YAW);
  m.renderOrder = 1;
  scene.add(m);
  return { mesh: m, ...ct };
}

function iconText(c: CanvasRenderingContext2D, w: number, icon: string, y: number, size: number) {
  c.font = size + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(icon, w / 2, y);
}

export function drawPad(c: CanvasRenderingContext2D, w: number, h: number, icon: string) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.fill();
  c.setLineDash([24, 14]); c.lineWidth = 10; c.strokeStyle = '#fff';
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.stroke(); c.setLineDash([]);
  c.globalAlpha = .9; iconText(c, w, icon, h / 2 + 4, 96); c.globalAlpha = 1;
}

/** Lever position pad: filled in when it's the selected route. */
export function drawLeverPad(c: CanvasRenderingContext2D, w: number, h: number, icon: string, on: boolean) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = on ? 'rgba(255,107,74,.8)' : 'rgba(255,255,255,.22)';
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.fill();
  if (!on) c.setLineDash([24, 14]);
  c.lineWidth = 12; c.strokeStyle = '#fff';
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.stroke(); c.setLineDash([]);
  iconText(c, w, icon, h / 2 + 6, 120);
}

export function drawDrop(c: CanvasRenderingContext2D, w: number, h: number, icon: string) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.2)'; rr(c, 12, 12, w - 24, h - 24, 30); c.fill();
  c.setLineDash([24, 14]); c.lineWidth = 10; c.strokeStyle = '#fff';
  rr(c, 12, 12, w - 24, h - 24, 30); c.stroke(); c.setLineDash([]);
  c.globalAlpha = .9; iconText(c, w, icon, h / 2 + 4, 88); c.globalAlpha = 1;
}

/**
 * Unlock tile: fills green as it's paid off and shows the remaining price.
 * While its star requirement isn't met it's dimmed, with a lock and the rating it needs instead of the price.
 */
export function drawTile(
  c: CanvasRenderingContext2D, w: number, h: number,
  u: { paid: number; cost: number; icon: string; stars?: number; open?: boolean },
) {
  c.clearRect(0, 0, w, h);
  const locked = !!u.stars && !u.open;
  const p = Math.min(1, u.paid / u.cost);
  c.fillStyle = 'rgba(20,45,60,.3)'; rr(c, 10, 10, w - 20, h - 20, 28); c.fill();
  if (p > 0) {
    c.save(); rr(c, 10, 10, w - 20, h - 20, 28); c.clip();
    c.fillStyle = 'rgba(73,194,91,.8)';
    const fh = (h - 20) * p; c.fillRect(10, h - 10 - fh, w - 20, fh);
    c.restore();
  }
  c.setLineDash([22, 14]); c.lineWidth = 9; c.strokeStyle = '#fff';
  rr(c, 10, 10, w - 20, h - 20, 28); c.stroke(); c.setLineDash([]);
  c.globalAlpha = locked ? .45 : 1;
  iconText(c, w, u.icon, h * 0.38, 86);
  c.globalAlpha = 1;
  if (locked) iconText(c, w, '🔒', h * 0.48, 54);
  const t = locked ? '★' + u.stars!.toFixed(1) : '$' + Math.max(0, u.cost - u.paid);
  c.font = '800 58px ' + FONT; c.lineJoin = 'round'; c.lineWidth = 12; c.strokeStyle = 'rgba(20,45,60,.9)';
  c.strokeText(t, w / 2, h * 0.76);
  c.fillStyle = locked ? '#FFD24A' : '#fff'; c.fillText(t, w / 2, h * 0.76);
}
