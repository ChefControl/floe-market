// The water and the weather on the ground, on High graphics (graphics.ts): a low-poly sea whose facets roll and glint,
// foam that laps the shore and rings the floes and posts, and the shadows of clouds drifting over everything. Low
// keeps the flat sea and its two strips of foam (world.ts).
import {
  Color, CustomBlending, DoubleSide, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D,
  PlaneGeometry, RepeatWrapping, RingGeometry, ShaderMaterial, SrcColorFactor, type Texture, Vector3, ZeroFactor,
} from 'three';
import { dice, jitter, quietly } from './kit';
import { canvasTex, scene } from './render';

/** Seconds of play, shared by every shader here. */
const time = { value: 0 };
/** How high the waves roll either side of the sea's level. */
export const WAVE = 0.06;

// The sea's height at a point, in the vertex shader: three swells of different lengths crossing, the shortest giving
// the facets their tilt. (World x and z; `t` is the time.)
const SWELL = /* glsl */`
float swell(vec2 p, float t) {
  return sin(p.x * 0.8 + t * 1.1) * 0.45 + sin(p.y * 1.25 - t * 0.9 + p.x * 0.5) * 0.35
    + sin((p.x - p.y) * 2.6 + t * 1.9) * 0.2;
}`;

/**
 * The sea's surface: a plane cut into small triangles, nudged off the grid so they don't line up, that rolls with the
 * swell. Its edges stay straight, so it meets the shore and the dock where the flat sea did.
 */
export function seaGeometry(w: number, d: number) {
  const g = new PlaneGeometry(w, d, Math.round(w / 0.9), Math.round(d / 0.9));
  const p = g.attributes.position, sx = w / Math.round(w / 0.9), sy = d / Math.round(d / 0.9);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    if (Math.abs(Math.abs(x) - w / 2) > 1e-3) p.setX(i, x + jitter(-0.3, 0.3) * sx);
    if (Math.abs(Math.abs(y) - d / 2) > 1e-3) p.setY(i, y + jitter(-0.3, 0.3) * sy);
  }
  return g;
}

/**
 * The sea's material: the flat sea's colours (`map`), shaded facet by facet as the swell tilts them, and a glint off
 * the facets that catch the light. The plane lies flat (turned -90° about x), so its own z is up.
 */
export function seaMaterial(map: Texture) {
  const m = new MeshPhongMaterial({ map, flatShading: true, shininess: 30, specular: 0x203038 });
  m.onBeforeCompile = s => {
    s.uniforms.uTime = time;
    s.vertexShader = `uniform float uTime;\n${SWELL}\n` + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.z += swell((modelMatrix * vec4(position, 1.0)).xz, uTime) * ${WAVE.toFixed(3)};`);
    s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', `
      // how far this facet tilts off level shades it, and the ones tilted toward the light glint
      vec3 tilt = normal - normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      gl_FragColor.rgb *= 1.0 + dot(tilt, vec3(1.1, 1.4, 0.7)) * 1.5;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), smoothstep(0.055, 0.08, dot(tilt, normalize(vec3(-0.5, 0.8, 0.4)))) * 0.6);
      #include <fog_fragment>`);
  };
  m.customProgramCacheKey = () => 'sea';
  return m;
}

/**
 * A strip of foam `len` long, lying flat: its edge wobbles along its length, and with `lap` it slides out and back
 * like a wave washing up the shore, fading as it goes.
 */
export function foamStrip(len: number, width: number, lap = 0) {
  const m = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: lap ? 0.5 : 0.85, depthWrite: false });
  m.onBeforeCompile = s => {
    s.uniforms.uTime = time;
    s.vertexShader = 'uniform float uTime;\nvarying float vLap;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float edge = step(0.0, position.y);
      float wash = ${lap.toFixed(2)} * (0.5 + 0.5 * sin(uTime * 0.9 + position.x * 0.15));
      transformed.y += edge * (sin(position.x * 1.7 + uTime * 1.3) * 0.07 + sin(position.x * 0.55 - uTime * 0.6) * 0.06) + wash;
      vLap = 1.0 - ${lap ? '0.85 * (wash / ' + lap.toFixed(2) + ')' : '0.0'};`);
    s.fragmentShader = 'varying float vLap;\n' + s.fragmentShader.replace('#include <opacity_fragment>',
      '#include <opacity_fragment>\n      diffuseColor.a *= vLap;');
  };
  m.customProgramCacheKey = () => 'foam' + lap;
  const strip = new Mesh(new PlaneGeometry(len, width, Math.round(len / 0.35), 1), m);
  strip.rotation.x = -Math.PI / 2;
  return strip;
}

// ---------- rings of foam ----------
// Every ring is drawn at once, one copy each of the same ring (they'd be a draw call apiece): each where its marker
// stands, swelling and fading on its own beat, its fade carried in the copy's colour.
const RINGS = 64;
const rings: { at: Object3D; r: number; ph: number }[] = [];
const ringGeo = quietly(() => new RingGeometry(0.86, 1, 22, 1));
// (with dice of its own, so the scenery's are left as they were)
const ringMesh = quietly(() => {
  const mat = new MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, depthWrite: false, side: DoubleSide });
  mat.onBeforeCompile = s => {
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.a *= vColor.r;');
  };
  mat.customProgramCacheKey = () => 'foam ring';
  const m = new InstancedMesh(ringGeo, mat, RINGS);
  m.setColorAt(0, new Color(1, 1, 1));
  m.count = 0;
  m.renderOrder = 1;
  m.frustumCulled = false; // its rings are all over the map
  scene.add(m);
  return m;
}, dice(0xF0A3));
/**
 * A ring of foam round something standing in the water, `r` across; it swells and fades with the swell. Returns its
 * marker, to place where the ring goes: it shows while the marker does.
 */
export function foamRing(r: number) {
  const at = new Object3D();
  // the scenery's dice, as many as the ring's own mesh and material once took, so what's built after looks the same
  for (let i = 0; i < 4; i++) Math.random();
  rings.push({ at, r, ph: jitter(0, 6) });
  return at;
}
const flat = new Matrix4().makeRotationX(-Math.PI / 2), m4 = new Matrix4(), size = new Vector3(), fade = new Color();
const showing = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return o.parent !== null; };

// ---------- cloud shadows ----------
/** Soft blobs of shade, tiling seamlessly, for the clouds' shadows. */
const cloudTex = quietly(() => canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const x = jitter(0, w), y = jitter(0, h), r = jitter(34, 70);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
      const g = c.createRadialGradient(x + dx, y + dy, r * 0.2, x + dx, y + dy, r);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.6, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x + dx, y + dy, r * 1.4, r, 0.4, 0, 7); c.fill();
    }
  }
}));
cloudTex.tex.wrapS = cloudTex.tex.wrapT = RepeatWrapping;
/** Where the camera looks: the shadows fade out a way from it, before the fog. */
const focus = { value: new Vector3() };
const drift = { value: new Vector3() };
const strength = { value: 0.3 };
const sheets: Mesh[] = [];
/**
 * The clouds' shadows, laid over the ground at height `y`: a sheet that darkens what's under it where the clouds are,
 * sliding with the wind. It follows the camera (updSea), so it only has to cover what's on screen.
 */
export function cloudShadows(y: number) {
  const m = new ShaderMaterial({
    uniforms: { map: { value: cloudTex.tex }, focus, drift, strength },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 focus; uniform vec3 drift; uniform float strength;
      varying vec3 vW;
      void main() {
        float shade = 1.0 - texture2D(map, vW.xz / 28.0 + drift.xy).r;
        float near = 1.0 - smoothstep(16.0, 30.0, distance(vW.xz, focus.xz));
        gl_FragColor = vec4(vec3(1.0 - shade * strength * near), 1.0);
      }`,
    transparent: true, depthWrite: false,
    blending: CustomBlending, blendSrc: ZeroFactor, blendDst: SrcColorFactor,
  });
  const sheet = new Mesh(new PlaneGeometry(70, 70), m);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = y;
  sheet.renderOrder = 5;
  sheet.frustumCulled = false;
  sheets.push(sheet);
  return sheet;
}

/** Moves the water and the clouds on: `t` is seconds of play, `at` where the camera looks. */
export function updSea(t: number, at: Vector3) {
  time.value = t;
  let n = 0;
  for (const r of rings) {
    if (n === RINGS || !showing(r.at)) continue;
    const k = Math.sin(t * 1.4 + r.ph), s = r.r * (1.06 + 0.07 * k);
    r.at.updateWorldMatrix(true, false);
    ringMesh.setMatrixAt(n, m4.copy(r.at.matrixWorld).multiply(flat).scale(size.setScalar(s)));
    ringMesh.setColorAt(n++, fade.setScalar(0.45 + 0.25 * k));
  }
  ringMesh.count = n;
  ringMesh.visible = n > 0;
  ringMesh.instanceMatrix.needsUpdate = true;
  ringMesh.instanceColor!.needsUpdate = true;
  focus.value.copy(at);
  drift.value.set(t * 0.006, t * 0.0035, 0);
  for (const s of sheets) { s.position.x = at.x; s.position.z = at.z; }
}

