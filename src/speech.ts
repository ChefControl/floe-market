// A speech bubble over someone in the world: a white bubble with its tail towards them, the line wrapped onto up to
// three lines (Mr. Fugu at his desk, the Family and the regulars in the Undertow, the doorman). It fades in, stays as
// long as the line takes to read, and fades out. Its owner puts it where it'd be, over the speaker's head (`place`).
// Never more than a little of the view (so it's smaller close up, at a table); and while the camera's in close at
// someone's table, with his controls open, it stays in sight: pushed back inside the view if it would go off it (under
// the HUD at the top, over the panel at the bottom), and out from under another bubble up at the same time, its tail
// turned to where it would have been, over the speaker. Out in the room it stays over the speaker, on screen or off.
import { type Object3D, Sprite, SpriteMaterial, Vector3 } from 'three';
import { camera, canvasTex, FONT, rr } from './render';

const W = 512, H = 200, FADE = 0.25;
/** How long a line stays up: a few seconds, and longer the longer it is (time enough for a slow reader). */
export const readFor = (text: string) => 2.5 + text.length * 0.1;
/** The most of the view's height and width a bubble takes, and how far in from the edges of the view it's kept (all
 *  of the view, -1 to 1 across). */
const MOST = 0.13, MOST_WIDE = 0.5, EDGE = 0.03;
/** Where the bubbles placed this frame are on the screen (NDC: middle and half sizes), each under its own bubble, so the
 *  next keeps clear of them. The game's loop clears it at the start of each frame (`newBubbleFrame`); a bubble never
 *  keeps clear of itself, so one placed twice, or seen again the next frame, stays put. */
const placed = new Map<object, { x: number; y: number; hx: number; hy: number }>();
/** A new frame: the bubbles placed in the last one no longer count (main.ts, at the top of each frame). */
export function newBubbleFrame() { placed.clear(); }

const at = new Vector3(), tip = new Vector3(), fwd = new Vector3(), up = new Vector3();

type Bubble = ReturnType<typeof bubble>;
/** The vendor whose bubble alone is shown, while the player's at his pad (each place with vendors says whose, or
 *  nobody's): everyone else's are hidden till they step off. */
const vendors = new Map<string, Bubble | null>();
export function onlyVendor(where: string, b: Bubble | null) { vendors.set(where, b); }
const hiddenBy = (b: Bubble) => { for (const v of vendors.values()) if (v && v !== b) return true; return false; };

/** Where on the screen a bubble may go (NDC, -1 to 1), while the camera's in close at someone's table (`close`: a
 *  casino panel's open, his controls): under the HUD (and a fight's bar) at the top, and over the panel along the
 *  bottom. */
function room() {
  const h = window.innerHeight || 1;
  let hud = Math.min(document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0, h * 0.14);
  // (and under the fight's strip along the top, while it's up)
  const strip = document.getElementById('rush');
  if (strip && !strip.hidden) { const r = strip.getBoundingClientRect(); if (r.height && r.top < h * 0.3) hud = Math.max(hud, r.bottom); }
  let bottom = h, close = false;
  for (const p of document.querySelectorAll<HTMLElement>('.casino:not([hidden])')) {
    const r = p.getBoundingClientRect();
    if (!r.height) continue;
    close = true;
    if (r.left < window.innerWidth * 0.4) bottom = Math.min(bottom, r.top);
  }
  return { close, top: 1 - 2 * hud / h - EDGE, bottom: 1 - 2 * bottom / h + EDGE };
}

/** A bubble, `width` wide, added to `parent` (its owner places it). */
export function bubble(parent: Object3D, width = 2.6) {
  const said = canvasTex(W, H, () => {});
  const mat = new SpriteMaterial({ map: said.tex, depthTest: false, transparent: true, opacity: 0 });
  const sprite = new Sprite(mat);
  sprite.scale.set(width, width * H / W, 1); sprite.renderOrder = 6; sprite.visible = false;
  parent.add(sprite);
  let left = 0, total = 0;
  /** Where its tail's drawn: across the bottom (or the top, `tailUp`), -1 to 1, as last drawn. */
  let tail = 0, tailUp = false;
  const redraw = (text: string) => { draw(said.ctx, text, tail, tailUp); said.tex.needsUpdate = true; };
  const self = {
    sprite,
    /** What it's saying now, or '' while it's quiet. */
    text: '',
    /** Says `text`, from now. */
    say(text: string) {
      this.text = text;
      redraw(text);
      left = total = readFor(text);
      sprite.visible = true;
    },
    /** Fades it in and out; false once it's gone. */
    upd(dt: number) {
      if (!sprite.visible) return false;
      left -= dt;
      mat.opacity = hiddenBy(self) ? 0 : Math.max(0, Math.min(1, (total - left) / FADE, left / FADE));
      if (left <= 0) { sprite.visible = false; this.text = ''; placed.delete(self); }
      return sprite.visible;
    },
    /**
     * Puts it at (x, y, z) in `parent`, where it'd be, over the speaker's head; then sizes it to the view, and (in close
     * at a table) if it would go off the view brings it back in, its tail turned to where it would have been. Or, given `faceY` (the
     * speaker's face, that high over (x, z) in `parent`), its tail's turned to his face instead: for a bubble that's
     * put lower, on his chest, out of the way of his face.
     */
    place(x: number, y: number, z: number, faceY?: number) {
      sprite.position.set(x, y, z);
      sprite.getWorldPosition(at);
      camera.getWorldDirection(fwd);
      const depth = Math.max(0.1, at.clone().sub(camera.position).dot(fwd));
      const viewH = 2 * depth * Math.tan(camera.fov * Math.PI / 360);
      const k = Math.min(1, MOST * viewH / (width * H / W), MOST_WIDE * viewH * camera.aspect / width);
      const w = width * k, hgt = w * H / W;
      sprite.scale.set(w, hgt, 1);
      // (in the view's own terms: where it is, how big, and where its tail's tip would be)
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      if (faceY === undefined) tip.copy(at).addScaledVector(up, -hgt / 2);
      else { tip.set(x, faceY, z); sprite.parent?.localToWorld(tip); }
      tip.project(camera);
      const c = at.clone().project(camera);
      if (c.z > 1) return;
      const hy = hgt / viewH * 2 / 2, hx = w / (viewH * camera.aspect) * 2 / 2, r = room();
      // (out in the room, it stays where it is, over the speaker)
      const cx = r.close ? Math.max(-1 + EDGE + hx, Math.min(1 - EDGE - hx, c.x)) : c.x;
      let cy = r.close ? Math.max(r.bottom + hy, Math.min(r.top - hy, c.y)) : c.y;
      // (out from under another one already up this frame: above it if there's room, else below)
      placed.delete(self);
      for (const o of hiddenBy(self) || !r.close ? [] : placed.values()) {
        if (Math.abs(cx - o.x) >= hx + o.hx || Math.abs(cy - o.y) >= hy + o.hy) continue;
        const above = o.y + o.hy + hy, below = o.y - o.hy - hy;
        cy = above <= r.top - hy ? above : below;
      }
      if (!hiddenBy(self)) placed.set(self, { x: cx, y: cy, hx, hy });
      if (cx !== c.x || cy !== c.y) {
        const moved = new Vector3(cx, cy, c.z).unproject(camera);
        sprite.position.copy(sprite.parent ? sprite.parent.worldToLocal(moved) : moved);
      }
      // its tail towards where it'd have been: along the bottom, or (the speaker over it, at the top of the view) the top
      const t = Math.round(Math.max(-0.75, Math.min(0.75, (tip.x - cx) / hx)) * 10) / 10, u = tip.y > (faceY === undefined ? cy + hy : cy);
      if (t !== tail || u !== tailUp) { tail = t; tailUp = u; if (this.text) redraw(this.text); }
    },
    /** Takes it away at once. */
    hush() { left = 0; sprite.visible = false; this.text = ''; placed.delete(self); },
  };
  return self;
}

/** Draws `text` in a white bubble, its tail down (or up) at `tail` along it (-1 to 1), wrapped onto up to three lines. */
function draw(c: CanvasRenderingContext2D, text: string, tail = 0, tailUp = false) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff';
  const top = tailUp ? 34 : 6;
  rr(c, 6, top, W - 12, H - 40, 36); c.fill();
  const x = W / 2 + tail * (W / 2 - 60);
  c.beginPath();
  if (tailUp) { c.moveTo(x - 18, 36); c.lineTo(x, 6); c.lineTo(x + 18, 36); }
  else { c.moveTo(x - 18, H - 36); c.lineTo(x, H - 6); c.lineTo(x + 18, H - 36); }
  c.fill();
  c.font = `800 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const l = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && c.measureText(l).width < W - 60) lines[lines.length - 1] = l; else lines.push(word);
  }
  const k = Math.min(1, 3 / lines.length), mid = top + (H - 40) / 2, first = mid - (lines.length - 1) * 19 * k;
  c.save(); c.translate(W / 2, first); c.scale(k, k);
  lines.forEach((l, i) => c.fillText(l, 0, i * 38));
  c.restore();
}
