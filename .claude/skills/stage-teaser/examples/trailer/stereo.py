import sys, subprocess, numpy as np
# stereo.py FILM a-b ... : left/right correlation and the side signal's level against the mid, per stretch (seconds)
f = sys.argv[1]
for r in sys.argv[2:]:
    a, b = map(float, r.split('-'))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', f, '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2); L, R = x[:, 0], x[:, 1]; M, Sd = (L + R) / 2, (L - R) / 2
    db = lambda v: 20 * np.log10(max(1e-9, np.sqrt((v ** 2).mean())))
    print(f'{r:>10}  corr {np.corrcoef(L, R)[0, 1]:.3f}  mid {db(M):6.1f} dB  side {db(Sd):6.1f} dB  mono sum vs stereo {db(M) - db(np.sqrt((L**2 + R**2) / 2)):+.1f} dB')
