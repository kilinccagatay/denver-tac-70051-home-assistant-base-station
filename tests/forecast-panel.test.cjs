const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),C=require('../examples/panel-v2/core.js'),base=JSON.parse(fs.readFileSync(path.join(root,'examples/panel-v2/config.example.json')));
const now=new Date(2026,9,25,12),rows=[{datetime:new Date(2026,9,24,12).toISOString(),temperature:99},{datetime:now.toISOString(),condition:'snowy',temperature:0,templow:-2},{datetime:new Date(2026,9,26,12).toISOString(),condition:'rainy',temperature:null,templow:''}];
assert.equal(C.forecastDays(rows,now,5).length,5);
const normalized=C.forecastDays(rows,now);assert.equal(normalized.length,7);assert.equal(normalized[0].high,0);assert.equal(normalized[0].low,-2);assert.equal(normalized[1].high,null);assert.equal(normalized[1].low,null);assert.equal(normalized[6].date,new Date(2026,9,31,12).getTime());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fixture(office,days){
 const cfg={...base,profile:office?'office':undefined,robotEnabled:!office,agenda:office?'sensor.example_agenda':undefined,weeklyForecast:true,forecastDays:days};
 const dom=new JSDOM('<body>'+['Ana','Işıklar','Diğer'].map(x=>'<main class="screen" id="screen-'+x+'"></main>').join(''),{url:'http://panel.test/office/#screen-Ana',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,requests=[];
 w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.PANEL_V2_CONFIG=cfg;w.entityListeners={[cfg.weather]:[]};w.onHaReady=[];w.haSocketReady=true;
 w.goFetch=(url,cb)=>cb(null,{entity_id:cfg.weather,state:'cloudy',attributes:{temperature:10}});w.haSend=()=>{throw Error('read-only widget must not actuate anything');};
 w.XMLHttpRequest=function(){requests.push(this);this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=()=>{};this.send=body=>{this.body=JSON.parse(body);};};
 for(const f of ['core.js','panel.js'])w.eval(fs.readFileSync(path.join(root,'examples/panel-v2',f),'utf8'));
 d.dispatchEvent(new w.Event('DOMContentLoaded'));await sleep(40);
 return {dom,w,d,cfg,requests};
}
(async()=>{
 const f=await fixture(true);try{
  const {d,w,requests,cfg}=f;assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.match(requests[0].url,/get_forecasts\?return_response/);assert.deepEqual(requests[0].body,{entity_id:cfg.weather,type:'daily'});
  assert.equal(d.querySelectorAll('.pv2-forecast-day').length,7);assert.match(d.querySelector('.pv2-forecast-note').textContent,/Yükleniyor/);
  const today=new Date();today.setHours(12,0,0,0);const forecast=[{datetime:today.toISOString(),condition:'rainy',temperature:0,templow:-2}];
  requests[0].status=200;requests[0].responseText=JSON.stringify({service_response:{[cfg.weather]:{forecast}}});requests[0].onload();
  assert.equal(d.querySelector('.pv2-forecast-high').textContent,'0°');assert.equal(d.querySelector('.pv2-forecast-low').textContent,'-2°');assert.equal(d.querySelectorAll('.pv2-forecast-day')[1].querySelector('.pv2-forecast-high').textContent,'—');assert.match(d.querySelector('.pv2-forecast-note').textContent,/Eksik/);
  for(const type of ['touchstart','selectstart','contextmenu']){let ev=new w.Event(type,{bubbles:true,cancelable:true});d.querySelector('.pv2-forecast').dispatchEvent(ev);assert(ev.defaultPrevented);}
  await sleep(1100);assert.equal(requests.length,1,'no per-second requests');w.haSocketReady=false;await sleep(1100);assert.equal(d.querySelector('.pv2-forecast-high').textContent,'0°');assert.match(d.querySelector('.pv2-forecast-note').textContent,/En yüksek/);
 }finally{f.dom.window.close();}
 const five=await fixture(true,5);try{assert.equal(five.d.querySelectorAll('.pv2-forecast-day').length,5);assert.equal(five.d.querySelector('.pv2-forecast-weekday').textContent,'Bugün');assert.match(five.d.querySelector('.pv2-forecast-header').textContent,/5 GÜNLÜK/);}finally{five.dom.window.close();}
 const denver=await fixture(false);try{assert.equal(denver.d.querySelector('.pv2-forecast'),null);assert.equal(denver.requests.length,1,'Denver also stores forecasts for weather fallback');}finally{denver.dom.window.close();}
 console.log('Forecast: seven calendar days, zero/negative/missing values, read-only API, throttling, offline state, selection guard and Denver isolation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
