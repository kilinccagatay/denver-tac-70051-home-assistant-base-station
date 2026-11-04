const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../examples/panel-v2/core.js'),{JSDOM}=require('jsdom');
const now=new Date(2026,10,4,20).getTime(),day=86400000;
const sample=(value,at=now)=>({value,at,condition:'snowy'});
const rows=[{datetime:new Date(now-day).toISOString(),temperature:99},{datetime:new Date(now).toISOString(),temperature:-2,templow:-6,condition:'snowy'},{datetime:new Date(now+day).toISOString(),temperature:3,condition:'rainy'}];
const pick=(live,last,forecast=rows,at=now-day,time=now,feels=false)=>C.weatherReading(live,last,forecast,at,time,feels);
assert.equal(pick(sample(0),sample(5)).value,0);
assert.equal(pick(sample(-3),sample(5)).source,'live');
assert.equal(pick(sample(99,now-1000),sample(5)).value,5,'late old observations cannot replace a newer stored reading');
assert.equal(pick(null,sample(-4,now-7200000)).value,-4);
assert.equal(pick(null,sample(-4,now-7200000)).source,'last');
assert.equal(pick(null,sample(9,now-day)).value,-2);
assert.equal(pick(null,sample(9,now-day)).source,'forecast');
assert.equal(pick(null,null,rows,now-day,now,true).value,null,'daily high must never become apparent temperature');
assert.equal(pick(null,null,[{...rows[1],apparent_temperature:0}],now,now,true).value,0);
for(const v of [null,undefined,'',NaN,Infinity,true,'oops'])assert.equal(pick(sample(v),null,[]).value,null);
assert.equal(pick(sample(9,now+day),null,[]).value,null);
assert.equal(pick(null,null,rows,now-8*day).value,null);
assert.equal(pick(null,null,rows,now+day).value,null);
assert.equal(pick(null,null,rows,now,now+day).value,3,'roll over to matching next calendar day');
assert.equal(pick(null,sample(9),rows,now,now+3*day).value,null,'never show yesterday or another forecast day');
const root=path.resolve(__dirname,'..'),base=JSON.parse(fs.readFileSync(path.join(root,'examples/panel-v2/config.example.json')));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(office,storage,failStorage=false){
 const cfg={...base,profile:office?'office':undefined,outdoorFeelsLike:'sensor.test_feels'},key=(office?'panel-office-':'panel-v2-')+'weather-cache-v1:'+cfg.weather+':'+cfg.outdoorFeelsLike;
 const dom=new JSDOM('<body><main class="screen" id="screen-Ana"></main></body>',{url:'http://panel.test/'+(office?'office':'dash')+'/#screen-Ana',runScripts:'outside-only'}),w=dom.window;let tick,time=now;
 w.Date=class extends Date{constructor(...a){super(...(a.length?a:[time]));}static now(){return time;}};w.setInterval=f=>{tick=f;return 1;};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
 if(storage)w.localStorage.setItem(key,JSON.stringify(storage));
 if(failStorage)w.Storage.prototype.setItem=()=>{throw Error('quota');};
 w.PANEL_V2_CONFIG=cfg;w.entityListeners={[cfg.weather]:[],[cfg.outdoorFeelsLike]:[]};w.onHaReady=[];w.haSocketReady=true;
 w.goFetch=(url,cb)=>cb(null,{entity_id:decodeURIComponent(url.split('/states/')[1]||'').split('?')[0],state:'unavailable',attributes:{}});
 w.haSend=()=>{throw Error('Weather never actuates household controls');};
 w.XMLHttpRequest=function(){this.open=()=>{};this.setRequestHeader=()=>{};this.send=()=>{};};
 for(const f of ['core.js','panel.js'])w.eval(fs.readFileSync(path.join(root,'examples/panel-v2',f),'utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(40);for(const cb of w.entityListeners[cfg.weather])cb('unavailable',{});await sleep(40);
 return {w,d:w.document,key,emit(id,state,attrs){for(const cb of w.entityListeners[id]||[])cb(state,attrs);},cfg,advance(ms){time+=ms;tick();}};
}
(async()=>{
 for(const office of [false,true]){
  const f=await fixture(office,{version:1,weather:sample(-1,now-3600000),feels:sample(-4,now-3600000),forecast:rows,forecastAt:now-day});
  try{
   assert.equal(f.d.querySelector('.pv2-temperature').textContent,'-1°');
   assert.equal(f.d.querySelector('.pv2-feels-value').textContent,'-4°');
   f.w.haSocketReady=false;f.advance(1000);await sleep(40);assert.equal(f.d.querySelector('.pv2-feels-value').textContent,'-4°');
   f.w.haSocketReady=true;f.advance(1000);await sleep(40);f.emit(f.cfg.weather,'sunny',{temperature:7,time:now/1000});f.emit(f.cfg.outdoorFeelsLike,'5',{time:now/1000});await sleep(40);
   assert.equal(f.d.querySelector('.pv2-feels-value').textContent,'5°');assert.equal(JSON.parse(f.w.localStorage.getItem(f.key)).weather.value,7);
   f.emit(f.cfg.weather,'unavailable',{});f.emit(f.cfg.outdoorFeelsLike,'unavailable',{});await sleep(40);assert.equal(f.d.querySelector('.pv2-feels-value').textContent,'5°');
   f.advance(day);await sleep(40);assert.equal(f.d.querySelector('.pv2-temperature').textContent,'3°');assert.equal(f.d.querySelector('.pv2-feels-value').textContent,'—');
  }finally{f.w.close();}
 }
 const corrupt=await fixture(false,{version:1,weather:{value:'bad',at:now},forecast:'bad',forecastAt:now},true);try{assert.equal(corrupt.d.querySelector('.pv2-feels-value').textContent,'—');}finally{corrupt.w.close();}
 console.log('Weather fallback: signed/zero, same day, midnight, expiry, future/corrupt storage, offline, reload, live recovery and both profiles PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
