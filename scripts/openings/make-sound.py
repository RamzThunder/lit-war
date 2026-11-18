import math, random, struct, wave
from pathlib import Path
random.seed(2030)
rate=44100
p=Path('output/openings/luddite-teaser-v1/assets/sound.wav')
with wave.open(str(p),'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
    buf=bytearray()
    for i in range(rate*20):
        t=i/rate
        fade=min(1,t/1.5)*max(0,min(1,(11.5-t)/2.5))
        s=fade*(0.028*math.sin(2*math.pi*55*t)+0.016*math.sin(2*math.pi*82.4*t)+0.005*random.uniform(-1,1))
        for start,freq in [(0.25,1100),(0.48,1500),(5.15,880),(5.35,1320),(6.3,160),(9.9,220)]:
            dt=t-start
            if 0 <= dt < 0.16: s+=0.065*math.sin(2*math.pi*freq*dt)*math.exp(-dt*26)
        buf.extend(struct.pack('<h',int(max(-1,min(1,s))*32767)))
    w.writeframes(buf)
print(p)
