#!/bin/sh
# 공통 오프닝 v3로 gugeo.party '개발 중' 카드에 쓸 티저와 전체 보기용 압축본을 만든다.
# 사용법: sh scripts/openings/make-teaser.sh [출력 폴더]
#   기본 출력: output/openings/common-propaganda-v3/teaser/
#   - war-teaser.mp4   카드에서 소리 없이 반복 재생하는 약 40초 하이라이트 (H.264, 720p)
#   - war-full.mp4     '전체 보기' 창에서 재생하는 127초 전체, 소리 있음 (Cloudflare Pages 파일 한도 25MB 아래)
#   진영 오프닝(war-guardian.mp4, war-luddite.mp4)은 public/openings/*.mp4 를 그대로 복사한다.
#   - war-teaser.webp  영상이 뜨기 전 보이는 포스터 (마지막 제목 화면)
# 필요: ffmpeg (brew install ffmpeg), python3 + Pillow (포스터 WebP)
set -eu
cd "$(dirname "$0")/../.."
SRC=output/openings/common-propaganda-v3/common-propaganda-v3-no-voice.mp4
SOUND=output/openings/common-propaganda-v3/common-propaganda-v3-sound.mp4
OUT=${1:-output/openings/common-propaganda-v3/teaser}
mkdir -p "$OUT"

# 잘라 쓸 구간(초): 시작 끝 — 콘티는 docs/영상-3편-콘티와-대사.md 참고
#  1 HUMAN 축하 / 2 2024 채팅창 / 3 AGI가 하나로(HUMAN) / 4 노동에서 해방
#  5 광고 전원 끄기 / 6 보존관 복구·러다이트 원본 보관과 변조 / 7 제목
SEGS="0.5 3.5
11.75 15.75
42 48
54 58.5
63.5 70
105 115.5
120 127"
XF=0.3   # 구간 사이 겹쳐 사라지는 시간(초)

filter="" ; i=0
echo "$SEGS" | while read -r a b; do echo "$a $b"; done > "$OUT/.segs"
n=$(wc -l < "$OUT/.segs" | tr -d ' ')
while read -r a b; do
  filter="$filter[0:v]trim=$a:$b,setpts=PTS-STARTPTS,fps=24,format=yuv420p[s$i];"
  i=$((i+1))
done < "$OUT/.segs"
# xfade 연결: 앞 구간들의 누적 길이에서 XF만큼 겹침
prev="s0"; acc=$(awk 'NR==1{print $2-$1}' "$OUT/.segs")
k=1
while [ $k -lt "$n" ]; do
  len=$(awk -v r=$((k+1)) 'NR==r{print $2-$1}' "$OUT/.segs")
  off=$(awk -v a="$acc" -v x="$XF" 'BEGIN{printf "%.3f", a-x}')
  filter="$filter[$prev][s$k]xfade=transition=fade:duration=$XF:offset=$off[x$k];"
  prev="x$k"; acc=$(awk -v a="$acc" -v l="$len" -v x="$XF" 'BEGIN{printf "%.3f", a+l-x}')
  k=$((k+1))
done
rm -f "$OUT/.segs"
filter=${filter%;}

ffmpeg -v error -y -i "$SRC" -filter_complex "$filter" -map "[$prev]" -an \
  -c:v libx264 -preset slow -crf 20 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "$OUT/war-teaser.mp4"

ffmpeg -v error -y -i "$SOUND" -c:a aac -b:a 128k \
  -c:v libx264 -preset slow -crf 22 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "$OUT/war-full.mp4"

ffmpeg -v error -y -ss 126.5 -i "$SRC" -frames:v 1 "$OUT/.poster.png"
python3 -c "import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=85,method=6)" "$OUT/.poster.png" "$OUT/war-teaser.webp"
rm -f "$OUT/.poster.png"

cp public/openings/guardian.mp4 "$OUT/war-guardian.mp4"
cp public/openings/luddite.mp4 "$OUT/war-luddite.mp4"
ls -l "$OUT"
