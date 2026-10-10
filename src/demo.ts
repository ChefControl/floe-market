// The demo build's tool panel (`vite build --mode demo`), for trying the graphics on a phone: the frame rate and how
// much is drawn, Low or High, any season, a stage 1 or stage 2 game to jump into, and buttons that set off each effect
// beside you. The game itself never loads this (main.ts).
import { chipsFx, coinsFx, glint, splashFx, unlockFx } from './fx';
import { choose, gfx } from './graphics';
import { player } from './player';
import { renderer } from './render';
import { replaceSave } from './save';
import { setSeason, SEASONS, SEASON_INFO } from './season';
import { tiles } from './unlocks';
import { V } from './util';

const css = `
#demo{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:60;
  font:600 13px/1.3 "Baloo 2",system-ui,sans-serif;color:#1B2430}
#demo>button{width:44px;height:44px;border-radius:50%;border:0;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.18);font-size:20px}
#demo .box{position:absolute;bottom:52px;left:0;width:min(300px,calc(100vw - 16px));background:#fff;border-radius:16px;
  padding:10px 12px;box-shadow:0 4px 0 rgba(0,0,0,.18);display:grid;gap:8px}
#demo .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#demo .row b{width:62px}
#demo .row button{border:0;border-radius:10px;padding:7px 10px;background:#E8F1F6;font:inherit;color:inherit}
#demo .row button.on{background:#1E8FC0;color:#fff}
#demo .stats{font-variant-numeric:tabular-nums;color:#5A6B78}`;

const el = document.createElement('div');
el.id = 'demo';
el.innerHTML = `<style>${css}</style><button type="button" aria-label="Demo tools">🛠</button>
<div class="box" hidden>
  <div class="stats" id="demoStats">…</div>
  <div class="row" id="demoGfx"><b>Graphics</b><button data-q="low">Low</button><button data-q="high">High</button></div>
  <div class="row" id="demoSeason"><b>Season</b>${SEASONS.map((s, i) => `<button data-s="${i}">${SEASON_INFO[s].name}</button>`).join('')}</div>
  <div class="row" id="demoFx"><b>Effects</b><button data-fx="splash">Splash</button><button data-fx="chips">Chips</button>
    <button data-fx="coins">Coins</button><button data-fx="glint">Glint</button><button data-fx="unlock">Sparkles</button></div>
  <div class="row" id="demoGame"><b>Game</b><button data-g="1">Stage 1</button><button data-g="2">Stage 2</button></div>
</div>`;
document.body.appendChild(el);
const box = el.querySelector<HTMLElement>('.box')!, stats = el.querySelector<HTMLElement>('#demoStats')!;
el.querySelector('#demo>button')!.addEventListener('click', () => { box.hidden = !box.hidden; });

function marks() {
  for (const b of el.querySelectorAll<HTMLButtonElement>('#demoGfx button')) b.classList.toggle('on', b.dataset.q === gfx.quality);
}
el.querySelector('#demoGfx')!.addEventListener('click', e => {
  const q = (e.target as HTMLElement).dataset.q;
  if (q === 'low' || q === 'high') { choose(q); marks(); }
});
el.querySelector('#demoSeason')!.addEventListener('click', e => {
  const s = (e.target as HTMLElement).dataset.s;
  if (s !== undefined) setSeason(+s);
});
el.querySelector('#demoFx')!.addEventListener('click', e => {
  const fx = (e.target as HTMLElement).dataset.fx, p = player.g.position;
  // in front of the player, a step toward the camera's left, so it isn't hidden behind them
  const at = V(p.x - 0.8, p.y + 0.9, p.z + 0.6);
  if (fx === 'splash') splashFx(at, p.y + 0.1);
  if (fx === 'chips') chipsFx(at);
  if (fx === 'coins') coinsFx(at, 3);
  if (fx === 'glint') glint(at);
  if (fx === 'unlock') unlockFx(p, 1.1, p.y + 0.05);
});
el.querySelector('#demoGame')!.addEventListener('click', e => {
  const g = (e.target as HTMLElement).dataset.g;
  if (!g) return;
  const done = (t: { id: string; stage: number }) => g === '2' || (t.stage === 1 && t.id !== 'sushi');
  replaceSave(JSON.stringify({
    v: 4, savedAt: Date.now(), money: g === '2' ? 300_000 : 9_000, best: 300_000,
    tiles: tiles.map(t => ({ id: t.id, paid: done(t) ? t.cost : 0, done: done(t), open: true })),
    mods: g === '2' ? { fillets: 6, marketing: 8, training: 8, specials: 8, promo: 8, crew: 8 } : { fillets: 4, marketing: 5, crew: 3 },
    reviews: Array(20).fill(5), pile: 20, back: 0, backRice: 0, c1: 5, c1c: 0, c2: 4, c2c: 0, fish: 8, rice: 8, plates: 6,
    cash: 0, boxes: 2, tcash: 0, field: 6, season: 0, seasonT: 30, presents: 2, presentPaid: 0,
    learnt: ['fish', 'pick', 'sell', 'cash', 'buy', 'shop', 'harpoon', 'stars'],
  }));
  location.reload();
});

// the frame rate over the last second, and what the last frame drew
const draw = renderer.render.bind(renderer);
let frames = 0, since = performance.now(), calls = 0, tris = 0;
renderer.render = (s, c) => {
  draw(s, c);
  calls = renderer.info.render.calls; tris = renderer.info.render.triangles;
  frames++;
  const now = performance.now();
  if (now - since >= 1000) {
    stats.textContent = `${Math.round(frames * 1000 / (now - since))} fps · ${calls} draw calls · ${Math.round(tris / 1000)}k triangles · ${gfx.picked ? gfx.quality : 'auto ' + gfx.quality}`;
    frames = 0; since = now; marks();
  }
};
marks();
