// The smoke and light of Mr. Fugu's entrance (offer.ts), as the stage 3 teaser has them: dust squeezed out of the
// cracks when the hatch is shoved from below, a wall of smoke when it bursts open, a column of it still pouring out
// while he rises through it, lit orange from the hole and dark night smoke away from it, and a shaft of light
// standing up out of the hole. All made up front (offer.ts makes it with the hatch) and drawn once, unseen, so
// nothing new has to be compiled in the middle of the scene; then hidden till it's needed.
import {
  AdditiveBlending, BackSide, Color, CylinderGeometry, Mesh, ShaderMaterial, Sprite, SpriteMaterial, type Texture, Vector3,
} from 'three';
import { isHigh } from './graphics';
import { quietly } from './kit';
import { canvasTex, scene } from './render';

/** A soft round puff, made of blobs, in one of a few shapes. */
function puffTex(seed: number): Texture {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return canvasTex(128, 128, (c, w) => {
    for (let i = 0; i < 22; i++) {
      const px = 64 + (rnd() - 0.5) * 56, py = 64 + (rnd() - 0.5) * 56, r = 12 + rnd() * 18;
      const g = c.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${0.22 + rnd() * 0.2})`); g.addColorStop(0.6, `rgba(255,255,255,${0.08 + rnd() * 0.06})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    }
    c.globalCompositeOperation = 'destination-in';
    const mask = c.createRadialGradient(64, 64, 20, 64, 64, 64);
    mask.addColorStop(0, 'rgba(0,0,0,1)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = mask; c.fillRect(0, 0, w, w);
  }).tex;
}

interface Puff {
  s: Sprite; t0: number; life: number; rot: number; p: Vector3; v: Vector3; size: number; grow: number; peak: number; dust: boolean;
}
interface Emit {
  /** How many, after how long, from how far out of the middle of the hole. */
  n: number; at?: number; r: number;
  /** Speed out sideways and up (a range each), how long each lasts and how big it starts. */
  out: [number, number]; up: [number, number]; life: [number, number]; size: [number, number];
  grow: number; peak: number; dust?: boolean;
  /** How much less of it heads towards the camera (+z here: the restaurant's side), so it doesn't smother the view. */
  toCam?: number;
}

const MOON = new Color(0x2E3440), FIRE = new Color(0xFF7A36), DUST = new Color(0x6B5A4A), tmp = new Color();
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (k: number) => { k = clamp(k); return k * k * (3 - 2 * k); };

export class HatchFx {
  private readonly puffs: Puff[] = [];
  private readonly free: Sprite[] = [];
  private readonly tex: Texture[];
  private readonly beamMat: ShaderMaterial;
  private readonly beam: Mesh;
  private t = 0;
  private seed = 7;
  private frames = 0;
  /** The puff drawn unseen at the start. */
  private readonly first: Sprite;
  /** How bright the light out of the hole is (offer.ts sets it as the scene goes): the smoke's lit by it. */
  glow = 0;
  /** How strong the shaft of light standing out of the hole is. */
  shine = 0;

  constructor(private readonly at: Vector3) {
    this.tex = [1, 2, 3, 4].map(puffTex);
    // a pool of puffs (hidden till they're puffed out)
    for (let i = 0; i < 150; i++) {
      const s = quietly(() => new Sprite(new SpriteMaterial({ map: this.tex[i % 4], transparent: true, depthWrite: false, opacity: 0 })));
      s.position.copy(at); s.visible = i === 0;
      scene.add(s);
      this.free.push(s);
    }
    this.first = this.free[0];
    this.beamMat = new ShaderMaterial({
      uniforms: { uI: { value: 0 }, uT: { value: 0 }, uC: { value: new Color(0xFF8A44) } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uI; uniform float uT; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float up = pow(1.0 - vUv.y, 1.7);
          float face = pow(abs(dot(vN, vV)), 2.0);
          float rays = 0.75 + 0.25 * sin(vUv.x * 46.0 + uT * 0.7) * sin(vUv.x * 17.0 - uT * 0.4);
          float a = uI * up * face * rays;
          gl_FragColor = vec4(uC * a, a);
        }`,
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide,
    });
    this.beam = quietly(() => new Mesh(new CylinderGeometry(1.05, 0.5, 4.6, 32, 1, true), this.beamMat));
    this.beam.position.set(at.x, at.y + 2.3, at.z);
    this.beam.renderOrder = 3;
    scene.add(this.beam);
  }

  private rnd() { return (this.seed = (this.seed * 16807) % 2147483647) / 2147483647; }

  /** Puffs of smoke (or dust) out of the hatch: half as many on Low (graphics.ts), each a see-through sprite drawn
   *  over the ones behind it. */
  emit(o: Emit) {
    const n = isHigh() ? o.n : Math.ceil(o.n / 2);
    for (let i = 0; i < n; i++) {
      const s = this.free.pop();
      if (!s) return;
      const a = this.rnd() * Math.PI * 2, out = (o.out[0] + this.rnd() * (o.out[1] - o.out[0])) * (Math.sin(a) > 0 ? o.toCam ?? 1 : 1);
      const r = o.r * this.rnd();
      this.puffs.push({
        s, t0: this.t + (o.at ?? 0), life: o.life[0] + this.rnd() * (o.life[1] - o.life[0]), rot: (this.rnd() - 0.5) * 0.6,
        p: new Vector3(this.at.x + Math.cos(a) * r, this.at.y + 0.02, this.at.z + Math.sin(a) * r),
        v: new Vector3(Math.cos(a) * out, o.up[0] + this.rnd() * (o.up[1] - o.up[0]), Math.sin(a) * out),
        size: o.size[0] + this.rnd() * (o.size[1] - o.size[0]), grow: o.grow, peak: o.peak, dust: !!o.dust,
      });
    }
  }
  /** Dust squeezed out of the cracks by a shove from below (`hard`: the second, harder one). */
  dust(hard: boolean) {
    this.emit(hard
      ? { n: 18, r: 0.6, out: [1.6, 2.8], up: [0.4, 1.2], life: [1.1, 1.9], size: [0.15, 0.3], grow: 1.2, peak: 0.65, dust: true }
      : { n: 12, r: 0.6, out: [1.2, 2.2], up: [0.3, 0.9], life: [0.9, 1.6], size: [0.12, 0.22], grow: 0.9, peak: 0.55, dust: true });
  }
  /** The hatch bursting open: a wall of smoke, and a column of it pouring out after. */
  blast() {
    this.emit({ n: 60, r: 0.5, out: [0.6, 3.0], up: [1.4, 4.4], life: [2.6, 4.6], size: [0.6, 1.1], grow: 1.5, peak: 0.78, toCam: 0.45 });
    this.emit({ n: 26, at: 0.05, r: 0.7, out: [2.0, 4.5], up: [0.1, 0.6], life: [1.4, 2.6], size: [0.5, 0.9], grow: 1.6, peak: 0.7, toCam: 0.6 });
    for (let k = 0; k < 14; k++) {
      this.emit({ n: 2, at: 0.25 + k * 0.18, r: 0.45, out: [0.2, 0.7], up: [1.0, 2.2], life: [2.4, 3.8], size: [0.5, 0.9], grow: 1.1, peak: 0.5 - k * 0.022, toCam: 0.3 });
    }
  }

  update(dt: number) {
    this.t += dt;
    const t = this.t, at = this.at;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const q = this.puffs[i], a = t - q.t0, m = q.s.material as SpriteMaterial;
      if (a < 0) continue;
      if (a > q.life) {
        m.opacity = 0; q.s.visible = false;
        this.free.push(q.s); this.puffs.splice(i, 1);
        continue;
      }
      q.s.visible = true;
      // drag: they burst out, then hang and drift off on the night air (east, and up)
      const d = (1 - Math.exp(-a * 1.6)) / 1.6;
      q.s.position.set(q.p.x + q.v.x * d + a * 0.28, q.p.y + q.v.y * d + a * 0.22, q.p.z + q.v.z * d - a * 0.05);
      q.s.scale.setScalar(q.size * (1 + q.grow * Math.sqrt(a) * 1.4));
      m.rotation = q.rot * (a + 3);
      const u = a / q.life;
      let op = q.peak * Math.min(1, a / 0.08) * Math.pow(1 - u, 1.6);
      // the smoke between the camera and him thins as he rises, so he reads as a shape against the light
      if (q.s.position.z > at.z + 0.35) op *= 1 - 0.7 * ease((a - 0.8) / 0.8);
      m.opacity = op;
      // lit from the hole: bright orange inside the column of light over it, falling off with height; dark night smoke
      // outside it
      const rr = Math.hypot(q.s.position.x - at.x, q.s.position.z - at.z);
      const lit = Math.min(1, this.glow * clamp(1 - (rr - 0.35) / 1.0) * (0.35 + 0.65 * clamp(1 - (q.s.position.y - at.y) / 4.5)));
      tmp.copy(q.dust ? DUST : MOON).lerp(FIRE, lit).multiplyScalar(0.7 + 1.3 * lit + (q.dust ? 0.3 : 0));
      m.color.copy(tmp);
    }
    this.beamMat.uniforms.uT.value = t;
    this.beamMat.uniforms.uI.value = this.shine;
    // (each drawn the first frame, unseen, then only while it's showing)
    const warm = ++this.frames < 3;
    this.beam.visible = warm || this.shine > 0.001;
    if (this.frames === 3 && !this.puffs.some(q => q.s === this.first)) this.first.visible = false;
  }
}
