# 2030 — 공통 세계관 프롤로그 v1

모든 학생에게 교실 TV 또는 설명 PPT에서 함께 보여 주는 2분 무음 영상. 러다이트의 비밀 접선 영상과 별개이며, 두 진영이 생긴 배경을 제삼자 시점으로 전달한다.

- 파일: common-prologue-v1-no-voice.mp4.
- 규격: 120초, 1280×720, 24fps, H.264 MP4.
- 더빙·배경음 없이도 읽을 수 있는 갈무리 자막. 핵심 설명은 33px 이상, 한 화면 최대 두 줄이다.
- 7장의 새 아트워크에 카메라 접근·이동, 계산 흐름, 조명, 불씨, 타이포그래피와 장면 전환을 합성했다. 인물의 전신 동작을 생성한 애니메이션은 아니다.
- 원래 세계관 문서의 배경과 선택한 공통 콘티를 사용했다. 미확정 설정을 추가로 확정하지 않는다.
- 양 진영을 함께 소개하며, 마지막에는 문학 기록실과 게임 제목으로 연결한다.

## 타임라인

| 시간 | 장면 |
|---|---|
| 0~4초 | 2029년, 지적 노동 가치의 붕괴 |
| 4~20초 | 2030년 AGI 등장 / 발전과 멸종이라는 두 전망 |
| 20~36초 | 기업의 AI·기록 독점 / 일자리 상실과 기본소득 |
| 36~48초 | 기업 소유자마저 시스템에서 배제됨 |
| 48~64초 | AGI들의 결합·특이점·HUMAN이라는 이름 |
| 64~80초 | 러다이트의 등장과 데이터센터 동시 공격 |
| 80~96초 | HUMAN의 복구 계산과 보존관 임시 고용 |
| 96~110초 | 보존관의 복원 / 러다이트의 백업·오염 / 두 진영의 입장 |
| 110~120초 | 1910~1980년대 문학 기록실 / 학생에게 넘어오는 임무 |

## 제작과 보존

- 코드: scripts/openings/render-common-prologue.swift.
- 새 아트워크: assets/01-city.png ~ assets/07-corridor.png.
- 두 진영 대비 장면의 서버실·인간 자료실은 ../luddite-v8/assets에서 재사용한다.
- --stills 옵션으로 검증용 정지 프레임을 재출력할 수 있다. 검증 후 PNG 프레임은 보관하지 않는다.
- 게임 화면에 삽입하거나 배포하지 않았다.
- 직전 러다이트 작업 체크포인트는 Git 526e19a이며, 이 공통 영상은 그 이후의 새 작업이다.

## 이미지 생성 프롬프트

built-in image_gen으로 각 장면을 별도 생성했다.

### 01-city

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: A vast near-future city in 2030 at early morning, humans in coats small in foreground looking toward a luminous new computational tower, enormous clean glass structures with cool cyan reflected light, hopeful sunrise struggling against ominous tall shadows. A grounded plausible metropolis rather than flying cars. Grand wide shot, restrained sense of a promised future and unease.

### 02-office

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: An immense office floor of knowledge workers now empty, long rows of desks and powered monitors, abandoned mugs and coats, small personal effects and a single worker silhouette leaving far in the background. Architecture takes over the composition. Cold evening windows, only some desk lamps still lit. The disappearance of human employment conveyed through absence, not explanatory symbols.

### 03-owner

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: A corporate owner in an expensive coat, shown small from behind outside a closed monumental glass security door of their own executive office; inside, an immaculate unoccupied boardroom has become automated server equipment. Physical metal door reader visible at right side, no readable screen text. Their reflection overlaps the glass, conveying that even the person who once owned it is excluded. Cinematic corridor, oppressive low oblique angle, emotionally restrained.

### 04-convergence

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: The birth of a unified artificial intelligence: a cavernous monumental chamber where many distant server towers are linked by countless cold cyan filament streams and physical cables that converge toward one central dark computational monolith. Almost cathedral-like scale, tiny human catwalks emphasize the size. No humanoid AI face, brain icon, globe, maps or flowchart. The union of separate intelligences should feel awesome and unsettling. Center has dark negative space for a separately typeset HUMAN title.

### 05-resistance

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: After coordinated sabotage at a dystopian data-center entrance: damaged steel security shutters, sparks and smoke, emergency red illumination, three anonymous adult resistance figures in practical coats moving away with a small rugged archive drive and a satchel containing worn books. No guns, no visible injuries, no celebration, no superhero poses. The immense server institution looms behind them. Cinematic painterly wide shot, uneasy human resistance rather than a simple villain poster.

### 06-recruitment

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: A dehumanizing temporary-worker hiring hall inside a gigantic automated data center. Several small adult human silhouettes stand at recruitment terminals under towering server walls and a massive impersonal overhead light. In foreground an empty desk with a blank contract sheet and a simple blank access card, angled so they can receive a separate graphic overlay. Cold bureaucracy dressed in ceremonial grandeur, irony and dignity, not slapstick. No readable words on contract or card.

### 07-corridor

Use case: illustration-story. Asset type: cinematic 16:9 key artwork for a Korean dystopian literature game opening, shown on a classroom TV. Mature hand-painted narrative-game concept art with sophisticated atmosphere, tangible material texture, rich chiaroscuro, subtle film grain, desaturated charcoal and teal, restrained warm ivory and red accents. Premium game cinematic, not a diagram, infographic, classroom learning comic or simple flat geometry. Wide composition with lower 18% dark and low-detail for separately composited Korean subtitles. No readable text, lettering, labels, captions, UI boxes, watermark or real company logos. No gore.
Primary scene: A monumental central archive corridor in a future data center, four physically distinct doorways on each side, eight archive rooms in total, vanishing toward a closed central door. Server cabinets and old archival storage coexist, cables along floor, small warm lights behind some doors, cold cyan overhead lighting. A single anonymous human silhouette at the bottom edge looking into the corridor, their next task awaits. No lettering or signs. Strong centered cinematic perspective and spacious dark central region for final title.

