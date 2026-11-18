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
