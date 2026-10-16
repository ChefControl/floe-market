// The fog over the Undertow's club (stage 3), until its doors first open: from the tunnel and the arena, the room
// behind them is a bank of dark, slowly drifting smoke, the band heard through it but nothing seen. When the doorman
// lets you in, it rolls back from the doors across the room and is gone for good (a game loaded after that never sees
// it). It's a stack of flat sheets one over another, up to the back wall's height, each a cloud of its own with soft,
// ragged edges out over the rock round the room, so from the camera's slant it reads as a bank of smoke; on the
// tunnel's side it stops short at the doors, so they and the tunnel stay in plain sight. (The camera looks down from
// the south-east, so a sheet hides what's under it and behind it, never the tunnel in front of it.)
import { Color, DataTexture, Group, LinearFilter, Mesh, PlaneGeometry, RepeatWrapping, RGBAFormat, ShaderMaterial, Vector2, Vector4 } from 'three';
import { CY, parts } from './cellar';
import { CLUB_DOOR } from './cellarPlan';
import { F } from './fight';
import { DEN, LOANS } from './layout';

const D = CLUB_DOOR;
/** What it covers: the room, Harry's office through its west wall, and the way in from the doors, out over the rock
 *  round them, but not past the doors. */
const RECT = { x0: LOANS.x0 - 1.1, x1: D.x - 0.12, z0: DEN.z0 - 0.5, z1: DEN.z1 + 1.1 };
/** The sheets' heights, from the floor to just over the back wall. */
const SHEETS = [0.15, 0.6, 1.1, 1.6, 2.15, 2.65, 3.05];
/** Seconds it takes to roll back off the room (most of it once the camera's back from the doors), and how far it has
 *  to go from the doors to the far corner. */
const LIFT = 5, FAR = Math.hypot(D.x - RECT.x0, Math.max(D.z0 - RECT.z0, RECT.z1 - D.z1)) + 2;

/** A cloud that tiles: a few layers of smooth noise, coarse to fine, from a seed of its own (the game's random numbers
 *  are left alone). */
function cloudTex(n = 128) {
  let s = 0x2F6B3A1;
  const rnd = () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const v = new Float32Array(n * n), ease = (t: number) => t * t * (3 - 2 * t);
  for (const [cells, w] of [[4, 0.5], [8, 0.25], [16, 0.15], [32, 0.1]]) {
    const g = Array.from({ length: cells * cells }, rnd), at = (i: number, j: number) => g[(j % cells) * cells + (i % cells)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / n * cells, fy = y / n * cells, i = Math.floor(fx), j = Math.floor(fy), tx = ease(fx - i), ty = ease(fy - j);
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx, bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
      v[y * n + x] += w * (top + (bottom - top) * ty);
    }
  }
  const data = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) { const c = Math.round(Math.min(1, v[k]) * 255); data.set([c, c, c, 255], k * 4); }
  const tex = new DataTexture(data, n, n, RGBAFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping; tex.magFilter = tex.minFilter = LinearFilter; tex.needsUpdate = true;
  return tex;
}

/** What every sheet shares: the cloud, the time it drifts by, and how far it's cleared from the doors (metres). */
const shared = {
  uCloud: { value: cloudTex() }, uTime: { value: 0 }, uClear: { value: -2 },
  uDoor: { value: new Vector2(D.x, (D.z0 + D.z1) / 2) }, uRect: { value: new Vector4(RECT.x0, RECT.z0, RECT.x1, RECT.z1) },
  uDark: { value: new Color(0x0B0A10) }, uLight: { value: new Color(0x3A3450) },
};
const vertexShader = `
varying vec2 vXZ;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vXZ = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
// Two drifts of the cloud make its billows; they also rag its edges (soft out over the rock, short on the doors' side and
// along the back wall, so it covers the wall to its top without spilling over the arena) and the edge of the clearing as it rolls back.
const fragmentShader = `
uniform sampler2D uCloud;
uniform float uTime, uClear, uAlpha, uHi;
uniform vec2 uDoor, uSeed;
uniform vec4 uRect;
uniform vec3 uDark, uLight;
varying vec2 vXZ;
void main() {
  float a = texture2D(uCloud, vXZ * 0.07 + uSeed + uTime * vec2(0.006, 0.004)).r;
  float b = texture2D(uCloud, vXZ * 0.17 - uSeed.yx - uTime * vec2(0.009, -0.007)).r;
  float c = a * 0.65 + b * 0.35, wob = (c - 0.5) * 1.6;
  float edge = smoothstep(0.0, 1.0, vXZ.x - uRect.x + wob) * smoothstep(0.0, 0.35, vXZ.y - uRect.y + wob * 0.25)
    * smoothstep(0.0, 1.1, uRect.w - vXZ.y + wob) * smoothstep(0.0, 0.3, uRect.z - vXZ.x);
  float left = smoothstep(uClear - 1.6, uClear, distance(vXZ, uDoor) + wob * 1.4);
  float k = uAlpha * edge * left * (0.7 + 0.6 * c);
  if (k < 0.004) discard;
  gl_FragColor = vec4(mix(uDark, uLight, smoothstep(0.35, 0.8, c) * uHi), min(k, 1.0));
}`;

const fog = new Group();
SHEETS.forEach((h, i) => {
  const mat = new ShaderMaterial({
    uniforms: { ...shared, uAlpha: { value: 0.66 }, uHi: { value: h / SHEETS[SHEETS.length - 1] }, uSeed: { value: new Vector2(i * 0.37, i * 0.61) } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  });
  const sheet = new Mesh(new PlaneGeometry(RECT.x1 - RECT.x0, RECT.z1 - RECT.z0), mat);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set((RECT.x0 + RECT.x1) / 2, CY + h, (RECT.z0 + RECT.z1) / 2);
  sheet.renderOrder = 2 + i;
  fog.add(sheet);
});
parts.den.add(fog);

/** How far it's rolled back, 0 (over the whole room) to 1 (gone), and whether it's rolling back now. */
let k = 0, lifting = false;
/** The doors are open for the first time: the fog rolls back off the room. */
export function liftFog() { lifting = true; }
/** How much of the fog's left, 1 to 0, for tests. */
export const fogLeft = () => (fog.visible ? 1 - k : 0);

/** The fog, every frame: drifting, and rolling back once the doors are open (gone at once on loading a game in which
 *  they've been opened). */
export function updFog(dt: number) {
  if (lifting) { k = Math.min(1, k + dt / LIFT); if (k >= 1) lifting = false; }
  else k = F.den.door ? 1 : 0;
  fog.visible = k < 1;
  if (!fog.visible) return;
  shared.uTime.value += dt;
  // (easing off the doors and across the room, slowing at the far wall)
  shared.uClear.value = -2 + k * k * (3 - 2 * k) * (FAR + 2);
}
