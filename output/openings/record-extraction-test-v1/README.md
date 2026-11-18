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
