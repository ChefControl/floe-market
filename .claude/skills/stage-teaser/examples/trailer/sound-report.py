"""Sound report for the opening take, for a reviewer who can't be handed ears: where each cue's sound actually
starts against the frame it's meant for, loudness every half second, and how much of each band is in each beat.
python3 sound-report.py <take dir> <out dir>"""
import sys, wave, json, numpy as np
take, out = sys.argv[1], sys.argv[2]
w = wave.open(f'{take}/game.wav'); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
x = x.reshape(-1, ch).mean(axis=1)
T = dict(close=1.8, spray=2.3, open=3.0, plant=3.6, elbows=4.1, sit=4.7, face=5.05, wide=5.7, rise=6.4, lookL=7.15, lookR=7.65, bang=8.0, land=8.32,
         hit1=8.75, hit2=9.68, hit3=10.61, glum=11.45, sat=12.05, thud=12.8, peer=13.3, shadow=13.42, side=14.7, breach=15.1, splash2=16.25, sitUp=16.45, idea=17.6,
         twirl=17.95, over=18.3, wind=18.6, thrown=18.8, caught=19.1, taut=19.75, yank=20.37, drag=20.84, far=23.77, end=25.37)
# the cues that are HITS (a sound meant to land on a frame), with the time the picture has them
cues = [('"!" blip', T['bang']), ('hop landing', T['land']), ('thud 1 (cut out)', T['hit1']), ('thud 2', T['hit2']), ('thud 3', T['hit3']), ('he sits', T['sat']),
        ('THUD under the ice', T['thud']), ('burst', T['breach'] - 0.03), ('lands on his back', T['breach'] + 0.57), ('tuna dives', T['breach'] + 0.9),
        ('idea blip', T['idea']), ('throw whoosh', T['thrown']), ('gotcha "!"', T['caught'] + 0.16), ('rope snaps tight', T['taut'] + 0.12), ('yank', T['yank']),
        ('lands on the tuna', T['drag'] + 1.8)]
hop = int(sr * 0.005); win = int(sr * 0.02)
env = np.array([np.sqrt(np.mean(x[i:i + win] ** 2)) for i in range(0, len(x) - win, hop)])
db = 20 * np.log10(env + 1e-6)
rows = []
for name, t in cues:
    i0 = int((t - 0.12) / 0.005); i1 = int((t + 0.2) / 0.005)
    seg = db[max(0, i0):i1]; base = np.median(db[max(0, i0 - 40):max(1, i0)])
    rise = np.diff(seg); k = int(np.argmax(rise)) if len(rise) else 0
    onset = (max(0, i0) + k) * 0.005; peak = float(seg.max()) if len(seg) else -99
    rows.append(dict(cue=name, picture=round(t, 3), sound_onset=round(onset, 3), late_ms=round((onset - t) * 1000), peak_db=round(peak, 1), over_bed_db=round(peak - base, 1)))
half = [dict(t=round(i * 0.5, 1), db=round(float(20 * np.log10(np.sqrt(np.mean(x[int(i * 0.5 * sr):int((i + 1) * 0.5 * sr)] ** 2)) + 1e-6)), 1)) for i in range(int(len(x) / sr * 2))]
def bands(a, b):
    seg = x[int(a * sr):int(b * sr)]
    if len(seg) < 256: return {}
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; f = np.fft.rfftfreq(len(seg), 1 / sr); tot = sp.sum() + 1e-12
    return {n: round(float(sp[(f >= lo) & (f < hi)].sum() / tot * 100), 1) for n, lo, hi in [('sub<80', 0, 80), ('low 80-250', 80, 250), ('mid 250-2k', 250, 2000), ('high 2k-8k', 2000, 8000), ('air>8k', 8000, 24000)]}
shots = [('wide', 0, T['close']), ('asleep/wake', T['close'], T['face']), ('face', T['face'], T['wide']), ('stand/looks/"!"', T['wide'], T['hit1']), ('three cut-outs', T['hit1'], T['glum']),
         ('sit/THUD', T['glum'], T['peer']), ('crawl/shadow', T['peer'], T['side']), ('burst', T['side'], T['sitUp']), ('soaked/idea', T['sitUp'], T['over']), ('throw', T['over'], T['caught']),
         ('hang "!"', T['caught'], T['taut']), ('strain/yank', T['taut'], T['drag']), ('drag/pulls/mount', T['drag'], T['far']), ('market far off', T['far'], T['end'])]
per = [dict(shot=n, a=round(a, 2), b=round(b, 2), rms_db=round(float(20 * np.log10(np.sqrt(np.mean(x[int(a * sr):int(b * sr)] ** 2)) + 1e-6)), 1), bands=bands(a, b)) for n, a, b in shots]
json.dump(dict(sample_rate=sr, seconds=round(len(x) / sr, 2), note='levels are the take RAW, before the +17 dB the cut gives it', cues=rows, half_seconds=half, shots=per), open(f'{out}/sound-report.json', 'w'), indent=1)
print('\n'.join(f"{r['cue']:22s} picture {r['picture']:6.2f}  sound {r['sound_onset']:6.2f}  late {r['late_ms']:4d} ms  peak {r['peak_db']:6.1f} dB  over bed {r['over_bed_db']:5.1f}" for r in rows))
