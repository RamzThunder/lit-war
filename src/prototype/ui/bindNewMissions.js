import { showSequence } from './recordInstruments.js';
import { bookBoard, identityBoard, shooterBoard } from './directControls.js';
import { recordById } from '../minigames/wiring.js';
import { EXTRA_TYPES } from '../minigames/extraMissions.js';
import { renderExtraMission, extraProgress } from './renderExtraMission.js';
// Three short data-recovery tasks; all answers are checked again by GameState/server.
export function bindNewMissions(state) {
 const $=q=>document.querySelector(q);
const panels={memory:$('#memory-panel'),shooter:$('#shooter-panel'),identity:$('#identity-panel'),filter:$('#filter-panel'),chronology:$('#chronology-panel')};
 let signature='',timer=null;
 const button=(label,onClick)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',onClick);return b;};
 const render=round=>{
  if(!round||round.complete)return;
  if(EXTRA_TYPES.includes(round.type)){
   $('#extra-stage').textContent=extraProgress(round).join(' / ');
   renderExtraMission($('#extra-content'),round,value=>state.submitExtra(value));
   return;
  }
  if(!panels[round.type])return;
  if(round.type==='memory'){
   const showing=Date.now()<round.revealUntil;
   showSequence($('#memory-reveal'), round, showing);
   $('#memory-hint').textContent=showing?'세 칸을 왼쪽부터 기억하세요.':'기억한 순서대로 빈 칸을 채우세요.';
   $('#memory-stage').textContent=`${round.stage} / ${round.order.length}`;
   $('#memory-choices').replaceChildren(...round.options.map(word=>button(word,()=>{
     const result=state.recall(word);
     if(result==='incorrect')$('#memory-hint').textContent='순서가 달라요. 첫 단어부터 다시 선택하세요.';
   })));
   $('#memory-choices').querySelectorAll('button').forEach(b=>b.disabled=showing);
   if(showing){clearTimeout(timer);timer=setTimeout(()=>render(state.snapshot.round),Math.max(0,round.revealUntil-Date.now())+30);}
  } else if(round.type==='shooter'){
   $('#shooter-stage').textContent=`${round.hit.length} / ${round.wrong.length} 격추`;
   $('#shooter-board').replaceChildren(shooterBoard(round,word=>state.shoot(word)));
  } else if(round.type==='identity') {
   $('#identity-stage').textContent=`${round.stage+1} / ${round.order.length}`;
   $('#identity-board').replaceChildren(identityBoard(round,(...args)=>state.verifyIdentity(...args)));
  } else if(round.type==='filter') {
   const record=recordById(round.order[round.stage]);
   $('#filter-stage').textContent=`${round.stage} / ${round.order.length}`;
   $('#filter-card').textContent=`${record.author} · 「${record.title}」`;
  } else if(round.type==='chronology') {
   $('#chronology-stage').textContent=`${round.picked.length} / ${round.order.length}`;
   $('#chronology-board').replaceChildren(bookBoard(round,id=>{
     if(state.shelve(id)==='incorrect')$('#chronology-hint').textContent='순서가 달라요. 처음부터 다시 꽂으세요.';
   }));
  }
 };
 for(const [bucket,id] of [['current','filter-current'],['other','filter-other']])$("#"+id).addEventListener('click',()=>{
  const round=state.snapshot.round;if(round?.type!=='filter'||round.complete)return;
  const result=state.classify(round.order[round.stage],bucket);
  if(result==='incorrect')$('#filter-hint').textContent='분류가 달라요. 작품과 시대를 다시 살펴보세요.';
 });
 let last='';
 state.subscribe(({round})=>{
  $('#extra-panel').hidden=!round||!EXTRA_TYPES.includes(round.type)||round.complete;
  for(const [type,panel] of Object.entries(panels))panel.hidden=round?.type!==type || round.complete;
  if(!round||(!panels[round.type]&&!EXTRA_TYPES.includes(round.type))){last='';clearTimeout(timer);return;}
  const key=`${round.type}:${round.era}:${round.revealUntil??''}:${round.order?.join(',')??round.targets?.join(',')??round.pieces?.map(p=>p.id).join(',')}:${round.stage??round.hit?.join(',')??round.caught?.join(',')}:${round.picked?.join(',')??''}:${round.complete}`;
  if(key!==last){last=key;render(round);}
 });
}
