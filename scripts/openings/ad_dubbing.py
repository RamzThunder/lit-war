"""Place the numbered CLOVA recordings on the common advertisement timeline."""
from pathlib import Path
import subprocess

# Times include the short leading silence in the source MP3s.
STARTS = (1.5, 7.25, 11.75, 17.1, 23.15, 29.3, 34.1, 40.2, 42.25,
          45.15, 47.174, 51.0, 57.5, 59.7)


def write_dubbing(directory: Path, target: Path):
    inputs, filters, labels = [], [], []
    for number, start in enumerate(STARTS, 1):
        matches = sorted(directory.glob(f'{number:02}_*.mp3'))
        if len(matches) != 1:
            raise ValueError(f'Expected one recording for {number:02} in {directory}: {matches}')
        inputs.extend(['-i', str(matches[0])])
        chain = ['aresample=48000', 'aformat=channel_layouts=mono']
        if number == 8:
            # Cut in the pause after "에이지아이가"; take the rest from 09.
            chain += ['atrim=end=1.718', 'afade=t=out:st=1.706:d=0.012']
        # Keep both takes of “휴먼입니다!” audible, with a slight stereo spread.
        if number == 10:
            chain.append('pan=stereo|c0=c0|c1=0.78*c0')
        elif number == 11:
            chain.append('pan=stereo|c0=0.78*c0|c1=c0')
        else:
            chain.append('pan=stereo|c0=c0|c1=c0')
        chain.append(f'adelay={round(start * 1000)}:all=1')
        label = f'[line{number}]'
        filters.append(f'[{number-1}:a]' + ','.join(chain) + label)
        labels.append(label)
    filters.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,volume=2dB[out]')
    subprocess.run(['ffmpeg', '-v', 'error', *inputs, '-filter_complex', ';'.join(filters),
                    '-map', '[out]', '-c:a', 'pcm_f32le', str(target)], check=True)
