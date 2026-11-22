"""Mix the faction main themes and signal cues onto the three silent masters."""
from pathlib import Path
import subprocess
import tempfile

from ad_dubbing import write_dubbing
from ad_effects import write_effects
from luddite_band import render as render_luddite

ROOT = Path(__file__).resolve().parents[2] / 'output/openings'
HUMAN = 'Human main theme - Future Loop.mp3'


def render(folder, master, filters, extra_tracks=(), ad_effects=False):
    directory = ROOT / folder
    target = directory / (folder + '-sound.mp4')
    with tempfile.TemporaryDirectory(dir=directory) as tmp:
        staged = Path(tmp) / target.name
        tracks = [ROOT / track for track in extra_tracks]
        if ad_effects:
            effects = Path(tmp) / 'card-effects.wav'
            write_effects(effects)
            speech = Path(tmp) / 'human-dubbing.wav'
            write_dubbing(ROOT.parent / 'HUMAN 더빙', speech)
            tracks.extend((effects, ROOT.parents[1] / 'assets/audio/human-ad-cheer.mp3', speech))
        subprocess.run([
            'ffmpeg', '-v', 'error', '-i', str(directory / master),
            '-i', str(ROOT / HUMAN),
            *(arg for track in tracks for arg in ('-i', str(track))),
            '-filter_complex', ';'.join(filters), '-map', '0:v:0', '-map', '[out]',
            '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2',
            '-b:a', '192k', '-movflags', '+faststart', str(staged),
        ], check=True)
        staged.replace(target)
    print(target, flush=True)


def render_common():
    render('common-propaganda-v3', 'common-propaganda-v3-no-voice.mp4', [
        '[1:a]atrim=duration=67,loudnorm=I=-18:TP=-2:LRA=8,aresample=48000,'
        'volume=-7dB,afade=t=in:d=0.25,afade=t=out:st=64.5:d=2.5[ad]',
        '[2:a]atrim=duration=60,asetpts=PTS-STARTPTS,'
        'loudnorm=I=-23:TP=-3:LRA=8,'
        'aresample=48000,atrim=duration=60,afade=t=in:d=1.7,afade=t=out:st=57:d=3,adelay=67000:all=1[room]',
        'anoisesrc=color=pink:amplitude=0.22:duration=0.16:seed=31,highpass=f=800,'
        'afade=t=out:d=0.16,adelay=67000:all=1[click]',
        '[3:a]aresample=48000,volume=2dB[fx]',
        '[4:a]atrim=duration=2.6,asetpts=PTS-STARTPTS,highpass=f=160,lowpass=f=7200,'
        'loudnorm=I=-22:TP=-5:LRA=7,aresample=48000,volume=2dB,afade=t=in:d=0.05,'
        'afade=t=out:st=1.45:d=1.15,adelay=54900:all=1[cheer]',
        '[ad][room][click][fx][cheer][5:a]amix=inputs=6:normalize=0,alimiter=limit=0.91:level=0:latency=1,aresample=48000,apad=whole_len=6096000,atrim=end_sample=6096000,asetpts=N/SR/TB[out]',
    ], extra_tracks=['Real Human theme - No Loop.m4a'], ad_effects=True)


if __name__ == '__main__':
    render_common()
    render('guardian-v1', 'guardian-v1-no-voice.mp4', [
        '[1:a]atrim=start=16:duration=83,asetpts=PTS-STARTPTS,loudnorm=I=-19:TP=-2:LRA=8,'
        'aresample=48000,afade=t=in:d=0.5,afade=t=out:st=81:d=2,asplit=2[pre][post]',
        '[pre]atrim=end=69.2,afade=t=out:st=68.6:d=0.6[invite]',
        '[post]atrim=start=73.65,asetpts=PTS-STARTPTS,afade=t=in:d=0.45,adelay=73650:all=1[resume]',
        'anoisesrc=color=white:amplitude=0.22:duration=3.8:seed=29,highpass=f=950,lowpass=f=5800,'
        'afade=t=in:d=0.09,afade=t=out:st=0.5:d=3.3,adelay=69000:all=1[noise]',
        'sine=frequency=880:duration=0.25,afade=t=out:st=0.12:d=0.13,adelay=72800:all=1[calibrate]',
        '[invite][resume][noise][calibrate]amix=inputs=4:normalize=0,alimiter=limit=0.91:level=0:latency=1,atrim=duration=83[out]',
    ])
    render_luddite(ROOT / 'luddite-pixel-v12', 'luddite-pixel-v12')
