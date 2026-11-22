"""Validate or render the three current openings from the single editable storyboard."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
DOCUMENT = ROOT / 'docs/영상-3편-콘티와-대사.md'
FILMS = {
    'common': ('C', 'render-common-propaganda-v3.swift', 'common-propaganda-v3', 'common-propaganda-v3-no-voice.mp4', 127),
    'guardian': ('G', 'render-guardian-v1.swift', 'guardian-v1', 'guardian-v1-no-voice.mp4', 83),
    'luddite': ('L', 'render-luddite-pixel-v12.swift', 'luddite-pixel-v12', 'luddite-pixel-v12.mp4', 79),
}
ENTRY = re.compile(r'^- \*\*([CGL]\d{3})\*\*: (.+)$')


def parse_document(content: str) -> dict[str, str]:
    entries = {}
    for number, line in enumerate(content.splitlines(), 1):
        match = ENTRY.fullmatch(line)
        if match:
            key, value = match.groups()
            if key in entries:
                raise ValueError(f'{number}행: 중복 식별자 {key}')
            if not value.strip():
                raise ValueError(f'{number}행: 빈 문구 {key}')
            entries[key] = value
        elif re.match(r'^\s*-\s+\*\*[CGL]\d', line):
            raise ValueError(f'{number}행: 문구 형식 오류. - **C001**: 문구 형식을 사용하세요.')
    return entries


def required_ids() -> set[str]:
    ids = set()
    for _, source, *_ in FILMS.values():
        code = (ROOT / 'scripts/openings' / source).read_text()
        ids.update(re.findall(r'scriptText\("([CGL]\d{3})"\)', code))
    return ids


def validate(document: Path = DOCUMENT) -> dict[str, str]:
    entries = parse_document(document.read_text())
    missing, extra = required_ids() - entries.keys(), entries.keys() - required_ids()
    if missing or extra:
        raise ValueError(f'제작 코드와 식별자가 다릅니다. 누락: {sorted(missing)}, 미사용: {sorted(extra)}')
    return entries


def run_film(name: str, document: Path, preview_at: float | None = None) -> Path:
    _, source, folder, filename, duration = FILMS[name]
    if preview_at is not None and not 0 <= preview_at < duration:
        raise ValueError(f'{name}: 프레임 시간은 0 이상 {duration}초 미만이어야 합니다.')
    destination = ROOT / 'output/openings' / folder
    # Keep the existing MP4 intact if compilation, layout checks, or encoding fails.
    with TemporaryDirectory(prefix='opening-render-') as temporary:
        env = dict(os.environ, OPENING_STORYBOARD=str(document), OPENING_OUTPUT_DIR=temporary)
        command = ['swift', '-module-cache-path', '/private/tmp/lit-war-swift-cache',
                   str(ROOT / 'scripts/openings' / source)]
        if preview_at is not None:
            command += ['--preview-at', str(preview_at)]
        subprocess.run(command, cwd=ROOT, env=env, check=True)
        if preview_at is None:
            result = Path(temporary) / filename
            destination.mkdir(parents=True, exist_ok=True)
            target = destination / filename
        else:
            result = Path(temporary) / 'preview.png'
            target = Path('/private/tmp') / f'opening-{name}-{preview_at:g}.png'
        # Temp can be on another filesystem: copy beside the destination then replace.
        import shutil
        import tempfile
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.opening-', delete=False) as staged:
            staged_path = Path(staged.name)
        try:
            shutil.copyfile(result, staged_path)
            os.replace(staged_path, target)
        finally:
            staged_path.unlink(missing_ok=True)
        return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'render', 'preview'])
    parser.add_argument('film', nargs='?', choices=[*FILMS, 'all'])
    parser.add_argument('--document', type=Path, default=DOCUMENT, help='검증용 별도 원고 (보통 지정 불필요)')
    parser.add_argument('--at', type=float, help='미리 볼 시점(초)')
    args = parser.parse_args()
    try:
        entries = validate(args.document)
        print(f'원본 검증 완료: {len(entries)}개 문구 / 최신 영상 3편', flush=True)
        if args.action == 'check':
            return
        if not args.film:
            parser.error('render/preview에는 common, guardian, luddite 또는 all을 지정하세요.')
        if args.action == 'preview' and args.at is None:
            parser.error('preview에는 --at 초를 지정하세요.')
        for film in FILMS if args.film == 'all' else [args.film]:
            print(run_film(film, args.document.resolve(), args.at if args.action == 'preview' else None))
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'실패: {error}\n')


if __name__ == '__main__':
    main()
