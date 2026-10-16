// The Undertow's house band (stage 3), The Low Tide, on the bandstand behind Velvet, built like the Family (family.ts)
// and playing the club's music (noir.ts) along with it, eighth by eighth, as it's heard (music.ts): a seahorse in a
// maroon jacket on the muted trumpet, its mouthpiece at the end of his snout, the tune all the way through; a grouper
// in a pinstripe and a fedora with the tenor sax on its strap, raising it for the last A and lowering it again; a sea
// turtle in a tux and round spectacles at the grand, his hands coming down on each chord; a crab in a beret slapping
// the upright bass on every beat, his other claw up its neck; and an octopus behind the drums swirling his brushes round
// the snare, tapping on the backbeat, and for the bridge reaching two more arms over to the vibes, a mallet in each.
// Each nods along on the beat. Out of the music (muted, say), they keep playing to their own count.
import { CylinderGeometry, Group, MeshLambertMaterial, type Object3D, SphereGeometry, TorusGeometry } from 'three';
import { CY, parts } from './cellar';
import { BAND, BANDSTAND } from './cellarPlan';
import { Hood, flatten, settle } from './family';
import { noirHeard } from './music';
import { eighth, NOIR_STEPS, noirScore } from './noir';
import { eye } from './regulars';
import { G, mesh } from './render';

const put = <T extends Object3D>(parent: Object3D, m: T) => { parent.add(m); return m; };
const halfBall = new SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const BRASS = new MeshLambertMaterial({ color: 0xD9A93A, emissive: 0x3A2808 });
const TOP = CY + BANDSTAND.h;
/** Each one standing (or sat) at his place on the bandstand, turned out to the room as the plan has him. */
const place = (g: Group, at: { x: number; z: number; face: number }) => { g.position.set(at.x, TOP, at.z); g.rotation.y = at.face; parts.den.add(g); return g; };

// ---------- the trumpet: a seahorse ----------
/** A trumpet, along +z from its mouthpiece at (0, 0, 0): the lead pipe, three valves, the bell, and a harmon mute in it. */
function trumpet() {
  const t = new Group();
  const pipe = put(t, mesh(G.cyl, BRASS, 0, 0, 0.22)); pipe.scale.set(0.012, 0.44, 0.012); pipe.rotation.x = Math.PI / 2;
  const back = put(t, mesh(G.cyl, BRASS, 0, -0.06, 0.2)); back.scale.set(0.012, 0.3, 0.012); back.rotation.x = Math.PI / 2;
  for (const z of [0.16, 0.2, 0.24]) put(t, mesh(G.cyl, BRASS, 0, -0.03, z)).scale.set(0.014, 0.1, 0.014);
  const bell = put(t, mesh(new CylinderGeometry(0.075, 0.015, 0.2, 16, 1, true), BRASS, 0, 0, 0.53)); bell.rotation.x = Math.PI / 2;
  // (the harmon mute: a dark cup stopping the bell, its stem out the front)
  put(t, mesh(G.sphere, 0x6A6E74, 0, 0, 0.6)).scale.set(0.06, 0.06, 0.035);
  const stem = put(t, mesh(G.cyl, 0x8A8E94, 0, 0, 0.64)); stem.scale.set(0.012, 0.05, 0.012); stem.rotation.x = Math.PI / 2;
  put(t, mesh(G.sphere, 0xC9CDD2, 0, 0, 0.003)).scale.set(0.016, 0.016, 0.012);
  return t;
}
function seahorse() {
  const SKIN = 0xE8A03A, DEEP = 0xC97E24, g = new Hood({ coat: 0x5A1E2E, lapel: 0x3E1420, shirt: 0xF2EEE2, hand: SKIN });
  put(g.body, mesh(G.sphere, 0x111114, 0, 0.86, 0.225)).scale.set(0.045, 0.02, 0.02);
  const h = g.head;
  // the head: tall, bent forward over a long tube of a snout, a coronet of knobs on top, ridges down the back of his neck
  put(h, mesh(G.sphere, SKIN, 0, 0.2, -0.02, true)).scale.set(0.15, 0.2, 0.17);
  const snout = put(h, mesh(G.cyl, SKIN, 0, 0.18, 0.2, true)); snout.scale.set(0.045, 0.24, 0.045); snout.rotation.x = Math.PI / 2 - 0.15;
  put(h, mesh(G.sphere, DEEP, 0, 0.162, 0.32)).scale.set(0.05, 0.045, 0.02);
  for (const [x, y, z] of [[0, 0.42, -0.02], [-0.05, 0.39, -0.06], [0.05, 0.39, -0.06], [0, 0.37, -0.11]]) put(h, mesh(G.cone, DEEP, x, y, z)).scale.set(0.025, 0.07, 0.025);
  for (let i = 0; i < 4; i++) put(h, mesh(G.sphere, DEEP, 0, 0.3 - i * 0.08, -0.17 + i * 0.01)).scale.set(0.03, 0.025, 0.025);
  for (const sx of [-1, 1]) eye(h, sx * 0.1, 0.26, 0.1, 0.045, { skin: SKIN, white: 0xF4EEDC, iris: 0x2E5A3A, lid: 0.1, tilt: 0.2 });
  // (his cheeks, puffed out as he blows)
  const cheeks = [-1, 1].map(sx => { const c = put(h, mesh(G.sphere, SKIN, sx * 0.09, 0.14, 0.1)); c.scale.setScalar(0.05); return c; });
  const horn = put(h, trumpet()); horn.position.set(0, 0.16, 0.33); horn.rotation.x = 0.3;
  for (const [i, a] of g.arms.entries()) { const s = i ? 1 : -1; a.rotation.set(-1.45, 0, -s * 0.5); }
  return { g, horn, cheeks };
}

// ---------- the tenor sax: a grouper ----------
/** A tenor sax, its mouthpiece at (0, 0, 0): the neck down and forward to the body, the body down to the bend, and the
 *  bell up out of it at the front; its keys down the body. */
function sax() {
  const s = new Group();
  put(s, mesh(G.sphere, 0x1A1A1E, 0, 0, 0)).scale.set(0.015, 0.02, 0.03);
  const neck = put(s, mesh(G.cyl, BRASS, 0, -0.04, 0.06)); neck.scale.set(0.012, 0.15, 0.012); neck.rotation.x = 1.1;
  put(s, mesh(new CylinderGeometry(0.03, 0.05, 0.5, 14), BRASS, 0, -0.33, 0.12));
  const bend = put(s, mesh(new TorusGeometry(0.075, 0.05, 8, 14, Math.PI), BRASS, 0, -0.58, 0.195)); bend.rotation.set(0, Math.PI / 2, Math.PI);
  put(s, mesh(new CylinderGeometry(0.075, 0.055, 0.24, 14), BRASS, 0, -0.46, 0.27));
  put(s, mesh(new CylinderGeometry(0.11, 0.075, 0.06, 16, 1, true), BRASS, 0, -0.32, 0.27));
  for (let i = 0; i < 5; i++) put(s, mesh(G.sphere, 0xF2E2B0, 0, -0.18 - i * 0.07, 0.17)).scale.set(0.018, 0.018, 0.01);
  return s;
}
function grouper() {
  const SKIN = 0x7A6E44, SPOT = 0x4E4628, BELLY = 0xC9BE8A, g = new Hood({ coat: 0x2E3440, lapel: 0x22272F, shirt: 0xE8E2D4, hand: SKIN });
  // the pinstripes, and a red pocket square
  for (const x of [-0.17, -0.09, 0.09, 0.17]) put(g.body, mesh(G.box, 0x4A5260, x, 0.6, 0.27)).scale.set(0.006, 0.5, 0.01);
  put(g.body, mesh(G.box, 0xB8323A, 0.15, 0.78, 0.24)).scale.set(0.06, 0.03, 0.012);
  const h = g.head;
  // a big heavy head, wider than it's tall, the mouth wide with thick lips that jut out
  put(h, mesh(G.sphere, SKIN, 0, 0.2, 0.02, true)).scale.set(0.24, 0.2, 0.24);
  put(h, mesh(G.sphere, BELLY, 0, 0.1, 0.1)).scale.set(0.18, 0.08, 0.17);
  const lips = put(h, mesh(new TorusGeometry(0.11, 0.035, 6, 16), 0x9A7E58, 0, 0.12, 0.23)); lips.scale.set(1.15, 0.55, 1);
  put(h, mesh(G.sphere, 0x2A1E1A, 0, 0.12, 0.235)).scale.set(0.11, 0.035, 0.02);
  for (const [a, y] of [[0.6, 0.3], [-0.7, 0.28], [1.2, 0.2], [-1.25, 0.18], [0.2, 0.36], [-0.3, 0.34], [1.5, 0.28], [-1.5, 0.26]]) {
    put(h, mesh(G.sphere, SPOT, Math.sin(a) * 0.235, y, 0.02 + Math.cos(a) * 0.22)).scale.set(0.025, 0.025, 0.02);
  }
  for (const sx of [-1, 1]) eye(h, sx * 0.14, 0.27, 0.15, 0.045, { skin: SKIN, white: 0xEDE3C0, iris: 0xB8862E, lid: 0.15, tilt: -0.2 });
  // his fedora
  const hat = put(h, new Group()); hat.position.set(0, 0.37, -0.01); hat.rotation.set(-0.1, 0, -0.08);
  put(hat, mesh(new CylinderGeometry(0.15, 0.17, 0.14, 18), 0x1E1E22, 0, 0.07, 0));
  put(hat, mesh(new CylinderGeometry(0.28, 0.28, 0.015, 22), 0x1E1E22, 0, 0, 0));
  put(hat, mesh(new CylinderGeometry(0.172, 0.172, 0.03, 18), 0x8E1E2E, 0, 0.02, 0));
  const horn = put(g.body, sax()); horn.position.set(0.02, 1.04, 0.3); horn.rotation.z = 0.3;
  // (the strap, round his neck)
  put(g.body, mesh(G.cyl, 0x111114, 0.0, 0.94, 0.24)).scale.set(0.006, 0.12, 0.006);
  return { g, horn };
}

// ---------- the piano: a sea turtle ----------
function turtle() {
  const SKIN = 0x7A9A4A, DEEP = 0x5A7A34, SHELL = 0x5A4A2A, g = new Hood({ coat: 0x16161A, lapel: 0x0C0C0E, shirt: 0xF4F1EA, hand: SKIN });
  put(g.body, mesh(G.sphere, 0x111114, 0, 0.86, 0.225)).scale.set(0.05, 0.022, 0.02);
  // his shell, on his back under the tux
  const shell = put(g.body, mesh(halfBall, SHELL, 0, 0.6, -0.17, true)); shell.scale.set(0.32, 0.36, 0.2); shell.rotation.x = -Math.PI / 2;
  for (const [x, y] of [[0, 0.62], [-0.15, 0.68], [0.15, 0.68], [-0.15, 0.48], [0.15, 0.48], [0, 0.82], [0, 0.42]]) {
    put(g.body, mesh(G.sphere, 0x7A6438, x, y, -0.36 + Math.abs(x) * 0.25 + Math.abs(y - 0.62) * 0.25)).scale.set(0.07, 0.06, 0.02);
  }
  const h = g.head;
  put(h, mesh(G.sphere, SKIN, 0, 0.17, 0.06, true)).scale.set(0.15, 0.15, 0.19);
  put(h, mesh(G.sphere, DEEP, 0, 0.12, 0.2)).scale.set(0.08, 0.05, 0.07);
  put(h, mesh(G.sphere, 0x2E3A1E, 0, 0.1, 0.235)).scale.set(0.07, 0.008, 0.02);
  for (const [x, y] of [[-0.06, 0.28], [0.07, 0.29], [0, 0.31], [-0.1, 0.22], [0.1, 0.22]]) put(h, mesh(G.sphere, DEEP, x, y, 0.15)).scale.set(0.03, 0.025, 0.015);
  for (const sx of [-1, 1]) {
    eye(h, sx * 0.075, 0.2, 0.2, 0.03, { skin: SKIN, white: 0xF4EEDC, iris: 0x5A3A1A, lid: 0.25, look: -0.4 });
    const lens = put(h, mesh(new TorusGeometry(0.045, 0.006, 5, 16), 0xC9A23A, sx * 0.075, 0.2, 0.235)); lens.rotation.y = sx * 0.1;
  }
  const bridge = put(h, mesh(G.cyl, 0xC9A23A, 0, 0.2, 0.24)); bridge.scale.set(0.004, 0.06, 0.004); bridge.rotation.z = Math.PI / 2;
  for (const [i, a] of g.arms.entries()) { const s = i ? 1 : -1; a.rotation.set(-0.8, 0, -s * 0.22); }
  g.sit(0.47);
  return g;
}

// ---------- the upright bass: a crab ----------
/** An upright bass, standing on its spike at (0, 0, 0): its body (the two bouts and the waist), the neck and its
 *  fingerboard up to the scroll, the strings, the bridge and the tailpiece. */
function upright() {
  const b = new Group(), WOOD = 0x8A3E1A, DARK = 0x4A1E0C;
  put(b, mesh(G.cyl, 0x9A9EA4, 0, 0.1, 0)).scale.set(0.01, 0.2, 0.01);
  put(b, mesh(G.sphere, WOOD, 0, 0.48, 0, true)).scale.set(0.27, 0.28, 0.12);
  put(b, mesh(G.sphere, WOOD, 0, 0.84, 0, true)).scale.set(0.2, 0.2, 0.11);
  put(b, mesh(G.sphere, WOOD, 0, 0.66, 0)).scale.set(0.17, 0.12, 0.1);
  for (const sx of [-1, 1]) { const f = put(b, mesh(G.box, DARK, sx * 0.09, 0.6, 0.115)); f.scale.set(0.012, 0.13, 0.01); f.rotation.z = -sx * 0.15; }
  put(b, mesh(G.box, WOOD, 0, 1.25, -0.02)).scale.set(0.05, 0.62, 0.05);
  put(b, mesh(G.box, 0x111114, 0, 1.18, 0.02)).scale.set(0.05, 0.62, 0.012);
  put(b, mesh(G.sphere, WOOD, 0, 1.6, -0.02)).scale.set(0.035, 0.06, 0.045);
  put(b, mesh(G.box, 0xE8D8B0, 0, 0.62, 0.135)).scale.set(0.1, 0.06, 0.01);
  put(b, mesh(G.box, 0x111114, 0, 0.38, 0.125)).scale.set(0.06, 0.16, 0.012);
  for (const x of [-0.021, -0.007, 0.007, 0.021]) put(b, mesh(G.box, 0xD8D0C0, x, 1.0, 0.035)).scale.set(0.003, 1.1, 0.003);
  return b;
}
function crab() {
  const SHELL = 0xD8542E, DEEP = 0xA83A1E, g = new Hood({ coat: 0x2A3A5A, lapel: 0x1E2A44, shirt: 0x1A1A20, hand: SHELL });
  const h = g.head;
  // a wide flat shell for a head, bumps along its front edge, eyes up on stalks, little mouthparts working under it
  put(h, mesh(G.sphere, SHELL, 0, 0.16, 0, true)).scale.set(0.3, 0.13, 0.22);
  for (let i = 0; i < 5; i++) put(h, mesh(G.sphere, DEEP, -0.2 + i * 0.1, 0.17, 0.2 - Math.abs(i - 2) * 0.03)).scale.set(0.03, 0.025, 0.025);
  put(h, mesh(G.sphere, 0x8A2A14, 0, 0.08, 0.17)).scale.set(0.07, 0.03, 0.04);
  for (const sx of [-1, 1]) {
    const stalk = put(h, mesh(G.cyl, SHELL, sx * 0.07, 0.31, 0.1)); stalk.scale.set(0.018, 0.14, 0.018); stalk.rotation.z = -sx * 0.2;
    eye(h, sx * 0.085, 0.39, 0.1, 0.035, { skin: SHELL, white: 0x16161A, lid: -0.2 });
  }
  // a black beret, at an angle
  const beret = put(h, mesh(G.sphere, 0x16161A, 0.04, 0.27, -0.06)); beret.scale.set(0.17, 0.05, 0.15); beret.rotation.z = -0.25;
  // a claw for each hand
  for (const a of g.arms) {
    const c = put(a, new Group()); c.position.set(0, -0.38, 0.02);
    put(c, mesh(G.sphere, SHELL, 0, 0, 0, true)).scale.set(0.06, 0.07, 0.05);
    const top = put(c, mesh(G.cone, SHELL, 0.02, -0.08, 0.02)); top.scale.set(0.025, 0.09, 0.02); top.rotation.set(Math.PI, 0, 0.2);
    const low = put(c, mesh(G.cone, DEEP, -0.02, -0.07, 0.02)); low.scale.set(0.02, 0.07, 0.018); low.rotation.set(Math.PI, 0, -0.3);
  }
  const bass = put(g, upright()); bass.position.set(-0.08, 0, 0.32); bass.rotation.set(-0.16, 0.35, 0.1);
  g.arms[0].rotation.set(-2.4, 0, 0.55);
  g.arms[1].rotation.set(-1.1, 0, -0.55);
  return { g, bass };
}

// ---------- the drums and the vibes: an octopus ----------
/** One of his arms: a tapering run of suckered lumps out along +x from (0, 0, 0), `n` of them, `len` long. */
function tentacle(skin: number, len: number, n = 10) {
  const t = new Group();
  for (let j = 0; j < n; j++) {
    const k = j / (n - 1), r = 0.045 * (1 - 0.65 * k);
    put(t, mesh(G.sphere, skin, k * len, 0, 0)).scale.set(r * 1.4, r, r);
    if (j % 2) put(t, mesh(G.sphere, 0xF2C8D8, k * len, -r * 0.8, 0)).scale.set(r * 0.4, r * 0.25, r * 0.4);
  }
  return t;
}
function mallet(parent: Object3D, x: number) {
  put(parent, mesh(G.cyl, 0xD8C8A0, x, -0.06, 0)).scale.set(0.006, 0.14, 0.006);
  put(parent, mesh(G.sphere, 0x3A2A5A, x, -0.13, 0)).scale.setScalar(0.022);
}
function octopus() {
  const SKIN = 0x9A4AA0, DEEP = 0x7A3480, g = new Hood({ coat: 0xE8E2D4, lapel: 0xC9C2B4, shirt: 0x1A1A20, hand: SKIN });
  // a striped shirt: navy hoops round the coat
  for (const y of [0.42, 0.56, 0.7]) put(g.body, mesh(new TorusGeometry(0.27 - (y - 0.42) * 0.12, 0.025, 4, 22), 0x2A3A6A, 0, y, 0)).rotation.x = Math.PI / 2;
  const h = g.head;
  // the mantle, big and round, leaning back; big eyes with bar pupils; spots
  const mantle = put(h, mesh(G.sphere, SKIN, 0, 0.32, -0.08, true)); mantle.scale.set(0.24, 0.3, 0.26); mantle.rotation.x = -0.35;
  put(h, mesh(G.sphere, SKIN, 0, 0.12, 0.04)).scale.set(0.2, 0.13, 0.18);
  for (const [x, y, z] of [[0.12, 0.42, 0.1], [-0.1, 0.48, 0.02], [0.05, 0.55, -0.08], [-0.14, 0.32, 0.12]]) put(h, mesh(G.sphere, DEEP, x, y, z)).scale.set(0.03, 0.03, 0.015);
  for (const sx of [-1, 1]) eye(h, sx * 0.1, 0.17, 0.15, 0.05, { skin: SKIN, white: 0xF2E8C8, iris: 0xC9A23A, lid: -0.1, bar: true });
  put(h, mesh(G.sphere, DEEP, 0, 0.08, 0.2)).scale.set(0.03, 0.02, 0.02);
  // a brush in each hand, on the snare
  for (const a of g.arms) {
    put(a, mesh(G.cyl, 0x2A2A2E, 0, -0.44, 0.02)).scale.set(0.008, 0.18, 0.008);
    put(a, mesh(G.cone, 0xB9C2C9, 0, -0.57, 0.02)).scale.set(0.035, 0.1, 0.012);
  }
  g.arms[0].rotation.set(-0.85, 0, 0.1);
  g.arms[1].rotation.set(-0.85, 0, -0.75);
  g.sit(0.5);
  // his other six: two that reach over to the vibes for the bridge, a mallet at each tip; four hanging down off his
  // stool, curling (one on the hi-hat's pedal)
  const D = BAND.drums, V = BAND.vibes, f = D.face;
  const reach = [-0.17, 0.17].map(dz => {
    const wx = V.x - D.x, wz = V.z + dz - D.z, lx = wx * Math.cos(f) - wz * Math.sin(f), lz = wx * Math.sin(f) + wz * Math.cos(f);
    const from = { x: 0.2, y: 0.62, z: 0.12 }, dx = lx - 0.02 - from.x, dzz = lz - from.z, len = Math.hypot(dx, dzz);
    const arm = put(g, new Group()); arm.position.set(from.x, from.y, from.z);
    const aim = Math.atan2(-dzz, dx);
    const t = put(arm, tentacle(SKIN, len));
    mallet(t, len);
    return { arm, aim, len, t };
  });
  const hang = [[-0.18, 0.1, 0.9], [-0.05, 0.16, 1.4], [0.08, 0.16, 1.8], [0.2, 0.05, 2.4]].map(([x, z, a]) => {
    const arm = put(g, new Group()); arm.position.set(x, 0.42, z); arm.rotation.set(0, -a + Math.PI / 2, -1.1);
    put(arm, tentacle(SKIN, 0.42, 7));
    return arm;
  });
  return { g, reach, hang };
}

// ---------- on the stand ----------
const horn = seahorse(), tenor = grouper(), keys = turtle(), bassist = crab(), drummer = octopus();
// (each drawn in a few meshes: whatever moves on its own kept apart)
settle(horn.g, false, [horn.horn, ...horn.cheeks]); flatten(horn.horn);
settle(tenor.g, false, [tenor.horn]); flatten(tenor.horn);
settle(keys);
settle(bassist.g, false, [bassist.bass]); flatten(bassist.bass);
for (const r of drummer.reach) flatten(r.t);
for (const a of drummer.hang) flatten(a);
settle(drummer.g, false, [...drummer.reach.map(r => r.arm), ...drummer.hang]);
place(horn.g, BAND.trumpet); place(tenor.g, BAND.sax); place(keys, BAND.piano); place(bassist.g, BAND.bass); place(drummer.g, BAND.drums);
/** Everyone in the band, for the tests. */
export const band = { trumpet: horn.g, sax: tenor.g, piano: keys, bass: bassist.g, drums: drummer.g };

/** Where the band's got to, in eighths: the music's own place while it's heard, or their own count. */
let own = 0;
/** How far the sax and the vibes arms are in, and how puffed the trumpet's cheeks are (easing). */
const ease = { blow: 0, sax: 0, vibes: 0 };
/** What's due on this eighth, for the tests. */
const state = { bar: 0, s: 0, trumpet: false, sax: false, bridge: false };
export const bandState = () => ({ ...state, sax: ease.sax, vibes: ease.vibes });
/** The music's count, for the room to move to (crowd.ts): `beat` 1 on each beat and 0 between, `sway` round once a bar
 *  (-1 to 1), and which bar of the sixteen. */
export const groove = { beat: 0, sway: 0, bar: 0 };

/** Seconds since the last eighth (this one or up to a bar back) that `has` what's asked for: Infinity if none. */
function since(has: (sc: ReturnType<typeof noirScore>) => boolean) {
  const i = Math.floor(own);
  for (let back = 0; back < 10; back++) if (has(noirScore((i - back + NOIR_STEPS) % NOIR_STEPS))) return (own - i + back) * eighth();
  return Infinity;
}
/** A hit, from a stroke `secs` ago: 1 on it, dying away fast. */
const struck = (secs: number) => Math.exp(-secs * 14);

/** The band, every frame (once the club's found and it's being drawn). Everything they do is on the music's count:
 *  their heads down on every beat and up between (the beats of the 3 + 2, an eighth apart from each other's), their
 *  sway once a bar, each stroke as it's played. */
export function updBand(dt: number) {
  const heard = noirHeard();
  own = heard ?? (own + dt / eighth()) % NOIR_STEPS;
  const i = Math.floor(own) % NOIR_STEPS, sc = noirScore(i);
  Object.assign(state, { bar: sc.bar, s: sc.s, trumpet: sc.trumpet, sax: sc.sax, bridge: sc.bridge });
  // (the sax comes up a beat before the last A, and the vibes arms reach over a beat before the bridge)
  const soon = noirScore((i + 2) % NOIR_STEPS);
  ease.sax += ((sc.sax || soon.sax ? 1 : 0) - ease.sax) * Math.min(1, dt * 4);
  ease.vibes += ((sc.bridge || soon.bridge ? 1 : 0) - ease.vibes) * Math.min(1, dt * 4);
  ease.blow += ((sc.trumpet ? 1 : 0) - ease.blow) * Math.min(1, dt * 10);
  for (const g of [horn.g, tenor.g, keys, bassist.g, drummer.g]) g.update(dt);
  // on the beat: lowest on it, up between (a beat's two eighths); once round a bar for the sway
  const beat = (Math.cos(Math.PI * (own % 2)) + 1) / 2, sway = Math.sin(Math.PI * 2 * own / 10);
  Object.assign(groove, { beat, sway, bar: sc.bar });
  const nod = (g: Hood, k: number) => { g.head.rotation.x += beat * k; g.body.rotation.x = beat * k * 0.25; };
  const note = struck(since(x => x.trumpet)), chord = struck(since(x => x.chord)), tap = struck(since(x => x.chick || (x.swirl && x.s === 6)));
  const pluck = struck(since(x => x.beat)), mallet = struck(since(x => x.vibes));

  // the trumpet: up at his snout, its bell lifting on each note, his cheeks puffed while he blows
  horn.horn.rotation.x = 0.3 - note * 0.12;
  for (const c of horn.cheeks) c.scale.setScalar(0.05 + ease.blow * 0.025);
  horn.g.body.rotation.y = sway * 0.1;
  nod(horn.g, 0.1);
  // the sax: on its strap at his chest till the last A, then up to his mouth
  tenor.horn.position.set(0.02, 0.92 + ease.sax * 0.12, 0.28 + ease.sax * 0.04);
  tenor.horn.rotation.set(0.25 * (1 - ease.sax), 0, 0.3);
  for (const [n, a] of tenor.g.arms.entries()) a.rotation.set(-0.5 - ease.sax * 0.55 - (n ? 0 : 0.25), 0, (n ? -1 : 1) * (0.35 + ease.sax * 0.15));
  tenor.g.body.rotation.z = sway * 0.05;
  nod(tenor.g, 0.1);
  // the piano: his hands down on each chord
  for (const [n, a] of keys.arms.entries()) a.rotation.x = -0.8 + chord * 0.25 * (n ? 1 : 0.7);
  nod(keys, 0.08);
  // the bass: slapped on every beat, swaying with him
  bassist.g.arms[1].rotation.x = -1.1 - pluck * 0.45;
  bassist.bass.rotation.z = 0.1 + sway * 0.03;
  nod(bassist.g, 0.1);
  // the drums: a brush round the snare (twice a bar, as the swirls go), the other tapping the backbeat; for the bridge,
  // two arms over to the vibes, a mallet coming down on each note
  const round = Math.PI * 2 * own / 5;
  drummer.g.arms[0].rotation.set(-0.85 + Math.sin(round) * 0.1, Math.cos(round) * 0.18, 0.1);
  drummer.g.arms[1].rotation.x = -0.85 - tap * 0.35;
  for (const [n, r] of drummer.reach.entries()) {
    const k = ease.vibes, strike = n === (i & 1) ? mallet : mallet * 0.3;
    r.arm.rotation.set(0, r.aim * k + (1 - k) * (0.8 - n * 0.3), (1 - k) * -0.9 - strike * 0.25);
    r.t.scale.x = 0.35 + 0.65 * k;
  }
  drummer.hang.forEach((a, n) => { a.rotation.z = -1.1 + Math.sin(Math.PI * 2 * own / 10 + n * 1.3) * 0.15; });
  nod(drummer.g, 0.1);
}
