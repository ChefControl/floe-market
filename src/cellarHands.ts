// The player's work down in the cellar (stage 3), by standing in the right places, as upstairs: at the dumbwaiter's
// bins, rice or fish into their arms; at a drying rack or a salt barrel, raw ones in and ready ones out; at a mushroom
// bed, mushrooms; at the pot, ready ones onto the ledge, and the pot cooks full batches while they stand there (a
// cook's too); at the counter, bowls; inside the soup square, bowls out for the fans. What they carry is theirs: the cellar
// (fight.ts) only sees what they hand in or take out. And what each place says while they stand at it.
import { BAR_PAD, BIN_PADS, BINS, COUNTER_PAD, type Ing, machineAt, machinePad, type Pad, POT_PAD, WATCH } from './cellarPlan';
import { CY, updLamps } from './cellar';
import {
  batchBowls, bowlPrice, COUNTER_CAP, PER_BATCH, POT_CAP, F, fillMachine, ICON, inPot, lineRoom, mach, playerAtPot, STALL_CAP, takeBowl, takeReady,
  toLedge, toStall, doneCount,
} from './fight';
import { fly } from './holder';
import { type Kind, newBowl, newCuredFish, newMushroom, newReadyRice, newRice, newFillet } from './items';
import { player } from './player';
import { scene, sun } from './render';
import { barAt, counterAt, ledgeAt, machineSpot } from './ringKitchen';
import { pick, put } from './sfx';
import type { TipContent } from './ui';
import { d2xz, V, type XZ } from './util';

/** What a raw ingredient is in the player's arms, and a ready one. */
const RAW: Record<'rice' | 'fish', Kind> = { rice: 'rice', fish: 'fish' };
export const READY: Record<Ing, Kind> = { rice: 'rrice', fish: 'cfish', mush: 'mush' };
const MAKE_READY = { rice: newReadyRice, fish: newCuredFish, mush: newMushroom };
/** Seconds between one thing and the next, picked up or put down. */
const STEP = 0.07;
const at = (p: XZ, pad: Pad) => d2xz(p, pad) < pad.r * pad.r;
/** The machine whose pad the player's standing on, if any (the nearest, where pads touch; on the racks' or the
 *  barrels' one spot, the nearest of the row). */
function machineHere(p: XZ): { k: Ing; i: number } | null {
  let best: { k: Ing; i: number } | null = null, bd = Infinity;
  for (const k of inPot()) {
    const n = F.lines[k].n;
    for (let i = 0; i < n; i++) {
      const pad = machinePad(k, i, n), d = d2xz(p, pad);
      if (d < pad.r * pad.r && d < bd) { bd = d; best = { k, i }; }
    }
  }
  return best;
}
/** How far along the grow room's beds the player reaches from one's pad: its neighbours either side, so nobody has to
 *  hunt for the one that's ready. (The racks and barrels are all in reach from their one spot.) */
const REACH = 1.6;
/** The machines in reach of the player on `here`'s pad, nearest first. */
function machinesNear(p: XZ, here: { k: Ing; i: number }) {
  const { k } = here, n = F.lines[k].n, out: number[] = [];
  for (let i = 0; i < n; i++) if (k !== 'mush' || d2xz(p, machinePad(k, i, n)) < REACH * REACH) out.push(i);
  return out.sort((a, b) => d2xz(p, machineAt(k, a)) - d2xz(p, machineAt(k, b)));
}
/** Hands something from the player's arms to `to`, where it's gone (into a machine, onto the ledge or the soup bar). */
function handIn(kind: Kind, to: () => ReturnType<typeof V>) {
  const m = player.back.takeKind(kind)!;
  fly(m, to, 0.25, 0.6, () => scene.remove(m));
  put();
}

/** The cellar's work, every frame the player's down there. */
export function cellarWork(p: XZ, dt: number) {
  // (Low's four lamps, round where the camera looks)
  updLamps(sun.target.position, dt);
  player.tPick -= dt; player.tDrop -= dt;
  const back = player.back;
  // the dumbwaiter's plates: rice or fish, only as much as the racks (or the barrels) have room for
  for (const k of ['rice', 'fish'] as const) {
    if (!at(p, BIN_PADS[k])) continue;
    // (counting what's still flying into their arms)
    while (player.tPick <= 0 && back.hasRoom() && back.all().filter(m => m.userData.kind === RAW[k]).length < lineRoom(k)) {
      player.tPick += STEP;
      const m = k === 'rice' ? newRice() : newFillet();
      m.position.set(BINS[k].x, CY + 0.7, BINS[k].z);
      back.receive(m, 0.22, 0.7);
      pick();
    }
  }
  // a machine (and its neighbours in reach): ready ones out (with full arms, swapped one for one for raw ones going in),
  // then raw ones in, nearest first
  const here = machineHere(p);
  if (here) {
    const { k } = here;
    for (const i of machinesNear(p, here)) {
      const m = F.lines[k].m[i];
      while (player.tPick <= 0 && m && doneCount(k, m) > 0) {
        const swap = !back.hasRoom();
        if (swap && (k === 'mush' || !back.count(RAW[k as 'rice' | 'fish']))) break;
        takeReady(k, i);
        if (swap && fillMachine(k, i)) handIn(RAW[k as 'rice' | 'fish'], () => machineSpot(k, i));
        player.tPick += STEP;
        const r = MAKE_READY[k](); r.position.copy(machineSpot(k, i));
        back.receive(r, 0.22, 0.7);
        pick();
      }
    }
    if (k !== 'mush') {
      for (const i of machinesNear(p, here)) {
        while (player.tDrop <= 0 && back.count(RAW[k]) && fillMachine(k, i)) { player.tDrop += STEP; handIn(RAW[k], () => machineSpot(k, i)); }
      }
    }
  }
  // the pot: ready ones onto the ledge, and it cooks while the player's there
  if (at(p, POT_PAD)) {
    for (const k of inPot()) {
      while (player.tDrop <= 0 && back.count(READY[k]) && toLedge(k)) { player.tDrop += STEP; handIn(READY[k], () => ledgeAt(k)); }
    }
    playerAtPot(dt);
  }
  // the counter: bowls (till the bowl line's in, in its place)
  if (!F.slide && at(p, COUNTER_PAD)) {
    while (player.tPick <= 0 && back.hasRoom() && F.counter.length) {
      player.tPick += STEP;
      const m = newBowl(takeBowl()!); m.position.copy(counterAt());
      back.receive(m, 0.22, 0.7);
      pick();
    }
  }
  // the soup square: bowls out in the counters' holes for the fans, each flying to its own
  if (at(p, BAR_PAD)) {
    while (player.tDrop <= 0 && back.count('bowl') && F.stall.length < STALL_CAP) {
      const m = back.items.find(x => x.userData.kind === 'bowl');
      if (!m || !toStall(!!m.userData.mush)) break;
      player.tDrop += STEP;
      const hole = barAt(F.stall.length - 1);
      handIn('bowl', () => hole);
    }
  }
  if (player.tPick < 0) player.tPick = 0;
  if (player.tDrop < 0) player.tDrop = 0;
}

/** Climbing up the ladder: what the player has in their arms stays in the cellar. Raw rice and fish go back down the
 *  bins, ready ones onto the pot's ledge, and bowls back on the counter (whatever there's no room for is gone). */
export function stowCarried() {
  for (const m of player.back.items.splice(0)) {
    const k = m.userData.kind as Kind;
    if (k === 'bowl') { if (F.counter.length < COUNTER_CAP) F.counter.unshift(!!m.userData.mush); }
    else {
      const ing = (Object.keys(READY) as Ing[]).find(i => READY[i] === k);
      if (ing) toLedge(ing);
    }
    scene.remove(m);
  }
}

const chips = (v: number) => (v < 10 ? v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '') : Math.round(v).toLocaleString('en-US'));
/** What's said about where the player's standing in the cellar, if it's somewhere. */
export function cellarTip(p: XZ): TipContent | null {
  // (a title and one line of icons and numbers: what's there, and where it goes)
  if (at(p, BIN_PADS.rice)) {
    const n = lineRoom('rice');
    return { name: 'Rice 🌾', desc: n ? `→ the drying racks · room for ${n}` : 'The drying racks are full' };
  }
  if (at(p, BIN_PADS.fish)) {
    const n = lineRoom('fish');
    return { name: 'Fish 🐟', desc: n ? `→ the salt barrels · room for ${n}` : 'The salt barrels are full' };
  }
  const here = machineHere(p);
  if (here) {
    const { k, i } = here, M = mach(k), m = F.lines[k].m[i];
    const ready = m ? doneCount(k, m) : 0, going = k === 'mush' ? 0 : (m?.items.length ?? 0) - ready;
    return { name: `${M.name} ${i + 1} ${ICON[k]}`, desc: `${ready} ready${k === 'mush' ? '' : ` · ${going} in`} · ${M.cap} per ${M.time} s` };
  }
  if (at(p, POT_PAD)) {
    const ledge = inPot().map(k => `${ICON[k]} ${F.pantry[k]}/${PER_BATCH}`).join(' · ');
    const show = F.bonus.t > 0 ? ` · 🔥 +${F.bonus.pct}%` : '';
    return { name: 'The pot · stand here to cook', desc: `${ledge} → 🍲 ${batchBowls()}${show} · ${F.pot.length}/${POT_CAP} in the pot` };
  }
  if (!F.slide && at(p, COUNTER_PAD)) return { name: 'Bowls 🍲', desc: `${F.counter.length}/${COUNTER_CAP} → the soup bar` };
  if (at(p, BAR_PAD)) {
    return { name: 'The soup bar', desc: `${F.stall.length}/${STALL_CAP} out · ${F.queue.length} waiting · a bowl pays 🐡 ${chips(bowlPrice(F.beaten >= 1))}` };
  }
  if (at(p, WATCH)) return { name: 'The watch spot 👁️', desc: 'Watch the fight up close' };
  return null;
}
