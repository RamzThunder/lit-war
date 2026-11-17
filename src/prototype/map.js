// Shared 8-room layout: central hall, four rooms on each side.
import { ERAS } from './minigames/wiring.js';
export { ERAS };
const wall=(x,y,width,height)=>({x,y,width,height});
const T={width:64,height:36,range:72};
const ROWS=[64,342,620,898];
export const map={
 width:960,height:1200,spawn:{x:480,y:600},entry:{x:480,y:1145},
 terminals:ERAS.map((era,i)=>({era,x:i%2?798:162,y:ROWS[Math.floor(i/2)]+76,...T})),
 doors:ERAS.map((era,i)=>({era,...wall(i%2?636:300,ROWS[Math.floor(i/2)]+96,24,60)})),
 walls:[wall(0,0,960,64),wall(0,1176,960,24),wall(0,0,24,1200),wall(936,0,24,1200),
   ...[300,636].flatMap(x=>ROWS.flatMap((y,i)=>[wall(x,y,24,96),wall(x,y+156,24,(i===3?1176:y+278)-(y+156))])),
   ...[342,620,898].flatMap(y=>[wall(24,y-21,276,24),wall(660,y-21,276,24)])],
 racks:[wall(400,100,56,112),wall(504,100,56,112),wall(400,910,56,112),wall(504,910,56,112)],
 crates:[wall(340,1090,48,36),wall(584,1090,36,32),wall(40,1120,40,32),wall(880,90,40,36)],
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
export function validPosition(x,y,extra=[]){if(!Number.isFinite(x)||!Number.isFinite(y))return false;const body=footBox(x,y);return x>=31&&x<=929&&y>=59&&y<=1160&&![...solids,...extra].some(b=>body.x<b.x+b.width&&body.x+body.w>b.x&&body.y<b.y+b.height&&body.y+body.h>b.y);}
