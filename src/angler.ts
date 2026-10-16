// Angler Al, the Undertow's barman (stage 3): an old-school speakeasy barman who happens to be an anglerfish, built like
// the Family (family.ts) from the same plain shapes in flat colours. A sleek slate head, a wide closed knowing smile with
// a neat row of small fang tips over the lip, big half-lidded eyes, pale freckles, a handlebar of fleshy barbels; a crisp
// white shirt with sleeve garters, a burgundy waistcoat with a watch chain, a bow tie; his lure a thin curved stalk with a
// small bright bulb hanging off it like the pendant lamp over his bar. regulars.ts stands him behind it.
import {
  AdditiveBlending, CatmullRomCurve3, CylinderGeometry, Euler, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  type Object3D, Quaternion, RepeatWrapping, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
} from 'three';
import { Hood } from './family';
import { bake, canvasTex, G, mat, mesh, type Part } from './render';

const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };
const UP = new Vector3(0, 1, 0), FRONT = new Vector3(0, 0, 1);
const glowing = (color: number, emissive: number, opacity = 1) =>
  new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1, transparent: opacity < 1, opacity });
/** The top half of a ball, for lids. */
const halfBall = new SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
/** A brow ridge round the top of a lid: an arc of the lid's own size (scaled up to it), its tube 0.011 thick there. */
const browGeo = new TorusGeometry(0.05, 0.05 * 0.011 / 0.084, 6, 16, Math.PI * 0.6);
const GLINT = new MeshBasicMaterial({ color: 0xFFFFFF });
/** A smoother ball for his big sleek head. */
const smooth = new SphereGeometry(1, 36, 22);

const SKIN = 0x667C90, DARK = 0x4A5D71, BELLY = 0xD3DAD8, LIP = 0x56697D, MOUTH = 0x231820, FRECKLE = 0xB4C6D3;
const SHIRT = 0xF3EFE6, VEST = 0x7E2236, VEST_DARK = 0x5A1726, BOW = 0x1D1A22, GARTER = 0xB0303F, GOLD = 0xE8B94A;

// ---------- his head's shape: a sleek skull, and a broad pale chin jutting a little out under it ----------
interface Egg { c: Vector3; r: Vector3 }
const SKULL: Egg = { c: new Vector3(0, 0.255, 0), r: new Vector3(0.28, 0.235, 0.26) };
const CHIN: Egg = { c: new Vector3(0, 0.145, 0.05), r: new Vector3(0.205, 0.13, 0.225) };
/** How far out from his head's axis, at height `y`, egg `e`'s skin is in the direction `a` round from the front. */
function reach(e: Egg, a: number, y: number) {
  const R = 1 - ((y - e.c.y) / e.r.y) ** 2;
  if (R <= 0) return 0;
  const s = Math.sin(a), c = Math.cos(a);
  const A = (s / e.r.x) ** 2 + (c / e.r.z) ** 2, B = -2 * c * e.c.z / e.r.z ** 2, C = (e.c.z / e.r.z) ** 2 - R;
  const d = B * B - 4 * A * C;
  return d < 0 ? 0 : (-B + Math.sqrt(d)) / (2 * A);
}
/** The point on his head's skin `a` round from the front at height `y`, pushed `out` along its normal. */
function skin(a: number, y: number, out = 0) {
  const t1 = reach(SKULL, a, y), t2 = reach(CHIN, a, y), e = t1 >= t2 ? SKULL : CHIN, t = Math.max(t1, t2);
  const p = new Vector3(Math.sin(a) * t, y, Math.cos(a) * t);
  const n = new Vector3((p.x - e.c.x) / e.r.x ** 2, (p.y - e.c.y) / e.r.y ** 2, (p.z - e.c.z) / e.r.z ** 2).normalize();
  return { p: p.addScaledVector(n, out), n };
}

/** A tube through `pts`, `r0` thick at its start tapering to `r1` at its end. */
function tube(parent: Object3D, m: number | MeshLambertMaterial, pts: Vector3[], r0: number, r1: number, seg = 18, radial = 6, cast = false) {
  const curve = new CatmullRomCurve3(pts), geo = new TubeGeometry(curve, seg, 1, radial, false);
  const pos = geo.attributes.position, P = new Vector3(), v = new Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, P);
    const r = r0 + (r1 - r0) * i / seg;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(P).multiplyScalar(r).add(P);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  return put(parent, mesh(geo, m, 0, 0, 0, cast));
}
/** A baking part for `geo`, centred at `at`, its y axis turned to `dir`, scaled `scale`. */
function aimed(geo: Part['geo'], at: Vector3, dir: Vector3, scale: [number, number, number], from = UP): Part {
  const e = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(from, dir.clone().normalize()));
  return { geo, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z], scale };
}

/** One big eye in its own socket group (facing +z): a white, an amber iris, a pupil looking a touch down, a glint, a
 *  heavy upper lid half down over it and a lower lid, both a little bigger than the eye. */
function eye(h: Object3D, s: number, at: Vector3, r: number, lid: number) {
  const e = put(h, new Group()); e.position.copy(at); e.rotation.set(-0.26, s * 0.34, 0);
  const look = -0.04 * r;
  e.add(mesh(G.sphere, 0xF4EFDF, 0, 0, 0)); e.children[0].scale.setScalar(r);
  put(e, mesh(G.sphere, 0xD49A3A, s * -0.05 * r, look, r * 0.72)).scale.set(r * 0.64, r * 0.64, r * 0.3);
  put(e, mesh(G.sphere, 0x111111, s * -0.05 * r, look, r * 0.86)).scale.set(r * 0.3, r * 0.36, r * 0.18);
  put(e, mesh(G.sphere, GLINT, s * -0.05 * r + r * 0.2, look + r * 0.2, r * 0.95)).scale.setScalar(r * 0.11);
  const up = put(e, mesh(halfBall, SKIN, 0, 0, 0)); up.scale.setScalar(r * 1.16); up.rotation.set(lid, 0, -s * 0.12);
  const low = put(e, mesh(halfBall, SKIN, 0, 0, 0)); low.scale.setScalar(r * 1.12); low.rotation.set(Math.PI + 0.95, 0, s * 0.1);
  return e;
}

/** Angler Al, the Gentleman. */
export function angler(): { g: Hood; lure: Object3D } {
  const g = new Hood({ coat: VEST, lapel: VEST_DARK, shirt: SHIRT, hand: SKIN });
  const b = g.body, kids = b.children;
  // a waistcoat over a shirt: shirt shoulders, a shirt collar, shirt sleeves and cuffs
  (kids[1] as Mesh).material = mat(SHIRT);
  (kids[4] as Mesh).material = mat(SHIRT);
  (kids[7] as Mesh).material = mat(SHIRT);
  for (const a of g.arms) for (let i = 0; i < 3; i++) (a.children[i] as Mesh).material = mat(SHIRT);
  // a fuller shirt front in the waistcoat's V
  put(b, mesh(G.sphere, SHIRT, 0, 0.8, 0.19)).scale.set(0.1, 0.13, 0.055);
  // sleeve garters round each upper arm
  for (const a of g.arms) { const band = put(a, mesh(new TorusGeometry(0.062, 0.011, 6, 18), GARTER, 0, -0.1, 0)); band.rotation.x = Math.PI / 2; }

  // the waistcoat's buttons, two welt pockets, and the watch chain draped from a button into the right-hand pocket
  const vz = (y: number) => (0.22 + (0.9 - y) / 0.6 * 0.08) * 1.05, vx = (y: number) => (0.22 + (0.9 - y) / 0.6 * 0.08) * 1.12;
  /** A point on the waistcoat's front, `a` round from the middle, at height `y`, `out` off it. */
  const facet = (a: number) => Math.cos(Math.PI / 10) / Math.cos(((a % (Math.PI / 5)) + Math.PI / 5) % (Math.PI / 5) - Math.PI / 10);
  const onVest = (a: number, y: number, out = 0) => new Vector3(Math.sin(a) * (vx(y) * facet(a) + out), y, Math.cos(a) * (vz(y) * facet(a) + out));
  const buttons = bake([0.42, 0.5, 0.58].map(y => ({ geo: G.sphere, at: onVest(0, y, 0.004).toArray() as [number, number, number], scale: [0.016, 0.016, 0.01] as [number, number, number] })));
  put(b, mesh(buttons, GOLD));
  const welts = bake([-1, 1].map(s => aimed(G.sphere, onVest(s * 0.6, 0.5, 0.002), new Vector3(Math.sin(s * 0.6), 0, Math.cos(s * 0.6)), [0.055, 0.011, 0.012], FRONT)));
  put(b, mesh(welts, VEST_DARK));
  tube(b, GOLD, [onVest(0, 0.5, 0.008), onVest(0.18, 0.455, 0.012), onVest(0.38, 0.45, 0.012), onVest(0.55, 0.485, 0.008), onVest(0.6, 0.5, -0.004)], 0.0055, 0.0055, 20, 5);
  // the watch's bow and crown peeking out of the pocket
  put(b, mesh(new TorusGeometry(0.012, 0.004, 5, 12), GOLD, ...onVest(0.6, 0.512, 0.004).toArray())).rotation.y = 0.6;
  // the waistcoat's piped top edge, round the back and sides from lapel to lapel, where it meets the shirt's shoulders
  const pipeGeo = new TorusGeometry(0.2225 * 0.985, 0.011, 6, 30, Math.PI * 2 - 1.1); pipeGeo.rotateZ(Math.PI / 2 + 0.55);
  const pipe = put(b, mesh(pipeGeo, VEST_DARK, 0, 0.878, 0)); pipe.rotation.x = Math.PI / 2; pipe.scale.set(1.12, 1.05, 1);
  // a cinch strap and buckle across the waistcoat's back
  put(b, mesh(G.sphere, VEST_DARK, 0, 0.48, -vz(0.48) + 0.004)).scale.set(0.11, 0.02, 0.016);
  put(b, mesh(G.sphere, GOLD, 0, 0.48, -vz(0.48) - 0.01)).scale.set(0.022, 0.024, 0.01);
  // the bow tie
  for (const s of [-1, 1]) { const wing = put(b, mesh(G.sphere, BOW, s * 0.045, 0.875, 0.232)); wing.scale.set(0.05, 0.03, 0.013); wing.rotation.z = s * 0.12; }
  put(b, mesh(G.sphere, 0x2C2733, 0, 0.875, 0.244)).scale.set(0.017, 0.021, 0.013);

  // ---------- the head ----------
  // (his head held a little back, chin up, so his face reads from the player's camera up high)
  const h = put(g.head, new Group()); h.rotation.x = -0.1;
  put(h, mesh(smooth, SKIN, SKULL.c.x, SKULL.c.y, SKULL.c.z, true)).scale.copy(SKULL.r);
  put(h, mesh(smooth, BELLY, CHIN.c.x, CHIN.c.y, CHIN.c.z, true)).scale.copy(CHIN.r);
  // the smile: wide and closed, the corners turned up (the right one a touch more, knowingly), a slate upper lip over a
  // dark line, a neat row of small fang tips from the lower jaw showing over it
  const smileY = (a: number) => 0.205 + 0.05 * Math.abs(a / 1.1) ** 2.6 + (a > 0 ? 0.012 * (a / 1.1) ** 3 : 0);
  const along = (n: number, a0: number, a1: number, f: (a: number) => Vector3) => Array.from({ length: n }, (_, i) => f(a0 + (a1 - a0) * i / (n - 1)));
  tube(h, MOUTH, along(13, -1.1, 1.1, a => skin(a, smileY(a), 0.0).p), 0.0085, 0.0085, 40, 6);
  tube(h, LIP, along(13, -1.06, 1.06, a => skin(a, smileY(a) + 0.017, 0.0).p), 0.012, 0.012, 40, 6);
  const fangs: Part[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -0.74 + 1.48 * i / 8, { p, n } = skin(a, smileY(a) - 0.02, 0.005), len = 0.026;
    const dir = UP.clone().multiplyScalar(0.92).addScaledVector(n, 0.3).normalize();
    fangs.push(aimed(G.cone, p.clone().addScaledVector(dir, len / 2), dir, [0.0068, len, 0.0068]));
  }
  put(h, mesh(bake(fangs), new MeshLambertMaterial({ color: 0xF5F0DE, emissive: 0x2A2620 })));
  // the handlebar: two fleshy barbels from under his snout, out along his upper lip and curling up at the ends
  for (const s of [-1, 1]) {
    const pts = [skin(s * 0.02, 0.268, -0.006).p, skin(s * 0.22, 0.262, 0.008).p, skin(s * 0.5, 0.262, 0.016).p, skin(s * 0.78, 0.275, 0.04).p];
    const end = pts[3], out = new Vector3(s, 0, 0.3).normalize();
    pts.push(end.clone().addScaledVector(out, 0.045).add(new Vector3(0, 0.03, 0)), end.clone().addScaledVector(out, 0.04).add(new Vector3(0, 0.07, -0.005)), end.clone().addScaledVector(out, 0.015).add(new Vector3(0, 0.075, 0.0)));
    tube(h, DARK, pts, 0.022, 0.008, 30, 7);
    put(h, mesh(G.sphere, DARK, ...pts[pts.length - 1].toArray())).scale.setScalar(0.0105);
  }
  // two small nostrils over the moustache
  put(h, mesh(bake([-1, 1].map(s => { const { p, n } = skin(s * 0.07, 0.305, -0.002); return aimed(G.sphere, p, n, [0.009, 0.012, 0.005], FRONT); })), DARK));
  // big half-lidded eyes, and brows, the right one a little raised
  for (const s of [-1, 1]) {
    const r = 0.072, { p, n } = skin(s * 0.38, 0.385, 0);
    const e = eye(h, s, p.addScaledVector(n, -0.45 * r), r, s > 0 ? -0.1 : -0.02);
    // a brow: a ridge laid right along the top of his lid (the right one cocked up a little at its outer end)
    const ridge = put(e, mesh(browGeo, DARK, 0, 0, 0)); ridge.scale.setScalar(r * 1.17 / 0.05);
    ridge.rotation.set(s > 0 ? 0.5 : 0.62, 0, Math.PI * 0.2 + s * (s > 0 ? 0.12 : 0.04));
  }
  // the freckles: across his cheeks under the eyes, and over his crown and down the back of his head
  const dots: Part[] = [];
  const spot = (a: number, y: number, size: number) => { const { p, n } = skin(a, y, -0.001); dots.push(aimed(G.sphere, p, n, [size, size, size * 0.3], FRONT)); };
  for (const s of [-1, 1]) for (const [a, y, z] of [[0.62, 0.31, 0.009], [0.7, 0.29, 0.007], [0.55, 0.29, 0.007], [0.78, 0.32, 0.008], [0.66, 0.335, 0.006]]) spot(s * a, y, z);
  for (const [a, y, z] of [[0.3, 0.47, 0.01], [-0.35, 0.48, 0.009], [0.9, 0.44, 0.011], [-0.95, 0.42, 0.01], [1.6, 0.4, 0.012], [-1.7, 0.43, 0.011], [2.3, 0.42, 0.012], [-2.4, 0.38, 0.011], [3.0, 0.45, 0.012], [2.7, 0.3, 0.01], [-2.8, 0.27, 0.01], [1.9, 0.27, 0.009], [-1.4, 0.3, 0.009], [3.1, 0.22, 0.01]]) spot(a, y, z);
  put(h, mesh(bake(dots), FRECKLE));
  // gill slits, and small rounded pectoral fins low on each side of his head
  put(h, mesh(bake([-1, 1].map(s => {
    const { p } = skin(s * 1.55, 0.2, -0.004);
    return { geo: new TorusGeometry(0.05, 0.007, 5, 12, Math.PI * 0.8), at: p.toArray() as [number, number, number], rot: [0, s * Math.PI / 2, Math.PI * 0.6], scale: [1, 1, 1] as [number, number, number] };
  })), DARK));
  for (const s of [-1, 1]) {
    const { p } = skin(s * 1.75, 0.13, -0.02);
    const fin = put(h, mesh(G.sphere, DARK, p.x, p.y, p.z)); fin.scale.set(0.09, 0.055, 0.018); fin.rotation.set(0, s * 1.35, s * 0.5);
    const edge = put(h, mesh(G.sphere, LIP, p.x + s * 0.01, p.y, p.z - 0.005)); edge.scale.set(0.075, 0.045, 0.02); edge.rotation.copy(fin.rotation);
  }

  // ---------- the lure: a thin stalk from his crown, arching up and forward, a small bright bulb hanging off its end
  // under a little shade, like the pendant lamp over his bar ----------
  const lure = put(h, new Group()); lure.position.set(0, SKULL.c.y + SKULL.r.y * Math.sqrt(1 - (0.08 / SKULL.r.z) ** 2) - 0.01, 0.08);
  put(lure, mesh(G.sphere, SKIN, 0, 0, 0)).scale.set(0.028, 0.02, 0.028);
  const tip = new Vector3(0, 0.335, 0.24);
  tube(lure, SKIN, [new Vector3(0, -0.01, 0), new Vector3(0, 0.15, -0.02), new Vector3(0, 0.3, 0.03), new Vector3(0, 0.385, 0.12), new Vector3(0, 0.375, 0.2), tip], 0.013, 0.007, 30, 6);
  const shade = put(lure, mesh(halfBall, DARK, tip.x, tip.y - 0.006, tip.z)); shade.scale.set(0.034, 0.024, 0.034);
  put(lure, mesh(new CylinderGeometry(0.012, 0.016, 0.014, 10), new MeshLambertMaterial({ color: GOLD, emissive: 0x4A3000 }), tip.x, tip.y - 0.01, tip.z));
  const bulb = put(lure, mesh(G.sphere, glowing(0xFFF6D6, 0xFFC860), tip.x, tip.y - 0.045, tip.z)); bulb.scale.set(0.036, 0.042, 0.036);
  const halo = put(lure, mesh(G.sphere, new MeshBasicMaterial({ color: 0xFFC860, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false }), tip.x, tip.y - 0.045, tip.z));
  halo.scale.setScalar(0.08);

  // ---------- a tumbler and a striped bar cloth in his right hand ----------
  const hold = put(g.arms[1], new Group()); hold.position.set(0, -0.36, 0.01); hold.rotation.x = 0.45;
  put(hold, mesh(new CylinderGeometry(0.036, 0.031, 0.095, 14), glowing(0xD4EAF0, 0x1E2E36, 0.72), 0, 0.035, 0.055));
  put(hold, mesh(new CylinderGeometry(0.031, 0.031, 0.012, 14), glowing(0xBFD8E0, 0x1E2E36, 0.85), 0, -0.006, 0.055));
  const stripes = canvasTex(32, 32, (c, w, hh) => { c.fillStyle = '#ECE6D6'; c.fillRect(0, 0, w, hh); c.fillStyle = '#A8303F'; c.fillRect(0, 10, w, 4); c.fillRect(0, 20, w, 2); }).tex;
  stripes.wrapS = stripes.wrapT = RepeatWrapping;
  const cloth = new MeshLambertMaterial({ map: stripes });
  put(hold, mesh(G.sphere, cloth, 0, 0.005, 0.03)).scale.set(0.066, 0.042, 0.06);
  const tail = put(hold, mesh(G.sphere, cloth, -0.012, -0.06, 0.0)); tail.scale.set(0.045, 0.075, 0.016); tail.rotation.z = 0.15;
  return { g, lure };
}
