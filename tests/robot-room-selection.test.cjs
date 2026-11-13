const assert=require('node:assert/strict');const M=require('../examples/panel-v2/robot-map.js');
function setup(){let now=0,timers=[],requests=[],opened=[];const model=M.createSelection({now:()=>now,setTimeout:(fn,ms)=>{const t={fn,at:now+ms};timers.push(t);return t;},clearTimeout:t=>{timers=timers.filter(x=>x!==t);},fetch:cb=>requests.push(cb),open:(room,read)=>{const o={room,result:'pending'};opened.push(o);read(data=>o.result=data);}});return {model,requests,opened,advance(ms){now+=ms;const due=timers.filter(t=>t.at<=now);timers=timers.filter(t=>t.at>now);due.forEach(t=>t.fn());}};}
const a={id:1,name:'A'},b={id:2,name:'B'};
{
 const s=setup();s.model.tap(a,10,10);assert.equal(s.requests.length,1);assert.equal(s.opened.length,0);s.advance(100);s.model.tap(a,12,10);assert.equal(s.opened.length,1);assert.equal(s.opened[0].result,'pending');assert.equal(s.requests.length,1);s.requests[0]({1:'A'});assert.deepEqual(s.opened[0].result,{1:'A'});
}
{
 const s=setup();s.model.tap(a,10,10);s.requests[0]({1:'A'});s.advance(100);s.model.tap(a,10,10);assert.deepEqual(s.opened[0].result,{1:'A'});
}
{
 const s=setup();s.model.tap(a,10,10);s.advance(100);s.model.tap(b,11,10);assert.equal(s.opened.length,0);s.requests[0]({1:'A'});s.advance(100);s.model.tap(b,12,10);assert.equal(s.opened[0].room.id,2);assert.equal(s.opened[0].result,'pending');s.requests[1]({2:'B'});assert.deepEqual(s.opened[0].result,{2:'B'});
}
for(const change of [s=>s.advance(351),s=>s.model.reset(),s=>s.model.tap(null,10,10)]){
 const s=setup();s.model.tap(a,10,10);change(s);s.model.tap(a,10,10);assert.equal(s.opened.length,0);assert.equal(s.requests.length,2);
}
{
 const s=setup();s.model.tap(a,10,10);s.advance(100);s.model.tap(a,100,100);assert.equal(s.opened.length,0);s.model.tap(a,100,100);assert.equal(s.opened.length,1);s.model.reset();s.requests[1]({1:'late'});assert.equal(s.opened[0].result,'pending');
}
console.log('Room double tap: prefetch, cached/slow results, same-room pairing, 350ms expiry, distance, wrong-room and stale callback isolation PASS');
{
 let time=1000,taps=0,cancels=0;const events={};const el={addEventListener:(name,fn)=>events[name]=fn};M.bindTaps(el,()=>taps++,()=>cancels++,()=>time);
 const event=(extra={})=>({preventDefault(){},stopPropagation(){},...extra});
 const point={clientX:20,clientY:30};events.touchstart(event({touches:[point]}));time+=40;events.touchend(event({changedTouches:[point]}));assert.equal(taps,1);
 events.click(event({...point}));assert.equal(taps,1,'synthetic mouse click after touch must not count twice');
 time+=100;events.touchstart(event({touches:[point]}));events.touchmove(event({touches:[{clientX:80,clientY:30}]}));events.touchend(event({changedTouches:[point]}));assert.equal(taps,1,'drag cancelled');
 events.touchstart(event({touches:[point]}));time+=700;events.touchend(event({changedTouches:[point]}));assert.equal(taps,1,'long hold is not a tap');
 events.touchstart(event({touches:[point,point]}));events.touchend(event({changedTouches:[point]}));assert.equal(taps,1,'multi-touch cancelled');assert(cancels>=3);
}
console.log('Gesture normalization: synthetic click suppression, drag, long hold and multi-touch PASS');
