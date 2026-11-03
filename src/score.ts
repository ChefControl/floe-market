// Tunes written out as text, for the songs made in the game's own sound (korkiTune.ts, rainTune.ts): a bar is its notes
// in order, each a name and octave with how many eighths it lasts, "r" for a rest; bars are split by "|". So
// "r:2 d5 c#5 b4:4" is a quarter's rest, two eighths falling from D, and a held B. A "~" before a note turns round it
// (an ornament), and lengths can be halves (a sixteenth is 0.5).

/** A note: [the eighth it starts on (fractional for sixteenths), its MIDI note, how many eighths it lasts, turned round]. */
export type Note = [on: number, midi: number, len: number, turn: boolean];
export type Bar = Note[];

const STEPS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** A note's name ("c#5", "bb4") as a MIDI note. */
export function midi(name: string) {
  const m = /^([a-g])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  return 12 * (Number(m[3]) + 1) + STEPS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
/** Bars of `per` eighths from their text; a bar that doesn't add up is a mistake in the tune, so it throws. */
export function bars(text: string, per = 8): Bar[] {
  return text.split('|').map((bar, b) => {
    const out: Bar = [];
    let at = 0;
    for (const tok of bar.trim().split(/\s+/).filter(Boolean)) {
      const [name, l] = tok.split(':'), len = l ? Number(l) : 1, turn = name.startsWith('~');
      if (name !== 'r') out.push([at, midi(turn ? name.slice(1) : name), len, turn]);
      at += len;
    }
    if (Math.abs(at - per) > 1e-6) throw new Error(`bar ${b + 1} has ${at} eighths, not ${per}: ${bar}`);
    return out;
  });
}
