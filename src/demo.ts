// The demo build's tool panel (`vite build --mode demo`), for trying the game on a phone: the frame rate and how much
// is drawn, Low or High, a stage 1, 2 or 3 game to jump into (stage 3 with as many of its bosses beaten as you like,
// and the cellar as won or all bought), and money to spend. The game itself never loads this (main.ts).
import { CHIP, BOSSES } from './fight';
import { DEMO, marketSave } from './fuguDemo';
import { choose, gfx } from './graphics';
import { level } from './layout';
import { renderer } from './render';
import { replaceSave } from './save';
import { addMoney } from './wallet';

const css = `
#demo{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:60;
  font:600 13px/1.3 "Baloo 2",system-ui,sans-serif;color:#1B2430}
#demo>button{width:44px;height:44px;border-radius:50%;border:0;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.18);font-size:20px}
#demo .box{position:absolute;bottom:52px;left:0;width:min(300px,calc(100vw - 16px));background:#fff;border-radius:16px;
  padding:10px 12px;box-shadow:0 4px 0 rgba(0,0,0,.18);display:grid;gap:8px}
#demo .box[hidden], #demo [hidden]{display:none}
#demo .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#demo .row b{width:62px}
#demo .row button{border:0;border-radius:10px;padding:7px 10px;background:#E8F1F6;font:inherit;color:inherit}
#demo .row button.on{background:#1E8FC0;color:#fff}
#demo .sub{border-top:1px solid #E8F1F6;padding-top:6px;color:#5A6B78}
#demo .stats{font-variant-numeric:tabular-nums;color:#5A6B78}`;

/** What this visit was opened as (fuguDemo.ts reads the same address): a stage, and in the cellar, how far in. */
const q = new URLSearchParams(location.search);
const now = { stage: q.has('cellar') ? 3 : q.get('stage') === '1' ? 1 : 2, beaten: Math.max(0, Math.floor(Number(q.get('beaten')) || 0)), full: q.has('full') };
/** Money a button adds, as cash up top and in Fugu Chips down in the cellar. */
const GIFTS = [100_000, 1_000_000];

const el = document.createElement('div');
el.id = 'demo';
el.innerHTML = `<style>${css}</style><button type="button" aria-label="Demo tools">🛠</button>
<div class="box" hidden>
  <div class="stats" id="demoStats">…</div>
  <div class="row" id="demoGfx"><b>Graphics</b><button data-q="low">Low</button><button data-q="high">High</button></div>
  <div class="row" id="demoGame"><b>Game</b><button data-g="1">Stage 1</button><button data-g="2">Stage 2</button>
    <button data-g="3" ${DEMO ? '' : 'hidden'}>Stage 3</button></div>
  <div class="sub" ${DEMO ? '' : 'hidden'}>Stage 3</div>
  <div class="row" id="demoBeaten" ${DEMO ? '' : 'hidden'}><b>Beaten</b><button data-b="0">0</button>
    ${BOSSES.map((b, i) => `<button data-b="${i + 1}" title="${b.name}">${i + 1} ${b.face}</button>`).join('')}</div>
  <div class="row" id="demoKit" ${DEMO ? '' : 'hidden'}><b>Cellar</b><button data-f="0">As won</button><button data-f="1">All bought</button></div>
  <div class="row" id="demoMoney"><b>Money</b>${GIFTS.map(m => `<button data-m="${m}"></button>`).join('')}</div>
</div>`;
document.body.appendChild(el);
const box = el.querySelector<HTMLElement>('.box')!, stats = el.querySelector<HTMLElement>('#demoStats')!;
el.querySelector('#demo>button')!.addEventListener('click', () => { box.hidden = !box.hidden; });

/** Lights the buttons for what's on now, and words the money ones for where the player is. */
function marks() {
  const on = (sel: string, k: string, v: string) => {
    for (const b of el.querySelectorAll<HTMLButtonElement>(`${sel} button`)) b.classList.toggle('on', b.dataset[k] === v);
  };
  on('#demoGfx', 'q', gfx.quality);
  on('#demoGame', 'g', String(now.stage));
  on('#demoBeaten', 'b', now.stage === 3 ? String(now.beaten) : '');
  on('#demoKit', 'f', now.stage === 3 ? (now.full ? '1' : '0') : '');
  for (const b of el.querySelectorAll<HTMLButtonElement>('#demoMoney button')) {
    const m = Number(b.dataset.m);
    b.textContent = level.down ? `+${(m / CHIP).toLocaleString('en-US')} chips` : `+$${m >= 1e6 ? m / 1e6 + 'M' : m / 1e3 + 'k'}`;
  }
}
el.querySelector('#demoGfx')!.addEventListener('click', e => {
  const q = (e.target as HTMLElement).dataset.q;
  if (q === 'low' || q === 'high') { choose(q); marks(); }
});

/** Starts over in stage 3's cellar with `beaten` of its bosses beaten, as won or with all of it bought. */
const toCellar = (beaten: number, full: boolean) => {
  location.search = `?stage3=on&cellar&beaten=${beaten}${full ? '&full' : ''}`;
};
el.querySelector('#demoGame')!.addEventListener('click', e => {
  const g = (e.target as HTMLElement).closest('button')?.dataset.g;
  if (g === '3') return toCellar(0, false);
  if (g !== '1' && g !== '2') return;
  // (the playtest build writes its own game each time it loads, from the address; any other demo build keeps this one)
  if (DEMO) { location.search = g === '1' ? '?stage=1' : ''; return; }
  replaceSave(marketSave(+g as 1 | 2));
  location.reload();
});
el.querySelector('#demoBeaten')!.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button')?.dataset.b;
  if (b !== undefined) toCellar(+b, now.stage === 3 && now.full);
});
el.querySelector('#demoKit')!.addEventListener('click', e => {
  const f = (e.target as HTMLElement).closest('button')?.dataset.f;
  if (f !== undefined) toCellar(now.stage === 3 ? now.beaten : 0, f === '1');
});
el.querySelector('#demoMoney')!.addEventListener('click', e => {
  const m = Number((e.target as HTMLElement).closest('button')?.dataset.m);
  if (m > 0) addMoney(m);
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
