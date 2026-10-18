// What the cellar's three repeatable upgrades (economy.ts) look like down there (stage 3): every level bought shows, and
// each track climbs from the slum Mr. Fugu's cellar starts as to an elegant hall, in the arena's own language at the top
// (dark wood, thin gold, purple). Nothing's put on the floor where anyone walks or anything's built later, nothing in
// front of a doorway, a pad or the soup square's flap, and nothing moves. Each level puts what it changed in the
// spotlight (spotlight.ts), as a level bought upstairs does (looks.ts).
//   Word on the street, the arena: 1 scrap tin on the back walls, a hand-painted ARENA board, bare bulbs on a wire;
//     2 sawdust, pallets and cardboard on the dirt, the ring mended with rope, plank scraps, a sack of salt; 3 fixed up:
//     fresh plank walls, a plank walkway to the ring, navy cushions, a salt box; 4 nobori banners along the walls and a
//     scroll over the tunnel; 5 a stone floor, a polished walkway and a deck round the ring; 6 dark panelled walls with
//     thin gold trim, the banners purple and gold; 7 purple cushions; 8 a tournament dohyo: ochre clay, golden bales with
//     the four bulges, clay steps, red salt boxes and a wooden water bucket.
//   Pricier bowls, the soup square: 1 rags on its bamboo, bare bulbs in tin shades, a cardboard sign; 2 fixed up: white
//     paper lanterns and a small wooden sign; 3 slim dark wooden posts and rails, an indigo noren on the ring side; 4 gold
//     bands on the posts, a gold line round the counters' tops, a fugu lantern by the queue. (It has no last level: the
//     looks stop at 4.)
//   Cellar crew, the prep hall and the hires: 1 rags; 2 clean grey work clothes and white headscarves; 3 white plaster
//     panels framed in dark wood on the hall's walls; 4 two indigo crest hangings; 5 three warm pendant lamps; 6 chef
//     whites with indigo trim; 7 a polished dark stone floor with a wood border; 8 dark wood panels with gold trim, and
//     purple collars with a gold crest.
import { AdditiveBlending, type BufferGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Group, type Material, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, type Object3D, PlaneGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { barFrame, cellar, CY, parts, PIT_STEPS, type Place, places, RING, RING_HALF, RING_R, RING_TOP, WALL } from './cellar';
import { BAR, FLAP, TUNNEL_W, TUNNELS } from './cellarPlan';
import { belowGround, Person } from './characters';
import { mods } from './economy';
import { F, type Role } from './fight';
import { apart, Build, detail, dice, K, quietly, rbox, tube } from './kit';
import { ARENA, DOORS, PREP, stage } from './layout';
import { player } from './player';
import { popIn } from './pop';
import { canvasTex, type CanvasTex, type Draw, FONT, G, mesh } from './render';
import { dressCrew } from './ringKitchen';
import { spotlight } from './spotlight';
import { staging } from './stage';

/** Everything here, in the cellar from the start (so it's no furniture of the cellar's to bake: cellar.ts), but empty
 *  until stage 3's first wanted. */
export const cellarLooks = new Group();
cellar.add(cellarLooks);

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
const glow = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1 });
/** A texture drawn once, repeating every `w` by `h` metres where it's laid. */
function tiles(px: number, draw: Draw) {
  let t: CanvasTex | null = null;
  return (w: number, h: number) => {
    t ??= canvasTex(px, px, draw);
    const tex = t.tex.clone(); tex.wrapS = tex.wrapT = 1000; tex.repeat.set(w, h); tex.needsUpdate = true; // RepeatWrapping
    return tex;
  };
}
/** The same number for the same i, between 0 and 1 (never the game's luck). */
const hash = (i: number) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };

// ---------- the levels ----------
/** A look: shown from level `from` up to (not at) `to`; positioned at its foot, so it pops in from there. */
interface Look { o: Group; from: number; to: number }
interface Track {
  id: 'street' | 'bowls' | 'cellarcrew';
  looks: Look[];
  /** The level it's dressed for (-1: not yet). */
  at: number;
  /** How close the camera comes for level n. */
  close: (n: number) => number;
}
const tracks: Record<Track['id'], Track> = {
  street: { id: 'street', looks: [], at: -1, close: n => [0.6, 0.8, 0.7, 0.85, 0.8, 0.9, 0.85, 0.75, 0.6][n] ?? 0.8 },
  bowls: { id: 'bowls', looks: [], at: -1, close: () => 0.45 },
  cellarcrew: { id: 'cellarcrew', looks: [], at: -1, close: n => [0.6, 0.55, 0.55, 0.65, 0.55, 0.65, 0.55, 0.7, 0.65][n] ?? 0.6 },
};
/** Each track's looks, and the levels each shows at (for tests). */
export const looksOf = (id: Track['id']): readonly Readonly<Look>[] => tracks[id].looks;
/** A new look for `t` from level `from` to `to`, at (x, y, z): what goes in it goes in in the cellar's own coordinates
 *  (the group returned). */
function look(t: Track, from: number, to: number, x: number, y: number, z: number) {
  const o = new Group(); o.position.set(x, y, z); o.visible = false;
  const inner = new Group(); inner.position.set(-x, -y, -z);
  o.add(inner);
  cellarLooks.add(o);
  t.looks.push({ o, from, to });
  return inner;
}
const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
/** A flat picture facing +z (or turned `ry`), `w` by `h`, its middle at (x, y, z). */
function sheet(p: Object3D, m: Material, x: number, y: number, z: number, w: number, h: number, ry = 0, rz = 0) {
  const s = add(p, new Mesh(new PlaneGeometry(w, h), m));
  s.position.set(x, y, z); s.rotation.set(0, ry, rz); s.receiveShadow = true;
  return s;
}
/** Many flat pictures in one material, merged into one mesh: each (x, y, z, w, h, ry, rz). */
function sheets(p: Object3D, m: Material, list: [number, number, number, number, number, number?, number?][]) {
  const m4 = new Matrix4(), geos = list.map(([x, y, z, w, h, ry = 0, rz = 0]) => {
    const g = new PlaneGeometry(w, h);
    g.applyMatrix4(m4.makeRotationZ(rz)); g.applyMatrix4(m4.makeRotationY(ry)); g.translate(x, y, z);
    return g;
  });
  const o = add(p, new Mesh(mergeGeometries(geos)!, m));
  o.receiveShadow = true;
  geos.forEach(g => g.dispose());
  return o;
}
/** Pictures lying flat on the floor at height `y`, in one material, merged: each (x, z, w, d). */
function flat(p: Object3D, m: Material, list: [number, number, number, number][], y: number) {
  const geos = list.map(([x, z, w, d]) => { const g = new PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g; });
  const o = add(p, new Mesh(mergeGeometries(geos)!, m));
  o.receiveShadow = true;
  geos.forEach(g => g.dispose());
  return o;
}
/** Small round things in one glowing material, merged: each a ball at (x, y, z), `r` across. */
function balls(p: Object3D, m: Material, at: Vector3[], r: number, ry = r) {
  const geos = at.map(v => { const g = K.ball.clone(); g.scale(r, ry, r); g.translate(v.x, v.y, v.z); return g; });
  const o = add(p, new Mesh(mergeGeometries(geos)!, m));
  geos.forEach(g => g.dispose());
  return o;
}
/** A point every 1/`n` of the way along a string hung from `a` to `b`, sagging `drop` in the middle. */
const sag = (a: Vector3, b: Vector3, drop: number, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, q = a.clone().lerp(b, t); q.y -= drop * 4 * t * (1 - t); return q;
});
const wire = (p: Object3D, pts: Vector3[], r: number, c: number) => add(p, mesh(new TubeGeometry(new CatmullRomCurve3(pts), pts.length * 2, r, 4), c));

// ---------- the pictures ----------
/** Rusty corrugated tin: ribs down it, rust running from its rivets. */
const tin = (base: string, rust: string) => tiles(128, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8) { c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x, 0, 3, h); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 5, 0, 2, h); }
  for (let i = 0; i < 26; i++) {
    c.fillStyle = rust; c.globalAlpha = 0.25 + hash(i) * 0.45;
    c.beginPath(); c.ellipse(hash(i + 50) * w, hash(i + 90) * h, 3 + hash(i + 7) * 10, 6 + hash(i + 3) * 22, 0, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1; c.fillStyle = '#2E2A26';
  for (let x = 6; x < w; x += 20) { c.fillRect(x, 4, 3, 3); c.fillRect(x, h - 7, 3, 3); }
});
const TIN = [tin('#8A9096', '#8E4A22'), tin('#9A7A5E', '#6E3416')];
/** Fresh plank boards, standing up, a batten across. */
const planks = tiles(256, (c, w, h) => {
  const n = 8, tones = ['#C9A06A', '#BF955F', '#D1A872', '#C49A64'];
  for (let i = 0; i < n; i++) {
    c.fillStyle = tones[i % 4]; c.fillRect(i * w / n, 0, w / n, h);
    c.fillStyle = 'rgba(120,80,40,.12)'; for (let k = 0; k < 4; k++) c.fillRect(i * w / n + 4 + hash(i * 9 + k) * (w / n - 8), 0, 1.5, h);
    c.fillStyle = 'rgba(70,40,20,.55)'; c.fillRect(i * w / n, 0, 2, h);
  }
  c.fillStyle = '#A57A48'; c.fillRect(0, h * 0.46, w, h * 0.06);
  c.fillStyle = 'rgba(70,40,20,.4)'; c.fillRect(0, h * 0.52, w, 2);
  c.fillStyle = '#5B3424'; for (let i = 0; i < n; i++) { c.fillRect(i * w / n + 8, h * 0.48, 3, 3); c.fillRect((i + 1) * w / n - 11, h * 0.48, 3, 3); }
});
/** Dark wood panelling, two panels a tile, each framed in a thin gold line. */
const panels = tiles(256, (c, w, h) => {
  c.fillStyle = '#4A2618'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? 'rgba(20,8,4,.18)' : 'rgba(120,60,30,.10)'; c.fillRect(hash(i) * w, 0, 1.5 + hash(i + 3) * 2, h); }
  c.fillStyle = '#3A1C12'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, 8, h); c.fillRect(w / 2 - 6, 0, 12, h);
  c.strokeStyle = '#D2AA4A'; c.lineWidth = 3;
  for (const x of [0, w / 2]) c.strokeRect(x + 22, 26, w / 2 - 44, h - 52);
});
/** Big grey stone tiles, a metre each, in a few tones. */
const stoneTiles = tiles(256, (c, w, h) => {
  c.fillStyle = '#3A3836'; c.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const g = 118 + Math.floor(hash(i * 7 + j * 13) * 26);
    c.fillStyle = `rgb(${g},${g - 2},${g - 6})`; c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(i * s + 4, j * s + 4, s - 8, 4);
  }
});
/** Polished dark slate, for the prep hall: smaller tiles, a cool sheen across each. */
const slate = tiles(256, (c, w, h) => {
  c.fillStyle = '#22272C'; c.fillRect(0, 0, w, h);
  const n = 5, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const g = 58 + Math.floor(hash(i * 5 + j * 11 + 3) * 14);
    c.fillStyle = `rgb(${g - 4},${g + 2},${g + 10})`; c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    c.fillStyle = 'rgba(200,220,240,.07)'; c.fillRect(i * s + 6, j * s + s * 0.3, s - 12, 3);
  }
});
/** Sawdust spilled on the dirt: pale shavings, thinning out at the edge. */
let sawdustTex: CanvasTex | null = null;
const sawdust = () => (sawdustTex ??= canvasTex(128, 128, (c, w, h) => {
  for (let i = 0; i < 700; i++) {
    const a = hash(i) * Math.PI * 2, r = Math.sqrt(hash(i + 900)) * w * 0.48;
    c.fillStyle = i % 3 ? 'rgba(226,196,140,.85)' : 'rgba(190,150,96,.8)';
    c.fillRect(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 2 + hash(i + 3) * 3, 1.5);
  }
}));
/** A nobori banner: a coloured field, a band across the top, 相撲 brushed down it. */
const banner = (field: string, band: string, ink: string) => canvasTex(64, 256, (c, w, h) => {
  c.fillStyle = field; c.fillRect(0, 0, w, h);
  c.fillStyle = band; c.fillRect(0, 0, w, 22); c.fillRect(0, h - 10, w, 10);
  c.fillStyle = ink; c.font = `800 46px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  ['相', '撲'].forEach((ch, i) => c.fillText(ch, w / 2, 70 + i * 66));
  c.font = `800 22px ${MINCHO}`; c.fillText('撲', w / 2, 206);
});
/** A board with `text` on it, as `draw` paints it. */
const board = (w: number, h: number, draw: Draw) => new MeshLambertMaterial({ map: canvasTex(w, h, draw).tex });
/** A round crest: a puffer fish in a ring, `ink` on the cloth. */
function crest(c: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string) {
  c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = r * 0.12;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(x - r * 0.08, y, r * 0.5, r * 0.4, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + r * 0.35, y); c.lineTo(x + r * 0.72, y - r * 0.3); c.lineTo(x + r * 0.72, y + r * 0.3); c.fill();
}
let indigoCloth: MeshLambertMaterial | null = null;
/** Indigo cloth with a white crest, both sides. */
const crestCloth = () => (indigoCloth ??= new MeshLambertMaterial({
  side: DoubleSide,
  map: canvasTex(128, 160, (c, w, h) => {
    c.fillStyle = '#26345E'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 1);
    crest(c, w / 2, h * 0.5, w * 0.3, '#F4F1EA');
  }).tex,
}));

// ---------- Word on the street: the arena ----------
const R = RING_TOP;
/** The arena's tall back walls, north and west: the stretches each side of its fans' tunnel, and over the tunnel (from
 *  its frame up). `face` is where a sheet on it hangs, just in front of its piles' beams. */
const BACK = (['n', 'w'] as const).flatMap(side => {
  const t = TUNNELS.find(u => u.side === side)!, g0 = t.at - TUNNEL_W / 2 - 0.35, g1 = t.at + TUNNEL_W / 2 + 0.35;
  const [a0, a1] = side === 'n' ? [ARENA.x0 - 0.3, ARENA.x1 + 0.3] : [ARENA.z0 - 0.3, ARENA.z1 + 0.3];
  const face = side === 'n' ? ARENA.z0 - 0.135 : ARENA.x0 - 0.135;
  return [{ side, a0, a1: g0, y0: 0.5, face }, { side, a0: g0, a1: g1, y0: 2.15, face: face + 0.045 }, { side, a0: g1, a1, y0: 0.5, face }].filter(s => s.a1 - s.a0 > 0.4);
});
/** A spot on a back wall: `a` along it, `y` up, `out` from its face; and which way a sheet there faces. */
const onBack = (side: 'n' | 'w', a: number, y: number, out: number): [number, number, number, number] =>
  side === 'n' ? [a, CY + y, ARENA.z0 - 0.135 + out, 0] : [ARENA.x0 - 0.135 + out, CY + y, a, Math.PI / 2];
/** Covers the back walls from their footings to under their caps in `tex` (a tile every 2 m). */
function clad(p: Object3D, tex: (w: number, h: number) => MeshLambertMaterial['map']) {
  for (const s of BACK) {
    const w = s.a1 - s.a0, h = 6.1 - s.y0, m = new MeshLambertMaterial({ map: tex(w / 2, h / 2) });
    const [x, y, z, ry] = s.side === 'n' ? [(s.a0 + s.a1) / 2, CY + (s.y0 + 6.1) / 2, s.face, 0] : [s.face, CY + (s.y0 + 6.1) / 2, (s.a0 + s.a1) / 2, Math.PI / 2];
    sheet(p, m, x, y, z, w, h, ry);
  }
}
/** Where the arena's wall lanterns hang (cellar.ts): along the north wall, and the west. */
const LANTERNS = {
  n: Array.from({ length: Math.floor((ARENA.x1 - 1 - ARENA.x0 - 1.5) / 2.4) + 1 }, (_, i) => ARENA.x0 + 1.5 + i * 2.4),
  w: Array.from({ length: Math.floor((ARENA.z1 - 1 - ARENA.z0 - 1.5) / 2.4) + 1 }, (_, i) => ARENA.z0 + 1.5 + i * 2.4),
};
/** Where the banners hang: between the lanterns, clear of the RING sign, the tunnel and the corners. */
const BANNERS: { side: 'n' | 'w'; a: number }[] = [
  ...[-10.75, -8.4, -3.45, -1.2, 1.2, 3.1].map(a => ({ side: 'n' as const, a })),
  ...[-6.8, -4.4, -2.0, 0.4, 2.8].map(a => ({ side: 'w' as const, a })),
];
/** The seats' cushions, a part of the stands each, shown with it (cellar.ts' parts). */
const seatGroups: { g: Object3D; part: Place['part'] }[] = [];

function buildStreet() {
  const t = tracks.street, NX = (ARENA.x0 + ARENA.x1) / 2, NZ = ARENA.z0 - 0.1;
  // 1–2: scrap tin patched over the piles, the ARENA board, and bare bulbs on a wire (the bulbs stay)
  {
    const g = look(t, 1, 3, NX, CY, NZ);
    const patches: [('n' | 'w'), number, number, number, number][] = [
      ['n', -9.9, 1.6, 1.5, 1.9], ['n', -8.0, 2.9, 1.2, 1.5], ['n', -6.6, 1.3, 1.6, 1.4], ['n', -2.8, 1.7, 1.4, 2.0], ['n', -1.0, 3.4, 1.1, 1.3],
      ['n', 0.9, 1.5, 1.5, 1.7], ['n', 2.7, 2.6, 1.2, 1.8], ['n', -13.3, 2.2, 0.8, 1.6], ['n', -4.6, 4.9, 1.3, 1.0],
      ['w', -8.5, 1.8, 1.4, 1.9], ['w', -6.4, 3.2, 1.2, 1.4], ['w', -4.0, 1.5, 1.6, 1.6], ['w', -1.4, 2.6, 1.3, 2.1], ['w', 1.3, 1.6, 1.5, 1.5],
      ['w', 3.6, 2.9, 1.2, 1.6],
    ];
    TIN.forEach((tex, k) => sheets(g, new MeshLambertMaterial({ map: tex(0.7, 0.7) }), patches.filter((_, i) => i % 2 === k).map(([side, a, y, w, h], i) => {
      const [x, yy, z, ry] = onBack(side, a, y, 0.01 + (i % 2) * 0.004);
      return [x, yy, z, w, h, ry, (hash(i + k * 20) - 0.5) * 0.08];
    })));
    // the board, hand-painted, nailed up over the RING sign, above the lanterns
    const sign = board(256, 80, (c, w, h) => {
      c.fillStyle = '#7A5A3C'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 20) { c.fillStyle = 'rgba(30,18,10,.35)'; c.fillRect(0, y, w, 2); }
      c.fillStyle = '#F2EBDD'; c.font = `800 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.translate(w / 2, h / 2 + 4); c.rotate(-0.03); c.fillText('ARENA', 0, 0); c.restore();
      c.fillStyle = 'rgba(242,235,221,.5)'; c.fillRect(w * 0.62, h * 0.72, 3, 12);
    });
    sheet(g, sign, NX, CY + 4.75, ARENA.z0 - 0.085, 2.0, 0.62, 0, 0.03);
    const nails = new Build();
    for (const s of [-1, 1]) nails.add(K.dot, 0x2E2E33, NX + s * 0.9, CY + 4.75 + s * 0.03, ARENA.z0 - 0.07, null, 0.03);
    add(g, nails.mesh(false));
  }
  {
    const g = look(t, 1, 99, NX, CY + 4.4, NZ), Y = CY + 4.45, bulbs: Vector3[] = [];
    const run = (side: 'n' | 'w', hooks: number[]) => {
      const pt = (a: number, y: number) => side === 'n' ? V(a, y, ARENA.z0 + 0.06) : V(ARENA.x0 + 0.06, y, a);
      const pts: Vector3[] = [];
      for (let i = 0; i + 1 < hooks.length; i++) {
        const span = sag(pt(hooks[i], Y), pt(hooks[i + 1], Y), 0.28, 8);
        pts.push(...(i ? span.slice(1) : span));
        for (const k of [2, 4, 6]) bulbs.push(span[k].clone().setY(span[k].y - 0.1));
      }
      wire(g, pts, 0.01, 0x1A1614);
    };
    run('n', [ARENA.x0 + 0.2, ...LANTERNS.n, ARENA.x1 - 0.2]);
    run('w', [ARENA.z0 + 0.2, ...LANTERNS.w, ARENA.z1 - 0.2]);
    balls(g, glow(0xFFF1C8, 0xFFC872), bulbs, 0.055, 0.07);
    const caps = new Build();
    for (const b of bulbs) caps.add(tube(0.025, 0.025, 0.06, 6), 0x2A2420, b.x, b.y + 0.08, b.z);
    add(g, caps.mesh(false));
  }
  // 2: sawdust over the dirt, pallets and flattened cardboard laid down to the ring, plank scraps leaning on it, a sack of
  // salt by its west steps
  {
    const g = look(t, 2, 3, RING.x - 4.5, CY, RING.z + 3.5);
    const dust = new MeshLambertMaterial({ map: sawdust().tex, transparent: true, depthWrite: false });
    flat(g, dust, [[-9.6, -3.2, 2.0, 1.6], [-9.2, 2.6, 2.4, 1.8], [-6.2, 3.6, 2.2, 1.4], [-2.6, 3.4, 1.8, 1.4], [-0.2, -2.0, 1.8, 1.6], [-6.6, -6.2, 2.0, 1.4]], CY + 0.006);
    const b = new Build(), PAL = [0xA88760, 0x9A7A52, 0xB0906A];
    /** A pallet, its slats along z, at (x, z). */
    const pallet = (x: number, z: number, k: number) => {
      for (const dx of [-0.5, 0, 0.5]) b.add(G.box, 0x6A4E32, x + dx, CY + 0.04, z, null, [0.1, 0.08, 1.1]);
      for (let j = 0; j < 5; j++) b.add(G.box, PAL[(j + k) % 3], x, CY + 0.09, z - 0.48 + j * 0.24, null, [1.2, 0.025, 0.16]);
    };
    pallet(-9.6, 4.6, 0); pallet(-9.6, 3.2, 1); pallet(-9.4, 1.9, 2);
    for (const [x, z, r] of [[-8.0, 4.2, 0.3], [-7.0, 5.0, -0.2], [-8.6, 5.6, 0.5]]) b.add(G.box, 0xB8936A, x, CY + 0.01, z, [0, r, 0], [1.0, 0.012, 0.8]);
    // plank scraps leaning on the ring's south and west sides
    for (const [x, rz] of [[-6.6, 0.12], [-5.4, -0.08], [-1.8, 0.15]]) b.add(G.box, x < -6 ? 0x7A6248 : 0x8E7050, RING.x + x + 4.4, CY + 0.36, RING.z + RING_HALF + 0.14, [-0.28, 0, rz], [0.24, 0.8, 0.035]);
    for (const [z, rx] of [[-3.7, 0.1], [0.7, -0.12]]) b.add(G.box, 0x84684C, RING.x - RING_HALF - 0.14, CY + 0.36, RING.z + z + 1.4, [rx, 0, 0.28], [0.035, 0.8, 0.24]);
    // the sack
    b.add(K.ball, 0xC9B98E, -8.1, CY + 0.24, -3.5, null, [0.24, 0.26, 0.2]);
    b.add(K.ball, 0xF4F1EA, -8.1, CY + 0.47, -3.5, null, [0.13, 0.05, 0.11]);
    b.add(tube(0.05, 0.07, 0.1, 6), 0x8A7A52, -8.1, CY + 0.5, -3.5);
    add(g, b.mesh(true));
  }
  // 2–7: the ring's bales mended, a rope tied round them here and there (High: its loose ends)
  {
    const g = look(t, 2, 8, RING.x, CY, RING.z), b = new Build(), ends = new Build(), out = RING_HALF - 0.08;
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2, nx = Math.cos(a), nz = Math.sin(a), alongZ = side % 2 === 0;
      for (const s of [-1.6, 0.5, 2.3]) {
        const x = RING.x + nx * out - nz * s, z = RING.z + nz * out + nx * s;
        for (const y of [0.15, 0.44]) b.add(new TorusGeometry(0.17, 0.028, 4, 12), 0x5A4428, x, CY + y, z, alongZ ? [0, 0, 0] : [0, Math.PI / 2, 0]);
        for (const k of [-1, 1]) ends.add(G.cone, 0x6E5530, x + nx * 0.2, CY + 0.5, z + nz * 0.2 + k * 0.04 * (alongZ ? 1 : 0), [nz * 0.6, 0, -nx * 0.6], [0.025, 0.14, 0.025]);
      }
    }
    add(g, b.mesh(false));
    const hi = add(g, ends.mesh(false));
    detail(null, hi);
  }
  // 3–7: a wooden salt box over the tin bucket on the ring's north-east corner
  {
    const c = RING_HALF - 0.55, x = RING.x + c, z = RING.z - c, g = look(t, 3, 8, x, CY + R, z), b = new Build();
    b.add(rbox(0.52, 0.42, 0.52, 0.02), 0xB8925E, x, CY + R + 0.21, z);
    b.add(rbox(0.56, 0.05, 0.56, 0.01), 0x6E4C30, x, CY + R + 0.41, z);
    b.add(G.box, 0xF4F1EA, x, CY + R + 0.425, z, null, [0.44, 0.01, 0.44]);
    add(g, b.mesh(true));
  }
  // 3: the tin's down for fresh plank walls, and a walkway of planks to the ring's west steps (3–4: then polished, 5–)
  clad(look(t, 3, 6, NX, CY, NZ), planks);
  const walkway = (from: number, to: number, c: number[]) => {
    const g = look(t, from, to, -9.6, CY, 2.4), b = new Build(), steps = RING.x - RING_HALF - PIT_STEPS[1].out - 0.2;
    for (let i = 0, z = 6.3; z > RING.z + 0.45; z -= 0.22, i++) b.add(G.box, c[i % c.length], -9.6, CY + 0.012, z, null, [0.95, 0.024, 0.2]);
    for (let i = 0, x = -9.1; x < steps; x += 0.22, i++) b.add(G.box, c[(i + 1) % c.length], x + 0.11, CY + 0.012, RING.z, null, [0.2, 0.024, 0.95]);
    for (const s of [-1, 1]) b.add(G.box, c[2], -9.6 + s * 0.5, CY + 0.014, (6.4 + RING.z + 0.45) / 2, null, [0.06, 0.028, 6.4 - RING.z - 0.45]);
    add(g, b.mesh(false));
  };
  walkway(3, 5, [0xD1A872, 0xC49A64, 0xA57A48]);
  // the cushions: navy (3–6), then purple (7–)
  const cushions = (from: number, to: number, c: number, piping: number) => {
    const g = look(t, from, to, ARENA.x0 + 2, CY + 1, ARENA.z0 + 2), geo = rbox(0.42, 0.07, 0.38, 0.025);
    const byPart = new Map<Place['part'], Build>();
    for (const p of places) {
      const b = byPart.get(p.part) ?? byPart.set(p.part, new Build()).get(p.part)!;
      // (the VIP boxes' seats are a cushion on each box's mat, under where the fan kneels)
      const y = p.part === 'vip' ? CY + 0.455 : p.pos.y + 0.06, z = p.part === 'vip' ? p.pos.z + 0.1 : p.pos.z;
      b.add(geo, c, p.pos.x, y, z);
      b.add(G.box, piping, p.pos.x, y + 0.036, z, null, [0.3, 0.004, 0.02]);
    }
    for (const [part, b] of byPart) { const m = add(g, b.mesh(false)); seatGroups.push({ g: m, part }); }
  };
  cushions(3, 7, 0x2B3A67, 0x3E5088);
  // 4: nobori banners between the lanterns, and a scroll over the north tunnel: white and indigo (4–5), then purple and
  // gold (6–)
  const banners = (from: number, to: number, mats: MeshLambertMaterial[]) => {
    const g = look(t, from, to, NX, CY + 3, NZ), b = new Build();
    mats.forEach((m, k) => sheets(g, m, BANNERS.filter((_, i) => i % 2 === k).map(({ side, a }) => {
      const [x, y, z, ry] = onBack(side, a, 3.05, 0.05);
      return [x, y, z, 0.55, 2.3, ry];
    })));
    for (const { side, a } of BANNERS) for (const y of [4.22, 1.88]) {
      const [x, yy, z] = onBack(side, a, y, 0.07);
      b.add(G.cyl, 0x2A1810, x, yy, z, side === 'n' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], [0.025, 0.66, 0.025]);
    }
    add(g, b.mesh(false));
  };
  const tex = (field: string, band: string, ink: string) => new MeshLambertMaterial({ map: banner(field, band, ink).tex, side: DoubleSide });
  banners(4, 6, [tex('#F2EEE4', '#26345E', '#1E1A18'), tex('#26345E', '#F2EEE4', '#F4F1EA')]);
  banners(6, 99, [tex('#4A2266', '#C9A23A', '#F2D06B'), tex('#5B2A86', '#C9A23A', '#F4F1EA')]);
  {
    const tx = TUNNELS.find(u => u.side === 'n')!.at, g = look(t, 4, 99, tx, CY + 5.2, NZ);
    const scroll = board(128, 192, (c, w, h) => {
      c.fillStyle = '#EFE6CF'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8A6A3A'; c.lineWidth = 4; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#1E1A18'; c.font = `800 62px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('相', w / 2, h * 0.32); c.fillText('撲', w / 2, h * 0.68);
    });
    sheet(g, scroll, tx, CY + 5.2, ARENA.z0 - 0.06, 0.8, 1.2);
    const rods = new Build();
    for (const y of [5.82, 4.58]) rods.add(G.cyl, 0x2A1810, tx, CY + y, ARENA.z0 - 0.05, [0, 0, Math.PI / 2], [0.03, 0.92, 0.03]);
    add(g, rods.mesh(false));
  }
  // 5: a stone floor, the walkway polished dark, and a deck of it round the ring's foot
  {
    const g = look(t, 5, 99, RING.x, CY, RING.z), w = ARENA.x1 - ARENA.x0 + 0.2, d = ARENA.z1 - ARENA.z0 + 0.2;
    const f = add(g, new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ map: stoneTiles(w / 4, d / 4) })));
    f.rotation.x = -Math.PI / 2; f.position.set((ARENA.x0 + ARENA.x1) / 2, CY + 0.003, (ARENA.z0 + ARENA.z1) / 2); f.receiveShadow = true;
    const b = new Build(), seams = new Build(), IN = RING_HALF - 0.05, OUT = RING_HALF + 1.0, mid = (IN + OUT) / 2;
    for (const [sx, sz, len, alongX] of [[0, -1, OUT * 2, true], [0, 1, OUT * 2, true], [-1, 0, IN * 2, false], [1, 0, IN * 2, false]] as const) {
      const x = RING.x + sx * mid, z = RING.z + sz * mid;
      b.add(G.box, 0x4A2A1C, x, CY + 0.016, z, null, alongX ? [len, 0.026, OUT - IN] : [OUT - IN, 0.026, len]);
      for (let a = -len / 2 + 0.3; a < len / 2; a += 0.3) seams.add(G.box, 0x2E1810, alongX ? x + a : x, CY + 0.03, alongX ? z : z + a, null, alongX ? [0.012, 0.002, OUT - IN] : [OUT - IN, 0.002, 0.012]);
    }
    add(g, b.mesh(false));
    detail(null, add(g, seams.mesh(false)));
  }
  walkway(5, 99, [0x4A2A1C, 0x52301F, 0x2E1810]);
  // 6: dark panelling with thin gold trim
  clad(look(t, 6, 99, NX, CY, NZ), panels);
  // 7: purple cushions
  cushions(7, 99, 0x5B2A86, 0xC9A23A);
  // 8: a tournament dohyo, built over the pit: a mound of ochre clay with sloping sides, golden straw bales round the
  // ring with the four bulges out at north, south, east and west, more along the top's edge, steps cut into the clay,
  // raked sand round the ring, red lacquer salt boxes on two corners and a wooden water bucket on another
  {
    const g = look(t, 8, 99, RING.x, CY, RING.z), b = new Build(), TOP = RING_HALF + 0.12, FOOT = RING_HALF + 0.32;
    const CLAY = 0xC98A4E, STRAW = 0xE2C064;
    // (the mound's a square frustum: a cylinder of four sides, turned to square up)
    b.add(new CylinderGeometry(TOP * Math.SQRT2, FOOT * Math.SQRT2, R + 0.004, 4, 1), CLAY, RING.x, CY + (R + 0.004) / 2, RING.z, [0, Math.PI / 4, 0]);
    const top = canvasTex(512, 512, (c, w, h) => {
      const px = w / (TOP * 2), cx = w / 2, r = RING_R * px;
      c.fillStyle = '#D29A5C'; c.fillRect(0, 0, w, h);
      const shine = c.createRadialGradient(cx, cx, r * 0.2, cx, cx, r);
      shine.addColorStop(0, 'rgba(240,190,120,.35)'); shine.addColorStop(1, 'rgba(240,190,120,0)');
      c.fillStyle = shine; c.fillRect(0, 0, w, h);
      // the band of raked sand round the ring, combed in rings
      c.fillStyle = '#E6CFA2'; c.beginPath(); c.arc(cx, cx, r + 0.6 * px, 0, Math.PI * 2); c.arc(cx, cx, r + 0.12 * px, 0, Math.PI * 2, true); c.fill();
      c.strokeStyle = 'rgba(150,110,60,.35)'; c.lineWidth = 1.5;
      for (let k = 0.18; k < 0.6; k += 0.07) { c.beginPath(); c.arc(cx, cx, r + k * px, 0, Math.PI * 2); c.stroke(); }
    });
    const face = add(g, new Mesh(new PlaneGeometry(TOP * 2, TOP * 2), new MeshLambertMaterial({ map: top.tex })));
    face.rotation.x = -Math.PI / 2; face.position.set(RING.x, CY + R + 0.006, RING.z); face.receiveShadow = true;
    // the ring of bales over the hawser, and the four bulges just out from it
    b.add(new TorusGeometry(RING_R, 0.15, 6, 64), STRAW, RING.x, CY + R + 0.07, RING.z, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      b.add(new TorusGeometry(RING_R + 0.3, 0.12, 6, 10, 0.24), STRAW, RING.x, CY + R + 0.07, RING.z, [Math.PI / 2, 0, a - 0.12]);
    }
    // bales along the top's four edges, and a band of rope on each
    for (let k = 0; k < 4; k++) {
      const alongX = k % 2 === 0, s = k < 2 ? -1 : 1, x = RING.x + (alongX ? 0 : s * (TOP - 0.16)), z = RING.z + (alongX ? s * (TOP - 0.16) : 0);
      b.add(G.cyl, STRAW, x, CY + R + 0.09, z, alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], [0.1, TOP * 2 - 0.4, 0.1]);
    }
    // the steps, cut into the clay over the pallets, east and west, edged in straw
    for (const sx of [-1, 1]) for (const { out, top: h } of PIT_STEPS) {
      const x = RING.x + sx * (RING_HALF + out);
      b.add(G.box, CLAY, x, CY + h / 2, RING.z, null, [0.5, h + 0.01, 1.32]);
      b.add(G.cyl, STRAW, x + sx * 0.23, CY + h - 0.02, RING.z, [Math.PI / 2, 0, 0], [0.045, 1.3, 0.045]);
    }
    // the salt boxes, red lacquer on black stands, over the tin buckets' corners, and the water bucket
    const c = RING_HALF - 0.55;
    for (const [dx, dz] of [[c, -c], [-c, -c]]) {
      const x = RING.x + dx, z = RING.z + dz;
      b.add(rbox(0.5, 0.12, 0.5, 0.015), 0x1E1612, x, CY + R + 0.06, z);
      b.add(rbox(0.46, 0.3, 0.46, 0.02), 0xB0302A, x, CY + R + 0.27, z);
      b.add(G.box, 0xF4F1EA, x, CY + R + 0.425, z, null, [0.38, 0.01, 0.38]);
    }
    b.add(tube(0.26, 0.23, 0.36, 14), 0x9A6A3E, RING.x - c, CY + R + 0.18, RING.z + c);
    for (const y of [0.08, 0.28]) b.add(new TorusGeometry(0.25, 0.015, 4, 16), 0x2E2E33, RING.x - c, CY + R + y, RING.z + c, [Math.PI / 2, 0, 0]);
    b.add(tube(0.235, 0.235, 0.01, 14), 0x3C6E8F, RING.x - c, CY + R + 0.34, RING.z + c);
    add(g, b.mesh(true));
  }
}

// ---------- Pricier bowls: the soup square ----------
/** The square's corner posts (where its bamboo poles stand: cellar.ts), how high they stand, and where its back and
 *  sides hang their things. */
const POST = (() => {
  const { x0, x1, z0, z1 } = BAR;
  return [V(x0 + 0.08, 0, z0 + 0.08), V(x1 - 0.14, 0, z0 + 0.08), V(x1 - 0.14, 0, z1 - 0.12), V(x0 + 0.08, 0, z1 - 0.12)];
})();
const POLE = 2.7;
/** The square's three hung sides, post to post (none across the front, the camera's): west, back, east. */
const SIDES: [number, number][] = [[3, 0], [0, 1], [1, 2]];

function buildBowls() {
  const t = tracks.bowls, { x0, x1, z0, d, top: TOP } = BAR, MX = (x0 + x1) / 2;
  const tops = POST.map(p => V(p.x, CY + POLE - 0.1, p.z));
  // 1–2: its bamboo poles and the crossbar along its back, as they were
  {
    const g = look(t, 1, 3, MX, CY, BAR.z), b = new Build(), SEG = POLE / 3;
    for (const p of POST) for (let k = 0; k < 3; k++) {
      b.add(G.cyl, k % 2 ? 0x8FA552 : 0x7E9446, p.x, CY + (k + 0.5) * SEG, p.z, null, [0.06, SEG, 0.06]);
      b.add(G.cyl, 0x5E6E30, p.x, CY + (k + 1) * SEG, p.z, null, [0.072, 0.04, 0.072]);
    }
    b.add(G.cyl, 0x7E9446, MX, CY + POLE - 0.04, z0 + 0.08, [0, 0, Math.PI / 2], [0.05, x1 - x0 - 0.1, 0.05]);
    add(g, b.mesh(true));
  }
  /** Strings sagging between the poles, round the three sides, and what hangs off them: `hang(b, at, side, k)`. */
  const strings = (g: Object3D, hang: (at: Vector3, side: number, k: number) => void) => {
    SIDES.forEach(([i, j], side) => {
      const along = sag(tops[i], tops[j], 0.3, 10);
      wire(g, along, 0.012, 0x1A1614);
      for (let k = 2; k < 10; k += 2) hang(along[k], side, k / 2);
    });
  };
  // 1: rags on the frame, bare bulbs in tin-can shades on the strings, and a scrap of cardboard for a sign
  {
    const g = look(t, 1, 2, MX, CY + POLE, z0), b = new Build(), bulbs: Vector3[] = [], RAG = [0x9A5A48, 0x5E6E7A, 0xA8946A, 0x7A6E5E];
    strings(g, (p, side, k) => {
      if ((k + side) % 2) {
        bulbs.push(V(p.x, p.y - 0.32, p.z));
        b.add(tube(0.05, 0.09, 0.1, 8, true), 0x8A9096, p.x, p.y - 0.18, p.z);
        b.add(G.cyl, 0x2A2420, p.x, p.y - 0.06, p.z, null, [0.008, 0.14, 0.008]);
      } else b.add(G.box, RAG[(k + side) % 4], p.x, p.y - 0.26, p.z, [0, side === 1 ? 0 : Math.PI / 2, (k % 2 ? 1 : -1) * 0.12], [0.26, 0.52, 0.015]);
    });
    // (rags over the crossbar too, between where the strings hang)
    for (let i = 0; i < 4; i++) b.add(G.box, RAG[(i + 1) % 4], x0 + 0.55 + i * 0.85, CY + POLE - 0.36, z0 + 0.11, [0, 0, (i % 2 ? 1 : -1) * 0.07], [0.46, 0.62, 0.015]);
    balls(g, glow(0xFFF6D8, 0xFFD27A), bulbs, 0.085, 0.11);
    add(g, b.mesh(true));
    const card = board(128, 64, (c, w, h) => {
      c.fillStyle = '#B08A5C'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(90,60,30,.25)'; for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
      c.fillStyle = '#1E1612'; c.font = `800 30px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.translate(w / 2, h / 2 + 2); c.rotate(-0.06); c.fillText('ちゃんこ', 0, 0); c.restore();
    });
    sheet(g, card, MX, CY + POLE + 0.2, z0 + 0.13, 1.05, 0.52, 0, 0.07);
  }
  /** The small plain wooden sign, standing over the back. */
  const woodSign = () => board(128, 48, (c, w, h) => {
    c.fillStyle = '#C9A877'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,80,40,.18)'; for (let y = 4; y < h; y += 7) c.fillRect(0, y, w, 1.5);
    c.strokeStyle = '#5B3424'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = '#2A1810'; c.font = `800 28px ${MINCHO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ちゃんこ', w / 2, h / 2 + 2);
  });
  const PAPER = glow(0xFFF6E6, 0xFFD48A);
  // 2: white paper lanterns on the strings, and a small wooden sign
  {
    const g = look(t, 2, 3, MX, CY + POLE, z0), b = new Build(), lit: Vector3[] = [];
    strings(g, p => {
      lit.push(V(p.x, p.y - 0.22, p.z));
      for (const s of [-1, 1]) b.add(G.cyl, 0x1B2430, p.x, p.y - 0.22 + s * 0.175, p.z, null, [0.07, 0.03, 0.07]);
    });
    balls(g, PAPER, lit, 0.14, 0.18);
    add(g, b.mesh(false));
    sheet(g, woodSign(), MX, CY + POLE + 0.12, z0 + 0.1, 0.8, 0.3);
  }
  // 3–: slim dark wooden posts, rails along the back and sides, lanterns hung from the side rails, the sign on the back
  // one, and a short indigo noren under it, high over the counter
  {
    const g = look(t, 3, 99, MX, CY, BAR.z), b = new Build(), lit: Vector3[] = [], RAIL = CY + POLE - 0.06;
    for (const p of POST) b.add(rbox(0.1, POLE, 0.1, 0.015), 0x3A2116, p.x, CY + POLE / 2, p.z);
    for (const [i, j] of SIDES) {
      const a = POST[i], c = POST[j], alongX = Math.abs(a.x - c.x) > 0.1, len = alongX ? Math.abs(a.x - c.x) : Math.abs(a.z - c.z);
      b.add(rbox(alongX ? len + 0.1 : 0.08, 0.08, alongX ? 0.08 : len + 0.1, 0.01), 0x3A2116, (a.x + c.x) / 2, RAIL, (a.z + c.z) / 2);
      if (alongX) continue;
      for (let k = 1; k <= 3; k++) {
        const z = a.z + (c.z - a.z) * (k / 4);
        lit.push(V(a.x, RAIL - 0.3, z));
        b.add(G.cyl, 0x1B2430, a.x, RAIL - 0.1, z, null, [0.006, 0.16, 0.006]);
        for (const s of [-1, 1]) b.add(G.cyl, 0x1B2430, a.x, RAIL - 0.3 + s * 0.175, z, null, [0.07, 0.03, 0.07]);
      }
    }
    balls(g, PAPER, lit, 0.14, 0.18);
    add(g, b.mesh(true));
    sheet(g, woodSign(), MX, RAIL + 0.2, z0 + 0.08, 0.8, 0.3);
    const span = POST[1].x - POST[0].x - 0.16, w = span / 3;
    sheets(g, crestCloth(), [0, 1, 2].map(k => [POST[0].x + 0.08 + w * (k + 0.5), RAIL - 0.33, z0 + 0.08, w - 0.04, 0.54] as [number, number, number, number, number]));
  }
  // 4: gold bands on the posts, a thin gold line round the counters' tops (not the flap's: it lifts), and a fugu
  // lantern hung out from the front corner post over the queue, high over their heads and clear of the flap
  {
    const g = look(t, 4, 99, MX, CY + TOP, BAR.z), b = new Build(), GOLD = 0xD2AA4A, y = CY + TOP + 0.009;
    for (const p of POST) for (const h of [0.12, POLE - 0.2]) b.add(G.box, GOLD, p.x, CY + h, p.z, null, [0.11, 0.05, 0.11]);
    const line = (ax: number, az: number, bx: number, bz: number) => b.add(G.box, GOLD, (ax + bx) / 2, y, (az + bz) / 2, null, [Math.max(0.02, Math.abs(bx - ax)), 0.006, Math.max(0.02, Math.abs(bz - az))]);
    // (the north counter's top, then the west one's, each just in from its edges)
    line(x0 - 0.01, z0 - 0.01, x1, z0 - 0.01); line(x0 + d + 0.01, z0 + d + 0.01, x1, z0 + d + 0.01);
    line(x0 - 0.01, z0 - 0.01, x0 - 0.01, FLAP.z0 - 0.02); line(x0 + d + 0.01, z0 + d + 0.01, x0 + d + 0.01, FLAP.z0 - 0.02);
    add(g, b.mesh(false));
    const p = POST[3], fx = p.x - 0.46, fy = CY + 2.25, fz = p.z - 0.05, arm = new Build();
    arm.add(rbox(0.5, 0.05, 0.05, 0.01), 0x3A2116, p.x - 0.22, CY + 2.6, p.z);
    arm.add(G.cyl, 0x1B2430, fx, CY + 2.47, fz, null, [0.008, 0.26, 0.008]);
    arm.add(K.dot, 0x1E1612, fx - 0.2, fy + 0.04, fz + 0.08, null, 0.035);
    arm.add(K.dot, 0x1E1612, fx - 0.2, fy + 0.04, fz - 0.08, null, 0.035);
    add(g, arm.mesh(false));
    const body = add(g, mesh(K.ball, glow(0xF6C552, 0xE89A2A), fx, fy, fz));
    body.scale.set(0.26, 0.22, 0.22);
    // (High: its spines, its tail and fins)
    const fins = new Build();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, e = (i % 2 ? 0.5 : -0.3);
      fins.add(G.cone, 0xE8A23A, fx + Math.cos(a) * 0.25, fy + Math.sin(e) * 0.12, fz + Math.sin(a) * 0.21, [Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3], [0.025, 0.07, 0.025]);
    }
    fins.add(G.cone, 0xE8A23A, fx + 0.3, fy, fz, [0, 0, -Math.PI / 2], [0.1, 0.14, 0.03]);
    for (const s of [-1, 1]) fins.add(G.cone, 0xE8A23A, fx - 0.02, fy - 0.04, fz + s * 0.2, [s * 1.2, 0, 0], [0.05, 0.1, 0.02]);
    detail(null, add(g, fins.mesh(false)));
  }
}

// ---------- Cellar crew: the prep hall and the hires ----------
/** The prep hall's walls the camera sees the inside of: the north one (stone till the grow room's found, then planks),
 *  up to the grow room's gate's frame, and the west one, the hearth room's, either side of the doorway. `face` is where
 *  a panel on it stands. */
const HALL = (() => {
  const gate = DOORS.find(o => o.b === 'grow')!, door = DOORS.find(o => o.a === 'kitchen' && o.b === 'prep')!;
  return [
    { side: 'n' as const, a0: PREP.x0 - 0.3, a1: gate.x0 - 0.9, face: PREP.z0 - 0.09 },
    { side: 'w' as const, a0: PREP.z0 - 0.3, a1: door.z0 - 0.3, face: PREP.x0 - 0.2 },
    { side: 'w' as const, a0: door.z1 + 0.3, a1: PREP.z1 + 0.1, face: PREP.x0 - 0.2 },
  ];
})();
/** Panels along the hall's walls, below their rails: `fill` in a frame of `frame`, a post every metre or so, and (if
 *  `trim`) a thin line of it inset round each. */
function wainscot(p: Object3D, fill: number, frame: number, trim?: number) {
  const b = new Build(), y0 = 0.2, y1 = WALL - 0.08, h = y1 - y0;
  for (const s of HALL) {
    const len = s.a1 - s.a0, n = Math.max(1, Math.round(len / 1.2)), at = (a: number, out: number): [number, number] => s.side === 'n' ? [a, s.face + out] : [s.face + out, a];
    const piece = (a: number, y: number, w: number, hh: number, out: number, depth: number, c: number) => {
      const [x, z] = at(a, out);
      b.add(G.box, c, x, CY + y, z, null, s.side === 'n' ? [w, hh, depth] : [depth, hh, w]);
    };
    piece((s.a0 + s.a1) / 2, (y0 + y1) / 2, len, h, 0, 0.02, fill);
    for (const y of [y0, y1]) piece((s.a0 + s.a1) / 2, y, len, 0.06, 0.012, 0.03, frame);
    for (let k = 0; k <= n; k++) piece(s.a0 + (len * k) / n, (y0 + y1) / 2, 0.07, h, 0.012, 0.03, frame);
    if (trim !== undefined) for (let k = 0; k < n; k++) {
      const a0 = s.a0 + (len * k) / n + 0.12, a1 = s.a0 + (len * (k + 1)) / n - 0.12;
      for (const y of [y0 + 0.1, y1 - 0.1]) piece((a0 + a1) / 2, y, a1 - a0, 0.012, 0.016, 0.004, trim);
      for (const a of [a0, a1]) piece(a, (y0 + y1) / 2, 0.012, h - 0.2, 0.016, 0.004, trim);
    }
  }
  return add(p, b.mesh(false));
}
/** The three pendant lamps, high over the middle of the hall, clear of the racks and barrels. */
const LAMPS = [13.8, 16.1, 18.4].map(x => V(x, CY + 2.7, (PREP.z0 + PREP.z1) / 2 + 0.2));

function buildCrew() {
  const t = tracks.cellarcrew, NX = (PREP.x0 + PREP.x1) / 2;
  // 3–7: white plaster panels framed in dark wood; 8–: dark wood panels with thin gold trim
  wainscot(look(t, 3, 8, NX, CY, PREP.z0), 0xEFEBE2, 0x3A2116);
  wainscot(look(t, 8, 99, NX, CY, PREP.z0), 0x4A2618, 0x2E160E, 0xD2AA4A);
  // 4–: two indigo hangings with the crest, standing on the north wall's rail beside the PREP sign (above the rice racks
  // that'll stand along it)
  {
    const g = look(t, 4, 99, NX, CY + WALL, PREP.z0 - 0.3), z = PREP.z0 - 0.3, b = new Build();
    const at = [PREP.x0 + 1.5, PREP.x0 + 4.5];
    sheets(g, crestCloth(), at.map(x => [x, CY + 1.6, z, 0.5, 0.7] as [number, number, number, number, number]));
    for (const x of at) {
      b.add(G.cyl, 0x2A1810, x, CY + 1.97, z, [0, 0, Math.PI / 2], [0.02, 0.62, 0.02]);
      for (const s of [-1, 1]) b.add(G.box, 0x2A1810, x + s * 0.3, CY + (WALL + 0.08 + 1.97) / 2, z, null, [0.03, 1.97 - WALL - 0.08, 0.03]);
    }
    add(g, b.mesh(false));
  }
  // 5–: three warm pendant lamps on long cords (High: the light pooled on the floor under each)
  {
    const g = look(t, 5, 99, NX, CY + 2.7, LAMPS[0].z), b = new Build();
    for (const l of LAMPS) {
      b.add(G.cyl, 0x1E1612, l.x, l.y + 1.9, l.z, null, [0.008, 3.6, 0.008]);
      b.add(tube(0.06, 0.26, 0.2, 14, true), 0xB8862E, l.x, l.y + 0.06, l.z);
      b.add(tube(0.04, 0.06, 0.05, 8), 0x2A2420, l.x, l.y + 0.18, l.z);
    }
    add(g, b.mesh(false));
    balls(g, glow(0xFFE6B0, 0xFFB850), LAMPS.map(l => V(l.x, l.y - 0.02, l.z)), 0.09);
    const pool = canvasTex(64, 64, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,200,120,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    const m = new MeshBasicMaterial({ map: pool.tex, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const pools = new Group();
    for (const l of LAMPS) {
      const c = add(pools, new Mesh(new CircleGeometry(1.1, 20), m));
      c.rotation.x = -Math.PI / 2; c.position.set(l.x, CY + 0.02, l.z); c.renderOrder = 2;
    }
    detail(null, add(g, pools));
  }
  // 7–: a polished dark stone floor, a border of wood round it
  {
    const g = look(t, 7, 99, NX, CY, (PREP.z0 + PREP.z1) / 2), w = PREP.x1 - PREP.x0, d = PREP.z1 - PREP.z0;
    const f = add(g, new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ map: slate(w / 4, d / 4) })));
    f.rotation.x = -Math.PI / 2; f.position.set(NX, CY + 0.003, (PREP.z0 + PREP.z1) / 2); f.receiveShadow = true;
    const b = new Build(), B = 0.14;
    for (const s of [-1, 1]) {
      b.add(G.box, 0x4A2A1C, NX, CY + 0.005, (PREP.z0 + PREP.z1) / 2 + s * (d / 2 - B / 2), null, [w, 0.006, B]);
      b.add(G.box, 0x4A2A1C, NX + s * (w / 2 - B / 2), CY + 0.005, (PREP.z0 + PREP.z1) / 2, null, [B, 0.006, d - B * 2]);
    }
    add(g, b.mesh(false));
  }
}

/** What the hires wear at each level of Cellar crew, if anything but their own. */
const RAGS: Record<Role, [number, number]> = {
  washer: [0x7A6650, 0x9A8A6A], salter: [0x6B6F5E, 0xA8977A], picker: [0x857257, 0x8A7A62],
  cook: [0x6E5E52, 0x9C8A6A], attendant: [0x7C6A5C, 0xA8977A],
};
/** Something worn on a hire's body (it moves with them): a mesh of `geo` in `c`. */
const wear = (p: Person, geo: BufferGeometry, c: number, x: number, y: number, z: number, s: [number, number, number], rx = 0) => {
  const m = mesh(geo, c, x, y, z); m.scale.set(...s); m.rotation.x = rx; p.body.add(m); return m;
};
const COLLAR = new TorusGeometry(0.19, 0.035, 5, 14);
/** Clothes for level `n` (from the outfit before, in the levels that change no clothes), or null for their own. */
function uniform(n: number): ((role: Role) => Person) | null {
  if (n <= 0) return null;
  if (n === 1) {
    return role => {
      const [shirt, rag] = RAGS[role], p = belowGround(new Person(shirt));
      p.headband(rag);
      // patches sewn on, front and back
      wear(p, G.box, 0x5E4E3C, 0.09, 0.64, 0.255, [0.1, 0.09, 0.02]);
      wear(p, G.box, 0x9A8466, -0.1, 0.5, -0.27, [0.11, 0.1, 0.02]);
      return p;
    };
  }
  if (n < 6) return () => { const p = belowGround(new Person(0x6A7A8C)); p.headband(0xF4F1EA); return p; };
  const [band, collar] = n < 8 ? [0x2B3A67, 0x2B3A67] : [0x5B2A86, 0x5B2A86];
  return () => {
    const p = belowGround(new Person(0xF4F6F8));
    p.headband(band);
    wear(p, G.cyl, 0xF4F6F8, 0, 1.21, 0.02, [0.18, 0.12, 0.18]);
    wear(p, COLLAR, collar, 0, 0.9, 0.02, [1, 1, 1], Math.PI / 2);
    if (n >= 8) wear(p, K.dot, 0xD2AA4A, 0.08, 0.72, 0.265, [0.035, 0.035, 0.012]);
    return p;
  };
}
/** The levels at which the hires' clothes change. */
const dressedAt = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n < 6 ? 2 : n < 8 ? 6 : 8);
let dressed = -1;

// ---------- keeping them in step ----------
let made = false;
/** Not with a boss in, nor while a scene has the player: then what's new just pops in (as for the cellar's tiles). */
const free = () => !F.rush && !player.held && !staging();

/** Shows each of the cellar's upgrades as it is, the first time quietly (just loaded), and puts what a level bought
 *  changed in the spotlight. Stage 3 only. */
export function updCellarLooks() {
  if (stage.n !== 3) return;
  if (!made) {
    made = true;
    apart(() => { buildStreet(); buildBowls(); buildCrew(); }, dice(0x100C5));
  }
  for (const s of seatGroups) s.g.visible = s.part === 'base' || parts[s.part].visible;
  for (const t of Object.values(tracks)) {
    const n = mods[t.id];
    if (n === t.at) continue;
    const up = t.at >= 0 && n > t.at, lit: Object3D[] = [];
    for (const l of t.looks) {
      const want = l.from <= n && n < l.to;
      if (want && !l.o.visible && up) { popIn(l.o); lit.push(l.o); }
      l.o.visible = want;
    }
    if (t.id === 'bowls') barFrame.visible = n === 0;
    if (t.id === 'cellarcrew' && dressedAt(n) !== dressed) {
      // (in their own clothes to begin with: nothing to change; and clothes made off the game's luck, as scenery is)
      const first = dressed < 0;
      dressed = dressedAt(n);
      const hires = first && !dressed ? [] : quietly(() => dressCrew(uniform(dressed)));
      // (the spotlight's on the prep hall's own, if any are hired)
      if (up) { const here = hires.filter(h => h.position.x > PREP.x0 && h.position.x < PREP.x1); lit.push(...(here.length ? here : hires)); }
    }
    t.at = n;
    if (up && lit.length && free()) spotlight(lit, { close: t.close(Math.min(n, 8)), when: free });
  }
}
