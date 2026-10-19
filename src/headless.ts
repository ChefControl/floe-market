// The game run without its looks, for the balance sims (test/bot.ts): everything that only draws, animates or sounds
// (the cellar's crowd, wrestlers and kitchen as drawn, the world upstairs going about its day, the sea, the sound) is
// left out of the tick, and what plays the game (the player, the cellar's sim, the shop, what's carried in the air) is
// kept, so a run comes out the same, many times faster. Never on in the game itself.
export const headless = { on: false };
