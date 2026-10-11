// Your look: the player dresses themselves from the crowd's wardrobe (wardrobe.ts): a man's or a woman's build, skin,
// hair colour and cut, cartoon eyes and a mouth (as in PEAK), a moustache, beard, goatee or earrings, glasses, and the colours of their top, trousers and
// skirt. The 👕 row in the settings opens it; the camera comes in close, the player turns to face it, and they change
// as each thing is picked. The season still decides what goes over it (the hood, a cap, sunglasses...). The look goes
// with the save, and so to the cloud, and is kept on the device too, so a Restart doesn't undo it.
import { isHigh, onQuality } from './graphics';
import { openSettings } from './settings';
import { player } from './player';
import { Mesh, type Object3D, Raycaster, type Vector3 } from 'three';
import { CAM_YAW, camera, OFF, scene } from './render';
import { V } from './util';
import { FRAMES, GREY, HAIR, LEGS, rng, SHOES, SKINS, SKIRTS, type Cheeks, type Cut, type Eyes, type Face, type Mouth } from './wardrobe';

export interface Choice {
  woman: boolean;
  skin: number;
  hair: number;
  cut: Cut;
  eyes: Eyes;
  mouth: Mouth;
  cheeks: Cheeks;
  face: Face;
  /** Frame colour, or null for none. */
  glasses: number | null;
  /** The parka in winter, a jacket in spring and autumn, a T-shirt in summer. */
  top: number;
  legs: number;
  /** Worn in spring and summer, or null for trousers all year. */
  skirt: number | null;
  /** Shoes, and snow boots in winter. */
  shoes: number;
}
type Key = keyof Choice;

/** Everything there is to pick from, in the order it's shown: up to 8 colours, a row of them. Anyone can wear anything. */
export const OPTIONS: { [K in Key]: readonly Choice[K][] } = {
  woman: [false, true],
  skin: SKINS,
  hair: [...HAIR, GREY],
  cut: ['short', 'quiff', 'curly', 'bald', 'long', 'ponytail', 'bun', 'bob'],
  eyes: ['dot', 'round', 'sparkle', 'happy', 'sleepy', 'lashes', 'angry', 'wink'],
  mouth: ['none', 'smile', 'grin', 'tongue', 'o', 'flat', 'smirk', 'frown'],
  face: ['bare', 'mustache', 'beard', 'goatee', 'earrings'],
  glasses: [null, ...FRAMES],
  top: [0xFF6B4A, 0xF2B33D, 0x3FA37C, 0x2EC4B6, 0x5B8DEF, 0x7A6FF0, 0xE85D75, 0x2C3A47],
  legs: LEGS,
  skirt: [null, ...SKIRTS],
  shoes: SHOES,
  cheeks: ['plain', 'rosy', 'freckles'],
};

/** The plain look the player always had: what everything not picked yet falls back to. */
const BASE = { ...player.g.style };
export const DEFAULT: Choice = {
  woman: false, skin: BASE.skin, hair: BASE.hair, cut: BASE.cut, eyes: BASE.eyes, mouth: BASE.mouth, cheeks: BASE.cheeks, face: BASE.face,
  glasses: BASE.glasses, top: player.g.color, legs: BASE.legs, skirt: BASE.skirt, shoes: BASE.shoes,
};
/** What the player is wearing. */
export const choice: Choice = { ...DEFAULT };

/** A saved look, with anything unknown (a colour from an older game, a typo) back to the default. Null if it isn't one. */
export function readLook(raw: unknown): Choice | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>, c = { ...DEFAULT } as Record<Key, unknown>;
  for (const k of Object.keys(OPTIONS) as Key[]) if ((OPTIONS[k] as readonly unknown[]).includes(r[k])) c[k] = r[k];
  return c as unknown as Choice;
}

/** The device's copy, which outlives a Restart. */
const KEY = 'floe-market-look';

/**
 * Dresses the player in what they've picked. While they're picking, they're in spring clothes with nothing on their
 * head, whatever the season, so the hood or a hat doesn't hide their hair and glasses.
 */
function dressPlayer() {
  const { top, ...st } = choice, trying = !panel.hidden;
  player.g.season = trying ? 'spring' : null;
  player.g.restyle(top, { ...BASE, ...st, spring: trying ? 'bare' : BASE.spring });
}

/** Dresses the player in `c` (all of it, or the parts given), and keeps it on the device. */
export function setLook(c: Partial<Choice>) {
  Object.assign(choice, c);
  dressPlayer();
  try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* storage unavailable: it lasts the session */ }
  if (!panel.hidden) render();
}

// ---------- the panel ----------
const $ = (id: string) => document.getElementById(id)!;
const panel = $('look'), tabsEl = $('lookTabs'), rowsEl = $('lookRows');
const TABS: { name: string; rows: Key[] }[] = [
  { name: 'Body', rows: ['woman', 'skin'] },
  { name: 'Face', rows: ['eyes', 'mouth', 'cheeks'] },
  { name: 'Hair', rows: ['cut', 'hair'] },
  { name: 'Extras', rows: ['face', 'glasses'] },
  { name: 'Clothes', rows: ['top', 'legs', 'skirt', 'shoes'] },
];
/** What only High graphics draw (graphics.ts): on Low, these rows aren't offered. */
const HIGH_ONLY: Key[] = ['cheeks', 'shoes'];
const LABELS: Record<Key, string> = {
  woman: 'Build', skin: 'Skin', cut: 'Cut', hair: 'Colour', eyes: 'Eyes', mouth: 'Mouth', face: 'Beard, moustache or earrings', glasses: 'Glasses',
  top: 'Top', legs: 'Trousers', skirt: 'Skirt, in spring and summer', shoes: 'Shoes', cheeks: 'Cheeks',
};
/** Names for the options that are words rather than colours. */
const WORDS: Partial<Record<string, string>> = {
  false: 'Man', true: 'Woman',
  short: 'Short', quiff: 'Quiff', curly: 'Curls', bald: 'Bald', long: 'Long', ponytail: 'Ponytail', bun: 'Bun', bob: 'Bob',
  bare: 'None', mustache: 'Moustache', beard: 'Beard', goatee: 'Goatee', earrings: 'Earrings',
  plain: 'Plain', rosy: 'Rosy', freckles: 'Freckles',
};
/** Little drawings of the eyes and mouths (32 across, in the text colour), and what each is called. */
const svg = (inner: string) => `<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const dots = (l = true, r = true) => (l ? '<circle cx="10" cy="16" r="2.6" fill="currentColor" stroke="none"/>' : '') + (r ? '<circle cx="22" cy="16" r="2.6" fill="currentColor" stroke="none"/>' : '');
const big = (shine: boolean) => [10, 22].map(x => `<circle cx="${x}" cy="16" r="5.4" stroke-width="2"/><circle cx="${x}" cy="16.6" r="2.8" fill="currentColor" stroke="none"/>`
  + (shine ? `<circle cx="${x + 1.2}" cy="15.2" r="1" fill="var(--pill)" stroke="none"/>` : '')).join('');
const smile = '<path d="M9 14 Q16 22 23 14"/>';
const ICONS: { eyes: Record<Eyes, [string, string]>; mouth: Record<Mouth, [string, string]> } = {
  eyes: {
    dot: ['Dots', dots()],
    round: ['Round', big(false)],
    sparkle: ['Sparkly', big(true)],
    happy: ['Happy', '<path d="M6 18 Q10 11 14 18M18 18 Q22 11 26 18"/>'],
    sleepy: ['Sleepy', '<path d="M5.5 14.5H14.5M17.5 14.5H26.5"/><path d="M7 14.5A3 3 0 0 0 13 14.5ZM19 14.5A3 3 0 0 0 25 14.5Z" fill="currentColor" stroke-width="1"/>'],
    lashes: ['Lashes', dots() + '<path d="M8 13.4L5.6 10.8M10 13L9.4 10.2M24 13.4L26.4 10.8M22 13L22.6 10.2" stroke-width="1.8"/>'],
    angry: ['Angry', dots() + '<path d="M5.5 10L14 13M26.5 10L18 13"/>'],
    wink: ['Wink', dots(true, false) + '<path d="M18 18 Q22 11 26 18"/>'],
  },
  mouth: {
    none: ['None', ''],
    smile: ['Smile', smile],
    grin: ['Grin', '<path d="M8.5 12.5H23.5A7.5 7.5 0 0 1 8.5 12.5Z" fill="currentColor" stroke-width="1"/><rect x="10.5" y="12.5" width="11" height="2.6" fill="var(--pill)" stroke="none"/>'],
    tongue: ['Tongue out', smile + '<ellipse cx="17.6" cy="19.6" rx="2.6" ry="3" fill="#E8707A" stroke="none"/>'],
    o: ['Surprised', '<ellipse cx="16" cy="16" rx="3.4" ry="4.2"/>'],
    flat: ['Flat', '<path d="M10 16H22"/>'],
    smirk: ['Smirk', '<path d="M12 17 Q18 20 23 13"/>'],
    frown: ['Frown', '<path d="M9 20 Q16 12 23 20"/>'],
  },
};
let tab = 0;

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

function render() {
  tabsEl.querySelectorAll('button').forEach((b, i) => {
    b.setAttribute('aria-selected', String(i === tab));
    b.tabIndex = i === tab ? 0 : -1;
  });
  rowsEl.replaceChildren(...TABS[tab].rows.filter(k => isHigh() || !HIGH_ONLY.includes(k)).map(k => {
    const row = document.createElement('div');
    row.className = 'lrow';
    const label = document.createElement('span');
    label.className = 'lab'; label.id = 'look-' + k; label.textContent = LABELS[k];
    const opts = document.createElement('div');
    const icons = k === 'eyes' || k === 'mouth' ? ICONS[k] as Record<string, [string, string]> : null;
    opts.className = icons || typeof OPTIONS[k][1] === 'number' ? 'opts swatches' : 'opts'; opts.setAttribute('role', 'radiogroup'); opts.setAttribute('aria-labelledby', label.id);
    OPTIONS[k].forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(choice[k] === v));
      const word = WORDS[String(v)], icon = icons?.[String(v)];
      if (icon) { b.className = icon[1] ? 'sw icon' : 'sw none'; b.innerHTML = icon[1] && svg(icon[1]); b.setAttribute('aria-label', icon[0]); }
      else if (word) { b.className = 'word'; b.textContent = word; }
      else if (v === null) { b.className = 'sw none'; b.setAttribute('aria-label', 'None'); }
      else { b.className = 'sw'; b.style.background = hex(v as number); b.setAttribute('aria-label', `${LABELS[k]} ${i + 1}`); }
      b.addEventListener('click', () => setLook({ [k]: v }));
      opts.append(b);
    });
    row.append(label, opts);
    return row;
  }));
}

/** Opens or closes the panel (the settings menu closes as it opens). */
export function openLook(open: boolean) {
  panel.hidden = !open;
  dressPlayer();
  if (open) { openSettings(false); render(); lookAgain = 0; }
}

$('lookOpen').addEventListener('click', () => openLook(true));
$('lookDone').addEventListener('click', () => openLook(false));
tabsEl.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { tab = i; render(); }));
// arrow keys move along the tabs, as in any tab list
tabsEl.addEventListener('keydown', e => {
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!d) return;
  tab = (tab + d + TABS.length) % TABS.length;
  render();
  tabsEl.querySelectorAll('button')[tab].focus();
});
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) openLook(false); });
onQuality(() => { if (!panel.hidden) render(); });

/** Its own dice, seeded like the crowd's (wardrobe.ts). */
const dice = rng(Date.now());
const any = <T>(a: readonly T[]) => a[Math.floor(dice() * a.length)];
/** A whole new look, mixed the way the crowd's are: a man's or a woman's cut and face, and glasses now and then. */
$('lookDice').addEventListener('click', () => {
  const woman = dice() < 0.5;
  setLook({
    woman, skin: any(OPTIONS.skin), hair: any(HAIR), top: any(OPTIONS.top), legs: any(OPTIONS.legs),
    eyes: any(OPTIONS.eyes.filter(e => woman || e !== 'lashes')), mouth: any(OPTIONS.mouth),
    cut: any<Cut>(woman ? ['long', 'ponytail', 'bun', 'bob', 'curly'] : ['short', 'quiff', 'curly', 'bald']),
    face: any<Face>(woman ? ['bare', 'earrings'] : ['bare', 'mustache', 'beard', 'goatee']),
    glasses: dice() < 0.25 ? any(FRAMES) : null,
    skirt: woman && dice() < 0.6 ? any(SKIRTS) : null,
    shoes: any(OPTIONS.shoes), cheeks: any(OPTIONS.cheeks),
  });
});

/** Each frame, with the panel open: the player turns round to face the camera, and walking off closes it. */
export function updLook(dt: number) {
  if (panel.hidden) return;
  if (player.moving) { openLook(false); return; }
  let d = CAM_YAW - player.h;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  player.h += d * Math.min(1, dt * 8);
}

/** The camera's place to see the look from, by the player: in close, face on at first (CLOSE_LOW), and how far up them it looks. */
export const CLOSE = V(0, 0, 0), CLOSE_AIM = 0.6;
/** Lower than usual and the same way round, to see their face rather than the top of their head. */
const CLOSE_LOW = V(2.2, 3.1, 5.4);
/** The game's own angle, as close: nothing stands in the way from there (the world's built to be seen from it). */
const CLOSE_HIGH = OFF.clone().setLength(CLOSE_LOW.length());
CLOSE.copy(CLOSE_LOW);
const ray = Object.assign(new Raycaster(), { camera }), face = V(0, 0, 0), tryAt = V(0, 0, 0), want = V(0, 0, 0);
/** Seen, and not part of the player. */
function inTheWay(o: Object3D | null) {
  if (!(o instanceof Mesh)) return false;
  for (; o; o = o.parent) if (!o.visible || o === player.g) return false;
  return true;
}
/** The lowest of a few angles, from face on up to the game's own, with nothing between the camera and their face. */
function clearView(into: Vector3) {
  face.copy(player.g.position); face.y += 1.05;
  for (const t of [0, 0.3, 0.6, 0.85]) {
    tryAt.lerpVectors(CLOSE_LOW, CLOSE_HIGH, t);
    // starting a little way out, past what they're carrying
    ray.set(face, tryAt.clone().normalize()); ray.near = 0.7; ray.far = tryAt.length();
    if (!ray.intersectObject(scene, true).some(h => inTheWay(h.object))) return into.copy(tryAt);
  }
  return into.copy(CLOSE_HIGH);
}

/** How far the camera has come in to see the look, from 0 (its usual place) to 1 (CLOSE), easing in and back out. */
let near = 0, lookAgain = 0;
export function closeUp(dt: number) {
  const open = !panel.hidden;
  if (open && (lookAgain -= dt) <= 0) {
    if (near < 0.01) CLOSE.copy(clearView(want)); // straight there on the way in
    else clearView(want);
    lookAgain = 0.3;
  }
  if (open) CLOSE.lerp(want, Math.min(1, dt * 4));
  near += ((open ? 1 : 0) - near) * Math.min(1, dt * 5);
  return near * near * (3 - 2 * near);
}

// The device's look, until a save brings its own (save.ts).
try {
  const kept = readLook(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  if (kept) setLook(kept);
} catch { /* nothing kept, or storage unavailable */ }
