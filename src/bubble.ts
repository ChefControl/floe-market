// Order bubbles over customers' heads, with a ring that empties as their patience runs out, the mood faces shown
// over customers further back in a queue, and the same bubble without a ring for the kitchen's needs (needs.ts).
import { Sprite, SpriteMaterial } from 'three';
import { boxIcon, drawIcon, fishIcon, riceIcon, sushiIcon } from './icons';
import { canvasTex, FONT } from './render';

export type OrderIcon = 'fish' | 'sushi' | 'box' | 'rice';

/** Ring colour for the share of patience left. */
export const moodColor = (left: number) => left > 0.6 ? '#49C25B' : left > 0.35 ? '#F2B33D' : '#E5484D';

/** Patience in 5% steps, so a bubble is only redrawn when its ring visibly changes. */
export const patienceStep = (left: number) => Math.ceil(Math.max(0, left) * 20);

/** Each icon, and the box it's drawn in: x, y, width, height. */
const ICONS: Record<OrderIcon, { draw: (c: CanvasRenderingContext2D) => void; box: [number, number, number, number] }> = {
  fish: { draw: fishIcon, box: [10, 38, 54, 32] },
  sushi: { draw: sushiIcon, box: [22, 44, 44, 30] },
  box: { draw: boxIcon, box: [18, 40, 52, 34] },
  rice: { draw: riceIcon, box: [18, 38, 52, 38] },
};
/** How big the icon is drawn, the space between it and the count, and the widest the pair may be inside the ring. */
const ICON_K = 0.8, GAP = 6, ROOM = 72;

/** The white speech bubble, with its tail pointing down at the speaker. */
function balloon(c: CanvasRenderingContext2D, w: number, h: number) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 58, 52, 0, 7); c.fill();
  c.beginPath(); c.moveTo(52, 104); c.lineTo(64, 124); c.lineTo(76, 104); c.fill();
}

export function drawBubble(c: CanvasRenderingContext2D, w: number, h: number, n: number, left: number, icon: OrderIcon) {
  balloon(c, w, h);
  c.lineWidth = 7; c.lineCap = 'round';
  c.strokeStyle = 'rgba(23,48,66,.12)'; c.beginPath(); c.arc(64, 58, 46, 0, 7); c.stroke();
  if (left > 0) {
    c.strokeStyle = moodColor(left);
    c.beginPath(); c.arc(64, 58, 46, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.stroke();
  }
  pair(c, icon, '×' + n);
}

/** A bubble asking for something (`?`): no patience ring. */
export function drawNeed(c: CanvasRenderingContext2D, w: number, h: number, icon: OrderIcon, label: string) {
  balloon(c, w, h);
  pair(c, icon, label);
}

/**
 * The icon and a label side by side, centred in the bubble as a pair, both on its middle line, and shrunk together
 * if a long label would push them into the ring.
 */
function pair(c: CanvasRenderingContext2D, icon: OrderIcon, label: string) {
  const { draw, box: [bx, by, bw, bh] } = ICONS[icon];
  c.font = '800 34px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const m = c.measureText(label);
  const iw = bw * ICON_K, tw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const wide = iw + GAP + tw, k = Math.min(1, ROOM / wide);
  c.save();
  c.translate(64 - wide * k / 2, 58); c.scale(k, k);
  c.save(); c.scale(ICON_K, ICON_K); c.translate(-bx, -(by + bh / 2)); draw(c); c.restore();
  c.fillStyle = '#173042';
  c.fillText(label, iw + GAP + m.actualBoundingBoxLeft, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  c.restore();
}

export type Mood = 'meh' | 'angry';
const moodMats = new Map<Mood, SpriteMaterial>();

/** Shared face sprite material for a mood. */
export function moodMat(m: Mood) {
  let mat = moodMats.get(m);
  if (!mat) {
    const t = canvasTex(64, 64, (c, w, h) => drawIcon(c, m === 'angry' ? '😠' : '😐', w / 2, h / 2, 60));
    mat = new SpriteMaterial({ map: t.tex, depthTest: false });
    moodMats.set(m, mat);
  }
  return mat;
}

export function newMoodSprite(y: number) {
  const s = new Sprite(moodMat('meh'));
  s.scale.set(0.45, 0.45, 1); s.position.set(0, y, 0); s.renderOrder = 5; s.visible = false;
  return s;
}
