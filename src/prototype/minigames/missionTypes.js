import { frequencyRecords } from './frequency.js';
import { wiringRecords, ERAS, shuffle } from './wiring.js';
import { createExtraRound, EXTRA_TYPES } from './extraMissions.js';
// New minigames appear more often while being piloted, in the priority order from the rule sheet.
export const MISSION_POOL=Object.freeze(['memory','memory','memory','shooter','shooter','identity','identity','filter','chronology','engine','upload','truth','mail','cooking','fishing','puzzle','wiring','frequency']);
export const MISSION_LABEL={memory:'키워드 기억',shooter:'오답 격추',identity:'작가 신원 확인',filter:'시대 분류 필터',chronology:'연도순 책 꽂기',engine:'엔진 정렬',upload:'데이터 업로드',truth:'진위 판별',mail:'우편 배달',cooking:'요리 순서',fishing:'키워드 낚시',puzzle:'퍼즐 조각',wiring:'배선 복원',frequency:'주파수 조정'};
export function createMissionRound(era,type,random=Math.random,now=Date.now()){
  if(EXTRA_TYPES.includes(type))return createExtraRound(era,type,random);
  const words=frequencyRecords[era].map(r=>r.word);
  const other=[...new Set(ERAS.flatMap(e=>e===era?[]:frequencyRecords[e].map(r=>r.word)))].filter(word=>!words.includes(word));
  if(type==='memory')return{type,era,order:shuffle(words,random),options:shuffle([...words,other[Math.floor(random()*other.length)]],random),stage:0,revealUntil:now+2500,complete:false};
  if(type==='shooter'){const wrong=shuffle(other,random).slice(0,3);return{type,era,targets:shuffle([...words,...wrong],random),wrong,hit:[],complete:false};}
  if(type==='identity')return{type,era,order:shuffle(wiringRecords[era].map(r=>r.id),random),stage:0,complete:false};
  if(type==='filter')return{type,era,order:shuffle([...wiringRecords[era].map(r=>r.id),...shuffle(ERAS.filter(e=>e!==era).flatMap(e=>wiringRecords[e].map(r=>r.id)),random).slice(0,3)],random),stage:0,complete:false};
  if(type==='chronology')return{type,era,order:shuffle(wiringRecords[era].map(r=>r.id),random),picked:[],complete:false};
  return null;
}
