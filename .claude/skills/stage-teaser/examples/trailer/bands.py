"""Level of each hit, full band and as small speakers play it. python3 bands.py <file> name=time ..."""
import subprocess, sys, re
f = sys.argv[1]
def lv(a, d, flt):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-ss', str(a), '-t', str(d), '-i', f, '-af', f'{flt},astats=metadata=0:reset=0', '-f', 'null', '-'], stdin=subprocess.DEVNULL, capture_output=True, text=True).stderr
    m = re.findall(r'RMS level dB: (-?[\d.]+|-inf)', out); return m[-1] if m else '?'
for arg in sys.argv[2:]:
    n, t = arg.split('='); t = float(t)
    print(f"{n:8s} {t:6.2f}  full {lv(t, 0.3, 'anull'):>7}  >180 {lv(t, 0.3, 'highpass=f=180'):>7}  >350 {lv(t, 0.3, 'highpass=f=350'):>7}  2-8k {lv(t, 0.3, 'highpass=f=2000,lowpass=f=8000'):>7}")
