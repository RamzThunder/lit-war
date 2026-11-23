"""Compose each ending from its storyboard and generated motion clips."""
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]

def render_movie(film, music, scenes):
    font = Path(os.environ.get('MONA_FONT', ROOT.parent/'censor-escape/fonts/Mona10x12.woff2'))
    final = ROOT/f'output/endings/{film}.mp4'
    final.parent.mkdir(parents=True, exist_ok=True)
    def run(*args):
        subprocess.run(args, check=True, cwd=ROOT)
    def ff(*args):
        run('ffmpeg','-v','error','-y',*args)
    with TemporaryDirectory(dir=final.parent) as directory:
        tmp = Path(directory)
        crest = ROOT/'assets/concept/logos'/('human-logo-white-glow.png' if film == 'draw' else f'{film}-logo.png')
        run('swiftc','-module-cache-path','/private/tmp/lit-war-swift-cache',ROOT/'scripts/endings/guardian-titles.swift','-o',tmp/'titles')
        total = sum(row[2] for row in scenes)
        playlist = []
        shots = []
        for index, (title, body, duration) in enumerate(scenes):
            style = min(index, 4) if film == 'draw' and index <= 5 else index - int(film == 'draw')
            clip = '04-02' if film == 'draw' and index == 4 else f'{index:02}'
            if film == 'draw' and index == 5:
                dialogue, narration = body.rsplit('|', 1)
                bench_time = duration * 0.65
                shots.append((index, style, clip, title, dialogue, bench_time))
                clip, title, body, duration = '05-pens', '', narration, duration - bench_time
            shots.append((index, style, clip, title, body, duration))
        for i, (index, style, clip, title, body, duration) in enumerate(shots):
            overlay, segment = tmp/f'{i}.png', tmp/f'{i}.mp4'
            captions = body.split('|') if 2 <= style <= 4 else [body]
            layers = []
            for j, caption in enumerate(captions):
                layer = tmp/f'{i}-{j}.png'
                run(tmp/'titles',layer,str(style),title if j==0 else '',caption,font,crest,film)
                layers.append(layer)
            overlay = layers[0]
            if 1 <= style <= 5:
                src = ROOT/f'assets/endings/cuts/{film}/{clip}.mp4'
                # Let the departing figure dissolve during the original motion.
                # Hold only the black background beneath the still-readable text.
                tail = (f'fade=t=out:st=1:d=1,tpad=stop_mode=add:stop_duration={duration}'
                        if film == 'guardian' and style == 5 else f'tpad=stop_mode=clone:stop_duration={duration}')
                inputs = ['-i',src]
                speed = 1 if film == 'guardian' else min(1.7, duration / (5.06 if clip == '04-02' else 2.06))
                graph = f'[0:v]setpts={speed}*PTS,fps=24,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,{tail}[shot0]'
                start = 0.0
                weight = sum(max(1,len(c)) for c in captions)
                for j,(layer,caption) in enumerate(zip(layers,captions)):
                    inputs.extend(['-i',layer])
                    end = start + duration*max(1,len(caption))/weight
                    graph += f";[shot{j}][{j+1}:v]overlay=enable='gte(t,{start})*lt(t,{end})'"
                    if j+1 < len(layers):
                        graph += f'[shot{j+1}]'
                    start = end
                inputs.extend(['-filter_complex',graph])
            else:
                inputs = ['-loop','1','-framerate','24','-i',overlay]
            ff(*inputs,'-an','-t',str(duration),'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',segment)
            playlist.append(f"file '{segment}'")
        (tmp/'segments').write_text('\n'.join(playlist))
        ff('-f','concat','-safe','0','-i',tmp/'segments','-i',ROOT/music,'-map','0:v','-map','1:a','-c:v','copy','-af',f'afade=in:d=1,afade=out:st={max(0,sum(row[2] for row in scenes[:-3])-2)}:d=2,apad','-t',str(total),'-c:a','aac','-movflags','+faststart',tmp/'finished.mp4')
        (tmp/'finished.mp4').replace(final)
