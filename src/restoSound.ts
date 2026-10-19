// Mama Moray's, heard (stage 3), while the player's in it (its hall, its dining wing or its restroom). Shut, a wreck
// or being cleared, it's all but silent: water dripping somewhere by the counter, and now and then the old boards
// creaking. Open, the drip's gone and its diners are heard: the casino yacht's dining room recording (roomTone.ts),
// looped, louder the busier it's been. Fetched the first time the player walks in.
import { ac, buses, noise, prefs, rnd, tone } from './audio';
import { CY } from './cellar';
import { level, LOO, RESTO, WING } from './layout';
import { player } from './player';
import { loopable } from './roomTone';
import diningUrl from './sounds/dining.mp3';

/** The diners at their loudest, and where the drip drips and the boards creak. */
const DINERS = 0.11, DRIP = { x: -1.6, y: CY + 0.1, z: 10.9 }, CREAK = { x: 6.2, y: CY + 0.2, z: 14.2 };
const inside = (p: { x: number; z: number }) =>
  [RESTO, WING, LOO].some(r => p.x > r.x0 - 0.2 && p.x < r.x1 + 0.2 && p.z > r.z0 - 0.2 && p.z < r.z1 + 0.2);

let diners: { g: GainNode; src: AudioBufferSourceNode } | null = null, loading = false, dripT = 1, creakT = 5;

function load() {
  loading = true;
  fetch(diningUrl).then(r => r.arrayBuffer()).then(b => ac!.decodeAudioData(b)).then(buf => {
    const c = ac!, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = loopable(buf); src.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(buses.amb);
    src.start(0, rnd() * buf.duration);
    diners = { g, src };
  }).catch(() => { /* offline: a quiet restaurant */ });
}

/** Every frame, from resto.ts: `open`, whether Mama Moray's is, and `busy`, how busy it's been (0 to 1). */
export function updRestoSound(dt: number, open: boolean, busy: number) {
  if (!ac || prefs.mute.amb) return;
  const here = level.down && inside(player.g.position);
  if (here && !loading) load();
  diners?.g.gain.setTargetAtTime(here && open ? DINERS * (0.35 + 0.65 * busy) : 0, ac.currentTime, 0.6);
  if (!here || open) return;
  // shut: a drip, slow and uneven; and the boards, once in a while
  if ((dripT -= dt) <= 0) {
    dripT = 1.4 + rnd() * 2.6;
    tone({ f: 1500 + rnd() * 300, f2: 650, a: 0.005, d: 0.08, v: 0.05, at: DRIP });
    tone({ t: 0.05, f: 900, f2: 500, a: 0.005, d: 0.06, v: 0.02, at: DRIP });
  }
  if ((creakT -= dt) <= 0) {
    creakT = 7 + rnd() * 9;
    noise({ f: 340, f2: 240, q: 7, a: 0.12, d: 0.55, v: 0.035, at: CREAK });
    tone({ f: 95, f2: 72, a: 0.1, d: 0.5, v: 0.025, at: CREAK, vib: [11, 6] });
  }
}
