# 이전 오프닝 시안 제작 기록

v1~v7의 대용량 산출물은 용량 정리를 위해 삭제했다. 콘티와 제작 코드는 보존하며, 각 시안의 설명과 이미지 생성 프롬프트를 여기에 모아 둔다.


---

## luddite-teaser-v1

# 러다이트 오프닝 — 20초 시제품

- 완성 영상: `luddite-teaser-v1.mp4` (1280×720, 24fps, H.264/AAC, 20초)
- 목적: 외부 백업 → HUMAN 기록 오염 → 메인 대사의 분위기·템포 확인.
- 음성: macOS Yuna의 한국어 합성 임시 음성. 최종 성우 연기가 아니다.
- 영상: 생성 일러스트 위에 카메라 확대, 기록 전송 진행률, 오염 표시, 한글 자막, 엔딩을 합성.
- 사운드: 직접 합성한 저음 배경과 접속·백업 신호음. 마지막 대사 구간에는 배경음을 비운다.
- 생성 이미지: built-in image_gen 사용. 원본은 `assets/archive-room.png`.
- 재제작 코드: `scripts/openings/render-luddite.swift`, `scripts/openings/make-sound.py`.
- 게임 연결·배포는 하지 않았다. 전체 공통편 및 진영별 완성편과 별개의 시제품이다.

## 타임라인

| 시간 | 장면 |
|---|---|
| 0~1.3초 | 외부 통신 연결 |
| 1.3~6.2초 | 진짜 기록의 외부 백업 |
| 6.2~11.5초 | 외부 백업 보존 / HUMAN 사본 오염 |
| 11.5~17.6초 | 우리가 남길 것은, 누구의 허락도 필요 없는 인간의 기록이야. |
| 17.6~20초 | LUDDITE / 통신 종료 |

## 이미지 생성 프롬프트

Use case: illustration-story. Asset type: cinematic background plate for a 16:9 Korean classroom science-fiction resistance film set in 2030. A secret human resistance archive desk inside a dark concrete maintenance room next to a vast data center. Foreground worn portable archive terminal and a small rugged external storage drive, cables connecting them; behind glass, immense cold cyan server racks stretch into darkness, a few red warning lights. Human traces: handwritten pages and worn literary books on the desk, no people visible. Restrained cinematic anime background painting, detailed hand-painted textures, strong composition, subtle film grain, deep charcoal, desaturated cyan, warm amber light on books, red accent. Camera medium wide, desk at lower left and server racks at right; leave upper central space dark and uncluttered for separately composited titles. Mood: clandestine, intimate, thoughtful resistance, not action spectacle. No readable text, no logos, no lettering, no watermarks. Widescreen landscape 16:9.


---

## luddite-teaser-v2

# 러다이트 오프닝 v2 — 픽셀 단말기

- 20초, 1280×720, 24fps, MP4.
- 갈무리11·갈무리11 Bold를 사용하고, 글자 크기를 픽셀 배수로 맞췄다.
- 스캔라인, 프레임마다 바뀌는 입자·블록 노이즈, 신호 간섭 띠, 단말기 모서리 표시를 추가했다.
- 마지막 대사 구간에는 노이즈 강도를 줄여 읽기 쉽게 유지했다.
- 음성은 v1의 macOS Yuna 임시 음성 그대로다. 새 TTS 음성은 아직 선택하거나 생성하지 않았다.
- 배경 그림 및 음향은 v1 자산을 재사용했다. 생성 도구·원문 프롬프트는 ../luddite-teaser-v1/README.md 참고.
- 렌더러: scripts/openings/render-luddite.swift의 --v2 옵션. 설치된 Galmuri11.ttf와 Galmuri11-Bold.ttf를 사용한다.

## TTS 선택을 위한 연기 지시 초안

한국어를 모국어로 쓰는 성인 저항군 동료. 가까운 거리에서 한 사람에게 비밀을 전하듯 말한다. 차분하고 약간 거친 중저음. 지친 기색은 있지만 확신이 있다. 과장된 영웅 연설이나 광고 성우처럼 읽지 않는다. 마지막 문장은 ‘누구의 허락도 필요 없는’에 조용히 힘을 주고, ‘인간의 기록이야’는 따뜻하고 단단하게 끝낸다. 원본 음성에는 무전기 효과나 잡음을 넣지 않는다. 통신 효과는 영상 편집에서 별도로 더한다.

비교 문장: “우리가 남길 것은, 누구의 허락도 필요 없는 인간의 기록이야.”

후보: Typecast의 한국어 캐릭터·감정 설정, ElevenLabs의 한국어 TTS·Voice Design. 실제 생성 음성을 들어 본 뒤 결정한다.


---

## luddite-v3

# 러다이트 v3 — 무음 접선 오프닝

75초, 1280×720, 24fps, H.264 MP4. 음성·효과음 없이 메시지와 장면만으로 이해하도록 제작했다. 이전 20초 시제품은 보존한다.

## 원래 콘티에서 복원한 내용

| 구간 | 장면 |
|---|---|
| 0~4초 | HUMAN의 정상 기록 단말기 접속 |
| 4~10초 | 외부 메시지가 끼어드는 비밀 접선 |
| 10~21초 | 사람이 쓰고 남긴 기록의 의미 |
| 21~33초 | 문학 기록 카드가 외부 저장소로 이동하고 백업 완료 |
| 33~45초 | 외부 원본은 보존되고 HUMAN 사본만 변조됨 / 독점에 저항하는 명분 |
| 45~57초 | 보존관이 사본을 정화함 / 양 진영의 대립 |
| 57~65초 | 진짜를 알아야 무엇을 바꿀지도 안다는 읽기 임무 |
| 65~73초 | 메인 대사 |
| 73~75초 | LUDDITE / 통신 종료 |

- 작품 정보는 프로젝트의 wiring.js에 있는 김유정 「동백꽃」(1936)을 사용했다.
- 오염은 실제 오답을 제시하지 않고 ‘기록 데이터 변조됨’ 표시와 깨지는 줄로 표현한다.
- 원본과 사본을 두 카드로 나란히 보여 주며, 백업 확보 전에 오염시키지 않는다.
- 갈무리11과 Bold, 픽셀 단말기, 통신 노이즈를 유지했다. 메시지는 정적으로 유지하고 배경 간섭을 약하게 하여 읽을 수 있게 했다.
- 배경: 기존 데이터센터 이미지와 새 손글씨 기록 이미지. 새 이미지 생성은 built-in image_gen 사용.
- 재제작: scripts/openings/render-luddite-v3.swift를 macOS에서 컴파일·실행한다. 설치된 갈무리 폰트가 필요하다.
- 게임 화면 연결·배포는 하지 않았다.

## 새 이미지 생성 프롬프트

Use case: illustration-story. Asset type: widescreen cinematic anime background for a Korean literature resistance game opening set in 2030. Close view of human hands writing with a fountain pen on an old notebook at a worn wooden desk, a few aged Korean literary books stacked beside the notebook, soft amber desk lamp, deep blue shadows, human memories and lived-in warmth, dust motes, subtle hand-painted grain. Show hands only, no face. The writing is indistinct tiny ink strokes, absolutely no readable words or letters. Composition: notebook and hands on right half, left half in spacious deep shadow for separately typeset text. Detailed hand-painted anime background, restrained grounded dystopian mood, no futuristic holograms, no logos, no watermark, no readable text. Wide 16:9 composition.


---

## luddite-v4

# 러다이트 v4 — 통신 탈취 연출

79초, 1280×720, 24fps, 무음 H.264 MP4. v3의 본편은 보존하고 도입부를 10초에서 14초로 늘렸다.

| 시간 | 연출 |
|---|---|
| 0~3초 | 노이즈 없는 HUMAN 정상 접속. 사용자 확인·기록실 배정. |
| 3~4초 | 배정 진행률이 87%에 멈추고 글자·커서가 어긋남. |
| 4~5초 | HUMAN이 ‘비인가 연결 차단 중’ 창을 띄움. |
| 5~5.6초 | ‘그 안내는 무시해.’가 기존 안내문을 덮어씀. |
| 5.6~9.2초 | HUMAN 화면이 밀려나고 붉은 블록 노이즈와 함께 러다이트 표식·이름 등장. |
| 9.2~14초 | 러다이트가 외부 채널을 확보. 잘린 HUMAN 이름·87% 진행률 흔적 위에서 접선 메시지를 보냄. |
| 14~79초 | v3의 인간 기록·백업·오염·보존관·읽기 임무·메인 대사·엔딩. |

표식은 이번 연출을 위한 임시 디자인이다. 끊어진 외곽선 안에 각진 L과 비스듬한 획을 배치했다. SVG 원본은 assets/luddite-mark.svg이며 영상에는 같은 도형을 코드로 그린다. 확정 세계관 로고를 의미하지 않는다.

배경 이미지 두 장은 v3 자산을 재사용했다. 생성 프롬프트는 v3 및 v1 README에 보존돼 있다. 더빙·효과음 없이 화면만으로 침입을 전달한다. 이전 버전은 덮어쓰지 않았다.

제작 코드: scripts/openings/render-luddite-v4.swift. macOS AVFoundation과 설치된 갈무리11·Bold 사용. 게임 연결·배포·커밋은 하지 않았다.


---

## luddite-v5

# 러다이트 v5 — 기계의 저장소에서 인간의 기록으로

79초, 1280×720, 24fps, 무음 MP4. 통신 탈취 도입은 v4 그대로 보존했다.

- 14~25초: 큰 제목·연대 설명·강의식 메시지 박스를 제거했다. 차가운 단말기 화면에서 사람이 글을 쓰는 장면이 드러나고, 접선자의 두 문장만 남는다.
- 25초 이후: HUMAN 아카이브 뒤에는 차가운 서버실, 인간의 외부 저장소 뒤에는 책·종이 자료·백업 단말기가 있는 저항군 은신처가 드러난다.
- 기록 이동 후 인간 쪽 카드는 종이 자료의 색·질감으로 표현한다. 이는 인간의 기록으로 되찾는다는 시각적 상징이며, 백업 방식이 종이로 바뀐다는 새 설정은 아니다.
- 백업·오염·보존관 정화에서도 이 공간 대비를 유지한다. 인간 쪽 원본은 오염되지 않는다.
- v1~v4를 보존한다. 게임 연결·배포는 하지 않았다.

제작 코드: scripts/openings/render-luddite-v5.swift. macOS AVFoundation 및 설치된 갈무리11·Bold를 사용한다.

## 이미지 생성

기존 서버실·손글씨 이미지를 재사용하고, 인간의 자료 보관소를 built-in image_gen으로 새로 생성했다. 원본 파일은 assets/resistance-archive.png.

프롬프트:

Use case: illustration-story. Asset type: cinematic 16:9 anime background for the human resistance LUDDITE in a 2030 Korean literature game. A clandestine underground archive assembled by ordinary humans, warm amber tungsten lamps illuminating shelves densely packed with worn books, paper folders, stitched notebooks, handwritten loose pages, archival boxes, a rough wooden desk with one small rugged backup drive and old terminal half hidden among papers. A subtle red cloth with an abstract broken geometric mark hangs in shadow, no readable text. No people, no faces, no readable lettering. Rich intimate lived-in detail and signs of personal care, hidden safehouse not public library or classroom. Hand-painted cinematic anime background, deep shadows, desaturated browns, amber light and restrained dark red accents, same grounded aesthetic as a dystopian server-room anime. Framing: wide immersive room, books and papers clearly legible as shapes even in a narrow crop of the right half. Avoid infographics, diagrams, captions, holograms, logos with letters, clean corporate furniture, watermarks.


---

## luddite-v6

# 러다이트 v6 — 쓰는 손과 증식하는 차단 창

79초, 1280×720, 24fps. 기존 버전은 모두 보존한다.

- luddite-v6-no-voice.mp4: 완전 무음판.
- luddite-v6-alerts.mp4: 더빙 없이 차단 창 등장에 맞춘 짧은 경고음과 로고 전환의 통신 잡음만 추가.
- 4~5.6초: ‘비인가 연결 차단 중’ 창이 초당 약 23개 속도로 생성돼 최대 29개까지 쌓인다. HUMAN 화면을 덮은 후 러다이트 로고에 밀려난다.
- 14~25초: 손·펜 레이어를 별도로 움직인다. 펜 끝의 움직임과 잉크 획이 생기는 위치를 동기화하고, 한 줄을 쓰면 펜을 들고 다음 줄로 이동한다. 카메라 페이드가 아닌 레이어 애니메이션이다.
- 생성형 비디오 모델로 만든 실사 동작은 아니다. 기존 일러스트에서 배경판과 투명 손 레이어를 생성하고 코드로 합성했다.
- 노트에 쓰이는 문장은 작품 인용이 아닌 이 오프닝의 메인 대사다. 펜의 이동에 맞춰 세 줄이 순서대로 나타난다.
- 서버실과 인간 보관소 대비, 무음으로 읽는 메시지, 마지막 메인 대사는 유지한다.
- 제작 코드: scripts/openings/render-luddite-v6.swift, scripts/openings/make-v6-alerts.py.
- 게임 연결·배포는 하지 않았다.

## 이미지 편집

built-in image_gen 사용. v5의 human-memory.png를 참조해 두 레이어를 만들었다. background는 하단에 놓인 손을 보존하며 펜을 든 손만 제거했고, hand는 투명 PNG다.

### 배경판 프롬프트

Edit target: attached existing anime writing desk background. Make a clean animation background plate. Preserve EXACT camera, 16:9 framing, lamp, books, photos, notebook position, lighting, style and colors. Remove ONLY the upper/right hand that holds the fountain pen, its sleeve, and the pen, reconstructing the notebook and desk underneath. Keep the lower resting left hand exactly as it is. Make the upper-right notebook page mostly blank aged paper so new ink can be animated there, while preserving other page texture and everything else. No new objects or readable lettering. Return the full original composition at same aspect ratio, not a crop.

### 손 레이어 프롬프트

Edit target: attached existing anime writing desk. Extract ONLY the upper right hand holding the black and gold fountain pen, including its wrist and sleeve that exits the right edge. Transparent background. Preserve the pose and style, warm lamp shading, pen and nib completely. Remove EVERYTHING else: no notebook, no desk, no books, no lower resting hand. Keep the extracted writing hand and pen in their exact original position on the same full 16:9 canvas; do not recenter, enlarge, or crop. The nib tip is near 76.3 percent across and 61.6 percent down in the reference. This will be composited directly over an animation background plate. Genuine alpha transparency, no backdrop or shadow card.


---

## luddite-v7

# 러다이트 v7 — 문서 흡수와 파쇄

79초, 1280×720, 24fps. 무음판과 경고음판을 함께 출력한다. 이전 버전은 보존한다.

- 14~25초의 쓰는 손 일러스트 합성을 제거했다.
- 인간의 문서가 컨베이어를 따라 기계에 들어가면 작품명이 기계 화면에 포착되고, 종이는 아래로 파쇄되어 떨어지는 상징적 장면을 코드 애니메이션으로 제작했다.
- HUMAN이 정보는 취하고 인간이 남긴 물질적 흔적은 폐기하는 모습을 표현한 연출 제안이다. HUMAN이 실제로 모든 종이를 파쇄한다는 세계관 사실을 별도로 확정하지 않는다.
- 감성적 그림과 페이드 대신 문서 이동·롤러·스캔선·파쇄 조각을 움직인다. 더빙 없이도 읽히는 기존 대사는 유지했다.
- 차단 창 위치와 크기는 독립적인 고정 시드 난수로 정한다. 일정 간격의 대각선 배열과 같은 정형적인 증식을 제거했다.
- 이후 읽기 임무에서도 글 쓰는 삽화 대신 러다이트 자료 보관소 배경을 쓴다.
- 이번 장면은 CoreGraphics의 도형·타이포그래피로 제작했으며 새 이미지 생성은 사용하지 않았다.
- scripts/openings/render-luddite-v7.swift로 재출력한다. 경고음은 v6의 직접 합성한 음향을 재사용한다.
- 게임 연결·배포는 하지 않았다.
