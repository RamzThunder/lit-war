// Keywords introduce a literary tendency; they are not exclusive classifications.
const freeze = list => Object.freeze(list.map(record => Object.freeze(record)));
export const frequencyRecords = Object.freeze({
  1920: freeze([
    { word: '동인지', description: '뜻이 맞는 문인들이 동인지를 펴내며 근대 문학을 일구어 갑니다.' },
    { word: '사실주의', description: '식민지 현실과 가난한 삶을 있는 그대로 그리려 합니다.' },
    { word: '민족 정서', description: '전통적인 가락과 정서로 민족의 마음을 노래합니다.' },
  ]),
  1930: freeze([
    { word: '도시', description: '근대 도시의 풍경과 삶이 문학의 소재가 됩니다.' },
    { word: '감각', description: '새로운 이미지와 감각적인 표현을 탐색합니다.' },
    { word: '형식 실험', description: '익숙한 서술과 시의 형식을 벗어나는 시도가 나타납니다.' },
  ]),
  1940: freeze([
    { word: '암흑기', description: '일제 말 우리말 사용이 억압되어 작품 발표가 어려워집니다.' },
    { word: '저항', description: '식민지 현실에 굴하지 않으려는 의지와 성찰이 나타납니다.' },
    { word: '광복', description: '해방 이후 새로운 사회와 문학의 방향을 모색합니다.' },
  ]),
  1950: freeze([
    { word: '전쟁', description: '한국 전쟁의 상처가 문학의 중심 소재가 됩니다.' },
    { word: '전후 현실', description: '가난과 혼란 속에서 살아가는 사람들의 모습을 그립니다.' },
    { word: '실존', description: '불안한 시대 속 인간 존재의 의미를 묻습니다.' },
  ]),
});
export const TOLERANCE = 3;
export function createFrequencyRound(era = '1930', random = Math.random) {
  return { type: 'frequency', era, targets: [20 + Math.floor(random() * 16), 65 + Math.floor(random() * 16), 40 + Math.floor(random() * 16)], stage: 0, value: 0, complete: false };
}
export function isTuned(round) {
  return round?.type === 'frequency' && !round.complete && Math.abs(round.value - round.targets[round.stage]) <= TOLERANCE;
}
export function wavePath(value) {
  const cycles = 1 + value / 20;
  return Array.from({ length: 181 }, (_, i) => {
    const x = i * 2;
    const y = 60 - Math.sin(i / 180 * Math.PI * 2 * cycles) * 35;
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
