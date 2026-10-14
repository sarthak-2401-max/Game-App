"""Synthesises the game's original sound effects and music loop (no third-party samples).
Run: python3 scripts/make-audio.py  -> writes assets/audio/*.wav
"""
import math, os, wave, struct, random
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
random.seed(7); np.random.seed(7)

def t(d): return np.linspace(0, d, int(SR * d), endpoint=False)
def env(n, a=0.005, r=0.08):
    x = np.ones(n); A = max(1, int(SR*a)); R = max(1, int(SR*r))
    x[:A] = np.linspace(0, 1, A); x[-R:] *= np.linspace(1, 0, R) ** 2
    return x
def tone(f, d, wave_='sine', a=0.005, r=None, sweep=None):
    x = t(d)
    freq = f if sweep is None else np.linspace(f, sweep, len(x))
    ph = 2*np.pi*np.cumsum(freq)/SR
    if wave_ == 'sine': y = np.sin(ph)
    elif wave_ == 'square': y = np.sign(np.sin(ph)) * 0.5
    elif wave_ == 'tri': y = 2/np.pi*np.arcsin(np.sin(ph))
    else: y = np.random.uniform(-1, 1, len(x))
    return y * env(len(x), a, r if r is not None else d*0.8)
def noise(d, lp=0.2, a=0.002, r=None):
    y = np.random.uniform(-1, 1, int(SR*d)); out = np.zeros_like(y); acc = 0
    for i, v in enumerate(y): acc += lp*(v-acc); out[i] = acc
    return out/ (np.max(np.abs(out))+1e-9) * env(len(y), a, r if r is not None else d*0.9)
def mix(*parts):
    n = max(len(p) for p in parts); y = np.zeros(n)
    for p in parts: y[:len(p)] += p
    return y
def seq(*parts, gap=0.0):
    g = np.zeros(int(SR*gap)); out = []
    for p in parts: out += [p, g]
    return np.concatenate(out)
def save(name, y, vol=0.6):
    y = np.clip(y/ (np.max(np.abs(y))+1e-9) * vol, -1, 1)
    with wave.open(os.path.join(OUT, name + '.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y*32767).astype('<i2').tobytes())

save('move', mix(tone(420, 0.06, 'tri', r=0.05), 0.3*noise(0.04, 0.5)), 0.35)
save('bump', mix(tone(110, 0.09, 'square', r=0.08), 0.4*noise(0.06, 0.1)), 0.4)
save('push', mix(noise(0.16, 0.06), 0.5*tone(80, 0.16, 'sine')), 0.5)
save('switch', seq(tone(880, 0.04, 'square', r=0.03), tone(1320, 0.05, 'square', r=0.04)), 0.4)
save('door', mix(tone(180, 0.3, 'tri', sweep=320), 0.5*noise(0.3, 0.05)), 0.5)
save('coin', seq(tone(1320, 0.06, 'sine'), tone(1760, 0.12, 'sine')), 0.5)
save('key', seq(tone(988, 0.05), tone(1319, 0.05), tone(1568, 0.1)), 0.5)
save('core', mix(tone(523, 0.35, 'sine', sweep=1046), 0.5*tone(784, 0.35, 'tri')), 0.5)
save('warning', seq(tone(660, 0.07, 'square'), tone(660, 0.07, 'square'), gap=0.05), 0.35)
save('teleport', mix(tone(300, 0.3, 'sine', sweep=1500), 0.3*tone(600, 0.3, 'tri', sweep=2400)), 0.45)
save('crumble', noise(0.25, 0.08), 0.45)
save('fail', mix(tone(330, 0.5, 'square', sweep=90, r=0.4), 0.5*noise(0.4, 0.05)), 0.5)
save('win', seq(tone(523, 0.09), tone(659, 0.09), tone(784, 0.09), tone(1046, 0.3, r=0.25)), 0.55)
save('unlock', seq(tone(784, 0.07, 'tri'), tone(988, 0.07, 'tri'), tone(1175, 0.07, 'tri'), tone(1568, 0.25, 'tri')), 0.5)
save('tap', tone(1000, 0.03, 'sine', r=0.025), 0.3)

# Ambient music loop: slow minor pad with a soft pulse, 16 s, seamless.
d = 16.0; x = t(d); y = np.zeros_like(x)
chords = [(110, 130.81, 164.81), (98, 123.47, 146.83), (87.31, 110, 130.81), (98, 116.54, 146.83)]
seg = d/len(chords)
for i, ch in enumerate(chords):
    s, e = int(i*seg*SR), int((i+1)*seg*SR); tt = x[s:e]-x[s]
    fade = np.minimum(1, np.minimum(tt/1.0, (seg-tt)/1.0))
    for f in ch:
        y[s:e] += (np.sin(2*np.pi*f*tt) + 0.3*np.sin(2*np.pi*2*f*tt+0.5)) * fade * 0.25
pulse = (np.sin(2*np.pi*x*2) > 0.95).astype(float)
pk = np.convolve(pulse, np.exp(-np.linspace(0, 8, 2000)), mode='same')
y += 0.08 * pk * np.sin(2*np.pi*55*x)
save('music', y, 0.35)
print('ok')
