// The Undertow's barman and regulars (stage 3), built like the Family (family.ts) from the same plain shapes in flat
// colours: Angler Al, an anglerfish behind the bar in a waistcoat and bow tie, his lure lit over the counter, polishing
// a glass; Gus, a blobfish slumped on the end stool at the bar; three sardines in one trench coat at the high table,
// one head out of the collar under a fedora and one out of each sleeve; Doc Murk, a squid in a lab coat and brass
// goggles, sitting in the regulars' booth with a flask of something green bubbling; and Velvet, a jellyfish glowing
// pink over the stage by the microphone, her ribbons swaying; and in Harry's office, Inky, his bookkeeper, an octopus in
// shirtsleeves and a green eyeshade at his little desk, keeping the books with every arm he's got. Each breathes, and those with a head turn it to whoever's
// near; club.ts has them talk.
import { CylinderGeometry, DoubleSide, Group, MeshBasicMaterial, MeshLambertMaterial, type Object3D, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { CY } from './cellar';
import { BAR_STOOLS, BARMAN, DEN_BAR, DEN_TABLES, LEDGER, SNUG, STAGE } from './cellarPlan';
import { angler } from './angler';
import { Hood } from './family';
import { G, mesh } from './render';

export type Regular = 'al' | 'gus' | 'coat' | 'doc' | 'velvet' | 'inky';

const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };
const glowing = (color: number, emissive: number, opacity = 1) =>
  new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1, transparent: opacity < 1, opacity });
const halfBall = new SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const frown = new TorusGeometry(0.07, 0.013, 5, 12, Math.PI);
/** A pair of eyes on a head: yellowish whites, black pupils looking out along +z. */
function eyes(h: Object3D, x: number, y: number, z: number, r: number, white = 0xEDE3B0) {
  for (const s of [-1, 1]) {
    put(h, mesh(G.sphere, white, s * x, y, z)).scale.setScalar(r);
    put(h, mesh(G.sphere, 0x111111, s * x, y, z + r * 0.8)).scale.set(r * 0.45, r * 0.55, r * 0.3);
  }
}

const GLINT = new MeshBasicMaterial({ color: 0xFFFFFF });
/** One eye, as the Family's are made: its white, an iris, a pupil (`look` down a little, or up) and a glint, under a lid
 *  of `skin` turned `lid` forward over it (0: shut to halfway; negative: open wider) and tilted `tilt` at its outer end. */
function eye(h: Object3D, x: number, y: number, z: number, r: number, o: { skin: number; white?: number; iris?: number; lid?: number; tilt?: number; look?: number; bar?: boolean }) {
  const s = Math.sign(x) || 1, ly = y + (o.look ?? 0) * r;
  put(h, mesh(G.sphere, o.white ?? 0xF2EEE2, x, y, z)).scale.setScalar(r);
  if (o.iris !== undefined) put(h, mesh(G.sphere, o.iris, x, ly, z + r * 0.72)).scale.set(r * 0.62, r * 0.62, r * 0.3);
  // (an octopus's pupil is a bar across)
  put(h, mesh(G.sphere, 0x111111, x, ly, z + r * 0.84)).scale.set(r * (o.bar ? 0.5 : 0.32), r * (o.bar ? 0.16 : 0.38), r * 0.2);
  put(h, mesh(G.sphere, GLINT, x + r * 0.22, ly + r * 0.22, z + r * 0.93)).scale.setScalar(r * 0.12);
  const lid = put(h, mesh(halfBall, o.skin, x, y, z)); lid.scale.setScalar(r * 1.18); lid.rotation.set(o.lid ?? -0.4, 0, -s * (o.tilt ?? 0));
}
const FRONT = new Vector3(0, 0, 1);
/** Small spots over a head, each laid flat on its skin, at (angle round, height) on the egg `r` round about `c` (the
 *  head's own shape, so each sits right on it). */
function speckle(h: Object3D, color: number, c: Vector3, r: Vector3, at: [number, number][], size: number) {
  for (const [a, y] of at) {
    const k = Math.sqrt(Math.max(0, 1 - ((y - c.y) / r.y) ** 2)), x = c.x + Math.sin(a) * r.x * k, z = c.z + Math.cos(a) * r.z * k;
    const sp = put(h, mesh(G.sphere, color, x, y, z)); sp.scale.set(size, size, size * 0.3);
    // (turned to face out along the egg's own normal there: lookAt would take its aim in the world's coordinates)
    sp.quaternion.setFromUnitVectors(FRONT, new Vector3((x - c.x) / r.x ** 2, (y - c.y) / r.y ** 2, (z - c.z) / r.z ** 2).normalize());
  }
}

/** Gus, a blobfish: a sagging pink head gone to jowls, the nose hanging down over a thick downturned lip, sad little
 *  eyes under heavy lids slanting down at their ends, bags under them, his brows up in the middle, a crease or two in his
 *  brow, a battered bowler
 *  pushed back; a shabby coat with a patch at the elbow and a stain, his tie pulled loose; a beer in his hand. Sat on a
 *  bar stool with his back to the counter, slumped. */
function blob() {
  const g = new Hood({ coat: 0x6B5A48, lapel: 0x544636, shirt: 0xC9B8A0, hand: 0xE3A39C });
  const SKIN = 0xE8A6A0, DEEP = 0xD88C86, PALE = 0xF4C8C0, LIP = 0xB86A6A, HAT = 0x3A3430;
  // the tie, pulled loose and askew; a stain; a patch on his left elbow
  const tie = put(g.body, mesh(G.sphere, 0x3A5A6A, 0.025, 0.72, 0.24)); tie.scale.set(0.03, 0.11, 0.01); tie.rotation.z = 0.25;
  put(g.body, mesh(G.sphere, 0x2E4A58, 0.0, 0.81, 0.235)).scale.set(0.03, 0.024, 0.015);
  put(g.body, mesh(G.sphere, 0x4E3F30, 0.13, 0.52, 0.275)).scale.set(0.045, 0.03, 0.006);
  put(g.arms[0], mesh(G.box, 0x4E4232, 0, -0.17, -0.055)).scale.set(0.07, 0.09, 0.012);
  const h = g.head;
  // the head, sagging: a blob, its jowls and its chin all slumping down onto his collar
  put(h, mesh(G.sphere, SKIN, 0, 0.2, 0.02, true)).scale.set(0.26, 0.19, 0.24);
  for (const sx of [-1, 1]) put(h, mesh(G.sphere, SKIN, sx * 0.15, 0.07, 0.08)).scale.set(0.13, 0.11, 0.12);
  put(h, mesh(G.sphere, SKIN, 0, 0.04, 0.1)).scale.set(0.2, 0.08, 0.15);
  speckle(h, PALE, new Vector3(0, 0.2, 0.02), new Vector3(0.26, 0.19, 0.24), [[0.75, 0.31], [-0.85, 0.28], [1.35, 0.2], [-1.45, 0.17]], 0.013);
  // creases in his brow
  for (const [y, w] of [[0.335, 0.1], [0.358, 0.07]]) { const c = put(h, mesh(frown, 0xDC9892, 0, y, 0.2)); c.scale.set(w / 0.07, 0.35, 0.4); c.rotation.x = -0.4; }
  // the nose: down from between his eyes, hanging over his mouth, its tip a fat bulb with two nostrils
  put(h, mesh(G.sphere, DEEP, 0, 0.17, 0.245)).scale.set(0.075, 0.12, 0.07);
  put(h, mesh(G.sphere, DEEP, 0, 0.075, 0.275)).scale.set(0.085, 0.06, 0.065);
  put(h, mesh(G.sphere, PALE, 0.02, 0.1, 0.33)).scale.set(0.025, 0.018, 0.01);
  for (const sx of [-1, 1]) put(h, mesh(G.sphere, 0x7A3E3E, sx * 0.03, 0.04, 0.315)).scale.set(0.013, 0.009, 0.01);
  // the mouth under it: a thick lip turned down at the corners
  const lip = put(h, mesh(frown, LIP, 0, -0.03, 0.225)); lip.scale.set(1.7, 1.1, 1.6);
  for (const sx of [-1, 1]) put(h, mesh(G.sphere, LIP, sx * 0.115, -0.04, 0.21)).scale.setScalar(0.019);
  // sad little eyes looking down, heavy lids slanting down at their ends, bags under them, his brows up in the middle
  for (const sx of [-1, 1]) {
    eye(h, sx * 0.105, 0.27, 0.195, 0.034, { skin: SKIN, white: 0xF4EEE6, iris: 0x5A6A8A, lid: 0.05, tilt: -0.4, look: -0.25 });
    put(h, mesh(G.sphere, DEEP, sx * 0.105, 0.228, 0.21)).scale.set(0.044, 0.017, 0.02);
    const brow = put(h, mesh(G.sphere, 0xB87A74, sx * 0.1, 0.315, 0.205)); brow.scale.set(0.045, 0.01, 0.014); brow.rotation.z = -sx * 0.35;
  }
  // a battered bowler, pushed back on his head, a dent in its crown
  const hat = put(h, new Group()); hat.position.set(0.02, 0.36, -0.06); hat.rotation.set(-0.38, 0, 0.1);
  put(hat, mesh(halfBall, HAT, 0, 0, 0, true)).scale.set(0.15, 0.13, 0.15);
  const brim = put(hat, mesh(new TorusGeometry(0.16, 0.02, 5, 20), HAT, 0, 0.005, 0)); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 1.05, 0.6);
  put(hat, mesh(new CylinderGeometry(0.152, 0.152, 0.025, 18), 0x5A4A3A, 0, 0.02, 0));
  put(hat, mesh(G.sphere, 0x2A2420, 0.04, 0.12, 0.03)).scale.set(0.05, 0.015, 0.04);
  // his beer: a glass mug, foam over its top, a handle
  const mug = put(g.arms[1], new Group()); mug.position.set(0, -0.38, 0.07);
  put(mug, mesh(new CylinderGeometry(0.05, 0.045, 0.12, 12), glowing(0xE8A83A, 0x5A3200, 0.85), 0, 0, 0));
  put(mug, mesh(G.sphere, 0xF6F0E2, 0, 0.065, 0)).scale.set(0.052, 0.022, 0.052);
  const handle = put(mug, mesh(new TorusGeometry(0.035, 0.008, 5, 12, Math.PI), glowing(0xEADFC8, 0x302010, 0.7), 0.05, 0, 0)); handle.rotation.z = -Math.PI / 2;
  g.body.rotation.x = 0.2;
  g.head.rotation.z = 0.12;
  return g;
}

/** A sardine's head, `r` round, pointing up out of whatever it's in: silver with a blue-green back, a pale belly, a
 *  little open mouth at its snout, big round eyes with gold irises, a gill cover, and the row of dark spots along each
 *  side every sardine has. */
function sardine(parent: Object3D, at: Vector3, r: number) {
  const SILVER = 0xB8C4CC, BACK = 0x4E7A8E, BELLY = 0xE8EEF2, s = put(parent, new Group());
  s.position.copy(at); s.scale.setScalar(r);
  put(s, mesh(G.sphere, SILVER, 0, 0, 0, true)).scale.set(1, 2.3, 0.92);
  put(s, mesh(G.sphere, BACK, 0, 0.1, -0.25)).scale.set(0.82, 2.05, 0.72);
  put(s, mesh(G.sphere, BELLY, 0, -0.15, 0.4)).scale.set(0.68, 1.75, 0.55);
  for (const sx of [-1, 1]) {
    put(s, mesh(G.sphere, 0xD8E4EA, sx * 0.86, -0.1, 0.25)).scale.set(0.05, 1.5, 0.1);
    for (const [y, z] of [[-0.95, 0.25], [-0.55, 0.32], [-0.15, 0.36], [0.25, 0.34]]) {
      const sp = put(s, mesh(G.sphere, 0x24343E, sx * 0.88, y, z)); sp.scale.set(0.05, 0.12, 0.12);
    }
    const gill = put(s, mesh(new TorusGeometry(0.5, 0.05, 4, 12, Math.PI), 0x6A7A86, sx * 0.55, 0.85, 0.35)); gill.rotation.set(0, sx * 0.9, Math.PI);
    eye(s, sx * 0.6, 1.25, 0.42, 0.38, { skin: SILVER, white: 0xF2F0E8, iris: 0xC9A040, lid: -0.9 });
  }
  put(s, mesh(G.sphere, 0x2A2A30, 0, 2.2, 0.35)).scale.set(0.38, 0.22, 0.3);
  const lip = put(s, mesh(new TorusGeometry(0.34, 0.08, 5, 14), 0x9AA8B2, 0, 2.2, 0.35)); lip.rotation.x = Math.PI / 2 - 0.4; lip.scale.set(1.05, 0.85, 1);
  return s;
}

/** Three sardines in a trench coat: a long tan coat, double-breasted, belted at the waist with a buckle, its collar turned
 *  up high, pocket flaps and epaulettes; one sardine standing up out of the collar under a fedora, a false moustache
 *  stuck on under his eyes, and one peeking out of each sleeve; a forked tail out under the hem. */
function trenchCoat() {
  const SILVER = 0xB8C4CC, COAT = 0xA88E5E, TRIM = 0x8E7548, BUTTON = 0x4A3A26;
  const g = new Hood({ coat: COAT, lapel: TRIM, shirt: 0x5E5A50, hand: SILVER });
  put(g.body, mesh(G.cyl, COAT, 0, 0.3, 0, true)).scale.set(0.3, 0.42, 0.28);
  put(g.body, mesh(new TorusGeometry(0.29, 0.025, 5, 20), 0x6B5536, 0, 0.5, 0)).rotation.x = Math.PI / 2;
  put(g.body, mesh(G.box, 0xB89A4A, 0.04, 0.5, 0.3)).scale.set(0.07, 0.055, 0.015);
  put(g.body, mesh(G.box, 0x6B5536, 0.04, 0.5, 0.308)).scale.set(0.04, 0.03, 0.01);
  // double-breasted: two rows of buttons down the front, on the coat and on down its skirt
  for (const sx of [-1, 1]) for (const [y, z] of [[0.78, 0.25], [0.66, 0.262], [0.4, 0.29], [0.24, 0.29]]) put(g.body, mesh(G.sphere, BUTTON, sx * 0.075, y, z)).scale.setScalar(0.016);
  // pocket flaps, epaulettes, the collar turned up round his neck, the hem's split at the back
  for (const sx of [-1, 1]) {
    const flap = put(g.body, mesh(G.box, TRIM, sx * 0.17, 0.4, 0.27)); flap.scale.set(0.11, 0.025, 0.012); flap.rotation.y = sx * 0.55;
    const ep = put(g.body, mesh(G.box, TRIM, sx * 0.24, 0.905, 0)); ep.scale.set(0.12, 0.02, 0.07); ep.rotation.z = -sx * 0.15;
    put(g.body, mesh(G.sphere, BUTTON, sx * 0.19, 0.92, 0.02)).scale.setScalar(0.012);
  }
  // (the collar a ring turned up round his neck, open at the front, flaring out a little at its top)
  put(g.body, mesh(new CylinderGeometry(0.16, 0.13, 0.17, 20, 1, true, Math.PI * 0.18, Math.PI * 1.64), new MeshLambertMaterial({ color: TRIM, side: DoubleSide }), 0, 0.99, 0.0, true));
  // a cuff round each sleeve, and a sardine looking out of it
  for (const a of g.arms) {
    const cuff = put(a, mesh(new TorusGeometry(0.062, 0.014, 4, 14), TRIM, 0, -0.3, 0)); cuff.rotation.x = Math.PI / 2;
    // (upside down, his snout out of the cuff, looking out forwards)
    sardine(a, new Vector3(0, -0.4, 0.03), 0.042).rotation.set(-0.5, 0, Math.PI);
  }
  // the one on top, under the fedora, with his false moustache
  const top = sardine(g.head, new Vector3(0, 0.23, 0.02), 0.115);
  top.rotation.x = -0.05;
  for (const sx of [-1, 1]) {
    const tash = put(g.head, mesh(G.sphere, 0x2A1E16, sx * 0.035, 0.325, 0.125)); tash.scale.set(0.042, 0.013, 0.014); tash.rotation.z = sx * 0.3;
    const curlEnd = put(g.head, mesh(G.sphere, 0x2A1E16, sx * 0.075, 0.337, 0.112)); curlEnd.scale.setScalar(0.011);
  }
  // (sat down over the tip of his snout, so it's on him, not over him)
  const hat = put(g.head, new Group()); hat.position.set(0, 0.455, 0.015); hat.rotation.set(-0.05, 0, -0.12); hat.scale.setScalar(0.5);
  hat.add(mesh(new CylinderGeometry(0.37, 0.37, 0.025, 20), 0x3A3026, 0, 0, 0, true), mesh(new CylinderGeometry(0.2, 0.23, 0.2, 16), 0x3A3026, 0, 0.11, 0, true));
  hat.add(mesh(new CylinderGeometry(0.233, 0.233, 0.05, 16), 0x6B2A2A, 0, 0.04, 0));
  const pinch = put(hat, mesh(G.sphere, 0x2A221A, 0, 0.2, 0.02)); pinch.scale.set(0.12, 0.02, 0.06);
  // the tail, forked, out under the hem behind
  for (const sx of [-1, 1]) { const lobe = put(g, mesh(G.cone, SILVER, sx * 0.04, 0.05, -0.16)); lobe.scale.set(0.05, 0.12, 0.018); lobe.rotation.set(2.6, 0, sx * 0.5); }
  g.scale.setScalar(1.12);
  return g;
}

/** Doc Murk, a squid: a tall pink mantle with fins at its top, big eyes behind brass goggles, short tentacles for a
 *  beard; a stained lab coat; sat at his table with a flask of green glowing in front of him, bubbling. */
function squid() {
  const SKIN = 0xC77FA6, SPOT = 0x9E5A80;
  const g = new Hood({ coat: 0xD8DDD2, lapel: 0xC2C8BC, shirt: 0x3A6A4A, hand: SKIN });
  const h = g.head;
  put(h, mesh(G.cone, SKIN, 0, 0.45, -0.01, true)).scale.set(0.17, 0.5, 0.16);
  put(h, mesh(G.sphere, SKIN, 0, 0.17, 0.02, true)).scale.set(0.17, 0.16, 0.16);
  for (const s of [-1, 1]) { const fin = put(h, mesh(G.sphere, SPOT, s * 0.1, 0.62, -0.01)); fin.scale.set(0.1, 0.05, 0.03); fin.rotation.z = s * 0.5; }
  for (const [x, y] of [[0.06, 0.38], [-0.07, 0.48], [0.03, 0.56], [-0.04, 0.3]]) put(h, mesh(G.sphere, SPOT, x, y, 0.1)).scale.set(0.02, 0.02, 0.01);
  eyes(h, 0.085, 0.2, 0.13, 0.048, 0xF4EED8);
  for (const s of [-1, 1]) {
    const rim = put(h, mesh(new TorusGeometry(0.06, 0.014, 6, 16), 0xC9A23A, s * 0.085, 0.2, 0.16)); rim.castShadow = false;
    put(h, mesh(new CylinderGeometry(0.055, 0.055, 0.01, 14), glowing(0x9BE8D8, 0x1A4A44, 0.45), s * 0.085, 0.2, 0.165)).rotation.x = Math.PI / 2;
  }
  put(h, mesh(G.box, 0x5A4A2A, 0, 0.22, -0.05)).scale.set(0.36, 0.025, 0.2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * 1.6, t = put(h, mesh(G.cone, SKIN, Math.sin(a) * 0.1, -0.02, 0.08 + Math.cos(a) * 0.04));
    t.scale.set(0.025, 0.18, 0.025); t.rotation.set(Math.PI + 0.25, 0, a * 0.3);
  }
  return g;
}

/** Inky, Harry's bookkeeper, an octopus: a tall, soft mantle leaning back over his head, freckled, big bulging eyes
 *  low down either side with a bar for each pupil, a siphon at his side, a pencil tucked behind it; a big green
 *  celluloid eyeshade on a band round his head. In shirtsleeves held up by garters, a buttoned brown waistcoat with a
 *  watch chain across it, a tie, dark trousers; and six more arms out over his desk, tapering to their tips, suckers
 *  along them, a pencil in two, each at a ledger of its own (they wriggle as he works). */
function octopus() {
  const SKIN = 0xD9774A, SPOT = 0xEC9A6C, SUCKER = 0xF0C0A0, SHIRT = 0xEDEAE0, VEST = 0x5A3E28, VEST_EDGE = 0x4A3220;
  const g = new Hood({ coat: SHIRT, lapel: SHIRT, shirt: SHIRT, hand: SKIN });
  // shirtsleeves, and the garters holding them up
  for (const a of g.arms) { const garter = put(a, mesh(G.cyl, 0x2E3A5A, 0, -0.1, 0)); garter.scale.set(0.066, 0.025, 0.066); }
  // dark trousers below, a belt, and the waistcoat over the shirt: its points at the front, its edges up to the collar,
  // four buttons, a watch chain across; the shirt and a tie in the V
  // (each just outside the shirt's own shape, which flares out from his shoulders: render.ts G.body)
  put(g.body, mesh(new CylinderGeometry(0.31, 0.345, 0.23, 16), 0x34343C, 0, 0.4, 0, true)).scale.set(1, 1, 0.96);
  const belt = put(g.body, mesh(new TorusGeometry(0.29, 0.016, 4, 24), 0x1E1E22, 0, 0.515, 0)); belt.rotation.x = Math.PI / 2; belt.scale.set(1.1, 1.06, 1);
  put(g.body, mesh(new CylinderGeometry(0.262, 0.318, 0.42, 16), VEST, 0, 0.72, 0, true)).scale.set(1, 1, 0.95);
  put(g.body, mesh(G.sphere, SHIRT, 0, 0.82, 0.255)).scale.set(0.075, 0.11, 0.03);
  put(g.body, mesh(G.sphere, 0x6A2A2A, 0, 0.8, 0.282)).scale.set(0.022, 0.085, 0.01);
  put(g.body, mesh(G.sphere, 0x5A2222, 0, 0.895, 0.258)).scale.set(0.022, 0.018, 0.014);
  for (const sx of [-1, 1]) {
    const edge = put(g.body, mesh(G.sphere, VEST_EDGE, sx * 0.06, 0.81, 0.262)); edge.scale.set(0.02, 0.12, 0.012); edge.rotation.z = -sx * 0.32;
    const point = put(g.body, mesh(G.cone, VEST, sx * 0.07, 0.47, 0.315)); point.scale.set(0.07, 0.08, 0.02); point.rotation.x = Math.PI;
  }
  /** How far out the waistcoat's front is at height `y`. */
  const front = (y: number) => 0.95 * (0.262 + (0.93 - y) / 0.42 * 0.056);
  for (const y of [0.56, 0.62, 0.68, 0.74]) put(g.body, mesh(G.sphere, 0xC9A23A, 0, y, front(y) + 0.004)).scale.setScalar(0.012);
  const chain = put(g.body, mesh(new TorusGeometry(0.075, 0.005, 4, 14, Math.PI), 0xE0B040, 0.075, 0.66, front(0.64) + 0.004)); chain.rotation.z = Math.PI;
  const h = g.head;
  // the mantle, leaning back, and the lower face it grows out of, freckled all over
  const mantle = put(h, mesh(G.sphere, SKIN, 0, 0.38, -0.08, true)); mantle.scale.set(0.23, 0.3, 0.25); mantle.rotation.x = -0.35;
  put(h, mesh(G.sphere, SKIN, 0, 0.17, 0.03, true)).scale.set(0.2, 0.15, 0.19);
  speckle(h, SPOT, new Vector3(0, 0.38, -0.08), new Vector3(0.23, 0.3, 0.25), [[0.4, 0.5], [-0.6, 0.45], [0.1, 0.6], [0.75, 0.4], [-0.85, 0.42], [-0.2, 0.36]], 0.02);
  // big bulging eyes, low on either side, heavy-lidded from a day of sums; the siphon at his side, the pencil behind it
  for (const sx of [-1, 1]) {
    put(h, mesh(G.sphere, SKIN, sx * 0.12, 0.22, 0.11)).scale.setScalar(0.068);
    eye(h, sx * 0.125, 0.23, 0.165, 0.06, { skin: SKIN, white: 0xF2E8C8, iris: 0xC9A23A, lid: -0.55, tilt: 0.1, bar: true });
  }
  const siphon = put(h, mesh(G.cyl, SKIN, 0.19, 0.12, 0.0)); siphon.scale.set(0.035, 0.09, 0.035); siphon.rotation.z = -0.9;
  put(h, mesh(G.sphere, 0x8A3A22, 0.225, 0.14, 0.0)).scale.set(0.02, 0.012, 0.02);
  const pencil = put(h, mesh(G.cyl, 0xE8B83A, 0.2, 0.32, 0.0)); pencil.scale.set(0.009, 0.16, 0.009); pencil.rotation.set(0.15, 0, 1.25);
  const tip = put(h, mesh(G.cone, 0xE8D2A8, 0.277, 0.348, 0.012)); tip.scale.set(0.009, 0.03, 0.009); tip.rotation.set(0.15, 0, 1.25 - Math.PI);
  // the eyeshade: a band round his head, and a wide green celluloid brim out over his eyes
  // (on his brow, over his eyes, not in front of them)
  const band = put(h, mesh(new TorusGeometry(1, 0.06, 5, 28), 0x1E5A34, 0, 0.35, -0.03)); band.rotation.x = Math.PI / 2 - 0.12; band.scale.set(0.215, 0.215, 0.3);
  const brim = put(h, mesh(new CylinderGeometry(0.31, 0.31, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), glowing(0x6ADB8A, 0x0E4A24, 0.72), 0, 0.35, 0.0));
  brim.rotation.x = 0.18;
  put(h, mesh(new TorusGeometry(0.31, 0.008, 4, 24, Math.PI), 0x2E7A44, 0, 0.35, 0)).rotation.set(Math.PI / 2 + 0.18, 0, 0);
  // the six arms out over his desk: tapering, curling up at their tips, a row of suckers under each
  const arms: Group[] = [];
  for (let i = 0; i < 6; i++) {
    const a = put(g.body, new Group()), s = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    a.position.set(s * (0.12 + k * 0.06), 0.56, 0.24);
    a.rotation.set(-1.2 + k * 0.12, s * (0.25 + k * 0.3), 0);
    const curl = put(a, new Group());
    for (let j = 0; j < 10; j++) {
      const t = j / 9, r = 0.042 * (1 - 0.72 * t), y = -0.42 * t, z = 0.07 * Math.sin(Math.PI * t * 0.9) + 0.06 * t * t;
      put(curl, mesh(G.sphere, SKIN, 0, y, z)).scale.set(r, r * 1.4, r);
      if (j % 2 && j < 9) put(curl, mesh(G.sphere, SUCKER, 0, y, z - r * 0.85)).scale.set(r * 0.45, r * 0.45, r * 0.2);
    }
    if (k === 0) { const pen = put(curl, mesh(G.cyl, 0xE8B83A, 0, -0.42, 0.11)); pen.scale.set(0.008, 0.12, 0.008); pen.rotation.x = 0.6; }
    arms.push(a);
  }
  return { g, arms };
}

/** Velvet, a jellyfish: a glowing pink bell with a frilled rim, a brighter heart, sleepy eyes and red lips, a string of
 *  pearls round her rim, and ribbons hanging down that sway. */
function jelly() {
  const g = new Group(), bell = put(g, new Group());
  put(bell, mesh(halfBall, glowing(0xFFB0D2, 0xC23A7A, 0.82), 0, 0, 0)).scale.set(0.34, 0.3, 0.34);
  put(bell, mesh(G.sphere, glowing(0xFFE0EE, 0xFF7AB8), 0, 0.08, 0)).scale.set(0.16, 0.12, 0.16);
  const rim = put(bell, mesh(new TorusGeometry(0.33, 0.035, 6, 28), glowing(0xFF9AC8, 0xE0458E), 0, 0, 0)); rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; put(bell, mesh(G.sphere, 0xF6F0E6, Math.sin(a) * 0.36, -0.03, Math.cos(a) * 0.36)).scale.setScalar(0.022); }
  for (const s of [-1, 1]) {
    put(bell, mesh(G.sphere, 0x2A1020, s * 0.09, 0.12, 0.29)).scale.set(0.028, 0.012, 0.012);
    const lash = put(bell, mesh(G.box, 0x2A1020, s * 0.12, 0.13, 0.285)); lash.scale.set(0.03, 0.006, 0.006); lash.rotation.z = -s * 0.5;
  }
  put(bell, mesh(G.sphere, 0xD0203E, 0, 0.05, 0.31)).scale.set(0.04, 0.018, 0.012);
  const ribbons: Group[] = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, r = put(g, new Group()); r.position.set(Math.sin(a) * 0.22, -0.02, Math.cos(a) * 0.22);
    for (let k = 0; k < 5; k++) {
      const seg = put(r, mesh(G.box, glowing(0xFFC8E0, 0xB03070, 0.7), 0, -0.1 - k * 0.18, 0)); seg.scale.set(0.05 - k * 0.006, 0.18, 0.012);
      seg.rotation.y = a;
    }
    ribbons.push(r);
  }
  return { g, bell, ribbons };
}

// ---------- in the room ----------
const al = angler(), gus = blob(), coat = trenchCoat(), doc = squid(), velvet = jelly(), inky = octopus();
const STOOL_TOP = 0.85;
/** Al stands on the duckboard behind his bar (cellar.ts), so he's seen over his counter; and he's a big fish. */
export const DUCKBOARD = 0.22;
al.g.position.set(BARMAN.x, CY + DUCKBOARD, BARMAN.z); al.g.scale.setScalar(1.1);
gus.position.set(BAR_STOOLS[3].x, CY, BAR_STOOLS[3].z); gus.sit(STOOL_TOP);
coat.position.set(DEN_TABLES.coat.x, CY, DEN_TABLES.coat.z - 0.55);
doc.position.set(SNUG.x - 0.35, CY, SNUG.z + 0.12); doc.sit(0.51);
velvet.g.position.set(STAGE.x - 0.1, CY + 1.25, STAGE.z + 0.05); velvet.g.rotation.y = 0.25;
/** Inky sits at his desk on a swivel stool, facing it (east, as Harry does). */
inky.g.position.set(LEDGER.clerk.x, CY, LEDGER.clerk.z); inky.g.rotation.y = Math.PI / 2; inky.g.sit(0.5);
const swivel = new Group();
swivel.position.set(LEDGER.clerk.x, CY, LEDGER.clerk.z);
put(swivel, mesh(new CylinderGeometry(0.2, 0.2, 0.06, 14), 0x3A2618, 0, 0.47, 0));
put(swivel, mesh(G.cyl, 0x262E33, 0, 0.23, 0)).scale.set(0.03, 0.44, 0.03);
put(swivel, mesh(new CylinderGeometry(0.2, 0.22, 0.03, 12), 0x262E33, 0, 0.015, 0));
/** Doc Murk's flask on his table, and the bubbles rising out of it. */
const flask = new Group();
flask.position.set(SNUG.table.x - 0.2, CY + 0.78, SNUG.table.z - 0.05);
put(flask, mesh(G.sphere, glowing(0x9CFFB0, 0x2EC050, 0.85), 0, 0.07, 0)).scale.setScalar(0.07);
put(flask, mesh(G.cyl, glowing(0xCFFFE0, 0x1A6030, 0.6), 0, 0.17, 0)).scale.set(0.02, 0.1, 0.02);
const bubbles = Array.from({ length: 4 }, (_, i) => {
  const b = put(flask, mesh(G.sphere, glowing(0xD8FFE0, 0x5AE080, 0.8), 0, 0.2, 0)); b.scale.setScalar(0.012);
  b.userData.t = i / 4;
  return b;
});
/** A glass the barman slides along the counter to whoever ordered (club.ts moves it). */
export const glass = mesh(new CylinderGeometry(0.04, 0.035, 0.11, 10), glowing(0xFFC86A, 0x7A4010, 0.85), 0, 0, 0);
glass.visible = false;
glass.position.set(BARMAN.x, CY + DEN_BAR.h + 0.06, DEN_BAR.front - 0.2);

/** Everyone, as the room's Hood figures (those that turn and nod), and what to add to the room. */
export const regulars: Record<Exclude<Regular, 'velvet'>, Hood> = { al: al.g, gus, coat, doc, inky: inky.g };
export const regularParts: Object3D[] = [al.g, gus, coat, doc, velvet.g, flask, glass, inky.g, swivel];
/** How high over each one's feet their bubble goes. */
export const BUBBLE_Y: Record<Regular, number> = { al: 2.1, gus: 1.85, coat: 2.4, doc: 2.0, velvet: 0.75, inky: 1.95 };
/** Where each one is (for who's near). */
export const where = (k: Regular) => (k === 'velvet' ? velvet.g : regulars[k]).position;
/** Velvet's bubble goes on her, over her bell. */
export const velvetAt = velvet.g;

let t = 0;
/** The regulars, every frame: breathing and looking (their Hoods), Al's lure bobbing and his arm polishing, Velvet
 *  floating and her ribbons swaying, the bubbles out of Doc's flask, and Inky's arms at his books. */
export function updRegulars(dt: number) {
  t += dt;
  for (const h of Object.values(regulars)) h.update(dt);
  al.lure.rotation.x = Math.sin(t * 1.3) * 0.12;
  al.g.arms[1].rotation.x = -0.9 + Math.sin(t * 5) * 0.12;
  al.g.arms[1].rotation.z = 0.25 + Math.cos(t * 5) * 0.1;
  velvet.g.position.y = CY + 1.25 + Math.sin(t * 0.9) * 0.07;
  velvet.bell.scale.set(1 + Math.sin(t * 1.8) * 0.04, 1 - Math.sin(t * 1.8) * 0.05, 1 + Math.sin(t * 1.8) * 0.04);
  velvet.ribbons.forEach((r, i) => { r.rotation.x = Math.sin(t * 1.4 + i) * 0.18; r.rotation.z = Math.cos(t * 1.1 + i * 0.7) * 0.15; });
  inky.arms.forEach((a, i) => { a.rotation.z = Math.sin(t * (3.1 + i * 0.4) + i) * 0.12; a.children[0].position.x = Math.sin(t * 7 + i * 2) * 0.01; });
  for (const b of bubbles) {
    b.userData.t = (b.userData.t + dt * 0.6) % 1;
    b.position.set(Math.sin(b.userData.t * 9 + b.id) * 0.015, 0.2 + b.userData.t * 0.3, 0);
    b.scale.setScalar(0.012 * (1 - b.userData.t * 0.5));
  }
}
