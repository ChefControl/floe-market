// The player's sound settings, per device: how loud each kind of sound is and whether it's muted (the settings menu's
// sliders, settings.ts). Kept apart from the sound engine (audio.ts), which comes with the game, so the studio intro
// (introSound.ts) can follow them before the game has loaded.

export type Bus = 'sfx' | 'amb' | 'music';
/** Each bus's level, set by ear with the volume sliders: the effects, the world's own sound and the music. */
export const LEVEL: Record<Bus, number> = { sfx: 0.24, amb: 0.063, music: 0.17 };
export const PREFS = 'floe-market-sound';
export const BUSES: Bus[] = ['sfx', 'amb', 'music'];
/**
 * How loud each kind of sound is, on the settings' 1 to 10 sliders, and whether it's muted: a per-device choice,
 * outside the save (like the songs' mute buttons).
 */
export const prefs = {
  level: { sfx: 7, amb: 7, music: 7 } as Record<Bus, number>,
  mute: { sfx: false, amb: false, music: false } as Record<Bus, boolean>,
};
/** A slider's step as a volume: 7 is the mix as it was set, and each step is about 2 dB (10 twice as loud, 1 a quarter). */
export const gainOf = (step: number) => 2 ** ((step - 7) / 3);
export const step = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
try {
  const p = JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Record<string, unknown>;
  const level = (p.level ?? {}) as Record<string, unknown>, mute = (p.mute ?? {}) as Record<string, unknown>;
  const vol = (p.vol ?? {}) as Record<string, unknown>;
  for (const b of BUSES) {
    // older settings: volumes as a share of the mix, and sound or music switched off
    const v = vol[b];
    if (typeof v === 'number' && v > 0 && v <= 2) prefs.level[b] = step(7 + 3 * Math.log2(v));
    if (p.sound === false || (b === 'music' && p.music === false)) prefs.mute[b] = true;
    const l = level[b], m = mute[b];
    if (typeof l === 'number' && l >= 1 && l <= 10) prefs.level[b] = step(l);
    if (typeof m === 'boolean') prefs.mute[b] = m;
  }
} catch { /* storage unavailable or unreadable: the defaults */ }

/** How loud the effects are now, with their slider and mute: 0 when muted. */
export const sfxVolume = () => (prefs.mute.sfx ? 0 : LEVEL.sfx * gainOf(prefs.level.sfx));
