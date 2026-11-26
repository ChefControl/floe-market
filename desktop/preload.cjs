// The desktop app's bridge to the game (main.mjs): the only things the game's page can ask of the program, as
// window.floeDesktop (src/desktop.ts). The page itself stays sandboxed, with no Node.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('floeDesktop', {
  platform: process.platform,
});
