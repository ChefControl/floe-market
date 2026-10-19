// The referee (gyoji) in the cellar's ring (stage 3), built as the game's people are (characters.ts): a 0.2 head at
// 1.03 with their dot eyes, ears and nose, arms on pivots at the shoulders. Dressed as a gyoji is: a tall black
// lacquered eboshi tied under the chin, a robe crossed over at the front with a white collar and the wide square
// sleeves hanging from the arms, a sash, the hakama flaring to his feet and white tabi under its hem; tassels (kikuto)
// on his chest and sleeves; and his war fan (gunbai), lacquered, gold-rimmed, a cord and tassel off its handle, in his
// right hand. He's Mr. Fugu's own: his crest, a puffer, is on the robe and on the fan. The hakama is on its own, so it can shorten and spread as he crouches (dohyo.ts).
import { CylinderGeometry, Group, Matrix4, SphereGeometry, TorusGeometry, type BufferGeometry } from 'three';
import { Build, detail, dice, K, quietly, rbox, shade, tube } from './kit';
import { G } from './render';

/** Mr. Fugu's own referee: in indigo with a white pattern, gold tassels and trim, the house's crest (a puffer in a white
 *  ring) on his chest and sleeves and a gold puffer, spines out, on the black lacquer of his fan. */
const ROBE_C = 0x24325E, PATTERN = 0xF2EEE2, GOLD = 0xF2C14E, FAN = 0x15141A;
/** How far down the arm his sleeves hang (to a little above the knee). */
const SLEEVE = 0.4;
const SKIN = 0xF0C6A0, INK = 0x1B2733, LACQUER = 0x111014, WHITE = 0xF4F1EA;
/** The head, as the people's: a 0.2 ball at (0, 1.03, 0.05), +z the face. */
const HEAD = { y: 1.03, z: 0.05 };
/** A shape placed by a matrix, for what's turned about two axes in an order Build.add's Euler can't give. */
const put = (b: Build, geo: BufferGeometry, c: number, m: Matrix4) => b.pieces.push({ geo, c, m });
const turned = (x: number, y: number, z: number, ry: number, rx: number, sx: number, sy: number, sz: number) =>
  new Matrix4().makeTranslation(x, y, z).multiply(new Matrix4().makeRotationY(ry)).multiply(new Matrix4().makeRotationX(rx)).multiply(new Matrix4().makeScale(sx, sy, sz));

/** The hakama: from the waist (0.58 up) flaring to the floor, its pleats down the front, and the tabi under its hem. */
const HAKAMA = { top: 0.58, rt: 0.25, rb: 0.36 };
/** The robe: from inside the hakama up to the shoulders, a little fuller than a person's body. */
const ROBE = { y0: 0.42, y1: 0.92, rb: 0.27, rt: 0.235 };

/** The referee: `root` stands him (its feet at 0, facing +z), `body` bends him, `hakama` crouches, and
 *  `arms` are his left and right (the fan's in the right, arms[1]). */
export function gyojiModel() {
  const root = new Group(), body = new Group(), hakama = new Group();
  const crownGeo = new SphereGeometry(0.21, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), dotGeo = new SphereGeometry(1, 6, 4);
  const cordGeo = new TorusGeometry(0.2, 0.008, 4, 14, Math.PI), gourdGeo = new CylinderGeometry(1, 1, 1, 18), neckGeo = new CylinderGeometry(1, 1, 1, 12);
  root.add(hakama, body);
  const robe = ROBE_C, dark = shade(robe, 0.72), lining = shade(robe, 1.25);

  // ---- the hakama and the tabi ----
  const h = new Build(), slope = Math.atan2(HAKAMA.rb - HAKAMA.rt, HAKAMA.top);
  h.add(tube(HAKAMA.rt, HAKAMA.rb, HAKAMA.top - 0.02, 14), robe, 0, HAKAMA.top / 2 + 0.01, 0);
  // (the pleats down its front and back, darker folds, lying on the flare)
  for (const back of [0, Math.PI]) for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) {
    const r = (HAKAMA.rt + HAKAMA.rb) / 2 + 0.003;
    put(h, G.box, dark, turned(Math.sin(a + back) * r, HAKAMA.top / 2, Math.cos(a + back) * r, a + back, -slope, 0.012, HAKAMA.top - 0.06, 0.01));
  }
  // (the hem, a shade darker)
  h.add(tube(HAKAMA.rb + 0.004, HAKAMA.rb + 0.008, 0.04, 14, true), dark, 0, 0.04, 0);
  for (const s of [-1, 1]) h.add(dotGeo, WHITE, s * 0.1, 0.0, 0.35, null, [0.06, 0.05, 0.09]);
  hakama.add(h.mesh(true));

  // ---- the robe, collar, sash and tassels ----
  const b = new Build();
  b.add(tube(ROBE.rt, ROBE.rb, ROBE.y1 - ROBE.y0, 10), robe, 0, (ROBE.y0 + ROBE.y1) / 2, 0);
  b.add(K.dome, robe, 0, ROBE.y1, 0, null, [ROBE.rt, 0.09, ROBE.rt]);
  const lean = Math.atan2(ROBE.rb - ROBE.rt, ROBE.y1 - ROBE.y0);
  /** On the robe's front, `x` across at `y` up, turned `rz` in its plane. */
  const front = (geo: BufferGeometry, c: number, x: number, y: number, rz: number, sx: number, sy: number, sz: number, out = 0.006) => {
    const r = ROBE.rt + (ROBE.y1 - y) / (ROBE.y1 - ROBE.y0) * (ROBE.rb - ROBE.rt), z = Math.sqrt(Math.max(0, r * r - x * x)) + out;
    put(b, geo, c, new Matrix4().makeTranslation(x, y, z).multiply(new Matrix4().makeRotationY(Math.asin(x / r))).multiply(new Matrix4().makeRotationX(-lean))
      .multiply(new Matrix4().makeRotationZ(rz)).multiply(new Matrix4().makeScale(sx, sy, sz)));
  };
  // the collar: white, crossed left over right down to the sash
  // (in short lengths, each lying on the robe where it is, from the neck down to where the two cross)
  for (const s of [-1, 1]) {
    const x0 = s * 0.11, y0 = 0.91, x1 = -s * 0.02, y1 = 0.6, n = 4, len = Math.hypot(x1 - x0, y1 - y0) / n, rz = Math.atan2(x0 - x1, y0 - y1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      front(G.box, WHITE, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, -rz, 0.045, len + 0.01, 0.012, s > 0 ? 0.012 : 0.006);
    }
  }
  // the pattern over it: small diamonds, in rows
  for (let row = 0; row < 3; row++) for (const x of [-0.16, 0.16]) front(G.box, PATTERN, x + (row % 2 ? 0.04 : -0.04), 0.84 - row * 0.12, Math.PI / 4, 0.03, 0.03, 0.008);
  // the sash at the waist, and the hakama's tie knotted at the front
  b.add(tube(ROBE.rb - 0.012, ROBE.rb - 0.008, 0.07, 10, true), PATTERN, 0, HAKAMA.top + 0.02, 0, null, [1.06, 1, 1.06]);
  b.add(rbox(0.1, 0.05, 0.04, 0.012), shade(PATTERN, 0.8), 0, HAKAMA.top + 0.02, 0.27);
  // two tassels on the chest, on cords
  for (const s of [-1, 1]) front(dotGeo, GOLD, s * 0.13, 0.72, 0, 0.032, 0.04, 0.03, 0.02);
  // Mr. Fugu's crest on the chest: a puffer in a white ring
  front(new TorusGeometry(0.045, 0.008, 4, 16), WHITE, 0.12, 0.84, 0, 1, 1, 1, 0.01);
  front(dotGeo, GOLD, 0.12, 0.84, 0, 0.026, 0.024, 0.01, 0.012);
  // ---- the head: as the people's ----
  b.add(G.head, SKIN, 0, HEAD.y, HEAD.z);
  for (const s of [-1, 1]) {
    b.add(G.eye, INK, s * 0.07, 1.06, 0.24);
    b.add(dotGeo, 0xFFFFFF, s * 0.07 + 0.011, 1.071, 0.264, null, 0.009);
    b.add(dotGeo, SKIN, s * 0.197, 1.02, 0.045, null, [0.032, 0.048, 0.038]);
    // (brows, set: he's seen it all)
    b.add(G.box, 0x2A2226, s * 0.07, 1.105, 0.232, [-0.35, 0, s * 0.12], [0.07, 0.016, 0.014]);
  }
  b.add(dotGeo, shade(SKIN, 0.93), 0, 1.008, 0.247, null, [0.03, 0.026, 0.026]);
  b.add(G.box, 0x7A3A30, 0, 0.955, 0.235, [-0.3, 0, 0], [0.05, 0.012, 0.01]);
  // ---- the eboshi: a tall black lacquered cap, leaning back, tied under the chin ----
  b.add(crownGeo, LACQUER, 0, HEAD.y + 0.01, HEAD.z - 0.015);
  put(b, tube(0.075, 0.115, 0.28, 12), LACQUER, turned(0, HEAD.y + 0.27, HEAD.z - 0.08, 0, -0.36, 1, 1, 0.7));
  put(b, K.ball, LACQUER, turned(0, HEAD.y + 0.4, HEAD.z - 0.13, 0, -0.36, 0.075, 0.04, 0.053));
  // (its fold, a crease down the front, and the cords from it down the cheeks, tied under the chin)
  put(b, G.box, 0x2E2C34, turned(0, HEAD.y + 0.27, HEAD.z - 0.012, 0, -0.36, 0.012, 0.24, 0.01));
  put(b, cordGeo, shade(robe, 0.6), turned(0, HEAD.y - 0.03, HEAD.z + 0.02, 0, Math.PI, 1.04, 1.12, 1));
  body.add(b.mesh(true));
  // High's finer things (graphics.ts), on dice of their own: the bow his sash is tied in, its ends hanging, and a pleat
  // of white at his collar's back
  const fine = quietly(() => {
    const f = new Build();
    for (const s of [-1, 1]) {
      f.add(K.ball, shade(PATTERN, 0.8), s * 0.045, HAKAMA.top + 0.025, 0.285, [0, 0, s * 0.5], [0.04, 0.022, 0.014]);
      f.add(G.box, shade(PATTERN, 0.8), s * 0.03, HAKAMA.top - 0.05, 0.288, [0, 0, s * 0.15], [0.022, 0.1, 0.008]);
    }
    f.add(K.ball, WHITE, 0, 0.93, -0.18, null, [0.08, 0.025, 0.03]);
    return f.mesh(false);
  }, dice(0x6501));
  body.add(fine);
  detail(null, fine);

  // ---- the arms: wide square sleeves, hanging behind and under them; a hand out of each ----
  const arms = [1, -1].map(s => {
    const a = new Group(); a.position.set(s * 0.29, 0.84, 0.02); body.add(a);
    const ab = new Build();
    ab.add(K.ball, robe, 0, -0.005, 0, null, [0.075, 0.07, 0.075]);
    ab.add(tube(0.065, 0.06, 0.3, 8, true), robe, 0, -0.15, 0);
    // the sleeve: a long flat panel, its lining showing at the cuff, a tassel at its corner
    const L = SLEEVE;
    ab.add(rbox(0.07, L, 0.31, 0.02), robe, s * 0.02, -L / 2 + 0.02, -0.06, [0, 0, s * 0.1]);
    ab.add(rbox(0.074, 0.04, 0.315, 0.01), lining, s * (0.02 + L * 0.05), -L + 0.03, -0.06, [0, 0, s * 0.1]);
    ab.add(dotGeo, GOLD, s * 0.04, -L + 0.06, -0.2, null, [0.025, 0.035, 0.025]);
    for (const [y, z] of [[-0.1, -0.03], [-0.22, -0.13]]) ab.add(G.box, PATTERN, s * 0.037, y, z, [Math.PI / 4, 0, 0], [0.006, 0.03, 0.03]);
    ab.add(new TorusGeometry(0.04, 0.007, 4, 14), WHITE, s * 0.037, -0.17, -0.08, [0, Math.PI / 2, 0]);
    ab.add(dotGeo, GOLD, s * 0.039, -0.17, -0.08, null, [0.008, 0.022, 0.024]);
    ab.add(K.ball, SKIN, 0, -0.33, 0.03, null, [0.05, 0.056, 0.05]);
    if (s < 0) {
      // the gunbai, its handle in his fist and the gourd-shaped blade out past it, its face to the front
      ab.add(tube(0.016, 0.016, 0.22, 6), 0x3A2A20, 0, -0.43, 0.03);
      ab.add(K.ball, GOLD, 0, -0.32, 0.03, null, 0.022);
      ab.add(neckGeo, GOLD, 0, -0.56, 0.03, [Math.PI / 2, 0, 0], [0.06, 0.02, 0.05]);
      ab.add(gourdGeo, GOLD, 0, -0.71, 0.03, [Math.PI / 2, 0, 0], [0.135, 0.022, 0.15]);
      ab.add(gourdGeo, FAN, 0, -0.71, 0.03, [Math.PI / 2, 0, 0], [0.118, 0.028, 0.133]);
      // (the house's puffer on its face, spines out)
      ab.add(dotGeo, GOLD, 0, -0.71, 0.048, null, [0.06, 0.055, 0.01]);
      for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; ab.add(dotGeo, GOLD, Math.cos(t) * 0.075, -0.71 + Math.sin(t) * 0.07, 0.046, null, 0.011); }
      // the cord off the handle, and its tassel
      ab.add(tube(0.005, 0.005, 0.16, 4), GOLD, 0.03, -0.62, -0.02, [0, 0, 0.25]);
      ab.add(tube(0.012, 0.025, 0.07, 6), GOLD, 0.05, -0.72, -0.02);
    }
    a.add(ab.mesh(true));
    // (and on High, a thumb)
    const thumb = quietly(() => new Build().add(K.ball, SKIN, -s * 0.035, -0.32, 0.07, null, [0.022, 0.03, 0.022]).mesh(false), dice(0x6502 + s));
    a.add(thumb);
    detail(null, thumb);
    return a;
  });
  return { root, body, hakama, arms };
}
