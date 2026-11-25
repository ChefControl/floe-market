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
  // the window: fullscreen or not (F11 and Alt+Enter switch it too, and `onChange` hears of it)
  display: {
    get: () => ipcRenderer.sendSync('display:get'),
    fullscreen: on => ipcRenderer.send('display:fullscreen', !!on),
    onChange: f => { ipcRenderer.on('display:changed', (_e, d) => f(d)); },
  },
  /** Quits the program (the page saves first). */
  quit: () => ipcRenderer.send('app:quit'),
});
