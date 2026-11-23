"""Add HUMAN's emergency lockdown alarm to the rough draw ending."""
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import wave

import numpy as np

from storyboard import read_board

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'output/endings/draw-rough.mp4'
TARGET = ROOT / 'output/endings/draw-rough-alarm.mp4'
MUSIC = ROOT / 'assets/music/endings/draw-the-last-archive.m4a'

RATE = 48000
BRIDGE = 7.0         # Length of the rough 04-03 bridge.
SCENES = read_board()['draw']
LENGTH = sum(row[2] for row in SCENES) + BRIDGE
ALARM_START = sum(row[2] for row in SCENES[:3])  # The warning card appears.
ALARM_END = ALARM_START + SCENES[3][2]           # The dialogue cut begins.
DOOR_SHUT = ALARM_START + 1.92                   # The doors meet on screen.
_warning = SCENES[3][1].split('|')
DENIED = ALARM_START + SCENES[3][2] * len(_warning[0]) / sum(map(len, _warning))  # "양측 접근 차단" appears.
MUSIC_LOW = 0.58     # A soft dip: the score keeps playing under the alarm.
MUSIC_DIP = 0.7
MUSIC_BACK = 2.0


def harsh(phase):
    return np.tanh(2.4 * (np.sin(phase) + .4 * np.sin(3 * phase) + .2 * np.sin(5 * phase)))


def add(mix, at, sound, pan=0.0):
    start = round(at * RATE)
    sound = sound[:max(0, len(mix) - start)]
    angle = (pan + 1) * np.pi / 4
    mix[start:start + len(sound), 0] += np.cos(angle) * sound
    mix[start:start + len(sound), 1] += np.sin(angle) * sound


def edges(sound, attack=.004, release=.012):
    rise, fall = round(attack * RATE), round(release * RATE)
    sound[:rise] *= np.linspace(0, 1, rise)
    sound[-fall:] *= np.linspace(1, 0, fall)
    return sound


def siren(mix):
    step = .31
    for index in range(int((DENIED - ALARM_START) / step)):
        hz = 880 if index % 2 == 0 else 622
        t = np.arange(round((step - .012) * RATE)) / RATE
        tone = harsh(2 * np.pi * hz * t) + .35 * harsh(2 * np.pi * hz * 1.012 * t)
        add(mix, ALARM_START + index * step, edges(.22 * tone, .012, .03), -.28 if index % 2 == 0 else .28)


def door(mix, rng):
    length = DOOR_SHUT - ALARM_START
    t = np.arange(round(length * RATE)) / RATE
    rumble = np.sin(2 * np.pi * 46 * t) + .6 * np.sin(2 * np.pi * 71 * t)
    grit = np.convolve(rng.normal(0, 1, len(t)), np.ones(90) / 90, 'same') * 4
    add(mix, ALARM_START, edges(.12 * (rumble + grit) * (.45 + .55 * t / length), .08, .02))

    t = np.arange(round(1.25 * RATE)) / RATE
    hit = np.sin(2 * np.pi * (58 - 14 * t) * t) * np.exp(-5 * t)
    metal = sum(np.sin(2 * np.pi * hz * t) * np.exp(-rate * t)
                for hz, rate in ((317, 11), (743, 17), (1289, 25)))
    crack = rng.normal(0, 1, len(t)) * np.exp(-70 * t)
    add(mix, DOOR_SHUT, edges(.62 * hit + .055 * metal + .16 * crack, .001, .05))


def denied(mix, rng):
    t = np.arange(round(.16 * RATE)) / RATE
    clunk = np.sin(2 * np.pi * 150 * t) * np.exp(-30 * t) + .25 * rng.normal(0, 1, len(t)) * np.exp(-110 * t)
    add(mix, DENIED, edges(.42 * clunk, .001, .02))
    for index in range(3):
        t = np.arange(round(.36 * RATE)) / RATE
        buzz = harsh(2 * np.pi * 196 * t) + .5 * harsh(2 * np.pi * 392 * t)
        add(mix, DENIED + .12 + index * .6, edges(.25 * buzz, .012, .04))


def write_wave(path, mix):
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(pcm.tobytes())


def gate_beep(mix, at):
    """A short refusal from the locked door."""
    for index in range(2):
        t = np.arange(round(.13 * RATE)) / RATE
        add(mix, at + index * .19, edges(.09 * harsh(2 * np.pi * 330 * t), .006, .03))


def sit_thud(mix, at):
    """Someone drops onto the metal bench."""
    t = np.arange(round(.42 * RATE)) / RATE
    body = np.sin(2 * np.pi * (92 - 30 * t) * t) * np.exp(-13 * t)
    ring = np.sin(2 * np.pi * 410 * t) * np.exp(-24 * t)
    add(mix, at, edges(.34 * body + .035 * ring, .002, .04), .45)


def write_audio(target, length=LENGTH, cues=()):
    """Mix the score, the lockdown alarm, and any later one-shot cues."""
    rng = np.random.default_rng(2030)
    mix = np.zeros((round(length * RATE), 2))
    siren(mix)
    door(mix, rng)
    denied(mix, rng)
    for cue, at in cues:
        cue(mix, at)
    fade = length - 9  # The score ends before the black card and closing lines.
    duck = (f"volume='if(lt(t,{ALARM_START - MUSIC_DIP}),1,"
            f"if(lt(t,{ALARM_START}),1-(t-{ALARM_START - MUSIC_DIP})/{MUSIC_DIP}*{1 - MUSIC_LOW},"
            f"if(lt(t,{ALARM_END - .4}),{MUSIC_LOW},"
            f"if(lt(t,{ALARM_END - .4 + MUSIC_BACK}),{MUSIC_LOW}+(t-{ALARM_END - .4})/{MUSIC_BACK}*{1 - MUSIC_LOW},1))))':eval=frame")
    graph = (f'[0:a]aresample={RATE},afade=in:d=1,afade=out:st={fade}:d=2,apad,atrim=duration={length},{duck}[music];'
             '[music][1:a]amix=inputs=2:duration=first:normalize=0,'
             'alimiter=limit=0.9:level=0:latency=1,aresample=48000[out]')
    with TemporaryDirectory(dir=Path(target).parent) as directory:
        effects = Path(directory) / 'alarm.wav'
        write_wave(effects, mix)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(MUSIC), '-i', str(effects),
                        '-filter_complex', graph, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k',
                        '-t', str(length), str(target)], check=True)


def main():
    with TemporaryDirectory(dir=TARGET.parent) as directory:
        audio = Path(directory) / 'mix.m4a'
        staged = Path(directory) / TARGET.name
        write_audio(audio)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SOURCE), '-i', str(audio),
                        '-map', '0:v:0', '-map', '1:a', '-c', 'copy', '-t', str(LENGTH),
                        '-movflags', '+faststart', str(staged)], check=True)
        staged.replace(TARGET)
    print(TARGET)


if __name__ == '__main__':
    main()
