"""Hiss under a film, second by second: the level of the 2-9 kHz band (where steady noise reads as static) beside the
full band, and for a stretch the level of its quiet moments (the bed under the cues). With two films, old then new.
A bed of air should leave the hiss band near silence (-55 dBFS or lower); a number is not a listen, so ask for one.
    venv/bin/python hiss.py <film> [<older film>] [name=start-end ...]      (needs numpy, ffmpeg)"""
import subprocess, sys, numpy as np
films = [a for a in sys.argv[1:] if '=' not in a]; spans = [a.split('=') for a in sys.argv[1:] if '=' in a]; sr = 48000
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, stdin=subprocess.DEVNULL).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(float) / 32768
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
full = [load(f) for f in films]; hiss = [band(x, 2000, 9000) for x in full]
print('second: hiss band 2-9 kHz [full band], dBFS' + (' (older > newer)' if len(films) > 1 else ''))
cells = []
for s in range(int(min(len(x) for x in full) / sr)):
    i, j = s * sr, (s + 1) * sr
    cells.append(f"{s:2d}s " + '>'.join(f"{db(h[i:j]):4.0f}" for h in reversed(hiss)) + ' [' + '>'.join(f"{db(x[i:j]):4.0f}" for x in reversed(full)) + ']')
for k in range(0, len(cells), 4): print('   '.join(cells[k:k + 4]))
quiet = lambda x, a, b: np.percentile([db(x[int(t * sr):int((t + 0.1) * sr)]) for t in np.arange(a, b, 0.1)], 20)
for name, span in spans:
    a, b = map(float, span.split('-'))
    print(f"bed under {name} ({a}-{b} s): hiss band " + ' > '.join(f"{quiet(h, a, b):.1f}" for h in reversed(hiss)) + '   full ' + ' > '.join(f"{quiet(x, a, b):.1f}" for x in reversed(full)))
