"""How hard each section would hit the limiter: every cut's own sound, with the gain the cut gives it, BEFORE limiting
(peak, and the loudest 50 ms), against the ceiling. The hits should sit under it; a peak well over it comes out of the
limiter smaller than the hit before it.   venv/bin/python prelimit.py <takes dir> <edl.json> [ceiling dBFS]"""
import sys, json, wave, numpy as np
root, edl = sys.argv[1], json.load(open(sys.argv[2])); ceil = float(sys.argv[3]) if len(sys.argv) > 3 else -2.6
def load(take):
    w = wave.open(f'{root}/{take}/game.wav'); sr = w.getframerate()
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float).reshape(-1, w.getnchannels()) / 32768, sr
at = 0.0
for take, a, b, gain in edl['cuts']:
    dur = (b - a) / 30
    if gain is None: at += dur; continue
    x, sr = load(take); seg = x[int(a / 30 * sr):int(b / 30 * sr)] * 10 ** (gain / 20); mono = np.abs(seg).max(axis=1)
    n = int(0.05 * sr); rms = np.sqrt(np.convolve((seg ** 2).mean(axis=1), np.ones(n) / n, 'valid'))
    order = np.argsort(mono)[::-1]; tops = []
    for i in order:
        if all(abs(i - j) > sr * 0.4 for j in tops): tops.append(i)
        if len(tops) == 4: break
    print(f"{take:4s} {at:6.2f}-{at + dur:6.2f}  gain {gain:+5.1f}  loudest 50 ms {20 * np.log10(rms.max() + 1e-9):6.1f} dBFS   peaks: " +
          '  '.join(f"{at + i / sr:6.2f}s {20 * np.log10(mono[i] + 1e-9):+5.1f}{' OVER by %.1f' % (20 * np.log10(mono[i] + 1e-9) - ceil) if 20 * np.log10(mono[i] + 1e-9) > ceil else ''}" for i in sorted(tops)))
    at += dur
