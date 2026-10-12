// Mr. Fugu at his desk (stage 3): step up in front of it and he has a word for you, in a bubble over his head, by how
// the ring's doing; step away and come back for the next one. And his fish tank's fish, swimming.
import { Sprite, SpriteMaterial } from 'three';
import { boss, CY, OFFICE, swimTank } from './cellar';
import { decal, drawPad } from './decals';
import { BOSSES, F } from './fight';
import { level } from './layout';
import { player } from './player';
import { canvasTex, FONT, rr } from './render';
import { d2xz } from './util';

/** Where to stand to talk to him: on the rug in front of the visitors' chairs, inside the door. */
export const DESK_PAD = { x: OFFICE.x, z: OFFICE.z + 2.35, r: 0.8 };
const mark = decal(1.3, (c, w, h) => drawPad(c, w, h, '💬'));
mark.mesh.position.set(DESK_PAD.x, CY + 0.035, DESK_PAD.z);
boss.parent!.add(mark.mesh);

/** What he says, by how things stand: a few for now, one each time you step up. */
export function fuguLines(): string[] {
  if (F.boughtOut) return [
    "It's your house now, Chef. I only keep the chair warm.",
    "The fans still ask for me. Tell them I'm on holiday.",
    'No cut, no boss. Just you and the stew.',
  ];
  const next = BOSSES[F.beaten];
  const out = ['Thirty percent of every bowl, Chef. The house always eats first.'];
  if (F.beaten === 0) out.push('Keep the stall full. Hungry fans cheer for the other guy.');
  else out.push("You found my mushrooms. Mushroom bowls pay double. Don't spread it around.");
  out.push(next ? `${next.name} ${next.face} is next. His fans come hungry.` : "Every champion beaten. Maybe you can afford my chair now.");
  out.push(F.tier > 0 ? 'Bigger stands, bigger crowds. I like the sound of that.' : 'Build some stands, Chef. Fans pay better sitting down.');
  return out;
}

// ---------- his bubble ----------
const W = 512, H = 200;
const said = canvasTex(W, H, () => {});
const bubbleMat = new SpriteMaterial({ map: said.tex, depthTest: false, transparent: true, opacity: 0 });
const bubble = new Sprite(bubbleMat);
bubble.scale.set(2.6, 2.6 * H / W, 1); bubble.renderOrder = 6; bubble.visible = false;
boss.parent!.add(bubble);
/** Draws `text` in a white bubble with its tail down, wrapped onto up to three lines. */
function draw(text: string) {
  const c = said.ctx;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#fff'; rr(c, 6, 6, W - 12, H - 40, 36); c.fill();
  c.beginPath(); c.moveTo(W / 2 - 18, H - 36); c.lineTo(W / 2, H - 6); c.lineTo(W / 2 + 18, H - 36); c.fill();
  c.font = `800 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#173042';
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const l = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && c.measureText(l).width < W - 60) lines[lines.length - 1] = l; else lines.push(word);
  }
  const k = Math.min(1, 3 / lines.length), top = (H - 34) / 2 - (lines.length - 1) * 19 * k;
  c.save(); c.translate(W / 2, top); c.scale(k, k);
  lines.forEach((l, i) => c.fillText(l, 0, i * 38));
  c.restore();
  said.tex.needsUpdate = true;
}

let near = false, next = 0, left = 0, shown = '';
const FADE = 0.25;
/** What he's saying now ('' while he's quiet), for tests. */
export const fuguSays = () => shown;

export function updOffice(dt: number) {
  swimTank(dt);
  const here = level.down && d2xz(player.g.position, DESK_PAD) < DESK_PAD.r * DESK_PAD.r;
  if (here && !near) {
    const all = fuguLines();
    shown = all[next % all.length]; next++;
    draw(shown);
    left = 2.2 + shown.length * 0.06;
    bubble.visible = true;
  }
  near = here;
  if (bubble.visible) {
    left -= dt;
    bubbleMat.opacity = Math.max(0, Math.min(1, (2.2 + shown.length * 0.06 - left) / FADE, left / FADE));
    bubble.position.set(boss.position.x, boss.position.y + 2.75, boss.position.z);
    if (left <= 0) { bubble.visible = false; shown = ''; }
  }
  boss.talking = bubble.visible && left > 0.6;
}
