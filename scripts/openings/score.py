"""Compose the three opening scores and mux them with their silent masters."""
import math
import subprocess
import tempfile
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'output/openings'
RATE = 24000
FILMS = [
 ('common-propaganda-v3', 'common-propaganda-v3-no-voice', 128, [5,18,30,41,52,64,68,71,96,112,121]),
 ('guardian-v1', 'guardian-v1-no-voice', 83, [8,18,28,38,43,46,51,55,62,69,72.8,73.65,77]),
 ('luddite-pixel-v12', 'luddite-pixel-v12', 79, [4,5.6,9.2,14,25,32,37,49,55,61,69,77])]


from functools import lru_cache
from random import Random


@lru_cache(maxsize=512)
def sample(voice, pitch, length):
    """Cache isolated instrument strikes; each score supplies its own arrangement."""
    clip = array('f')
    noise = Random(701 + pitch)
    low = 0.0
    freq = math.tau * 440 * 2 ** ((pitch - 69) / 12)
    for i in range(round(RATE * length)):
        t = i / RATE
        phase = freq * t
        env = min(1, t/.006, (length-t)/.035)
        if voice == 'brass':
            value = sum(math.sin(k*phase)/k for k in (1,2,3,4,5)) * (0.55+0.45*math.exp(-12*t))
        elif voice == 'piano':
            value = (math.sin(phase)+.45*math.sin(2.001*phase)+.2*math.sin(3.01*phase)*math.exp(-7*t))*math.exp(-3*t)
        elif voice == 'bow':
            vib = .10*math.sin(31*t)
            value = (math.sin(phase+vib)+.48*math.sin(phase*1.003+vib)+.24*math.sin(2*phase+2*vib))*min(1,t/.22,(length-t)/.24)
        elif voice == 'wire':
            # Wound string attack, with a sustained overdriven pickup underneath.
            bite = 1.6 * math.exp(-8*t) + .28
            value = math.tanh(1.8*math.sin(phase + bite*math.sin(2*phase)))
            value *= (.58 + .42*math.exp(-3*t)) * min(1,(length-t)/.12)
        elif voice == 'kick':
            value = math.sin(330*t+7*(1-math.exp(-45*t)))*math.exp(-15*t)
        elif voice == 'metal':
            value = sum(math.sin(phase*k)*math.exp(-t*d)*a for k,d,a in [(1,7,.5),(2.72,12,.35),(4.13,16,.2)])
        elif voice == 'fan':
            low = .988*low + .012*noise.uniform(-1,1)
            value = (4*low+.14*math.sin(phase)) * min(1,t/.6,(length-t)/.6)
        else:
            value = noise.uniform(-1,1)*math.exp(-4*t/length)
        clip.append(value*env)
    return clip


def broadcast(play):
    # Four-square commercial break: brass call, backbeat, then an unplugged room.
    beat = .45
    hook = [(0,72),(.75,76),(1.5,79),(2.5,81),(3,79)]
    answer = [(.5,77),(1,76),(2,74),(3,72)]
    for bar in range(36):
        start = bar*4*beat
        for n,pitch in (hook if bar%4 in (0,2) else answer):
            play(start+n*beat,'brass',pitch+(5 if bar%8>=4 else 0),.20 if n<2 else .32,.12)
        for n in (0,2):
            play(start+n*beat,'kick',40,.20,.24)
        for n in (1,3):
            play(start+n*beat,'hiss',80,.13,.15)
    for t in (5,18,30,41,52):
        for n,p in enumerate((72,76,79,84)):
            play(t+n*.09,'brass',p,.24,.085)
    play(68,'metal',43,.18,.20)
    for t in range(71,121,4):
        play(t,'fan',38,4,.19)
    for t in (76,83,89,96,102,106,110,116):
        play(t,'hiss',62,.07,.12)
    for i,p in enumerate((60,67,72)):
        play(121+i*.7,'brass',p,.8,.09)


def invitation(play):
    # Waltz: left-hand downbeat, two soft chords and an independently bowed melody.
    beat = .72
    harmonies = [(50,57,62,66),(47,54,59,62),(43,55,59,62),(45,57,61,64)]
    phrases = [(69,71,74),(73,71),(67,69,71),(69,), (74,76),(78,74,71),(71,69),(66,)]
    for bar in range(39):
        start = bar*3*beat
        if 68 <= start < 74: continue
        bass,*chord = harmonies[bar%4]
        play(start,'piano',bass,1.15,.22)
        for n in (1,2):
            for j,p in enumerate(chord):
                play(start+n*beat+j*.022,'piano',p,.67,.067)
        phrase=phrases[bar%8]
        length=3*beat/len(phrase)
        for j,p in enumerate(phrase):
            play(start+j*length,'bow',p,length,.10)
    for t in (28,46,55,77):
        for i,p in enumerate((74,78,81)):
            play(t+i*.15,'piano',p,1.25,.14)
    play(69,'hiss',65,.55,.20)
    play(72.8,'metal',74,.25,.09)


def render(folder, master, duration, cues):
    if folder.startswith('luddite'):
        from luddite_band import render as render_band
        return render_band(ROOT/folder, master)
    mix = array('f', [0]) * (RATE * duration)

    def play(start, voice, pitch, length, gain):
        offset = round(start * RATE)
        clip = sample(voice, pitch, length)
        for i in range(min(len(clip), len(mix)-offset)):
            mix[offset+i] += gain * clip[i]

    if folder.startswith('common'):
        broadcast(play)
    else:
        invitation(play)
    pcm=array('h',(round(32767*max(-.94,min(.94,x))*min(1,i/RATE/.3,(len(mix)-i)/RATE/.7)) for i,x in enumerate(mix)))
    directory=ROOT/folder
    with tempfile.TemporaryDirectory() as tmp:
        sound=Path(tmp)/'score.wav'
        with wave.open(str(sound),'wb') as w:
            w.setparams((1,2,RATE,0,'NONE','')); w.writeframes(pcm.tobytes())
        target=directory/(folder+'-sound.mp4')
        staged=directory/(folder+'-sound.tmp.mp4')
        try:
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(directory/(master+'.mp4')),'-i',str(sound),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-b:a','128k','-movflags','+faststart',str(staged)],check=True)
            staged.replace(target)
        finally:
            staged.unlink(missing_ok=True)
        print(target,flush=True)

if __name__=='__main__':
    for film in FILMS: render(*film)
