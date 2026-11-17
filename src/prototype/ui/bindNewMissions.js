import { frequencyRecords } from '../minigames/frequency.js';
import { wiringRecords, recordById } from '../minigames/wiring.js';
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
   $('#memory-reveal').textContent=showing?round.order.join('  →  '):'기록이 가려졌습니다. 보았던 순서로 누르세요.';
   $('#memory-stage').textContent=`${round.stage} / ${round.order.length}`;
   $('#memory-choices').replaceChildren(...round.options.map(word=>button(word,()=>{
     const result=state.recall(word);
     if(result==='incorrect')$('#memory-hint').textContent='순서가 달라요. 첫 단어부터 다시 선택하세요.';
   })));
   $('#memory-choices').querySelectorAll('button').forEach(b=>b.disabled=showing);
   if(showing){clearTimeout(timer);timer=setTimeout(()=>render(state.snapshot.round),Math.max(0,round.revealUntil-Date.now())+30);}
  } else if(round.type==='shooter'){
   $('#shooter-reference').textContent=`정상 키워드: ${frequencyRecords[round.era].map(r=>r.word).join(' · ')}`;
   $('#shooter-stage').textContent=`${round.hit.length} / ${round.wrong.length} 격추`;
   $('#shooter-choices').replaceChildren(...round.targets.map(word=>{
     const b=button(word,()=>{const result=state.shoot(word);if(result==='incorrect')$('#shooter-hint').textContent='이 시대의 정상 키워드예요. 다른 데이터만 격추하세요.';});
     b.disabled=round.hit.includes(word);b.className=round.hit.includes(word)?'hit':'';return b;
   }));
  } else if(round.type==='identity') {
   const author=recordById(round.order[round.stage]);
   $('#identity-stage').textContent=`${round.stage+1} / ${round.order.length}`;
   $('#identity-author').textContent=author.author;
   $('#identity-options').replaceChildren(...wiringRecords[round.era].map(record=>{
     const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name='identity-work';input.value=record.id;
     label.append(input,` 「${record.title}」`);return label;
   }));
   $('#identity-swipe').value=0;$('#identity-progress').textContent='작품 선택 → 카드 오른쪽으로 밀기';
  } else if(round.type==='filter') {
   const record=recordById(round.order[round.stage]);
   $('#filter-stage').textContent=`${round.stage} / ${round.order.length}`;
   $('#filter-card').textContent=`${record.author} · 「${record.title}」`;
  } else if(round.type==='chronology') {
   $('#chronology-stage').textContent=`${round.picked.length} / ${round.order.length}`;
   $('#chronology-choices').replaceChildren(...round.order.map(id=>{
    const record=recordById(id);
    const b=button(`「${record.title}」 · ${record.year}${record.yearNote?` ${record.yearNote}`:''}`,()=>{
      const result=state.shelve(id);
      if(result==='incorrect')$('#chronology-hint').textContent='순서가 달라요. 처음부터 다시 꽂으세요.';
    });
    b.disabled=round.picked.includes(id);return b;
   }));
  }
 };
 for(const [bucket,id] of [['current','filter-current'],['other','filter-other']])$("#"+id).addEventListener('click',()=>{
  const round=state.snapshot.round;if(round?.type!=='filter'||round.complete)return;
  const result=state.classify(round.order[round.stage],bucket);
  if(result==='incorrect')$('#filter-hint').textContent='분류가 달라요. 작품과 시대를 다시 살펴보세요.';
 });
 $('#identity-swipe').addEventListener('input',event=>{
  const round=state.snapshot.round;if(round?.type!=='identity'||round.complete)return;
  const value=Number(event.target.value);
  if(value<85){$('#identity-progress').textContent=`${value}% · 끝까지 밀어 주세요`;return;}
  const choice=$('input[name="identity-work"]:checked');
  if(!choice){event.target.value=0;$('#identity-progress').textContent='먼저 작품을 선택하세요.';return;}
  state.verifyIdentity(round.order[round.stage],choice.value,true);
  event.target.value=0;
  if(choice.value!==round.order[round.stage])$('#identity-progress').textContent='신원 불일치! 작품을 다시 확인하세요.';
 });
 let last='';
 state.subscribe(({round})=>{
  $('#extra-panel').hidden=!round||!EXTRA_TYPES.includes(round.type)||round.complete;
  for(const [type,panel] of Object.entries(panels))panel.hidden=round?.type!==type || round.complete;
  if(!round||(!panels[round.type]&&!EXTRA_TYPES.includes(round.type))){last='';clearTimeout(timer);return;}
  const key=`${round.type}:${round.era}:${round.order?.join(',')??round.targets?.join(',')??round.pieces?.map(p=>p.id).join(',')}:${round.stage??round.hit?.join(',')??round.caught?.join(',')}:${round.picked?.join(',')??''}:${round.complete}`;
  if(key!==last){last=key;render(round);}
 });
}
