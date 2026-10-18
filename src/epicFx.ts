// The epic's screen (stage 3): a perfect slam's finisher (finishers/) played like an anime's big moment, over the
// picture from the watch spot: speed lines rushing in on the middle, a white (or black) flash, the impact frame (the
// picture inverted for a beat), and the move's name slammed across it. Only while the camera's on the ring (gong.ts
// says how far); with less motion asked for, just the words.
import { canvas } from './render';

/** How far the camera's on the ring, 0 to 1 (gong.ts sets it). */
export const epicFx = { watch: 0 };
const el = document.getElementById('epic');
const lines = el?.querySelector<HTMLElement>('.lines'), flash = el?.querySelector<HTMLElement>('.flash'), words = el?.querySelector<HTMLElement>('.words');
const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: false };
/** What's on: the lines (how strong, for how long), the flash, the impact frame, the words. */
const S = { lines: 0, linesT: 0, flash: 0, black: false, impact: 0, text: '', textT: 0, textFor: 0, spin: 0 };

export function epicScreen(o: { lines?: number; flash?: 'white' | 'black'; impact?: boolean; text?: string; for: number }) {
  if (o.lines !== undefined) { S.lines = o.lines; S.linesT = o.for; }
  if (o.flash) { S.flash = 1; S.black = o.flash === 'black'; }
  if (o.impact) S.impact = Math.max(S.impact, Math.min(0.12, o.for));
  if (o.text) {
    S.text = o.text; S.textT = 0; S.textFor = o.for;
    if (words) { words.textContent = o.text; words.classList.remove('in'); void words.offsetWidth; words.classList.add('in'); }
  }
}
/** Clears it all (the result's over, or cut short). */
export function epicOff() {
  S.lines = S.linesT = S.flash = S.impact = S.textFor = 0; S.text = '';
  if (words) words.classList.remove('in');
  canvas.style.filter = '';
}
export function updEpic(dt: number) {
  if (!el) return;
  const w = epicFx.watch, calm = lessMotion.matches;
  S.linesT = Math.max(0, S.linesT - dt);
  const ln = S.linesT > 0 ? S.lines * Math.min(1, S.linesT * 4) : 0;
  S.flash = Math.max(0, S.flash - dt * 5);
  S.impact = Math.max(0, S.impact - dt);
  S.textT += dt;
  const on = w > 0.5 && (ln > 0 || S.flash > 0 || S.impact > 0 || S.textT < S.textFor);
  el.hidden = !on;
  canvas.style.filter = on && !calm && S.impact > 0 ? 'invert(1) contrast(1.7) saturate(0)' : '';
  if (!on) return;
  // (the lines flicker: a new turn of them every frame)
  S.spin = (S.spin + 7.3) % 360;
  if (lines) { lines.style.opacity = calm ? '0' : String(ln * w); lines.style.transform = `rotate(${S.spin}deg)`; }
  if (flash) { flash.style.opacity = calm ? '0' : String(S.flash * 0.9 * w); flash.style.background = S.black ? '#000' : '#fff'; }
  if (words) words.style.opacity = S.textT < S.textFor ? String(Math.min(1, (S.textFor - S.textT) * 3)) : '0';
}
