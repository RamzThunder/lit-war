"""Original musical Foley, timed to the common opening's animated cards."""
from array import array
from math import cos, exp, pi, sin
import wave


def write_effects(path):
    rate = 24000
    mix = array('f', [0]) * (rate * 68 * 2)

    def note(at, hz, length, gain, pan=0, glide=0, overtone=.25):
        offset = round(at * rate)
        left = cos((pan + 1) * pi / 4)
        right = sin((pan + 1) * pi / 4)
        for i in range(round(length * rate)):
            t = i / rate
            phase = 2 * pi * (hz * t + glide * t * t / (2 * length))
            env = min(1, t / .003, (length - t) / .012) * exp(-3.8 * t / length)
            value = gain * env * (sin(phase) + overtone * sin(3 * phase))
            j = 2 * (offset + i)
            mix[j] += left * value
            mix[j + 1] += right * value

    # The logo resolves, then chat cards open from left to right.
    for i, pitch in enumerate((660, 825, 990)):
        note(1.55 + .085 * i, pitch, .32, .14)
    for i in range(3):
        note(7.25 + .65*i, 420 + 65*i, .17, .18, (i-1)*.48, 320)
    for i in range(4):
        note(17.5 + .65*i, 860 + 70*i, .10, .19, -.25)
    note(20.04, 1100, .23, .16, .35, 220)

    # Three panels, followed by the converging chips resolving to one seal.
    for i in range(3):
        note(29 + .4*i, 280 + 60*i, .15, .16, (i-1)*.45, -95)
    for i in range(6):
        note(41.2 + .25*i, 400 + 85*i, .18, .12, (-1)**i * (.55-i*.08))
    note(42.4, 990, .42, .18)

    # Brief arcade pickup with a bright metallic tail, followed by two echoes.
    for at, pitch, gain, pan in [(54.04, 1046, .25, -.35), (54.28, 1175, .21, 0), (54.55, 1397, .19, .35)]:
        note(at, pitch, .07, gain, pan, 130, .42)
        note(at + .055, pitch * 1.5, .28, gain * .85, pan, -30, .17)

    # Power relay snap, followed by the falling CRT whine.
    note(67, 240, .065, .55, .08, -130, .65)
    note(67.018, 1750, .36, .30, .08, -1450, .14)

    with wave.open(str(path), 'wb') as output:
        output.setparams((2, 2, rate, 0, 'NONE', ''))
        output.writeframes(array('h', (round(32767 * x) for x in mix)).tobytes())
