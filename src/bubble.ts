// Order bubbles over customers' heads, with a ring that empties as their patience runs out,
// and the mood faces shown over customers further back in a queue.
import { Sprite, SpriteMaterial } from 'three';
import { canvasTex, FONT, rr } from './render';

export type OrderIcon = 'fish' | 'sushi' | 'box';

/** A blue fish with a yellow fin, like the ones in the water. */
function fishIcon(c: CanvasRenderingContext2D) {
  c.fillStyle = '#355C9E';
  c.beginPath(); c.moveTo(24, 58); c.lineTo(10, 46); c.lineTo(10, 70); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(42, 58, 22, 12, 0, 0, 7); c.fill();
  c.fillStyle = '#E3EAF0'; c.beginPath(); c.ellipse(44, 62, 17, 6, 0, 0, Math.PI); c.fill();
  c.fillStyle = '#F2C14E'; c.beginPath(); c.moveTo(36, 47); c.lineTo(46, 38); c.lineTo(50, 47); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(55, 55, 3.5, 0, 7); c.fill();
  c.fillStyle = '#1B2733'; c.beginPath(); c.arc(56, 55, 1.8, 0, 7); c.fill();
}

/** Takeout box: black with a red lid band. */
function boxIcon(c: CanvasRenderingContext2D) {
  c.fillStyle = '#22262B'; rr(c, 20, 44, 48, 30, 6); c.fill();
  c.fillStyle = '#C0392B'; rr(c, 18, 40, 52, 10, 4); c.fill();
}

function sushiIcon(c: CanvasRenderingContext2D) {
  c.fillStyle = '#FFFDF5'; rr(c, 24, 56, 40, 18, 8); c.fill();
  c.fillStyle = '#FF8A5C'; rr(c, 22, 44, 44, 16, 8); c.fill();
  c.strokeStyle = '#FFD2BC'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(34, 47); c.lineTo(39, 57); c.moveTo(47, 47); c.lineTo(52, 57); c.stroke();
}

/** Ring colour for the share of patience left. */
export const moodColor = (left: number) => left > 0.6 ? '#49C25B' : left > 0.35 ? '#F2B33D' : '#E5484D';

/** Patience in 5% steps, so a bubble is only redrawn when its ring visibly changes. */
export const patienceStep = (left: number) => Math.ceil(Math.max(0, left) * 20);

export function drawBubble(c: CanvasRenderingContext2D, w: number, h: number, n: number, left: number, icon: OrderIcon) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 58, 52, 0, 7); c.fill();
  c.beginPath(); c.moveTo(52, 104); c.lineTo(64, 124); c.lineTo(76, 104); c.fill();
  c.lineWidth = 7; c.lineCap = 'round';
  c.strokeStyle = 'rgba(23,48,66,.12)'; c.beginPath(); c.arc(64, 58, 46, 0, 7); c.stroke();
  if (left > 0) {
    c.strokeStyle = moodColor(left);
    c.beginPath(); c.arc(64, 58, 46, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.stroke();
  }
  if (icon === 'fish') fishIcon(c); else if (icon === 'sushi') sushiIcon(c); else boxIcon(c);
  c.fillStyle = '#173042'; c.font = '800 36px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('×' + n, 84, 60);
}

export type Mood = 'meh' | 'angry';
const moodMats = new Map<Mood, SpriteMaterial>();

/** Shared face sprite material for a mood. */
export function moodMat(m: Mood) {
  let mat = moodMats.get(m);
  if (!mat) {
    const t = canvasTex(64, 64, (c, w, h) => {
      c.font = '52px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(m === 'angry' ? '😠' : '😐', w / 2, h / 2 + 3);
    });
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
