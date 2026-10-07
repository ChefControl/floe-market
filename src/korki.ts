// Korki's golden statue: a memorial to a NAMI Klima One, bought on a $10 tile.
// Standing on its pad opens the memoir panel; walking off closes it. Lingering there fades in his song.
import {
  BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, Material, Mesh, MeshPhongMaterial, Shape, TorusGeometry,
} from 'three';
import { decal, drawPad } from './decals';
import { player } from './player';
import { CAM_YAW, canvasTex, FONT, mat, mesh, rr, scene } from './render';
import { d2xz, FY } from './util';

/**
 * Statue centre, out on the snow past the bottom fence where no one walks, and its heading:
 * turned a little so the camera sees the side and a bit of the front.
 */
export const STATUE = { x: -3.7, z: 10.3, h: CAM_YAW - 0.35 };
/**
 * Where the player stands to read the memoir (and where the $10 tile sits until it's bought):
 * on the deck just inside the fence, clear of every upgrade tile.
 */
export const KORKI = { x: -3.7, z: 6.75 };

// ---------- materials ----------
const gold = new MeshPhongMaterial({ color: 0xC99A22, specular: 0xFFE8A0, shininess: 90, emissive: 0x140C00 });
/** Darker gold for the "rubber" parts (tires, grips) so the shape still reads in one metal. */
const deepGold = new MeshPhongMaterial({ color: 0x8E6414, specular: 0xC9A04A, shininess: 40, emissive: 0x0A0600 });

function part(geo: BufferGeometry, m: Material | Material[] = gold, x = 0, y = 0, z = 0) {
  const o = new Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

type P = [x: number, y: number];
/** Flat bar between two side-view points. */
function strut(a: P, b: P, t: number, w: number, z = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const m = part(new BoxGeometry(Math.hypot(dx, dy), t, w), gold, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  m.rotation.z = Math.atan2(dy, dx);
  return m;
}
/** Round tube between two side-view points. */
function rod(a: P, b: P, r: number, z = 0, m = gold) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const o = part(new CylinderGeometry(r, r, Math.hypot(dx, dy), 12), m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  o.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  return o;
}
/** Coil-over shock absorber from `a` to `b`. */
function shock(a: P, b: P, z = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const g = new Group();
  g.position.set(a[0], a[1], z);
  g.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  g.add(part(new CylinderGeometry(0.012, 0.012, len, 8), gold, 0, len / 2, 0));
  g.add(part(new CylinderGeometry(0.024, 0.024, 0.03, 12), gold, 0, len * 0.1, 0));
  const coil = new TorusGeometry(0.022, 0.006, 6, 14);
  for (let i = 0; i < 7; i++) {
    const r = part(coil, gold, 0, len * (0.22 + i * 0.1), 0);
    r.rotation.x = Math.PI / 2;
    g.add(r);
  }
  return g;
}

/** 10-inch wheel: fat tire, split five-spoke rim, disc brake; the rear has the hub motor. */
const R = 0.132;
function wheel(x: number, rear: boolean) {
  const g = new Group();
  g.position.set(x, R, 0);
  g.add(part(new TorusGeometry(0.095, 0.037, 10, 28), deepGold));
  g.add(part(new TorusGeometry(0.07, 0.012, 6, 24)));
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const s = part(new BoxGeometry(0.07, 0.014, 0.05), gold, Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0);
    s.rotation.z = a;
    g.add(s);
  }
  const hub = part(new CylinderGeometry(rear ? 0.05 : 0.025, rear ? 0.05 : 0.025, 0.07, 16));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  const disc = part(new CylinderGeometry(0.066, 0.066, 0.004, 24), gold, 0, 0, -0.042);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  return g;
}

/** Fender: a flattened ring arc over a wheel, from angle `a0` sweeping `arc` (radians, 0 = forward). */
function fender(x: number, a0: number, arc: number) {
  const f = part(new TorusGeometry(0.15, 0.018, 6, 20, arc), gold, x, R, 0);
  f.rotation.z = a0;
  f.scale.z = 2.6;
  return f;
}

/** NAMI deck grip plate with the logo. */
const logo = canvasTex(512, 192, (c, w, h) => {
  c.fillStyle = '#D9A13A'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(120,80,15,.25)';
  for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) c.fillRect(x, y, 3, 3);
  c.fillStyle = '#7A5210'; c.font = `800 120px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('NAMI', w / 2, h / 2 + 6);
});
const logoMat = new MeshPhongMaterial({ map: logo.tex, specular: 0xFFF0B0, shininess: 60 });

/**
 * The scooter itself, modelled in metres from the Klima One's side profile (wheelbase ~0.95 m,
 * bars ~1.33 m high, 62 cm wide). +x is forward, the deck runs along x, the axles along z.
 */
function buildScooter() {
  const g = new Group();

  // Chassis side profile: deck, the swan neck rising to the steering head, and the rear kick-tail.
  const s = new Shape();
  s.moveTo(-0.27, 0.21);
  s.lineTo(0.12, 0.21);
  s.quadraticCurveTo(0.27, 0.21, 0.37, 0.38);
  s.lineTo(0.44, 0.44);
  s.lineTo(0.41, 0.49);
  s.quadraticCurveTo(0.26, 0.31, 0.12, 0.30);
  s.lineTo(-0.22, 0.30);
  s.lineTo(-0.30, 0.40);
  s.lineTo(-0.44, 0.41);
  s.lineTo(-0.45, 0.375);
  s.lineTo(-0.335, 0.365);
  s.lineTo(-0.27, 0.27);
  s.closePath();
  const chassis = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 12 });
  chassis.translate(0, 0, -0.1);
  g.add(part(chassis));
  g.add(part(new BoxGeometry(0.46, 0.004, 0.17), [gold, gold, logoMat, gold, gold, gold], -0.04, 0.3155, 0));

  // Steering head and the raked stem (it leans back ~7.5°), with the folding clamp near the bottom.
  const rake = 0.13, up: P = [-Math.sin(rake), Math.cos(rake)];
  const at = (from: P, d: number): P => [from[0] + up[0] * d, from[1] + up[1] * d];
  const headBase: P = [0.43, 0.42];
  g.add(rod(headBase, at(headBase, 0.2), 0.045));
  const stemBase = at(headBase, 0.2), top = at(stemBase, 0.75);
  g.add(rod(stemBase, top, 0.021));
  g.add(rod(at(stemBase, 0.06), at(stemBase, 0.13), 0.032));

  // Handlebar: T-bar with grips, brake levers, the round display in the middle.
  const bar = part(new CylinderGeometry(0.016, 0.016, 0.62, 10), gold, top[0], top[1], 0);
  bar.rotation.x = Math.PI / 2;
  g.add(bar);
  for (const z of [-1, 1]) {
    const grip = part(new CylinderGeometry(0.023, 0.023, 0.12, 10), deepGold, top[0], top[1], z * 0.25);
    grip.rotation.x = Math.PI / 2;
    g.add(grip);
    const lever = part(new BoxGeometry(0.1, 0.008, 0.012), gold, top[0] + 0.05, top[1] - 0.01, z * 0.21);
    lever.rotation.y = z * 0.25;
    g.add(lever);
  }
  const display = part(new CylinderGeometry(0.042, 0.042, 0.022, 20), gold, top[0] - 0.01, top[1] + 0.035, 0);
  display.rotation.z = 0.9;
  g.add(display);

  // Front suspension: twin arms from under the head to the axle, a shock on each side.
  const frontAxle: P = [0.5, R];
  for (const z of [-0.055, 0.055]) {
    g.add(strut([0.41, 0.39], frontAxle, 0.03, 0.016, z));
    g.add(shock([0.47, 0.44], [0.49, 0.2], z));
  }

  // Rear: swingarms pivoting at the deck's end, the coil-over standing under the kick-tail,
  // the folding hook sticking out back.
  const rearAxle: P = [-0.47, R];
  for (const z of [-0.055, 0.055]) g.add(strut([-0.27, 0.25], rearAxle, 0.045, 0.016, z));
  g.add(shock([-0.36, 0.2], [-0.35, 0.39]));
  g.add(strut([-0.42, 0.42], [-0.52, 0.43], 0.02, 0.07));

  g.add(wheel(frontAxle[0], false), wheel(rearAxle[0], true));
  g.add(fender(frontAxle[0], 0.35, 1.65), fender(rearAxle[0], Math.PI / 2 - 0.2, Math.PI / 2 + 0.6));
  g.add(part(new BoxGeometry(0.04, 0.03, 0.08), gold, rearAxle[0] - 0.1, R + 0.15, 0));

  // Kickstand, down from the deck on the left side.
  const stand = strut([0.0, 0.215], [-0.05, 0.0], 0.015, 0.015, 0.12);
  g.add(stand);
  return g;
}

/** Plaque on the pedestal's front. */
const plaque = canvasTex(512, 128, (c, w, h) => {
  c.fillStyle = '#2B3A46'; rr(c, 0, 0, w, h, 18); c.fill();
  c.strokeStyle = '#E3A92B'; c.lineWidth = 6; rr(c, 8, 8, w - 16, h - 16, 12); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#F2C14E';
  c.font = `800 62px ${FONT}`; c.fillText('KORKI', w / 2, 52);
  c.font = `600 24px ${FONT}`; c.fillText('NAMI Klima One · 5,000 km · Tel Aviv', w / 2, 98);
});

function buildStatue() {
  const g = new Group();
  g.position.set(STATUE.x, FY, STATUE.z);
  g.rotation.y = STATUE.h;
  g.add(mesh(new BoxGeometry(1.9, 0.18, 0.95), 0xD3DCE2, 0, 0.09, 0, true));
  g.add(mesh(new BoxGeometry(1.7, 0.32, 0.8), 0xEEF2F5, 0, 0.34, 0, true));
  const p = mesh(new BoxGeometry(1.1, 0.26, 0.01), [mat(0x2B3A46), mat(0x2B3A46), mat(0x2B3A46), mat(0x2B3A46), new MeshPhongMaterial({ map: plaque.tex }), mat(0x2B3A46)], 0, 0.34, 0.402);
  g.add(p);
  const scooter = buildScooter();
  scooter.scale.setScalar(1.25);
  scooter.position.y = 0.5;
  g.add(scooter);
  scene.add(g);
  return g;
}

// ---------- state ----------
const pad = decal(1.9, (c, w, h) => drawPad(c, w, h, '🛴'));
pad.mesh.position.set(KORKI.x, FY + 0.01, KORKI.z);
pad.mesh.visible = false;

const panel = document.getElementById('korki')!;
let statue: Group | null = null;
let open = false;

/** The 'korki' unlock: raises the statue and its pad. Returns the statue for the pop-in. */
export function enableKorki() {
  statue = buildStatue();
  pad.mesh.visible = true;
  return statue;
}

// ---------- music ----------
/** "Car Alarm (extended reprise)" by pat's soundhouse, played through YouTube's embedded player. */
const SONG = 'jcutNFPwXPE';
/** Seconds on the pad before the song starts. */
const LINGER = 3;
/** Song volume (YouTube's 0-100 scale): kept low, it's background. */
const MAX_VOL = 10;
/** Seconds for a full fade in / fade out. */
const FADE_IN = 6, FADE_OUT = 2.5;

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
}
interface YTApi {
  Player: new (el: HTMLElement, opts: object) => unknown;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let song: YTPlayer | null = null;
let songLoading = false;
let playing = false;
/** Seconds the player has been on the pad. */
let stood = 0;
let vol = 0, sentVol = -1;

/** Loads YouTube's player API (only once someone lingers) and an invisible player for the song. */
function loadSong() {
  songLoading = true;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Off-screen rather than display:none, which some browsers treat as "don't play".
  host.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  const el = document.createElement('div');
  host.appendChild(el);
  document.body.appendChild(host);
  const make = () => new window.YT!.Player(el, {
    videoId: SONG, width: 1, height: 1,
    playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: SONG, playsinline: 1 },
    events: { onReady: (e: { target: YTPlayer }) => { song = e.target; song.setVolume(0); } },
  });
  if (window.YT?.Player) { make(); return; }
  window.onYouTubeIframeAPIReady = make;
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

/** Fades the song in after lingering on the pad, and out (then pauses it) after leaving. */
function updSong(onPad: boolean, dt: number) {
  stood = onPad ? stood + dt : 0;
  const want = stood >= LINGER;
  if (want && !songLoading) loadSong();
  if (!song) return;
  vol = want ? Math.min(MAX_VOL, vol + MAX_VOL / FADE_IN * dt) : Math.max(0, vol - MAX_VOL / FADE_OUT * dt);
  if (vol > 0 && !playing) { song.playVideo(); playing = true; }
  const v = Math.round(vol);
  if (v !== sentVol) { song.setVolume(v); sentVol = v; }
  if (vol === 0 && playing) { song.pauseVideo(); playing = false; }
}

/** Shows the memoir while the player stands on the pad, and plays his song if they stay. */
export function updKorki(dt: number) {
  if (!statue) return;
  const near = d2xz(player.g.position, KORKI) < 0.95 * 0.95;
  if (near !== open) {
    open = near;
    panel.hidden = !open;
    if (open) panel.scrollTop = 0;
  }
  updSong(near, dt);
}
