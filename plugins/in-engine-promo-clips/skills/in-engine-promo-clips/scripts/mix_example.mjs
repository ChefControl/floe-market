// A worked soundtrack: one timeline drives voices, effects and the per-frame levels the picture reads.
// Copy it next to your clip and edit the timeline and the clip list.
//
//   node mix_example.mjs <clips dir> <out dir>
//
// Writes <out>/fx.wav (voices + effects, mono) and <out>/timeline.js (window.CLIP = { T, len, voice, phone }) to
// inject before your clip script: T is the timeline, `voice` and `phone` are loudness per video frame (0..1) for the
// main character's mouth and the talk bars on the phone. Missing clip files are skipped, so it runs as a demo too.
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readWav, writeWav, levels } from './wav.mjs';
import { track, sfx } from './sfx.mjs';

const [clips = 'clips', out = 'out'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// ---- the timeline (seconds): every time the picture or the sound cares about ----
const T = {
  ring1: 0.40, up1: 1.10, hello1: 1.32, call1: 2.12, hang1: 5.50,
  ring2: 6.15, up2: 6.55, hello2: 6.72, call2: 7.40, hang2: 9.10,
  ring3: 9.30, hello3: 9.55, frag1: 10.17, ring4: 10.40, hello4: 10.62, frag2: 11.25, hello5: 11.85, frag3: 12.52,
  scream: 13.15, freeze: 14.05, cap1: 14.85, beat: 15.55, cap2: 16.35, end: 17.4,
};
const fps = 30, frames = Math.ceil(T.end * fps);
const all = track(T.end + 0.5), voice = track(T.end + 0.5), phone = track(T.end + 0.5);
const clip = (name, buf, at, gain) => { const f = join(clips, name + '.wav'); if (existsSync(f)) buf.put(readWav(f).x, at, gain); else console.log('(no', f + ')'); };

// ---- voices: the main character in `voice` (drives the mouth), callers in `phone` (drives the talk bars) ----
clip('hello1', voice, T.hello1, 6); clip('hello2', voice, T.hello2, 4); clip('hello3', voice, T.hello3, 3);
clip('hello4', voice, T.hello4, 2); clip('hello5', voice, T.hello5, 0); clip('scream', voice, T.scream, 2);
clip('caller1', phone, T.call1, 2); clip('caller2', phone, T.call2, 1);
clip('frag1', phone, T.frag1, 1); clip('frag2', phone, T.frag2, 1); clip('frag3', phone, T.frag3, 1);

// ---- effects ----
sfx.ring(all, T.ring1); sfx.ring(all, T.ring2, [[0, 0.42]], -12);
for (const k of ['ring3', 'ring4']) sfx.ring(all, T[k], [[0, 0.25]], -11);
sfx.beep(all, T.hang1); sfx.slam(all, T.hang2);
sfx.kettle(all, T.ring4, T.freeze);
sfx.hiss(all, T.hello4 + 0.1, 0.35, -22); sfx.hiss(all, T.hello5 + 0.1, 0.45, -19); sfx.hiss(all, T.scream, 0.95, -14);
sfx.scratch(all, T.freeze);
sfx.drone(all, T.freeze + 0.35, T.cap2);
sfx.slamIn(all, T.cap1, false); sfx.heartbeat(all, T.beat); sfx.slamIn(all, T.cap2, true);

for (let i = 0; i < all.buf.length; i++) all.buf[i] += voice.buf[i] + phone.buf[i];
writeWav(join(out, 'fx.wav'), all.buf);
writeFileSync(join(out, 'timeline.js'), `window.CLIP = ${JSON.stringify({ T, len: T.end, voice: levels(voice.buf, 48000, fps, frames, 7), phone: levels(phone.buf, 48000, fps, frames, 9) })};\n`);
console.log('wrote', join(out, 'fx.wav'), 'and', join(out, 'timeline.js'));
