"""Render the three classroom endings on macOS. Requires Swift and ffmpeg."""
import argparse
from guardian_movie import render_movie

from storyboard import read_board

films = read_board()
music_files = {'guardian': 'Gudian Ending - Final System Message.m4a', 'luddite': 'Luddite Ending - Recovered Data.m4a', 'draw': 'Draw Ending - The Last Archive.m4a'}
parser = argparse.ArgumentParser()
parser.add_argument('film', nargs='?', choices=['all',*films], default='all')
selection = parser.parse_args().film
for name, scenes in films.items():
    if selection in ("all", name):
        render_movie(name, music_files[name], scenes)
