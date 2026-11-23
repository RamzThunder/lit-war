"""Render the three classroom endings on macOS. Requires Swift and ffmpeg."""
import argparse
from guardian_movie import render_movie

from storyboard import read_board

films = read_board()
music_files = {'guardian': 'assets/music/endings/guardian-final-system-message.m4a', 'luddite': 'assets/music/endings/luddite-recovered-data.m4a', 'draw': 'assets/music/endings/draw-the-last-archive.m4a'}
parser = argparse.ArgumentParser()
parser.add_argument('film', nargs='?', choices=['all',*films], default='all')
parser.add_argument('--rough', action='store_true', help='Render draw only with the new still-image bridge to draw-rough.mp4')
args = parser.parse_args()
selection = args.film
if args.rough and selection != 'draw':
    parser.error('--rough requires draw')
for name, scenes in films.items():
    if selection in ("all", name):
        render_movie(name, music_files[name], scenes, rough=args.rough)
