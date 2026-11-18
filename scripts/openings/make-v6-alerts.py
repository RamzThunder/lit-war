import math, random, struct, wave
from pathlib import Path
random.seed(2030)
rate=22050
out=Path('output/openings/luddite-v6/assets/alert-effects.wav')
with wave.open(str(out),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate)
    for sec in range(79):
        buf=bytearray()
        for j in range(rate):
            t=sec+j/rate
            value=0.0
            if 4 <= t < 5.6:
                for k in range(15):
                    d=t-(4+k*2/23)
                    if 0<=d<0.10:
                        envelope=min(1,d/0.003)*math.exp(-d*36)
                        value += 0.07*envelope*(math.sin(2*math.pi*(1030+(k%3)*130)*d)+0.3*math.sin(2*math.pi*1830*d))
            if 5.6<=t<6.5:
                value+=0.045*random.uniform(-1,1)*math.exp(-(t-5.6)*5)
            buf.extend(struct.pack('<h',int(max(-1,min(1,value))*32767)))
        w.writeframes(buf)
print(out)
