// ?arcade=on (dev and demo builds only, main.ts): the greybox of Cooking Hazard's fight, the arcade cabinet's game, on
// the UI kit's full screen over the game, which waits behind it. Pick a gun and two dishes, then hold the street till the
// horde gets you; Esc leaves. The rules are hazard.ts; this draws a run on a canvas and feeds it the keys and mouse.
// Mouse and keyboard only, for now: WASD to walk, the mouse to aim, hold the button to fire, F to shove, R to reload.
// Hold 1 or 2 to serve a dish: the chef stops while its code goes in on WASD or the arrows; let go, then click to throw.
import './hazard.css';
import {
  DISHES, GUNS, H, LEVELS, MOVES, TASTES, W, letGo, newRun, press, reload, shove, startServe, step, stripPos, throwDish,
  type Dir, type DishId, type GunId, type Run,
} from './hazard';
import { chime, clack, lose, pop, throwSound } from './sfx';
import { panel } from './uiKit';

const BEST = 'floe-market-hazard-best';
const GUN_IDS = Object.keys(GUNS) as GunId[];
const DISH_IDS = Object.keys(DISHES) as DishId[];
const SLOTS = 4;

const root = document.createElement('div');
root.id = 'hazard';
root.hidden = true;
root.innerHTML = `
  <div class="hz-pick">
    <h2 class="k-title">🕹️ Cooking Hazard</h2>
    <p class="k-cap">Pick a gun and two dishes</p>
    <div class="k-row k-keys hz-guns">${GUN_IDS.map(g => `<button class="k-btn k-choice" data-gun="${g}">${GUNS[g].emoji} ${GUNS[g].name}</button>`).join('')}</div>
    <div class="k-row k-keys hz-dish-pick">${DISH_IDS.map(d => `<button class="k-btn k-choice" data-dish="${d}">${DISHES[d].emoji} ${DISHES[d].name} · ${TASTES[DISHES[d].taste].icon}</button>`).join('')}</div>
    <div class="k-row"><button class="k-btn k-main hz-start">Start run</button></div>
  </div>
  <div class="hz-play" hidden>
    <canvas></canvas>
    <div class="hz-hud">
      <div class="pill"><span class="hz-ic" style="background:var(--hot)">❤️</span><span class="hz-bar"><i class="hz-hp"></i></span><span class="hz-hpn"></span></div>
      <div class="pill"><span class="hz-ic" style="background:#e0702a">⏱️</span><span class="hz-time"></span>
        <span class="hz-strip"><span class="hz-track">${LEVELS.map(l => `<b>${l === 'BIOHAZARD' ? '☣️ ' : ''}${l}</b>`).join('')}</span><span class="hz-mark"></span></span></div>
      <div class="pill"><span class="hz-ic hz-gun"></span><span class="hz-ammo"></span></div>
      <div class="pill"><span class="hz-ic" style="background:#49c25b">🧟</span><span class="hz-score"></span></div>
      <div class="pill hz-boost" hidden><span class="hz-ic" style="background:#49c25b">🌿</span><span class="hz-boostn"></span></div>
    </div>
    <div class="hz-dishes"></div>
  </div>
  <div class="hz-over" hidden>
    <h2 class="k-title">The horde got you</h2>
    <div class="hz-stats"></div>
    <div class="k-row">
      <button class="k-btn k-plain hz-change">Change loadout</button>
      <button class="k-btn k-main hz-again">Run again</button>
    </div>
  </div>`;
document.body.append(root);
panel(root, { place: 'full', close: closeHazard });

const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
const pick = $('.hz-pick'), play = $('.hz-play'), over = $('.hz-over');
const canvas = $<HTMLCanvasElement>('canvas');
const ctx = canvas.getContext('2d')!;

// ---------- the loadout ----------
let gun: GunId = 'spud';
let dishes: DishId[] = ['chiliPot', 'syrup'];
function showPick() {
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-gun]')) b.setAttribute('aria-pressed', String(b.dataset.gun === gun));
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-dish]')) b.setAttribute('aria-pressed', String(dishes.includes(b.dataset.dish as DishId)));
  $<HTMLButtonElement>('.hz-start').disabled = dishes.length !== 2;
}
root.addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.gun) gun = b.dataset.gun as GunId;
  if (b.dataset.dish) {
    const d = b.dataset.dish as DishId;
    // two at a time: a third replaces the older of the two
    dishes = dishes.includes(d) ? dishes.filter(x => x !== d) : [...dishes, d].slice(-2);
  }
  if (b.classList.contains('hz-start') || b.classList.contains('hz-again')) startRun();
  if (b.classList.contains('hz-change')) mode('pick');
  showPick();
});

// ---------- screens ----------
let run: Run | null = null;
function mode(m: 'pick' | 'play' | 'over') {
  root.dataset.mode = m;
  pick.hidden = m !== 'pick'; play.hidden = m !== 'play'; over.hidden = m !== 'over';
}

/** The current run, if one's under way or just over (for the tests). */
export const hazardRun = () => run;

export function openHazard() {
  root.hidden = false;
  mode('pick');
  showPick();
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

export function closeHazard() {
  root.hidden = true;
  run = null;
  held.clear();
  firing = false;
  cancelAnimationFrame(raf);
}

function startRun() {
  run = newRun({ gun, dishes: [...dishes] });
  seen = { cooked: 0, servings: run.servings.join() };
  mode('play');
  dishBar();
}

function finish(r: Run) {
  lose();
  let best = 0;
  try { best = Number(localStorage.getItem(BEST)) || 0; } catch { /* no storage: no best */ }
  const time = Math.floor(r.t), isBest = time > best;
  if (isBest) try { localStorage.setItem(BEST, String(time)); } catch { /* kept for this visit only */ }
  const chip = (s: string) => `<span class="pill">${s}</span>`;
  $('.hz-stats').innerHTML = [
    chip(`⏱️ ${clock(time)} · ${LEVELS[Math.min(3, Math.floor(stripPos(r.t)))]}`),
    chip(`🧟 ${r.kills}`), chip(`🍳 ${r.cooked} cooked`),
    chip(isBest ? '🏆 New best' : `🏆 Best ${clock(best)}`),
  ].join('');
  mode('over');
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- keys and mouse ----------
const held = new Set<string>();
let firing = false;
const aim = { x: W / 2, y: H / 2 };
const DIRS: Record<string, Dir> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
/** A dish slot's key (1 to 4), or -1. */
const slotKey = (code: string) => { const m = /^(?:Digit|Numpad)([1-4])$/.exec(code); return m ? Number(m[1]) - 1 : -1; };

window.addEventListener('keydown', e => {
  if (root.hidden || root.dataset.mode !== 'play' || !run || run.over) return;
  const dir = DIRS[e.code], slot = slotKey(e.code);
  if (dir || slot >= 0 || e.code === 'KeyF' || e.code === 'KeyR') e.preventDefault();
  if (e.repeat) return;
  if (dir && run.serving && !run.serving.ready) {
    const got = press(run, dir);
    if (got === 'done') chime(); else clack();
    return;
  }
  if (dir) held.add(e.code);
  if (slot >= 0) startServe(run, slot);
  if (e.code === 'KeyF') shove(run);
  if (e.code === 'KeyR') reload(run);
});
window.addEventListener('keyup', e => {
  held.delete(e.code);
  if (run && slotKey(e.code) >= 0) letGo(run);
});
window.addEventListener('blur', () => { held.clear(); firing = false; });

/** Where the mouse is, in the street's own units. */
function toStreet(e: { clientX: number; clientY: number }) {
  const rect = canvas.getBoundingClientRect(), { s, ox, oy } = fit();
  aim.x = (e.clientX - rect.left - ox) / s; aim.y = (e.clientY - rect.top - oy) / s;
}
canvas.addEventListener('pointermove', toStreet);
canvas.addEventListener('pointerdown', e => {
  if (!run || e.button !== 0) return;
  toStreet(e);
  if (run.serving?.ready) { if (throwDish(run, aim)) throwSound(0); return; }
  firing = true;
});
window.addEventListener('pointerup', () => { firing = false; });

function input() {
  const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
  const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
  return { move: { x, y }, aim, fire: firing };
}

// ---------- the loop ----------
let raf = 0, last = 0;
let seen = { cooked: 0, servings: '' };

function frame(now: number) {
  if (root.hidden) return;
  advance(Math.min(0.05, Math.max(0, (now - last) / 1000)));
  last = now;
  raf = requestAnimationFrame(frame);
}

/** One frame: the run moves on `dt` seconds and the screen catches up. */
export function advance(dt: number) {
  if (!run || root.dataset.mode !== 'play') return;
  step(run, dt, input());
  if (run.cooked > seen.cooked) pop();
  seen.cooked = run.cooked;
  draw(run);
  hud(run);
  if (seen.servings !== run.servings.join() || run.serving) dishBar();
  if (run.over) finish(run);
}

// ---------- the HUD ----------
function hud(r: Run) {
  const g = GUNS[r.loadout.gun];
  $('.hz-hp').style.width = `${r.player.hp}%`;
  $('.hz-hpn').textContent = String(Math.ceil(r.player.hp));
  $('.hz-time').textContent = clock(r.t);
  // the words slide left past the marker, 120px a word
  $('.hz-track').style.transform = `translateX(${60 - stripPos(r.t) * 120}px)`;
  const ic = $('.hz-gun');
  ic.textContent = g.emoji;
  ic.style.background = g.taste ? TASTES[g.taste].color : '';
  $('.hz-ammo').textContent = r.reloadT > 0 ? 'Reloading' : `${r.ammo} / ${g.mag}`;
  $('.hz-score').textContent = `${r.kills} · 🍳 ${r.cooked}`;
  $('.hz-boost').hidden = r.boost <= 0;
  $('.hz-boostn').textContent = `Boost ×${r.boost}`;
}

function dishBar() {
  if (!run) return;
  const r = run;
  seen.servings = r.servings.join();
  $('.hz-dishes').innerHTML = Array.from({ length: SLOTS }, (_, i) => {
    const id = r.loadout.dishes[i];
    if (!id) return `<div class="hz-slot locked"><span>🔒</span>Slot ${i + 1}</div>`;
    const d = DISHES[id], t = TASTES[d.taste], n = r.servings[i];
    const cls = n <= 0 ? ' empty' : r.serving?.slot === i ? ' on' : '';
    const ink = d.taste === 'spicy' || d.taste === 'bitter' || d.taste === 'umami' ? '#fff' : 'var(--ink)';
    return `<div class="hz-slot${cls}" style="--c:${t.color};--c-ink:${ink}"><span>${d.emoji}</span>${d.name.split(' ')[0]}<b>${n}</b></div>`;
  }).join('');
}

// ---------- drawing ----------
/** How the street fits the screen: its scale and where it starts. */
function fit() {
  const cw = canvas.clientWidth || W, ch = canvas.clientHeight || H, s = Math.min(cw / W, ch / H);
  return { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch };
}

const emoji = (e: string, x: number, y: number, size: number) => {
  ctx.font = `${size}px "Floe Emoji", system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
};
const disc = (x: number, y: number, r: number, fill: string) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
const ring = (x: number, y: number, r: number, stroke: string, w: number, from = 0, to = Math.PI * 2) => {
  ctx.beginPath(); ctx.arc(x, y, r, from, to); ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke();
};

function draw(r: Run) {
  const { s, ox, oy, cw, ch } = fit(), dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1b2430'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);

  // the street: asphalt between two pavements, a dashed line down the middle
  ctx.fillStyle = '#2c3a47'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b6b78'; ctx.fillRect(0, 0, W, 110); ctx.fillRect(0, H - 110, W, 110);
  ctx.fillStyle = '#c9a66b';
  for (let x = 20; x < W; x += 120) ctx.fillRect(x, H / 2 - 4, 70, 8);

  for (const z of r.zones) {
    const c = z.kind === 'smoke' ? 'rgba(106,63,160,.35)' : z.kind === 'caramel' ? 'rgba(224,57,43,.3)' : z.kind === 'battery' ? 'rgba(127,196,224,.3)' : 'rgba(240,139,176,.35)';
    disc(z.x, z.y, z.r, c);
  }
  for (const g of r.garnishes) emoji('🌿', g.x, g.y, 26);

  for (const z of r.zombies) {
    // shadow, then the coat's ring at the feet (and how full a building taste's ring is)
    ctx.beginPath(); ctx.ellipse(z.x, z.y + z.r * 0.8, z.r, z.r * 0.4, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
    if (z.coat) {
      const t = TASTES[z.coat], fade = Math.min(1, z.coatT);
      ctx.globalAlpha = 0.35 + 0.65 * fade;
      ring(z.x, z.y, z.r + 6, t.color, 3);
      if (t.builds) ring(z.x, z.y, z.r + 11, t.color, 4, -Math.PI / 2, -Math.PI / 2 + z.meter * Math.PI * 2);
      emoji(t.icon, z.x, z.y - z.r - 14, 16);
      ctx.globalAlpha = 1;
    }
    const body = z.freezeT > 0 ? '#f08bb0' : z.ticket ? '#7a8a6a' : '#8a9a7a';
    disc(z.x, z.y, z.r, body);
    if (z.burnT > 0) ring(z.x, z.y, z.r - 2, '#e0702a', 3);
    if (z.poison > 0) ring(z.x, z.y, z.r - 5, '#6a3fa0', 2);
    if (z.meltT > 0) ring(z.x, z.y, z.r - 8 > 2 ? z.r - 8 : 2, '#6fa83a', 2);
    emoji('🧟', z.x, z.y, z.r * 1.5);
    if (z.ticket) {
      // its order ticket: done tastes ticked
      const w = 74;
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(z.x - w / 2, z.y - z.r - 44, w, 28);
      ctx.fillStyle = '#c93f25'; ctx.fillRect(z.x - w / 2, z.y - z.r - 44, w, 4);
      z.ticket.forEach((t, i) => {
        ctx.globalAlpha = i < z.step ? 0.35 : 1;
        emoji(TASTES[t].icon, z.x - 16 + i * 32, z.y - z.r - 28, 18);
        ctx.globalAlpha = 1;
      });
    }
    if (z.hp < z.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(z.x - z.r, z.y + z.r + 6, z.r * 2, 4);
      ctx.fillStyle = '#c93f25'; ctx.fillRect(z.x - z.r, z.y + z.r + 6, z.r * 2 * Math.max(0, z.hp / z.maxHp), 4);
    }
  }

  for (const sh of r.shots) disc(sh.x, sh.y, 4, sh.taste ? TASTES[sh.taste].color : '#f6ebd3');
  for (const th of r.thrown) {
    // in the air: from the chef to where it lands, up in an arc
    const k = 1 - th.t / 0.5, x = th.fromX + (th.x - th.fromX) * k, y = th.fromY + (th.y - th.fromY) * k - Math.sin(k * Math.PI) * 60;
    ring(th.x, th.y, DISHES[th.dish].r, 'rgba(255,195,74,.6)', 2);
    emoji(DISHES[th.dish].emoji, x, y, 28);
  }

  const p = r.player;
  disc(p.x, p.y, 20, '#ffffff');
  emoji('🧑‍🍳', p.x, p.y, 26);
  if (r.serving) serveTicket(r);
  if (r.serving?.ready) {
    ring(aim.x, aim.y, DISHES[r.loadout.dishes[r.serving.slot]].r, '#ffc34a', 3);
    disc(aim.x, aim.y, 4, '#ffc34a');
  }

  for (const st of r.stamps) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, st.t * 2);
    ctx.translate(st.x, st.y); ctx.rotate(-0.15);
    ctx.font = '800 26px "Floe Emoji", "Baloo 2", "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(st.text).width + 20;
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(-w / 2, -18, w, 36);
    ctx.strokeStyle = '#c93f25'; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -18, w, 36);
    ctx.fillStyle = '#c93f25'; ctx.fillText(st.text, 0, 1);
    ctx.restore();
  }
}

/** The recipe ticket over the chef while a dish's code goes in: done steps filled, a slip smudges it. */
function serveTicket(r: Run) {
  const s = r.serving!, code = DISHES[r.loadout.dishes[s.slot]].code, p = r.player;
  const w = code.length * 34 + 12, x0 = p.x - w / 2, y0 = p.y - 84;
  ctx.fillStyle = s.smudge > 0 ? '#e3c38f' : '#fff8ec'; ctx.fillRect(x0, y0, w, 44);
  ctx.fillStyle = '#c93f25'; ctx.fillRect(x0, y0, w, 5);
  code.forEach((d, i) => {
    const x = x0 + 6 + i * 34;
    ctx.fillStyle = s.ready || i < s.typed ? '#c93f25' : 'rgba(23,48,66,.09)';
    ctx.fillRect(x, y0 + 9, 30, 30);
    emoji(MOVES[d], x + 15, y0 + 24, 18);
  });
}
