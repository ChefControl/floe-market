// A speech bubble over someone in the world: a white bubble with its tail down, the line wrapped onto up to three lines
// (Mr. Fugu at his desk, the Family in the Undertow). It fades in, stays as long as the line takes to read, and fades out.
import { type Object3D, Sprite, SpriteMaterial } from 'three';
import { canvasTex, FONT, rr } from './render';

const W = 512, H = 200, FADE = 0.25;
/** How long a line stays up: a couple of seconds, and longer the longer it is. */
export const readFor = (text: string) => 2.2 + text.length * 0.06;

/** A bubble, `width` wide, added to `parent` (its owner places it). */
export function bubble(parent: Object3D, width = 2.6) {
  const said = canvasTex(W, H, () => {});
  const mat = new SpriteMaterial({ map: said.tex, depthTest: false, transparent: true, opacity: 0 });
  const sprite = new Sprite(mat);
  sprite.scale.set(width, width * H / W, 1); sprite.renderOrder = 6; sprite.visible = false;
  parent.add(sprite);
  let left = 0, total = 0;
  return {
    sprite,
    /** What it's saying now, or '' while it's quiet. */
    text: '',
    /** Says `text`, from now. */
    say(text: string) {
      this.text = text;
      draw(said.ctx, text); said.tex.needsUpdate = true;
      left = total = readFor(text);
      sprite.visible = true;
    },
    /** Fades it in and out; false once it's gone. */
    upd(dt: number) {
      if (!sprite.visible) return false;
      left -= dt;
      mat.opacity = Math.max(0, Math.min(1, (total - left) / FADE, left / FADE));
      if (left <= 0) { sprite.visible = false; this.text = ''; }
      return sprite.visible;
    },
    /** Takes it away at once. */
    hush() { left = 0; sprite.visible = false; this.text = ''; },
  };
}

/** Draws `text` in a white bubble with its tail down, wrapped onto up to three lines. */
function draw(c: CanvasRenderingContext2D, text: string) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff'; rr(c, 6, 6, W - 12, H - 40, 36); c.fill();
  c.beginPath(); c.moveTo(W / 2 - 18, H - 36); c.lineTo(W / 2, H - 6); c.lineTo(W / 2 + 18, H - 36); c.fill();
  c.font = `800 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const l = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && c.measureText(l).width < W - 60) lines[lines.length - 1] = l; else lines.push(word);
  }
  const k = Math.min(1, 3 / lines.length), top = (H - 34) / 2 - (lines.length - 1) * 19 * k;
  c.save(); c.translate(W / 2, top); c.scale(k, k);
  lines.forEach((l, i) => c.fillText(l, 0, i * 38));
  c.restore();
}
