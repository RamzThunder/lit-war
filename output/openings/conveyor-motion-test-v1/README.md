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
