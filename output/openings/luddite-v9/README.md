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
