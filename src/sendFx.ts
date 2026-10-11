// The moment a report is sent (report.ts), over the game: for an idea, a light bulb that flickers and lights up bright
// with rays, and a chime; for a bug, a fly swatter that comes down on a scurrying bug with a swish and a smack, and a
// splat. Each says so underneath ("Bright idea!", "Bug squashed!"), then fades. The drawings are inline SVG in the
// game's colours, so they look the same on every phone; the moves are CSS (index.html), and for players who'd rather
// less motion they just fade in and out.
import { player } from './player';
import { chime, chop, swish } from './sfx';

const BULB = `<svg viewBox="0 0 160 170" aria-hidden="true">
  <g class="rays">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="80" y1="6" x2="80" y2="-14" transform="rotate(${a} 80 66)"/>`).join('')}</g>
  <circle class="glow" cx="80" cy="66" r="62"/>
  <path class="glass" d="M80 18a46 46 0 0 1 46 46c0 18-10 28-18 38-5 6-6 12-6 18H58c0-6-1-12-6-18-8-10-18-20-18-38a46 46 0 0 1 46-46z"/>
  <path class="filament" d="M68 118V94l6-10 6 10 6-10 6 10v24"/>
  <rect class="base" x="58" y="122" width="44" height="10" rx="3"/><rect class="base" x="60" y="134" width="40" height="9" rx="3"/>
  <rect class="tip" x="66" y="145" width="28" height="9" rx="4"/>
</svg>`;

const BUG = `<svg viewBox="0 0 160 170" aria-hidden="true">
  <g class="burst">${[0, 40, 80, 120, 160, 200, 240, 280, 320].map(a => `<line x1="80" y1="70" x2="80" y2="56" transform="rotate(${a} 80 118)"/>`).join('')}</g>
  <path class="splat" d="M80 96c8-14 14 2 22-6s14 10 6 16 12 10 2 16-2 14-12 10-8 12-18 4-16 4-14-8-14-6-6-14 6-12-6-12 8-12 6-10 18-6z"/>
  <g class="critter">
    <g class="legs"><path d="M64 108l-16-8M64 118l-18 2M66 128l-14 12M96 108l16-8M96 118l18 2M94 128l14 12"/></g>
    <path class="antennae" d="M74 92c-4-10-10-14-16-14M86 92c4-10 10-14 16-14"/>
    <ellipse class="body" cx="80" cy="120" rx="18" ry="22"/>
    <path class="shell" d="M80 100v42"/>
    <circle class="head" cx="80" cy="96" r="10"/>
    <circle class="eye" cx="76" cy="94" r="2.6"/><circle class="eye" cx="84" cy="94" r="2.6"/>
  </g>
  <g class="swatter">
    <rect class="handle" x="76" y="-40" width="9" height="96" rx="4"/>
    <rect class="pad" x="48" y="90" width="64" height="58" rx="12"/>
    <path class="mesh" d="M61 90v58M74 90v58M87 90v58M100 90v58M48 104h64M48 119h64M48 134h64"/>
    <rect class="neck" x="72" y="52" width="17" height="42" rx="6"/>
  </g>
</svg>`;

const box = document.getElementById('sendFx')!;
let done: ReturnType<typeof setTimeout> | undefined;
/** How long it plays, in ms (the CSS keyframes run as long). */
export const FX_MS = 1700;

/** Plays the moment for a report just sent. */
export function celebrate(kind: 'bug' | 'idea') {
  clearTimeout(done);
  box.className = '';
  box.innerHTML = (kind === 'idea' ? BULB : BUG) + `<b>${kind === 'idea' ? 'Bright idea!' : 'Bug squashed!'}</b>`;
  void box.offsetWidth; // start the animation over, if one was still playing
  box.className = kind;
  box.hidden = false;
  const at = player.g.position;
  if (kind === 'idea') setTimeout(chime, 520);
  else { setTimeout(() => swish(at), 620); setTimeout(() => chop(at, 2), 900); }
  done = setTimeout(() => { box.hidden = true; box.className = ''; box.innerHTML = ''; }, FX_MS);
}
