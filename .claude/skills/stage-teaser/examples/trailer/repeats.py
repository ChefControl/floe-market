"""Repeated and skipped frames in a finished film. A cut can show one frame twice and skip the next on a fixed beat
(a 25 fps reader feeding a 30 fps output does it every sixth frame): every still looks right and the film judders.
Prints, per second, the frames identical to the one before, and whether the frame-to-frame change has a period.
    venv/bin/python repeats.py <film.mp4> [quiet seconds, e.g. 59.1-64.6 for a still end card]   (needs numpy, ffmpeg)"""
import subprocess, sys, numpy as np
film = sys.argv[1]; skip = [tuple(map(float, a.split('-'))) for a in sys.argv[2:]]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', film, '-vf', 'scale=320:180,format=gray', '-f', 'rawvideo', '-'], capture_output=True, stdin=subprocess.DEVNULL).stdout
x = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 180, 320).astype(np.int16)
d = np.abs(x[1:] - x[:-1]).mean(axis=(1, 2)); fps = 30
live = np.array([not any(a <= (i + 1) / fps < b for a, b in skip) and x[i + 1].mean() > 2 for i in range(len(d))])  # (not black, not a named still)
same = [i + 1 for i in range(len(d)) if live[i] and d[i] < 0.02]
print(f'{len(x)} frames; identical to the one before (outside stills and black): {len(same)}', [f'{i / fps:.2f}s' for i in same[:30]])
for p in (5, 6):
    m = [d[live][k::p].mean() for k in range(p)]
    print(f'mean change by frame number mod {p}:', ' '.join(f'{v:.2f}' for v in m), '  <-- a beat: one frame in %d is a repeat' % p if min(m) < 0.2 * np.median(m) else '')
sys.exit(1 if len(same) > 3 else 0)
