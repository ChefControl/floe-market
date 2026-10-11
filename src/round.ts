// What every casino round shares (roulette.ts, slots.ts): the money it moves, which the game's table applies to the
// wallet. A round never touches the wallet itself.

/**
 * The money a round moves, for whoever holds the wallet to apply: `take` comes out of the player's cash, `pay` goes
 * back into it, and `owed` is what the round has won but not yet shown (a save counts it as cash), as it stands now.
 */
export interface Moves { take?: number; owed?: number; pay?: number }
