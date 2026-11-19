# 현재 영상 결과물

- [공통 v3](openings/common-propaganda-v3/common-propaganda-v3-no-voice.mp4): 128초, 무음.
- [보존관 v1](openings/guardian-v1/guardian-v1-no-voice.mp4): 83초, 무음.
- [러다이트 픽셀 v12](openings/luddite-pixel-v12/luddite-pixel-v12.mp4): 79초, 무음.

**대사·상세 연출은 [최신 3편 통합 콘티](../docs/영상-3편-콘티와-대사.md) 한 곳에서만 수정한다.**
재제작: `python3 scripts/openings/storyboard.py render guardian` (대상: `common`, `guardian`, `luddite`, `all`).
기존 MP4는 문서 저장만으로 바뀌지 않는다. 연출·시간 변경에는 제작 코드 수정이 필요하다.

제작 원본은 `assets/openings/`, 코드는 `scripts/openings/`에 있다.
`luddite-v10`, `luddite-pixel-v11`, processing 영상은 이전 버전·부분 렌더이며 최신 편집 대상이 아니다.
티저와 전체 압축본은 `common-propaganda-v3/teaser/`에 있으며, 공통편 재렌더링 후 `sh scripts/openings/make-teaser.sh`로 갱신한다.
이전 콘티는 `docs/archive/openings/`에 보관하며 수정하지 않는다.
