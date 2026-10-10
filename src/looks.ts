// What the repeatable upgrades (shop.ts) look like in the world: every level bought shows somewhere.
//   Fine fillets: the price board over the walk-up counter shows the new price, and gains a star.
//   Marketing: each campaign for real (ads.ts): posters, a radio, a billboard, a TV commercial, lanterns, a food critic...
//   Crew training: the player's headband, coloured like a judo belt, from white to black (stage 1 only).
//   Chef's specials: a wooden menu tag over the kitchen line for each, a new dish on every one.
//   Kitchen crew: the chefs' and cooks' toques grow taller.
//   Rice fertilizer: a labelled sack of each kind on a pallet by the fertilizer shed (shed.ts).
import { BoxGeometry, Group, Mesh, MeshLambertMaterial, type Object3D } from 'three';
import { type Ad, marketAds, restaurantAds, updAds } from './ads';
import { C1 } from './counters';
import { mods } from './economy';
import { stage } from './layout';
import { player } from './player';
import { drawIcon } from './icons';
import { Build, detail, K, quietly, rbox, seasonLayer, shade, tube } from './kit';
import { popIn } from './pop';
import { signFrame, signSnow } from './props';
import { KITCHEN, sushi } from './restaurant';
import { sacks } from './shed';
import { canvasTex, FONT, G, mat, mesh, rr, scene } from './render';
import { FY } from './util';

export { marketAds, restaurantAds };

/** Stage 1's looks (the price board and the market's campaigns), which go with the market at the stage-up. */
export const marketLooks = new Group();
/** Stage 2's: the menu tags and the restaurant's campaigns. */
const restaurantLooks = new Group();
scene.add(marketLooks, restaurantLooks);

/** A board with `draw` on its front face and wood round the edges. */
function board(w: number, h: number, d: number, px: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const t = canvasTex(px, Math.round(px * h / w), draw);
  const wood = mat(0x6B4A35);
  return { mesh: mesh(new BoxGeometry(w, h, d), [wood, wood, wood, wood, new MeshLambertMaterial({ map: t.tex }), wood], 0, 0, 0, true), t };
}

// ---------- Fine fillets: the price board ----------
export const priceBoard = board(2.3, 0.58, 0.06, 512, () => {});
{
  const g = new Group(); g.position.set(3, 0, 8.4); marketLooks.add(g);
  priceBoard.mesh.position.y = FY + 2.05; g.add(priceBoard.mesh);
  // Low: two posts. High: a framed sign on rounded posts under a little red roof, with snow on it in winter.
  const posts = quietly(() => new Group()); g.add(posts);
  for (const s of [-1, 1]) {
    const post = mesh(G.cyl, 0x6B4A35, s * 1.12, FY + 1.1, 0, true); post.scale.set(0.05, 2.2, 0.05); posts.add(post);
  }
  const sign = quietly(() => {
    const hi = new Group();
    hi.add(signFrame(2.3, 0.58, FY + 2.05, 2.24).mesh(), seasonLayer(signSnow(2.3, 0.58, FY + 2.05).mesh(false), [1, 0, 0, 0]));
    return hi;
  });
  g.add(sign);
  detail(posts, sign);
}
/** Redraws the price board: today's price, and a star a level (gold-rimmed from five). */
function drawPrice(price: number, level: number) {
  const { ctx: c, canvas, tex } = priceBoard.t, w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#23384A'; c.fillRect(0, 0, w, h);
  c.strokeStyle = level >= 5 ? '#F2C14E' : '#8FB3C9'; c.lineWidth = 8; rr(c, 10, 10, w - 20, h - 20, 12); c.stroke();
  // the fish on a cream badge, as it would be lost on the dark board
  c.fillStyle = '#FFF4E6'; c.beginPath(); c.arc(70, h / 2, 42, 0, 7); c.fill();
  drawIcon(c, '🐟', 70, h / 2, 70);
  c.fillStyle = '#FFF4E6'; c.font = `800 70px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('$' + price, 122, h / 2 + 6);
  c.fillStyle = '#F2C14E'; c.font = `800 46px ${FONT}`; c.textAlign = 'right';
  c.fillText('★'.repeat(Math.min(level, 5)) + (level > 5 ? '+' : ''), w - 34, h / 2 + 4);
  tex.needsUpdate = true;
}

// ---------- Marketing: the campaigns themselves (ads.ts) ----------
marketAds.forEach(a => marketLooks.add(a.g));
restaurantAds.forEach(a => restaurantLooks.add(a.g));

// ---------- Chef's specials: menu tags over the kitchen line ----------
const DISHES = ['🍤', '🍙', '🦐', '🐙', '🦑', '🦀', '🍱', '🐡', '🍥', '🍢', '🍵', '🍶'];
const TAG_Y = FY + 2.75;
export const rail = new Group();
/** Where tag `i` hangs along the rail: they fill in from the middle outwards, so any number of them hangs evenly. */
const tagX = (i: number) => (i % 2 ? 1 : -1) * (0.21 + Math.floor(i / 2) * 0.42);
{
  rail.position.set(KITCHEN.x, 0, KITCHEN.z);
  // Low: a square bar on two cords. High: a round pole with knobs on its ends, the cords wrapped round it, and a
  // brass pin for each tag.
  const low = quietly(() => new Group()); rail.add(low);
  const bar = mesh(G.box, 0x4A2418, 0, TAG_Y, 0, true); bar.scale.set(5.4, 0.06, 0.06); low.add(bar);
  for (const s of [-1, 1]) { const cord = mesh(G.box, 0x2B1A14, s * 2.5, TAG_Y + 0.3, 0); cord.scale.set(0.02, 0.6, 0.02); low.add(cord); }
  const high = quietly(() => {
    const b = new Build(), wood = 0x4A2418, cord = 0x2B1A14;
    b.add(tube(0.034, 0.034, 5.4, 8), wood, 0, TAG_Y, 0, [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) {
      b.add(K.ball, shade(wood, 0.85), s * 2.72, TAG_Y, 0, null, 0.05);
      b.add(tube(0.01, 0.01, 0.6, 6), cord, s * 2.5, TAG_Y + 0.3, 0);
      for (const dx of [-0.025, 0.025]) b.add(K.ring, cord, s * 2.5 + dx, TAG_Y, 0, [0, Math.PI / 2, 0], [0.042, 0.042, 0.3]);
    }
    DISHES.forEach((_, i) => b.add(K.dot, 0xC9A04A, tagX(i), TAG_Y - 0.01, 0.036, null, [0.016, 0.016, 0.012]));
    return b.mesh();
  });
  rail.add(high);
  detail(low, high);
  rail.visible = false;
  restaurantLooks.add(rail);
}
/** The tags, one for each level: Low a plain board, High the same board with its edges rounded. */
export const tags = DISHES.map((dish, i) => {
  const { mesh: m } = board(0.34, 0.62, 0.03, 96, (c, w, h) => {
    c.fillStyle = '#EAD3A6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5B3424'; c.lineWidth = 5; c.strokeRect(4, 4, w - 8, h - 8);
    drawIcon(c, dish, w / 2, h * 0.38, 62);
    c.fillStyle = '#B83227'; c.beginPath(); c.arc(w / 2, h * 0.8, 12, 0, 7); c.fill();
  });
  const [g, round] = quietly(() => [new Group(), new Mesh(rbox(0.34, 0.62, 0.03, 0.012), m.material)] as const);
  round.castShadow = true; round.receiveShadow = true;
  g.position.set(tagX(i), TAG_Y - 0.36, 0.02);
  g.add(m, round);
  detail(m, round);
  g.visible = false;
  rail.add(g);
  return g;
});

// ---------- Crew training: the player's headband ----------
/** Judo belt colours, from the first level to the last. */
export const BELTS = [0xF4F4F0, 0xF7D038, 0xF08A24, 0x3FA34D, 0x2F6FD0, 0x7E4CC2, 0x7A4A2A, 0x1E1E1E];

// ---------- keeping them in step ----------
let synced = false, priceKey = '', belt = -1, hat = 0;
const groupOf = (a: Ad) => a.g;
/** Shows the first `n` of `items`; the newly shown ones pop in unless `quiet`. */
function showFirst(items: Object3D[], n: number, quiet: boolean) {
  items.forEach((o, i) => {
    const want = i < n;
    if (want && !o.visible && !quiet) popIn(o);
    o.visible = want;
  });
}

/** Brings every upgrade's look up to date. The first call (just after loading) sets them without any pop-ins. */
export function updLooks(dt: number) {
  const quiet = !synced;
  synced = true;
  const key = `${C1.price}|${mods.fillets}`;
  if (key !== priceKey) { priceKey = key; drawPrice(C1.price, mods.fillets); }
  showFirst(marketAds.map(groupOf), mods.marketing, quiet);
  showFirst(restaurantAds.map(groupOf), mods.promo, quiet);
  showFirst(tags, mods.specials, quiet);
  showFirst(sacks, mods.fertilizer, quiet);
  if (mods.specials > 0 && !rail.visible) { rail.visible = true; if (!quiet) popIn(rail); }
  restaurantLooks.visible = stage.n === 2;
  // The headband is the market's crew training: it comes off when the restaurant opens.
  const wear = stage.n === 1 ? mods.training : 0;
  if (wear !== belt) {
    belt = wear;
    player.g.headband(belt ? BELTS[Math.min(belt, BELTS.length) - 1] : null);
    if (belt && !quiet) popIn(player.g.band!);
  }
  // toques grow up to their new height rather than jumping
  hat = quiet ? mods.crew : Math.min(mods.crew, hat + dt * 2);
  for (const p of [...sushi.chefs, ...sushi.cooks]) p.g.toque(hat);
  updAds(dt);
}
