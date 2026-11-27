// The ChefControl studio intro, as a take for the trailer's front (it lives in the game as src/intro.ts, its moves as
// index.html's #intro styles, its sound as src/introSound.ts: PR #258). Rendered straight from those: the page's CSS
// animations are stepped a frame at a time (Web Animations: every animation's currentTime set, then a screenshot), and
// the sound is scheduled into an offline context by the game's own `schedule`.
//   node intro-render.mjs <dir with chefcontrol.svg, css.txt, introSound.ts> <fonts dir> <out take dir>
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'url';
import { playwright } from '../../scripts/pw.mjs';
const [src, fonts, out] = process.argv.slice(2).map(p => resolve(p));
const FPS = 30, LEN = 4.6, FADE = 0.4, N = Math.round((LEN + FADE) * FPS);
const svg = readFileSync(join(src, 'chefcontrol.svg'), 'utf8'), css = readFileSync(join(src, 'css.txt'), 'utf8').split('/* less motion')[0].replace(/^[\s\S]*?(?=html\.intro)/, '');
const SPARK = '<path class="spark" d="M938 222 L946 244 L968 252 L946 260 L938 282 L930 260 L908 252 L930 244 Z" fill="#fff"/>';
const sound = stripTypeScriptTypes(readFileSync(join(src, 'introSound.ts'), 'utf8')).replace(/^import .*$/gm, '').replace(/^export /gm, '').split('function playIntroSound')[0].replace(/\/\*\*[^]*?\*\/\s*$/, '');
const font = pathToFileURL(join(fonts, 'baloo2-800.woff2')).href;
const html = `<!doctype html><html class="intro"><head><meta charset="utf8"><style>
@font-face{ font-family:"Baloo 2"; font-weight:800; src:url("${font}") format("woff2"); }
html,body{ margin:0; height:100%; font-family:"Baloo 2",system-ui,sans-serif; }
${css}
#black{ position:fixed; inset:0; z-index:99; background:#000; opacity:1; }
</style></head><body><div id="intro" role="img">${svg.replace('</svg>', SPARK + '</svg>')}<p class="name">ChefControl</p><p class="kind">Studio</p></div><div id="black"></div></body></html>`;
mkdirSync(join(out, 'frames'), { recursive: true });
writeFileSync(join(out, 'intro.html'), html);
const { chromium } = await playwright();
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(pathToFileURL(join(out, 'intro.html')).href);
await page.evaluate(() => document.fonts.ready);
const ease = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
for (let i = 0; i < N; i++) {
  const t = i / FPS;
  await page.evaluate(([ms, dark]) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } document.getElementById('black').style.opacity = dark; }, [t * 1000, Math.max(1 - ease(t / 0.2), ease((t - LEN) / FADE))]);
  await page.screenshot({ path: join(out, 'frames', String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 93 });
}
// the sound: the game's own schedule, through the compressor it plays through, into a WAV
const wav = await page.evaluate(async ([code, secs]) => {
  const { schedule } = new Function(code + '\nreturn { schedule };')();
  const c = new OfflineAudioContext(2, Math.ceil(48000 * secs), 48000), comp = c.createDynamicsCompressor(), master = c.createGain();
  comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 4; comp.connect(c.destination); master.gain.value = 1; master.connect(comp);
  schedule(c, master, 0.03);
  const b = await c.startRendering(), L = b.getChannelData(0), R = b.getChannelData(1), n = L.length, v = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, 48000, true); v.setUint32(28, 192000, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  let s = ''; const u = new Uint8Array(v.buffer); for (let i = 0; i < u.length; i += 4096) s += String.fromCharCode.apply(null, u.subarray(i, i + 4096));
  return { b64: btoa(s), peak };
}, [sound, LEN + FADE + 0.2]);
writeFileSync(join(out, 'game.wav'), Buffer.from(wav.b64, 'base64'));
console.log(N + ' frames, sound peak ' + (20 * Math.log10(wav.peak)).toFixed(1) + ' dBFS, in ' + out);
await browser.close();
