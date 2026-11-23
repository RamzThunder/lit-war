"""Read the teacher's Markdown editing tables, in playback order."""
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2] / 'docs/엔딩-콘티.md'
SECTIONS = {'보존관 승리': 'guardian', '러다이트 승리': 'luddite', '접전': 'draw', '공통 마지막 문구': 'common'}

def read_board():
    groups = {key: [] for key in SECTIONS.values()}
    group = None
    for number, line in enumerate(SOURCE.read_text().splitlines(), 1):
        if line.startswith('## '):
            group = SECTIONS.get(line[3:].strip())
        if not group or not line.startswith('|') or line.startswith(('| 컷 |','|---')):
            continue
        try:
            key, seconds, direction, title, caption = (x.strip() for x in line.strip().strip('|').split('|'))
            duration = int(seconds) if group != 'common' else 0
            if group != 'common' and duration <= 0:
                raise ValueError
        except ValueError:
            raise ValueError(f'{SOURCE.name} {number}행: 열 5개와 양의 정수 초를 확인하세요.') from None
        groups[group].append((key, duration, title, caption.replace('<br>', '|')))
    if [r[0] for r in groups['common']] != ['공통']:
        raise ValueError('공통 마지막 문구 행을 확인하세요.')
    closing = groups.pop('common')[0][3]
    films = {}
    for film, rows in groups.items():
        keys = (['무승부'] if film == 'draw' else ['승리']) + ['01','02','03','04','05'] + (['06'] if film == 'draw' else []) + ['암전','마지막','엔딩명']
        if [r[0] for r in rows] != keys:
            raise ValueError(f'{film}: 컷 순서 {keys}를 확인하세요.')
        films[film] = [(title, closing if key=='마지막' else body, sec) for key,sec,title,body in rows]
    return films
