"""Original 168 BPM chip-rock score for the 79-second opening."""
from pathlib import Path
import subprocess
import tempfile

def compose():
    beat = 60 / 168
    events = []
    def note(channel, start, key, beats, velocity):
        on = round(44100 * beat * start)
        off = round(44100 * beat * (start + beats))
        events.extend([(on, channel, key, velocity), (off, channel, key, 0)])

    # Original two-bar call and answer, with a gap before the last accent.
    call = [(0,71,.6),(.75,74,.2),(1,78,.45),(1.75,76,.2),
            (2,73,.7),(3,66,.23),(3.5,69,.35)]
    answer = [(0,71,.22),(.5,78,.65),(1.5,81,.32),(2,79,.45),
              (2.75,76,.22),(3,74,.8)]
    refrain = [(0,78,1.35),(1.5,81,.45),(2,83,.7),(3,81,.35),(3.5,78,.4)]
    release = [(0,76,.7),(1,74,.4),(1.5,73,.35),(2,71,1.6)]
    # Let the rhythm section carry the gap after the shortened lead.
    reply = [(0,71,.22),(.5,78,.65),(1.5,81,.32)]
    rising = [(0,71,.60),(1,74,.45),(1.75,76,.20),(2,78,.70),(3,81,.65)]
    for bar in range(54):
        t = bar*4
        hook = 18<=bar<26 or bar>=48
        roots = (43,45,47,42) if hook else (47,47,43,45)
        root = roots[bar%4]
        phrase = (refrain if bar%2==0 else release) if hook else (call if bar%2==0 else answer)
        if bar in (7, 11):
            phrase = reply
        elif bar == 16:
            phrase = rising
        elif bar == 17:
            # Three rising accents, a tom pickup, then beat four completely clear.
            for at, key in [(0,74),(.75,76),(1.5,78)]:
                note(0,t+at,key,.55,98)
                note(1,t+at,33,.35,92)
            for at, drum in [(0,36),(1,38),(2,48),(2.5,45),(2.75,43)]:
                note(4,t+at,drum,.15,98)
            continue
        elif bar in (33, 41):
            # Keep the groove intact; vary only the final note of the answer.
            phrase = answer[:-1] + [(3, 76 if bar == 33 else 73, .8)]
        for at,key,hold in phrase:
            note(0,t+at,key,hold,82 if bar<4 else 96)
            if hook:
                note(2,t+at,key-12,hold*.96,76)
        if bar<4:
            continue
        for at in (0,.5,1.5,2,2.75,3.5):
            note(1,t+at,root-12+(12 if at==2.75 else 0),.31,89)
        for at in (0,1.5,2.75):
            for interval in (0,7):
                note(3,t+at,root+interval,.55 if hook else .22,85)
        for at in (0,1.5,2,3.5):
            note(4,t+at,36,.18,102)
        for at in (1,3):
            note(4,t+at,38,.22,106)
        for n in range(8):
            note(4,t+n*.5,42,.13,66 if n%2==0 else 48)
        if bar%8==7:
            for j,key in enumerate((48,45,43)):
                note(4,t+3.25+j*.25,key,.18,82+j*4)
        if bar in (4,18,26,48):
            note(4,t,49,1,96)
    for ch,key in ((0,71),(1,35),(3,47),(3,54)):
        note(ch,216,key,3.2,91)
    return sorted(events)

THEME_FILE = "Luddite main Theme - Square Wave Assault.mp3"
THEME_START = 0.300

def render(directory, master):
    theme = directory.parent / THEME_FILE
    human = directory.parent / 'Human main theme - Future Loop.mp3'
    target = directory / (directory.name + '-sound.mp4')
    transition = ';'.join([
        '[2:a]atrim=duration=7,asetpts=PTS-STARTPTS,afade=t=out:st=4:d=1.3[human]',
        'anoisesrc=color=white:amplitude=0.42:duration=3:sample_rate=48000:seed=17,'
        'highpass=f=850,lowpass=f=6800,afade=t=in:d=0.32,'
        'afade=t=out:st=2.8:d=0.2,adelay=4000:all=1[hiss]',
        '[human][hiss]amix=inputs=2:normalize=0,atrim=duration=7[intro]',
        f'[1:a]atrim=start={THEME_START}:duration=72,asetpts=PTS-STARTPTS,'
        'aresample=48000,afade=t=out:st=70:d=2[theme]',
        '[intro][theme]concat=n=2:v=0:a=1,loudnorm=I=-17:TP=-1.5:LRA=9[out]',
    ])
    with tempfile.TemporaryDirectory(dir=directory) as tmp:
        staged = Path(tmp) / target.name
        subprocess.run([
            'ffmpeg','-v','error','-i',str(directory/(master+'.mp4')),
            '-i',str(theme),'-i',str(human),'-filter_complex',transition,
            '-map','0:v:0','-map','[out]','-c:v','copy','-ar','48000',
            '-ac','2','-c:a','aac','-b:a','192k','-movflags','+faststart',str(staged),
        ],check=True)
        staged.replace(target)
