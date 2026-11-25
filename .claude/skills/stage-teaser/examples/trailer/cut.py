#!/usr/bin/env python3
"""Cuts the trailer from the rendered takes: picture from each take's frames, its own game sound under it, the music
beds laid under the acts with crossfades, then a Steam master and a small phone copy.

    python3 cut.py <takes dir> <out.mp4> [--phone out-phone.mp4] [--edl edl.json]

The edit (EDL) is a list of [take, first frame, last frame (exclusive), sound gain dB]; "black" is a take of black
frames. Music beds: [bed, at (s), from (s in the bed), length (s), fade in (s), fade out (s), gain dB].
"""
import json, os, subprocess, sys

FPS = 30
args = sys.argv[1:]
root, out = args[0], args[1]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
edl = json.load(open(opt('--edl', os.path.join(root, 'edl.json'))))
cuts, beds = edl['cuts'], edl['beds']

# ---- picture: one concat list of every frame, in order ----
black = os.path.join(root, 'black.jpg')
if not os.path.exists(black):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080', '-frames:v', '1', black], check=True)
lst, t, audio = [], 0, []
for take, a, b, gain in cuts:
    n = b - a
    for i in range(a, b):
        f = black if take == 'black' else os.path.join(root, take, 'frames', f'{i:04d}.jpg')
        lst.append(f"file '{f}'\nduration {1 / FPS:.6f}")
    if take != 'black' and gain is not None:
        audio.append((os.path.join(root, take, 'game.wav'), a / FPS, n / FPS, t / FPS, gain))
    t += n
lst.append(lst[-1].split('\n')[0])
total = t / FPS
listf = os.path.join(root, 'cut.txt')
open(listf, 'w').write('\n'.join(lst) + '\n')

# ---- sound: each cut's own game sound (short fades at the joins), the beds, a limiter ----
inputs, filt, mix = ['-f', 'concat', '-safe', '0', '-i', listf], [], []
k = 1
for wav, start, dur, at, gain in audio:
    inputs += ['-i', wav]
    ms = int(round(at * 1000))
    filt.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,atrim={start:.4f}:{start + dur:.4f},asetpts=PTS-STARTPTS,'
                f'volume={gain}dB,afade=t=in:d=0.03,afade=t=out:st={max(0, dur - 0.06):.4f}:d=0.06,adelay={ms}|{ms}[g{k}]')
    mix.append(f'[g{k}]'); k += 1
for bed, at, frm, dur, fin, fout, gain in beds:
    inputs += ['-i', os.path.join(root, bed, 'game.wav')]
    ms = int(round(at * 1000))
    filt.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,atrim={frm:.4f}:{frm + dur:.4f},asetpts=PTS-STARTPTS,'
                f'volume={gain}dB,afade=t=in:d={max(0.02, fin)},afade=t=out:st={dur - fout:.4f}:d={fout},adelay={ms}|{ms}[m{k}]')
    mix.append(f'[m{k}]'); k += 1
filt.append(f'{"".join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,apad,atrim=0:{total:.4f},'
            f'alimiter=limit=0.89:level=false:attack=3:release=60,afade=t=out:st={total - 0.5:.4f}:d=0.5[a]')
filt.append('[0:v]fps=30,scale=in_range=pc:out_range=tv,format=yuv420p,setsar=1[v]')
fc = ';'.join(filt)
master = ['-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '16', '-maxrate', '20M', '-bufsize', '30M',
          '-r', '30', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart']
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-t', f'{total:.4f}', *master, out], check=True)
print('master', out, f'{total:.2f}s', os.path.getsize(out) // 1024, 'KB')
phone = opt('--phone')
if phone:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '29',
                    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', phone], check=True)
    print('phone', phone, os.path.getsize(phone) // 1024, 'KB')
