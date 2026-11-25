#!/usr/bin/env python3
"""Cuts a stretch of music at clean points, near the times the user asked for.

  python3 music-cut.py <recording.wav> <bpm> <start s> <end s> <out.wav> [--bars-beats 4] [--fade 0.1] [--search 1.3]

Times are music times (as on the music page's slider), not recording times: the recording's zero (where the music's
first beat is) is found by lining a bar grid up with the downbeats across the whole recording.

- Start: the downbeat nearest the asked-for start (within --search seconds), cut on the zero crossing just before its
  attack, so the clip opens on a whole hit and not partway into a note.
- End: the note onset nearest the asked-for end whose lead-in is quietest; cut on the zero crossing just before it,
  with a short fade (--fade). So the clip never stops in the middle of a note.
- Writes the cut (8 ms fade in, the fade out), cut.json, and two waveform pictures: <out>-context.png (green start,
  red end, over the music round them) and <out>-clip.png (the clip alone). Look at them before using the cut: a line
  sitting after a spike, or inside a thick sustained band, is a bad cut.

Lessons: a time the user picks usually lands mid-bar or mid-roll; say how far each end moved and why. Starting a hair
before a downbeat is clean; starting on a backbeat sounds off. Ending just before a downbeat, after a fill, is a
natural cliffhanger; ending on a big hit needs the hit's ring to fade before the next note.
"""
import json, math, struct, subprocess, sys, wave

a = sys.argv[1:]
if len(a) < 5:
    sys.exit(__doc__)
src, bpm, t_start, t_end, out = a[0], float(a[1]), float(a[2]), float(a[3]), a[4]
opt = lambda k, d: float(a[a.index('--' + k) + 1]) if '--' + k in a else d
beats, fade, search = opt('bars-beats', 4), opt('fade', 0.1), opt('search', 1.3)

w = wave.open(src)
n, sr, ch = w.getnframes(), w.getframerate(), w.getnchannels()
raw = struct.unpack('<%dh' % (n * ch), w.readframes(n))
d = [sum(raw[i * ch:(i + 1) * ch]) / ch for i in range(n)]
hop = sr // 1000                              # 1 ms
env = [math.sqrt(sum(x * x for x in d[i:i + hop]) / hop) for i in range(0, n - hop, hop)]
rise = [0.0] * 10 + [max(0.0, env[i] - env[i - 10]) for i in range(10, len(env))]
db = lambda v: 20 * math.log10(v / 32768 + 1e-9)
bar_ms = 60000 / bpm * beats

# the music's zero: the offset that puts the most attack on the bar lines
bars = int((len(rise) - 1000) / bar_ms)
zero = max(range(0, 1000), key=lambda z: sum(rise[int(z + k * bar_ms)] + rise[int(z + k * bar_ms) + 1] for k in range(bars)))
ms = lambda t: int(zero + t * 1000)            # music time -> ms into the recording

def zc_before(i):
    while i > 1 and not ((d[i - 1] <= 0 < d[i]) or (d[i - 1] >= 0 > d[i])):
        i -= 1
    return i

def attack(m):
    """The attack of the hit nearest ms m: the steepest rise within 40 ms."""
    return max(range(m - 40, m + 40), key=lambda i: rise[i])

# start: the nearest downbeat to the asked-for time
bar_times = [k * bar_ms / 1000 for k in range(bars + 1)]
db_t = min((t for t in bar_times if abs(t - t_start) <= search), key=lambda t: abs(t - t_start), default=None)
if db_t is None:
    sys.exit(f'no downbeat within {search}s of {t_start}')
on = attack(ms(db_t))
st = zc_before((on - 10) * hop)

# end: onsets near the asked-for end; take the one whose lead-in is quietest, nearer the target the better
lo, hi = ms(t_end - search), ms(t_end + search)
peaks = [i for i in range(lo, hi) if rise[i] > 0 and rise[i] == max(rise[i - 15:i + 15]) and rise[i] > 0.25 * max(rise[lo:hi])]
def score(i):
    lead = sum(env[i - 30:i - 5]) / 25
    return db(lead) + 8 * abs((i - zero) / 1000 - t_end)
best = min(peaks, key=score)
en = zc_before((best - 15) * hop)

length = (en - st) / sr
res = {'zero_s': zero / 1000, 'start': round(st / sr - zero / 1000, 3), 'end': round(en / sr - zero / 1000, 3), 'length': round(length, 3),
       'start_level_db': round(db(env[st // hop]), 1), 'end_level_db': round(db(sum(env[en // hop - 25:en // hop]) / 25), 1),
       'asked': [t_start, t_end], 'downbeat_used': round(db_t, 3)}
json.dump(res, open(out.rsplit('.', 1)[0] + '-cut.json', 'w'), indent=1)
print(json.dumps(res))

ss, L = st / sr, length
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{ss:.4f}', '-t', f'{L:.4f}', '-i', src, '-af',
                f'afade=t=in:d=0.008,afade=t=out:st={max(0, L - fade):.3f}:d={fade}:curve=qsin', '-c:a', 'pcm_s16le', out], check=True)
pre, span = 1.0, L + 2.0
x1, x2 = int(pre / span * 1200), int((pre + L) / span * 1200)
base = out.rsplit('.', 1)[0]
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x140A05:s=1200x320', '-ss', f'{max(0, ss - pre):.4f}', '-t', f'{span:.3f}', '-i', src,
                '-filter_complex', f'[1:a]showwavespic=s=1200x300:scale=sqrt:colors=0xF2C14E[w];[0:v][w]overlay=0:10:format=auto,'
                f'drawbox=x={x1}:y=0:w=4:h=320:color=0x5BD27A@1:t=fill,drawbox=x={x2}:y=0:w=4:h=320:color=0xFF6A4A@1:t=fill',
                '-frames:v', '1', base + '-context.png'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x140A05:s=1200x320', '-i', out,
                '-filter_complex', '[1:a]showwavespic=s=1200x300:scale=sqrt:colors=0xF2C14E[w];[0:v][w]overlay=0:10:format=auto',
                '-frames:v', '1', base + '-clip.png'], check=True)
