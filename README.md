# 현대문학사 점령전 (lit-war)

[구거](https://gugeo.party)의 수업 활동. 큰 맵을 돌아다니며 현대문학사 구역을 점령하는 실시간 교실 게임입니다. (핵심 방식은 정하는 중)

- 학생: https://war.gugeo.party/game/
- 교실 TV: https://war.gugeo.party/tv/

## 만들기
```
python3 build.py     # src/ → dist/game/index.html, dist/tv/index.html
```
`src/`를 고치고 빌드한 뒤 `dist/`까지 커밋합니다. Cloudflare Pages가 `main`의 `dist/`를 그대로 내보냅니다 (빌드 명령 없음, 출력 폴더 `dist`).

## Firebase
방탈출(censor-escape)과 같은 프로젝트 `gugeo-c23ae`를 쓰고, 데이터는 `war/` 아래에 둡니다. 보안 규칙은 프로젝트에 하나뿐이라 두 게임의 규칙을 한곳에서 같이 관리해야 합니다.
