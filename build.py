#!/usr/bin/env python3
"""src/ 의 화면 파일을 dist/ 로 만듭니다.
사용법:  python3 build.py   →  dist/game/index.html (학생), dist/tv/index.html (교실 TV)
<script src="x.js"></script> 는 파일 내용으로 바꿔 넣어 HTML 한 장으로 만듭니다.
"""
import os, re
ROOT = os.path.dirname(os.path.abspath(__file__))
def read(p): return open(os.path.join(ROOT, p), encoding="utf-8").read()
def inline(html):
    return re.sub(r'<script src="([^"]+)"></script>',
                  lambda m: "<script>\n" + read("src/" + m.group(1)) + "\n</script>", html)
for name in ("game", "tv"):
    out = os.path.join(ROOT, "dist", name, "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(inline(read(f"src/{name}.html")))
    print("  만듦:", os.path.relpath(out, ROOT))
