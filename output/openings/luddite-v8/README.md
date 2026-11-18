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
