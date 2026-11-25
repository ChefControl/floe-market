// The game's UI kit: what every panel the player presses things in is made of, so they all look, feel and answer the
// keys the same way (the standard is .claude/skills/game-ui/SKILL.md; the look is uiKit.css; ?ui=kit shows it all).
//
// A panel is registered once with `panel(el, …)`: where it sits (a card along the bottom, a dialog in the middle, or the
// whole screen) and its skin (base, casino, fight or cooking). Its buttons are `k-btn` with a kind: `k-main` (the one
// big button, E), `k-plain`, `k-danger` (two taps) and `k-choice` (one of a row; picked is aria-pressed). Buttons in a
// `k-keys` row are numbered 1 to 9, in order. Then, for whichever panel is open:
// - Esc closes it: a card you walked up to stays shut till you step off its pad, or press E on it to open it again.
// - E presses its main button; 1–9 the row buttons; Enter and Space whatever's focused (the browser's own). Holding
//   Shift shows each button's key on it.
// - A dialog or the whole screen pauses the game (`paused`), and says so.
// A panel may have a small "i" in its corner (`info`): a tap shows a few short lines on what it's for.
// Buttons the player can't afford are greyed (`state(b, 'broke')`): a tap on one only shakes the cash.
import './uiKit.css';

export type Place = 'card' | 'dialog' | 'full';
export type Skin = 'base' | 'casino' | 'fight' | 'cooking';

export interface PanelOpts {
  place: Place;
  skin?: Skin;
  /** What Esc does, if it's more than shutting the panel (talking to Gus: he turns back to his mug). */
  close?: () => void;
  /** While this says so, Esc does nothing: something's under way that walking off couldn't stop either (a cry). */
  busy?: () => boolean;
  /** Forced choice: no Esc, no ✕ (the cloud save pick, the stale tab). */
  forced?: boolean;
}

export interface Panel {
  readonly el: HTMLElement;
  readonly opts: PanelOpts;
  /** Shut with Esc: kept closed till the player steps away (`near(false)`) or presses E where they stand. */
  shut: boolean;
  /**
   * For a card you walk up to: whether it should be open, given whether the player's `near` enough to it. It's what
   * `near` says, unless the player shut it with Esc and hasn't stepped away since.
   */
  near(near: boolean): boolean;
}

const panels: Panel[] = [];
/** The cards shut with Esc that the player's still standing at: E opens them again. */
const reopenable = new Set<Panel>();

/** Registers `el` as a panel of the kit: its place and skin go on it, and the keys work on it while it's open. */
export function panel(el: HTMLElement, opts: PanelOpts): Panel {
  el.classList.add('k-panel', `k-${opts.place}`);
  el.dataset.skin = opts.skin ?? 'base';
  if (opts.place !== 'card' && !el.querySelector('.k-paused')) {
    const tag = document.createElement('span');
    tag.className = 'k-paused'; tag.textContent = 'Game paused';
    el.prepend(tag);
  }
  const p: Panel = {
    el, opts, shut: false,
    near(near) {
      if (!near) { this.shut = false; reopenable.delete(this); }
      else if (this.shut) reopenable.add(this);
      return near && !this.shut;
    },
  };
  panels.push(p);
  return p;
}

/** Whether `el` shows: not hidden, nor in anything hidden. */
const shows = (el: HTMLElement) => el.isConnected && !el.closest('[hidden]');

/** Every panel of the kit, open or not (ui.ts keeps the player in sight of whichever's open). */
export const kitPanels = () => panels.map(p => p.el);
/** The open panel the keys go to: a dialog or the whole screen over any card. */
export function topPanel() {
  const open = panels.filter(p => shows(p.el));
  return open.find(p => p.opts.place !== 'card') ?? open[0] ?? null;
}
/** Whether a panel that dims the screen (a dialog, or the whole screen) is open: the game holds still behind it. */
export const paused = () => panels.some(p => p.opts.place !== 'card' && shows(p.el));

/** The panel's main button, if one shows (`k-main`, the first showing). */
export const mainOf = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.k-main')].find(shows) ?? null;
/** The panel's numbered buttons, 1 to 9 in order: those showing in its `k-keys` rows. */
export const numbered = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.k-keys > .k-btn')].filter(shows).slice(0, 9);

/** Shuts `p`, as Esc does: a card till the player steps away (or presses E), anything else at once. */
export function shut(p: Panel) {
  if (p.opts.forced || p.opts.busy?.()) return false;
  if (p.opts.close) p.opts.close();
  else if (p.opts.place === 'card') p.shut = true;
  else p.el.hidden = true;
  return true;
}

// ---------- states ----------
export type State = 'ok' | 'busy' | 'broke' | 'locked';
/**
 * What a button can do now. `busy`: not now (a round's under way), faded. `broke`: the player can't afford it, greyed
 * with its price still there to read; a tap only shakes the cash. `locked`: not open yet, greyed with a 🔒 (and what
 * opens it, in `hint`). `ok`: go ahead.
 */
export function state(b: HTMLButtonElement, s: State, hint = '') {
  b.disabled = s === 'busy';
  if (s === 'broke' || s === 'locked') { b.dataset.state = s; b.setAttribute('aria-disabled', 'true'); }
  else { delete b.dataset.state; b.removeAttribute('aria-disabled'); }
  if (s === 'locked' && hint) b.dataset.hint = hint; else delete b.dataset.hint;
}
/** Whether a tap on `b` should do anything: it's not busy, broke or locked. */
export const usable = (b: HTMLButtonElement) => !b.disabled && !b.dataset.state;

/** The cash in the HUD shakes its head once: there's not enough. */
export function shakeCash() {
  const cash = document.getElementById('cash');
  if (!cash) return;
  cash.classList.remove('nope');
  void cash.offsetWidth; // (so the shake starts over)
  cash.classList.add('nope');
  setTimeout(() => cash.classList.remove('nope'), 500);
}

// a tap on a greyed button goes no further: the cash shakes for one the player can't afford
const blocked = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('.k-btn[data-state]') ?? null;
for (const type of ['pointerdown', 'click'] as const) {
  document.addEventListener(type, e => {
    const b = blocked(e);
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (type === 'click' && b.dataset.state === 'broke') shakeCash();
  }, true);
}

// ---------- the i ----------
/** A panel's "i": a tap shows (or hides) a few short lines on what it's for. */
export interface Info {
  readonly button: HTMLButtonElement;
  readonly box: HTMLElement;
  /** Whether its lines show. */
  readonly open: boolean;
  show(on: boolean): void;
}
/** Each panel's "i", by the panel (Esc shuts its box before the panel). */
const infos = new Map<HTMLElement, Info>();

/**
 * Puts a small "i" in the top corner of panel `el` (a quiet circle in the skin's colours, its tap area the kit's 44px):
 * a tap on it shows `lines` (each ≤8 words) in a small box over the panel's buttons, and a second tap, the box's ✕ or
 * Esc hides them. It's no dialog: nothing pauses, and the panel's keys still work. `about` names it for screen readers
 * ("What Slick Eddie does"). Whoever opens and closes the panel shuts the box with it (casinoKit's `gamePad` does).
 */
export function info(el: HTMLElement, about: string, lines: readonly string[]): Info {
  const box = document.createElement('div');
  box.className = 'k-info-box'; box.id = `${el.id || `k${infos.size}`}Info`; box.hidden = true;
  box.setAttribute('role', 'note'); box.setAttribute('aria-label', about);
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'k-btn k-plain k-x'; x.setAttribute('aria-label', 'Close');
  x.innerHTML = '<span aria-hidden="true">✕</span>';
  box.append(x, ...lines.map(l => Object.assign(document.createElement('p'), { textContent: l })));
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'k-info';
  button.setAttribute('aria-label', about); button.setAttribute('aria-controls', box.id); button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true">i</span>';
  // (after everything else in the panel, so its first line stays its first)
  el.append(box, button);
  el.classList.add('k-has-info');
  const i: Info = {
    button, box,
    get open() { return !box.hidden; },
    show(on) { box.hidden = !on; button.setAttribute('aria-expanded', String(on)); },
  };
  button.addEventListener('click', () => i.show(!i.open));
  x.addEventListener('click', () => { i.show(false); button.focus(); });
  infos.set(el, i);
  return i;
}

// ---------- keys ----------
/** Keys typed into a text box are for it. */
const typing = (e: KeyboardEvent) => !!(e.target as Element | null)?.closest?.('textarea, input:not([type="range"]), select');
/** A digit key's number (by where it is on the keyboard, so any layout), or 0. */
const digit = (e: KeyboardEvent) => { const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code ?? ''); return m ? Number(m[1]) : 0; };

/** Shows the keys on the buttons while Shift is held (and hides them once it's let go, or the window's left). */
const showKeys = (on: boolean) => document.documentElement.classList.toggle('k-keys-on', on);
window.addEventListener('keyup', e => { if (e.key === 'Shift') showKeys(false); });
window.addEventListener('blur', () => showKeys(false));

window.addEventListener('keydown', e => {
  if (e.key === 'Shift') showKeys(true);
  if (e.defaultPrevented || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const p = topPanel();
  if (e.key === 'Escape') {
    // (an "i"'s lines showing go first, and the panel stays)
    const i = p && infos.get(p.el);
    if (i?.open) { i.show(false); e.preventDefault(); return; }
    if (p && shut(p)) e.preventDefault();
    return;
  }
  if (e.code === 'KeyE') {
    if (e.repeat) return;
    if (p) { mainOf(p.el)?.click(); return; }
    // (E where a card was shut with Esc opens it again)
    for (const q of reopenable) { q.shut = false; reopenable.delete(q); }
    return;
  }
  const n = digit(e);
  if (n && p) {
    const b = numbered(p.el)[n - 1];
    // (a chip can be held down on its key, as with a finger, and Undo held clears the stake; anything else goes once)
    if (b && e.repeat && b.dataset.stake === 'undo') {
      b.dispatchEvent(new Event('k-hold', { bubbles: true }));
      e.preventDefault();
    } else if (b && (!e.repeat || b.dataset.stake)) { b.click(); e.preventDefault(); }
  }
});
