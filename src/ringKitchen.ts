// The cellar's kitchen, drawn (stage 3): fight.ts runs it, and this shows it as it is each frame. The prep hall's
// drying racks and salt barrels (and the steam baskets and smokehouses they're swapped for), the grow room's beds and
// glowing shelves, each with what's in it, wet rice drying white and fish going brown; the ledge in front of the hearth
// with what's waiting to go in; the pot, its stew the colour of what's in it, steaming as it cooks; the bowls on the
// counter and the stall; the dumbwaiter's trays going round; the hires at their work, carrying what they carry; and a
// bubble over the pot when it waits on something (🌾? 🐟? 🍄?), or over the stall when fans wait at it with nothing to
// eat, like the cooks upstairs.
import { CanvasTexture, Color, Group, MeshLambertMaterial, type Mesh, type Object3D, Sprite, SpriteMaterial, type Vector3 } from 'three';
import { cellar, CY, LIFT_LOOP, parts, POT_TOP, potStew } from './cellar';
import { BINS, COUNTER, type Ing, LEDGE, LIFT, machineAt, MAX_MACHINES, POT, STALL } from './cellarPlan';
import { animPerson, belowGround, Person } from './characters';
import { F, inPot, type Machine, mach, potWaits, type Role, STALL_CAP, type Worker } from './fight';
import { newBowl, newCuredFish, newMushroom, newReadyRice, newRice, newSteak } from './items';
import { FONT, G, mesh } from './render';
import { V } from './util';

const add = <T extends Object3D>(p: Object3D, o: T) => { p.add(o); return o; };
const box = (p: Object3D, c: number | MeshLambertMaterial, x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true) => {
  const m = add(p, mesh(G.box, c, x, y, z, cast)); m.scale.set(sx, sy, sz); return m;
};
const WOOD = 0x8A5A3B, WOOD_DARK = 0x5B3424, BAMBOO = 0xC9A86A, IRON = 0x2E2E33;
const glow = (color: number, emissive: number) => new MeshLambertMaterial({ color, emissive, emissiveIntensity: 1 });

// ---------- the machines ----------
/** One machine in its slot: both its looks (built and upgraded), and the meshes for what's in it, placed for each. */
interface Slot { k: Ing; i: number; g: Group; looks: [Group, Group]; items: Mesh[]; spots: [Vector3[], Vector3[]]; steam: Mesh[] }
/** Where in a machine its items sit, and how many: the first look's, then the upgraded one's. */
function spotsFor(k: Ing): [Vector3[], Vector3[]] {
  if (k === 'rice') return [[V(-0.22, 1.32, 0), V(0.22, 1.32, 0)], [0, 1, 2, 3, 4, 5].map(j => V(-0.24 + (j % 3) * 0.24, 1.2, -0.1 + Math.floor(j / 3) * 0.2))];
  if (k === 'fish') return [[V(-0.13, 1.08, 0.05), V(0.15, 1.08, -0.05)], [0, 1, 2, 3, 4, 5].map(j => V(-0.4 + j * 0.16, 1.0, 0.52))];
  return [[V(-0.5, 0.36, 0.1), V(0.45, 0.36, -0.1)], [V(-0.7, 0.42, 0.1), V(0, 0.42, -0.1), V(0.7, 0.42, 0.1), V(-0.35, 1.02, 0), V(0.35, 1.02, 0)]];
}
/** A drying rack: a frame of posts with two shelves of bamboo trays. Steam baskets: three round steamers stacked on a
 *  brazier. */
function riceLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(a, WOOD_DARK, x * 0.42, 0.75, z * 0.26, 0.07, 1.5, 0.07);
  for (const y of [0.5, 0.9]) box(a, BAMBOO, 0, y, 0, 0.86, 0.04, 0.54);
  // the top tray, a wide round bamboo sieve, where the rice dries
  add(a, mesh(G.cyl, BAMBOO, 0, 1.28, 0, true)).scale.set(0.5, 0.05, 0.36);
  add(a, mesh(G.cyl, 0x8A6A3A, 0, 1.305, 0)).scale.set(0.44, 0.01, 0.3);
  box(b, IRON, 0, 0.25, 0, 0.8, 0.5, 0.6);
  box(b, glow(0xFF7A2A, 0xFF5A10), 0, 0.22, 0.31, 0.4, 0.12, 0.02, false);
  for (let y = 0; y < 3; y++) add(b, mesh(G.cyl, y % 2 ? 0xB8955A : BAMBOO, 0, 0.6 + y * 0.18, 0, true)).scale.set(0.36, 0.17, 0.36);
  add(b, mesh(G.cyl, 0xD9BE84, 0, 1.12, 0)).scale.set(0.38, 0.04, 0.38);
  return [a, b];
}
/** A salt barrel, its lid off. A smokehouse: a little plank hut with a chimney, fish hanging under its eave. */
function fishLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  add(a, mesh(G.cyl, WOOD, 0, 0.48, 0, true)).scale.set(0.42, 0.96, 0.42);
  for (const y of [0.15, 0.8]) add(a, mesh(G.cyl, IRON, 0, y, 0)).scale.set(0.435, 0.05, 0.435);
  // salt to the brim
  add(a, mesh(G.cyl, 0xF4F4EE, 0, 0.97, 0)).scale.set(0.39, 0.03, 0.39);
  box(b, 0x6B4130, 0, 0.6, -0.05, 0.86, 1.2, 0.7);
  box(b, WOOD_DARK, 0, 1.25, 0.05, 1.0, 0.08, 0.95);
  box(b, 0x3A2A20, 0, 0.6, 0.31, 0.5, 0.7, 0.02, false);
  box(b, 0x4E4A46, 0.3, 1.55, -0.2, 0.18, 0.6, 0.18);
  box(b, WOOD_DARK, 0, 1.08, 0.5, 0.95, 0.04, 0.04, false);
  return [a, b];
}
/** A mushroom bed: a raised box of dark soil with logs in it. Glowing shelves: two shelves of soil under a soft glow. */
function mushLooks(g: Group): [Group, Group] {
  const a = add(g, new Group()), b = add(g, new Group());
  box(a, WOOD_DARK, 0, 0.15, 0, 2.2, 0.3, 1.0);
  box(a, 0x2A1E16, 0, 0.31, 0, 2.05, 0.02, 0.86, false);
  for (const x of [-0.6, 0.2]) { const l = add(a, mesh(G.log, 0x6B4A2E, x, 0.38, 0, true)); l.scale.set(0.8, 0.9, 0.8); l.rotation.z = Math.PI / 2; }
  const GLOW = glow(0x8FE0C0, 0x2E9C7A);
  for (const y of [0.35, 0.95]) {
    box(b, WOOD_DARK, 0, y - 0.03, 0, 2.2, 0.06, 0.8);
    box(b, 0x2A1E16, 0, y + 0.01, 0, 2.1, 0.02, 0.7, false);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(b, WOOD_DARK, x * 1.05, 0.65, z * 0.35, 0.06, 1.3, 0.06);
  box(b, GLOW, 0, 1.32, 0, 2.0, 0.04, 0.1, false);
  return [a, b];
}
const LOOKS = { rice: riceLooks, fish: fishLooks, mush: mushLooks };
const RAW: Record<Ing, Color> = { rice: new Color(0xC8B48A), fish: new Color(0xE59A8A), mush: new Color(0x8C6542) };
const DONE: Record<Ing, Color> = { rice: new Color(0xFFFBEF), fish: new Color(0xB8743E), mush: new Color(0x8C6542) };
/** An item in a machine: a ball of rice, a fish, a mushroom cap; each with its own material, to colour as it goes. */
function itemMesh(k: Ing) {
  const m = k === 'rice' ? mesh(G.cyl, new MeshLambertMaterial({ color: RAW.rice })) : k === 'fish' ? mesh(G.box, new MeshLambertMaterial({ color: RAW.fish })) : mesh(G.cone, new MeshLambertMaterial({ color: RAW.mush }));
  return m;
}
/** Steam and smoke: soft white puffs. */
const smoke = new MeshLambertMaterial({ color: 0xF4F1EA, transparent: true, opacity: 0.22, depthWrite: false });
const slots: Slot[] = [];
for (const k of ['rice', 'fish', 'mush'] as const) {
  for (let i = 0; i < MAX_MACHINES; i++) {
    const at = machineAt(k, i), g = add(k === 'mush' ? parts.grow : cellar, new Group());
    g.position.set(at.x, CY, at.z);
    // racks face south into the hall, barrels and smokehouses north, beds south
    if (k === 'fish') g.rotation.y = Math.PI;
    const looks = LOOKS[k](g), spots = spotsFor(k);
    const items = Array.from({ length: 6 }, () => add(g, itemMesh(k)));
    const steam = k === 'mush' ? [] : Array.from({ length: 3 }, (_, j) => { const s = add(g, mesh(G.sphere, smoke, 0, 1.3, 0)); s.userData.t = j / 3; return s; });
    g.visible = false;
    slots.push({ k, i, g, looks, items, spots, steam });
  }
}

function drawSlot(s: Slot, dt: number) {
  const L = F.lines[s.k], m: Machine | undefined = L.m[s.i];
  s.g.visible = s.i < L.n;
  if (!s.g.visible || !m) return;
  const up = L.up;
  s.looks[0].visible = !up; s.looks[1].visible = !!up;
  const spots = s.spots[up], cap = mach(s.k).cap;
  s.items.forEach((it, j) => {
    let p = -1;
    if (s.k === 'mush') p = j < m.ready ? 1 : j === m.ready && j < cap ? m.p : -1;
    else if (j < m.items.length) p = m.items[j];
    it.visible = p >= 0 && j < spots.length;
    if (!it.visible) return;
    it.position.copy(spots[j]);
    (it.material as MeshLambertMaterial).color.lerpColors(RAW[s.k], DONE[s.k], Math.min(1, p));
    // (a ready one sits up a little bigger, to be seen from across the room)
    const k = s.k === 'mush' ? 0.3 + 0.7 * p : p >= 1 ? 1.25 : 1;
    if (s.k === 'rice') it.scale.set(0.15 * k, 0.07 * k, 0.15 * k);
    else if (s.k === 'fish') it.scale.set(0.09, 0.32 * k, 0.07);
    else it.scale.set(0.15 * k, 0.1 * k, 0.15 * k);
  });
  // the steamers and the smokehouse puff while something's in them
  const busy = up && m.items.some(p => p < 1);
  for (const st of s.steam) {
    st.visible = !!busy;
    if (!busy) continue;
    st.userData.t = (st.userData.t + dt * 0.4) % 1;
    const u = st.userData.t as number;
    st.position.set(Math.sin(u * 6 + st.id) * 0.12 + (s.k === 'fish' ? 0.3 : 0), (s.k === 'fish' ? 1.8 : 1.2) + u * 1.2, Math.cos(u * 5) * 0.1 - (s.k === 'fish' ? 0.2 : 0));
    st.scale.setScalar(0.1 + u * 0.25);
  }
}

// ---------- the ledge, the counter and the stall ----------
const MAKE: Record<Ing, () => Mesh> = { rice: newReadyRice, fish: newCuredFish, mush: newMushroom };
/** What's on the ledge: up to eight of each, in its own tray, stacked two high. */
const ledge = Object.fromEntries((['rice', 'fish', 'mush'] as const).map(k => [k, Array.from({ length: 8 }, (_, j) => {
  const m = add(cellar, MAKE[k]());
  m.position.set(LEDGE[k].x + ((j % 4) - 1.5) * 0.12, CY + 0.62 + Math.floor(j / 4) * 0.08, LEDGE[k].z - 0.48 + (j % 2) * 0.08);
  m.rotation.y = j * 0.7;
  m.visible = false;
  return m;
})])) as Record<Ing, Mesh[]>;
/** Bowls set out somewhere: a grid of them, plain and mushroom, `cap` of each, shown as the line says. */
function bowlRows(cap: number, at: (j: number) => Vector3) {
  return [false, true].map(mush => Array.from({ length: cap }, (_, j) => {
    const b = add(cellar, newBowl(mush)); b.position.copy(at(j)); b.visible = false; return b;
  }));
}
const counterBowls = bowlRows(20, j => V(COUNTER.x - 0.25 + (j % 3) * 0.3, CY + 0.85 + Math.floor(j / 12) * 0.11, COUNTER.z - 0.55 + (Math.floor(j / 3) % 4) * 0.33));
const stallBowls = bowlRows(STALL_CAP, j => V(STALL.x - 0.12 + (j % 2) * 0.24, CY + 1.0 + Math.floor(j / 18) * 0.11, STALL.z - 0.95 + (Math.floor(j / 2) % 9) * 0.24));
function showBowls(rows: Mesh[][], line: boolean[]) {
  rows.forEach(r => r.forEach(b => { b.visible = false; }));
  line.forEach((m, j) => { const b = rows[m ? 1 : 0][j]; if (b) b.visible = true; });
}

// ---------- the pot ----------
const SOUP: Record<Ing, [number, number, number]> = { rice: [239, 230, 207], fish: [233, 138, 107], mush: [140, 101, 66] };
const steam = Array.from({ length: 6 }, (_, j) => { const s = add(cellar, mesh(G.sphere, smoke, POT.x, CY + POT_TOP, POT.z)); s.userData.t = j / 6; return s; });
function drawPot(dt: number) {
  const ks = inPot();
  const mix = [0, 1, 2].map(i => ks.reduce((v, k) => v + SOUP[k][i] / 255 / ks.length, 0));
  potStew.color.setRGB(mix[0], mix[1], mix[2]);
  // steaming for a while after each batch
  const hot = F.cooked.length > 0 && F.t - F.cooked[F.cooked.length - 1] < 3;
  for (const s of steam) {
    s.visible = hot;
    if (!hot) continue;
    s.userData.t = (s.userData.t + dt * 0.35) % 1;
    const u = s.userData.t as number;
    s.position.set(POT.x + Math.sin(u * 7 + s.id) * 0.3, CY + POT_TOP + u * 1.9, POT.z + Math.cos(u * 5 + s.id) * 0.3);
    s.scale.setScalar(0.18 + u * 0.45);
  }
}

// ---------- the dumbwaiter ----------
// Its trays go round and round a loop: down the front, across the bottom, up the back and across the top, loaded with
// a sack of rice or a fish as they come over the top, which they tip into the bin or the crate at the bottom. (It never
// stops: what comes down is endless, and the bins never fill.)
const LL = LIFT_LOOP, DOWN = LL.top - LL.bottom, ACROSS = LL.front - LL.back, LOOP = 2 * (DOWN + ACROSS), TRAYS = 6;
function loopAt(s: number) {
  s = ((s % LOOP) + LOOP) % LOOP;
  if (s < DOWN) return { y: LL.top - s, d: LL.front };
  if (s < DOWN + ACROSS) return { y: LL.bottom, d: LL.front - (s - DOWN) };
  if (s < 2 * DOWN + ACROSS) return { y: LL.bottom + (s - DOWN - ACROSS), d: LL.back };
  return { y: LL.top, d: LL.back + (s - 2 * DOWN - ACROSS) };
}
const trays = Array.from({ length: TRAYS }, (_, i) => {
  const g = add(cellar, new Group());
  g.add(mesh(G.box, 0xD9B98A, 0, 0, 0, true)).scale.set(0.4, 0.05, 0.7);
  const load = add(g, i % 2 ? newSteak() : newRice()); load.position.y = 0.07;
  return { g, s: (i * LOOP) / TRAYS, load };
});
function drawLift(dt: number) {
  for (const t of trays) {
    t.s = (t.s + dt * 0.55) % LOOP;
    const at = loopAt(t.s);
    // (the shaft's front faces west, into the hall)
    t.g.position.set(LIFT.x - at.d, CY + at.y, LIFT.z);
    t.load.visible = t.s < DOWN;
  }
}
// what the bins hold: a heap of sacks, and fish on ice
for (let j = 0; j < 5; j++) { const r = add(cellar, newRice()); r.position.set(BINS.rice.x + ((j % 3) - 1) * 0.2, CY + 0.66 + Math.floor(j / 3) * 0.08, BINS.rice.z + (j % 2) * 0.12 - 0.06); r.rotation.y = j; }
for (let j = 0; j < 5; j++) { const f = add(cellar, newSteak()); f.position.set(BINS.fish.x + ((j % 3) - 1) * 0.24, CY + 0.54 + Math.floor(j / 3) * 0.06, BINS.fish.z + (j % 2) * 0.2 - 0.1); }

// ---------- the crew ----------
/** How each hire looks. */
const DRESS: Record<Role, () => Person> = {
  washer: () => { const p = belowGround(new Person(0xD8B65A)); p.headband(0xFFFFFF); return p; },
  salter: () => { const p = belowGround(new Person(0xC9774F)); p.headband(0x2B3A67); return p; },
  picker: () => belowGround(new Person(0x7FA35B, 'farmer')),
  cook: () => belowGround(new Person(0xF4F6F8, 'chef')),
  attendant: () => { const p = belowGround(new Person(0x8E6BB5)); p.headband(0xFFFFFF); return p; },
};
interface Hand { p: Person; key: string; load: Mesh[] }
const hands = new Map<Role, Hand>();
/** What a hire's carrying, as meshes in their arms: up to eight of it. */
function loadFor(w: Worker): [string, () => Mesh, number] {
  const c = w.carry;
  if (!c) return ['', newRice, 0];
  if (c.k === 'bowl') return ['bowl' + c.bowls.length, () => newBowl(c.bowls[0]), Math.min(8, c.bowls.length)];
  const make = c.ready ? MAKE[c.k] : c.k === 'rice' ? newRice : newSteak;
  return [`${c.k}${c.ready}${c.n}`, make, Math.min(8, c.n)];
}
function drawCrew(dt: number) {
  for (const w of F.crew) {
    if (w.role === 'you') continue;
    let h = hands.get(w.role);
    if (!h) {
      const p = add(cellar, DRESS[w.role]());
      h = { p, key: '', load: [] };
      hands.set(w.role, h);
    }
    const p = h.p;
    p.position.set(w.x, CY, w.z);
    if (w.moving) p.rotation.y = w.h;
    else if (w.cooking > 0) p.rotation.y = Math.PI;
    const [key, make, n] = loadFor(w);
    if (key !== h.key) {
      h.key = key;
      h.load.forEach(m => p.remove(m));
      h.load = Array.from({ length: n }, (_, j) => { const m = add(p, make()); m.position.set(0, 0.5 + j * 0.085, 0.42); return m; });
    }
    animPerson(p, w.moving, dt, n > 0);
    if (w.cooking > 0) p.arms[1].rotation.x = -1.4 + Math.sin(F.t * 8) * 0.4;
  }
}
/** The Person for a hire, if they're in (for tests and pointing at them). */
export const crewPerson = (role: Role) => hands.get(role)?.p ?? null;

// ---------- bubbles ----------
/** A white speech bubble with `text` in it (an emoji and a question mark). */
function bubble(text: string) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 58, 52, 0, 7); c.fill();
  c.beginPath(); c.moveTo(52, 104); c.lineTo(64, 124); c.lineTo(76, 104); c.fill();
  c.font = '800 46px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  c.fillText(text, 64, 60);
  const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(cv), depthTest: false }));
  s.renderOrder = 5; s.visible = false; s.scale.setScalar(0.8);
  cellar.add(s);
  return s;
}
const potAsks: Record<Ing, Sprite> = { rice: bubble('🌾?'), fish: bubble('🐟?'), mush: bubble('🍄?') };
const stallAsk = bubble('🍲?');
/** Seconds the pot has waited on what it's waiting on, and the stall stood empty with fans at it. */
let waitT = 0, dryT = 0;
const SHOW_AFTER = 1.5;
function drawBubbles(dt: number) {
  const want = potWaits();
  waitT = want ? waitT + dt : 0;
  for (const [k, s] of Object.entries(potAsks) as [Ing, Sprite][]) {
    s.visible = k === want && waitT > SHOW_AFTER;
    s.position.set(POT.x, CY + 2.6, POT.z);
  }
  const hungry = F.bout.phase === 'prep' && (F.rush ? !F.rush.done : F.queue.length > 0) && !F.stall.length;
  dryT = hungry ? dryT + dt : 0;
  stallAsk.visible = dryT > SHOW_AFTER;
  stallAsk.position.set(STALL.x, CY + 3.0, STALL.z);
}
/** Which bubbles are up, for tests: the pot's ask, and whether the stall's asking. */
export const bubbles = () => ({ pot: (Object.keys(potAsks) as Ing[]).find(k => potAsks[k].visible) ?? null, stall: stallAsk.visible });

// ---------- every frame ----------
export function updRingKitchen(dt: number) {
  for (const s of slots) drawSlot(s, dt);
  for (const k of ['rice', 'fish', 'mush'] as const) ledge[k].forEach((m, j) => { m.visible = j < F.pantry[k]; });
  showBowls(counterBowls, F.counter);
  showBowls(stallBowls, F.stall);
  drawPot(dt);
  drawLift(dt);
  drawCrew(dt);
  drawBubbles(dt);
}
/** Where a ready ingredient lands on the ledge, and a bowl on the stall, for things flying there. */
export const ledgeAt = (k: Ing) => V(LEDGE[k].x, CY + 0.7, LEDGE[k].z - 0.45);
export const stallAt = () => V(STALL.x, CY + 1.05, STALL.z);
export const counterAt = () => V(COUNTER.x, CY + 0.9, COUNTER.z);
export const machineSpot = (k: Ing, i: number) => { const m = machineAt(k, i); return V(m.x, CY + 0.9, m.z); };
