// The desktop app's bridge to the game (main.mjs): the only things the game's page can ask of the program, as
// window.floeDesktop (src/desktop.ts). The page itself stays sandboxed, with no Node.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floeDesktop', {
  platform: process.platform,
  // the game's save, in files (saves.mjs): each answers { ok, value } or { ok: false, error }
  saves: {
    read: key => ipcRenderer.sendSync('save:read', key),
    write: (key, data) => ipcRenderer.invoke('save:write', key, data),
    writeNow: (key, data) => ipcRenderer.sendSync('save:write-now', key, data),
    remove: key => ipcRenderer.sendSync('save:remove', key),
  },
});
