// ?ui=kit (dev and demo builds only, main.ts): every piece of the UI kit (uiKit.ts) in each of its four skins, over the
// game, so the standard can be seen at a glance rather than read about. The cards here sit still in the page; the
// "Open a dialog" button opens a real one of the kit, which pauses the game behind it.
import { panel, state, type Skin } from './uiKit';

const SKINS: { skin: Skin; name: string; main: string; choices: string[]; plain: string[] }[] = [
  { skin: 'base', name: 'Base', main: 'Buy · $120', choices: ['Body', 'Face', 'Hair'], plain: ['Undo', 'Later'] },
  { skin: 'casino', name: 'Casino', main: 'Spin · $25 on Red', choices: ['$5', '$25', '$100'], plain: ['Hit', 'Stand'] },
  { skin: 'fight', name: 'Fight', main: 'Ring the gong', choices: ['10%', '20%', '30%'], plain: ['Watch', 'Leave'] },
  { skin: 'cooking', name: 'Cooking', main: 'Cook', choices: ['Fish', 'Rice', 'Leeks'], plain: ['Stir', 'Taste'] },
];

/** The rules, each a line: what the skill (.claude/skills/game-ui/SKILL.md) says in full. */
const RULES = [
  'One main button a panel: E presses it',
  'Rows are numbered 1–9, left to right',
  'Hold Shift to see the keys on the buttons',
  'Esc closes; walking off closes walk-up cards',
  "Can't afford: grey, price kept, tap shakes cash",
  'Busy: faded. Locked: 🔒 and what opens it',
  'Danger takes two taps',
  'Dims the screen? The game pauses',
  'Captions ≤8 words; numbers go on buttons',
  'Touch: every button at least 44px',
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const btn = (cls: string, text: string) => { const b = el('button', `k-btn ${cls}`, text); b.type = 'button'; return b; };

/** A card in `skin`, as a walk-up panel would be: a headline, a row to pick from, plain buttons, the states, the main. */
function card(s: (typeof SKINS)[number]) {
  const c = el('div', 'k-panel k-card k-demo');
  c.dataset.skin = s.skin;
  c.append(el('p', 'k-title', s.name), el('p', 'k-msg', 'Pick one and go'));
  const pick = el('div', 'k-row k-keys');
  s.choices.forEach((t, i) => {
    const b = btn('k-choice', t);
    b.setAttribute('aria-pressed', String(i === 1));
    b.addEventListener('click', () => pick.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', String(o === b))));
    pick.append(b);
  });
  const plain = el('div', 'k-row k-keys');
  for (const t of s.plain) plain.append(btn('k-plain', t));
  // the states, side by side: ok, busy (faded), broke (greyed, the price kept), locked (🔒 and what opens it)
  const states = el('div', 'k-row');
  const ok = btn('k-plain', '🐡 10'), busy = btn('k-plain', '🐡 10'), broke = btn('k-plain', '🐡 400'), locked = btn('k-plain', 'Grill');
  state(busy, 'busy'); state(broke, 'broke'); state(locked, 'locked', 'Beat Dobu');
  states.append(ok, busy, broke, locked);
  // the danger button: the first tap arms it, the second does it
  const danger = btn('k-danger', 'Sell all');
  let armT = 0;
  danger.addEventListener('click', () => {
    if (danger.getAttribute('aria-pressed') !== 'true') {
      danger.setAttribute('aria-pressed', 'true'); danger.textContent = 'Tap again to sell';
      armT = window.setTimeout(() => { danger.removeAttribute('aria-pressed'); danger.textContent = 'Sell all'; }, 2500);
      return;
    }
    clearTimeout(armT); danger.removeAttribute('aria-pressed'); danger.textContent = 'Sold';
  });
  const main = btn('k-main', s.main);
  c.append(pick, plain, el('p', 'k-cap', 'Busy · broke · locked'), states, danger, main);
  return c;
}

/** A real dialog of the kit in `skin`: it pauses the game, ✕ or Esc closes it. */
function dialog(skin: Skin) {
  const d = el('div');
  d.hidden = true;
  const sheet = el('div', 'k-sheet');
  const x = btn('k-plain k-x', '✕');
  x.setAttribute('aria-label', 'Close');
  x.addEventListener('click', () => { d.hidden = true; });
  const ok = btn('k-main', 'Done');
  ok.addEventListener('click', () => { d.hidden = true; });
  sheet.append(x, el('p', 'k-title', 'A dialog'), el('p', 'k-cap', 'The game waits behind it'), ok);
  d.append(sheet);
  d.addEventListener('click', e => { if (e.target === d) d.hidden = true; });
  document.body.append(d);
  panel(d, { place: 'dialog', skin });
  return d;
}

const css = `
#kitShow.k-full{ position:fixed; inset:0; z-index:2; display:block; overflow-y:auto; touch-action:pan-y; user-select:text; -webkit-user-select:text;
  background:var(--bg); padding:calc(env(safe-area-inset-top,0px) + 250px) 16px 40px; box-sizing:border-box; }
#kitShow h1{ margin:0 0 4px; font-size:28px; }
#kitShow .lede{ margin:0 0 18px; font-weight:600; opacity:.8; }
#kitShow ul{ margin:0 0 22px; padding-left:20px; font-weight:700; line-height:1.5; }
#kitShow .grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:28px 20px; align-items:start; }
#kitShow .k-demo{ position:relative; left:auto; bottom:auto; right:auto; transform:none; width:100%; max-height:none; z-index:auto; }
#kitShow .open{ margin-top:10px; }
#kitShow > .k-paused{ position:fixed; left:auto; right:64px; top:calc(env(safe-area-inset-top,0px) + 16px); }
`;

const page = el('section');
page.id = 'kitShow';
page.setAttribute('aria-label', 'UI kit');
const style = el('style'); style.textContent = css;
const rules = el('ul');
for (const r of RULES) rules.append(el('li', '', r));
const grid = el('div', 'grid');
for (const s of SKINS) {
  const col = el('div');
  const d = dialog(s.skin);
  const open = btn('k-plain open', `Open a ${s.name.toLowerCase()} dialog`);
  open.addEventListener('click', () => { d.hidden = false; d.querySelector<HTMLButtonElement>('.k-main')?.focus(); });
  // (the opener's in a plain panel of the skin, so it wears it)
  const wrap = el('div', 'k-panel'); wrap.dataset.skin = s.skin; wrap.append(open);
  col.append(card(s), wrap);
  grid.append(col);
}
page.append(style, el('h1', '', 'UI kit'), el('p', 'lede', 'Every piece, in every skin. Hold Shift to see the keys.'), rules, grid);
// (the HUD stays over it, top left: a tap on a greyed button shakes the cash there, as in the game)
document.body.append(page);
// (the page itself is the whole screen: the game holds still behind it, and Esc leaves it be)
panel(page, { place: 'full', forced: true });
