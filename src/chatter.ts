// Talking (stage 3): whoever has a word for you in the Undertow (the Family, the regulars, the bodyguard) goes through
// their line a syllable at a time as their bubble comes up, their head bobbing on each (family.ts), a breath at a comma,
// a pause at a full stop; then they're done, still, while the bubble stays up to be read. Silent: no voices.

/** Seconds a letter takes; a breath at a comma; the pause at a full stop. */
const LETTER = 0.045, COMMA = 0.16, STOP = 0.3;

/** One of them talking: `say` a line, then `upd` every frame, true on each syllable. */
export function chatter() {
  let text = '', at = 0, wait = 0, since = 0;
  return {
    /** Starts on `line`, a beat after its bubble comes up. */
    say(line: string) { text = line; at = 0; wait = 0.1; since = 0; },
    /** Stops. */
    hush() { text = ''; at = 0; },
    /** Whether they're still going through it. */
    get talking() { return at < text.length; },
    /** Goes on through the line: true if a syllable came this frame. */
    upd(dt: number) {
      if (at >= text.length) return false;
      wait -= dt;
      let said = false;
      while (wait <= 0 && at < text.length) {
        const ch = text[at++], next = text[at];
        if ('.!?'.includes(ch)) { wait += next && '.!?'.includes(next) ? 0.02 : STOP; since = 0; continue; }
        if (',:;'.includes(ch)) { wait += COMMA; since = 0; continue; }
        wait += LETTER;
        if (!/[a-z0-9]/i.test(ch)) { if (ch === ' ') since = Math.max(since, 1); continue; }
        // (a syllable every other letter or so, and on a one-letter word)
        if (++since < 2) continue;
        since = 0; said = true;
      }
      return said;
    },
  };
}
