// How a signed-in player shows on the scoreboard and the wall of shame, which everyone can see. Kept apart from
// cloud.ts, which needs the page, so scripts/shorten-names.ts can use it in Node.

/** Longest name the scoreboard keeps (firestore.rules checks it too). */
export const NAME_MAX = 40;
/** What shows for a player whose name can't be shown. */
export const NO_NAME = 'A player';

/** Their first name and the first letter of their last ("Pat Smith" is "Pat S."), never an email. */
export function publicName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length || name.includes('@')) return NO_NAME;
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0].toLocaleUpperCase() : '';
  const shown = last ? `${words[0]} ${last}.` : words[0];
  return shown.length > NAME_MAX ? shown.slice(0, NAME_MAX - 1).trimEnd() + '…' : shown;
}
