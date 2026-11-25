// Opens Floe Market in a headless browser, in whatever state a teaser needs, and films it.
//
//   import { open, film } from './game.mjs';
//   const { browser, page } = await open({ save: tiles => ({ ...a SaveData... }), keep: ['game', 'offer'] });
//   const stop = await film(page, 'out/meet');   // screen (page overlays and all) + the game's sound
//   ...drive the game...
//   await stop();                                 // writes out/meet/frames/*.jpg, frames.txt, audio.webm, sync.json
//
// What it sets up, and why:
// - Playwright from wherever it's installed (see pw.mjs).
// - A tap on the game's audio output (AudioNode.connect to the destination is patched to also feed a
//   MediaStreamDestination), so the game's own sound can be recorded. Autoplay is allowed by a launch flag.
// - The save: written with save.ts's replaceSave() (which also stops the old page saving over it), then a reload.
// - window.__mod(name): imports a game module by the URL the page actually loaded. Under the Vite dev server a module
//   edited since it started is loaded as /src/x.ts?t=…; importing plain /src/x.ts gives a second, separate copy.
// - window.__mods: player, bout (stage 3) and render.ts (renderer, scene, camera, lights, canvas).
// - Everything but the elements in `keep` hidden (the HUD, the corner buttons, the hint…).
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { playwright } from './pw.mjs';

export const MOD = `window.__mod = n => { const e = performance.getEntriesByType('resource').map(r => r.name).filter(u => new URL(u).pathname === '/src/' + n); return import(e.length ? e[e.length - 1] : '/src/' + n); };`;

export const DEMO_URL = 'http://localhost:5177/?sound=on';
/** The frame size: portrait 720×1280 (phones), or --landscape / --size 1920x1080 (trailers, the store page). */
export function frameSize(argv = process.argv) {
  const i = argv.indexOf('--size');
  if (i >= 0) return argv[i + 1].split('x').map(Number);
  return argv.includes('--landscape') ? [1920, 1080] : [720, 1280];
}

export async function open({ url = DEMO_URL, save, w = 720, h = 1280, keep = ['game'], headless = true } = {}) {
  const { chromium } = await playwright();
  const browser = await chromium.launch({ headless, args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.addInitScript(() => {
    const oc = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) {
      const r = oc.call(this, dest, ...a);
      if (dest instanceof AudioDestinationNode) {
        const ctx = this.context;
        if (!ctx.__tap) { ctx.__tap = ctx.createMediaStreamDestination(); window.__tap = ctx.__tap; }
        oc.call(this, ctx.__tap);
      }
      return r;
    };
  });
  await page.goto(url);
  await page.waitForTimeout(1500);
  if (save) {
    await page.evaluate(`(async () => { ${MOD}
      const { tiles } = await window.__mod('unlocks.ts');
      const { replaceSave } = await window.__mod('save.ts');
      replaceSave(JSON.stringify((${save.toString()})(tiles)));
    })()`);
    await page.reload();
    await page.waitForTimeout(2500);
  }
  await page.addStyleTag({ content: `body > *:not(${keep.map(k => '#' + k).join('):not(')}){display:none!important}` });
  await page.evaluate(`(async () => { ${MOD}
    window.__mods = { player: (await window.__mod('player.ts')).player, bout: (await window.__mod('dohyo.ts')).bout, R: await window.__mod('render.ts') };
  })()`);
  await page.keyboard.press('Shift'); // wakes the game's sound
  return { browser, page };
}

/** Films the page in real time: the browser's screencast (overlays included) and the game's sound, both stamped on the
 *  same clock. Returns stop(), which writes the frames, an ffmpeg concat list that keeps their real timing, the sound,
 *  and sync.json (`lead`: how long after the sound started the first frame came). Frames only come when the screen
 *  changes, so the last one is held to the end. */
export async function film(page, dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir + '/frames', { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', f => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const audioT0 = await page.evaluate(() => {
    const D = window.__aud = { chunks: [] };
    D.rec = new MediaRecorder(window.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
    D.rec.ondataavailable = e => D.chunks.push(e.data);
    D.rec.start(250);
    return Date.now() / 1000;
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  return async () => {
    await cdp.send('Page.stopScreencast');
    const stopped = Date.now() / 1000;
    const b64 = await page.evaluate(() => new Promise(res => {
      const D = window.__aud;
      D.rec.onstop = async () => {
        const u8 = new Uint8Array(await new Blob(D.chunks).arrayBuffer());
        let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
        res(btoa(s));
      };
      D.rec.stop();
    }));
    writeFileSync(dir + '/audio.webm', Buffer.from(b64, 'base64'));
    let list = '';
    frames.forEach((f, i) => {
      const name = `frames/${String(i).padStart(5, '0')}.jpg`;
      writeFileSync(`${dir}/${name}`, Buffer.from(f.data, 'base64'));
      const d = (frames[i + 1]?.t ?? stopped) - f.t;
      list += `file '${name}'\nduration ${d.toFixed(4)}\n`;
    });
    // (the concat demuxer ignores the last entry's duration unless the file is listed again)
    if (frames.length) list += `file 'frames/${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
    writeFileSync(dir + '/frames.txt', list);
    const sync = { lead: frames[0].t - audioT0, frames: frames.length, span: frames.at(-1).t - frames[0].t };
    writeFileSync(dir + '/sync.json', JSON.stringify(sync));
    return sync;
  };
}
