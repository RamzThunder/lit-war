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


# 2026-11-19 산출물 폴더 정리

아래는 정리 전 README의 제작 당시 기록이다. 이전 MP4와 검수 프레임은 삭제했으며, 원본 자산은 `assets/openings/<기존 폴더명>/`으로 이동했다. 현재 결과물은 `output/README.md`를 참고한다.

---

## record-extraction-test-v1

# 기록 추출·파쇄 테스트 v1

8초, 1280×720, 24fps, 무음 MP4. 기존 컨베이어 움직임 테스트와 별개로 한 장의 문서가 처리되는 사건을 확인한다. 전체 오프닝에는 아직 반영하지 않았다.

- 한 장만 벨트와 같은 속도로 이동한다.
- 스캔선을 지난 부분은 글씨 있는 원고에서 빈 종이로 바뀐다.
- 종이의 앞부분이 좁아지며 흡입구 경계 뒤로 가려진다.
- 스캔 시점부터 청록빛 글자 흔적이 서버 방향으로 올라간다. 실제 작품의 인용문이 아닌 ‘기억·기록·이야기·문학·사람’이라는 상징적 단어다.
- 파쇄 조각은 종이가 물려 들어간 이후에만 나오고, 빈 종이 질감을 사용한다.
- 카메라는 천천히 흡입구 쪽으로 접근한다. 더빙·설명 자막·화살표는 없다.
- 기계·벨트·원고의 공용 자산은 ../conveyor-motion-test-v1/assets/를 직접 재사용해 중복 저장을 줄였다.
- 제작 코드: scripts/openings/render-record-extraction-test.swift.
- 게임 연결·배포는 하지 않았다.

## 이미지 편집

built-in image_gen으로 기존 원고의 글씨만 지운 투명 PNG를 만들었다. assets/blank-page.png에 저장했다.

프롬프트:

Edit target: existing transparent aged manuscript page sprite. Make the identical page but remove all handwritten ink marks, leaving blank aged ivory fibrous paper. Preserve EXACT canvas size and aspect ratio, page silhouette, fold, curl, torn edges, perspective, paper texture, warm lighting, teal edge shading, red reflected edge and alpha transparency. Do not move, resize, recenter, or crop the page. Remove only the writing, reconstructing natural blank paper texture underneath. No new text, no watermark. Genuine transparent background.

---

## luddite-v8

# 러다이트 v8 — HUMAN 아트워크

79초, 1280×720, 24fps. 무음판 및 경고음판. v1~v7의 대용량 산출물은 이후 용량 정리로 삭제했고, 콘티·제작 코드·프롬프트 기록은 보존했다.

- 단순 도형으로 그렸던 기계를 제거하고, 문학 기록을 흡수하는 거대한 산업 서버 구조물의 아트워크를 새로 생성했다.
- 기계 표면·조명·깊이·종이 질감을 이미지 자체에서 표현한다. 문서와 파쇄 조각도 별도로 생성한 종이 아트워크를 영상 레이어로 사용한다.
- 움직임: 느린 카메라 접근, 흡입구로 이동하는 원고, 맥동하는 스캔광, 낙하하는 종이 파편과 먼지.
- 생성형 비디오 모델이 아니라 생성한 아트워크와 영상 합성 방식이다.
- 불규칙한 위치·크기의 차단 창, 러다이트 표식, 무음 메시지, 후반 기록 반출 장면은 유지한다.
- 제작: scripts/openings/render-luddite-v8.swift. macOS AVFoundation 및 설치된 갈무리11·Bold 사용.
- 게임 연결·배포는 하지 않았다.

## 이미지 생성

built-in image_gen 사용. 원본은 assets/human-consumes-records.png 및 assets/manuscript-page.png.

### 기계 아트워크 프롬프트

Use case: stylized-concept. Asset type: finished cinematic game key artwork and animation background, landscape 16:9. Create a premium dark dystopian science fiction illustration of an enormous archival intelligence consuming humanity's books and manuscripts. It is an immense brutalist server-machine integrated into a cavernous archive, NOT a household paper shredder, NOT an infographic. Camera low oblique cinematic wide shot. Machine occupies right 55%, with intricate blackened steel, scratched metal, cables, industrial ribs and massive intake rollers. A narrow red scanning light inside its dark intake at about x=74%, y=49%; ethereal cold cyan traces representing stolen information ascend into its server towers. Worn cream manuscripts and pages approach from lower left into the intake; below the machine, fine shredded paper and inked scraps pour into a deep shadowed pit. The paper is the only warm color, tiny fragile human marks against oppressive machinery. Mature hand-painted AAA narrative game concept art, expressive painterly texture, sophisticated atmospheric depth, chiaroscuro, subtle film grain, tangible material detail, restrained charcoal steel and desaturated teal with a single blood-red scanner. Composition is dramatic and symbolic, readable silhouette, not busy everywhere; bottom 20% and upper left should remain dark negative space for separately typeset subtitles. No characters or faces. No readable text, no labels, no captions, no arrows, no UI panels, no logos, no watermark. Absolutely no flat vector boxes, primitive geometry, clip art, slide design, classroom educational illustration, cute anime or glossy plastic.

### 종이 레이어 프롬프트

Use case: illustration-story. Asset type: transparent animation sprite for a premium dark dystopian game cinematic. A single aged ivory manuscript page, thin fibrous paper, torn irregular corners, subtle folds and creases, scattered tiny unreadable dark handwritten ink traces, elegant textured painterly realism. Page is slightly curled and foreshortened in an oblique perspective as if gently drawn into a machine toward the upper right. Warm ivory paper with desaturated teal edge shadows and a restrained dim red reflected edge. Entire page visible, isolated on genuine transparent background with generous transparent margin, no backdrop and no external cast shadow. No readable words, no text labels, no icons, no watermark. Render rich material detail matching mature hand-painted narrative-game concept art. Single object, not a sprite sheet.

---

## luddite-v9

# 러다이트 전체 오프닝 v9

79초, 1280×720, 24fps, H.264 MP4. 무음판 luddite-v9-no-voice.mp4와 경고음판 luddite-v9-alerts.mp4를 제공한다. 더빙은 없다.

## 이번 변경

전체 오프닝의 14~25초에 문서 이송 → 스캔 → 0·1 변환 → 서버 저장 → 파쇄를 연결했다.

- 약 14~16초: 원고가 벨트를 따라 이동하고 스캔 위치에서 멈춘다.
- 약 16.2~18초: 붉은 스캔선이 원고를 훑으며 글씨가 사라진다.
- 약 16.3~20.4초: 작은 0·1만으로 된 흐름이 서버로 향한다.
- 약 17.7~21.5초: 카메라가 서버 군집을 크게 잡는다. 서버는 처음 어둡고, 실제 아트워크의 청록빛 조명이 아래부터 차례로 켜진다.
- 약 20.4~21.5초: 저장이 완료된 밝은 서버를 유지해 보여준다.
- 약 21.5초: 종이 쪽으로 돌아온다. 빈 종이는 아직 온전하다.
- 약 21.8초 이후: 벨트·롤러 재가동.
- 약 22.45초 이후: 처음으로 파쇄 조각이 나온다.

이전의 작은 가짜 표시등 막대는 제거했다. 켜진 원본 아트워크와 조명을 끈 편집 아트워크를 정렬해, 실제 서버 조명이 전환되도록 합성했다.

통신 탈취·불규칙한 차단 창·러다이트 표식·외부 백업과 오염·보존관의 복구·메인 대사 등 나머지 흐름은 v8에서 유지했다. 생성형 비디오 모델이 아닌, 아트워크와 CoreImage 영상 합성이다.

## 자산과 제작

- 제작 코드: scripts/openings/render-luddite-v9.swift.
- v8/assets, conveyor-motion-test-v1/assets, record-extraction-test-v1/assets를 직접 재사용해 원본 이미지 중복을 줄였다. 이 공용 자산 폴더는 삭제하면 안 된다.
- 새로 편집한 원본만 assets/server-dark-plate.png에 저장했다.
- --stills 옵션으로 서버 전후·파쇄 순서 확인용 정지 프레임을 출력할 수 있다.
- 게임 연결·배포·커밋은 하지 않았다.

## 서버 조명 배경 편집 프롬프트

built-in image_gen으로 conveyor-motion-test-v1/assets/machine-clean-plate.png를 편집했다.

Edit this exact cinematic server/shredder artwork into a powered-off server lighting plate for animation. Preserve the EXACT composition, camera, geometry, all machinery, empty conveyor, rollers, red scanner light, concrete archive and material detail. ONLY change the upper server-tower cluster: turn OFF all the cyan/teal status lights and luminous cyan data strands in the upper half of the image on the right (server cluster roughly x 52%-100%, y 0%-33%). Those racks should remain visible as unlit dark steel hardware in ambient low light, with no cyan glow. The lower machine and red scanner remain exactly as original. No changes outside this lighting region. No new objects, no text, no logo. Same full image aspect ratio and framing. This dark plate will crossfade back to the original powered-on artwork row by row, so alignment must stay exact.

---

## common-prologue-v2

# 공통 프롤로그 v2 — 얼굴 비노출

120초 / 1280×720 / 24fps / H.264 / 무음. 교실 TV·교사 설명용 공통 영상.

## 변경

- 도시: 전경 인물을 완전한 뒷모습으로 전환.
- 소유자: 유리 속 얼굴 반사를 건축·서버실 반사로 교체.
- 러다이트: 세 인물을 뒷모습으로 전환. 붉은 스카프·드라이브·책 가방 보존.
- 채용 홀: 인간 흉상을 추상적인 서버 기념비로 교체. 근로자는 뒷모습·먼 실루엣.
- 구성·자막·타이밍·카메라 움직임은 v1을 유지. v1 원본 보존.

제작 원칙: `docs/ART_DIRECTION.md`. 수정한 네 PNG만 이 폴더에 저장한다. 나머지 세 장면은 common-prologue-v1/assets, 두 진영 자료실은 luddite-v8/assets를 재사용하므로 해당 폴더를 삭제하지 않는다.

## 이미지 편집 출처

내장 image_gen으로 v1 원본을 개별 편집했다. 공통 지시: 얼굴·옆얼굴·반사상·조각상·배경 인물의 얼굴을 노출하지 않고, 흐림·검열·마스크 대신 자연스러운 뒷모습이나 특징 없는 먼 실루엣을 사용한다. 기존 회화적 게임 아트, 구도, 색채, 조명, 건축과 재질을 유지한다. 읽을 수 있는 글자·워터마크는 넣지 않는다.

장면별 편집 지시는 위 변경 사항에 해당한다. 생성 결과 ID:

- 01-city: exec-ce18c023-a318-4f12-8ed0-382f4be506ca
- 03-owner: exec-6456dc9b-af5a-4cda-a964-2fb2eee5cc74
- 05-resistance: exec-ece3fc60-e617-46fa-8214-b2f11736e538
- 06-recruitment: exec-e09de24d-1e59-478e-8270-753e0605f4e5

## 재출력

저장소 루트에서 `scripts/openings/render-common-prologue-v2.swift`를 Swift로 컴파일하고 실행한다. `--stills`는 검수용 정지 화면만 출력한다. macOS AVFoundation·CoreGraphics·Galmuri11/Bold를 사용한다.

---

## conveyor-motion-test-v1

# 컨베이어·롤러 움직임 테스트 v1

8초, 1280×720, 24fps, 무음 MP4. 전체 오프닝에 넣기 전 움직임만 확인하는 별도 테스트다. 기존 v8은 보존한다.

- 고정 카메라와 기계 본체. 자막이나 페이드로 움직임을 대신하지 않는다.
- 기존 HUMAN 아트워크에서 종이와 파편을 걷어낸 배경판을 이미지 편집으로 만들었다.
- 별도 생성한 벨트 표면을 반복 이동시킨 뒤, 원근 사각형으로 투영한다. 주변 금속 프레임은 고정한다.
- 종이도 벨트와 동일한 UV 공간·속도로 이동한다. 끝 경계에서 가려져 기계 안으로 들어간다.
- 롤러는 보이는 금속 표면을 아주 작게 순환 변위시킨다. 큰 원통 변위는 금속 형태를 일그러뜨려 제외했다. 완전한 3D 회전이 아닌 절제된 표면 움직임 테스트다.
- 작은 파쇄 조각은 아래로 낙하한다.
- 제작 코드: scripts/openings/render-conveyor-test.swift. macOS CoreImage·AVFoundation 사용.
- 게임 연결·배포·전체 영상 교체는 하지 않았다.

## 이미지 생성·편집

built-in image_gen 사용. v8의 human-consumes-records.png를 편집해 machine-clean-plate.png를 만들었다. belt-texture.png는 새로 생성했다. manuscript-page.png는 v8에서 재사용한다.

### 배경판 편집 프롬프트

Edit this exact existing cinematic artwork into an animation clean plate. Preserve exact composition, camera, machine, rollers, architectural details, red scanner, cold cyan servers, lighting, palette, and canvas aspect ratio. Remove the loose manuscript pages and books resting on the conveyor belt, so its dark worn industrial belt surface is exposed from lower-left foreground to the intake rollers. Remove the suspended falling shredded paper below the rollers, reconstructing the dark pit behind. Remove floating airborne sheets too. Do not change the conveyor's fixed metal frame or the machine itself. The result is the same artwork with an EMPTY conveyor and no paper particles, for adding separately animated paper. No new text, no logos, no captions, no diagram geometry.

### 벨트 표면 프롬프트

Use case: productivity-visual. Asset type: seamless repeating surface texture for an animated industrial conveyor belt in premium dark painterly science fiction game artwork. Flat orthographic top-down material sample of worn nearly black graphite conveyor rubber with subtle horizontal metal reinforcement joins, delicate scratches, dusty fibers and restrained cool teal reflections. Rich realistic painted material detail, dark low contrast. Parallel belt travel goes horizontally LEFT TO RIGHT across this rectangular texture; crosswise reinforcement joins run vertically. Seamless repeat left to right; matching edges; even flat lighting, no vignetting or perspective, no visible belt edges, no background scenery, no objects, no paper, no letters, no logo, no watermark. Not an illustration of a whole conveyor. Texture fills entire image.

---

## record-extraction-test-v2

# 기록 추출 테스트 v2 — 0·1 변환 → 서버 저장 → 파쇄

10초, 1280×720, 24fps, 무음 MP4. ‘기억·문학’ 같은 단어를 띄우던 이전 테스트를 대체하는 방향이다. 기존 파일은 덮어쓰지 않는다.

| 시간 | 사건 |
|---|---|
| 0~2초 | 원고 한 장이 벨트를 따라 스캔 위치로 이동 |
| 2~4초 | 벨트와 종이가 멈춘 상태에서 붉은 스캔선이 글씨를 훑고 빈 종이로 전환 |
| 2.3~5.8초 | 작은 0과 1만으로 된 데이터 흐름이 서버로 이동 |
| 4.1~6초 | 데이터 도착에 따라 서버 표시등 점등 |
| 6~6.9초 | 표시등이 안정적으로 켜진 상태 유지 / 저장 완료 암시 |
| 6.9~7초 | 온전한 빈 종이가 대기 중인 흡입구로 컷 전환 |
| 7초 이후 | 벨트·롤러 재가동, 종이가 흡입구로 들어감 |
| 7.65초 이후 | 처음으로 파쇄 조각이 아래로 낙하 |

- 서버 저장 전에 종이가 파쇄되지 않게 물리적 이송·롤러·파편의 시작 시점을 분리했다.
- 큰 단어·설명 자막·완료 팝업·화살표 없이 작은 이진 숫자와 서버 조명으로 전달한다.
- 그림과 종이는 컨베이어 테스트 자산을, 빈 종이는 record-extraction-test-v1/assets/blank-page.png를 직접 재사용한다. 이번 버전에는 이미지 생성 비용이나 자산 중복이 없다.
- 제작 코드: scripts/openings/render-record-extraction-v2.swift.
- 전체 오프닝 삽입·배포는 하지 않았다.

---

## common-prologue-v1

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
