// Shared 8-room layout: central hall, four rooms on each side.
import { ERAS } from './minigames/wiring.js';
export { ERAS };
const wall=(x,y,width,height)=>({x,y,width,height});
const T={width:64,height:36,range:72};
const ROWS=[64,222,380,538];
const WIDTH=576, HEIGHT=720;
export const map={
 width:WIDTH,height:HEIGHT,spawn:{x:WIDTH/2,y:HEIGHT/2},entry:{x:WIDTH/2,y:670},
 terminals:ERAS.map((era,i)=>{
   const restoration = era === '1930' || era === '1940';
   const inset = restoration ? 118 : 94;
   return {era,restoration,x:i%2?WIDTH-inset:inset,y:ROWS[Math.floor(i/2)]+(restoration?74:62),...T};
 }),
 doors:ERAS.map((era,i)=>({era,...wall(i%2?378:180,ROWS[Math.floor(i/2)]+54,18,60)})),
 walls:[wall(0,0,WIDTH,64),wall(0,HEIGHT-24,WIDTH,24),wall(0,0,24,HEIGHT),wall(WIDTH-24,0,24,HEIGHT),
   ...[180,378].flatMap(x=>ROWS.flatMap(y=>[wall(x,y,18,54),wall(x,y+114,18,44)])),
   ...ROWS.slice(1).flatMap(y=>[wall(24,y-12,156,16),wall(396,y-12,156,16)])],
 racks:[wall(212,72,56,40),wall(308,72,56,40)],
 crates:[wall(201,656,32,29)],
};
export const DOOR_RANGE=52;
export const terminalFor=era=>map.terminals.find(t=>t.era===era);
export const doorFor=era=>map.doors.find(d=>d.era===era);
export const terminalSolid=t=>({x:t.x-32,y:t.y-18,width:t.width,height:t.height});
export const solids=[...map.walls,...map.racks,...map.crates,...map.terminals.map(terminalSolid)];
export function movementVector(left,right,up,down,speed=130){const x=Number(right)-Number(left),y=Number(down)-Number(up),length=Math.hypot(x,y)||1;return{x:x/length*speed,y:y/length*speed};}
export function isNearTerminal(player,terminal){return Boolean(terminal)&&Math.hypot(player.x-terminal.x,player.y-terminal.y)<=terminal.range;}
export function nearestTerminal(player){return map.terminals.find(t=>isNearTerminal(player,t))??null;}
export function isNearDoor(player,door){return Boolean(door)&&Math.hypot(player.x-(door.x+door.width/2),player.y-(door.y+door.height/2))<=DOOR_RANGE;}
export function footBox(x,y){return{x:x-7,y:y+5,w:14,h:11};}
export function validPosition(x,y,extra=[]){if(!Number.isFinite(x)||!Number.isFinite(y))return false;const body=footBox(x,y);return x>=31&&x<=WIDTH-31&&y>=59&&y<=HEIGHT-40&&![...solids,...extra].some(b=>body.x<b.x+b.width&&body.x+body.w>b.x&&body.y<b.y+b.height&&body.y+body.h>b.y);}
