// Records one style of the music listening page (the "Floe Market Music Styles" artifact) exactly as it plays there,
// so a timestamp the user picks on its slider can be cut from the recording.
//
//   node music-record.mjs <styles page.html> <style id> <variant> <layer> <seconds> <out.wav>
//
// The page: read the artifact with the Artifact tool (action "read"); the saved local copy is the HTML to pass.
// Its styles play from fixed seeds, and a seek replays the steps before it silently, so a time and a Layers setting
// always give the same music. The game's own music.ts rolls its random choices differently, so record from the page.
// The recording starts about 0.12 s before the music; find the music's zero with music-cut.py (it lines the bar grid
// up with the downbeats).
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { playwright } from './pw.mjs';

const [html, id, variant, layer, secs, out] = process.argv.slice(2);
if (!out) { console.error('usage: node music-record.mjs <page.html> <style id> <variant> <layer> <seconds> <out.wav>'); process.exit(1); }
const { chromium } = await playwright();
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.addInitScript(() => {
  const oc = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...a) { const r = oc.call(this, d, ...a); if (d instanceof AudioDestinationNode) { const c = this.context; if (!c.__tap) { c.__tap = c.createMediaStreamDestination(); window.__tap = c.__tap; } oc.call(this, c.__tap); } return r; };
});
await p.goto('file://' + resolve(html));
await p.waitForTimeout(500);
await p.click(`#layers button[data-l="${layer}"]`);
await p.evaluate(([id, v]) => {
  const st = STYLES.find(s => s.id === id);
  if (st.variants) { st.variant = +v; st._len = null; }
  start(st, 0);
  const D = window.__rec = { chunks: [] };
  D.rec = new MediaRecorder(window.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
  D.rec.ondataavailable = e => D.chunks.push(e.data); D.rec.start(250);
}, [id, variant]);
await p.waitForTimeout(+secs * 1000 + 500);
const b64 = await p.evaluate(() => new Promise(res => { const D = window.__rec; D.rec.onstop = async () => { const u8 = new Uint8Array(await new Blob(D.chunks).arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); res(btoa(s)); }; D.rec.stop(); }));
writeFileSync('/tmp/_music.webm', Buffer.from(b64, 'base64'));
execSync(`ffmpeg -loglevel error -y -i /tmp/_music.webm -ac 2 -ar 48000 -c:a pcm_s16le "${out}"`);
console.log('recorded', out);
await b.close();
