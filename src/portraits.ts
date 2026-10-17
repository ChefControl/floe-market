// The wrestlers' faces for the fight's UI (gong.ts): the champion, a local, and each boss, rendered once from their own
// models, face on and close, the first time each is wanted, into a picture the page can show. One model of their own,
// out of the world (dressed as each in turn), in a little scene of their own with a key light and a fill. Built with
// dice of their own (kit.ts), so the luck never hears of it. Where the renderer can't (no WebGL), there's no picture,
// and the UI keeps the emoji it shows meanwhile.
import { Box3, DirectionalLight, HemisphereLight, type Mesh, type Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderTarget } from 'three';
import { type Kind, LOOKS } from './creatures';
import { apart, dice } from './kit';
import { renderer } from './render';
import { CHAMP_BELT, LOCAL_BELTS, pose, RikishiModel } from './rikishi';

/** Whose face: the champion, a local, or a boss by his creature. */
export type Who = 'champ' | 'local' | Kind;
/** How big the picture is, in pixels (shown at 40 to 52 CSS pixels, on screens up to 3 pixels to one). */
const SIZE = 192;
/** How much room the face gets round it, and how far over its middle the camera looks (of the head's height). */
const ROOM = 1.05, LIFT = 0.04;
/** The part of the head (what's on the neck, bottom to top) that's his face, where it isn't all of it: the shark's
 *  under the fin on his crown, the puffer's under his spines but over his chin. */
const FACE: Partial<Record<Who, [number, number]>> = { shark: [0, 0.8], puffer: [0.25, 0.95] };

const pics = new Map<Who, string | null>();
let kit: { scene: Scene; cam: PerspectiveCamera; model: RikishiModel; target: WebGLRenderTarget } | null = null;
const at = new Vector3(), fwd = new Vector3(), size = new Vector3(), box = new Box3(), part = new Box3();
/** What shows of `o` and everything on it, boxed (where it stands in the world). */
function boxOf(o: Object3D) {
  box.makeEmpty();
  o.traverseVisible(c => {
    const g = (c as Mesh).isMesh ? (c as Mesh).geometry : null;
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    box.union(part.copy(g.boundingBox!).applyMatrix4(c.matrixWorld));
  });
  return box;
}

/** Whether this renderer can draw off the screen and read it back (not in a test's stub). */
const able = () => typeof (renderer as { readRenderTargetPixels?: unknown }).readRenderTargetPixels === 'function';

function setUp() {
  return apart(() => {
    const scene = new Scene();
    // a warm key from up front and to his right, the cellar's lamps; a cool fill from below
    scene.add(new HemisphereLight(0xFFF4E6, 0x50586A, 0.62 * Math.PI));
    const key = new DirectionalLight(0xFFF1DC, 0.5 * Math.PI);
    key.position.set(-1.5, 2.5, 3);
    scene.add(key);
    const model = new RikishiModel(CHAMP_BELT);
    scene.add(model);
    const cam = new PerspectiveCamera(30, 1, 0.05, 20);
    const target = new WebGLRenderTarget(SIZE, SIZE, { samples: 4 });
    return { scene, cam, model, target };
  }, dice(0xFACE5));
}

function draw(who: Who): string | null {
  kit ??= setUp();
  const { scene, cam, model, target } = kit;
  apart(() => {
    if (who === 'champ') model.dressAs({ skin: 0xF3C9A4, belt: CHAMP_BELT }, 170);
    else if (who === 'local') model.dressAs({ skin: 0xF3C9A4, belt: LOCAL_BELTS[0] }, 140);
    else model.dressAs(LOOKS[who], who === 'puffer' ? 200 : 170);
  }, dice(0xFACE5 + who.length));
  model.apply(pose(), 0);
  scene.updateMatrixWorld(true);
  // the head (all that's on the neck), filling the picture: the camera straight out in front of it, as far off as the
  // field of view needs
  boxOf(model.neck);
  const [lo, hi] = FACE[who] ?? [0, 1], y0 = box.min.y, h = box.max.y - y0;
  box.min.y = y0 + h * lo; box.max.y = y0 + h * hi;
  box.getCenter(at);
  box.getSize(size);
  model.getWorldDirection(fwd);
  const tall = Math.max(size.y, Math.min(size.x, size.y * 1.4)) * ROOM, far = tall / 2 / Math.tan((cam.fov / 2) * Math.PI / 180) + size.z / 2;
  at.y += tall * LIFT;
  cam.position.copy(at).addScaledVector(fwd, far);
  cam.lookAt(at);
  cam.updateProjectionMatrix();
  // (cleared to nothing, so the face sits on whatever colour the UI gives it)
  const was = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), shadows = renderer.shadowMap.enabled;
  renderer.setRenderTarget(target);
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = false;
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(was);
  renderer.setClearAlpha(alpha);
  renderer.shadowMap.enabled = shadows;
  // (read bottom row first: turned the right way up)
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(SIZE, SIZE), row = SIZE * 4;
  for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * row, (SIZE - y) * row), y * row);
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** `who`'s face as a picture's address, rendered the first time it's asked for; null where it can't be. */
export function portrait(who: Who): string | null {
  if (pics.has(who)) return pics.get(who)!;
  let pic: string | null = null;
  if (able()) {
    try { pic = draw(who); } catch { pic = null; }
  }
  pics.set(who, pic);
  return pic;
}

/** Puts `who`'s face on `el` (a `.port`), or `emoji` till there's one. */
export function showFace(el: HTMLElement, who: Who, emoji: string) {
  if (el.dataset.who === who) return;
  el.dataset.who = who;
  const pic = portrait(who);
  el.style.backgroundImage = pic ? `url("${pic}")` : '';
  el.textContent = pic ? '' : emoji;
}
