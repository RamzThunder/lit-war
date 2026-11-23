"""Re-cut the draw ending as webtoon-style panels over the alarm mix."""
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from draw_alarm import gate_beep, sit_thud, write_audio
from storyboard import SOURCE as BOARD, read_board

ROOT = Path(__file__).resolve().parents[2]
CUTS = ROOT / 'assets/endings/cuts/draw'
SOURCE = ROOT / 'output/endings/draw-rough-alarm.mp4'
TARGET = ROOT / 'output/endings/draw-webtoon-v2.mp4'
FONT = Path(os.environ.get('MONA_FONT', ROOT.parent / 'censor-escape/fonts/Mona10x12.woff2'))
CREST = ROOT / 'assets/concept/logos/human-logo-white-glow.png'
FPS = 24
FULL = (0, 0, 1)


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True, cwd=ROOT)


def ff(*args):
    run('ffmpeg', '-v', 'error', '-y', *args)


ENCODE = ('-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', FPS)


def frames(seconds):
    return round(seconds * FPS)


def panel(source, seconds, box=FULL, zoom=(1, 1.035)):
    """Crop a 16:9 panel by fractions of the image and drift the camera slowly."""
    x, y, width = box
    count = max(frames(seconds) - 1, 1)
    # perspective samples between pixels, so slow moves do not snap to whole pixels.
    inset = f"(1-1/({zoom[0]}+({zoom[1]}-{zoom[0]})*min(in/{count}\\,1)))/2"
    return (f'crop=w=iw*{width}:h=iw*{width}*9/16:x=iw*{x}:y=ih*{y},scale=2560:1440:flags=lanczos,format=yuv444p,'
            f"perspective=x0='W*{inset}':y0='H*{inset}':x1='W*(1-{inset})':y1='H*{inset}':"
            f"x2='W*{inset}':y2='H*(1-{inset})':x3='W*(1-{inset})':y3='H*(1-{inset})':"
            f'interpolation=cubic:eval=frame,scale=1280:720:flags=bicubic,fps={FPS},setsar=1')


def still(out, source, seconds, box=FULL, zoom=(1, 1.035), layer=None):
    graph = f'[0:v]{panel(source, seconds, box, zoom)}[v]'
    inputs = ['-loop', 1, '-framerate', FPS, '-i', source]
    if layer:
        inputs += ['-i', layer]
        graph += ';[v][1:v]overlay[v]'
    ff(*inputs, '-filter_complex', graph, '-map', '[v]', '-frames:v', frames(seconds), *ENCODE, out)


def reuse(out, start, seconds):
    ff('-ss', start, '-i', SOURCE, '-vf', f'fps={FPS},setsar=1', '-frames:v', frames(seconds), *ENCODE, out)


def dissolve(out, first, second, seconds, fade, layer=None):
    hold = (seconds + fade) / 2
    offset = seconds - hold
    graph = (f'[0:v]{panel(first, hold, FULL, (1, 1.01))}[a];'
             f'[1:v]{panel(second, hold, FULL, (1.01, 1.02))}[b];'
             f'[a][b]xfade=transition=fade:duration={fade}:offset={offset}[v]')
    inputs = ['-loop', 1, '-framerate', FPS, '-i', first, '-loop', 1, '-framerate', FPS, '-i', second]
    if layer:
        inputs += ['-i', layer]
        graph += ';[v][2:v]overlay[v]'
    ff(*inputs, '-filter_complex', graph, '-map', '[v]', '-frames:v', frames(seconds), *ENCODE, out)


def read_bridge():
    """Read the connecting cuts as {key: (seconds, caption)}."""
    rows, inside = {}, False
    for line in BOARD.read_text().splitlines():
        if line.startswith('## '):
            inside = line.startswith('## 접전 연결 컷')
        if inside and line.startswith('| 연결'):
            key, seconds, _, caption = (cell.strip() for cell in line.strip().strip('|').split('|'))
            rows[key] = (float(seconds), caption)
    expected = [f'연결{number:02}' for number in range(1, 12)]
    if list(rows) != expected:
        raise ValueError(f'접전 연결 컷 순서를 확인하세요: {expected}')
    return rows


def main():
    scenes = read_board()['draw']
    fight = scenes[4][1].split('|')
    bench = scenes[5][1].split('|')
    with TemporaryDirectory(dir=TARGET.parent) as directory:
        tmp = Path(directory)
        titles = tmp / 'titles'
        run('swiftc', '-module-cache-path', '/private/tmp/lit-war-swift-cache',
            ROOT / 'scripts/endings/guardian-titles.swift', '-o', titles)

        def layer(name, style, title, caption):
            path = tmp / f'{name}.png'
            run(titles, path, style, title, caption, FONT, CREST, 'draw')
            return path

        def clip_frame(name, clip, at):
            path = tmp / f'{name}.png'
            ff('-ss', at, '-i', CUTS / clip, '-frames:v', 1, '-vf', 'scale=1664:-1:flags=lanczos', path)
            return path

        guardian_points = clip_frame('guardian-points', '04-02.mp4', 2.5)
        both_still = clip_frame('both-still', '04-02.mp4', 3.8)
        luddite_points = clip_frame('luddite-points', '04-02.mp4', 4.9)
        record = scenes[2][1].split('|')
        bridge = read_bridge()
        seated = CUTS / '04-03-c-left-seated.png'
        guardian_seated, luddite_upper = (0, .2, .55), (.55, .02, .45)
        clock = {'at': 26.0}

        def beat(key):
            """Return exact frame-aligned seconds and the caption layer for a bridge cut."""
            seconds, caption = bridge[key]
            start, end = clock['at'], clock['at'] + seconds
            clock['at'] = end
            clock[key] = start
            exact = (round(end * FPS) - round(start * FPS)) / FPS
            style = 4 if caption.startswith(('보존관:', '러다이트:')) else 2
            return exact, layer(key, style, '', caption) if caption else None

        shots = []

        def add(maker, *args, **kwargs):
            out = tmp / f'shot-{len(shots):02}.mp4'
            maker(out, *args, **kwargs)
            shots.append(out)

        add(reuse, 0, 3)
        add(still, CUTS / '01.png', 4, layer=layer('seed', 1, scenes[1][0], scenes[1][1]))
        add(still, CUTS / '02.png', 3, layer=layer('record-1', 2, scenes[2][0], record[0]))
        add(still, CUTS / '02.png', 3, zoom=(1.035, 1.07), layer=layer('record-2', 2, '', record[1]))
        add(reuse, 13, 6)  # The door stays in motion under the alarm.

        add(still, CUTS / '04.png', 1.9, zoom=(1, 1.015), layer=layer('fight-1', 4, '', fight[0]))
        add(still, guardian_points, 1.7, (.08, 0, .84), (1.04, 1.06), layer('fight-2', 4, '', fight[1]))
        add(still, both_still, .8, (.46, 0, .54), (1.08, 1.08), layer('fight-3', 4, '', fight[2]))
        add(still, luddite_points, 2.6, (.02, 0, .9), (1.03, 1.07), layer('fight-4', 4, '', fight[3]))

        def cut(key, source, box=FULL, zoom=(1, 1.02)):
            seconds, caption = beat(key)
            add(still, source, seconds, box, zoom, caption)

        cut('연결01', CUTS / '04-03-a.png', zoom=(1, 1.01))
        cut('연결02', both_still, (.46, 0, .54), (1.02, 1.04))
        cut('연결03', both_still, (0, 0, .54), (1.02, 1.04))
        seconds, caption = beat('연결04')
        add(dissolve, CUTS / '04-03-a.png', CUTS / '04-03-b.png', seconds, 1.6, caption)
        cut('연결05', CUTS / '04-03-c-empty.png', zoom=(1, 1))
        cut('연결06', seated, guardian_seated, (1, 1.02))
        cut('연결07', seated, guardian_seated, (1.02, 1.05))
        cut('연결08', seated, luddite_upper, (1, 1.03))
        cut('연결09', seated, guardian_seated, (1.05, 1.07))
        cut('연결10', seated, luddite_upper, (1.03, 1.05))
        cut('연결11', CUTS / '04-03-c-v2.png', zoom=(1, 1))

        add(still, CUTS / '05.png', 1.7, (0, .39, .6), (1, 1.02), layer('bench-1', 4, '', bench[0]))
        add(still, CUTS / '05.png', 1.9, (.4, .39, .6), (1, 1.02), layer('bench-2', 4, '', bench[1]))
        add(still, CUTS / '05.png', 1.2, (0, .39, .6), (1.03, 1.05), layer('bench-3', 4, '', bench[2]))
        add(still, CUTS / '05.png', 1.65, (.4, .39, .6), (1.03, 1.05), layer('bench-4', 4, '', bench[3]))
        add(reuse, 39.5, 3.5)  # Only the pen tips move.

        add(still, CUTS / '06.png', 6, zoom=(1.05, 1), layer=layer('leave', 5, scenes[6][0], scenes[6][1]))
        add(reuse, 49, 7)

        playlist = tmp / 'shots.txt'
        playlist.write_text(''.join(f"file '{shot}'\n" for shot in shots))
        staged = tmp / TARGET.name
        length = sum(row[2] for row in scenes) + sum(row[0] for row in bridge.values())
        audio = tmp / 'mix.m4a'
        write_audio(audio, length, [(gate_beep, clock['연결01'] + .15), (sit_thud, clock['연결11'] + .05)])
        ff('-f', 'concat', '-safe', 0, '-i', playlist, '-i', audio, '-map', '0:v', '-map', '1:a',
           '-c', 'copy', '-t', length, '-movflags', '+faststart', staged)
        staged.replace(TARGET)
    print(TARGET)


if __name__ == '__main__':
    main()
